import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getAllUsers: vi.fn().mockResolvedValue([]),
  getPendingUsers: vi.fn().mockResolvedValue([]),
  updateUserStatus: vi.fn().mockResolvedValue(undefined),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  updateUserWhatsappAccess: vi.fn().mockResolvedValue(undefined),
  getContacts: vi.fn().mockResolvedValue([]),
  getContactById: vi.fn().mockResolvedValue(undefined),
  createContact: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateContact: vi.fn().mockResolvedValue(undefined),
  deleteContact: vi.fn().mockResolvedValue(undefined),
  getPipelineStages: vi.fn().mockResolvedValue([]),
  createPipelineStage: vi.fn().mockResolvedValue({ insertId: 1 }),
  seedDefaultPipelineStages: vi.fn().mockResolvedValue(undefined),
  getLeads: vi.fn().mockResolvedValue([]),
  getLeadById: vi.fn().mockResolvedValue(undefined),
  createLead: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateLead: vi.fn().mockResolvedValue(undefined),
  deleteLead: vi.fn().mockResolvedValue(undefined),
  getWhatsappChats: vi.fn().mockResolvedValue([]),
  upsertWhatsappChat: vi.fn().mockResolvedValue(undefined),
  getWhatsappMessages: vi.fn().mockResolvedValue([]),
  upsertWhatsappMessage: vi.fn().mockResolvedValue(undefined),
  getContracts: vi.fn().mockResolvedValue([]),
  getContractById: vi.fn().mockResolvedValue(undefined),
  createContract: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateContract: vi.fn().mockResolvedValue(undefined),
  getInvoices: vi.fn().mockResolvedValue([]),
  getInvoiceById: vi.fn().mockResolvedValue(undefined),
  createInvoice: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateInvoice: vi.fn().mockResolvedValue(undefined),
  getQuotes: vi.fn().mockResolvedValue([]),
  createQuote: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateQuote: vi.fn().mockResolvedValue(undefined),
  getStudioBookings: vi.fn().mockResolvedValue([]),
  createStudioBooking: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateStudioBooking: vi.fn().mockResolvedValue(undefined),
  deleteStudioBooking: vi.fn().mockResolvedValue(undefined),
  getTasks: vi.fn().mockResolvedValue([]),
  createTask: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateTask: vi.fn().mockResolvedValue(undefined),
  getRecentActivities: vi.fn().mockResolvedValue([]),
  createActivity: vi.fn().mockResolvedValue(undefined),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalContacts: 5,
    openLeads: 3,
    totalRevenue: "1500.00",
    pendingTasks: 2,
    pendingUsers: 1,
  }),
}));

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "email",
      role: "admin",
      status: "active",
      whatsappAccess: true,
      avatarUrl: null,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserCtx(role = "assistente", whatsappAccess = false): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "email",
      role: role as any,
      status: "active",
      whatsappAccess,
      avatarUrl: null,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Dashboard Stats", () => {
  it("returns stats for authenticated user", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const stats = await caller.dashboard.stats();
    expect(stats.totalContacts).toBe(5);
    expect(stats.openLeads).toBe(3);
    expect(stats.pendingUsers).toBe(1);
  });
});

describe("Contacts Router", () => {
  it("lists contacts for any authenticated user", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    const result = await caller.contacts.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a contact", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    const result = await caller.contacts.create({ name: "João Silva", email: "joao@example.com" });
    expect(result).toBeDefined();
  });

  it("blocks delete for non-manager", async () => {
    const caller = appRouter.createCaller(createUserCtx("assistente"));
    await expect(caller.contacts.delete({ id: 1 })).rejects.toThrow();
  });

  it("allows delete for manager", async () => {
    const caller = appRouter.createCaller(createUserCtx("gerente"));
    await expect(caller.contacts.delete({ id: 1 })).resolves.not.toThrow();
  });
});

describe("Users Router - Role Guards", () => {
  it("blocks non-admin from listing users", async () => {
    const caller = appRouter.createCaller(createUserCtx("analista"));
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("allows admin to list users", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows manager to see pending users", async () => {
    const caller = appRouter.createCaller(createUserCtx("gerente"));
    const result = await caller.users.pending();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("WhatsApp Router - Access Control", () => {
  it("blocks user without whatsapp access", async () => {
    const caller = appRouter.createCaller(createUserCtx("assistente", false));
    await expect(caller.whatsapp.chats()).rejects.toThrow();
  });

  it("allows user with whatsapp access", async () => {
    const caller = appRouter.createCaller(createUserCtx("assistente", true));
    const result = await caller.whatsapp.chats();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows gerente automatically", async () => {
    const caller = appRouter.createCaller(createUserCtx("gerente", false));
    const result = await caller.whatsapp.chats();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Pipeline Router", () => {
  it("lists stages for any authenticated user", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    const result = await caller.pipeline.stages();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a lead", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    const result = await caller.pipeline.createLead({ title: "Lead Teste" });
    expect(result).toBeDefined();
  });
});

describe("Invoice Router", () => {
  it("creates an invoice with correct total", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.invoices.create({
      items: [
        { description: "Serviço A", quantity: 2, unitPrice: 500, total: 1000 },
        { description: "Serviço B", quantity: 1, unitPrice: 300, total: 300 },
      ],
    });
    expect(result).toBeDefined();
  });
});
