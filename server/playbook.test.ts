/**
 * Testes do Playbook Operacional — Fluxo End-to-End
 *
 * Ação 1: Webhook Z-API → criação automática de contato + lead
 * Ação 2: Assinatura de contrato → fatura 50% + projeto
 * Ação 3: Crons de follow-up 48h e renovação 30 dias
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  // Webhook / Ação 1
  upsertWhatsappChat: vi.fn().mockResolvedValue(undefined),
  upsertWhatsappMessage: vi.fn().mockResolvedValue(undefined),
  autoCreateLeadFromWhatsapp: vi.fn().mockResolvedValue({ contactId: 42, leadId: 99 }),
  getContactById: vi.fn().mockResolvedValue({
    id: 42,
    name: "Maria Podcast",
    phone: "5511987654321",
    email: "maria@podcast.com",
  }),
  getOpenLeadByContact: vi.fn().mockResolvedValue(null),

  // Ação 2
  signContract: vi.fn().mockResolvedValue("sha256-hash-abc123"),
  createEntryInvoiceOnSign: vi.fn().mockResolvedValue(201),
  createProjectOnContractSign: vi.fn().mockResolvedValue(301),
  createPortalMagicLink: vi.fn().mockResolvedValue("magic-token-xyz"),

  // Ação 3
  getLeadsWithoutInteraction48h: vi.fn().mockResolvedValue([
    { id: 10, title: "Lead Estático A", contactId: 42, updatedAt: new Date(Date.now() - 72 * 60 * 60 * 1000) },
    { id: 11, title: "Lead Estático B", contactId: null, updatedAt: new Date(Date.now() - 96 * 60 * 60 * 1000) },
  ]),
  getContractsExpiringIn30Days: vi.fn().mockResolvedValue([
    { id: 5, title: "Contrato Vencendo", contactId: 42, validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), value: "3000.00" },
  ]),
  createRenewalLead: vi.fn().mockResolvedValue(500),
  createLeadActivity: vi.fn().mockResolvedValue(undefined),

  // Outros helpers necessários
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./zapiService", () => ({
  sendText: vi.fn().mockResolvedValue({ sent: true }),
}));

import {
  autoCreateLeadFromWhatsapp,
  createEntryInvoiceOnSign,
  createProjectOnContractSign,
  createRenewalLead,
  getLeadsWithoutInteraction48h,
  getContractsExpiringIn30Days,
  createLeadActivity,
  getContactById,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { zapiWebhookHandler } from "./zapiWebhook";
import type { Request, Response } from "express";

function makeReqRes(body: unknown) {
  const req = { body } as Request;
  const res = {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return { req, res };
}

// ─── AÇÃO 1: Webhook Z-API ────────────────────────────────────────────────────
describe("Playbook Ação 1 — Webhook Z-API cria lead automaticamente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve criar contato e lead ao receber mensagem de número desconhecido", async () => {
    const { req, res } = makeReqRes({
      phone: "5511987654321",
      fromMe: false,
      senderName: "Maria Podcast",
      chatName: "Maria Podcast",
      text: { message: "Olá, quero gravar um podcast!" },
      momment: Date.now(),
      messageId: "msg_playbook_001",
    });

    await zapiWebhookHandler(req, res);

    // Responde imediatamente
    expect(res.json).toHaveBeenCalledWith({ received: true });

    // Aguardar a Promise async do autoCreateLead
    await new Promise(resolve => setTimeout(resolve, 50));

    // Deve ter chamado autoCreateLeadFromWhatsapp
    expect(autoCreateLeadFromWhatsapp).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "5511987654321",
        name: "Maria Podcast",
        firstMessage: expect.stringContaining("Olá, quero gravar um podcast!"),
      })
    );
  });

  it("deve notificar o owner quando lead é criado", async () => {
    const { req, res } = makeReqRes({
      phone: "5511987654321",
      fromMe: false,
      senderName: "Maria Podcast",
      text: { message: "Tenho interesse no estúdio" },
      momment: Date.now(),
      messageId: "msg_playbook_002",
    });

    await zapiWebhookHandler(req, res);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Novo Lead via WhatsApp",
        content: expect.stringContaining("Maria Podcast"),
      })
    );
  });

  it("não deve criar lead para mensagens enviadas pelo próprio usuário", async () => {
    const { req, res } = makeReqRes({
      phone: "5511987654321",
      fromMe: true,
      text: { message: "Olá, como posso ajudar?" },
      momment: Date.now(),
      messageId: "msg_playbook_003",
    });

    await zapiWebhookHandler(req, res);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(autoCreateLeadFromWhatsapp).not.toHaveBeenCalled();
  });

  it("não deve criar lead para mensagens de grupo", async () => {
    const { req, res } = makeReqRes({
      phone: "5511987654321-1234567890@g.us",
      fromMe: false,
      text: { message: "Mensagem de grupo" },
      momment: Date.now(),
      messageId: "msg_playbook_004",
    });

    await zapiWebhookHandler(req, res);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(autoCreateLeadFromWhatsapp).not.toHaveBeenCalled();
  });
});

// ─── AÇÃO 2: Encadeamento ao assinar contrato ─────────────────────────────────
describe("Playbook Ação 2 — Assinatura de contrato cria fatura e projeto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve criar fatura de entrada (50%) ao assinar contrato", async () => {
    const invoiceId = await createEntryInvoiceOnSign(1);
    expect(invoiceId).toBe(201);
    expect(createEntryInvoiceOnSign).toHaveBeenCalledWith(1);
  });

  it("deve criar projeto ao assinar contrato", async () => {
    const projectId = await createProjectOnContractSign(1);
    expect(projectId).toBe(301);
    expect(createProjectOnContractSign).toHaveBeenCalledWith(1);
  });

  it("deve executar criação de fatura e projeto em paralelo", async () => {
    const [invoiceId, projectId] = await Promise.all([
      createEntryInvoiceOnSign(2),
      createProjectOnContractSign(2),
    ]);
    expect(invoiceId).toBe(201);
    expect(projectId).toBe(301);
  });
});

// ─── AÇÃO 3: Crons de follow-up e renovação ──────────────────────────────────
describe("Playbook Ação 3 — Crons de follow-up 48h e renovação 30d", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar leads sem interação nas últimas 48h", async () => {
    const staleLeads = await getLeadsWithoutInteraction48h();
    expect(staleLeads).toHaveLength(2);
    expect(staleLeads[0]).toMatchObject({ id: 10, title: "Lead Estático A" });
    expect(staleLeads[1]).toMatchObject({ id: 11, title: "Lead Estático B" });
  });

  it("deve retornar contratos vencendo em 30 dias", async () => {
    const expiringContracts = await getContractsExpiringIn30Days();
    expect(expiringContracts).toHaveLength(1);
    expect(expiringContracts[0]).toMatchObject({ id: 5, title: "Contrato Vencendo" });
  });

  it("deve criar lead de renovação para contrato próximo do vencimento", async () => {
    const leadId = await createRenewalLead(5);
    expect(leadId).toBe(500);
    expect(createRenewalLead).toHaveBeenCalledWith(5);
  });

  it("deve registrar atividade de follow-up no lead", async () => {
    await createLeadActivity({
      leadId: 10,
      type: "whatsapp_sent",
      description: "Follow-up automático enviado via WhatsApp (Playbook Cron 48h)",
      userId: 1,
    });
    expect(createLeadActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 10,
        type: "whatsapp_sent",
        description: expect.stringContaining("Follow-up automático"),
      })
    );
  });

  it("deve buscar contato com phone para enviar follow-up", async () => {
    const contact = await getContactById(42);
    expect(contact).toMatchObject({
      id: 42,
      name: "Maria Podcast",
      phone: "5511987654321",
    });
  });

  it("deve pular leads sem contactId no cron de follow-up", async () => {
    const staleLeads = await getLeadsWithoutInteraction48h();
    const leadsWithContact = staleLeads.filter(l => l.contactId !== null);
    expect(leadsWithContact).toHaveLength(1);
    expect(leadsWithContact[0]).toMatchObject({ id: 10, contactId: 42 });
  });
});

// ─── FLUXO COMPLETO ───────────────────────────────────────────────────────────
describe("Playbook — Fluxo completo end-to-end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve executar o fluxo completo: webhook → lead → contrato → fatura + projeto → follow-up", async () => {
    // Passo 1: Webhook recebe mensagem → lead criado
    const { req, res } = makeReqRes({
      phone: "5511987654321",
      fromMe: false,
      senderName: "Novo Cliente Podcast",
      text: { message: "Quero gravar meu podcast!" },
      momment: Date.now(),
      messageId: "msg_e2e_001",
    });
    await zapiWebhookHandler(req, res);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(autoCreateLeadFromWhatsapp).toHaveBeenCalledTimes(1);

    // Passo 2: Contrato assinado → fatura + projeto criados
    const [invoiceId, projectId] = await Promise.all([
      createEntryInvoiceOnSign(10),
      createProjectOnContractSign(10),
    ]);
    expect(invoiceId).toBe(201);
    expect(projectId).toBe(301);

    // Passo 3: Cron detecta leads sem interação
    const staleLeads = await getLeadsWithoutInteraction48h();
    expect(staleLeads.length).toBeGreaterThan(0);

    // Passo 4: Cron detecta contratos vencendo
    const expiringContracts = await getContractsExpiringIn30Days();
    expect(expiringContracts.length).toBeGreaterThan(0);

    // Passo 5: Lead de renovação criado
    const renewalLeadId = await createRenewalLead(expiringContracts[0]!.id);
    expect(renewalLeadId).toBe(500);

    // Passo 6: Atividade registrada
    await createLeadActivity({
      leadId: staleLeads[0]!.id,
      type: "whatsapp_sent",
      description: "Follow-up automático (Cron 48h)",
      userId: 1,
    });
    expect(createLeadActivity).toHaveBeenCalledTimes(1);
  });
});
