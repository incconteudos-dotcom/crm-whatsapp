import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
});

/**
 * Cria ou recupera um Stripe Customer para o usuário.
 */
export async function getOrCreateStripeCustomer(params: {
  stripeCustomerId?: string | null;
  email?: string | null;
  name?: string | null;
  userId: number;
}): Promise<string> {
  if (params.stripeCustomerId) {
    return params.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: params.email ?? undefined,
    name: params.name ?? undefined,
    metadata: { userId: params.userId.toString() },
  });

  return customer.id;
}

/**
 * Sincroniza um produto do CRM com o Stripe Products + Prices.
 *
 * Regras:
 * - Se não existe stripeProductId → cria produto + price no Stripe
 * - Se existe stripeProductId mas o nome/descrição mudou → atualiza o produto no Stripe
 * - Se o preço mudou → arquiva o price antigo e cria um novo price
 * - Se active=false → arquiva o produto no Stripe
 *
 * Retorna { stripeProductId, stripePriceId } para salvar no banco.
 */
export async function syncProductToStripe(params: {
  crmProductId: number;
  name: string;
  description?: string | null;
  unitPrice: string; // valor em BRL (ex: "800.00")
  currency?: string | null;
  category?: string | null;
  active: boolean;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
}): Promise<{ stripeProductId: string; stripePriceId: string }> {
  const currency = (params.currency ?? "BRL").toLowerCase();
  const unitAmountCents = Math.round(parseFloat(params.unitPrice) * 100);

  // ── 1. Criar ou atualizar o Stripe Product ──────────────────────────────
  let stripeProductId = params.stripeProductId;

  if (!stripeProductId) {
    // Produto novo → criar no Stripe
    const product = await stripe.products.create({
      name: params.name,
      description: params.description ?? undefined,
      active: params.active,
      metadata: {
        crm_product_id: params.crmProductId.toString(),
        category: params.category ?? "",
      },
    });
    stripeProductId = product.id;
    console.log(`[Stripe] Product created: ${stripeProductId} for CRM product ${params.crmProductId}`);
  } else {
    // Produto existente → atualizar nome/descrição/status
    await stripe.products.update(stripeProductId, {
      name: params.name,
      description: params.description ?? undefined,
      active: params.active,
      metadata: {
        crm_product_id: params.crmProductId.toString(),
        category: params.category ?? "",
      },
    });
    console.log(`[Stripe] Product updated: ${stripeProductId}`);
  }

  // ── 2. Criar ou atualizar o Stripe Price ────────────────────────────────
  let stripePriceId = params.stripePriceId;

  if (stripePriceId) {
    // Verificar se o preço mudou
    try {
      const existingPrice = await stripe.prices.retrieve(stripePriceId);
      const priceChanged = existingPrice.unit_amount !== unitAmountCents ||
        existingPrice.currency !== currency;

      if (priceChanged) {
        // Arquivar price antigo (Stripe não permite editar preços)
        await stripe.prices.update(stripePriceId, { active: false });
        console.log(`[Stripe] Price archived: ${stripePriceId} (price changed)`);
        stripePriceId = null; // Forçar criação de novo price
      }
    } catch {
      // Price não encontrado → criar novo
      stripePriceId = null;
    }
  }

  if (!stripePriceId) {
    // Criar novo price
    const price = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: unitAmountCents,
      currency,
      metadata: {
        crm_product_id: params.crmProductId.toString(),
      },
    });
    stripePriceId = price.id;
    console.log(`[Stripe] Price created: ${stripePriceId} (${unitAmountCents} ${currency})`);
  }

  return { stripeProductId, stripePriceId };
}

/**
 * Cria uma Checkout Session para compra direta de um produto do catálogo.
 * Usa o priceId do Stripe para garantir consistência com o catálogo.
 */
export async function createProductCheckoutSession(params: {
  crmProductId: number;
  productName: string;
  stripePriceId: string;
  quantity?: number;
  customerEmail?: string | null;
  customerName?: string | null;
  stripeCustomerId?: string | null;
  userId: number;
  origin: string;
}): Promise<{ url: string; sessionId: string }> {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: params.stripeCustomerId ?? undefined,
    customer_email: !params.stripeCustomerId ? (params.customerEmail ?? undefined) : undefined,
    allow_promotion_codes: true,
    client_reference_id: params.userId.toString(),
    metadata: {
      crm_product_id: params.crmProductId.toString(),
      user_id: params.userId.toString(),
      customer_email: params.customerEmail ?? "",
      customer_name: params.customerName ?? "",
    },
    line_items: [
      {
        price: params.stripePriceId,
        quantity: params.quantity ?? 1,
      },
    ],
    success_url: `${params.origin}/products?payment=success&product=${params.crmProductId}`,
    cancel_url: `${params.origin}/products?payment=cancelled&product=${params.crmProductId}`,
  });

  return { url: session.url!, sessionId: session.id };
}

/**
 * Cria uma Checkout Session para pagamento de fatura.
 * Suporta pagamento integral ou parcela (50%/50%).
 */
export async function createInvoiceCheckoutSession(params: {
  invoiceId: number;
  invoiceNumber: string;
  description: string;
  amountCents: number; // valor em centavos BRL
  customerEmail?: string | null;
  customerName?: string | null;
  stripeCustomerId?: string | null;
  userId: number;
  origin: string;
  installmentLabel?: string; // ex: "Parcela 1/2 (50%)"
}): Promise<{ url: string; sessionId: string }> {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: params.stripeCustomerId ?? undefined,
    customer_email: !params.stripeCustomerId ? (params.customerEmail ?? undefined) : undefined,
    allow_promotion_codes: true,
    client_reference_id: params.userId.toString(),
    metadata: {
      invoice_id: params.invoiceId.toString(),
      invoice_number: params.invoiceNumber,
      user_id: params.userId.toString(),
      customer_email: params.customerEmail ?? "",
      customer_name: params.customerName ?? "",
    },
    line_items: [
      {
        price_data: {
          currency: "brl",
          unit_amount: params.amountCents,
          product_data: {
            name: params.installmentLabel
              ? `${params.invoiceNumber} — ${params.installmentLabel}`
              : params.invoiceNumber,
            description: params.description,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${params.origin}/invoices?payment=success&invoice=${params.invoiceId}`,
    cancel_url: `${params.origin}/invoices?payment=cancelled&invoice=${params.invoiceId}`,
  });

  return { url: session.url!, sessionId: session.id };
}

/**
 * Cria duas Checkout Sessions para plano 50%/50%.
 * Retorna URLs para parcela 1 (entrada) e parcela 2 (saldo).
 */
export async function createSplitPaymentSessions(params: {
  invoiceId: number;
  invoiceNumber: string;
  description: string;
  totalAmountCents: number;
  customerEmail?: string | null;
  customerName?: string | null;
  stripeCustomerId?: string | null;
  userId: number;
  origin: string;
}) {
  const half = Math.round(params.totalAmountCents / 2);
  const remainder = params.totalAmountCents - half;

  const [session1, session2] = await Promise.all([
    createInvoiceCheckoutSession({
      ...params,
      amountCents: half,
      installmentLabel: "Parcela 1/2 — Entrada (50%)",
    }),
    createInvoiceCheckoutSession({
      ...params,
      amountCents: remainder,
      installmentLabel: "Parcela 2/2 — Saldo (50%)",
    }),
  ]);

  return { session1, session2 };
}
