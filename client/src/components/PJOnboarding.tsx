import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, CheckCircle2, FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PJOnboardingProps {
  contactId: number;
}

export default function PJOnboarding({ contactId }: PJOnboardingProps) {
  const { data: pjData, refetch, isLoading } = trpc.pj.get.useQuery({ contactId });
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    cnpj: "",
    razaoSocial: "",
    nomeFantasia: "",
    inscricaoEstadual: "",
    enderecoCompleto: "",
    responsavelNome: "",
    responsavelCpf: "",
    responsavelEmail: "",
    responsavelTelefone: "",
    notes: "",
  });
  const [documentText, setDocumentText] = useState("");
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (pjData) {
      setForm({
        cnpj: pjData.cnpj ?? "",
        razaoSocial: pjData.razaoSocial ?? "",
        nomeFantasia: pjData.nomeFantasia ?? "",
        inscricaoEstadual: pjData.inscricaoEstadual ?? "",
        enderecoCompleto: pjData.enderecoCompleto ?? "",
        responsavelNome: pjData.responsavelNome ?? "",
        responsavelCpf: pjData.responsavelCpf ?? "",
        responsavelEmail: pjData.responsavelEmail ?? "",
        responsavelTelefone: pjData.responsavelTelefone ?? "",
        notes: pjData.notes ?? "",
      });
    }
  }, [pjData]);

  const saveMutation = trpc.pj.save.useMutation({
    onSuccess: () => {
      toast.success("Dados PJ salvos com sucesso!");
      utils.pj.get.invalidate({ contactId });
    },
    onError: (err) => toast.error(err.message),
  });

  const extractMutation = trpc.pj.extractFromDocument.useMutation({
    onSuccess: (result) => {
      const d = result.data as Record<string, string | null>;
      setForm((prev) => ({
        ...prev,
        cnpj: d.cnpj ?? prev.cnpj,
        razaoSocial: d.razaoSocial ?? prev.razaoSocial,
        nomeFantasia: d.nomeFantasia ?? prev.nomeFantasia,
        inscricaoEstadual: d.inscricaoEstadual ?? prev.inscricaoEstadual,
        enderecoCompleto: d.enderecoCompleto ?? prev.enderecoCompleto,
        responsavelNome: d.responsavelNome ?? prev.responsavelNome,
        responsavelCpf: d.responsavelCpf ?? prev.responsavelCpf,
        responsavelEmail: d.responsavelEmail ?? prev.responsavelEmail,
        responsavelTelefone: d.responsavelTelefone ?? prev.responsavelTelefone,
      }));
      toast.success("Dados extraídos pela IA com sucesso!");
      setExtracting(false);
      utils.pj.get.invalidate({ contactId });
    },
    onError: (err) => {
      toast.error(err.message);
      setExtracting(false);
    },
  });

  const handleExtract = () => {
    if (!documentText.trim()) {
      toast.error("Cole o texto do documento para extrair os dados.");
      return;
    }
    setExtracting(true);
    extractMutation.mutate({
      contactId,
      documentUrl: "manual-text",
      documentText,
    });
  };

  const handleSave = () => {
    saveMutation.mutate({ contactId, ...form });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    processing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    completed: "bg-green-500/20 text-green-300 border-green-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    processing: "Processando",
    completed: "Completo",
    error: "Erro",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Dados PJ</h3>
        </div>
        {pjData?.status && (
          <Badge variant="outline" className={statusColors[pjData.status] ?? ""}>
            {pjData.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {statusLabels[pjData.status] ?? pjData.status}
          </Badge>
        )}
      </div>

      {/* AI Extraction */}
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Extração Automática por IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Cole o texto do contrato social, cartão CNPJ ou qualquer documento da empresa. A IA vai extrair os dados automaticamente.
          </p>
          <Textarea
            placeholder="Cole aqui o texto do documento empresarial..."
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            rows={4}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handleExtract}
            disabled={extracting || !documentText.trim()}
            className="w-full"
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extraindo dados...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Extrair com IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Form */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Dados da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">CNPJ</Label>
              <Input
                placeholder="00.000.000/0001-00"
                value={form.cnpj}
                onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inscrição Estadual</Label>
              <Input
                placeholder="000.000.000.000"
                value={form.inscricaoEstadual}
                onChange={(e) => setForm((p) => ({ ...p, inscricaoEstadual: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Razão Social</Label>
            <Input
              placeholder="Nome da empresa conforme CNPJ"
              value={form.razaoSocial}
              onChange={(e) => setForm((p) => ({ ...p, razaoSocial: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nome Fantasia</Label>
            <Input
              placeholder="Nome comercial"
              value={form.nomeFantasia}
              onChange={(e) => setForm((p) => ({ ...p, nomeFantasia: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Endereço Completo</Label>
            <Input
              placeholder="Rua, número, bairro, cidade - UF"
              value={form.enderecoCompleto}
              onChange={(e) => setForm((p) => ({ ...p, enderecoCompleto: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>

          <div className="border-t border-border pt-3 mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Responsável Legal</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input
                  placeholder="Nome completo"
                  value={form.responsavelNome}
                  onChange={(e) => setForm((p) => ({ ...p, responsavelNome: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CPF</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={form.responsavelCpf}
                  onChange={(e) => setForm((p) => ({ ...p, responsavelCpf: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="email@empresa.com"
                  value={form.responsavelEmail}
                  onChange={(e) => setForm((p) => ({ ...p, responsavelEmail: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={form.responsavelTelefone}
                  onChange={(e) => setForm((p) => ({ ...p, responsavelTelefone: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea
              placeholder="Notas adicionais..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="text-sm"
            />
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Dados PJ"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
