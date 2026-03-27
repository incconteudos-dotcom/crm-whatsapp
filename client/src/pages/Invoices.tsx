import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Receipt, Plus, CheckCircle, Clock, AlertCircle, XCircle, DollarSign, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-400" },
  sent: { label: "Enviada", color: "bg-blue-500/20 text-blue-400" },
  paid: { label: "Paga", color: "bg-green-500/20 text-green-400" },
  overdue: { label: "Vencida", color: "bg-red-500/20 text-red-400" },
  cancelled: { label: "Cancelada", color: "bg-gray-500/20 text-gray-400" },
};

type InvoiceItem = { description: string; quantity: number; unitPrice: number; total: number };

export default function Invoices() {
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const [notes, setNotes] = useState("");

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

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="bg-card border border-border rounded-xl p-5 h-20 animate-pulse" />)}</div>
        ) : invoices && invoices.length > 0 ? (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-foreground">{inv.number}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", statusConfig[inv.status ?? "draft"]?.color)}>
                        {statusConfig[inv.status ?? "draft"]?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-lg font-bold text-green-400">
                        R$ {Number(inv.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      {inv.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Vence: {format(new Date(inv.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {inv.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: inv.id, status: "sent" })}>
                        <Send className="w-3.5 h-3.5 mr-1.5" />Enviar
                      </Button>
                    )}
                    {inv.status === "sent" && (
                      <Button size="sm" onClick={() => updateMutation.mutate({ id: inv.id, status: "paid", paidAt: new Date() })}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Marcar Paga
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Fatura</DialogTitle></DialogHeader>
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
    </CRMLayout>
  );
}
