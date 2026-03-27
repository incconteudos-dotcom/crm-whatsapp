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
