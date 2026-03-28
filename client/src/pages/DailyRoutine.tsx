import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardList, RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  analista: "Analista",
  assistente: "Assistente",
};

const roleColors: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  gerente: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  analista: "bg-green-500/20 text-green-300 border-green-500/30",
  assistente: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

export default function DailyRoutine() {
  const { data: routineData, refetch, isLoading } = trpc.routines.today.useQuery();
  const utils = trpc.useUtils();

  const toggleMutation = trpc.routines.toggleItem.useMutation({
    onMutate: async ({ templateId, completed }) => {
      await utils.routines.today.cancel();
      const prev = utils.routines.today.getData();
      utils.routines.today.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          completedItems: completed
            ? [...old.completedItems, templateId]
            : old.completedItems.filter((id: number) => id !== templateId),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.routines.today.setData(undefined, ctx.prev);
    },
    onSettled: () => utils.routines.today.invalidate(),
  });

  const templates = routineData?.templates ?? [];
  const completedItems = routineData?.completedItems ?? [];
  const completedCount = templates.filter((t) => completedItems.includes(t.id)).length;
  const total = templates.length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const allDone = total > 0 && completedCount === total;

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <CRMLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              Rotina Diária
            </h1>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{today}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Progress Card */}
        <Card className={allDone ? "border-green-500/50 bg-green-500/5" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {allDone ? (
                  <Trophy className="h-5 w-5 text-yellow-400" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
                <span className="font-medium text-foreground">
                  {allDone ? "Rotina completa! 🎉" : `${completedCount} de ${total} tarefas concluídas`}
                </span>
              </div>
              <span className="text-2xl font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {allDone && (
              <p className="text-sm text-green-400 mt-2 text-center">
                Parabéns! Você completou todas as tarefas do dia.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Tarefas de Hoje
              {routineData && (
                <Badge variant="outline" className={roleColors[routineData.templates[0]?.role ?? "assistente"] ?? ""}>
                  {roleLabels[routineData.templates[0]?.role ?? "assistente"] ?? ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Nenhuma rotina configurada para seu cargo.</p>
                <p className="text-xs mt-1">Um administrador pode configurar rotinas em Configurações.</p>
              </div>
            ) : (
              templates.map((template) => {
                const isCompleted = completedItems.includes(template.id);
                return (
                  <div
                    key={template.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      isCompleted
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-card border-border hover:bg-muted/30"
                    }`}
                    onClick={() =>
                      toggleMutation.mutate({ templateId: template.id, completed: !isCompleted })
                    }
                  >
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ templateId: template.id, completed: !!checked })
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {template.title}
                      </p>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                      )}
                    </div>
                    {isCompleted && (
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Tip */}
        <p className="text-xs text-muted-foreground text-center">
          Seu progresso é salvo automaticamente. A lista reinicia todo dia.
        </p>
      </div>
    </CRMLayout>
  );
}
