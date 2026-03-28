import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, Mail, Phone, Building2, MessageSquare,
  Zap, Receipt, BookOpen, FileText, Calendar, Plus,
  Send, Clock, DollarSign, AlertCircle, Loader2, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PJOnboarding from "@/components/PJOnboarding";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  won: "bg-green-500/20 text-green-400 border-green-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30",
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  sent: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  overdue: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  accepted: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  expired: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  signed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  in_progress: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  completed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusLabels: Record<string, string> = {
  open: "Aberto", won: "Ganho", lost: "Perdido",
  draft: "Rascunho", sent: "Enviada", paid: "Paga", overdue: "Vencida", cancelled: "Cancelada",
  accepted: "Aceito", rejected: "Recusado", expired: "Expirado",
  active: "Ativo", signed: "Assinado",
  scheduled: "Agendado", confirmed: "Confirmado", in_progress: "Em Andamento", completed: "Concluído",
};

type InvoiceItem = { description: string; quantity: number; unitPrice: number; total: number };

function EmptyState({ icon: Icon, label, action, onAction }: {
  icon: React.ElementType; label: string; action: string; onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-xl">
      <Icon className="w-9 h-9 text-muted-foreground mb-2 opacity-40" />
      <p className="text-sm text-muted-foreground mb-3">{label}</p>
      <Button size="sm" variant="outline" onClick={onAction}>
        <Plus className="w-3.5 h-3.5 mr-1.5" />{action}
      </Button>
    </div>
  );
}

