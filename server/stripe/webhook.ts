import type { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "./stripe";
import { getDb } from "../db";
import { invoices, users, products } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("[Stripe Webhook] Missing signature or secret");
    return res.status(400).json({ error: "Missing signature" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Event: ${event.type} | ID: ${event.id}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] PaymentIntent succeeded: ${paymentIntent.id}`);
        // BUG-08 FIX: Se o payment_intent tem invoice_id nos metadados, garantir que paidAt está definido
        if (paymentIntent.metadata?.invoice_id) {
          const db = await getDb();
          if (db) {
            await db.update(invoices)
              .set({ paidAt: new Date(), stripePaymentIntentId: paymentIntent.id })
              .where(eq(invoices.id, parseInt(paymentIntent.metadata.invoice_id)));
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        // BUG-03 FIX: Tratar falha de pagamento — notificar owner
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const invoiceId = paymentIntent.metadata?.invoice_id;
        const customerEmail = paymentIntent.metadata?.customer_email ?? "desconhecido";
        const amount = paymentIntent.amount ? `R$ ${(paymentIntent.amount / 100).toFixed(2)}` : "valor desconhecido";
        console.warn(`[Stripe Webhook] PaymentIntent FAILED: ${paymentIntent.id} | Invoice: ${invoiceId ?? "N/A"}`);
        await notifyOwner({
          title: "⚠️ Pagamento Falhou no Stripe",
          content: `Falha no pagamento de ${amount} do cliente ${customerEmail}. PaymentIntent: ${paymentIntent.id}${invoiceId ? ` | Fatura #${invoiceId}` : ""}. Motivo: ${paymentIntent.last_payment_error?.message ?? "desconhecido"}`,
        }).catch(() => {});
        break;
      }

      case "customer.created": {
        const customer = event.data.object as Stripe.Customer;
        const userId = customer.metadata?.userId;
        if (userId) {
          const db = await getDb();
          if (db) {
            await db
              .update(users)
              .set({ stripeCustomerId: customer.id })
              .where(eq(users.id, parseInt(userId)));
            console.log(`[Stripe Webhook] Customer ${customer.id} linked to user ${userId}`);
          }
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing event ${event.type}:`, err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }

  return res.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const db = await getDb();
  if (!db) return;

  const invoiceId = session.metadata?.invoice_id;
  const crmProductId = session.metadata?.crm_product_id;

  // BUG-03 FIX: Tratar checkout de fatura
  if (invoiceId) {
    // BUG-08 FIX: Sempre definir paidAt ao marcar como paid
    await db
      .update(invoices)
      .set({
        status: "paid",
        paidAt: new Date(),
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      })
      .where(eq(invoices.id, parseInt(invoiceId)));

    console.log(`[Stripe Webhook] ✅ Invoice ${invoiceId} marked as paid. Session: ${session.id}`);

    // Notificar owner sobre pagamento recebido
    const amount = session.amount_total ? `R$ ${(session.amount_total / 100).toFixed(2)}` : "valor desconhecido";
    const customerEmail = session.customer_email ?? session.metadata?.customer_email ?? "desconhecido";
    await notifyOwner({
      title: "💰 Pagamento Recebido",
      content: `Fatura #${invoiceId} paga com sucesso! Valor: ${amount}. Cliente: ${customerEmail}. Session: ${session.id}`,
    }).catch(() => {});
    return;
  }

  // BUG-03 FIX: Tratar checkout de produto do catálogo
  if (crmProductId) {
    console.log(`[Stripe Webhook] ✅ Product checkout completed: crm_product_id=${crmProductId}. Session: ${session.id}`);

    // Registrar a venda do produto no banco (log de transação)
    try {
      const amount = session.amount_total ? session.amount_total / 100 : 0;
      const customerEmail = session.customer_email ?? session.metadata?.customer_email ?? "desconhecido";
      const customerName = session.metadata?.customer_name ?? "desconhecido";
      const userId = session.metadata?.user_id;

      // Buscar produto para log
      const [product] = await db.select({ name: products.name }).from(products)
        .where(eq(products.id, parseInt(crmProductId))).limit(1);

      // Registrar transação de crédito/compra se userId disponível
      if (userId) {
        await db.execute(
          sql`INSERT INTO credit_transactions (userId, type, amount, description, referenceId, referenceType) VALUES (${parseInt(userId)}, ${'credit'}, ${amount}, ${`Compra: ${product?.name ?? `Produto #${crmProductId}`}`}, ${session.id}, ${'stripe_checkout'})`
        );
      }

      // Notificar owner sobre venda de produto
      await notifyOwner({
        title: "🛒 Produto Vendido",
        content: `Produto "${product?.name ?? `#${crmProductId}`}" vendido! Valor: R$ ${amount.toFixed(2)}. Cliente: ${customerName} (${customerEmail}). Session: ${session.id}`,
      }).catch(() => {});

      console.log(`[Stripe Webhook] ✅ Product sale recorded: ${product?.name ?? crmProductId} | ${customerEmail} | R$ ${amount.toFixed(2)}`);
    } catch (err) {
      console.error("[Stripe Webhook] Error recording product sale:", err);
    }
    return;
  }

  // Checkout sem invoice_id nem crm_product_id — apenas logar
  console.warn(`[Stripe Webhook] checkout.session.completed: no invoice_id or crm_product_id in metadata. Session: ${session.id}`);
}
