import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { MessageSquare, Zap, Users, Calendar, FileText, BarChart3, ArrowRight, Shield } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && user?.status === "active") {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">CRM Studio</p>
              <p className="text-xs text-muted-foreground">WhatsApp CRM</p>
            </div>
          </div>
          <a
            href={getLoginUrl()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Entrar
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            CRM integrado com WhatsApp
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            Gerencie seus clientes e vendas com{" "}
            <span className="text-primary">inteligência</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Plataforma completa para estúdios de podcast e produção de conteúdo. Integre WhatsApp, gerencie contratos, faturas, agendamentos e muito mais.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={getLoginUrl()}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Começar Agora
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Acesso mediante aprovação do administrador
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-12">Tudo que você precisa em um só lugar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MessageSquare, color: "text-green-400 bg-green-500/10", title: "WhatsApp Integrado", desc: "Gerencie todas as conversas do WhatsApp com identificação de usuário e análise por IA." },
              { icon: Zap, color: "text-purple-400 bg-purple-500/10", title: "Pipeline de Vendas", desc: "Visualize e gerencie seus leads em um kanban intuitivo com estágios personalizáveis." },
              { icon: Users, color: "text-blue-400 bg-blue-500/10", title: "Gestão de Contatos", desc: "Cadastre e organize contatos com histórico completo de interações e notas." },
              { icon: FileText, color: "text-orange-400 bg-orange-500/10", title: "Contratos Inteligentes", desc: "Gere contratos com IA, envie para assinatura digital e acompanhe o status." },
              { icon: Calendar, color: "text-pink-400 bg-pink-500/10", title: "Agendamento de Estúdio", desc: "Gerencie sessões de gravação, edição e pós-produção de podcast com calendário visual." },
              { icon: BarChart3, color: "text-cyan-400 bg-cyan-500/10", title: "Analytics Completo", desc: "Relatórios detalhados de pipeline, receita, conversão e performance da equipe." },
            ].map((feature, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">CRM Studio — Plataforma de gestão para estúdios e agências</p>
      </footer>
    </div>
  );
}
