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
  getProducts, getProductById, createProduct, updateProduct, deleteProduct,
  getBillingReminders, createBillingReminder, cancelBillingReminder,
  getProjects, getProjectById, createProject, updateProject, deleteProject, getProjectLinks, addProjectLink, removeProjectLink,
  getContractTemplates, getContractTemplateById, createContractTemplate, updateContractTemplate, deleteContractTemplate, incrementTemplateUsage,
  getAllContactTags, createContactTag, deleteContactTag, getTagsForContact, assignTagToContact, removeTagFromContact,
  getCreditBalance, getCreditHistory, addCreditTransaction,
  getPjDocumentByContact, createPjDocument, updatePjDocument,
  getRoutineTemplatesByRole, getAllRoutineTemplates, createRoutineTemplate, updateRoutineTemplate, deleteRoutineTemplate, seedDefaultRoutines,
  getDailyRoutine, upsertDailyRoutine,
  checkStudioConflict,
  getPodcasts, getPodcastById, createPodcast, updatePodcast, deletePodcast,
  getEpisodesByPodcast, getEpisodeById, createEpisode, updateEpisode, deleteEpisode,
  getEpisodeComments, createEpisodeComment,
  getBrandSettings, upsertBrandSettings,
  createPortalMagicLink, validatePortalMagicLink, getPortalDataForContact,
  getAutomationSequences, getAutomationSequenceById, createAutomationSequence, updateAutomationSequence, deleteAutomationSequence,
  getAutomationSteps, createAutomationStep, updateAutomationStep, deleteAutomationStep,
  getAutomationExecutions, scheduleAutomationForLead,
  getMessageTemplates, createMessageTemplate, updateMessageTemplate, deleteMessageTemplate,
  getStudioRooms, getStudioRoomById, createStudioRoom, updateStudioRoom, deleteStudioRoom, seedDefaultStudioRooms,
  getEquipment, getEquipmentById, createEquipment, updateEquipment, deleteEquipment,
  getEquipmentBookingsByStudioBooking, createEquipmentBooking, deleteEquipmentBookingsByStudioBooking,
  getEquipmentOccupancyReport, getRoomOccupancyReport,
  createEntryInvoiceForBooking, confirmBookingEntryPayment, waiveBookingEntryPayment,
  autoGenerateInvoicesOnContractSign,
  getBookingsWithPendingPaymentIn48h, markBookingReminderSent,
  updateContactSubscription,
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  getDashboardActionItems,
  getDashboardKpis,
  getTocConfig, upsertTocConfig,
  getTocSessions, getTocSessionById, createTocSession, updateTocSession, deleteTocSession,
  getTocConstraints, createTocConstraint, updateTocConstraint, deleteTocConstraint,
  getTocActionItems, createTocActionItem, updateTocActionItem, deleteTocActionItem,
  getTocDashboard,
  getWhatsappAnalysisList, getWhatsappAnalysisByChatId, upsertWhatsappAnalysis, deleteWhatsappAnalysis,
  getNpsResponses, createNpsResponse, updateNpsResponse, getNpsStats,
  getTimeEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry, getTimeEntrySummary,
  exportContactsData, exportInvoicesData, exportQuotesData, exportContractsData,
  getWhatsappConversationReport,
  signContract,
  createEntryInvoiceOnSign,
  createProjectOnContractSign,
  getLeadsWithoutInteraction48h,
  getContractsExpiringIn30Days,
  createRenewalLead,
  createLeadActivity,
  getLeadActivities,
  computeLeadScore,
  getPipelineForecast,
  getLeadsWithContact,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { stripe, createInvoiceCheckoutSession, createSplitPaymentSessions, getOrCreateStripeCustomer } from "./stripe/stripe";
