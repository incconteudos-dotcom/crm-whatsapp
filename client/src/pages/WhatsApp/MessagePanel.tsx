/**
 * MessagePanel — Main chat view with message history and input.
 *
 * Features:
 * - Messages from DB + live SSE appended in real-time
 * - Input with template support
 * - Quick message bar (QuickMessageBar)
 * - Media send support (image, audio, video, document)
 * - Reply to specific message
 * - Agent attribution on every outgoing message
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Send, Image, Mic, Video, FileText, MapPin, Link2,
  Reply, Trash2, X, ChevronLeft, MoreVertical, Sparkles,
  Users, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Streamdown } from "streamdown";
import { QuickMessageBar } from "./QuickMessageBar";
import type { SSEMessage } from "./useWhatsAppSSE";

interface MessagePanelProps {
  chatJid: string;
  chatName: string;
  isGroup: boolean;
  contactId?: number | null;
  leadId?: number | null;
  onBack?: () => void;
  onOpenContactPanel?: () => void;
  liveMessages: SSEMessage[];
}

type SendMode = "text" | "image" | "audio" | "video" | "document" | "location" | "link";

export function MessagePanel({
  chatJid,
  chatName,
  isGroup,
  contactId,
  leadId,
  onBack,
  onOpenContactPanel,
  liveMessages,
}: MessagePanelProps) {
  const [message, setMessage] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>("text");
  const [replyTo, setReplyTo] = useState<{ messageId: string; text: string } | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisType, setAnalysisType] = useState<"summary" | "sentiment" | "opportunities" | "action_items">("summary");
  // Media fields
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Queries & Mutations ───────────────────────────────────────────────────

  const utils = trpc.useUtils();

  const { data: messages = [], isLoading, refetch } = trpc.whatsapp.messages.useQuery(
    { chatJid, limit: 150 },
    { enabled: !!chatJid, staleTime: 30_000 }
  );

  // Agent status for this chat
  const { data: agentStatus, refetch: refetchAgent } = trpc.whatsapp.agentStatus.useQuery(
    { chatJid },
    { enabled: !!chatJid }
  );

  const enableAgentMutation = trpc.whatsapp.enableAgent.useMutation({
    onSuccess: () => { refetchAgent(); toast.success("Agente IA ativado para esta conversa."); },
    onError: (e) => toast.error(e.message),
  });

  const disableAgentMutation = trpc.whatsapp.disableAgent.useMutation({
    onSuccess: () => { refetchAgent(); toast.success("Agente IA desativado."); },
    onError: (e) => toast.error(e.message),
  });

  const readChatMutation = trpc.whatsapp.readChat.useMutation({
    onSuccess: () => {
      // Invalidate totalUnread badge in sidebar
      utils.whatsapp.totalUnread.invalidate();
    },
  });

  const sendMutation = trpc.whatsapp.sendMessage.useMutation({
    onSuccess: (d) => {
      setMessage("");
      setReplyTo(null);
      if (d.zapiError) toast.warning(`Enviado localmente. Z-API: ${d.zapiError}`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const sendTemplateMutation = trpc.whatsapp.sendTemplate.useMutation({
    onSuccess: (d) => {
      setTemplatesOpen(false);
      if (d.zapiError) toast.warning(`Template enviado localmente. Z-API: ${d.zapiError}`);
      refetch();
      toast.success("Template enviado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendImageMutation = trpc.whatsapp.sendImage.useMutation({
    onSuccess: () => { toast.success("Imagem enviada!"); setMediaUrl(""); setMediaCaption(""); setSendMode("text"); },
    onError: (e) => toast.error(e.message),
  });

  const sendAudioMutation = trpc.whatsapp.sendAudio.useMutation({
    onSuccess: () => { toast.success("Áudio enviado!"); setMediaUrl(""); setSendMode("text"); },
    onError: (e) => toast.error(e.message),
  });

  const sendVideoMutation = trpc.whatsapp.sendVideo.useMutation({
    onSuccess: () => { toast.success("Vídeo enviado!"); setMediaUrl(""); setMediaCaption(""); setSendMode("text"); },
    onError: (e) => toast.error(e.message),
  });

  const sendDocMutation = trpc.whatsapp.sendDocument.useMutation({
    onSuccess: () => { toast.success("Documento enviado!"); setMediaUrl(""); setSendMode("text"); },
    onError: (e) => toast.error(e.message),
  });

  const sendLinkMutation = trpc.whatsapp.sendLink.useMutation({
    onSuccess: () => { toast.success("Link enviado!"); setLinkUrl(""); setLinkTitle(""); setMessage(""); setSendMode("text"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMsgMutation = trpc.whatsapp.deleteMessage.useMutation({
    onSuccess: () => { toast.success("Mensagem apagada."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const analyzeMutation = trpc.whatsapp.analyzeConversation.useMutation({
    onSuccess: (d) => setAnalysisResult(String(d.analysis)),
    onError: (e) => toast.error(e.message),
  });

  // ── Merge DB + SSE messages ───────────────────────────────────────────────

  const phone = chatJid.split("@")[0];

  const dbMessageIds = new Set(messages.map((m) => m.messageId));
  const newLive = liveMessages.filter(
    (m) => m.chatJid === chatJid && !dbMessageIds.has(m.messageId)
  );

  const allMessages = [
    ...messages,
    ...newLive.map((m) => ({
      id: 0,
      messageId: m.messageId,
      chatJid: m.chatJid,
      content: m.content,
      mediaType: m.mediaType as "text" | "image" | "video" | "audio" | "document" | "sticker",
      mediaUrl: m.mediaUrl ?? null,
      isFromMe: m.isFromMe,
      senderName: m.senderName ?? null,
      crmUserId: null,
      crmUserName: null,
      timestamp: m.timestamp,
      createdAt: new Date(m.timestamp),
      chatId: null,
      senderJid: null,
    })),
  ].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  // ── Auto-read when chat opens ─────────────────────────────────────────────
  useEffect(() => {
    if (!chatJid) return;
    // Debounce 1s so fast switching doesn't spam Z-API
    if (readTimerRef.current) clearTimeout(readTimerRef.current);
    readTimerRef.current = setTimeout(() => {
      readChatMutation.mutate({ phone: chatJid.split("@")[0] });
    }, 1000);
    return () => {
      if (readTimerRef.current) clearTimeout(readTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatJid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  // ── Send handlers ─────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (sendMode === "text") {
      if (!message.trim()) return;
      sendMutation.mutate({
        chatJid,
        message: message.trim(),
        replyToMessageId: replyTo?.messageId,
      });
    } else if (sendMode === "image") {
      if (!mediaUrl) return;
      sendImageMutation.mutate({ phone, imageUrl: mediaUrl, caption: mediaCaption });
    } else if (sendMode === "audio") {
      if (!mediaUrl) return;
      sendAudioMutation.mutate({ phone, audioUrl: mediaUrl });
    } else if (sendMode === "video") {
      if (!mediaUrl) return;
      sendVideoMutation.mutate({ phone, videoUrl: mediaUrl, caption: mediaCaption });
    } else if (sendMode === "document") {
      if (!mediaUrl) return;
      sendDocMutation.mutate({ phone, documentUrl: mediaUrl, fileName: mediaCaption || "documento.pdf" });
    } else if (sendMode === "link") {
      if (!linkUrl || !message.trim()) return;
      sendLinkMutation.mutate({ phone, message: message.trim(), linkUrl, title: linkTitle });
    }
  }, [sendMode, message, mediaUrl, mediaCaption, linkUrl, linkTitle, chatJid, phone, replyTo, sendMutation, sendImageMutation, sendAudioMutation, sendVideoMutation, sendDocMutation, sendLinkMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSending = sendMutation.isPending || sendImageMutation.isPending || sendAudioMutation.isPending || sendVideoMutation.isPending || sendDocMutation.isPending || sendLinkMutation.isPending;

  // ── Message bubble ────────────────────────────────────────────────────────

  const renderBubble = (msg: typeof allMessages[0]) => {
    const isMe = msg.isFromMe;
    const time = msg.timestamp
      ? format(new Date(msg.timestamp > 1e12 ? msg.timestamp : msg.timestamp * 1000), "HH:mm")
      : "";

    // Strip [AgentName]: prefix for display if present
    const rawContent = msg.content ?? "";
    const displayContent = rawContent.replace(/^\[([^\]]+)\]:\s/, "");
    const agentName = rawContent.match(/^\[([^\]]+)\]:/)?.[1];

    return (
      <div key={msg.messageId ?? msg.id} className={cn("flex group", isMe ? "justify-end" : "justify-start")}>
        <div className={cn(
          "max-w-[75%] sm:max-w-[65%] rounded-2xl px-3 py-2 relative",
          isMe
            ? "bg-green-600 text-white rounded-br-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm"
        )}>
          {/* Agent attribution */}
          {isMe && (agentName ?? msg.crmUserName) && (
            <p className="text-xs opacity-70 mb-0.5">{agentName ?? msg.crmUserName}</p>
          )}
          {/* Group sender */}
          {!isMe && isGroup && msg.senderName && (
            <p className="text-xs font-semibold text-green-400 mb-0.5">{msg.senderName}</p>
          )}

          {/* Content */}
          {msg.mediaType === "image" && msg.mediaUrl && (
            <img src={msg.mediaUrl} alt="imagem" className="rounded-lg max-w-full mb-1" />
          )}
          {msg.mediaType === "audio" && msg.mediaUrl && (
            <audio controls src={msg.mediaUrl} className="max-w-full mb-1" />
          )}
          {msg.mediaType === "video" && msg.mediaUrl && (
            <video controls src={msg.mediaUrl} className="rounded-lg max-w-full mb-1" />
          )}
          {msg.mediaType === "document" && msg.mediaUrl && (
            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs underline mb-1">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              {displayContent}
            </a>
          )}
          {(msg.mediaType === "text" || msg.mediaType === "sticker" || !msg.mediaType) && (
            <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-xs opacity-50">{time}</span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={() => setReplyTo({ messageId: msg.messageId ?? "", text: displayContent.slice(0, 60) })}
                className="p-0.5 rounded hover:bg-black/20"
                title="Responder"
              >
                <Reply className="w-3 h-3" />
              </button>
              {isMe && (
                <button
                  onClick={() => deleteMsgMutation.mutate({ phone, messageId: msg.messageId ?? "" })}
                  className="p-0.5 rounded hover:bg-black/20"
                  title="Apagar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border bg-card shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-1 rounded hover:bg-muted md:hidden">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
          isGroup ? "bg-blue-600" : "bg-green-600"
        )}>
          {isGroup ? <Users className="w-4 h-4" /> : chatName[0]?.toUpperCase() ?? "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-foreground truncate">{chatName}</p>
            {agentStatus?.enabled && (
              <span className="flex items-center gap-1 text-xs bg-purple-500/15 text-purple-500 border border-purple-500/30 rounded-full px-2 py-0.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                Agente IA
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">+{phone}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Agent toggle */}
          <button
            onClick={() => {
              if (agentStatus?.enabled) {
                disableAgentMutation.mutate({ chatJid });
              } else {
                enableAgentMutation.mutate({ chatJid });
              }
            }}
            disabled={enableAgentMutation.isPending || disableAgentMutation.isPending}
            className={cn(
              "p-1.5 rounded hover:bg-muted transition-colors",
              agentStatus?.enabled
                ? "text-purple-500 hover:text-purple-400"
                : "text-muted-foreground hover:text-purple-400"
            )}
            title={agentStatus?.enabled ? "Desativar agente IA" : "Ativar agente IA para esta conversa"}
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={() => { setAnalysisOpen(true); setAnalysisResult(""); }}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-purple-400"
            title="Análise IA da conversa"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {onOpenContactPanel && (
            <button onClick={onOpenContactPanel} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Contexto do contato">
              <Users className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <div className={cn("h-10 bg-muted animate-pulse rounded-2xl", i % 2 === 0 ? "w-48" : "w-32")} />
              </div>
            ))}
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Nenhuma mensagem ainda.</p>
            <p className="text-xs text-muted-foreground/70 max-w-xs">
              As mensagens chegam automaticamente via webhook Z-API. Troque uma mensagem pelo WhatsApp para ela aparecer aqui.
            </p>
          </div>
        ) : (
          allMessages.map(renderBubble)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 border-t border-border shrink-0">
          <Reply className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate flex-1">{replyTo.text}</span>
          <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick message bar */}
      <QuickMessageBar
        chatJid={chatJid}
        contactId={contactId ?? undefined}
        leadId={leadId ?? undefined}
        onPopulateInput={(text) => { setMessage(text); setSendMode("text"); textareaRef.current?.focus(); }}
        onSendDirect={(templateId) => sendTemplateMutation.mutate({ chatJid, templateId, contactId: contactId ?? undefined, leadId: leadId ?? undefined })}
        sending={sendTemplateMutation.isPending}
        expanded={templatesOpen}
        onToggle={() => setTemplatesOpen((v) => !v)}
      />

      {/* Media mode inputs */}
      {sendMode !== "text" && (
        <div className="border-t border-border bg-card p-3 space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground capitalize">{sendMode}:</span>
            <button onClick={() => setSendMode("text")} className="ml-auto p-1 hover:bg-muted rounded text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <Input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder={`URL do ${sendMode}...`}
            className="h-8 text-sm"
          />
          {(sendMode === "image" || sendMode === "video" || sendMode === "document") && (
            <Input
              value={mediaCaption}
              onChange={(e) => setMediaCaption(e.target.value)}
              placeholder={sendMode === "document" ? "Nome do arquivo..." : "Legenda (opcional)..."}
              className="h-8 text-sm"
            />
          )}
          {sendMode === "link" && (
            <>
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Texto da mensagem..." className="h-8 text-sm" />
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="URL do link..." className="h-8 text-sm" />
              <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Título do link (opcional)..." className="h-8 text-sm" />
            </>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border bg-card p-3 space-y-2 shrink-0">
        <div className="flex gap-2 items-end">
          {/* Media mode buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
                <Image className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem onClick={() => setSendMode("image")}><Image className="w-4 h-4 mr-2" /> Imagem</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSendMode("audio")}><Mic className="w-4 h-4 mr-2" /> Áudio</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSendMode("video")}><Video className="w-4 h-4 mr-2" /> Vídeo</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSendMode("document")}><FileText className="w-4 h-4 mr-2" /> Documento</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSendMode("link")}><Link2 className="w-4 h-4 mr-2" /> Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Text input */}
          {sendMode === "text" && (
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem... (Enter para enviar, Shift+Enter para nova linha)"
              className="min-h-[40px] max-h-32 resize-none text-sm flex-1"
              rows={1}
            />
          )}

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={isSending || (!message.trim() && !mediaUrl && sendMode === "text")}
            className="h-9 w-9 shrink-0 bg-green-600 hover:bg-green-700 p-0"
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* AI Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Análise IA da Conversa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {([
                { value: "summary", label: "Resumo" },
                { value: "sentiment", label: "Sentimento" },
                { value: "opportunities", label: "Oportunidades" },
                { value: "action_items", label: "Ações" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setAnalysisType(value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    analysisType === value
                      ? "bg-purple-600 text-white border-purple-600"
                      : "border-border text-muted-foreground hover:border-purple-600/50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              onClick={() => analyzeMutation.mutate({ chatJid, type: analysisType })}
              disabled={analyzeMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {analyzeMutation.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Analisar</>
              )}
            </Button>

            {analysisResult && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground max-h-64 overflow-y-auto">
                <Streamdown>{analysisResult}</Streamdown>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
