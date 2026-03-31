import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  activities,
  contacts,
  contracts,
  invoices,
  leads,
  pipelineStages,
  quotes,
  studioBookings,
  tasks,
  users,
  whatsappChats,
  whatsappMessages,
  type InsertContact,
  type InsertLead,
  type InsertPipelineStage,
  type InsertContract,
  type InsertInvoice,
  type InsertQuote,
  type InsertStudioBooking,
  type InsertTask,
  type InsertActivity,
  type InsertWhatsappChat,
  type InsertWhatsappMessage,
  products,
  billingReminders,
  clientPortalTokens,
  type InsertBillingReminder,
  type InsertClientPortalToken,
  projects,
  contractTemplates,
  contactTags,
  contactTagAssignments,
  creditTransactions,
  projectLinks,
  type InsertProject,
  type InsertContractTemplate,
  type InsertCreditTransaction,
  pjDocuments,
  dailyRoutines,
  routineTemplates,
  type InsertPjDocument,
  podcasts,
  episodes,
  episodeComments,
  type InsertPodcast,
  type InsertEpisode,
  type InsertEpisodeComment,
  brandSettings,
  portalMagicLinks,
  type InsertBrandSettings,
  type InsertPortalMagicLink,
  automationSequences,
  automationSteps,
  automationExecutions,
  messageTemplates,
  type InsertAutomationSequence,
  type InsertAutomationStep,
  type InsertAutomationExecution,
  type InsertMessageTemplate,
  studioRooms,
  equipment,
  equipmentBookings,
  notifications,
  type InsertStudioRoom,
  type InsertEquipment,
  type InsertEquipmentBooking,
  type InsertNotification,
  type Notification,
  tocConfigs,
  tocSessions,
  tocConstraints,
  tocActionItems,
  type InsertTocConfig,
  type InsertTocSession,
  type InsertTocConstraint,
  type InsertTocActionItem,
  whatsappAnalysis,
  npsResponses,
  type InsertWhatsappAnalysis,
  type InsertNpsResponse,
  timeEntries,
  type InsertTimeEntry,
  leadActivities,
  type InsertLeadActivity,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import crypto from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }

  // Owner always gets admin + active
  if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    values.status = "active";
    values.whatsappAccess = true;
    updateSet.role = "admin";
    updateSet.status = "active";
    updateSet.whatsappAccess = true;
  } else if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.status, "pending")).orderBy(desc(users.createdAt));
}

export async function updateUserStatus(userId: number, status: "active" | "rejected") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "admin" | "gerente" | "analista" | "assistente") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserWhatsappAccess(userId: number, whatsappAccess: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ whatsappAccess, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function createUser(data: { name: string; email?: string; role: "admin" | "gerente" | "analista" | "assistente"; whatsappAccess: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Generate a unique openId for admin-created users (they log in via email invitation)
  const openId = `admin_created_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    role: data.role,
    whatsappAccess: data.whatsappAccess,
    status: "active",
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
  return { success: true };
}

// ─── PIPELINE STAGES ─────────────────────────────────────────────────────────
export async function getPipelineStages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelineStages).orderBy(pipelineStages.position);
}

export async function createPipelineStage(data: InsertPipelineStage) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(pipelineStages).values(data);
  return result;
}

export async function seedDefaultPipelineStages() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(pipelineStages).limit(1);
  if (existing.length > 0) return;
  await db.insert(pipelineStages).values([
    { name: "Prospecção", color: "#6366f1", position: 0, isDefault: true },
    { name: "Qualificação", color: "#8b5cf6", position: 1, isDefault: false },
    { name: "Proposta", color: "#f59e0b", position: 2, isDefault: false },
    { name: "Negociação", color: "#f97316", position: 3, isDefault: false },
    { name: "Fechamento", color: "#10b981", position: 4, isDefault: false },
  ]);
}

// ─── CONTACTS ─────────────────────────────────────────────────────────────────
export async function getContacts(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(contacts).where(
      or(
        like(contacts.name, `%${search}%`),
        like(contacts.email, `%${search}%`),
        like(contacts.phone, `%${search}%`),
        like(contacts.company, `%${search}%`)
      )
    ).orderBy(desc(contacts.createdAt));
  }
  return db.select().from(contacts).orderBy(desc(contacts.createdAt));
}

export async function getContactById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return result[0];
}

export async function createContact(data: InsertContact) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(contacts).values(data);
  return result;
}

export async function updateContact(id: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contacts).set({ ...data, updatedAt: new Date() }).where(eq(contacts.id, id));
}

export async function deleteContact(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contacts).where(eq(contacts.id, id));
}

// ─── LEADS ────────────────────────────────────────────────────────────────────
export async function getLeads(stageId?: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (stageId) conditions.push(eq(leads.stageId, stageId));
  if (status) conditions.push(eq(leads.status, status as "open" | "won" | "lost"));
  const query = db.select().from(leads).orderBy(desc(leads.createdAt));
  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function createLead(data: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(leads).values(data);
  return result;
}

export async function updateLead(id: number, data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(leads).set({ ...data, updatedAt: new Date() }).where(eq(leads.id, id));
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(leads).where(eq(leads.id, id));
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
export async function getTotalUnreadChats() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${whatsappChats.unreadCount}), 0)` })
    .from(whatsappChats);
  return Number(result[0]?.total ?? 0);
}
export async function getWhatsappChats() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whatsappChats).orderBy(desc(whatsappChats.lastMessageAt));
}

export async function upsertWhatsappChat(data: InsertWhatsappChat) {
  const db = await getDb();
  if (!db) return;
  // Build update set — only include defined fields so partial updates don't overwrite good data
  const updateSet: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.lastMessageAt !== undefined) updateSet.lastMessageAt = data.lastMessageAt;
  if (data.lastMessagePreview !== undefined) updateSet.lastMessagePreview = data.lastMessagePreview;
  if (data.unreadCount !== undefined) updateSet.unreadCount = data.unreadCount;
  if (data.isGroup !== undefined) updateSet.isGroup = data.isGroup;
  if (data.contactId !== undefined) updateSet.contactId = data.contactId; // ← fix: persist contactId
  await db.insert(whatsappChats).values(data).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getWhatsappMessages(chatJid: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whatsappMessages)
    .where(eq(whatsappMessages.chatJid, chatJid))
    .orderBy(whatsappMessages.timestamp)
    .limit(limit);
}

export async function upsertWhatsappMessage(data: InsertWhatsappMessage) {
  const db = await getDb();
  if (!db) return;
  await db.insert(whatsappMessages).values(data).onDuplicateKeyUpdate({
    set: { content: data.content, crmUserId: data.crmUserId, crmUserName: data.crmUserName },
  });
}

// ─── CONTRACTS ────────────────────────────────────────────────────────────────
export async function getContracts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contracts).orderBy(desc(contracts.createdAt));
}
export async function getContractsWithContact() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: contracts.id,
      title: contracts.title,
      content: contracts.content,
      status: contracts.status,
      value: contracts.value,
      validUntil: contracts.validUntil,
      signerName: contracts.signerName,
      signerEmail: contracts.signerEmail,
      signatureUrl: contracts.signatureUrl,
      signedAt: contracts.signedAt,
      contactId: contracts.contactId,
      leadId: contracts.leadId,
      assignedUserId: contracts.assignedUserId,
      createdAt: contracts.createdAt,
      updatedAt: contracts.updatedAt,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
    })
    .from(contracts)
    .leftJoin(contacts, eq(contracts.contactId, contacts.id))
    .orderBy(desc(contracts.createdAt));
}

export async function getContractById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return result[0];
}

export async function createContract(data: InsertContract) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(contracts).values(data);
  return result;
}

export async function updateContract(id: number, data: Partial<InsertContract>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contracts).set({ ...data, updatedAt: new Date() }).where(eq(contracts.id, id));
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────
export async function getInvoices() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      contactId: invoices.contactId,
      leadId: invoices.leadId,
      assignedUserId: invoices.assignedUserId,
      status: invoices.status,
      items: invoices.items,
      subtotal: invoices.subtotal,
      tax: invoices.tax,
      total: invoices.total,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      paidAt: invoices.paidAt,
      fileUrl: invoices.fileUrl,
      notes: invoices.notes,
      stripePaymentIntentId: invoices.stripePaymentIntentId,
      stripePaymentUrl: invoices.stripePaymentUrl,
      paymentPlan: invoices.paymentPlan,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
    })
    .from(invoices)
    .leftJoin(contacts, eq(invoices.contactId, contacts.id))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result[0];
}

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(invoices).values(data);
  return result;
}

