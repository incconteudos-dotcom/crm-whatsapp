# Manual do Usuário — CRM Studio

**Versão:** 29 de março de 2026  
**URL de produção:** [patioestudioscrm.manus.space](https://patioestudioscrm.manus.space)  
**Suporte:** Aurimar Nogueira (admin)

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Acesso e Login](#2-acesso-e-login)
3. [Perfis de Usuário e Permissões](#3-perfis-de-usuário-e-permissões)
4. [Dashboard](#4-dashboard)
5. [Comercial](#5-comercial)
   - 5.1 [Contatos](#51-contatos)
   - 5.2 [Pipeline de Vendas](#52-pipeline-de-vendas)
   - 5.3 [Automações e Playbooks](#53-automações-e-playbooks)
   - 5.4 [WhatsApp CRM *(somente Admin)*](#54-whatsapp-crm-somente-admin)
   - 5.5 [Análise IA WhatsApp *(somente Admin)*](#55-análise-ia-whatsapp-somente-admin)
6. [Financeiro](#6-financeiro)
   - 6.1 [Faturas](#61-faturas)
   - 6.2 [Orçamentos](#62-orçamentos)
   - 6.3 [Pagamentos](#63-pagamentos)
   - 6.4 [Créditos](#64-créditos)
7. [Produção](#7-produção)
   - 7.1 [Estúdio — Agendamentos](#71-estúdio--agendamentos)
   - 7.2 [Salas de Estúdio](#72-salas-de-estúdio)
   - 7.3 [Equipamentos](#73-equipamentos)
   - 7.4 [Podcasts e Episódios](#74-podcasts-e-episódios)
8. [Gestão](#8-gestão)
   - 8.1 [Tarefas](#81-tarefas)
   - 8.2 [Projetos](#82-projetos)
   - 8.3 [Contratos](#83-contratos)
   - 8.4 [Modelos de Contrato](#84-modelos-de-contrato)
   - 8.5 [Catálogo de Produtos](#85-catálogo-de-produtos)
9. [Ferramentas](#9-ferramentas)
   - 9.1 [Analytics](#91-analytics)
   - 9.2 [Rotina Diária](#92-rotina-diária)
   - 9.3 [Controle de Horas](#93-controle-de-horas)
   - 9.4 [TOC — Teoria das Restrições](#94-toc--teoria-das-restrições)
   - 9.5 [Exportar Dados](#95-exportar-dados)
10. [Portal do Cliente](#10-portal-do-cliente)
11. [Administração *(somente Admin/Gerente)*](#11-administração-somente-admingerente)
    - 11.1 [Usuários](#111-usuários)
    - 11.2 [Configurações](#112-configurações)
    - 11.3 [Portal Visual](#113-portal-visual)
12. [Busca Global](#12-busca-global)
13. [Limitações Conhecidas](#13-limitações-conhecidas)

---

## 1. Visão Geral

O **CRM Studio** é um sistema de gestão integrado desenvolvido para estúdios de podcast e produção. Ele centraliza o relacionamento com clientes, o controle financeiro, a gestão de agendamentos de estúdio, o acompanhamento de contratos e a comunicação via WhatsApp — tudo em uma única plataforma.

O sistema é acessado exclusivamente via navegador web e não requer instalação. Funciona em desktop e mobile (layout responsivo).

---

## 2. Acesso e Login

O login é realizado via **Manus OAuth** — não há cadastro manual de senha. Ao acessar a URL do sistema pela primeira vez, o usuário é redirecionado para a tela de login da Manus. Após autenticação, o acesso é concedido conforme o perfil atribuído pelo administrador.

**Fluxo de acesso para novos usuários:**

1. O administrador cria o usuário na seção **Administração → Usuários**.
2. O novo usuário acessa a URL do sistema e faz login com a conta Manus.
3. O sistema exibe uma tela de "Aguardando aprovação" até que o admin ative o cadastro.
4. O admin acessa **Usuários**, localiza o novo usuário com status *Pendente* e altera para *Ativo*.

> **Importante:** Usuários com status *Rejeitado* veem uma tela de acesso negado e não conseguem usar o sistema.

---

## 3. Perfis de Usuário e Permissões

O sistema possui quatro perfis de acesso, configurados pelo administrador:

| Perfil | Label | Acesso ao WhatsApp | Acesso à Administração |
|---|---|---|---|
| `admin` | Admin | Sim (completo) | Sim (completo) |
| `gerente` | Gerente | Não | Sim (parcial) |
| `analista` | Analista | Não | Não |
| `assistente` | Assistente | Não | Não |

**Regras de acesso importantes:**

- As rotas `/whatsapp` e `/whatsapp-analysis` são **exclusivas do perfil Admin**. Qualquer tentativa de acesso por outro perfil redireciona automaticamente para o Dashboard.
- A seção **Administração** no sidebar (Usuários, Configurações, Portal Visual) é visível apenas para Admin e Gerente.
- Todos os outros módulos (Contatos, Pipeline, Financeiro, Estúdio, Tarefas, etc.) são acessíveis por todos os perfis ativos.

Para alterar o perfil de um usuário, acesse **Administração → Usuários** e use o seletor de role no card do usuário.

---

## 4. Dashboard

O Dashboard é a tela inicial após o login. Ele apresenta uma visão consolidada do negócio em tempo real:

**Cards de métricas principais:**
- **Receita do Mês** — soma das faturas pagas no mês corrente.
- **Leads Ativos** — quantidade de leads com status *Em negociação*.
- **Taxa de Conversão** — percentual de leads ganhos sobre o total.
- **Sessões na Semana** — agendamentos de estúdio confirmados nos próximos 7 dias.

**Seções do Dashboard:**
- **O que fazer hoje** — tarefas com vencimento para hoje e lembretes de cobrança pendentes.
- **Atividade Recente** — últimas ações registradas no CRM (contratos assinados, faturas pagas, leads criados).
- **Acesso Rápido** — atalhos para os módulos mais usados.
- **Contatos, Tarefas Pendentes, Receita Total, Usuários Pendentes** — cards de resumo na parte inferior.

---

## 5. Comercial

### 5.1 Contatos

O módulo de Contatos é o núcleo do CRM. Cada contato representa um cliente, lead ou parceiro do estúdio.

**Campos principais:** Nome, E-mail, Telefone, Empresa, Tags, Tipo (cliente/lead/parceiro), Notas.

**Funcionalidades:**
- Criar, editar e arquivar contatos.
- Buscar por nome, e-mail ou telefone.
- Filtrar por tags personalizadas.
- Acessar o **Perfil Completo** do contato (`/contacts/:id`) com histórico de atividades, contratos, faturas, agendamentos e leads vinculados.
- Gerar e enviar **Magic Link do Portal do Cliente** diretamente do perfil.
- Adicionar atividades manuais (ligação, nota, e-mail, reunião).

### 5.2 Pipeline de Vendas

O Pipeline organiza os leads em estágios do funil de vendas. Os estágios padrão são configurados pelo administrador e persistem mesmo após a limpeza de dados.

**Funcionalidades:**
- Criar leads vinculados a um contato.
- Mover leads entre estágios por drag-and-drop ou pelo seletor de estágio.
- Registrar atividades e notas em cada lead.
- Marcar lead como **Ganho** (cria contrato automaticamente) ou **Perdido**.
- Filtrar leads por responsável, estágio ou data.

### 5.3 Automações e Playbooks

O módulo de Automações permite criar sequências de ações disparadas por eventos do CRM.

**Tipos de gatilho disponíveis:** Lead criado, Lead ganho, Contrato assinado, Fatura paga, Agendamento confirmado.

**Ações disponíveis:** Enviar e-mail, Enviar mensagem WhatsApp (quando conectado), Criar tarefa, Atualizar estágio do lead, Aguardar X dias.

> **Atenção:** A execução automática de ações WhatsApp depende da conexão ativa com o Z-API. Enquanto o WhatsApp estiver desabilitado para uso geral, as automações de mensagem não serão executadas.

### 5.4 WhatsApp CRM *(somente Admin)*

> **Status atual:** Funcional apenas para o perfil **Admin**. Usuários com outros perfis não visualizam este módulo.

O WhatsApp CRM integra a instância Z-API ao sistema, permitindo gerenciar conversas diretamente pelo CRM.

**Funcionalidades:**
- Visualizar lista de chats sincronizados.
- Abrir conversas e enviar mensagens.
- Filtrar por Todos, Clientes e Leads.
- Visualizar contatos e grupos.

**Limitação técnica importante:** O Z-API no modo **multi-device** (padrão atual do WhatsApp) **não suporta busca de histórico de mensagens**. O endpoint `/chat-messages` retorna erro `"Does not work in multi device version"`. O histórico só é recebido via **webhook em tempo real** — mensagens chegam ao CRM apenas a partir do momento em que o webhook é configurado.

**Configuração do Webhook (necessária para receber mensagens):**

Acesse o painel do Z-API → Configurações → Webhooks e preencha:

| Campo | Valor |
|---|---|
| **Ao receber** | `https://patioestudioscrm.manus.space/api/zapi/webhook` |
| **Ao enviar** | `https://patioestudioscrm.manus.space/api/zapi/webhook` |
| **Notificar enviadas por mim** | Ativar |

Após salvar, toda mensagem recebida ou enviada aparece no CRM em até 3 segundos.

**Sincronização de chats:** Use o botão **↻** no header do WhatsApp para buscar a lista de conversas do Z-API. Isso traz os nomes e JIDs dos contatos, mas não o histórico de mensagens (limitação do multi-device).

### 5.5 Análise IA WhatsApp *(somente Admin)*

> **Status atual:** Funcional apenas para o perfil **Admin**.

Permite selecionar uma conversa do WhatsApp e solicitar uma análise por IA que retorna:
- Resumo da conversa.
- Sentimento predominante (positivo, neutro, negativo).
- Oportunidades identificadas.
- Próximos passos sugeridos.

A análise é gerada pelo modelo de linguagem integrado ao sistema e salva no banco para consulta posterior.

---

## 6. Financeiro

### 6.1 Faturas

Gerenciamento completo do ciclo de cobrança.

**Status possíveis:** Rascunho → Enviada → Paga → Vencida → Cancelada.

**Funcionalidades:**
- Criar faturas manualmente ou a partir de um orçamento aprovado.
- Vincular fatura a um contato e/ou contrato.
- Registrar pagamento manual.
- Enviar fatura por e-mail ao cliente (integração Brevo).
- Configurar lembretes automáticos de cobrança.

### 6.2 Orçamentos

Criação e envio de propostas comerciais.

**Status possíveis:** Rascunho → Enviado → Aceito → Rejeitado → Expirado.

**Funcionalidades:**
- Criar orçamentos com itens, quantidades e valores.
- Converter orçamento aceito em fatura com um clique.
- Enviar por e-mail ao cliente.
- Definir data de validade.

### 6.3 Pagamentos

Registro e acompanhamento de pagamentos recebidos, incluindo integração com **Stripe** para checkout online.

**Funcionalidades:**
- Listar histórico de pagamentos.
- Criar links de checkout Stripe para produtos do catálogo.
- Visualizar status de pagamentos processados pelo Stripe.

> **Ambiente de teste:** O Stripe está configurado em modo sandbox. Use o cartão `4242 4242 4242 4242` para testar pagamentos. Para ativar o modo produção, acesse **Configurações → Pagamento** e insira as chaves live.

### 6.4 Créditos

Sistema de créditos pré-pagos para clientes do estúdio.

**Funcionalidades:**
- Adicionar créditos a um contato.
- Visualizar saldo e histórico de transações.
- Debitar créditos ao confirmar agendamentos.

---

## 7. Produção

### 7.1 Estúdio — Agendamentos

Calendário de reservas das salas de estúdio.

**Status possíveis:** Agendado → Confirmado → Em andamento → Concluído → Cancelado.

**Funcionalidades:**
- Criar agendamentos vinculados a um contato.
- Selecionar sala, equipamentos e horário.
- Confirmar, iniciar e concluir sessões.
- Visualizar calendário semanal e mensal.
- Gerar fatura a partir do agendamento concluído.

### 7.2 Salas de Estúdio

Cadastro e gestão das salas disponíveis para locação.

**Campos:** Nome, Capacidade, Valor por hora, Descrição, Status (ativa/inativa).

### 7.3 Equipamentos

Inventário de equipamentos do estúdio com controle de disponibilidade.

**Status possíveis:** Disponível → Em uso → Manutenção → Aposentado.

**Funcionalidades:**
- Cadastrar equipamentos com número de série, valor e categoria.
- Vincular equipamentos a agendamentos.
- Registrar histórico de manutenção.

### 7.4 Podcasts e Episódios

Gestão da produção de podcasts para clientes.

**Status de episódio:** Roteiro → Gravação → Edição → Revisão → Agendado → Publicado → Arquivado.

**Funcionalidades:**
- Criar projetos de podcast vinculados a um contato.
- Gerenciar episódios com status de produção.
- Adicionar comentários e notas por episódio.
- Acompanhar o fluxo de produção de cada episódio.

---

## 8. Gestão

### 8.1 Tarefas

Gerenciamento de tarefas da equipe.

**Status possíveis:** Pendente → Em andamento → Concluída → Cancelada.

**Funcionalidades:**
- Criar tarefas com responsável, prazo e prioridade.
- Vincular tarefas a contatos, leads ou projetos.
- Filtrar por responsável, status e data de vencimento.
- O Dashboard exibe tarefas com vencimento para hoje.

### 8.2 Projetos

Gestão de projetos de produção ou entrega para clientes.

**Funcionalidades:**
- Criar projetos vinculados a contatos.
- Adicionar links e documentos ao projeto.
- Acompanhar status e progresso.

### 8.3 Contratos

Gestão do ciclo de vida de contratos com clientes.

**Status possíveis:** Rascunho → Enviado → Assinado → Cancelado.

**Funcionalidades:**
- Criar contratos a partir de modelos ou do zero.
- Vincular contrato a um contato e lead.
- Enviar para assinatura digital via Portal do Cliente.
- Registrar data de assinatura e vigência.
- Ao assinar, o lead vinculado é automaticamente marcado como **Ganho**.

### 8.4 Modelos de Contrato

Biblioteca de modelos reutilizáveis para agilizar a criação de contratos.

**Funcionalidades:**
- Criar modelos com cláusulas padrão do estúdio.
- Usar variáveis dinâmicas (nome do cliente, valor, datas).
- Aplicar modelo ao criar um novo contrato.

### 8.5 Catálogo de Produtos

Cadastro de serviços e produtos oferecidos pelo estúdio.

**Funcionalidades:**
- Criar produtos com nome, descrição, preço e categoria.
- Sincronizar produto com o **Stripe** para habilitar checkout online.
- Gerar link de pagamento direto para um produto.
- Produtos sincronizados exibem badge "Sincronizado com Stripe".

> **Para habilitar checkout:** O produto precisa estar sincronizado com o Stripe. Clique em **Sincronizar** no card do produto antes de gerar o link de pagamento.

---

## 9. Ferramentas

### 9.1 Analytics

Painel de métricas e relatórios do negócio.

**Métricas disponíveis:**
- Receita por período (mensal, trimestral, anual).
- Leads criados e convertidos por período.
- Taxa de conversão do funil.
- Agendamentos por sala e por período.
- Tarefas concluídas vs. pendentes.

### 9.2 Rotina Diária

Checklist de atividades recorrentes para a equipe.

**Funcionalidades:**
- Criar rotinas com tarefas diárias, semanais ou mensais.
- Marcar itens como concluídos no dia.
- Usar modelos de rotina pré-definidos.

### 9.3 Controle de Horas

Registro de horas trabalhadas por projeto ou cliente.

**Funcionalidades:**
- Iniciar e parar timer por tarefa.
- Registrar horas manualmente.
- Gerar relatório de horas por projeto e período.

### 9.4 TOC — Teoria das Restrições

Módulo de gestão baseado na metodologia TOC (Theory of Constraints) para identificar e eliminar gargalos operacionais.

**Funcionalidades:**
- Criar sessões de análise de restrições.
- Mapear restrições e ações corretivas.
- Acompanhar itens de ação por responsável.

### 9.5 Exportar Dados

Exportação de dados do sistema em formato CSV para análise externa.

**Módulos exportáveis:** Contatos, Leads, Contratos, Faturas, Orçamentos, Agendamentos, Produtos, Projetos, Tarefas, Controle de Horas.

---

## 10. Portal do Cliente

O Portal do Cliente é uma área externa ao CRM, acessível pelo cliente sem necessidade de login na plataforma.

**Tipos de acesso:**
- **Portal de Documento** (`/portal/:token`) — acesso direto a um contrato específico para visualização e assinatura digital.
- **Portal Magic Link** (`/portal/magic/:token`) — link temporário enviado por e-mail que autentica o cliente automaticamente.
- **Dashboard do Cliente** (`/portal/client/:contactId`) — painel completo com contratos, faturas, orçamentos e agendamentos do cliente.

**Como gerar e enviar o acesso:**
1. Acesse o perfil do contato em **Contatos → [Nome do Contato]**.
2. Clique em **Gerar Magic Link** ou **Enviar Portal por E-mail**.
3. O cliente recebe o link por e-mail e acessa o portal sem precisar de senha.

---

## 11. Administração *(somente Admin/Gerente)*

### 11.1 Usuários

Gestão de todos os usuários do sistema.

**Funcionalidades:**
- Listar todos os usuários com status e perfil.
- Criar usuário manualmente (sem precisar que ele faça login primeiro).
- Alterar perfil (admin, gerente, analista, assistente).
- Aprovar ou rejeitar usuários pendentes.
- Ativar ou desativar acesso.

**Para promover um usuário a Admin:** Altere o campo *Role* para `admin` no card do usuário. Apenas admins podem promover outros admins.

### 11.2 Configurações

Configurações gerais do sistema.

**Seções disponíveis:**
- **Perfil da Empresa** — nome, logo, CNPJ, endereço.
- **Integrações** — Z-API (WhatsApp), Brevo (e-mail), Stripe (pagamentos).
- **Notificações** — configurar alertas por e-mail para eventos do sistema.
- **Pagamento** — gerenciar chaves do Stripe (modo teste/produção).

### 11.3 Portal Visual

Personalização da identidade visual do sistema e do Portal do Cliente.

**Funcionalidades:**
- Alterar cores primárias e secundárias.
- Fazer upload do logotipo do estúdio.
- Personalizar o cabeçalho e rodapé do Portal do Cliente.
- Pré-visualizar as alterações antes de salvar.

---

## 12. Busca Global

A busca global (`⌘K` no Mac, `Ctrl+K` no Windows/Linux) permite encontrar rapidamente qualquer registro do sistema.

**O que é buscado:**
- Páginas de navegação (Dashboard, Contatos, Pipeline, etc.).
- Contatos por nome, e-mail ou telefone.
- Faturas por número.
- Contratos por título.

> **Nota:** Itens de WhatsApp e Análise IA aparecem na busca global apenas para usuários com perfil **Admin**.

---

## 13. Limitações Conhecidas

As seguintes limitações são conhecidas na versão atual do sistema:

| # | Módulo | Limitação |
|---|---|---|
| 1 | **WhatsApp** | O Z-API no modo multi-device não suporta busca de histórico de mensagens. Mensagens anteriores à configuração do webhook não são recuperáveis. |
| 2 | **WhatsApp** | O botão "Buscar Histórico" no chat retorna 0 mensagens — é uma limitação da API Z-API, não um bug do sistema. |
| 3 | **Automações** | A execução de ações de WhatsApp nas automações depende da instância Z-API estar conectada e do webhook configurado. |
| 4 | **Stripe** | O ambiente está em modo sandbox (teste). Pagamentos reais requerem a ativação das chaves live em **Configurações → Pagamento**. |
| 5 | **Contratos** | A assinatura digital é via portal web — não há suporte a assinatura por canvas (desenho) na versão atual. |
| 6 | **Portal do Cliente** | O token de acesso ao portal não expira automaticamente — deve ser revogado manualmente se necessário. |
| 7 | **Analytics** | Faturas marcadas como pagas manualmente sem data de pagamento podem não aparecer nos gráficos de receita. |

---

*Manual gerado em 29 de março de 2026. Para reportar problemas ou solicitar novas funcionalidades, entre em contato com o administrador do sistema.*