export default function ContactProfile() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const contactId = Number(id);

  // modals
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: "", subject: "", message: "" });
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ title: "", value: "", notes: "" });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteItems, setQuoteItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteDiscount, setQuoteDiscount] = useState("");

  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.contacts.getProfile.useQuery(
    { id: contactId }, { enabled: !isNaN(contactId) }
  );

  const sendEmailMutation = trpc.contacts.sendEmail.useMutation({
    onSuccess: () => { toast.success("Email enviado!"); setEmailOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const createLeadMutation = trpc.contacts.createLead.useMutation({
    onSuccess: () => {
      toast.success("Lead criado!");
      setLeadOpen(false);
      utils.contacts.getProfile.invalidate({ id: contactId });
    },
    onError: (e) => toast.error(e.message),
  });

  const createInvoiceMutation = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Fatura criada!");
      setInvoiceOpen(false);
      setInvoiceItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      utils.contacts.getProfile.invalidate({ id: contactId });
    },
    onError: (e) => toast.error(e.message),
  });

  const createQuoteMutation = trpc.quotes.create.useMutation({
    onSuccess: () => {
      toast.success("Orçamento criado!");
      setQuoteOpen(false);
      setQuoteItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      utils.contacts.getProfile.invalidate({ id: contactId });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateItem = (
    setter: React.Dispatch<React.SetStateAction<InvoiceItem[]>>,
    idx: number, field: keyof InvoiceItem, val: string | number
  ) => {
    setter(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      if (field === "quantity" || field === "unitPrice") {
        updated.total = Number(updated.quantity) * Number(updated.unitPrice);
      }
      return updated;
    }));
  };

  const openEmail = () => {
    if (!profile) return;
    setEmailForm({
      to: profile.contact.email ?? "",
      subject: `Olá, ${profile.contact.name}`,
      message: "",
    });
    setEmailOpen(true);
  };

  const openWhatsApp = () => {
    if (!profile) return;
    // Try to find existing chat by jid first
    const existingJid = profile.contact.whatsappJid;
    if (existingJid) {
      navigate(`/whatsapp?chat=${encodeURIComponent(existingJid)}`);
      return;
    }
    // Build JID from phone number: Z-API format is 55XXXXXXXXXXX@s.whatsapp.net
    const phone = profile.contact.phone?.replace(/\D/g, "");
    if (phone) {
      // Ensure country code 55 is present
      const normalized = phone.startsWith("55") ? phone : `55${phone}`;
      const jid = `${normalized}@s.whatsapp.net`;
      navigate(`/whatsapp?chat=${encodeURIComponent(jid)}`);
    } else {
      navigate("/whatsapp");
      toast.info("Adicione um telefone ao contato para abrir a conversa diretamente.");
    }
  };

  const openNewLead = () => {
    if (!profile) return;
    setLeadForm({ title: `Lead — ${profile.contact.name}`, value: "", notes: "" });
    setLeadOpen(true);
  };

  if (isLoading) return (
    <CRMLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    </CRMLayout>
  );

  if (!profile) return (
    <CRMLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">Contato não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/contacts")}>Voltar</Button>
      </div>
    </CRMLayout>
  );

  const { contact, leads, invoices, quotes, contracts, bookings } = profile;
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total ?? 0), 0);
  const openLeads = leads.filter(l => l.status === "open").length;
  const invoiceTotal = invoiceItems.reduce((s, i) => s + i.total, 0);
  const quoteTotal = quoteItems.reduce((s, i) => s + i.total, 0);

  return (
    <CRMLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Back */}
        <button
          onClick={() => navigate("/contacts")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Contatos
        </button>

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600" />
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg">
                <span className="text-3xl font-bold text-white">{contact.name.charAt(0).toUpperCase()}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground mb-0.5">{contact.name}</h1>
                {(contact.position || contact.company) && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {[contact.position, contact.company].filter(Boolean).join(" · ")}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {contact.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />{contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-green-400" />{contact.phone}
                    </span>
                  )}
                  {contact.company && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-violet-400" />{contact.company}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Cliente há {formatDistanceToNow(new Date(contact.createdAt), { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5" onClick={openWhatsApp} disabled={!contact.phone}>
                  <MessageSquare className="w-4 h-4" />WhatsApp
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={openEmail} disabled={!contact.email}>
                  <Mail className="w-4 h-4" />Email
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={openNewLead}>
                  <Zap className="w-4 h-4 text-yellow-400" />Novo Lead
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setInvoiceItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); setInvoiceNotes(""); setInvoiceOpen(true); }}>
                  <Receipt className="w-4 h-4 text-blue-400" />Nova Fatura
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setQuoteItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); setQuoteNotes(""); setQuoteDiscount(""); setQuoteOpen(true); }}>
                  <BookOpen className="w-4 h-4 text-violet-400" />Novo Orçamento
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/contracts")}>
                  <FileText className="w-4 h-4 text-orange-400" />Novo Contrato
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPIs ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Zap, label: "Leads Abertos", value: String(openLeads), color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
            { icon: Receipt, label: "Faturas", value: String(invoices.length), color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { icon: DollarSign, label: "Receita Total", value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
            { icon: Calendar, label: "Agendamentos", value: String(bookings.length), color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={cn("rounded-xl border p-4 flex items-center gap-3", bg)}>
              <Icon className={cn("w-5 h-5 shrink-0", color)} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("text-lg font-bold", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABS ────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="leads">
          <TabsList className="bg-card border border-border w-full justify-start overflow-x-auto">
            <TabsTrigger value="leads"><Zap className="w-3.5 h-3.5 mr-1.5" />Leads ({leads.length})</TabsTrigger>
            <TabsTrigger value="invoices"><Receipt className="w-3.5 h-3.5 mr-1.5" />Faturas ({invoices.length})</TabsTrigger>
            <TabsTrigger value="quotes"><BookOpen className="w-3.5 h-3.5 mr-1.5" />Orçamentos ({quotes.length})</TabsTrigger>
            <TabsTrigger value="contracts"><FileText className="w-3.5 h-3.5 mr-1.5" />Contratos ({contracts.length})</TabsTrigger>
            <TabsTrigger value="bookings"><Calendar className="w-3.5 h-3.5 mr-1.5" />Estúdio ({bookings.length})</TabsTrigger>
            <TabsTrigger value="pj"><Building2 className="w-3.5 h-3.5 mr-1.5" />Dados PJ</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="mt-4 space-y-3">
            {leads.length === 0
              ? <EmptyState icon={Zap} label="Nenhum lead vinculado" action="Novo Lead" onAction={openNewLead} />
              : leads.map(lead => (
                <div key={lead.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{lead.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lead.value ? `R$ ${Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sem valor"} · {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <Badge className={cn("text-xs shrink-0 border", statusColors[lead.status ?? "open"])}>{statusLabels[lead.status ?? "open"]}</Badge>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="invoices" className="mt-4 space-y-3">
            {invoices.length === 0
              ? <EmptyState icon={Receipt} label="Nenhuma fatura vinculada" action="Nova Fatura" onAction={() => { setInvoiceItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); setInvoiceOpen(true); }} />
              : invoices.map(inv => (
                <div key={inv.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{inv.number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      R$ {Number(inv.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs border", statusColors[inv.status ?? "draft"])}>{statusLabels[inv.status ?? "draft"]}</Badge>
                    <button onClick={() => navigate("/invoices")} className="text-muted-foreground hover:text-foreground"><ExternalLink className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="quotes" className="mt-4 space-y-3">
            {quotes.length === 0
              ? <EmptyState icon={BookOpen} label="Nenhum orçamento vinculado" action="Novo Orçamento" onAction={() => { setQuoteItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); setQuoteOpen(true); }} />
              : quotes.map(q => (
                <div key={q.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{q.number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      R$ {Number(q.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs border", statusColors[q.status ?? "draft"])}>{statusLabels[q.status ?? "draft"]}</Badge>
                    <button onClick={() => navigate("/quotes")} className="text-muted-foreground hover:text-foreground"><ExternalLink className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="contracts" className="mt-4 space-y-3">
            {contracts.length === 0
              ? <EmptyState icon={FileText} label="Nenhum contrato vinculado" action="Novo Contrato" onAction={() => navigate("/contracts")} />
              : contracts.map(c => (
                <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.value ? `R$ ${Number(c.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sem valor"} · {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs border", statusColors[c.status ?? "draft"])}>{statusLabels[c.status ?? "draft"]}</Badge>
                    <button onClick={() => navigate("/contracts")} className="text-muted-foreground hover:text-foreground"><ExternalLink className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="bookings" className="mt-4 space-y-3">
            {bookings.length === 0
              ? <EmptyState icon={Calendar} label="Nenhum agendamento vinculado" action="Agendar" onAction={() => navigate("/studio")} />
              : bookings.map(b => (
                <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{b.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(b.startAt), "dd/MM/yyyy HH:mm", { locale: ptBR })} · {b.studio ?? "Estúdio"}
                    </p>
                  </div>
                  <Badge className={cn("text-xs border shrink-0", statusColors[b.status ?? "scheduled"])}>{statusLabels[b.status ?? "scheduled"]}</Badge>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="pj" className="mt-4">
            <PJOnboarding contactId={contactId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── EMAIL MODAL ─────────────────────────────────────────────────────── */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Enviar Email — {contact.name}
            </DialogTitle>
            <DialogDescription>Envio direto pelo CRM via Brevo. Não abre cliente de email externo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Para</Label>
              <Input value={emailForm.to} onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))} placeholder="email@exemplo.com" className="mt-1.5 bg-input border-border" />
            </div>
            <div>
              <Label>Assunto</Label>
              <Input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} className="mt-1.5 bg-input border-border" />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea value={emailForm.message} onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))} placeholder="Escreva sua mensagem..." className="mt-1.5 bg-input border-border resize-none" rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancelar</Button>
            <Button
              disabled={!emailForm.to || !emailForm.subject || sendEmailMutation.isPending}
              onClick={() => sendEmailMutation.mutate({
                to: emailForm.to,
                toName: contact.name,
                subject: emailForm.subject,
                message: emailForm.message,
              })}
            >
              {sendEmailMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
                : <><Send className="w-4 h-4 mr-2" />Enviar Email</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── NEW LEAD MODAL ──────────────────────────────────────────────────── */}
      <Dialog open={leadOpen} onOpenChange={setLeadOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Novo Lead — {contact.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={leadForm.title} onChange={e => setLeadForm(f => ({ ...f, title: e.target.value }))} className="mt-1.5 bg-input border-border" />
            </div>
            <div>
              <Label>Valor estimado (R$)</Label>
              <Input type="number" value={leadForm.value} onChange={e => setLeadForm(f => ({ ...f, value: e.target.value }))} placeholder="0,00" className="mt-1.5 bg-input border-border" />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))} className="mt-1.5 bg-input border-border resize-none" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeadOpen(false)}>Cancelar</Button>
            <Button
              disabled={!leadForm.title.trim() || createLeadMutation.isPending}
              onClick={() => createLeadMutation.mutate({ title: leadForm.title, contactId, value: leadForm.value || undefined, notes: leadForm.notes || undefined })}
            >
              {createLeadMutation.isPending ? "Criando..." : "Criar Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── NEW INVOICE MODAL ───────────────────────────────────────────────── */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              Nova Fatura — {contact.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Itens</Label>
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                  <Input className="col-span-5 bg-input border-border text-sm" placeholder="Descrição" value={item.description} onChange={e => updateItem(setInvoiceItems, idx, "description", e.target.value)} />
                  <Input className="col-span-2 bg-input border-border text-sm" type="number" placeholder="Qtd" value={item.quantity} onChange={e => updateItem(setInvoiceItems, idx, "quantity", Number(e.target.value))} />
                  <Input className="col-span-2 bg-input border-border text-sm" type="number" placeholder="Valor" value={item.unitPrice} onChange={e => updateItem(setInvoiceItems, idx, "unitPrice", Number(e.target.value))} />
                  <div className="col-span-2 flex items-center text-sm text-green-400 font-medium">R$ {item.total.toFixed(2)}</div>
                  <button onClick={() => setInvoiceItems(p => p.filter((_, i) => i !== idx))} className="col-span-1 text-muted-foreground hover:text-destructive text-xs">✕</button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setInvoiceItems(p => [...p, { description: "", quantity: 1, unitPrice: 0, total: 0 }])}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Adicionar Item
              </Button>
            </div>
            <div className="flex justify-end">
              <p className="text-xl font-bold text-green-400">Total: R$ {invoiceTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} className="mt-1.5 bg-input border-border resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancelar</Button>
            <Button disabled={invoiceItems.length === 0 || createInvoiceMutation.isPending} onClick={() => createInvoiceMutation.mutate({ items: invoiceItems, contactId, notes: invoiceNotes || undefined })}>
              {createInvoiceMutation.isPending ? "Criando..." : "Criar Fatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── NEW QUOTE MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-400" />
              Novo Orçamento — {contact.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Itens</Label>
              {quoteItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                  <Input className="col-span-5 bg-input border-border text-sm" placeholder="Descrição" value={item.description} onChange={e => updateItem(setQuoteItems, idx, "description", e.target.value)} />
                  <Input className="col-span-2 bg-input border-border text-sm" type="number" placeholder="Qtd" value={item.quantity} onChange={e => updateItem(setQuoteItems, idx, "quantity", Number(e.target.value))} />
                  <Input className="col-span-2 bg-input border-border text-sm" type="number" placeholder="Valor" value={item.unitPrice} onChange={e => updateItem(setQuoteItems, idx, "unitPrice", Number(e.target.value))} />
                  <div className="col-span-2 flex items-center text-sm text-violet-400 font-medium">R$ {item.total.toFixed(2)}</div>
                  <button onClick={() => setQuoteItems(p => p.filter((_, i) => i !== idx))} className="col-span-1 text-muted-foreground hover:text-destructive text-xs">✕</button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setQuoteItems(p => [...p, { description: "", quantity: 1, unitPrice: 0, total: 0 }])}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Adicionar Item
              </Button>
            </div>
            <div className="flex justify-end">
              <p className="text-xl font-bold text-violet-400">Total: R$ {quoteTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <Label>Desconto (R$)</Label>
              <Input type="number" value={quoteDiscount} onChange={e => setQuoteDiscount(e.target.value)} placeholder="0,00" className="mt-1.5 bg-input border-border" />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} className="mt-1.5 bg-input border-border resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>Cancelar</Button>
            <Button disabled={quoteItems.length === 0 || createQuoteMutation.isPending} onClick={() => createQuoteMutation.mutate({ items: quoteItems, contactId, discount: quoteDiscount || undefined, notes: quoteNotes || undefined })}>
              {createQuoteMutation.isPending ? "Criando..." : "Criar Orçamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
