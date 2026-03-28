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
