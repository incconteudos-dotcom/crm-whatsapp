/**
 * QuickMessageBar
 *
 * Shows filterable message templates by pipeline stage.
 * Clicking a template renders it with contact context and sends directly
 * or populates the text input for editing before sending.
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Zap, Search, ChevronDown, ChevronUp, Send, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  primeiro_contato: "🔍 Primeiro Contato",
  qualificacao: "🎯 Qualificação",
  proposta: "📋 Proposta",
  follow_up: "🔄 Follow-up",
  fechamento: "💰 Fechamento",
  onboarding: "🚀 Onboarding",
  retencao: "♻️ Retenção",
  cobranca: "💳 Cobrança",
  nps: "⭐ NPS",
  geral: "💬 Geral",
};

interface QuickMessageBarProps {
  chatJid: string;
  contactId?: number;
  leadId?: number;
  onPopulateInput: (text: string) => void;
  onSendDirect: (templateId: number) => void;
  sending: boolean;
  expanded: boolean;
  onToggle: () => void;
}

export function QuickMessageBar({
  chatJid,
  contactId,
  leadId,
  onPopulateInput,
  onSendDirect,
  sending,
  expanded,
  onToggle,
}: QuickMessageBarProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null);

  const { data: templates = [] } = trpc.whatsapp.templates.useQuery({ category: undefined });
  const previewMutation = trpc.whatsapp.previewTemplate.useMutation({
    onSuccess: (d) => {
      setPreviewContent(d.rendered);
      setPreviewOpen(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return ["all", ...Array.from(cats)];
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchCat = activeCategory === "all" || t.category === activeCategory;
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [templates, activeCategory, search]);

  if (!expanded) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
        title="Mensagens rápidas"
      >
        <Zap className="w-3.5 h-3.5 text-yellow-500" />
        <span>Templates</span>
        <ChevronUp className="w-3 h-3" />
      </button>
    );
  }

  return (
    <>
      <div className="border-t border-border bg-card/50 p-2 space-y-2 max-h-72 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-medium text-foreground">Templates Rápidos</span>
            <Badge variant="secondary" className="text-xs px-1 py-0">{filtered.length}</Badge>
          </div>
          <button onClick={onToggle} className="p-0.5 rounded hover:bg-muted text-muted-foreground">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search + category filter */}
        <div className="flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar template..."
              className="pl-6 h-7 text-xs"
            />
          </div>
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "Todas categorias" : CATEGORY_LABELS[c] ?? c}
              </option>
            ))}
          </select>
        </div>

        {/* Template list */}
        <div className="overflow-y-auto space-y-1 flex-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum template encontrado.
            </p>
          ) : (
            filtered.map((tmpl) => (
              <div
                key={tmpl.id}
                className="group flex items-start gap-2 p-2 rounded-lg border border-border/50 hover:border-green-500/40 hover:bg-muted/40 transition-all cursor-default"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium text-foreground truncate">{tmpl.name}</span>
                    <Badge variant="outline" className="text-xs px-1 py-0 shrink-0 hidden sm:flex">
                      {CATEGORY_LABELS[tmpl.category] ?? tmpl.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.content}</p>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setPreviewTemplateId(tmpl.id);
                      previewMutation.mutate({
                        content: tmpl.content,
                        contactId,
                        leadId,
                      });
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Pré-visualizar"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onPopulateInput(tmpl.content)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-green-500"
                    title="Editar antes de enviar"
                  >
                    <span className="text-xs">✏️</span>
                  </button>
                  <button
                    onClick={() => onSendDirect(tmpl.id)}
                    disabled={sending}
                    className="p-1 rounded hover:bg-green-600/20 text-green-600 hover:text-green-500 disabled:opacity-50"
                    title="Enviar direto"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pré-visualização</DialogTitle>
          </DialogHeader>
          <div className="bg-green-600/10 border border-green-600/20 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap">
            {previewContent}
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => { onPopulateInput(previewContent); setPreviewOpen(false); }}>
              ✏️ Editar
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={sending || previewTemplateId === null}
              onClick={() => {
                if (previewTemplateId !== null) {
                  onSendDirect(previewTemplateId);
                  setPreviewOpen(false);
                }
              }}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
