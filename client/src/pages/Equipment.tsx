import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, Package, Wrench, Camera, Lightbulb, Music, MoreHorizontal,
  CheckCircle, AlertTriangle, XCircle, Settings
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const CATEGORIES = [
  { value: "audio", label: "Áudio", icon: Music },
  { value: "video", label: "Vídeo", icon: Camera },
  { value: "lighting", label: "Iluminação", icon: Lightbulb },
  { value: "accessories", label: "Acessórios", icon: Package },
  { value: "other", label: "Outros", icon: Settings },
];

const STATUS_CONFIG = {
  available: { label: "Disponível", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: CheckCircle },
  in_use: { label: "Em Uso", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Settings },
  maintenance: { label: "Manutenção", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: Wrench },
  retired: { label: "Aposentado", color: "bg-red-500/10 text-red-600 border-red-200", icon: XCircle },
};

type EquipmentStatus = keyof typeof STATUS_CONFIG;

interface EquipmentForm {
  name: string;
  category: string;
  serialNumber: string;
  brand: string;
  model: string;
  status: EquipmentStatus;
  notes: string;
  roomId?: number;
}

const defaultForm: EquipmentForm = {
  name: "",
  category: "audio",
  serialNumber: "",
  brand: "",
  model: "",
  status: "available",
  notes: "",
};

export default function Equipment() {

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EquipmentForm>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: equipmentList = [], isLoading } = trpc.equipment.list.useQuery({ category: categoryFilter === "all" ? undefined : categoryFilter });
  const { data: rooms = [] } = trpc.studioRooms.list.useQuery();

  const createMutation = trpc.equipment.create.useMutation({
    onSuccess: () => {
      utils.equipment.list.invalidate();
      setDialogOpen(false);
      setForm(defaultForm);
      toast.success("Equipamento criado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.equipment.update.useMutation({
    onSuccess: () => {
      utils.equipment.list.invalidate();
      setDialogOpen(false);
      setEditingId(null);
      setForm(defaultForm);
      toast.success("Equipamento atualizado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.equipment.delete.useMutation({
    onSuccess: () => {
      utils.equipment.list.invalidate();
      setDeleteConfirm(null);
      toast.success("Equipamento removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      serialNumber: item.serialNumber ?? "",
      brand: item.brand ?? "",
      model: item.model ?? "",
      status: item.status as EquipmentStatus,
      notes: item.notes ?? "",
      roomId: item.roomId ?? undefined,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name,
      category: form.category,
      serialNumber: form.serialNumber || undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      status: form.status,
      notes: form.notes || undefined,
      roomId: form.roomId,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = equipmentList.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.brand ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.model ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.serialNumber ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: equipmentList.length,
    available: equipmentList.filter(e => e.status === "available").length,
    in_use: equipmentList.filter(e => e.status === "in_use").length,
    maintenance: equipmentList.filter(e => e.status === "maintenance").length,
  };

  const getCategoryIcon = (cat: string) => {
    const found = CATEGORIES.find(c => c.value === cat);
    const Icon = found?.icon ?? Package;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie o inventário de equipamentos do estúdio</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Equipamento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><Package className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.available}</p>
              <p className="text-xs text-muted-foreground">Disponíveis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Settings className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.in_use}</p>
              <p className="text-xs text-muted-foreground">Em Uso</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg"><Wrench className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.maintenance}</p>
              <p className="text-xs text-muted-foreground">Manutenção</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, marca, modelo, serial..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Equipment List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-36 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum equipamento encontrado</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar primeiro equipamento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const statusCfg = STATUS_CONFIG[item.status as EquipmentStatus] ?? STATUS_CONFIG.available;
            const StatusIcon = statusCfg.icon;
            const room = rooms.find(r => r.id === item.roomId);
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{item.name}</p>
                        {(item.brand || item.model) && (
                          <p className="text-xs text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(item)}>
                          <Edit2 className="h-4 w-4 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(item.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {CATEGORIES.find(c => c.value === item.category)?.label ?? item.category}
                      </Badge>
                      {item.serialNumber && (
                        <Badge variant="outline" className="text-xs font-mono">
                          S/N: {item.serialNumber}
                        </Badge>
                      )}
                    </div>
                    {room && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: room.color ?? "#6366f1" }} />
                        {room.name}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: Microfone Shure SM7B"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as EquipmentStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Input placeholder="Ex: Shure" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input placeholder="Ex: SM7B" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Número de Série</Label>
                <Input placeholder="S/N" value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Sala Padrão</Label>
                <Select
                  value={form.roomId ? String(form.roomId) : "none"}
                  onValueChange={v => setForm(f => ({ ...f, roomId: v === "none" ? undefined : Number(v) }))}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {rooms.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Notas sobre o equipamento..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Equipamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este equipamento? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm !== null && deleteMutation.mutate({ id: deleteConfirm })}
              disabled={deleteMutation.isPending}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
