import { useState } from "react";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { PageHeader, MetricCard, StatusBadge } from "@/components/ui/design-system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Brain,
  MessageSquare,
  TrendingUp,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
  FileText,
  Send,
  UserPlus,
  ArrowRight,
  Sparkles,
  BarChart3,
} from "lucide-react";

type Suggestion = {
  type: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedValue: number | null;
};

type Analysis = {
  summary: string;
  opportunityScore: number;
  urgency: string;
  stage: string;
  estimatedValue: number | null;
  servicesDetected: string[];
  suggestions: Suggestion[];
};

type AnalysisRecord = {
  id: number;
  chatId: number;
  chatJid: string;
  contactId: number | null;
  contactName: string | null;
  messagesAnalyzed: number | null;
  opportunityScore: number | null;
  stage: string | null;
  estimatedValue: string | null;
  urgency: string | null;
  summary: string | null;
  suggestionsJson: string | null;
  servicesDetected: string | null;
  analyzedAt: Date;
};

const SUGGESTION_ICONS: Record<string, React.ReactNode> = {
  create_lead: <UserPlus className="h-4 w-4" />,
  update_lead: <TrendingUp className="h-4 w-4" />,
  send_quote: <FileText className="h-4 w-4" />,
  send_invoice: <DollarSign className="h-4 w-4" />,
  send_contract: <FileText className="h-4 w-4" />,
  schedule_followup: <Clock className="h-4 w-4" />,
  send_nps: <Send className="h-4 w-4" />,
};

const SUGGESTION_LABELS: Record<string, string> = {
  create_lead: "Criar Lead",
  update_lead: "Atualizar Lead",
  send_quote: "Enviar Orçamento",
  send_invoice: "Enviar Fatura",
  send_contract: "Enviar Contrato",
  schedule_followup: "Agendar Follow-up",
  send_nps: "Enviar NPS",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

const URGENCY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

function parseJson<T>(str: string | null, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-rose-500";
  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/20" />
        <circle
          cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeDasharray={`${score} ${100 - score}`}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span className={`absolute text-lg font-bold ${color}`}>{score}</span>
    </div>
  );
}

