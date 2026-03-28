import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  FolderOpen,
  Home,
  Library,
  LogOut,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Shield,
  Users,
  Wallet,
  Zap,
  ClipboardList,
  Mic2,
  Palette,
  Wrench,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: MessageSquare, label: "WhatsApp", path: "/whatsapp" },
  { icon: Users, label: "Contatos", path: "/contacts" },
  { icon: Zap, label: "Pipeline", path: "/pipeline" },
  { icon: FileText, label: "Contratos", path: "/contracts" },
  { icon: Receipt, label: "Faturas", path: "/invoices" },
  { icon: BookOpen, label: "Orçamentos", path: "/quotes" },
  { icon: Calendar, label: "Estúdio", path: "/studio" },
  { icon: CheckSquare, label: "Tarefas", path: "/tasks" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: CreditCard, label: "Pagamentos", path: "/payments" },
  { icon: Package, label: "Catálogo", path: "/products" },
  { icon: FolderOpen, label: "Projetos", path: "/projects" },
  { icon: Library, label: "Modelos", path: "/contract-templates" },
  { icon: Wallet, label: "Créditos", path: "/credits" },
  { icon: ClipboardList, label: "Rotina Diária", path: "/routine" },
  { icon: Mic2, label: "Podcasts", path: "/podcasts" },
  { icon: Zap, label: "Automações", path: "/automations" },
  { icon: Building2, label: "Salas", path: "/studio-rooms" },
  { icon: Wrench, label: "Equipamentos", path: "/equipment" },
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
  admin: "Admin",
  gerente: "Gerente",
  analista: "Analista",
  assistente: "Assistente",
};

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  // Poll unread WhatsApp count every 30s
  const { data: unreadData } = trpc.whatsapp.totalUnread.useQuery(undefined, {
    refetchInterval: 30_000,
    enabled: isAuthenticated && user?.status === "active",
  });
  const totalUnread = unreadData ?? 0;

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
            Sua conta foi criada e está aguardando aprovação do administrador. Você receberá acesso assim que for aprovado.
          </p>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
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
            Sua solicitação de acesso foi recusada. Entre em contato com o administrador para mais informações.
          </p>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "admin" || user?.role === "gerente";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center h-16 px-4 border-b border-sidebar-border", collapsed ? "justify-center" : "gap-3")}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold text-sidebar-foreground leading-none">CRM Studio</p>
              <p className="text-xs text-muted-foreground mt-0.5">WhatsApp CRM</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const active = location === item.path || location.startsWith(item.path + "/");
            const isWhatsApp = item.path === "/whatsapp";
            const showBadge = isWhatsApp && totalUnread > 0;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative shrink-0">
                  <item.icon className="w-4 h-4" />
                  {showBadge && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {!collapsed && showBadge && (
                  <span className="min-w-[20px] h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 leading-none">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </Link>
            );
          })}

          {isManager && (
            <>
              {!collapsed && (
                <p className="text-xs text-muted-foreground px-3 pt-4 pb-1 uppercase tracking-wider">Administração</p>
              )}
              {collapsed && <div className="border-t border-sidebar-border my-2" />}
              {adminItems.map((item) => {
                const active = location === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User info */}
        <div className="border-t border-sidebar-border p-3">
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
                onClick={() => logoutMutation.mutate()}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => logoutMutation.mutate()}
              className="w-full flex justify-center text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-full top-1/2 -translate-y-1/2 ml-1 w-5 h-10 bg-sidebar border border-sidebar-border rounded-r-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative">
        {children}
      </main>
    </div>
  );
}