export async function updateInvoice(id: number, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(invoices).set({ ...data, updatedAt: new Date() }).where(eq(invoices.id, id));
}

// ─── QUOTES ───────────────────────────────────────────────────────────────────
export async function getQuotes() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: quotes.id,
      number: quotes.number,
      contactId: quotes.contactId,
      leadId: quotes.leadId,
      assignedUserId: quotes.assignedUserId,
      status: quotes.status,
      items: quotes.items,
      subtotal: quotes.subtotal,
      discount: quotes.discount,
      tax: quotes.tax,
      total: quotes.total,
      currency: quotes.currency,
      validUntil: quotes.validUntil,
      fileUrl: quotes.fileUrl,
      notes: quotes.notes,
      createdAt: quotes.createdAt,
      updatedAt: quotes.updatedAt,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
    })
    .from(quotes)
    .leftJoin(contacts, eq(quotes.contactId, contacts.id))
    .orderBy(desc(quotes.createdAt));
}

export async function createQuote(data: InsertQuote) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(quotes).values(data);
  return result;
}

export async function updateQuote(id: number, data: Partial<InsertQuote>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(quotes).set({ ...data, updatedAt: new Date() }).where(eq(quotes.id, id));
}

// ─── STUDIO BOOKINGS ──────────────────────────────────────────────────────────
export async function getStudioBookings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studioBookings).orderBy(studioBookings.startAt);
}

export async function createStudioBooking(data: InsertStudioBooking) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(studioBookings).values(data);
  return result;
}

export async function updateStudioBooking(id: number, data: Partial<InsertStudioBooking>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(studioBookings).set({ ...data, updatedAt: new Date() }).where(eq(studioBookings.id, id));
}

export async function deleteStudioBooking(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(studioBookings).where(eq(studioBookings.id, id));
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
export async function getTasks(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return db.select().from(tasks).where(eq(tasks.assignedUserId, userId)).orderBy(desc(tasks.createdAt));
  }
  return db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(tasks).values(data);
  return result;
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, id));
}

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────
export async function getRecentActivities(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activities).orderBy(desc(activities.createdAt)).limit(limit);
}

export async function createActivity(data: InsertActivity) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activities).values(data);
}

// ─── CONTACT PROFILE (360° view) ─────────────────────────────────────────────
export async function getContactProfile(contactId: number) {
  const db = await getDb();
  if (!db) return null;
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) return null;
  const [contactLeads, contactInvoices, contactQuotes, contactContracts, contactBookings, contactChats] = await Promise.all([
    db.select().from(leads).where(eq(leads.contactId, contactId)).orderBy(desc(leads.createdAt)),
    db.select().from(invoices).where(eq(invoices.contactId, contactId)).orderBy(desc(invoices.createdAt)),
    db.select().from(quotes).where(eq(quotes.contactId, contactId)).orderBy(desc(quotes.createdAt)),
    db.select().from(contracts).where(eq(contracts.contactId, contactId)).orderBy(desc(contracts.createdAt)),
    db.select().from(studioBookings).where(eq(studioBookings.contactId, contactId)).orderBy(desc(studioBookings.createdAt)),
    db.select().from(whatsappChats).where(eq(whatsappChats.contactId, contactId)).limit(1),
  ]);
  return {
    contact,
    leads: contactLeads,
    invoices: contactInvoices,
    quotes: contactQuotes,
    contracts: contactContracts,
    bookings: contactBookings,
    whatsappChat: contactChats[0] ?? null,
  };
}

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalContacts: 0, openLeads: 0, totalRevenue: "0", pendingTasks: 0, pendingUsers: 0 };

  const [contactCount] = await db.select({ count: sql<number>`count(*)` }).from(contacts);
  const [leadCount] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, "open"));
  const [revenueSum] = await db.select({ sum: sql<string>`COALESCE(SUM(total), 0)` }).from(invoices).where(eq(invoices.status, "paid"));
  const [taskCount] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(eq(tasks.status, "pending"));
  const [pendingCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.status, "pending"));

  return {
    totalContacts: contactCount?.count ?? 0,
    openLeads: leadCount?.count ?? 0,
    totalRevenue: revenueSum?.sum ?? "0",
    pendingTasks: taskCount?.count ?? 0,
    pendingUsers: pendingCount?.count ?? 0,
  };
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
export async function getMonthlyRevenue(months = 12) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    month: sql<string>`DATE_FORMAT(paidAt, '%Y-%m')`,
    total: sql<string>`COALESCE(SUM(total), 0)`,
  })
    .from(invoices)
    .where(and(eq(invoices.status, "paid"), sql`paidAt IS NOT NULL`))
    .groupBy(sql`DATE_FORMAT(paidAt, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(paidAt, '%Y-%m') DESC`)
    .limit(months);
  return rows.reverse();
}

export async function getTopClientsByRevenue(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    contactId: invoices.contactId,
    name: contacts.name,
    email: contacts.email,
    total: sql<string>`COALESCE(SUM(${invoices.total}), 0)`,
    invoiceCount: sql<number>`COUNT(${invoices.id})`,
  })
    .from(invoices)
    .leftJoin(contacts, eq(invoices.contactId, contacts.id))
    .where(eq(invoices.status, "paid"))
    .groupBy(invoices.contactId, contacts.name, contacts.email)
    .orderBy(sql`SUM(${invoices.total}) DESC`)
    .limit(limit);
}

export async function getLeadConversionFunnel() {
  const db = await getDb();
  if (!db) return { total: 0, contacted: 0, proposal: 0, won: 0, lost: 0 };
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(leads);
  const [won] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, "won"));
  const [lost] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, "lost"));
  const stages = await db.select({ id: pipelineStages.id, name: pipelineStages.name, position: pipelineStages.position }).from(pipelineStages).orderBy(pipelineStages.position);
  // contacted = stage 2+, proposal = stage 3+
  const stage2 = stages[1]?.id;
  const stage3 = stages[2]?.id;
  const [contacted] = stage2
    ? await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(eq(leads.status, "open"), sql`stageId >= ${stage2}`))
    : [{ count: 0 }];
  const [proposal] = stage3
    ? await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(eq(leads.status, "open"), sql`stageId >= ${stage3}`))
    : [{ count: 0 }];
  return {
    total: total?.count ?? 0,
    contacted: contacted?.count ?? 0,
    proposal: proposal?.count ?? 0,
    won: won?.count ?? 0,
    lost: lost?.count ?? 0,
  };
}

// ─── CLIENT PORTAL ────────────────────────────────────────────────────────────

export async function createPortalToken(data: { type: "contract" | "invoice" | "quote"; documentId: number; contactId?: number; expiresInDays?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays ?? 30));
  await db.insert(clientPortalTokens).values({ token, type: data.type, documentId: data.documentId, contactId: data.contactId, expiresAt });
  return token;
}

export async function getPortalToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(clientPortalTokens).where(eq(clientPortalTokens.token, token)).limit(1);
  return row ?? null;
}

export async function approvePortalDocument(token: string, signedName?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(clientPortalTokens)
    .set({ approvedAt: new Date(), signedName: signedName ?? null, usedAt: new Date() })
    .where(eq(clientPortalTokens.token, token));
}

// ─── WHATSAPP CHAT CONTACT LINKING ────────────────────────────────────────────
export async function linkChatToContact(jid: string) {
  const db = await getDb();
  if (!db) return;
  // Extract phone from JID (e.g. "5511999999999@s.whatsapp.net" → "5511999999999")
  const phone = jid.split("@")[0];
  if (!phone || phone.length < 8) return;
  // Try to find contact by phone (strip non-digits and match last 11 digits)
  const allContacts = await db.select({ id: contacts.id, phone: contacts.phone }).from(contacts).where(sql`phone IS NOT NULL`);
  const match = allContacts.find(c => {
    const cp = (c.phone ?? "").replace(/\D/g, "");
    const pp = phone.replace(/\D/g, "");
    return cp === pp || cp.endsWith(pp.slice(-11)) || pp.endsWith(cp.slice(-11));
  });
  if (match) {
    await db.update(whatsappChats).set({ contactId: match.id }).where(eq(whatsappChats.jid, jid));
  }
}

