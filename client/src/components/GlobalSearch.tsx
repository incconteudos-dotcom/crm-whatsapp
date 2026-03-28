import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard, MessageSquare, Users, Zap, FileText,
  DollarSign, Receipt, Calendar, CheckSquare, BarChart2,
  Package, FolderKanban, BookOpen, CreditCard, Mic,
  Settings, Building2, Wrench, UserCog, Palette, Shield,
  Search,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, group: "Navegação" },
  { label: "WhatsApp", path: "/whatsapp", icon: MessageSquare, group: "Navegação" },
  { label: "Contatos", path: "/contacts", icon: Users, group: "Navegação" },
  { label: "Pipeline de Vendas", path: "/pipeline", icon: Zap, group: "Navegação" },
  { label: "Automações", path: "/automations", icon: Zap, group: "Navegação" },
  { label: "Contratos", path: "/contracts", icon: FileText, group: "Navegação" },
  { label: "Faturas", path: "/invoices", icon: DollarSign, group: "Navegação" },
  { label: "Orçamentos", path: "/quotes", icon: Receipt, group: "Navegação" },
  { label: "Pagamentos", path: "/payments", icon: CreditCard, group: "Navegação" },
  { label: "Créditos", path: "/credits", icon: CreditCard, group: "Navegação" },
  { label: "Estúdio", path: "/studio", icon: Calendar, group: "Navegação" },
  { label: "Salas de Estúdio", path: "/studio-rooms", icon: Building2, group: "Navegação" },
  { label: "Equipamentos", path: "/equipment", icon: Wrench, group: "Navegação" },
  { label: "Tarefas", path: "/tasks", icon: CheckSquare, group: "Navegação" },
  { label: "Analytics", path: "/analytics", icon: BarChart2, group: "Navegação" },
  { label: "Podcasts", path: "/podcasts", icon: Mic, group: "Navegação" },
  { label: "Projetos", path: "/projects", icon: FolderKanban, group: "Navegação" },
  { label: "Catálogo de Produtos", path: "/products", icon: Package, group: "Navegação" },
  { label: "Modelos de Contrato", path: "/contract-templates", icon: BookOpen, group: "Navegação" },
  { label: "Rotina Diária", path: "/routine", icon: CheckSquare, group: "Navegação" },
  { label: "Configurações", path: "/settings", icon: Settings, group: "Navegação" },
  { label: "Usuários", path: "/users", icon: UserCog, group: "Navegação" },
  { label: "Portal Visual", path: "/brand-settings", icon: Palette, group: "Navegação" },
];

interface SearchResult {
  id: number;
  label: string;
  sublabel?: string;
  path: string;
  group: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();

  // Toggle with ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Live search queries — only fire when dialog is open and query has 2+ chars
  const enabled = open && query.length >= 2;

  // contacts.list accepts { search?: string }, returns array directly
  const { data: contacts } = trpc.contacts.list.useQuery(
    { search: query },
    { enabled }
  );
  // invoices.list and contracts.list take no input, return arrays
  const { data: allInvoices } = trpc.invoices.list.useQuery(
    undefined,
    { enabled }
  );
  const { data: allContracts } = trpc.contracts.list.useQuery(
    undefined,
    { enabled }
  );

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      setQuery("");
      navigate(path);
    },
    [navigate]
  );

  // Filter nav items by query
  const filteredNav = query.length >= 1
    ? NAV_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ITEMS.slice(0, 8); // show top 8 when no query

  // contacts.list returns array directly
  const contactResults: SearchResult[] = (Array.isArray(contacts) ? contacts : []).slice(0, 5).map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: c.email ?? c.phone ?? undefined,
    path: `/contacts/${c.id}`,
    group: "Contatos",
  }));

  // Filter invoices client-side by query
  const invoiceResults: SearchResult[] = (Array.isArray(allInvoices) ? allInvoices : [])
    .filter((inv) => inv.number?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map((inv) => ({
      id: inv.id,
      label: inv.number ?? `Fatura #${inv.id}`,
      sublabel: `R$ ${Number(inv.total ?? 0).toFixed(2)} · ${inv.status}`,
      path: "/invoices",
      group: "Faturas",
    }));

  // Filter contracts client-side by query
  const contractResults: SearchResult[] = (Array.isArray(allContracts) ? allContracts : [])
    .filter((c) => c.title?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      label: c.title,
      sublabel: c.status ?? undefined,
      path: "/contracts",
      group: "Contratos",
    }));

  const hasResults =
    contactResults.length > 0 ||
    invoiceResults.length > 0 ||
    contractResults.length > 0;

  return (
    <>
      {/* Trigger button shown in sidebar header area */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-lg transition-colors"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left text-xs">Buscar...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar páginas, contatos, faturas..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query.length < 2
              ? "Digite pelo menos 2 caracteres para buscar..."
              : "Nenhum resultado encontrado."}
          </CommandEmpty>

          {/* Navigation pages */}
          {filteredNav.length > 0 && (
            <CommandGroup heading="Páginas">
              {filteredNav.map((item) => (
                <CommandItem
                  key={item.path}
                  value={item.label}
                  onSelect={() => handleSelect(item.path)}
                  className="flex items-center gap-2"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Live results — only when query >= 2 chars */}
          {enabled && hasResults && <CommandSeparator />}

          {contactResults.length > 0 && (
            <CommandGroup heading="Contatos">
              {contactResults.map((r) => (
                <CommandItem
                  key={`contact-${r.id}`}
                  value={`contact-${r.id}-${r.label}`}
                  onSelect={() => handleSelect(r.path)}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    {r.sublabel && (
                      <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {invoiceResults.length > 0 && (
            <CommandGroup heading="Faturas">
              {invoiceResults.map((r) => (
                <CommandItem
                  key={`invoice-${r.id}`}
                  value={`invoice-${r.id}-${r.label}`}
                  onSelect={() => handleSelect(r.path)}
                  className="flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    {r.sublabel && (
                      <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {contractResults.length > 0 && (
            <CommandGroup heading="Contratos">
              {contractResults.map((r) => (
                <CommandItem
                  key={`contract-${r.id}`}
                  value={`contract-${r.id}-${r.label}`}
                  onSelect={() => handleSelect(r.path)}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    {r.sublabel && (
                      <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
