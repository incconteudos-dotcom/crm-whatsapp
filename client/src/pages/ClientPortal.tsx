import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle, FileText, Receipt, BookOpen, Loader2, AlertCircle,
  Clock, User, DollarSign, Calendar, Shield, PenLine,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    typeof v === "string" ? parseFloat(v) : (v ?? 0)
  );

const fmtDate = (d: Date | string | null | undefined) =>
  d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—";

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [signedName, setSignedName] = useState("");
  const [approved, setApproved] = useState(false);
  const [showSignForm, setShowSignForm] = useState(false);

  const { data, isLoading, error } = trpc.portal.getDocument.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  const approveMutation = trpc.portal.approve.useMutation({
    onSuccess: () => {
      setApproved(true);
      toast.success("Documento aprovado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleApprove = () => {
    if (!token) return;
    approveMutation.mutate({ token, signedName: signedName || undefined });
  };

  if (!token) {
    return <ErrorPage title="Link inválido" message="Este link não contém um token válido." />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    const msg = error?.message ?? "Documento não encontrado.";
    const isExpired = msg.toLowerCase().includes("expirado");
    return <ErrorPage title={isExpired ? "Link expirado" : "Link inválido"} message={msg} />;
  }

  const { type, document: doc } = data;

  const isAlreadyApproved = (() => {
    if (type === "contract") return (doc as any).status === "signed";
    if (type === "quote") return (doc as any).status === "accepted";
    return false;
  })();

  const canApprove = type === "contract" || type === "quote";
  const typeLabel = type === "contract" ? "Contrato" : type === "invoice" ? "Fatura" : "Orçamento";
  const TypeIcon = type === "contract" ? FileText : type === "invoice" ? Receipt : BookOpen;
  const accentColor = type === "contract" ? "text-orange-400" : type === "invoice" ? "text-green-400" : "text-cyan-400";
  const accentBg = type === "contract" ? "bg-orange-500/10" : type === "invoice" ? "bg-green-500/10" : "bg-cyan-500/10";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentBg}`}>
              <TypeIcon className={`w-4 h-4 ${accentColor}`} />
            </div>
            <span className="font-semibold text-foreground">Portal do Cliente</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-green-400" />
            Link seguro
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Document header */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">{typeLabel}</p>
              <h1 className="text-xl font-bold text-foreground">
                {type === "contract" ? (doc as any).title :
                 type === "invoice" ? `Fatura ${(doc as any).number}` :
                 `Orçamento ${(doc as any).number}`}
              </h1>
            </div>
            {isAlreadyApproved || approved ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                {type === "contract" ? "Assinado" : "Aceito"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Aguardando {type === "contract" ? "assinatura" : "aprovação"}
              </Badge>
            )}
          </div>

          {/* Key info */}
          <div className="grid grid-cols-2 gap-3">
            {(doc as any).value || (doc as any).total ? (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Valor
                </p>
                <p className="font-bold text-foreground">{fmt((doc as any).value ?? (doc as any).total)}</p>
              </div>
            ) : null}
            {(doc as any).dueDate || (doc as any).validUntil ? (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {type === "invoice" ? "Vencimento" : "Válido até"}
                </p>
                <p className="font-bold text-foreground">{fmtDate((doc as any).dueDate ?? (doc as any).validUntil)}</p>
              </div>
            ) : null}
            {(doc as any).signerName && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Destinatário
                </p>
                <p className="font-medium text-foreground">{(doc as any).signerName}</p>
              </div>
            )}
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Emitido em
              </p>
              <p className="font-medium text-foreground">{fmtDate((doc as any).createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Items (for invoice/quote) */}
        {(type === "invoice" || type === "quote") && (doc as any).items && (doc as any).items.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Itens</h2>
            <div className="space-y-2">
              {((doc as any).items as any[]).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity}x {fmt(item.unitPrice)}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground ml-4">{fmt(item.total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex justify-between font-bold">
              <span>Total</span>
              <span className={accentColor}>{fmt((doc as any).total)}</span>
            </div>
          </div>
        )}

        {/* Contract content */}
        {type === "contract" && (doc as any).content && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Conteúdo do Contrato</h2>
            <div className="prose prose-sm prose-invert max-w-none text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {(doc as any).content}
            </div>
          </div>
        )}

        {/* Notes */}
        {(doc as any).notes && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-2">Observações</h2>
            <p className="text-sm text-muted-foreground">{(doc as any).notes}</p>
          </div>
        )}

        {/* Approve / Sign section */}
        {canApprove && !isAlreadyApproved && !approved && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-1">
              {type === "contract" ? "Assinar Contrato" : "Aprovar Orçamento"}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {type === "contract"
                ? "Ao assinar, você confirma que leu e concorda com os termos acima."
                : "Ao aprovar, você confirma que aceita os valores e condições deste orçamento."}
            </p>

            {!showSignForm ? (
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => setShowSignForm(true)}
              >
                <PenLine className="w-4 h-4" />
                {type === "contract" ? "Assinar Contrato" : "Aprovar Orçamento"}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Seu nome completo (opcional)</Label>
                  <Input
                    placeholder="Digite seu nome para confirmar"
                    value={signedName}
                    onChange={e => setSignedName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowSignForm(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Already approved */}
        {(isAlreadyApproved || approved) && canApprove && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-green-400">
                {type === "contract" ? "Contrato assinado!" : "Orçamento aprovado!"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {type === "contract"
                  ? "Sua assinatura foi registrada. Obrigado!"
                  : "Sua aprovação foi registrada. Entraremos em contato em breve."}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-8">
          <p>Este link é pessoal e intransferível.</p>
          <p className="mt-1">Powered by CRM WhatsApp Studio</p>
        </div>
      </div>
    </div>
  );
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">
          Se você acredita que isso é um erro, entre em contato com quem enviou este link.
        </p>
      </div>
    </div>
  );
}
