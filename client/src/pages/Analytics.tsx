import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { BarChart3, TrendingUp, DollarSign, Users, Zap, CheckSquare } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#6366f1", "#22d3ee", "#4ade80", "#facc15", "#f87171"];

export default function Analytics() {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: leads } = trpc.pipeline.leads.useQuery({});
  const { data: stages } = trpc.pipeline.stages.useQuery();
  const { data: invoices } = trpc.invoices.list.useQuery();
  const { data: bookings } = trpc.studio.bookings.useQuery();

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
    { name: "Gravação de Podcast", value: bookings?.filter(b => b.sessionType === "recording").length ?? 0 },
    { name: "Edição de Áudio", value: bookings?.filter(b => b.sessionType === "mixing").length ?? 0 },
    { name: "Pós-Produção", value: bookings?.filter(b => b.sessionType === "mastering").length ?? 0 },
    { name: "Revisão de Episódio", value: bookings?.filter(b => b.sessionType === "rehearsal").length ?? 0 },
    { name: "Outros", value: bookings?.filter(b => b.sessionType === "other").length ?? 0 },
  ].filter(d => d.value > 0);

  const totalPipelineValue = leads?.reduce((sum, l) => sum + Number(l.value ?? 0), 0) ?? 0;
  const wonLeads = leads?.filter(l => l.status === "won").length ?? 0;
  const lostLeads = leads?.filter(l => l.status === "lost").length ?? 0;
  const openLeads = leads?.filter(l => l.status === "open").length ?? 0;
  const winRate = (openLeads + wonLeads + lostLeads) > 0
    ? Math.round((wonLeads / (wonLeads + lostLeads || 1)) * 100)
    : 0;

  return (
    <CRMLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Users className="w-5 h-5 text-blue-400" />, label: "Total Contatos", value: stats?.totalContacts ?? 0, color: "bg-blue-500/10" },
            { icon: <Zap className="w-5 h-5 text-purple-400" />, label: "Leads Abertos", value: openLeads, color: "bg-purple-500/10" },
            { icon: <DollarSign className="w-5 h-5 text-green-400" />, label: "Pipeline Total", value: `R$ ${totalPipelineValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, color: "bg-green-500/10" },
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pipeline by stage */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Leads por Estágio</h2>
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.02 260)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 260)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.01 260)", border: "1px solid oklch(0.25 0.02 260)", borderRadius: "8px" }}
                    labelStyle={{ color: "oklch(0.93 0.01 260)" }}
                  />
                  <Bar dataKey="leads" fill="oklch(0.62 0.22 264)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
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
                  <Tooltip
                    contentStyle={{ backgroundColor: "oklch(0.16 0.01 260)", border: "1px solid oklch(0.25 0.02 260)", borderRadius: "8px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", color: "oklch(0.60 0.02 260)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Nenhuma fatura criada
              </div>
            )}
          </div>
        </div>

        {/* Studio sessions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Sessões de Podcast por Tipo</h2>
          {sessionTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sessionTypeData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                <XAxis type="number" tick={{ fill: "oklch(0.60 0.02 260)", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.60 0.02 260)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "oklch(0.16 0.01 260)", border: "1px solid oklch(0.25 0.02 260)", borderRadius: "8px" }}
                />
                <Bar dataKey="value" fill="oklch(0.72 0.18 180)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Nenhuma sessão agendada
            </div>
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
