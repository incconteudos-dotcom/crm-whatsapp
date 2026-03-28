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
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
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
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
  paymentPlan: mysqlEnum("paymentPlan", ["full", "installment_50_50"]).default("full"),
  installmentNumber: int("installmentNumber").default(1),
  parentInvoiceId: int("parentInvoiceId"),
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
// ─── CLIENT PORTAL TOKENS ─────────────────────────────────────────────────────
export const clientPortalTokens = mysqlTable("client_portal_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  type: mysqlEnum("type", ["contract", "invoice", "quote"]).notNull(),
  documentId: int("documentId").notNull(),
  contactId: int("contactId"),
  expiresAt: timestamp("expiresAt"),
  usedAt: timestamp("usedAt"),
  approvedAt: timestamp("approvedAt"),
  signedName: varchar("signedName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ClientPortalToken = typeof clientPortalTokens.$inferSelect;
export type InsertClientPortalToken = typeof clientPortalTokens.$inferInsert;

// ─── PRODUCT CATALOG ─────────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["episode", "package", "studio", "service", "other"]).default("service"),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("BRL"),
  unit: varchar("unit", { length: 64 }).default("un"),
  active: boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── BILLING REMINDERS ───────────────────────────────────────────────────────
export const billingReminders = mysqlTable("billing_reminders", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  contactId: int("contactId"),
  channel: mysqlEnum("channel", ["whatsapp", "email"]).notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["pending", "sent", "failed", "cancelled"]).default("pending"),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BillingReminder = typeof billingReminders.$inferSelect;
export type InsertBillingReminder = typeof billingReminders.$inferInsert;

// ─── PROJECTS ────────────────────────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactId: int("contactId"),
  status: mysqlEnum("status", ["briefing", "recording", "editing", "review", "published", "archived"]).default("briefing"),
  type: mysqlEnum("type", ["podcast", "audiobook", "commercial", "voiceover", "music", "other"]).default("podcast"),
  description: text("description"),
  startDate: timestamp("startDate"),
  deadline: timestamp("deadline"),
  totalValue: decimal("totalValue", { precision: 12, scale: 2 }),
  assignedTo: int("assignedTo"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── CONTRACT TEMPLATES ──────────────────────────────────────────────────────
export const contractTemplates = mysqlTable("contract_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  description: text("description"),
  content: text("content").notNull(),
  variables: text("variables"),
  isDefault: boolean("isDefault").default(false),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = typeof contractTemplates.$inferInsert;

// ─── CONTACT TAGS ────────────────────────────────────────────────────────────
export const contactTags = mysqlTable("contact_tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 32 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ContactTag = typeof contactTags.$inferSelect;

export const contactTagAssignments = mysqlTable("contact_tag_assignments", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),
  tagId: int("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── CREDIT TRANSACTIONS ─────────────────────────────────────────────────────
export const creditTransactions = mysqlTable("credit_transactions", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),
  type: mysqlEnum("type", ["credit", "debit", "bonus", "refund"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  referenceType: varchar("referenceType", { length: 50 }),
  referenceId: int("referenceId"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

// ─── PROJECT LINKS ────────────────────────────────────────────────────────────
export const projectLinks = mysqlTable("project_links", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  entityType: mysqlEnum("entityType", ["booking", "invoice", "contract", "quote", "task"]).notNull(),
  entityId: int("entityId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectLink = typeof projectLinks.$inferSelect;

// ─── PJ DOCUMENTS (Onboarding PJ) ────────────────────────────────────────────
export const pjDocuments = mysqlTable("pj_documents", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),
  cnpj: varchar("cnpj", { length: 18 }),
  razaoSocial: varchar("razao_social", { length: 255 }),
  nomeFantasia: varchar("nome_fantasia", { length: 255 }),
  inscricaoEstadual: varchar("inscricao_estadual", { length: 64 }),
  enderecoCompleto: text("endereco_completo"),
  responsavelNome: varchar("responsavel_nome", { length: 255 }),
  responsavelCpf: varchar("responsavel_cpf", { length: 14 }),
  responsavelEmail: varchar("responsavel_email", { length: 320 }),
  responsavelTelefone: varchar("responsavel_telefone", { length: 32 }),
  documentUrl: text("document_url"),
  extractedData: json("extracted_data").$type<Record<string, string>>(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "error"]).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PjDocument = typeof pjDocuments.$inferSelect;
export type InsertPjDocument = typeof pjDocuments.$inferInsert;

// ─── DAILY ROUTINES ───────────────────────────────────────────────────────────
export const dailyRoutines = mysqlTable("daily_routines", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  completedItems: json("completed_items").$type<number[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DailyRoutine = typeof dailyRoutines.$inferSelect;

// ─── ROUTINE TEMPLATES ────────────────────────────────────────────────────────
export const routineTemplates = mysqlTable("routine_templates", {
  id: int("id").autoincrement().primaryKey(),
  role: varchar("role", { length: 64 }).notNull(), // admin, gerente, analista, assistente
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  order: int("order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RoutineTemplate = typeof routineTemplates.$inferSelect;
