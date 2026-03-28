import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Calendar, Plus, Clock, User, Mic, CheckCircle, XCircle, Building2, Package, ChevronLeft, ChevronRight, DollarSign, AlertCircle, Ban } from "lucide-react";
import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const paymentStatusColors: Record<string, string> = {
  pending_payment: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  paid: "bg-green-500/20 text-green-400 border border-green-500/30",
  waived: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};
const paymentStatusLabels: Record<string, string> = {
  pending_payment: "Entrada Pendente",
  paid: "Entrada Paga",
  waived: "Dispensada",
};

export default function Studio() {
  const [createOpen, setCreateOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("all");
  const [form, setForm] = useState({
    title: "", sessionType: "recording" as const, startAt: "", endAt: "",
    studio: "Estúdio de Podcast", roomId: "" as string, engineer: "", notes: "", value: "",
    contactId: "" as string,
  });

  const utils = trpc.useUtils();
  const { data: bookings, isLoading } = trpc.studio.bookings.useQuery();
  const { data: contacts } = trpc.contacts.list.useQuery({});
  const { data: rooms = [] } = trpc.studioRooms.list.useQuery();
  const { data: equipmentList = [] } = trpc.equipment.list.useQuery({});

  const createMutation = trpc.studio.create.useMutation({
    onSuccess: () => {
      toast.success("Sessão agendada!");
      setCreateOpen(false);
      setForm({ title: "", sessionType: "recording", startAt: "", endAt: "", studio: "Estúdio de Podcast", roomId: "", engineer: "", notes: "", value: "", contactId: "" });
      utils.studio.bookings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

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

  const confirmPaymentMutation = trpc.sprintA.confirmEntryPayment.useMutation({
    onSuccess: () => { toast.success("Pagamento da entrada confirmado!"); utils.studio.bookings.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const waivePaymentMutation = trpc.sprintA.waiveEntryPayment.useMutation({
    onSuccess: () => { toast.success("Entrada dispensada."); utils.studio.bookings.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createEntryInvoiceMutation = trpc.sprintA.createEntryInvoice.useMutation({
    onSuccess: () => { toast.success("Fatura de entrada gerada!"); utils.studio.bookings.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = getDay(startOfMonth(currentMonth));

  // Filter bookings by selected room
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (selectedRoomFilter === "all") return bookings;
    if (selectedRoomFilter === "none") return bookings.filter(b => !b.roomId);
    return bookings.filter(b => String(b.roomId) === selectedRoomFilter);
  }, [bookings, selectedRoomFilter]);

  const dayBookings = (day: Date) => filteredBookings.filter(b => isSameDay(new Date(b.startAt), day));
  const selectedDayBookings = selectedDay ? dayBookings(selectedDay) : [];

  // Calendar by room view: columns = rooms, rows = days of week
  const upcomingBookings = useMemo(() =>
    filteredBookings.filter(b => new Date(b.startAt) >= new Date()).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [filteredBookings]
  );

  const getRoomColor = (roomId?: number | null) => {
    if (!roomId) return "#6366f1";
    return rooms.find(r => r.id === roomId)?.color ?? "#6366f1";
  };

  const getRoomName = (roomId?: number | null) => {
    if (!roomId) return null;
    return rooms.find(r => r.id === roomId)?.name ?? null;
  };

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

        {/* Room filter tabs */}
        {rooms.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant={selectedRoomFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRoomFilter("all")}
              className="gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5" />
              Todas as Salas
            </Button>
            {rooms.map(room => (
              <Button
                key={room.id}
                variant={selectedRoomFilter === String(room.id) ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRoomFilter(String(room.id))}
                className="gap-1.5"
                style={selectedRoomFilter === String(room.id) ? { backgroundColor: room.color ?? "#6366f1", borderColor: room.color ?? "#6366f1" } : {}}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: room.color ?? "#6366f1" }} />
                {room.name}
              </Button>
            ))}
          </div>
        )}

        <Tabs defaultValue="calendar">
          <TabsList className="mb-4">
            <TabsTrigger value="calendar" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5" />Calendário
            </TabsTrigger>
            <TabsTrigger value="rooms" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />Por Sala
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  </h2>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
                    <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
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
                    const dayBkgs = dayBookings(day);
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
                        {dayBkgs.length > 0 && !isSelected && (
                          <div className="absolute bottom-1 flex gap-0.5">
                            {dayBkgs.slice(0, 3).map((b, idx) => (
                              <div key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: getRoomColor(b.roomId) }} />
                            ))}
                          </div>
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
                      {selectedDayBookings.map((b) => {
                        const roomName = getRoomName(b.roomId);
                        const roomColor = getRoomColor(b.roomId);
                        return (
                          <div key={b.id} className="bg-background border border-border rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">{b.title}</p>
                                {roomName && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: roomColor }} />
                                    {roomName}
                                  </p>
                                )}
                              </div>
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
                            {/* Payment status badge */}
                            {(b as any).paymentStatus && (b as any).paymentStatus !== null && (
                              <div className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-2", paymentStatusColors[(b as any).paymentStatus])}>
                                {(b as any).paymentStatus === "pending_payment" && <AlertCircle className="w-3 h-3" />}
                                {(b as any).paymentStatus === "paid" && <CheckCircle className="w-3 h-3" />}
                                {(b as any).paymentStatus === "waived" && <Ban className="w-3 h-3" />}
                                {paymentStatusLabels[(b as any).paymentStatus]}
                              </div>
                            )}
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
                            {/* Payment action buttons */}
                            {(b as any).paymentStatus === "pending_payment" && b.value && (
                              <div className="flex gap-1 mt-1">
                                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-green-400 border-green-500/30 hover:bg-green-500/10"
                                  onClick={() => confirmPaymentMutation.mutate({ bookingId: b.id })}>
                                  <DollarSign className="w-3 h-3 mr-1" />Confirmar Pagto
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                                  onClick={() => waivePaymentMutation.mutate({ bookingId: b.id })}>
                                  <Ban className="w-3 h-3 mr-1" />Dispensar
                                </Button>
                              </div>
                            )}
                            {/* Generate entry invoice if has value but no paymentStatus */}
                            {!(b as any).paymentStatus && b.value && Number(b.value) > 0 && (
                              <Button size="sm" variant="outline" className="w-full h-7 text-xs mt-1 text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
                                onClick={() => createEntryInvoiceMutation.mutate({
                                  bookingId: b.id,
                                  title: b.title,
                                  value: b.value!,
                                  contactId: b.contactId ?? undefined,
                                })}>
                                <DollarSign className="w-3 h-3 mr-1" />Gerar Fatura de Entrada (50%)
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma sessão neste dia</p>
                      <Button size="sm" className="mt-3" onClick={() => {
                        setForm(f => ({ ...f, startAt: format(selectedDay, "yyyy-MM-dd") + "T09:00", endAt: format(selectedDay, "yyyy-MM-dd") + "T11:00" }));
                        setCreateOpen(true);
                      }}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />Agendar
                      </Button>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Clique em um dia para ver as sessões</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rooms">
            {/* Calendar by room: columns = rooms */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Calendário por Sala — {format(currentMonth, "MMMM yyyy", { locale: ptBR })}</h2>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {rooms.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma sala cadastrada.</p>
                  <p className="text-xs text-muted-foreground mt-1">As salas padrão serão criadas automaticamente ao acessar esta aba.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Header: room names */}
                    <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `80px repeat(${rooms.length}, 1fr)` }}>
                      <div />
                      {rooms.map(room => (
                        <div key={room.id} className="text-center p-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: `${room.color}20`, color: room.color ?? "#6366f1" }}>
                          {room.name}
                          {room.capacity && <span className="block text-xs opacity-70">{room.capacity} pessoas</span>}
                        </div>
                      ))}
                    </div>
                    {/* Days */}
                    <div className="space-y-1 max-h-[500px] overflow-y-auto">
                      {monthDays.map(day => {
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div key={day.toISOString()} className={cn("grid gap-1 items-start", isToday && "bg-accent/30 rounded-lg")} style={{ gridTemplateColumns: `80px repeat(${rooms.length}, 1fr)` }}>
                            <div className={cn("text-xs p-2 font-medium", isToday ? "text-foreground" : "text-muted-foreground")}>
                              <span className="block">{format(day, "EEE", { locale: ptBR })}</span>
                              <span className={cn("text-base font-bold", isToday && "text-primary")}>{format(day, "d")}</span>
                            </div>
                            {rooms.map(room => {
                              const roomDayBookings = (bookings ?? []).filter(b =>
                                isSameDay(new Date(b.startAt), day) && b.roomId === room.id
                              );
                              return (
                                <div key={room.id} className="min-h-[40px] p-1 rounded border border-transparent hover:border-border transition-colors">
                                  {roomDayBookings.map(b => (
                                    <div
                                      key={b.id}
                                      className="text-xs p-1 rounded mb-0.5 truncate"
                                      style={{ backgroundColor: `${room.color}20`, color: room.color ?? "#6366f1" }}
                                      title={`${b.title} — ${format(new Date(b.startAt), "HH:mm")}-${format(new Date(b.endAt), "HH:mm")}`}
                                    >
                                      <span className="font-medium">{format(new Date(b.startAt), "HH:mm")}</span> {b.title}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Upcoming bookings */}
        <div className="mt-6 bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Próximas Sessões</h2>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : upcomingBookings.length > 0 ? (
            <div className="space-y-2">
              {upcomingBookings.slice(0, 6).map((b) => {
                const roomName = getRoomName(b.roomId);
                const roomColor = getRoomColor(b.roomId);
                return (
                  <div key={b.id} className="flex items-center gap-4 p-3 bg-background border border-border rounded-lg">
                    <div className="text-center min-w-12">
                      <p className="text-lg font-bold text-foreground">{format(new Date(b.startAt), "dd")}</p>
                      <p className="text-xs text-muted-foreground capitalize">{format(new Date(b.startAt), "MMM", { locale: ptBR })}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{b.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {roomName && <><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: roomColor }} />{roomName} · </>}
                        {format(new Date(b.startAt), "HH:mm")} - {format(new Date(b.endAt), "HH:mm")}
                      </p>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", sessionTypeColors[b.sessionType ?? "recording"])}>
                      {sessionTypeLabels[b.sessionType ?? "recording"]}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sessão futura agendada</p>
          )}
        </div>
      </div>

      {/* Create Dialog */}
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
                <Label>Sala</Label>
                <Select value={form.roomId || "none"} onValueChange={(v) => setForm({ ...form, roomId: v === "none" ? "" : v })}>
                  <SelectTrigger className="mt-1.5 bg-input border-border"><SelectValue placeholder="Selecionar sala" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem sala específica</SelectItem>
                    {rooms.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: r.color ?? "#6366f1" }} />
                          {r.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    Já existe a sessão <strong>{conflictData.conflictingBooking.title}</strong> agendada neste horário.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Produtor / Editor</Label>
                <Input value={form.engineer} onChange={(e) => setForm({ ...form, engineer: e.target.value })} placeholder="Nome do produtor" className="mt-1.5 bg-input border-border" />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0,00" className="mt-1.5 bg-input border-border" />
              </div>
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={form.contactId || "none"} onValueChange={(v) => setForm({ ...form, contactId: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1.5 bg-input border-border"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente vinculado</SelectItem>
                  {(contacts ?? []).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 bg-input border-border resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({
                ...form,
                startAt: new Date(form.startAt),
                endAt: new Date(form.endAt),
                value: form.value || undefined,
                contactId: form.contactId ? Number(form.contactId) : undefined,
              })}
              disabled={!form.title || !form.startAt || !form.endAt || createMutation.isPending}
            >
              {createMutation.isPending ? "Agendando..." : "Agendar Sessão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
