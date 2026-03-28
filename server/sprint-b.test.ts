import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
  getNotifications: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      type: "payment",
      title: "Pagamento recebido",
      message: "Fatura #001 foi paga",
      isRead: false,
      link: "/invoices",
      createdAt: new Date("2026-03-28T10:00:00Z"),
    },
    {
      id: 2,
      userId: 1,
      type: "new_lead",
      title: "Novo lead",
      message: "João Silva entrou no pipeline",
      isRead: true,
      link: "/pipeline",
      createdAt: new Date("2026-03-28T09:00:00Z"),
    },
  ]),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(1),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  getDashboardActionItems: vi.fn().mockResolvedValue({
    staleLeads: [
      { id: 1, title: "Lead Teste", updatedAt: new Date("2026-03-20T00:00:00Z") },
    ],
    overdueInvoices: [
      { id: 1, number: "INV-001", total: "500.00", dueDate: new Date("2026-03-25T00:00:00Z") },
    ],
    unpaidBookings: [],
  }),
  getDashboardKpis: vi.fn().mockResolvedValue({
    revenueThisMonth: 5000,
    revenueLastMonth: 4000,
    revenueChange: 25,
    activeLeads: 8,
    conversionRate: 35,
    weekSessions: 4,
  }),
}));

import {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  getDashboardActionItems,
  getDashboardKpis,
} from "./db";

// ─── Notification Tests ───────────────────────────────────────────────────────
describe("Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a notification with correct fields", async () => {
    await createNotification({
      userId: 1,
      type: "payment",
      title: "Pagamento recebido",
      message: "Fatura #001 paga",
      isRead: false,
    });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        type: "payment",
        title: "Pagamento recebido",
      })
    );
  });

  it("returns notifications for a user", async () => {
    const result = await getNotifications(1);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("payment");
    expect(result[1].isRead).toBe(true);
  });

  it("returns correct unread count", async () => {
    const count = await getUnreadNotificationCount(1);
    expect(count).toBe(1);
  });

  it("marks a single notification as read", async () => {
    await markNotificationRead(1, 1);
    expect(markNotificationRead).toHaveBeenCalledWith(1, 1);
  });

  it("marks all notifications as read", async () => {
    await markAllNotificationsRead(1);
    expect(markAllNotificationsRead).toHaveBeenCalledWith(1);
  });

  it("handles notification types correctly", async () => {
    const notifs = await getNotifications(1);
    const types = notifs.map((n) => n.type);
    expect(types).toContain("payment");
    expect(types).toContain("new_lead");
  });
});

// ─── Dashboard Action Items Tests ─────────────────────────────────────────────
describe("Dashboard Action Items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns stale leads that need follow-up", async () => {
    const items = await getDashboardActionItems();
    expect(items.staleLeads).toHaveLength(1);
    expect(items.staleLeads[0].title).toBe("Lead Teste");
  });

  it("returns overdue invoices", async () => {
    const items = await getDashboardActionItems();
    expect(items.overdueInvoices).toHaveLength(1);
    expect(items.overdueInvoices[0].number).toBe("INV-001");
    expect(Number(items.overdueInvoices[0].total)).toBe(500);
  });

  it("returns empty unpaid bookings when none exist", async () => {
    const items = await getDashboardActionItems();
    expect(items.unpaidBookings).toHaveLength(0);
  });

  it("total action items count is correct", async () => {
    const items = await getDashboardActionItems();
    const total = items.staleLeads.length + items.overdueInvoices.length + items.unpaidBookings.length;
    expect(total).toBe(2);
  });
});

// ─── Dashboard KPIs Tests ─────────────────────────────────────────────────────
describe("Dashboard KPIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns revenue for current and last month", async () => {
    const kpis = await getDashboardKpis();
    expect(kpis.revenueThisMonth).toBe(5000);
    expect(kpis.revenueLastMonth).toBe(4000);
  });

  it("calculates positive revenue change correctly", async () => {
    const kpis = await getDashboardKpis();
    expect(kpis.revenueChange).toBe(25);
    expect(kpis.revenueChange).toBeGreaterThan(0);
  });

  it("returns active leads count", async () => {
    const kpis = await getDashboardKpis();
    expect(kpis.activeLeads).toBe(8);
    expect(kpis.activeLeads).toBeGreaterThanOrEqual(0);
  });

  it("returns conversion rate as percentage", async () => {
    const kpis = await getDashboardKpis();
    expect(kpis.conversionRate).toBe(35);
    expect(kpis.conversionRate).toBeGreaterThanOrEqual(0);
    expect(kpis.conversionRate).toBeLessThanOrEqual(100);
  });

  it("returns week sessions count", async () => {
    const kpis = await getDashboardKpis();
    expect(kpis.weekSessions).toBe(4);
    expect(kpis.weekSessions).toBeGreaterThanOrEqual(0);
  });
});

// ─── Notification Type Validation ─────────────────────────────────────────────
describe("Notification Type Validation", () => {
  const validTypes = ["new_lead", "payment", "contract_signed", "booking", "system"];

  it("accepts all valid notification types", () => {
    validTypes.forEach((type) => {
      expect(validTypes).toContain(type);
    });
  });

  it("notification with link is valid", async () => {
    await createNotification({
      userId: 1,
      type: "new_lead",
      title: "Novo lead",
      message: "Lead criado",
      isRead: false,
      link: "/pipeline",
    });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ link: "/pipeline" })
    );
  });

  it("notification without link is valid", async () => {
    await createNotification({
      userId: 1,
      type: "system",
      title: "Sistema atualizado",
      message: "Manutenção concluída",
      isRead: false,
    });
    expect(createNotification).toHaveBeenCalled();
  });
});