export default function WhatsAppAnalysis() {
  // toast is imported from sonner
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null);
  const [analyzingChatId, setAnalyzingChatId] = useState<number | null>(null);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);

  const { data: chats = [] } = trpc.whatsapp.chats.useQuery();
  const { data: analyses = [], refetch: refetchAnalyses } = trpc.whatsappAi.list.useQuery();
  const utils = trpc.useUtils();

  const analyzeMutation = trpc.whatsappAi.analyze.useMutation({
    onSuccess: (result) => {
      if ("error" in result) {
        toast.error(result.error ?? "Erro na análise");
      } else {
        toast.success(`Análise concluída! ${result.messagesAnalyzed} mensagens analisadas.`);
        refetchAnalyses();
      }
      setAnalyzingChatId(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setAnalyzingChatId(null);
    },
  });

  const bulkMutation = trpc.whatsappAi.bulkAnalyze.useMutation({
    onSuccess: (result) => {
      const ok = result.results.filter(r => r.status === "ok").length;
      toast.success(`Análise em lote concluída! ${ok} conversas analisadas.`);
      refetchAnalyses();
      setBulkAnalyzing(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setBulkAnalyzing(false);
    },
  });

  const deleteMutation = trpc.whatsappAi.delete.useMutation({
    onSuccess: () => {
      refetchAnalyses();
      setSelectedAnalysis(null);
    },
  });

  // Create lead mutation
  const createLeadMutation = trpc.pipeline.createLead.useMutation({
    onSuccess: () => {
      toast.success("Lead criado com sucesso!");
      utils.pipeline.leads.invalidate();
    },
  });

  const handleAnalyzeChat = (chat: { id: number; jid: string; name?: string | null; contactId?: number | null }) => {
    setAnalyzingChatId(chat.id);
    analyzeMutation.mutate({
      chatId: chat.id,
      chatJid: chat.jid,
      contactName: chat.name ?? undefined,
      contactId: chat.contactId ?? undefined,
    });
  };

  const handleBulkAnalyze = () => {
    setBulkAnalyzing(true);
    const chatInputs = chats.slice(0, 20).map(c => ({
      chatId: c.id,
      chatJid: c.jid,
      contactName: c.name ?? undefined,
      contactId: c.contactId ?? undefined,
    }));
    bulkMutation.mutate({ chatIds: chatInputs });
  };

  const handleCreateLead = (analysis: AnalysisRecord, suggestion: Suggestion) => {
    createLeadMutation.mutate({
      title: `Lead - ${analysis.contactName ?? analysis.chatJid}`,
      notes: `${suggestion.description}\n\nResumo da conversa: ${analysis.summary}`,
      value: suggestion.estimatedValue ? String(suggestion.estimatedValue) : undefined,
    });
  };

  // Stats
  const totalAnalyzed = analyses.length;
  const highOpportunity = analyses.filter(a => (a.opportunityScore ?? 0) >= 70).length;
  const totalEstimated = analyses.reduce((s, a) => s + (parseFloat(a.estimatedValue ?? "0") || 0), 0);
  const avgScore = totalAnalyzed > 0
    ? Math.round(analyses.reduce((s, a) => s + (a.opportunityScore ?? 0), 0) / totalAnalyzed)
    : 0;

  // Map analyses by chatId for quick lookup
  const analysisByChatId = new Map(analyses.map(a => [a.chatId, a]));

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Análise Total WhatsApp"
          description="IA analisa suas conversas e sugere ações comerciais: criar leads, enviar orçamentos, contratos e faturas."
          icon={Brain}
          actions={
            <Button onClick={handleBulkAnalyze} disabled={bulkAnalyzing} className="gap-2">
              {bulkAnalyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {bulkAnalyzing ? "Analisando..." : "Analisar Todas (20)"}
            </Button>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Conversas Analisadas"
            value={totalAnalyzed}
            icon={MessageSquare}
          />
          <MetricCard
            title="Alta Oportunidade"
            value={highOpportunity}
            icon={Zap}
            trend={totalAnalyzed > 0 ? { value: Math.round((highOpportunity / totalAnalyzed) * 100), label: "do total" } : undefined}
          />
          <MetricCard
            title="Valor Estimado"
            value={`R$ ${totalEstimated.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
            icon={DollarSign}
          />
          <MetricCard
            title="Score Médio"
            value={`${avgScore}/100`}
            icon={BarChart3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Chat list with analyze buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Conversas do WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {chats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma conversa encontrada. Sincronize o WhatsApp primeiro.
                </p>
              )}
              {chats.map(chat => {
                const existing = analysisByChatId.get(chat.id);
                const isAnalyzing = analyzingChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {(chat.name ?? chat.jid).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{chat.name ?? chat.jid}</p>
                        {existing && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-2 h-2 rounded-full ${(existing.opportunityScore ?? 0) >= 70 ? "bg-emerald-500" : (existing.opportunityScore ?? 0) >= 40 ? "bg-amber-500" : "bg-rose-500"}`} />
                            <span className="text-xs text-muted-foreground">Score: {existing.opportunityScore}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {existing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setSelectedAnalysis(existing)}
                        >
                          Ver
                        </Button>
                      )}
                      <Button
                        variant={existing ? "outline" : "default"}
                        size="sm"
                        className="text-xs gap-1"
                        disabled={isAnalyzing}
                        onClick={() => handleAnalyzeChat(chat)}
                      >
                        {isAnalyzing ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Brain className="h-3 w-3" />
                        )}
                        {existing ? "Re-analisar" : "Analisar"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Right: Analysis results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Resultados da Análise IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {analyses.length === 0 && (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma análise ainda. Clique em "Analisar" em uma conversa para começar.
                  </p>
                </div>
              )}
              {analyses.map(analysis => {
                const suggestions = parseJson<Suggestion[]>(analysis.suggestionsJson, []);
                const services = parseJson<string[]>(analysis.servicesDetected, []);
                const highSuggestions = suggestions.filter(s => s.priority === "high").length;
                return (
                  <div
                    key={analysis.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedAnalysis(analysis)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ScoreRing score={analysis.opportunityScore ?? 0} />
                        <div>
                          <p className="font-medium text-sm">{analysis.contactName ?? analysis.chatJid}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{analysis.summary}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {services.slice(0, 3).map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs py-0">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <StatusBadge
                          status={analysis.urgency ?? "low"}
                          customLabel={URGENCY_LABELS[analysis.urgency ?? "low"] ?? analysis.urgency ?? ""}
                        />
                        {highSuggestions > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {highSuggestions} ação urgente
                          </Badge>
                        )}
                        {analysis.estimatedValue && parseFloat(analysis.estimatedValue) > 0 && (
                          <span className="text-xs font-semibold text-emerald-600">
                            R$ {parseFloat(analysis.estimatedValue).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAnalysis} onOpenChange={() => setSelectedAnalysis(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedAnalysis && (() => {
            const suggestions = parseJson<Suggestion[]>(selectedAnalysis.suggestionsJson, []);
            const services = parseJson<string[]>(selectedAnalysis.servicesDetected, []);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Análise: {selectedAnalysis.contactName ?? selectedAnalysis.chatJid}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Score + Meta */}
                  <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/30">
                    <ScoreRing score={selectedAnalysis.opportunityScore ?? 0} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Urgência:</span>
                      <StatusBadge
                        status={selectedAnalysis.urgency ?? "low"}
                        customLabel={URGENCY_LABELS[selectedAnalysis.urgency ?? "low"] ?? ""}
                      />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Estágio sugerido:</span>
                        <Badge variant="outline">{selectedAnalysis.stage ?? "—"}</Badge>
                      </div>
                      {selectedAnalysis.estimatedValue && parseFloat(selectedAnalysis.estimatedValue) > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Valor estimado:</span>
                          <span className="text-sm font-semibold text-emerald-600">
                            R$ {parseFloat(selectedAnalysis.estimatedValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Mensagens:</span>
                        <span className="text-sm">{selectedAnalysis.messagesAnalyzed ?? 0} analisadas</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Resumo da Conversa</h4>
                    <p className="text-sm text-muted-foreground">{selectedAnalysis.summary}</p>
                  </div>

                  {/* Services */}
                  {services.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Serviços Detectados</h4>
                      <div className="flex flex-wrap gap-2">
                        {services.map((s, i) => (
                          <Badge key={i} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Suggestions */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Sugestões de Ação ({suggestions.length})
                    </h4>
                    <div className="space-y-3">
                      {suggestions.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhuma sugestão gerada.</p>
                      )}
                      {suggestions.map((s, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded bg-primary/10 text-primary">
                                {SUGGESTION_ICONS[s.type] ?? <ArrowRight className="h-4 w-4" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{s.title}</span>
                                  <Badge
                                    variant={PRIORITY_COLORS[s.priority] as "destructive" | "secondary" | "outline"}
                                    className="text-xs py-0"
                                  >
                                    {s.priority === "high" ? "Alta" : s.priority === "medium" ? "Média" : "Baixa"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                                {s.estimatedValue && s.estimatedValue > 0 && (
                                  <span className="text-xs text-emerald-600 font-medium">
                                    R$ {s.estimatedValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {s.type === "create_lead" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs flex-shrink-0"
                                onClick={() => handleCreateLead(selectedAnalysis, s)}
                                disabled={createLeadMutation.isPending}
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Criar Lead
                              </Button>
                            )}
                            {s.type === "schedule_followup" && (
                              <Button size="sm" variant="outline" className="text-xs flex-shrink-0">
                                <Clock className="h-3 w-3 mr-1" />
                                Agendar
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: selectedAnalysis.id })}
                    >
                      Excluir Análise
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAnalysis(null);
                        handleAnalyzeChat({
                          id: selectedAnalysis.chatId,
                          jid: selectedAnalysis.chatJid,
                          name: selectedAnalysis.contactName,
                          contactId: selectedAnalysis.contactId,
                        });
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Re-analisar
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
