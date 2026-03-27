import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Zap, Plus, DollarSign, Calendar, MoreHorizontal, Trophy, X, User, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

const statusColors = { open: "text-blue-400", won: "text-green-400", lost: "text-red-400" };

export default function Pipeline() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", stageId: "", value: "", probability: "50", notes: "", contactId: "",
  });

  const utils = trpc.useUtils();
  const { data: stages, isLoading: stagesLoading } = trpc.pipeline.stages.useQuery();
  const { data: leads, isLoading: leadsLoading } = trpc.pipeline.leads.useQuery({ status: "open" });
  const { data: contacts } = trpc.contacts.list.useQuery({});

  const createMutation = trpc.pipeline.createLead.useMutation({
    onSuccess: () => {
      toast.success("Lead criado!");
      setCreateOpen(false);
      setForm({ title: "", stageId: "", value: "", probability: "50", notes: "", contactId: "" });
      utils.pipeline.leads.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.pipeline.updateLead.useMutation({
    onSuccess: () => utils.pipeline.leads.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const leadsPerStage = (stageId: number) =>
    leads?.filter((l) => l.stageId === stageId) ?? [];

  const stageTotal = (stageId: number) =>
    leadsPerStage(stageId).reduce((sum, l) => sum + Number(l.value ?? 0), 0);

  const getContactName = (contactId: number | null | undefined) => {
    if (!contactId) return null;
    return contacts?.find(c => c.id === contactId)?.name ?? null;
  };

  return (
    <CRMLayout>
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Pipeline de Vendas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {leads?.length ?? 0} leads ativos
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Lead
          </Button>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full pb-4" style={{ minWidth: "max-content" }}>
            {stagesLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="w-72 bg-card border border-border rounded-xl animate-pulse" />
              ))
            ) : stages?.map((stage) => (
              <div key={stage.id} className="w-72 flex flex-col bg-card border border-border rounded-xl shrink-0">
                {/* Stage header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color ?? "#6366f1" }} />
                      <span className="text-sm font-semibold text-foreground">{stage.name}</span>
                      <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {leadsPerStage(stage.id).length}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    R$ {stageTotal(stage.id).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {leadsPerStage(stage.id).map((lead) => {
                    const contactName = getContactName(lead.contactId);
                    return (
                      <div key={lead.id} className="kanban-card group">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-foreground leading-tight">{lead.title}</p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all p-0.5">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: lead.id, status: "won" })}>
                                <Trophy className="w-3.5 h-3.5 mr-2 text-green-400" />
                                Marcar como Ganho
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: lead.id, status: "lost" })}>
                                <X className="w-3.5 h-3.5 mr-2 text-red-400" />
                                Marcar como Perdido
                              </DropdownMenuItem>
                              {lead.contactId && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/contacts/${lead.contactId}`}>
                                    <ExternalLink className="w-3.5 h-3.5 mr-2 text-blue-400" />
                                    Ver Perfil do Cliente
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {stages.filter(s => s.id !== stage.id).map(s => (
                                <DropdownMenuItem key={s.id} onClick={() => updateMutation.mutate({ id: lead.id, stageId: s.id })}>
                                  Mover para {s.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {contactName && (
                          <Link href={`/contacts/${lead.contactId}`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mb-1.5 w-fit">
                            <User className="w-3 h-3" />
                            <span>{contactName}</span>
                          </Link>
                        )}
                        {lead.value && (
                          <div className="flex items-center gap-1.5 text-xs text-green-400 mb-1.5">
                            <DollarSign className="w-3 h-3" />
                            <span>R$ {Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span>{lead.probability ?? 0}%</span>
                          </div>
                          {lead.expectedCloseDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(lead.expectedCloseDate), "dd/MM", { locale: ptBR })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => { setForm(f => ({ ...f, stageId: String(stage.id) })); setCreateOpen(true); }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar lead
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Lead Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Gravação de episódio - João Silva"
                className="mt-1.5 bg-input border-border"
              />
            </div>
            <div>
              <Label>Cliente / Contato</Label>
              <Select value={form.contactId} onValueChange={(v) => {
                const contact = contacts?.find(c => String(c.id) === v);
                setForm({ ...form, contactId: v, title: form.title || (contact ? `Lead - ${contact.name}` : "") });
              }}>
                <SelectTrigger className="mt-1.5 bg-input border-border">
                  <SelectValue placeholder="Selecionar contato (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem contato vinculado</SelectItem>
                  {contacts?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}{c.company ? ` — ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Vincule um contato para manter o histórico completo do cliente.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estágio</Label>
                <Select value={form.stageId} onValueChange={(v) => setForm({ ...form, stageId: v })}>
                  <SelectTrigger className="mt-1.5 bg-input border-border">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder="0,00"
                  className="mt-1.5 bg-input border-border"
                />
              </div>
            </div>
            <div>
              <Label>Probabilidade de Fechamento: {form.probability}%</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: e.target.value })}
                className="w-full mt-1.5 accent-primary"
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Informações adicionais sobre o lead..."
                className="mt-1.5 bg-input border-border resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({
                title: form.title,
                contactId: form.contactId && form.contactId !== "none" ? Number(form.contactId) : undefined,
                stageId: form.stageId ? Number(form.stageId) : undefined,
                value: form.value || undefined,
                probability: Number(form.probability),
                notes: form.notes || undefined,
              })}
              disabled={!form.title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
