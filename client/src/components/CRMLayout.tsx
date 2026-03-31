import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/GlobalSearch";
import NotificationBell from "@/components/NotificationBell";
import { useTheme } from "@/contexts/ThemeContext";
import {
  BarChart3, BookOpen, Calendar, CheckSquare, ChevronLeft, ChevronRight,
  ChevronDown, CreditCard, FileText, FolderOpen, Home, Library, LogOut,
  MessageSquare, Package, Receipt, Settings, Shield, Users, Wallet, Zap,
  ClipboardList, Mic2, Palette, Wrench, Building2, Menu, X, Circle,
  Layers, DollarSign, Briefcase, Cog, Target, Brain, Clock, DownloadCloud,
  Sun, Moon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// ─── Navigation Groups ────────────────────────────────────────────────────────
const navGroups = [
  {
    id: "main",
    label: null, // no header for first group
    items: [
      { icon: Home, label: "Dashboard", path: "/dashboard" },
    ],
  },
  {
    id: "comercial",
    label: "Comercial",
    icon: MessageSquare,
    items: [
      { icon: MessageSquare, label: "WhatsApp", path: "/whatsapp", badge: "whatsapp", adminOnly: true },
      { icon: Brain, label: "Análise IA", path: "/whatsapp-analysis", adminOnly: true },
      { icon: Users, label: "Contatos", path: "/contacts" },
      { icon: Zap, label: "Pipeline", path: "/pipeline" },
      { icon: Zap, label: "Automações", path: "/automations" },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    items: [
      { icon: Receipt, label: "Faturas", path: "/invoices" },
      { icon: BookOpen, label: "Orçamentos", path: "/quotes" },
      { icon: CreditCard, label: "Pagamentos", path: "/payments" },
      { icon: Wallet, label: "Créditos", path: "/credits" },
    ],
  },
  {
    id: "producao",
    label: "Produção",
    icon: Calendar,
    items: [
      { icon: Calendar, label: "Estúdio", path: "/studio" },
      { icon: Building2, label: "Salas", path: "/studio-rooms" },
      { icon: Wrench, label: "Equipamentos", path: "/equipment" },
      { icon: Mic2, label: "Podcasts", path: "/podcasts" },
      { icon: FolderOpen, label: "Projetos", path: "/projects" },
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    icon: FileText,
    items: [
      { icon: FileText, label: "Contratos", path: "/contracts" },
      { icon: Library, label: "Modelos", path: "/contract-templates" },
      { icon: Package, label: "Catálogo", path: "/products" },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    icon: Briefcase,
    items: [
      { icon: CheckSquare, label: "Tarefas", path: "/tasks" },
      { icon: Clock, label: "Controle de Horas", path: "/time-tracking" },
      { icon: ClipboardList, label: "Rotina Diária", path: "/routine" },
      { icon: Target, label: "Theory of Constraints", path: "/toc" },
      { icon: BarChart3, label: "Analytics", path: "/analytics" },
      { icon: DownloadCloud, label: "Exportar Dados", path: "/export" },
      { icon: Zap, label: "Playbook de Automações", path: "/playbook" },
    ],
  },
];

const adminItems = [
  { icon: Shield, label: "Usuários", path: "/users" },
  { icon: Palette, label: "Portal Visual", path: "/brand-settings" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

const roleBadgeColors: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  gerente: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  analista: "bg-green-500/20 text-green-300 border-green-500/30",
  assistente: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};
const roleLabels: Record<string, string> = {
  admin: "Admin", gerente: "Gerente", analista: "Analista", assistente: "Assistente",
};

// ─── NavItem Component ────────────────────────────────────────────────────────
function NavItem({
  item, active, collapsed, badge,
}: {
  item: { icon: React.ElementType; label: string; path: string };
  active: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={item.path}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative group",
        active
          ? "bg-primary/15 text-primary font-medium"
          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.label : undefined}
    >
      <div className="relative shrink-0">
        <item.icon className={cn("w-4 h-4 shrink-0", active && "text-primary")} />
        {badge != null && badge > 0 && collapsed && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {badge != null && badge > 0 && (
            <span className="min-w-[20px] h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 leading-none">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
      )}
    </Link>
  );
}

// ─── NavGroup Component ───────────────────────────────────────────────────────
function NavGroup({
  group, location, collapsed, totalUnread, isAdmin,
}: {
  group: typeof navGroups[0];
  location: string;
  collapsed: boolean;
  totalUnread: number;
  isAdmin: boolean;
}) {
  const visibleItems = group.items.filter(
    (item) => !(item as { adminOnly?: boolean }).adminOnly || isAdmin
  );
  const hasActive = visibleItems.some(
    (item) => location === item.path || location.startsWith(item.path + "/")
  );
  const [open, setOpen] = useState(true);

  // Auto-open group if it has an active item
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  // Hide entire group if no visible items
  if (visibleItems.length === 0) return null;

  if (!group.label) {
    return (
      <div className="space-y-0.5">
        {visibleItems.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            active={location === item.path || location.startsWith(item.path + "/")}
            collapsed={collapsed}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {!collapsed ? (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-sidebar-foreground transition-colors"
        >
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-180")} />
        </button>
      ) : (
        <div className="border-t border-sidebar-border/50 my-2" />
      )}

      {(open || collapsed) && (
        <div className="space-y-0.5">
          {visibleItems.map((item) => {
            const isWhatsApp = (item as { badge?: string }).badge === "whatsapp";
            return (
              <NavItem
                key={item.path}
                item={item}
                active={location === item.path || location.startsWith(item.path + "/")}
                collapsed={collapsed}
                badge={isWhatsApp ? totalUnread : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SidebarContent — componente FORA do CRMLayout ───────────────────────────
// CRÍTICO: deve ficar fora do CRMLayout para evitar remount a cada re-render,
// que causaria reset do scroll position do menu lateral.
function SidebarContent({
  collapsed,
  totalUnread,
  isAdmin,
  isManager,
  location,
  user,
  onLogout,
}: {
  collapsed: boolean;
  totalUnread: number;
  isAdmin: boolean;
  isManager: boolean;
  location: string;
  user: { name?: string | null; role?: string | null } | null;
  onLogout: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 px-4 border-b border-sidebar-border shrink-0",
        collapsed ? "justify-center" : "gap-3"
      )}>
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground leading-none">CRM Studio</p>
            <p className="text-xs text-muted-foreground mt-0.5">WhatsApp CRM</p>
          </div>
        )}
      </div>

      {/* Global Search */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <GlobalSearch />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-2 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sidebar-border">
        {navGroups.map((group) => (
          <NavGroup
            key={group.id}
            group={group}
            location={location}
            collapsed={collapsed}
            totalUnread={totalUnread}
            isAdmin={isAdmin}
          />
        ))}

        {/* Admin section */}
        {isManager && (
          <div className="space-y-0.5">
            {!collapsed ? (
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administração
              </p>
            ) : (
              <div className="border-t border-sidebar-border/50 my-2" />
            )}
            {adminItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                active={location === item.path || location.startsWith(item.path + "/")}
                collapsed={collapsed}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Z-API Status indicator */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-sidebar-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Circle className="w-2 h-2 fill-green-500 text-green-500 shrink-0" />
            <span>WhatsApp conectado</span>
          </div>
        </div>
      )}

      {/* User info */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {(user?.name ?? "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name ?? "Usuário"}</p>
              <span className={cn("text-xs px-1.5 py-0.5 rounded border", roleBadgeColors[user?.role ?? "assistente"])}>
                {roleLabels[user?.role ?? "assistente"]}
              </span>
            </div>
            <button
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-sidebar-accent/50"
              title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-sidebar-accent/50"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-sidebar-accent/50"
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-sidebar-accent/50"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const utils = trpc.useUtils();

  const { data: unreadData, refetch: refetchUnread } = trpc.whatsapp.totalUnread.useQuery(undefined, {
    // Reduced interval — SSE handles most updates in real-time
    refetchInterval: 60_000,
    enabled: isAuthenticated && user?.status === "active",
  });

  // Listen to SSE chat_updated events to bump the badge instantly
  useEffect(() => {
    if (!isAuthenticated || user?.status !== "active") return;

    const es = new EventSource("/api/whatsapp/events", { withCredentials: true });

    es.addEventListener("chat_updated", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data.unreadCount && data.unreadCount > 0) {
          // Invalidate the totalUnread query so the badge refreshes immediately
          utils.whatsapp.totalUnread.invalidate();
        }
      } catch { /* ignore */ }
    });

    // Keep-alive pings are ignored silently
    es.onerror = () => es.close();

    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.status]);

  const totalUnread = unreadData ?? 0;

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (user?.status === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Aguardando Aprovação</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Sua conta foi criada e está aguardando aprovação do administrador.
          </p>
          <button onClick={() => logoutMutation.mutate()} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  if (user?.status === "rejected") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Sua solicitação de acesso foi recusada. Entre em contato com o administrador.
          </p>
          <button onClick={() => logoutMutation.mutate()} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "admin" || user?.role === "gerente";

  const sidebarProps = {
    collapsed,
    totalUnread,
    isAdmin,
    isManager,
    location,
    user,
    onLogout: () => logoutMutation.mutate(),
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={cn(
          "relative hidden md:flex flex-col overflow-hidden bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        <SidebarContent {...sidebarProps} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-full top-14 -translate-y-1/2 ml-px w-5 h-8 bg-sidebar border border-l-0 border-sidebar-border rounded-r-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[260px] flex flex-col bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center h-14 px-4 border-b border-border bg-background shrink-0 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">CRM Studio</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {totalUnread > 0 && (
              <Link href="/whatsapp">
                <span className="min-w-[20px] h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              </Link>
            )}
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