// ─── PRODUCTS (CATÁLOGO) ──────────────────────────────────────────────────────
export async function getProducts(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) return db.select().from(products).where(eq(products.active, true)).orderBy(products.category, products.name);
  return db.select().from(products).orderBy(products.category, products.name);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return row;
}

export async function createProduct(data: { name: string; description?: string; category?: "episode" | "package" | "studio" | "service" | "other"; unitPrice: string; currency?: string; unit?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(products).values({ ...data, active: true });
}

export async function updateProduct(id: number, data: Partial<{ name: string; description: string; category: "episode" | "package" | "studio" | "service" | "other"; unitPrice: string; currency: string; unit: string; active: boolean }>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set({ active: false, updatedAt: new Date() }).where(eq(products.id, id));
}

// ─── BILLING REMINDERS ────────────────────────────────────────────────────────
export async function getBillingReminders(invoiceId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (invoiceId) return db.select().from(billingReminders).where(eq(billingReminders.invoiceId, invoiceId)).orderBy(billingReminders.scheduledAt);
  return db.select().from(billingReminders).orderBy(billingReminders.scheduledAt);
}

export async function createBillingReminder(data: InsertBillingReminder) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(billingReminders).values(data);
}

export async function cancelBillingReminder(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(billingReminders).set({ status: "cancelled" }).where(eq(billingReminders.id, id));
}

export async function getPendingBillingReminders() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(billingReminders)
    .where(and(eq(billingReminders.status, "pending"), sql`scheduledAt <= ${now}`))
    .orderBy(billingReminders.scheduledAt);
}

export async function markReminderSent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(billingReminders).set({ status: "sent", sentAt: new Date() }).where(eq(billingReminders.id, id));
}

export async function markReminderFailed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(billingReminders).set({ status: "failed" }).where(eq(billingReminders.id, id));
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
export async function getProjects(contactId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (contactId) return db.select().from(projects).where(eq(projects.contactId, contactId)).orderBy(desc(projects.createdAt));
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}
export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}
export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(projects).values(data);
  return result;
}
export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id));
}
export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projects).where(eq(projects.id, id));
}
export async function getProjectLinks(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectLinks).where(eq(projectLinks.projectId, projectId));
}
export async function addProjectLink(projectId: number, entityType: "booking" | "invoice" | "contract" | "quote" | "task", entityId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(projectLinks).values({ projectId, entityType, entityId });
}
export async function removeProjectLink(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projectLinks).where(eq(projectLinks.id, id));
}

// ─── CONTRACT TEMPLATES ───────────────────────────────────────────────────────
export async function getContractTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contractTemplates).orderBy(desc(contractTemplates.createdAt));
}
export async function getContractTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contractTemplates).where(eq(contractTemplates.id, id)).limit(1);
  return result[0];
}
export async function createContractTemplate(data: InsertContractTemplate) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(contractTemplates).values(data);
  return result;
}
export async function updateContractTemplate(id: number, data: Partial<InsertContractTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contractTemplates).set({ ...data, updatedAt: new Date() }).where(eq(contractTemplates.id, id));
}
export async function deleteContractTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contractTemplates).where(eq(contractTemplates.id, id));
}
export async function incrementTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contractTemplates).set({ usageCount: sql`usageCount + 1` }).where(eq(contractTemplates.id, id));
}

// ─── CONTACT TAGS ─────────────────────────────────────────────────────────────
export async function getAllContactTags() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactTags).orderBy(contactTags.name);
}
export async function createContactTag(name: string, color: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(contactTags).values({ name, color });
  return result;
}
export async function deleteContactTag(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contactTagAssignments).where(eq(contactTagAssignments.tagId, id));
  await db.delete(contactTags).where(eq(contactTags.id, id));
}
export async function getTagsForContact(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: contactTags.id, name: contactTags.name, color: contactTags.color })
    .from(contactTagAssignments)
    .innerJoin(contactTags, eq(contactTagAssignments.tagId, contactTags.id))
    .where(eq(contactTagAssignments.contactId, contactId));
}
export async function assignTagToContact(contactId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(contactTagAssignments).values({ contactId, tagId }).onDuplicateKeyUpdate({ set: { contactId } });
}
export async function removeTagFromContact(contactId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contactTagAssignments).where(and(eq(contactTagAssignments.contactId, contactId), eq(contactTagAssignments.tagId, tagId)));
}

// ─── CREDIT TRANSACTIONS ──────────────────────────────────────────────────────
export async function getCreditBalance(contactId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ balance: creditTransactions.balance })
    .from(creditTransactions)
    .where(eq(creditTransactions.contactId, contactId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(1);
  return Number(result[0]?.balance ?? 0);
}
export async function getCreditHistory(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditTransactions).where(eq(creditTransactions.contactId, contactId)).orderBy(desc(creditTransactions.createdAt));
}
export async function addCreditTransaction(data: InsertCreditTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(creditTransactions).values(data);
}

// ─── PJ DOCUMENTS ─────────────────────────────────────────────────────────────
export async function getPjDocumentByContact(contactId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pjDocuments).where(eq(pjDocuments.contactId, contactId)).limit(1);
  return result[0];
}
export async function createPjDocument(data: InsertPjDocument) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(pjDocuments).values(data);
  return result;
}
export async function updatePjDocument(id: number, data: Partial<InsertPjDocument>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(pjDocuments).set({ ...data, updatedAt: new Date() }).where(eq(pjDocuments.id, id));
}

// ─── ROUTINE TEMPLATES ────────────────────────────────────────────────────────
export async function getRoutineTemplatesByRole(role: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routineTemplates)
    .where(and(eq(routineTemplates.role, role), eq(routineTemplates.isActive, true)))
    .orderBy(routineTemplates.order);
}
export async function getAllRoutineTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routineTemplates).orderBy(routineTemplates.role, routineTemplates.order);
}
export async function createRoutineTemplate(data: { role: string; title: string; description?: string; order?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(routineTemplates).values(data);
  return result;
}
export async function updateRoutineTemplate(id: number, data: { title?: string; description?: string; order?: number; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(routineTemplates).set(data).where(eq(routineTemplates.id, id));
}
export async function deleteRoutineTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(routineTemplates).where(eq(routineTemplates.id, id));
}
export async function seedDefaultRoutines() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(routineTemplates).limit(1);
  if (existing.length > 0) return;
  await db.insert(routineTemplates).values([
    // Admin
    { role: "admin", title: "Verificar KPIs do dia (receita, leads, agendamentos)", order: 1 },
    { role: "admin", title: "Revisar usuários pendentes de aprovação", order: 2 },
    { role: "admin", title: "Checar faturas vencidas ou a vencer hoje", order: 3 },
    { role: "admin", title: "Revisar pipeline de vendas", order: 4 },
    { role: "admin", title: "Responder mensagens WhatsApp não lidas", order: 5 },
    // Gerente
    { role: "gerente", title: "Verificar agendamentos do dia no estúdio", order: 1 },
    { role: "gerente", title: "Revisar tarefas pendentes da equipe", order: 2 },
    { role: "gerente", title: "Checar orçamentos aguardando aprovação", order: 3 },
    { role: "gerente", title: "Atualizar status dos projetos em andamento", order: 4 },
    { role: "gerente", title: "Responder mensagens WhatsApp não lidas", order: 5 },
    // Analista
    { role: "analista", title: "Verificar leads novos no pipeline", order: 1 },
    { role: "analista", title: "Atualizar status das tarefas em andamento", order: 2 },
    { role: "analista", title: "Registrar atividades do dia anterior", order: 3 },
    { role: "analista", title: "Checar lembretes de cobrança do dia", order: 4 },
    // Assistente
    { role: "assistente", title: "Confirmar agendamentos do dia", order: 1 },
    { role: "assistente", title: "Verificar tarefas atribuídas a mim", order: 2 },
    { role: "assistente", title: "Responder mensagens WhatsApp pendentes", order: 3 },
    { role: "assistente", title: "Atualizar cadastros de contatos incompletos", order: 4 },
  ]);
}

