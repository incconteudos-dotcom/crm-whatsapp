import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Receipt, Plus, CheckCircle, Send, CreditCard, SplitSquareHorizontal,
  ExternalLink, Copy, Loader2, AlertCircle, Mail, MessageSquare,
  User, DollarSign, Calendar, Clock, ArrowRight, X, Filter, Download, Search,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Rascunho",  color: "bg-gray-500/20 text-gray-300 border-gray-500/30",     icon: <Receipt className="w-3 h-3" /> },
  sent:      { label: "Enviada",   color: "bg-blue-500/20 text-blue-300 border-blue-500/30",     icon: <Send className="w-3 h-3" /> },
  paid:      { label: "Paga",      color: "bg-green-500/20 text-green-300 border-green-500/30",  icon: <CheckCircle className="w-3 h-3" /> },
  overdue:   { label: "Vencida",   color: "bg-red-500/20 text-red-300 border-red-500/30",        icon: <Clock className="w-3 h-3" /> },
  cancelled: { label: "Cancelada", color: "bg-gray-500/20 text-gray-300 border-gray-500/30",     icon: <X className="w-3 h-3" /> },
};

type InvoiceItem = { description: string; quantity: number; unitPrice: number; total: number };
type SplitLinks = { installment1: { url: string }; installment2: { url: string } };

const fmt = (v: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    typeof v === "string" ? parseFloat(v) : (v ?? 0)
  );

