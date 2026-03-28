import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus, Search, FolderOpen, Calendar, DollarSign, User, Link2, Trash2, Edit2,
  Mic, BookOpen, Radio, Music, Package, MoreHorizontal, ExternalLink
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  briefing:  { label: "Briefing",    color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  recording: { label: "Gravação",    color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  editing:   { label: "Edição",      color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  review:    { label: "Revisão",     color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  published: { label: "Publicado",   color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  archived:  { label: "Arquivado",   color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  podcast:   <Mic className="w-4 h-4" />,
  audiobook: <BookOpen className="w-4 h-4" />,
  commercial:<Radio className="w-4 h-4" />,
  voiceover: <Mic className="w-4 h-4" />,
  music:     <Music className="w-4 h-4" />,
  other:     <Package className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  podcast: "Podcast", audiobook: "Audiobook", commercial: "Comercial",
  voiceover: "Locução", music: "Música", other: "Outro",
};

const EMPTY_FORM = {
  name: "", contactId: undefined as number | undefined, status: "briefing" as const,
  type: "podcast" as const, description: "", totalValue: "", notes: "",
};

export default function Projects() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editMode, setEditMode] = useState(false);

  const utils = trpc.useUtils();
  const { data: projects = [], isLoading } = trpc.projects.list.useQuery({});
  const { data: contacts = [] } = trpc.contacts.list.useQuery({});
  const { data: projectDetail } = trpc.projects.get.useQuery(
    { id: selectedProject! }, { enabled: !!selectedProject }
  );

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => { utils.projects.list.invalidate(); setShowCreate(false); setForm({ ...EMPTY_FORM }); toast.success("Projeto criado!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => { utils.projects.list.invalidate(); utils.projects.get.invalidate(); setEditMode(false); toast.success("Projeto atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => { utils.projects.list.invalidate(); setSelectedProject(null); toast.success("Projeto excluído!"); },
    onError: (e) => toast.error(e.message),
  });

  const [, navigate] = useLocation();

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const grouped = Object.keys(STATUS_CONFIG).reduce((acc, status) => {
    acc[status] = filtered.filter(p => p.status === status);
    return acc;
  }, {} as Record<string, typeof projects>);

  const contactName = (id?: number | null) => contacts.find(c => c.id === id)?.name ?? "—";

  function openCreate() { setForm({ ...EMPTY_FORM }); setShowCreate(true); }
  function handleCreate() {
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    createMutation.mutate({
      ...form,
      startDate: undefined,
      deadline: undefined,
    });
  }
  function handleUpdate() {
    if (!selectedProject) return;
    updateMutation.mutate({ id: selectedProject, ...form });
  }
  function openEdit(p: typeof projects[0]) {
    setForm({
      name: p.name,
      contactId: p.contactId ?? undefined,
      status: (p.status ?? "briefing") as typeof EMPTY_FORM.status,
      type: (p.type ?? "podcast") as typeof EMPTY_FORM.type,
      description: p.description ?? "",
      totalValue: p.totalValue ?? "",
      notes: p.notes ?? "",
    });
    setEditMode(true);
  }

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Projetos</h1>
            <p className="text-sm text-gray-400 mt-1">{projects.length} projetos no total</p>
          </div>
          <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Projeto
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar projetos..." className="pl-9 bg-gray-800 border-gray-700 text-white" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="text-gray-400 text-center py-12">Carregando projetos...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
              <div key={status} className="space-y-3">
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${cfg.bg}`}>
                  <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <span className={`text-xs font-bold ${cfg.color}`}>{grouped[status]?.length ?? 0}</span>
                </div>
                {(grouped[status] ?? []).map(p => (
                  <Card key={p.id}
                    className="bg-gray-800/60 border-gray-700 hover:border-indigo-500/50 cursor-pointer transition-all"
                    onClick={() => setSelectedProject(p.id)}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium text-white leading-tight line-clamp-2">{p.name}</p>
                        <span className="text-gray-400 flex-shrink-0 mt-0.5">
                          {TYPE_ICONS[p.type ?? "other"]}
                        </span>
                      </div>
                      {p.contactId && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <User className="w-3 h-3" /> {contactName(p.contactId)}
                        </p>
                      )}
                      {p.totalValue && (
                        <p className="text-xs text-green-400 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> R$ {parseFloat(p.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={open => { if (!open) { setSelectedProject(null); setEditMode(false); } }}>
        <SheetContent className="bg-gray-900 border-gray-700 text-white w-full sm:max-w-lg overflow-y-auto">
          {projectDetail && (
            <>
              <SheetHeader className="pb-4 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <SheetTitle className="text-white text-xl">{projectDetail.name}</SheetTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${STATUS_CONFIG[projectDetail.status ?? "briefing"]?.bg} ${STATUS_CONFIG[projectDetail.status ?? "briefing"]?.color} border`}>
                        {STATUS_CONFIG[projectDetail.status ?? "briefing"]?.label}
                      </Badge>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        {TYPE_ICONS[projectDetail.type ?? "other"]} {TYPE_LABELS[projectDetail.type ?? "other"]}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem className="text-gray-200 hover:bg-gray-700" onClick={() => openEdit(projectDetail)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-400 hover:bg-gray-700"
                        onClick={() => deleteMutation.mutate({ id: projectDetail.id })}>
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SheetHeader>

              {!editMode ? (
                <div className="py-4 space-y-4">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Cliente</p>
                      <p className="text-sm text-white font-medium">{contactName(projectDetail.contactId)}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Valor Total</p>
                      <p className="text-sm text-green-400 font-semibold">
                        {projectDetail.totalValue ? `R$ ${parseFloat(projectDetail.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Criado em</p>
                      <p className="text-sm text-white">{new Date(projectDetail.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Atualizado</p>
                      <p className="text-sm text-white">{new Date(projectDetail.updatedAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>

                  {projectDetail.description && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Descrição</p>
                      <p className="text-sm text-gray-200">{projectDetail.description}</p>
                    </div>
                  )}

                  {projectDetail.notes && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Observações</p>
                      <p className="text-sm text-gray-200">{projectDetail.notes}</p>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="space-y-2 pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Ações Rápidas</p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Status progression */}
                      {projectDetail.status !== "published" && projectDetail.status !== "archived" && (() => {
                        const order = ["briefing","recording","editing","review","published"];
                        const idx = order.indexOf(projectDetail.status ?? "briefing");
                        const next = order[idx + 1];
                        if (!next) return null;
                        return (
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                            onClick={() => updateMutation.mutate({ id: projectDetail.id, status: next as typeof EMPTY_FORM.status })}>
                            → {STATUS_CONFIG[next]?.label}
                          </Button>
                        );
                      })()}
                      {projectDetail.contactId && (
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 text-xs"
                          onClick={() => navigate(`/contacts/${projectDetail.contactId}`)}>
                          <ExternalLink className="w-3 h-3 mr-1" /> Ver Cliente
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit form */
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Nome do Projeto</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Status</Label>
                      <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as typeof EMPTY_FORM.status }))}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Tipo</Label>
                      <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as typeof EMPTY_FORM.type }))}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Cliente</Label>
                    <Select value={form.contactId?.toString() ?? "none"} onValueChange={v => setForm(f => ({ ...f, contactId: v === "none" ? undefined : parseInt(v) }))}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem cliente</SelectItem>
                        {contacts.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Valor Total (R$)</Label>
                    <Input value={form.totalValue} onChange={e => setForm(f => ({ ...f, totalValue: e.target.value }))}
                      type="number" step="0.01" className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Descrição</Label>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white resize-none" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Observações</Label>
                    <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white resize-none" rows={2} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleUpdate} disabled={updateMutation.isPending}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                      {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(false)} className="border-gray-600 text-gray-300">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-400" /> Novo Projeto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Nome do Projeto *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Podcast Episódio 42" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as typeof EMPTY_FORM.type }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Status Inicial</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as typeof EMPTY_FORM.status }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Cliente</Label>
              <Select value={form.contactId?.toString() ?? "none"} onValueChange={v => setForm(f => ({ ...f, contactId: v === "none" ? undefined : parseInt(v) }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente</SelectItem>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Valor Total (R$)</Label>
              <Input value={form.totalValue} onChange={e => setForm(f => ({ ...f, totalValue: e.target.value }))}
                type="number" step="0.01" placeholder="0,00" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descreva o projeto..." className="bg-gray-800 border-gray-700 text-white resize-none" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-gray-600 text-gray-300">Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {createMutation.isPending ? "Criando..." : "Criar Projeto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
