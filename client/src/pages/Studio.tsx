import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Calendar, Plus, Clock, User, Mic, CheckCircle, XCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const sessionTypeLabels: Record<string, string> = {
  recording: "Gravação de Podcast",
  mixing: "Edição de Áudio",
  mastering: "Pós-Produção",
  rehearsal: "Revisão de Episódio",
  other: "Outro",
};

const sessionTypeColors: Record<string, string> = {
  recording: "bg-purple-500/20 text-purple-400",
  mixing: "bg-blue-500/20 text-blue-400",
  mastering: "bg-green-500/20 text-green-400",
  rehearsal: "bg-yellow-500/20 text-yellow-400",
  other: "bg-gray-500/20 text-gray-400",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-400",
  confirmed: "bg-green-500/20 text-green-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-gray-500/20 text-gray-400",
  cancelled: "bg-red-500/20 text-red-400",
};

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function Studio() {
  const [createOpen, setCreateOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [form, setForm] = useState({
    title: "", sessionType: "recording" as const, startAt: "", endAt: "",
    studio: "Estúdio de Podcast", engineer: "", notes: "", value: "",
  });

  const utils = trpc.useUtils();
  const { data: bookings, isLoading } = trpc.studio.bookings.useQuery();
  const { data: contacts } = trpc.contacts.list.useQuery({});

  const createMutation = trpc.studio.create.useMutation({
    onSuccess: () => {
      toast.success("Sessão agendada!");
      setCreateOpen(false);
      setForm({ title: "", sessionType: "recording", startAt: "", endAt: "", studio: "Estúdio Principal", engineer: "", notes: "", value: "" });
      utils.studio.bookings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Conflict check — only fires when both dates are set
  const conflictStart = useMemo(() => form.startAt ? new Date(form.startAt) : null, [form.startAt]);
  const conflictEnd = useMemo(() => form.endAt ? new Date(form.endAt) : null, [form.endAt]);
  const { data: conflictData } = trpc.studio.checkConflict.useQuery(
    { startAt: conflictStart!, endAt: conflictEnd!, studio: form.studio || undefined },
    { enabled: !!conflictStart && !!conflictEnd && conflictStart < conflictEnd }
  );
  const hasConflict = conflictData?.hasConflict ?? false;

  const updateMutation = trpc.studio.update.useMutation({
    onSuccess: () => { toast.success("Sessão atualizada!"); utils.studio.bookings.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = getDay(startOfMonth(currentMonth));

  const dayBookings = (day: Date) => bookings?.filter(b => isSameDay(new Date(b.startAt), day)) ?? [];
  const selectedDayBookings = selectedDay ? dayBookings(selectedDay) : [];

  return (
    <CRMLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pink-400" />
              Agendamento de Estúdio
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{bookings?.length ?? 0} sessões agendadas</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Sessão
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}>‹</Button>
                <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
                <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}>›</Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                <div key={d} className="text-xs text-muted-foreground text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(firstDayOfWeek)].map((_, i) => <div key={`empty-${i}`} />)}
              {monthDays.map((day) => {
                const hasBookings = dayBookings(day).length > 0;
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isToday = isSameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative",
                      isSelected ? "bg-primary text-primary-foreground" :
                      isToday ? "bg-accent text-foreground font-semibold" :
                      "hover:bg-accent text-foreground"
                    )}
                  >
                    {format(day, "d")}
                    {hasBookings && !isSelected && (
                      <div className="absolute bottom-1 w-1 h-1 bg-pink-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day detail */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              {selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
            </h2>
            {selectedDay ? (
              selectedDayBookings.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayBookings.map((b) => (
                    <div key={b.id} className="bg-background border border-border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">{b.title}</p>
                        <span className={cn("text-xs px-1.5 py-0.5 rounded-full", statusColors[b.status ?? "scheduled"])}>
                          {statusLabels[b.status ?? "scheduled"]}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {format(new Date(b.startAt), "HH:mm")} - {format(new Date(b.endAt), "HH:mm")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mic className="w-3 h-3" />
                          <span className={cn("px-1.5 py-0.5 rounded-full text-xs", sessionTypeColors[b.sessionType ?? "recording"])}>
                            {sessionTypeLabels[b.sessionType ?? "recording"]}
                          </span>
                        </div>
                        {b.engineer && <div className="flex items-center gap-1.5"><User className="w-3 h-3" />{b.engineer}</div>}
                      </div>
                      {b.status === "scheduled" && (
                        <div className="flex gap-1 mt-2">
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => updateMutation.mutate({ id: b.id, status: "confirmed" })}>
                            <CheckCircle className="w-3 h-3 mr-1" />Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs text-destructive" onClick={() => updateMutation.mutate({ id: b.id, status: "cancelled" })}>
                            <XCircle className="w-3 h-3 mr-1" />Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma sessão neste dia</p>
                  <Button size="sm" className="mt-3" onClick={() => { setForm(f => ({ ...f, startAt: format(selectedDay, "yyyy-MM-dd") + "T09:00", endAt: format(selectedDay, "yyyy-MM-dd") + "T11:00" })); setCreateOpen(true); }}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Agendar
                  </Button>
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Clique em um dia para ver as sessões</p>
            )}
          </div>
        </div>

        {/* Upcoming bookings */}
        <div className="mt-6 bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Próximas Sessões</h2>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : bookings && bookings.filter(b => new Date(b.startAt) >= new Date()).length > 0 ? (
            <div className="space-y-2">
              {bookings.filter(b => new Date(b.startAt) >= new Date()).slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center gap-4 p-3 bg-background border border-border rounded-lg">
                  <div className="text-center min-w-12">
                    <p className="text-lg font-bold text-foreground">{format(new Date(b.startAt), "dd")}</p>
                    <p className="text-xs text-muted-foreground capitalize">{format(new Date(b.startAt), "MMM", { locale: ptBR })}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(b.startAt), "HH:mm")} - {format(new Date(b.endAt), "HH:mm")} · {b.studio}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", sessionTypeColors[b.sessionType ?? "recording"])}>
                    {sessionTypeLabels[b.sessionType ?? "recording"]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sessão futura agendada</p>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Nova Sessão de Estúdio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Podcast do João - Ep. 10" className="mt-1.5 bg-input border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Sessão</Label>
                <Select value={form.sessionType} onValueChange={(v) => setForm({ ...form, sessionType: v as typeof form.sessionType })}>
                  <SelectTrigger className="mt-1.5 bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(sessionTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estúdio</Label>
                <Input value={form.studio} onChange={(e) => setForm({ ...form, studio: e.target.value })} className="mt-1.5 bg-input border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início *</Label>
                <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="mt-1.5 bg-input border-border" />
              </div>
              <div>
                <Label>Fim *</Label>
                <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className="mt-1.5 bg-input border-border" />
              </div>
            </div>
            {hasConflict && conflictData?.conflictingBooking && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-400">Conflito de horário detectado</p>
                  <p className="text-red-300/80 text-xs mt-0.5">
                    Já existe a sessão <strong>{conflictData.conflictingBooking.title}</strong> agendada neste horário em {conflictData.conflictingBooking.studio ?? "Estúdio"}.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Produtor / Editor</Label>
                <Input value={form.engineer} onChange={(e) => setForm({ ...form, engineer: e.target.value })} placeholder="Nome do produtor ou editor" className="mt-1.5 bg-input border-border" />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0,00" className="mt-1.5 bg-input border-border" />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 bg-input border-border resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate({ ...form, startAt: new Date(form.startAt), endAt: new Date(form.endAt), value: form.value || undefined })} disabled={!form.title || !form.startAt || !form.endAt || createMutation.isPending}>
              {createMutation.isPending ? "Agendando..." : "Agendar Sessão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
