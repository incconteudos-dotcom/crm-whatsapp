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
  await db.insert(whatsappChats).values(data).onDuplicateKeyUpdate({
    set: { name: data.name, lastMessageAt: data.lastMessageAt, lastMessagePreview: data.lastMessagePreview, unreadCount: data.unreadCount, updatedAt: new Date() },
  });
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
