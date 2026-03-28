import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  BookOpen, Plus, CheckCircle, XCircle, Send, Clock, Mail, Loader2,
  MessageSquare, ArrowRight, User, DollarSign, Calendar, X, FileText, Download, Search, Link, Copy, Package, FileSignature,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:    { label: "Rascunho",  color: "bg-gray-500/20 text-gray-300 border-gray-500/30",    icon: <BookOpen className="w-3 h-3" /> },
  sent:     { label: "Enviado",   color: "bg-blue-500/20 text-blue-300 border-blue-500/30",    icon: <Send className="w-3 h-3" /> },
  accepted: { label: "Aceito",    color: "bg-green-500/20 text-green-300 border-green-500/30", icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "Recusado",  color: "bg-red-500/20 text-red-300 border-red-500/30",       icon: <XCircle className="w-3 h-3" /> },
  expired:  { label: "Expirado",  color: "bg-orange-500/20 text-orange-300 border-orange-500/30", icon: <Clock className="w-3 h-3" /> },
};

type QuoteItem = { description: string; quantity: number; unitPrice: number; total: number };

const fmt = (v: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    typeof v === "string" ? parseFloat(v) : (v ?? 0)
  );

function exportQuotesCSV(quotes: any[]) {
  const header = ["Número", "Cliente", "Status", "Total", "Válido até", "Criado em"];
  const rows = quotes.map(q => [
    q.number, q.contactName ?? "",
    ({ draft: "Rascunho", sent: "Enviado", accepted: "Aceito", rejected: "Recusado", expired: "Expirado" } as Record<string, string>)[q.status ?? "draft"] ?? q.status,
    parseFloat(q.total ?? "0").toFixed(2),
    q.validUntil ? format(new Date(q.validUntil), "dd/MM/yyyy", { locale: ptBR }) : "",
    format(new Date(q.createdAt), "dd/MM/yyyy", { locale: ptBR }),
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "orcamentos.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── ADD FROM CATALOG BUTTON ─────────────────────────────────────────────────
function AddFromCatalogButton({ onSelect }: { onSelect: (p: { name: string; unitPrice: string }) => void }) {
  const [open, setOpen] = useState(false);
  const { data: products = [] } = trpc.products.list.useQuery({ activeOnly: true });
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 border-purple-500/40 text-purple-300 hover:bg-purple-500/10">
        <Package className="w-3.5 h-3.5" /> Do Catálogo
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Selecionar do Catálogo</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto no catálogo ainda.</p>
            ) : products.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setOpen(false); }}
                className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50"
              >
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  {p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}
                </div>
                <span className="text-sm font-semibold text-green-400 ml-3">R$ {Number(p.unitPrice).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Quotes() {
  const [, navigate] = useLocation();

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  // Detail sheet
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Email modal
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailQuoteId, setEmailQuoteId] = useState<number | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const utils = trpc.useUtils();
  const { data: quotes, isLoading } = trpc.quotes.list.useQuery();
  const selectedQuote = quotes?.find(q => q.id === selectedId) ?? null;

  const [portalLink, setPortalLink] = useState<string | null>(null);
  const generatePortalMutation = trpc.portal.generateToken.useMutation({
    onSuccess: (data: { token: string }) => {
      const link = `${window.location.origin}/portal/${data.token}`;
      setPortalLink(link);
      navigator.clipboard.writeText(link).then(() => toast.success("Link copiado para a área de transferência!"));
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const sendPortalWhatsAppMutation = trpc.portal.sendViaWhatsApp.useMutation({
    onSuccess: (data: { contactName: string }) => toast.success(`Link enviado via WhatsApp para ${data.contactName}!`),
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const sendReminderMutation = trpc.portal.sendReminder.useMutation({
    onSuccess: (data: { contactName: string }) => toast.success(`Lembrete enviado via WhatsApp para ${data.contactName}!`),
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    return quotes.filter(q => {
      if (filterStatus !== "all" && q.status !== filterStatus) return false;
      if (filterSearch) {
        const s = filterSearch.toLowerCase();
        if (!q.number.toLowerCase().includes(s) && !(q.contactName ?? "").toLowerCase().includes(s)) return false;
      }
      if (filterDateFrom && new Date(q.createdAt) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(q.createdAt) > new Date(filterDateTo + "T23:59:59")) return false;
      return true;
    });
  }, [quotes, filterStatus, filterSearch, filterDateFrom, filterDateTo]);

  const createMutation = trpc.quotes.create.useMutation({
    onSuccess: () => {
      toast.success("Orçamento criado!");
      setCreateOpen(false);
      setItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      setDiscount("0"); setNotes("");
      utils.quotes.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.quotes.update.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); utils.quotes.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const sendEmailMutation = trpc.documents.sendByEmail.useMutation({
    onSuccess: () => {
      toast.success("Email enviado com sucesso!");
      setEmailOpen(false);
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const convertToContractMutation = trpc.quotes.convertToContract.useMutation({
    onSuccess: () => {
      toast.success("Orçamento convertido em contrato!");
      setSelectedId(null);
      utils.quotes.list.invalidate();
      navigate("/contracts");
    },
    onError: (e) => toast.error(e.message),
  });

  const convertToInvoiceMutation = trpc.quotes.convertToInvoice.useMutation({
    onSuccess: () => {
      toast.success("Orçamento convertido em fatura!");
      setSelectedId(null);
      utils.quotes.list.invalidate();
      navigate("/invoices");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendWhatsAppMutation = trpc.documents.sendByWhatsapp.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success("Orçamento enviado via WhatsApp!");
      else toast.warning(data.message);
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const openEmailModal = (quoteId: number) => {
    const q = quotes?.find(x => x.id === quoteId);
    setEmailQuoteId(quoteId);
    setEmailTo(q?.contactEmail ?? "");
    setEmailName(q?.contactName ?? "");
    setEmailSubject(`Orçamento ${q?.number ?? ""}`);
    setEmailMessage("");
    setSelectedId(null);
    setEmailOpen(true);
  };

  const handleSendWhatsApp = (quoteId: number) => {
    const q = quotes?.find(x => x.id === quoteId);
    if (!q?.contactPhone) { toast.error("Contato sem telefone cadastrado."); return; }
    const phone = q.contactPhone.replace(/\D/g, "");
    const jid = phone.startsWith("55") ? `${phone}@s.whatsapp.net` : `55${phone}@s.whatsapp.net`;
    sendWhatsAppMutation.mutate({
      type: "quote", documentId: quoteId,
      recipientJid: jid,
      message: q.contactName ? `Olá ${q.contactName}, segue o orçamento ${q.number}.` : undefined,
    });
    setSelectedId(null);
  };

  const updateItem = (idx: number, field: keyof QuoteItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const u = { ...item, [field]: value };
      if (field === "quantity" || field === "unitPrice") u.total = Number(u.quantity) * Number(u.unitPrice);
      return u;
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = subtotal - Number(discount);

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-cyan-400" />
              Orçamentos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{quotes?.length ?? 0} orçamento{(quotes?.length ?? 0) !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Orçamento
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Buscar número ou cliente..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 px-3 rounded-md border border-border bg-input text-sm text-foreground">
            <option value="all">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="sent">Enviado</option>
            <option value="accepted">Aceito</option>
            <option value="rejected">Recusado</option>
            <option value="expired">Expirado</option>
          </select>
          <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-9 w-36 text-sm" />
          <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-9 w-36 text-sm" />
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => exportQuotesCSV(filteredQuotes)}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          {(filterStatus !== "all" || filterSearch || filterDateFrom || filterDateTo) && (
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setFilterStatus("all"); setFilterSearch(""); setFilterDateFrom(""); setFilterDateTo(""); }}>
              <X className="w-3.5 h-3.5 mr-1" /> Limpar
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filteredQuotes.length} resultado{filteredQuotes.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : filteredQuotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuotes.map((q) => {
              const sc = statusConfig[q.status ?? "draft"];
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedId(q.id)}
                  className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", sc.color)}>
                      {sc.icon} {sc.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{q.number}</span>
                  </div>

                  {q.contactName && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{q.contactName}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mb-3">
                    <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xl font-bold text-foreground">{fmt(q.total)}</span>
                  </div>

                  {q.items && q.items.length > 0 && (
                    <p className="text-xs text-muted-foreground mb-3 truncate">
                      {q.items.length} item{q.items.length !== 1 ? "s" : ""}: {q.items[0].description}
                      {q.items.length > 1 ? ` +${q.items.length - 1}` : ""}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(q.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span className="text-xs text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1 transition-colors">
                      Ver detalhes <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">Nenhum orçamento ainda</p>
            <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro orçamento para um cliente</p>
            <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Orçamento</Button>
          </div>
        )}
      </div>

      {/* ─── DETAIL SHEET ─────────────────────────────────────────────── */}
      <Sheet open={!!selectedQuote} onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedQuote && (() => {
            const sc = statusConfig[selectedQuote.status ?? "draft"];
            return (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-lg font-bold">{selectedQuote.number}</SheetTitle>
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", sc.color)}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>
                </SheetHeader>

                <div className="space-y-5">
                  {/* Contact */}
                  {selectedQuote.contactName && (
                    <div
                      className="bg-muted/30 rounded-lg p-4 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => { setSelectedId(null); navigate(`/contacts/${selectedQuote.contactId}`); }}
                    >
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Cliente</p>
                      <p className="font-semibold text-foreground">{selectedQuote.contactName}</p>
                      {selectedQuote.contactEmail && <p className="text-sm text-muted-foreground">{selectedQuote.contactEmail}</p>}
                      {selectedQuote.contactPhone && <p className="text-sm text-muted-foreground">{selectedQuote.contactPhone}</p>}
                      <p className="text-xs text-cyan-400 mt-1">Ver perfil completo →</p>
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Itens</p>
                    <div className="space-y-2">
                      {(selectedQuote.items ?? []).map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.description}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity}x {fmt(item.unitPrice)}</p>
                          </div>
                          <p className="text-sm font-semibold ml-3">{fmt(item.total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-muted/20 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{fmt(selectedQuote.subtotal)}</span>
                    </div>
                    {parseFloat(selectedQuote.discount ?? "0") > 0 && (
                      <div className="flex justify-between text-sm text-green-400">
                        <span>Desconto</span>
                        <span>- {fmt(selectedQuote.discount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span>{fmt(selectedQuote.total)}</span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Criado em {format(new Date(selectedQuote.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    {selectedQuote.validUntil && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Válido até {format(new Date(selectedQuote.validUntil), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                  </div>

                  {selectedQuote.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Observações</p>
                      <p className="text-sm bg-muted/20 rounded-lg p-3">{selectedQuote.notes}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Ações</p>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="gap-2 justify-start" onClick={() => openEmailModal(selectedQuote.id)}>
                        <Mail className="w-4 h-4 text-blue-400" /> Enviar Email
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 justify-start"
                        onClick={() => handleSendWhatsApp(selectedQuote.id)}
                        disabled={sendWhatsAppMutation.isPending}
                      >
                        <MessageSquare className="w-4 h-4 text-green-400" /> WhatsApp
                      </Button>
                    </div>

                    {/* Status transitions */}
                    {selectedQuote.status === "draft" && (
                      <Button className="w-full gap-2" onClick={() => { updateMutation.mutate({ id: selectedQuote.id, status: "sent" }); setSelectedId(null); }}>
                        <Send className="w-4 h-4" /> Marcar como Enviado
                      </Button>
                    )}
                    {selectedQuote.status === "sent" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => { updateMutation.mutate({ id: selectedQuote.id, status: "accepted" }); setSelectedId(null); }}>
                          <CheckCircle className="w-4 h-4" /> Aceito
                        </Button>
                        <Button variant="outline" className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => { updateMutation.mutate({ id: selectedQuote.id, status: "rejected" }); setSelectedId(null); }}>
                          <XCircle className="w-4 h-4" /> Recusado
                        </Button>
                      </div>
                    )}
                    {(selectedQuote.status === "accepted" || selectedQuote.status === "sent") && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          className="gap-2 bg-cyan-600 hover:bg-cyan-700"
                          onClick={() => convertToInvoiceMutation.mutate({ quoteId: selectedQuote.id })}
                          disabled={convertToInvoiceMutation.isPending}
                        >
                          {convertToInvoiceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                          Converter em Fatura
                        </Button>
                        <Button
                          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => convertToContractMutation.mutate({ quoteId: selectedQuote.id })}
                          disabled={convertToContractMutation.isPending}
                        >
                          {convertToContractMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
                          Converter em Contrato
                        </Button>
                      </div>
                    )}
                    {(selectedQuote.status === "draft" || selectedQuote.status === "sent") && (
                      <Button variant="outline" className="w-full gap-2 text-orange-400 border-orange-500/30 hover:bg-orange-500/10" onClick={() => { updateMutation.mutate({ id: selectedQuote.id, status: "expired" }); setSelectedId(null); }}>
                        <Clock className="w-4 h-4" /> Marcar como Expirado
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                      onClick={() => { setPortalLink(null); generatePortalMutation.mutate({ type: "quote", documentId: selectedQuote.id, contactId: selectedQuote.contactId ?? undefined }); }}
                      disabled={generatePortalMutation.isPending}
                    >
                      {generatePortalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                      Gerar Link do Portal
                    </Button>
                    {portalLink && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                          <p className="text-xs text-purple-300 truncate flex-1">{portalLink}</p>
                          <Button size="sm" variant="ghost" className="shrink-0 h-7 px-2" onClick={() => { navigator.clipboard.writeText(portalLink); toast.success("Copiado!"); }}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {selectedQuote.contactId && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => sendPortalWhatsAppMutation.mutate({
                                portalUrl: portalLink,
                                contactId: selectedQuote.contactId!,
                                documentTitle: `Orçamento ${selectedQuote.number}`,
                                documentType: "quote",
                              })}
                              disabled={sendPortalWhatsAppMutation.isPending}
                            >
                              {sendPortalWhatsAppMutation.isPending
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <MessageSquare className="w-3.5 h-3.5" />}
                              Enviar Link
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10"
                              onClick={() => sendReminderMutation.mutate({
                                portalUrl: portalLink,
                                contactId: selectedQuote.contactId!,
                                documentTitle: `Orçamento ${selectedQuote.number}`,
                                documentType: "quote",
                              })}
                              disabled={sendReminderMutation.isPending}
                            >
                              {sendReminderMutation.isPending
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <MessageSquare className="w-3.5 h-3.5" />}
                              Lembrete
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ─── EMAIL MODAL ──────────────────────────────────────────────── */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" /> Enviar Orçamento por Email
            </DialogTitle>
            <DialogDescription>O orçamento será enviado com template profissional via Brevo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email do destinatário *</Label>
              <Input type="email" placeholder="cliente@email.com" value={emailTo} onChange={e => setEmailTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do destinatário</Label>
              <Input placeholder="Nome do cliente" value={emailName} onChange={e => setEmailName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Assunto</Label>
              <Input placeholder="Assunto do email" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mensagem adicional</Label>
              <Textarea placeholder="Mensagem personalizada (opcional)..." value={emailMessage} onChange={e => setEmailMessage(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (!emailQuoteId || !emailTo) return; sendEmailMutation.mutate({ type: "quote", documentId: emailQuoteId, recipientEmail: emailTo, recipientName: emailName || undefined, subject: emailSubject || undefined, message: emailMessage || undefined }); }} disabled={!emailTo || sendEmailMutation.isPending} className="gap-2">
              {sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CREATE MODAL ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" /> Novo Orçamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Itens do orçamento</Label>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-5" placeholder="Descrição" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                    <Input className="col-span-2" type="number" placeholder="Qtd" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} />
                    <Input className="col-span-3" type="number" placeholder="Valor unit." value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", Number(e.target.value))} />
                    <div className="col-span-1 text-xs text-muted-foreground text-right">{fmt(item.total)}</div>
                    <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="col-span-1 text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0, total: 0 }])}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar item
                </Button>
                <AddFromCatalogButton onSelect={(p) => setItems(prev => [...prev, { description: p.name, quantity: 1, unitPrice: Number(p.unitPrice), total: Number(p.unitPrice) }])} />
              </div>
            </div>

            <div className="bg-muted/20 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Desconto (R$)</span>
                <Input type="number" className="w-28 h-7 text-right text-sm" value={discount} onChange={e => setDiscount(e.target.value)} />
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-lg">{fmt(total)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Condições, validade, observações..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate({ items, discount: discount || undefined, notes: notes || undefined })} disabled={items.length === 0 || createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar Orçamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
