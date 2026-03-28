import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, Mail, Phone, Building2, MessageSquare,
  Zap, Receipt, BookOpen, FileText, Calendar, Plus,
  Clock, DollarSign, AlertCircle, Loader2, ExternalLink, Link2,
  User, Tag, MapPin, Globe, Edit2, Check, X as XIcon,
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

function InfoRow({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color ?? "text-muted-foreground")} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground truncate">{value}</p>
      </div>
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
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", company: "", position: "", notes: "" });

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

  const updateContactMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contato atualizado!");
      setEditOpen(false);
      utils.contacts.getProfile.invalidate({ id: contactId });
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMagicLinkMutation = trpc.portalMagic.sendMagicLink.useMutation({
    onSuccess: () => toast.success("Magic link enviado por WhatsApp!"),
    onError: (err: any) => toast.error(err.message || "Erro ao enviar magic link"),
  });

  const sendMagicLink = () => {
    if (!profile?.contact) return;
    sendMagicLinkMutation.mutate({
      contactId,
      email: profile.contact.email ?? "",
      origin: window.location.origin,
    });
  };

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
    setEmailForm({ to: profile.contact.email ?? "", subject: `Olá, ${profile.contact.name}`, message: "" });
    setEmailOpen(true);
  };

  const openWhatsApp = () => {
    if (!profile) return;
    const existingJid = profile.contact.whatsappJid;
    if (existingJid) { navigate(`/whatsapp?chat=${encodeURIComponent(existingJid)}`); return; }
    const phone = profile.contact.phone?.replace(/\D/g, "");
    if (phone) {
      const normalized = phone.startsWith("55") ? phone : `55${phone}`;
      navigate(`/whatsapp?chat=${encodeURIComponent(`${normalized}@s.whatsapp.net`)}`);
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

  const openEdit = () => {
    if (!profile) return;
    setEditForm({
      name: profile.contact.name ?? "",
      email: profile.contact.email ?? "",
      phone: profile.contact.phone ?? "",
      company: profile.contact.company ?? "",
      position: profile.contact.position ?? "",
      notes: profile.contact.notes ?? "",
    });
    setEditOpen(true);
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
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate("/contacts")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Contatos
        </button>

        {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">

            {/* Avatar + Name card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600" />
              <div className="p-5 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg mb-3">
                  <span className="text-3xl font-bold text-white">{contact.name.charAt(0).toUpperCase()}</span>
                </div>
                <h1 className="text-lg font-bold text-foreground leading-tight">{contact.name}</h1>
                {(contact.position || contact.company) && (
                  <p className="text-xs text-muted-foreground mt-1">{[contact.position, contact.company].filter(Boolean).join(" · ")}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 flex-1" onClick={openWhatsApp} disabled={!contact.phone}>
                    <MessageSquare className="w-3.5 h-3.5" />WA
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={openEmail} disabled={!contact.email}>
                    <Mail className="w-3.5 h-3.5" />Email
                  </Button>
                  <Button size="sm" variant="outline" className="px-2" onClick={openEdit}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Informações</p>
              <InfoRow icon={Mail} label="Email" value={contact.email ?? ""} color="text-blue-400" />
              <InfoRow icon={Phone} label="Telefone" value={contact.phone ?? ""} color="text-green-400" />
              <InfoRow icon={Building2} label="Empresa" value={contact.company ?? ""} color="text-violet-400" />
              <InfoRow icon={User} label="Cargo" value={contact.position ?? ""} color="text-orange-400" />
              <InfoRow icon={Clock} label="Cliente há" value={formatDistanceToNow(new Date(contact.createdAt), { locale: ptBR })} />
              {contact.notes && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{contact.notes}</p>
                </div>
              )}
            </div>

            {/* KPIs */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo</p>
              {[
                { icon: Zap, label: "Leads Abertos", value: String(openLeads), color: "text-yellow-400" },
                { icon: Receipt, label: "Faturas", value: String(invoices.length), color: "text-blue-400" },
                { icon: DollarSign, label: "Receita Total", value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "text-green-400" },
                { icon: Calendar, label: "Agendamentos", value: String(bookings.length), color: "text-purple-400" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", color)} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <span className={cn("text-sm font-semibold", color)}>{value}</span>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ações Rápidas</p>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2" onClick={openNewLead}>
                <Zap className="w-3.5 h-3.5 text-yellow-400" />Novo Lead
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2" onClick={() => { setInvoiceItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); setInvoiceNotes(""); setInvoiceOpen(true); }}>
                <Receipt className="w-3.5 h-3.5 text-blue-400" />Nova Fatura
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2" onClick={() => { setQuoteItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); setQuoteNotes(""); setQuoteDiscount(""); setQuoteOpen(true); }}>
                <BookOpen className="w-3.5 h-3.5 text-violet-400" />Novo Orçamento
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2" onClick={() => navigate(`/contracts?contactId=${contactId}&contactName=${encodeURIComponent(contact.name)}`)}>
                <FileText className="w-3.5 h-3.5 text-orange-400" />Novo Contrato
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/studio")}>
                <Calendar className="w-3.5 h-3.5 text-pink-400" />Agendar Sessão
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2" onClick={sendMagicLink} disabled={sendMagicLinkMutation.isPending}>
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                {sendMagicLinkMutation.isPending ? "Enviando..." : "Magic Link Portal"}
              </Button>
            </div>
          </div>

          {/* ── RIGHT MAIN CONTENT ───────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
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
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={openNewLead}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Novo Lead
                  </Button>
                </div>
                {leads.length === 0
                  ? <EmptyState icon={Zap} label="Nenhum lead vinculado" action="Novo Lead" onAction={openNewLead} />
                  : leads.map(lead => (
                    <div key={lead.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors">
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
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setInvoiceItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); setInvoiceOpen(true); }}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Nova Fatura
                  </Button>
                </div>
                {invoices.length === 0
                  ? <EmptyState icon={Receipt} label="Nenhuma fatura vinculada" action="Nova Fatura" onAction={() => { setInvoiceItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); setInvoiceOpen(true); }} />
                  : invoices.map(inv => (
                    <div key={inv.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors">
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
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setQuoteItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); setQuoteOpen(true); }}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Novo Orçamento
                  </Button>
                </div>
                {quotes.length === 0
                  ? <EmptyState icon={BookOpen} label="Nenhum orçamento vinculado" action="Novo Orçamento" onAction={() => { setQuoteItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); setQuoteOpen(true); }} />
                  : quotes.map(q => (
                    <div key={q.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors">
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
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/contracts?contactId=${contactId}&contactName=${encodeURIComponent(contact.name)}`)}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Novo Contrato
                  </Button>
                </div>
                {contracts.length === 0
                  ? <EmptyState icon={FileText} label="Nenhum contrato vinculado" action="Novo Contrato" onAction={() => navigate(`/contracts?contactId=${contactId}&contactName=${encodeURIComponent(contact.name)}`)} />
                  : contracts.map(c => (
                    <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors">
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
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => navigate("/studio")}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Agendar
                  </Button>
                </div>
                {bookings.length === 0
                  ? <EmptyState icon={Calendar} label="Nenhum agendamento vinculado" action="Agendar" onAction={() => navigate("/studio")} />
                  : bookings.map(b => (
                    <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors">
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
        </div>
      </div>

      {/* ── EDIT CONTACT MODAL ──────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-400" />
              Editar Contato
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: "Nome", field: "name" as const, placeholder: "Nome completo" },
              { label: "Email", field: "email" as const, placeholder: "email@exemplo.com" },
              { label: "Telefone", field: "phone" as const, placeholder: "(11) 99999-9999" },
              { label: "Empresa", field: "company" as const, placeholder: "Nome da empresa" },
              { label: "Cargo", field: "position" as const, placeholder: "Cargo ou função" },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <Label className="text-xs">{label}</Label>
                <Input
                  value={editForm[field]}
                  onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="mt-1 bg-input border-border"
                />
              </div>
            ))}
            <div>
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Observações sobre o contato..."
                className="mt-1 bg-input border-border resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => updateContactMutation.mutate({ id: contactId, ...editForm })}
              disabled={updateContactMutation.isPending}
            >
              {updateContactMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Textarea value={emailForm.message} onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))} rows={5} className="mt-1.5 bg-input border-border resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancelar</Button>
            <Button onClick={() => sendEmailMutation.mutate({ to: emailForm.to, toName: contact.name, subject: emailForm.subject, message: emailForm.message })} disabled={sendEmailMutation.isPending || !emailForm.to || !emailForm.subject}>
              {sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── LEAD MODAL ──────────────────────────────────────────────────────── */}
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
              <Label>Observações</Label>
              <Textarea value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="mt-1.5 bg-input border-border resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeadOpen(false)}>Cancelar</Button>
            <Button onClick={() => createLeadMutation.mutate({ title: leadForm.title, value: leadForm.value || undefined, notes: leadForm.notes || undefined, contactId })} disabled={createLeadMutation.isPending || !leadForm.title}>
              {createLeadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── INVOICE MODAL ───────────────────────────────────────────────────── */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              Nova Fatura — {contact.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {invoiceItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {idx === 0 && <Label className="text-xs mb-1 block">Descrição</Label>}
                  <Input value={item.description} onChange={e => updateItem(setInvoiceItems, idx, "description", e.target.value)} placeholder="Serviço..." className="bg-input border-border text-sm" />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs mb-1 block">Qtd</Label>}
                  <Input type="number" value={item.quantity} onChange={e => updateItem(setInvoiceItems, idx, "quantity", Number(e.target.value))} className="bg-input border-border text-sm" />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs mb-1 block">Unit. (R$)</Label>}
                  <Input type="number" value={item.unitPrice} onChange={e => updateItem(setInvoiceItems, idx, "unitPrice", Number(e.target.value))} className="bg-input border-border text-sm" />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs mb-1 block">Total</Label>}
                  <Input readOnly value={item.total.toFixed(2)} className="bg-muted border-border text-sm" />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => setInvoiceItems(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 mt-1">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setInvoiceItems(p => [...p, { description: "", quantity: 1, unitPrice: 0, total: 0 }])}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Adicionar Item
            </Button>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} rows={2} className="mt-1 bg-input border-border resize-none text-sm" />
            </div>
            <div className="flex justify-end">
              <p className="text-sm font-semibold text-foreground">Total: R$ {invoiceTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancelar</Button>
            <Button onClick={() => createInvoiceMutation.mutate({ contactId, items: invoiceItems, notes: invoiceNotes || undefined })} disabled={createInvoiceMutation.isPending || invoiceItems.every(i => !i.description)}>
              {createInvoiceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Receipt className="w-4 h-4 mr-2" />}
              Criar Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QUOTE MODAL ─────────────────────────────────────────────────────── */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-400" />
              Novo Orçamento — {contact.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {quoteItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {idx === 0 && <Label className="text-xs mb-1 block">Descrição</Label>}
                  <Input value={item.description} onChange={e => updateItem(setQuoteItems, idx, "description", e.target.value)} placeholder="Serviço..." className="bg-input border-border text-sm" />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs mb-1 block">Qtd</Label>}
                  <Input type="number" value={item.quantity} onChange={e => updateItem(setQuoteItems, idx, "quantity", Number(e.target.value))} className="bg-input border-border text-sm" />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs mb-1 block">Unit. (R$)</Label>}
                  <Input type="number" value={item.unitPrice} onChange={e => updateItem(setQuoteItems, idx, "unitPrice", Number(e.target.value))} className="bg-input border-border text-sm" />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs mb-1 block">Total</Label>}
                  <Input readOnly value={item.total.toFixed(2)} className="bg-muted border-border text-sm" />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => setQuoteItems(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 mt-1">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setQuoteItems(p => [...p, { description: "", quantity: 1, unitPrice: 0, total: 0 }])}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Adicionar Item
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Desconto (R$)</Label>
                <Input type="number" value={quoteDiscount} onChange={e => setQuoteDiscount(e.target.value)} placeholder="0,00" className="mt-1 bg-input border-border text-sm" />
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Input value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} className="mt-1 bg-input border-border text-sm" />
              </div>
            </div>
            <div className="flex justify-end">
              <p className="text-sm font-semibold text-foreground">
                Total: R$ {(quoteTotal - Number(quoteDiscount || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>Cancelar</Button>
            <Button onClick={() => createQuoteMutation.mutate({ contactId, items: quoteItems, discount: quoteDiscount || undefined, notes: quoteNotes || undefined })} disabled={createQuoteMutation.isPending || quoteItems.every(i => !i.description)}>
              {createQuoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
              Criar Orçamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
