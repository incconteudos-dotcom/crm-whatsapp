import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  FileText, Receipt, Package, Mic2, CheckCircle, Clock, AlertCircle,
  ExternalLink, CreditCard, Building2, Phone, Mail, Globe, Loader2,
  FolderOpen, ChevronRight, ShieldCheck
} from "lucide-react";

// ─── Magic Link Entry Page ────────────────────────────────────────────────────
export function ClientPortalMagicEntry() {
  const [, params] = useRoute("/portal/magic/:token");
  const token = params?.token ?? "";
  const [, navigate] = useLocation();
  const [portalData, setPortalData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const validateMutation = trpc.portalMagic.validate.useMutation({
    onSuccess: (data) => {
      if (data.contact) {
        // Store in session for portal navigation
        sessionStorage.setItem("portal_contact_id", String(data.contact.id));
        sessionStorage.setItem("portal_data", JSON.stringify(data));
        navigate(`/portal/client/${data.contact.id}`);
      } else {
        setError("Contato não encontrado.");
      }
    },
    onError: (err) => {
      setError(err.message || "Link inválido ou expirado.");
    },
  });

  useEffect(() => {
    if (token) {
      validateMutation.mutate({ token });
    }
  }, [token]);

  if (validateMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-950 to-slate-900">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-violet-400" />
          <p className="text-lg">Validando seu acesso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-950 to-slate-900">
        <Card className="max-w-md w-full mx-4 bg-slate-800 border-slate-700">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Link inválido</h2>
            <p className="text-slate-400">{error}</p>
            <p className="text-slate-500 text-sm mt-4">
              Solicite um novo link de acesso à equipe.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// ─── Portal Dashboard ─────────────────────────────────────────────────────────
export default function ClientPortalDashboard() {
  const [, params] = useRoute("/portal/client/:contactId");
  const contactId = Number(params?.contactId ?? 0);

  const { data, isLoading } = trpc.portalMagic.getData.useQuery(
    { contactId },
    { enabled: !!contactId }
  );

  const [signingDocId, setSigningDocId] = useState<number | null>(null);
  const [signerName, setSignerName] = useState("");

  const approvePortalMutation = trpc.portal.approve.useMutation({
    onSuccess: () => {
      toast.success("Documento aprovado com sucesso!");
      setSigningDocId(null);
    },
    onError: () => toast.error("Erro ao aprovar documento"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-950 to-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!data?.contact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-950 to-slate-900">
        <Card className="max-w-md w-full mx-4 bg-slate-800 border-slate-700">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Portal não encontrado</h2>
            <p className="text-slate-400">Verifique o link de acesso.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brand = data.brand;
  const primaryColor = brand?.primaryColor ?? "#7c3aed";
  const accentColor = brand?.accentColor ?? "#a78bfa";
  const companyName = brand?.companyName ?? "Pátio Estúdio";
  const logoUrl = brand?.logoUrl;
  const tagline = brand?.tagline ?? "Seu portal de cliente";
  const footerText = brand?.footerText ?? `© ${new Date().getFullYear()} ${companyName}`;

  const contracts = data.contracts ?? [];
  const invoices = data.invoices ?? [];
  const quotes = data.quotes ?? [];
  const projects = data.projects ?? [];
  const podcasts = data.podcasts ?? [];

  const pendingContracts = contracts.filter((c: any) => c.status === "draft" || c.status === "sent");
  const pendingInvoices = invoices.filter((i: any) => i.status === "sent" || i.status === "overdue");
  const pendingQuotes = quotes.filter((q: any) => q.status === "sent");

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Rascunho", variant: "secondary" },
      sent: { label: "Aguardando", variant: "default" },
      signed: { label: "Assinado", variant: "outline" },
      approved: { label: "Aprovado", variant: "outline" },
      paid: { label: "Pago", variant: "outline" },
      overdue: { label: "Vencido", variant: "destructive" },
      cancelled: { label: "Cancelado", variant: "destructive" },
      active: { label: "Ativo", variant: "default" },
      finished: { label: "Concluído", variant: "outline" },
    };
    const cfg = map[status] ?? { label: status, variant: "secondary" };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f0a1e 0%, #1a0f2e 50%, #0d1117 100%)" }}>
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-8 w-auto" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: primaryColor }}>
                {companyName[0]}
              </div>
            )}
            <div>
              <p className="font-bold text-white text-sm">{companyName}</p>
              <p className="text-xs" style={{ color: accentColor }}>{tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span className="hidden sm:block">Portal seguro</span>
          </div>
        </div>
      </header>

      {/* Welcome */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            Olá, {data.contact.name}! 👋
          </h1>
          <p className="text-slate-400 mt-1">
            Aqui você acompanha seus projetos, documentos e pagamentos.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: FolderOpen, label: "Projetos", count: projects.length, color: "text-blue-400" },
            { icon: FileText, label: "Contratos", count: contracts.length, color: "text-violet-400" },
            { icon: Receipt, label: "Faturas", count: invoices.length, color: "text-green-400" },
            { icon: Mic2, label: "Podcasts", count: podcasts.length, color: "text-pink-400" },
          ].map(({ icon: Icon, label, count, color }) => (
            <Card key={label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <Icon className={`w-6 h-6 mx-auto mb-1 ${color}`} />
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Actions */}
        {(pendingContracts.length > 0 || pendingInvoices.length > 0 || pendingQuotes.length > 0) && (
          <Card className="bg-amber-500/10 border-amber-500/30 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Ações pendentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingContracts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-400" />
                    <span className="text-white text-sm">{c.title}</span>
                  </div>
                  <Button size="sm" variant="outline" className="border-violet-500 text-violet-400 hover:bg-violet-500/20"
                    onClick={() => approvePortalMutation.mutate({ token: `contract-${c.id}`, signedName: data.contact?.name ?? "" })}>
                    Assinar
                  </Button>
                </div>
              ))}
              {pendingQuotes.map((q: any) => (
                <div key={q.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    <span className="text-white text-sm">Orçamento #{q.number}</span>
                  </div>
                  <Button size="sm" variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                    onClick={() => approvePortalMutation.mutate({ token: `quote-${q.id}`, signedName: data.contact?.name ?? "" })}>
                    Aprovar
                  </Button>
                </div>
              ))}
              {pendingInvoices.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Receipt className={`w-4 h-4 ${i.status === "overdue" ? "text-red-400" : "text-green-400"}`} />
                    <div>
                      <span className="text-white text-sm">Fatura #{i.number}</span>
                      {i.status === "overdue" && <span className="text-red-400 text-xs ml-2">Vencida</span>}
                    </div>
                  </div>
                  {i.stripePaymentUrl && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => window.open(i.stripePaymentUrl, "_blank")}>
                      <CreditCard className="w-3 h-3 mr-1" /> Pagar
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="projects">
          <TabsList className="bg-white/5 border border-white/10 mb-6 w-full sm:w-auto">
            <TabsTrigger value="projects" className="data-[state=active]:bg-violet-600">
              <FolderOpen className="w-4 h-4 mr-1" /> Projetos
            </TabsTrigger>
            <TabsTrigger value="contracts" className="data-[state=active]:bg-violet-600">
              <FileText className="w-4 h-4 mr-1" /> Contratos
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-violet-600">
              <Receipt className="w-4 h-4 mr-1" /> Faturas
            </TabsTrigger>
            <TabsTrigger value="podcasts" className="data-[state=active]:bg-violet-600">
              <Mic2 className="w-4 h-4 mr-1" /> Podcasts
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects">
            {projects.length === 0 ? (
              <EmptyState icon={FolderOpen} message="Nenhum projeto encontrado" />
            ) : (
              <div className="space-y-3">
                {projects.map((p: any) => (
                  <Card key={p.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-white">{p.name}</p>
                          {p.description && <p className="text-slate-400 text-sm mt-1">{p.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            {statusBadge(p.status)}
                            {p.startDate && (
                              <span className="text-xs text-slate-500">
                                Início: {new Date(p.startDate).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500 mt-1" />
                      </div>
                      {p.progress !== undefined && p.progress !== null && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Progresso</span>
                            <span>{p.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, background: primaryColor }} />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts">
            {contracts.length === 0 ? (
              <EmptyState icon={FileText} message="Nenhum contrato encontrado" />
            ) : (
              <div className="space-y-3">
                {contracts.map((c: any) => (
                  <Card key={c.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{c.title}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {statusBadge(c.status)}
                            {c.value && (
                              <span className="text-sm text-green-400">
                                R$ {Number(c.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                            {c.createdAt && (
                              <span className="text-xs text-slate-500">
                                {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                        {(c.status === "draft" || c.status === "sent") && (
                          <Button size="sm" variant="outline" className="ml-3 border-violet-500 text-violet-400 hover:bg-violet-500/20 shrink-0"
                            onClick={() => approvePortalMutation.mutate({ token: `contract-${c.id}`, signedName: data.contact?.name ?? "" })}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Assinar
                          </Button>
                        )}
                        {c.status === "signed" && (
                          <Badge variant="outline" className="ml-3 border-green-500 text-green-400 shrink-0">
                            <CheckCircle className="w-3 h-3 mr-1" /> Assinado
                          </Badge>
                        )}
                      </div>
                      {c.content && (
                        <details className="mt-3">
                          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">Ver conteúdo</summary>
                          <p className="text-slate-300 text-sm mt-2 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{c.content}</p>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            {invoices.length === 0 ? (
              <EmptyState icon={Receipt} message="Nenhuma fatura encontrada" />
            ) : (
              <div className="space-y-3">
                {invoices.map((i: any) => (
                  <Card key={i.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">Fatura #{i.number}</p>
                            {statusBadge(i.status)}
                          </div>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {i.total && (
                              <span className="text-lg font-bold text-green-400">
                                R$ {Number(i.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                            {i.dueDate && (
                              <span className={`text-xs flex items-center gap-1 ${i.status === "overdue" ? "text-red-400" : "text-slate-400"}`}>
                                <Clock className="w-3 h-3" />
                                Vence: {new Date(i.dueDate).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                        {i.stripePaymentUrl && i.status !== "paid" && (
                          <Button size="sm" className="ml-3 bg-green-600 hover:bg-green-700 text-white shrink-0"
                            onClick={() => window.open(i.stripePaymentUrl, "_blank")}>
                            <CreditCard className="w-3 h-3 mr-1" /> Pagar
                          </Button>
                        )}
                      </div>
                      {i.items && Array.isArray(i.items) && i.items.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {i.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm text-slate-400">
                              <span>{item.description}</span>
                              <span>R$ {Number(item.total ?? item.unitPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Podcasts Tab */}
          <TabsContent value="podcasts">
            {podcasts.length === 0 ? (
              <EmptyState icon={Mic2} message="Nenhum podcast encontrado" />
            ) : (
              <div className="space-y-3">
                {podcasts.map((p: any) => (
                  <Card key={p.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {p.coverUrl ? (
                          <img src={p.coverUrl} alt={p.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
                            <Mic2 className="w-6 h-6 text-pink-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white">{p.name}</p>
                          {p.description && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{p.description}</p>}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {statusBadge(p.status)}
                            {p.category && <span className="text-xs text-slate-500">{p.category}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            {p.spotifyUrl && (
                              <a href={p.spotifyUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Spotify
                              </a>
                            )}
                            {p.youtubeUrl && (
                              <a href={p.youtubeUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> YouTube
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">{footerText}</p>
          {brand?.supportEmail && (
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-600">
              {brand.supportEmail && (
                <a href={`mailto:${brand.supportEmail}`} className="hover:text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {brand.supportEmail}
                </a>
              )}
              {brand.supportPhone && (
                <a href={`tel:${brand.supportPhone}`} className="hover:text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {brand.supportPhone}
                </a>
              )}
              {brand.website && (
                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Site
                </a>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-500">{message}</p>
    </div>
  );
}
