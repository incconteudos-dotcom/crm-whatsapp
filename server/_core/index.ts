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
import { zapiWebhookHandler } from "../zapiWebhook";
import { setWebhookUrl } from "../zapi";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Stripe webhook MUST be registered BEFORE express.json() to allow raw body access
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
  // Configure body parser BEFORE other routes so req.body is available
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Z-API webhook — receives real-time WhatsApp events (needs express.json() to parse req.body)
  app.post("/api/zapi/webhook", zapiWebhookHandler);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Auto-register Z-API webhook so messages are captured from the start
    const zapiWebhookBase = process.env.ZAPI_WEBHOOK_BASE_URL;
    if (zapiWebhookBase && process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN) {
      const webhookUrl = `${zapiWebhookBase.replace(/\/$/, "")}/api/zapi/webhook`;
      setWebhookUrl(webhookUrl)
        .then(() => console.log(`[Z-API] Webhook registrado: ${webhookUrl}`))
        .catch((err) => console.warn("[Z-API] Não foi possível registrar webhook automaticamente:", err.message));
    } else {
      console.log("[Z-API] ZAPI_WEBHOOK_BASE_URL não definido — registre o webhook manualmente pelo painel.");
    }
  });
}

startServer().catch(console.error);
