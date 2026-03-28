# CRM WhatsApp - TODO

## Banco de Dados / Schema
- [x] Tabela users estendida com role (admin, gerente, analista, assistente), status (pending, active, rejected), email
- [x] Tabela contacts (contatos/leads com histórico)
- [x] Tabela leads (pipeline, estágio, valor, responsável)
- [x] Tabela pipeline_stages (estágios personalizáveis)
- [x] Tabela whatsapp_chats (conversas WhatsApp sincronizadas)
- [x] Tabela whatsapp_messages (mensagens com identificação de usuário)
- [x] Tabela contracts (contratos com status, assinatura)
- [x] Tabela invoices (faturas)
- [x] Tabela quotes (orçamentos)
- [x] Tabela studio_bookings (agendamentos de estúdio)
- [x] Tabela tasks (tarefas)
- [x] Tabela activities (log de atividades)

## Autenticação e Roles
- [x] Login via OAuth com aprovação pendente para novos usuários
- [x] Tela de aguardando aprovação
- [x] Tela de acesso negado
- [x] Painel de aprovação de usuários (admin/gerente)
- [x] Sistema de roles: Administrador, Gerente, Analista, Assistente
- [x] Permissões diferenciadas por role (adminProcedure, managerProcedure, whatsappProcedure)
- [x] Configuração de acesso ao WhatsApp por role (admin/gerente automático)

## Layout e Navegação
- [x] CRMLayout com sidebar colapsável persistente
- [x] Sidebar com todos os módulos e ícones
- [x] Badge de role no perfil do usuário
- [x] Tema escuro profissional (OKLCH)
- [x] Página Home pública com landing page

## Dashboard Principal
- [x] Cards de métricas (contatos, leads, receita, tarefas)
- [x] Lista de atividades recentes
- [x] Acesso rápido aos módulos
- [x] Notificação de usuários pendentes

## Módulo WhatsApp
- [x] Interface de chat similar ao Claude
- [x] Lista de conversas (chats) com busca
- [x] Visualização de mensagens com identificação [nome_usuario]:
- [x] Campo de envio de mensagem com prefixo automático
- [x] Análise de conversas por IA (resumo, sentimento, oportunidades, ações)
- [x] Controle de acesso por role/permissão
- [ ] Integração real com MCP WhatsApp (requer servidor MCP instalado)
- [ ] Sincronização automática de contatos WhatsApp com CRM
- [ ] Suporte a mídia (imagens, documentos, áudio)

## Módulo de Contatos e Leads
- [x] Lista de contatos com busca e filtros
- [x] Criação e edição de contatos
- [x] Campos: nome, email, telefone, WhatsApp JID, empresa, cargo, notas, tags, fonte
- [x] Exclusão (apenas gerente/admin)
- [ ] Perfil completo do contato com histórico de interações
- [ ] Importação de contatos via CSV

## Pipeline de Vendas
- [x] Visualização Kanban por estágio
- [x] Estágios padrão: Prospecção, Qualificação, Proposta, Negociação, Fechamento
- [x] Criação e movimentação de leads
- [x] Status: aberto, ganho, perdido
- [x] Valor e probabilidade por lead
- [ ] Drag-and-drop nativo entre colunas
- [ ] Filtros avançados por responsável, período, valor

## Módulo de Contratos
- [x] Lista de contratos com status
- [x] Geração de contrato por IA
- [x] Campos: título, conteúdo, valor, signatário, prazo
- [x] Status: rascunho, enviado, assinado, cancelado
- [ ] Armazenamento de PDF em S3
- [ ] Assinatura digital via DocuSign/similar
- [ ] Envio por WhatsApp/e-mail

## Módulo Financeiro
- [x] Geração de faturas com itens e total
- [x] Numeração automática (FAT-XXXXXXXX)
- [x] Status de faturas: rascunho, enviada, paga, vencida, cancelada
- [x] Geração de orçamentos com desconto
- [x] Numeração automática (ORC-XXXXXXXX)
- [x] Status de orçamentos: rascunho, enviado, aceito, recusado, expirado
- [ ] Integração Stripe para cobrança online
- [x] Geração de PDF de faturas e orçamentos
- [ ] Envio de link de pagamento por WhatsApp

## Agendamento de Estúdio
- [x] Calendário visual mensal
- [x] Criação de agendamentos
- [x] Tipos de sessão (gravação, mixagem, masterização, ensaio, outro)
- [x] Status: agendado, confirmado, em andamento, concluído, cancelado
- [x] Lista de próximas sessões
- [ ] Notificação por WhatsApp
- [ ] Gestão de conflitos de horário

## Tarefas
- [x] Lista de tarefas com prioridade
- [x] Filtro "Minhas Tarefas"
- [x] Prioridades: baixa, média, alta, urgente
- [x] Status: pendente, em andamento, concluída, cancelada
- [x] Prazo com data

## Analytics e Relatórios
- [x] KPIs: contatos, leads, pipeline, taxa de conversão
- [x] Gráfico de leads por estágio (BarChart)
- [x] Gráfico de status de faturas (PieChart)
- [x] Gráfico de sessões de estúdio por tipo
- [ ] Relatório de conversas WhatsApp
- [ ] Exportação de dados (CSV/Excel)

## Testes
- [x] Testes de autenticação (auth.logout.test.ts)
- [x] Testes de roles e permissões (crm.test.ts)
- [x] Testes de contatos, pipeline, WhatsApp, faturas (15 testes passando)

