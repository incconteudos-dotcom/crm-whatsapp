import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DownloadCloud, Users, Zap, FileText, Receipt, BookOpen,
  Calendar, Package, FolderOpen, Mic2, CheckSquare, Loader2,
  Database, Clock
} from "lucide-react";
import { format } from "date-fns";
import Papa from "papaparse";
import { cn } from "@/lib/utils";

type ExportModule = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
};

const MODULES: ExportModule[] = [
  { id: "contacts", label: "Contatos", description: "Nome, email, telefone, empresa, tags", icon: Users, color: "text-blue-400" },
  { id: "leads", label: "Pipeline / Leads", description: "Título, etapa, valor, probabilidade, status", icon: Zap, color: "text-yellow-400" },
  { id: "contracts", label: "Contratos", description: "Número, cliente, valor, status, datas", icon: FileText, color: "text-purple-400" },
  { id: "invoices", label: "Faturas", description: "Número, cliente, valor, status, vencimento", icon: Receipt, color: "text-green-400" },
  { id: "quotes", label: "Orçamentos", description: "Número, cliente, valor, status, validade", icon: BookOpen, color: "text-cyan-400" },
  { id: "studio", label: "Sessões de Estúdio", description: "Data, cliente, tipo, duração, valor", icon: Calendar, color: "text-orange-400" },
  { id: "products", label: "Catálogo de Produtos", description: "Nome, categoria, preço, descrição", icon: Package, color: "text-pink-400" },
  { id: "projects", label: "Projetos", description: "Nome, cliente, status, datas, valor", icon: FolderOpen, color: "text-indigo-400" },
  { id: "podcasts", label: "Podcasts / Episódios", description: "Título, episódio, status, data de publicação", icon: Mic2, color: "text-rose-400" },
  { id: "tasks", label: "Tarefas", description: "Título, status, prioridade, responsável", icon: CheckSquare, color: "text-teal-400" },
  { id: "time_entries", label: "Controle de Horas", description: "Descrição, cliente, projeto, minutos, faturável", icon: Clock, color: "text-amber-400" },
];

