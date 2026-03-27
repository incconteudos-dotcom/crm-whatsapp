/**
 * Z-API WhatsApp Client
 * Handles all communication with Z-API REST endpoints
 * Docs: https://developer.z-api.io/en/
 */

const ZAPI_BASE = "https://api.z-api.io";

function getCredentials() {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  if (!instanceId || !token) {
    throw new Error("ZAPI_INSTANCE_ID and ZAPI_TOKEN must be set");
  }
  return { instanceId, token, clientToken };
}

function buildUrl(path: string): string {
  const { instanceId, token } = getCredentials();
  return `${ZAPI_BASE}/instances/${instanceId}/token/${token}${path}`;
}

async function zapiRequest<T = unknown>(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<T> {
  const url = buildUrl(path);
  const { clientToken } = getCredentials();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Z-API ${method} ${path} failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ZApiStatus {
  connected: boolean;
  smartphoneConnected?: boolean;
  session?: string;
  phone?: string;
}

export interface ZApiMessageResult {
  zaapId: string;
  messageId: string;
}

export interface ZApiChat {
  phone: string;
  name?: string;
  lastMessage?: string;
  lastMessageTimestamp?: number;
  unreadMessages?: number;
  isGroup?: boolean;
  profilePicture?: string;
}

export interface ZApiMessage {
  messageId: string;
  phone: string;
  fromMe: boolean;
  text?: { message: string };
  document?: { fileName: string; url: string };
  image?: { url: string; caption?: string };
  audio?: { url: string };
  timestamp: number;
  senderName?: string;
  status?: string;
}

// ─── INSTANCE ────────────────────────────────────────────────────────────────

/**
 * Get instance connection status
 */
export async function getInstanceStatus(): Promise<ZApiStatus> {
  try {
    const data = await zapiRequest<{ connected: boolean; smartphoneConnected?: boolean; session?: string; phone?: string }>(
      "GET",
      "/status"
    );
    return data;
  } catch {
    return { connected: false };
  }
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────

/**
 * Send a plain text message
 * @param phone - Phone number in format DDI DDD NUMBER (e.g. 5511999999999)
 * @param message - Text message content
 */
export async function sendText(
  phone: string,
  message: string
): Promise<ZApiMessageResult> {
  // Normalize phone: remove non-digits, ensure country code
  const normalized = normalizePhone(phone);
  return zapiRequest<ZApiMessageResult>("POST", "/send-text", {
    phone: normalized,
    message,
  });
}

/**
 * Send a document (PDF, etc.) by URL
 * @param phone - Phone number
 * @param documentUrl - Public URL of the document
 * @param fileName - Display name for the file
 * @param extension - File extension (e.g. "pdf")
 */
export async function sendDocument(
  phone: string,
  documentUrl: string,
  fileName: string,
  extension: string = "pdf"
): Promise<ZApiMessageResult> {
  const normalized = normalizePhone(phone);
  return zapiRequest<ZApiMessageResult>("POST", `/send-document/${extension}`, {
    phone: normalized,
    document: documentUrl,
    fileName,
  });
}

/**
 * Send an image by URL
 */
export async function sendImage(
  phone: string,
  imageUrl: string,
  caption?: string
): Promise<ZApiMessageResult> {
  const normalized = normalizePhone(phone);
  return zapiRequest<ZApiMessageResult>("POST", "/send-image", {
    phone: normalized,
    image: imageUrl,
    caption,
  });
}

// ─── CHATS ────────────────────────────────────────────────────────────────────

/**
 * Get list of recent chats
 */
export async function getChats(page: number = 0, pageSize: number = 50): Promise<ZApiChat[]> {
  try {
    const data = await zapiRequest<ZApiChat[] | { value: ZApiChat[] }>(
      "GET",
      `/chats?page=${page}&pageSize=${pageSize}`
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "value" in data) return (data as { value: ZApiChat[] }).value;
    return [];
  } catch {
    return [];
  }
}

/**
 * Get messages from a specific chat
 */
export async function getChatMessages(
  phone: string,
  page: number = 0,
  pageSize: number = 50
): Promise<ZApiMessage[]> {
  try {
    const normalized = normalizePhone(phone);
    const data = await zapiRequest<ZApiMessage[] | { value: ZApiMessage[] }>(
      "GET",
      `/chat-messages/${normalized}?page=${page}&pageSize=${pageSize}`
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "value" in data) return (data as { value: ZApiMessage[] }).value;
    return [];
  } catch {
    return [];
  }
}

// ─── WEBHOOK ─────────────────────────────────────────────────────────────────

/**
 * Update the webhook URL for receiving messages
 */
export async function setWebhookUrl(webhookUrl: string): Promise<void> {
  await zapiRequest("POST", "/update-webhook-received", {
    value: webhookUrl,
  });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Normalize phone number: strip non-digits, ensure Brazilian DDI if missing
 * Input: "+55 (11) 99999-9999" → Output: "5511999999999"
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // If starts with 55 and has 12-13 digits, it's already correct
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // If 10-11 digits, assume Brazilian number without country code
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

/**
 * Format phone for display: "5511999999999" → "+55 (11) 99999-9999"
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length === 13) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.startsWith("55") && digits.length === 12) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return phone;
}
