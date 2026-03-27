import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CheckSquare, Plus, Flag, Clock, CheckCircle, Circle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "text-gray-400" },
  medium: { label: "Média", color: "text-blue-400" },
  high: { label: "Alta", color: "text-yellow-400" },
  urgent: { label: "Urgente", color: "text-red-400" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400" },
  in_progress: { label: "Em Andamento", color: "bg-blue-500/20 text-blue-400" },
  done: { label: "Concluída", color: "bg-green-500/20 text-green-400" },
  cancelled: { label: "Cancelada", color: "bg-gray-500/20 text-gray-400" },
};

export default function Tasks() {
  const [createOpen, setCreateOpen] = useState(false);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as const, dueDate: "", assignedUserId: "" });

  const { data: usersData } = trpc.users.list.useQuery();

  const utils = trpc.useUtils();
  const { data: tasks, isLoading } = trpc.tasks.list.useQuery({ myTasks: myTasksOnly });

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Tarefa criada!");
      setCreateOpen(false);
      setForm({ title: "", description: "", priority: "medium", dueDate: "", assignedUserId: "" });
      utils.tasks.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => utils.tasks.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const pending = tasks?.filter(t => t.status === "pending" || t.status === "in_progress") ?? [];
  const done = tasks?.filter(t => t.status === "done") ?? [];

  return (
    <CRMLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-yellow-400" />
              Tarefas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{pending.length} pendentes · {done.length} concluídas</p>
          </div>
          <div className="flex gap-2">
            <Button variant={myTasksOnly ? "default" : "outline"} size="sm" onClick={() => setMyTasksOnly(!myTasksOnly)}>
              Minhas Tarefas
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2 mb-6">
                {pending.map((task) => (
                  <div key={task.id} className={cn("bg-card border border-border rounded-xl p-4 flex items-start gap-3 transition-colors", task.status === "done" && "opacity-60")}>
                    <button
                      onClick={() => updateMutation.mutate({ id: task.id, status: task.status === "done" ? "pending" : "done" })}
                      className="mt-0.5 shrink-0"
                    >
                      {task.status === "done" ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-medium text-foreground", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</p>
                        <Flag className={cn("w-3.5 h-3.5 shrink-0", priorityConfig[task.priority ?? "medium"]?.color)} />
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={cn("text-xs px-1.5 py-0.5 rounded-full", statusConfig[task.status ?? "pending"]?.color)}>
                          {statusConfig[task.status ?? "pending"]?.label}
                        </span>
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.status !== "done" && task.status !== "in_progress" && (
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => updateMutation.mutate({ id: task.id, status: "in_progress" })}>
                        Iniciar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {done.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">CONCLUÍDAS ({done.length})</p>
                <div className="space-y-2 opacity-60">
                  {done.slice(0, 5).map((task) => (
                    <div key={task.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                      <p className="text-sm text-muted-foreground line-through">{task.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && tasks?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckSquare className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma tarefa criada</p>
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />Nova Tarefa
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Descreva a tarefa..." className="mt-1.5 bg-input border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as typeof form.priority })}>
                  <SelectTrigger className="mt-1.5 bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prazo</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1.5 bg-input border-border" />
              </div>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={form.assignedUserId} onValueChange={(v) => setForm({ ...form, assignedUserId: v })}>
                <SelectTrigger className="mt-1.5 bg-input border-border"><SelectValue placeholder="Selecionar usuário..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem responsável</SelectItem>
                  {usersData?.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name ?? u.email ?? `Usuário #${u.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 bg-input border-border resize-none" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate({ title: form.title, priority: form.priority, description: form.description || undefined, dueDate: form.dueDate ? new Date(form.dueDate) : undefined, assignedUserId: form.assignedUserId ? parseInt(form.assignedUserId) : undefined })} disabled={!form.title.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