export default function ExportData() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Queries (all lazy, only fetched when needed)
  const { data: contacts } = trpc.contacts.list.useQuery({});
  const { data: openLeads } = trpc.pipeline.leads.useQuery({ status: "open" });
  const { data: wonLeads } = trpc.pipeline.leads.useQuery({ status: "won" });
  const { data: lostLeads } = trpc.pipeline.leads.useQuery({ status: "lost" });
  const { data: contracts } = trpc.contracts.list.useQuery(undefined);
  const { data: invoices } = trpc.invoices.list.useQuery(undefined);
  const { data: quotes } = trpc.quotes.list.useQuery(undefined);
  const { data: studio } = trpc.studio.bookings.useQuery();
  const { data: products } = trpc.products.list.useQuery({});
  const { data: projects } = trpc.projects.list.useQuery({});
  const { data: tasks } = trpc.tasks.list.useQuery({});
  const { data: timeEntries } = trpc.sprintE.getTimeEntries.useQuery({});

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(MODULES.map(m => m.id)));
  const clearAll = () => setSelected(new Set());

  const downloadCSV = (filename: string, rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return;
    const csv = Papa.unparse(rows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (selected.size === 0) { toast.error("Selecione ao menos um módulo para exportar"); return; }
    setExporting(true);
    const date = format(new Date(), "yyyyMMdd");
    let count = 0;

    try {
      if (selected.has("contacts") && contacts) {
        downloadCSV(`contatos_${date}.csv`, contacts.map(c => ({
          ID: c.id, Nome: c.name, Email: c.email ?? "", Telefone: c.phone ?? "",
          Empresa: c.company ?? "", Cargo: c.position ?? "",
          Criado: format(new Date(c.createdAt), "dd/MM/yyyy"),
        })));
        count++;
      }

      if (selected.has("leads")) {
        const allLeads = [...(openLeads ?? []), ...(wonLeads ?? []), ...(lostLeads ?? [])];
        downloadCSV(`leads_${date}.csv`, allLeads.map(l => ({
          ID: l.id, Título: l.title, Status: l.status,
          Valor: l.value ?? "", Probabilidade: l.probability ?? "",
          Criado: format(new Date(l.createdAt), "dd/MM/yyyy"),
        })));
        count++;
      }

      if (selected.has("contracts") && contracts) {
        downloadCSV(`contratos_${date}.csv`, contracts.map(c => ({
          ID: c.id, Título: c.title,
          Valor: c.value ?? "", Status: c.status,
          Criado: format(new Date(c.createdAt), "dd/MM/yyyy"),
        })));
        count++;
      }

      if (selected.has("invoices") && invoices) {
        downloadCSV(`faturas_${date}.csv`, invoices.map(i => ({
          ID: i.id, Número: i.number ?? "", Contato: i.contactName ?? "",
          Valor: i.total ?? "", Status: i.status,
          Vencimento: i.dueDate ? format(new Date(i.dueDate), "dd/MM/yyyy") : "",
        })));
        count++;
      }

      if (selected.has("quotes") && quotes) {
        downloadCSV(`orcamentos_${date}.csv`, quotes.map(q => ({
          ID: q.id, Número: q.number ?? "", Contato: q.contactName ?? "",
          Valor: q.total ?? "", Status: q.status,
          Validade: q.validUntil ? format(new Date(q.validUntil), "dd/MM/yyyy") : "",
        })));
        count++;
      }

      if (selected.has("studio") && studio) {
        downloadCSV(`sessoes_${date}.csv`, studio.map(s => ({
          ID: s.id, Título: s.title, Tipo: s.sessionType, Status: s.status,
          Início: format(new Date(s.startAt), "dd/MM/yyyy HH:mm"),
          Valor: s.value ?? "",
        })));
        count++;
      }

      if (selected.has("products") && products) {
        downloadCSV(`produtos_${date}.csv`, products.map(p => ({
          ID: p.id, Nome: p.name, Categoria: p.category ?? "",
          Preço: p.unitPrice ?? "", Descrição: p.description ?? "",
        })));
        count++;
      }

      if (selected.has("projects") && projects) {
        downloadCSV(`projetos_${date}.csv`, projects.map(p => ({
          ID: p.id, Nome: p.name, Status: p.status,
          Início: p.startDate ? format(new Date(p.startDate), "dd/MM/yyyy") : "",
          Prazo: p.deadline ? format(new Date(p.deadline), "dd/MM/yyyy") : "",
          Valor: p.totalValue ?? "",
        })));
        count++;
      }

      if (selected.has("tasks") && tasks) {
        downloadCSV(`tarefas_${date}.csv`, tasks.map(t => ({
          ID: t.id, Título: t.title, Status: t.status,
          Prioridade: t.priority ?? "", Vencimento: t.dueDate ? format(new Date(t.dueDate), "dd/MM/yyyy") : "",
        })));
        count++;
      }

      if (selected.has("time_entries") && timeEntries) {
        downloadCSV(`horas_${date}.csv`, timeEntries.map((e: { id: number; description: string; minutes: number; billable: boolean | null; date: Date }) => ({
          ID: e.id, Descrição: e.description, Minutos: e.minutes,
          Horas: (e.minutes / 60).toFixed(2), Faturável: e.billable ? "Sim" : "Não",
          Data: format(new Date(e.date), "dd/MM/yyyy"),
        })));
        count++;
      }

      toast.success(`${count} arquivo${count !== 1 ? "s" : ""} exportado${count !== 1 ? "s" : ""} com sucesso!`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <CRMLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <DownloadCloud className="w-6 h-6 text-primary" /> Exportar Dados
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Exporte os dados de qualquer módulo em formato CSV</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">Selecionar tudo</Button>
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground">Limpar</Button>
          </div>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {MODULES.map(mod => (
            <div
              key={mod.id}
              onClick={() => toggle(mod.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                selected.has(mod.id)
                  ? "bg-primary/10 border-primary/40 shadow-sm"
                  : "bg-card border-border hover:border-border/80 hover:bg-muted/20"
              )}
            >
              <Checkbox
                checked={selected.has(mod.id)}
                onCheckedChange={() => toggle(mod.id)}
                onClick={e => e.stopPropagation()}
                className="shrink-0"
              />
              <mod.icon className={cn("w-5 h-5 shrink-0", mod.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{mod.label}</p>
                <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
              </div>
              {selected.has(mod.id) && (
                <Badge variant="outline" className="text-primary border-primary/40 text-xs shrink-0">CSV</Badge>
              )}
            </div>
          ))}
        </div>

        {/* Export button */}
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {selected.size === 0
                  ? "Nenhum módulo selecionado"
                  : `${selected.size} módulo${selected.size !== 1 ? "s" : ""} selecionado${selected.size !== 1 ? "s" : ""}`
                }
              </p>
              <p className="text-xs text-muted-foreground">Cada módulo gera um arquivo CSV separado</p>
            </div>
          </div>
          <Button
            onClick={handleExport}
            disabled={selected.size === 0 || exporting}
            className="gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
            Exportar {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Os arquivos são gerados com codificação UTF-8 BOM para compatibilidade com Excel e Google Sheets.
        </p>
      </div>
    </CRMLayout>
  );
}
