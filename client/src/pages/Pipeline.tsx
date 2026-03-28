import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Zap, Plus, Calendar, Trophy, X, ChevronRight,
  Trash2, MessageSquare, Mail, FileText, BookOpen, Clock,
  AlertCircle, CheckCircle2, XCircle, Loader2, DollarSign,
  Filter, Download, Upload, Search, SlidersHorizontal
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
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
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Papa from "papaparse";

const fmt = (v: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    typeof v === "string" ? parseFloat(v) || 0 : (v ?? 0)
  );

type ViewMode = "open" | "won" | "lost";
type Lead = {
  id: number;
  title: string;
  contactId: number | null | undefined;
  stageId: number | null | undefined;
  value: string | number | null | undefined;
  probability: number | null | undefined;
  expectedCloseDate: Date | null | undefined;
  status: string;
  notes: string | null | undefined;
  createdAt: Date;
  updatedAt: Date | null | undefined;
  assignedUserId: number | null | undefined;
};

// ─── Draggable Lead Card ──────────────────────────────────────────────────────
function DraggableLeadCard({
  lead,
  contact,
  onClick,
}: {
  lead: Lead;
  contact: { name: string } | null;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-yellow-500/40 hover:shadow-md hover:shadow-yellow-500/5 transition-all group select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2 flex-1">{lead.title}</p>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-yellow-400 transition-colors shrink-0 mt-0.5" />
      </div>
      {lead.value && Number(lead.value) > 0 && (
        <div className="mb-2">
          <span className="text-lg font-bold text-yellow-400 leading-none">{fmt(lead.value)}</span>
        </div>
      )}
      {contact && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-primary">{contact.name.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-xs text-muted-foreground truncate">{contact.name}</span>
        </div>
      )}
      {lead.probability != null && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Probabilidade</span>
            <span className="text-[10px] font-medium text-muted-foreground">{lead.probability}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${lead.probability}%`,
                background: Number(lead.probability) >= 70 ? '#22c55e' : Number(lead.probability) >= 40 ? '#eab308' : '#ef4444'
              }}
            />
          </div>
        </div>
      )}
      {lead.expectedCloseDate && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {format(new Date(lead.expectedCloseDate), "dd/MM/yy", { locale: ptBR })}
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("open");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "", stageId: "", value: "", probability: "50", notes: "", contactId: "",
  });
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null);
  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<Array<{ title: string; contactName?: string; value?: string; notes?: string }>>([]);

  const utils = trpc.useUtils();
  const { data: stages } = trpc.pipeline.stages.useQuery();
  const { data: openLeads, isLoading: openLoading } = trpc.pipeline.leads.useQuery({ status: "open" });
  const { data: wonLeads } = trpc.pipeline.leads.useQuery({ status: "won" });
  const { data: lostLeads } = trpc.pipeline.leads.useQuery({ status: "lost" });
  const { data: contacts } = trpc.contacts.list.useQuery({});

  const leads = viewMode === "open" ? openLeads : viewMode === "won" ? wonLeads : lostLeads;
  const selectedLead = leads?.find(l => l.id === selectedLeadId) ?? null;
  const activeLead = openLeads?.find(l => l.id === activeLeadId) ?? null;

  const invalidateLeads = useCallback(() => {
    utils.pipeline.leads.invalidate({ status: "open" });
    utils.pipeline.leads.invalidate({ status: "won" });
    utils.pipeline.leads.invalidate({ status: "lost" });
  }, [utils]);

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

  // Filtered leads per stage
  const filteredLeadsPerStage = (stageId: number) => {
    let list = (openLeads ?? []).filter(l => l.stageId === stageId);
    if (searchFilter) list = list.filter(l => l.title.toLowerCase().includes(searchFilter.toLowerCase()));
    if (stageFilter && String(stageId) !== stageFilter) return [];
    if (assigneeFilter) list = list.filter(l => String(l.assignedUserId ?? "") === assigneeFilter);
    return list;
  };

  const stageTotal = (stageId: number) =>
    filteredLeadsPerStage(stageId).reduce((sum, l) => sum + Number(l.value ?? 0), 0);

  const openWhatsApp = (lead: typeof selectedLead) => {
    const contact = getContactById(lead?.contactId);
    if (!contact?.phone) { toast.error("Contato sem telefone cadastrado."); return; }
    const phone = contact.phone.replace(/\D/g, "");
    const jid = phone.startsWith("55") ? `${phone}@s.whatsapp.net` : `55${phone}@s.whatsapp.net`;
    setSelectedLeadId(null);
    navigate(`/whatsapp?chat=${encodeURIComponent(jid)}`);
  };

  // ─── DnD ─────────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLeadId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLeadId(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = active.id as number;
    const overId = over.id;
    // over.id can be a stageId (droppable column) or a leadId (sortable item)
    const overData = over.data?.current as { type?: string; stageId?: number; lead?: Lead } | undefined;
    let targetStageId: number | null = null;
    if (overData?.type === "column") {
      targetStageId = overData.stageId ?? null;
    } else if (overData?.type === "lead") {
      targetStageId = overData.lead?.stageId ?? null;
    } else {
      // Try to match overId as stageId directly
      const stageMatch = stages?.find(s => s.id === overId);
      if (stageMatch) targetStageId = stageMatch.id;
    }
    if (targetStageId === null) return;
    const lead = openLeads?.find(l => l.id === leadId);
    if (!lead || lead.stageId === targetStageId) return;
    // Optimistic update
    utils.pipeline.leads.setData({ status: "open" }, (old) =>
      old?.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l) ?? old
    );
    updateMutation.mutate({ id: leadId, stageId: targetStageId });
  };

  const handleDragOver = (_event: DragOverEvent) => {};

  // ─── CSV Export ───────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const allLeads = [...(openLeads ?? []), ...(wonLeads ?? []), ...(lostLeads ?? [])];
    const rows = allLeads.map(l => ({
      ID: l.id,
      Título: l.title,
      Status: l.status,
      Etapa: stages?.find(s => s.id === l.stageId)?.name ?? "",
      Contato: getContactById(l.contactId)?.name ?? "",
      Valor: l.value ?? "",
      Probabilidade: l.probability ?? "",
      "Data Prevista": l.expectedCloseDate ? format(new Date(l.expectedCloseDate), "dd/MM/yyyy") : "",
      Criado: format(new Date(l.createdAt), "dd/MM/yyyy"),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pipeline_${format(new Date(), "yyyyMMdd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Pipeline exportado com sucesso!");
  };

  // ─── CSV Import ───────────────────────────────────────────────────────────────
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<{ title?: string; Título?: string; value?: string; Valor?: string; notes?: string; Observações?: string; contactName?: string; Contato?: string }>(file, {
      header: true,
      complete: (results) => {
        const rows = results.data
          .filter(r => r.title || r["Título"])
          .map(r => ({
            title: (r.title || r["Título"] || "").trim(),
            value: r.value || r["Valor"] || undefined,
            notes: r.notes || r["Observações"] || undefined,
            contactName: r.contactName || r["Contato"] || undefined,
          }));
        setImportData(rows);
        setImportOpen(true);
      },
    });
  };

  const confirmImport = async () => {
    let count = 0;
    for (const row of importData) {
      if (!row.title) continue;
      const contact = contacts?.find(c => c.name.toLowerCase() === (row.contactName ?? "").toLowerCase());
      await createMutation.mutateAsync({
        title: row.title,
        value: row.value || undefined,
        notes: row.notes || undefined,
        contactId: contact?.id,
      });
      count++;
    }
    toast.success(`${count} leads importados com sucesso!`);
    setImportOpen(false);
    setImportData([]);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <CRMLayout>
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" /> Pipeline
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {openLeads?.length ?? 0} abertos · {wonLeads?.length ?? 0} ganhos · {lostLeads?.length ?? 0} perdidos
            </p>
          </div>
          <div className="flex items-center gap-2">
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
                    viewMode === tab.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className={viewMode === tab.key ? tab.color : ""}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className={cn("gap-2", showFilters && "bg-accent")}>
              <SlidersHorizontal className="w-4 h-4" /> Filtros
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" /> Exportar
            </Button>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <span><Upload className="w-4 h-4" /> Importar CSV</span>
              </Button>
              <input type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
            </label>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Lead
            </Button>
          </div>
        </div>

        {/* Filters bar */}
        {showFilters && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-xl border border-border shrink-0">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm"
                placeholder="Buscar leads..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
              />
            </div>
            <Select value={stageFilter || "all"} onValueChange={v => setStageFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-sm w-44">
                <SelectValue placeholder="Todas as etapas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as etapas</SelectItem>
                {(stages ?? []).map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(searchFilter || stageFilter || assigneeFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchFilter(""); setStageFilter(""); setAssigneeFilter(""); }} className="gap-1 text-xs">
                <X className="w-3 h-3" /> Limpar
              </Button>
            )}
          </div>
        )}

        {/* Kanban (open) or List (won/lost) */}
        {viewMode === "open" ? (
          openLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="min-w-[280px] bg-muted/30 rounded-xl h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                {(stages ?? []).map(stage => {
                  const stageLeads = filteredLeadsPerStage(stage.id);
                  return (
                    <div
                      key={stage.id}
                      className="min-w-[280px] max-w-[280px] flex flex-col shrink-0"
                      data-stage-id={stage.id}
                    >
                      {/* Stage header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color ?? "#6b7280" }} />
                          <span className="text-sm font-semibold text-foreground">{stage.name}</span>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">{stageLeads.length}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{fmt(stageTotal(stage.id))}</span>
                      </div>

                      {/* Drop zone */}
                      <SortableContext
                        items={stageLeads.map(l => l.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div
                          className={cn(
                            "flex flex-col gap-2 flex-1 min-h-[120px] rounded-xl p-1 transition-colors",
                            activeLeadId && "bg-muted/20 border-2 border-dashed border-border"
                          )}
                          data-droppable-id={stage.id}
                        >
                          {stageLeads.map(lead => (
                            <DraggableLeadCard
                              key={lead.id}
                              lead={lead as Lead}
                              contact={getContactById(lead.contactId)}
                              onClick={() => setSelectedLeadId(lead.id)}
                            />
                          ))}
                          <button
                            onClick={() => { setForm(f => ({ ...f, stageId: String(stage.id) })); setCreateOpen(true); }}
                            className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adicionar lead
                          </button>
                        </div>
                      </SortableContext>
                    </div>
                  );
                })}
              </div>

              <DragOverlay>
                {activeLead && (
                  <div className="bg-card border border-yellow-500/40 rounded-xl p-3.5 shadow-xl shadow-yellow-500/10 rotate-2 w-[280px]">
                    <p className="text-sm font-semibold text-foreground line-clamp-2">{activeLead.title}</p>
                    {activeLead.value && Number(activeLead.value) > 0 && (
                      <span className="text-lg font-bold text-yellow-400">{fmt(activeLead.value)}</span>
                    )}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )
        ) : (
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

                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Ações</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="gap-2 justify-start" onClick={() => openWhatsApp(selectedLead)} disabled={!contact?.phone}>
                        <MessageSquare className="w-4 h-4 text-green-400" /> WhatsApp
                      </Button>
                      <Button variant="outline" className="gap-2 justify-start" onClick={() => { setSelectedLeadId(null); navigate(`/contacts/${selectedLead.contactId}`); }} disabled={!contact?.email}>
                        <Mail className="w-4 h-4 text-blue-400" /> Email
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="gap-2 justify-start text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => { setSelectedLeadId(null); navigate("/quotes"); }}>
                        <BookOpen className="w-4 h-4" /> Novo Orçamento
                      </Button>
                      <Button variant="outline" className="gap-2 justify-start text-purple-400 border-purple-500/30 hover:bg-purple-500/10" onClick={() => { setSelectedLeadId(null); navigate("/invoices"); }}>
                        <FileText className="w-4 h-4" /> Nova Fatura
                      </Button>
                    </div>

                    {selectedLead.status === "open" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => { updateMutation.mutate({ id: selectedLead.id, status: "won" }); setSelectedLeadId(null); }} disabled={updateMutation.isPending}>
                          <Trophy className="w-4 h-4" /> Marcar Ganho
                        </Button>
                        <Button variant="outline" className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => { updateMutation.mutate({ id: selectedLead.id, status: "lost" }); setSelectedLeadId(null); }} disabled={updateMutation.isPending}>
                          <XCircle className="w-4 h-4" /> Marcar Perdido
                        </Button>
                      </div>
                    )}
                    {(selectedLead.status === "won" || selectedLead.status === "lost") && (
                      <Button variant="outline" className="w-full gap-2 text-blue-400 border-blue-500/30 hover:bg-blue-500/10" onClick={() => { updateMutation.mutate({ id: selectedLead.id, status: "open" }); setSelectedLeadId(null); }} disabled={updateMutation.isPending}>
                        <Zap className="w-4 h-4" /> Reabrir Lead
                      </Button>
                    )}

                    {selectedLead.status === "open" && stages && stages.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2 block">Mover para etapa</Label>
                        <Select value={String(selectedLead.stageId ?? "")} onValueChange={(v) => updateMutation.mutate({ id: selectedLead.id, stageId: Number(v) })}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Selecionar etapa" /></SelectTrigger>
                          <SelectContent>
                            {stages.map(s => (<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Separator />
                    <Button variant="outline" className="w-full gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => setDeleteConfirmId(selectedLead.id)}>
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
            <DialogTitle className="flex items-center gap-2 text-red-400"><Trash2 className="w-5 h-5" /> Excluir Lead</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita. O lead será excluído permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 gap-2" onClick={() => deleteConfirmId && deleteMutation.mutate({ id: deleteConfirmId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── IMPORT CONFIRM ──────────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-primary" /> Importar Leads</DialogTitle>
            <DialogDescription>{importData.length} leads encontrados no arquivo CSV. Confirme para importar.</DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {importData.slice(0, 10).map((row, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2">
                <span className="font-medium truncate flex-1">{row.title}</span>
                {row.value && <span className="text-yellow-400 shrink-0">{fmt(row.value)}</span>}
              </div>
            ))}
            {importData.length > 10 && (
              <p className="text-xs text-muted-foreground text-center py-2">... e mais {importData.length - 10} leads</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={confirmImport} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importar {importData.length} leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CREATE MODAL ────────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> Novo Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Contato do cliente</Label>
              <Select value={form.contactId} onValueChange={(v) => {
                const contact = contacts?.find(c => c.id === Number(v));
                setForm(f => ({ ...f, contactId: v, title: f.title || (contact ? `Lead — ${contact.name}` : f.title) }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar contato (opcional)" /></SelectTrigger>
                <SelectContent>
                  {(contacts ?? []).map(c => (<SelectItem key={c.id} value={String(c.id)}>{c.name}{c.company ? ` — ${c.company}` : ""}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título do lead *</Label>
              <Input placeholder="Ex: Gravação de podcast — 10 episódios" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor estimado (R$)</Label>
                <Input type="number" placeholder="0,00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Probabilidade (%)</Label>
                <Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Etapa do pipeline</Label>
              <Select value={form.stageId} onValueChange={v => setForm(f => ({ ...f, stageId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar etapa" /></SelectTrigger>
                <SelectContent>
                  {(stages ?? []).map(s => (<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Detalhes do lead..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
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