import {
  sendText, sendDocument, sendImage, sendAudio, sendVideo, sendLocation, sendLink,
  sendReaction, sendPoll, deleteMessage as zapiDeleteMessage, replyMessage,
  getInstanceStatus, getChats, getChatMessages,
  readChat, archiveChat, pinChat, muteChat, clearChat, deleteChat, getTotalUnread,
  getContacts as zapiGetContacts, getContactInfo, checkNumberExists, getProfilePicture,
  getGroups, getGroupInfo,
  getQRCode, restartInstance, disconnectInstance, getCellphoneData,
  normalizePhone,
} from "./zapi";
import { STUDIO_PRODUCTS } from "./stripe/products";
import { getDb } from "./db";
import { users as usersTable } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

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
    lostReason: z.string().optional(),
    source: z.enum(["manual", "whatsapp", "import", "website", "event", "referral", "cold_outreach"]).optional(),
    notes: z.string().optional(),
    expectedCloseDate: z.date().optional(),
  })).mutation(async ({ input, ctx }) => {
    const { id, lostReason, ...data } = input;
    const prevLead = await getLeadById(id);
    const result = await updateLead(id, data);
    // Log activity
    if (data.stageId && prevLead) {
      const stages = await getPipelineStages();
      const prevStage = stages.find(s => s.id === prevLead.stageId);
      const newStage = stages.find(s => s.id === data.stageId);
      if (prevStage?.name !== newStage?.name) {
        await createLeadActivity({ leadId: id, userId: ctx.user.id, type: "stage_changed", description: `Movido de "${prevStage?.name ?? '?'}" para "${newStage?.name ?? '?'}"` });
      }
      try {
        const lead = await getLeadById(id);
        if (lead && newStage && lead.contactId) {
          await scheduleAutomationForLead(id, lead.contactId, newStage.name);
        }
      } catch (e) {
        console.warn("[Automation] Failed to schedule for lead", id, e);
      }
    }
    if (data.status === "lost") {
      await createLeadActivity({ leadId: id, userId: ctx.user.id, type: "status_changed", description: `Lead marcado como Perdido${lostReason ? `: ${lostReason}` : ""}`, metadata: { lostReason } });
    } else if (data.status === "won") {
      await createLeadActivity({ leadId: id, userId: ctx.user.id, type: "status_changed", description: "Lead marcado como Ganho" });
    }
    if (data.value && prevLead && data.value !== prevLead.value) {
      await createLeadActivity({ leadId: id, userId: ctx.user.id, type: "value_updated", description: `Valor atualizado para R$ ${Number(data.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` });
    }
    return result;
  }),
  deleteLead: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteLead(input.id)
  ),
  // Sprint Funil — novas procedures
  activities: protectedProcedure.input(z.object({ leadId: z.number() })).query(({ input }) =>
    getLeadActivities(input.leadId)
  ),
  addActivity: protectedProcedure.input(z.object({
    leadId: z.number(),
    type: z.enum(["note_added", "whatsapp_sent", "email_sent", "invoice_generated", "contract_generated", "manual"]),
    description: z.string().min(1),
  })).mutation(({ input, ctx }) =>
    createLeadActivity({ leadId: input.leadId, userId: ctx.user.id, type: input.type, description: input.description })
  ),
  forecast: protectedProcedure.query(() => getPipelineForecast()),
  leadsWithContact: protectedProcedure.input(z.object({
    stageId: z.number().optional(),
    status: z.string().optional(),
  })).query(({ input }) => getLeadsWithContact(input.stageId, input.status)),
  score: protectedProcedure.input(z.object({ leadId: z.number() })).query(async ({ input }) => {
    const lead = await getLeadById(input.leadId);
    if (!lead) return 0;
    return computeLeadScore(lead);
  }),
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

  // ── New Z-API extended procedures ──────────────────────────────────────────

  sendAudio: whatsappProcedure.input(z.object({
    phone: z.string(),
    audioUrl: z.string().url(),
  })).mutation(async ({ input }) => {
    const result = await sendAudio(input.phone, input.audioUrl);
    return { success: true, messageId: result.messageId };
  }),

  sendVideo: whatsappProcedure.input(z.object({
    phone: z.string(),
    videoUrl: z.string().url(),
    caption: z.string().optional(),
  })).mutation(async ({ input }) => {
    const result = await sendVideo(input.phone, input.videoUrl, input.caption);
    return { success: true, messageId: result.messageId };
  }),

  sendImage: whatsappProcedure.input(z.object({
    phone: z.string(),
    imageUrl: z.string().url(),
    caption: z.string().optional(),
  })).mutation(async ({ input }) => {
    const result = await sendImage(input.phone, input.imageUrl, input.caption);
    return { success: true, messageId: result.messageId };
  }),

  sendLocation: whatsappProcedure.input(z.object({
    phone: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    name: z.string().optional(),
    address: z.string().optional(),
  })).mutation(async ({ input }) => {
    const result = await sendLocation(input.phone, input.latitude, input.longitude, input.name, input.address);
    return { success: true, messageId: result.messageId };
  }),

  sendLink: whatsappProcedure.input(z.object({
    phone: z.string(),
    message: z.string(),
    linkUrl: z.string().url(),
    title: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
  })).mutation(async ({ input }) => {
    const result = await sendLink(input.phone, input.message, input.linkUrl, input.title, input.description, input.imageUrl);
    return { success: true, messageId: result.messageId };
  }),

  sendReaction: whatsappProcedure.input(z.object({
    phone: z.string(),
    messageId: z.string(),
    reaction: z.string(),
  })).mutation(async ({ input }) => {
    const result = await sendReaction(input.phone, input.messageId, input.reaction);
    return { success: true, messageId: result.messageId };
  }),

  sendPoll: whatsappProcedure.input(z.object({
    phone: z.string(),
    name: z.string(),
    options: z.array(z.string()).min(2).max(12),
    selectableCount: z.number().optional(),
  })).mutation(async ({ input }) => {
    const result = await sendPoll(input.phone, input.name, input.options, input.selectableCount);
    return { success: true, messageId: result.messageId };
  }),

  deleteMessage: whatsappProcedure.input(z.object({
    phone: z.string(),
    messageId: z.string(),
    owner: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    return zapiDeleteMessage(input.phone, input.messageId, input.owner ?? true);
  }),

  replyMessage: whatsappProcedure.input(z.object({
    phone: z.string(),
    message: z.string().min(1),
    messageId: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const userName = ctx.user.name ?? "Usuário";
    const prefixedMessage = `[${userName}]: ${input.message}`;
    const result = await replyMessage(input.phone, prefixedMessage, input.messageId);
    await upsertWhatsappMessage({
      messageId: result.messageId,
      chatJid: input.phone,
      content: prefixedMessage,
      isFromMe: true,
      crmUserId: ctx.user.id,
      crmUserName: userName,
      timestamp: Date.now(),
    });
    return { success: true, messageId: result.messageId };
  }),

  readChat: whatsappProcedure.input(z.object({ phone: z.string() })).mutation(async ({ input }) => {
    return readChat(input.phone);
  }),

  archiveChat: whatsappProcedure.input(z.object({
    phone: z.string(),
    archive: z.boolean().default(true),
  })).mutation(async ({ input }) => {
    return archiveChat(input.phone, input.archive);
  }),

  pinChat: whatsappProcedure.input(z.object({
    phone: z.string(),
    pin: z.boolean().default(true),
  })).mutation(async ({ input }) => {
    return pinChat(input.phone, input.pin);
  }),

  muteChat: whatsappProcedure.input(z.object({
    phone: z.string(),
    mute: z.boolean().default(true),
    duration: z.number().optional(),
  })).mutation(async ({ input }) => {
    return muteChat(input.phone, input.mute, input.duration);
  }),

  clearChat: whatsappProcedure.input(z.object({ phone: z.string() })).mutation(async ({ input }) => {
    return clearChat(input.phone);
  }),

  deleteChat: whatsappProcedure.input(z.object({ phone: z.string() })).mutation(async ({ input }) => {
    return deleteChat(input.phone);
  }),

  totalUnreadZapi: whatsappProcedure.query(() => getTotalUnread()),

  zapiContacts: whatsappProcedure.query(() => zapiGetContacts(0, 200)),

  contactInfo: whatsappProcedure.input(z.object({ phone: z.string() })).query(({ input }) =>
    getContactInfo(input.phone)
  ),

  checkNumber: whatsappProcedure.input(z.object({ phone: z.string() })).query(({ input }) =>
    checkNumberExists(input.phone)
  ),

  profilePicture: whatsappProcedure.input(z.object({ phone: z.string() })).query(({ input }) =>
    getProfilePicture(input.phone)
  ),

  groups: whatsappProcedure.query(() => getGroups()),

  groupInfo: whatsappProcedure.input(z.object({ groupId: z.string() })).query(({ input }) =>
    getGroupInfo(input.groupId)
  ),

  qrCode: whatsappProcedure.query(() => getQRCode()),

  restart: whatsappProcedure.mutation(() => restartInstance()),

  disconnect: whatsappProcedure.mutation(() => disconnectInstance()),

  cellphone: whatsappProcedure.query(() => getCellphoneData()),

  syncZapiContacts: whatsappProcedure.mutation(async () => {
    const contacts = await zapiGetContacts(0, 500);
    let synced = 0;
    for (const c of contacts) {
      if (!c.phone) continue;
      const name = c.name ?? c.notify ?? c.vname ?? c.short ?? "Contato WA";
      try {
        await createContact({
          name,
          phone: c.phone,
          source: "whatsapp",
          whatsappJid: c.phone,
        });
        synced++;
      } catch {
        // Skip duplicates
      }
    }
    return { synced, total: contacts.length };
  }),
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
  generatePdf: protectedProcedure.input(z.object({ contractId: z.number() })).mutation(async ({ input }) => {
    const { uploadDocumentPdf } = await import("./pdf");
    const contract = await getContractById(input.contractId);
    if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Contrato não encontrado" });
    const contractWithContact = (await getContractsWithContact()).find(c => c.id === input.contractId);
    const clientName = contractWithContact?.contactName ?? contract.signerName ?? "Cliente";
    const safeContent = (contract.content ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
      h1 { color: #1a1a2e; border-bottom: 2px solid #6366f1; padding-bottom: 10px; font-size: 22px; }
      .meta { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
      .meta p { margin: 5px 0; font-size: 14px; }
      .content { line-height: 1.8; white-space: pre-wrap; margin-top: 20px; font-size: 14px; }
      .signature { margin-top: 60px; border-top: 1px solid #ccc; padding-top: 20px; }
      .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
    </style></head><body>
      <h1>${contract.title}</h1>
      <div class="meta">
        <p><strong>Cliente:</strong> ${clientName}</p>
        ${contract.value ? `<p><strong>Valor:</strong> R$ ${Number(contract.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>` : ""}
        ${contract.validUntil ? `<p><strong>Válido até:</strong> ${new Date(contract.validUntil).toLocaleDateString("pt-BR")}</p>` : ""}
        <p><strong>Status:</strong> ${contract.status ?? "rascunho"}</p>
        ${contract.signedAt ? `<p><strong>Assinado em:</strong> ${new Date(contract.signedAt).toLocaleDateString("pt-BR")}</p>` : ""}
      </div>
      <div class="content">${safeContent}</div>
      ${contract.signatureUrl ? `<div class="signature"><p><strong>Assinatura Digital:</strong></p><img src="${contract.signatureUrl}" style="max-width:300px;border:1px solid #ccc;padding:10px;border-radius:4px" /></div>` : ""}
      <div class="footer">Documento gerado em ${new Date().toLocaleDateString("pt-BR")} &mdash; CRM Studio</div>
    </body></html>`;
    const url = await uploadDocumentPdf(html, `contrato-${contract.id}`);
    return { url, filename: `Contrato-${contract.title.replace(/\s+/g, "-")}.pdf` };
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
    await updateQuote(input.quoteId, { status: "accepted" });
    return invoice;
  }),
  convertToContract: protectedProcedure.input(z.object({
    quoteId: z.number(),
    title: z.string().optional(),
    validUntil: z.date().optional(),
  })).mutation(async ({ input, ctx }) => {
    const quotes = await getQuotes();
    const q = quotes.find(q => q.id === input.quoteId);
    if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
    // Build contract content from quote items
    const itemLines = (q.items ?? []).map((item: { description: string; quantity: number; unitPrice: number; total: number }) =>
      `- ${item.description}: ${item.quantity}x R$ ${Number(item.unitPrice).toFixed(2)} = R$ ${Number(item.total).toFixed(2)}`
    ).join("\n");
    const content = [
      `CONTRATO DE PRESTAÇÃO DE SERVIÇOS`,
      ``,
      `Originado do Orçamento ${q.number}`,
      ``,
      `SERVIÇOS CONTRATADOS:`,
      itemLines,
      ``,
      `VALOR TOTAL: R$ ${Number(q.total ?? 0).toFixed(2)}`,
      q.notes ? `\nOBSERVAÇÕES:\n${q.notes}` : "",
    ].filter(l => l !== undefined).join("\n");
    const contract = await createContract({
      title: input.title ?? `Contrato — ${q.number}`,
      contactId: q.contactId ?? undefined,
      leadId: q.leadId ?? undefined,
      value: q.total,
      content,
      validUntil: input.validUntil,
      assignedUserId: ctx.user.id,
    });
    await updateQuote(input.quoteId, { status: "accepted" });
    return contract;
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
  checkConflict: protectedProcedure.input(z.object({
    startAt: z.date(),
    endAt: z.date(),
    studio: z.string().optional(),
    excludeId: z.number().optional(),
  })).query(({ input }) => checkStudioConflict(input.startAt, input.endAt, input.studio, input.excludeId)),
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
  actionItems: protectedProcedure.query(() => getDashboardActionItems()),
  kpis: protectedProcedure.query(() => getDashboardKpis()),
});

// ─── NOTIFICATIONS ROUTER ─────────────────────────────────────────────
const notificationsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getNotifications(ctx.user.id)),
  unreadCount: protectedProcedure.query(({ ctx }) => getUnreadNotificationCount(ctx.user.id)),
  markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input, ctx }) =>
    markNotificationRead(input.id, ctx.user.id)
  ),
  markAllRead: protectedProcedure.mutation(({ ctx }) => markAllNotificationsRead(ctx.user.id)),
  create: protectedProcedure.input(z.object({
    type: z.string(),
    title: z.string(),
    message: z.string(),
    link: z.string().optional(),
  })).mutation(({ input, ctx }) =>
    createNotification({ ...input, userId: ctx.user.id })
  ),
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
  emailStatus: protectedProcedure.query(() => {
    const hasKey = !!(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.length > 10);
    return {
      configured: hasKey,
      fromEmail: process.env.BREVO_FROM_EMAIL ?? "noreply@patioestudioscrm.manus.space",
      fromName: process.env.BREVO_FROM_NAME ?? "Pátio Estúdio de Podcast",
      message: hasKey
        ? "Brevo configurado e pronto para envio"
        : "BREVO_API_KEY não configurado — vá em Configurações → Secrets e adicione a chave da API Brevo",
    };
  }),
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

// // ─── PRODUCTS ROUTER ────────────────────────────────────────────────────────────
const productsRouter = router({
  list: protectedProcedure.input(z.object({ activeOnly: z.boolean().optional() })).query(({ input }) =>
    getProducts(input.activeOnly ?? true)
  ),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getProductById(input.id)
  ),
  create: managerProcedure.input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.enum(["episode", "package", "studio", "service", "other"]).optional(),
    unitPrice: z.string(),
    currency: z.string().optional(),
    unit: z.string().optional(),
  })).mutation(({ input }) => createProduct(input)),
  update: managerProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.enum(["episode", "package", "studio", "service", "other"]).optional(),
    unitPrice: z.string().optional(),
    currency: z.string().optional(),
    unit: z.string().optional(),
    active: z.boolean().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateProduct(id, data);
  }),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteProduct(input.id)
  ),
});

// ─── BILLING REMINDERS ROUTER ────────────────────────────────────────────────────────────
const billingRemindersRouter = router({
  list: protectedProcedure.input(z.object({ invoiceId: z.number().optional() })).query(({ input }) =>
    getBillingReminders(input.invoiceId)
  ),
  create: protectedProcedure.input(z.object({
    invoiceId: z.number(),
    contactId: z.number().optional(),
    channel: z.enum(["whatsapp", "email"]),
    scheduledAt: z.date(),
    message: z.string().optional(),
  })).mutation(({ input }) => createBillingReminder(input)),
  cancel: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    cancelBillingReminder(input.id)
  ),
});

// ─── PROJECTS ROUTER ───────────────────────────────────────────────────────
const projectsRouter = router({
  list: protectedProcedure.input(z.object({ contactId: z.number().optional() })).query(({ input }) =>
    getProjects(input.contactId)
  ),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getProjectById(input.id)
  ),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    contactId: z.number().optional(),
    status: z.enum(["briefing", "recording", "editing", "review", "published", "archived"]).optional(),
    type: z.enum(["podcast", "audiobook", "commercial", "voiceover", "music", "other"]).optional(),
    description: z.string().optional(),
    startDate: z.date().optional(),
    deadline: z.date().optional(),
    totalValue: z.string().optional(),
    assignedTo: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(({ input }) => createProject(input)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    contactId: z.number().optional(),
    status: z.enum(["briefing", "recording", "editing", "review", "published", "archived"]).optional(),
    type: z.enum(["podcast", "audiobook", "commercial", "voiceover", "music", "other"]).optional(),
    description: z.string().optional(),
    startDate: z.date().optional(),
    deadline: z.date().optional(),
    totalValue: z.string().optional(),
    assignedTo: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(({ input }) => { const { id, ...data } = input; return updateProject(id, data); }),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteProject(input.id)),
  links: protectedProcedure.input(z.object({ projectId: z.number() })).query(({ input }) => getProjectLinks(input.projectId)),
  addLink: protectedProcedure.input(z.object({
    projectId: z.number(),
    entityType: z.enum(["booking", "invoice", "contract", "quote", "task"]),
    entityId: z.number(),
  })).mutation(({ input }) => addProjectLink(input.projectId, input.entityType, input.entityId)),
  removeLink: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => removeProjectLink(input.id)),
});

// ─── CONTRACT TEMPLATES ROUTER ───────────────────────────────────────────────
const contractTemplatesRouter = router({
  list: protectedProcedure.query(() => getContractTemplates()),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getContractTemplateById(input.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    category: z.string().optional(),
    description: z.string().optional(),
    content: z.string().min(1),
    variables: z.string().optional(),
    isDefault: z.boolean().optional(),
  })).mutation(({ input }) => createContractTemplate(input)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    content: z.string().optional(),
    variables: z.string().optional(),
    isDefault: z.boolean().optional(),
  })).mutation(({ input }) => { const { id, ...data } = input; return updateContractTemplate(id, data); }),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteContractTemplate(input.id)),
  useTemplate: protectedProcedure.input(z.object({
    templateId: z.number(),
    variables: z.record(z.string(), z.string()).optional(),
  })).mutation(async ({ input }) => {
    const template = await getContractTemplateById(input.templateId);
    if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Modelo não encontrado" });
    await incrementTemplateUsage(input.templateId);
    let content = template.content ?? "";
    if (input.variables) {
      for (const [key, value] of Object.entries(input.variables)) {
        content = content.split(`{{${key}}}`).join(String(value));
      }
    }
    return { content, template };
  }),
});

// ─── CONTACT TAGS ROUTER ─────────────────────────────────────────────────────
const contactTagsRouter = router({
  list: protectedProcedure.query(() => getAllContactTags()),
  create: managerProcedure.input(z.object({
    name: z.string().min(1),
    color: z.string().optional().default("#6366f1"),
  })).mutation(({ input }) => createContactTag(input.name, input.color)),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteContactTag(input.id)),
  getForContact: protectedProcedure.input(z.object({ contactId: z.number() })).query(({ input }) => getTagsForContact(input.contactId)),
  assign: protectedProcedure.input(z.object({ contactId: z.number(), tagId: z.number() })).mutation(({ input }) => assignTagToContact(input.contactId, input.tagId)),
  remove: protectedProcedure.input(z.object({ contactId: z.number(), tagId: z.number() })).mutation(({ input }) => removeTagFromContact(input.contactId, input.tagId)),
});

// ─── CREDITS ROUTER ──────────────────────────────────────────────────────────
const creditsRouter = router({
  balance: protectedProcedure.input(z.object({ contactId: z.number() })).query(({ input }) => getCreditBalance(input.contactId)),
  history: protectedProcedure.input(z.object({ contactId: z.number() })).query(({ input }) => getCreditHistory(input.contactId)),
  add: managerProcedure.input(z.object({
    contactId: z.number(),
    type: z.enum(["credit", "debit", "bonus", "refund"]),
    amount: z.string(),
    description: z.string().min(1),
    referenceType: z.string().optional(),
    referenceId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const currentBalance = await getCreditBalance(input.contactId);
    const amount = parseFloat(input.amount);
    const newBalance = input.type === "debit" ? currentBalance - amount : currentBalance + amount;
    if (newBalance < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Saldo insuficiente" });
    await addCreditTransaction({
      contactId: input.contactId,
      type: input.type,
      amount: input.amount,
      balance: newBalance.toFixed(2),
      description: input.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdBy: ctx.user.id,
    });
    return { success: true, newBalance };
  }),
});

// ─── PJ ONBOARDING ROUTER ───────────────────────────────────────────────────
const pjRouter = router({
  get: protectedProcedure.input(z.object({ contactId: z.number() })).query(({ input }) =>
    getPjDocumentByContact(input.contactId)
  ),
  save: protectedProcedure.input(z.object({
    contactId: z.number(),
    cnpj: z.string().optional(),
    razaoSocial: z.string().optional(),
    nomeFantasia: z.string().optional(),
    inscricaoEstadual: z.string().optional(),
    enderecoCompleto: z.string().optional(),
    responsavelNome: z.string().optional(),
    responsavelCpf: z.string().optional(),
    responsavelEmail: z.string().optional(),
    responsavelTelefone: z.string().optional(),
    documentUrl: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const existing = await getPjDocumentByContact(input.contactId);
    if (existing) {
      await updatePjDocument(existing.id, input);
      return { success: true, id: existing.id };
    } else {
      const result = await createPjDocument({ ...input, status: "pending" });
      return { success: true, id: (result as { insertId: number }).insertId };
    }
  }),
  extractFromDocument: protectedProcedure.input(z.object({
    contactId: z.number(),
    documentUrl: z.string(),
    documentText: z.string().optional(),
  })).mutation(async ({ input }) => {
    const prompt = `Você é um assistente especializado em extração de dados de documentos empresariais brasileiros.
Analise o texto abaixo e extraia as informações da empresa. Retorne APENAS um JSON com os campos:
cnpj, razaoSocial, nomeFantasia, inscricaoEstadual, enderecoCompleto, responsavelNome, responsavelCpf, responsavelEmail, responsavelTelefone.
Se um campo não estiver presente, use null.

Texto do documento:
${input.documentText ?? "Documento enviado via URL: " + input.documentUrl}`;
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "pj_data",
          strict: true,
          schema: {
            type: "object",
            properties: {
              cnpj: { type: ["string", "null"] },
              razaoSocial: { type: ["string", "null"] },
              nomeFantasia: { type: ["string", "null"] },
              inscricaoEstadual: { type: ["string", "null"] },
              enderecoCompleto: { type: ["string", "null"] },
              responsavelNome: { type: ["string", "null"] },
              responsavelCpf: { type: ["string", "null"] },
              responsavelEmail: { type: ["string", "null"] },
              responsavelTelefone: { type: ["string", "null"] },
            },
            required: ["cnpj", "razaoSocial", "nomeFantasia", "inscricaoEstadual", "enderecoCompleto", "responsavelNome", "responsavelCpf", "responsavelEmail", "responsavelTelefone"],
            additionalProperties: false,
          },
        },
      },
    });
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "{}";
    const extracted = JSON.parse(content);
    // Save extracted data
    const existing = await getPjDocumentByContact(input.contactId);
    if (existing) {
      await updatePjDocument(existing.id, { ...extracted, documentUrl: input.documentUrl, status: "completed", extractedData: extracted });
    } else {
      await createPjDocument({ contactId: input.contactId, ...extracted, documentUrl: input.documentUrl, status: "completed", extractedData: extracted });
    }
    return { success: true, data: extracted };
  }),
});

// ─── ROUTINES ROUTER ──────────────────────────────────────────────────────────
const routinesRouter = router({
  templates: protectedProcedure.query(async () => {
    await seedDefaultRoutines();
    return getAllRoutineTemplates();
  }),
  myTemplates: protectedProcedure.query(async ({ ctx }) => {
    await seedDefaultRoutines();
    return getRoutineTemplatesByRole(ctx.user.role ?? "assistente");
  }),
  today: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];
    const [templates, routine] = await Promise.all([
      getRoutineTemplatesByRole(ctx.user.role ?? "assistente"),
      getDailyRoutine(ctx.user.id, today),
    ]);
    return {
      templates,
      completedItems: routine?.completedItems ?? [],
      date: today,
    };
  }),
  toggleItem: protectedProcedure.input(z.object({
    templateId: z.number(),
    completed: z.boolean(),
  })).mutation(async ({ input, ctx }) => {
    const today = new Date().toISOString().split("T")[0];
    const routine = await getDailyRoutine(ctx.user.id, today);
    const current = routine?.completedItems ?? [];
    let updated: number[];
    if (input.completed) {
      updated = Array.from(new Set([...current, input.templateId]));
    } else {
      updated = current.filter((id: number) => id !== input.templateId);
    }
    await upsertDailyRoutine(ctx.user.id, today, updated);
    return { success: true, completedItems: updated };
  }),
  createTemplate: adminProcedure.input(z.object({
    role: z.enum(["admin", "gerente", "analista", "assistente"]),
    title: z.string().min(1),
    description: z.string().optional(),
    order: z.number().optional(),
  })).mutation(({ input }) => createRoutineTemplate(input)),
  updateTemplate: adminProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    order: z.number().optional(),
    isActive: z.boolean().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateRoutineTemplate(id, data);
  }),
  deleteTemplate: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteRoutineTemplate(input.id)
  ),
});

// ─── PODCASTS ROUTER ────────────────────────────────────────────────────────
const podcastsRouter = router({
  list: protectedProcedure.query(() => getPodcasts()),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getPodcastById(input.id)
  ),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    coverUrl: z.string().optional(),
    contactId: z.number().optional(),
    category: z.string().optional(),
    language: z.string().optional(),
    publishingFrequency: z.string().optional(),
    rssUrl: z.string().optional(),
    spotifyUrl: z.string().optional(),
    youtubeUrl: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(({ input }) => createPodcast(input)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    coverUrl: z.string().optional(),
    contactId: z.number().optional(),
    category: z.string().optional(),
    language: z.string().optional(),
    publishingFrequency: z.string().optional(),
    rssUrl: z.string().optional(),
    spotifyUrl: z.string().optional(),
    youtubeUrl: z.string().optional(),
    status: z.enum(["active", "paused", "finished"]).optional(),
    notes: z.string().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updatePodcast(id, data);
  }),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deletePodcast(input.id)
  ),
  // Episodes
  episodes: protectedProcedure.input(z.object({ podcastId: z.number() })).query(({ input }) =>
    getEpisodesByPodcast(input.podcastId)
  ),
  getEpisode: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getEpisodeById(input.id)
  ),
  createEpisode: protectedProcedure.input(z.object({
    podcastId: z.number(),
    title: z.string().min(1),
    number: z.number().optional(),
    description: z.string().optional(),
    guestName: z.string().optional(),
    guestBio: z.string().optional(),
    recordingDate: z.date().optional(),
    publishDate: z.date().optional(),
    scriptUrl: z.string().optional(),
    rawAudioUrl: z.string().optional(),
    editedAudioUrl: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    publishedUrl: z.string().optional(),
    studioBookingId: z.number().optional(),
    assignedEditorId: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(({ input }) => createEpisode(input)),
  updateEpisode: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    number: z.number().optional(),
    description: z.string().optional(),
    guestName: z.string().optional(),
    guestBio: z.string().optional(),
    recordingDate: z.date().optional(),
    publishDate: z.date().optional(),
    scriptUrl: z.string().optional(),
    rawAudioUrl: z.string().optional(),
    editedAudioUrl: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    publishedUrl: z.string().optional(),
    productionStatus: z.enum(["roteiro","gravacao","edicao","revisao","agendado","publicado"]).optional(),
    studioBookingId: z.number().optional(),
    assignedEditorId: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateEpisode(id, data);
  }),
  deleteEpisode: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteEpisode(input.id)
  ),
  // Comments
  comments: protectedProcedure.input(z.object({ episodeId: z.number() })).query(({ input }) =>
    getEpisodeComments(input.episodeId)
  ),
  addComment: protectedProcedure.input(z.object({
    episodeId: z.number(),
    content: z.string().min(1),
  })).mutation(({ input, ctx }) =>
    createEpisodeComment({ episodeId: input.episodeId, userId: ctx.user.id, content: input.content })
  ),
});

// ─── BRAND SETTINGS ROUTER ─────────────────────────────────────────────────
const brandRouter = router({
  get: publicProcedure.query(() => getBrandSettings()),
  update: adminProcedure.input(z.object({
    companyName: z.string().optional(),
    logoUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    tagline: z.string().optional(),
    website: z.string().optional(),
    supportEmail: z.string().optional(),
    supportPhone: z.string().optional(),
    footerText: z.string().optional(),
  })).mutation(({ input }) => upsertBrandSettings(input)),
});

// ─── PORTAL MAGIC LINK ROUTER ─────────────────────────────────────────────────
const portalMagicRouter = router({
  sendMagicLink: protectedProcedure.input(z.object({
    contactId: z.number(),
    email: z.string().email(),
    origin: z.string(),
  })).mutation(async ({ input }) => {
    const token = await createPortalMagicLink(input.contactId, input.email);
    const portalUrl = `${input.origin}/portal/magic/${token}`;
    const { sendEmail } = await import("./email");
    await sendEmail({
      to: input.email,
      subject: "Seu acesso ao Portal do Cliente",
      htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
        <h2 style="color:#7c3aed">Acesso ao Portal do Cliente</h2>
        <p>Olá! Clique no botão abaixo para acessar seu portal personalizado.</p>
        <p>O link é válido por <strong>7 dias</strong> e pode ser usado apenas uma vez.</p>
        <a href="${portalUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Acessar Portal</a>
        <p style="font-size:12px;color:#888">Se o botão não funcionar, copie e cole este link: ${portalUrl}</p>
      </div>`,
    });
    return { success: true, token };
  }),
  validate: publicProcedure.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const link = await validatePortalMagicLink(input.token);
    if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido ou expirado" });
    const data = await getPortalDataForContact(link.contactId);
    const brand = await getBrandSettings();
    return { ...data, brand };
  }),
  getData: publicProcedure.input(z.object({ contactId: z.number() })).query(async ({ input }) => {
    const data = await getPortalDataForContact(input.contactId);
    const brand = await getBrandSettings();
    return { ...data, brand };
  }),
});