// ─── DAILY ROUTINES ───────────────────────────────────────────────────────────
export async function getDailyRoutine(userId: number, date: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dailyRoutines)
    .where(and(eq(dailyRoutines.userId, userId), eq(dailyRoutines.date, date)))
    .limit(1);
  return result[0];
}
export async function upsertDailyRoutine(userId: number, date: string, completedItems: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(dailyRoutines).values({ userId, date, completedItems })
    .onDuplicateKeyUpdate({ set: { completedItems, updatedAt: new Date() } });
}

// ─// ─── STUDIO CONFLICT CHECK ────────────────────────────────────────────────
export async function checkStudioConflict(startAt: Date, endAt: Date, studio?: string, excludeId?: number) {
  const db = await getDb();
  if (!db) return { hasConflict: false, conflictingBooking: null };
  const conditions: ReturnType<typeof sql>[] = [
    sql`${studioBookings.status} NOT IN ('cancelled')`,
    sql`${studioBookings.startAt} < ${endAt.toISOString()}`,
    sql`${studioBookings.endAt} > ${startAt.toISOString()}`,
  ];
  if (studio) conditions.push(sql`${studioBookings.studio} = ${studio}`);
  if (excludeId) conditions.push(sql`${studioBookings.id} != ${excludeId}`);
  const results = await db.select().from(studioBookings).where(and(...conditions)).limit(1);
  return { hasConflict: results.length > 0, conflictingBooking: results[0] ?? null };
}

// ─── PODCASTS ─────────────────────────────────────────────────────────────────
export async function getPodcasts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(podcasts).orderBy(desc(podcasts.createdAt));
}

export async function getPodcastById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(podcasts).where(eq(podcasts.id, id)).limit(1);
  return result[0];
}

export async function createPodcast(data: InsertPodcast) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(podcasts).values(data);
  return result;
}

export async function updatePodcast(id: number, data: Partial<InsertPodcast>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(podcasts).set({ ...data, updatedAt: new Date() }).where(eq(podcasts.id, id));
}

export async function deletePodcast(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(episodes).where(eq(episodes.podcastId, id));
  await db.delete(podcasts).where(eq(podcasts.id, id));
}

// ─── EPISODES ─────────────────────────────────────────────────────────────────
export async function getEpisodesByPodcast(podcastId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(episodes).where(eq(episodes.podcastId, podcastId)).orderBy(desc(episodes.createdAt));
}

export async function getEpisodeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(episodes).where(eq(episodes.id, id)).limit(1);
  return result[0];
}

export async function createEpisode(data: InsertEpisode) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(episodes).values(data);
  return result;
}

export async function updateEpisode(id: number, data: Partial<InsertEpisode>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(episodes).set({ ...data, updatedAt: new Date() }).where(eq(episodes.id, id));
}

export async function deleteEpisode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(episodeComments).where(eq(episodeComments.episodeId, id));
  await db.delete(episodes).where(eq(episodes.id, id));
}

// ─── EPISODE COMMENTS ─────────────────────────────────────────────────────────
export async function getEpisodeComments(episodeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(episodeComments).where(eq(episodeComments.episodeId, episodeId)).orderBy(episodeComments.createdAt);
}

export async function createEpisodeComment(data: InsertEpisodeComment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(episodeComments).values(data);
  return result;
}

// ─── BRAND SETTINGS ──────────────────────────────────────────────────────────
export async function getBrandSettings() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(brandSettings).limit(1);
  return rows[0] ?? null;
}

export async function upsertBrandSettings(data: Partial<InsertBrandSettings>) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getBrandSettings();
  if (existing) {
    await db.update(brandSettings).set(data).where(eq(brandSettings.id, existing.id));
    return (await db.select().from(brandSettings).where(eq(brandSettings.id, existing.id)))[0];
  } else {
    await db.insert(brandSettings).values({ companyName: "Pátio Estúdio", ...data });
    return getBrandSettings();
  }
}

// ─── PORTAL MAGIC LINKS ───────────────────────────────────────────────────────
export async function createPortalMagicLink(contactId: number, email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.insert(portalMagicLinks).values({ token, contactId, email, expiresAt });
  return token;
}

export async function validatePortalMagicLink(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(portalMagicLinks).where(eq(portalMagicLinks.token, token)).limit(1);
  const link = rows[0];
  if (!link) return null;
  if (link.usedAt) return null; // already used
  if (link.expiresAt < new Date()) return null; // expired
  // Mark as used
  await db.update(portalMagicLinks).set({ usedAt: new Date() }).where(eq(portalMagicLinks.id, link.id));
  return link;
}

export async function getPortalDataForContact(contactId: number) {
  const db = await getDb();
  if (!db) return { contact: null, contracts: [], invoices: [], quotes: [], projects: [], podcasts: [] };
  const [contact, contractsList, invoicesList, quotesList, projectsList, podcastsList] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1),
    db.select().from(contracts).where(eq(contracts.contactId, contactId)).orderBy(desc(contracts.createdAt)),
    db.select().from(invoices).where(eq(invoices.contactId, contactId)).orderBy(desc(invoices.createdAt)),
    db.select().from(quotes).where(eq(quotes.contactId, contactId)).orderBy(desc(quotes.createdAt)),
    db.select().from(projects).where(eq(projects.contactId, contactId)).orderBy(desc(projects.createdAt)),
    db.select().from(podcasts).where(eq(podcasts.contactId, contactId)).orderBy(desc(podcasts.createdAt)),
  ]);
  return {
    contact: contact[0] ?? null,
    contracts: contractsList,
    invoices: invoicesList,
    quotes: quotesList,
    projects: projectsList,
    podcasts: podcastsList,
  };
}

// ─── AUTOMATION SEQUENCES ─────────────────────────────────────────────────────
export async function getAutomationSequences() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(automationSequences).orderBy(desc(automationSequences.createdAt));
}

export async function getAutomationSequenceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(automationSequences).where(eq(automationSequences.id, id)).limit(1);
  return result[0];
}

export async function createAutomationSequence(data: InsertAutomationSequence) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(automationSequences).values(data);
  return result;
}

export async function updateAutomationSequence(id: number, data: Partial<InsertAutomationSequence>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(automationSequences).set({ ...data, updatedAt: new Date() }).where(eq(automationSequences.id, id));
}

export async function deleteAutomationSequence(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(automationSteps).where(eq(automationSteps.sequenceId, id));
  await db.delete(automationSequences).where(eq(automationSequences.id, id));
}

// ─── AUTOMATION STEPS ─────────────────────────────────────────────────────────
export async function getAutomationSteps(sequenceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(automationSteps)
    .where(eq(automationSteps.sequenceId, sequenceId))
    .orderBy(automationSteps.stepOrder);
}

export async function createAutomationStep(data: InsertAutomationStep) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(automationSteps).values(data);
  return result;
}

export async function updateAutomationStep(id: number, data: Partial<InsertAutomationStep>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(automationSteps).set(data).where(eq(automationSteps.id, id));
}

export async function deleteAutomationStep(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(automationSteps).where(eq(automationSteps.id, id));
}

// ─── AUTOMATION EXECUTIONS ────────────────────────────────────────────────────
export async function getAutomationExecutions(filters?: { contactId?: number; sequenceId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.contactId) conditions.push(eq(automationExecutions.contactId, filters.contactId));
  if (filters?.sequenceId) conditions.push(eq(automationExecutions.sequenceId, filters.sequenceId));
  if (filters?.status) conditions.push(eq(automationExecutions.status, filters.status as "pending" | "sent" | "failed" | "skipped"));
  const query = db.select().from(automationExecutions).orderBy(desc(automationExecutions.scheduledAt));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function createAutomationExecution(data: InsertAutomationExecution) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(automationExecutions).values(data);
  return result;
}

export async function updateAutomationExecution(id: number, data: Partial<InsertAutomationExecution>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(automationExecutions).set(data).where(eq(automationExecutions.id, id));
}

export async function scheduleAutomationForLead(leadId: number, contactId: number, triggerStage: string) {
  const db = await getDb();
  if (!db) return;
  // Find active sequences for this stage
  const sequences = await db.select().from(automationSequences)
    .where(and(eq(automationSequences.triggerStage, triggerStage), eq(automationSequences.isActive, true)));
  for (const seq of sequences) {
    const steps = await db.select().from(automationSteps)
      .where(eq(automationSteps.sequenceId, seq.id))
      .orderBy(automationSteps.stepOrder);
    for (const step of steps) {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + step.delayDays);
      await db.insert(automationExecutions).values({
        sequenceId: seq.id,
        stepId: step.id,
        contactId,
        leadId,
        status: "pending",
        scheduledAt,
      });
    }
  }
}

