import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Clock, Play, Pause, Plus, Trash2, DollarSign, User, FolderOpen,
  Timer, BarChart3, CheckCircle2, Loader2, Download
} from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

const fmtMinutes = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min.toString().padStart(2, "0")}m` : `${min}m`;
};

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function TimeTracking() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    contactId: "",
    projectId: "",
    minutes: "",
    date: format(new Date(), "yyyy-MM-dd"),
    billable: true,
  });
  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const utils = trpc.useUtils();
  const { data: entries, isLoading } = trpc.sprintE.getTimeEntries.useQuery(undefined);
  const { data: contacts } = trpc.contacts.list.useQuery({});
  const { data: projects } = trpc.projects.list.useQuery({});

  const createMutation = trpc.sprintE.createTimeEntry.useMutation({
    onSuccess: () => {
      toast.success("Entrada registrada!");
      setCreateOpen(false);
      setForm({ description: "", contactId: "", projectId: "", minutes: "", date: format(new Date(), "yyyy-MM-dd"), billable: true });
      utils.sprintE.getTimeEntries.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.sprintE.deleteTimeEntry.useMutation({
    onSuccess: () => {
      toast.success("Entrada removida!");
      utils.sprintE.getTimeEntries.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const stopTimer = () => {
    setTimerRunning(false);
    const mins = Math.ceil(timerSeconds / 60);
    setForm(f => ({ ...f, minutes: String(mins) }));
    setTimerSeconds(0);
    setCreateOpen(true);
  };

  const fmtTimer = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Stats
  const totalMinutes = (entries ?? []).reduce((s, e) => s + e.minutes, 0);
  const billableMinutes = (entries ?? []).filter(e => e.billable).reduce((s, e) => s + e.minutes, 0);
  const thisWeekStart = startOfWeek(new Date(), { locale: ptBR });
  const thisWeekEnd = endOfWeek(new Date(), { locale: ptBR });
  const weekMinutes = (entries ?? [])
    .filter(e => {
      const d = new Date(e.date);
      return d >= thisWeekStart && d <= thisWeekEnd;
    })
    .reduce((s, e) => s + e.minutes, 0);

  // Group by day
  const byDay = (entries ?? []).reduce<Record<string, typeof entries>>((acc, e) => {
    const key = format(new Date(e.date), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(e);
    return acc;
  }, {});

  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  const exportCSV = () => {
    const rows = (entries ?? []).map(e => ({
      Data: format(new Date(e.date), "dd/MM/yyyy"),
      Descrição: e.description,
      Contato: contacts?.find(c => c.id === e.contactId)?.name ?? "",
      Projeto: projects?.find(p => p.id === e.projectId)?.name ?? "",
      Minutos: e.minutes,
      Horas: (e.minutes / 60).toFixed(2),
      Faturável: e.billable ? "Sim" : "Não",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `horas_${format(new Date(), "yyyyMMdd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado!");
  };

  return (
    <CRMLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" /> Controle de Horas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Registre e acompanhe o tempo dedicado a cada cliente e projeto</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" /> Exportar
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Registrar Horas
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Registrado", value: fmtMinutes(totalMinutes), icon: Timer, color: "text-primary" },
            { label: "Esta Semana", value: fmtMinutes(weekMinutes), icon: BarChart3, color: "text-blue-400" },
            { label: "Horas Faturáveis", value: fmtMinutes(billableMinutes), icon: DollarSign, color: "text-green-400" },
            { label: "Entradas", value: String(entries?.length ?? 0), icon: CheckCircle2, color: "text-yellow-400" },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={cn("w-4 h-4", stat.color)} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Timer widget */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Cronômetro</p>
            <p className="text-3xl font-mono font-bold text-primary">{fmtTimer(timerSeconds)}</p>
          </div>
          <div className="flex items-center gap-3">
            {timerRunning ? (
              <>
                <Button variant="outline" onClick={stopTimer} className="gap-2 text-yellow-400 border-yellow-500/30">
                  <Pause className="w-4 h-4" /> Parar e Registrar
                </Button>
                <Button variant="ghost" onClick={() => { setTimerRunning(false); setTimerSeconds(0); }} className="text-muted-foreground">
                  Cancelar
                </Button>
              </>
            ) : (
              <Button onClick={() => setTimerRunning(true)} className="gap-2 bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4" /> Iniciar Cronômetro
              </Button>
            )}
          </div>
        </div>

        {/* Entries by day */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedDays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">Nenhuma entrada registrada</p>
            <p className="text-sm text-muted-foreground">Clique em "Registrar Horas" ou use o cronômetro para começar.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDays.map(day => {
              const dayEntries = byDay[day] ?? [];
              const dayTotal = dayEntries.reduce((s, e) => s + e.minutes, 0);
              return (
                <div key={day}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground capitalize">
                      {format(new Date(day + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <span className="text-sm text-muted-foreground">{fmtMinutes(dayTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    {dayEntries.map(entry => {
                      const contact = contacts?.find(c => c.id === entry.contactId);
                      const project = projects?.find(p => p.id === entry.projectId);
                      return (
                        <div key={entry.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4 group">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{entry.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {contact && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="w-3 h-3" /> {contact.name}
                                </span>
                              )}
                              {project && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <FolderOpen className="w-3 h-3" /> {project.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {entry.billable && (
                              <Badge variant="outline" className="text-green-400 border-green-500/30 text-xs">Faturável</Badge>
                            )}
                            <span className="text-sm font-semibold text-primary">{fmtMinutes(entry.minutes)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
                              onClick={() => deleteMutation.mutate({ id: entry.id })}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Registrar Horas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input
                placeholder="O que foi feito?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duração (minutos) *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="60"
                  value={form.minutes}
                  onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={form.contactId || "none"} onValueChange={v => setForm(f => ({ ...f, contactId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {(contacts ?? []).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Projeto</Label>
              <Select value={form.projectId || "none"} onValueChange={v => setForm(f => ({ ...f, projectId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar projeto (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {(projects ?? []).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-1">
              <Label className="cursor-pointer">Horas faturáveis</Label>
              <Switch checked={form.billable} onCheckedChange={v => setForm(f => ({ ...f, billable: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!form.description.trim() || !form.minutes) { toast.error("Preencha descrição e duração"); return; }
                createMutation.mutate({
                  description: form.description,
                  minutes: Number(form.minutes),
                  date: new Date(form.date + "T12:00:00"),
                  contactId: form.contactId ? Number(form.contactId) : undefined,
                  projectId: form.projectId ? Number(form.projectId) : undefined,
                  billable: form.billable,
                });
              }}
              disabled={createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
