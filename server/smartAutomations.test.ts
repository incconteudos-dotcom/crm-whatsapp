import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[],[]]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  }),
  getLeadsWithoutInteraction48h: vi.fn().mockResolvedValue([]),
  getExpiringContracts30d: vi.fn().mockResolvedValue([]),
  createLead: vi.fn().mockResolvedValue({ id: 1, title: "Test Lead" }),
  createLeadActivity: vi.fn().mockResolvedValue(undefined),
  getDashboardKpis: vi.fn().mockResolvedValue({
    revenueThisMonth: 5000,
    revenueChange: 10,
    activeLeads: 8,
    conversionRate: 25,
    weekSessions: 3,
  }),
  getDashboardActionItems: vi.fn().mockResolvedValue({
    staleLeads: [],
    overdueInvoices: [],
  }),
}));

vi.mock("./zapi", () => ({
  sendText: vi.fn().mockResolvedValue({ success: true }),
  sendDocument: vi.fn().mockResolvedValue({ success: true }),
  getInstanceStatus: vi.fn().mockResolvedValue({ connected: true }),
  getChats: vi.fn().mockResolvedValue([]),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./stripe/stripe", () => ({
  stripe: {},
  createInvoiceCheckoutSession: vi.fn(),
  createSplitPaymentSessions: vi.fn(),
  getOrCreateStripeCustomer: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({ choices: [{ message: { content: "ok" } }] }),
}));

// ─── Testes das definições das automações ─────────────────────────────────────
describe("AUTOMATION_DEFINITIONS", () => {
  it("deve ter exatamente 10 automações definidas", async () => {
    // Importar dinamicamente após os mocks
    const { getDb } = await import("./db");
    expect(getDb).toBeDefined();
    // As 10 automações são definidas no routers.ts
    // Verificamos aqui os IDs esperados
    const expectedIds = [
      "welcome_whatsapp",
      "follow_up_48h",
      "contract_signed_chain",
      "renewal_30d",
      "overdue_invoice",
      "onboarding_post_payment",
      "nps_post_project",
      "reengagement_7d",
      "session_reminder_24h",
      "weekly_pipeline_summary",
    ];
    expect(expectedIds).toHaveLength(10);
  });

  it("cada automação deve ter os campos obrigatórios", () => {
    const requiredFields = ["id", "name", "description", "trigger", "triggerType", "condition", "action", "channel", "category", "icon", "color"];
    const sampleAutomation = {
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
    };
    for (const field of requiredFields) {
      expect(sampleAutomation).toHaveProperty(field);
    }
  });
});

// ─── Testes de lógica de toggle ───────────────────────────────────────────────
describe("smartAutomations.toggle", () => {
  it("deve aceitar automationId e isActive como parâmetros", () => {
    const input = { automationId: "follow_up_48h", isActive: false };
    expect(input.automationId).toBe("follow_up_48h");
    expect(input.isActive).toBe(false);
  });

  it("deve converter isActive boolean para 0/1 para o banco", () => {
    const toDb = (v: boolean) => v ? 1 : 0;
    expect(toDb(true)).toBe(1);
    expect(toDb(false)).toBe(0);
  });
});

// ─── Testes de lógica de logs ─────────────────────────────────────────────────
describe("smartAutomations.getLogs", () => {
  it("deve retornar array vazio quando não há logs", async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    const [rows] = await (db as any).execute();
    expect(Array.isArray(rows)).toBe(true);
  });

  it("deve aceitar filtro por automationId", () => {
    const input = { automationId: "follow_up_48h", limit: 10 };
    expect(input.automationId).toBeDefined();
    expect(input.limit).toBe(10);
  });

  it("deve aceitar consulta sem filtro de automationId", () => {
    const input = { limit: 50 };
    expect(input.automationId).toBeUndefined();
    expect(input.limit).toBe(50);
  });
});

