import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { BookOpen, Plus, CheckCircle, XCircle, Send, Clock } from "lucide-react";
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
  sent: { label: "Enviado", color: "bg-blue-500/20 text-blue-400" },
  accepted: { label: "Aceito", color: "bg-green-500/20 text-green-400" },
  rejected: { label: "Recusado", color: "bg-red-500/20 text-red-400" },
  expired: { label: "Expirado", color: "bg-gray-500/20 text-gray-400" },
};

type QuoteItem = { description: string; quantity: number; unitPrice: number; total: number };

export default function Quotes() {
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const { data: quotes, isLoading } = trpc.quotes.list.useQuery();

  const createMutation = trpc.quotes.create.useMutation({
    onSuccess: () => {
      toast.success("Orçamento criado!");
      setCreateOpen(false);
      setItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      setDiscount("0");
      utils.quotes.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.quotes.update.useMutation({
    onSuccess: () => { toast.success("Orçamento atualizado!"); utils.quotes.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateItem = (idx: number, field: keyof QuoteItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        updated.total = Number(updated.quantity) * Number(updated.unitPrice);
      }
      return updated;
    }));
  };

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const total = subtotal - Number(discount);

  return (
    <CRMLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              Orçamentos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{quotes?.length ?? 0} orçamentos</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}</div>
        ) : quotes && quotes.length > 0 ? (
          <div className="space-y-3">
            {quotes.map((q) => (
              <div key={q.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-foreground">{q.number}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", statusConfig[q.status ?? "draft"]?.color)}>
                        {statusConfig[q.status ?? "draft"]?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-lg font-bold text-cyan-400">
                        R$ {Number(q.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      {q.validUntil && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Válido até {format(new Date(q.validUntil), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {q.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: q.id, status: "sent" })}>
                        <Send className="w-3.5 h-3.5 mr-1.5" />Enviar
                      </Button>
                    )}
                    {q.status === "sent" && (
                      <>
                        <Button size="sm" onClick={() => updateMutation.mutate({ id: q.id, status: "accepted" })}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Aceitar
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateMutation.mutate({ id: q.id, status: "rejected" })}>
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />Recusar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum orçamento criado</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Novo Orçamento
            </Button>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Itens</Label>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                  <Input className="col-span-5 bg-input border-border text-sm" placeholder="Descrição" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                  <Input className="col-span-2 bg-input border-border text-sm" type="number" placeholder="Qtd" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                  <Input className="col-span-2 bg-input border-border text-sm" type="number" placeholder="Valor" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))} />
                  <div className="col-span-2 flex items-center text-sm text-cyan-400 font-medium">R$ {item.total.toFixed(2)}</div>
                  <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="col-span-1 text-muted-foreground hover:text-destructive text-xs">✕</button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0, total: 0 }])}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Adicionar Item
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Desconto (R$)</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-1.5 bg-input border-border" />
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-cyan-400">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5 bg-input border-border resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate({ items, discount: discount || undefined, notes: notes || undefined })} disabled={items.length === 0 || createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Orçamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
