import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Palette, Building2, Globe, Phone, Mail, FileText, Eye, Loader2, Save } from "lucide-react";

export default function BrandSettings() {
  const { data: brand, isLoading, refetch } = trpc.brand.get.useQuery();

  const [form, setForm] = useState({
    companyName: "",
    logoUrl: "",
    primaryColor: "#7c3aed",
    accentColor: "#a78bfa",
    tagline: "",
    website: "",
    supportEmail: "",
    supportPhone: "",
    footerText: "",
  });

  useEffect(() => {
    if (brand) {
      setForm({
        companyName: brand.companyName ?? "",
        logoUrl: brand.logoUrl ?? "",
        primaryColor: brand.primaryColor ?? "#7c3aed",
        accentColor: brand.accentColor ?? "#a78bfa",
        tagline: brand.tagline ?? "",
        website: brand.website ?? "",
        supportEmail: brand.supportEmail ?? "",
        supportPhone: brand.supportPhone ?? "",
        footerText: brand.footerText ?? "",
      });
    }
  }, [brand]);

  const updateMutation = trpc.brand.update.useMutation({
    onSuccess: () => {
      toast.success("Identidade visual salva com sucesso!");
      refetch();
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const field = (key: keyof typeof form, label: string, icon: any, placeholder?: string, type?: string) => (
    <div className="space-y-1.5">
      <Label className="text-slate-300 flex items-center gap-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </Label>
      <Input
        type={type ?? "text"}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
      />
    </div>
  );

  return (
    <CRMLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Palette className="w-6 h-6 text-violet-400" /> Identidade Visual do Portal
          </h1>
          <p className="text-slate-400 mt-1">
            Configure a aparência do Portal do Cliente — logo, cores e informações de contato.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Company Info */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-violet-400" /> Empresa
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Nome e identidade da empresa exibidos no portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {field("companyName", "Nome da Empresa", null, "Pátio Estúdio de Podcast")}
                {field("tagline", "Slogan / Tagline", null, "Seu estúdio de podcast profissional")}
                {field("logoUrl", "URL do Logo", null, "https://cdn.exemplo.com/logo.png")}
              </CardContent>
            </Card>

            {/* Colors */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-violet-400" /> Cores
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Cores principais usadas no portal do cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Cor Principal</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
                      />
                      <Input
                        value={form.primaryColor}
                        onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                        placeholder="#7c3aed"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Cor de Destaque</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.accentColor}
                        onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent"
                      />
                      <Input
                        value={form.accentColor}
                        onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                        placeholder="#a78bfa"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-lg overflow-hidden border border-slate-700">
                  <div className="p-3 text-xs text-slate-400 bg-slate-800 border-b border-slate-700">Preview do cabeçalho do portal</div>
                  <div className="p-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0f0a1e, #1a0f2e)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: form.primaryColor }}>
                        {(form.companyName || "P")[0]}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{form.companyName || "Pátio Estúdio"}</p>
                        <p className="text-xs" style={{ color: form.accentColor }}>{form.tagline || "Portal do Cliente"}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded text-xs text-white" style={{ background: form.primaryColor }}>
                      Botão
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-violet-400" /> Contato e Rodapé
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Informações de suporte exibidas no rodapé do portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {field("website", "Site", <Globe className="w-4 h-4" />, "https://patioestudio.com.br")}
                {field("supportEmail", "Email de Suporte", <Mail className="w-4 h-4" />, "contato@patioestudio.com.br")}
                {field("supportPhone", "Telefone de Suporte", <Phone className="w-4 h-4" />, "(11) 99999-9999")}
                {field("footerText", "Texto do Rodapé", <FileText className="w-4 h-4" />, `© ${new Date().getFullYear()} Pátio Estúdio. Todos os direitos reservados.`)}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Salvar Configurações</>
                )}
              </Button>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => window.open(`/portal/client/preview`, "_blank")}
              >
                <Eye className="w-4 h-4 mr-2" /> Visualizar Portal
              </Button>
            </div>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