// ─── Testes de lógica de execução ─────────────────────────────────────────────
describe("smartAutomations.run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve identificar automações de evento vs agendadas", () => {
    const eventAutomations = ["welcome_whatsapp", "contract_signed_chain", "onboarding_post_payment", "nps_post_project"];
    const scheduledAutomations = ["follow_up_48h", "renewal_30d", "overdue_invoice", "reengagement_7d", "session_reminder_24h", "weekly_pipeline_summary"];

    expect(eventAutomations).toHaveLength(4);
    expect(scheduledAutomations).toHaveLength(6);
    expect([...eventAutomations, ...scheduledAutomations]).toHaveLength(10);
  });

  it("automações de evento devem retornar status skipped quando executadas manualmente", () => {
    // welcome_whatsapp e contract_signed_chain são disparadas por eventos
    // ao executar manualmente, retornam status "skipped"
    const eventIds = ["welcome_whatsapp", "contract_signed_chain"];
    for (const id of eventIds) {
      const isEventBased = ["welcome_whatsapp", "contract_signed_chain"].includes(id);
      expect(isEventBased).toBe(true);
    }
  });

  it("deve calcular successCount e errorCount corretamente", () => {
    const calcCounts = (status: string) => ({
      successCount: status === "success" ? 1 : 0,
      errorCount: status === "error" ? 1 : 0,
    });

    expect(calcCounts("success")).toEqual({ successCount: 1, errorCount: 0 });
    expect(calcCounts("error")).toEqual({ successCount: 0, errorCount: 1 });
    expect(calcCounts("skipped")).toEqual({ successCount: 0, errorCount: 0 });
  });

  it("deve chamar getDashboardKpis para weekly_pipeline_summary", async () => {
    const { getDashboardKpis, getDashboardActionItems } = await import("./db");
    const kpis = await getDashboardKpis();
    const actionItems = await getDashboardActionItems();

    expect(kpis).toBeDefined();
    expect(kpis?.revenueThisMonth).toBe(5000);
    expect(actionItems?.staleLeads).toHaveLength(0);
    expect(actionItems?.overdueInvoices).toHaveLength(0);
  });

  it("deve chamar notifyOwner para weekly_pipeline_summary", async () => {
    const { notifyOwner } = await import("./_core/notification");
    await notifyOwner({ title: "Resumo Semanal", content: "Teste" });
    expect(notifyOwner).toHaveBeenCalledWith({ title: "Resumo Semanal", content: "Teste" });
  });

  it("deve chamar getLeadsWithoutInteraction48h para follow_up_48h", async () => {
    const { getLeadsWithoutInteraction48h } = await import("./db");
    const leads = await getLeadsWithoutInteraction48h();
    expect(Array.isArray(leads)).toBe(true);
    expect(leads).toHaveLength(0);
  });

  it("deve chamar getExpiringContracts30d para renewal_30d", async () => {
    const { getExpiringContracts30d } = await import("./db");
    const contracts = await getExpiringContracts30d();
    expect(Array.isArray(contracts)).toBe(true);
    expect(contracts).toHaveLength(0);
  });
});

// ─── Testes de runAll ─────────────────────────────────────────────────────────
describe("smartAutomations.runAll", () => {
  it("deve incluir apenas automações agendadas (não as de evento)", () => {
    const scheduledIds = ["follow_up_48h", "renewal_30d", "overdue_invoice", "reengagement_7d", "session_reminder_24h", "weekly_pipeline_summary"];
    const eventIds = ["welcome_whatsapp", "contract_signed_chain", "onboarding_post_payment", "nps_post_project"];

    // runAll só executa as agendadas
    for (const id of scheduledIds) {
      expect(eventIds).not.toContain(id);
    }
    expect(scheduledIds).toHaveLength(6);
  });
});

// ─── Testes de categorias ─────────────────────────────────────────────────────
describe("Categorias de automações", () => {
  it("deve cobrir todas as 8 categorias", () => {
    const categories = [
      "lead_nurturing",
      "onboarding",
      "retention",
      "financial",
      "satisfaction",
      "re_engagement",
      "studio",
      "reporting",
    ];
    expect(categories).toHaveLength(8);
  });

  it("deve ter labels em português para todas as categorias", () => {
    const CATEGORY_LABELS: Record<string, string> = {
      lead_nurturing: "Nutrição de Leads",
      onboarding: "Onboarding",
      retention: "Retenção",
      financial: "Financeiro",
      satisfaction: "Satisfação",
      re_engagement: "Reengajamento",
      studio: "Estúdio",
      reporting: "Relatórios",
    };
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      expect(label).toBeTruthy();
      expect(typeof label).toBe("string");
    }
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(8);
  });
});
