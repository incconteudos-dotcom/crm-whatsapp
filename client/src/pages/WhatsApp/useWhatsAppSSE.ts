/**
 * useWhatsAppSSE — Server-Sent Events hook for real-time WhatsApp updates.
 *
 * Replaces the 3-second polling intervals with server-push events.
 * The server broadcasts events immediately when Z-API webhook fires.
 *
 * Usage:
 *   const { connected } = useWhatsAppSSE({
 *     onMessage: (msg) => { ... },
 *     onChatUpdated: (chat) => { ... },
 *   });
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface SSEMessage {
  messageId: string;
  chatJid: string;
  content: string;
  mediaType: string;
  mediaUrl?: string;
  isFromMe: boolean;
  senderName?: string;
  timestamp: number;
  chatName?: string;
  isGroup?: boolean;
}

export interface SSEChatUpdate {
  jid: string;
  name?: string;
  lastMessageAt: number;
  lastMessagePreview?: string;
  unreadCount: number;
  isGroup?: boolean;
}

interface UseWhatsAppSSEOptions {
  enabled?: boolean;
  onMessage?: (msg: SSEMessage) => void;
  onChatUpdated?: (chat: SSEChatUpdate) => void;
  onConnectionChange?: (connected: boolean) => void;
}

const SSE_URL = "/api/whatsapp/events";
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWhatsAppSSE(options: UseWhatsAppSSEOptions = {}) {
  const { enabled = true, onMessage, onChatUpdated, onConnectionChange } = options;
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const attemptsRef = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const stableOnMessage = useRef(onMessage);
  const stableOnChatUpdated = useRef(onChatUpdated);
  const stableOnConnectionChange = useRef(onConnectionChange);
  stableOnMessage.current = onMessage;
  stableOnChatUpdated.current = onChatUpdated;
  stableOnConnectionChange.current = onConnectionChange;

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    // Cleanup existing connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource(SSE_URL, { withCredentials: true });
    esRef.current = es;

    es.addEventListener("connection", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data.status === "connected") {
          attemptsRef.current = 0;
          setConnected(true);
          stableOnConnectionChange.current?.(true);
        }
      } catch { /* ignore */ }
    });

    es.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse((e as MessageEvent).data) as SSEMessage;
        stableOnMessage.current?.(msg);
      } catch { /* ignore */ }
    });

    es.addEventListener("chat_updated", (e) => {
      try {
        const chat = JSON.parse((e as MessageEvent).data) as SSEChatUpdate;
        stableOnChatUpdated.current?.(chat);
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setConnected(false);
      stableOnConnectionChange.current?.(false);

      if (!mountedRef.current) return;

      attemptsRef.current++;
      if (attemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
        console.warn("[SSE] Max reconnect attempts reached. Giving up.");
        return;
      }

      const delay = Math.min(RECONNECT_DELAY_MS * attemptsRef.current, 30_000);
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setConnected(false);
    };
  }, [enabled, connect]);

  return { connected };
}
