import CRMLayout from "@/components/CRMLayout";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Package, Tag, DollarSign,
  RefreshCw, ShoppingCart, CheckCircle2, AlertCircle, Clock,
  ExternalLink, Zap
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  episode: "Episódio",
  package: "Pacote",
  studio: "Estúdio",
  service: "Serviço",
  other: "Outro",
};

const CATEGORY_COLORS: Record<string, string> = {
  episode: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  package: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  studio: "bg-green-500/20 text-green-300 border-green-500/30",
  service: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  other: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

type ProductForm = {
  name: string;
  description: string;
  category: "episode" | "package" | "studio" | "service" | "other";
  unitPrice: string;
  unit: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  category: "service",
  unitPrice: "",
  unit: "un",
};

type Product = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  unitPrice: string;
  currency?: string | null;
  unit?: string | null;
  active?: boolean | null;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  stripeLastSyncedAt?: Date | null;
};

function StripeSyncBadge({ product }: { product: Product }) {
  if (product.stripeProductId && product.stripePriceId) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Stripe
            </span>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-800 border-zinc-700 text-xs">
            <p className="text-emerald-400 font-medium">Sincronizado com Stripe</p>
            <p className="text-zinc-400 mt-0.5">Product: {product.stripeProductId}</p>
            <p className="text-zinc-400">Price: {product.stripePriceId}</p>
            {product.stripeLastSyncedAt && (
              <p className="text-zinc-500 mt-0.5">
                Última sync: {new Date(product.stripeLastSyncedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
            <AlertCircle className="w-3 h-3" />
            Sem Stripe
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-800 border-zinc-700 text-xs">
          <p className="text-amber-400">Não sincronizado com Stripe</p>
          <p className="text-zinc-400 mt-0.5">Use "Sincronizar" para criar o produto no Stripe.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function Products() {
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [checkoutProductId, setCheckoutProductId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.products.list.useQuery({ activeOnly: false });

  const createMutation = trpc.products.create.useMutation({
    onSuccess: (res) => {
      utils.products.list.invalidate();
      if (res.stripeSync) {
        toast.success("Produto criado e sincronizado com Stripe!", {
          description: `Product ID: ${res.stripeProductId}`,
        });
      } else {
        toast.success("Produto criado!", {
          description: res.error ? `Aviso: falha na sync Stripe — ${res.error}` : "Sincronize com Stripe manualmente se necessário.",
        });
      }
      setShowDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: (res) => {
      utils.products.list.invalidate();
      if (res.stripeSync) {
        toast.success("Produto atualizado e sincronizado com Stripe!");
      } else {
        toast.success("Produto atualizado!", {
          description: res.error ? `Aviso: falha na sync Stripe — ${res.error}` : undefined,
        });
      }
      setShowDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => { utils.products.list.invalidate(); toast.success("Produto desativado e arquivado no Stripe."); },
    onError: (e) => toast.error(e.message),
  });

  const syncMutation = trpc.products.syncToStripe.useMutation({
    onSuccess: (res) => {
      utils.products.list.invalidate();
      toast.success("Sincronizado com Stripe!", {
        description: `Product: ${res.stripeProductId} | Price: ${res.stripePriceId}`,
      });
    },
    onError: (e) => toast.error(`Falha na sincronização: ${e.message}`),
  });

  const checkoutMutation = trpc.products.checkout.useMutation({
    onSuccess: ({ checkoutUrl }) => {
      toast.success("Redirecionando para o checkout...");
      window.open(checkoutUrl, "_blank");
      setCheckoutProductId(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setCheckoutProductId(null);
    },
  });

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      category: (p.category ?? "service") as ProductForm["category"],
      unitPrice: p.unitPrice,
      unit: p.unit ?? "un",
    });
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!form.name || !form.unitPrice) { toast.error("Preencha nome e preço."); return; }
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleCheckout(p: Product) {
    if (!p.stripePriceId) {
      toast.error("Produto não sincronizado com Stripe.", {
        description: "Clique em 'Sincronizar' primeiro.",
      });
      return;
    }
    setCheckoutProductId(p.id);
    checkoutMutation.mutate({
      productId: p.id,
      quantity: 1,
      origin: window.location.origin,
    });
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, p) => {
    const cat = p.category ?? "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, typeof products>);

  const syncedCount = products.filter(p => p.stripeProductId).length;
  const unsyncedCount = products.filter(p => !p.stripeProductId && p.active).length;

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-purple-400" />
              Catálogo de Produtos
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Gerencie produtos e serviços — cada produto é sincronizado automaticamente com o Stripe
            </p>
          </div>
          <Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Novo Produto
          </Button>
        </div>

        {/* Stripe Sync Status Banner */}
        {unsyncedCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              <span className="font-semibold">{unsyncedCount} produto{unsyncedCount > 1 ? "s" : ""}</span> ainda não sincronizado{unsyncedCount > 1 ? "s" : ""} com o Stripe.
              Use o botão <span className="font-medium">Sincronizar</span> em cada card para criar o produto no Stripe.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-xs text-zinc-400">Total Ativos</p>
                <p className="text-xl font-bold text-white">{products.filter(p => p.active).length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-zinc-400">No Stripe</p>
                <p className="text-xl font-bold text-white">{syncedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs text-zinc-400">Sem Sync</p>
                <p className="text-xl font-bold text-white">{unsyncedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Tag className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-xs text-zinc-400">Categorias</p>
                <p className="text-xl font-bold text-white">{Object.keys(grouped).length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white pl-4"
          />
        </div>

        {/* Products by category */}
        {isLoading ? (
          <div className="text-zinc-400 text-center py-12">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum produto cadastrado ainda.</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 border-zinc-700 text-zinc-300">
              Cadastrar primeiro produto
            </Button>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs border ${CATEGORY_COLORS[cat]}`}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
                <span className="text-zinc-600">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(p => (
                  <Card
                    key={p.id}
                    className={`bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors ${!p.active ? "opacity-50" : ""}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base text-white leading-tight">{p.name}</CardTitle>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-zinc-400 hover:text-white"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-zinc-400 hover:text-red-400"
                            onClick={() => deleteMutation.mutate({ id: p.id })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {p.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2">{p.description}</p>
                      )}

                      {/* Price + Stripe badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-green-400 font-semibold">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>R$ {Number(p.unitPrice).toFixed(2)}</span>
                          <span className="text-zinc-500 font-normal text-xs">/ {p.unit ?? "un"}</span>
                        </div>
                        <StripeSyncBadge product={p} />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1 border-t border-zinc-800">
                        {/* Sync with Stripe */}
                        {!p.stripeProductId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 gap-1"
                            onClick={() => syncMutation.mutate({ id: p.id })}
                            disabled={syncMutation.isPending}
                          >
                            <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                            Sincronizar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-zinc-500 hover:text-zinc-300 gap-1 px-2"
                            onClick={() => syncMutation.mutate({ id: p.id })}
                            disabled={syncMutation.isPending}
                          >
                            <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                            Re-sync
                          </Button>
                        )}

                        {/* Checkout button */}
                        {p.active && p.stripePriceId && (
                          <Button
                            size="sm"
                            className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            onClick={() => handleCheckout(p)}
                            disabled={checkoutProductId === p.id && checkoutMutation.isPending}
                          >
                            {checkoutProductId === p.id && checkoutMutation.isPending ? (
                              <Clock className="w-3 h-3 animate-spin" />
                            ) : (
                              <ShoppingCart className="w-3 h-3" />
                            )}
                            Checkout
                          </Button>
                        )}

                        {/* Stripe Dashboard link */}
                        {p.stripeProductId && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                            onClick={() => window.open(`https://dashboard.stripe.com/products/${p.stripeProductId}`, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      {!p.active && (
                        <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">Inativo</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Stripe info footer */}
        <div className="flex items-center gap-2 text-xs text-zinc-600 pt-2 border-t border-zinc-800">
          <Zap className="w-3.5 h-3.5 text-zinc-500" />
          <span>
            Ao criar ou editar um produto, ele é sincronizado automaticamente com o{" "}
            <a
              href="https://dashboard.stripe.com/products"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-white underline underline-offset-2"
            >
              Stripe Products
            </a>
            . O checkout usa o Price ID do Stripe para garantir consistência de preços.
          </span>
        </div>

      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editId ? <Pencil className="w-4 h-4 text-purple-400" /> : <Plus className="w-4 h-4 text-purple-400" />}
              {editId ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          {/* Stripe sync notice */}
          <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              {editId
                ? "Ao salvar, o produto será atualizado automaticamente no Stripe. Se o preço mudar, um novo Price ID será criado."
                : "Ao criar, o produto será sincronizado automaticamente com o Stripe Products e um Price ID será gerado."}
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Nome *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Gravação de episódio"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrição detalhada do produto/serviço"
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={v => setForm(f => ({ ...f, category: v as ProductForm["category"] }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Unidade</Label>
                <Select
                  value={form.unit}
                  onValueChange={v => setForm(f => ({ ...f, unit: v }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {["un", "hr", "dia", "mês", "episódio", "pacote", "sessão"].map(u => (
                      <SelectItem key={u} value={u} className="text-white">{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Preço Unitário (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.unitPrice}
                onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                placeholder="0,00"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <p className="text-xs text-zinc-500">
                O preço será convertido para centavos no Stripe (ex: R$ 100,00 → 10000 centavos).
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-zinc-700 text-zinc-300">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
              {editId ? "Salvar e Sincronizar" : "Criar e Sincronizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
