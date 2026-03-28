import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAllUsers, getPendingUsers, updateUserStatus, updateUserRole, updateUserWhatsappAccess, createUser,
  getContacts, getContactById, getContactProfile, createContact, updateContact, deleteContact,
  getPipelineStages, createPipelineStage, seedDefaultPipelineStages,
  getLeads, getLeadById, createLead, updateLead, deleteLead,
  getWhatsappChats, upsertWhatsappChat, getWhatsappMessages, upsertWhatsappMessage, getTotalUnreadChats,
  getContracts, getContractsWithContact, getContractById, createContract, updateContract,
  getInvoices, getInvoiceById, createInvoice, updateInvoice,
  getQuotes, createQuote, updateQuote,
  getStudioBookings, createStudioBooking, updateStudioBooking, deleteStudioBooking,
  getTasks, createTask, updateTask,
  getRecentActivities, createActivity,
  getDashboardStats,
  getMonthlyRevenue, getTopClientsByRevenue, getLeadConversionFunnel,
  createPortalToken, getPortalToken, approvePortalDocument,
  linkChatToContact,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { stripe, createInvoiceCheckoutSession, createSplitPaymentSessions, getOrCreateStripeCustomer } from "./stripe/stripe";
import { sendText, sendDocument, getInstanceStatus, getChats } from "./zapi";
import { STUDIO_PRODUCTS } from "./stripe/products";
import { getDb } from "./db";
import { users as usersTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── AI ROUTER ───────────────────────────────────────────────────────────────
const aiRouter = router({
  chat: protectedProcedure.input(z.object({
    messages: z.array(z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })),
    systemPrompt: z.string().optional(),
  })).mutation(async ({ input }) => {
    const msgs = input.systemPrompt
      ? [{ role: "system" as const, content: input.systemPrompt }, ...input.messages]
      : input.messages;
    const response = await invokeLLM({ messages: msgs });
    return { content: response.choices[0]?.message?.content ?? "" };
  }),
});

// ─── SETTINGS ROUTER ──────────────────────────────────────────────────────────
const settingsRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const result = await db.select().from(usersTable).where(eq(usersTable.id, ctx.user.id)).limit(1);
    return result[0] ?? null;
  }),
  updateProfile: protectedProcedure.input(z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(usersTable).set({ ...input, updatedAt: new Date() }).where(eq(usersTable.id, ctx.user.id));
    return { success: true };
  }),
});

// ─── ROLE GUARDS ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem executar esta ação." });
  return next({ ctx });
});

const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["admin", "gerente"].includes(ctx.user.role ?? "")) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores e gerentes podem executar esta ação." });
  return next({ ctx });
});

const whatsappProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.whatsappAccess && !["admin", "gerente"].includes(ctx.user.role ?? "")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso ao módulo WhatsApp." });
  }
  return next({ ctx });
});

// ─── USERS ROUTER ─────────────────────────────────────────────────────────────
const usersRouter = router({
  list: adminProcedure.query(() => getAllUsers()),
  pending: managerProcedure.query(() => getPendingUsers()),
  approve: managerProcedure.input(z.object({ userId: z.number() })).mutation(({ input }) =>
    updateUserStatus(input.userId, "active")
  ),
  reject: managerProcedure.input(z.object({ userId: z.number() })).mutation(({ input }) =>
    updateUserStatus(input.userId, "rejected")
  ),
  updateRole: adminProcedure.input(z.object({
    userId: z.number(),
    role: z.enum(["admin", "gerente", "analista", "assistente"]),
  })).mutation(({ input }) => updateUserRole(input.userId, input.role)),
  updateWhatsappAccess: managerProcedure.input(z.object({
    userId: z.number(),
    access: z.boolean(),
  })).mutation(({ input }) => updateUserWhatsappAccess(input.userId, input.access)),
  createByAdmin: adminProcedure.input(z.object({
    name: z.string().min(1),
    email: z.union([z.string().email(), z.literal("")]).optional(),
    role: z.enum(["admin", "gerente", "analista", "assistente"]).default("assistente"),
    whatsappAccess: z.boolean().default(false),
  })).mutation(({ input }) => createUser({ ...input, email: input.email || undefined })),
});

