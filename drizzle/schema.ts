import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── USERS ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "gerente", "analista", "assistente"]).default("assistente").notNull(),
  status: mysqlEnum("status", ["pending", "active", "rejected"]).default("pending").notNull(),
  whatsappAccess: boolean("whatsappAccess").default(false).notNull(),
  avatarUrl: text("avatarUrl"),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── CONTACTS ────────────────────────────────────────────────────────────────
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  whatsappJid: varchar("whatsappJid", { length: 128 }),
  company: varchar("company", { length: 255 }),
  position: varchar("position", { length: 128 }),
  tags: json("tags").$type<string[]>().default([]),
  notes: text("notes"),
  avatarUrl: text("avatarUrl"),
  source: mysqlEnum("source", ["manual", "whatsapp", "import", "website"]).default("manual"),
  assignedUserId: int("assignedUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ─── PIPELINE STAGES ─────────────────────────────────────────────────────────
export const pipelineStages = mysqlTable("pipeline_stages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  color: varchar("color", { length: 16 }).default("#6366f1"),
  position: int("position").default(0),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = typeof pipelineStages.$inferInsert;

// ─── LEADS ───────────────────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  contactId: int("contactId"),
  stageId: int("stageId"),
  assignedUserId: int("assignedUserId"),
  value: decimal("value", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("BRL"),
  probability: int("probability").default(0),
  expectedCloseDate: timestamp("expectedCloseDate"),
  status: mysqlEnum("status", ["open", "won", "lost"]).default("open"),
  notes: text("notes"),
  tags: json("tags").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── WHATSAPP CHATS ───────────────────────────────────────────────────────────
export const whatsappChats = mysqlTable("whatsapp_chats", {
  id: int("id").autoincrement().primaryKey(),
  jid: varchar("jid", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  isGroup: boolean("isGroup").default(false),
  contactId: int("contactId"),
  lastMessageAt: timestamp("lastMessageAt"),
  lastMessagePreview: text("lastMessagePreview"),
  unreadCount: int("unreadCount").default(0),
  syncedAt: timestamp("syncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsappChat = typeof whatsappChats.$inferSelect;
export type InsertWhatsappChat = typeof whatsappChats.$inferInsert;

// ─── WHATSAPP MESSAGES ────────────────────────────────────────────────────────
export const whatsappMessages = mysqlTable("whatsapp_messages", {
  id: int("id").autoincrement().primaryKey(),
  messageId: varchar("messageId", { length: 255 }).notNull().unique(),
  chatJid: varchar("chatJid", { length: 128 }).notNull(),
  chatId: int("chatId"),
  senderJid: varchar("senderJid", { length: 128 }),
  senderName: varchar("senderName", { length: 255 }),
  crmUserId: int("crmUserId"),
  crmUserName: varchar("crmUserName", { length: 255 }),
  content: text("content"),
  mediaType: mysqlEnum("mediaType", ["text", "image", "video", "audio", "document", "sticker"]).default("text"),
  mediaUrl: text("mediaUrl"),
  isFromMe: boolean("isFromMe").default(false),
  timestamp: bigint("timestamp", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

// ─── CONTRACTS ───────────────────────────────────────────────────────────────
export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  contactId: int("contactId"),
  leadId: int("leadId"),
  assignedUserId: int("assignedUserId"),
  status: mysqlEnum("status", ["draft", "sent", "signed", "cancelled"]).default("draft"),
  content: text("content"),
  fileUrl: text("fileUrl"),
  signatureUrl: text("signatureUrl"),
  signedAt: timestamp("signedAt"),
  signerName: varchar("signerName", { length: 255 }),
  signerEmail: varchar("signerEmail", { length: 320 }),
  value: decimal("value", { precision: 12, scale: 2 }),
  validUntil: timestamp("validUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

// ─── INVOICES ────────────────────────────────────────────────────────────────
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 64 }).notNull().unique(),
  contactId: int("contactId"),
  leadId: int("leadId"),
  contractId: int("contractId"),
  assignedUserId: int("assignedUserId"),
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  items: json("items").$type<Array<{ description: string; quantity: number; unitPrice: number; total: number }>>().default([]),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("BRL"),
  dueDate: timestamp("dueDate"),
  paidAt: timestamp("paidAt"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripePaymentUrl: text("stripePaymentUrl"),
  fileUrl: text("fileUrl"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ─── QUOTES (ORÇAMENTOS) ──────────────────────────────────────────────────────
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 64 }).notNull().unique(),
  contactId: int("contactId"),
  leadId: int("leadId"),
  assignedUserId: int("assignedUserId"),
  status: mysqlEnum("status", ["draft", "sent", "accepted", "rejected", "expired"]).default("draft"),
  items: json("items").$type<Array<{ description: string; quantity: number; unitPrice: number; total: number }>>().default([]),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("BRL"),
  validUntil: timestamp("validUntil"),
  fileUrl: text("fileUrl"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

// ─── STUDIO BOOKINGS ─────────────────────────────────────────────────────────
export const studioBookings = mysqlTable("studio_bookings", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId"),
  leadId: int("leadId"),
  assignedUserId: int("assignedUserId"),
  title: varchar("title", { length: 255 }).notNull(),
  sessionType: mysqlEnum("sessionType", ["recording", "mixing", "mastering", "rehearsal", "other"]).default("recording"),
  status: mysqlEnum("status", ["scheduled", "confirmed", "in_progress", "completed", "cancelled"]).default("scheduled"),
  startAt: timestamp("startAt").notNull(),
  endAt: timestamp("endAt").notNull(),
  studio: varchar("studio", { length: 128 }).default("Estúdio Principal"),
  engineer: varchar("engineer", { length: 255 }),
  notes: text("notes"),
  value: decimal("value", { precision: 12, scale: 2 }),
  invoiceId: int("invoiceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudioBooking = typeof studioBookings.$inferSelect;
export type InsertStudioBooking = typeof studioBookings.$inferInsert;

// ─── TASKS ───────────────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedUserId: int("assignedUserId"),
  contactId: int("contactId"),
  leadId: int("leadId"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  status: mysqlEnum("status", ["pending", "in_progress", "done", "cancelled"]).default("pending"),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  contactId: int("contactId"),
  leadId: int("leadId"),
  type: mysqlEnum("type", ["whatsapp", "email", "call", "note", "status_change", "contract", "invoice", "booking"]).notNull(),
  description: text("description"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;
