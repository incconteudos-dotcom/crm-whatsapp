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