// ─── CONTACTS ROUTER ──────────────────────────────────────────────
const contactsRouter = router({
  list: protectedProcedure.input(z.object({ search: z.string().optional() })).query(({ input }) =>
    getContacts(input.search)
  ),
  getProfile: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getContactProfile(input.id)
  ),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getContactById(input.id)
  ),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    email: z.union([z.string().email(), z.literal("")]).optional(),
    phone: z.string().optional(),
    whatsappJid: z.string().optional(),
    company: z.string().optional(),
    position: z.string().optional(),
    notes: z.string().optional(),
    source: z.enum(["manual", "whatsapp", "import", "website"]).optional(),
  })).mutation(({ input, ctx }) =>
    createContact({ ...input, assignedUserId: ctx.user.id })
  ),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    position: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateContact(id, data);
  }),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteContact(input.id)
  ),
  sendEmail: protectedProcedure.input(z.object({
    to: z.string().email(),
    toName: z.string().optional(),
    subject: z.string().min(1),
    message: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { sendEmail: sendEmailFn } = await import("./email");
    const htmlContent = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <p>Olá${input.toName ? `, ${input.toName}` : ""},</p>
      ${(input.message ?? "").split("\n").map((l: string) => `<p>${l}</p>`).join("")}
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
      <p style="font-size:12px;color:#888">Enviado pelo CRM — Pátio Estúdio de Podcast</p>
    </div>`;
    const result = await sendEmailFn({ to: input.to, toName: input.toName, subject: input.subject, htmlContent });
    if (!result.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error ?? "Falha ao enviar email" });
    return { success: true, messageId: result.messageId };
  }),
  createLead: protectedProcedure.input(z.object({
    title: z.string().min(1),
    contactId: z.number().optional(),
    value: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(({ input, ctx }) =>
    createLead({ ...input, assignedUserId: ctx.user.id })
  ),
});

// ─── PIPELINE ROUTER ──────────────────────────────────────────────────────────
const pipelineRouter = router({
  stages: protectedProcedure.query(async () => {
    await seedDefaultPipelineStages();
    return getPipelineStages();
  }),
  createStage: managerProcedure.input(z.object({
    name: z.string().min(1),
    color: z.string().optional(),
    position: z.number().optional(),
  })).mutation(({ input }) => createPipelineStage(input)),
  leads: protectedProcedure.input(z.object({
    stageId: z.number().optional(),
    status: z.string().optional(),
  })).query(({ input }) => getLeads(input.stageId, input.status)),
  getLead: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getLeadById(input.id)
  ),
  createLead: protectedProcedure.input(z.object({
    title: z.string().min(1),
    contactId: z.number().optional(),
    stageId: z.number().optional(),
    value: z.string().optional(),
    probability: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
    expectedCloseDate: z.date().optional(),
  })).mutation(({ input, ctx }) =>
    createLead({ ...input, assignedUserId: ctx.user.id })
  ),
  updateLead: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    stageId: z.number().optional(),
    value: z.string().optional(),
    probability: z.number().optional(),
    status: z.enum(["open", "won", "lost"]).optional(),
    notes: z.string().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateLead(id, data);
  }),
  deleteLead: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteLead(input.id)
  ),
});

// ─── WHATSAPP ROUTER ──────────────────────────────────────────────────────────
const whatsappRouter = router({
  chats: whatsappProcedure.query(() => getWhatsappChats()),
  messages: whatsappProcedure.input(z.object({ chatJid: z.string(), limit: z.number().optional() })).query(({ input }) =>
    getWhatsappMessages(input.chatJid, input.limit)
  ),
  syncChats: whatsappProcedure.mutation(async () => {
    // Fetch real chats from Z-API and sync to DB
    const zapiChats = await getChats(0, 50);
    let synced = 0;
    for (const chat of zapiChats) {
      await upsertWhatsappChat({
        jid: chat.phone,
        name: chat.name,
        lastMessageAt: chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp * 1000) : new Date(),
        lastMessagePreview: chat.lastMessage?.slice(0, 100),
        unreadCount: chat.unreadMessages ?? 0,
        isGroup: chat.isGroup ?? false,
      });
      synced++;
    }
    return { synced, message: synced > 0 ? `${synced} conversas sincronizadas via Z-API.` : "Nenhuma conversa encontrada. Verifique a conexão do WhatsApp." };
  }),
  instanceStatus: whatsappProcedure.query(async () => {
    return getInstanceStatus();
  }),
  sendMessage: whatsappProcedure.input(z.object({
    chatJid: z.string(),
    message: z.string().min(1),
  })).mutation(async ({ input, ctx }) => {
    const userName = ctx.user.name ?? "Usuário";
    const prefixedMessage = `[${userName}]: ${input.message}`;
    // Send via Z-API
    let zapiMessageId: string | undefined;
    let zapiError: string | undefined;
    try {
      const result = await sendText(input.chatJid, prefixedMessage);
      zapiMessageId = result.messageId;
    } catch (err) {
      zapiError = err instanceof Error ? err.message : String(err);
      console.error("[Z-API] sendText error:", zapiError);
      // Don't throw — still store in DB so the message is not lost
    }
    // Store in DB
    const msgId = zapiMessageId ?? `crm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await upsertWhatsappMessage({
      messageId: msgId,
      chatJid: input.chatJid,
      content: prefixedMessage,
      isFromMe: true,
      crmUserId: ctx.user.id,
      crmUserName: userName,
      timestamp: Date.now(),
    });
    await upsertWhatsappChat({
      jid: input.chatJid,
      lastMessageAt: new Date(),
      lastMessagePreview: prefixedMessage.slice(0, 100),
    });
    // Log activity
    await createActivity({
      userId: ctx.user.id,
      type: "whatsapp",
      description: `Mensagem enviada para ${input.chatJid}: ${input.message.slice(0, 80)}`,
    });
    return { success: true, messageId: msgId, prefixedMessage, zapiError };
  }),
  analyzeConversation: whatsappProcedure.input(z.object({
    chatJid: z.string(),
    analysisType: z.enum(["summary", "sentiment", "opportunities", "action_items"]).default("summary"),
  })).mutation(async ({ input }) => {
    const messages = await getWhatsappMessages(input.chatJid, 100);
    if (messages.length === 0) return { analysis: "Nenhuma mensagem encontrada para análise." };

    const conversation = messages.map(m => `${m.isFromMe ? (m.crmUserName ? `[${m.crmUserName}]` : "[CRM]") : "[Cliente]"}: ${m.content}`).join("\n");

    const prompts: Record<string, string> = {
      summary: "Faça um resumo executivo desta conversa de WhatsApp, destacando os principais pontos discutidos.",
      sentiment: "Analise o sentimento desta conversa (positivo, neutro, negativo) e explique os fatores.",
      opportunities: "Identifique oportunidades de negócio, necessidades do cliente e próximos passos recomendados.",
      action_items: "Liste os itens de ação e compromissos assumidos nesta conversa.",
    };

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um assistente especializado em análise de conversas de vendas e CRM. Responda sempre em português brasileiro de forma clara e objetiva." },
        { role: "user", content: `${prompts[input.analysisType]}\n\nConversa:\n${conversation}` },
      ],
    });

    return { analysis: response.choices[0]?.message?.content ?? "Análise não disponível." };
  }),
  totalUnread: protectedProcedure.query(() => getTotalUnreadChats()),
});

