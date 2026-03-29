/**
 * Z-API Client
 * Handles all communication with Z-API REST endpoints.
 * Docs: https://developer.z-api.io/en/
 *
 * IMPORTANT: Z-API does NOT provide a historical message retrieval endpoint.
 * All message history must be captured in real-time via the webhook.
 */

const ZAPI_BASE = "https://api.z-api.io";

function getCredentials() {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  if (!instanceId || !token) {
    throw new Error("ZAPI_INSTANCE_ID and ZAPI_TOKEN must be set in .env");
  }
  return { instanceId, token, clientToken };
}

function buildUrl(path: string): string {
  const { instanceId, token } = getCredentials();
  return `${ZAPI_BASE}/instances/${instanceId}/token/${token}${path}`;
}

async function zapiRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
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
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Z-API ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

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

export interface ZApiChat {
  phone: string;
  name?: string;
  lastMessageTimestamp?: number;
  unreadMessages?: number;
  isGroup?: boolean;
  profilePicture?: string;
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
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

// ─── INSTANCE ─────────────────────────────────────────────────────────────────

export async function getInstanceStatus(): Promise<ZApiStatus> {
  try {
    return await zapiRequest<ZApiStatus>("GET", "/status");
  } catch {
    return { connected: false };
  }
}

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

// ─── CHATS ────────────────────────────────────────────────────────────────────

export async function getChats(page = 0, pageSize = 50): Promise<ZApiChat[]> {
  try {
    const raw = await zapiRequest<ZApiChatRaw[] | { value: ZApiChatRaw[] }>(
      "GET",
      `/chats?page=${page}&pageSize=${pageSize}`
    );
    const arr: ZApiChatRaw[] = Array.isArray(raw)
      ? raw
      : ((raw as { value?: ZApiChatRaw[] }).value ?? []);

    return arr
      .filter((c) => !!c.phone)
      .map((c) => ({
        phone: c.phone,
        name: c.name,
        lastMessageTimestamp: c.lastMessageTime ? parseInt(c.lastMessageTime, 10) : undefined,
        unreadMessages: c.unread ? parseInt(c.unread, 10) : 0,
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

export async function getAllChats(): Promise<ZApiChat[]> {
  const all: ZApiChat[] = [];
  let page = 0;
  while (true) {
    const batch = await getChats(page, 100);
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
    await new Promise((r) => setTimeout(r, 300)); // rate-limit friendly
  }
  return all;
}

export async function readChat(phone: string): Promise<void> {
  try {
    await zapiRequest("POST", "/read-message", { phone: normalizePhone(phone), messageId: "all" });
  } catch { /* non-fatal */ }
}

export async function archiveChat(phone: string, archive = true): Promise<void> {
  const endpoint = archive ? "/archive-chat" : "/unarchive-chat";
  await zapiRequest("POST", endpoint, { phone: normalizePhone(phone) });
}

export async function pinChat(phone: string, pin = true): Promise<void> {
  const endpoint = pin ? "/pin-chat" : "/unpin-chat";
  await zapiRequest("POST", endpoint, { phone: normalizePhone(phone) });
}

export async function muteChat(phone: string, mute = true, duration = 0): Promise<void> {
  if (mute) {
    await zapiRequest("POST", "/mute-chat", { phone: normalizePhone(phone), time: duration });
  } else {
    await zapiRequest("POST", "/unmute-chat", { phone: normalizePhone(phone) });
  }
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

export async function sendText(phone: string, message: string): Promise<ZApiMessageResult> {
  return zapiRequest<ZApiMessageResult>("POST", "/send-text", {
    phone: normalizePhone(phone),
    message,
  });
}

export async function sendImage(phone: string, imageUrl: string, caption?: string): Promise<ZApiMessageResult> {
  return zapiRequest<ZApiMessageResult>("POST", "/send-image", {
    phone: normalizePhone(phone),
    image: imageUrl,
    caption,
  });
}

export async function sendAudio(phone: string, audioUrl: string): Promise<ZApiMessageResult> {
  return zapiRequest<ZApiMessageResult>("POST", "/send-audio", {
    phone: normalizePhone(phone),
    audio: audioUrl,
  });
}

export async function sendVideo(phone: string, videoUrl: string, caption?: string): Promise<ZApiMessageResult> {
  return zapiRequest<ZApiMessageResult>("POST", "/send-video", {
    phone: normalizePhone(phone),
    video: videoUrl,
    caption,
  });
}

export async function sendDocument(
  phone: string,
  documentUrl: string,
  fileName: string,
  extension = "pdf"
): Promise<ZApiMessageResult> {
  return zapiRequest<ZApiMessageResult>("POST", `/send-document/${extension}`, {
    phone: normalizePhone(phone),
    document: documentUrl,
    fileName,
  });
}

export async function sendLocation(
  phone: string,
  latitude: number,
  longitude: number,
  name?: string,
  address?: string
): Promise<ZApiMessageResult> {
  return zapiRequest<ZApiMessageResult>("POST", "/send-location", {
    phone: normalizePhone(phone),
    lat: latitude,
    lng: longitude,
    name: name ?? "",
    address: address ?? "",
  });
}

export async function sendLink(
  phone: string,
  message: string,
  linkUrl: string,
  title?: string,
  description?: string,
  imageUrl?: string
): Promise<ZApiMessageResult> {
  return zapiRequest<ZApiMessageResult>("POST", "/send-link", {
    phone: normalizePhone(phone),
    message,
    image: imageUrl ?? "",
    linkUrl,
    title: title ?? "",
    linkDescription: description ?? "",
  });
}

export async function sendReaction(phone: string, messageId: string, reaction: string): Promise<ZApiMessageResult> {
  return zapiRequest<ZApiMessageResult>("POST", "/send-reaction", {
    phone: normalizePhone(phone),
    messageId,
    reaction,
  });
}

export async function sendPoll(
  phone: string,
  name: string,
  options: string[],
  selectableCount = 1
): Promise<ZApiMessageResult> {
  return zapiRequest<ZApiMessageResult>("POST", "/send-poll", {
    phone: normalizePhone(phone),
    name,
    values: options,
    selectableCount,
  });
}

export async function replyMessage(phone: string, message: string, messageId: string): Promise<ZApiMessageResult> {
  return zapiRequest<ZApiMessageResult>("POST", "/send-text", {
    phone: normalizePhone(phone),
    message,
    messageId,
  });
}

export async function deleteMessage(phone: string, messageId: string, owner = true): Promise<void> {
  await zapiRequest("DELETE", "/messages", { phone: normalizePhone(phone), messageId, owner });
}

// ─── CONTACTS ─────────────────────────────────────────────────────────────────

export async function getContacts(page = 0, pageSize = 100): Promise<ZApiContact[]> {
  try {
    const raw = await zapiRequest<ZApiContact[] | { value: ZApiContact[] }>(
      "GET",
      `/contacts?page=${page}&pageSize=${pageSize}`
    );
    if (Array.isArray(raw)) return raw;
    return (raw as { value?: ZApiContact[] }).value ?? [];
  } catch {
    return [];
  }
}

export async function checkNumberExists(phone: string): Promise<{ exists: boolean; phone?: string }> {
  try {
    return await zapiRequest<{ exists: boolean; phone?: string }>(
      "GET",
      `/phone-exists/${normalizePhone(phone)}`
    );
  } catch {
    return { exists: false };
  }
}

export async function getProfilePicture(phone: string): Promise<string | null> {
  try {
    const data = await zapiRequest<{ profileThumbnailUrl?: string; value?: string }>(
      "GET",
      `/profile-picture/${normalizePhone(phone)}`
    );
    return data?.profileThumbnailUrl ?? data?.value ?? null;
  } catch {
    return null;
  }
}

// ─── GROUPS ───────────────────────────────────────────────────────────────────

export async function getGroups(): Promise<ZApiGroup[]> {
  try {
    const raw = await zapiRequest<ZApiGroup[] | { value: ZApiGroup[] }>("GET", "/groups");
    if (Array.isArray(raw)) return raw;
    return (raw as { value?: ZApiGroup[] }).value ?? [];
  } catch {
    return [];
  }
}

export async function getGroupInfo(groupId: string): Promise<ZApiGroup | null> {
  try {
    return await zapiRequest<ZApiGroup>("GET", `/groups/${groupId}`);
  } catch {
    return null;
  }
}

// ─── WEBHOOKS ─────────────────────────────────────────────────────────────────

/**
 * Register webhook URLs on Z-API.
 * Must use PUT (not POST) per Z-API docs.
 * Registers both incoming and outgoing webhooks.
 */
export async function registerWebhooks(baseUrl: string): Promise<void> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/whatsapp/webhook`;

  // Incoming messages
  await zapiRequest("PUT", "/update-webhook-received", { value: url });

  // Outgoing messages (messages sent FROM the connected number)
  try {
    await zapiRequest("PUT", "/update-webhook-received-delivery", { value: url });
  } catch {
    console.warn("[Z-API] Could not register sent-by-me webhook (non-fatal)");
  }

  console.log(`[Z-API] Webhooks registered → ${url}`);
}

export async function getTotalUnread(): Promise<number> {
  try {
    const data = await zapiRequest<{ value: number } | number>("GET", "/unread-messages");
    if (typeof data === "number") return data;
    return (data as { value?: number }).value ?? 0;
  } catch {
    return 0;
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Normalize phone number to Z-API format (digits only, with country code).
 * "+55 (11) 99999-9999" → "5511999999999"
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

/**
 * Format phone for display.
 * "5511999999999" → "+55 (11) 99999-9999"
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

/**
 * Determine if a JID represents a group.
 */
export function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us") || jid.endsWith("-group") || jid.includes("@g.us");
}
