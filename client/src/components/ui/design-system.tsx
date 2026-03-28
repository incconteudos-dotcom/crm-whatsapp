/**
 * Design System Components
 * Reutilizáveis em todas as páginas do CRM Studio
 */
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground leading-tight truncate">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ElementType;
  trend?: { value: number; label?: string };
  accent?: "default" | "green" | "blue" | "yellow" | "red" | "purple";
  className?: string;
  onClick?: () => void;
}

const accentMap = {
  default: { bg: "bg-muted/40", icon: "bg-muted text-muted-foreground", value: "text-foreground" },
  green:   { bg: "bg-green-500/5",  icon: "bg-green-500/15 text-green-400",  value: "text-green-400" },
  blue:    { bg: "bg-blue-500/5",   icon: "bg-blue-500/15 text-blue-400",    value: "text-blue-400" },
  yellow:  { bg: "bg-yellow-500/5", icon: "bg-yellow-500/15 text-yellow-400", value: "text-yellow-400" },
  red:     { bg: "bg-red-500/5",    icon: "bg-red-500/15 text-red-400",      value: "text-red-400" },
  purple:  { bg: "bg-purple-500/5", icon: "bg-purple-500/15 text-purple-400", value: "text-purple-400" },
};

export function MetricCard({
  title, value, subtitle, icon: Icon, trend, accent = "default", className, onClick,
}: MetricCardProps) {
  const colors = accentMap[accent];
  const TrendIcon = trend
    ? trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus
    : null;
  const trendColor = trend
    ? trend.value > 0 ? "text-green-400" : trend.value < 0 ? "text-red-400" : "text-muted-foreground"
    : "";

  return (
    <div
      className={cn(
        "rounded-xl border border-border p-5 transition-all duration-200",
        colors.bg,
        onClick && "cursor-pointer hover:border-primary/30 hover:shadow-sm",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
          <p className={cn("text-2xl font-bold leading-none", colors.value)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1.5 truncate">{subtitle}</p>
          )}
          {trend && TrendIcon && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span>{trend.value > 0 ? "+" : ""}{trend.value}%{trend.label ? ` ${trend.label}` : ""}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", colors.icon)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
type StatusVariant =
  | "active" | "inactive" | "pending" | "approved" | "rejected"
  | "draft" | "sent" | "signed" | "cancelled"
  | "paid" | "overdue" | "open"
  | "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost"
  | "todo" | "in_progress" | "done"
  | "available" | "in_use" | "maintenance" | "retired"
  | string;

const statusConfig: Record<string, { label: string; className: string }> = {
  // Generic
  active:      { label: "Ativo",      className: "bg-green-500/15 text-green-400 border-green-500/25" },
  inactive:    { label: "Inativo",    className: "bg-gray-500/15 text-gray-400 border-gray-500/25" },
  pending:     { label: "Pendente",   className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
  approved:    { label: "Aprovado",   className: "bg-green-500/15 text-green-400 border-green-500/25" },
  rejected:    { label: "Rejeitado",  className: "bg-red-500/15 text-red-400 border-red-500/25" },
  // Contracts
  draft:       { label: "Rascunho",   className: "bg-gray-500/15 text-gray-400 border-gray-500/25" },
  sent:        { label: "Enviado",    className: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  signed:      { label: "Assinado",   className: "bg-green-500/15 text-green-400 border-green-500/25" },
  cancelled:   { label: "Cancelado",  className: "bg-red-500/15 text-red-400 border-red-500/25" },
  // Invoices
  paid:        { label: "Pago",       className: "bg-green-500/15 text-green-400 border-green-500/25" },
  overdue:     { label: "Vencido",    className: "bg-red-500/15 text-red-400 border-red-500/25" },
  open:        { label: "Em aberto",  className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
  // Pipeline
  new:         { label: "Novo",       className: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  contacted:   { label: "Contactado", className: "bg-purple-500/15 text-purple-400 border-purple-500/25" },
  qualified:   { label: "Qualificado",className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25" },
  proposal:    { label: "Proposta",   className: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
  negotiation: { label: "Negociação", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
  won:         { label: "Ganho",      className: "bg-green-500/15 text-green-400 border-green-500/25" },
  lost:        { label: "Perdido",    className: "bg-red-500/15 text-red-400 border-red-500/25" },
  // Tasks
  todo:        { label: "A fazer",    className: "bg-gray-500/15 text-gray-400 border-gray-500/25" },
  in_progress: { label: "Em andamento",className: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  done:        { label: "Concluído",  className: "bg-green-500/15 text-green-400 border-green-500/25" },
  // Equipment
  available:   { label: "Disponível", className: "bg-green-500/15 text-green-400 border-green-500/25" },
  in_use:      { label: "Em uso",     className: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  maintenance: { label: "Manutenção", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
  retired:     { label: "Aposentado", className: "bg-gray-500/15 text-gray-400 border-gray-500/25" },
};

interface StatusBadgeProps {
  status: StatusVariant;
  customLabel?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, customLabel, size = "md", className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: customLabel ?? status,
    className: "bg-gray-500/15 text-gray-400 border-gray-500/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
        config.className,
        className
      )}
    >
      {customLabel ?? config.label}
    </span>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-muted-foreground/60" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-5">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm" className="gap-2">
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ─── DeleteConfirmDialog ──────────────────────────────────────────────────────
interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName?: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = "Confirmar exclusão",
  description,
  itemName,
  onConfirm,
  loading = false,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {description ?? (
              <>
                Tem certeza que deseja excluir{" "}
                {itemName ? <strong className="text-foreground">"{itemName}"</strong> : "este item"}?{" "}
                Esta ação não pode ser desfeita.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            {loading ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