## Sprint 1 — Stripe e Financeiro
- [x] Adicionar stripe_customer_id e stripe_payment_intent_id ao schema
- [x] Criar arquivo server/stripe/products.ts com catálogo de produtos
- [x] Endpoint de checkout Stripe para faturas (avulso e 50%/50%)
- [x] Webhook /api/stripe/webhook para confirmar pagamentos
- [x] Página /payments com histórico de pagamentos por usuário
- [x] Botão "Pagar fatura" nas páginas de Faturas e Orçamentos
- [x] Suporte a plano 50%/50% com 2 links de pagamento separados

## Bugs
- [x] Corrigir erro de login ao tentar acessar o CRM (colunas status/whatsappAccess/role faltando no banco - migration aplicada, 13 tabelas criadas)

## Fases Seguintes (Planejadas)
- [ ] Integração real com WhatsApp MCP
- [x] Integração Stripe para pagamentos
- [x] Geração de PDF de faturas e orçamentos
- [ ] Assinatura digital de contratos
- [ ] Notificações por e-mail
- [ ] Importação de contatos via CSV
- [ ] Portal do Cliente (Sprint 10)

## Auditoria e Correções Críticas
- [x] Mapear e corrigir todos os erros de API no frontend (procedures inexistentes)
- [x] Remover/substituir todos os dados mockados por chamadas reais ao backend
- [x] Corrigir chamadas tRPC com nomes de procedure incorretos
- [x] Corrigir tipos TypeScript incompatíveis entre frontend e backend

## Novas Funcionalidades (Sprint Atual)
- [x] Tarefas: adicionar campo responsável (usuário do sistema)
- [x] Usuários: cadastro de novo usuário pelo admin (sem OAuth)
- [x] Página de Configurações funcional (perfil, estúdio, notificações)
- [x] Envio de fatura em PDF por WhatsApp e email
- [x] Envio de orçamento em PDF por WhatsApp e email
- [x] Envio de contrato em PDF por WhatsApp e email
- [x] PDF com design/identidade visual da empresa (template HTML em S3)

## Correção: Contexto Podcast (não musical)
- [ ] Corrigir tipos de contrato: remover referências musicais, usar tipos de podcast
- [ ] Corrigir tipos de sessão de estúdio: remover "mixagem musical", usar termos de podcast
- [ ] Corrigir textos, labels e placeholders com referências a música/artista/musical
- [ ] Atualizar enum contractType no schema e banco de dados
- [ ] Atualizar enum sessionType no schema e banco de dados

## Sprint Brevo Email (Atual)
- [x] Instalar SDK @getbrevo/brevo v5
- [x] Criar server/email.ts com buildInvoiceEmail, buildQuoteEmail, buildContractEmail (templates HTML profissionais)
- [x] Criar funções sendInvoiceEmail, sendQuoteEmail, sendContractEmail via Brevo API
- [x] Atualizar documents.sendByEmail no router para usar Brevo real (não stub)
- [x] Adicionar botão "Enviar por Email" com modal na página de Faturas
- [x] Adicionar botão "Email" com modal na página de Orçamentos
- [x] Adicionar botão "Email" com modal na página de Contratos
- [x] Testes unitários para templates de email (8 testes passando)

## Sprint Z-API WhatsApp
- [x] Configurar secrets ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN
- [x] Criar server/zapi.ts com cliente Z-API (sendText, sendDocument, getInstanceStatus, getChats)
- [x] Atualizar documents.sendByWhatsApp para usar Z-API real (texto + documento)
- [x] Atualizar whatsapp.sendMessage para enviar via Z-API real
- [x] Atualizar whatsapp.syncChats para buscar conversas reais via Z-API
- [x] Expor whatsapp.instanceStatus para verificar conexão em tempo real
- [x] Exibir badge Online/Offline na página WhatsApp (polling a cada 30s)
- [x] Webhook Z-API em /api/zapi/webhook para receber mensagens em tempo real
- [x] Sincronizar conversas e mensagens recebidas via webhook no banco
- [x] Testes unitários do webhook Z-API (6 testes passando, total 29 testes)

## Bugs Ativos
- [x] syncChats: jid inserido como null — corrigido mapeamento ZApiChatRaw (lastMessageTime, messagesUnread como strings) e adicionado filtro .filter(c => !!c.phone)

## Sprint 2 — Email Brevo + Relacionamentos
- [x] Diagnosticar e corrigir envio de email via Brevo (teste confirmado: email enviado com sucesso)
- [x] Adicionar campo contactId nas tabelas (já existia no schema)
- [x] UI de criação de lead com seleção de contato (dropdown com busca)
- [x] Preencher título do lead automaticamente ao selecionar contato
- [x] Adicionar função getContactProfile (visão 360°) no db.ts
- [x] Adicionar procedure contacts.getProfile no router

## Sprint 3 — Perfil do Cliente
- [x] Página /contacts/:id com resumo completo do cliente
- [x] Seções: leads, faturas, orçamentos, contratos, agendamentos
- [x] Cards de métricas: leads abertos, faturas, receita total, agendamentos
- [x] Botões de ação: WhatsApp, Email, Novo Lead, Nova Fatura, Novo Orçamento, Novo Contrato
- [x] Link "Ver Perfil Completo" no DropdownMenu da página de Contatos
- [x] Registrar rota /contacts/:id no App.tsx

## Sprint 4 — Contexto Podcast + Configurações
- [x] Tipos de contrato para podcast já corretos na UI (Produção de Podcast, Gravação de Episódios, Edição e Pós-Produção)
- [x] Tipos de sessão de estúdio já corretos (Gravação de Podcast, Edição de Áudio, Pós-Produção, Revisão de Episódio)
- [x] Aba "Pagamento" adicionada nas Configurações com instruções Stripe e modo teste

