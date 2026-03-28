import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  FileText, Plus, Sparkles, CheckCircle, Clock, Send, XCircle,
  Mail, Loader2, MessageSquare, Download, User, Calendar, DollarSign,
  FileSignature, ChevronRight, Search, X as XIcon, Link, Copy,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Streamdown } from "streamdown";

type ContractWithContact = {
  id: number;
  title: string;
  content: string | null;
  status: string | null;
  value: string | null;
  validUntil: Date | null;
  signerName: string | null;
  signerEmail: string | null;
  signatureUrl: string | null;
  signedAt: Date | null;
  contactId: number | null;
  leadId: number | null;
  assignedUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; badgeClass: string; cardBorder: string }> = {
  draft: {
    label: "Rascunho",
    icon: <Clock className="w-3.5 h-3.5" />,
    badgeClass: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    cardBorder: "border-border",
  },
  sent: {
    label: "Enviado",
    icon: <Send className="w-3.5 h-3.5" />,
    badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cardBorder: "border-blue-500/30",
  },
  signed: {
    label: "Assinado",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    badgeClass: "bg-green-500/20 text-green-400 border-green-500/30",
    cardBorder: "border-green-500/30",
  },
  cancelled: {
    label: "Cancelado",
    icon: <XCircle className="w-3.5 h-3.5" />,
    badgeClass: "bg-red-500/20 text-red-400 border-red-500/30",
    cardBorder: "border-red-500/30",
  },
};

