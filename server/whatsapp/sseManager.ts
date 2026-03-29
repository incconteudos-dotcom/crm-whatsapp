/**
 * SSE Manager — Server-Sent Events para WhatsApp em tempo real
 *
 * Substitui o polling a cada 3s. O servidor empurra eventos imediatamente
 * quando uma nova mensagem chega via webhook Z-API.
 *
 * Cada usuário autenticado recebe um stream SSE persistente.
 * O webhook publica para TODOS os clientes conectados (shared instance).
 */

import type { Request, Response } from "express";

type SSEClient = {
  userId: number;
  res: Response;
};

type SSEEvent =
  | { type: "message"; data: Record<string, unknown> }
  | { type: "chat_updated"; data: Record<string, unknown> }
  | { type: "connection"; data: { status: "connected" | "disconnected" } }
  | { type: "ping" };

// In-memory registry of connected SSE clients
const clients = new Map<string, SSEClient>();

function clientKey(userId: number, connectionId: string) {
  return `${userId}:${connectionId}`;
}

/**
 * Register a new SSE connection for a user.
 * Called from the /api/whatsapp/events endpoint.
 */
export function registerSSEClient(userId: number, req: Request, res: Response): string {
  const connectionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const key = clientKey(userId, connectionId);

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  // Send initial connection event
  sendToClient(res, { type: "connection", data: { status: "connected" } });

  clients.set(key, { userId, res });
  console.log(`[SSE] Client connected: userId=${userId} key=${key} total=${clients.size}`);

  // Heartbeat every 25s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      sendToClient(res, { type: "ping" });
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  // Cleanup on disconnect
  const cleanup = () => {
    clearInterval(heartbeat);
    clients.delete(key);
    console.log(`[SSE] Client disconnected: key=${key} total=${clients.size}`);
  };

  req.on("close", cleanup);
  req.on("error", cleanup);
  res.on("error", cleanup);

  return connectionId;
}

/**
 * Broadcast an event to all connected SSE clients.
 * Used by the webhook handler when a new message arrives.
 */
export function broadcastToAll(event: SSEEvent): void {
  let sent = 0;
  const dead: string[] = [];

  for (const [key, client] of clients) {
    try {
      sendToClient(client.res, event);
      sent++;
    } catch {
      dead.push(key);
    }
  }

  // Remove dead connections
  for (const key of dead) clients.delete(key);

  if (sent > 0) {
    console.log(`[SSE] Broadcast ${event.type} to ${sent} client(s)`);
  }
}

/**
 * Broadcast to a specific user only.
 */
export function broadcastToUser(userId: number, event: SSEEvent): void {
  for (const [, client] of clients) {
    if (client.userId === userId) {
      try {
        sendToClient(client.res, event);
      } catch {
        // ignore — heartbeat will clean up
      }
    }
  }
}

function sendToClient(res: Response, event: SSEEvent): void {
  if (event.type === "ping") {
    res.write(": ping\n\n");
  } else {
    const payload = "data" in event ? JSON.stringify(event.data) : "{}";
    res.write(`event: ${event.type}\ndata: ${payload}\n\n`);
  }
  // Flush buffer for Node.js streams
  if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
    (res as unknown as { flush: () => void }).flush();
  }
}

export function getConnectedClientCount(): number {
  return clients.size;
}
