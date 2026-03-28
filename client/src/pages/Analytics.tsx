import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import {
  BarChart3, TrendingUp, DollarSign, Users, Zap, CheckSquare,
  ArrowRight, Trophy, Target, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, FunnelChart, Funnel, LabelList,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["#6366f1", "#22d3ee", "#4ade80", "#facc15", "#f87171"];
const CHART_STYLE = {
  bg: "oklch(0.16 0.01 260)",
  border: "1px solid oklch(0.25 0.02 260)",
  borderRadius: "8px",
};
const TICK = { fill: "oklch(0.60 0.02 260)", fontSize: 11 };
const GRID = "oklch(0.25 0.02 260)";

const fmt = (v: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(
    typeof v === "string" ? parseFloat(v) : (v ?? 0)
  );

export default function Analytics() {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: leads } = trpc.pipeline.leads.useQuery({});
  const { data: stages } = trpc.pipeline.stages.useQuery();
  const { data: invoices } = trpc.invoices.list.useQuery();
  const { data: bookings } = trpc.studio.bookings.useQuery();
  const { data: monthlyRevenue } = trpc.analytics.monthlyRevenue.useQuery();
  const { data: topClients } = trpc.analytics.topClients.useQuery();
  const { data: funnel } = trpc.analytics.conversionFunnel.useQuery();

  // Pipeline by stage
  const pipelineData = stages?.map(stage => ({
    name: stage.name,
    leads: leads?.filter(l => l.stageId === stage.id).length ?? 0,
    value: leads?.filter(l => l.stageId === stage.id).reduce((sum, l) => sum + Number(l.value ?? 0), 0) ?? 0,
  })) ?? [];

  // Invoice status distribution
  const invoiceStatusData = [
    { name: "Pagas", value: invoices?.filter(i => i.status === "paid").length ?? 0 },
    { name: "Enviadas", value: invoices?.filter(i => i.status === "sent").length ?? 0 },
    { name: "Rascunho", value: invoices?.filter(i => i.status === "draft").length ?? 0 },
    { name: "Vencidas", value: invoices?.filter(i => i.status === "overdue").length ?? 0 },
  ].filter(d => d.value > 0);

  // Studio sessions by type
  const sessionTypeData = [
    { name: "Gravação", value: bookings?.filter(b => b.sessionType === "recording").length ?? 0 },
    { name: "Edição de Episódio", value: bookings?.filter(b => b.sessionType === "mixing").length ?? 0 },
    { name: "Pós-Produção", value: bookings?.filter(b => b.sessionType === "mastering").length ?? 0 },
    { name: "Revisão", value: bookings?.filter(b => b.sessionType === "rehearsal").length ?? 0 },
    { name: "Outros", value: bookings?.filter(b => b.sessionType === "other").length ?? 0 },
  ].filter(d => d.value > 0);

  // Monthly revenue chart data
  const revenueData = (monthlyRevenue ?? []).map(r => ({
    month: r.month ? format(new Date(r.month + "-01"), "MMM/yy", { locale: ptBR }) : "",
    total: parseFloat(r.total ?? "0"),
  }));

  // Conversion funnel data
  const funnelData = funnel ? [
    { name: "Total Leads", value: funnel.total, fill: "#6366f1" },
    { name: "Contatados", value: funnel.contacted, fill: "#22d3ee" },
    { name: "Proposta", value: funnel.proposal, fill: "#4ade80" },
    { name: "Ganhos", value: funnel.won, fill: "#facc15" },
  ] : [];

  const totalPipelineValue = leads?.reduce((sum, l) => sum + Number(l.value ?? 0), 0) ?? 0;
  const wonLeads = leads?.filter(l => l.status === "won").length ?? 0;
  const lostLeads = leads?.filter(l => l.status === "lost").length ?? 0;
  const openLeads = leads?.filter(l => l.status === "open").length ?? 0;
  const winRate = (wonLeads + lostLeads) > 0 ? Math.round((wonLeads / (wonLeads + lostLeads)) * 100) : 0;
  const totalRevenuePaid = invoices?.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total ?? 0), 0) ?? 0;

  return (
    <CRMLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Users className="w-5 h-5 text-blue-400" />, label: "Total Contatos", value: stats?.totalContacts ?? 0, color: "bg-blue-500/10" },
            { icon: <Zap className="w-5 h-5 text-purple-400" />, label: "Leads Abertos", value: openLeads, color: "bg-purple-500/10" },
            { icon: <DollarSign className="w-5 h-5 text-green-400" />, label: "Receita Total", value: fmt(totalRevenuePaid), color: "bg-green-500/10" },
            { icon: <TrendingUp className="w-5 h-5 text-yellow-400" />, label: "Taxa de Conversão", value: `${winRate}%`, color: "bg-yellow-500/10" },
          ].map((kpi, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  {kpi.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Monthly Revenue Chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold text-foreground">Receita Mensal (últimos 12 meses)</h2>
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="month" tick={TICK} />
                <YAxis tick={TICK} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={CHART_STYLE}
                  labelStyle={{ color: "oklch(0.93 0.01 260)" }}
                  formatter={(v: number) => [fmt(v), "Receita"]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#4ade80"
                  strokeWidth={2.5}
                  dot={{ fill: "#4ade80", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
              <DollarSign className="w-8 h-8 opacity-30" />
              <p>Nenhuma fatura paga ainda</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline by stage */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Leads por Estágio</h2>
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis dataKey="name" tick={TICK} />
                  <YAxis tick={TICK} />
                  <Tooltip contentStyle={CHART_STYLE} labelStyle={{ color: "oklch(0.93 0.01 260)" }} />
                  <Bar dataKey="leads" fill="oklch(0.62 0.22 264)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Nenhum dado disponível</div>
            )}
          </div>

          {/* Invoice status */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Status das Faturas</h2>
            {invoiceStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={invoiceStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                    {invoiceStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: "oklch(0.60 0.02 260)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Nenhuma fatura criada</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-foreground">Funil de Conversão</h2>
            </div>
            {funnelData.length > 0 && funnelData[0].value > 0 ? (
              <div className="space-y-2">
                {funnelData.map((step, i) => {
                  const pct = funnelData[0].value > 0 ? Math.round((step.value / funnelData[0].value) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{step.name}</span>
                        <span className="font-medium text-foreground">{step.value} ({pct}%)</span>
                      </div>
                      <div className="h-6 bg-muted/30 rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: step.fill }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/50 flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-400" /> Perdidos
                  </span>
                  <span className="text-red-400 font-medium">{funnel?.lost ?? 0}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Nenhum lead criado</div>
            )}
          </div>

          {/* Top Clients */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-semibold text-foreground">Top 10 Clientes por Receita</h2>
            </div>
            {topClients && topClients.length > 0 ? (
              <div className="space-y-2">
                {topClients.map((client, i) => {
                  const maxVal = parseFloat(topClients[0]?.total ?? "1");
                  const pct = maxVal > 0 ? Math.round((parseFloat(client.total ?? "0") / maxVal) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="font-medium text-foreground truncate">{client.name ?? "Sem nome"}</span>
                          <span className="text-green-400 shrink-0 ml-2">{fmt(client.total)}</span>
                        </div>
                        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Nenhuma fatura paga ainda</div>
            )}
          </div>
        </div>

        {/* Studio sessions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Sessões de Podcast por Tipo</h2>
          {sessionTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sessionTypeData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis type="number" tick={TICK} />
                <YAxis type="category" dataKey="name" tick={TICK} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Bar dataKey="value" fill="oklch(0.72 0.18 180)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Nenhuma sessão agendada</div>
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
