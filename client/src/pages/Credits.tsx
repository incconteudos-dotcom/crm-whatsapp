import { useState } from "react";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Wallet, TrendingUp, TrendingDown, Gift, RefreshCw, ChevronRight } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; sign: string }> = {
  credit:  { label: "Crédito",    icon: <TrendingUp className="w-4 h-4" />,   color: "text-green-400",  sign: "+" },
  debit:   { label: "Débito",     icon: <TrendingDown className="w-4 h-4" />, color: "text-red-400",    sign: "-" },
  bonus:   { label: "Bônus",      icon: <Gift className="w-4 h-4" />,         color: "text-yellow-400", sign: "+" },
  refund:  { label: "Reembolso",  icon: <RefreshCw className="w-4 h-4" />,    color: "text-blue-400",   sign: "+" },
};

export default function Credits() {
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ type: "credit" as "credit"|"debit"|"bonus"|"refund", amount: "", description: "" });

  const utils = trpc.useUtils();
  const { data: contacts = [] } = trpc.contacts.list.useQuery({});
  const { data: balance } = trpc.credits.balance.useQuery(
    { contactId: selectedContact! }, { enabled: !!selectedContact }
  );
  const { data: history = [] } = trpc.credits.history.useQuery(
    { contactId: selectedContact! }, { enabled: !!selectedContact }
  );

  const addMutation = trpc.credits.add.useMutation({
    onSuccess: () => {
      utils.credits.balance.invalidate();
      utils.credits.history.invalidate();
      setShowAdd(false);
      setAddForm({ type: "credit", amount: "", description: "" });
      toast.success("Transação registrada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredContacts = contacts.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedContactData = contacts.find(c => c.id === selectedContact);

  return (
    <CRMLayout>
      <div className="p-6 h-full flex gap-6">
        {/* Left: Contact list */}
        <div className="w-72 flex-shrink-0 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-white">Créditos</h1>
            <p className="text-xs text-gray-400 mt-0.5">Saldo por cliente</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente..." className="pl-9 bg-gray-800 border-gray-700 text-white text-sm" />
          </div>
          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
            {filteredContacts.map(c => (
              <button key={c.id} onClick={() => setSelectedContact(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${selectedContact === c.id ? "bg-indigo-600/20 border border-indigo-500/30" : "hover:bg-gray-800"}`}>
                <div>
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  {c.company && <p className="text-xs text-gray-400">{c.company}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Credit detail */}
        <div className="flex-1 space-y-6">
          {!selectedContact ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Wallet className="w-16 h-16 text-gray-600 mx-auto" />
                <p className="text-gray-400">Selecione um cliente para ver o saldo</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedContactData?.name}</h2>
                  <p className="text-sm text-gray-400">{selectedContactData?.company}</p>
                </div>
                <Button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" /> Nova Transação
                </Button>
              </div>

              {/* Balance card */}
              <Card className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-indigo-500/30">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Saldo Disponível</p>
                    <p className={`text-4xl font-bold mt-1 ${(balance ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      R$ {(balance ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Wallet className="w-12 h-12 text-indigo-400 opacity-50" />
                </CardContent>
              </Card>

              {/* History */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Histórico de Transações</h3>
                {history.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>Nenhuma transação registrada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map(tx => {
                      const cfg = TYPE_CONFIG[tx.type];
                      return (
                        <div key={tx.id} className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-gray-700 ${cfg.color}`}>
                              {cfg.icon}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{tx.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge className="text-xs bg-gray-700 text-gray-300 border-0">{cfg.label}</Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(tx.createdAt).toLocaleDateString("pt-BR")} às {new Date(tx.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${cfg.color}`}>
                              {cfg.sign} R$ {parseFloat(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500">
                              Saldo: R$ {parseFloat(tx.balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-400" /> Nova Transação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Tipo de Transação</Label>
              <Select value={addForm.type} onValueChange={v => setAddForm(f => ({ ...f, type: v as typeof addForm.type }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <span className={v.color}>{v.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Valor (R$)</Label>
              <Input value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                type="number" step="0.01" min="0" placeholder="0,00" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Descrição *</Label>
              <Input value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Crédito por sessão cancelada" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            {addForm.type === "debit" && balance !== undefined && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-xs text-yellow-400">
                  Saldo atual: R$ {(balance ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  {parseFloat(addForm.amount || "0") > (balance ?? 0) && (
                    <span className="text-red-400 ml-2">⚠ Saldo insuficiente</span>
                  )}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="border-gray-600 text-gray-300">Cancelar</Button>
            <Button onClick={() => {
              if (!addForm.amount || !addForm.description) return toast.error("Preencha todos os campos");
              addMutation.mutate({ contactId: selectedContact!, ...addForm });
            }} disabled={addMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {addMutation.isPending ? "Registrando..." : "Registrar Transação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CRMLayout>
  );
}
