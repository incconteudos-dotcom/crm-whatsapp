/**
 * Z-API Webhook Handler
 *
 * Receives real-time events from Z-API (incoming messages, status updates, etc.)
 * and persists them to the local database.
 *
 * This is the ONLY way to capture message history with Z-API.
 * Z-API does not provide a REST endpoint to retrieve historical messages.
 *
 * Playbook Ação 1: Auto-cria contato + lead no pipeline ao receber mensagem
 * de número desconhecido. Notifica o owner via Manus Notification.
 *
 * Z-API sends POST requests to /api/zapi/webhook with JSON payloads.
 * Docs: https://developer.z-api.io/webhooks/on-message-received
 */

import type { Request, Response } from "express";
import {
  upsertWhatsappChat,
  upsertWhatsappMessage,
  autoCreateLeadFromWhatsapp,
} from "./db";
import { notifyOwner } from "./_core/notification";

// ─── Z-API payload types ─────────────────────────────────────────────────────

interface ZApiMessagePayload {
  instanceId?: string;
  messageId?: string;
  phone?: string;
  fromMe?: boolean;
  momment?: number; // Z-API typo for "moment" (timestamp in ms)
  status?: string;
  chatName?: string;
  senderPhoto?: string;
  senderName?: string;
  participantPhone?: string; // sender inside a group
  participantLid?: string;
  photo?: string;
  broadcast?: boolean;
  isGroup?: boolean;
  isNewsletter?: boolean;
  referenceMessageId?: string;
  forwarded?: boolean;
  type?: string;
  // Text message
  text?: { message?: string };
  // Image / video / audio / document / sticker
  image?: { imageUrl?: string; caption?: string; mimeType?: string };
  video?: { videoUrl?: string; caption?: string; mimeType?: string };
  audio?: { audioUrl?: string; ptt?: boolean };
  document?: { documentUrl?: string; fileName?: string; caption?: string; mimeType?: string };
  sticker?: { stickerUrl?: string };
  // Other types
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  reaction?: { value?: string; reactionBy?: string };
  poll?: { question?: string; options?: Array<{ name: string }> };
  pollVote?: { pollMessageId?: string; options?: Array<{ name: string }> };
  contact?: { displayName?: string; phones?: string[] };
  order?: { orderId?: string; itemCount?: number; total?: number };
  // Notification-only events (no message content)
  notification?: string;
}

// ─── Helper: extract text content from a Z-API message ───────────────────────

function extractContent(payload: ZApiMessagePayload): string {
  if (payload.text?.message) return payload.text.message;
  if (payload.image?.caption) return `[Imagem] ${payload.image.caption}`;
  if (payload.image?.imageUrl) return "[Imagem]";
  if (payload.video?.caption) return `[Vídeo] ${payload.video.caption}`;
  if (payload.video?.videoUrl) return "[Vídeo]";
  if (payload.audio?.ptt) return "[Áudio de voz]";
  if (payload.audio?.audioUrl) return "[Áudio]";
  if (payload.document?.fileName) return `[Documento] ${payload.document.fileName}`;
  if (payload.sticker?.stickerUrl) return "[Sticker]";
  if (payload.location?.name) return `[Localização: ${payload.location.name}]`;
  if (payload.location?.latitude) return `[Localização: ${payload.location.latitude}, ${payload.location.longitude}]`;
  if (payload.reaction?.value) return `[Reação: ${payload.reaction.value}]`;
  if (payload.poll?.question) return `[Enquete] ${payload.poll.question}`;
  if (payload.pollVote?.options) return `[Voto em enquete: ${payload.pollVote.options.map(o => o.name).join(", ")}]`;
  if (payload.contact?.displayName) return `[Contato] ${payload.contact.displayName}`;
  if (payload.order?.orderId) return `[Pedido] ${payload.order.itemCount ?? 1} item(s)`;
  if (payload.notification) return `[${payload.notification}]`;
  return "[Mensagem]";
}

function extractMediaUrl(payload: ZApiMessagePayload): string | undefined {
  return (
    payload.image?.imageUrl ??
    payload.video?.videoUrl ??
    payload.audio?.audioUrl ??
    payload.document?.documentUrl ??
    payload.sticker?.stickerUrl
  );
}

