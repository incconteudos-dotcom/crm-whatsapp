import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Save, Eye, EyeOff, CreditCard, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.settings.getProfile.useQuery();

  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [notifications, setNotifications] = useState({
    newLead: true,
    taskDue: true,
    invoicePaid: true,
    whatsappMessage: true,
    weeklyReport: true,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name ?? "",
        phone: profile.phone ?? "",
      });
    }
  }, [profile]);

  const updateProfileMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      utils.settings.getProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    gerente: "Gerente",
    analista: "Analista",
    assistente: "Assistente",
  };

  const roleColors: Record<string, string> = {
    admin: "bg-purple-500/20 text-purple-400",
    gerente: "bg-blue-500/20 text-blue-400",
    analista: "bg-green-500/20 text-green-400",
    assistente: "bg-gray-500/20 text-gray-400",
  };

  return (
    <CRMLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6 bg-card border border-border">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pagamento
            </TabsTrigger>
          </TabsList>

          {/* PERFIL */}
          <TabsContent value="profile">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>Atualize suas informações pessoais e de contato.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}
                  </div>
                ) : (
                  <>
                    {/* Avatar placeholder */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                        {(profile?.name ?? currentUser?.name ?? "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{profile?.name ?? "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{profile?.email}</p>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full mt-1 inline-block", roleColors[profile?.role ?? "assistente"])}>
                          {roleLabels[profile?.role ?? "assistente"]}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome completo</Label>
                        <Input
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="mt-1.5 bg-input border-border"
                          placeholder="Seu nome"
                        />
                      </div>
                      <div>
                        <Label>Telefone / WhatsApp</Label>
                        <Input
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="mt-1.5 bg-input border-border"
                          placeholder="+55 11 99999-9999"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>E-mail</Label>
                      <Input
                        value={profile?.email ?? ""}
                        disabled
                        className="mt-1.5 bg-muted border-border opacity-60"
                      />
                      <p className="text-xs text-muted-foreground mt-1">O e-mail é gerenciado pelo sistema de autenticação e não pode ser alterado aqui.</p>
                    </div>

                    <div>
                      <Label>Função no sistema</Label>
                      <Input
                        value={roleLabels[profile?.role ?? "assistente"]}
                        disabled
                        className="mt-1.5 bg-muted border-border opacity-60"
                      />
                      <p className="text-xs text-muted-foreground mt-1">A função é atribuída pelo administrador.</p>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className={cn("w-2.5 h-2.5 rounded-full", profile?.whatsappAccess ? "bg-green-400" : "bg-gray-500")} />
                      <p className="text-sm text-foreground">
                        Acesso ao WhatsApp: <span className={profile?.whatsappAccess ? "text-green-400 font-medium" : "text-muted-foreground"}>{profile?.whatsappAccess ? "Habilitado" : "Desabilitado"}</span>
                      </p>
                    </div>

                    <Button
                      onClick={() => updateProfileMutation.mutate({ name: profileForm.name || undefined, phone: profileForm.phone || undefined })}
                      disabled={updateProfileMutation.isPending}
                      className="w-full"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? "Salvando..." : "Salvar Perfil"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTIFICAÇÕES */}
          <TabsContent value="notifications">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>Escolha quais eventos geram notificações para você.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "newLead", label: "Novo lead criado", desc: "Quando um novo lead é adicionado ao pipeline" },
                  { key: "taskDue", label: "Tarefa vencendo", desc: "Lembretes de tarefas com prazo próximo" },
                  { key: "invoicePaid", label: "Fatura paga", desc: "Quando um pagamento é confirmado via Stripe" },
                  { key: "whatsappMessage", label: "Nova mensagem WhatsApp", desc: "Quando uma mensagem nova chega no WhatsApp" },
                  { key: "weeklyReport", label: "Relatório semanal", desc: "Resumo semanal de atividades toda segunda-feira" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={notifications[key as keyof typeof notifications]}
                      onCheckedChange={(v) => {
                        setNotifications({ ...notifications, [key]: v });
                        toast.success(`Notificação ${v ? "ativada" : "desativada"}`);
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEGURANÇA */}
          <TabsContent value="security">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Segurança da Conta</CardTitle>
                <CardDescription>Informações sobre autenticação e sessões ativas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <p className="text-sm font-semibold text-green-400">Sessão ativa</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Você está autenticado via Manus OAuth. A sessão é gerenciada com cookie seguro HTTPOnly.</p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Método de login</p>
                  <p className="text-sm text-foreground capitalize">{profile?.loginMethod ?? "OAuth"}</p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Último acesso</p>
                  <p className="text-sm text-foreground">
                    {profile?.lastSignedIn ? new Date(profile.lastSignedIn).toLocaleString("pt-BR") : "—"}
                  </p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Conta criada em</p>
                  <p className="text-sm text-foreground">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground text-center">Para alterar e-mail ou senha, acesse as configurações do portal Manus.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* APARÊNCIA */}
          <TabsContent value="appearance">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>Personalize a interface do CRM.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Tema</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 rounded-xl border-2 border-primary bg-zinc-900 text-left">
                      <div className="w-full h-16 bg-zinc-800 rounded-lg mb-2 flex items-center justify-center">
                        <div className="w-8 h-1 bg-zinc-600 rounded" />
                      </div>
                      <p className="text-xs font-medium text-foreground">Escuro</p>
                      <p className="text-xs text-muted-foreground">Tema atual</p>
                    </button>
                    <button
                      className="p-4 rounded-xl border-2 border-border bg-white text-left opacity-50 cursor-not-allowed"
                      onClick={() => toast.info("Tema claro em breve!")}
                    >
                      <div className="w-full h-16 bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                        <div className="w-8 h-1 bg-gray-300 rounded" />
                      </div>
                      <p className="text-xs font-medium text-zinc-800">Claro</p>
                      <p className="text-xs text-zinc-500">Em breve</p>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Idioma</p>
                  <p className="text-sm text-foreground">Português (Brasil)</p>
                  <p className="text-xs text-muted-foreground mt-1">Outros idiomas em breve.</p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Fuso horário</p>
                  <p className="text-sm text-foreground">America/Sao_Paulo (UTC-3)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* PAGAMENTO */}
          <TabsContent value="payment">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Configurações de Pagamento
                </CardTitle>
                <CardDescription>Gerencie as chaves Stripe para receber pagamentos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Modo atual */}
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <p className="text-sm font-semibold text-yellow-400">Modo de Teste Ativo</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Use o cartão <code className="bg-muted px-1 py-0.5 rounded text-foreground">4242 4242 4242 4242</code> com qualquer data futura e CVC para testar pagamentos. Nenhum valor real é cobrado.</p>
                </div>

                {/* Como ativar produção */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Como ativar pagamentos reais:</p>
                  {[
                    { step: "1", text: "Complete a verificação KYC no painel Stripe (stripe.com/dashboard)" },
                    { step: "2", text: "Acesse Configurações → Payment no painel de gerenciamento do Manus" },
                    { step: "3", text: "Insira as chaves de produção (Publishable Key e Secret Key)" },
                    { step: "4", text: "Teste com um pagamento real usando o cupom de 99% de desconto" },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">{step}</div>
                      <p className="text-sm text-muted-foreground">{text}</p>
                    </div>
                  ))}
                </div>

                {/* Funcionalidades ativas */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Funcionalidades de Pagamento Ativas</p>
                  {[
                    "Checkout de faturas via Stripe",
                    "Pagamento parcelado (split payment)",
                    "Códigos de desconto (promotion codes)",
                    "Webhook de confirmação automática",
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      {feat}
                    </div>
                  ))}
                </div>

                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir painel Stripe
                </a>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
