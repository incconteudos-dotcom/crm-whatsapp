import { useState } from "react";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Zap, Trash2, Edit2, ChevronRight, Clock, MessageSquare, Mail,
  Play, Pause, History, Settings, ArrowRight, CheckCircle, XCircle, AlertCircle
} from "lucide-react";

const PIPELINE_STAGES = [
  "Prospecção", "Qualificação", "Proposta", "Negociação", "Fechamento"
];

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-4 w-4 text-green-500" />,
  email: <Mail className="h-4 w-4 text-blue-500" />,
  both: <><MessageSquare className="h-3 w-3 text-green-500" /><Mail className="h-3 w-3 text-blue-500" /></>,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  sent: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  skipped: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  sent: <CheckCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
  skipped: <AlertCircle className="h-3 w-3" />,
};

export default function Automations() {
  const [activeTab, setActiveTab] = useState("sequences");
  const [showCreateSeq, setShowCreateSeq] = useState(false);
  const [showCreateTpl, setShowCreateTpl] = useState(false);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);

  // Forms
  const [seqForm, setSeqForm] = useState({ name: "", description: "", triggerStage: "", isActive: true });
  const [stepForm, setStepForm] = useState({ stepOrder: 1, delayDays: 1, channel: "whatsapp" as "whatsapp" | "email", customMessage: "", subject: "" });
  const [tplForm, setTplForm] = useState({ name: "", category: "follow_up", channel: "whatsapp" as "whatsapp" | "email" | "both", subject: "", body: "", variables: "" });

  const utils = trpc.useUtils();

  // Queries
  const { data: sequences = [] } = trpc.automations.list.useQuery();
  const { data: steps = [] } = trpc.automations.getSteps.useQuery(
    { sequenceId: selectedSeq! },
    { enabled: !!selectedSeq }
  );
  const { data: executions = [] } = trpc.automations.executions.useQuery({});
  const { data: templates = [] } = trpc.messageTemplates.list.useQuery({});

  // Mutations
  const createSeq = trpc.automations.create.useMutation({
    onSuccess: () => { utils.automations.list.invalidate(); setShowCreateSeq(false); setSeqForm({ name: "", description: "", triggerStage: "", isActive: true }); toast.success("Sequência criada!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateSeq = trpc.automations.update.useMutation({
    onSuccess: () => { utils.automations.list.invalidate(); toast.success("Sequência atualizada!"); },
  });
  const deleteSeq = trpc.automations.delete.useMutation({
    onSuccess: () => { utils.automations.list.invalidate(); setSelectedSeq(null); toast.success("Sequência removida!"); },
  });
  const addStep = trpc.automations.addStep.useMutation({
    onSuccess: () => { utils.automations.getSteps.invalidate({ sequenceId: selectedSeq! }); setShowAddStep(false); setStepForm({ stepOrder: 1, delayDays: 1, channel: "whatsapp", customMessage: "", subject: "" }); toast.success("Passo adicionado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteStep = trpc.automations.deleteStep.useMutation({
    onSuccess: () => { utils.automations.getSteps.invalidate({ sequenceId: selectedSeq! }); toast.success("Passo removido!"); },
  });
  const createTpl = trpc.messageTemplates.create.useMutation({
    onSuccess: () => { utils.messageTemplates.list.invalidate(); setShowCreateTpl(false); setTplForm({ name: "", category: "follow_up", channel: "whatsapp", subject: "", body: "", variables: "" }); toast.success("Template criado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteTpl = trpc.messageTemplates.delete.useMutation({
    onSuccess: () => { utils.messageTemplates.list.invalidate(); toast.success("Template removido!"); },
  });

  const selectedSequence = sequences.find(s => s.id === selectedSeq);

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-400" />
              Automações Comerciais
            </h1>
            <p className="text-gray-400 text-sm mt-1">Sequências automáticas de follow-up por estágio do pipeline</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 border border-gray-700">
            <TabsTrigger value="sequences" className="data-[state=active]:bg-purple-600">
              <Zap className="h-4 w-4 mr-2" />Sequências ({sequences.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-purple-600">
              <MessageSquare className="h-4 w-4 mr-2" />Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">
              <History className="h-4 w-4 mr-2" />Histórico ({executions.length})
            </TabsTrigger>
          </TabsList>

          {/* SEQUENCES TAB */}
          <TabsContent value="sequences" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sequence List */}
              <div className="space-y-3">
                <Button onClick={() => setShowCreateSeq(true)} className="w-full bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />Nova Sequência
                </Button>
                {sequences.length === 0 ? (
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-6 text-center text-gray-400">
                      <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma sequência criada</p>
                    </CardContent>
                  </Card>
                ) : sequences.map(seq => (
                  <Card
                    key={seq.id}
                    className={`bg-gray-800/50 border cursor-pointer transition-all ${selectedSeq === seq.id ? "border-purple-500 bg-purple-900/20" : "border-gray-700 hover:border-gray-600"}`}
                    onClick={() => setSelectedSeq(seq.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">{seq.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Gatilho: {seq.triggerStage}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={seq.isActive ?? true}
                            onCheckedChange={(v) => updateSeq.mutate({ id: seq.id, isActive: v })}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      {seq.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{seq.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Steps Panel */}
              <div className="lg:col-span-2">
                {selectedSequence ? (
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white text-base">{selectedSequence.name}</CardTitle>
                          <p className="text-xs text-gray-400 mt-0.5">Gatilho: quando lead entra em "{selectedSequence.triggerStage}"</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setShowAddStep(true)} className="border-gray-600 text-gray-300">
                            <Plus className="h-4 w-4 mr-1" />Passo
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteSeq.mutate({ id: selectedSequence.id })} className="border-red-800 text-red-400 hover:bg-red-900/20">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {steps.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <Settings className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Nenhum passo configurado</p>
                          <p className="text-xs mt-1">Adicione passos para definir quando e como enviar mensagens</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {steps.map((step, idx) => (
                            <div key={step.id} className="flex items-start gap-3">
                              {/* Timeline */}
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-700 flex items-center justify-center text-xs font-bold text-purple-300">
                                  {idx + 1}
                                </div>
                                {idx < steps.length - 1 && <div className="w-0.5 h-8 bg-gray-700 mt-1" />}
                              </div>
                              {/* Step Card */}
                              <div className="flex-1 bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {CHANNEL_ICONS[step.channel ?? "whatsapp"]}
                                    <span className="text-sm font-medium text-white capitalize">{step.channel}</span>
                                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Dia {step.delayDays}
                                    </Badge>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => deleteStep.mutate({ id: step.id })} className="text-red-400 hover:text-red-300 h-7 w-7 p-0">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                {step.messageTemplate && (
                                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{step.messageTemplate}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-12 text-center text-gray-400">
                      <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Selecione uma sequência para ver os passos</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="mt-4">
            <div className="space-y-4">
              <Button onClick={() => setShowCreateTpl(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />Novo Template
              </Button>
              {templates.length === 0 ? (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-12 text-center text-gray-400">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum template criado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(tpl => (
                    <Card key={tpl.id} className="bg-gray-800/50 border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {CHANNEL_ICONS[tpl.channel ?? "whatsapp"]}
                              <p className="font-medium text-white text-sm">{tpl.name}</p>
                            </div>
                            <Badge variant="outline" className="text-xs border-gray-600 text-gray-400 mb-2">{tpl.category}</Badge>
                            <p className="text-xs text-gray-400 line-clamp-3">{tpl.content}</p>
                            {tpl.variables && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {JSON.parse(tpl.variables || "[]").map((v: string) => (
                                  <span key={v} className="text-xs bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded">
                                    {`{{${v}}}`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => deleteTpl.mutate({ id: tpl.id })} className="text-red-400 hover:text-red-300 h-7 w-7 p-0 shrink-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-0">
                {executions.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma execução registrada</p>
                    <p className="text-xs mt-1">As automações serão disparadas quando leads mudarem de estágio</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {executions.map(exec => (
                      <div key={exec.id} className="flex items-center gap-4 p-4">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${STATUS_COLORS[exec.status ?? "pending"]}`}>
                          {STATUS_ICONS[exec.status ?? "pending"]}
                          {exec.status}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">Sequência #{exec.sequenceId} — Contato #{exec.contactId}</p>
                          <p className="text-xs text-gray-400">
                            Agendado: {exec.scheduledAt ? new Date(exec.scheduledAt).toLocaleString("pt-BR") : "—"}
                            {exec.executedAt && ` · Executado: ${new Date(exec.executedAt).toLocaleString("pt-BR")}`}
                          </p>
                        </div>
                        {exec.errorMessage && (
                          <p className="text-xs text-red-400 max-w-xs truncate">{exec.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Sequence Dialog */}
      <Dialog open={showCreateSeq} onOpenChange={setShowCreateSeq}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Nova Sequência de Automação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Sequência</Label>
              <Input value={seqForm.name} onChange={e => setSeqForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Follow-up Proposta" className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={seqForm.description} onChange={e => setSeqForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o objetivo desta sequência" className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div>
              <Label>Estágio Gatilho</Label>
              <Select value={seqForm.triggerStage} onValueChange={v => setSeqForm(f => ({ ...f, triggerStage: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {PIPELINE_STAGES.map(s => (
                    <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={seqForm.isActive} onCheckedChange={v => setSeqForm(f => ({ ...f, isActive: v }))} />
              <Label>Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSeq(false)} className="border-gray-600 text-gray-300">Cancelar</Button>
            <Button onClick={() => createSeq.mutate(seqForm)} disabled={!seqForm.name || !seqForm.triggerStage || createSeq.isPending} className="bg-purple-600 hover:bg-purple-700">
              Criar Sequência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Step Dialog */}
      <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Adicionar Passo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ordem</Label>
                <Input type="number" min={1} value={stepForm.stepOrder} onChange={e => setStepForm(f => ({ ...f, stepOrder: Number(e.target.value) }))} className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
              <div>
                <Label>Enviar após (dias)</Label>
                <Input type="number" min={0} value={stepForm.delayDays} onChange={e => setStepForm(f => ({ ...f, delayDays: Number(e.target.value) }))} className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
            </div>
            <div>
              <Label>Canal</Label>
              <Select value={stepForm.channel} onValueChange={v => setStepForm(f => ({ ...f, channel: v as "whatsapp" | "email" }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="whatsapp" className="text-white">WhatsApp</SelectItem>
                  <SelectItem value="email" className="text-white">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {stepForm.channel === "email" && (
              <div>
                <Label>Assunto do Email</Label>
                <Input value={stepForm.subject} onChange={e => setStepForm(f => ({ ...f, subject: e.target.value }))} placeholder="Assunto do email" className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
            )}
            <div>
              <Label>Mensagem</Label>
              <Textarea value={stepForm.customMessage} onChange={e => setStepForm(f => ({ ...f, customMessage: e.target.value }))} placeholder="Use {{nome}}, {{empresa}}, {{valor}} como variáveis" rows={4} className="bg-gray-800 border-gray-700 text-white mt-1" />
              <p className="text-xs text-gray-500 mt-1">Variáveis disponíveis: {`{{nome}}`}, {`{{empresa}}`}, {`{{valor}}`}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStep(false)} className="border-gray-600 text-gray-300">Cancelar</Button>
            <Button onClick={() => addStep.mutate({ sequenceId: selectedSeq!, ...stepForm })} disabled={!stepForm.customMessage || addStep.isPending} className="bg-purple-600 hover:bg-purple-700">
              Adicionar Passo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreateTpl} onOpenChange={setShowCreateTpl}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Template de Mensagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Boas-vindas Podcast" className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={tplForm.category} onValueChange={v => setTplForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="follow_up" className="text-white">Follow-up</SelectItem>
                    <SelectItem value="welcome" className="text-white">Boas-vindas</SelectItem>
                    <SelectItem value="reminder" className="text-white">Lembrete</SelectItem>
                    <SelectItem value="proposal" className="text-white">Proposta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Canal</Label>
                <Select value={tplForm.channel} onValueChange={v => setTplForm(f => ({ ...f, channel: v as "whatsapp" | "email" | "both" }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="whatsapp" className="text-white">WhatsApp</SelectItem>
                    <SelectItem value="email" className="text-white">Email</SelectItem>
                    <SelectItem value="both" className="text-white">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(tplForm.channel === "email" || tplForm.channel === "both") && (
              <div>
                <Label>Assunto</Label>
                <Input value={tplForm.subject} onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))} placeholder="Assunto do email" className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
            )}
            <div>
              <Label>Conteúdo</Label>
              <Textarea value={tplForm.body} onChange={e => setTplForm(f => ({ ...f, body: e.target.value }))} placeholder="Olá {{nome}}, tudo bem?&#10;&#10;Passando para..." rows={5} className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div>
              <Label>Variáveis (separadas por vírgula)</Label>
              <Input value={tplForm.variables} onChange={e => setTplForm(f => ({ ...f, variables: e.target.value }))} placeholder="nome, empresa, valor" className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTpl(false)} className="border-gray-600 text-gray-300">Cancelar</Button>
            <Button
              onClick={() => createTpl.mutate({
                ...tplForm,
                variables: tplForm.variables ? tplForm.variables.split(",").map(v => v.trim()).filter(Boolean) : undefined,
              })}
              disabled={!tplForm.name || !tplForm.body || createTpl.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Criar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
