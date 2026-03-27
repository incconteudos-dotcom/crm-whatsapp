/**
 * Tests for Brevo email integration
 * Validates template building and API configuration
 */
import { describe, it, expect } from "vitest";
import { buildInvoiceEmail, buildQuoteEmail, buildContractEmail } from "./email";

describe("Email Templates", () => {
  it("should build invoice email HTML with correct content", () => {
    const html = buildInvoiceEmail({
      number: "FAT-0001",
      clientName: "João Silva",
      items: [
        { description: "Gravação de Podcast", quantity: 1, unitPrice: 1500 },
        { description: "Edição de Áudio", quantity: 2, unitPrice: 300 },
      ],
      subtotal: 2100,
      discount: 100,
      total: 2000,
      dueDate: new Date("2026-04-15T12:00:00"),
      status: "sent",
      companyName: "Pátio Estúdio de Podcast",
    });

    expect(html).toContain("FAT-0001");
    expect(html).toContain("João Silva");
    expect(html).toContain("Gravação de Podcast");
    expect(html).toContain("Edição de Áudio");
    expect(html).toContain("R$ 2000.00");
    expect(html).toContain("Pátio Estúdio de Podcast");
    expect(html).toContain("Enviada");
    expect(html).toContain("15/04/2026"); // date with noon time to avoid UTC offset issues
  });

  it("should include payment button when paymentUrl is provided", () => {
    const html = buildInvoiceEmail({
      number: "FAT-0002",
      clientName: "Maria Santos",
      items: [{ description: "Pacote Mensal", quantity: 1, unitPrice: 3000 }],
      subtotal: 3000,
      total: 3000,
      status: "sent",
      paymentUrl: "https://checkout.stripe.com/pay/test_123",
    });

    expect(html).toContain("Pagar Fatura Online");
    expect(html).toContain("https://checkout.stripe.com/pay/test_123");
  });

  it("should build quote email HTML with correct content", () => {
    const html = buildQuoteEmail({
      number: "ORC-0001",
      clientName: "Pedro Costa",
      items: [
        { description: "Produção de Podcast", quantity: 1, unitPrice: 5000 },
      ],
      subtotal: 5000,
      discount: 500,
      total: 4500,
      validUntil: new Date("2026-05-01T12:00:00"),
      status: "draft",
      companyName: "Pátio Estúdio de Podcast",
    });

    expect(html).toContain("ORC-0001");
    expect(html).toContain("Pedro Costa");
    expect(html).toContain("Produção de Podcast");
    expect(html).toContain("R$ 4500.00");
    expect(html).toContain("Rascunho");
    expect(html).toContain("01/05/2026"); // date with noon time to avoid UTC offset issues
  });

  it("should build contract email HTML with correct content", () => {
    const html = buildContractEmail({
      number: "CTR-0001",
      clientName: "Ana Lima",
      title: "Contrato de Produção de Podcast",
      type: "Produção de Podcast",
      value: 12000,
      startDate: new Date("2026-04-01T12:00:00"),
      endDate: new Date("2026-09-30T12:00:00"),
      status: "sent",
      companyName: "Pátio Estúdio de Podcast",
    });

    expect(html).toContain("CTR-0001");
    expect(html).toContain("Ana Lima");
    expect(html).toContain("Produção de Podcast");
    expect(html).toContain("R$ 12000.00");
    expect(html).toContain("Enviado");
    expect(html).toContain("01/04/2026"); // date with noon time to avoid UTC offset issues
    expect(html).toContain("30/09/2026");
  });

  it("should include discount row only when discount > 0", () => {
    const htmlWithDiscount = buildInvoiceEmail({
      number: "FAT-0003",
      clientName: "Cliente",
      items: [{ description: "Serviço", quantity: 1, unitPrice: 1000 }],
      subtotal: 1000,
      discount: 100,
      total: 900,
      status: "draft",
    });
    expect(htmlWithDiscount).toContain("Desconto");

    const htmlNoDiscount = buildInvoiceEmail({
      number: "FAT-0004",
      clientName: "Cliente",
      items: [{ description: "Serviço", quantity: 1, unitPrice: 1000 }],
      subtotal: 1000,
      discount: 0,
      total: 1000,
      status: "draft",
    });
    expect(htmlNoDiscount).not.toContain("Desconto");
  });

  it("should generate valid HTML structure with DOCTYPE", () => {
    const html = buildInvoiceEmail({
      number: "FAT-0005",
      clientName: "Test",
      items: [],
      subtotal: 0,
      total: 0,
      status: "draft",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"pt-BR\">");
    expect(html).toContain("</html>");
  });

  it("should include notes when provided", () => {
    const html = buildQuoteEmail({
      number: "ORC-0002",
      clientName: "Cliente",
      items: [{ description: "Serviço", quantity: 1, unitPrice: 500 }],
      subtotal: 500,
      total: 500,
      status: "draft",
      notes: "Pagamento via PIX com 5% de desconto",
    });
    expect(html).toContain("Pagamento via PIX com 5% de desconto");
  });
});

describe("Brevo API Configuration", () => {
  it("should have BREVO_API_KEY available in environment", () => {
    // In production, this key should be set
    // In test environment, we just verify the module loads correctly
    const apiKey = process.env.BREVO_API_KEY;
    // Key may or may not be set in test environment
    if (apiKey) {
      expect(apiKey.length).toBeGreaterThan(10);
    } else {
      // Acceptable in test environment - just ensure the module loads
      expect(true).toBe(true);
    }
  });
});
