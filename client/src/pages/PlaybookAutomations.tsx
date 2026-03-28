import { useState } from "react";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Zap, MessageSquare, FileSignature, RefreshCw, Clock, AlertCircle,
  CheckCircle2, Play, Loader2, ChevronRight, Star, Rocket, BarChart2,
  Calendar, History, ArrowRight, XCircle, SkipForward, TrendingUp,
  Activity, Settings2, Mail, Wifi, WifiOff,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────
type AutomationDef = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerType: string;
  condition: string;
  action: string;
  channel: string;
  category: string;
  icon: string;
  color: string;
  isActive: boolean;
  lastRunAt: Date | null;
  totalRuns: number;
  totalSuccess: number;
  totalErrors: number;
};

type LogRow = {
  id: number;
  automationId: string;
  automationName: string;
  trigger: string;
  status: string;
  affectedCount: number;
  result: string | null;
  errorMessage: string | null;
  executedAt: Date;
};

// ─── Mapeamento de ícones ─────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare className="h-4 w-4" />,
  Clock: <Clock className="h-4 w-4" />,
  FileSignature: <FileSignature className="h-4 w-4" />,
  RefreshCw: <RefreshCw className="h-4 w-4" />,
  AlertCircle: <AlertCircle className="h-4 w-4" />,
  Rocket: <Rocket className="h-4 w-4" />,
  Star: <Star className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  BarChart2: <BarChart2 className="h-4 w-4" />,
};

// ─── Mapeamento de cores ──────────────────────────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  green:  { bg: "bg-green-500/5",  text: "text-green-400",  border: "border-green-500/20",  iconBg: "bg-green-500/10" },
  yellow: { bg: "bg-yellow-500/5", text: "text-yellow-400", border: "border-yellow-500/20", iconBg: "bg-yellow-500/10" },
  purple: { bg: "bg-purple-500/5", text: "text-purple-400", border: "border-purple-500/20", iconBg: "bg-purple-500/10" },
  orange: { bg: "bg-orange-500/5", text: "text-orange-400", border: "border-orange-500/20", iconBg: "bg-orange-500/10" },
  red:    { bg: "bg-red-500/5",    text: "text-red-400",    border: "border-red-500/20",    iconBg: "bg-red-500/10" },
  blue:   { bg: "bg-blue-500/5",   text: "text-blue-400",   border: "border-blue-500/20",   iconBg: "bg-blue-500/10" },
  amber:  { bg: "bg-amber-500/5",  text: "text-amber-400",  border: "border-amber-500/20",  iconBg: "bg-amber-500/10" },
  indigo: { bg: "bg-indigo-500/5", text: "text-indigo-400", border: "border-indigo-500/20", iconBg: "bg-indigo-500/10" },
  cyan:   { bg: "bg-cyan-500/5",   text: "text-cyan-400",   border: "border-cyan-500/20",   iconBg: "bg-cyan-500/10" },
  teal:   { bg: "bg-teal-500/5",   text: "text-teal-400",   border: "border-teal-500/20",   iconBg: "bg-teal-500/10" },
};

const CATEGORY_LABELS: Record<string, string> = {
  lead_nurturing: "Nutrição de Leads",
  onboarding: "Onboarding",
  retention: "Retenção",
  financial: "Financeiro",
  satisfaction: "Satisfação",
  re_engagement: "Reengajamento",
  studio: "Estúdio",
  reporting: "Relatórios",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
  error: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  skipped: <SkipForward className="h-3.5 w-3.5 text-yellow-400" />,
};