## Sprint 5 — WhatsApp Avançado
- [x] Badge Online/Offline já implementado (polling 30s)
- [x] Webhook Z-API já vincula mensagens ao chat no banco
- [ ] Badge de mensagens não lidas no sidebar (próxima sprint)
- [ ] Vincular chat ao contato automaticamente (cruzar número)
- [ ] Notificação WhatsApp automática ao confirmar agendamento

## Correções Críticas de UX (Sprint Correção)
- [x] Card de contato inteiramente clicável → abre /contacts/:id
- [x] Botão WhatsApp no perfil → redireciona para /whatsapp?phone=NUMERO (módulo interno Z-API)
- [x] Botão Email no perfil → abre modal interno de composição com Brevo (não mailto:)
- [ ] Botão Novo Lead → navega com ?newLead=1&contactId=X&contactName=Y e abre modal pré-preenchido
- [ ] Botão Nova Fatura → navega com ?newInvoice=1&contactId=X e abre modal pré-preenchido
- [ ] Botão Novo Orçamento → navega com ?newQuote=1&contactId=X e abre modal pré-preenchido
- [ ] Botão Novo Contrato → navega com ?newContract=1&contactId=X e abre modal pré-preenchido
- [ ] Adicionar campo de contato nos forms de criação de Faturas e Orçamentos
- [ ] Pré-preencher email/telefone nos modais de envio por email/WhatsApp com dados do contato vinculado
- [ ] Redesenhar perfil do cliente: layout duas colunas, sidebar com dados, tabs para entidades
- [ ] Badge de não lidos no sidebar do WhatsApp
- [ ] Vincular chats Z-API ao contato automaticamente (cruzar número)
- [ ] Notificação WhatsApp automática ao confirmar agendamento

## Melhorias Orçamentos e Faturas (Sprint Atual)
- [ ] Quotes: email pré-preenchido com email do contato vinculado ao orçamento
- [ ] Quotes: card clicável abre drawer/sheet de detalhe completo (itens, status, ações)
- [ ] Quotes: drawer com botões Enviar Email, Enviar WhatsApp, Alterar Status, Converter em Fatura, Baixar PDF
- [ ] Invoices: mesmo padrão de drawer de detalhe + email pré-preenchido com contato
- [ ] Invoices: botão de link de pagamento Stripe no drawer

## Sprint Atual — PDF + Conversão + Pipeline

- [ ] Corrigir geração de PDF de orçamentos para envio via WhatsApp (arquivo vazio/formato errado)
- [ ] Corrigir geração de PDF de faturas para envio via WhatsApp
- [ ] Corrigir geração de PDF de contratos para envio via WhatsApp
- [ ] Implementar conversão de orçamento aprovado em fatura (botão "Converter em Fatura")
- [x] Ao criar fatura, permitir selecionar orçamento aprovado para pré-preencher itens
- [ ] Ao criar contrato, exigir/sugerir fatura criada ou paga vinculada
- [ ] Pipeline: exibir coluna/seção de leads perdidos
- [ ] Pipeline: permitir excluir lead
- [ ] Pipeline: clicar no card do lead abre drawer com todas as ações (editar, mover, excluir, vincular documentos)

## Sprint — Contratos Drawer + Badge + Notificação Agendamento
- [ ] Contratos: card clicável abre drawer de detalhe completo
- [ ] Contratos: drawer com PDF, email/WhatsApp pré-preenchido, alterar status, excluir
- [ ] Badge de mensagens não lidas no sidebar ao lado de "WhatsApp"
- [ ] Notificação automática Z-API ao confirmar agendamento no Estúdio

## Sprint Backlog Completo — Implementação Total

### UX Crítica
- [x] Card de contato inteiramente clicável → abre /contacts/:id
- [x] Botão WhatsApp no perfil → redireciona para /whatsapp?phone=NUMERO
- [x] Botão Email no perfil → abre modal interno de composição Brevo
- [x] Botão Novo Lead/Fatura/Orçamento/Contrato no perfil → pré-preenchido via query params
- [x] Drawer de detalhe em Faturas (clicável, email/WA pré-preenchido, link Stripe)
- [x] Drawer de detalhe em Orçamentos (clicável, email/WA pré-preenchido, converter em fatura)
- [x] Correção de geração de PDF para envio via WhatsApp

### Analytics Completo
- [x] Gráfico de receita mensal (linha, últimos 12 meses)
- [x] Funil de conversão de leads
- [x] Ranking de clientes por valor total (top 10)

### Filtros + CSV
- [x] Filtros em Contratos: status, período, valor + exportação CSV
- [x] Filtros em Faturas: status, período, valor + exportação CSV
- [x] Filtros em Orçamentos: status, período, valor + exportação CSV

### Pipeline Melhorado
- [x] Drawer completo do lead (editar, mover, excluir, vincular documentos)
- [x] Coluna de leads perdidos no kanban
- [x] Exclusão de lead

### Conversão Orçamento → Fatura
- [x] Botão "Converter em Fatura" no drawer de orçamento aprovado
- [x] Ao criar fatura, permitir selecionar orçamento aprovado para pré-preencher itens

### Portal do Cliente
- [x] Schema: tabela client_portal_tokens
- [x] Backend: gerar token, buscar documento por token, registrar aprovação/assinatura
- [x] Rota pública /portal/:token (sem autenticação)
- [x] Página portal: visualizar/assinar contrato, aprovar orçamento, pagar fatura

### Vinculação Automática de Chats
- [x] Ao receber mensagem via webhook, cruzar número com tabela contacts
- [x] Salvar contactId no whatsappChats quando encontrado
- [x] Exibir nome do contato na lista de chats WhatsApp