// ─── AUTOMATIONS ROUTER ─────────────────────────────────────────────────────
const automationsRouter = router({
  list: protectedProcedure.query(() => getAutomationSequences()),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getAutomationSequenceById(input.id)
  ),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    triggerStage: z.string().min(1),
    isActive: z.boolean().default(true),
  })).mutation(({ input }) => createAutomationSequence(input)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    triggerStage: z.string().optional(),
    isActive: z.boolean().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateAutomationSequence(id, data);
  }),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteAutomationSequence(input.id)
  ),
  // Steps
  getSteps: protectedProcedure.input(z.object({ sequenceId: z.number() })).query(({ input }) =>
    getAutomationSteps(input.sequenceId)
  ),
  addStep: protectedProcedure.input(z.object({
    sequenceId: z.number(),
    stepOrder: z.number(),
    delayDays: z.number().min(0),
    channel: z.enum(["whatsapp", "email"]),
    customMessage: z.string().optional(),
    subject: z.string().optional(),
  })).mutation(({ input }) => createAutomationStep({ ...input, messageTemplate: input.customMessage ?? "" })),
  updateStep: protectedProcedure.input(z.object({
    id: z.number(),
    stepOrder: z.number().optional(),
    delayDays: z.number().optional(),
    channel: z.enum(["whatsapp", "email"]).optional(),
    customMessage: z.string().optional(),
    subject: z.string().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateAutomationStep(id, data);
  }),
  deleteStep: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteAutomationStep(input.id)
  ),
  // Executions
  executions: protectedProcedure.input(z.object({
    contactId: z.number().optional(),
    sequenceId: z.number().optional(),
    status: z.string().optional(),
  })).query(({ input }) => getAutomationExecutions(input)),
  scheduleForLead: protectedProcedure.input(z.object({
    leadId: z.number(),
    contactId: z.number(),
    triggerStage: z.string(),
  })).mutation(({ input }) =>
    scheduleAutomationForLead(input.leadId, input.contactId, input.triggerStage)
  ),
});

