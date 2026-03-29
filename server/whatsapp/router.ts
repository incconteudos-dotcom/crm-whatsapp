/**
 * WhatsApp Router
 *
 * Handles all WhatsApp-related tRPC procedures.
 * This is a clean rewrite replacing the monolithic routers.ts sections.
 *
 * Features:
 * - Multi-user support with message attribution ([Nome do Agente]: mensagem)
 * - Message templates with variable substitution
 * - Pipeline-context quick messages
 * - Real-time via SSE (not polling)
 * - Auto-sync chats from Z-API
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getWhatsappChats,
  getWhatsappMessages,
  upsertWhatsappChat,
  upsertWhatsappMessage,
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  getContactById,
  getLeadWithContact,
  createActivity,
  autoCreateLeadFromWhatsapp,
  getTotalUnreadChats,
  getDb,
} from "../db";
import {
  sendText,
  sendImage,
  sendAudio,
  sendVideo,
  sendDocument,
  sendLocation,
  sendLink,
  sendReaction,
  sendPoll,
  replyMessage as zapiReply,
  deleteMessage as zapiDelete,
  readChat,
  archiveChat,
  pinChat,
  muteChat,
  getChats,
  getAllChats,
  getContacts,
  checkNumberExists,
  getProfilePicture,
  getGroups,
  getGroupInfo,
  getInstanceStatus,
  getQRCode,
  getCellphoneData,
  restartInstance,
  disconnectInstance,
  registerWebhooks,
  getTotalUnread,
  normalizePhone,
} from "./zapiClient";
import { renderTemplate, DEFAULT_TEMPLATES, TEMPLATE_CATEGORIES } from "./templateEngine";
import { getConnectedClientCount } from "./sseManager";
import { enableAgent, disableAgent, getAgentStatus } from "./agent";
import { invokeLLM } from "../_core/llm";
import { messageTemplates } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Middleware: check WhatsApp access ────────────────────────────────────────

const whatsappProcedure = protectedProcedure.use(({ ctx, next }) => {
  const hasAccess =
    ctx.user.whatsappAccess ||
    ["admin", "gerente"].includes(ctx.user.role ?? "");
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso ao WhatsApp não habilitado para este usuário.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(ts?: number): Date | undefined {
  if (!ts) return undefined;
  // Accept both seconds and milliseconds; validate MySQL TIMESTAMP range (1970–2038)
  const ms = ts > 1e10 ? ts : ts * 1000;
  const d = new Date(ms);
  if (d.getFullYear() < 1971 || d.getFullYear() > 2037) return new Date();
  return d;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const whatsappRouter = router({

  // ── Status & Connection ───────────────────────────────────────────────────

  instanceStatus: whatsappProcedure.query(() => getInstanceStatus()),

  qrCode: whatsappProcedure.query(() => getQRCode()),

  cellphone: whatsappProcedure.query(() => getCellphoneData()),

  restart: whatsappProcedure.mutation(() => restartInstance()),

  disconnect: whatsappProcedure.mutation(() => disconnectInstance()),

  sseClients: whatsappProcedure.query(() => ({
    connected: getConnectedClientCount(),
  })),

  configureWebhook: whatsappProcedure
    .input(z.object({ baseUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      await registerWebhooks(input.baseUrl);
      return { success: true, webhookUrl: `${input.baseUrl}/api/whatsapp/webhook` };
    }),

  // ── Chats ─────────────────────────────────────────────────────────────────

  chats: whatsappProcedure.query(() => getWhatsappChats()),

  totalUnread: protectedProcedure.query(() => getTotalUnreadChats()),

  /** Pull chat list from Z-API and sync to local DB */
  syncChats: whatsappProcedure.mutation(async () => {
    const zapiChats = await getAllChats();
    let synced = 0;
    for (const chat of zapiChats) {
      await upsertWhatsappChat({
        jid: chat.phone,
        name: chat.name,
        lastMessageAt: safeDate(chat.lastMessageTimestamp),
        unreadCount: chat.unreadMessages ?? 0,
        isGroup: chat.isGroup ?? false,
      });
      synced++;
    }
    return {
      synced,
      message: synced > 0
        ? `${synced} conversas importadas do Z-API.`
        : "Nenhuma conversa encontrada. Verifique a conexão do WhatsApp.",
    };
  }),

  readChat: whatsappProcedure
    .input(z.object({ phone: z.string() }))
    .mutation(async ({ input }) => {
      await readChat(input.phone);
      await upsertWhatsappChat({ jid: input.phone, unreadCount: 0 });
      return { success: true };
    }),

  archiveChat: whatsappProcedure
    .input(z.object({ phone: z.string(), archive: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      await archiveChat(input.phone, input.archive);
      return { success: true };
    }),

  pinChat: whatsappProcedure
    .input(z.object({ phone: z.string(), pin: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      await pinChat(input.phone, input.pin);
      return { success: true };
    }),

  muteChat: whatsappProcedure
    .input(z.object({ phone: z.string(), mute: z.boolean().default(true), durationHours: z.number().optional() }))
    .mutation(async ({ input }) => {
      const seconds = input.durationHours ? input.durationHours * 3600 : 0;
      await muteChat(input.phone, input.mute, seconds);
      return { success: true };
    }),

  // ── Messages ──────────────────────────────────────────────────────────────

  messages: whatsappProcedure
    .input(z.object({ chatJid: z.string(), limit: z.number().min(1).max(500).default(100) }))
    .query(({ input }) => getWhatsappMessages(input.chatJid, input.limit)),

  /**
   * Send a text message.
   * Prefixes with [AgentName]: so recipients know who sent from the CRM.
   */
  sendMessage: whatsappProcedure
    .input(z.object({
      chatJid: z.string(),
      message: z.string().min(1).max(4096),
      replyToMessageId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const agentName = ctx.user.name ?? "Agente";
      const prefixed = `[${agentName}]: ${input.message}`;

      let messageId: string | undefined;
      let zapiError: string | undefined;

      try {
        const phone = input.chatJid.split("@")[0];
        const result = input.replyToMessageId
          ? await zapiReply(phone, prefixed, input.replyToMessageId)
          : await sendText(phone, prefixed);
        messageId = result.messageId;
      } catch (err) {
        zapiError = err instanceof Error ? err.message : String(err);
        console.error("[WhatsApp] sendMessage error:", zapiError);
      }

      const msgId = messageId ?? `crm_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      await upsertWhatsappMessage({
        messageId: msgId,
        chatJid: input.chatJid,
        content: prefixed,
        isFromMe: true,
        crmUserId: ctx.user.id,
        crmUserName: agentName,
        timestamp: Date.now(),
      });

      await upsertWhatsappChat({
        jid: input.chatJid,
        lastMessageAt: new Date(),
        lastMessagePreview: prefixed.slice(0, 100),
      });

      await createActivity({
        userId: ctx.user.id,
        type: "whatsapp",
        description: `WhatsApp para ${input.chatJid}: ${input.message.slice(0, 80)}`,
      });

      return { success: true, messageId: msgId, zapiError };
    }),

  /**
   * Send a template message rendered with contact/lead context.
   */
  sendTemplate: whatsappProcedure
    .input(z.object({
      chatJid: z.string(),
      templateId: z.number(),
      contactId: z.number().optional(),
      leadId: z.number().optional(),
      customVars: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [tmpl] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, input.templateId)).limit(1);
      if (!tmpl) throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });

      // Build context for variable substitution
      const contact = input.contactId ? await getContactById(input.contactId) : undefined;
      const leadRow = input.leadId ? await getLeadWithContact(input.leadId) : undefined;
      const leadData = leadRow ? (leadRow as { leads: { value?: string | null } }).leads ?? leadRow : undefined;

      const rendered = renderTemplate(tmpl.content, {
        contact: contact ?? undefined,
        lead: leadData ? { value: (leadData as { value?: string | null }).value ?? undefined, stage: undefined } : undefined,
        user: { name: ctx.user.name },
        custom: input.customVars,
      });

      const agentName = ctx.user.name ?? "Agente";
      const prefixed = `[${agentName}]: ${rendered}`;

      const phone = input.chatJid.split("@")[0];
      let messageId: string | undefined;
      let zapiError: string | undefined;

      try {
        const result = await sendText(phone, prefixed);
        messageId = result.messageId;
      } catch (err) {
        zapiError = err instanceof Error ? err.message : String(err);
        console.error("[WhatsApp] sendTemplate error:", zapiError);
      }

      const msgId = messageId ?? `crm_tpl_${Date.now()}`;

      await upsertWhatsappMessage({
        messageId: msgId,
        chatJid: input.chatJid,
        content: prefixed,
        isFromMe: true,
        crmUserId: ctx.user.id,
        crmUserName: agentName,
        timestamp: Date.now(),
      });

      await upsertWhatsappChat({
        jid: input.chatJid,
        lastMessageAt: new Date(),
        lastMessagePreview: prefixed.slice(0, 100),
      });

      return { success: true, messageId: msgId, rendered, zapiError };
    }),

  sendImage: whatsappProcedure
    .input(z.object({ phone: z.string(), imageUrl: z.string().url(), caption: z.string().optional() }))
    .mutation(async ({ input }) => {
      const r = await sendImage(normalizePhone(input.phone), input.imageUrl, input.caption);
      return { success: true, messageId: r.messageId };
    }),

  sendAudio: whatsappProcedure
    .input(z.object({ phone: z.string(), audioUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const r = await sendAudio(normalizePhone(input.phone), input.audioUrl);
      return { success: true, messageId: r.messageId };
    }),

  sendVideo: whatsappProcedure
    .input(z.object({ phone: z.string(), videoUrl: z.string().url(), caption: z.string().optional() }))
    .mutation(async ({ input }) => {
      const r = await sendVideo(normalizePhone(input.phone), input.videoUrl, input.caption);
      return { success: true, messageId: r.messageId };
    }),

  sendDocument: whatsappProcedure
    .input(z.object({ phone: z.string(), documentUrl: z.string().url(), fileName: z.string(), extension: z.string().default("pdf") }))
    .mutation(async ({ input }) => {
      const r = await sendDocument(normalizePhone(input.phone), input.documentUrl, input.fileName, input.extension);
      return { success: true, messageId: r.messageId };
    }),

  sendLocation: whatsappProcedure
    .input(z.object({ phone: z.string(), latitude: z.number(), longitude: z.number(), name: z.string().optional(), address: z.string().optional() }))
    .mutation(async ({ input }) => {
      const r = await sendLocation(normalizePhone(input.phone), input.latitude, input.longitude, input.name, input.address);
      return { success: true, messageId: r.messageId };
    }),

  sendLink: whatsappProcedure
    .input(z.object({ phone: z.string(), message: z.string(), linkUrl: z.string().url(), title: z.string().optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const r = await sendLink(normalizePhone(input.phone), input.message, input.linkUrl, input.title, input.description);
      return { success: true, messageId: r.messageId };
    }),

  sendReaction: whatsappProcedure
    .input(z.object({ phone: z.string(), messageId: z.string(), reaction: z.string() }))
    .mutation(async ({ input }) => {
      const r = await sendReaction(normalizePhone(input.phone), input.messageId, input.reaction);
      return { success: true, messageId: r.messageId };
    }),

  sendPoll: whatsappProcedure
    .input(z.object({ phone: z.string(), question: z.string(), options: z.array(z.string()).min(2), selectableCount: z.number().default(1) }))
    .mutation(async ({ input }) => {
      const r = await sendPoll(normalizePhone(input.phone), input.question, input.options, input.selectableCount);
      return { success: true, messageId: r.messageId };
    }),

  deleteMessage: whatsappProcedure
    .input(z.object({ phone: z.string(), messageId: z.string(), owner: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      await zapiDelete(normalizePhone(input.phone), input.messageId, input.owner);
      return { success: true };
    }),

  // ── Contacts & Validation ─────────────────────────────────────────────────

  zapiContacts: whatsappProcedure.query(() => getContacts(0, 500)),

  checkNumber: whatsappProcedure
    .input(z.object({ phone: z.string() }))
    .query(({ input }) => checkNumberExists(input.phone)),

  profilePicture: whatsappProcedure
    .input(z.object({ phone: z.string() }))
    .query(({ input }) => getProfilePicture(input.phone)),

  syncZapiContacts: whatsappProcedure.mutation(async () => {
    const contacts = await getContacts(0, 500);
    // Just return the list — actual import handled by contacts router
    return { contacts, count: contacts.length };
  }),

  groups: whatsappProcedure.query(() => getGroups()),

  groupInfo: whatsappProcedure
    .input(z.object({ groupId: z.string() }))
    .query(({ input }) => getGroupInfo(input.groupId)),

  // ── Message Templates ─────────────────────────────────────────────────────

  templateCategories: whatsappProcedure.query(() => TEMPLATE_CATEGORIES),

  templates: whatsappProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(({ input }) => getMessageTemplates(input.category)),

  createTemplate: whatsappProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      category: z.string().default("geral"),
      content: z.string().min(1),
      variables: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await createMessageTemplate({
        name: input.name,
        category: input.category,
        channel: "whatsapp",
        content: input.content,
        variables: input.variables ? JSON.stringify(input.variables) : null,
      });
      return { success: true, id };
    }),

  updateTemplate: whatsappProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      category: z.string().optional(),
      content: z.string().optional(),
      variables: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, variables, ...rest } = input;
      await updateMessageTemplate(id, {
        ...rest,
        variables: variables ? JSON.stringify(variables) : undefined,
      });
      return { success: true };
    }),

  deleteTemplate: whatsappProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMessageTemplate(input.id);
      return { success: true };
    }),

  /**
   * Seed the database with default templates if empty.
   */
  seedDefaultTemplates: whatsappProcedure.mutation(async () => {
    const existing = await getMessageTemplates();
    if (existing.length > 0) {
      return { seeded: 0, message: "Templates já existem." };
    }
    let seeded = 0;
    for (const tmpl of DEFAULT_TEMPLATES) {
      await createMessageTemplate({
        name: tmpl.name,
        category: tmpl.category,
        channel: "whatsapp",
        content: tmpl.content,
        variables: null,
      });
      seeded++;
    }
    return { seeded, message: `${seeded} templates padrão criados.` };
  }),

  /**
   * Render a template preview with context (for UI preview before sending).
   */
  previewTemplate: whatsappProcedure
    .input(z.object({
      content: z.string(),
      contactId: z.number().optional(),
      leadId: z.number().optional(),
      customVars: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const contact = input.contactId ? await getContactById(input.contactId) : undefined;
      const rendered = renderTemplate(input.content, {
        contact: contact ?? undefined,
        user: { name: ctx.user.name },
        custom: input.customVars,
      });
      return { rendered };
    }),

  // ── AI Analysis ───────────────────────────────────────────────────────────

  analyzeConversation: whatsappProcedure
    .input(z.object({
      chatJid: z.string(),
      type: z.enum(["summary", "sentiment", "opportunities", "action_items"]).default("summary"),
    }))
    .mutation(async ({ input }) => {
      const msgs = await getWhatsappMessages(input.chatJid, 100);
      if (!msgs.length) return { analysis: "Nenhuma mensagem para analisar." };

      const conversation = msgs
        .map((m) => `${m.isFromMe ? `[${m.crmUserName ?? "CRM"}]` : "[Cliente]"}: ${m.content}`)
        .join("\n");

      const prompts: Record<string, string> = {
        summary: "Faça um resumo executivo desta conversa, destacando os pontos principais.",
        sentiment: "Analise o sentimento da conversa (positivo, neutro, negativo) e explique os fatores.",
        opportunities: "Identifique oportunidades de negócio, necessidades do cliente e próximos passos.",
        action_items: "Liste os itens de ação e compromissos assumidos nesta conversa.",
      };

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um especialista em CRM e análise de conversas de vendas. Responda sempre em português brasileiro, de forma clara e objetiva." },
          { role: "user", content: `${prompts[input.type]}\n\nConversa:\n${conversation}` },
        ],
      });

      return { analysis: response.choices[0]?.message?.content ?? "Análise não disponível." };
    }),
});