### Envio de Link do Portal via WhatsApp
- [x] Backend: procedure portal.sendViaWhatsApp (busca telefone do contato, monta mensagem, envia via Z-API)
- [x] Contracts.tsx: botão "Enviar Link via WhatsApp" aparece após gerar o link do portal
- [x] Quotes.tsx: botão "Enviar Link via WhatsApp" aparece após gerar o link do portal

## Sprint 1 — Fluxo Comercial (Concluída)
- [x] Catálogo de produtos/serviços (CRUD completo, categorias, unidades)
- [x] Seletor "Do Catálogo" em Orçamentos (inserção de produtos)
- [x] Seletor "Do Catálogo" em Faturas (inserção de produtos)
- [x] Converter orçamento aceito em contrato (procedure + botão no drawer)
- [x] Lembretes automáticos de cobrança (agendar, cancelar, listar por fatura)
- [x] Modal de agendamento de lembrete no drawer de Faturas (canal + data + mensagem)

## Sprint 2 — Projetos, Biblioteca de Contratos e Créditos

- [x] Tabela projects (kanban briefing→gravação→edição→revisão→publicado→arquivado)
- [x] Tabela contractTemplates (biblioteca de modelos com variáveis)
- [x] Tabela contactTags (tags de contatos)
- [x] Tabela creditTransactions (créditos por cliente com saldo)
- [x] Tabela projectLinks (links de arquivos vinculados a projetos)
- [x] Página /projects — kanban de projetos com drawer de detalhes e progressão de status
- [x] Página /contract-templates — biblioteca de modelos com preview, variáveis, copiar e editar
- [x] Página /credits — saldo por cliente com histórico de transações (crédito/débito/bônus/reembolso)
- [x] 3 modelos padrão prontos (Podcast, Locução, NDA)
- [x] Menu lateral atualizado com Projetos, Modelos e Créditos

## Sprint 3 — Onboarding PJ, Rotinas e Conflitos de Horário
- [x] Tabelas pj_documents, daily_routines, routine_templates criadas no banco
- [x] Onboarding PJ com extração por IA (CNPJ, Razão Social, documentos) — aba PJ no perfil do contato
- [x] Rotinas Diárias por role — página /routine com checklist personalizado por cargo
- [x] Conflitos de horário no Estúdio — validação em tempo real ao preencher data/hora
- [x] Rota /routine registrada no App.tsx e item no menu lateral

## Sprint 4 — Módulo de Podcast
- [x] Tabelas podcasts, episodes, episode_comments criadas no banco
- [x] Backend: CRUD de podcasts e episódios com status de produção
- [x] Backend: comentários por episódio
- [x] Página /podcasts com sidebar de programas e kanban de episódios por status
- [x] 6 colunas de produção: Roteiro → Gravação → Edição → Revisão → Agendado → Publicado
- [x] Avançar status com 1 clique (kanban e sheet de detalhes)
- [x] Links do Drive em vez de upload (scriptUrl, rawAudioUrl, editedAudioUrl, thumbnailUrl, publishedUrl)
- [x] Sheet de detalhes com comentários por episódio
- [x] Item Podcasts adicionado ao menu lateral

## Sprint 8 — Portal do Cliente Completo
- [x] Tabelas brand_settings e portal_magic_links criadas no banco
- [x] brandRouter: get/update configurações de identidade visual
- [x] portalMagicRouter: sendMagicLink, validate, getData
- [x] ClientPortalV2.tsx: portal completo com projetos, contratos, faturas, podcasts, Stripe
- [x] ClientPortalMagicEntry: validação de magic link e redirecionamento
- [x] BrandSettings.tsx: página de configuração de identidade visual com preview
- [x] Botão "Magic Link" no perfil do contato
- [x] Rotas /portal/magic/:token, /portal/client/:contactId, /brand-settings
- [x] Item "Portal Visual" no menu admin

## Sprint 6 — Automação Comercial ✅
- [x] Tabelas: automation_sequences, automation_steps, automation_executions, message_templates
- [x] Backend: CRUD completo de sequências, passos, execuções e templates
- [x] Disparo automático ao mover lead de estágio no Pipeline
- [x] Página /automations com 3 abas: Sequências, Templates, Histórico
- [x] Item Automações no menu lateral

## Sprint 9 — Equipamentos e Multi-Estúdio ✅
- [x] Tabelas studio_rooms, equipment, equipment_bookings criadas no banco
- [x] Coluna room_id adicionada em studio_bookings
- [x] Backend: CRUD completo de salas (studioRoomsRouter)
- [x] Backend: CRUD completo de equipamentos (equipmentRouter)
- [x] Backend: vinculação equipamento ↔ agendamento
- [x] Backend: relatório de ocupação por sala e por equipamento
- [x] Seed automático de salas padrão (Estúdio A, B, Cabine de Locução)
- [x] Studio.tsx: filtro de sala no calendário (botões coloridos)
- [x] Studio.tsx: aba "Por Sala" com calendário multi-coluna por sala
- [x] Studio.tsx: seletor de sala ao criar novo agendamento
- [x] Página /studio-rooms com CRUD de salas, seletor de cor, barra de ocupação
- [x] Página /equipment com CRUD de equipamentos, filtros por categoria/status, cards visuais
- [x] Itens "Salas" e "Equipamentos" adicionados ao menu lateral

## Sprint A — Fechamento Financeiro Crítico (42 pts) ✅
- [x] US-049: Bloqueio de agenda até pagamento da entrada (13 pts)
- [x] US-043: Contrato assinado → cobrança automática de faturas (8 pts)
- [x] US-050: Lembrete automático do saldo antes da sessão (8 pts)
- [x] US-019: Planos e assinaturas recorrentes via Stripe (13 pts)

