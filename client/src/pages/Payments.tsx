import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(amountCents: number, currency: string) {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function statusConfig(status: string) {
  switch (status) {
    case "succeeded":
      return { label: "Pago", icon: CheckCircle2, color: "text-emerald-400", badge: "default" as const };
    case "processing":
      return { label: "Processando", icon: Clock, color: "text-yellow-400", badge: "secondary" as const };
    case "requires_payment_method":
    case "requires_action":
      return { label: "Pendente", icon: AlertCircle, color: "text-orange-400", badge: "secondary" as const };
    case "canceled":
      return { label: "Cancelado", icon: XCircle, color: "text-red-400", badge: "destructive" as const };
    default:
      return { label: status, icon: Clock, color: "text-slate-400", badge: "secondary" as const };
  }
}

export default function Payments() {
  const { data, isLoading, refetch } = trpc.stripe.paymentHistory.useQuery();

  const payments = data?.payments ?? [];
  const succeeded = payments.filter((p) => p.status === "succeeded");
  const totalPaid = succeeded.reduce((sum, p) => sum + p.amount, 0);
  const pending = payments.filter((p) => p.status !== "succeeded" && p.status !== "canceled");

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-violet-400" />
              Histórico de Pagamentos
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Todos os pagamentos processados via Stripe
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch(); toast.info("Histórico atualizado"); }}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Total Recebido</p>
                <p className="text-white font-bold text-lg">
                  {formatCurrency(totalPaid, "brl")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-violet-500/10">
                <TrendingUp className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Pagamentos Confirmados</p>
                <p className="text-white font-bold text-lg">{succeeded.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Pendentes</p>
                <p className="text-white font-bold text-lg">{pending.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-slate-700/50 animate-pulse" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Nenhum pagamento encontrado</p>
                <p className="text-slate-500 text-sm mt-1">
                  Os pagamentos aparecerão aqui após serem processados via Stripe.
                </p>
                <p className="text-slate-600 text-xs mt-3">
                  Para testar, use o cartão: <span className="font-mono text-violet-400">4242 4242 4242 4242</span>
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {payments.map((payment, idx) => {
                  const { label, icon: Icon, color, badge } = statusConfig(payment.status);
                  return (
                    <div key={payment.id}>
                      {idx > 0 && <Separator className="bg-slate-700/50" />}
                      <div className="flex items-center justify-between py-4 px-2 rounded-lg hover:bg-slate-700/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg bg-slate-700/50`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">
                              {payment.description || payment.id}
                            </p>
                            <p className="text-slate-500 text-xs">
                              {new Date(payment.createdAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-white font-semibold">
                              {formatCurrency(payment.amount, payment.currency)}
                            </p>
                            <Badge variant={badge} className="text-xs mt-1">
                              {label}
                            </Badge>
                          </div>
                          {payment.receiptUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-white"
                              onClick={() => window.open(payment.receiptUrl!, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Mode Notice */}
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-yellow-300 text-sm font-medium">Modo de Teste Ativo</p>
            <p className="text-yellow-400/70 text-xs mt-1">
              Use o cartão <span className="font-mono">4242 4242 4242 4242</span> com qualquer data futura e CVC para testar pagamentos.
              Quando estiver pronto para receber pagamentos reais, acesse <strong>Configurações → Pagamento</strong> para ativar as chaves de produção.
            </p>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
