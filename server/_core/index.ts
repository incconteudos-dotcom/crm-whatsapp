import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { stripeWebhookHandler } from "../stripe/webhook";
import { webhookHandler } from "../whatsapp/webhookHandler";
import { registerSSEClient } from "../whatsapp/sseManager";
import { registerWebhooks } from "../whatsapp/zapiClient";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Stripe webhook — raw body BEFORE express.json()
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

  // Body parsers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── WhatsApp webhook ────────────────────────────────────────────────────────
  // Z-API POSTs here when a message is sent or received
  app.post("/api/whatsapp/webhook", webhookHandler);
  app.post("/api/zapi/webhook", webhookHandler); // legacy path kept for backward compat

  // ── SSE endpoint — real-time push to browser clients ───────────────────────
  app.get("/api/whatsapp/events", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) { res.status(401).end(); return; }
      registerSSEClient(user.id, req, res);
    } catch {
      res.status(401).end();
    }
  });

  // OAuth
  registerOAuthRoutes(app);

  // tRPC
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  // Static / Vite
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} busy, using ${port}`);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Auto-register webhooks with Z-API on startup
    const base = process.env.ZAPI_WEBHOOK_BASE_URL;
    if (base && process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN) {
      registerWebhooks(base)
        .then(() => console.log(`[Z-API] Webhooks registrados → ${base}/api/whatsapp/webhook`))
        .catch((err: Error) => console.warn("[Z-API] Webhook registration failed:", err.message));
    } else {
      console.log("[Z-API] ZAPI_WEBHOOK_BASE_URL not set — register webhook manually.");
    }
  });
}

startServer().catch(console.error);