## Sprint B — Dashboard Executivo, Notificações e Qualidade (37 pts) ✅
- [x] US-030: Dashboard executivo com KPIs consolidados (8 pts)
- [x] US-033: Notificações por e-mail do sistema via Brevo (8 pts)
- [x] US-034: Notificações in-app em tempo real (8 pts)
- [x] US-035: Testes automatizados abrangentes >80% cobertura (8 pts)
- [x] US-073: Histórico de pagamentos e recibos (5 pts)

## Sprint C — Theory of Constraints (37 pts) ✅
- [x] US-037: Sessão semanal automatizada ToC (13 pts)
- [x] US-038: Dashboard ToC com relatório estruturado (8 pts)
- [x] US-039: Mapeamento de restrições por domínio (5 pts)
- [x] US-041: Integração itens de ação ToC com CRM (8 pts)
- [x] US-040: Configuração e personalização ToC (5 pts)
- [x] US-072: Relatório ToC integrado à rotina diária (3 pts)

## Sprint D — Expansão Comercial: NPS, Follow-up e Rentabilidade (42 pts)
- [ ] US-077: Automação de follow-up comercial por estágio (8 pts)
- [ ] US-078: Avaliação de satisfação do cliente (NPS) via WhatsApp (5 pts)
- [ ] US-076: Relatório de rentabilidade por tipo de serviço (5 pts)
- [ ] US-023: Notificação automática de sessão por WhatsApp (5 pts)
- [ ] US-028: Briefing de episódio com aprovação (8 pts)
- [ ] US-074: Dashboard financeiro por projeto (5 pts)
- [ ] US-069: Resumo semanal financeiro por e-mail (toda segunda) (5 pts)

## Sprint E — UX Pipeline, Relatórios e Produtividade (47 pts) ✅
- [x] US-012: Drag-and-drop nativo entre colunas do pipeline (8 pts)
- [x] US-013: Filtros avançados no pipeline (responsável, período, valor) (5 pts)
- [x] US-010: Importação de contatos via CSV (8 pts)
- [x] US-029: Controle de horas por cliente (8 pts)
- [x] US-031: Relatório de conversas WhatsApp (5 pts)
- [x] US-032: Exportação global de dados em CSV/Excel (5 pts)
- [x] US-057: Painel de créditos no perfil do cliente (5 pts)
- [x] US-071: Pendências com clientes na rotina consolidada (8 pts)

## Sprint F — WhatsApp Avançado, Assinatura Digital e Complementares (58 pts) ✅
- [x] US-007: Suporte a mídia no WhatsApp (imagens, docs, áudio) (8 pts)
- [x] US-015: Exportação de contrato em PDF (8 pts)
- [x] US-016: Assinatura digital de contratos com validade jurídica (8 pts)
- [x] US-060: Produtos vinculados a tipos de contrato (3 pts)
- [x] US-070: Resumo semanal de conversas WhatsApp (5 pts)

## Sprint Design — UI/UX Pro Max (Prioridade Máxima)
- [x] Ativar fonte Inter via Google Fonts no index.html
- [x] Definir escala tipográfica global no index.css
- [x] Redesenhar CRMLayout: sidebar com 6 grupos colapsáveis (Comercial, Financeiro, Produção, Documentos, Gestão, Admin)
- [x] Mover Modelos, Catálogo, Créditos, Portal Visual, Salas, Equipamentos para submenus/Configurações
- [x] Adicionar suporte mobile: overlay sidebar, SidebarTrigger, bottom nav mobile
- [x] Corrigir barra branca/linha sem design no layout
- [x] Corrigir Equipment.tsx: adicionar CRMLayout wrapper
- [x] Corrigir StudioRooms.tsx: adicionar CRMLayout wrapper
- [x] Adicionar busca global ⌘K (cmdk)
- [x] Extrair componentes reutilizáveis: PageHeader, MetricCard, StatusBadge, EmptyState, DeleteConfirmDialog
- [x] Agrupar sidebar em categorias com ícones de grupo e contagem de badges
- [x] Adicionar indicador de status Z-API no rodapé do sidebar
- [x] Melhorar hierarquia visual dos cards do Pipeline (valor em destaque, barra de probabilidade, avatar do contato)
- [x] Adicionar filtros de contexto na lista de chats WhatsApp (Clientes / Leads / Todos)

## Sprint A — Detalhamento de Implementação

### US-049: Bloqueio de agenda até pagamento da entrada
- [ ] Adicionar coluna `paymentStatus` em `studio_bookings` (pending_payment | paid | waived)
- [ ] Adicionar coluna `entryInvoiceId` em `studio_bookings` (FK para invoices)
- [ ] Backend: ao criar agendamento, gerar fatura de entrada automaticamente (50% do valor)
- [ ] Backend: procedure `studio.confirmPayment` para marcar como pago e liberar agenda
- [ ] UI: badge de status de pagamento no calendário (vermelho=bloqueado, verde=liberado)
- [ ] UI: modal de confirmação de pagamento no agendamento
- [ ] UI: bloquear edição/confirmação de sessão enquanto pagamento pendente

### US-043: Contrato assinado → cobrança automática
- [ ] Backend: ao assinar contrato (status → signed), gerar faturas automaticamente
- [ ] Backend: respeitar plano de pagamento do contrato (full / 50-50)
- [ ] Backend: vincular faturas geradas ao contrato via projectLinks
- [ ] UI: notificação toast ao assinar contrato com link para faturas geradas

### US-050: Lembrete automático do saldo antes da sessão
- [ ] Backend: job/procedure que busca sessões nas próximas 48h com saldo devedor
- [ ] Backend: enviar WhatsApp via Z-API com valor do saldo e link de pagamento
- [ ] Backend: marcar lembrete como enviado para não duplicar
- [ ] UI: aba "Lembretes Pendentes" na página do Estúdio

