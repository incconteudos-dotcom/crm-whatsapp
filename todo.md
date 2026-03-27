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
- [ ] Geração de PDF de faturas e orçamentos
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

## Bugs
- [x] Corrigir erro de login ao tentar acessar o CRM (colunas status/whatsappAccess/role faltando no banco - migration aplicada, 13 tabelas criadas)

## Fases Seguintes (Planejadas)
- [ ] Integração real com WhatsApp MCP
- [ ] Integração Stripe para pagamentos
- [ ] Geração de PDF de faturas e orçamentos
- [ ] Assinatura digital de contratos
- [ ] Notificações por e-mail
- [ ] Importação de contatos via CSV
- [ ] App mobile (React Native)
