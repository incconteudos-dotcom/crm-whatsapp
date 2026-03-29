# WhatsApp Refactor — Plano de Sprints

## Sprint 1 — Fundação: SSE + Webhook robusto
- SSE manager para push real-time de mensagens ao frontend
- Webhook handler reescrito (robusto, todos os tipos de mídia, grupos)
- Remoção de polling a cada 3s

## Sprint 2 — Backend: Router limpo + Templates API
- Módulo server/whatsapp/ separado do routers.ts monolítico  
- CRUD de message templates com variáveis
- sendMessage com identificação de usuário e template rendering
- Quick messages por etapa do pipeline

## Sprint 3 — Frontend: Decomposição do WhatsApp.tsx
- client/src/pages/WhatsApp/ como módulo
- ChatList, MessagePanel, ContactPanel, QuickMessageBar separados
- SSE client hook substituindo polling

## Sprint 4 — Templates & Pipeline Context
- UI de templates rápidos com substituição de variáveis
- Botões contextuais por etapa do funil
- Painel de info do contato/lead ao lado da conversa

## Sprint 5 — Automação & Agente
- Fila de automação via cron
- Agente de resposta automática com LLM
- Opt-in/out por conversa
