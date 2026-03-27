import type { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "./stripe";
import { getDb } from "../db";
import { invoices, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) {
    console.warn("[Stripe Webhook] checkout.session.completed: no invoice_id in metadata");
    return;
  }

  const db = await getDb();
  if (!db) return;

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

  console.log(
    `[Stripe Webhook] Invoice ${invoiceId} marked as paid. Session: ${session.id}`
  );
}