// ─── MESSAGE TEMPLATES ROUTER ─────────────────────────────────────────────────
const messageTemplatesRouter = router({
  list: protectedProcedure.input(z.object({ category: z.string().optional() })).query(({ input }) =>
    getMessageTemplates(input.category)
  ),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    category: z.string().optional(),
    channel: z.enum(["whatsapp", "email", "both"]),
    subject: z.string().optional(),
    body: z.string().min(1),
    variables: z.array(z.string()).optional(),
  })).mutation(({ input }) => createMessageTemplate({ ...input, content: input.body, variables: input.variables ? JSON.stringify(input.variables) : undefined })),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    category: z.string().optional(),
    channel: z.enum(["whatsapp", "email", "both"]).optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    variables: z.array(z.string()).optional(),
  })).mutation(({ input }) => {
    const { id, body, variables, ...rest } = input;
    return updateMessageTemplate(id, { ...rest, ...(body ? { content: body } : {}), ...(variables ? { variables: JSON.stringify(variables) } : {}) });
  }),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteMessageTemplate(input.id)
  ),
});

// ─── STUDIO ROOMS ROUTER ────────────────────────────────────────────────────
const studioRoomsRouter = router({
  list: protectedProcedure.query(async () => {
    await seedDefaultStudioRooms();
    return getStudioRooms();
  }),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getStudioRoomById(input.id)
  ),
  create: managerProcedure.input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    capacity: z.number().optional(),
    color: z.string().optional(),
  })).mutation(({ input }) => createStudioRoom(input)),
  update: managerProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    capacity: z.number().optional(),
    color: z.string().optional(),
    isActive: z.boolean().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateStudioRoom(id, data);
  }),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteStudioRoom(input.id)
  ),
  occupancyReport: protectedProcedure.query(() => getRoomOccupancyReport()),
});

// ─── EQUIPMENT ROUTER ─────────────────────────────────────────────────────────
const equipmentRouter = router({
  list: protectedProcedure.input(z.object({ category: z.string().optional() })).query(({ input }) =>
    getEquipment(input.category)
  ),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getEquipmentById(input.id)
  ),
  create: managerProcedure.input(z.object({
    name: z.string().min(1),
    category: z.string().optional(),
    serialNumber: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    status: z.enum(["available", "in_use", "maintenance", "retired"]).optional(),
    notes: z.string().optional(),
    roomId: z.number().optional(),
    purchaseDate: z.date().optional(),
  })).mutation(({ input }) => createEquipment(input as any)),
  update: managerProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    category: z.string().optional(),
    serialNumber: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    status: z.enum(["available", "in_use", "maintenance", "retired"]).optional(),
    notes: z.string().optional(),
    roomId: z.number().optional(),
  })).mutation(({ input }) => {
    const { id, ...data } = input;
    return updateEquipment(id, data as any);
  }),
  delete: managerProcedure.input(z.object({ id: z.number() })).mutation(({ input }) =>
    deleteEquipment(input.id)
  ),
  // Booking equipment linkage
  bookingEquipment: protectedProcedure.input(z.object({ studioBookingId: z.number() })).query(({ input }) =>
    getEquipmentBookingsByStudioBooking(input.studioBookingId)
  ),
  addToBooking: protectedProcedure.input(z.object({
    equipmentId: z.number(),
    studioBookingId: z.number(),
    notes: z.string().optional(),
  })).mutation(({ input }) => createEquipmentBooking(input)),
  removeFromBooking: protectedProcedure.input(z.object({ studioBookingId: z.number() })).mutation(({ input }) =>
    deleteEquipmentBookingsByStudioBooking(input.studioBookingId)
  ),
  occupancyReport: protectedProcedure.query(() => getEquipmentOccupancyReport()),
});

// ─── SPRINT A ROUTER ────────────────────────────────────────────────────────
const sprintARouter = router({
  // US-049: Gerar fatura de entrada ao criar agendamento
  createEntryInvoice: protectedProcedure.input(z.object({
    bookingId: z.number(),
    contactId: z.number().optional(),
    title: z.string(),
    value: z.union([z.string(), z.number()]),
    assignedUserId: z.number().optional(),
  })).mutation(({ input }) =>
    createEntryInvoiceForBooking(input.bookingId, input)
  ),
  // US-049: Confirmar pagamento da entrada
  confirmEntryPayment: protectedProcedure.input(z.object({
    bookingId: z.number(),
  })).mutation(({ input }) => confirmBookingEntryPayment(input.bookingId)),
  // US-049: Dispensar pagamento da entrada
  waiveEntryPayment: protectedProcedure.input(z.object({
    bookingId: z.number(),
  })).mutation(({ input }) => waiveBookingEntryPayment(input.bookingId)),
  // US-043: Gerar faturas automaticamente ao assinar contrato
  autoInvoiceOnSign: protectedProcedure.input(z.object({
    contractId: z.number(),
  })).mutation(({ input }) => autoGenerateInvoicesOnContractSign(input.contractId)),
  // US-050: Buscar agendamentos com pagamento pendente nas próximas 48h
  pendingPaymentBookings: protectedProcedure.query(() => getBookingsWithPendingPaymentIn48h()),
  // US-050: Marcar lembrete como enviado
  markReminderSent: protectedProcedure.input(z.object({
    bookingId: z.number(),
  })).mutation(({ input }) => markBookingReminderSent(input.bookingId)),
  // US-019: Atualizar assinatura Stripe do contato
  updateSubscription: protectedProcedure.input(z.object({
    contactId: z.number(),
    stripeSubscriptionId: z.string().optional(),
    subscriptionStatus: z.enum(["active", "cancelled", "past_due", "trialing", "none"]).optional(),
  })).mutation(({ input }) => {
    const { contactId, ...data } = input;
    return updateContactSubscription(contactId, data);
  }),
  // US-019: Criar sessão de checkout para plano recorrente
  createSubscriptionCheckout: protectedProcedure.input(z.object({
    contactId: z.number(),
    planId: z.string(),
    origin: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const contact = await import("./db").then(m => m.getContactById(input.contactId));
    if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
    const customerId = await getOrCreateStripeCustomer({ email: contact.email, name: contact.name, userId: ctx.user.id });
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: input.planId, quantity: 1 }],
      success_url: `${input.origin}/contacts/${input.contactId}?subscription=success`,
      cancel_url: `${input.origin}/contacts/${input.contactId}?subscription=cancelled`,
      allow_promotion_codes: true,
      metadata: { contactId: String(input.contactId), userId: String(ctx.user.id) },
    });
    return { url: session.url };
  }),
});