function exportInvoicesCSV(invoices: any[]) {
  const header = ["Número", "Cliente", "Status", "Total", "Vencimento", "Criada em"];
  const rows = invoices.map(i => [
    i.number, i.contactName ?? "",
    ({ draft: "Rascunho", sent: "Enviada", paid: "Paga", overdue: "Vencida", cancelled: "Cancelada" } as Record<string, string>)[i.status ?? "draft"] ?? i.status,
    parseFloat(i.total ?? "0").toFixed(2),
    i.dueDate ? format(new Date(i.dueDate), "dd/MM/yyyy", { locale: ptBR }) : "",
    format(new Date(i.createdAt), "dd/MM/yyyy", { locale: ptBR }),
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "faturas.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function Invoices() {
  const [, navigate] = useLocation();

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const [notes, setNotes] = useState("");

  // Detail sheet
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Payment modals
  const [payOpen, setPayOpen] = useState(false);
  const [splitLinks, setSplitLinks] = useState<SplitLinks | null>(null);
  const [payInvoiceId, setPayInvoiceId] = useState<number | null>(null);

  // Email modal
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailInvoiceId, setEmailInvoiceId] = useState<number | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const utils = trpc.useUtils();
  const { data: invoices, isLoading } = trpc.invoices.list.useQuery();
  const selectedInvoice = invoices?.find(i => i.id === selectedId) ?? null;

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(i => {
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        if (!i.number.toLowerCase().includes(q) && !(i.contactName ?? "").toLowerCase().includes(q)) return false;
      }
      if (filterDateFrom && new Date(i.createdAt) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(i.createdAt) > new Date(filterDateTo + "T23:59:59")) return false;
      return true;
    });
  }, [invoices, filterStatus, filterSearch, filterDateFrom, filterDateTo]);

  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Fatura criada!");
      setCreateOpen(false);
      setItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      setNotes("");
      utils.invoices.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.invoices.update.useMutation({
    onSuccess: () => { toast.success("Fatura atualizada!"); utils.invoices.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const checkoutMutation = trpc.stripe.createInvoiceCheckout.useMutation({
    onSuccess: ({ checkoutUrl }) => {
      toast.success("Redirecionando para o pagamento...");
      window.open(checkoutUrl, "_blank");
      setPayOpen(false);
    },
    onError: (e) => toast.error(`Erro ao gerar link: ${e.message}`),
  });

  const splitMutation = trpc.stripe.createSplitCheckout.useMutation({
    onSuccess: (data) => {
      setSplitLinks(data);
      toast.success("Links de pagamento gerados!");
    },
    onError: (e) => toast.error(`Erro ao gerar links: ${e.message}`),
  });

  const sendEmailMutation = trpc.documents.sendByEmail.useMutation({
    onSuccess: () => {
      toast.success("Email enviado com sucesso!");
      setEmailOpen(false);
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const sendWhatsAppMutation = trpc.documents.sendByWhatsapp.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success("Fatura enviada via WhatsApp!");
      else toast.warning(data.message);
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const openEmailModal = (invoiceId: number) => {
    const inv = invoices?.find(x => x.id === invoiceId);
    setEmailInvoiceId(invoiceId);
    setEmailTo(inv?.contactEmail ?? "");
    setEmailName(inv?.contactName ?? "");
    setEmailSubject(`Fatura ${inv?.number ?? ""}`);
    setEmailMessage("");
    setSelectedId(null);
    setEmailOpen(true);
  };

  const handleSendWhatsApp = (invoiceId: number) => {
    const inv = invoices?.find(x => x.id === invoiceId);
    if (!inv?.contactPhone) { toast.error("Contato sem telefone cadastrado."); return; }
    const phone = inv.contactPhone.replace(/\D/g, "");
    const jid = phone.startsWith("55") ? `${phone}@s.whatsapp.net` : `55${phone}@s.whatsapp.net`;
    sendWhatsAppMutation.mutate({
      type: "invoice", documentId: invoiceId,
      recipientJid: jid,
      message: inv.contactName ? `Olá ${inv.contactName}, segue a fatura ${inv.number}.` : undefined,
    });
    setSelectedId(null);
  };

  const handlePayFull = (invoiceId: number) => {
    checkoutMutation.mutate({ invoiceId, origin: window.location.origin });
  };

  const handlePaySplit = (invoiceId: number) => {
    setSplitLinks(null);
    setPayInvoiceId(invoiceId);
    splitMutation.mutate({ invoiceId, origin: window.location.origin });
    setPayOpen(true);
    setSelectedId(null);
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const u = { ...item, [field]: value };
      if (field === "quantity" || field === "unitPrice") u.total = Number(u.quantity) * Number(u.unitPrice);
      return u;
    }));
  };

  const total = items.reduce((s, i) => s + i.total, 0);

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-6 h-6 text-green-400" />
              Faturas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{invoices?.length ?? 0} fatura{(invoices?.length ?? 0) !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Fatura
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
            <option value="sent">Enviada</option>
            <option value="paid">Paga</option>
            <option value="overdue">Vencida</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-9 w-36 text-sm" placeholder="De" />
          <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-9 w-36 text-sm" placeholder="Até" />
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => exportInvoicesCSV(filteredInvoices)}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          {(filterStatus !== "all" || filterSearch || filterDateFrom || filterDateTo) && (
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setFilterStatus("all"); setFilterSearch(""); setFilterDateFrom(""); setFilterDateTo(""); }}>
              <X className="w-3.5 h-3.5 mr-1" /> Limpar
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filteredInvoices.length} resultado{filteredInvoices.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : filteredInvoices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInvoices.map((inv) => {
              const sc = statusConfig[inv.status ?? "draft"];
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id)}
                  className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", sc.color)}>
                      {sc.icon} {sc.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{inv.number}</span>
                  </div>

                  {inv.contactName && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{inv.contactName}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mb-3">
                    <DollarSign className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xl font-bold text-foreground">{fmt(inv.total)}</span>
                  </div>

                  {inv.items && inv.items.length > 0 && (
                    <p className="text-xs text-muted-foreground mb-3 truncate">
                      {inv.items.length} item{inv.items.length !== 1 ? "s" : ""}: {inv.items[0].description}
                      {inv.items.length > 1 ? ` +${inv.items.length - 1}` : ""}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      {inv.dueDate
                        ? `Vence ${format(new Date(inv.dueDate), "dd/MM/yyyy", { locale: ptBR })}`
                        : format(new Date(inv.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span className="text-xs text-green-400 group-hover:text-green-300 flex items-center gap-1 transition-colors">
                      Ver detalhes <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">Nenhuma fatura ainda</p>
            <p className="text-sm text-muted-foreground mb-4">Crie sua primeira fatura para um cliente</p>
            <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova Fatura</Button>
          </div>
        )}
      </div>

      {/* ─── DETAIL SHEET ─────────────────────────────────────────────── */}
      <Sheet open={!!selectedInvoice} onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedInvoice && (() => {
            const sc = statusConfig[selectedInvoice.status ?? "draft"];
            return (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-lg font-bold">{selectedInvoice.number}</SheetTitle>
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", sc.color)}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>
                </SheetHeader>

                <div className="space-y-5">
                  {/* Contact */}
                  {selectedInvoice.contactName && (
                    <div
                      className="bg-muted/30 rounded-lg p-4 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => { setSelectedId(null); navigate(`/contacts/${selectedInvoice.contactId}`); }}
                    >
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Cliente</p>
                      <p className="font-semibold text-foreground">{selectedInvoice.contactName}</p>
                      {selectedInvoice.contactEmail && <p className="text-sm text-muted-foreground">{selectedInvoice.contactEmail}</p>}
                      {selectedInvoice.contactPhone && <p className="text-sm text-muted-foreground">{selectedInvoice.contactPhone}</p>}
                      <p className="text-xs text-green-400 mt-1">Ver perfil completo →</p>
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Itens</p>
                    <div className="space-y-2">
                      {(selectedInvoice.items ?? []).map((item, i) => (
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
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span>{fmt(selectedInvoice.total)}</span>
                    </div>
                    {selectedInvoice.paidAt && (
                      <div className="flex justify-between text-sm text-green-400">
                        <span>Pago em</span>
                        <span>{format(new Date(selectedInvoice.paidAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Criada em {format(new Date(selectedInvoice.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    {selectedInvoice.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Vence em {format(new Date(selectedInvoice.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                  </div>

                  {/* Stripe payment link */}
                  {selectedInvoice.stripePaymentUrl && selectedInvoice.status !== "paid" && (
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
                      <p className="text-xs text-violet-300 font-medium mb-2">Link de pagamento gerado</p>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700 gap-1.5" onClick={() => window.open(selectedInvoice.stripePaymentUrl!, "_blank")}>
                          <ExternalLink className="w-3.5 h-3.5" /> Abrir link
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copyLink(selectedInvoice.stripePaymentUrl!)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedInvoice.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Observações</p>
                      <p className="text-sm bg-muted/20 rounded-lg p-3">{selectedInvoice.notes}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Ações</p>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="gap-2 justify-start" onClick={() => openEmailModal(selectedInvoice.id)}>
                        <Mail className="w-4 h-4 text-blue-400" /> Enviar Email
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 justify-start"
                        onClick={() => handleSendWhatsApp(selectedInvoice.id)}
                        disabled={sendWhatsAppMutation.isPending}
                      >
                        <MessageSquare className="w-4 h-4 text-green-400" /> WhatsApp
                      </Button>
                    </div>

                    {/* Payment actions */}
                    {(selectedInvoice.status === "draft" || selectedInvoice.status === "sent") && (
                      <div className="space-y-2">
                        <Button
                          className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
                          onClick={() => handlePayFull(selectedInvoice.id)}
                          disabled={checkoutMutation.isPending}
                        >
                          {checkoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                          Gerar Link de Pagamento Integral
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full gap-2 border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                          onClick={() => handlePaySplit(selectedInvoice.id)}
                          disabled={splitMutation.isPending}
                        >
                          {splitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SplitSquareHorizontal className="w-4 h-4" />}
                          Pagamento 50% / 50%
                        </Button>
                      </div>
                    )}

                    {/* Status transitions */}
                    {selectedInvoice.status === "draft" && (
                      <Button className="w-full gap-2" variant="outline" onClick={() => { updateMutation.mutate({ id: selectedInvoice.id, status: "sent" }); setSelectedId(null); }}>
                        <Send className="w-4 h-4" /> Marcar como Enviada
                      </Button>
                    )}
                    {selectedInvoice.status === "sent" && (
                      <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={() => { updateMutation.mutate({ id: selectedInvoice.id, status: "paid", paidAt: new Date() }); setSelectedId(null); }}>
                        <CheckCircle className="w-4 h-4" /> Confirmar Pagamento Recebido
                      </Button>
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
              <Mail className="w-5 h-5 text-blue-400" /> Enviar Fatura por Email
            </DialogTitle>
            <DialogDescription>A fatura será enviada com template profissional via Brevo.</DialogDescription>
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
            <Button
              onClick={() => {
                if (!emailInvoiceId || !emailTo) return;
                sendEmailMutation.mutate({
                  type: "invoice", documentId: emailInvoiceId,
                  recipientEmail: emailTo, recipientName: emailName || undefined,
                  subject: emailSubject || undefined, message: emailMessage || undefined,
                });
              }}
              disabled={!emailTo || sendEmailMutation.isPending}
              className="gap-2"
            >
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
              <Receipt className="w-5 h-5 text-green-400" /> Nova Fatura
            </DialogTitle>
            <DialogDescription>Adicione os itens e crie a fatura para o cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Itens da fatura</Label>
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
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0, total: 0 }])}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar item
              </Button>
            </div>

            <div className="bg-muted/20 rounded-lg p-4 flex justify-between items-center">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold">{fmt(total)}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Condições, observações..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate({ items, notes: notes || undefined })} disabled={items.length === 0 || createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SPLIT PAYMENT MODAL ──────────────────────────────────────── */}
      <Dialog open={payOpen} onOpenChange={(o) => { setPayOpen(o); if (!o) setSplitLinks(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SplitSquareHorizontal className="w-5 h-5 text-violet-400" />
              Pagamento 50% / 50%
            </DialogTitle>
            <DialogDescription>
              Dois links foram gerados. Envie o primeiro para confirmar o agendamento e o segundo para quitação.
            </DialogDescription>
          </DialogHeader>

          {splitMutation.isPending && !splitLinks ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              <p className="text-sm text-muted-foreground">Gerando links de pagamento...</p>
            </div>
          ) : splitLinks ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-violet-300">Parcela 1/2 — Entrada (50%)</p>
                  <Badge variant="secondary" className="text-xs">Libera Agenda</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={() => window.open(splitLinks.installment1.url, "_blank")}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyLink(splitLinks.installment1.url)}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Parcela 2/2 — Saldo (50%)</p>
                  <Badge variant="outline" className="text-xs">Até o dia da sessão</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(splitLinks.installment2.url, "_blank")}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyLink(splitLinks.installment2.url)}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-400/80">
                  Modo teste ativo. Use o cartão <span className="font-mono">4242 4242 4242 4242</span> para simular pagamentos.
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayOpen(false); setSplitLinks(null); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
