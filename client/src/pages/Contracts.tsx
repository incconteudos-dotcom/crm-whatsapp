import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { FileText, Plus, Sparkles, CheckCircle, Clock, Send, XCircle, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Streamdown } from "streamdown";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  draft: { label: "Rascunho", icon: <Clock className="w-3.5 h-3.5" />, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  sent: { label: "Enviado", icon: <Send className="w-3.5 h-3.5" />, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  signed: { label: "Assinado", icon: <CheckCircle className="w-3.5 h-3.5" />, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  cancelled: { label: "Cancelado", icon: <XCircle className="w-3.5 h-3.5" />, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default function Contracts() {
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [aiGenOpen, setAiGenOpen] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", signerName: "", signerEmail: "", content: "" });
  const [aiForm, setAiForm] = useState({ title: "", contactName: "", value: "", description: "", contractType: "prestação de serviços" });
  const [generatedContent, setGeneratedContent] = useState("");

  const utils = trpc.useUtils();
  const { data: contracts, isLoading } = trpc.contracts.list.useQuery();
  const { data: contacts } = trpc.contacts.list.useQuery({});

  const createMutation = trpc.contracts.create.useMutation({
    onSuccess: () => {
      toast.success("Contrato criado!");
      setCreateOpen(false);
      setForm({ title: "", value: "", signerName: "", signerEmail: "", content: "" });
      utils.contracts.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess: () => {
      toast.success("Contrato atualizado!");
      utils.contracts.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const generateMutation = trpc.contracts.generateWithAI.useMutation({
    onSuccess: (data) => {
      const content = typeof data.content === 'string' ? data.content : String(data.content);
      setGeneratedContent(content);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleUseGenerated = () => {
    setForm(f => ({ ...f, title: aiForm.title, content: generatedContent, value: aiForm.value, signerName: aiForm.contactName }));
    setAiGenOpen(false);
    setCreateOpen(true);
  };

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

        {/* Contracts list */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-6 bg-muted rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : contracts && contracts.length > 0 ? (
          <div className="space-y-3">
            {contracts.map((contract) => {
              const status = statusConfig[contract.status ?? "draft"];
              return (
                <div key={contract.id} className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{contract.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {contract.signerName && (
                            <span className="text-xs text-muted-foreground">{contract.signerName}</span>
                          )}
                          {contract.value && (
                            <span className="text-xs text-green-400">R$ {Number(contract.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(contract.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", status.color)}>
                        {status.icon}
                        {status.label}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedContract(contract); setViewOpen(true); }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {contract.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMutation.mutate({ id: contract.id, status: "sent" })}
                          >
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            Enviar
                          </Button>
                        )}
                        {contract.status === "sent" && (
                          <Button
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: contract.id, status: "signed", signedAt: new Date() })}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            Assinar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
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

      {/* Create Contract Dialog */}
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
            <Button onClick={() => createMutation.mutate({ title: form.title, content: form.content, value: form.value || undefined, signerName: form.signerName || undefined, signerEmail: form.signerEmail || undefined })} disabled={!form.title.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
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
                    <SelectItem value="prestação de serviços">Prestação de Serviços</SelectItem>
                    <SelectItem value="gravação musical">Gravação Musical</SelectItem>
                    <SelectItem value="produção musical">Produção Musical</SelectItem>
                    <SelectItem value="licenciamento de música">Licenciamento de Música</SelectItem>
                    <SelectItem value="exclusividade artística">Exclusividade Artística</SelectItem>
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
            <Button onClick={() => generateMutation.mutate(aiForm)} disabled={!aiForm.title || !aiForm.contactName || !aiForm.description || generateMutation.isPending} className="w-full">
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

      {/* View Contract Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContract?.title}</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <span className="ml-2 text-foreground">{statusConfig[selectedContract.status]?.label}</span></div>
                <div><span className="text-muted-foreground">Valor:</span> <span className="ml-2 text-green-400">R$ {Number(selectedContract.value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                <div><span className="text-muted-foreground">Signatário:</span> <span className="ml-2 text-foreground">{selectedContract.signerName ?? "-"}</span></div>
                <div><span className="text-muted-foreground">E-mail:</span> <span className="ml-2 text-foreground">{selectedContract.signerEmail ?? "-"}</span></div>
              </div>
              {selectedContract.content && (
                <div className="bg-background border border-border rounded-xl p-4 max-h-96 overflow-y-auto">
                  <Streamdown>{selectedContract.content}</Streamdown>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
