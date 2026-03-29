/**
 * Z-API Webhook Handler
 *
 * Receives real-time events from Z-API (incoming messages, status updates, etc.)
 * and persists them to the local database.
 *
 * Playbook Ação 1: Auto-cria contato + lead no pipeline ao receber mensagem
 * de número desconhecido. Notifica o owner via Manus Notification.
 *
 * Z-API sends POST requests to /api/zapi/webhook with JSON payloads.
 * Docs: https://developer.z-api.io/webhooks/introduction
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
  participantPhone?: string;
  photo?: string;
  broadcast?: boolean;
  referenceMessageId?: string;
  forwarded?: boolean;
  type?: string;
  // Text message
  text?: { message?: string };
  // Image / video / audio / document
  image?: { imageUrl?: string; caption?: string };
  video?: { videoUrl?: string; caption?: string };
  audio?: { audioUrl?: string };
  document?: { documentUrl?: string; fileName?: string; caption?: string };
  sticker?: { stickerUrl?: string };
}

// ─── Helper: extract text content from a Z-API message ───────────────────────

function extractContent(payload: ZApiMessagePayload): string {
  if (payload.text?.message) return payload.text.message;
  if (payload.image?.caption) return `[Imagem] ${payload.image.caption}`;
  if (payload.image?.imageUrl) return "[Imagem]";
  if (payload.video?.caption) return `[Vídeo] ${payload.video.caption}`;
  if (payload.video?.videoUrl) return "[Vídeo]";
  if (payload.audio?.audioUrl) return "[Áudio]";
  if (payload.document?.fileName) return `[Documento] ${payload.document.fileName}`;
  if (payload.sticker?.stickerUrl) return "[Sticker]";
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

    // Ignore events without a phone (e.g. status updates without a chat)
    if (!payload.phone) return;

    const chatJid = payload.phone;
    const content = extractContent(payload);
    const mediaUrl = extractMediaUrl(payload);
    const mediaType = extractMediaType(payload);
    // payload.momment é timestamp em milissegundos (Z-API), mas pode ser 0 ou inválido
    const rawTs = payload.momment ?? 0;
    const timestamp = rawTs > 1000 ? rawTs : Date.now();
    const isFromMe = payload.fromMe ?? false;
    const messageId = payload.messageId ?? `zapi_${chatJid}_${timestamp}`;
    const isGroup = chatJid.endsWith("@g.us") || chatJid.includes("-");

    // Upsert the chat
    await upsertWhatsappChat({
      jid: chatJid,
      name: payload.chatName ?? payload.senderName,
      lastMessageAt: new Date(timestamp),
      lastMessagePreview: content.slice(0, 100),
      unreadCount: isFromMe ? 0 : 1,
      isGroup,
    });

    // ── PLAYBOOK AÇÃO 1: Auto-criar contato + lead para números desconhecidos ──
    // Executa apenas para mensagens recebidas (não enviadas) e chats individuais
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
          // Notificar o owner sobre novo lead via WhatsApp
          notifyOwner({
            title: "Novo Lead via WhatsApp",
            content: `Contato recebido de ${payload.senderName ?? payload.chatName ?? phone}. Lead #${result.leadId} criado automaticamente no pipeline.\n\nPrimeira mensagem: "${content.slice(0, 100)}"`,
          }).catch(() => {});
        }
      }).catch(err => {
        console.error("[Z-API Webhook] Erro ao auto-criar lead:", err);
      });
    }

    // Upsert the message
    await upsertWhatsappMessage({
      messageId,
      chatJid,
      content,
      mediaType,
      mediaUrl,
      isFromMe,
      senderName: isFromMe ? undefined : (payload.senderName ?? payload.chatName),
      timestamp,
    });

    console.log(
      `[Z-API Webhook] ${isFromMe ? "OUT" : "IN"} | ${chatJid} | ${content.slice(0, 60)}`
    );
  } catch (err) {
    console.error("[Z-API Webhook] Error processing payload:", err);
  }
}
