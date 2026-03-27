import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Users, Zap, DollarSign, CheckSquare, MessageSquare,
  TrendingUp, Calendar, FileText, ArrowRight, Clock
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: activities, isLoading: activitiesLoading } = trpc.dashboard.activities.useQuery();
  const { data: chats } = trpc.whatsapp.chats.useQuery(undefined, { retry: false });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <CRMLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            {greeting()}, {user?.name?.split(" ")[0] ?? "usuário"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está um resumo das suas operações hoje
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users className="w-5 h-5 text-blue-400" />}
            label="Contatos"
            value={statsLoading ? "..." : stats?.totalContacts ?? 0}
            sub="Total cadastrado"
            color="bg-blue-500/10"
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-purple-400" />}
            label="Leads Ativos"
            value={statsLoading ? "..." : stats?.openLeads ?? 0}
            sub="Em negociação"
            color="bg-purple-500/10"
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5 text-green-400" />}
            label="Receita Paga"
            value={statsLoading ? "..." : `R$ ${Number(stats?.totalRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            sub="Total recebido"
            color="bg-green-500/10"
          />
          <StatCard
            icon={<CheckSquare className="w-5 h-5 text-yellow-400" />}
            label="Tarefas Pendentes"
            value={statsLoading ? "..." : stats?.pendingTasks ?? 0}
            sub={stats?.pendingUsers ? `${stats.pendingUsers} usuário(s) aguardando` : "Sem pendências"}
            color="bg-yellow-500/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Acesso Rápido</h2>
              <div className="space-y-2">
                {[
                  { icon: MessageSquare, label: "Abrir WhatsApp", path: "/whatsapp", color: "text-green-400" },
                  { icon: Users, label: "Novo Contato", path: "/contacts", color: "text-blue-400" },
                  { icon: Zap, label: "Pipeline de Vendas", path: "/pipeline", color: "text-purple-400" },
                  { icon: Calendar, label: "Agendar Estúdio", path: "/studio", color: "text-pink-400" },
                  { icon: FileText, label: "Novo Contrato", path: "/contracts", color: "text-orange-400" },
                  { icon: DollarSign, label: "Gerar Fatura", path: "/invoices", color: "text-green-400" },
                ].map((item) => (
                  <Link key={item.path} href={item.path} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group">
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-sm text-foreground">{item.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Atividade Recente</h2>
                <Link href="/analytics" className="text-xs text-primary hover:underline">Ver tudo</Link>
              </div>
              {activitiesLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
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
                <div className="space-y-3">
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

        {/* WhatsApp preview */}
        {chats && chats.length > 0 && (
          <div className="mt-6">
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
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
