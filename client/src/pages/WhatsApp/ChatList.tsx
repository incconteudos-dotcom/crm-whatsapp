import { cn } from "@/lib/utils";
import { Search, RefreshCw, Users, MessageSquare, Wifi, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { SSEChatUpdate } from "./useWhatsAppSSE";

interface Chat {
  id: number;
  jid: string;
  name?: string | null;
  isGroup?: boolean | null;
  lastMessageAt?: Date | string | null;
  lastMessagePreview?: string | null;
  unreadCount?: number | null;
  contactId?: number | null;
}

interface ChatListProps {
  chats: Chat[];
  loading: boolean;
  selectedJid: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (jid: string) => void;
  onSync: () => void;
  syncing: boolean;
  sseConnected: boolean;
  liveUpdates: Record<string, SSEChatUpdate>;
  filter: "all" | "groups" | "contacts";
  onFilterChange: (f: "all" | "groups" | "contacts") => void;
}

export function ChatList({
  chats,
  loading,
  selectedJid,
  search,
  onSearchChange,
  onSelect,
  onSync,
  syncing,
  sseConnected,
  liveUpdates,
  filter,
  onFilterChange,
}: ChatListProps) {
  // Merge live SSE updates with DB data
  const enriched = chats.map((chat) => {
    const live = liveUpdates[chat.jid];
    if (!live) return chat;
    return {
      ...chat,
      name: live.name ?? chat.name,
      lastMessageAt: new Date(live.lastMessageAt),
      lastMessagePreview: live.lastMessagePreview ?? chat.lastMessagePreview,
      unreadCount: (chat.unreadCount ?? 0) + live.unreadCount,
    };
  });

  // Add chats that arrived via SSE but aren't in DB yet
  const dbJids = new Set(chats.map((c) => c.jid));
  const newFromSSE = Object.values(liveUpdates)
    .filter((u) => !dbJids.has(u.jid))
    .map((u) => ({
      id: 0,
      jid: u.jid,
      name: u.name,
      isGroup: u.isGroup,
      lastMessageAt: new Date(u.lastMessageAt),
      lastMessagePreview: u.lastMessagePreview,
      unreadCount: u.unreadCount,
      contactId: null,
    }));

  const allChats = [...newFromSSE, ...enriched].sort((a, b) => {
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bt - at;
  });

  const filtered = allChats.filter((c) => {
    const q = search.toLowerCase();
    const nameMatch = (c.name ?? c.jid).toLowerCase().includes(q);
    const filterMatch =
      filter === "all" ||
      (filter === "groups" && c.isGroup) ||
      (filter === "contacts" && !c.isGroup);
    return nameMatch && filterMatch;
  });

  const totalUnread = allChats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-sm text-foreground">WhatsApp</span>
            {totalUnread > 0 && (
              <span className="bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div title={sseConnected ? "Tempo real ativo" : "Sem conexão em tempo real"}>
              {sseConnected
                ? <Wifi className="w-3.5 h-3.5 text-green-500" />
                : <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <button
              onClick={onSync}
              disabled={syncing}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Sincronizar conversas do Z-API"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar conversas..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-1">
          {(["all", "contacts", "groups"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={cn(
                "flex-1 py-1 text-xs rounded-md font-medium transition-colors",
                filter === f
                  ? "bg-green-600 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {f === "all" ? "Todos" : f === "contacts" ? "Contatos" : "Grupos"}
            </button>
          ))}
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-px p-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted animate-pulse rounded w-2/3" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-12 px-4 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search ? "Nenhuma conversa encontrada." : "Nenhuma conversa ainda. Clique em ↻ para sincronizar."}
            </p>
          </div>
        ) : (
          filtered.map((chat) => {
            const isSelected = chat.jid === selectedJid;
            const unread = chat.unreadCount ?? 0;
            const time = chat.lastMessageAt
              ? formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: false, locale: ptBR })
              : null;

            return (
              <button
                key={chat.jid}
                onClick={() => onSelect(chat.jid)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                  isSelected && "bg-muted"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-sm",
                  chat.isGroup ? "bg-blue-600" : "bg-green-600"
                )}>
                  {chat.isGroup
                    ? <Users className="w-5 h-5" />
                    : (chat.name ?? chat.jid)[0]?.toUpperCase() ?? "?"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn("text-sm truncate", unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                      {chat.name ?? chat.jid.split("@")[0]}
                    </span>
                    {time && (
                      <span className="text-xs text-muted-foreground shrink-0">{time}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className={cn("text-xs truncate", unread > 0 ? "text-foreground/70" : "text-muted-foreground")}>
                      {chat.lastMessagePreview ?? "Nenhuma mensagem"}
                    </p>
                    {unread > 0 && (
                      <span className="bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none shrink-0">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
