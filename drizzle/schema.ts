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
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "cancelled", "past_due", "trialing", "none"]).default("none"),
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
  bookingId: int("bookingId"),
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
  roomId: int("room_id"), // references studioRooms
  engineer: varchar("engineer", { length: 255 }),
  notes: text("notes"),
  value: decimal("value", { precision: 12, scale: 2 }),
  invoiceId: int("invoiceId"),
  paymentStatus: mysqlEnum("paymentStatus", ["pending_payment", "paid", "waived"]).default("waived"),
  entryInvoiceId: int("entryInvoiceId"),
  reminderSentAt: timestamp("reminderSentAt"),
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

// ─── PODCASTS ─────────────────────────────────────────────────────────────────
export const podcasts = mysqlTable("podcasts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  contactId: int("contact_id"),
  category: varchar("category", { length: 128 }),
  language: varchar("language", { length: 32 }).default("pt-BR"),
  publishingFrequency: varchar("publishing_frequency", { length: 64 }),
  rssUrl: text("rss_url"),
  spotifyUrl: text("spotify_url"),
  youtubeUrl: text("youtube_url"),
  status: mysqlEnum("podcast_status", ["active", "paused", "finished"]).default("active"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Podcast = typeof podcasts.$inferSelect;
export type InsertPodcast = typeof podcasts.$inferInsert;

// ─── EPISODES ─────────────────────────────────────────────────────────────────
export const episodes = mysqlTable("episodes", {
  id: int("id").autoincrement().primaryKey(),
  podcastId: int("podcast_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  number: int("number"),
  description: text("description"),
  guestName: varchar("guest_name", { length: 255 }),
  guestBio: text("guest_bio"),
  recordingDate: timestamp("recording_date"),
  publishDate: timestamp("publish_date"),
  duration: int("duration"),
  scriptUrl: text("script_url"),
  rawAudioUrl: text("raw_audio_url"),
  editedAudioUrl: text("edited_audio_url"),
  thumbnailUrl: text("thumbnail_url"),
  publishedUrl: text("published_url"),
  productionStatus: mysqlEnum("production_status", ["roteiro","gravacao","edicao","revisao","agendado","publicado"]).default("roteiro"),
  studioBookingId: int("studio_booking_id"),
  assignedEditorId: int("assigned_editor_id"),
  tags: json("tags").$type<string[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Episode = typeof episodes.$inferSelect;
export type InsertEpisode = typeof episodes.$inferInsert;

// ─── EPISODE COMMENTS ─────────────────────────────────────────────────────────
export const episodeComments = mysqlTable("episode_comments", {
  id: int("id").autoincrement().primaryKey(),
  episodeId: int("episode_id").notNull(),
  userId: int("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EpisodeComment = typeof episodeComments.$inferSelect;
export type InsertEpisodeComment = typeof episodeComments.$inferInsert;

// ─── BRAND SETTINGS ──────────────────────────────────────────────────────────
export const brandSettings = mysqlTable("brand_settings", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull().default("Pátio Estúdio"),
  logoUrl: varchar("logo_url", { length: 512 }),
  primaryColor: varchar("primary_color", { length: 7 }).default("#7c3aed"),
  accentColor: varchar("accent_color", { length: 7 }).default("#06b6d4"),
  tagline: varchar("tagline", { length: 255 }),
  website: varchar("website", { length: 255 }),
  supportEmail: varchar("support_email", { length: 255 }),
  supportPhone: varchar("support_phone", { length: 50 }),
  footerText: text("footer_text"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BrandSettings = typeof brandSettings.$inferSelect;
export type InsertBrandSettings = typeof brandSettings.$inferInsert;

// ─── PORTAL MAGIC LINKS ───────────────────────────────────────────────────────
export const portalMagicLinks = mysqlTable("portal_magic_links", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  contactId: int("contact_id").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PortalMagicLink = typeof portalMagicLinks.$inferSelect;
export type InsertPortalMagicLink = typeof portalMagicLinks.$inferInsert;

// ─── AUTOMATION SEQUENCES ─────────────────────────────────────────────────────
export const automationSequences = mysqlTable("automation_sequences", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerStage: varchar("trigger_stage", { length: 50 }).notNull(), // pipeline stage
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AutomationSequence = typeof automationSequences.$inferSelect;
export type InsertAutomationSequence = typeof automationSequences.$inferInsert;

// ─── AUTOMATION STEPS ─────────────────────────────────────────────────────────
export const automationSteps = mysqlTable("automation_steps", {
  id: int("id").autoincrement().primaryKey(),
  sequenceId: int("sequence_id").notNull(),
  stepOrder: int("step_order").notNull().default(1),
  delayDays: int("delay_days").notNull().default(1),
  channel: varchar("channel", { length: 20 }).notNull().default("whatsapp"), // whatsapp | email
  messageTemplate: text("message_template").notNull(),
  subject: varchar("subject", { length: 255 }), // for email
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AutomationStep = typeof automationSteps.$inferSelect;
export type InsertAutomationStep = typeof automationSteps.$inferInsert;

// ─── AUTOMATION EXECUTIONS ────────────────────────────────────────────────────
export const automationExecutions = mysqlTable("automation_executions", {
  id: int("id").autoincrement().primaryKey(),
  sequenceId: int("sequence_id").notNull(),
  stepId: int("step_id").notNull(),
  contactId: int("contact_id").notNull(),
  leadId: int("lead_id"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | sent | failed | skipped
  scheduledAt: timestamp("scheduled_at").notNull(),
  executedAt: timestamp("executed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type InsertAutomationExecution = typeof automationExecutions.$inferInsert;

// ─── MESSAGE TEMPLATES ────────────────────────────────────────────────────────
export const messageTemplates = mysqlTable("message_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default("follow_up"), // follow_up | welcome | reminder | proposal
  channel: varchar("channel", { length: 20 }).notNull().default("whatsapp"),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  variables: text("variables"), // JSON array of variable names like ["nome", "empresa"]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = typeof messageTemplates.$inferInsert;

// ─── STUDIO ROOMS ─────────────────────────────────────────────────────────────
export const studioRooms = mysqlTable("studio_rooms", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // "Sala A", "Cabine de Locução", "Sala B"
  description: text("description"),
  capacity: int("capacity").default(1),
  color: varchar("color", { length: 20 }).default("#6366f1"), // for calendar display
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StudioRoom = typeof studioRooms.$inferSelect;
export type InsertStudioRoom = typeof studioRooms.$inferInsert;

// ─── EQUIPMENT ────────────────────────────────────────────────────────────────
export const equipment = mysqlTable("equipment", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default("audio"), // audio | video | lighting | accessories | other
  serialNumber: varchar("serial_number", { length: 100 }),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("available"), // available | in_use | maintenance | retired
  notes: text("notes"),
  roomId: int("room_id"), // default room assignment
  purchaseDate: timestamp("purchase_date"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;

// ─── EQUIPMENT BOOKINGS (link equipment to studio bookings) ──────────────────
export const equipmentBookings = mysqlTable("equipment_bookings", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull(),
  studioBookingId: int("studio_booking_id").notNull(), // references studioBookings
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EquipmentBooking = typeof equipmentBookings.$inferSelect;
export type InsertEquipmentBooking = typeof equipmentBookings.$inferInsert;

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // new_lead | payment | contract_signed | booking | system
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── THEORY OF CONSTRAINTS ────────────────────────────────────────────────────
export const tocConfigs = mysqlTable("toc_configs", {
  id: int("id").autoincrement().primaryKey(),
  businessContext: text("business_context"),
  domains: text("domains").notNull().default('["comercial","financeiro","producao","pessoas","tecnologia"]'),
  weeklyDay: varchar("weekly_day", { length: 20 }).notNull().default("monday"),
  weeklyTime: varchar("weekly_time", { length: 10 }).notNull().default("08:00"),
  autoGenerate: boolean("auto_generate").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TocConfig = typeof tocConfigs.$inferSelect;
export type InsertTocConfig = typeof tocConfigs.$inferInsert;

export const tocSessions = mysqlTable("toc_sessions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  weekDate: timestamp("week_date").notNull(),
  summary: text("summary"),
  mainConstraint: text("main_constraint"),
  recommendations: text("recommendations"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TocSession = typeof tocSessions.$inferSelect;
export type InsertTocSession = typeof tocSessions.$inferInsert;

export const tocConstraints = mysqlTable("toc_constraints", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("session_id"),
  domain: varchar("domain", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 20 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  rootCause: text("root_cause"),
  impact: text("impact"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TocConstraint = typeof tocConstraints.$inferSelect;
export type InsertTocConstraint = typeof tocConstraints.$inferInsert;

export const tocActionItems = mysqlTable("toc_action_items", {
  id: int("id").autoincrement().primaryKey(),
  constraintId: int("constraint_id").notNull(),
  sessionId: int("session_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: int("assigned_to"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TocActionItem = typeof tocActionItems.$inferSelect;
export type InsertTocActionItem = typeof tocActionItems.$inferInsert;
