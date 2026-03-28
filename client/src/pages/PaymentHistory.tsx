import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, Download, ExternalLink, Search, Filter,
  CheckCircle2, Clock, AlertCircle, XCircle, TrendingUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  paid: { label: "Pago", color: "text-green-400 bg-green-500/10", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  sent: { label: "Enviado", color: "text-blue-400 bg-blue-500/10", icon: <Clock className="w-3.5 h-3.5" /> },
  overdue: { label: "Vencido", color: "text-red-400 bg-red-500/10", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  draft: { label: "Rascunho", color: "text-gray-400 bg-gray-500/10", icon: <Clock className="w-3.5 h-3.5" /> },
  cancelled: { label: "Cancelado", color: "text-red-400 bg-red-500/10", icon: <XCircle className="w-3.5 h-3.5" /> },
  partial: { label: "Parcial", color: "text-yellow-400 bg-yellow-500/10", icon: <Clock className="w-3.5 h-3.5" /> },
};

export default function PaymentHistory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const { data: invoices = [], isLoading } = trpc.invoices.list.useQuery();

  // Filtros
  const filtered = invoices.filter((inv) => {
    const matchSearch = !search ||
      inv.number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.notes?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchMonth = monthFilter === "all" || (
      inv.createdAt &&
      format(new Date(inv.createdAt), "yyyy-MM") === monthFilter
    );
    return matchSearch && matchStatus && matchMonth;
  });

  // KPIs
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total ?? 0), 0);
  const totalPending = invoices
    .filter((i) => ["sent", "partial"].includes(i.status ?? ""))
    .reduce((s, i) => s + Number(i.total ?? 0), 0);
  const totalOverdue = invoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + Number(i.total ?? 0), 0);

  // Meses disponíveis para filtro
  const months = Array.from(new Set(
    invoices
      .filter((i) => i.createdAt)
      .map((i) => format(new Date(i.createdAt!), "yyyy-MM"))
  )).sort().reverse().slice(0, 12);

  return (
    <CRMLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Histórico de Pagamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Todas as faturas e recibos do sistema</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Recebido</p>
              <p className="text-xl font-bold text-foreground">
                R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aguardando Pagamento</p>
              <p className="text-xl font-bold text-foreground">
                R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Atraso</p>
              <p className="text-xl font-bold text-foreground">
                R$ {totalOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou observações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {format(new Date(m + "-01"), "MMMM yyyy", { locale: ptBR })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DollarSign className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Nenhuma fatura encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nº Fatura</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Emissão</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Vencimento</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Valor</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Pago em</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((inv) => {
                    const cfg = statusConfig[inv.status ?? "draft"] ?? statusConfig.draft;
                    return (
                      <tr key={inv.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono font-medium text-foreground">
                            {inv.number ?? `#${inv.id}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {inv.createdAt ? format(new Date(inv.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {inv.dueDate ? format(new Date(inv.dueDate), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-foreground">
                            R$ {Number(inv.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
                            cfg.color
                          )}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {inv.paidAt ? format(new Date(inv.paidAt), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {inv.stripePaymentIntentId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7"
                                title="Ver no Stripe"
                                onClick={() => window.open(`https://dashboard.stripe.com/payments/${inv.stripePaymentIntentId}`, "_blank")}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7"
                              title="Baixar recibo"
                              onClick={() => {
                                // Future: generate PDF receipt
                              }}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtered.length} fatura{filtered.length > 1 ? "s" : ""} encontrada{filtered.length > 1 ? "s" : ""}</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span>Total filtrado: <strong className="text-foreground">
                R$ {filtered.reduce((s, i) => s + Number(i.total ?? 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </strong></span>
            </div>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