function exportContractsCSV(contracts: ContractWithContact[]) {
  const header = ["Título", "Cliente", "Status", "Valor", "Válido até", "Criado em"];
  const rows = contracts.map(c => [
    c.title, c.contactName ?? c.signerName ?? "",
    ({ draft: "Rascunho", sent: "Enviado", signed: "Assinado", cancelled: "Cancelado" } as Record<string, string>)[c.status ?? "draft"] ?? c.status,
    c.value ? Number(c.value).toFixed(2) : "",
    c.validUntil ? format(new Date(c.validUntil), "dd/MM/yyyy", { locale: ptBR }) : "",
    format(new Date(c.createdAt), "dd/MM/yyyy", { locale: ptBR }),
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "contratos.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function Contracts() {
  const [, navigate] = useLocation();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedContract, setSelectedContract] = useState<ContractWithContact | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [aiGenOpen, setAiGenOpen] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", signerName: "", signerEmail: "", content: "", contactId: "" });
  const [aiForm, setAiForm] = useState({ title: "", contactName: "", value: "", description: "", contractType: "produção de podcast" });
  const [generatedContent, setGeneratedContent] = useState("");

  // Email modal state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailContractId, setEmailContractId] = useState<number | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // WhatsApp modal state
  const [waOpen, setWaOpen] = useState(false);
  const [waContractId, setWaContractId] = useState<number | null>(null);
  const [waJid, setWaJid] = useState("");
  const [waMessage, setWaMessage] = useState("");

  const utils = trpc.useUtils();
  const { data: contracts, isLoading } = trpc.contracts.list.useQuery();
  const { data: contacts } = trpc.contacts.list.useQuery({});

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

  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    return (contracts as ContractWithContact[]).filter(c => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterSearch) {
        const s = filterSearch.toLowerCase();
        if (!c.title.toLowerCase().includes(s) && !(c.contactName ?? "").toLowerCase().includes(s) && !(c.signerName ?? "").toLowerCase().includes(s)) return false;
      }
      if (filterDateFrom && new Date(c.createdAt) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(c.createdAt) > new Date(filterDateTo + "T23:59:59")) return false;
      return true;
    });
  }, [contracts, filterStatus, filterSearch, filterDateFrom, filterDateTo]);

  const createMutation = trpc.contracts.create.useMutation({
    onSuccess: () => {
      toast.success("Contrato criado!");
      setCreateOpen(false);
      setForm({ title: "", value: "", signerName: "", signerEmail: "", content: "", contactId: "" });
      utils.contracts.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess: () => {
      toast.success("Contrato atualizado!");
      utils.contracts.list.invalidate();
      if (selectedContract) {
        setSelectedContract(prev => prev ? { ...prev, ...updateMutation.variables } : null);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const generateMutation = trpc.contracts.generateWithAI.useMutation({
    onSuccess: (data) => {
      const content = typeof data.content === "string" ? data.content : String(data.content);
      setGeneratedContent(content);
    },
    onError: (e) => toast.error(e.message),
  });

  const sendEmailMutation = trpc.documents.sendByEmail.useMutation({
    onSuccess: () => {
      toast.success("Email enviado com sucesso!");
      setEmailOpen(false);
      setEmailTo(""); setEmailName(""); setEmailSubject(""); setEmailMessage("");
    },
    onError: (e) => toast.error(`Erro ao enviar email: ${e.message}`),
  });

  const sendWaMutation = trpc.documents.sendByWhatsapp.useMutation({
    onSuccess: () => {
      toast.success("Contrato enviado via WhatsApp!");
      setWaOpen(false);
      setWaJid(""); setWaMessage("");
    },
    onError: (e) => toast.error(`Erro ao enviar WhatsApp: ${e.message}`),
  });

  const openDrawer = (contract: ContractWithContact) => {
    setSelectedContract(contract);
    setDrawerOpen(true);
  };

  const openEmailModal = (contract: ContractWithContact, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEmailContractId(contract.id);
    setEmailTo(contract.contactEmail ?? contract.signerEmail ?? "");
    setEmailName(contract.contactName ?? contract.signerName ?? "");
    setEmailSubject(`Contrato: ${contract.title}`);
    setEmailMessage("");
    setEmailOpen(true);
  };

  const openWaModal = (contract: ContractWithContact, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWaContractId(contract.id);
    if (contract.contactPhone) {
      const phone = contract.contactPhone.replace(/\D/g, "");
      setWaJid(phone.startsWith("55") ? `${phone}@s.whatsapp.net` : `55${phone}@s.whatsapp.net`);
    } else {
      setWaJid("");
    }
    setWaMessage("");
    setWaOpen(true);
  };

  const handleSendEmail = () => {
    if (!emailContractId || !emailTo) return;
    sendEmailMutation.mutate({
      type: "contract",
      documentId: emailContractId,
      recipientEmail: emailTo,
      recipientName: emailName || undefined,
      subject: emailSubject || undefined,
      message: emailMessage || undefined,
    });
  };

  const handleSendWa = () => {
    if (!waContractId || !waJid) return;
    sendWaMutation.mutate({
      type: "contract",
      documentId: waContractId,
      recipientJid: waJid,
      message: waMessage || undefined,
    });
  };

  const handleUseGenerated = () => {
    setForm(f => ({ ...f, title: aiForm.title, content: generatedContent, value: aiForm.value, signerName: aiForm.contactName }));
    setAiGenOpen(false);
    setCreateOpen(true);
  };

  const fmtCurrency = (v: string | null) =>
    v ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

  const fmtDate = (d: Date | null | undefined) =>
    d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—";

  return (
    <CRMLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" />
              Contratos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{contracts?.length ?? 0} contratos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAiGenOpen(true)}>
              <Sparkles className="w-4 h-4 mr-2 text-purple-400" />
              Gerar com IA
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Contrato
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center mb-6">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Buscar título ou cliente..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 px-3 rounded-md border border-border bg-input text-sm text-foreground">
            <option value="all">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="sent">Enviado</option>
            <option value="signed">Assinado</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-9 w-36 text-sm" />
          <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-9 w-36 text-sm" />
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => exportContractsCSV(filteredContracts)}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          {(filterStatus !== "all" || filterSearch || filterDateFrom || filterDateTo) && (
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setFilterStatus("all"); setFilterSearch(""); setFilterDateFrom(""); setFilterDateTo(""); }}>
              <XIcon className="w-3.5 h-3.5 mr-1" /> Limpar
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filteredContracts.length} resultado{filteredContracts.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Grid of contract cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : filteredContracts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredContracts.map((contract) => {
              const status = statusConfig[contract.status ?? "draft"] ?? statusConfig.draft;
              return (
                <div
                  key={contract.id}
                  className={cn(
                    "bg-card border rounded-xl p-5 cursor-pointer hover:shadow-md hover:shadow-black/20 transition-all group relative",
                    status.cardBorder
                  )}
                  onClick={() => openDrawer(contract)}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-orange-400" />
                    </div>
                    <span className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", status.badgeClass)}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-sm font-semibold text-foreground leading-tight mb-1 line-clamp-2">{contract.title}</p>

                  {/* Client */}
                  {(contract.contactName || contract.signerName) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <User className="w-3 h-3" />
                      {contract.contactName ?? contract.signerName}
                    </p>
                  )}

                  {/* Value + Date */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-green-400 font-medium">{fmtCurrency(contract.value)}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(contract.createdAt)}</span>
                  </div>

                  {/* Hover arrow */}
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum contrato criado ainda</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setAiGenOpen(true)}>
                <Sparkles className="w-4 h-4 mr-2 text-purple-400" />
                Gerar com IA
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Manualmente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Detail Drawer ─────────────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-card border-border">
          {selectedContract && (() => {
            const status = statusConfig[selectedContract.status ?? "draft"] ?? statusConfig.draft;
            return (
              <>
                <SheetHeader className="mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <SheetTitle className="text-base font-bold leading-tight">{selectedContract.title}</SheetTitle>
                      <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border mt-1", status.badgeClass)}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  </div>
                </SheetHeader>

                <Separator className="mb-4" />

                {/* KPI row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-background rounded-lg p-3 text-center">
                    <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-sm font-semibold text-green-400">{fmtCurrency(selectedContract.value)}</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <Calendar className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-sm font-semibold">{fmtDate(selectedContract.createdAt)}</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <FileSignature className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Válido até</p>
                    <p className="text-sm font-semibold">{fmtDate(selectedContract.validUntil)}</p>
                  </div>
                </div>

                {/* Client info */}
                {(selectedContract.contactName || selectedContract.signerName) && (
                  <div className="bg-background rounded-lg p-3 mb-4 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cliente / Signatário</p>
                    {selectedContract.contactName && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{selectedContract.contactName}</span>
                        {selectedContract.contactId && (
                          <button
                            className="text-xs text-orange-400 hover:underline ml-auto"
                            onClick={() => { setDrawerOpen(false); navigate(`/contacts/${selectedContract.contactId}`); }}
                          >
                            Ver perfil →
                          </button>
                        )}
                      </div>
                    )}
                    {(selectedContract.signerName && selectedContract.signerName !== selectedContract.contactName) && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileSignature className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{selectedContract.signerName}</span>
                      </div>
                    )}
                    {selectedContract.signerEmail && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selectedContract.signerEmail}</span>
                      </div>
                    )}
                    {selectedContract.signedAt && (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Assinado em {fmtDate(selectedContract.signedAt)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedContract.contactPhone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500/40 text-green-300 hover:bg-green-500/10"
                      onClick={() => openWaModal(selectedContract)}
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      WhatsApp
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                    onClick={() => openEmailModal(selectedContract)}
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    Email
                  </Button>
                  {selectedContract.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateMutation.mutate({ id: selectedContract.id, status: "sent" })}
                      disabled={updateMutation.isPending}
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Marcar como Enviado
                    </Button>
                  )}
                  {selectedContract.status === "sent" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => updateMutation.mutate({ id: selectedContract.id, status: "signed", signedAt: new Date() })}
                      disabled={updateMutation.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Registrar Assinatura
                    </Button>
                  )}
                  {selectedContract.status !== "cancelled" && selectedContract.status !== "signed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                      onClick={() => updateMutation.mutate({ id: selectedContract.id, status: "cancelled" })}
                      disabled={updateMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Cancelar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                    onClick={() => { setPortalLink(null); generatePortalMutation.mutate({ type: "contract", documentId: selectedContract.id, contactId: selectedContract.contactId ?? undefined }); }}
                    disabled={generatePortalMutation.isPending}
                  >
                    {generatePortalMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Link className="w-3.5 h-3.5 mr-1.5" />}
                    Link do Portal
                  </Button>
                </div>
                {portalLink && (
                  <div className="space-y-2 mb-2">
                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <p className="text-xs text-purple-300 truncate flex-1">{portalLink}</p>
                      <Button size="sm" variant="ghost" className="shrink-0 h-7 px-2" onClick={() => { navigator.clipboard.writeText(portalLink); toast.success("Copiado!"); }}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {selectedContract.contactId && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => sendPortalWhatsAppMutation.mutate({
                            portalUrl: portalLink,
                            contactId: selectedContract.contactId!,
                            documentTitle: selectedContract.title,
                            documentType: "contract",
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
                            contactId: selectedContract.contactId!,
                            documentTitle: selectedContract.title,
                            documentType: "contract",
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

                <Separator className="mb-4" />

                {/* Contract content */}
                {selectedContract.content ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Conteúdo do Contrato</p>
                    <div className="bg-background border border-border rounded-xl p-4 max-h-96 overflow-y-auto text-sm leading-relaxed">
                      <Streamdown>{selectedContract.content}</Streamdown>
                    </div>
                  </div>
                ) : (
                  <div className="bg-background border border-border rounded-xl p-4 text-center text-muted-foreground text-sm">
                    Nenhum conteúdo adicionado ao contrato.
                  </div>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ─── Create Contract Dialog ─────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título do contrato" className="mt-1.5 bg-input border-border" />
            </div>
            <div>
              <Label>Cliente (opcional)</Label>
              <Select value={form.contactId} onValueChange={(v) => setForm({ ...form, contactId: v })}>
                <SelectTrigger className="mt-1.5 bg-input border-border">
                  <SelectValue placeholder="Selecione um contato..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts?.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.company ? ` — ${c.company}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Signatário</Label>
                <Input value={form.signerName} onChange={(e) => setForm({ ...form, signerName: e.target.value })} placeholder="Nome completo" className="mt-1.5 bg-input border-border" />
              </div>
              <div>
                <Label>E-mail do Signatário</Label>
                <Input type="email" value={form.signerEmail} onChange={(e) => setForm({ ...form, signerEmail: e.target.value })} placeholder="email@exemplo.com" className="mt-1.5 bg-input border-border" />
              </div>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0,00" className="mt-1.5 bg-input border-border" />
            </div>
            <div>
              <Label>Conteúdo do Contrato</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Digite o conteúdo do contrato ou use a geração por IA..." className="mt-1.5 bg-input border-border resize-none" rows={10} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({
                title: form.title,
                content: form.content || undefined,
                value: form.value || undefined,
                signerName: form.signerName || undefined,
                signerEmail: form.signerEmail || undefined,
                contactId: form.contactId ? Number(form.contactId) : undefined,
              })}
              disabled={!form.title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AI Generation Dialog ───────────────────────────────────── */}
      <Dialog open={aiGenOpen} onOpenChange={setAiGenOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Gerar Contrato com IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título do Contrato</Label>
                <Input value={aiForm.title} onChange={(e) => setAiForm({ ...aiForm, title: e.target.value })} placeholder="Ex: Contrato de Gravação" className="mt-1.5 bg-input border-border" />
              </div>
              <div>
                <Label>Nome do Cliente</Label>
                <Input value={aiForm.contactName} onChange={(e) => setAiForm({ ...aiForm, contactName: e.target.value })} placeholder="Nome do cliente" className="mt-1.5 bg-input border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Contrato</Label>
                <Select value={aiForm.contractType} onValueChange={(v) => setAiForm({ ...aiForm, contractType: v })}>
                  <SelectTrigger className="mt-1.5 bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produção de podcast">Produção de Podcast</SelectItem>
                    <SelectItem value="gravação de episódios">Gravação de Episódios</SelectItem>
                    <SelectItem value="edição e pós-produção">Edição e Pós-Produção</SelectItem>
                    <SelectItem value="pacote mensal de episódios">Pacote Mensal de Episódios</SelectItem>
                    <SelectItem value="consultoria em podcast">Consultoria em Podcast</SelectItem>
                    <SelectItem value="distribuição e publicação">Distribuição e Publicação</SelectItem>
                    <SelectItem value="prestação de serviços">Prestação de Serviços Gerais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" value={aiForm.value} onChange={(e) => setAiForm({ ...aiForm, value: e.target.value })} placeholder="0,00" className="mt-1.5 bg-input border-border" />
              </div>
            </div>
            <div>
              <Label>Descrição dos Serviços</Label>
              <Textarea value={aiForm.description} onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })} placeholder="Descreva os serviços a serem prestados..." className="mt-1.5 bg-input border-border resize-none" rows={3} />
            </div>
            <Button
              onClick={() => generateMutation.mutate(aiForm)}
              disabled={!aiForm.title || !aiForm.contactName || !aiForm.description || generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />Gerando...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Gerar Contrato</>
              )}
            </Button>
            {generatedContent && (
              <div className="bg-background border border-border rounded-xl p-4 max-h-64 overflow-y-auto">
                <Streamdown>{generatedContent}</Streamdown>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiGenOpen(false)}>Fechar</Button>
            {generatedContent && (
              <Button onClick={handleUseGenerated}>Usar este Contrato</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Send by Email Dialog ───────────────────────────────────── */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Enviar Contrato por Email
            </DialogTitle>
            <DialogDescription>
              O contrato será enviado com um template profissional via Brevo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email do destinatário *</Label>
              <Input className="mt-1.5 bg-input border-border" type="email" placeholder="cliente@exemplo.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
            </div>
            <div>
              <Label>Nome do destinatário</Label>
              <Input className="mt-1.5 bg-input border-border" placeholder="Nome do cliente" value={emailName} onChange={(e) => setEmailName(e.target.value)} />
            </div>
            <div>
              <Label>Assunto (opcional)</Label>
              <Input className="mt-1.5 bg-input border-border" placeholder="Deixe em branco para usar o padrão" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
            <div>
              <Label>Mensagem adicional (opcional)</Label>
              <Textarea className="mt-1.5 bg-input border-border resize-none" placeholder="Observações que aparecerão no contrato..." rows={3} value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSendEmail} disabled={!emailTo || sendEmailMutation.isPending}>
              {sendEmailMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" />Enviar Email</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Send by WhatsApp Dialog ────────────────────────────────── */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-400" />
              Enviar Contrato via WhatsApp
            </DialogTitle>
            <DialogDescription>
              O PDF do contrato será gerado e enviado via Z-API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>JID do destinatário *</Label>
              <Input
                className="mt-1.5 bg-input border-border font-mono text-sm"
                placeholder="5511999999999@s.whatsapp.net"
                value={waJid}
                onChange={(e) => setWaJid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Formato: 55DDD+número@s.whatsapp.net</p>
            </div>
            <div>
              <Label>Mensagem de acompanhamento (opcional)</Label>
              <Textarea
                className="mt-1.5 bg-input border-border resize-none"
                placeholder="Segue em anexo o contrato para sua análise..."
                rows={3}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaOpen(false)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSendWa} disabled={!waJid || sendWaMutation.isPending}>
              {sendWaMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
              ) : (
                <><MessageSquare className="w-4 h-4 mr-2" />Enviar via WhatsApp</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
