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
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

export async function createUser(data: { name: string; email: string; role: "admin" | "gerente" | "analista" | "assistente"; whatsappAccess: boolean }) {
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
  return db.select().from(invoices).orderBy(desc(invoices.createdAt));
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
  return db.select().from(quotes).orderBy(desc(quotes.createdAt));
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