// ─── MESSAGE TEMPLATES ────────────────────────────────────────────────────────
export async function getMessageTemplates(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(messageTemplates)
      .where(eq(messageTemplates.category, category))
      .orderBy(desc(messageTemplates.createdAt));
  }
  return db.select().from(messageTemplates).orderBy(desc(messageTemplates.createdAt));
}

export async function createMessageTemplate(data: InsertMessageTemplate) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(messageTemplates).values(data);
  return result;
}

export async function updateMessageTemplate(id: number, data: Partial<InsertMessageTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(messageTemplates).set({ ...data, updatedAt: new Date() }).where(eq(messageTemplates.id, id));
}

export async function deleteMessageTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
}

// ─── STUDIO ROOMS ─────────────────────────────────────────────────────────────
export async function getStudioRooms() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studioRooms).where(eq(studioRooms.isActive, true)).orderBy(studioRooms.name);
}

export async function getStudioRoomById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(studioRooms).where(eq(studioRooms.id, id)).limit(1);
  return result[0];
}

export async function createStudioRoom(data: InsertStudioRoom) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(studioRooms).values(data);
  return result;
}

export async function updateStudioRoom(id: number, data: Partial<InsertStudioRoom>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(studioRooms).set({ ...data, updatedAt: new Date() }).where(eq(studioRooms.id, id));
}

export async function deleteStudioRoom(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(studioRooms).set({ isActive: false, updatedAt: new Date() }).where(eq(studioRooms.id, id));
}

export async function seedDefaultStudioRooms() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(studioRooms).limit(1);
  if (existing.length > 0) return;
  await db.insert(studioRooms).values([
    { name: "Estúdio A", description: "Sala principal de gravação", color: "#6366f1", capacity: 4 },
    { name: "Estúdio B", description: "Sala de podcast e locução", color: "#10b981", capacity: 2 },
    { name: "Sala de Edição", description: "Pós-produção e mixagem", color: "#f59e0b", capacity: 3 },
  ]);
}

// ─── EQUIPMENT ────────────────────────────────────────────────────────────────
export async function getEquipment(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(equipment).where(eq(equipment.category, category as any)).orderBy(equipment.name);
  }
  return db.select().from(equipment).orderBy(equipment.name);
}

export async function getEquipmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
  return result[0];
}

export async function createEquipment(data: InsertEquipment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(equipment).values(data);
  return result;
}

export async function updateEquipment(id: number, data: Partial<InsertEquipment>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(equipment).set({ ...data, updatedAt: new Date() }).where(eq(equipment.id, id));
}

export async function deleteEquipment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(equipment).where(eq(equipment.id, id));
}

// ─── EQUIPMENT BOOKINGS ───────────────────────────────────────────────────────
export async function getEquipmentBookingsByStudioBooking(studioBookingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(equipmentBookings).where(eq(equipmentBookings.studioBookingId, studioBookingId));
}

export async function createEquipmentBooking(data: InsertEquipmentBooking) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(equipmentBookings).values(data);
  return result;
}

export async function deleteEquipmentBookingsByStudioBooking(studioBookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(equipmentBookings).where(eq(equipmentBookings.studioBookingId, studioBookingId));
}

export async function getEquipmentOccupancyReport() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: equipment.id,
      name: equipment.name,
      category: equipment.category,
      status: equipment.status,
      totalBookings: sql<number>`COUNT(${equipmentBookings.id})`,
    })
    .from(equipment)
    .leftJoin(equipmentBookings, eq(equipment.id, equipmentBookings.equipmentId))
    .groupBy(equipment.id, equipment.name, equipment.category, equipment.status)
    .orderBy(equipment.name);
  return result;
}

export async function getRoomOccupancyReport() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: studioRooms.id,
      name: studioRooms.name,
      color: studioRooms.color,
      totalBookings: sql<number>`COUNT(${studioBookings.id})`,
    })
    .from(studioRooms)
    .leftJoin(studioBookings, eq(studioRooms.id, studioBookings.roomId))
    .groupBy(studioRooms.id, studioRooms.name, studioRooms.color)
    .orderBy(studioRooms.name);
  return result;
}

// ─── SPRINT A: FECHAMENTO FINANCEIRO CRÍTICO ──────────────────────────────────

/** US-049: Gera fatura de entrada (50% do valor) ao criar agendamento com valor */
export async function createEntryInvoiceForBooking(bookingId: number, booking: {
  contactId?: number | null;
  title: string;
  value: string | number;
  assignedUserId?: number | null;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const entryValue = (Number(booking.value) * 0.5).toFixed(2);
  const number = `FAT-${Date.now()}-E`;
  const [result] = await db.insert(invoices).values({
    number,
    contactId: booking.contactId ?? undefined,
    bookingId,
    assignedUserId: booking.assignedUserId ?? undefined,
    status: "draft",
    items: [{ description: `Entrada 50% — ${booking.title}`, quantity: 1, unitPrice: Number(entryValue), total: Number(entryValue) }],
    subtotal: entryValue,
    tax: "0",
    total: entryValue,
    currency: "BRL",
    paymentPlan: "installment_50_50",
    installmentNumber: 1,
    notes: `Fatura de entrada gerada automaticamente para o agendamento #${bookingId}`,
  });
  const invoiceId = (result as any).insertId as number;
  await db.update(studioBookings)
    .set({ entryInvoiceId: invoiceId, paymentStatus: "pending_payment", updatedAt: new Date() })
    .where(eq(studioBookings.id, bookingId));
  return invoiceId;
}

/** US-049: Confirma pagamento da entrada e libera o agendamento */
export async function confirmBookingEntryPayment(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(studioBookings)
    .set({ paymentStatus: "paid", updatedAt: new Date() })
    .where(eq(studioBookings.id, bookingId));
  const [booking] = await db.select({ entryInvoiceId: studioBookings.entryInvoiceId })
    .from(studioBookings).where(eq(studioBookings.id, bookingId)).limit(1);
  if (booking?.entryInvoiceId) {
    await db.update(invoices)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(eq(invoices.id, booking.entryInvoiceId));
  }
}

/** US-049: Dispensa o pagamento da entrada */
export async function waiveBookingEntryPayment(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(studioBookings)
    .set({ paymentStatus: "waived", updatedAt: new Date() })
    .where(eq(studioBookings.id, bookingId));
}

/** US-043: Ao assinar contrato, gera fatura automaticamente */
export async function autoGenerateInvoicesOnContractSign(contractId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
  if (!contract || !contract.value) return [];
  const total = Number(contract.value);
  const createdIds: number[] = [];
  const number = `FAT-${Date.now()}-C`;
  const [r1] = await db.insert(invoices).values({
    number,
    contactId: contract.contactId ?? undefined,
    contractId,
    assignedUserId: contract.assignedUserId ?? undefined,
    status: "sent",
    items: [{ description: contract.title, quantity: 1, unitPrice: total, total }],
    subtotal: total.toFixed(2),
    tax: "0",
    total: total.toFixed(2),
    currency: "BRL",
    paymentPlan: "full",
    installmentNumber: 1,
    notes: `Fatura gerada automaticamente ao assinar contrato #${contractId}`,
  });
  createdIds.push((r1 as any).insertId as number);
  return createdIds;
}

/** US-050: Busca agendamentos nas próximas 48h com pagamento pendente */
export async function getBookingsWithPendingPaymentIn48h() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  return db
    .select({
      id: studioBookings.id,
      title: studioBookings.title,
      startAt: studioBookings.startAt,
      value: studioBookings.value,
      paymentStatus: studioBookings.paymentStatus,
      entryInvoiceId: studioBookings.entryInvoiceId,
      reminderSentAt: studioBookings.reminderSentAt,
      contactId: studioBookings.contactId,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      contactWhatsappJid: contacts.whatsappJid,
    })
    .from(studioBookings)
    .leftJoin(contacts, eq(studioBookings.contactId, contacts.id))
    .where(
      and(
        eq(studioBookings.paymentStatus, "pending_payment"),
        sql`${studioBookings.startAt} >= ${now}`,
        sql`${studioBookings.startAt} <= ${in48h}`,
        sql`${studioBookings.reminderSentAt} IS NULL`
      )
    );
}