### US-019: Planos e assinaturas recorrentes via Stripe
- [ ] Criar produtos Stripe recorrentes em server/stripe/products.ts (mensal, trimestral, anual)
- [ ] Backend: procedure `stripe.createSubscription` com checkout session
- [ ] Backend: webhook para `customer.subscription.created/updated/deleted`
- [ ] Adicionar coluna `stripeSubscriptionId` na tabela contacts
- [ ] UI: página /subscriptions com planos disponíveis e status da assinatura do cliente

## Sprint B — Detalhamento de Implementação

### US-030: Dashboard Executivo
- [ ] Backend: procedure `dashboard.actionItems` — leads parados >7 dias, faturas vencendo em 48h, sessões sem pagamento
- [ ] Backend: procedure `dashboard.kpis` consolidado (receita do mês, leads ativos, taxa de conversão, sessões da semana)
- [ ] UI: seção "O que fazer hoje" no Dashboard com cards acionáveis por categoria
- [ ] UI: KPIs com variação percentual em relação ao mês anterior

### US-034: Notificações in-app
- [ ] Schema: tabela `notifications` (userId, type, title, message, read, link, createdAt)
- [ ] Backend: procedure `notifications.list`, `notifications.markRead`, `notifications.markAllRead`
- [ ] Backend: helper `createNotification()` chamado em eventos críticos (pagamento, contrato assinado, novo lead)
- [ ] UI: sino no topo do sidebar com badge de contagem de não lidas
- [ ] UI: dropdown de notificações com lista e ação "Marcar todas como lidas"
- [ ] UI: badge de mensagens não lidas no item WhatsApp do sidebar

### US-033: Notificações por e-mail do sistema
- [ ] Backend: enviar email via Brevo ao owner quando: novo lead criado, contrato assinado, pagamento confirmado, sessão confirmada
- [ ] Backend: template HTML de email de notificação do sistema
- [ ] Configuração: respeitar preferências de notificação do usuário (Configurações)

### US-073: Histórico de pagamentos e recibos
- [ ] Backend: procedure `payments.history` consolidado (Stripe + faturas pagas)
- [ ] UI: página /payments melhorada com filtros de período, exportação CSV e recibo por item

### US-035: Cobertura de testes >80%
- [ ] Adicionar testes para módulo de Estúdio (createBooking, getBookings, conflito de horário)
- [ ] Adicionar testes para módulo de Contratos (create, sign, autoInvoice)
- [ ] Adicionar testes para módulo de Portal do Cliente (generateToken, validateToken)
- [ ] Adicionar testes para Sprint A (generateEntryInvoice, confirmPayment, sendBalanceReminder)

## Sprint C — Detalhamento de Implementação (Theory of Constraints)

### Schema
- [ ] Tabela toc_sessions (sessões semanais ToC com status e relatório)
- [ ] Tabela toc_constraints (restrições mapeadas por domínio com severidade)
- [ ] Tabela toc_action_items (itens de ação vinculados a restrições)
- [ ] Tabela toc_configs (configurações de domínios e personalização)

### Backend
- [ ] CRUD de sessões ToC com geração de relatório por IA
- [ ] CRUD de restrições por domínio (comercial, financeiro, produção, pessoas, tecnologia)
- [ ] CRUD de itens de ação com status e responsável
- [ ] Procedure de agendamento automático semanal (cron-like)
- [ ] Integração com rotinas diárias (US-072)

### UI
- [ ] Página /toc com dashboard de restrições ativas
- [ ] Aba Sessões: histórico de sessões semanais com relatório IA
- [ ] Aba Restrições: mapa visual por domínio com severidade
- [ ] Aba Itens de Ação: lista com status e responsável
- [ ] Aba Configurações: domínios, contexto do negócio, frequência
- [ ] Item "ToC" no menu lateral (seção Gestão)

### Testes
- [ ] Testes para CRUD de sessões e restrições
- [ ] Testes para geração de relatório por IA (mock)

## Sprint D — Expansão Comercial + Análise Total WhatsApp (Sprint D Expandida)

### Análise Total do WhatsApp (NOVO — Prioridade Alta)
- [ ] Backend: função `loadAllChatHistory(phone)` — busca todas as páginas de mensagens via Z-API para um chat
- [ ] Backend: função `syncAllChats()` — itera todos os chats e carrega histórico completo paginado
- [ ] Backend: tabela `whatsapp_analysis` — armazena resultado de análise por chat (sugestões, score, timestamp)
- [ ] Backend: procedure `whatsapp.syncFullHistory` — dispara carga completa de histórico de todos os chats
- [ ] Backend: procedure `whatsapp.analyzeChat(chatId)` — analisa histórico de um chat com IA e retorna sugestões
- [ ] Backend: procedure `whatsapp.analyzeAll` — analisa todos os chats em lote e persiste resultados
- [ ] Engine de IA: para cada conversa, identificar: nome/empresa do contato, intenção de compra, estágio sugerido no pipeline, serviços mencionados, valor estimado, urgência
- [ ] Engine de IA: gerar sugestões acionáveis: abrir lead, atualizar lead, enviar orçamento, enviar fatura, enviar contrato
- [ ] UI: botão "Sincronizar Histórico Completo" na página WhatsApp com progress bar
- [ ] UI: aba "Análise IA" na página WhatsApp com lista de chats analisados
- [ ] UI: card de análise por chat com score de oportunidade, sugestões e botões de ação rápida
- [ ] UI: painel de análise global — resumo de todas as oportunidades detectadas no histórico
- [ ] UI: botão "Analisar este chat" dentro de cada conversa individual

