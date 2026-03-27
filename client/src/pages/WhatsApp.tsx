import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Search, Send, RefreshCw, Sparkles,
  Users, Phone, MoreVertical, Paperclip, Smile, ChevronDown
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Streamdown } from "streamdown";

export default function WhatsApp() {
  const { user } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialChat = params.get("chat");

  const [selectedChat, setSelectedChat] = useState<string | null>(initialChat);
  const [message, setMessage] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisType, setAnalysisType] = useState<"summary" | "sentiment" | "opportunities" | "action_items">("summary");
  const [analysisResult, setAnalysisResult] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chats, isLoading: chatsLoading, refetch: refetchChats } = trpc.whatsapp.chats.useQuery();
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = trpc.whatsapp.messages.useQuery(
    { chatJid: selectedChat ?? "", limit: 100 },
    { enabled: !!selectedChat }
  );

  const sendMutation = trpc.whatsapp.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchMessages();
    },
    onError: (e) => toast.error(e.message),
  });

  const syncMutation = trpc.whatsapp.syncChats.useMutation({
    onSuccess: (data) => {
      toast.info(data.message);
      refetchChats();
    },
  });

  const analyzeMutation = trpc.whatsapp.analyzeConversation.useMutation({
    onSuccess: (data) => {
      const text = typeof data.analysis === 'string' ? data.analysis : String(data.analysis);
      setAnalysisResult(text);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredChats = chats?.filter((c) =>
    !chatSearch || (c.name ?? c.jid).toLowerCase().includes(chatSearch.toLowerCase())
  );

  const selectedChatData = chats?.find((c) => c.jid === selectedChat);

  const handleSend = () => {
    if (!message.trim() || !selectedChat) return;
    sendMutation.mutate({ chatJid: selectedChat, message: message.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAnalyze = () => {
    if (!selectedChat) return;
    setAnalysisResult("");
    analyzeMutation.mutate({ chatJid: selectedChat, analysisType });
  };

  return (
    <CRMLayout>
      <div className="flex h-full">
        {/* Chat list */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-400" />
                WhatsApp
              </h2>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Sincronizar conversas"
              >
                <RefreshCw className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="w-full bg-input border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chatsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-muted rounded-full shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-2.5 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredChats && filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <button
                  key={chat.jid}
                  onClick={() => setSelectedChat(chat.jid)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 text-left hover:bg-accent transition-colors border-b border-border/50",
                    selectedChat === chat.jid && "bg-accent"
                  )}
                >
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                    {chat.isGroup ? (
                      <Users className="w-5 h-5 text-green-400" />
                    ) : (
                      <span className="text-sm font-semibold text-green-400">
                        {(chat.name ?? "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{chat.name ?? chat.jid}</p>
                      {chat.lastMessageAt && (
                        <span className="text-xs text-muted-foreground shrink-0 ml-1">
                          {format(new Date(chat.lastMessageAt), "HH:mm")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {chat.lastMessagePreview ?? "Sem mensagens"}
                    </p>
                  </div>
                  {(chat.unreadCount ?? 0) > 0 && (
                    <span className="w-5 h-5 bg-green-500 rounded-full text-xs text-white flex items-center justify-center shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure o WhatsApp MCP e sincronize
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => syncMutation.mutate()}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Sincronizar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-400">
                      {(selectedChatData?.name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedChatData?.name ?? selectedChat}</p>
                    <p className="text-xs text-muted-foreground">{selectedChat}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAnalysisOpen(true)}
                    className="text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                    Analisar com IA
                  </Button>
                  <button className="text-muted-foreground hover:text-foreground transition-colors p-1.5">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.isFromMe;
                    return (
                      <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[70%] px-4 py-2.5", isMe ? "chat-bubble-me" : "chat-bubble-other")}>
                          {/* CRM user identifier */}
                          {isMe && msg.crmUserName && (
                            <p className="text-xs text-primary/80 font-semibold mb-1">[{msg.crmUserName}]</p>
                          )}
                          {!isMe && msg.senderName && (
                            <p className="text-xs text-green-400/80 font-semibold mb-1">{msg.senderName}</p>
                          )}
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={cn("text-xs mt-1", isMe ? "text-primary-foreground/50 text-right" : "text-muted-foreground")}>
                            {msg.timestamp ? format(new Date(msg.timestamp), "HH:mm") : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">Envie a primeira mensagem</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex items-end gap-3">
                  <div className="flex-1 bg-input border border-border rounded-xl px-4 py-2.5">
                    <div className="text-xs text-primary/70 mb-1 font-medium">
                      [{user?.name ?? "Você"}]:
                    </div>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                      className="min-h-0 h-auto resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
                      rows={1}
                    />
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    size="icon"
                    className="h-10 w-10 rounded-xl shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  A mensagem será enviada com o prefixo <span className="text-primary">[{user?.name}]:</span> para identificação
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">WhatsApp CRM</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Selecione uma conversa para visualizar as mensagens. Todas as mensagens enviadas incluirão automaticamente a identificação do usuário.
              </p>
              <div className="mt-6 p-4 bg-card border border-border rounded-xl text-left max-w-sm">
                <p className="text-xs font-semibold text-muted-foreground mb-2">COMO FUNCIONA</p>
                <p className="text-xs text-muted-foreground">
                  Ao enviar uma mensagem, ela será automaticamente prefixada com <span className="text-primary font-medium">[{user?.name}]:</span> para que o destinatário saiba qual membro da equipe está respondendo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Análise de Conversa com IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Tipo de análise</label>
              <Select value={analysisType} onValueChange={(v) => setAnalysisType(v as typeof analysisType)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Resumo Executivo</SelectItem>
                  <SelectItem value="sentiment">Análise de Sentimento</SelectItem>
                  <SelectItem value="opportunities">Oportunidades de Negócio</SelectItem>
                  <SelectItem value="action_items">Itens de Ação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="w-full"
            >
              {analyzeMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analisar Conversa
                </>
              )}
            </Button>
            {analysisResult && (
              <div className="bg-background border border-border rounded-xl p-4 max-h-80 overflow-y-auto">
                <Streamdown>{analysisResult}</Streamdown>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
