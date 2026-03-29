/**
 * WhatsApp — Main page (refactored)
 *
 * Layout: ChatList (left) | MessagePanel (center) | ContactPanel (right, optional)
 * Real-time via SSE — no more 3s polling.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSearch } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CRMLayout from "@/components/CRMLayout";
import { ChatList } from "./WhatsApp/ChatList";
import { MessagePanel } from "./WhatsApp/MessagePanel";
import { ContactPanel } from "./WhatsApp/ContactPanel";
import { useWhatsAppSSE } from "./WhatsApp/useWhatsAppSSE";
import type { SSEMessage, SSEChatUpdate } from "./WhatsApp/useWhatsAppSSE";
import { Info, MessageSquare } from "lucide-react";

export default function WhatsApp() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialChat = params.get("chat");

  const [selectedJid, setSelectedJid] = useState<string | null>(initialChat);
  const [chatSearch, setChatSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<"all" | "groups" | "contacts">("all");
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [mobileShowList, setMobileShowList] = useState(true);

  const [liveMessages, setLiveMessages] = useState<SSEMessage[]>([]);
  const [liveChatUpdates, setLiveChatUpdates] = useState<Record<string, SSEChatUpdate>>({});
  const liveMessagesRef = useRef<SSEMessage[]>([]);

  const onMessage = useCallback((msg: SSEMessage) => {
    const next = [...liveMessagesRef.current, msg].slice(-500);
    liveMessagesRef.current = next;
    setLiveMessages([...next]);
  }, []);

  const onChatUpdated = useCallback((update: SSEChatUpdate) => {
    setLiveChatUpdates((prev) => ({
      ...prev,
      [update.jid]: { ...(prev[update.jid] ?? {}), ...update },
    }));
  }, []);

  const { connected: sseConnected } = useWhatsAppSSE({ onMessage, onChatUpdated });

  const { data: chats = [], isLoading: chatsLoading, refetch: refetchChats } = trpc.whatsapp.chats.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const syncMutation = trpc.whatsapp.syncChats.useMutation({
    onSuccess: (d) => { toast.success(d.message); refetchChats(); },
    onError: (e) => toast.error(e.message),
  });

  const selectedChat = chats.find((c) => c.jid === selectedJid);
  const liveInfo = selectedJid ? liveChatUpdates[selectedJid] : undefined;
  const chatName = liveInfo?.name ?? selectedChat?.name ?? selectedJid?.split("@")[0] ?? "";
  const isGroup = liveInfo?.isGroup ?? selectedChat?.isGroup ?? false;
  const contactId = (selectedChat as { contactId?: number | null } | undefined)?.contactId;

  useEffect(() => {
    const jid = new URLSearchParams(search).get("chat");
    if (jid && jid !== selectedJid) {
      setSelectedJid(jid);
      setMobileShowList(false);
    }
  }, [search]);

  const handleSelectChat = useCallback((jid: string) => {
    setSelectedJid(jid);
    setMobileShowList(false);
    setLiveChatUpdates((prev) => {
      if (!prev[jid]) return prev;
      return { ...prev, [jid]: { ...prev[jid], unreadCount: 0 } };
    });
  }, []);

  return (
    <CRMLayout>
      <div className="flex h-full overflow-hidden">
        <div className={cn(
          "w-full md:w-72 lg:w-80 shrink-0",
          !mobileShowList && selectedJid ? "hidden md:flex md:flex-col" : "flex flex-col"
        )}>
          <ChatList
            chats={chats}
            loading={chatsLoading}
            selectedJid={selectedJid}
            search={chatSearch}
            onSearchChange={setChatSearch}
            onSelect={handleSelectChat}
            onSync={() => syncMutation.mutate()}
            syncing={syncMutation.isPending}
            sseConnected={sseConnected}
            liveUpdates={liveChatUpdates}
            filter={chatFilter}
            onFilterChange={setChatFilter}
          />
        </div>

        <div className={cn(
          "flex-1 flex flex-col min-w-0",
          mobileShowList && !selectedJid ? "hidden md:flex" : "flex"
        )}>
          {selectedJid ? (
            <MessagePanel
              chatJid={selectedJid}
              chatName={chatName}
              isGroup={!!isGroup}
              contactId={contactId ?? null}
              leadId={null}
              onBack={() => setMobileShowList(true)}
              onOpenContactPanel={() => setShowContactPanel((v) => !v)}
              liveMessages={liveMessages}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <MessageSquare className="w-14 h-14 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground/70">WhatsApp CRM</p>
              <p className="text-sm text-muted-foreground/50 max-w-xs">
                Selecione uma conversa ou clique em ↻ para sincronizar as conversas do Z-API.
              </p>
              {!sseConnected && (
                <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <Info className="w-4 h-4 shrink-0" />
                  SSE desconectado — mensagens em tempo real inativas.
                </div>
              )}
            </div>
          )}
        </div>

        {showContactPanel && selectedJid && (
          <div className="hidden lg:flex w-72 shrink-0">
            <ContactPanel chatJid={selectedJid} contactId={contactId} leadId={null} className="w-full" />
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
