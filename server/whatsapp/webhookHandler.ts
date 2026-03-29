/**
 * WhatsApp Webhook Handler
 *
 * Receives POST events from Z-API and:
 * 1. Persists chat + message to database
 * 2. Broadcasts SSE event to all connected CRM users in real-time
 * 3. Auto-creates contact + lead for unknown numbers
 * 4. Runs automation agent if enabled for the chat
 *
 * Z-API webhook docs: https://developer.z-api.io/en/webhooks/on-message-received
 * IMPORTANT: Z-API has NO historical message retrieval endpoint.
 *            All history is built by capturing webhook events.
 */

import type { Request, Response } from "express";
import { broadcastToAll } from "./sseManager";
import { upsertWhatsappChat, upsertWhatsappMessage, autoCreateLeadFromWhatsapp } from "../db";
import { notifyOwner } from "../_core/notification";
import { isGroupJid } from "./zapiClient";
import { runAgentIfEnabled } from "./agent";

// ─── Z-API payload types ─────────────────────────────────────────────────────

export interface ZApiWebhookPayload {
  instanceId?: string;
  messageId?: string;
  phone?: string;
  fromMe?: boolean;
  momment?: number;       // Z-API typo — timestamp in ms
  status?: string;
  chatName?: string;
  senderPhoto?: string;
  senderName?: string;
  connectedPhone?: string;
  participantPhone?: string;  // sender inside a group
  participantLid?: string;
  photo?: string;
  broadcast?: boolean;
  isGroup?: boolean;
  isNewsletter?: boolean;
  referenceMessageId?: string;
  forwarded?: boolean;
  type?: string;
  notification?: string;
  // Message content types
  text?: { message?: string };
  image?: { imageUrl?: string; thumbnailUrl?: string; caption?: string; mimeType?: string };
  video?: { videoUrl?: string; caption?: string; mimeType?: string; seconds?: number };
  audio?: { audioUrl?: string; ptt?: boolean; seconds?: number; mimeType?: string };
  document?: { documentUrl?: string; fileName?: string; caption?: string; mimeType?: string; pageCount?: number };
  sticker?: { stickerUrl?: string; mimeType?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string; url?: string };
  reaction?: { value?: string; reactionBy?: string; referencedMessage?: { messageId: string } };
  poll?: { question?: string; options?: Array<{ name: string }>; pollMaxOptions?: number };
  pollVote?: { pollMessageId?: string; options?: Array<{ name: string }> };
  contact?: { displayName?: string; vCard?: string; phones?: string[] };
  order?: { orderId?: string; itemCount?: number; total?: number; currency?: string };
  // Carousel, buttons, list, etc. — treated as text
  hydratedTemplate?: { message?: string; footer?: string; title?: string };
  buttonsResponseMessage?: { buttonId?: string; message?: string };
  listResponseMessage?: { message?: string; title?: string };
}

// ─── Content extraction ───────────────────────────────────────────────────────

function extractContent(p: ZApiWebhookPayload): string {
  if (p.text?.message) return p.text.message;
  if (p.image?.caption) return `[Imagem] ${p.image.caption}`;
  if (p.image?.imageUrl) return "[Imagem]";
  if (p.video?.caption) return `[Vídeo] ${p.video.caption}`;
  if (p.video?.videoUrl) return "[Vídeo]";
  if (p.audio?.ptt) return "[Áudio de voz]";
  if (p.audio?.audioUrl) return "[Áudio]";
  if (p.document?.fileName) return `[Documento] ${p.document.fileName}`;
  if (p.document?.documentUrl) return "[Documento]";
  if (p.sticker?.stickerUrl) return "[Sticker]";
  if (p.location?.name) return `[Localização] ${p.location.name}`;
  if (p.location?.latitude != null) return `[Localização] ${p.location.latitude}, ${p.location.longitude}`;
  if (p.reaction?.value) return `[Reação: ${p.reaction.value}]`;
  if (p.poll?.question) return `[Enquete] ${p.poll.question}: ${p.poll.options?.map(o => o.name).join(", ")}`;
  if (p.pollVote?.options?.length) return `[Votou: ${p.pollVote.options.map(o => o.name).join(", ")}]`;
  if (p.contact?.displayName) return `[Contato] ${p.contact.displayName}`;
  if (p.order?.orderId) return `[Pedido] ${p.order.itemCount ?? 1} item(s) — ${p.order.currency ?? "BRL"} ${p.order.total ?? "?"}`;
  if (p.hydratedTemplate?.message) return p.hydratedTemplate.message;
  if (p.buttonsResponseMessage?.message) return p.buttonsResponseMessage.message;
  if (p.listResponseMessage?.message) return p.listResponseMessage.message;
  if (p.notification) return `[${p.notification}]`;
  return "[Mensagem]";
}