// ─── TOC ROUTER ────────────────────────────────────────────────────────────
const tocRouter = router({
  dashboard: protectedProcedure.query(() => getTocDashboard()),
  getConfig: protectedProcedure.query(() => getTocConfig()),
  saveConfig: protectedProcedure.input(z.object({
    businessContext: z.string().optional(),
    domains: z.string().optional(),
    weeklyDay: z.string().optional(),
    weeklyTime: z.string().optional(),
    autoGenerate: z.boolean().optional(),
  })).mutation(({ input }) => upsertTocConfig(input)),

  // Sessions
  listSessions: protectedProcedure.query(() => getTocSessions()),
  getSession: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getTocSessionById(input.id)),
  createSession: protectedProcedure.input(z.object({
    title: z.string().min(1),
    weekDate: z.date(),
    status: z.enum(["draft", "active", "completed"]).optional(),
    summary: z.string().optional(),
    mainConstraint: z.string().optional(),
    recommendations: z.string().optional(),
  })).mutation(({ input }) => createTocSession(input)),
  updateSession: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    status: z.enum(["draft", "active", "completed"]).optional(),
    summary: z.string().optional(),
    mainConstraint: z.string().optional(),
    recommendations: z.string().optional(),
    completedAt: z.date().optional(),
  })).mutation(({ input }) => { const { id, ...data } = input; return updateTocSession(id, data); }),
  deleteSession: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteTocSession(input.id)),

  // Constraints
  listConstraints: protectedProcedure.input(z.object({
    sessionId: z.number().optional(),
    domain: z.string().optional(),
  })).query(({ input }) => getTocConstraints(input.sessionId, input.domain)),
  createConstraint: protectedProcedure.input(z.object({
    sessionId: z.number().optional(),
    domain: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    rootCause: z.string().optional(),
    impact: z.string().optional(),
  })).mutation(({ input }) => createTocConstraint(input)),
  updateConstraint: protectedProcedure.input(z.object({
    id: z.number(),
    domain: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    status: z.enum(["active", "resolved", "monitoring"]).optional(),
    rootCause: z.string().optional(),
    impact: z.string().optional(),
    resolvedAt: z.date().optional(),
  })).mutation(({ input }) => { const { id, ...data } = input; return updateTocConstraint(id, data); }),
  deleteConstraint: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteTocConstraint(input.id)),

  // Action Items
  listActionItems: protectedProcedure.input(z.object({
    constraintId: z.number().optional(),
    sessionId: z.number().optional(),
  })).query(({ input }) => getTocActionItems(input.constraintId, input.sessionId)),
  createActionItem: protectedProcedure.input(z.object({
    constraintId: z.number(),
    sessionId: z.number().optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    assignedTo: z.number().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDate: z.date().optional(),
  })).mutation(({ input }) => createTocActionItem(input)),
  updateActionItem: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDate: z.date().optional(),
    completedAt: z.date().optional(),
  })).mutation(({ input }) => { const { id, ...data } = input; return updateTocActionItem(id, data); }),
  deleteActionItem: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteTocActionItem(input.id)),

  // AI generation
  generateSession: protectedProcedure.input(z.object({
    businessContext: z.string().optional(),
    domains: z.array(z.string()).optional(),
  })).mutation(async ({ input }) => {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um especialista em Theory of Constraints (TOC) aplicada a negócios de produção de podcast e estúdio. Gere uma análise semanal estruturada em JSON." },
        { role: "user", content: `Analise as restrições do negócio com contexto: ${input.businessContext ?? "Estúdio de podcast com clientes B2B"}. Domínios: ${(input.domains ?? ["comercial", "financeiro", "producao", "pessoas", "tecnologia"]).join(", ")}. Retorne JSON com: { title, summary, mainConstraint, recommendations, constraints: [{ domain, title, description, severity, rootCause, impact }] }` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "toc_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              mainConstraint: { type: "string" },
              recommendations: { type: "string" },
              constraints: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    domain: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                    rootCause: { type: "string" },
                    impact: { type: "string" },
                  },
                  required: ["domain", "title", "description", "severity", "rootCause", "impact"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "summary", "mainConstraint", "recommendations", "constraints"],
            additionalProperties: false,
          },
        },
      },
    });
     const raw = response.choices[0]?.message?.content;
    const content = typeof raw === "string" ? raw : "{}";
    return JSON.parse(content);
  }),
});
// ─── SPRINT D ROUTER ────────────────────────────────────────────────────────────
const sprintDRouter = router({
  // US-074: Dashboard financeiro por projeto
  projectFinancialSummary: protectedProcedure.input(z.object({ projectId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { invoices: [], totalRevenue: 0, totalPaid: 0, totalPending: 0 };
    const { invoices: invoicesTable, projects: projectsTable } = await import("../drizzle/schema");
    const { eq: eqOp } = await import("drizzle-orm");
    const project = await db.select().from(projectsTable).where(eqOp(projectsTable.id, input.projectId)).limit(1);
    const projectInvoices = await db.select().from(invoicesTable).where(eqOp(invoicesTable.leadId, input.projectId));
    const totalRevenue = projectInvoices.reduce((s, i) => s + parseFloat(String(i.total ?? 0)), 0);
    const totalPaid = projectInvoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(String(i.total ?? 0)), 0);
    const totalPending = projectInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + parseFloat(String(i.total ?? 0)), 0);
    return { project: project[0] ?? null, invoices: projectInvoices, totalRevenue, totalPaid, totalPending };
  }),

  // US-023: Notificação de sessão por WhatsApp (lembrete 24h antes)
  sendSessionReminder: protectedProcedure.input(z.object({
    bookingId: z.number(),
    phone: z.string(),
    contactName: z.string(),
    sessionTitle: z.string(),
    sessionDate: z.string(),
    sessionTime: z.string(),
  })).mutation(async ({ input }) => {
    const message = `Olá ${input.contactName}! 🎵\n\nLembrete: você tem uma sessão agendada:\n\n📅 *${input.sessionTitle}*\n🕒 ${input.sessionDate} às ${input.sessionTime}\n\nQualquer dúvida, estamos à disposição! 😊`;
    await sendText(input.phone, message);
    return { success: true };
  }),

  // US-028: Briefing de episódio via IA
  generateEpisodeBriefing: protectedProcedure.input(z.object({
    episodeId: z.number(),
    podcastName: z.string(),
    episodeTitle: z.string(),
    episodeDescription: z.string().optional(),
    guestName: z.string().optional(),
    topics: z.string().optional(),
  })).mutation(async ({ input }) => {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Você é um produtor de podcast experiente. Crie um briefing completo e profissional para o episódio indicado. O briefing deve incluir: 1) Introdução sugerida para o apresentador, 2) Perguntas principais (5-8 perguntas), 3) Pontos de destaque a explorar, 4) Notas de produção (música de fundo, efeitos), 5) Call-to-action sugerido para o final. Responda em português, formato Markdown.`,
        },
        {
          role: "user",
          content: `Podcast: ${input.podcastName}\nEpisódio: ${input.episodeTitle}\n${input.episodeDescription ? `Descrição: ${input.episodeDescription}\n` : ""}${input.guestName ? `Convidado: ${input.guestName}\n` : ""}${input.topics ? `Tópicos: ${input.topics}` : ""}`,
        },
      ],
    });
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "";
    return { briefing: content };
  }),

  // US-069: Resumo financeiro semanal por email
  sendWeeklyFinancialSummary: protectedProcedure.input(z.object({
    email: z.string().email(),
    recipientName: z.string(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) return { success: false, error: "DB not available" };
    const { invoices: invoicesTable, studioBookings: bookingsTable } = await import("../drizzle/schema");
    const { gte: gteOp } = await import("drizzle-orm");
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentInvoices = await db.select().from(invoicesTable).where(gteOp(invoicesTable.createdAt, weekAgo));
    const recentBookings = await db.select().from(bookingsTable).where(gteOp(bookingsTable.startAt, weekAgo));
    const totalRevenue = recentInvoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(String(i.total ?? 0)), 0);
    const pendingRevenue = recentInvoices.filter(i => i.status === "sent" || i.status === "draft").reduce((s, i) => s + parseFloat(String(i.total ?? 0)), 0);
    const overdueCount = recentInvoices.filter(i => i.status === "overdue").length;
    const sessionsCount = recentBookings.length;
    const { sendEmail } = await import("./email");
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Resumo Financeiro Semanal</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;">Olá ${input.recipientName}! Aqui está o resumo da semana.</p>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px;">
              <p style="color: #16a34a; font-size: 11px; text-transform: uppercase; margin: 0 0 4px;">Receita Recebida</p>
              <p style="font-size: 20px; font-weight: 700; color: #111827; margin: 0;">R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div style="background: #fffbeb; padding: 16px; border-radius: 8px;">
              <p style="color: #d97706; font-size: 11px; text-transform: uppercase; margin: 0 0 4px;">A Receber</p>
              <p style="font-size: 20px; font-weight: 700; color: #111827; margin: 0;">R$ ${pendingRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div style="background: #fef2f2; padding: 16px; border-radius: 8px;">
              <p style="color: #dc2626; font-size: 11px; text-transform: uppercase; margin: 0 0 4px;">Faturas Vencidas</p>
              <p style="font-size: 20px; font-weight: 700; color: #111827; margin: 0;">${overdueCount}</p>
            </div>
            <div style="background: #eff6ff; padding: 16px; border-radius: 8px;">
              <p style="color: #3b82f6; font-size: 11px; text-transform: uppercase; margin: 0 0 4px;">Sessões Realizadas</p>
              <p style="font-size: 20px; font-weight: 700; color: #111827; margin: 0;">${sessionsCount}</p>
            </div>
          </div>
          <p style="color: #6b7280; font-size: 13px; text-align: center;">Acesse o CRM para mais detalhes.</p>
        </div>
      </div>
    `;
    const result = await sendEmail({
      to: input.email,
      toName: input.recipientName,
      subject: `Resumo Financeiro Semanal - ${new Date().toLocaleDateString("pt-BR")}`,
      htmlContent,
    });
    return result;
  }),

  // US-076: Relatório de rentabilidade por contato
  profitabilityReport: protectedProcedure.input(z.object({
    contactId: z.number().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const { invoices: invoicesTable, contacts: contactsTable } = await import("../drizzle/schema");
    const { gte: gteOp, lte: lteOp, and: andOp, eq: eqOp } = await import("drizzle-orm");
    const conditions = [];
    if (input.contactId) conditions.push(eqOp(invoicesTable.contactId, input.contactId));
    if (input.startDate) conditions.push(gteOp(invoicesTable.createdAt, input.startDate));
    if (input.endDate) conditions.push(lteOp(invoicesTable.createdAt, input.endDate));
    const query = db
      .select({
        contactId: invoicesTable.contactId,
        total: invoicesTable.total,
        status: invoicesTable.status,
        createdAt: invoicesTable.createdAt,
      })
      .from(invoicesTable);
    const allInvoices = conditions.length > 0 ? await query.where(andOp(...conditions)) : await query;
    // Group by contact
    const byContact: Record<number, { contactId: number; totalRevenue: number; paidRevenue: number; invoiceCount: number }> = {};
    for (const inv of allInvoices) {
      const cid = inv.contactId ?? 0;
      if (!byContact[cid]) byContact[cid] = { contactId: cid, totalRevenue: 0, paidRevenue: 0, invoiceCount: 0 };
      byContact[cid].totalRevenue += parseFloat(String(inv.total ?? 0));
      if (inv.status === "paid") byContact[cid].paidRevenue += parseFloat(String(inv.total ?? 0));
      byContact[cid].invoiceCount++;
    }
    return Object.values(byContact).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }),
});

// ─── WHATSAPP AI ANALYSIS ROUTER ───────────────────────────────────────────
const whatsappAiRouter = router({
  list: protectedProcedure.query(async () => {
    return getWhatsappAnalysisList();
  }),
  getByChatId: protectedProcedure.input(z.object({ chatId: z.number() })).query(async ({ input }) => {
    return getWhatsappAnalysisByChatId(input.chatId);
  }),
  analyze: protectedProcedure.input(z.object({
    chatId: z.number(),
    chatJid: z.string(),
    contactName: z.string().optional(),
    contactId: z.number().optional(),
    forceRefresh: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    // Fetch messages from Z-API (up to 100 most recent)
    const phone = input.chatJid.replace(/@.*/, "");
    const messages = await getChatMessages(phone, 0, 100);
    if (!messages || messages.length === 0) {
      return { error: "Nenhuma mensagem encontrada para este chat." };
    }
    // Build conversation text for AI
    const conversationText = messages
      .slice(-80) // last 80 messages
      .map((m) => {
        const sender = m.fromMe ? "[CRM]" : `[${input.contactName ?? "Contato"}]`;
        const text = (m.text as { message?: string } | undefined)?.message || "[mídia]";
        return `${sender}: ${text}`;
      })
      .join("\n");
    const systemPrompt = `Você é um analista de CRM especializado em estúdios de podcast. Analise a conversa de WhatsApp abaixo e retorne um JSON estruturado com as seguintes informações:
- summary: resumo da conversa em 2-3 frases
- opportunityScore: pontuação de 0-100 indicando o potencial comercial
- urgency: "low", "medium" ou "high" baseado na urgência do contato
- stage: estágio sugerido do pipeline ("Prospecção", "Qualificação", "Proposta", "Negociação", "Fechamento")
- estimatedValue: valor estimado da oportunidade em BRL (número, pode ser null)
- servicesDetected: array de strings com serviços mencionados (ex: ["gravação", "mixagem", "masterização"])
- suggestions: array de objetos com sugestões de ação, cada um com:
  - type: "create_lead" | "update_lead" | "send_quote" | "send_invoice" | "send_contract" | "schedule_followup" | "send_nps"
  - title: título curto da sugestão
  - description: descrição detalhada do que fazer
  - priority: "high" | "medium" | "low"
  - estimatedValue: valor estimado se aplicável (número ou null)

Responda APENAS com o JSON, sem markdown ou explicações.`;
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Conversa:\n${conversationText}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "whatsapp_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              opportunityScore: { type: "number" },
              urgency: { type: "string", enum: ["low", "medium", "high"] },
              stage: { type: "string" },
              estimatedValue: { type: ["number", "null"] },
              servicesDetected: { type: "array", items: { type: "string" } },
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string" },
                    estimatedValue: { type: ["number", "null"] },
                  },
                  required: ["type", "title", "description", "priority", "estimatedValue"],
                  additionalProperties: false,
                },
              },
            },
            required: ["summary", "opportunityScore", "urgency", "stage", "estimatedValue", "servicesDetected", "suggestions"],
            additionalProperties: false,
          },
        },
      },
    });
    const raw = response.choices[0]?.message?.content;
    const content = typeof raw === "string" ? raw : "{}";
    let parsed: {
      summary: string;
      opportunityScore: number;
      urgency: string;
      stage: string;
      estimatedValue: number | null;
      servicesDetected: string[];
      suggestions: Array<{ type: string; title: string; description: string; priority: string; estimatedValue: number | null }>;
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      return { error: "Falha ao processar resposta da IA." };
    }
    // Save to DB
    await upsertWhatsappAnalysis({
      chatId: input.chatId,
      chatJid: input.chatJid,
      contactId: input.contactId,
      contactName: input.contactName,
      messagesAnalyzed: messages.length,
      opportunityScore: parsed.opportunityScore,
      stage: parsed.stage,
      estimatedValue: parsed.estimatedValue ? String(parsed.estimatedValue) : null,
      urgency: parsed.urgency,
      summary: parsed.summary,
      suggestionsJson: JSON.stringify(parsed.suggestions),
      servicesDetected: JSON.stringify(parsed.servicesDetected),
      analyzedAt: new Date(),
    });
    return { success: true, analysis: parsed, messagesAnalyzed: messages.length };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteWhatsappAnalysis(input.id);
    return { success: true };
  }),
  bulkAnalyze: protectedProcedure.input(z.object({
    chatIds: z.array(z.object({ chatId: z.number(), chatJid: z.string(), contactName: z.string().optional(), contactId: z.number().optional() })),
  })).mutation(async ({ input }) => {
    const results: Array<{ chatId: number; status: string; error?: string }> = [];
    for (const chat of input.chatIds) {
      try {
        const phone = chat.chatJid.replace(/@.*/, "");
        const messages = await getChatMessages(phone, 0, 50);
        if (!messages || messages.length === 0) {
          results.push({ chatId: chat.chatId, status: "skipped", error: "Sem mensagens" });
          continue;
        }
        const conversationText = messages
          .slice(-50)
          .map((m) => {
            const sender = m.fromMe ? "[CRM]" : `[${chat.contactName ?? "Contato"}]`;
            const text = (m.text as { message?: string } | undefined)?.message || "[mídia]";
            return `${sender}: ${text}`;
          })
          .join("\n");
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Analise esta conversa de WhatsApp de um estúdio de podcast e retorne JSON com: summary (string), opportunityScore (0-100), urgency (low/medium/high), stage (string), estimatedValue (number ou null), servicesDetected (array de strings), suggestions (array com type, title, description, priority, estimatedValue). Responda APENAS com JSON válido." },
            { role: "user", content: conversationText },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const raw = typeof rawContent === "string" ? rawContent : "{}";
        let parsed: { summary?: string; opportunityScore?: number; urgency?: string; stage?: string; estimatedValue?: number | null; servicesDetected?: string[]; suggestions?: Array<{ type: string; title: string; description: string; priority: string; estimatedValue: number | null }> };
        try { parsed = JSON.parse(raw); } catch { parsed = {}; }
        await upsertWhatsappAnalysis({
          chatId: chat.chatId,
          chatJid: chat.chatJid,
          contactId: chat.contactId,
          contactName: chat.contactName,
          messagesAnalyzed: messages.length,
          opportunityScore: parsed.opportunityScore ?? 0,
          stage: parsed.stage,
          estimatedValue: parsed.estimatedValue ? String(parsed.estimatedValue) : null,
          urgency: parsed.urgency ?? "low",
          summary: parsed.summary ?? "",
          suggestionsJson: JSON.stringify(parsed.suggestions ?? []),
          servicesDetected: JSON.stringify(parsed.servicesDetected ?? []),
          analyzedAt: new Date(),
        });
        results.push({ chatId: chat.chatId, status: "ok" });
      } catch (e) {
        results.push({ chatId: chat.chatId, status: "error", error: String(e) });
      }
    }
    return { results };
  }),
});