// ─── CONTRACTS ROUTER ─────────────────────────────────────────────────────────
const contractsRouter = router({
  list: protectedProcedure.query(() => getContractsWithContact()),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getContractById(input.id)
  ),
  create: protectedProcedure.input(z.object({
    title: z.string().min(1),
    contactId: z.number().optional(),
    leadId: z.number().optional(),
    content: z.string().optional(),
    value: z.string().optional(),
    validUntil: z.date().optional(),
    signerName: z.string().optional(),
    signerEmail: z.string().optional(),
  })).mutation(({ input, ctx }) =>
    createContract({ ...input, assignedUserId: ctx.user.id })
  ),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    content: z.string().optional(),
    status: z.enum(["draft", "sent", "signed", "cancelled"]).optional(),
    signatureUrl: z.string().optional(),
    signedAt: z.date().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateContract(id, data);
  }),
  generateWithAI: protectedProcedure.input(z.object({
    title: z.string(),
    contactName: z.string(),
    value: z.string().optional(),
    description: z.string(),
    contractType: z.string().default("prestação de serviços"),
  })).mutation(async ({ input }) => {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um especialista em contratos brasileiros. Gere contratos profissionais em português brasileiro com cláusulas adequadas." },
        { role: "user", content: `Gere um contrato de ${input.contractType} com as seguintes informações:\n- Título: ${input.title}\n- Cliente: ${input.contactName}\n- Valor: ${input.value ?? "a definir"}\n- Descrição dos serviços: ${input.description}\n\nInclua cláusulas de: objeto, prazo, valor, pagamento, obrigações das partes, rescisão e foro.` },
      ],
    });
    return { content: response.choices[0]?.message?.content ?? "" };
  }),
});

// ─── INVOICES ROUTER ──────────────────────────────────────────────────────────
const invoicesRouter = router({
  list: protectedProcedure.query(() => getInvoices()),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getInvoiceById(input.id)
  ),
  create: protectedProcedure.input(z.object({
    contactId: z.number().optional(),
    leadId: z.number().optional(),
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    })),
    dueDate: z.date().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const subtotal = input.items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal;
    const number = `FAT-${Date.now().toString().slice(-8)}`;
    return createInvoice({
      ...input,
      number,
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      assignedUserId: ctx.user.id,
    });
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
    stripePaymentUrl: z.string().optional(),
    paidAt: z.date().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateInvoice(id, data);
  }),
});