const STATUS_COLOR: Record<string, string> = {
  success: "text-green-400 bg-green-500/10 border-green-500/20",
  error: "text-red-400 bg-red-500/10 border-red-500/20",
  skipped: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PlaybookAutomations() {
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationDef | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runAllLoading, setRunAllLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const utils = trpc.useUtils();

  // Queries
  const { data: automations = [], isLoading } = trpc.smartAutomations.list.useQuery();
  const { data: logs = [], isLoading: logsLoading } = trpc.smartAutomations.getLogs.useQuery(
    { automationId: selectedAutomation?.id, limit: 30 },
    { enabled: logsOpen }
  );

  // Mutations
  const toggleMutation = trpc.smartAutomations.toggle.useMutation({
    onSuccess: () => utils.smartAutomations.list.invalidate(),
    onError: (e) => toast.error(`Erro ao alternar: ${e.message}`),
  });

  const runMutation = trpc.smartAutomations.run.useMutation({
    onSuccess: (data, vars) => {
      setRunningId(null);
      utils.smartAutomations.list.invalidate();
      if (data.status === "success") {
        toast.success(`Automação executada: ${data.result}`);
      } else if (data.status === "skipped") {
        toast.info(data.result);
      } else {
        toast.error(`Erro: ${data.result}`);
      }
    },
    onError: (e) => {
      setRunningId(null);
      toast.error(`Erro: ${e.message}`);
    },
  });

  const runAllMutation = trpc.smartAutomations.runAll.useMutation({
    onSuccess: (data) => {
      setRunAllLoading(false);
      utils.smartAutomations.list.invalidate();
      toast.success(`${data.length} automações agendadas para execução`);
    },
    onError: (e) => {
      setRunAllLoading(false);
      toast.error(`Erro: ${e.message}`);
    },
  });

  const handleToggle = (automation: AutomationDef, value: boolean) => {
    toggleMutation.mutate({ automationId: automation.id, isActive: value });
  };

  const handleRun = (automation: AutomationDef) => {
    setRunningId(automation.id);
    runMutation.mutate({ automationId: automation.id });
  };

  const handleRunAll = () => {
    setRunAllLoading(true);
    runAllMutation.mutate();
  };

  const handleOpenLogs = (automation: AutomationDef) => {
    setSelectedAutomation(automation);
    setLogsOpen(true);
  };

  // Filtrar por categoria
  const categories = ["all", ...Array.from(new Set(automations.map((a) => a.category)))];
  const filtered = activeCategory === "all"
    ? automations
    : automations.filter((a) => a.category === activeCategory);

  // Métricas gerais
  const totalActive = automations.filter((a) => a.isActive).length;
  const totalRuns = automations.reduce((s, a) => s + (a.totalRuns ?? 0), 0);
  const totalSuccess = automations.reduce((s, a) => s + (a.totalSuccess ?? 0), 0);
  const successRate = totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0;

  return (
    <CRMLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">

        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Central de Automações
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              10 automações baseadas em melhores práticas de CRM e WhatsApp — configure, monitore e dispare manualmente.
            </p>
          </div>
          <Button onClick={handleRunAll} disabled={runAllLoading} className="gap-2 shrink-0">
            {runAllLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Executar Todas Agendadas
          </Button>
        </div>

        {/* ─── Métricas gerais ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Wifi className="h-4 w-4 text-green-400" />
                <span className="text-xs text-muted-foreground">Ativas</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalActive}</p>
              <p className="text-xs text-muted-foreground">de {automations.length} automações</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Execuções</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalRuns}</p>
              <p className="text-xs text-muted-foreground">total de disparos</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-xs text-muted-foreground">Taxa de sucesso</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{successRate}%</p>
              <p className="text-xs text-muted-foreground">{totalSuccess} sucessos</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-muted-foreground">Categorias</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{categories.length - 1}</p>
              <p className="text-xs text-muted-foreground">tipos de automação</p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Filtros de categoria ─────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60"
              }`}
            >
              {cat === "all" ? "Todas" : CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* ─── Grid de automações ───────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando automações...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((automation) => {
              const colors = COLOR_MAP[automation.color] ?? COLOR_MAP.blue;
              const isRunning = runningId === automation.id;
              const isEvent = automation.triggerType === "event";

              return (
                <Card
                  key={automation.id}
                  className={`border transition-all hover:shadow-md ${colors.border} ${automation.isActive ? "" : "opacity-60"}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colors.iconBg} ${colors.text}`}>
                          {ICON_MAP[automation.icon] ?? <Zap className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm leading-tight">{automation.name}</CardTitle>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors.text} ${colors.border}`}>
                              {CATEGORY_LABELS[automation.category] ?? automation.category}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border/40">
                              {isEvent ? "Evento" : "Agendado"}
                            </Badge>
                            {automation.channel === "email" ? (
                              <Mail className="h-3 w-3 text-blue-400" />
                            ) : (
                              <MessageSquare className="h-3 w-3 text-green-400" />
                            )}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={automation.isActive}
                        onCheckedChange={(v) => handleToggle(automation, v)}
                        className="shrink-0"
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {automation.description}
                    </p>

                    <Separator className="opacity-50" />

                    {/* Fluxo */}
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-16 shrink-0 pt-0.5">Trigger</span>
                        <span className="text-xs text-foreground/80 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                          {automation.trigger}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-16 shrink-0 pt-0.5">Condição</span>
                        <span className="text-xs text-foreground/80 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          {automation.condition}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-16 shrink-0 pt-0.5">Ação</span>
                        <span className="text-xs text-foreground/80 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                          {automation.action}
                        </span>
                      </div>
                    </div>

                    <Separator className="opacity-50" />

                    {/* Estatísticas */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {automation.totalRuns ?? 0} execuções
                        </span>
                        {(automation.totalRuns ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            {automation.totalSuccess ?? 0} ok
                          </span>
                        )}
                      </div>
                      {automation.lastRunAt && (
                        <span className="text-[10px]">
                          Último: {new Date(automation.lastRunAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`flex-1 h-7 text-xs gap-1 ${colors.text} ${colors.border}`}
                        onClick={() => handleRun(automation)}
                        disabled={isRunning}
                      >
                        {isRunning ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {isRunning ? "Executando..." : "Executar agora"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                        onClick={() => handleOpenLogs(automation)}
                      >
                        <History className="h-3 w-3" />
                        Logs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ─── Legenda de melhores práticas ─────────────────────────────── */}
        <Card className="border-border/30 bg-muted/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Melhores práticas implementadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                <span>Boas-vindas imediatas aumentam em 3x a taxa de resposta (HubSpot, 2024)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                <span>Follow-up em 48h recupera 25% dos leads que não responderam</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                <span>Onboarding automatizado reduz churn em 15% no primeiro mês</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                <span>Lembretes de fatura reduzem inadimplência em 40% (Stripe, 2023)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                <span>NPS pós-projeto aumenta reviews positivos em 60%</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                <span>Reengajamento em 7 dias converte 18% dos leads inativos</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Sheet de Logs ───────────────────────────────────────────────── */}
      <Sheet open={logsOpen} onOpenChange={setLogsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico de Execuções
            </SheetTitle>
            <SheetDescription>
              {selectedAutomation?.name} — últimas 30 execuções
            </SheetDescription>
          </SheetHeader>

          {logsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando logs...
            </div>
          ) : !logs || (logs as LogRow[]).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <History className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhuma execução registrada ainda.</p>
              <p className="text-xs text-center">Execute a automação manualmente para ver o histórico aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(logs as LogRow[]).map((log) => (
                <div key={log.id} className="p-3 rounded-lg border border-border/50 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {STATUS_ICON[log.status] ?? STATUS_ICON.skipped}
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLOR[log.status] ?? ""}`}>
                        {log.status === "success" ? "Sucesso" : log.status === "error" ? "Erro" : "Ignorado"}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.executedAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {log.affectedCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{log.affectedCount}</span> item(s) afetado(s)
                    </p>
                  )}
                  {log.result && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{log.result}</p>
                  )}
                  {log.errorMessage && (
                    <p className="text-xs text-red-400 leading-relaxed">{log.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </CRMLayout>
  );
}
