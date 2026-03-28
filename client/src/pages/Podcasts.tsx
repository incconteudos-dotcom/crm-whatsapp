import { useState } from "react";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Mic2, Plus, Pencil, Trash2, ExternalLink, ChevronRight, MessageSquare,
  Radio, Calendar, User, Link2, ArrowRight, MoreHorizontal, FileText, Brain, Loader2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type ProductionStatus = "roteiro" | "gravacao" | "edicao" | "revisao" | "agendado" | "publicado";

const STATUS_COLUMNS: { key: ProductionStatus; label: string; color: string; bg: string }[] = [
  { key: "roteiro",  label: "Roteiro",  color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { key: "gravacao", label: "Gravação", color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  { key: "edicao",   label: "Edição",   color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { key: "revisao",  label: "Revisão",  color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { key: "agendado", label: "Agendado", color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20" },
  { key: "publicado",label: "Publicado",color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
];

const NEXT_STATUS: Record<ProductionStatus, ProductionStatus | null> = {
  roteiro: "gravacao", gravacao: "edicao", edicao: "revisao",
  revisao: "agendado", agendado: "publicado", publicado: null,
};

const PODCAST_STATUS_LABELS: Record<string, string> = {
  active: "Ativo", paused: "Pausado", finished: "Encerrado",
};

export default function Podcasts() {
  const [selectedPodcastId, setSelectedPodcastId] = useState<number | null>(null);
  const [showPodcastDialog, setShowPodcastDialog] = useState(false);
  const [editingPodcast, setEditingPodcast] = useState<any>(null);
  const [showEpisodeDialog, setShowEpisodeDialog] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<any>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [newComment, setNewComment] = useState("");

  const [podcastForm, setPodcastForm] = useState({
    name: "", description: "", category: "", language: "pt-BR",
    publishingFrequency: "", spotifyUrl: "", youtubeUrl: "", rssUrl: "", coverUrl: "", notes: "",
  });
  const [episodeForm, setEpisodeForm] = useState({
    title: "", number: "", description: "", guestName: "", guestBio: "",
    scriptUrl: "", rawAudioUrl: "", editedAudioUrl: "", thumbnailUrl: "", publishedUrl: "", notes: "",
  });

  const utils = trpc.useUtils();
  const { data: podcasts = [] } = trpc.podcasts.list.useQuery();
  const { data: episodes = [] } = trpc.podcasts.episodes.useQuery(
    { podcastId: selectedPodcastId! },
    { enabled: !!selectedPodcastId }
  );
  const { data: comments = [] } = trpc.podcasts.comments.useQuery(
    { episodeId: selectedEpisode?.id },
    { enabled: !!selectedEpisode?.id }
  );

  const createPodcast = trpc.podcasts.create.useMutation({
    onSuccess: () => { utils.podcasts.list.invalidate(); setShowPodcastDialog(false); toast.success("Podcast criado!"); },
    onError: (e) => toast.error(e.message),
  });
  const updatePodcast = trpc.podcasts.update.useMutation({
    onSuccess: () => { utils.podcasts.list.invalidate(); setShowPodcastDialog(false); setEditingPodcast(null); toast.success("Podcast atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deletePodcast = trpc.podcasts.delete.useMutation({
    onSuccess: () => { utils.podcasts.list.invalidate(); setSelectedPodcastId(null); toast.success("Podcast removido!"); },
    onError: (e) => toast.error(e.message),
  });
  const createEpisode = trpc.podcasts.createEpisode.useMutation({
    onSuccess: () => { utils.podcasts.episodes.invalidate(); setShowEpisodeDialog(false); toast.success("Episódio criado!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateEpisode = trpc.podcasts.updateEpisode.useMutation({
    onSuccess: () => { utils.podcasts.episodes.invalidate(); utils.podcasts.getEpisode.invalidate(); toast.success("Episódio atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteEpisode = trpc.podcasts.deleteEpisode.useMutation({
    onSuccess: () => { utils.podcasts.episodes.invalidate(); setSelectedEpisode(null); toast.success("Episódio removido!"); },
    onError: (e) => toast.error(e.message),
  });
  const addComment = trpc.podcasts.addComment.useMutation({
    onSuccess: () => { utils.podcasts.comments.invalidate(); setNewComment(""); },
    onError: (e) => toast.error(e.message),
  });

  const [showBriefingDialog, setShowBriefingDialog] = useState(false);
  const [briefingContent, setBriefingContent] = useState("");

  const generateBriefing = trpc.sprintD.generateEpisodeBriefing.useMutation({
    onSuccess: (data) => {
      setBriefingContent(data.briefing);
      setShowBriefingDialog(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedPodcast = podcasts.find(p => p.id === selectedPodcastId);

  function openCreatePodcast() {
    setEditingPodcast(null);
    setPodcastForm({ name: "", description: "", category: "", language: "pt-BR", publishingFrequency: "", spotifyUrl: "", youtubeUrl: "", rssUrl: "", coverUrl: "", notes: "" });
    setShowPodcastDialog(true);
  }
  function openEditPodcast(p: any) {
    setEditingPodcast(p);
    setPodcastForm({ name: p.name, description: p.description ?? "", category: p.category ?? "", language: p.language ?? "pt-BR", publishingFrequency: p.publishingFrequency ?? "", spotifyUrl: p.spotifyUrl ?? "", youtubeUrl: p.youtubeUrl ?? "", rssUrl: p.rssUrl ?? "", coverUrl: p.coverUrl ?? "", notes: p.notes ?? "" });
    setShowPodcastDialog(true);
  }
  function submitPodcast() {
    if (!podcastForm.name.trim()) return;
    if (editingPodcast) updatePodcast.mutate({ id: editingPodcast.id, ...podcastForm });
    else createPodcast.mutate(podcastForm);
  }

  function openCreateEpisode() {
    setEditingEpisode(null);
    setEpisodeForm({ title: "", number: "", description: "", guestName: "", guestBio: "", scriptUrl: "", rawAudioUrl: "", editedAudioUrl: "", thumbnailUrl: "", publishedUrl: "", notes: "" });
    setShowEpisodeDialog(true);
  }
  function openEditEpisode(ep: any) {
    setEditingEpisode(ep);
    setEpisodeForm({ title: ep.title, number: ep.number?.toString() ?? "", description: ep.description ?? "", guestName: ep.guestName ?? "", guestBio: ep.guestBio ?? "", scriptUrl: ep.scriptUrl ?? "", rawAudioUrl: ep.rawAudioUrl ?? "", editedAudioUrl: ep.editedAudioUrl ?? "", thumbnailUrl: ep.thumbnailUrl ?? "", publishedUrl: ep.publishedUrl ?? "", notes: ep.notes ?? "" });
    setShowEpisodeDialog(true);
  }
  function submitEpisode() {
    if (!episodeForm.title.trim() || !selectedPodcastId) return;
    const payload = { ...episodeForm, number: episodeForm.number ? parseInt(episodeForm.number) : undefined, podcastId: selectedPodcastId };
    if (editingEpisode) updateEpisode.mutate({ id: editingEpisode.id, ...payload });
    else createEpisode.mutate(payload);
  }

  function advanceStatus(ep: any) {
    const next = NEXT_STATUS[ep.productionStatus as ProductionStatus];
    if (!next) return;
    updateEpisode.mutate({ id: ep.id, productionStatus: next });
    if (selectedEpisode?.id === ep.id) setSelectedEpisode({ ...selectedEpisode, productionStatus: next });
  }

  return (
    <CRMLayout>
      <div className="flex h-full gap-0">
        {/* Sidebar de podcasts */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Podcasts</h2>
            </div>
            <Button size="sm" onClick={openCreatePodcast}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {podcasts.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Radio className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Nenhum podcast</p>
                <p className="text-xs">Crie seu primeiro programa</p>
              </div>
            )}
            {podcasts.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPodcastId(p.id)}
                className={`w-full text-left rounded-lg p-3 transition-colors ${selectedPodcastId === p.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    {p.category && <p className="text-xs text-muted-foreground truncate">{p.category}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {PODCAST_STATUS_LABELS[p.status ?? "active"]}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Área principal */}
        {!selectedPodcast ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mic2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Selecione um podcast</p>
              <p className="text-sm">ou crie um novo programa</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header do podcast */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{selectedPodcast.name}</h1>
                {selectedPodcast.description && (
                  <p className="text-sm text-muted-foreground">{selectedPodcast.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedPodcast.spotifyUrl && (
                  <a href={selectedPodcast.spotifyUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4 mr-1" />Spotify</Button>
                  </a>
                )}
                {selectedPodcast.youtubeUrl && (
                  <a href={selectedPodcast.youtubeUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4 mr-1" />YouTube</Button>
                  </a>
                )}
                <Button variant="outline" size="sm" onClick={() => openEditPodcast(selectedPodcast)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => {
                  if (confirm("Remover este podcast e todos os episódios?")) deletePodcast.mutate({ id: selectedPodcast.id });
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={openCreateEpisode}>
                  <Plus className="h-4 w-4 mr-1" />Episódio
                </Button>
              </div>
            </div>

            {/* Kanban de episódios */}
            <div className="flex-1 overflow-x-auto p-4">
              <div className="flex gap-3 h-full min-w-max">
                {STATUS_COLUMNS.map(col => {
                  const colEpisodes = episodes.filter(ep => ep.productionStatus === col.key);
                  return (
                    <div key={col.key} className={`w-60 shrink-0 rounded-lg border ${col.bg} flex flex-col`}>
                      <div className={`p-3 border-b border-inherit flex items-center justify-between`}>
                        <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                        <Badge variant="outline" className="text-xs">{colEpisodes.length}</Badge>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {colEpisodes.map(ep => (
                          <Card
                            key={ep.id}
                            className="cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => setSelectedEpisode(ep)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0">
                                  {ep.number && <span className="text-xs text-muted-foreground">Ep. {ep.number} · </span>}
                                  <span className="text-sm font-medium">{ep.title}</span>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={e => { e.stopPropagation(); openEditEpisode(ep); }}>
                                      <Pencil className="h-4 w-4 mr-2" />Editar
                                    </DropdownMenuItem>
                                    {NEXT_STATUS[ep.productionStatus as ProductionStatus] && (
                                      <DropdownMenuItem onClick={e => { e.stopPropagation(); advanceStatus(ep); }}>
                                        <ArrowRight className="h-4 w-4 mr-2" />
                                        Avançar para {STATUS_COLUMNS.find(c => c.key === NEXT_STATUS[ep.productionStatus as ProductionStatus])?.label}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={e => { e.stopPropagation(); if (confirm("Remover episódio?")) deleteEpisode.mutate({ id: ep.id }); }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />Remover
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              {ep.guestName && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <User className="h-3 w-3" />{ep.guestName}
                                </p>
                              )}
                              {ep.recordingDate && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(ep.recordingDate).toLocaleDateString("pt-BR")}
                                </p>
                              )}
                              <div className="flex gap-1 mt-2">
                                {ep.scriptUrl && <Link2 className="h-3 w-3 text-muted-foreground" />}
                                {ep.rawAudioUrl && <Mic2 className="h-3 w-3 text-muted-foreground" />}
                                {ep.editedAudioUrl && <FileText className="h-3 w-3 text-muted-foreground" />}
                                {ep.publishedUrl && <ExternalLink className="h-3 w-3 text-green-400" />}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sheet de detalhes do episódio */}
      <Sheet open={!!selectedEpisode} onOpenChange={open => !open && setSelectedEpisode(null)}>
        <SheetContent className="w-[480px] overflow-y-auto">
          {selectedEpisode && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Mic2 className="h-5 w-5 text-primary" />
                  {selectedEpisode.number ? `Ep. ${selectedEpisode.number} — ` : ""}{selectedEpisode.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLUMNS.find(c => c.key === selectedEpisode.productionStatus)?.color}>
                    {STATUS_COLUMNS.find(c => c.key === selectedEpisode.productionStatus)?.label}
                  </Badge>
                  {NEXT_STATUS[selectedEpisode.productionStatus as ProductionStatus] && (
                    <Button size="sm" variant="outline" onClick={() => advanceStatus(selectedEpisode)}>
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Avançar para {STATUS_COLUMNS.find(c => c.key === NEXT_STATUS[selectedEpisode.productionStatus as ProductionStatus])?.label}
                    </Button>
                  )}
                </div>

                {/* Informações */}
                {selectedEpisode.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Descrição</p>
                    <p className="text-sm text-muted-foreground">{selectedEpisode.description}</p>
                  </div>
                )}
                {selectedEpisode.guestName && (
                  <div>
                    <p className="text-sm font-medium mb-1 flex items-center gap-1"><User className="h-4 w-4" />Convidado</p>
                    <p className="text-sm">{selectedEpisode.guestName}</p>
                    {selectedEpisode.guestBio && <p className="text-xs text-muted-foreground mt-1">{selectedEpisode.guestBio}</p>}
                  </div>
                )}

                {/* Datas */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedEpisode.recordingDate && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Gravação</p>
                      <p className="text-sm font-medium">{new Date(selectedEpisode.recordingDate).toLocaleDateString("pt-BR")}</p>
                    </div>
                  )}
                  {selectedEpisode.publishDate && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Publicação</p>
                      <p className="text-sm font-medium">{new Date(selectedEpisode.publishDate).toLocaleDateString("pt-BR")}</p>
                    </div>
                  )}
                </div>

                {/* Links do Drive */}
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1"><Link2 className="h-4 w-4" />Links</p>
                  <div className="space-y-2">
                    {[
                      { label: "Roteiro", url: selectedEpisode.scriptUrl },
                      { label: "Áudio Bruto", url: selectedEpisode.rawAudioUrl },
                      { label: "Áudio Editado", url: selectedEpisode.editedAudioUrl },
                      { label: "Thumbnail", url: selectedEpisode.thumbnailUrl },
                      { label: "Publicado", url: selectedEpisode.publishedUrl },
                    ].filter(l => l.url).map(l => (
                      <a key={l.label} href={l.url!} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" />{l.label}
                      </a>
                    ))}
                    {!selectedEpisode.scriptUrl && !selectedEpisode.rawAudioUrl && !selectedEpisode.editedAudioUrl && !selectedEpisode.publishedUrl && (
                      <p className="text-xs text-muted-foreground">Nenhum link adicionado</p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="default"
                    className="w-full gap-2"
                    disabled={generateBriefing.isPending}
                    onClick={() => {
                      if (!selectedPodcast) return;
                      generateBriefing.mutate({
                        episodeId: selectedEpisode.id,
                        podcastName: selectedPodcast.name,
                        episodeTitle: selectedEpisode.title,
                        episodeDescription: selectedEpisode.description ?? undefined,
                        guestName: selectedEpisode.guestName ?? undefined,
                        topics: selectedEpisode.notes ?? undefined,
                      });
                    }}
                  >
                    {generateBriefing.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                    Gerar Briefing IA
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { openEditEpisode(selectedEpisode); setSelectedEpisode(null); }}>
                      <Pencil className="h-4 w-4 mr-2" />Editar
                    </Button>
                    <Button variant="outline" className="text-destructive" onClick={() => {
                      if (confirm("Remover este episódio?")) deleteEpisode.mutate({ id: selectedEpisode.id });
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Comentários */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium mb-3 flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />Comentários ({comments.length})
                  </p>
                  <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                    {comments.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhum comentário ainda</p>
                    )}
                    {comments.map(c => (
                      <div key={c.id} className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm">{c.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(c.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar comentário..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newComment.trim()) {
                          addComment.mutate({ episodeId: selectedEpisode.id, content: newComment });
                        }
                      }}
                    />
                    <Button size="sm" onClick={() => {
                      if (newComment.trim()) addComment.mutate({ episodeId: selectedEpisode.id, content: newComment });
                    }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de podcast */}
      <Dialog open={showPodcastDialog} onOpenChange={setShowPodcastDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPodcast ? "Editar Podcast" : "Novo Podcast"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome do Programa *</Label>
                <Input value={podcastForm.name} onChange={e => setPodcastForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Tech Talks Brasil" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={podcastForm.category} onChange={e => setPodcastForm(f => ({ ...f, category: e.target.value }))} placeholder="Tecnologia, Negócios..." />
              </div>
              <div>
                <Label>Frequência</Label>
                <Select value={podcastForm.publishingFrequency} onValueChange={v => setPodcastForm(f => ({ ...f, publishingFrequency: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="irregular">Irregular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>URL Spotify</Label>
                <Input value={podcastForm.spotifyUrl} onChange={e => setPodcastForm(f => ({ ...f, spotifyUrl: e.target.value }))} placeholder="https://open.spotify.com/..." />
              </div>
              <div>
                <Label>URL YouTube</Label>
                <Input value={podcastForm.youtubeUrl} onChange={e => setPodcastForm(f => ({ ...f, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/..." />
              </div>
              <div className="col-span-2">
                <Label>RSS Feed</Label>
                <Input value={podcastForm.rssUrl} onChange={e => setPodcastForm(f => ({ ...f, rssUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea value={podcastForm.description} onChange={e => setPodcastForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPodcastDialog(false)}>Cancelar</Button>
            <Button onClick={submitPodcast} disabled={createPodcast.isPending || updatePodcast.isPending}>
              {editingPodcast ? "Salvar" : "Criar Podcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de episódio */}
      <Dialog open={showEpisodeDialog} onOpenChange={setShowEpisodeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEpisode ? "Editar Episódio" : "Novo Episódio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input value={episodeForm.title} onChange={e => setEpisodeForm(f => ({ ...f, title: e.target.value }))} placeholder="Título do episódio" />
              </div>
              <div>
                <Label>Número</Label>
                <Input type="number" value={episodeForm.number} onChange={e => setEpisodeForm(f => ({ ...f, number: e.target.value }))} placeholder="Ex: 42" />
              </div>
              <div>
                <Label>Convidado</Label>
                <Input value={episodeForm.guestName} onChange={e => setEpisodeForm(f => ({ ...f, guestName: e.target.value }))} placeholder="Nome do convidado" />
              </div>
              <div className="col-span-2">
                <Label>Bio do Convidado</Label>
                <Textarea value={episodeForm.guestBio} onChange={e => setEpisodeForm(f => ({ ...f, guestBio: e.target.value }))} rows={2} placeholder="Breve apresentação..." />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea value={episodeForm.description} onChange={e => setEpisodeForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="col-span-2 border-t border-border pt-3">
                <p className="text-sm font-medium mb-2 text-muted-foreground">Links do Drive (sem upload)</p>
              </div>
              <div className="col-span-2">
                <Label>Link do Roteiro</Label>
                <Input value={episodeForm.scriptUrl} onChange={e => setEpisodeForm(f => ({ ...f, scriptUrl: e.target.value }))} placeholder="https://drive.google.com/..." />
              </div>
              <div>
                <Label>Áudio Bruto</Label>
                <Input value={episodeForm.rawAudioUrl} onChange={e => setEpisodeForm(f => ({ ...f, rawAudioUrl: e.target.value }))} placeholder="Link do Drive..." />
              </div>
              <div>
                <Label>Áudio Editado</Label>
                <Input value={episodeForm.editedAudioUrl} onChange={e => setEpisodeForm(f => ({ ...f, editedAudioUrl: e.target.value }))} placeholder="Link do Drive..." />
              </div>
              <div>
                <Label>Thumbnail</Label>
                <Input value={episodeForm.thumbnailUrl} onChange={e => setEpisodeForm(f => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="Link da imagem..." />
              </div>
              <div>
                <Label>Link Publicado</Label>
                <Input value={episodeForm.publishedUrl} onChange={e => setEpisodeForm(f => ({ ...f, publishedUrl: e.target.value }))} placeholder="Spotify, YouTube..." />
              </div>
              <div className="col-span-2">
                <Label>Notas internas</Label>
                <Textarea value={episodeForm.notes} onChange={e => setEpisodeForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEpisodeDialog(false)}>Cancelar</Button>
            <Button onClick={submitEpisode} disabled={createEpisode.isPending || updateEpisode.isPending}>
              {editingEpisode ? "Salvar" : "Criar Episódio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog de Briefing IA */}
      <Dialog open={showBriefingDialog} onOpenChange={setShowBriefingDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Briefing do Episódio
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed bg-muted/30 p-4 rounded-lg">{briefingContent}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(briefingContent);
              toast.success("Briefing copiado!");
            }}>Copiar</Button>
            <Button onClick={() => setShowBriefingDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