// ─── QUOTES ROUTER ────────────────────────────────────────────────────────────
const quotesRouter = router({
  list: protectedProcedure.query(() => getQuotes()),
  create: protectedProcedure.input(z.object({
    contactId: z.number().optional(),
    leadId: z.number().optional(),
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    })),
    discount: z.string().optional(),
    validUntil: z.date().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const subtotal = input.items.reduce((sum, item) => sum + item.total, 0);
    const discount = parseFloat(input.discount ?? "0");
    const total = subtotal - discount;
    const number = `ORC-${Date.now().toString().slice(-8)}`;
    return createQuote({
      ...input,
      number,
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      assignedUserId: ctx.user.id,
    });
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateQuote(id, data);
  }),
  convertToInvoice: protectedProcedure.input(z.object({
    quoteId: z.number(),
    dueDate: z.date().optional(),
  })).mutation(async ({ input, ctx }) => {
    const quotes = await getQuotes();
    const q = quotes.find(q => q.id === input.quoteId);
    if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
    const number = `FAT-${Date.now().toString().slice(-8)}`;
    const invoice = await createInvoice({
      number,
      contactId: q.contactId ?? undefined,
      leadId: q.leadId ?? undefined,
      items: q.items,
      subtotal: q.subtotal,
      total: q.total,
      dueDate: input.dueDate,
      notes: q.notes ?? undefined,
      assignedUserId: ctx.user.id,
    });
    // Mark quote as accepted
    await updateQuote(input.quoteId, { status: "accepted" });
    return invoice;
  }),
});

// ─── STUDIO ROUTER ────────────────────────────────────────────────────────────
const studioRouter = router({
  bookings: protectedProcedure.query(() => getStudioBookings()),
  create: protectedProcedure.input(z.object({
    title: z.string().min(1),
    contactId: z.number().optional(),
    sessionType: z.enum(["recording", "mixing", "mastering", "rehearsal", "other"]).optional(),
    startAt: z.date(),
    endAt: z.date(),
    studio: z.string().optional(),
    engineer: z.string().optional(),
    notes: z.string().optional(),
    value: z.string().optional(),
  })).mutation(({ input, ctx }) =>
    createStudioBooking({ ...input, assignedUserId: ctx.user.id })
  ),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    // Fetch current booking before update to detect status change
    const allBookings = await getStudioBookings();
    const booking = allBookings.find(b => b.id === id);
    await updateStudioBooking(id, data);
    // If status changed to "confirmed", send WhatsApp notification
    if (data.status === "confirmed" && booking && booking.status !== "confirmed" && booking.contactId) {
      try {
        const contact = await getContactById(booking.contactId);
        if (contact?.phone) {
          const phone = contact.phone.replace(/\D/g, "");
          const jid = phone.startsWith("55") ? `${phone}@s.whatsapp.net` : `55${phone}@s.whatsapp.net`;
          const startDate = booking.startAt
            ? new Date(booking.startAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
            : "a definir";
          const endDate = booking.endAt
            ? new Date(booking.endAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
            : "a definir";
          const msg = [
            `✅ *Agendamento Confirmado!*`,
            ``,
            `Olá ${contact.name},`,
            ``,
            `Seu agendamento no Pátio Estúdio foi *confirmado*:`,
            ``,
            `📅 *Sessão:* ${booking.title}`,
            `🕐 *Início:* ${startDate}`,
            `🕐 *Término:* ${endDate}`,
            booking.studio ? `🎙️ *Estúdio:* ${booking.studio}` : null,
            booking.notes ? `📝 *Obs:* ${booking.notes}` : null,
            ``,
            `Qualquer dúvida, estamos à disposição!`,
          ].filter(Boolean).join("\n");
          await sendText(jid, msg);
          await upsertWhatsappMessage({
            chatJid: jid,
            messageId: `booking_confirm_${id}_${Date.now()}`,
            isFromMe: true,
            content: msg,
            timestamp: Date.now(),
            senderName: "Sistema CRM",
          });
          await upsertWhatsappChat({
            jid,
            name: contact.name,
            lastMessageAt: new Date(),
            lastMessagePreview: msg.slice(0, 100),
          });
        }
      } catch (err) {
        console.error("[Studio] Falha ao enviar notificação WhatsApp:", err);
      }
    }
    return { success: true };
  }),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteStudioBooking(input.id)
  ),
});

