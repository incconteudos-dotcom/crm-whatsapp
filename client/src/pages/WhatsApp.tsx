import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Search, Send, RefreshCw, Sparkles,
  Users, MoreVertical, Wifi, WifiOff, CheckCircle2, AlertCircle,
  Image, Mic, Video, MapPin, Link2, BarChart2, Trash2,
  Archive, Pin, BellOff, Power, PowerOff, Smartphone, X, Reply,
  Phone, UserPlus, QrCode, Info,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Streamdown } from "streamdown";

type SendMode = "text" | "image" | "audio" | "video" | "location" | "link" | "poll";

export default function WhatsApp() {
  const { user } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialChat = params.get("chat");
  const [selectedChat, setSelectedChat] = useState<string | null>(initialChat);
  const [message, setMessage] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<"all" | "contacts" | "leads">("all");
  const [sendMode, setSendMode] = useState<SendMode>("text");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisType, setAnalysisType] = useState<"summary" | "sentiment" | "opportunities" | "action_items">("summary");
  const [analysisResult, setAnalysisResult] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationName, setLocationName] = useState("");
  const [pollName, setPollName] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [replyingTo, setReplyingTo] = useState<{ messageId: string; text: string } | null>(null);
  const [checkNumberInput, setCheckNumberInput] = useState("");
  const [checkNumberResult, setCheckNumberResult] = useState<{ exists: boolean; phone?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"chats" | "contacts" | "groups" | "status">("chats");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: instanceStatus, refetch: refetchStatus } = trpc.whatsapp.instanceStatus.useQuery(undefined, { refetchInterval: 30000 });
  const { data: cellphone } = trpc.whatsapp.cellphone.useQuery(undefined, { enabled: activeTab === "status" });
  const { data: qrCode } = trpc.whatsapp.qrCode.useQuery(undefined, {
    enabled: activeTab === "status" && instanceStatus?.connected === false,
    refetchInterval: 15000,
  });
  const { data: chats, isLoading: chatsLoading, refetch: refetchChats } = trpc.whatsapp.chats.useQuery();
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = trpc.whatsapp.messages.useQuery(
    { chatJid: selectedChat ?? "", limit: 100 },
    { enabled: selectedChat !== null && selectedChat !== "" }
  );
  const { data: zapiContacts, isLoading: contactsLoading } = trpc.whatsapp.zapiContacts.useQuery(undefined, { enabled: activeTab === "contacts" });
  const { data: groups, isLoading: groupsLoading } = trpc.whatsapp.groups.useQuery(undefined, { enabled: activeTab === "groups" });
  const utils = trpc.useUtils();

  const sendMutation = trpc.whatsapp.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessage("");
      setReplyingTo(null);
      refetchMessages();
      if (data.zapiError) toast.warning(data.zapiError);
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
  const sendLocationMutation = trpc.whatsapp.sendLocation.useMutation({
    onSuccess: () => { toast.success("Localização enviada!"); setLat(""); setLng(""); setLocationName(""); setSendMode("text"); },
    onError: (e) => toast.error(e.message),
  });
  const sendLinkMutation = trpc.whatsapp.sendLink.useMutation({
    onSuccess: () => { toast.success("Link enviado!"); setLinkUrl(""); setLinkTitle(""); setMessage(""); setSendMode("text"); },
    onError: (e) => toast.error(e.message),
  });
  const sendPollMutation = trpc.whatsapp.sendPoll.useMutation({
    onSuccess: () => { toast.success("Enquete enviada!"); setPollName(""); setPollOptions(["", ""]); setSendMode("text"); },
    onError: (e) => toast.error(e.message),
  });
  const replyMutation = trpc.whatsapp.replyMessage.useMutation({
    onSuccess: () => { setMessage(""); setReplyingTo(null); refetchMessages(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMsgMutation = trpc.whatsapp.deleteMessage.useMutation({
    onSuccess: () => { toast.success("Mensagem apagada."); refetchMessages(); },
    onError: (e) => toast.error(e.message),
  });
  const archiveMutation = trpc.whatsapp.archiveChat.useMutation({
    onSuccess: (_, v) => { toast.success(v.archive ? "Arquivado." : "Desarquivado."); refetchChats(); },
    onError: (e) => toast.error(e.message),
  });
  const pinMutation = trpc.whatsapp.pinChat.useMutation({
    onSuccess: (_, v) => { toast.success(v.pin ? "Fixado." : "Desafixado."); refetchChats(); },
    onError: (e) => toast.error(e.message),
  });
  const muteMutation = trpc.whatsapp.muteChat.useMutation({
    onSuccess: (_, v) => { toast.success(v.mute ? "Silenciado." : "Ativado."); refetchChats(); },
    onError: (e) => toast.error(e.message),
  });
  const clearChatMutation = trpc.whatsapp.clearChat.useMutation({
    onSuccess: () => { toast.success("Chat limpo."); refetchMessages(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteChatMutation = trpc.whatsapp.deleteChat.useMutation({
    onSuccess: () => { toast.success("Chat excluído."); setSelectedChat(null); refetchChats(); },
    onError: (e) => toast.error(e.message),
  });
  const readChatMutation = trpc.whatsapp.readChat.useMutation({
    onSuccess: () => utils.whatsapp.chats.invalidate(),
  });
  const syncMutation = trpc.whatsapp.syncChats.useMutation({
    onSuccess: (d) => { toast.success(d.message); refetchChats(); },
    onError: (e) => toast.error(e.message),
  });
  const syncAllChatsMutation = trpc.whatsapp.syncAllChats.useMutation({
    onSuccess: (d) => {
      toast.success(`${d.chatsSynced} conversas sincronizadas do Z-API!`);
      refetchChats();
    },
    onError: (e) => toast.error(e.message),
  });
  const syncChatMessagesMutation = trpc.whatsapp.syncChatMessages.useMutation({
    onSuccess: (d) => {
      toast.success(`${d.messagesSynced} mensagens sincronizadas!`);
      refetchMessages();
    },
    onError: (e) => toast.error(e.message),
  });
  const syncAllMessagesMutation = trpc.whatsapp.syncAllMessages.useMutation({
    onSuccess: (d) => {
      toast.success(`${d.totalMessages} mensagens de ${d.chatsProcessed} conversas sincronizadas!`);
      refetchChats();
      if (selectedChat) refetchMessages();
    },
    onError: (e) => toast.error(e.message),
  });
  const syncContactsMutation = trpc.whatsapp.syncZapiContacts.useMutation({
    onSuccess: (d) => toast.success(d.synced + " contatos importados."),
    onError: (e) => toast.error(e.message),
  });
  const restartMutation = trpc.whatsapp.restart.useMutation({
    onSuccess: () => { toast.success("Instância reiniciada."); refetchStatus(); },
    onError: (e) => toast.error(e.message),
  });
  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => { toast.success("Desconectado."); refetchStatus(); },
    onError: (e) => toast.error(e.message),
  });
  const analyzeMutation = trpc.whatsapp.analyzeConversation.useMutation({
    onSuccess: (d) => setAnalysisResult(String(d.analysis)),
    onError: (e) => toast.error(e.message),
  });
  const checkNumberQuery = trpc.whatsapp.checkNumber.useQuery(
    { phone: checkNumberInput },
    { enabled: false }
  );

  useEffect(() => {
    const p = new URLSearchParams(search).get("chat");
    if (p && p !== selectedChat) setSelectedChat(p);
  }, [search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredChats = chats?.filter((c) => {
    const nameMatch = !chatSearch || (c.name ?? c.jid).toLowerCase().includes(chatSearch.toLowerCase());
    if (!nameMatch) return false;
    if (chatFilter === "contacts") return !c.isGroup;
    if (chatFilter === "leads") return !c.isGroup;
    return true;
  });
  const selectedChatData = chats?.find((c) => c.jid === selectedChat);

  function handleSend() {
    if (!selectedChat) return;
    if (sendMode === "text") {
      if (!message.trim()) return;
      if (replyingTo) {
        replyMutation.mutate({ phone: selectedChat, message: message.trim(), messageId: replyingTo.messageId });
      } else {
        sendMutation.mutate({ chatJid: selectedChat, message: message.trim() });
      }
    } else if (sendMode === "image") {
      if (!mediaUrl) return toast.error("Informe a URL da imagem.");
      sendImageMutation.mutate({ phone: selectedChat, imageUrl: mediaUrl, caption: mediaCaption || undefined });
    } else if (sendMode === "audio") {
      if (!mediaUrl) return toast.error("Informe a URL do áudio.");
      sendAudioMutation.mutate({ phone: selectedChat, audioUrl: mediaUrl });
    } else if (sendMode === "video") {
      if (!mediaUrl) return toast.error("Informe a URL do vídeo.");
      sendVideoMutation.mutate({ phone: selectedChat, videoUrl: mediaUrl, caption: mediaCaption || undefined });
    } else if (sendMode === "location") {
      if (!lat || !lng) return toast.error("Informe latitude e longitude.");
      sendLocationMutation.mutate({ phone: selectedChat, latitude: parseFloat(lat), longitude: parseFloat(lng), name: locationName || undefined });
    } else if (sendMode === "link") {
      if (!linkUrl || !message.trim()) return toast.error("Informe o link e o texto.");
      sendLinkMutation.mutate({ phone: selectedChat, message: message.trim(), linkUrl, title: linkTitle || undefined });
    } else if (sendMode === "poll") {
      if (!pollName || pollOptions.filter(Boolean).length < 2) return toast.error("Informe o título e pelo menos 2 opções.");
      sendPollMutation.mutate({ phone: selectedChat, name: pollName, options: pollOptions.filter(Boolean) });
    }
  }

  const isSending =
    sendMutation.isPending || sendImageMutation.isPending || sendAudioMutation.isPending ||
    sendVideoMutation.isPending || sendLocationMutation.isPending || sendLinkMutation.isPending ||
    sendPollMutation.isPending || replyMutation.isPending;

  const SEND_MODES: { mode: SendMode; label: string; icon: React.ReactNode }[] = [
    { mode: "text", label: "Texto", icon: <MessageSquare className="w-4 h-4" /> },
    { mode: "image", label: "Imagem", icon: <Image className="w-4 h-4" /> },
    { mode: "audio", label: "Áudio", icon: <Mic className="w-4 h-4" /> },
    { mode: "video", label: "Vídeo", icon: <Video className="w-4 h-4" /> },
    { mode: "location", label: "Localização", icon: <MapPin className="w-4 h-4" /> },
    { mode: "link", label: "Link", icon: <Link2 className="w-4 h-4" /> },
    { mode: "poll", label: "Enquete", icon: <BarChart2 className="w-4 h-4" /> },
  ];
  const currentModeIcon = SEND_MODES.find((m) => m.mode === sendMode)?.icon ?? <MessageSquare className="w-4 h-4" />;

  return (
    <CRMLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        {/* LEFT PANEL */}
        <div className="w-80 shrink-0 border-r border-border flex flex-col bg-card">
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">WhatsApp CRM</h2>
              <div className="flex items-center gap-1.5">
                {instanceStatus?.connected ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Wifi className="w-3 h-3" />Online
                  </span>
                ) : instanceStatus ? (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <WifiOff className="w-3 h-3" />Offline
                  </span>
                ) : null}
                {/* Sync all messages button */}
                <button
                  onClick={() => syncAllMessagesMutation.mutate({ pagesPerChat: 3 })}
                  disabled={syncAllMessagesMutation.isPending || syncAllChatsMutation.isPending}
                  className="text-muted-foreground hover:text-blue-400 transition-colors"
                  title="Sincronizar todas as mensagens"
                >
                  {syncAllMessagesMutation.isPending ? (
                    <span className="text-xs text-blue-400 animate-pulse">...</span>
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5" />
                  )}
                </button>
                {/* Sync chats button */}
                <button
                  onClick={() => syncAllChatsMutation.mutate()}
                  disabled={syncAllChatsMutation.isPending || syncAllMessagesMutation.isPending}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Buscar todas as conversas do Z-API"
                >
                  <RefreshCw className={cn("w-4 h-4", (syncAllChatsMutation.isPending || syncMutation.isPending) && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* TABS */}
            <div className="flex gap-1">
              {(["chats", "contacts", "groups", "status"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-1 text-xs rounded-md font-medium transition-colors",
                    activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tab === "chats" ? "Chats" : tab === "contacts" ? "Contatos" : tab === "groups" ? "Grupos" : "Status"}
                </button>
              ))}
            </div>

            {activeTab === "chats" && (
              <>
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
                <div className="flex gap-1">
                  {([
                    { key: "all", label: "Todos" },
                    { key: "contacts", label: "Clientes" },
                    { key: "leads", label: "Leads" },
                  ] as const).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setChatFilter(f.key)}
                      className={cn(
                        "flex-1 py-1 text-xs rounded-md font-medium transition-colors",
                        chatFilter === f.key
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* CHATS TAB */}
          {activeTab === "chats" && (
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
                  <div key={chat.jid} className="group relative">
                    <button
                      onClick={() => {
                        setSelectedChat(chat.jid);
                        if ((chat.unreadCount ?? 0) > 0) readChatMutation.mutate({ phone: chat.jid });
                      }}
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
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted text-muted-foreground">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => archiveMutation.mutate({ phone: chat.jid, archive: true })}>
                            <Archive className="w-3.5 h-3.5 mr-2" />Arquivar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => pinMutation.mutate({ phone: chat.jid, pin: true })}>
                            <Pin className="w-3.5 h-3.5 mr-2" />Fixar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => muteMutation.mutate({ phone: chat.jid, mute: true })}>
                            <BellOff className="w-3.5 h-3.5 mr-2" />Silenciar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => clearChatMutation.mutate({ phone: chat.jid })}
                            className="text-yellow-500"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />Limpar chat
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteChatMutation.mutate({ phone: chat.jid })}
                            className="text-destructive"
                          >
                            <X className="w-3.5 h-3.5 mr-2" />Excluir chat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 mr-2", syncMutation.isPending && "animate-spin")} />
                    Sincronizar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* CONTACTS TAB */}
          {activeTab === "contacts" && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-border">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => syncContactsMutation.mutate()}
                  disabled={syncContactsMutation.isPending}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-2" />
                  {syncContactsMutation.isPending ? "Importando..." : "Importar para CRM"}
                </Button>
              </div>
              {contactsLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 bg-muted rounded-full shrink-0" />
                      <div className="flex-1"><div className="h-3 bg-muted rounded w-3/4" /></div>
                    </div>
                  ))}
                </div>
              ) : zapiContacts && zapiContacts.length > 0 ? (
                zapiContacts.map((c) => (
                  <div key={c.phone} className="flex items-center gap-3 p-3 border-b border-border/50 hover:bg-accent transition-colors">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-blue-400">
                        {(c.name ?? c.notify ?? "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name ?? c.notify ?? "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedChat(c.phone); setActiveTab("chats"); }}
                      className="text-muted-foreground hover:text-green-400 transition-colors"
                      title="Abrir conversa"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                  <Users className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhum contato encontrado.</p>
                </div>
              )}
            </div>
          )}

          {/* GROUPS TAB */}
          {activeTab === "groups" && (
            <div className="flex-1 overflow-y-auto">
              {groupsLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 bg-muted rounded-full shrink-0" />
                      <div className="flex-1"><div className="h-3 bg-muted rounded w-3/4" /></div>
                    </div>
                  ))}
                </div>
              ) : groups && groups.length > 0 ? (
                groups.map((g) => (
                  <div key={g.phone} className="flex items-center gap-3 p-3 border-b border-border/50 hover:bg-accent transition-colors">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                      {g.participants && (
                        <p className="text-xs text-muted-foreground">{g.participants} participantes</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setSelectedChat(g.phone); setActiveTab("chats"); }}
                      className="text-muted-foreground hover:text-green-400 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                  <Users className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhum grupo encontrado.</p>
                </div>
              )}
            </div>
          )}

          {/* STATUS TAB */}
          {activeTab === "status" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-background border border-border rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conexão Z-API</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {instanceStatus?.connected
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    <span className="text-xs text-foreground">
                      {instanceStatus?.connected ? "WhatsApp conectado" : "WhatsApp desconectado"}
                    </span>
                  </div>
                  {instanceStatus?.smartphoneConnected !== undefined && (
                    <div className="flex items-center gap-2">
                      <Smartphone className={cn("w-4 h-4 shrink-0", instanceStatus.smartphoneConnected ? "text-green-400" : "text-yellow-400")} />
                      <span className="text-xs text-foreground">
                        {instanceStatus.smartphoneConnected ? "Celular conectado" : "Celular desconectado"}
                      </span>
                    </div>
                  )}
                  {cellphone?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-xs text-foreground">{cellphone.phone}</span>
                    </div>
                  )}
                  {cellphone?.pushName && (
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">{cellphone.pushName}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => restartMutation.mutate()}
                    disabled={restartMutation.isPending}
                  >
                    <Power className="w-3 h-3 mr-1" />
                    {restartMutation.isPending ? "..." : "Reiniciar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs text-destructive hover:text-destructive"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    <PowerOff className="w-3 h-3 mr-1" />
                    {disconnectMutation.isPending ? "..." : "Desconectar"}
                  </Button>
                </div>
              </div>

              {instanceStatus?.connected === false && qrCode?.value && (
                <div className="bg-background border border-border rounded-xl p-4 text-center space-y-2">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <QrCode className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground">QR CODE</p>
                  </div>
                  <img src={qrCode.value} alt="QR Code" className="w-40 h-40 mx-auto rounded-lg border border-border" />
                  <p className="text-xs text-muted-foreground">Abra o WhatsApp e escaneie o QR Code</p>
                </div>
              )}

              <div className="bg-background border border-border rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verificar Número</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="5511999999999"
                    value={checkNumberInput}
                    onChange={(e) => setCheckNumberInput(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={async () => {
                      const r = await checkNumberQuery.refetch();
                      setCheckNumberResult(r.data ?? null);
                    }}
                  >
                    Verificar
                  </Button>
                </div>
                {checkNumberResult !== null && (
                  <div className={cn(
                    "flex items-center gap-2 text-xs p-2 rounded-lg",
                    checkNumberResult.exists ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {checkNumberResult.exists
                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : <AlertCircle className="w-3.5 h-3.5" />}
                    {checkNumberResult.exists
                      ? "Número válido: " + checkNumberResult.phone
                      : "Número não encontrado no WhatsApp"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CHAT PANEL */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChat ? (
            <>
              {/* CHAT HEADER */}
              <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    {selectedChatData?.isGroup ? (
                      <Users className="w-4 h-4 text-green-400" />
                    ) : (
                      <span className="text-xs font-semibold text-green-400">
                        {(selectedChatData?.name ?? selectedChat).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedChatData?.name ?? selectedChat}</p>
                    <p className="text-xs text-muted-foreground">{selectedChat}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs gap-1.5"
                    onClick={() => syncChatMessagesMutation.mutate({ phone: selectedChat!, pages: 5 })}
                    disabled={syncChatMessagesMutation.isPending}
                    title="Buscar histórico completo de mensagens do Z-API"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 text-blue-400", syncChatMessagesMutation.isPending && "animate-spin")} />
                    <span className="hidden sm:inline">
                      {syncChatMessagesMutation.isPending ? "Buscando..." : "Histórico"}
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs gap-1.5"
                    onClick={() => setAnalysisOpen(true)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span className="hidden sm:inline">Analisar com IA</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="w-8 h-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => archiveMutation.mutate({ phone: selectedChat, archive: true })}>
                        <Archive className="w-3.5 h-3.5 mr-2" />Arquivar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => pinMutation.mutate({ phone: selectedChat, pin: true })}>
                        <Pin className="w-3.5 h-3.5 mr-2" />Fixar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => muteMutation.mutate({ phone: selectedChat, mute: true })}>
                        <BellOff className="w-3.5 h-3.5 mr-2" />Silenciar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => clearChatMutation.mutate({ phone: selectedChat })}
                        className="text-yellow-500"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />Limpar chat
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteChatMutation.mutate({ phone: selectedChat })}
                        className="text-destructive"
                      >
                        <X className="w-3.5 h-3.5 mr-2" />Excluir chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* MESSAGES */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                        <div className={cn("max-w-xs h-10 bg-muted rounded-2xl animate-pulse", i % 2 === 0 ? "w-48" : "w-32")} />
                      </div>
                    ))}
                  </div>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg) => (
                    <div key={msg.id} className={cn("flex group", msg.isFromMe ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[70%] rounded-2xl px-3 py-2 relative",
                        msg.isFromMe
                          ? "bg-green-600/80 text-white rounded-br-sm"
                          : "bg-card border border-border text-foreground rounded-bl-sm"
                      )}>
                        {msg.crmUserName && msg.isFromMe && (
                          <p className="text-xs opacity-70 mb-0.5">{msg.crmUserName}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="text-xs opacity-60">{msg.timestamp ? format(new Date(msg.timestamp), "HH:mm") : ""}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              onClick={() => setReplyingTo({ messageId: msg.messageId ?? String(msg.id), text: (msg.content ?? "").slice(0, 60) })}
                              className="p-0.5 rounded hover:bg-black/20"
                              title="Responder"
                            >
                              <Reply className="w-3 h-3" />
                            </button>
                            {msg.isFromMe && (
                              <button
                                onClick={() => deleteMsgMutation.mutate({ phone: selectedChat, messageId: msg.messageId ?? String(msg.id) })}
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
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT AREA */}
              <div className="border-t border-border bg-card p-3 space-y-2 shrink-0">
                {replyingTo && (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-xs">
                    <Reply className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground truncate flex-1">{replyingTo.text}</span>
                    <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {sendMode === "image" && (
                  <div className="space-y-1.5">
                    <Input placeholder="URL da imagem (https://...)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="text-xs h-8" />
                    <Input placeholder="Legenda (opcional)" value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} className="text-xs h-8" />
                  </div>
                )}
                {sendMode === "audio" && (
                  <Input placeholder="URL do áudio (https://...)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="text-xs h-8" />
                )}
                {sendMode === "video" && (
                  <div className="space-y-1.5">
                    <Input placeholder="URL do vídeo (https://...)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="text-xs h-8" />
                    <Input placeholder="Legenda (opcional)" value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} className="text-xs h-8" />
                  </div>
                )}
                {sendMode === "location" && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input placeholder="Latitude (-23.5505)" value={lat} onChange={(e) => setLat(e.target.value)} className="text-xs h-8" />
                    <Input placeholder="Longitude (-46.6333)" value={lng} onChange={(e) => setLng(e.target.value)} className="text-xs h-8" />
                    <Input placeholder="Nome do local (opcional)" value={locationName} onChange={(e) => setLocationName(e.target.value)} className="text-xs h-8 col-span-2" />
                  </div>
                )}
                {sendMode === "link" && (
                  <div className="space-y-1.5">
                    <Input placeholder="URL do link (https://...)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="text-xs h-8" />
                    <Input placeholder="Título do link (opcional)" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} className="text-xs h-8" />
                  </div>
                )}
                {sendMode === "poll" && (
                  <div className="space-y-1.5">
                    <Input placeholder="Pergunta da enquete" value={pollName} onChange={(e) => setPollName(e.target.value)} className="text-xs h-8" />
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex gap-1.5">
                        <Input
                          placeholder={`Opção ${i + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const n = [...pollOptions];
                            n[i] = e.target.value;
                            setPollOptions(n);
                          }}
                          className="text-xs h-8"
                        />
                        {i >= 2 && (
                          <button
                            onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 12 && (
                      <button
                        onClick={() => setPollOptions([...pollOptions, ""])}
                        className="text-xs text-primary hover:underline"
                      >
                        + Adicionar opção
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="w-9 h-9 shrink-0" title="Tipo de mensagem">
                        {currentModeIcon}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      {SEND_MODES.map(({ mode, label, icon }) => (
                        <DropdownMenuItem
                          key={mode}
                          onClick={() => setSendMode(mode)}
                          className={cn(sendMode === mode && "bg-accent")}
                        >
                          <span className="mr-2">{icon}</span>{label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {(sendMode === "text" || sendMode === "link") && (
                    <Textarea
                      placeholder={sendMode === "link" ? "Texto da mensagem..." : "Digite uma mensagem..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      rows={1}
                      className="flex-1 resize-none min-h-[36px] max-h-32 text-sm py-2"
                    />
                  )}

                  <Button
                    size="icon"
                    className="w-9 h-9 shrink-0 bg-green-600 hover:bg-green-700"
                    onClick={handleSend}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">WhatsApp CRM</h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                Selecione uma conversa para começar. Mensagens são prefixadas com [{user?.name}].
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-sm w-full text-left">
                <div className="p-3 bg-card border border-border rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">STATUS</p>
                  {instanceStatus?.connected ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-xs">Conectado</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs">Desconectado</span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-card border border-border rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">MÍDIAS</p>
                  <p className="text-xs text-muted-foreground">Texto, Imagem, Áudio, Vídeo, Localização, Link, Enquete</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI ANALYSIS DIALOG */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Análise de Conversa com IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <Button
              onClick={() => {
                if (selectedChat) analyzeMutation.mutate({ chatJid: selectedChat, analysisType });
              }}
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