function extractMediaType(
  payload: ZApiMessagePayload
): "text" | "image" | "video" | "audio" | "document" | "sticker" {
  if (payload.image) return "image";
  if (payload.video) return "video";
  if (payload.audio) return "audio";
  if (payload.document) return "document";
  if (payload.sticker) return "sticker";
  return "text";
}

// ─── Webhook handler ─────────────────────────────────────────────────────────

export async function zapiWebhookHandler(req: Request, res: Response) {
  // Respond immediately so Z-API doesn't retry
  res.json({ received: true });

  try {
    const payload = req.body as ZApiMessagePayload;

    // Ignore events without a phone (e.g. instance status events)
    if (!payload.phone) return;

    // Skip pure notification events that carry no message content
    // (e.g. GROUP_PARTICIPANT_ADD, E2E_ENCRYPTED) unless they have text
    const hasContent = !!(
      payload.text || payload.image || payload.video || payload.audio ||
      payload.document || payload.sticker || payload.location ||
      payload.reaction || payload.poll || payload.pollVote || payload.contact || payload.order
    );
    if (!hasContent && payload.notification && !payload.type?.includes("Callback")) return;

    const chatJid = payload.phone;
    const content = extractContent(payload);
    const mediaUrl = extractMediaUrl(payload);
    const mediaType = extractMediaType(payload);

    // Z-API momment is timestamp in milliseconds; fall back to now if missing/zero
    const rawTs = payload.momment ?? 0;
    const timestamp = rawTs > 1000000 ? rawTs : Date.now();

    const isFromMe = payload.fromMe ?? false;

    // Unique message ID — use Z-API's messageId when available; otherwise derive one
    const messageId = payload.messageId ?? `zapi_${chatJid}_${timestamp}`;

    // Determine if this is a group by jid format or the isGroup flag
    const isGroup = payload.isGroup === true || chatJid.endsWith("@g.us") || chatJid.includes("-group");

    // For groups, the actual sender is participantPhone; for individual chats it's chatJid
    const senderPhone = isGroup
      ? (payload.participantPhone ?? payload.senderName ?? chatJid)
      : (isFromMe ? "me" : chatJid.split("@")[0]);

    const displayName = payload.chatName ?? payload.senderName ?? senderPhone;

    // ── Upsert the chat record ────────────────────────────────────────────────
    await upsertWhatsappChat({
      jid: chatJid,
      name: displayName,
      lastMessageAt: new Date(timestamp),
      lastMessagePreview: content.slice(0, 100),
      unreadCount: isFromMe ? 0 : 1,
      isGroup,
    });

    // ── PLAYBOOK AÇÃO 1: Auto-criar contato + lead para números desconhecidos ─
    // Executa apenas para mensagens recebidas em chats individuais
    if (!isFromMe && !isGroup) {
      const phone = chatJid.split("@")[0];
      autoCreateLeadFromWhatsapp({
        jid: chatJid,
        name: payload.senderName ?? payload.chatName,
        phone,
        firstMessage: content.slice(0, 200),
      }).then(result => {
        if (result) {
          console.log(
            `[Z-API Webhook] Auto-lead #${result.leadId} criado para contato #${result.contactId} (${phone})`
          );
          notifyOwner({
            title: "Novo Lead via WhatsApp",
            content: `Contato recebido de ${payload.senderName ?? payload.chatName ?? phone}. Lead #${result.leadId} criado automaticamente no pipeline.\n\nPrimeira mensagem: "${content.slice(0, 100)}"`,
          }).catch(() => {});
        }
      }).catch(err => {
        console.error("[Z-API Webhook] Erro ao auto-criar lead:", err);
      });
    }

    // ── Upsert the message record ─────────────────────────────────────────────
    await upsertWhatsappMessage({
      messageId,
      chatJid,
      content,
      mediaType,
      mediaUrl,
      isFromMe,
      senderName: isFromMe ? undefined : (payload.participantPhone ?? payload.senderName ?? payload.chatName),
      timestamp,
    });

    console.log(
      `[Z-API Webhook] ${isFromMe ? "OUT" : "IN"} | ${isGroup ? "GRP" : "DM"} | ${chatJid} | ${content.slice(0, 60)}`
    );
  } catch (err) {
    console.error("[Z-API Webhook] Error processing payload:", err);
  }
}