// ─── TASKS ROUTER ─────────────────────────────────────────────────────────────
const tasksRouter = router({
  list: protectedProcedure.input(z.object({ myTasks: z.boolean().optional() })).query(({ input, ctx }) =>
    getTasks(input.myTasks ? ctx.user.id : undefined)
  ),
  create: protectedProcedure.input(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    contactId: z.number().optional(),
    leadId: z.number().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate: z.date().optional(),
    assignedUserId: z.number().optional(),
  })).mutation(({ input, ctx }) =>
    createTask({ ...input, assignedUserId: input.assignedUserId ?? ctx.user.id })
  ),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
    title: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateTask(id, { ...data, ...(data.status === "done" ? { completedAt: new Date() } : {}) });
  }),
});

// ─── DASHBOARD ROUTER ─────────────────────────────────────────────────────────
const dashboardRouter = router({
  stats: protectedProcedure.query(() => getDashboardStats()),
  activities: protectedProcedure.query(() => getRecentActivities(20)),
});

// ─── ANALYTICS ROUTER ───────────────────────────────────────────────────────
const analyticsRouter = router({
  monthlyRevenue: protectedProcedure.query(() => getMonthlyRevenue(12)),
  topClients: protectedProcedure.query(() => getTopClientsByRevenue(10)),
  conversionFunnel: protectedProcedure.query(() => getLeadConversionFunnel()),
});

