import { useState } from "react";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Zap,
  MessageSquare,
  FileSignature,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";

export default function PlaybookAutomations() {
  const [, setLocation] = useLocation();
  const [runningCron, setRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<{ staleLeads: number; expiringContracts: number; renewalLeadsCreated: number } | null>(null);

  // Queries
  const { data: staleLeads, isLoading: loadingStale, refetch: refetchStale } = trpc.playbook.leadsStale48h.useQuery();
  const { data: expiringContracts, isLoading: loadingExpiring, refetch: refetchExpiring } = trpc.playbook.contractsExpiring30d.useQuery();

  // Mutations
  const followUpMutation = trpc.playbook.triggerFollowUp.useMutation({
    onSuccess: () => {
      toast.success("Follow-up enviado via WhatsApp");
      refetchStale();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const renewalMutation = trpc.playbook.triggerRenewal.useMutation({
    onSuccess: (data) => {
      toast.success(`Lead de renovação #${data.leadId} criado`);
      refetchExpiring();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const runCronMutation = trpc.playbook.runFollowUpCron.useMutation({
    onSuccess: (data) => {
      setCronResult(data);
      toast.success(`Cron executado: ${data.renewalLeadsCreated} leads de renovação criados`);
      refetchStale();
      refetchExpiring();
      setRunningCron(false);
    },
    onError: (e) => {
      toast.error(`Erro no cron: ${e.message}`);
      setRunningCron(false);
    },
  });

  const handleRunCron = () => {
    setRunningCron(true);
    setCronResult(null);
    runCronMutation.mutate();
  };

  return (
    <CRMLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Playbook de Automações
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              As 3 ações imediatas do Playbook Operacional — monitoramento e disparo manual ou automático.
            </p>
          </div>
          <Button
            onClick={handleRunCron}
            disabled={runningCron}
            className="gap-2"
          >
            {runningCron ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Executar Cron Completo
          </Button>
        </div>

        {/* Resultado do cron */}
        {cronResult && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4 flex items-center gap-4">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Cron executado com sucesso:</span>{" "}
                {cronResult.staleLeads} leads estáticos detectados,{" "}
                {cronResult.expiringContracts} contratos vencendo,{" "}
                <span className="font-medium text-green-600">{cronResult.renewalLeadsCreated} leads de renovação criados.</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Ação 1 */}
          <Card className="border-blue-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">Ação 1</CardTitle>
                  <CardDescription className="text-xs">Lead automático via WhatsApp</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/5 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                </Badge>
                <span className="text-xs text-muted-foreground">Webhook Z-API</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao receber mensagem de número desconhecido, o sistema cria automaticamente um contato e um lead no pipeline (estágio "Prospecção") e notifica o owner.
              </p>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Mensagem recebida → Contato criado</div>
                <div className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Contato criado → Lead no pipeline</div>
                <div className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Lead criado → Notificação ao owner</div>
              </div>
            </CardContent>
          </Card>

          {/* Ação 2 */}
          <Card className="border-purple-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FileSignature className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">Ação 2</CardTitle>
                  <CardDescription className="text-xs">Encadeamento ao assinar contrato</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/5 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                </Badge>
                <span className="text-xs text-muted-foreground">Trigger: assinatura</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao assinar um contrato digitalmente, o sistema cria automaticamente a fatura de entrada (50% do valor) e o projeto vinculado ao contrato.
              </p>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Contrato assinado → Fatura 50% criada</div>
                <div className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Contrato assinado → Projeto criado</div>
                <div className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Projeto status: "briefing"</div>
              </div>
            </CardContent>
          </Card>

          {/* Ação 3 */}
          <Card className="border-orange-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <RefreshCw className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">Ação 3</CardTitle>
                  <CardDescription className="text-xs">Follow-up 48h + Renovação 30d</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 bg-yellow-500/5 text-xs">
                  <Clock className="h-3 w-3 mr-1" /> Manual / Cron
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Detecta leads sem interação há 48h e contratos vencendo em 30 dias. Permite disparo manual de follow-up via WhatsApp ou criação de lead de renovação.
              </p>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Lead 48h sem resposta → WA-01</div>
                <div className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Contrato vencendo → Lead renovação</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads estáticos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <CardTitle className="text-base">Leads sem interação há 48h</CardTitle>
                {staleLeads && staleLeads.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{staleLeads.length}</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchStale()}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <CardDescription className="text-xs">
              Leads abertos que não foram atualizados nas últimas 48 horas. Dispare o follow-up via WhatsApp (Template WA-01).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStale ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : !staleLeads || staleLeads.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Nenhum lead estático. Todos os leads têm interação recente.
              </div>
            ) : (
              <div className="space-y-2">
                {staleLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{lead.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Última atualização: {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString("pt-BR") : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/pipeline`)}
                        className="text-xs h-7"
                      >
                        Ver Lead
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contratos vencendo */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-base">Contratos vencendo em 30 dias</CardTitle>
                {expiringContracts && expiringContracts.length > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-500/30 bg-orange-500/5 text-xs">
                    {expiringContracts.length}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchExpiring()}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <CardDescription className="text-xs">
              Contratos assinados com vencimento nos próximos 30 dias. Crie um lead de renovação e envie mensagem de aviso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingExpiring ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : !expiringContracts || expiringContracts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Nenhum contrato vencendo nos próximos 30 dias.
              </div>
            ) : (
              <div className="space-y-2">
                {expiringContracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{contract.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Vence em: {contract.validUntil ? new Date(contract.validUntil).toLocaleDateString("pt-BR") : "—"}
                          {contract.value ? ` · R$ ${Number(contract.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => renewalMutation.mutate({ contractId: contract.id })}
                      disabled={renewalMutation.isPending}
                      className="text-xs h-7 gap-1"
                    >
                      {renewalMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Criar Renovação
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}