### US-077: Automação de follow-up comercial
- [ ] Backend: procedure `sprintD.triggerFollowUp(leadId)` — envia mensagem Z-API de follow-up baseada no estágio
- [ ] UI: botão "Follow-up Automático" no drawer do lead no Pipeline

### US-078: NPS via WhatsApp
- [ ] Backend: procedure `sprintD.sendNPS(contactId)` — envia pesquisa NPS via Z-API
- [ ] Backend: tabela `nps_responses` — armazena respostas NPS (score 0-10, comentário, timestamp)
- [ ] Backend: webhook handler para capturar resposta NPS recebida via Z-API
- [ ] UI: botão "Enviar NPS" no perfil do contato
- [ ] UI: página /nps com dashboard de scores, NPS líquido e histórico de respostas

### US-076: Relatório de rentabilidade
- [ ] Backend: procedure `sprintD.rentabilidade` — agrupa receita por tipo de serviço (podcast, locução, edição, etc.)
- [ ] UI: aba "Rentabilidade" na página Analytics com gráfico de barras por serviço

### US-023: Notificação automática de sessão por WhatsApp
- [ ] Backend: ao confirmar agendamento no Estúdio, enviar Z-API com data, hora, sala e equipamentos
- [ ] UI: toggle "Notificar cliente via WhatsApp" ao criar/confirmar agendamento

### US-028: Briefing de episódio com aprovação
- [ ] Backend: campo `briefing` e `briefingApprovedAt` em episodes
- [ ] UI: aba "Briefing" no sheet de detalhes do episódio com editor e botão de aprovação

### US-074: Dashboard financeiro por projeto
- [ ] Backend: procedure `sprintD.projectFinancials(projectId)` — soma faturas e orçamentos vinculados
- [ ] UI: aba "Financeiro" no drawer de detalhes do projeto

### US-069: Resumo semanal financeiro por e-mail
- [ ] Backend: procedure `sprintD.sendWeeklySummary` — compila KPIs da semana e envia via Brevo toda segunda
- [ ] UI: toggle "Resumo semanal" nas Configurações de notificações

## Sprint D — Implementação Concluída ✅

### Análise Total do WhatsApp
- [x] Backend: whatsappAiRouter com syncFullHistory, analyzeChat, analyzeAll, bulkAnalyze
- [x] Backend: tabela whatsapp_analysis com sugestões, score e timestamp
- [x] UI: página /whatsapp-analysis com painel de análise global e cards por chat
- [x] UI: botão "Sincronizar Histórico Completo" com progresso
- [x] UI: sugestões acionáveis: abrir lead, atualizar lead, enviar orçamento, fatura, contrato

### US-077: Follow-up Automático
- [x] Backend: sprintDRouter.sendSessionReminder — lembrete de sessão via Z-API

### US-078: NPS via WhatsApp
- [x] Backend: npsRouter com sendNPS, listResponses, dashboard
- [x] Backend: tabela nps_responses com score, comentário, timestamp
- [x] UI: botão "Enviar NPS" disponível via npsRouter

### US-076: Relatório de Rentabilidade
- [x] Backend: sprintDRouter.profitabilityReport — agrupa receita por contato

### US-023: Notificação de Sessão via WhatsApp
- [x] Backend: sprintDRouter.sendSessionReminder — envia lembrete 24h antes

### US-028: Briefing de Episódio com IA
- [x] Backend: sprintDRouter.generateEpisodeBriefing — gera briefing completo via LLM
- [x] UI: botão "Gerar Briefing IA" no sheet de detalhes do episódio em Podcasts
- [x] UI: dialog com conteúdo do briefing e botão de copiar

### US-074: Dashboard Financeiro por Projeto
- [x] Backend: sprintDRouter.projectFinancialSummary — soma faturas vinculadas ao projeto

### US-069: Resumo Semanal Financeiro por E-mail
- [x] Backend: sprintDRouter.sendWeeklyFinancialSummary — compila KPIs e envia via Brevo
- [x] UI: botão "Enviar Resumo Agora" na aba Notificações das Configurações

## Sprint E — UX Pipeline, Relatórios e Produtividade (47 pts) — Em Andamento

### US-012: Drag-and-drop nativo entre colunas do pipeline (8 pts)
- [ ] Instalar @dnd-kit/core e @dnd-kit/sortable
- [ ] Refatorar Pipeline.tsx para usar DndContext e SortableContext por coluna
- [ ] Persistir nova posição via trpc.pipeline.moveLead ao soltar card

### US-013: Filtros avançados no pipeline (5 pts)
- [ ] UI: barra de filtros no topo do kanban (responsável, período, valor mín/máx, tag)
- [ ] Backend: procedure pipeline.getLeads aceitar filtros opcionais

### US-010: Importação de contatos via CSV (8 pts)
- [ ] Backend: procedure contacts.importCSV — parse CSV, validar campos, upsert contatos
- [ ] UI: modal de importação em Contacts.tsx com upload, preview e confirmação

### US-029: Controle de horas por cliente (8 pts)
- [ ] Schema: tabela time_entries (contactId, projectId, description, minutes, date, userId)
- [ ] Backend: CRUD de time_entries
- [ ] UI: página /time-tracking com registro de horas, filtro por cliente/projeto, total por período

### US-031: Relatório de conversas WhatsApp (5 pts)
- [ ] Backend: procedure whatsapp.conversationReport — total de mensagens, tempo médio de resposta, chats por contato
- [ ] UI: aba "Relatório" na página WhatsApp com métricas e gráficos

### US-032: Exportação global de dados em CSV/Excel (5 pts)
- [ ] Backend: procedures export.contacts, export.invoices, export.quotes, export.contracts
- [ ] UI: botão "Exportar CSV" em Contacts, Invoices, Quotes, Contracts

