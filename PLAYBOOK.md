# Playbook Operacional — CRM Studio

> **Como operar, quando agir e o que fazer em cada situação.**
> Este documento é o guia prático da equipe para o dia a dia no CRM Studio.

---

## Índice

1. [Rotina Diária](#1-rotina-diária)
2. [Fluxo: Novo Cliente](#2-fluxo-novo-cliente)
3. [Fluxo: Agendamento de Estúdio](#3-fluxo-agendamento-de-estúdio)
4. [Fluxo: Ciclo Financeiro](#4-fluxo-ciclo-financeiro)
5. [Fluxo: Contrato](#5-fluxo-contrato)
6. [Fluxo: Produção de Podcast](#6-fluxo-produção-de-podcast)
7. [Fluxo: Pipeline de Vendas](#7-fluxo-pipeline-de-vendas)
8. [Referência Rápida — O que abrir quando...](#8-referência-rápida)
9. [Checklist Semanal do Gestor](#9-checklist-semanal-do-gestor)
10. [Situações Comuns e Soluções](#10-situações-comuns-e-soluções)
11. [6 Regras de Ouro](#11-6-regras-de-ouro)

---

## 1. Rotina Diária

![Rotina Diária](https://d2xsxph8kpxj0f.cloudfront.net/310419663028583829/Cy2Gc9yd7vWL7aTK7BRymU/flow_daily_routine_1c182390.png)

![GIF Rotina Diária](https://d2xsxph8kpxj0f.cloudfront.net/310419663028583829/Cy2Gc9yd7vWL7aTK7BRymU/gif_daily_routine_665c4afc.gif)

### Ao Chegar

1. Abrir o **Dashboard** → ler os 4 KPIs do topo (Receita, Leads, Taxa de Conversão, Sessões)
2. Verificar o bloco **"O que fazer hoje"** — resolver todas as ações urgentes antes de qualquer outra coisa
3. Checar **Atividade Recente** — ver o que aconteceu desde ontem

### Durante o Dia

- Registrar **toda** interação com cliente **no momento em que acontece**, não depois
- Ao receber um contato novo → criar o contato imediatamente em **Contatos**
- Ao receber um pedido de orçamento → criar um lead no **Pipeline**
- Ao fechar um serviço → emitir a fatura em **Faturas**

### Antes de Sair

1. Marcar como concluídas todas as tarefas finalizadas no dia
2. Atualizar prazos das tarefas que não foram concluídas
3. Verificar se há leads no Pipeline sem movimentação há mais de 3 dias

---

## 2. Fluxo: Novo Cliente

![Fluxo Novo Cliente](https://d2xsxph8kpxj0f.cloudfront.net/310419663028583829/Cy2Gc9yd7vWL7aTK7BRymU/flow_new_client_609fd279.png)

### Passo a Passo

| Passo | Onde | O que fazer |
|---|---|---|
| **1. Registrar Contato** | Contatos → Novo Contato | Nome, telefone, e-mail, empresa, tipo (Cliente/Lead/Parceiro) |
| **2. Criar Lead no Pipeline** | Pipeline → Novo Lead | Vincular ao contato, definir valor estimado, colocar no estágio "Primeiro Contato" |
| **3. Enviar Orçamento** | Orçamentos → Novo Orçamento | Vincular ao contato, adicionar itens, enviar por e-mail |
| **4. Assinar Contrato** | Contratos → Novo Contrato | Criar a partir do orçamento aceito, enviar para assinatura |
| **5. Emitir Fatura** | Faturas → Nova Fatura | Fatura de entrada (sinal), vincular ao contato |
| **6. Cliente Ativo** | Contatos | Alterar tipo para "Cliente", vincular agendamentos futuros |

> **Regra:** Nunca inicie um serviço sem contrato assinado e fatura de entrada emitida.

---

## 3. Fluxo: Agendamento de Estúdio

![Fluxo Agendamento Estúdio](https://d2xsxph8kpxj0f.cloudfront.net/310419663028583829/Cy2Gc9yd7vWL7aTK7BRymU/flow_studio_bb8c43bb.png)

### Passo a Passo

| Passo | Onde | O que fazer |
|---|---|---|
| **1. Verificar Disponibilidade** | Estúdio → Calendário | Checar se a sala e o equipamento estão livres no horário solicitado |
| **2. Criar Agendamento** | Estúdio → Novo Agendamento | Sala, data/hora, duração, cliente, equipamentos necessários |
| **3. Confirmar com Cliente** | Contatos ou WhatsApp | Enviar confirmação com data, hora e endereço |
| **4. Iniciar Sessão** | Estúdio → Agendamento | Alterar status para "Em andamento" no horário de início |
| **5. Concluir Sessão** | Estúdio → Agendamento | Alterar status para "Concluído" ao finalizar |
| **6. Emitir Fatura** | Faturas → Nova Fatura | Criar fatura referente à sessão concluída |

### Conflito de Agendamento

Se houver conflito de horário:
1. Verificar qual agendamento tem prioridade (cliente mais antigo / maior valor)
2. Contatar o cliente do agendamento mais recente para reagendar
3. Oferecer desconto ou benefício como compensação

---

## 4. Fluxo: Ciclo Financeiro

![Ciclo Financeiro](https://d2xsxph8kpxj0f.cloudfront.net/310419663028583829/Cy2Gc9yd7vWL7aTK7BRymU/flow_financial_6b553bc0.png)

![GIF Ciclo Financeiro](https://d2xsxph8kpxj0f.cloudfront.net/310419663028583829/Cy2Gc9yd7vWL7aTK7BRymU/gif_financial_15c83d92.gif)

### Do Orçamento ao Recebimento

| Etapa | Status | Quando mudar |
|---|---|---|
| Orçamento criado | Rascunho | Ao criar |
| Enviado ao cliente | Enviado | Ao enviar por e-mail |
| Cliente aprovou | Aceito | Ao receber confirmação |
| Contrato gerado | — | Converter orçamento em contrato |
| Fatura emitida | Pendente | Ao emitir a fatura |
| Pagamento recebido | Pago | Ao confirmar o pagamento |

### Faturas Vencidas

Quando uma fatura vencer sem pagamento:
1. Ir em **Faturas** → filtrar por "Vencida"
2. Contatar o cliente (WhatsApp ou e-mail)
3. Se não houver retorno em 48h → escalar para o gestor
4. Registrar a tentativa de cobrança nas notas do contato

### Créditos de Clientes

- Acesse **Créditos** para ver o saldo de cada cliente
- Créditos são gerados quando o cliente paga a mais ou recebe um reembolso parcial
- Ao emitir nova fatura, verifique se o cliente tem crédito disponível

---

## 5. Fluxo: Contrato

### Quando Criar um Contrato

- Sempre que um orçamento for aceito
- Sempre antes de iniciar qualquer serviço
- Para parcerias e acordos de longo prazo

### Passo a Passo

| Passo | Ação |
|---|---|
| **1** | Ir em **Contratos → Novo Contrato** |
| **2** | Vincular ao contato e ao orçamento aceito |
| **3** | Escolher o template adequado (Gravação, Produção, Pacote) |
| **4** | Revisar valores, datas e cláusulas |
| **5** | Alterar status para "Enviado" ao enviar para assinatura |
| **6** | Alterar para "Assinado" ao receber a assinatura |
| **7** | Emitir a fatura de entrada (sinal) |

> **Atenção:** Contratos com status "Rascunho" não têm validade jurídica. Sempre mude para "Enviado" ou "Assinado".

---

## 6. Fluxo: Produção de Podcast

![Fluxo Produção Podcast](https://d2xsxph8kpxj0f.cloudfront.net/310419663028583829/Cy2Gc9yd7vWL7aTK7BRymU/flow_podcast_ab95fd6e.png)

### Status dos Episódios

| Status | Significado | Próxima Ação |
|---|---|---|
| **Roteiro** | Conteúdo sendo planejado | Finalizar roteiro e agendar gravação |
| **Gravação** | Sessão de gravação agendada/realizada | Enviar para edição |
| **Edição** | Em processo de edição | Aguardar entrega do editor |
| **Revisão** | Pronto para aprovação | Cliente ou gestor revisar |
| **Agendado** | Data de publicação definida | Aguardar a data |
| **Publicado** | No ar | Divulgar nas redes |
| **Arquivado** | Cancelado ou descontinuado | Nenhuma |

### Gestão de Episódios

1. Acesse **Podcast → Episódios**
2. Crie um novo episódio com título, número, data de publicação e descrição
3. Atualize o status conforme o progresso
4. Vincule ao cliente/podcast correspondente

---

## 7. Fluxo: Pipeline de Vendas

![Pipeline de Vendas](https://d2xsxph8kpxj0f.cloudfront.net/310419663028583829/Cy2Gc9yd7vWL7aTK7BRymU/flow_pipeline_a17bee11.png)

![GIF Pipeline](https://d2xsxph8kpxj0f.cloudfront.net/310419663028583829/Cy2Gc9yd7vWL7aTK7BRymU/gif_pipeline_f4af8dc2.gif)

### Estágios e Ações

| Estágio | O que significa | Ação imediata |
|---|---|---|
| **Primeiro Contato** | Lead acabou de entrar | Ligar ou responder em até 2 horas |
| **Qualificação** | Entendendo a necessidade | Fazer perguntas: orçamento, prazo, objetivo |
| **Proposta Enviada** | Orçamento enviado | Follow-up em 48 horas se não houver resposta |
| **Negociação** | Cliente pediu ajuste | Responder em até 24 horas com nova proposta |
| **Fechamento** | Decisão iminente | Pressionar gentilmente por uma data de decisão |
| **Ganho** | Serviço fechado | Criar contrato imediatamente |
| **Perdido** | Não converteu | Registrar o motivo da perda |

### Regras do Pipeline

- Lead parado no mesmo estágio há **mais de 7 dias** = ação imediata obrigatória
- Todo lead deve ter um **valor estimado** preenchido
- Ao mover para "Ganho" → criar contrato no mesmo dia
- Ao mover para "Perdido" → sempre registrar o motivo

---

## 8. Referência Rápida

| Quando eu preciso... | Abrir este módulo |
|---|---|
| Cadastrar um novo cliente ou lead | **Contatos → Novo Contato** |
| Ver o que tenho para fazer hoje | **Dashboard → "O que fazer hoje"** |
| Agendar uma sessão de estúdio | **Estúdio → Novo Agendamento** |
| Criar uma proposta de preço | **Orçamentos → Novo Orçamento** |
| Formalizar um serviço fechado | **Contratos → Novo Contrato** |
| Cobrar um cliente | **Faturas → Nova Fatura** |
| Ver se um cliente tem crédito | **Créditos** |
| Acompanhar leads em negociação | **Pipeline** |
| Ver o histórico de um cliente | **Contatos → Ver Perfil** |
| Gerenciar episódios de podcast | **Podcast → Episódios** |
| Ver receita e métricas | **Dashboard** ou **Analytics** |
| Criar uma tarefa para a equipe | **Tarefas → Nova Tarefa** |
| Configurar automações | **Automações** (admin) |
| Gerenciar usuários da equipe | **Configurações → Usuários** (admin) |

---

## 9. Checklist Semanal do Gestor

### Toda Segunda-Feira

**Comercial:**
- [ ] Revisar todos os leads no Pipeline — há algum parado há mais de 7 dias?
- [ ] Verificar taxa de conversão da semana anterior
- [ ] Definir meta de novos leads para a semana

**Financeiro:**
- [ ] Verificar faturas vencidas — cobrar os inadimplentes
- [ ] Conferir receita realizada vs. meta do mês
- [ ] Aprovar orçamentos pendentes de revisão

**Produção:**
- [ ] Verificar agendamentos da semana — há conflitos?
- [ ] Checar status dos episódios em produção
- [ ] Confirmar disponibilidade de equipamentos

**Equipe:**
- [ ] Verificar tarefas atribuídas sem prazo definido
- [ ] Checar tarefas vencidas sem conclusão
- [ ] Dar feedback sobre atividades da semana anterior

---

## 10. Situações Comuns e Soluções

### "Um cliente quer remarcar a sessão"

1. Ir em **Estúdio → Agendamentos**
2. Abrir o agendamento → alterar data e hora
3. Confirmar nova disponibilidade de sala e equipamentos
4. Notificar o cliente com a confirmação

### "Recebi um pagamento mas a fatura ainda aparece como pendente"

1. Ir em **Faturas** → abrir a fatura
2. Clicar em **Registrar Pagamento**
3. Informar data, valor e método de pagamento
4. O status muda automaticamente para "Pago"

### "Um lead sumiu após receber o orçamento"

1. Aguardar 48h após o envio
2. Enviar follow-up: *"Olá [nome], tudo bem? Gostaria de saber se teve a oportunidade de analisar nossa proposta."*
3. Se não responder em mais 48h → tentar por outro canal (WhatsApp, telefone)
4. Se não responder em 7 dias → mover para "Perdido" com motivo "Sem resposta"

### "Preciso dar um desconto que não estava no orçamento"

1. Ir em **Orçamentos** → abrir o orçamento
2. Editar o item ou adicionar um item de desconto com valor negativo
3. Reenviar o orçamento atualizado ao cliente
4. Registrar o motivo do desconto nas notas

### "Um cliente quer cancelar um serviço já contratado"

1. Verificar o contrato — há cláusula de cancelamento?
2. Verificar se há fatura de entrada já paga (sinal)
3. Definir com o gestor o valor de reembolso (se houver)
4. Alterar o status do contrato para "Cancelado"
5. Emitir crédito ou reembolso em **Créditos** se aplicável

### "Preciso ver o histórico completo de um cliente"

1. Ir em **Contatos** → buscar o cliente
2. Clicar em **Ver Perfil Completo**
3. O perfil mostra: agendamentos, faturas, contratos, orçamentos, tarefas e notas

### "Dois membros da equipe editaram o mesmo lead"

1. O sistema registra a última edição — verificar quem editou por último
2. Combinar com a equipe quem é o responsável pelo lead
3. Usar o campo "Responsável" no lead para evitar duplicidade

---

## 11. 6 Regras de Ouro

![Regras de Ouro](https://d2xsxph8kpxj0f.cloudfront.net/310419663028583829/Cy2Gc9yd7vWL7aTK7BRymU/golden_rules_cd2a58aa.png)

### 1. Registre na hora, não depois

Toda interação com cliente deve ser registrada no momento em que acontece. Memória falha; o CRM não.

### 2. Todo cliente tem um contato cadastrado

Nenhuma fatura, contrato ou agendamento deve existir sem um contato vinculado. Dados soltos não têm valor.

### 3. O Pipeline reflete a realidade

Mova os leads conforme o avanço real da negociação. Pipeline inflado com leads "mortos" distorce as métricas e as decisões.

### 4. Fatura emitida, fatura acompanhada

Toda fatura emitida deve ser monitorada até o pagamento. Fatura sem follow-up é receita perdida.

### 5. Contrato antes de qualquer serviço

Nenhum serviço começa sem contrato assinado. Isso protege o estúdio e o cliente.

### 6. Dados limpos, decisões melhores

Preencha todos os campos relevantes. Quanto mais completo o cadastro, mais precisas são as análises e previsões do Dashboard.

---

> *"Informação não registrada não existe para a equipe."*

---

**Versão:** 1.1 — Atualizado em 29/03/2026
**Responsável:** Administrador do Sistema
