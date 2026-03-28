import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Zap, Plus, Calendar, Trophy, X, ChevronRight,
  Trash2, MessageSquare, Mail, FileText, BookOpen, Clock,
  AlertCircle, CheckCircle2, XCircle, Loader2, DollarSign,
  Filter, Download, Upload, Search, SlidersHorizontal,
  Activity, Star, BarChart2, List, Kanban, TrendingUp,
  Target, UserCheck, Info, PenLine, ArrowRight
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Papa from "papaparse";

const fmt = (v: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    typeof v === "string" ? parseFloat(v) || 0 : (v ?? 0)
  );

type ViewMode = "open" | "won" | "lost";
type DisplayMode = "kanban" | "list";

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

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function computeScore(lead: Lead): number {
  let score = 0;
  if (lead.contactId) score += 20;
  if (lead.value && Number(lead.value) > 0) score += 20;
  if (lead.probability && lead.probability > 50) score += 20;
  if (lead.updatedAt) {
    const daysSince = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 3) score += 20;
  }
  if (lead.expectedCloseDate) score += 20;
  return score;
}

function isStale(lead: Lead): boolean {
  if (!lead.updatedAt) return true;
  const daysSince = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 3;
}

// ─── Draggable Lead Card ──────────────────────────────────────────────────────
function DraggableLeadCard({
  lead, contact, onClick, wipExceeded,
}: {
  lead: Lead;
  contact: { name: string } | null;
  onClick: () => void;
  wipExceeded: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const score = computeScore(lead);
  const stale = isStale(lead);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-card border rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group select-none",
        stale ? "border-orange-500/30 hover:border-orange-500/50" : "border-border hover:border-yellow-500/40 hover:shadow-yellow-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2 flex-1">{lead.title}</p>
        <div className="flex items-center gap-1 shrink-0">
          {stale && <AlertCircle className="w-3.5 h-3.5 text-orange-400" />}
          <span className={cn("text-[10px] font-bold", scoreColor(score))}>{score}</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-yellow-400 transition-colors" />
        </div>
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

// ─── SOURCE LABELS ────────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  whatsapp: "WhatsApp",
  import: "Importação",
  website: "Website",
  event: "Evento",
  referral: "Indicação",
  cold_outreach: "Prospecção Ativa",
};

const LOST_REASONS = [
  "Preço acima do orçamento",
  "Escolheu concorrente",
  "Projeto cancelado",
  "Sem resposta",
  "Timing inadequado",
  "Escopo não atende",
  "Outro",
];

// ─── ACTIVITY ICON ────────────────────────────────────────────────────────────
function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    created: <Plus className="w-3.5 h-3.5 text-green-400" />,
    stage_changed: <ArrowRight className="w-3.5 h-3.5 text-blue-400" />,
    status_changed: <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400" />,
    note_added: <PenLine className="w-3.5 h-3.5 text-purple-400" />,
    whatsapp_sent: <MessageSquare className="w-3.5 h-3.5 text-green-400" />,
    email_sent: <Mail className="w-3.5 h-3.5 text-blue-400" />,
    invoice_generated: <FileText className="w-3.5 h-3.5 text-cyan-400" />,
    contract_generated: <BookOpen className="w-3.5 h-3.5 text-orange-400" />,
    value_updated: <DollarSign className="w-3.5 h-3.5 text-yellow-400" />,
    score_updated: <Star className="w-3.5 h-3.5 text-yellow-400" />,
    manual: <Activity className="w-3.5 h-3.5 text-muted-foreground" />,
  };
  return <>{map[type] ?? <Activity className="w-3.5 h-3.5 text-muted-foreground" />}</>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Pipeline() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("open");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("kanban");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [lostDialogId, setLostDialogId] = useState<number | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [lostReasonCustom, setLostReasonCustom] = useState("");
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [form, setForm] = useState({
    title: "", stageId: "", value: "", probability: "50", notes: "", contactId: "",
    source: "manual", expectedCloseDate: "",
  });
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<Array<{ title: string; contactName?: string; value?: string; notes?: string }>>([]);
  // WIP limits per stage (stageId → limit)
  const [wipLimits, setWipLimits] = useState<Record<number, number>>({});
  const [wipEditOpen, setWipEditOpen] = useState(false);
  const [wipDraft, setWipDraft] = useState<Record<number, string>>({});

  const utils = trpc.useUtils();
  const { data: stages } = trpc.pipeline.stages.useQuery();
  const { data: openLeads, isLoading: openLoading } = trpc.pipeline.leads.useQuery({ status: "open" });
  const { data: wonLeads } = trpc.pipeline.leads.useQuery({ status: "won" });
  const { data: lostLeads } = trpc.pipeline.leads.useQuery({ status: "lost" });
  const { data: contacts } = trpc.contacts.list.useQuery({});
  const { data: forecast } = trpc.pipeline.forecast.useQuery();
  const { data: activities, refetch: refetchActivities } = trpc.pipeline.activities.useQuery(
    { leadId: selectedLeadId! },
    { enabled: !!selectedLeadId }
  );

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
      setForm({ title: "", stageId: "", value: "", probability: "50", notes: "", contactId: "", source: "manual", expectedCloseDate: "" });
      invalidateLeads();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.pipeline.updateLead.useMutation({
    onSuccess: () => { invalidateLeads(); refetchActivities(); },
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

  const addActivityMutation = trpc.pipeline.addActivity.useMutation({
    onSuccess: () => { toast.success("Nota adicionada!"); setAddNoteOpen(false); setNoteText(""); refetchActivities(); },
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

  const staleLeads = useMemo(() =>
    (openLeads ?? []).filter(l => isStale({ ...l, status: l.status ?? "open" } as Lead)), [openLeads]);

  const openWhatsApp = (lead: typeof selectedLead) => {
    const contact = getContactById(lead?.contactId);
    if (!contact?.phone) { toast.error("Contato sem telefone cadastrado."); return; }
    const phone = contact.phone.replace(/\D/g, "");
    const jid = phone.startsWith("55") ? `${phone}@s.whatsapp.net` : `55${phone}@s.whatsapp.net`;
    setSelectedLeadId(null);
    navigate(`/whatsapp?chat=${encodeURIComponent(jid)}`);
  };

  const handleMarkLost = (leadId: number) => {
    setLostDialogId(leadId);
    setLostReason("");
    setLostReasonCustom("");
  };

  const confirmMarkLost = () => {
    if (!lostDialogId) return;
    const reason = lostReason === "Outro" ? lostReasonCustom : lostReason;
    updateMutation.mutate({ id: lostDialogId, status: "lost", lostReason: reason || undefined });
    setLostDialogId(null);
    setSelectedLeadId(null);
  };

  // ─── DnD ─────────────────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => setActiveLeadId(event.active.id as number);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLeadId(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = active.id as number;
    const overData = over.data?.current as { type?: string; stageId?: number; lead?: Lead } | undefined;
    let targetStageId: number | null = null;
    if (overData?.type === "column") targetStageId = overData.stageId ?? null;
    else if (overData?.type === "lead") targetStageId = overData.lead?.stageId ?? null;
    else {
      const stageMatch = stages?.find(s => s.id === over.id);
      if (stageMatch) targetStageId = stageMatch.id;
    }
    if (targetStageId === null) return;
    const lead = openLeads?.find(l => l.id === leadId);
    if (!lead || lead.stageId === targetStageId) return;
    utils.pipeline.leads.setData({ status: "open" }, (old) =>
      old?.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l) ?? old
    );
    updateMutation.mutate({ id: leadId, stageId: targetStageId });
  };

  const handleDragOver = (_event: DragOverEvent) => {};

  // ─── CSV Export/Import ────────────────────────────────────────────────────────
  const exportCSV = () => {
    const allLeads = [...(openLeads ?? []), ...(wonLeads ?? []), ...(lostLeads ?? [])];
    const rows = allLeads.map(l => ({
      ID: l.id, Título: l.title, Status: l.status,
      Etapa: stages?.find(s => s.id === l.stageId)?.name ?? "",
      Contato: getContactById(l.contactId)?.name ?? "",
      Valor: l.value ?? "", Probabilidade: l.probability ?? "",
      "Data Prevista": l.expectedCloseDate ? format(new Date(l.expectedCloseDate), "dd/MM/yyyy") : "",
      Score: computeScore(l as Lead),
      Criado: format(new Date(l.createdAt), "dd/MM/yyyy"),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pipeline_${format(new Date(), "yyyyMMdd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Pipeline exportado!");
  };

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
        title: row.title, value: row.value || undefined,
        notes: row.notes || undefined, contactId: contact?.id,
      });
      count++;
    }
    toast.success(`${count} leads importados!`);
    setImportOpen(false);
    setImportData([]);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <CRMLayout>
      <div className="p-6 h-full flex flex-col">
        {/* ── Forecast Bar ── */}
        {forecast && viewMode === "open" && (
          <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
            <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <BarChart2 className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pipeline Total</p>
                <p className="font-bold text-foreground text-sm">{fmt(forecast.totalOpen)}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Ponderado</p>
                <p className="font-bold text-foreground text-sm">{fmt(forecast.weightedValue)}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Forecast Este Mês</p>
                <p className="font-bold text-foreground text-sm">{fmt(forecast.forecastThisMonth)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Stale Alert ── */}
        {staleLeads.length > 0 && viewMode === "open" && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-300 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span><strong>{staleLeads.length}</strong> lead{staleLeads.length > 1 ? "s" : ""} sem atualização há mais de 3 dias</span>
          </div>
        )}

        {/* ── Header ── */}
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
                    viewMode === tab.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className={viewMode === tab.key ? tab.color : ""}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Display mode (kanban/list) — only for open */}
            {viewMode === "open" && (
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                <button onClick={() => setDisplayMode("kanban")} className={cn("p-1.5 rounded-md transition-all", displayMode === "kanban" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>
                  <Kanban className="w-4 h-4" />
                </button>
                <button onClick={() => setDisplayMode("list")} className={cn("p-1.5 rounded-md transition-all", displayMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className={cn("gap-2", showFilters && "bg-accent")}>
              <SlidersHorizontal className="w-4 h-4" /> Filtros
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setWipDraft(Object.fromEntries((stages ?? []).map(s => [s.id, String(wipLimits[s.id] ?? "")]))); setWipEditOpen(true); }} className="gap-2">
              <Target className="w-4 h-4" /> WIP
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" /> Exportar
            </Button>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <span><Upload className="w-4 h-4" /> Importar</span>
              </Button>
              <input type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
            </label>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Lead
            </Button>
          </div>
        </div>

        {/* ── Filters bar ── */}
        {showFilters && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-xl border border-border shrink-0">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 h-8 text-sm" placeholder="Buscar leads..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
            </div>
            <Select value={stageFilter || "all"} onValueChange={v => setStageFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-sm w-44"><SelectValue placeholder="Todas as etapas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as etapas</SelectItem>
                {(stages ?? []).map(s => (<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
            {(searchFilter || stageFilter || assigneeFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchFilter(""); setStageFilter(""); setAssigneeFilter(""); }} className="gap-1 text-xs">
                <X className="w-3 h-3" /> Limpar
              </Button>
            )}
          </div>
        )}

        {/* ── Kanban / List (open) or Won/Lost list ── */}
        {viewMode === "open" ? (
          openLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...Array(4)].map((_, i) => (<div key={i} className="min-w-[280px] bg-muted/30 rounded-xl h-64 animate-pulse" />))}
            </div>
          ) : displayMode === "kanban" ? (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                {(stages ?? []).map(stage => {
                  const stageLeads = filteredLeadsPerStage(stage.id);
                  const wipLimit = wipLimits[stage.id];
                  const wipExceeded = wipLimit != null && stageLeads.length > wipLimit;
                  return (
                    <div key={stage.id} className="min-w-[280px] max-w-[280px] flex flex-col shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color ?? "#6b7280" }} />
                          <span className="text-sm font-semibold text-foreground">{stage.name}</span>
                          <Badge variant="secondary" className={cn("text-xs px-1.5 py-0", wipExceeded && "bg-red-500/20 text-red-300 border-red-500/30")}>{stageLeads.length}{wipLimit != null ? `/${wipLimit}` : ""}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{fmt(stageTotal(stage.id))}</span>
                      </div>
                      {wipExceeded && (
                        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300">
                          <AlertCircle className="w-3 h-3" /> Limite WIP excedido
                        </div>
                      )}
                      <SortableContext items={stageLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                        <div className={cn("flex flex-col gap-2 flex-1 min-h-[120px] rounded-xl p-1 transition-colors", activeLeadId && "bg-muted/20 border-2 border-dashed border-border")} data-droppable-id={stage.id}>
                          {stageLeads.map(lead => (
                            <DraggableLeadCard key={lead.id} lead={lead as Lead} contact={getContactById(lead.contactId)} onClick={() => setSelectedLeadId(lead.id)} wipExceeded={wipExceeded} />
                          ))}
                          <button onClick={() => { setForm(f => ({ ...f, stageId: String(stage.id) })); setCreateOpen(true); }} className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
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
          ) : (
            /* ── List View ── */
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Lead</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Contato</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Etapa</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Valor</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Prob.</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Score</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Fechamento</th>
                  </tr>
                </thead>
                <tbody>
                  {(openLeads ?? [])
                    .filter(l => !searchFilter || l.title.toLowerCase().includes(searchFilter.toLowerCase()))
                    .sort((a, b) => computeScore(b as Lead) - computeScore(a as Lead))
                    .map(lead => {
                      const contact = getContactById(lead.contactId);
                      const stage = stages?.find(s => s.id === lead.stageId);
                      const score = computeScore({ ...lead, status: lead.status ?? "open" } as Lead);
                      const stale = isStale({ ...lead, status: lead.status ?? "open" } as Lead);
                      return (
                        <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className={cn("border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors", stale && "bg-orange-500/5")}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {stale && <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                              <span className="font-medium text-foreground truncate max-w-[200px]">{lead.title}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">{contact?.name ?? "—"}</td>
                          <td className="py-2.5 px-3">
                            {stage && <Badge variant="outline" className="text-xs" style={{ borderColor: stage.color ?? undefined, color: stage.color ?? undefined }}>{stage.name}</Badge>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-yellow-400">{lead.value && Number(lead.value) > 0 ? fmt(lead.value) : "—"}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{lead.probability != null ? `${lead.probability}%` : "—"}</td>
                          <td className={cn("py-2.5 px-3 text-right font-bold", scoreColor(score))}>{score}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground text-xs">
                            {lead.expectedCloseDate ? format(new Date(lead.expectedCloseDate), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── Won/Lost list ── */
          <div className="space-y-2 flex-1 overflow-y-auto">
            {(leads ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                {viewMode === "won" ? <Trophy className="w-12 h-12 text-muted-foreground mb-4" /> : <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />}
                <p className="text-lg font-medium mb-1">{viewMode === "won" ? "Nenhum lead ganho ainda" : "Nenhum lead perdido"}</p>
                <p className="text-sm text-muted-foreground">{viewMode === "won" ? "Marque leads como Ganho no Kanban" : "Leads marcados como Perdido aparecerão aqui"}</p>
              </div>
            ) : (
              (leads ?? []).map(lead => {
                const contact = getContactById(lead.contactId);
                return (
                  <div key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className={cn("bg-card border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all flex items-center justify-between group", viewMode === "won" ? "border-green-500/20 hover:border-green-500/40" : "border-red-500/20 hover:border-red-500/40")}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={cn("w-2 h-8 rounded-full flex-shrink-0", viewMode === "won" ? "bg-green-500" : "bg-red-500")} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{lead.title}</p>
                        {contact && <p className="text-sm text-muted-foreground truncate">{contact.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {lead.value && <span className="font-bold text-foreground">{fmt(lead.value)}</span>}
                      <span className="text-xs text-muted-foreground">{format(new Date(lead.updatedAt ?? lead.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
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
            const score = computeScore(selectedLead as Lead);
            return (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <SheetTitle className="text-lg font-bold leading-tight pr-2">{selectedLead.title}</SheetTitle>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <div className={cn("flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border", score >= 80 ? "bg-green-500/10 text-green-300 border-green-500/20" : score >= 50 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20" : "bg-red-500/10 text-red-300 border-red-500/20")}>
                        <Star className="w-3 h-3" /> {score}
                      </div>
                      <Badge className={cn(selectedLead.status === "won" ? "bg-green-500/20 text-green-300 border-green-500/30" : selectedLead.status === "lost" ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-blue-500/20 text-blue-300 border-blue-500/30")} variant="outline">
                        {selectedLead.status === "won" ? "Ganho" : selectedLead.status === "lost" ? "Perdido" : "Aberto"}
                      </Badge>
                    </div>
                  </div>
                </SheetHeader>

                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
                    <TabsTrigger value="actions" className="flex-1">Ações</TabsTrigger>
                    <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
                  </TabsList>

                  {/* ── Tab: Detalhes ── */}
                  <TabsContent value="details" className="space-y-4 mt-0">
                    {contact ? (
                      <div className="bg-muted/30 rounded-lg p-4 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setSelectedLeadId(null); navigate(`/contacts/${contact.id}`); }}>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Cliente</p>
                        <p className="font-semibold text-foreground">{contact.name}</p>
                        {contact.email && <p className="text-sm text-muted-foreground">{contact.email}</p>}
                        {contact.phone && <p className="text-sm text-muted-foreground">{contact.phone}</p>}
                        <p className="text-xs text-yellow-400 mt-1">Ver perfil completo →</p>
                      </div>
                    ) : (
                      <div className="bg-muted/20 rounded-lg p-4 text-sm text-muted-foreground">Nenhum contato vinculado.</div>
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

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Criado {format(new Date(selectedLead.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      {selectedLead.expectedCloseDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Fechamento: {format(new Date(selectedLead.expectedCloseDate), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      )}
                      {selectedLead.updatedAt && (
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" />
                          Atualizado {formatDistanceToNow(new Date(selectedLead.updatedAt), { addSuffix: true, locale: ptBR })}
                        </div>
                      )}
                    </div>

                    {selectedLead.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Observações</p>
                        <p className="text-sm bg-muted/20 rounded-lg p-3">{selectedLead.notes}</p>
                      </div>
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
                  </TabsContent>

                  {/* ── Tab: Ações ── */}
                  <TabsContent value="actions" className="space-y-3 mt-0">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="gap-2 justify-start" onClick={() => openWhatsApp(selectedLead)} disabled={!contact?.phone}>
                        <MessageSquare className="w-4 h-4 text-green-400" /> WhatsApp
                      </Button>
                      <Button variant="outline" className="gap-2 justify-start" onClick={() => { setSelectedLeadId(null); navigate(`/contacts/${selectedLead.contactId}`); }} disabled={!contact}>
                        <Mail className="w-4 h-4 text-blue-400" /> Ver Contato
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="gap-2 justify-start text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => {
                        const params = new URLSearchParams();
                        if (contact) { params.set("contactId", String(contact.id)); params.set("contactName", contact.name); }
                        setSelectedLeadId(null);
                        navigate(`/quotes?${params.toString()}`);
                      }}>
                        <BookOpen className="w-4 h-4" /> Novo Orçamento
                      </Button>
                      <Button variant="outline" className="gap-2 justify-start text-purple-400 border-purple-500/30 hover:bg-purple-500/10" onClick={() => {
                        const params = new URLSearchParams();
                        if (contact) { params.set("contactId", String(contact.id)); params.set("contactName", contact.name); }
                        setSelectedLeadId(null);
                        navigate(`/invoices?${params.toString()}`);
                      }}>
                        <FileText className="w-4 h-4" /> Nova Fatura
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="gap-2 justify-start text-orange-400 border-orange-500/30 hover:bg-orange-500/10" onClick={() => {
                        const params = new URLSearchParams();
                        if (contact) { params.set("contactId", String(contact.id)); params.set("contactName", contact.name); }
                        setSelectedLeadId(null);
                        navigate(`/contracts?${params.toString()}`);
                      }}>
                        <BookOpen className="w-4 h-4" /> Novo Contrato
                      </Button>
                      <Button variant="outline" className="gap-2 justify-start text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10" onClick={() => setAddNoteOpen(true)}>
                        <PenLine className="w-4 h-4" /> Adicionar Nota
                      </Button>
                    </div>

                    <Separator />

                    {selectedLead.status === "open" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => { updateMutation.mutate({ id: selectedLead.id, status: "won" }); setSelectedLeadId(null); }} disabled={updateMutation.isPending}>
                          <Trophy className="w-4 h-4" /> Marcar Ganho
                        </Button>
                        <Button variant="outline" className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => handleMarkLost(selectedLead.id)} disabled={updateMutation.isPending}>
                          <XCircle className="w-4 h-4" /> Marcar Perdido
                        </Button>
                      </div>
                    )}
                    {(selectedLead.status === "won" || selectedLead.status === "lost") && (
                      <Button variant="outline" className="w-full gap-2 text-blue-400 border-blue-500/30 hover:bg-blue-500/10" onClick={() => { updateMutation.mutate({ id: selectedLead.id, status: "open" }); setSelectedLeadId(null); }} disabled={updateMutation.isPending}>
                        <Zap className="w-4 h-4" /> Reabrir Lead
                      </Button>
                    )}

                    <Separator />
                    <Button variant="outline" className="w-full gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => setDeleteConfirmId(selectedLead.id)}>
                      <Trash2 className="w-4 h-4" /> Excluir Lead
                    </Button>
                  </TabsContent>

                  {/* ── Tab: Histórico ── */}
                  <TabsContent value="history" className="mt-0">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-foreground">Histórico de Atividades</p>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAddNoteOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> Nota
                      </Button>
                    </div>
                    {!activities || activities.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Activity className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activities.map((act) => (
                          <div key={act.id} className="flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                              <ActivityIcon type={act.type} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">{act.description}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true, locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ─── MARK LOST DIALOG ───────────────────────────────────────────────── */}
      <Dialog open={!!lostDialogId} onOpenChange={(o) => { if (!o) setLostDialogId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400"><XCircle className="w-5 h-5" /> Motivo da Perda</DialogTitle>
            <DialogDescription>Registrar o motivo ajuda a melhorar o processo comercial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={lostReason} onValueChange={setLostReason}>
              <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
              </SelectContent>
            </Select>
            {lostReason === "Outro" && (
              <Input placeholder="Descreva o motivo..." value={lostReasonCustom} onChange={e => setLostReasonCustom(e.target.value)} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostDialogId(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 gap-2" onClick={confirmMarkLost} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Confirmar Perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ADD NOTE DIALOG ────────────────────────────────────────────────── */}
      <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PenLine className="w-5 h-5 text-primary" /> Adicionar Nota</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Escreva uma nota sobre este lead..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNoteOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (!noteText.trim() || !selectedLeadId) return; addActivityMutation.mutate({ leadId: selectedLeadId, type: "note_added", description: noteText.trim() }); }} disabled={addActivityMutation.isPending || !noteText.trim()} className="gap-2">
              {addActivityMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />} Salvar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── WIP LIMITS DIALOG ──────────────────────────────────────────────── */}
      <Dialog open={wipEditOpen} onOpenChange={setWipEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Limites WIP por Etapa</DialogTitle>
            <DialogDescription>Defina o número máximo de leads por coluna. Deixe em branco para sem limite.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(stages ?? []).map(stage => (
              <div key={stage.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color ?? "#6b7280" }} />
                  <span className="text-sm text-foreground">{stage.name}</span>
                </div>
                <Input
                  type="number"
                  min="1"
                  className="w-20 h-8 text-sm text-right"
                  placeholder="∞"
                  value={wipDraft[stage.id] ?? ""}
                  onChange={e => setWipDraft(d => ({ ...d, [stage.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWipEditOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              const newLimits: Record<number, number> = {};
              for (const [id, val] of Object.entries(wipDraft)) {
                if (val && Number(val) > 0) newLimits[Number(id)] = Number(val);
              }
              setWipLimits(newLimits);
              setWipEditOpen(false);
              toast.success("Limites WIP salvos!");
            }} className="gap-2">
              <CheckCircle2 className="w-4 h-4" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRM ──────────────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(o) => { if (!o) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400"><Trash2 className="w-5 h-5" /> Excluir Lead</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
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
            <DialogDescription>{importData.length} leads encontrados no CSV.</DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {importData.slice(0, 10).map((row, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2">
                <span className="font-medium truncate flex-1">{row.title}</span>
                {row.value && <span className="text-yellow-400 shrink-0">{fmt(row.value)}</span>}
              </div>
            ))}
            {importData.length > 10 && <p className="text-xs text-muted-foreground text-center py-2">... e mais {importData.length - 10} leads</p>}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
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
              <div className="space-y-1.5 col-span-2">
                <Label>Título do lead *</Label>
                <Input placeholder="Ex: Gravação de podcast — 10 episódios" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor estimado (R$)</Label>
                <Input type="number" placeholder="0,00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Probabilidade (%)</Label>
                <Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} />
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
                <Label>Origem do lead</Label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Data prevista de fechamento</Label>
                <Input type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Observações</Label>
                <Textarea placeholder="Detalhes do lead..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
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
                  expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate) : undefined,
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