// ─── NPS ROUTER ───────────────────────────────────────────────────────────────
const npsRouter = router({
  list: protectedProcedure.input(z.object({ contactId: z.number().optional() })).query(async ({ input }) => {
    return getNpsResponses(input.contactId);
  }),
  stats: protectedProcedure.query(async () => {
    return getNpsStats();
  }),
  send: protectedProcedure.input(z.object({
    contactId: z.number(),
    phone: z.string(),
    contactName: z.string(),
  })).mutation(async ({ input }) => {
    const message = `Olá ${input.contactName}! 😊\n\nGostaríamos de saber sua opinião sobre nossos serviços.\n\nEm uma escala de 0 a 10, o quanto você nos recomendaria para um amigo ou colega?\n\n0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟\n\nResponda com o número da sua nota. Sua opinião é muito importante para nós! 🙏`;
    await sendText(input.phone, message);
    const id = await createNpsResponse({
      contactId: input.contactId,
      sentAt: new Date(),
      channel: "whatsapp",
    });
    return { success: true, id };
  }),
  recordResponse: protectedProcedure.input(z.object({
    id: z.number(),
    score: z.number().min(0).max(10),
    comment: z.string().optional(),
  })).mutation(async ({ input }) => {
    await updateNpsResponse(input.id, {
      score: input.score,
      comment: input.comment,
      respondedAt: new Date(),
    });
    return { success: true };
  }),
});

// ─── SPRINT E ROUTER ────────────────────────────────────────────────────────
const sprintERouter = router({
  // US-029: Time tracking
  getTimeEntries: protectedProcedure.input(z.object({
    contactId: z.number().optional(),
    projectId: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return getTimeEntries(input ?? {});
  }),
  createTimeEntry: protectedProcedure.input(z.object({
    contactId: z.number().optional(),
    projectId: z.number().optional(),
    description: z.string().min(1),
    minutes: z.number().min(1),
    date: z.date(),
    billable: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    const id = await createTimeEntry({ ...input, userId: ctx.user.id });
    return { id };
  }),
  updateTimeEntry: protectedProcedure.input(z.object({
    id: z.number(),
    description: z.string().optional(),
    minutes: z.number().optional(),
    date: z.date().optional(),
    billable: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateTimeEntry(id, data);
    return { success: true };
  }),
  deleteTimeEntry: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteTimeEntry(input.id);
    return { success: true };
  }),
  getTimeEntrySummary: protectedProcedure.input(z.object({ contactId: z.number().optional() }).optional()).query(async ({ input }) => {
    return getTimeEntrySummary(input?.contactId);
  }),
  // US-032: Export global
  exportContacts: protectedProcedure.query(async () => exportContactsData()),
  exportInvoices: protectedProcedure.query(async () => exportInvoicesData()),
  exportQuotes: protectedProcedure.query(async () => exportQuotesData()),
  exportContracts: protectedProcedure.query(async () => exportContractsData()),
  // US-031: WhatsApp conversation report
  whatsappConversationReport: protectedProcedure.query(async () => getWhatsappConversationReport()),
  // US-013: Pipeline filters
  getLeadsFiltered: protectedProcedure.input(z.object({
    assignedUserId: z.number().optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    stageId: z.number().optional(),
    status: z.enum(["open", "won", "lost"]).optional(),
    search: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return getLeads(input?.stageId, input?.status);
  }),
});

// ─── SPRINT F ROUTER ────────────────────────────────────────────────────────
const sprintFRouter = router({
  // US-016: Digital signature + Playbook Ação 2 (encadeamento automático)
  signContract: protectedProcedure.input(z.object({
    contractId: z.number(),
    signatureData: z.string(),
    signerName: z.string(),
    signerEmail: z.string().optional(),
    origin: z.string().optional(),
  })).mutation(async ({ input }) => {
    const hash = await signContract(input.contractId, {
      signatureData: input.signatureData,
      signerName: input.signerName,
      signerEmail: input.signerEmail,
    });
    // ── PLAYBOOK AÇÃO 2: Encadeamento automático ao assinar ──
    // Executa em background sem bloquear a resposta ao cliente
    (async () => {
      try {
        const [invoiceId, projectId] = await Promise.all([
          createEntryInvoiceOnSign(input.contractId),
          createProjectOnContractSign(input.contractId),
        ]);
        if (invoiceId) console.log(`[Playbook A2] ✅ Fatura entrada #${invoiceId} criada para contrato #${input.contractId}`);
        if (projectId) console.log(`[Playbook A2] ✅ Projeto #${projectId} criado para contrato #${input.contractId}`);
        // Buscar dados do contrato para enviar magic link
        const db = await getDb();
        if (!db) return;
        const { contracts: contractsTable } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        const [contractRow] = await db.select().from(contractsTable).where(eqOp(contractsTable.id, input.contractId)).limit(1);
        if (contractRow?.contactId) {
          const contact = await getContactById(contractRow.contactId);
          const emailForLink = input.signerEmail ?? contact?.email;
          if (contact?.phone && emailForLink) {
            try {
              const token = await createPortalMagicLink(contact.id, emailForLink);
              const origin = input.origin ?? "https://app.manus.space";
              const portalUrl = `${origin}/portal?token=${token}`;
              const msg = `Olá ${contact.name || input.signerName}! ✅ Seu contrato *${contractRow.title}* foi assinado com sucesso!\n\n📋 Acesse o portal do cliente para acompanhar seu projeto, faturas e documentos:\n${portalUrl}\n\nEm caso de dúvidas, entre em contato conosco.`;
              await sendText(contact.phone, msg);
              console.log(`[Playbook A2] ✅ Magic link enviado via WhatsApp para ${contact.phone}`);
            } catch (waErr) {
              console.error("[Playbook A2] ⚠️ Erro ao enviar magic link WhatsApp:", waErr);
            }
          }
        }
      } catch (err) {
        console.error("[Playbook A2] ❌ Erro encadeamento contrato:", err);
      }
    })();
    return { success: true, hash };
  }),
  // US-007: Send media via WhatsApp
  sendMedia: protectedProcedure.input(z.object({
    phone: z.string(),
    mediaUrl: z.string().url(),
    mediaType: z.enum(["image", "document", "audio"]),
    caption: z.string().optional(),
    filename: z.string().optional(),
  })).mutation(async ({ input }) => {
    try {
      await sendDocument(input.phone, input.mediaUrl, input.caption ?? "", input.filename ?? "arquivo");
      return { success: true };
    } catch (e: unknown) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String(e) });
    }
  }),
  // US-070: Weekly WhatsApp conversation summary via AI
  weeklyConversationSummary: protectedProcedure.mutation(async () => {
    const report = await getWhatsappConversationReport();
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um assistente de CRM especialista em análise de conversas WhatsApp." },
        { role: "user", content: `Analise este relatório de conversas WhatsApp e gere um resumo executivo em português com insights e recomendações:\n${JSON.stringify(report)}` },
      ],
    });
    const summary = response.choices?.[0]?.message?.content ?? "Não foi possível gerar o resumo.";
    return { summary, report };
  }),
  // US-060: Products linked to contract templates
  updateTemplateProducts: protectedProcedure.input(z.object({
    templateId: z.number(),
    productIds: z.array(z.number()),
  })).mutation(async ({ input }) => {
    await updateContractTemplate(input.templateId, { variables: JSON.stringify({ productIds: input.productIds }) });
    return { success: true };
  }),
});

