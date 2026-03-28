import CRMLayout from "@/components/CRMLayout";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Edit2, Trash2, Users, BarChart3 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#ef4444", "#f97316", "#14b8a6", "#84cc16",
];

interface RoomForm {
  name: string;
  description: string;
  capacity: string;
  color: string;
}

const defaultForm: RoomForm = {
  name: "",
  description: "",
  capacity: "2",
  color: "#6366f1",
};

export default function StudioRooms() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RoomForm>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: rooms = [], isLoading } = trpc.studioRooms.list.useQuery();
  const { data: occupancy = [] } = trpc.studioRooms.occupancyReport.useQuery();

  const createMutation = trpc.studioRooms.create.useMutation({
    onSuccess: () => {
      utils.studioRooms.list.invalidate();
      utils.studioRooms.occupancyReport.invalidate();
      setDialogOpen(false);
      setForm(defaultForm);
      toast.success("Sala criada com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.studioRooms.update.useMutation({
    onSuccess: () => {
      utils.studioRooms.list.invalidate();
      setDialogOpen(false);
      setEditingId(null);
      setForm(defaultForm);
      toast.success("Sala atualizada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.studioRooms.delete.useMutation({
    onSuccess: () => {
      utils.studioRooms.list.invalidate();
      setDeleteConfirm(null);
      toast.success("Sala desativada.");
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (room: any) => {
    setEditingId(room.id);
    setForm({
      name: room.name,
      description: room.description ?? "",
      capacity: String(room.capacity ?? 2),
      color: room.color ?? "#6366f1",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name,
      description: form.description || undefined,
      capacity: Number(form.capacity) || 2,
      color: form.color,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getOccupancy = (roomId: number) => {
    return occupancy.find(o => o.id === roomId)?.totalBookings ?? 0;
  };

  return (
    <CRMLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salas de Estúdio</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os espaços do seu estúdio de podcast</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Sala
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><Building2 className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{rooms.length}</p>
              <p className="text-xs text-muted-foreground">Salas Ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{rooms.reduce((s, r) => s + (r.capacity ?? 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Capacidade Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><BarChart3 className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{occupancy.reduce((s, o) => s + Number(o.totalBookings), 0)}</p>
              <p className="text-xs text-muted-foreground">Total de Sessões</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma sala cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">As salas padrão são criadas automaticamente ao acessar o Agendamento de Estúdio.</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Criar sala manualmente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => {
            const bookingCount = getOccupancy(room.id);
            return (
              <Card key={room.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Color bar */}
                <div className="h-2" style={{ backgroundColor: room.color ?? "#6366f1" }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${room.color ?? "#6366f1"}20` }}>
                        <Building2 className="h-5 w-5" style={{ color: room.color ?? "#6366f1" }} />
                      </div>
                      <div>
                        <p className="font-semibold">{room.name}</p>
                        {room.description && <p className="text-xs text-muted-foreground">{room.description}</p>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(room)}>
                          <Edit2 className="h-4 w-4 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(room.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />Desativar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{room.capacity ?? 1} pessoas</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>{bookingCount} sessões</span>
                    </div>
                  </div>

                  {/* Occupancy bar */}
                  {bookingCount > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Utilização</span>
                        <span>{bookingCount} sessões</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            backgroundColor: room.color ?? "#6366f1",
                            width: `${Math.min(100, (bookingCount / Math.max(...occupancy.map(o => Number(o.totalBookings)), 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Sala" : "Nova Sala"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Estúdio A"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição da sala..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Capacidade (pessoas)</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cor de identificação</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-7 h-7 rounded-full transition-all ${form.color === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm(f => ({ ...f, color }))}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-7 h-7 rounded-full" style={{ backgroundColor: form.color }} />
                <Input
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="font-mono text-sm"
                  placeholder="#6366f1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}
              style={{ backgroundColor: form.color }}
            >
              {editingId ? "Salvar" : "Criar Sala"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Desativar Sala</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">A sala será desativada e não aparecerá mais no calendário. Os agendamentos existentes não serão afetados.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm !== null && deleteMutation.mutate({ id: deleteConfirm })}
              disabled={deleteMutation.isPending}
            >
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </CRMLayout>
  );
}
