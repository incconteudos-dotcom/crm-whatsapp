import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Users, Zap, DollarSign, CheckSquare, MessageSquare,
  TrendingUp, TrendingDown, Calendar, FileText, ArrowRight,
  Clock, AlertTriangle, AlertCircle, CheckCircle2, Mic,
  BarChart3, Target
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const activityIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="w-3.5 h-3.5 text-green-400" />,
  email: <FileText className="w-3.5 h-3.5 text-blue-400" />,
  call: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
  note: <FileText className="w-3.5 h-3.5 text-gray-400" />,
  status_change: <TrendingUp className="w-3.5 h-3.5 text-purple-400" />,
  contract: <FileText className="w-3.5 h-3.5 text-orange-400" />,
  invoice: <DollarSign className="w-3.5 h-3.5 text-green-400" />,
  booking: <Calendar className="w-3.5 h-3.5 text-pink-400" />,
};

function KpiCard({ icon, label, value, sub, color, trend, trendValue }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend && trendValue && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            trend === "up" && "text-green-400 bg-green-500/10",
            trend === "down" && "text-red-400 bg-red-500/10",
            trend === "neutral" && "text-muted-foreground bg-muted"
          )}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
}

function ActionItem({ icon, title, subtitle, urgency, link }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  urgency: "high" | "medium" | "low";
  link: string;
}) {
  return (
    <Link href={link} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors group">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
        urgency === "high" && "bg-red-500/10",
        urgency === "medium" && "bg-yellow-500/10",
        urgency === "low" && "bg-blue-500/10",
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: actionItems, isLoading: actionLoading } = trpc.dashboard.actionItems.useQuery();
  const { data: activities, isLoading: activitiesLoading } = trpc.dashboard.activities.useQuery();
  const { data: chats } = trpc.whatsapp.chats.useQuery(undefined, { retry: false });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const totalActionItems = (actionItems?.staleLeads?.length ?? 0) +
    (actionItems?.overdueInvoices?.length ?? 0) +
    (actionItems?.unpaidBookings?.length ?? 0);

  const revenueChange = kpis?.revenueChange ?? 0;
  const revenueTrend = revenueChange > 0 ? "up" : revenueChange < 0 ? "down" : "neutral";
  const revenueTrendLabel = revenueChange !== 0
    ? `${revenueChange > 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs mês anterior`
    : "Igual ao mês anterior";

  return (
    <CRMLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {greeting()}, {user?.name?.split(" ")[0] ?? "usuário"} 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          {totalActionItems > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">{totalActionItems} ação{totalActionItems > 1 ? "ões" : ""} pendente{totalActionItems > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon={<DollarSign className="w-5 h-5 text-green-400" />}
            label="Receita do Mês"
            value={kpisLoading ? "..." : `R$ ${Number(kpis?.revenueThisMonth ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
            sub={`Mês anterior: R$ ${Number(kpis?.revenueLastMonth ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
            color="bg-green-500/10"
            trend={revenueTrend}
            trendValue={revenueTrendLabel}
          />
          <KpiCard
            icon={<Zap className="w-5 h-5 text-purple-400" />}
            label="Leads Ativos"
            value={kpisLoading ? "..." : kpis?.activeLeads ?? (statsLoading ? "..." : stats?.openLeads ?? 0)}
            sub="Em negociação"
            color="bg-purple-500/10"
          />
          <KpiCard
            icon={<Target className="w-5 h-5 text-blue-400" />}
            label="Taxa de Conversão"
            value={kpisLoading ? "..." : `${kpis?.conversionRate ?? 0}%`}
            sub="Leads ganhos / total"
            color="bg-blue-500/10"
          />
          <KpiCard
            icon={<Mic className="w-5 h-5 text-pink-400" />}
            label="Sessões na Semana"
            value={kpisLoading ? "..." : kpis?.weekSessions ?? 0}
            sub="Agendamentos confirmados"
            color="bg-pink-500/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* O que fazer hoje */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">O que fazer hoje</h2>
                {totalActionItems > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs h-5 px-1.5">{totalActionItems}</Badge>
                )}
              </div>

              {actionLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : totalActionItems === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                  <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
                  <p className="text-xs text-muted-foreground mt-1">Nenhuma ação urgente pendente</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {actionItems?.staleLeads?.map((lead) => (
                    <ActionItem
                      key={`lead-${lead.id}`}
                      icon={<Zap className="w-4 h-4 text-yellow-400" />}
                      title={`Lead parado: ${lead.title}`}
                      subtitle={`Sem atualização há ${formatDistanceToNow(new Date(lead.updatedAt), { locale: ptBR })}`}
                      urgency="medium"
                      link="/pipeline"
                    />
                  ))}
                  {actionItems?.overdueInvoices?.map((inv) => (
                    <ActionItem
                      key={`inv-${inv.id}`}
                      icon={<AlertCircle className="w-4 h-4 text-red-400" />}
                      title={`Fatura ${inv.number} vencendo`}
                      subtitle={`R$ ${Number(inv.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} — ${inv.dueDate ? format(new Date(inv.dueDate), "dd/MM", { locale: ptBR }) : "sem data"}`}
                      urgency="high"
                      link="/invoices"
                    />
                  ))}
                  {actionItems?.unpaidBookings?.map((b) => (
                    <ActionItem
                      key={`booking-${b.id}`}
                      icon={<Calendar className="w-4 h-4 text-orange-400" />}
                      title={`Entrada pendente: ${b.title}`}
                      subtitle={`Sessão em ${b.startAt ? format(new Date(b.startAt), "dd/MM 'às' HH:mm", { locale: ptBR }) : "—"}`}
                      urgency="high"
                      link="/studio"
                    />
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Acesso rápido</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { icon: MessageSquare, label: "WhatsApp", path: "/whatsapp", color: "text-green-400" },
                    { icon: Users, label: "Contatos", path: "/contacts", color: "text-blue-400" },
                    { icon: Calendar, label: "Estúdio", path: "/studio", color: "text-pink-400" },
                    { icon: BarChart3, label: "Analytics", path: "/analytics", color: "text-purple-400" },
                  ].map((item) => (
                    <Link key={item.path} href={item.path} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors">
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                      <span className="text-xs text-foreground">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Atividade Recente */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Atividade Recente</h2>
                <Link href="/analytics" className="text-xs text-primary hover:underline">Ver tudo</Link>
              </div>
              {activitiesLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-7 h-7 bg-muted rounded-full shrink-0" />
                      <div className="flex-1">
                        <div className="h-3 bg-muted rounded w-3/4 mb-1" />
                        <div className="h-2.5 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-accent rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        {activityIcons[activity.type] ?? <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">As ações do CRM aparecerão aqui</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats secundários */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Contatos</p>
            <p className="text-xl font-bold text-foreground mt-1">{statsLoading ? "..." : stats?.totalContacts ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total cadastrado</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Tarefas Pendentes</p>
            <p className="text-xl font-bold text-foreground mt-1">{statsLoading ? "..." : stats?.pendingTasks ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Aguardando conclusão</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-xl font-bold text-foreground mt-1">
              R$ {Number(stats?.totalRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Histórico completo</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Usuários Pendentes</p>
            <p className="text-xl font-bold text-foreground mt-1">{statsLoading ? "..." : stats?.pendingUsers ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Aguardando aprovação</p>
          </div>
        </div>

        {/* WhatsApp preview */}
        {chats && chats.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-400" />
                Conversas Recentes no WhatsApp
              </h2>
              <Link href="/whatsapp" className="text-xs text-primary hover:underline">Abrir WhatsApp</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {chats.slice(0, 6).map((chat) => (
                <Link key={chat.id} href={`/whatsapp?chat=${chat.jid}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="w-9 h-9 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-green-400">
                      {(chat.name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{chat.name ?? chat.jid}</p>
                    <p className="text-xs text-muted-foreground truncate">{chat.lastMessagePreview ?? "Sem mensagens"}</p>
                  </div>
                  {(chat.unreadCount ?? 0) > 0 && (
                    <span className="w-5 h-5 bg-green-500 rounded-full text-xs text-white flex items-center justify-center shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