/** US-050: Marca lembrete como enviado */
export async function markBookingReminderSent(bookingId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(studioBookings)
    .set({ reminderSentAt: new Date(), updatedAt: new Date() })
    .where(eq(studioBookings.id, bookingId));
}

/** US-019: Atualiza status de assinatura Stripe no contato */
export async function updateContactSubscription(contactId: number, data: {
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "cancelled" | "past_due" | "trialing" | "none";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contacts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(contacts.id, contactId));
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export async function createNotification(data: InsertNotification): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getNotifications(userId: number): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result[0]?.count ?? 0);
}

export async function markNotificationRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

// ─── DASHBOARD ACTION ITEMS ───────────────────────────────────────────────────
export async function getDashboardActionItems() {
  const db = await getDb();
  if (!db) return { staleLeads: [], overdueInvoices: [], unpaidBookings: [] };

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const now = new Date();

  // Leads parados há mais de 7 dias sem atualização
  const staleLeads = await db.select({
    id: leads.id,
    title: leads.title,
    value: leads.value,
    updatedAt: leads.updatedAt,
  }).from(leads)
    .where(and(
      eq(leads.status, "open"),
      sql`${leads.updatedAt} < ${sevenDaysAgo}`
    ))
    .orderBy(leads.updatedAt)
    .limit(5);

  // Faturas vencendo em 48h ou já vencidas
  const overdueInvoices = await db.select({
    id: invoices.id,
    number: invoices.number,
    total: invoices.total,
    dueDate: invoices.dueDate,
    status: invoices.status,
  }).from(invoices)
    .where(and(
      sql`${invoices.status} IN ('sent', 'overdue')`,
      sql`${invoices.dueDate} IS NOT NULL`,
      sql`${invoices.dueDate} <= ${in48h}`
    ))
    .orderBy(invoices.dueDate)
    .limit(5);

  // Agendamentos com pagamento pendente
  const unpaidBookings = await db.select({
    id: studioBookings.id,
    title: studioBookings.title,
    startAt: studioBookings.startAt,
    value: studioBookings.value,
    paymentStatus: studioBookings.paymentStatus,
  }).from(studioBookings)
    .where(and(
      eq(studioBookings.paymentStatus, "pending_payment"),
      sql`${studioBookings.startAt} >= ${now}`
    ))
    .orderBy(studioBookings.startAt)
    .limit(5);

  return { staleLeads, overdueInvoices, unpaidBookings };
}

export async function getDashboardKpis() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  // Receita do mês atual
  const [revenueThis] = await db.select({
    total: sql<number>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL(12,2))), 0)`
  }).from(invoices).where(and(
    eq(invoices.status, "paid"),
    sql`${invoices.paidAt} >= ${startOfMonth}`
  ));

  // Receita do mês anterior
  const [revenueLast] = await db.select({
    total: sql<number>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL(12,2))), 0)`
  }).from(invoices).where(and(
    eq(invoices.status, "paid"),
    sql`${invoices.paidAt} >= ${startOfLastMonth}`,
    sql`${invoices.paidAt} <= ${endOfLastMonth}`
  ));

  // Leads ativos
  const [activeLeads] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(leads).where(eq(leads.status, "open"));

  // Taxa de conversão (leads ganhos / total)
  const [totalLeads] = await db.select({ count: sql<number>`COUNT(*)` }).from(leads);
  const [wonLeads] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(leads).where(eq(leads.status, "won"));

  // Sessões da semana
  const [weekSessions] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(studioBookings).where(sql`${studioBookings.startAt} >= ${startOfWeek}`);

  const revenueThisMonth = Number(revenueThis?.total ?? 0);
  const revenueLastMonth = Number(revenueLast?.total ?? 0);
  const revenueChange = revenueLastMonth > 0
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
    : 0;

  const totalLeadsCount = Number(totalLeads?.count ?? 0);
  const wonLeadsCount = Number(wonLeads?.count ?? 0);
  const conversionRate = totalLeadsCount > 0
    ? Math.round((wonLeadsCount / totalLeadsCount) * 100)
    : 0;

  return {
    revenueThisMonth,
    revenueLastMonth,
    revenueChange: Math.round(revenueChange * 10) / 10,
    activeLeads: Number(activeLeads?.count ?? 0),
    conversionRate,
    weekSessions: Number(weekSessions?.count ?? 0),
  };
}

// ─── THEORY OF CONSTRAINTS ────────────────────────────────────────────────────
export async function getTocConfig() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tocConfigs).limit(1);
  return result[0] ?? null;
}

export async function upsertTocConfig(data: Partial<InsertTocConfig>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(tocConfigs).limit(1);
  if (existing.length > 0) {
    await db.update(tocConfigs).set({ ...data, updatedAt: new Date() }).where(eq(tocConfigs.id, existing[0].id));
    return existing[0].id;
  } else {
    const [result] = await db.insert(tocConfigs).values({
      businessContext: data.businessContext ?? null,
      domains: data.domains ?? '["comercial","financeiro","producao","pessoas","tecnologia"]',
      weeklyDay: data.weeklyDay ?? "monday",
      weeklyTime: data.weeklyTime ?? "08:00",
      autoGenerate: data.autoGenerate ?? true,
    });
    return (result as { insertId: number }).insertId;
  }
}

export async function getTocSessions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tocSessions).orderBy(desc(tocSessions.weekDate));
}

export async function getTocSessionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tocSessions).where(eq(tocSessions.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createTocSession(data: InsertTocSession) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(tocSessions).values(data);
  return (result as { insertId: number }).insertId;
}

export async function updateTocSession(id: number, data: Partial<InsertTocSession>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tocSessions).set({ ...data, updatedAt: new Date() }).where(eq(tocSessions.id, id));
}

export async function deleteTocSession(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(tocActionItems).where(eq(tocActionItems.sessionId, id));
  await db.delete(tocConstraints).where(eq(tocConstraints.sessionId, id));
  await db.delete(tocSessions).where(eq(tocSessions.id, id));
}

export async function getTocConstraints(sessionId?: number, domain?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (sessionId) conditions.push(eq(tocConstraints.sessionId, sessionId));
  if (domain) conditions.push(eq(tocConstraints.domain, domain));
  const query = db.select().from(tocConstraints).orderBy(desc(tocConstraints.createdAt));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function createTocConstraint(data: InsertTocConstraint) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(tocConstraints).values(data);
  return (result as { insertId: number }).insertId;
}

export async function updateTocConstraint(id: number, data: Partial<InsertTocConstraint>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tocConstraints).set({ ...data, updatedAt: new Date() }).where(eq(tocConstraints.id, id));
}

export async function deleteTocConstraint(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(tocActionItems).where(eq(tocActionItems.constraintId, id));
  await db.delete(tocConstraints).where(eq(tocConstraints.id, id));
}

export async function getTocActionItems(constraintId?: number, sessionId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (constraintId) conditions.push(eq(tocActionItems.constraintId, constraintId));
  if (sessionId) conditions.push(eq(tocActionItems.sessionId, sessionId));
  const query = db.select().from(tocActionItems).orderBy(desc(tocActionItems.createdAt));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function createTocActionItem(data: InsertTocActionItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(tocActionItems).values(data);
  return (result as { insertId: number }).insertId;
}

export async function updateTocActionItem(id: number, data: Partial<InsertTocActionItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tocActionItems).set({ ...data, updatedAt: new Date() }).where(eq(tocActionItems.id, id));
}

export async function deleteTocActionItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(tocActionItems).where(eq(tocActionItems.id, id));
}

export async function getTocDashboard() {
  const db = await getDb();
  if (!db) return { activeConstraints: 0, criticalConstraints: 0, pendingActions: 0, latestSession: null, constraintsByDomain: [] };
  const [activeResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tocConstraints)
    .where(eq(tocConstraints.status, "active"));
  const [criticalResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tocConstraints)
    .where(and(eq(tocConstraints.severity, "critical"), eq(tocConstraints.status, "active")));
  const [pendingResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tocActionItems)
    .where(eq(tocActionItems.status, "pending"));
  const sessions = await db.select().from(tocSessions).orderBy(desc(tocSessions.weekDate)).limit(1);
  const domainStats = await db
    .select({ domain: tocConstraints.domain, count: sql<number>`COUNT(*)` })
    .from(tocConstraints)
    .where(eq(tocConstraints.status, "active"))
    .groupBy(tocConstraints.domain);
  return {
    activeConstraints: Number(activeResult?.count ?? 0),
    criticalConstraints: Number(criticalResult?.count ?? 0),
    pendingActions: Number(pendingResult?.count ?? 0),
    latestSession: sessions[0] ?? null,
    constraintsByDomain: domainStats,
  };
}