// ─── CLIENT PORTAL ROUTER ────────────────────────────────────────────────────
const portalRouter = router({
  generateToken: protectedProcedure.input(z.object({
    type: z.enum(["contract", "invoice", "quote"]),
    documentId: z.number(),
    contactId: z.number().optional(),
    expiresInDays: z.number().optional(),
  })).mutation(({ input }) => createPortalToken(input).then(token => ({ token }))),

  getDocument: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const row = await getPortalToken(input.token);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido ou expirado" });
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) throw new TRPCError({ code: "FORBIDDEN", message: "Link expirado" });
    if (row.type === "contract") {
      const doc = await getContractById(row.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      return { type: "contract" as const, token: row, document: doc };
    }
    if (row.type === "invoice") {
      const doc = await getInvoiceById(row.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      return { type: "invoice" as const, token: row, document: doc };
    }
    if (row.type === "quote") {
      const allQuotes = await getQuotes();
      const doc = allQuotes.find(q => q.id === row.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      return { type: "quote" as const, token: row, document: doc };
    }
    throw new TRPCError({ code: "BAD_REQUEST" });
  }),

  approve: publicProcedure.input(z.object({
    token: z.string(),
    signedName: z.string().optional(),
  })).mutation(async ({ input }) => {
    const row = await getPortalToken(input.token);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido" });
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) throw new TRPCError({ code: "FORBIDDEN", message: "Link expirado" });
    await approvePortalDocument(input.token, input.signedName);
    if (row.type === "contract") await updateContract(row.documentId, { status: "signed", signedAt: new Date(), signerName: input.signedName });
    if (row.type === "quote") await updateQuote(row.documentId, { status: "accepted" });
    return { success: true };
  }),
  // Envia o link do portal via WhatsApp para o contato vinculado
  sendViaWhatsApp: protectedProcedure.input(z.object({
    portalUrl: z.string(),
    contactId: z.number(),
    documentTitle: z.string().optional(),
    documentType: z.enum(["contract", "invoice", "quote"]),
  })).mutation(async ({ input }) => {
    const contact = await getContactById(input.contactId);
    if (!contact?.phone) throw new TRPCError({ code: "BAD_REQUEST", message: "Contato sem número de telefone cadastrado" });
    const digits = contact.phone.replace(/\D/g, "");
    const jid = digits.startsWith("55") ? `${digits}@s.whatsapp.net` : `55${digits}@s.whatsapp.net`;
    const typeLabel = input.documentType === "contract" ? "contrato" : input.documentType === "invoice" ? "fatura" : "orçamento";
    const title = input.documentTitle ? `*${input.documentTitle}*` : `seu ${typeLabel}`;
    const message = `Olá, ${contact.name}! 👋\n\nSegue o link para visualizar e assinar ${title}:\n\n${input.portalUrl}\n\nO link é seguro e exclusivo para você. Qualquer dúvida, estou à disposição! 😊`;
    try {
      await sendText(jid, message);
      return { success: true, jid, contactName: contact.name };
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao enviar mensagem via WhatsApp" });
    }
  }),
  // Reenvia lembrete via WhatsApp com mensagem diferente
  sendReminder: protectedProcedure.input(z.object({
    portalUrl: z.string(),
    contactId: z.number(),
    documentTitle: z.string().optional(),
    documentType: z.enum(["contract", "invoice", "quote"]),
  })).mutation(async ({ input }) => {
    const contact = await getContactById(input.contactId);
    if (!contact?.phone) throw new TRPCError({ code: "BAD_REQUEST", message: "Contato sem número de telefone cadastrado" });
    const digits = contact.phone.replace(/\D/g, "");
    const jid = digits.startsWith("55") ? `${digits}@s.whatsapp.net` : `55${digits}@s.whatsapp.net`;
    const typeLabel = input.documentType === "contract" ? "contrato" : input.documentType === "invoice" ? "fatura" : "orçamento";
    const title = input.documentTitle ? `*${input.documentTitle}*` : `seu ${typeLabel}`;
    const message = `Olá, ${contact.name}! 😊\n\nPassando para lembrar que ${title} ainda aguarda sua assinatura/aprovação.\n\nVocê pode acessar pelo link abaixo a qualquer momento:\n\n${input.portalUrl}\n\nQualquer dúvida, é só chamar! 🙌`;
    try {
      await sendText(jid, message);
      return { success: true, jid, contactName: contact.name };
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao enviar lembrete via WhatsApp" });
    }
  }),
});
// ─── STRIPE ROUTERR ───────────────────────────────────────────────────────────
const stripeRouter = router({
  // Lista os produtos do catálogo do estúdio
  products: protectedProcedure.query(() => STUDIO_PRODUCTS),

  // Cria checkout para pagamento integral de fatura
  createInvoiceCheckout: protectedProcedure.input(z.object({
    invoiceId: z.number(),
    origin: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

    const invoice = await getInvoiceById(input.invoiceId);
    if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });

    // Cria ou recupera Stripe Customer
    const stripeCustomerId = await getOrCreateStripeCustomer({
      stripeCustomerId: ctx.user.stripeCustomerId,
      email: ctx.user.email,
      name: ctx.user.name,
      userId: ctx.user.id,
    });

    // Salva stripeCustomerId se for novo
    if (!ctx.user.stripeCustomerId) {
      await db.update(usersTable).set({ stripeCustomerId }).where(eq(usersTable.id, ctx.user.id));
    }

    const totalCents = Math.round(parseFloat(invoice.total ?? "0") * 100);
    const description = `Fatura ${invoice.number} — Estúdio de Podcast`;

    const { url, sessionId } = await createInvoiceCheckoutSession({
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      description,
      amountCents: totalCents,
      customerEmail: ctx.user.email,
      customerName: ctx.user.name,
      stripeCustomerId,
      userId: ctx.user.id,
      origin: input.origin,
    });

    // Salva URL de pagamento na fatura
    await updateInvoice(invoice.id, { stripePaymentUrl: url, stripeCheckoutSessionId: sessionId });

    return { checkoutUrl: url, sessionId };
  }),

  // Cria checkout para plano 50%/50% (gera 2 links)
  createSplitCheckout: protectedProcedure.input(z.object({
    invoiceId: z.number(),
    origin: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

    const invoice = await getInvoiceById(input.invoiceId);
    if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });

    const stripeCustomerId = await getOrCreateStripeCustomer({
      stripeCustomerId: ctx.user.stripeCustomerId,
      email: ctx.user.email,
      name: ctx.user.name,
      userId: ctx.user.id,
    });

    if (!ctx.user.stripeCustomerId) {
      await db.update(usersTable).set({ stripeCustomerId }).where(eq(usersTable.id, ctx.user.id));
    }

    const totalCents = Math.round(parseFloat(invoice.total ?? "0") * 100);
    const description = `Fatura ${invoice.number} — Estúdio de Podcast`;

    const { session1, session2 } = await createSplitPaymentSessions({
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      description,
      totalAmountCents: totalCents,
      customerEmail: ctx.user.email,
      customerName: ctx.user.name,
      stripeCustomerId,
      userId: ctx.user.id,
      origin: input.origin,
    });

    // Salva o link da parcela 1 na fatura
    await updateInvoice(invoice.id, {
      stripePaymentUrl: session1.url,
      stripeCheckoutSessionId: session1.sessionId,
      paymentPlan: "installment_50_50",
    });

    return {
      installment1: { url: session1.url, sessionId: session1.sessionId },
      installment2: { url: session2.url, sessionId: session2.sessionId },
    };
  }),

  // Histórico de pagamentos do usuário via Stripe API
  paymentHistory: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.stripeCustomerId) return { payments: [] };

    try {
      const paymentIntents = await stripe.paymentIntents.list({
        customer: ctx.user.stripeCustomerId,
        limit: 50,
      });

      const payments = paymentIntents.data.map((pi) => ({
        id: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        status: pi.status,
        description: pi.description,
        createdAt: new Date(pi.created * 1000),
        receiptUrl: pi.latest_charge
          ? `https://dashboard.stripe.com/payments/${pi.id}`
          : null,
      }));

      return { payments };
    } catch (err) {
      console.error("[Stripe] Error fetching payment history:", err);
      return { payments: [] };
    }
  }),
});

