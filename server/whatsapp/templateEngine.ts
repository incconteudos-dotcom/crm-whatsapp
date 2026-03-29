/**
 * Message Template Engine
 *
 * Renders message templates replacing {{variable}} placeholders
 * with values from contact, lead, user, and custom context.
 *
 * Variables available:
 * {{nome}}         → contact name (first name)
 * {{nome_completo}} → contact full name
 * {{empresa}}      → contact company
 * {{telefone}}     → contact phone
 * {{etapa}}        → current pipeline stage name
 * {{agente}}       → CRM user sending the message
 * {{data}}         → today's date (dd/mm/yyyy)
 * {{link_proposta}} → custom variable passed at render time
 * {{valor}}        → lead value
 */

export interface TemplateContext {
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  };
  lead?: {
    value?: string | null;
    stage?: string | null;
  };
  user?: {
    name?: string | null;
  };
  custom?: Record<string, string>;
}

/**
 * Renders a template string replacing all {{variable}} tokens.
 */
export function renderTemplate(template: string, ctx: TemplateContext): string {
  const firstName = ctx.contact?.name?.split(" ")[0] ?? "";
  const today = new Date().toLocaleDateString("pt-BR");

  const vars: Record<string, string> = {
    nome: firstName,
    nome_completo: ctx.contact?.name ?? "",
    empresa: ctx.contact?.company ?? "",
    telefone: ctx.contact?.phone ?? "",
    email: ctx.contact?.email ?? "",
    etapa: ctx.lead?.stage ?? "",
    valor: ctx.lead?.value ?? "",
    agente: ctx.user?.name ?? "Equipe",
    data: today,
    ...ctx.custom,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

/**
 * Extract all variable names from a template string.
 */
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

/**
 * Validate that all variables in a template have values in the context.
 * Returns an array of missing variable names.
 */
export function getMissingVariables(template: string, ctx: TemplateContext): string[] {
  const vars = extractVariables(template);
  const rendered = renderTemplate(template, ctx);
  // If any {{var}} still exists in rendered, it's missing
  return vars.filter((v) => rendered.includes(`{{${v}}}`));
}

// ─── Built-in template categories and defaults ────────────────────────────────

export const TEMPLATE_CATEGORIES = [
  { value: "primeiro_contato", label: "🔍 Primeiro Contato" },
  { value: "qualificacao", label: "🎯 Qualificação" },
  { value: "proposta", label: "📋 Proposta" },
  { value: "follow_up", label: "🔄 Follow-up" },
  { value: "fechamento", label: "💰 Fechamento" },
  { value: "onboarding", label: "🚀 Onboarding" },
  { value: "retencao", label: "♻️ Retenção" },
  { value: "cobranca", label: "💳 Cobrança" },
  { value: "nps", label: "⭐ NPS" },
  { value: "geral", label: "💬 Geral" },
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]["value"];

export const DEFAULT_TEMPLATES: Array<{
  name: string;
  category: TemplateCategory;
  content: string;
}> = [
  {
    name: "Boas-vindas",
    category: "primeiro_contato",
    content:
      "Oi, {{nome}}! 😊 Aqui é {{agente}}, do Pátio Estúdios.\n\nFicamos felizes com seu contato! Para eu te ajudar da melhor forma, me conta: o que você quer criar? Podcast, videocast, entrevistas...?\n\nPode ser bem informal aqui mesmo! 🎙️",
  },
  {
    name: "Pergunta sobre preço",
    category: "primeiro_contato",
    content:
      "Oi, {{nome}}! Boa pergunta — vou ser transparente com você 😊\n\nOs valores variam pelo formato e escopo do projeto. Temos pacotes a partir de R$ 497.\n\nMe conta mais sobre o que você quer criar? Com isso te passo um número bem mais preciso.",
  },
  {
    name: "Qualificação inicial",
    category: "qualificacao",
    content:
      "Que legal, {{nome}}! Já estou imaginando o projeto 🎙️\n\nMe conta:\n1️⃣ Qual seria o tema central?\n2️⃣ Sozinho ou com convidados?\n3️⃣ Tem ideia de frequência? (semanal, quinzenal...)",
  },
  {
    name: "Descobrir urgência",
    category: "qualificacao",
    content:
      "Perfeito, {{nome}}! E me ajuda com uma coisa:\n\nVocê tem alguma data em mente para lançar? Ou é algo mais para quando o projeto estiver redondo?\n\nPergunto porque isso me ajuda a montar a proposta certa 😊",
  },
  {
    name: "Envio de proposta",
    category: "proposta",
    content:
      "Oi, {{nome}}! Preparei a proposta personalizada para o seu projeto 🎙️\n\nMontei três opções pensando no que você me contou:\n📦 Start+ → Para começar com qualidade\n🚀 Pro+ → O mais escolhido. Produção completa\n👑 Vip+ → Experiência premium, zero preocupação\n\nEstou enviando o PDF agora. Qual opção chamou mais atenção?",
  },
  {
    name: "Follow-up leve D+2",
    category: "follow_up",
    content:
      "Oi, {{nome}}! Tudo bem? 😊\n\nPassaram alguns dias desde que enviei a proposta e queria saber se você teve chance de olhar.\n\nSurgiu alguma dúvida? Posso adaptar algo para ficar mais dentro do que você precisa.",
  },
  {
    name: "Follow-up com valor D+5",
    category: "follow_up",
    content:
      "Oi, {{nome}}! Aqui é {{agente}} do Pátio Estúdios.\n\nSeparei um case que acho que vai te interessar — um cliente que começou exatamente do mesmo ponto que você e hoje está no 20º episódio.\n\nQuando quiser dar esse próximo passo, a gente está aqui 🎙️",
  },
  {
    name: "Follow-up com urgência D+10",
    category: "follow_up",
    content:
      "Oi, {{nome}}! Não quero encher sua caixa, então vou ser direto 😊\n\nNossa agenda está fechando e estou reservando as últimas vagas do mês.\n\nSe ainda tem interesse, me fala qualquer coisa. Se não for o momento certo, tudo bem! Guardo seu contato.",
  },
  {
    name: "Fechamento — resumo",
    category: "fechamento",
    content:
      "Oi, {{nome}}! Para facilitar a decisão, aqui vai o resumo:\n\n✅ Pacote confirmado\n✅ Gravação: a combinar\n✅ Entrega: conforme proposta\n\nPara confirmar, é só me falar 'fechado' e eu te mando o link de pagamento + contrato 😊",
  },
  {
    name: "Confirmação de fechamento",
    category: "fechamento",
    content:
      "🎉 Fechamos, {{nome}}! Que alegria!\n\nO que acontece agora:\n1️⃣ Link de pagamento em seguida\n2️⃣ Contrato para assinar digitalmente\n3️⃣ Equipe entra em contato para briefing\n\nBem-vindo(a) à família Pátio Estúdios! 🎙️🚀",
  },
  {
    name: "Boas-vindas pós-pagamento",
    category: "onboarding",
    content:
      "Oi, {{nome}}! Aqui é {{agente}}, produtor responsável pelo seu projeto 🎙️\n\nSeja muito bem-vindo(a)!\n\nPara começarmos:\n📋 Nome do programa\n🎯 Público-alvo\n📝 Já tem pauta para a 1ª gravação?\n📅 Data sugerida: a combinar\n\nPode responder aqui mesmo 😊",
  },
  {
    name: "Lembrete D-1 gravação",
    category: "onboarding",
    content:
      "Oi, {{nome}}! Amanhã é o grande dia! 🎉\n\n📍 Local: Pátio Estúdios\n⏰ Chegue 10 minutos antes\n👕 Evite camisas listradas ou brancas\n🎤 Traga sua pauta no celular\n\nQualquer dúvida me chama. Vai arrasar! 🚀",
  },
  {
    name: "NPS — pesquisa de satisfação",
    category: "nps",
    content:
      "Oi, {{nome}}! Como está indo o projeto? 🎉\n\nQuero saber sua opinião honesta sobre a experiência.\n\nEm uma escala de 0 a 10, quanto você recomendaria o Pátio Estúdios para um amigo?\n\n0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟\n\nSua resposta nos ajuda muito! 🙏",
  },
  {
    name: "Solicitação de indicação",
    category: "retencao",
    content:
      "Que lindo, {{nome}}! Fico muito feliz com a sua nota 🥹\n\nVocê conhece alguém que também sonha em ter um podcast profissional?\n\nSe me indicar alguém que fechar, você ganha uma hora de estúdio grátis. Seu amigo também ganha desconto especial!\n\nCombinado? 😊",
  },
  {
    name: "Upsell — cortes para redes",
    category: "retencao",
    content:
      "Oi, {{nome}}! Tenho uma novidade que vai te interessar.\n\nLançamos os cortes para redes sociais — pegamos os melhores trechos e entregamos 5 Reels prontos.\n\nClientes que adicionaram esse serviço viram o engajamento dobrar nas primeiras 4 semanas.\n\nPosso incluir no seu próximo episódio com condição especial de cliente? 🎬",
  },
  {
    name: "Cobrança suave",
    category: "cobranca",
    content:
      "Oi, {{nome}}! Tudo bem? 😊\n\nPassando para avisar que a fatura de {{data}} ainda está em aberto.\n\nSe precisar de qualquer ajuste ou tiver alguma dúvida, estou aqui para ajudar.",
  },
];
