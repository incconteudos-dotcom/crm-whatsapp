import { useState } from "react";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, FileText, Trash2, Edit2, Eye, Copy, Star, BarChart2 } from "lucide-react";

const CATEGORIES = ["general", "podcast", "audiobook", "commercial", "voiceover", "music", "service", "nda"];
const CATEGORY_LABELS: Record<string, string> = {
  general: "Geral", podcast: "Podcast", audiobook: "Audiobook",
  commercial: "Comercial", voiceover: "Locução", music: "Música",
  service: "Prestação de Serviço", nda: "NDA / Confidencialidade",
};

const DEFAULT_TEMPLATES = [
  {
    name: "Contrato de Podcast",
    category: "podcast",
    description: "Modelo padrão para gravação de episódios de podcast",
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS — PODCAST

Entre as partes:
CONTRATANTE: {{nome_cliente}}, {{documento_cliente}}
CONTRATADO: Pátio Estúdio de Podcast

OBJETO: Gravação e produção de {{numero_episodios}} episódio(s) de podcast.

VALOR: R$ {{valor_total}} ({{valor_extenso}})
FORMA DE PAGAMENTO: {{forma_pagamento}}

DATA DE GRAVAÇÃO: {{data_gravacao}}
LOCAL: Pátio Estúdio de Podcast — {{endereco_estudio}}

ENTREGÁVEIS:
- Arquivo de áudio editado em formato MP3 (320kbps)
- Revisão de até {{numero_revisoes}} rodadas
- Entrega em até {{prazo_entrega}} dias úteis após a gravação

DIREITOS: O CONTRATANTE detém todos os direitos sobre o conteúdo gravado.
O CONTRATADO mantém o direito de divulgar a parceria como portfólio.

Assinado em {{cidade}}, {{data_assinatura}}.

_________________________________
{{nome_cliente}}
CONTRATANTE

_________________________________
Pátio Estúdio de Podcast
CONTRATADO`,
    variables: "nome_cliente,documento_cliente,numero_episodios,valor_total,valor_extenso,forma_pagamento,data_gravacao,endereco_estudio,numero_revisoes,prazo_entrega,cidade,data_assinatura",
  },
  {
    name: "Contrato de Locução",
    category: "voiceover",
    description: "Modelo para serviços de locução comercial e institucional",
    content: `CONTRATO DE LOCUÇÃO COMERCIAL

CONTRATANTE: {{nome_cliente}}
CONTRATADO: Pátio Estúdio de Podcast

OBJETO: Produção de locução para {{descricao_projeto}}.

VALOR: R$ {{valor_total}}
PRAZO DE ENTREGA: {{prazo_entrega}} dias úteis

ESPECIFICAÇÕES:
- Duração aproximada: {{duracao}} segundos
- Formato de entrega: {{formato_entrega}}
- Uso autorizado: {{uso_autorizado}}

DIREITOS DE USO: {{periodo_uso}} a partir da entrega.

{{cidade}}, {{data_assinatura}}.`,
    variables: "nome_cliente,descricao_projeto,valor_total,prazo_entrega,duracao,formato_entrega,uso_autorizado,periodo_uso,cidade,data_assinatura",
  },
  {
    name: "NDA — Confidencialidade",
    category: "nda",
    description: "Acordo de não divulgação para projetos sigilosos",
    content: `ACORDO DE CONFIDENCIALIDADE (NDA)

As partes abaixo identificadas celebram o presente Acordo de Confidencialidade:

PARTE A: {{nome_cliente}}, doravante denominado "DIVULGADOR"
PARTE B: Pátio Estúdio de Podcast, doravante denominado "RECEPTOR"

OBJETO: As partes concordam em manter sigilo absoluto sobre todas as informações
relacionadas ao projeto {{nome_projeto}}, incluindo mas não se limitando a:
conteúdo, estratégia, dados pessoais e informações comerciais.

VIGÊNCIA: {{periodo_vigencia}} a partir da assinatura.

PENALIDADE: Em caso de violação, a parte infratora estará sujeita a indenização
no valor de R$ {{valor_penalidade}}.

{{cidade}}, {{data_assinatura}}.`,
    variables: "nome_cliente,nome_projeto,periodo_vigencia,valor_penalidade,cidade,data_assinatura",
  },
];

const EMPTY_FORM = { name: "", category: "general", description: "", content: "", variables: "", isDefault: false };

export default function ContractTemplates() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.contractTemplates.list.useQuery();
  const { data: detail } = trpc.contractTemplates.get.useQuery({ id: selectedId! }, { enabled: !!selectedId });

  const createMutation = trpc.contractTemplates.create.useMutation({
    onSuccess: () => { utils.contractTemplates.list.invalidate(); setShowCreate(false); setForm({ ...EMPTY_FORM }); toast.success("Modelo criado!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.contractTemplates.update.useMutation({
    onSuccess: () => { utils.contractTemplates.list.invalidate(); utils.contractTemplates.get.invalidate(); setEditMode(false); toast.success("Modelo atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.contractTemplates.delete.useMutation({
    onSuccess: () => { utils.contractTemplates.list.invalidate(); setSelectedId(null); toast.success("Modelo excluído!"); },
    onError: (e) => toast.error(e.message),
  });

  async function seedDefaults() {
    for (const t of DEFAULT_TEMPLATES) {
      await createMutation.mutateAsync(t);
    }
    toast.success("3 modelos padrão criados!");
  }

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || t.category === categoryFilter;
    return matchSearch && matchCat;
  });

  function openEdit(t: typeof templates[0]) {
    setForm({ name: t.name, category: t.category ?? "general", description: t.description ?? "", content: t.content, variables: t.variables ?? "", isDefault: t.isDefault ?? false });
    setEditMode(true);
    setPreviewMode(false);
  }

  function copyContent(content: string) {
    navigator.clipboard.writeText(content);
    toast.success("Conteúdo copiado!");
  }

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Biblioteca de Modelos</h1>
            <p className="text-sm text-gray-400 mt-1">{templates.length} modelos de contrato</p>
          </div>
          <div className="flex gap-2">
            {templates.length === 0 && (
              <Button variant="outline" onClick={seedDefaults} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                <Star className="w-4 h-4 mr-2" /> Criar Modelos Padrão
              </Button>
            )}
            <Button onClick={() => { setForm({ ...EMPTY_FORM }); setShowCreate(true); }} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Modelo
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar modelos..." className="pl-9 bg-gray-800 border-gray-700 text-white" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-gray-400 text-center py-12">Carregando modelos...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText className="w-12 h-12 text-gray-600 mx-auto" />
            <p className="text-gray-400">Nenhum modelo encontrado</p>
            {templates.length === 0 && (
              <p className="text-sm text-gray-500">Clique em "Criar Modelos Padrão" para começar com 3 modelos prontos</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(t => (
              <Card key={t.id} className="bg-gray-800/60 border-gray-700 hover:border-indigo-500/50 cursor-pointer transition-all"
                onClick={() => setSelectedId(t.id)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <Badge className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                        {CATEGORY_LABELS[t.category ?? "general"]}
                      </Badge>
                    </div>
                    {t.isDefault && <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                  </div>
                  {t.description && <p className="text-xs text-gray-400 line-clamp-2">{t.description}</p>}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /> {t.usageCount ?? 0} usos</span>
                    <span>{t.variables ? t.variables.split(",").length : 0} variáveis</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={open => { if (!open) { setSelectedId(null); setEditMode(false); setPreviewMode(false); } }}>
        <SheetContent className="bg-gray-900 border-gray-700 text-white w-full sm:max-w-2xl overflow-y-auto">
          {detail && (
            <>
              <SheetHeader className="pb-4 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <SheetTitle className="text-white text-xl">{detail.name}</SheetTitle>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                        {CATEGORY_LABELS[detail.category ?? "general"]}
                      </Badge>
                      {detail.isDefault && <Badge className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><Star className="w-3 h-3 mr-1" />Padrão</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white"
                      onClick={() => { setPreviewMode(!previewMode); setEditMode(false); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white"
                      onClick={() => copyContent(detail.content)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white"
                      onClick={() => openEdit(detail)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300"
                      onClick={() => deleteMutation.mutate({ id: detail.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {!editMode ? (
                <div className="py-4 space-y-4">
                  {detail.description && (
                    <p className="text-sm text-gray-300">{detail.description}</p>
                  )}
                  {detail.variables && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-2 font-medium">Variáveis disponíveis</p>
                      <div className="flex flex-wrap gap-1">
                        {detail.variables.split(",").map(v => (
                          <code key={v} className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                            {`{{${v.trim()}}}`}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-2 font-medium">Conteúdo do Modelo</p>
                    <pre className="text-xs text-gray-200 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                      {detail.content}
                    </pre>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
                    <span>Usado {detail.usageCount ?? 0} vezes</span>
                    <span>Criado em {new Date(detail.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Nome do Modelo</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Categoria</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Variáveis (separadas por vírgula)</Label>
                      <Input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))}
                        placeholder="nome_cliente,valor_total,..." className="bg-gray-800 border-gray-700 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Descrição</Label>
                    <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Conteúdo do Contrato</Label>
                    <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white font-mono text-xs resize-none" rows={16} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => updateMutation.mutate({ id: detail.id, ...form })}
                      disabled={updateMutation.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                      {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(false)} className="border-gray-600 text-gray-300">Cancelar</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" /> Novo Modelo de Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Nome do Modelo *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Contrato de Podcast" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Variáveis (vírgula)</Label>
                <Input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))}
                  placeholder="nome_cliente,valor,..." className="bg-gray-800 border-gray-700 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Breve descrição do modelo" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Conteúdo do Contrato *</Label>
              <p className="text-xs text-gray-500">Use {`{{nome_variavel}}`} para campos dinâmicos</p>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Digite o conteúdo do contrato aqui..." className="bg-gray-800 border-gray-700 text-white font-mono text-xs resize-none" rows={12} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-gray-600 text-gray-300">Cancelar</Button>
            <Button onClick={() => { if (!form.name || !form.content) return toast.error("Nome e conteúdo são obrigatórios"); createMutation.mutate(form); }}
              disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {createMutation.isPending ? "Criando..." : "Criar Modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
