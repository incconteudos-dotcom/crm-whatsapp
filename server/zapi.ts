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
  method: "GET" | "POST" | "DELETE" | "PATCH" | "PUT",
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
  error?: string;
}

export interface ZApiMessageResult {
  zaapId: string;
  messageId: string;
}

// Real Z-API /chats response shape (verified against live API)
export interface ZApiChatRaw {
  phone: string;
  name?: string;
  lastMessageTime?: string;
  messagesUnread?: string;
  unread?: string;
  isGroup?: boolean;
  lid?: string;
  pinned?: string;
  archived?: string;
  isMuted?: string;
  isMarkedSpam?: string;
  isGroupAnnouncement?: boolean;
  profileThumbnail?: string;
}

// Normalised shape used internally
export interface ZApiChat {
  phone: string;
  name?: string;
  lastMessage?: string;
  lastMessageTimestamp?: number;
  unreadMessages?: number;
  isGroup?: boolean;
  profilePicture?: string;
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
}

export interface ZApiMessage {
  messageId: string;
  phone: string;
  fromMe: boolean;
  text?: { message: string };
  document?: { fileName: string; url: string };
  image?: { url: string; caption?: string };
  audio?: { url: string };
  video?: { url: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string };
  sticker?: { url: string };
  reaction?: { value: string; reactionMessageId: string };
  timestamp: number;
  senderName?: string;
  status?: string;
  isDeleted?: boolean;
}

export interface ZApiContact {
  phone: string;
  name?: string;
  short?: string;
  notify?: string;
  vname?: string;
  profilePicture?: string;
  isMyContact?: boolean;
  isWAContact?: boolean;
}

export interface ZApiGroup {
  phone: string;
  name: string;
  description?: string;
  participants?: number;
  profilePicture?: string;
  isAdmin?: boolean;
  createdAt?: number;
}

export interface ZApiQRCode {
  value?: string;
  connected?: boolean;
}

export interface ZApiCellphone {
  phone?: string;
  platform?: string;
  pushName?: string;
}

// ─── INSTANCE ────────────────────────────────────────────────────────────────

export async function getQRCode(): Promise<ZApiQRCode> {
  try {
    return await zapiRequest<ZApiQRCode>("GET", "/qr-code/image");
  } catch {
    return {};
  }
}