// ─── PLAYBOOK ROUTER (Ações 1, 2, 3) ─────────────────────────────────────────
const playbookRouter = router({
  // Ação 3a: Listar leads sem interação nas últimas 48h (para cron de follow-up)
  leadsStale48h: protectedProcedure.query(async () => {
    return getLeadsWithoutInteraction48h();
  }),
  // Ação 3b: Listar contratos vencendo em 30 dias (para cron de renovação)
  contractsExpiring30d: protectedProcedure.query(async () => {
    return getContractsExpiringIn30Days();
  }),
  // Ação 3c: Disparar follow-up via WhatsApp para leads estáticos (Template WA-01)
  triggerFollowUp: protectedProcedure.input(z.object({
    leadId: z.number(),
    phone: z.string(),
    contactName: z.string(),
  })).mutation(async ({ input }) => {
    const msg = `Olá, ${input.contactName}! Aqui é o time do Estudio Podcast. Notamos que você entrou em contato conosco recentemente e gostaríamos de entender melhor como podemos ajudá-lo. Tem um momento para conversarmos?`;
    try {
      await sendText(input.phone, msg);
      return { success: true, message: msg };
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String(e) });
    }
  }),
  // Ação 3d: Criar lead de renovação para contrato próximo do vencimento
  triggerRenewal: protectedProcedure.input(z.object({
    contractId: z.number(),
    phone: z.string().optional(),
    contactName: z.string().optional(),
  })).mutation(async ({ input }) => {
    const leadId = await createRenewalLead(input.contractId);
    // Enviar mensagem de renovação via WhatsApp se tiver número
    if (input.phone && input.contactName) {
      const msg = `Olá, ${input.contactName}! Seu contrato com o Estúdio Podcast está próximo do vencimento. Gostaríamos de conversar sobre a renovação e garantir a continuidade do seu projeto. Quando podemos falar?`;
      await sendText(input.phone, msg).catch(() => {});
    }
    return { success: true, leadId };
  }),
  // Ação 3e: Executar cron completo (chamado manualmente ou por scheduler)
  runFollowUpCron: protectedProcedure.mutation(async () => {
    const staleLeads = await getLeadsWithoutInteraction48h();
    const expiringContracts = await getContractsExpiringIn30Days();
    console.log(`[Playbook Cron] ${staleLeads.length} leads estáticos | ${expiringContracts.length} contratos vencendo`);
    let followUpsSent = 0;
    // Enviar follow-up WhatsApp para leads estáticos que têm contato com phone
    for (const lead of staleLeads) {
      if (!lead.contactId) continue;
      try {
        const contact = await getContactById(lead.contactId);
        if (contact?.phone) {
          const msg = `Olá ${contact.name}! Aqui é o time do Estúdio Podcast. Notamos que você entrou em contato conosco recentemente e gostaríamos de entender melhor como podemos ajudá-lo com seu projeto de podcast. Tem um momento para conversarmos?`;
          await sendText(contact.phone, msg);
          // Registrar atividade de follow-up
          await createLeadActivity({
            leadId: lead.id,
            type: "whatsapp_sent",
            description: `Follow-up automático enviado via WhatsApp (Playbook Cron 48h)`,
            userId: 1,
          });
          followUpsSent++;
          console.log(`[Playbook Cron] ✅ Follow-up enviado para lead #${lead.id} (${contact.phone})`);
        }
      } catch (e) {
        console.error(`[Playbook Cron] ⚠️ Erro follow-up lead #${lead.id}:`, e);
      }
    }
    // Criar leads de renovação para contratos vencendo
    const renewalResults = await Promise.allSettled(
      expiringContracts.map(async (c) => {
        const leadId = await createRenewalLead(c.id);
        // Enviar mensagem de renovação se tiver contato com phone
        if (c.contactId) {
          const contact = await getContactById(c.contactId);
          if (contact?.phone) {
            const msg = `Olá ${contact.name}! Seu contrato com o Estúdio Podcast está próximo do vencimento. Gostaríamos de conversar sobre a renovação e garantir a continuidade do seu projeto de podcast. Quando podemos falar?`;
            await sendText(contact.phone, msg).catch(() => {});
            console.log(`[Playbook Cron] ✅ Mensagem renovação enviada para ${contact.phone}`);
          }
        }
        return leadId;
      })
    );
    const created = renewalResults.filter(r => r.status === "fulfilled" && r.value).length;
    return {
      staleLeads: staleLeads.length,
      followUpsSent,
      expiringContracts: expiringContracts.length,
      renewalLeadsCreated: created,
    };
  }),
});

// ─── SMART AUTOMATIONS ROUTER ───────────────────────────────────────────────
// 10 automações baseadas em melhores práticas de CRM/WhatsApp
const AUTOMATION_DEFINITIONS = [
  {
    id: "welcome_whatsapp",
    name: "Boas-vindas automáticas",
    description: "Envia mensagem de boas-vindas via WhatsApp quando um novo lead é criado.",
    trigger: "Novo lead criado",
    triggerType: "event",
    condition: "Lead tem contato com telefone",
    action: "Enviar WhatsApp com mensagem de boas-vindas",
    channel: "whatsapp",
    category: "lead_nurturing",
    icon: "MessageSquare",
    color: "green",
  },
  {
    id: "follow_up_48h",
    name: "Follow-up 48h sem resposta",
    description: "Detecta leads sem interação há 48h e envia mensagem de follow-up.",
    trigger: "Lead sem interação há 48h",
    triggerType: "scheduled",
    condition: "Lead aberto + sem atividade há 48h",
    action: "Enviar WhatsApp Template WA-01",
    channel: "whatsapp",
    category: "lead_nurturing",
    icon: "Clock",
    color: "yellow",
  },
  {
    id: "contract_signed_chain",
    name: "Encadeamento pós-assinatura",
    description: "Ao assinar contrato: cria fatura de entrada (50%), projeto e envia magic link.",
    trigger: "Contrato assinado",
    triggerType: "event",
    condition: "Contrato com valor > 0",
    action: "Criar fatura 50% + projeto + enviar link portal",
    channel: "whatsapp",
    category: "onboarding",
    icon: "FileSignature",
    color: "purple",
  },
  {
    id: "renewal_30d",
    name: "Renovação 30 dias antes",
    description: "Cria lead de renovação 30 dias antes do vencimento do contrato.",
    trigger: "Contrato vencendo em 30 dias",
    triggerType: "scheduled",
    condition: "Contrato ativo com validUntil definido",
    action: "Criar lead de renovação + notificar via WhatsApp",
    channel: "whatsapp",
    category: "retention",
    icon: "RefreshCw",
    color: "orange",
  },
  {
    id: "overdue_invoice",
    name: "Lembrete de fatura vencida",
    description: "Envia lembrete via WhatsApp quando uma fatura está vencida há mais de 1 dia.",
    trigger: "Fatura vencida",
    triggerType: "scheduled",
    condition: "Fatura com status=sent e dueDate < hoje",
    action: "Enviar WhatsApp com link de pagamento",
    channel: "whatsapp",
    category: "financial",
    icon: "AlertCircle",
    color: "red",
  },
  {
    id: "onboarding_post_payment",
    name: "Onboarding pós-pagamento",
    description: "Inicia sequência de onboarding quando fatura de entrada é paga.",
    trigger: "Fatura de entrada paga",
    triggerType: "event",
    condition: "Fatura com status=paid vinculada a contrato",
    action: "Enviar WhatsApp com próximos passos + link do portal",
    channel: "whatsapp",
    category: "onboarding",
    icon: "Rocket",
    color: "blue",
  },
  {
    id: "nps_post_project",
    name: "NPS após conclusão de projeto",
    description: "Envia pesquisa de satisfação (NPS) quando um projeto é concluído.",
    trigger: "Projeto concluído",
    triggerType: "event",
    condition: "Projeto com status=completed",
    action: "Enviar WhatsApp com link de avaliação NPS",
    channel: "whatsapp",
    category: "satisfaction",
    icon: "Star",
    color: "amber",
  },
  {
    id: "reengagement_7d",
    name: "Reengajamento 7 dias",
    description: "Reengaja leads perdidos ou inativos há mais de 7 dias com oferta especial.",
    trigger: "Lead inativo há 7 dias",
    triggerType: "scheduled",
    condition: "Lead aberto sem atividade há 7+ dias",
    action: "Enviar WhatsApp com oferta de reengajamento",
    channel: "whatsapp",
    category: "re_engagement",
    icon: "Zap",
    color: "indigo",
  },
  {
    id: "session_reminder_24h",
    name: "Lembrete de sessão 24h antes",
    description: "Envia lembrete de agendamento de estúdio 24h antes da sessão.",
    trigger: "Sessão agendada em 24h",
    triggerType: "scheduled",
    condition: "Booking confirmado com data em 24h",
    action: "Enviar WhatsApp com detalhes da sessão",
    channel: "whatsapp",
    category: "studio",
    icon: "Calendar",
    color: "cyan",
  },
  {
    id: "weekly_pipeline_summary",
    name: "Resumo semanal do pipeline",
    description: "Envia resumo semanal com KPIs do pipeline para o owner toda segunda-feira.",
    trigger: "Toda segunda-feira às 9h",
    triggerType: "scheduled",
    condition: "Sempre",
    action: "Enviar email com KPIs + leads ativos + receita",
    channel: "email",
    category: "reporting",
    icon: "BarChart2",
    color: "teal",
  },
] as const;

