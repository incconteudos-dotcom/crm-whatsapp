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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Tag, DollarSign } from "lucide-react";

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

export default function Products() {
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");

  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.products.list.useQuery({ activeOnly: false });

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => { utils.products.list.invalidate(); toast.success("Produto criado!"); setShowDialog(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => { utils.products.list.invalidate(); toast.success("Produto atualizado!"); setShowDialog(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => { utils.products.list.invalidate(); toast.success("Produto desativado."); },
    onError: (e) => toast.error(e.message),
  });

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }

  function openEdit(p: typeof products[0]) {
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
          <p className="text-zinc-400 text-sm mt-1">Gerencie produtos e serviços para inserir em orçamentos e faturas</p>
        </div>
        <Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
        </Button>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const count = products.filter(p => (p.category ?? "other") === key && p.active).length;
          return (
            <Card key={key} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <Tag className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-400">{label}</p>
                  <p className="text-xl font-bold text-white">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
                  <CardContent className="pt-0 space-y-2">
                    {p.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-green-400 font-semibold">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>R$ {Number(p.unitPrice).toFixed(2)}</span>
                        <span className="text-zinc-500 font-normal text-xs">/ {p.unit ?? "un"}</span>
                      </div>
                      {!p.active && (
                        <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">Inativo</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
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
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-zinc-700 text-zinc-300">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {editId ? "Salvar" : "Criar Produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