// ─── DOCUMENTS ROUTER (PDF generation & sending) ─────────────────────────────────
const documentsRouter = router({
  generateInvoicePdf: protectedProcedure.input(z.object({ invoiceId: z.number() })).mutation(async ({ input }) => {
    const { buildInvoiceHtml, uploadDocumentPdf } = await import("./pdf");
    const invoice = await getInvoiceById(input.invoiceId);
    if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });
    const items = typeof invoice.items === "string" ? JSON.parse(invoice.items) : (invoice.items ?? []);
    const html = buildInvoiceHtml({ number: invoice.number, clientName: (invoice as any).clientName ?? "Cliente", clientEmail: (invoice as any).clientEmail ?? null, items, subtotal: Number(invoice.subtotal ?? 0), discount: 0, total: Number(invoice.total ?? 0), dueDate: invoice.dueDate, notes: invoice.notes, status: invoice.status ?? "draft", companyName: "Estúdio de Podcast" });
    const url = await uploadDocumentPdf(html, `fatura-${invoice.number}`);
    return { url, filename: `Fatura-${invoice.number}.pdf` };
  }),
  generateQuotePdf: protectedProcedure.input(z.object({ quoteId: z.number() })).mutation(async ({ input }) => {
    const { buildQuoteHtml, uploadDocumentPdf } = await import("./pdf");
    const quotes = await getQuotes();
    const q = quotes.find(q => q.id === input.quoteId);
    if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
    const items = typeof q.items === "string" ? JSON.parse(q.items) : (q.items ?? []);
    const html = buildQuoteHtml({ number: q.number, clientName: (q as any).clientName ?? "Cliente", items, subtotal: Number(q.subtotal ?? 0), discount: Number(q.discount ?? 0), total: Number(q.total ?? 0), validUntil: q.validUntil, notes: q.notes, status: q.status ?? "draft", companyName: "Estúdio de Podcast" });
    const url = await uploadDocumentPdf(html, `orcamento-${q.number}`);
    return { url, filename: `Orcamento-${q.number}.pdf` };
  }),
  sendByWhatsapp: protectedProcedure.input(z.object({
    type: z.enum(["invoice", "quote", "contract"]),
    documentId: z.number(),
    recipientJid: z.string(),
    message: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    let docUrl = "";
    let docName = "";
    if (input.type === "invoice") {
      const { buildInvoiceHtml, uploadDocumentPdf } = await import("./pdf");
      const invoice = await getInvoiceById(input.documentId);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
      const items = typeof invoice.items === "string" ? JSON.parse(invoice.items) : (invoice.items ?? []);
      const html = buildInvoiceHtml({ number: invoice.number, clientName: (invoice as any).clientName ?? "Cliente", clientEmail: (invoice as any).clientEmail ?? null, items, subtotal: Number(invoice.subtotal ?? 0), discount: 0, total: Number(invoice.total ?? 0), dueDate: invoice.dueDate, notes: invoice.notes, status: invoice.status ?? "draft", companyName: "Estúdio de Podcast" });
      docUrl = await uploadDocumentPdf(html, `fatura-${invoice.number}`);
      docName = `Fatura ${invoice.number}`;
    } else if (input.type === "quote") {
      const { buildQuoteHtml, uploadDocumentPdf } = await import("./pdf");
      const quotes = await getQuotes();
      const q = quotes.find(q => q.id === input.documentId);
      if (!q) throw new TRPCError({ code: "NOT_FOUND" });
      const items = typeof q.items === "string" ? JSON.parse(q.items) : (q.items ?? []);
      const html = buildQuoteHtml({ number: q.number, clientName: (q as any).clientName ?? "Cliente", items, subtotal: Number(q.subtotal ?? 0), discount: Number(q.discount ?? 0), total: Number(q.total ?? 0), validUntil: q.validUntil, notes: q.notes, status: q.status ?? "draft", companyName: "Estúdio de Podcast" });
      docUrl = await uploadDocumentPdf(html, `orcamento-${q.number}`);
      docName = `Orçamento ${q.number}`;
    }
    const userName = ctx.user.name ?? ctx.user.email ?? "Usuário";
    const introText = input.message
      ? `[${userName}]: ${input.message}`
      : `[${userName}]: Segue em anexo o documento ${docName}.`;
    // Send via Z-API: text first, then document
    let zapiMessageId: string | undefined;
    let zapiError: string | undefined;
    try {
      await sendText(input.recipientJid, introText);
      const docResult = await sendDocument(input.recipientJid, docUrl, docName, "pdf");
      zapiMessageId = docResult.messageId;
    } catch (err) {
      zapiError = err instanceof Error ? err.message : String(err);
      console.error("[Z-API] sendDocument error:", zapiError);
    }
    // Store in DB
    const fullMsg = `${introText}\n\n📎 ${docName}: ${docUrl}`;
    await upsertWhatsappMessage({ chatJid: input.recipientJid, messageId: zapiMessageId ?? `doc_${Date.now()}`, isFromMe: true, content: fullMsg, timestamp: Date.now(), senderName: userName });
    return { success: true, documentUrl: docUrl, message: fullMsg, zapiError };
  }),
  sendByEmail: protectedProcedure.input(z.object({
    type: z.enum(["invoice", "quote", "contract"]),
    documentId: z.number(),
    recipientEmail: z.string().email(),
    recipientName: z.string().optional(),
    subject: z.string().optional(),
    message: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { sendInvoiceEmail, sendQuoteEmail, sendContractEmail } = await import("./email");
    const COMPANY = "Pátio Estúdio de Podcast";

    if (input.type === "invoice") {
      const invoice = await getInvoiceById(input.documentId);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });
      const items = typeof invoice.items === "string" ? JSON.parse(invoice.items) : (invoice.items ?? []);
      const result = await sendInvoiceEmail({
        to: input.recipientEmail,
        toName: input.recipientName,
        subject: input.subject,
        invoice: {
          number: invoice.number,
          clientName: input.recipientName ?? "Cliente",
          items,
          subtotal: Number(invoice.subtotal ?? 0),
          discount: 0,
          total: Number(invoice.total ?? 0),
          dueDate: invoice.dueDate,
          notes: input.message ?? invoice.notes,
          status: invoice.status ?? "draft",
          companyName: COMPANY,
        },
      });
      if (!result.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error ?? "Falha ao enviar email" });
      return { success: true, messageId: result.messageId };

    } else if (input.type === "quote") {
      const quotes = await getQuotes();
      const q = quotes.find(q => q.id === input.documentId);
      if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
      const items = typeof q.items === "string" ? JSON.parse(q.items) : (q.items ?? []);
      const result = await sendQuoteEmail({
        to: input.recipientEmail,
        toName: input.recipientName,
        subject: input.subject,
        quote: {
          number: q.number,
          clientName: input.recipientName ?? "Cliente",
          items,
          subtotal: Number(q.subtotal ?? 0),
          discount: Number(q.discount ?? 0),
          total: Number(q.total ?? 0),
          validUntil: q.validUntil,
          notes: input.message ?? q.notes,
          status: q.status ?? "draft",
          companyName: COMPANY,
        },
      });
      if (!result.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error ?? "Falha ao enviar email" });
      return { success: true, messageId: result.messageId };

    } else if (input.type === "contract") {
      const contract = await getContractById(input.documentId);
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Contrato não encontrado" });
      const contractNum = `CTR-${String(contract.id).padStart(4, "0")}`;
      const result = await sendContractEmail({
        to: input.recipientEmail,
        toName: input.recipientName,
        subject: input.subject,
        contract: {
          number: contractNum,
          clientName: input.recipientName ?? "Cliente",
          title: contract.title,
          type: "Contrato de Serviços",
          value: contract.value ? Number(contract.value) : null,
          startDate: null,
          endDate: contract.validUntil ?? null,
          status: contract.status ?? "draft",
          notes: input.message ?? undefined,
          companyName: COMPANY,
        },
      });
      if (!result.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error ?? "Falha ao enviar email" });
      return { success: true, messageId: result.messageId };
    }

    throw new TRPCError({ code: "BAD_REQUEST", message: "Tipo de documento inválido" });
  }),
});

// ─── APP ROUTER ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  users: usersRouter,
  contacts: contactsRouter,
  pipeline: pipelineRouter,
  whatsapp: whatsappRouter,
  contracts: contractsRouter,
  invoices: invoicesRouter,
  quotes: quotesRouter,
  studio: studioRouter,
  tasks: tasksRouter,
  dashboard: dashboardRouter,
  stripe: stripeRouter,
  ai: aiRouter,
  settings: settingsRouter,
  documents: documentsRouter,
  analytics: analyticsRouter,
  portal: portalRouter,
});

export type AppRouter = typeof appRouter;