// ─── WHATSAPP AI ANALYSIS ─────────────────────────────────────────────────────
export async function getWhatsappAnalysisList() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whatsappAnalysis).orderBy(desc(whatsappAnalysis.analyzedAt));
}

export async function getWhatsappAnalysisByChatId(chatId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(whatsappAnalysis).where(eq(whatsappAnalysis.chatId, chatId)).limit(1);
  return result[0];
}

export async function upsertWhatsappAnalysis(data: InsertWhatsappAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(whatsappAnalysis).where(eq(whatsappAnalysis.chatId, data.chatId)).limit(1);
  if (existing.length > 0) {
    await db.update(whatsappAnalysis).set({ ...data, updatedAt: new Date() }).where(eq(whatsappAnalysis.chatId, data.chatId));
    return existing[0].id;
  }
  const [result] = await db.insert(whatsappAnalysis).values(data);
  return (result as { insertId: number }).insertId;
}

export async function deleteWhatsappAnalysis(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(whatsappAnalysis).where(eq(whatsappAnalysis.id, id));
}

// ─── NPS RESPONSES ────────────────────────────────────────────────────────────
export async function getNpsResponses(contactId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (contactId) {
    return db.select().from(npsResponses).where(eq(npsResponses.contactId, contactId)).orderBy(desc(npsResponses.sentAt));
  }
  return db.select().from(npsResponses).orderBy(desc(npsResponses.sentAt));
}

export async function createNpsResponse(data: InsertNpsResponse) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(npsResponses).values(data);
  return (result as { insertId: number }).insertId;
}

export async function updateNpsResponse(id: number, data: Partial<InsertNpsResponse>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(npsResponses).set(data).where(eq(npsResponses.id, id));
}

export async function getNpsStats() {
  const db = await getDb();
  if (!db) return { total: 0, responded: 0, promoters: 0, passives: 0, detractors: 0, npsScore: 0, avgScore: 0 };
  const all = await db.select().from(npsResponses).where(sql`score IS NOT NULL`);
  const total = all.length;
  if (total === 0) return { total: 0, responded: 0, promoters: 0, passives: 0, detractors: 0, npsScore: 0, avgScore: 0 };
  const promoters = all.filter(r => (r.score ?? 0) >= 9).length;
  const passives = all.filter(r => (r.score ?? 0) >= 7 && (r.score ?? 0) <= 8).length;
  const detractors = all.filter(r => (r.score ?? 0) <= 6).length;
  const npsScore = Math.round(((promoters - detractors) / total) * 100);
  const avgScore = Math.round((all.reduce((s, r) => s + (r.score ?? 0), 0) / total) * 10) / 10;
  return { total, responded: total, promoters, passives, detractors, npsScore, avgScore };
}

// ─── TIME ENTRIES (Sprint E — US-029) ─────────────────────────────────────────
export async function getTimeEntries(filters?: { contactId?: number; projectId?: number; userId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.contactId) conditions.push(eq(timeEntries.contactId, filters.contactId));
  if (filters?.projectId) conditions.push(eq(timeEntries.projectId, filters.projectId));
  if (filters?.userId) conditions.push(eq(timeEntries.userId, filters.userId));
  const q = db.select().from(timeEntries).orderBy(desc(timeEntries.date));
  return conditions.length > 0 ? q.where(and(...conditions)) : q;
}
export async function createTimeEntry(data: InsertTimeEntry) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(timeEntries).values(data);
  return (result as { insertId: number }).insertId;
}
export async function updateTimeEntry(id: number, data: Partial<InsertTimeEntry>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(timeEntries).set({ ...data, updatedAt: new Date() }).where(eq(timeEntries.id, id));
}
export async function deleteTimeEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(timeEntries).where(eq(timeEntries.id, id));
}
export async function getTimeEntrySummary(contactId?: number) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select({
    contactId: timeEntries.contactId,
    projectId: timeEntries.projectId,
    totalMinutes: sql<number>`SUM(${timeEntries.minutes})`,
    totalEntries: sql<number>`COUNT(*)`,
  }).from(timeEntries).groupBy(timeEntries.contactId, timeEntries.projectId);
  if (contactId) return q.where(eq(timeEntries.contactId, contactId));
  return q;
}

// ─── EXPORT HELPERS (Sprint E — US-032) ───────────────────────────────────────
export async function exportContactsData() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contacts).orderBy(desc(contacts.createdAt));
}
export async function exportInvoicesData() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).orderBy(desc(invoices.createdAt));
}
export async function exportQuotesData() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotes).orderBy(desc(quotes.createdAt));
}
export async function exportContractsData() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contracts).orderBy(desc(contracts.createdAt));
}