const smartAutomationsRouter = router({
  // Listar todas as automações com status do banco
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return AUTOMATION_DEFINITIONS.map(def => ({ ...def, isActive: true, lastRunAt: null, totalRuns: 0, totalSuccess: 0, totalErrors: 0 }));
    const [settings] = await db.execute<Array<{ automationId: string; isActive: number; lastRunAt: Date | null; totalRuns: number; totalSuccess: number; totalErrors: number }>>(
      sql`SELECT automationId, isActive, lastRunAt, totalRuns, totalSuccess, totalErrors FROM automation_settings`
    );
    const settingsMap = new Map((settings as unknown as Array<{ automationId: string; isActive: number; lastRunAt: Date | null; totalRuns: number; totalSuccess: number; totalErrors: number }>).map((s) => [s.automationId, s]));
    return AUTOMATION_DEFINITIONS.map((def) => {
      const s = settingsMap.get(def.id);
      return {
        ...def,
        isActive: s ? Boolean(s.isActive) : true,
        lastRunAt: s?.lastRunAt ?? null,
        totalRuns: s?.totalRuns ?? 0,
        totalSuccess: s?.totalSuccess ?? 0,
        totalErrors: s?.totalErrors ?? 0,
      };
    });
  }),

  // Toggle ativo/pausado
  toggle: protectedProcedure.input(z.object({
    automationId: z.string(),
    isActive: z.boolean(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
    const aid = input.automationId;
    const active = input.isActive ? 1 : 0;
    await db.execute(sql`INSERT INTO automation_settings (automationId, isActive) VALUES (${aid}, ${active}) ON DUPLICATE KEY UPDATE isActive = ${active}`);
    return { success: true };
  }),

  // Logs de execução
  getLogs: protectedProcedure.input(z.object({
    automationId: z.string().optional(),
    limit: z.number().default(50),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    type LogRow = { id: number; automationId: string; automationName: string; trigger: string; status: string; affectedCount: number; result: string | null; errorMessage: string | null; executedAt: Date };
    if (input.automationId) {
      const aid = input.automationId;
      const lim = input.limit;
      const [rows] = await db.execute<LogRow[]>(sql`SELECT * FROM automation_logs WHERE automationId = ${aid} ORDER BY executedAt DESC LIMIT ${lim}`);
      return rows as unknown as LogRow[];
    }
    const lim = input.limit;
    const [rows] = await db.execute<LogRow[]>(sql`SELECT * FROM automation_logs ORDER BY executedAt DESC LIMIT ${lim}`);
    return rows as unknown as LogRow[];
  }),

  // Executar automação específica manualmente
  run: protectedProcedure.input(z.object({
    automationId: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
    const userId = ctx.user.id;
    let affectedCount = 0;
    let resultMsg = "";
    let errorMsg: string | null = null;
    let logStatus: "success" | "error" | "skipped" = "success";

    try {
      switch (input.automationId) {
        case "follow_up_48h": {
          const staleLeads = await getLeadsWithoutInteraction48h();
          let sent = 0;
          for (const lead of staleLeads) {
            if (!lead.contactId) continue;
            const contact = await getContactById(lead.contactId);
            if (contact?.phone) {
              const msg = `Olá ${contact.name}! 👋 Aqui é o time do Pátio Estúdio. Notamos que você entrou em contato conosco recentemente. Gostaríamos de entender melhor como podemos ajudar com seu projeto de podcast. Tem um momento para conversarmos?`;
              await sendText(contact.phone, msg).catch(() => {});
              await createLeadActivity({ leadId: lead.id, type: "whatsapp_sent", description: "Follow-up automático 48h enviado", userId });
              sent++;
            }
          }
          affectedCount = sent;
          resultMsg = `${sent} follow-ups enviados de ${staleLeads.length} leads detectados`;
          break;
        }
        case "renewal_30d": {
          const expiring = await getContractsExpiringIn30Days();
          let created = 0;
          for (const c of expiring) {
            await createRenewalLead(c.id).catch(() => {});
            if (c.contactId) {
              const contact = await getContactById(c.contactId);
              if (contact?.phone) {
                const msg = `Olá ${contact.name}! 🎙️ Seu contrato com o Pátio Estúdio está próximo do vencimento. Gostaríamos de conversar sobre a renovação e garantir a continuidade do seu projeto de podcast. Quando podemos falar?`;
                await sendText(contact.phone, msg).catch(() => {});
              }
            }
            created++;
          }
          affectedCount = created;
          resultMsg = `${created} leads de renovação criados de ${expiring.length} contratos detectados`;
          break;
        }
        case "overdue_invoice": {
          const [invRows] = await db.execute<Array<{ id: number; number: string; total: string; dueDate: Date; contactId: number; phone: string | null; name: string | null }>>(
            sql`SELECT i.id, i.number, i.total, i.dueDate, i.contactId, c.phone, c.name FROM invoices i LEFT JOIN contacts c ON i.contactId = c.id WHERE i.status = 'sent' AND i.dueDate < NOW() AND i.dueDate > DATE_SUB(NOW(), INTERVAL 30 DAY)`
          );
          const invoices = invRows as unknown as Array<{ id: number; number: string; total: string; dueDate: Date; contactId: number; phone: string | null; name: string | null }>;
          let sent = 0;
          for (const inv of invoices) {
            if (inv.phone) {
              const msg = `Olá ${inv.name}! ⚠️ A fatura ${inv.number} no valor de R$ ${Number(inv.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} está vencida. Por favor, regularize o pagamento para evitar interrupções. Precisa de ajuda? Estamos à disposição!`;
              await sendText(inv.phone, msg).catch(() => {});
              sent++;
            }
          }
          affectedCount = sent;
          resultMsg = `${sent} lembretes de fatura vencida enviados`;
          break;
        }
        case "reengagement_7d": {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const [reengRows] = await db.execute<Array<{ id: number; title: string; contactId: number; phone: string; name: string }>>(
            sql`SELECT l.id, l.title, l.contactId, c.phone, c.name FROM leads l LEFT JOIN contacts c ON l.contactId = c.id WHERE l.status = 'open' AND l.updatedAt < ${sevenDaysAgo} AND c.phone IS NOT NULL`
          );
          const staleLeads = reengRows as unknown as Array<{ id: number; title: string; contactId: number; phone: string; name: string }>;
          let sent = 0;
          for (const lead of staleLeads) {
            const msg = `Olá ${lead.name}! 🎙️ Sabemos que você tem interesse em criar seu podcast. Que tal darmos o próximo passo juntos? Temos uma oferta especial para novos projetos este mês. Posso te contar mais?`;
            await sendText(lead.phone, msg).catch(() => {});
            await createLeadActivity({ leadId: lead.id, type: "whatsapp_sent", description: "Reengajamento automático 7d enviado", userId });
            sent++;
          }
          affectedCount = sent;
          resultMsg = `${sent} mensagens de reengajamento enviadas`;
          break;
        }
        case "session_reminder_24h": {
          const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const now = new Date();
          const [bookingRows] = await db.execute<Array<{ id: number; startTime: Date; contactId: number; phone: string; name: string; roomName: string }>>(
            sql`SELECT b.id, b.startTime, b.contactId, c.phone, c.name, r.name as roomName FROM studio_bookings b LEFT JOIN contacts c ON b.contactId = c.id LEFT JOIN studio_rooms r ON b.roomId = r.id WHERE b.status = 'confirmed' AND b.startTime BETWEEN ${now} AND ${in24h} AND c.phone IS NOT NULL AND b.reminderSent = 0`
          );
          const bookings = bookingRows as unknown as Array<{ id: number; startTime: Date; contactId: number; phone: string; name: string; roomName: string }>;
          let sent = 0;
          for (const b of bookings) {
            const dateStr = new Date(b.startTime).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
            const msg = `Olá ${b.name}! 🎙️ Lembrete: sua sessão no Pátio Estúdio está agendada para amanhã (${dateStr}) na sala ${b.roomName ?? "principal"}. Qualquer dúvida, estamos à disposição!`;
            await sendText(b.phone, msg).catch(() => {});
            await db.execute(sql`UPDATE studio_bookings SET reminderSent = 1 WHERE id = ${b.id}`).catch(() => {});
            sent++;
          }
          affectedCount = sent;
          resultMsg = `${sent} lembretes de sessão enviados`;
          break;
        }
        case "weekly_pipeline_summary": {
          const kpis = await getDashboardKpis();
          const actionItems = await getDashboardActionItems();
          const revenueThisMonth = kpis?.revenueThisMonth ?? 0;
          const revenueChange = kpis?.revenueChange ?? 0;
          const activeLeads = kpis?.activeLeads ?? 0;
          const conversionRate = kpis?.conversionRate ?? 0;
          const weekSessions = kpis?.weekSessions ?? 0;
          const staleLeadsCount = actionItems?.staleLeads?.length ?? 0;
          const overdueInvoicesCount = actionItems?.overdueInvoices?.length ?? 0;
          const summaryLines = [
            `📊 *Resumo Semanal do Pipeline — Pátio Estúdio*`,
            ``,
            `💰 Receita do mês: R$ ${revenueThisMonth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            `📈 Variação: ${revenueChange >= 0 ? "+" : ""}${revenueChange}% vs mês anterior`,
            `🎯 Leads ativos: ${activeLeads}`,
            `✅ Taxa de conversão: ${conversionRate}%`,
            `🎙️ Sessões na semana: ${weekSessions}`,
            ``,
            `⚠️ Ações pendentes:`,
            `  • ${staleLeadsCount} leads parados`,
            `  • ${overdueInvoicesCount} faturas vencidas`,
          ].join("\n");
          await notifyOwner({ title: "Resumo Semanal do Pipeline", content: summaryLines });
          affectedCount = 1;
          resultMsg = "Resumo semanal enviado ao owner";
          break;
        }
        case "nps_post_project": {
          const [npsRows] = await db.execute<Array<{ id: number; name: string; contactId: number; phone: string; contactName: string }>>(
            sql`SELECT p.id, p.name, p.contactId, c.phone, c.name as contactName FROM projects p LEFT JOIN contacts c ON p.contactId = c.id WHERE p.status = 'completed' AND c.phone IS NOT NULL AND p.updatedAt > DATE_SUB(NOW(), INTERVAL 7 DAY)`
          );
          const completedProjects = npsRows as unknown as Array<{ id: number; name: string; contactId: number; phone: string; contactName: string }>;
          let sent = 0;
          for (const proj of completedProjects) {
            const msg = `Olá ${proj.contactName}! 🌟 Seu projeto "${proj.name}" foi concluído. Adoraríamos saber sua opinião! De 0 a 10, qual a chance de você recomendar o Pátio Estúdio para um amigo? Sua avaliação nos ajuda a melhorar cada vez mais. 🎙️`;
            await sendText(proj.phone, msg).catch(() => {});
            sent++;
          }
          affectedCount = sent;
          resultMsg = `${sent} pesquisas NPS enviadas`;
          break;
        }
        case "onboarding_post_payment": {
          const [onbRows] = await db.execute<Array<{ id: number; contactId: number; phone: string; name: string; paidAt: Date }>>(
            sql`SELECT i.id, i.contactId, c.phone, c.name, i.paidAt FROM invoices i LEFT JOIN contacts c ON i.contactId = c.id WHERE i.status = 'paid' AND i.paidAt > DATE_SUB(NOW(), INTERVAL 24 HOUR) AND c.phone IS NOT NULL`
          );
          const paidInvoices = onbRows as unknown as Array<{ id: number; contactId: number; phone: string; name: string; paidAt: Date }>;
          let sent = 0;
          for (const inv of paidInvoices) {
            const msg = `Olá ${inv.name}! 🎉 Recebemos seu pagamento com sucesso! Agora vamos dar início ao seu projeto. Nosso time entrará em contato em breve para alinhar os próximos passos. Bem-vindo ao Pátio Estúdio! 🎙️`;
            await sendText(inv.phone, msg).catch(() => {});
            sent++;
          }
          affectedCount = sent;
          resultMsg = `${sent} mensagens de onboarding enviadas`;
          break;
        }
        case "welcome_whatsapp": {
          resultMsg = "Automação de boas-vindas é disparada automaticamente pelo webhook Z-API ao receber nova mensagem.";
          logStatus = "skipped";
          break;
        }
        case "contract_signed_chain": {
          resultMsg = "Automação de encadeamento é disparada automaticamente ao assinar um contrato.";
          logStatus = "skipped";
          break;
        }
        default:
          resultMsg = `Automação '${input.automationId}' não reconhecida.`;
          logStatus = "error";
      }
    } catch (e) {
      errorMsg = String(e);
      logStatus = "error";
      resultMsg = `Erro: ${errorMsg}`;
    }

    // Registrar no log
    const def = AUTOMATION_DEFINITIONS.find(d => d.id === input.automationId);
    const defName = def?.name ?? input.automationId;
    const defTrigger = def?.trigger ?? "manual";
    const successCount = logStatus === "success" ? 1 : 0;
    const errorCount = logStatus === "error" ? 1 : 0;
    if (db) {
      await db.execute(sql`INSERT INTO automation_logs (automationId, automationName, \`trigger\`, status, affectedCount, result, errorMessage, executedBy) VALUES (${input.automationId}, ${defName}, ${defTrigger}, ${logStatus}, ${affectedCount}, ${resultMsg}, ${errorMsg}, ${userId})`);
      await db.execute(sql`INSERT INTO automation_settings (automationId, isActive, lastRunAt, totalRuns, totalSuccess, totalErrors) VALUES (${input.automationId}, 1, NOW(), 1, ${successCount}, ${errorCount}) ON DUPLICATE KEY UPDATE lastRunAt = NOW(), totalRuns = totalRuns + 1, totalSuccess = totalSuccess + ${successCount}, totalErrors = totalErrors + ${errorCount}`);
    }

    return { success: logStatus !== "error", affectedCount, result: resultMsg, status: logStatus };
  }),

  // Executar todas as automações agendadas
  runAll: protectedProcedure.mutation(async () => {
    const db = await getDb();
    const scheduledIds = ["follow_up_48h", "renewal_30d", "overdue_invoice", "reengagement_7d", "session_reminder_24h", "weekly_pipeline_summary"];
    const results: Array<{ id: string; status: string; affectedCount: number; result: string }> = [];
    for (const id of scheduledIds) {
      if (db) {
        const [settingsRows] = await db.execute<Array<{ isActive: number }>>(sql`SELECT isActive FROM automation_settings WHERE automationId = ${id}`);
        const settingsArr = settingsRows as unknown as Array<{ isActive: number }>;
        if (settingsArr[0] && !settingsArr[0].isActive) continue;
      }
      results.push({ id, status: "queued", affectedCount: 0, result: "Agendado para execução" });
    }
    return results;
  }),
});

// ─── APP ROUTER ────────────────────────────────────────────────────────────
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
  products: productsRouter,
  billingReminders: billingRemindersRouter,
  projects: projectsRouter,
  contractTemplates: contractTemplatesRouter,
  contactTags: contactTagsRouter,
  credits: creditsRouter,
  pj: pjRouter,
  routines: routinesRouter,
  podcasts: podcastsRouter,
  brand: brandRouter,
  portalMagic: portalMagicRouter,
  automations: automationsRouter,
  messageTemplates: messageTemplatesRouter,
  studioRooms: studioRoomsRouter,
  equipment: equipmentRouter,
  sprintA: sprintARouter,
   notifications: notificationsRouter,
  toc: tocRouter,
  whatsappAi: whatsappAiRouter,
  nps: npsRouter,
  sprintD: sprintDRouter,
  sprintE: sprintERouter,
  sprintF: sprintFRouter,
  playbook: playbookRouter,
  smartAutomations: smartAutomationsRouter,
});
export type AppRouter = typeof appRouter;
