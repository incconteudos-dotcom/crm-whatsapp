/**
 * WhatsApp Automation Agent
 *
 * Reads incoming messages and auto-replies using an LLM when:
 *   1. The chat has agent enabled (opt-in per conversation)
 *   2. The message is not from the CRM itself (fromMe=false)
 *   3. Rate limit: max 1 agent reply per 10 minutes per chat
 *
 * The agent is aware of:
 *   - Contact name, pipeline stage, conversation history (last 20 msgs)
 *   - The Pátio Estúdios business context and sales playbook
 *   - Custom system prompt overrides per chat
 *
 * Opt-in/out is managed via the whatsapp_agent_configs table.
 * The agent NEVER reveals it is an AI unless explicitly told to.
 */

import { invokeLLM } from "../_core/llm";
import { sendText } from "./zapiClient";
import { broadcastToAll } from "./sseManager";
import {
  getWhatsappMessages,
  upsertWhatsappMessage,
  upsertWhatsappChat,
  getDb,
} from "../db";
import {
  whatsappAgentConfigs,
  whatsappChats,
  contacts,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes between agent replies
const MAX_HISTORY_MESSAGES = 20;

const DEFAULT_SYSTEM_PROMPT = `Você é um atendente especializado do Pátio Estúdios, estúdio profissional de podcast e produção de áudio/vídeo em São Paulo.

SEU PAPEL:
- Atender leads e clientes com simpatia, objetividade e profissionalismo
- Entender a necessidade do cliente e guiá-lo naturalmente pelo funil de vendas
- Responder dúvidas sobre preços, serviços e processos de forma honesta
- Nunca prometer algo que não possa ser cumprido
- Nunca revelar que é uma IA ou sistema automático

SERVIÇOS:
- Gravação em estúdio profissional (podcast, videocast, entrevistas, cursos)
- Pacotes: Start+ (básico), Pro+ (produção completa), Vip+ (premium)
- Edição, mixagem, masterização e distribuição em plataformas
- Cortes para redes sociais (Reels, Shorts, TikTok)

REGRAS DE COMUNICAÇÃO:
- Mensagens curtas e naturais (máximo 3 parágrafos)
- Use emojis com moderação (1-2 por mensagem)
- Sempre termine com uma pergunta ou call-to-action claro
- Tom: amigável, confiante, sem ser invasivo
- Língua: português brasileiro informal

QUANDO NÃO SOUBER ALGO:
"Deixa eu verificar isso com a nossa equipe e já te retorno!"

NÃO ENVIE mensagens genéricas. Personalize sempre com base no histórico da conversa.`;

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getAgentConfig(chatJid: string) {
  const db = await getDb();
  if (!db) return null;
  const [cfg] = await db
    .select()
    .from(whatsappAgentConfigs)
    .where(eq(whatsappAgentConfigs.chatJid, chatJid))
    .limit(1);
  return cfg ?? null;
}

async function isRateLimited(chatJid: string): Promise<boolean> {
  const cfg = await getAgentConfig(chatJid);
  if (!cfg?.lastAgentMessageAt) return false;
  return Date.now() - cfg.lastAgentMessageAt.getTime() < RATE_LIMIT_MS;
}

async function markAgentMessageSent(chatJid: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(whatsappAgentConfigs)
    .set({ lastAgentMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(whatsappAgentConfigs.chatJid, chatJid));
}

async function getContactForChat(chatJid: string) {
  const db = await getDb();
  if (!db) return null;
  const [chat] = await db
    .select({ contactId: whatsappChats.contactId, name: whatsappChats.name })
    .from(whatsappChats)
    .where(eq(whatsappChats.jid, chatJid))
    .limit(1);
  if (!chat?.contactId) return { name: chat?.name ?? "Cliente", stage: null };

  const [contact] = await db
    .select({ name: contacts.name })
    .from(contacts)
    .where(eq(contacts.id, chat.contactId))
    .limit(1);
  return { name: contact?.name ?? chat?.name ?? "Cliente", stage: null };
}

// ─── Main agent function ───────────────────────────────────────────────────────

export async function runAgentIfEnabled(
  chatJid: string,
  incomingMessage: string,
  isFromMe: boolean
): Promise<void> {
  // Only act on incoming messages from the customer
  if (isFromMe) return;

  const cfg = await getAgentConfig(chatJid);
  if (!cfg?.enabled) return;
  if (await isRateLimited(chatJid)) {
    console.log(`[Agent] Rate-limited for ${chatJid} — skipping`);
    return;
  }

  try {
    const contactInfo = await getContactForChat(chatJid);
    const history = await getWhatsappMessages(chatJid, MAX_HISTORY_MESSAGES);

    // Build conversation history for LLM
    const conversationHistory = history
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({
        role: (m.isFromMe ? "assistant" : "user") as "user" | "assistant",
        content: m.content ?? "",
      }));

    const systemPrompt = cfg.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const contextAddition = [
      `\nCONTEXTO DO CLIENTE:`,
      `- Nome: ${contactInfo?.name ?? "Não identificado"}`,
      cfg.stageHint ? `- Etapa no funil: ${cfg.stageHint}` : null,
      `- Última mensagem recebida: "${incomingMessage.slice(0, 200)}"`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt + contextAddition },
        ...conversationHistory,
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    const agentReply = typeof rawContent === "string" ? rawContent : null;
    if (!agentReply?.trim()) {
      console.log(`[Agent] Empty reply for ${chatJid} — not sending`);
      return;
    }

    // Send via Z-API
    const phone = chatJid.split("@")[0];
    const result = await sendText(phone, agentReply);
    const messageId = result.messageId ?? `agent_${Date.now()}`;

    // Persist agent message to DB
    await upsertWhatsappMessage({
      messageId,
      chatJid,
      content: agentReply,
      isFromMe: true,
      senderName: "Agente IA",
      timestamp: Date.now(),
    });

    // Update chat preview
    await upsertWhatsappChat({
      jid: chatJid,
      lastMessageAt: new Date(),
      lastMessagePreview: agentReply.slice(0, 100),
    });

    // Broadcast SSE so UI updates immediately
    broadcastToAll({
      type: "message",
      data: {
        messageId,
        chatJid,
        content: agentReply,
        isFromMe: true,
        senderName: "Agente IA",
        timestamp: Date.now(),
        isGroup: false,
      },
    });

    broadcastToAll({
      type: "chat_updated",
      data: {
        jid: chatJid,
        lastMessageAt: Date.now(),
        lastMessagePreview: agentReply.slice(0, 100),
        unreadCount: 0,
      },
    });

    await markAgentMessageSent(chatJid);
    console.log(`[Agent] Replied to ${chatJid}: "${agentReply.slice(0, 60)}..."`);
  } catch (err) {
    console.error(`[Agent] Error for ${chatJid}:`, err);
  }
}

// ─── Exported management functions ────────────────────────────────────────────

export async function enableAgent(
  chatJid: string,
  options?: { systemPrompt?: string; stageHint?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(whatsappAgentConfigs)
    .values({
      chatJid,
      enabled: true,
      systemPrompt: options?.systemPrompt ?? null,
      stageHint: options?.stageHint ?? null,
    })
    .onDuplicateKeyUpdate({
      set: {
        enabled: true,
        systemPrompt: options?.systemPrompt ?? null,
        stageHint: options?.stageHint ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function disableAgent(chatJid: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(whatsappAgentConfigs)
    .set({ enabled: false, updatedAt: new Date() })
    .where(eq(whatsappAgentConfigs.chatJid, chatJid));
}

export async function getAgentStatus(chatJid: string): Promise<{
  enabled: boolean;
  stageHint: string | null;
  lastMessageAt: Date | null;
}> {
  const cfg = await getAgentConfig(chatJid);
  return {
    enabled: cfg?.enabled ?? false,
    stageHint: cfg?.stageHint ?? null,
    lastMessageAt: cfg?.lastAgentMessageAt ?? null,
  };
}
