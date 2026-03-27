import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Zap, Plus, Calendar, Trophy, X, User, ChevronRight,
  Trash2, MessageSquare, Mail, FileText, BookOpen, Clock,
  AlertCircle, CheckCircle2, XCircle, Loader2, DollarSign
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";

const fmt = (v: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    typeof v === "string" ? parseFloat(v) || 0 : (v ?? 0)
  );

type ViewMode = "open" | "won" | "lost";

export default function Pipeline() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("open");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "", stageId: "", value: "", probability: "50", notes: "", contactId: "",
  });

  const utils = trpc.useUtils();
  const { data: stages } = trpc.pipeline.stages.useQuery();
  const { data: openLeads, isLoading: openLoading } = trpc.pipeline.leads.useQuery({ status: "open" });
  const { data: wonLeads } = trpc.pipeline.leads.useQuery({ status: "won" });
  const { data: lostLeads } = trpc.pipeline.leads.useQuery({ status: "lost" });
  const { data: contacts } = trpc.contacts.list.useQuery({});

  const leads = viewMode === "open" ? openLeads : viewMode === "won" ? wonLeads : lostLeads;
  const selectedLead = leads?.find(l => l.id === selectedLeadId) ?? null;

  const invalidateLeads = () => {
    utils.pipeline.leads.invalidate({ status: "open" });
    utils.pipeline.leads.invalidate({ status: "won" });
    utils.pipeline.leads.invalidate({ status: "lost" });
  };

  const createMutation = trpc.pipeline.createLead.useMutation({
    onSuccess: () => {
      toast.success("Lead criado!");
      setCreateOpen(false);
      setForm({ title: "", stageId: "", value: "", probability: "50", notes: "", contactId: "" });
      invalidateLeads();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.pipeline.updateLead.useMutation({
    onSuccess: () => { invalidateLeads(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.pipeline.deleteLead.useMutation({
    onSuccess: () => {
      toast.success("Lead excluído!");
      setDeleteConfirmId(null);
      setSelectedLeadId(null);
      invalidateLeads();
    },
    onError: (e) => toast.error(e.message),
  });

  const getContactById = (id: number | null | undefined) =>
    contacts?.find(c => c.id === id) ?? null;

  const leadsPerStage = (stageId: number) =>
    (openLeads ?? []).filter(l => l.stageId === stageId);

  const stageTotal = (stageId: number) =>
    leadsPerStage(stageId).reduce((sum, l) => sum + Number(l.value ?? 0), 0);

  const openWhatsApp = (lead: typeof selectedLead) => {
    const contact = getContactById(lead?.contactId);
    if (!contact?.phone) { toast.error("Contato sem telefone cadastrado."); return; }
    const phone = contact.phone.replace(/\D/g, "");
    const jid = phone.startsWith("55") ? `${phone}@s.whatsapp.net` : `55${phone}@s.whatsapp.net`;
    setSelectedLeadId(null);
    navigate(`/whatsapp?chat=${encodeURIComponent(jid)}`);
  };

  return (
    <CRMLayout>
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" /> Pipeline
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {openLeads?.length ?? 0} abertos · {wonLeads?.length ?? 0} ganhos · {lostLeads?.length ?? 0} perdidos
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode tabs */}
            <div className="flex bg-muted rounded-lg p-1 gap-1">
              {([
                { key: "open" as ViewMode, label: "Abertos", icon: <Zap className="w-3.5 h-3.5" />, color: "text-blue-400" },
                { key: "won" as ViewMode, label: "Ganhos", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-400" },
                { key: "lost" as ViewMode, label: "Perdidos", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400" },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setViewMode(tab.key); setSelectedLeadId(null); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    viewMode === tab.key
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className={viewMode === tab.key ? tab.color : ""}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Lead
            </Button>
          </div>
        </div>

        {/* Kanban (open) or List (won/lost) */}
        {viewMode === "open" ? (
          openLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="min-w-[280px] bg-muted/30 rounded-xl h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
              {(stages ?? []).map(stage => (
                <div key={stage.id} className="min-w-[280px] max-w-[280px] flex flex-col shrink-0">
                  {/* Stage header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color ?? "#6b7280" }} />
                      <span className="text-sm font-semibold text-foreground">{stage.name}</span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">{leadsPerStage(stage.id).length}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmt(stageTotal(stage.id))}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 flex-1">
                    {leadsPerStage(stage.id).map(lead => {
                      const contact = getContactById(lead.contactId);
                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-yellow-500/40 hover:shadow-md hover:shadow-yellow-500/5 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2 flex-1">{lead.title}</p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-yellow-400 transition-colors ml-2 flex-shrink-0 mt-0.5" />
                          </div>
                          {contact && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">{contact.name}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            {lead.value ? (
                              <span className="text-sm font-bold text-yellow-400">{fmt(lead.value)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sem valor</span>
                            )}
                            {lead.probability != null && (
                              <span className="text-xs text-muted-foreground">{lead.probability}%</span>
                            )}
                          </div>
                          {lead.expectedCloseDate && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(lead.expectedCloseDate), "dd/MM/yy", { locale: ptBR })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => { setForm(f => ({ ...f, stageId: String(stage.id) })); setCreateOpen(true); }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar lead
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Won / Lost list view */
          <div className="space-y-2 flex-1 overflow-y-auto">
            {(leads ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                {viewMode === "won"
                  ? <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
                  : <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                }
                <p className="text-lg font-medium mb-1">
                  {viewMode === "won" ? "Nenhum lead ganho ainda" : "Nenhum lead perdido"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {viewMode === "won" ? "Marque leads como Ganho no Kanban" : "Leads marcados como Perdido aparecerão aqui"}
                </p>
              </div>
            ) : (
              (leads ?? []).map(lead => {
                const contact = getContactById(lead.contactId);
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={cn(
                      "bg-card border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all flex items-center justify-between group",
                      viewMode === "won" ? "border-green-500/20 hover:border-green-500/40" : "border-red-500/20 hover:border-red-500/40"
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={cn("w-2 h-8 rounded-full flex-shrink-0", viewMode === "won" ? "bg-green-500" : "bg-red-500")} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{lead.title}</p>
                        {contact && <p className="text-sm text-muted-foreground truncate">{contact.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {lead.value && <span className="font-bold text-foreground">{fmt(lead.value)}</span>}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(lead.updatedAt ?? lead.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ─── LEAD DETAIL SHEET ──────────────────────────────────────────────── */}
      <Sheet open={!!selectedLead} onOpenChange={(o) => { if (!o) setSelectedLeadId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (() => {
            const contact = getContactById(selectedLead.contactId);
            return (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <SheetTitle className="text-lg font-bold leading-tight pr-2">{selectedLead.title}</SheetTitle>
                    <Badge
                      className={cn("flex-shrink-0 mt-0.5",
                        selectedLead.status === "won" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                        selectedLead.status === "lost" ? "bg-red-500/20 text-red-300 border-red-500/30" :
                        "bg-blue-500/20 text-blue-300 border-blue-500/30"
                      )}
                      variant="outline"
                    >
                      {selectedLead.status === "won" ? "Ganho" : selectedLead.status === "lost" ? "Perdido" : "Aberto"}
                    </Badge>
                  </div>
                </SheetHeader>

                <div className="space-y-5">
                  {/* Contact card */}
                  {contact ? (
                    <div
                      className="bg-muted/30 rounded-lg p-4 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => { setSelectedLeadId(null); navigate(`/contacts/${contact.id}`); }}
                    >
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Cliente</p>
                      <p className="font-semibold text-foreground">{contact.name}</p>
                      {contact.email && <p className="text-sm text-muted-foreground">{contact.email}</p>}
                      {contact.phone && <p className="text-sm text-muted-foreground">{contact.phone}</p>}
                      <p className="text-xs text-yellow-400 mt-1">Ver perfil completo →</p>
                    </div>
                  ) : (
                    <div className="bg-muted/20 rounded-lg p-4 text-sm text-muted-foreground">
                      Nenhum contato vinculado a este lead.
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Valor</p>
                      <p className="font-bold text-foreground">{selectedLead.value ? fmt(selectedLead.value) : "—"}</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Probabilidade</p>
                      <p className="font-bold text-foreground">{selectedLead.probability != null ? `${selectedLead.probability}%` : "—"}</p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Criado em {format(new Date(selectedLead.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    {selectedLead.expectedCloseDate && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Fechamento: {format(new Date(selectedLead.expectedCloseDate), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                  </div>

                  {selectedLead.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Observações</p>
                      <p className="text-sm bg-muted/20 rounded-lg p-3">{selectedLead.notes}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Ações</p>

                    {/* Contact actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="gap-2 justify-start"
                        onClick={() => openWhatsApp(selectedLead)}
                        disabled={!contact?.phone}
                        title={!contact?.phone ? "Contato sem telefone" : "Abrir conversa WhatsApp"}
                      >
                        <MessageSquare className="w-4 h-4 text-green-400" /> WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 justify-start"
                        onClick={() => { setSelectedLeadId(null); navigate(`/contacts/${selectedLead.contactId}`); }}
                        disabled={!contact?.email}
                        title={!contact?.email ? "Contato sem email" : "Enviar email"}
                      >
                        <Mail className="w-4 h-4 text-blue-400" /> Email
                      </Button>
                    </div>

                    {/* Document actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="gap-2 justify-start text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                        onClick={() => { setSelectedLeadId(null); navigate("/quotes"); }}
                      >
                        <BookOpen className="w-4 h-4" /> Novo Orçamento
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 justify-start text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
                        onClick={() => { setSelectedLeadId(null); navigate("/invoices"); }}
                      >
                        <FileText className="w-4 h-4" /> Nova Fatura
                      </Button>
                    </div>

                    {/* Status transitions */}
                    {selectedLead.status === "open" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          className="gap-2 bg-green-600 hover:bg-green-700"
                          onClick={() => { updateMutation.mutate({ id: selectedLead.id, status: "won" }); setSelectedLeadId(null); }}
                          disabled={updateMutation.isPending}
                        >
                          <Trophy className="w-4 h-4" /> Marcar Ganho
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                          onClick={() => { updateMutation.mutate({ id: selectedLead.id, status: "lost" }); setSelectedLeadId(null); }}
                          disabled={updateMutation.isPending}
                        >
                          <XCircle className="w-4 h-4" /> Marcar Perdido
                        </Button>
                      </div>
                    )}
                    {(selectedLead.status === "won" || selectedLead.status === "lost") && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                        onClick={() => { updateMutation.mutate({ id: selectedLead.id, status: "open" }); setSelectedLeadId(null); }}
                        disabled={updateMutation.isPending}
                      >
                        <Zap className="w-4 h-4" /> Reabrir Lead
                      </Button>
                    )}

                    {/* Move stage (only for open) */}
                    {selectedLead.status === "open" && stages && stages.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2 block">Mover para etapa</Label>
                        <Select
                          value={String(selectedLead.stageId ?? "")}
                          onValueChange={(v) => updateMutation.mutate({ id: selectedLead.id, stageId: Number(v) })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecionar etapa" />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map(s => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Separator />

                    {/* Delete */}
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => setDeleteConfirmId(selectedLead.id)}
                    >
                      <Trash2 className="w-4 h-4" /> Excluir Lead
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ─── DELETE CONFIRM ──────────────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(o) => { if (!o) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" /> Excluir Lead
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O lead será excluído permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 gap-2"
              onClick={() => deleteConfirmId && deleteMutation.mutate({ id: deleteConfirmId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CREATE MODAL ────────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" /> Novo Lead
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Contato do cliente</Label>
              <Select
                value={form.contactId}
                onValueChange={(v) => {
                  const contact = contacts?.find(c => c.id === Number(v));
                  setForm(f => ({
                    ...f,
                    contactId: v,
                    title: f.title || (contact ? `Lead — ${contact.name}` : f.title),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar contato (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {(contacts ?? []).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.company ? ` — ${c.company}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título do lead *</Label>
              <Input
                placeholder="Ex: Gravação de podcast — 10 episódios"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor estimado (R$)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Probabilidade (%)</Label>
                <Input
                  type="number"
                  min="0" max="100"
                  value={form.probability}
                  onChange={e => setForm(f => ({ ...f, probability: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Etapa do pipeline</Label>
              <Select value={form.stageId} onValueChange={v => setForm(f => ({ ...f, stageId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar etapa" />
                </SelectTrigger>
                <SelectContent>
                  {(stages ?? []).map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Detalhes do lead..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!form.title.trim()) { toast.error("Título obrigatório"); return; }
                createMutation.mutate({
                  title: form.title,
                  contactId: form.contactId ? Number(form.contactId) : undefined,
                  stageId: form.stageId ? Number(form.stageId) : undefined,
                  value: form.value || undefined,
                  probability: form.probability ? Number(form.probability) : undefined,
                  notes: form.notes || undefined,
                });
              }}
              disabled={createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
