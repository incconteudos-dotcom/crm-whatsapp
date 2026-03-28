import { useState } from "react";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertTriangle, BarChart2, CheckCircle2, ChevronRight, Clock, Cpu, DollarSign,
  Lightbulb, Loader2, Plus, RefreshCw, Settings, Target, Trash2, Users, Zap
} from "lucide-react";

const DOMAIN_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  comercial:   { label: "Comercial",   icon: <DollarSign className="w-4 h-4" />,    color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  financeiro:  { label: "Financeiro",  icon: <BarChart2 className="w-4 h-4" />,     color: "bg-green-500/10 text-green-400 border-green-500/20" },
  producao:    { label: "Produção",    icon: <Cpu className="w-4 h-4" />,           color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  pessoas:     { label: "Pessoas",     icon: <Users className="w-4 h-4" />,         color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  tecnologia:  { label: "Tecnologia",  icon: <Zap className="w-4 h-4" />,           color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:      { label: "Baixa",    color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  medium:   { label: "Média",    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  high:     { label: "Alta",     color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  critical: { label: "Crítica",  color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:     { label: "Ativa",      color: "bg-red-500/10 text-red-400" },
  monitoring: { label: "Monitorando", color: "bg-yellow-500/10 text-yellow-400" },
  resolved:   { label: "Resolvida",  color: "bg-green-500/10 text-green-400" },
};

export function ToC() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [showNewConstraint, setShowNewConstraint] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Queries
  const dashboardQuery = trpc.toc.dashboard.useQuery();
  const sessionsQuery = trpc.toc.listSessions.useQuery();
  const constraintsQuery = trpc.toc.listConstraints.useQuery({
    sessionId: selectedSessionId ?? undefined,
  });
  const actionItemsQuery = trpc.toc.listActionItems.useQuery({
    sessionId: selectedSessionId ?? undefined,
  });
  const configQuery = trpc.toc.getConfig.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const createSession = trpc.toc.createSession.useMutation({
    onSuccess: () => { utils.toc.listSessions.invalidate(); utils.toc.dashboard.invalidate(); toast.success("Sessão criada!"); setShowNewSession(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateSession = trpc.toc.updateSession.useMutation({
    onSuccess: () => { utils.toc.listSessions.invalidate(); utils.toc.dashboard.invalidate(); toast.success("Sessão atualizada!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSession = trpc.toc.deleteSession.useMutation({
    onSuccess: () => { utils.toc.listSessions.invalidate(); utils.toc.dashboard.invalidate(); setSelectedSessionId(null); toast.success("Sessão removida."); },
    onError: (e) => toast.error(e.message),
  });
  const createConstraint = trpc.toc.createConstraint.useMutation({
    onSuccess: () => { utils.toc.listConstraints.invalidate(); utils.toc.dashboard.invalidate(); toast.success("Restrição adicionada!"); setShowNewConstraint(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateConstraint = trpc.toc.updateConstraint.useMutation({
    onSuccess: () => { utils.toc.listConstraints.invalidate(); utils.toc.dashboard.invalidate(); toast.success("Restrição atualizada!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteConstraint = trpc.toc.deleteConstraint.useMutation({
    onSuccess: () => { utils.toc.listConstraints.invalidate(); utils.toc.dashboard.invalidate(); toast.success("Restrição removida."); },
    onError: (e) => toast.error(e.message),
  });
  const updateActionItem = trpc.toc.updateActionItem.useMutation({
    onSuccess: () => { utils.toc.listActionItems.invalidate(); utils.toc.dashboard.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const saveConfig = trpc.toc.saveConfig.useMutation({
    onSuccess: () => { utils.toc.getConfig.invalidate(); toast.success("Configurações salvas!"); setShowConfig(false); },
    onError: (e) => toast.error(e.message),
  });
  const generateSession = trpc.toc.generateSession.useMutation({
    onError: (e) => toast.error(e.message),
  });

  // New session form state
  const [newSession, setNewSession] = useState({ title: "", weekDate: new Date().toISOString().split("T")[0] });
  const [newConstraint, setNewConstraint] = useState<{ domain: string; title: string; description: string; severity: "low" | "medium" | "high" | "critical"; rootCause: string; impact: string }>({
    domain: "comercial", title: "", description: "", severity: "medium", rootCause: "", impact: ""
  });
  const [configForm, setConfigForm] = useState({ businessContext: "", weeklyDay: "monday", weeklyTime: "08:00", autoGenerate: true });

  const dashboard = dashboardQuery.data;
  const sessions = sessionsQuery.data ?? [];
  const constraints = constraintsQuery.data ?? [];
  const actionItems = actionItemsQuery.data ?? [];
  const config = configQuery.data;

  const handleGenerateSession = async () => {
    setIsGenerating(true);
    try {
      const result = await generateSession.mutateAsync({
        businessContext: config?.businessContext ?? undefined,
        domains: config?.domains ? JSON.parse(config.domains) : undefined,
      });
      // Create session with generated data
      await createSession.mutateAsync({
        title: result.title,
        weekDate: new Date(),
        status: "draft",
        summary: result.summary,
        mainConstraint: result.mainConstraint,
        recommendations: result.recommendations,
      });
      toast.success("Sessão gerada pela IA com sucesso!");
      setActiveTab("sessions");
    } catch {
      toast.error("Falha ao gerar sessão com IA");
    } finally {
      setIsGenerating(false);
    }
  };

  const constraintsByDomain = constraints.reduce((acc, c) => {
    if (!acc[c.domain]) acc[c.domain] = [];
    acc[c.domain].push(c);
    return acc;
  }, {} as Record<string, typeof constraints>);

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Theory of Constraints</h1>
            <p className="text-sm text-muted-foreground mt-1">Identifique e elimine as restrições que limitam o crescimento do negócio</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setConfigForm({ businessContext: config?.businessContext ?? "", weeklyDay: config?.weeklyDay ?? "monday", weeklyTime: config?.weeklyTime ?? "08:00", autoGenerate: config?.autoGenerate ?? true }); setShowConfig(true); }}>
              <Settings className="w-4 h-4 mr-2" /> Configurar
            </Button>
            <Button size="sm" onClick={handleGenerateSession} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
              Gerar com IA
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="sessions">Sessões</TabsTrigger>
            <TabsTrigger value="constraints">Restrições</TabsTrigger>
            <TabsTrigger value="actions">Ações</TabsTrigger>
          </TabsList>

          {/* ── DASHBOARD ── */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                    <div>
                      <p className="text-2xl font-bold">{dashboard?.activeConstraints ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Restrições Ativas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10"><Target className="w-5 h-5 text-orange-400" /></div>
                    <div>
                      <p className="text-2xl font-bold">{dashboard?.criticalConstraints ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Críticas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="w-5 h-5 text-yellow-400" /></div>
                    <div>
                      <p className="text-2xl font-bold">{dashboard?.pendingActions ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Ações Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10"><RefreshCw className="w-5 h-5 text-blue-400" /></div>
                    <div>
                      <p className="text-2xl font-bold">{sessions.length}</p>
                      <p className="text-xs text-muted-foreground">Sessões Totais</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Latest session + domain breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Latest session */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Última Sessão ToC</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard?.latestSession ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{dashboard.latestSession.title}</p>
                        <Badge className={STATUS_CONFIG[dashboard.latestSession.status]?.color ?? ""}>
                          {STATUS_CONFIG[dashboard.latestSession.status]?.label ?? dashboard.latestSession.status}
                        </Badge>
                      </div>
                      {dashboard.latestSession.mainConstraint && (
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                          <p className="text-xs text-muted-foreground mb-1">Restrição Principal</p>
                          <p className="text-sm">{dashboard.latestSession.mainConstraint}</p>
                        </div>
                      )}
                      {dashboard.latestSession.recommendations && (
                        <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                          <p className="text-xs text-muted-foreground mb-1">Recomendações</p>
                          <p className="text-sm">{dashboard.latestSession.recommendations}</p>
                        </div>
                      )}
                      <Button variant="outline" size="sm" className="w-full" onClick={() => { setSelectedSessionId(dashboard.latestSession!.id); setActiveTab("sessions"); }}>
                        Ver detalhes <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma sessão ainda</p>
                      <Button size="sm" className="mt-3" onClick={handleGenerateSession} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                        Gerar primeira sessão
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Domain breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Restrições por Domínio</CardTitle>
                </CardHeader>
                <CardContent>
                  {(dashboard?.constraintsByDomain ?? []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sem restrições ativas</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(dashboard?.constraintsByDomain ?? []).map((item) => {
                        const domainInfo = DOMAIN_LABELS[item.domain] ?? { label: item.domain, icon: null, color: "" };
                        const maxCount = Math.max(...(dashboard?.constraintsByDomain ?? []).map((d) => Number(d.count)));
                        const pct = maxCount > 0 ? (Number(item.count) / maxCount) * 100 : 0;
                        return (
                          <div key={item.domain} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {domainInfo.icon}
                                <span>{domainInfo.label}</span>
                              </div>
                              <span className="font-medium">{item.count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SESSIONS ── */}
          <TabsContent value="sessions" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{sessions.length} sessão(ões) registrada(s)</p>
              <Button size="sm" onClick={() => setShowNewSession(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nova Sessão
              </Button>
            </div>
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma sessão criada ainda.</p>
                    <Button size="sm" className="mt-4" onClick={handleGenerateSession} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                      Gerar com IA
                    </Button>
                  </CardContent>
                </Card>
              ) : sessions.map((s) => (
                <Card key={s.id} className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedSessionId === s.id ? "border-primary" : ""}`} onClick={() => setSelectedSessionId(s.id === selectedSessionId ? null : s.id)}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{s.title}</p>
                          <Badge className={STATUS_CONFIG[s.status]?.color ?? ""}>{STATUS_CONFIG[s.status]?.label ?? s.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(s.weekDate).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
                        {s.mainConstraint && <p className="text-xs text-muted-foreground mt-1 truncate">Restrição: {s.mainConstraint}</p>}
                      </div>
                      <div className="flex gap-1">
                        {s.status !== "completed" && (
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); updateSession.mutate({ id: s.id, status: "completed", completedAt: new Date() }); }}>
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); if (confirm("Remover sessão?")) deleteSession.mutate({ id: s.id }); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {selectedSessionId === s.id && s.summary && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Resumo</p>
                        <p className="text-sm">{s.summary}</p>
                        {s.recommendations && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Recomendações</p>
                            <p className="text-sm">{s.recommendations}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── CONSTRAINTS ── */}
          <TabsContent value="constraints" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{constraints.length} restrição(ões) {selectedSessionId ? "nesta sessão" : "no total"}</p>
              <Button size="sm" onClick={() => setShowNewConstraint(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nova Restrição
              </Button>
            </div>
            {Object.keys(DOMAIN_LABELS).map((domain) => {
              const items = constraintsByDomain[domain] ?? [];
              if (items.length === 0) return null;
              const domainInfo = DOMAIN_LABELS[domain];
              return (
                <div key={domain}>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-2 ${domainInfo.color}`}>
                    {domainInfo.icon}
                    <span className="text-sm font-medium">{domainInfo.label}</span>
                    <Badge variant="outline" className="ml-auto text-xs">{items.length}</Badge>
                  </div>
                  <div className="space-y-2 pl-2">
                    {items.map((c) => (
                      <Card key={c.id}>
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium">{c.title}</p>
                                <Badge className={SEVERITY_CONFIG[c.severity]?.color ?? ""}>{SEVERITY_CONFIG[c.severity]?.label}</Badge>
                                <Badge className={STATUS_CONFIG[c.status]?.color ?? ""}>{STATUS_CONFIG[c.status]?.label}</Badge>
                              </div>
                              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                              {c.rootCause && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Causa raiz:</span> {c.rootCause}</p>}
                              {c.impact && <p className="text-xs text-muted-foreground"><span className="font-medium">Impacto:</span> {c.impact}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {c.status === "active" && (
                                <Button variant="ghost" size="sm" onClick={() => updateConstraint.mutate({ id: c.id, status: "resolved", resolvedAt: new Date() })}>
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover restrição?")) deleteConstraint.mutate({ id: c.id }); }}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
            {constraints.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma restrição mapeada.</p>
                  <Button size="sm" className="mt-4" onClick={() => setShowNewConstraint(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Restrição
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── ACTION ITEMS ── */}
          <TabsContent value="actions" className="space-y-4 mt-6">
            <p className="text-sm text-muted-foreground">{actionItems.length} ação(ões) {selectedSessionId ? "nesta sessão" : "no total"}</p>
            <div className="space-y-2">
              {actionItems.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma ação pendente.</p>
                  </CardContent>
                </Card>
              ) : actionItems.map((a) => (
                <Card key={a.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <button
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${a.status === "done" ? "bg-green-500 border-green-500" : "border-muted-foreground hover:border-primary"}`}
                        onClick={() => updateActionItem.mutate({ id: a.id, status: a.status === "done" ? "pending" : "done", completedAt: a.status === "done" ? undefined : new Date() })}
                      >
                        {a.status === "done" && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${a.status === "done" ? "line-through text-muted-foreground" : ""}`}>{a.title}</p>
                        {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                        {a.dueDate && <p className="text-xs text-muted-foreground">Prazo: {new Date(a.dueDate).toLocaleDateString("pt-BR")}</p>}
                      </div>
                      <Badge className={a.priority === "high" ? "bg-red-500/10 text-red-400" : a.priority === "medium" ? "bg-yellow-500/10 text-yellow-400" : "bg-slate-500/10 text-slate-400"}>
                        {a.priority === "high" ? "Alta" : a.priority === "medium" ? "Média" : "Baixa"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Session Dialog */}
      <Dialog open={showNewSession} onOpenChange={setShowNewSession}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Sessão ToC</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input value={newSession.title} onChange={(e) => setNewSession((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Análise Semanal — Semana 13" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Data da Semana</label>
              <Input type="date" value={newSession.weekDate} onChange={(e) => setNewSession((p) => ({ ...p, weekDate: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSession(false)}>Cancelar</Button>
            <Button onClick={() => createSession.mutate({ title: newSession.title, weekDate: new Date(newSession.weekDate + "T12:00:00") })} disabled={!newSession.title || createSession.isPending}>
              {createSession.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Constraint Dialog */}
      <Dialog open={showNewConstraint} onOpenChange={setShowNewConstraint}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Restrição</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Domínio</label>
                <Select value={newConstraint.domain} onValueChange={(v) => setNewConstraint((p) => ({ ...p, domain: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOMAIN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Severidade</label>
                <Select value={newConstraint.severity} onValueChange={(v) => setNewConstraint((p) => ({ ...p, severity: v as "low" | "medium" | "high" | "critical" }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input value={newConstraint.title} onChange={(e) => setNewConstraint((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Taxa de conversão de leads abaixo de 15%" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={newConstraint.description} onChange={(e) => setNewConstraint((p) => ({ ...p, description: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Causa Raiz</label>
              <Textarea value={newConstraint.rootCause} onChange={(e) => setNewConstraint((p) => ({ ...p, rootCause: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Impacto no Negócio</label>
              <Textarea value={newConstraint.impact} onChange={(e) => setNewConstraint((p) => ({ ...p, impact: e.target.value }))} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewConstraint(false)}>Cancelar</Button>
            <Button onClick={() => createConstraint.mutate({ ...newConstraint, sessionId: selectedSessionId ?? undefined })} disabled={!newConstraint.title || createConstraint.isPending}>
              {createConstraint.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configurações ToC</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Contexto do Negócio</label>
              <Textarea value={configForm.businessContext} onChange={(e) => setConfigForm((p) => ({ ...p, businessContext: e.target.value }))} rows={3} placeholder="Descreva o contexto do seu negócio para que a IA gere análises mais precisas..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Dia da Sessão Semanal</label>
                <Select value={configForm.weeklyDay} onValueChange={(v) => setConfigForm((p) => ({ ...p, weeklyDay: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Segunda-feira</SelectItem>
                    <SelectItem value="tuesday">Terça-feira</SelectItem>
                    <SelectItem value="wednesday">Quarta-feira</SelectItem>
                    <SelectItem value="thursday">Quinta-feira</SelectItem>
                    <SelectItem value="friday">Sexta-feira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Horário</label>
                <Input type="time" value={configForm.weeklyTime} onChange={(e) => setConfigForm((p) => ({ ...p, weeklyTime: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>Cancelar</Button>
            <Button onClick={() => saveConfig.mutate(configForm)} disabled={saveConfig.isPending}>
              {saveConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