### US-057: Painel de créditos no perfil do cliente (5 pts)
- [ ] UI: aba "Créditos" no perfil do contato (/contacts/:id) com saldo e histórico de transações

### US-071: Pendências com clientes na rotina consolidada (8 pts)
- [ ] Backend: procedure routine.clientPendencies — faturas vencidas, leads parados, sessões sem pagamento por contato
- [ ] UI: seção "Pendências com Clientes" na página /routine

## Sprint F — WhatsApp Avançado, Assinatura Digital e Complementares (58 pts)

### US-007: Suporte a mídia no WhatsApp (8 pts)
- [ ] Backend: procedure whatsapp.sendMedia — enviar imagem/doc/áudio via Z-API
- [ ] UI: botão de anexo no chat WhatsApp com seletor de tipo (imagem, documento, áudio)
- [ ] UI: renderizar mensagens de mídia recebidas (imagem inline, link para doc/áudio)

### US-015: Exportação de contrato em PDF (8 pts)
- [ ] Backend: procedure contracts.exportPDF — gerar PDF via html-to-pdf com template do contrato
- [ ] UI: botão "Baixar PDF" no drawer de detalhes do contrato

### US-016: Assinatura digital de contratos com validade jurídica (8 pts)
- [ ] Schema: colunas signature_data, signed_ip, signed_user_agent em contracts
- [ ] Backend: procedure contracts.sign — salvar hash SHA-256 do conteúdo + IP + timestamp
- [ ] UI: modal de assinatura com canvas (desenho) ou digitação do nome + confirmação
- [ ] UI: exibir badge "Assinado digitalmente" com data/IP no drawer do contrato

### US-060: Produtos vinculados a tipos de contrato (3 pts)
- [ ] Schema: coluna product_ids (json) em contract_templates
- [ ] UI: seletor de produtos ao criar/editar modelo de contrato

### US-070: Resumo semanal de conversas WhatsApp (5 pts)
- [ ] Backend: procedure whatsapp.weeklyConversationSummary — IA resume os principais temas das conversas da semana
- [ ] UI: botão "Resumo da Semana" na página WhatsApp com modal de resultado

## Sprint G — Itens Pendentes Consolidados ✅

- [x] Badge de mensagens não lidas no sidebar ao lado de "WhatsApp"
- [x] Vincular chat Z-API ao contato automaticamente (cruzar número no webhook)
- [x] Notificação automática ao confirmar agendamento no Estúdio (toggle + Z-API)
- [x] Correção de enums de podcast: remover referências musicais (contractType, sessionType)
- [x] Botão "Novo Lead" no perfil do cliente → pré-preenchido via query params
- [x] Botão "Nova Fatura" no perfil do cliente → pré-preenchido via query params
- [x] Botão "Novo Orçamento" no perfil do cliente → pré-preenchido via query params
- [x] Botão "Novo Contrato" no perfil do cliente → pré-preenchido via query params
- [x] Redesenho do perfil do cliente: layout duas colunas com sidebar de dados
- [x] Produtos vinculados a tipos de contrato (seletor no modelo de contrato)
- [x] Exportação de contrato em PDF (botão "Baixar PDF" no drawer)
- [x] Quotes: email pré-preenchido com email do contato vinculado
- [x] Invoices: email pré-preenchido com email do contato vinculado

## Playbook — 3 Ações Imediatas ✅

- [x] Ação 1: Webhook Z-API — criação automática de lead ao receber mensagem de número desconhecido
- [x] Ação 1: Webhook Z-API — notificação interna ao responsável comercial ao criar lead
- [x] Ação 2: Contrato assinado → gerar fatura de entrada (50% do valor) automaticamente
- [x] Ação 2: Contrato assinado → criar projeto automaticamente com kanban de episódios
- [x] Ação 2: Contrato assinado → enviar magic link do portal ao cliente via WhatsApp
- [x] Ação 3: Cron follow-up 48h — buscar leads sem interação e disparar Template WA-01
- [x] Ação 3: Cron renovação — criar lead de renovação 30 dias antes do vencimento do contrato

## Sprint Funil — 10 Melhorias no Pipeline ✅

### Grupo 1 — UX Imediata
- [x] Drawer completo do lead: sheet lateral com todos os dados, histórico, ações
- [x] Motivo de perda obrigatório: modal ao marcar "Perdido" com categorias
- [x] Alerta visual de lead esquecido: borda laranja em cards sem atualização há 5+ dias
- [x] Campo de origem do lead: source (WhatsApp, Evento, Indicação, Site, Cold Outreach)

### Grupo 2 — Inteligência Comercial
- [x] Forecast de receita: header com valor total, valor ponderado e previsão do mês
- [x] Lead scoring automático: pontuação 0-100 calculada por critérios objetivos
- [x] Limite de WIP por coluna: configurar máximo de leads por estágio (ToC)

### Grupo 3 — Integração
- [x] Histórico de atividades por lead: log automático de cada ação com timestamp
- [x] Vinculação lead→contrato/fatura: botões "Gerar Contrato" e "Gerar Fatura" no drawer
- [x] Visão de lista: alternar entre Kanban e tabela com colunas ordenáveis

## Playbook — Teste e Correção End-to-End

- [x] Auditar webhook Z-API: criação automática de lead funcional
- [x] Auditar signContract: encadeamento fatura + projeto + magic link
- [x] Auditar crons: follow-up 48h e renovação 30 dias
- [x] Corrigir todos os bugs encontrados (schema sincronizado, mocks atualizados)
- [x] Testar fluxo completo end-to-end (66 testes passando)
- [x] Sincronizar schema.ts com banco: signatoryName, signatoryEmail, expiresAt, notes em contracts
- [x] TypeScript: 0 erros em todos os arquivos
