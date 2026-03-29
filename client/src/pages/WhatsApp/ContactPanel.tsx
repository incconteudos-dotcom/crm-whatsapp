/**
 * ContactPanel — Painel direito com contexto do contato/lead da conversa ativa.
 *
 * Mostra:
 * - Informações do contato (nome, telefone, email, empresa, tags)
 * - Lead ativo + etapa do pipeline com botões de avanço
 * - Botão para abrir perfil completo e criar lead
 * - Notas rápidas do contato
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  User, Phone, Mail, Building2, ExternalLink,
  Loader2, Star, AlertCircle, ChevronRight,
  Tag, FileText, ArrowRight, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface ContactPanelProps {
  chatJid: string | null;
  contactId?: number | null;
  leadId?: number | null;
  className?: string;
}

const STAGE_COLORS: Record<string, string> = {
  "Prospecção": "bg-slate-400",
  "Qualificação": "bg-blue-500",
  "Proposta": "bg-yellow-500",
  "Negociação": "bg-orange-500",
  "Fechamento": "bg-green-500",
  "Cliente": "bg-emerald-600",
};

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={cn("rounded-full bg-green-600 flex items-center justify-center text-white font-bold shrink-0", sz)}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export function ContactPanel({ chatJid, contactId, leadId: leadIdProp, className }: ContactPanelProps) {
  const [, navigate] = useLocation();
  const [advancingStage, setAdvancingStage] = useState(false);

  const phone = chatJid?.split("@")[0] ?? "";

  // ── Contact ───────────────────────────────────────────────────────────────
  const { data: contact, isLoading: contactLoading, refetch: refetchContact } =
    trpc.contacts.get.useQuery({ id: contactId! }, { enabled: !!contactId });

  // ── Pipeline ──────────────────────────────────────────────────────────────
  const { data: stages = [] } = trpc.pipeline.stages.useQuery();

  // If we have a leadId prop use it; otherwise find the open lead for the contact
  const { data: leadsForContact = [] } = trpc.pipeline.leads.useQuery(
    { status: "open" },
    { enabled: !!contactId }
  );

  const activeLead = leadsForContact.find(
    (l: { contactId?: number | null; id: number }) => l.contactId === contactId
  );
  const leadId = leadIdProp ?? activeLead?.id;

  const { data: lead, refetch: refetchLead } = trpc.pipeline.getLead.useQuery(
    { id: leadId! },
    { enabled: !!leadId }
  );

  const currentStage = stages.find((s: { id: number }) => s.id === lead?.stageId);
  const currentStageIdx = stages.findIndex((s: { id: number }) => s.id === lead?.stageId);
  const nextStage = stages[currentStageIdx + 1];

  const updateLeadMutation = trpc.pipeline.updateLead.useMutation({
    onSuccess: () => { refetchLead(); toast.success("Etapa avançada!"); setAdvancingStage(false); },
    onError: (e) => { toast.error(e.message); setAdvancingStage(false); },
  });

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!chatJid) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full text-center px-4", className)}>
        <User className="w-10 h-10 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Selecione uma conversa.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full border-l border-border bg-card overflow-y-auto text-sm", className)}>
      {/* Header */}
      <div className="p-3 border-b border-border shrink-0">
        <p className="font-semibold text-foreground text-sm">Contexto do Contato</p>
      </div>

      <div className="flex-1 p-3 space-y-4 overflow-y-auto">

        {/* Phone */}
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span className="text-xs text-muted-foreground">+{phone}</span>
        </div>

        {/* Contact card */}
        {contactLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Carregando...</span>
          </div>
        ) : contact ? (
          <div className="space-y-2.5">
            {/* Name + link */}
            <div className="flex items-center gap-2">
              <Avatar name={contact.name} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{contact.name}</p>
                {contact.company && (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Building2 className="w-3 h-3 shrink-0" />{contact.company}
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate(`/contacts/${contact.id}`)}
                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Abrir perfil completo"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Email */}
            {contact.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}

            {/* Tags */}
            {Array.isArray(contact.tags) && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(contact.tags as string[]).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 h-5">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Notes preview */}
            {contact.notes && (
              <div className="bg-muted/50 rounded-lg p-2 text-xs text-muted-foreground line-clamp-3">
                <FileText className="w-3 h-3 inline mr-1" />
                {contact.notes}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-3 text-center space-y-2">
            <AlertCircle className="w-5 h-5 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Número não encontrado no CRM.</p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs w-full"
              onClick={() => navigate(`/contacts?phone=${phone}`)}
            >
              Criar contato
            </Button>
          </div>
        )}

        <Separator />

        {/* Pipeline / Lead */}
        {lead ? (
          <div className="space-y-3">
            {/* Lead header */}
            <div className="flex items-start gap-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Lead #{lead.id}</p>
                <p className="font-medium text-foreground text-sm leading-snug line-clamp-2">{lead.title}</p>
              </div>
              <button
                onClick={() => navigate(`/pipeline`)}
                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                title="Ver no pipeline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Value */}
            {lead.value && (
              <p className="text-xs text-muted-foreground">
                Valor:{" "}
                <span className="text-foreground font-semibold">
                  {Number(lead.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </p>
            )}

            {/* Current stage */}
            {currentStage && (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    STAGE_COLORS[currentStage.name] ?? "bg-gray-400"
                  )}
                />
                <span className="text-xs font-medium text-foreground">{currentStage.name}</span>
              </div>
            )}

            {/* Stage pipeline progress */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Funil:</p>
              <div className="flex flex-col gap-1">
                {stages.map((stage: { id: number; name: string }, idx: number) => {
                  const isCurrent = stage.id === lead.stageId;
                  const isPast = idx < currentStageIdx;
                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors",
                        isCurrent
                          ? "bg-green-600/15 text-green-600 font-semibold"
                          : isPast
                          ? "text-muted-foreground/60"
                          : "text-muted-foreground"
                      )}
                    >
                      <CircleDot className={cn("w-3 h-3 shrink-0", isCurrent ? "text-green-500" : "text-muted-foreground/40")} />
                      {stage.name}
                      {isCurrent && <span className="ml-auto text-xs opacity-60">← atual</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Advance stage button */}
            {nextStage && (
              <Button
                size="sm"
                className="w-full h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
                disabled={advancingStage || updateLeadMutation.isPending}
                onClick={() => {
                  setAdvancingStage(true);
                  updateLeadMutation.mutate({ id: lead.id, stageId: nextStage.id });
                }}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Avançar para {nextStage.name}
              </Button>
            )}

            {lead.status === "open" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs text-green-600 border-green-600/30 hover:bg-green-600/10"
                  onClick={() => updateLeadMutation.mutate({ id: lead.id, status: "won" })}
                >
                  ✓ Ganho
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => updateLeadMutation.mutate({ id: lead.id, status: "lost" })}
                >
                  ✗ Perdido
                </Button>
              </div>
            )}
          </div>
        ) : contact ? (
          <div className="rounded-lg border border-dashed border-border p-3 text-center space-y-2">
            <Star className="w-5 h-5 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Nenhum lead ativo.</p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs w-full"
              onClick={() => navigate(`/pipeline`)}
            >
              <ChevronRight className="w-3.5 h-3.5 mr-1" />
              Criar lead
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
