/**
 * Tests for Z-API webhook handler
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  upsertWhatsappChat: vi.fn().mockResolvedValue(undefined),
  upsertWhatsappMessage: vi.fn().mockResolvedValue(undefined),
  getWhatsappChats: vi.fn().mockResolvedValue([]),
  linkChatToContact: vi.fn().mockResolvedValue(undefined),
}));

import { zapiWebhookHandler } from "./zapiWebhook";
import * as db from "./db";
import type { Request, Response } from "express";

function makeReqRes(body: unknown) {
  const req = { body } as Request;
  const res = {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return { req, res };
}

describe("zapiWebhookHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responds with { received: true } immediately", async () => {
    const { req, res } = makeReqRes({ phone: "5511999999999", text: { message: "Olá" } });
    await zapiWebhookHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("ignores payloads without a phone field", async () => {
    const { req, res } = makeReqRes({ type: "status" });
    await zapiWebhookHandler(req, res);
    expect(db.upsertWhatsappChat).not.toHaveBeenCalled();
    expect(db.upsertWhatsappMessage).not.toHaveBeenCalled();
  });

  it("upserts chat and message for an incoming text message", async () => {
    const { req, res } = makeReqRes({
      phone: "5511999999999",
      fromMe: false,
      chatName: "João Silva",
      senderName: "João Silva",
      text: { message: "Oi, tudo bem?" },
      momment: 1700000000000,
      messageId: "msg_abc123",
    });
    await zapiWebhookHandler(req, res);
    expect(db.upsertWhatsappChat).toHaveBeenCalledWith(
      expect.objectContaining({
        jid: "5511999999999",
        name: "João Silva",
        unreadCount: 1,
        isGroup: false,
      })
    );
    expect(db.upsertWhatsappMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: "msg_abc123",
        chatJid: "5511999999999",
        content: "Oi, tudo bem?",
        isFromMe: false,
        senderName: "João Silva",
        mediaType: "text",
      })
    );
  });

  it("extracts image content correctly", async () => {
    const { req, res } = makeReqRes({
      phone: "5511888888888",
      fromMe: false,
      image: { imageUrl: "https://example.com/img.jpg", caption: "Foto do produto" },
      momment: 1700000001000,
      messageId: "msg_img001",
    });
    await zapiWebhookHandler(req, res);
    expect(db.upsertWhatsappMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "[Imagem] Foto do produto",
        mediaType: "image",
        mediaUrl: "https://example.com/img.jpg",
      })
    );
  });

  it("extracts document content correctly", async () => {
    const { req, res } = makeReqRes({
      phone: "5511777777777",
      fromMe: true,
      document: { documentUrl: "https://cdn.example.com/fatura.pdf", fileName: "Fatura-001.pdf" },
      momment: 1700000002000,
      messageId: "msg_doc001",
    });
    await zapiWebhookHandler(req, res);
    expect(db.upsertWhatsappMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "[Documento] Fatura-001.pdf",
        mediaType: "document",
        mediaUrl: "https://cdn.example.com/fatura.pdf",
        isFromMe: true,
      })
    );
  });

  it("handles audio messages", async () => {
    const { req, res } = makeReqRes({
      phone: "5511666666666",
      fromMe: false,
      audio: { audioUrl: "https://cdn.example.com/audio.ogg" },
      momment: 1700000003000,
      messageId: "msg_audio001",
    });
    await zapiWebhookHandler(req, res);
    expect(db.upsertWhatsappMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "[Áudio]",
        mediaType: "audio",
      })
    );
  });
});