function extractMediaUrl(p: ZApiWebhookPayload): string | undefined {
  return (
    p.image?.imageUrl ??
    p.video?.videoUrl ??
    p.audio?.audioUrl ??
    p.document?.documentUrl ??
    p.sticker?.stickerUrl ??
    undefined
  );
}

function extractMediaType(
  p: ZApiWebhookPayload
): "text" | "image" | "video" | "audio" | "document" | "sticker" {
  if (p.image) return "image";
  if (p.video) return "video";
  if (p.audio) return "audio";
  if (p.document) return "document";
  if (p.sticker) return "sticker";
  return "text";
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function webhookHandler(req: Request, res: Response): Promise<void> {
  // Respond immediately — Z-API retries if response takes > 2s
  res.json({ received: true });

  try {
    const payload = req.body as ZApiWebhookPayload;

    // Must have a phone/JID to process
    if (!payload.phone) return;

    // Skip pure system notifications with no content
    const hasContent = !!(
      payload.text || payload.image || payload.video || payload.audio ||
      payload.document || payload.sticker || payload.location || payload.reaction ||
      payload.poll || payload.pollVote || payload.contact || payload.order ||
      payload.hydratedTemplate || payload.buttonsResponseMessage || payload.listResponseMessage
    );
    const isSystemOnly =
      !hasContent &&
      !!payload.notification &&
      !["ReceivedCallback", "MessageStatusCallback"].includes(payload.type ?? "");
    if (isSystemOnly) return;

    const chatJid = payload.phone;
    const isGroup = payload.isGroup === true || isGroupJid(chatJid);
    const isFromMe = payload.fromMe ?? false;
    const content = extractContent(payload);
    const mediaUrl = extractMediaUrl(payload);
    const mediaType = extractMediaType(payload);

    // Timestamp: Z-API sends ms; validate it's reasonable (after 2020)
    const rawTs = payload.momment ?? 0;
    const timestamp = rawTs > 1_577_836_800_000 ? rawTs : Date.now();

    // Unique message ID
    const messageId = payload.messageId ?? `wa_${chatJid}_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;

    // For groups: actual sender is participantPhone
    const senderName = isGroup
      ? (payload.participantPhone ?? payload.senderName ?? undefined)
      : (isFromMe ? undefined : (payload.senderName ?? payload.chatName ?? undefined));

    const chatName = payload.chatName ?? payload.senderName ?? chatJid.split("@")[0];

    // ── 1. Upsert chat ────────────────────────────────────────────────────────
    await upsertWhatsappChat({
      jid: chatJid,
      name: chatName,
      lastMessageAt: new Date(timestamp),
      lastMessagePreview: content.slice(0, 100),
      unreadCount: isFromMe ? 0 : 1,
      isGroup,
    });

    // ── 2. Upsert message ─────────────────────────────────────────────────────
    await upsertWhatsappMessage({
      messageId,
      chatJid,
      content,
      mediaType,
      mediaUrl,
      isFromMe,
      senderName,
      timestamp,
    });

    // ── 3. Broadcast SSE to all CRM users in real-time ────────────────────────
    broadcastToAll({
      type: "message",
      data: {
        messageId,
        chatJid,
        content,
        mediaType,
        mediaUrl,
        isFromMe,
        senderName,
        timestamp,
        chatName,
        isGroup,
      },
    });

    broadcastToAll({
      type: "chat_updated",
      data: {
        jid: chatJid,
        name: chatName,
        lastMessageAt: timestamp,
        lastMessagePreview: content.slice(0, 100),
        unreadCount: isFromMe ? 0 : 1,
        isGroup,
      },
    });

    // ── 4. Auto-create contact + lead for unknown numbers ─────────────────────
    if (!isFromMe && !isGroup) {
      const phone = chatJid.split("@")[0];
      autoCreateLeadFromWhatsapp({
        jid: chatJid,
        name: payload.senderName ?? payload.chatName,
        phone,
        firstMessage: content.slice(0, 200),
      }).then((result) => {
        if (result) {
          console.log(
            `[Webhook] Auto-lead #${result.leadId} → contact #${result.contactId} (${phone})`
          );
          notifyOwner({
            title: "Novo Lead via WhatsApp",
            content: `Mensagem de ${payload.senderName ?? phone}: "${content.slice(0, 100)}"`,
          }).catch(() => {});
        }
      }).catch((err) => {
        console.error("[Webhook] Auto-lead error:", err);
      });
    }

    console.log(
      `[Webhook] ${isFromMe ? "OUT" : "IN"} | ${isGroup ? "GRP" : "DM"} | ${chatJid} | ${content.slice(0, 60)}`
    );

    // ── 5. Run automation agent (async, non-blocking) ─────────────────────
    if (!isFromMe && !isGroup) {
      runAgentIfEnabled(chatJid, content, isFromMe).catch((err) =>
        console.error("[Webhook] Agent error:", err)
      );
    }
  } catch (err) {
    console.error("[Webhook] Error:", err);
  }
}