// ─── WHATSAPP CONVERSATION REPORT (Sprint E — US-031) ─────────────────────────
export async function getWhatsappConversationReport() {
  const db = await getDb();
  if (!db) return { totalChats: 0, totalMessages: 0, avgMessagesPerChat: 0, topChats: [] };
  const [chatCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(whatsappChats);
  const [msgCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(whatsappMessages);
  const topChats = await db.select({
    chatJid: whatsappMessages.chatJid,
    messageCount: sql<number>`COUNT(*)`,
  }).from(whatsappMessages).groupBy(whatsappMessages.chatJid).orderBy(sql`COUNT(*) DESC`).limit(10);
  const total = Number(chatCount?.count ?? 0);
  const msgs = Number(msgCount?.count ?? 0);
  return {
    totalChats: total,
    totalMessages: msgs,
    avgMessagesPerChat: total > 0 ? Math.round(msgs / total) : 0,
    topChats,
  };
}

// ─── CONTRACT SIGNATURE (Sprint F — US-016) ───────────────────────────────────
export async function signContract(id: number, data: { signatureData: string; signerName: string; signerEmail?: string; signerIp?: string; signerUserAgent?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const hash = (await import("crypto")).createHash("sha256").update(JSON.stringify(data)).digest("hex");
  // BUG-01 FIX: Buscar leadId do contrato ANTES de assinar para marcar como won
  const [contractRow] = await db.select({ leadId: contracts.leadId }).from(contracts).where(eq(contracts.id, id)).limit(1);
  await db.update(contracts).set({
    status: "signed",
    signedAt: new Date(),
    signerName: data.signerName,
    signerEmail: data.signerEmail,
    signatureUrl: `data:signature;hash=${hash}`,
    updatedAt: new Date(),
  }).where(eq(contracts.id, id));
  // BUG-01 FIX: Marcar lead vinculado como "won" ao assinar contrato
  if (contractRow?.leadId) {
    await db.update(leads).set({ status: "won", updatedAt: new Date() }).where(eq(leads.id, contractRow.leadId));
    console.log(`[signContract] ✅ Lead #${contractRow.leadId} marcado como WON (contrato #${id} assinado)`);
  }
  return hash;
}

// ─── PLAYBOOK — AÇÃO 1: Auto-criação de lead via webhook Z-API ────────────────

export async function getOpenLeadByContact(contactId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(leads)
    .where(and(eq(leads.contactId, contactId), eq(leads.status, "open")))
    .orderBy(desc(leads.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function autoCreateLeadFromWhatsapp(data: {
  jid: string;
  name?: string;
  phone: string;
  firstMessage?: string;
}): Promise<{ contactId: number; leadId: number } | null> {
  const db = await getDb();
  if (!db) return null;

  const allContacts = await db
    .select({ id: contacts.id, phone: contacts.phone })
    .from(contacts)
    .where(sql`phone IS NOT NULL`);
  const pp = data.phone.replace(/\D/g, "");
  const existing = allContacts.find(c => {
    const cp = (c.phone ?? "").replace(/\D/g, "");
    return cp === pp || cp.endsWith(pp.slice(-11)) || pp.endsWith(cp.slice(-11));
  });

  let contactId: number;
  if (existing) {
    contactId = existing.id;
    await db.update(whatsappChats).set({ contactId }).where(eq(whatsappChats.jid, data.jid));
  } else {
    const [res] = await db.insert(contacts).values({
      name: data.name ?? data.phone,
      phone: data.phone,
      whatsappJid: data.jid,
      source: "whatsapp",
    });
    contactId = (res as any).insertId as number;
    await db.update(whatsappChats).set({ contactId }).where(eq(whatsappChats.jid, data.jid));
  }

  const openLead = await getOpenLeadByContact(contactId);
  if (openLead) return { contactId, leadId: openLead.id };

  const stages = await db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.isDefault, true))
    .limit(1);
  const stageId = stages[0]?.id;

  const [leadRes] = await db.insert(leads).values({
    title: `Lead WhatsApp — ${data.name ?? data.phone}`,
    contactId,
    stageId,
    status: "open",
    notes: data.firstMessage ? `Primeira mensagem: "${data.firstMessage}"` : "Lead criado automaticamente via WhatsApp.",
    tags: ["whatsapp", "auto"],
  });
  const leadId = (leadRes as any).insertId as number;
  return { contactId, leadId };
}

// ─── PLAYBOOK — AÇÃO 2: Encadeamento ao assinar contrato ─────────────────────

export async function createEntryInvoiceOnSign(contractId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
  if (!contract || !contract.value) return null;
  // BUG-06 FIX: Verificar se já existe fatura de entrada para evitar duplicatas
  const existingEntry = await db.select({ id: invoices.id }).from(invoices)
    .where(and(eq(invoices.contractId, contractId), sql`${invoices.notes} LIKE ${'%Fatura de entrada%'}`)).limit(1);
  if (existingEntry.length > 0) {
    console.log(`[createEntryInvoiceOnSign] Fatura de entrada já existe para contrato #${contractId} (id: ${existingEntry[0].id})`);
    return existingEntry[0].id;
  }
  const total = Number(contract.value);
  const entry = total * 0.5;
  const number = `FAT-${Date.now()}-ENTRADA`;
  const [res] = await db.insert(invoices).values({
    number,
    contactId: contract.contactId ?? undefined,
    contractId,
    assignedUserId: contract.assignedUserId ?? undefined,
    status: "sent",
    items: [{ description: `Entrada — ${contract.title}`, quantity: 1, unitPrice: entry, total: entry }],
    subtotal: entry.toFixed(2),
    tax: "0",
    total: entry.toFixed(2),
    currency: "BRL",
    paymentPlan: "installment_50_50",
    installmentNumber: 1,
    notes: `Fatura de entrada (50%) gerada automaticamente ao assinar contrato #${contractId}`,
  });
  return (res as any).insertId as number;
}

export async function createProjectOnContractSign(contractId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
  if (!contract) return null;
  const existing = await db.select({ id: projects.id }).from(projects)
    .where(sql`notes LIKE ${`%contrato #${contractId}%`}`).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [res] = await db.insert(projects).values({
    name: contract.title,
    contactId: contract.contactId ?? undefined,
    status: "briefing",
    type: "podcast",
    totalValue: contract.value ?? undefined,
    assignedTo: contract.assignedUserId ?? undefined,
    notes: `Projeto criado automaticamente ao assinar contrato #${contractId}`,
  });
  return (res as any).insertId as number;
}

// ─── PLAYBOOK — AÇÃO 3: Crons de follow-up e renovação ───────────────────────

export async function getLeadsWithoutInteraction48h() {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  return db
    .select({ id: leads.id, title: leads.title, contactId: leads.contactId, updatedAt: leads.updatedAt })
    .from(leads)
    .where(and(eq(leads.status, "open"), sql`${leads.updatedAt} < ${cutoff}`))
    .orderBy(leads.updatedAt)
    .limit(50);
}

export async function getContractsExpiringIn30Days() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return db
    .select({ id: contracts.id, title: contracts.title, contactId: contracts.contactId, validUntil: contracts.validUntil, value: contracts.value })
    .from(contracts)
    .where(and(
      eq(contracts.status, "signed"),
      sql`${contracts.validUntil} IS NOT NULL`,
      sql`${contracts.validUntil} >= ${now}`,
      sql`${contracts.validUntil} <= ${in30}`
    ))
    .orderBy(contracts.validUntil)
    .limit(50);
}

export async function createRenewalLead(contractId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
  if (!contract) return null;
  const existing = await db.select({ id: leads.id }).from(leads)
    .where(sql`notes LIKE ${`%renovação do contrato #${contractId}%`}`).limit(1);
  if (existing.length > 0) return existing[0].id;
  const stages = await db.select().from(pipelineStages).where(eq(pipelineStages.isDefault, true)).limit(1);
  const stageId = stages[0]?.id;
  const [res] = await db.insert(leads).values({
    title: `Renovação — ${contract.title}`,
    contactId: contract.contactId ?? undefined,
    stageId,
    status: "open",
    value: contract.value ?? undefined,
    notes: `Lead de renovação criado automaticamente para o contrato #${contractId} que vence em ${contract.validUntil ? new Date(contract.validUntil).toLocaleDateString("pt-BR") : "breve"}.`,
    tags: ["renovação", "auto"],
  });
  return (res as any).insertId as number;
}

// ─── LEAD ACTIVITIES (Sprint Funil) ──────────────────────────────────────────
export async function createLeadActivity(data: InsertLeadActivity) {
  const db = await getDb();
  if (!db) return;
  await db.insert(leadActivities).values(data);
}

export async function getLeadActivities(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadActivities)
    .where(eq(leadActivities.leadId, leadId))
    .orderBy(desc(leadActivities.createdAt));
}

// ─── LEAD SCORING ─────────────────────────────────────────────────────────────
export function computeLeadScore(lead: {
  contactId?: number | null;
  value?: string | null;
  probability?: number | null;
  updatedAt?: Date | null;
  expectedCloseDate?: Date | null;
}): number {
  let score = 0;
  if (lead.contactId) score += 20;
  if (lead.value && Number(lead.value) > 0) score += 20;
  if (lead.probability && lead.probability > 50) score += 20;
  if (lead.updatedAt) {
    const daysSince = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 3) score += 20;
  }
  if (lead.expectedCloseDate) score += 20;
  return score;
}

// ─── PIPELINE FORECAST ────────────────────────────────────────────────────────
export async function getPipelineForecast() {
  const db = await getDb();
  if (!db) return { totalOpen: 0, weightedValue: 0, forecastThisMonth: 0 };
  const openLeads = await db.select().from(leads).where(eq(leads.status, "open"));
  let totalOpen = 0;
  let weightedValue = 0;
  let forecastThisMonth = 0;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  for (const lead of openLeads) {
    const val = Number(lead.value ?? 0);
    const prob = Number(lead.probability ?? 0) / 100;
    totalOpen += val;
    weightedValue += val * prob;
    if (lead.expectedCloseDate) {
      const closeDate = new Date(lead.expectedCloseDate);
      if (closeDate >= startOfMonth && closeDate <= endOfMonth) {
        forecastThisMonth += val * prob;
      }
    }
  }
  return { totalOpen, weightedValue, forecastThisMonth };
}

// ─── LEADS WITH CONTACT NAME (for list view) ─────────────────────────────────
export async function getLeadsWithContact(stageId?: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (stageId) conditions.push(eq(leads.stageId, stageId));
  if (status) conditions.push(eq(leads.status, status as "open" | "won" | "lost"));
  const query = db
    .select({
      id: leads.id,
      title: leads.title,
      contactId: leads.contactId,
      contactName: contacts.name,
      contactEmail: contacts.email,
      stageId: leads.stageId,
      assignedUserId: leads.assignedUserId,
      value: leads.value,
      currency: leads.currency,
      probability: leads.probability,
      expectedCloseDate: leads.expectedCloseDate,
      status: leads.status,
      notes: leads.notes,
      tags: leads.tags,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(contacts, eq(leads.contactId, contacts.id))
    .orderBy(desc(leads.createdAt));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

// ─── WHATSAPP — getLeadWithContact (alias for compatibility) ──────────────────
export async function getLeadWithContact(leadId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(leads)
    .leftJoin(contacts, eq(leads.contactId, contacts.id))
    .where(eq(leads.id, leadId))
    .limit(1);
  return result[0];
}
