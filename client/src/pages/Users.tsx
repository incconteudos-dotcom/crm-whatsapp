import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Shield, CheckCircle, XCircle, MessageSquare, Crown, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";

const roleColors: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  gerente: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  analista: "bg-green-500/20 text-green-400 border-green-500/30",
  assistente: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  user: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  analista: "Analista",
  assistente: "Assistente",
  user: "Usuário",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  active: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Aguardando",
  active: "Ativo",
  rejected: "Rejeitado",
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data: allUsers, isLoading } = trpc.users.list.useQuery();
  const { data: pendingUsers } = trpc.users.pending.useQuery();

  const approveMutation = trpc.users.approve.useMutation({
    onSuccess: () => { toast.success("Usuário aprovado!"); utils.users.list.invalidate(); utils.users.pending.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.users.reject.useMutation({
    onSuccess: () => { toast.success("Usuário rejeitado."); utils.users.list.invalidate(); utils.users.pending.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => { toast.success("Função atualizada!"); utils.users.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateWhatsappMutation = trpc.users.updateWhatsappAccess.useMutation({
    onSuccess: () => { toast.success("Acesso WhatsApp atualizado!"); utils.users.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const isAdmin = currentUser?.role === "admin";
  const [createOpen, setCreateOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: "", email: "", role: "assistente" as "admin" | "gerente" | "analista" | "assistente", whatsappAccess: false });

  const createByAdminMutation = trpc.users.createByAdmin.useMutation({
    onSuccess: () => {
      toast.success("Usuário cadastrado com sucesso!");
      setCreateOpen(false);
      setNewUserForm({ name: "", email: "", role: "assistente", whatsappAccess: false });
      utils.users.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <CRMLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold text-foreground">Gestão de Usuários</h1>
            {(pendingUsers?.length ?? 0) > 0 && (
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingUsers?.length} pendente(s)
              </span>
            )}
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Cadastrar Usuário
            </Button>
          )}
        </div>

        {/* Pending approvals */}
        {pendingUsers && pendingUsers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              Aguardando Aprovação ({pendingUsers.length})
            </h2>
            <div className="space-y-2">
              {pendingUsers.map((user) => (
                <div key={user.id} className="bg-card border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-yellow-400">
                        {(user.name ?? "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{user.name ?? "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{user.email ?? user.openId}</p>
                      <p className="text-xs text-muted-foreground">
                        Solicitado {format(new Date(user.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ userId: user.id })}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => rejectMutation.mutate({ userId: user.id })}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All users */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Todos os Usuários ({allUsers?.length ?? 0})</h2>
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {allUsers?.map((user) => (
                <div key={user.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {(user.name ?? "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{user.name ?? "Sem nome"}</p>
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-muted-foreground">(você)</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email ?? user.openId}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Status */}
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColors[user.status ?? "active"])}>
                        {statusLabels[user.status ?? "active"]}
                      </span>

                      {/* WhatsApp access toggle */}
                      <button
                        onClick={() => updateWhatsappMutation.mutate({ userId: user.id, access: !user.whatsappAccess })}
                        disabled={user.id === currentUser?.id || !isAdmin}
                        className={cn(
                          "flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-colors",
                          user.whatsappAccess || ["admin", "gerente"].includes(user.role ?? "")
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30",
                          (!isAdmin || user.id === currentUser?.id) && "opacity-50 cursor-not-allowed"
                        )}
                        title={["admin", "gerente"].includes(user.role ?? "") ? "Acesso automático por função" : "Clique para alternar acesso WhatsApp"}
                      >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </button>

                      {/* Role selector */}
                      {isAdmin && user.id !== currentUser?.id ? (
                        <Select
                          value={user.role ?? "assistente"}
                          onValueChange={(v) => updateRoleMutation.mutate({ userId: user.id, role: v as any })}
                        >
                          <SelectTrigger className={cn("h-7 text-xs w-36 border", roleColors[user.role ?? "assistente"])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="gerente">Gerente</SelectItem>
                            <SelectItem value="analista">Analista</SelectItem>
                            <SelectItem value="assistente">Assistente</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={cn("text-xs px-2 py-1 rounded-lg border", roleColors[user.role ?? "assistente"])}>
                          {roleLabels[user.role ?? "assistente"]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Modal de Cadastro pelo Admin */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>Cadastrar Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome completo *</Label>
              <Input value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })} placeholder="Nome do usuário" className="mt-1.5 bg-input border-border" />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} placeholder="email@empresa.com" className="mt-1.5 bg-input border-border" />
            </div>
            <div>
              <Label>Função</Label>
              <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v as typeof newUserForm.role })}>
                <SelectTrigger className="mt-1.5 bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="analista">Analista</SelectItem>
                  <SelectItem value="assistente">Assistente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="whatsappAccess"
                checked={newUserForm.whatsappAccess}
                onChange={(e) => setNewUserForm({ ...newUserForm, whatsappAccess: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <Label htmlFor="whatsappAccess" className="cursor-pointer">Liberar acesso ao WhatsApp</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createByAdminMutation.mutate(newUserForm)}
              disabled={!newUserForm.name.trim() || !newUserForm.email.trim() || createByAdminMutation.isPending}
            >
              {createByAdminMutation.isPending ? "Cadastrando..." : "Cadastrar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
