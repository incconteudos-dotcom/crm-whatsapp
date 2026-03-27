import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import {
  User, Mail, Phone, Building2, MessageSquare, ArrowLeft, FileText,
  Receipt, BookOpen, Calendar, Zap, ExternalLink, Send, Plus,
  CheckCircle2, Clock, XCircle, DollarSign, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
}
function fmtCurrency(v: string | number | null | undefined) {
  if (v == null) return "—";
  return `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

const invoiceStatusMap: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: "Rascunho",  color: "text-slate-400",  icon: Clock },
  sent:      { label: "Enviada",   color: "text-blue-400",   icon: Send },
  paid:      { label: "Paga",      color: "text-green-400",  icon: CheckCircle2 },
  overdue:   { label: "Vencida",   color: "text-red-400",    icon: AlertCircle },
  cancelled: { label: "Cancelada", color: "text-slate-500",  icon: XCircle },
};
const quoteStatusMap: Record<string, { label: string; color: string }> = {
  draft:    { label: "Rascunho",  color: "text-slate-400" },
  sent:     { label: "Enviado",   color: "text-blue-400" },
  accepted: { label: "Aceito",    color: "text-green-400" },
  rejected: { label: "Recusado",  color: "text-red-400" },
  expired:  { label: "Expirado",  color: "text-orange-400" },
};
const contractStatusMap: Record<string, { label: string; color: string }> = {
  draft:     { label: "Rascunho",  color: "text-slate-400" },
  sent:      { label: "Enviado",   color: "text-blue-400" },
  signed:    { label: "Assinado",  color: "text-green-400" },
  cancelled: { label: "Cancelado", color: "text-red-400" },
};
const leadStatusMap: Record<string, { label: string; color: string }> = {
  open: { label: "Aberto", color: "text-blue-400" },
  won:  { label: "Ganho",  color: "text-green-400" },
  lost: { label: "Perdido",color: "text-red-400" },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ContactProfile() {
  const { id } = useParams<{ id: string }>();
  const contactId = Number(id);

  const { data: profile, isLoading } = trpc.contacts.getProfile.useQuery(
    { id: contactId },
    { enabled: !isNaN(contactId) }
  );

  const sendWhatsApp = () => {
    const jid = profile?.whatsappChat?.jid ?? profile?.contact?.whatsappJid;
    if (jid) {
      window.location.href = `/whatsapp`;
      toast.info("Abra a conversa na aba WhatsApp");
    } else if (profile?.contact?.phone) {
      const num = profile.contact.phone.replace(/\D/g, "");
      window.open(`https://wa.me/55${num}`, "_blank");
    } else {
      toast.error("Contato sem número de WhatsApp cadastrado");
    }
  };

  const sendEmail = () => {
    if (profile?.contact?.email) {
      window.open(`mailto:${profile.contact.email}`, "_blank");
    } else {
      toast.error("Contato sem email cadastrado");
    }
  };

  if (isNaN(contactId)) return (
    <CRMLayout>
      <div className="p-6 text-center text-muted-foreground">ID de contato inválido.</div>
    </CRMLayout>
  );

  if (isLoading) return (
    <CRMLayout>
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-card animate-pulse" />
        ))}
      </div>
    </CRMLayout>
  );

  if (!profile) return (
    <CRMLayout>
      <div className="p-6 text-center text-muted-foreground">Contato não encontrado.</div>
    </CRMLayout>
  );

  const { contact, leads, invoices, quotes, contracts, bookings } = profile;
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total ?? 0), 0);
  const openLeads = leads.filter(l => l.status === "open").length;

  return (
    <CRMLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/contacts" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Contatos
        </Link>

        {/* Header card */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground">{contact.name}</h1>
                {contact.company && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {contact.company}{contact.position ? ` · ${contact.position}` : ""}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  {contact.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />{contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />{contact.phone}
                    </span>
                  )}
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button size="sm" onClick={sendWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  WhatsApp
                </Button>
                <Button size="sm" variant="outline" onClick={sendEmail} disabled={!contact.email}>
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  Email
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/pipeline`}>
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    Novo Lead
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/invoices`}>
                    <Receipt className="w-3.5 h-3.5 mr-1.5" />
                    Nova Fatura
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/quotes`}>
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                    Novo Orçamento
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/contracts`}>
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Novo Contrato
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Leads Abertos",   value: openLeads,                  icon: Zap,      color: "text-purple-400" },
            { label: "Faturas",         value: invoices.length,            icon: Receipt,  color: "text-blue-400" },
            { label: "Receita Total",   value: fmtCurrency(totalRevenue),  icon: DollarSign, color: "text-green-400" },
            { label: "Agendamentos",    value: bookings.length,            icon: Calendar, color: "text-orange-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color} shrink-0`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold text-foreground">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                Leads ({leads.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leads.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead vinculado</p>
              ) : leads.map(lead => {
                const st = leadStatusMap[lead.status ?? "open"];
                return (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{lead.title}</p>
                      {lead.value && <p className="text-xs text-green-400">{fmtCurrency(lead.value)}</p>}
                    </div>
                    <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Faturas */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-400" />
                Faturas ({invoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoices.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma fatura vinculada</p>
              ) : invoices.map(inv => {
                const st = invoiceStatusMap[inv.status ?? "draft"];
                const Icon = st.icon;
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{inv.number}</p>
                      <p className="text-xs text-muted-foreground">Venc. {fmtDate(inv.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{fmtCurrency(inv.total)}</p>
                      <span className={`text-xs flex items-center gap-1 justify-end ${st.color}`}>
                        <Icon className="w-3 h-3" />{st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Orçamentos */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-orange-400" />
                Orçamentos ({quotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quotes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum orçamento vinculado</p>
              ) : quotes.map(q => {
                const st = quoteStatusMap[q.status ?? "draft"];
                return (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{q.number}</p>
                      <p className="text-xs text-muted-foreground">Válido até {fmtDate(q.validUntil)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{fmtCurrency(q.total)}</p>
                      <span className={`text-xs ${st.color}`}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Contratos */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Contratos ({contracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contracts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum contrato vinculado</p>
              ) : contracts.map(c => {
                const st = contractStatusMap[c.status ?? "draft"];
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.title}</p>
                      {c.value && <p className="text-xs text-green-400">{fmtCurrency(c.value)}</p>}
                    </div>
                    <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Agendamentos */}
        {bookings.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                Agendamentos de Estúdio ({bookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bookings.map(b => (
                  <div key={b.id} className="p-3 rounded-lg bg-muted/30 flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(b.startAt)} · {b.studio ?? "Estúdio Principal"}
                      </p>
                      {b.value && <p className="text-xs text-green-400 mt-0.5">{fmtCurrency(b.value)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {contact.notes && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </CRMLayout>
  );
}
