import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Receipt, Plus, CheckCircle, Send, CreditCard, SplitSquareHorizontal,
  ExternalLink, Copy, Loader2, AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft:     { label: "Rascunho", color: "bg-gray-500/20 text-gray-400" },
  sent:      { label: "Enviada",  color: "bg-blue-500/20 text-blue-400" },
  paid:      { label: "Paga",     color: "bg-green-500/20 text-green-400" },
  overdue:   { label: "Vencida",  color: "bg-red-500/20 text-red-400" },
  cancelled: { label: "Cancelada",color: "bg-gray-500/20 text-gray-400" },
};

type InvoiceItem = { description: string; quantity: number; unitPrice: number; total: number };

type SplitLinks = { installment1: { url: string }; installment2: { url: string } };

export default function Invoices() {
  const [createOpen, setCreateOpen]   = useState(false);
  const [payOpen, setPayOpen]         = useState(false);
  const [splitLinks, setSplitLinks]   = useState<SplitLinks | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [items, setItems]             = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const [notes, setNotes]             = useState("");

  const utils = trpc.useUtils();
  const { data: invoices, isLoading } = trpc.invoices.list.useQuery();

  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Fatura criada!");
      setCreateOpen(false);
      setItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      utils.invoices.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.invoices.update.useMutation({
    onSuccess: () => { toast.success("Fatura atualizada!"); utils.invoices.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const checkoutMutation = trpc.stripe.createInvoiceCheckout.useMutation({
    onSuccess: ({ checkoutUrl }) => {
      toast.success("Redirecionando para o pagamento...");
      window.open(checkoutUrl, "_blank");
      setPayOpen(false);
    },
    onError: (e) => toast.error(`Erro ao gerar link: ${e.message}`),
  });

  const splitMutation = trpc.stripe.createSplitCheckout.useMutation({
    onSuccess: (data) => {
      setSplitLinks(data);
      toast.success("Links de pagamento gerados!");
    },
    onError: (e) => toast.error(`Erro ao gerar links: ${e.message}`),
  });

  const handlePayFull = (invoiceId: number) => {
    checkoutMutation.mutate({ invoiceId, origin: window.location.origin });
  };

  const handlePaySplit = (invoiceId: number) => {
    setSplitLinks(null);
    setSelectedInvoiceId(invoiceId);
    splitMutation.mutate({ invoiceId, origin: window.location.origin });
    setPayOpen(true);
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        updated.total = Number(updated.quantity) * Number(updated.unitPrice);
      }
      return updated;
    }));
  };

  const total = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <CRMLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-5 h-5 text-green-400" />
              Faturas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{invoices?.length ?? 0} faturas</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Fatura
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />
            ))}
          </div>
        ) : invoices && invoices.length > 0 ? (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{inv.number}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", statusConfig[inv.status ?? "draft"]?.color)}>
                        {statusConfig[inv.status ?? "draft"]?.label}
                      </span>
                      {inv.paymentPlan === "installment_50_50" && (
                        <Badge variant="secondary" className="text-xs">50% / 50%</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-lg font-bold text-green-400">
                        R$ {Number(inv.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      {inv.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Vence: {format(new Date(inv.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                      {inv.paidAt && (
                        <span className="text-xs text-green-400">
                          Pago em: {format(new Date(inv.paidAt), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    {/* Payment link badge */}
                    {inv.stripePaymentUrl && inv.status !== "paid" && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-violet-400 font-mono truncate max-w-xs">
                          {inv.stripePaymentUrl.slice(0, 60)}...
                        </span>
                        <button
                          onClick={() => copyLink(inv.stripePaymentUrl!)}
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => window.open(inv.stripePaymentUrl!, "_blank")}
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {inv.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: inv.id, status: "sent" })}>
                        <Send className="w-3.5 h-3.5 mr-1.5" />Enviar
                      </Button>
                    )}
                    {(inv.status === "sent" || inv.status === "draft") && (
                      <>
                        <Button
                          size="sm"
                          className="bg-violet-600 hover:bg-violet-700 text-white"
                          onClick={() => handlePayFull(inv.id)}
                          disabled={checkoutMutation.isPending}
                        >
                          {checkoutMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Pagar Integral
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
                          onClick={() => handlePaySplit(inv.id)}
                          disabled={splitMutation.isPending}
                        >
                          {splitMutation.isPending && selectedInvoiceId === inv.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <SplitSquareHorizontal className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          50% / 50%
                        </Button>
                      </>
                    )}
                    {inv.status === "sent" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        onClick={() => updateMutation.mutate({ id: inv.id, status: "paid", paidAt: new Date() })}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Confirmar Pago
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma fatura criada</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Nova Fatura
            </Button>
          </div>
        )}
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Fatura</DialogTitle>
            <DialogDescription>Adicione os itens e crie a fatura para o cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Itens da Fatura</Label>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                  <Input className="col-span-5 bg-input border-border text-sm" placeholder="Descrição" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                  <Input className="col-span-2 bg-input border-border text-sm" type="number" placeholder="Qtd" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                  <Input className="col-span-2 bg-input border-border text-sm" type="number" placeholder="Valor" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))} />
                  <div className="col-span-2 flex items-center text-sm text-green-400 font-medium">
                    R$ {item.total.toFixed(2)}
                  </div>
                  <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="col-span-1 text-muted-foreground hover:text-destructive transition-colors text-xs">✕</button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0, total: 0 }])}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Adicionar Item
              </Button>
            </div>
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-green-400">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações..." className="mt-1.5 bg-input border-border resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate({ items, notes: notes || undefined })} disabled={items.length === 0 || createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Fatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Payment Links Dialog */}
      <Dialog open={payOpen} onOpenChange={(o) => { setPayOpen(o); if (!o) setSplitLinks(null); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SplitSquareHorizontal className="w-5 h-5 text-violet-400" />
              Pagamento 50% / 50%
            </DialogTitle>
            <DialogDescription>
              Dois links de pagamento foram gerados. Envie o primeiro para liberar o agendamento e o segundo para quitação.
            </DialogDescription>
          </DialogHeader>

          {splitMutation.isPending && !splitLinks ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              <p className="text-sm text-muted-foreground">Gerando links de pagamento...</p>
            </div>
          ) : splitLinks ? (
            <div className="space-y-4">
              {/* Parcela 1 */}
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-violet-300">Parcela 1/2 — Entrada (50%)</p>
                  <Badge variant="secondary" className="text-xs">Libera Agenda</Badge>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Envie este link ao cliente para confirmar o agendamento.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                    onClick={() => window.open(splitLinks.installment1.url, "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Abrir Link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(splitLinks.installment1.url)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copiar
                  </Button>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Parcela 2 */}
              <div className="rounded-lg border border-slate-600/40 bg-slate-800/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-300">Parcela 2/2 — Saldo (50%)</p>
                  <Badge variant="outline" className="text-xs">Até o dia da sessão</Badge>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Envie este link próximo à data da sessão para quitação.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(splitLinks.installment2.url, "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Abrir Link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(splitLinks.installment2.url)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-400/80">
                  Modo teste ativo. Use o cartão <span className="font-mono">4242 4242 4242 4242</span> para simular pagamentos.
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayOpen(false); setSplitLinks(null); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