export async function restartInstance(): Promise<{ success: boolean }> {
  try {
    await zapiRequest("GET", "/restart");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function disconnectInstance(): Promise<{ success: boolean }> {
  try {
    await zapiRequest("DELETE", "/disconnect");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getCellphoneData(): Promise<ZApiCellphone> {
  try {
    return await zapiRequest<ZApiCellphone>("GET", "/cell-phones");
  } catch {
    return {};
  }
}

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

export async function sendAudio(phone: string, audioUrl: string): Promise<ZApiMessageResult> {
  const normalized = normalizePhone(phone);
  return zapiRequest<ZApiMessageResult>("POST", "/send-audio", { phone: normalized, audio: audioUrl });
}

export async function sendVideo(phone: string, videoUrl: string, caption?: string): Promise<ZApiMessageResult> {
  const normalized = normalizePhone(phone);
  return zapiRequest<ZApiMessageResult>("POST", "/send-video", { phone: normalized, video: videoUrl, caption });
}

export async function sendLocation(
  phone: string, latitude: number, longitude: number, name?: string, address?: string
): Promise<ZApiMessageResult> {
  const normalized = normalizePhone(phone);
  return zapiRequest<ZApiMessageResult>("POST", "/send-location", {
    phone: normalized, lat: latitude, lng: longitude, name: name ?? "", address: address ?? "",
  });
}

export async function sendLink(
  phone: string, message: string, linkUrl: string, title?: string, description?: string, imageUrl?: string
): Promise<ZApiMessageResult> {
  const normalized = normalizePhone(phone);
  return zapiRequest<ZApiMessageResult>("POST", "/send-link", {
    phone: normalized, message, image: imageUrl ?? "", linkUrl, title: title ?? "", linkDescription: description ?? "",
  });
}

export async function sendReaction(phone: string, messageId: string, reaction: string): Promise<ZApiMessageResult> {
  const normalized = normalizePhone(phone);
  return zapiRequest<ZApiMessageResult>("POST", "/send-reaction", { phone: normalized, messageId, reaction });
}

export async function sendPoll(
  phone: string, name: string, options: string[], selectableCount?: number
): Promise<ZApiMessageResult> {
  const normalized = normalizePhone(phone);
  return zapiRequest<ZApiMessageResult>("POST", "/send-poll", {
    phone: normalized, name, values: options, selectableCount: selectableCount ?? 1,
  });
}

export async function deleteMessage(phone: string, messageId: string, owner: boolean = true): Promise<{ success: boolean }> {
  try {
    const normalized = normalizePhone(phone);
    await zapiRequest("DELETE", "/messages", { phone: normalized, messageId, owner });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function replyMessage(phone: string, message: string, messageId: string): Promise<ZApiMessageResult> {
  const normalized = normalizePhone(phone);
  return zapiRequest<ZApiMessageResult>("POST", "/send-text", { phone: normalized, message, messageId });
}

/**
 * Send a plain text message
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

export async function getChats(page: number = 0, pageSize: number = 50): Promise<ZApiChat[]> {
  try {
    const raw = await zapiRequest<ZApiChatRaw[] | { value: ZApiChatRaw[] }>(
      "GET",
      `/chats?page=${page}&pageSize=${pageSize}`
    );
    const rawArray: ZApiChatRaw[] = Array.isArray(raw)
      ? raw
      : (raw && typeof raw === "object" && "value" in raw ? (raw as { value: ZApiChatRaw[] }).value : []);

    // Normalise: filter out items without a phone, convert string fields to proper types
    return rawArray
      .filter((c) => !!c.phone)
      .map((c) => ({
        phone: c.phone,
        name: c.name,
        lastMessageTimestamp: c.lastMessageTime ? parseInt(c.lastMessageTime, 10) : undefined,
        unreadMessages: c.messagesUnread ? parseInt(c.messagesUnread, 10) : (c.unread ? parseInt(c.unread, 10) : 0),
        isGroup: c.isGroup ?? false,
        profilePicture: c.profileThumbnail,
        pinned: c.pinned === "1",
        archived: c.archived === "1",
        muted: c.isMuted === "1",
      }));
  } catch {
    return [];
  }
}

/**
 * NOTE: Z-API does NOT provide a historical message retrieval endpoint.
 * Messages can only be captured in real-time via the webhook (on-message-received).
 * This function is intentionally removed to prevent misleading empty-array calls.
 * All message history is built by persisting webhook events to the database.
 */

export async function readChat(phone: string): Promise<{ success: boolean }> {
  try {
    const normalized = normalizePhone(phone);
    await zapiRequest("POST", "/read-message", { phone: normalized, messageId: "all" });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function archiveChat(phone: string, archive: boolean = true): Promise<{ success: boolean }> {
  try {
    const normalized = normalizePhone(phone);
    const endpoint = archive ? "/archive-chat" : "/unarchive-chat";
    await zapiRequest("POST", endpoint, { phone: normalized });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function pinChat(phone: string, pin: boolean = true): Promise<{ success: boolean }> {
  try {
    const normalized = normalizePhone(phone);
    const endpoint = pin ? "/pin-chat" : "/unpin-chat";
    await zapiRequest("POST", endpoint, { phone: normalized });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function muteChat(phone: string, mute: boolean = true, duration?: number): Promise<{ success: boolean }> {
  try {
    const normalized = normalizePhone(phone);
    if (mute) {
      await zapiRequest("POST", "/mute-chat", { phone: normalized, time: duration ?? 0 });
    } else {
      await zapiRequest("POST", "/unmute-chat", { phone: normalized });
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function clearChat(phone: string): Promise<{ success: boolean }> {
  try {
    const normalized = normalizePhone(phone);
    await zapiRequest("POST", "/clear-chat", { phone: normalized });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteChat(phone: string): Promise<{ success: boolean }> {
  try {
    const normalized = normalizePhone(phone);
    await zapiRequest("DELETE", "/chat", { phone: normalized });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getTotalUnread(): Promise<number> {
  try {
    const data = await zapiRequest<{ value: number } | number>("GET", "/unread-messages");
    if (typeof data === "number") return data;
    if (data && typeof data === "object" && "value" in data) return (data as { value: number }).value;
    return 0;
  } catch {
    return 0;
  }
}

// ─── CONTACTS ────────────────────────────────────────────────────────────────

export async function getContacts(page: number = 0, pageSize: number = 100): Promise<ZApiContact[]> {
  try {
    const raw = await zapiRequest<ZApiContact[] | { value: ZApiContact[] }>(
      "GET", `/contacts?page=${page}&pageSize=${pageSize}`
    );
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && "value" in raw) return (raw as { value: ZApiContact[] }).value;
    return [];
  } catch {
    return [];
  }
}

export async function getContactInfo(phone: string): Promise<ZApiContact | null> {
  try {
    const normalized = normalizePhone(phone);
    const data = await zapiRequest<ZApiContact>("GET", `/contacts/${normalized}`);
    return data;
  } catch {
    return null;
  }
}

export async function checkNumberExists(phone: string): Promise<{ exists: boolean; phone?: string }> {
  try {
    const normalized = normalizePhone(phone);
    const data = await zapiRequest<{ exists: boolean; phone?: string }>("GET", `/phone-exists/${normalized}`);
    return data;
  } catch {
    return { exists: false };
  }
}

export async function getProfilePicture(phone: string): Promise<string | null> {
  try {
    const normalized = normalizePhone(phone);
    const data = await zapiRequest<{ profileThumbnailUrl?: string; value?: string }>("GET", `/profile-picture/${normalized}`);
    return data?.profileThumbnailUrl ?? data?.value ?? null;
  } catch {
    return null;
  }
}

// ─── GROUPS ──────────────────────────────────────────────────────────────────

export async function getGroups(): Promise<ZApiGroup[]> {
  try {
    const raw = await zapiRequest<ZApiGroup[] | { value: ZApiGroup[] }>("GET", "/groups");
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && "value" in raw) return (raw as { value: ZApiGroup[] }).value;
    return [];
  } catch {
    return [];
  }
}

export async function getGroupInfo(groupId: string): Promise<ZApiGroup | null> {
  try {
    const data = await zapiRequest<ZApiGroup>("GET", `/groups/${groupId}`);
    return data;
  } catch {
    return null;
  }
}

// ─── WEBHOOK ─────────────────────────────────────────────────────────────────

/**
 * Update the webhook URL for receiving messages.
 * Z-API docs: PUT /update-webhook-received
 * Also registers the "sent by me" delivery webhook so outgoing messages are captured.
 */
export async function setWebhookUrl(webhookUrl: string): Promise<void> {
  // Register webhook for incoming messages (PUT — not POST)
  await zapiRequest("PUT", "/update-webhook-received", {
    value: webhookUrl,
  });
  // Also register webhook for messages sent FROM the connected number
  // This ensures the CRM captures outgoing messages as well
  try {
    await zapiRequest("PUT", "/update-webhook-received-delivery", {
      value: webhookUrl,
    });
  } catch {
    // Non-fatal: some plans may not support this endpoint
    console.warn("[Z-API] Could not register sent-by-me webhook (non-fatal)");
  }
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
