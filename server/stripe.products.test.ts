/**
 * Testes para sincronização automática de produtos com Stripe.
 * Cobre: syncProductToStripe, createProductCheckoutSession.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted garante que os mocks são criados antes dos imports ─────────────
const { mockStripe } = vi.hoisted(() => {
  const mockStripe = {
    products: {
      create: vi.fn(),
      update: vi.fn(),
    },
    prices: {
      create: vi.fn(),
      update: vi.fn(),
      retrieve: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  };
  return { mockStripe };
});

vi.mock("stripe", () => ({
  default: vi.fn(() => mockStripe),
}));

vi.mock("../drizzle/schema", () => ({
  users: {},
  products: {},
}));

// ── Importar após mocks ───────────────────────────────────────────────────────
import { syncProductToStripe, createProductCheckoutSession } from "./stripe/stripe";

describe("syncProductToStripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_key";
  });

  it("cria produto e price no Stripe quando nao existe stripeProductId", async () => {
    mockStripe.products.create.mockResolvedValue({ id: "prod_NEW123" });
    mockStripe.prices.create.mockResolvedValue({ id: "price_NEW456" });

    const result = await syncProductToStripe({
      crmProductId: 1,
      name: "Gravacao de Episodio",
      description: "Gravacao completa de episodio de podcast",
      unitPrice: "800.00",
      currency: "BRL",
      category: "episode",
      active: true,
      stripeProductId: null,
      stripePriceId: null,
    });

    expect(mockStripe.products.create).toHaveBeenCalledWith({
      name: "Gravacao de Episodio",
      description: "Gravacao completa de episodio de podcast",
      active: true,
      metadata: { crm_product_id: "1", category: "episode" },
    });

    expect(mockStripe.prices.create).toHaveBeenCalledWith({
      product: "prod_NEW123",
      unit_amount: 80000,
      currency: "brl",
      metadata: { crm_product_id: "1" },
    });

    expect(result).toEqual({
      stripeProductId: "prod_NEW123",
      stripePriceId: "price_NEW456",
    });
  });

  it("atualiza produto existente sem criar novo price quando preco nao mudou", async () => {
    mockStripe.products.update.mockResolvedValue({ id: "prod_EXIST" });
    mockStripe.prices.retrieve.mockResolvedValue({
      id: "price_EXIST",
      unit_amount: 50000,
      currency: "brl",
    });

    const result = await syncProductToStripe({
      crmProductId: 2,
      name: "Pacote Mensal",
      description: "Pacote mensal de gravacoes",
      unitPrice: "500.00",
      currency: "BRL",
      category: "package",
      active: true,
      stripeProductId: "prod_EXIST",
      stripePriceId: "price_EXIST",
    });

    expect(mockStripe.products.update).toHaveBeenCalledWith("prod_EXIST", {
      name: "Pacote Mensal",
      description: "Pacote mensal de gravacoes",
      active: true,
      metadata: { crm_product_id: "2", category: "package" },
    });

    expect(mockStripe.prices.create).not.toHaveBeenCalled();
    expect(mockStripe.prices.update).not.toHaveBeenCalled();

    expect(result).toEqual({
      stripeProductId: "prod_EXIST",
      stripePriceId: "price_EXIST",
    });
  });

  it("arquiva price antigo e cria novo quando preco muda", async () => {
    mockStripe.products.update.mockResolvedValue({ id: "prod_EXIST" });
    mockStripe.prices.retrieve.mockResolvedValue({
      id: "price_OLD",
      unit_amount: 50000,
      currency: "brl",
    });
    mockStripe.prices.update.mockResolvedValue({ id: "price_OLD", active: false });
    mockStripe.prices.create.mockResolvedValue({ id: "price_NEW" });

    const result = await syncProductToStripe({
      crmProductId: 2,
      name: "Pacote Mensal",
      description: "Pacote mensal de gravacoes",
      unitPrice: "600.00",
      currency: "BRL",
      category: "package",
      active: true,
      stripeProductId: "prod_EXIST",
      stripePriceId: "price_OLD",
    });

    expect(mockStripe.prices.update).toHaveBeenCalledWith("price_OLD", { active: false });
    expect(mockStripe.prices.create).toHaveBeenCalledWith({
      product: "prod_EXIST",
      unit_amount: 60000,
      currency: "brl",
      metadata: { crm_product_id: "2" },
    });
    expect(result.stripePriceId).toBe("price_NEW");
  });

  it("arquiva produto no Stripe quando active=false", async () => {
    mockStripe.products.update.mockResolvedValue({ id: "prod_EXIST" });
    mockStripe.prices.retrieve.mockResolvedValue({
      id: "price_EXIST",
      unit_amount: 50000,
      currency: "brl",
    });

    await syncProductToStripe({
      crmProductId: 3,
      name: "Produto Inativo",
      description: null,
      unitPrice: "500.00",
      currency: "BRL",
      category: "service",
      active: false,
      stripeProductId: "prod_EXIST",
      stripePriceId: "price_EXIST",
    });

    expect(mockStripe.products.update).toHaveBeenCalledWith("prod_EXIST", expect.objectContaining({
      active: false,
    }));
  });

  it("converte corretamente valores decimais para centavos", async () => {
    mockStripe.products.create.mockResolvedValue({ id: "prod_X" });
    mockStripe.prices.create.mockResolvedValue({ id: "price_X" });

    await syncProductToStripe({
      crmProductId: 4,
      name: "Servico",
      description: null,
      unitPrice: "1234.56",
      currency: "BRL",
      category: "service",
      active: true,
      stripeProductId: null,
      stripePriceId: null,
    });

    expect(mockStripe.prices.create).toHaveBeenCalledWith(expect.objectContaining({
      unit_amount: 123456,
    }));
  });

  it("cria novo price quando price antigo nao existe no Stripe", async () => {
    mockStripe.products.update.mockResolvedValue({ id: "prod_EXIST" });
    mockStripe.prices.retrieve.mockRejectedValue(new Error("No such price"));
    mockStripe.prices.create.mockResolvedValue({ id: "price_RECOVERED" });

    const result = await syncProductToStripe({
      crmProductId: 5,
      name: "Produto Recuperado",
      description: null,
      unitPrice: "300.00",
      currency: "BRL",
      category: "service",
      active: true,
      stripeProductId: "prod_EXIST",
      stripePriceId: "price_GHOST",
    });

    expect(mockStripe.prices.create).toHaveBeenCalled();
    expect(result.stripePriceId).toBe("price_RECOVERED");
  });
});

describe("createProductCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_key";
  });

  it("cria checkout session com priceId do Stripe", async () => {
    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test_abc123",
      id: "cs_test_abc123",
    });

    const result = await createProductCheckoutSession({
      crmProductId: 1,
      productName: "Gravacao de Episodio",
      stripePriceId: "price_ABC123",
      quantity: 1,
      customerEmail: "cliente@email.com",
      customerName: "Joao Silva",
      stripeCustomerId: "cus_XYZ",
      userId: 42,
      origin: "https://app.example.com",
    });

    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        customer: "cus_XYZ",
        allow_promotion_codes: true,
        client_reference_id: "42",
        line_items: [{ price: "price_ABC123", quantity: 1 }],
        success_url: "https://app.example.com/products?payment=success&product=1",
        cancel_url: "https://app.example.com/products?payment=cancelled&product=1",
      })
    );

    expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_abc123");
    expect(result.sessionId).toBe("cs_test_abc123");
  });

  it("usa customer_email quando nao ha stripeCustomerId", async () => {
    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test_xyz",
      id: "cs_test_xyz",
    });

    await createProductCheckoutSession({
      crmProductId: 2,
      productName: "Pacote",
      stripePriceId: "price_PKG",
      quantity: 2,
      customerEmail: "novo@email.com",
      customerName: "Maria",
      stripeCustomerId: null,
      userId: 99,
      origin: "https://app.example.com",
    });

    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: undefined,
        customer_email: "novo@email.com",
        line_items: [{ price: "price_PKG", quantity: 2 }],
      })
    );
  });
});
