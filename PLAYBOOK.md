# Playbook Operacional — CRM Studio

**Versão:** 29 de março de 2026  
**Para:** Toda a equipe do Pátio Estúdio  
**URL do sistema:** [patioestudioscrm.manus.space](https://patioestudioscrm.manus.space)

> Este playbook descreve **como operar o CRM Studio no dia a dia** — quando usar cada módulo, em que ordem executar cada fluxo e o que fazer em cada situação. Leia do início ao fim uma vez e depois use como referência rápida.

---

## Sumário

1. [Rotina Diária da Equipe](#1-rotina-diária-da-equipe)
2. [Fluxo Completo de um Novo Cliente](#2-fluxo-completo-de-um-novo-cliente)
3. [Fluxo de Agendamento de Estúdio](#3-fluxo-de-agendamento-de-estúdio)
4. [Fluxo Financeiro — Do Orçamento ao Recebimento](#4-fluxo-financeiro--do-orçamento-ao-recebimento)
5. [Fluxo de Contrato](#5-fluxo-de-contrato)
6. [Fluxo de Podcast — Da Ideia à Publicação](#6-fluxo-de-podcast--da-ideia-à-publicação)
7. [Gestão do Pipeline de Vendas](#7-gestão-do-pipeline-de-vendas)
8. [Quando Usar Cada Módulo](#8-quando-usar-cada-módulo)
9. [Checklist Semanal do Gestor](#9-checklist-semanal-do-gestor)
10. [Situações Comuns e Como Resolver](#10-situações-comuns-e-como-resolver)
11. [Regras de Ouro do CRM](#11-regras-de-ouro-do-crm)

---

## 1. Rotina Diária da Equipe

A rotina diária começa sempre pelo **Dashboard**. Ele mostra o que precisa de atenção imediata antes de qualquer outra ação.

### Ao chegar (primeiros 10 minutos)

**Passo 1 — Verificar o Dashboard**

Acesse o Dashboard e leia os quatro cards de métricas: Receita do Mês, Leads Ativos, Taxa de Conversão e Sessões na Semana. Esses números dão o contexto do momento do negócio.

**Passo 2 — Resolver "O que fazer hoje"**

O bloco "O que fazer hoje" lista tarefas com vencimento para o dia e faturas com cobrança pendente. Resolva esses itens antes de qualquer outra coisa — eles são as prioridades do dia.

**Passo 3 — Verificar a Atividade Recente**

O bloco "Atividade Recente" mostra o que aconteceu desde a última vez que você acessou o sistema: contratos assinados, faturas pagas, novos leads. Leia para estar atualizado sem precisar perguntar para a equipe.

**Passo 4 — Abrir as Tarefas**

Acesse **Gestão → Tarefas** e filtre pelo seu nome. Veja o que está pendente para hoje e para os próximos dois dias. Atualize o status das tarefas que você concluiu ontem.

### Durante o dia

Registre **tudo** no CRM no momento em que acontece. Não deixe para depois. Uma ligação feita, um e-mail enviado, uma reunião realizada — cada interação com o cliente deve virar uma atividade registrada no perfil do contato. Isso garante que qualquer membro da equipe possa assumir um cliente sem perder contexto.

### Antes de sair (últimos 5 minutos)

Acesse **Gestão → Tarefas** e marque como concluídas todas as tarefas finalizadas no dia. Se uma tarefa não foi concluída, atualize o prazo ou adicione uma nota explicando o motivo. Nunca deixe tarefas vencidas sem tratamento.

---

## 2. Fluxo Completo de um Novo Cliente

Este é o fluxo principal do CRM — desde o primeiro contato até o cliente ativo e pagante.

```
Interesse → Contato → Lead → Proposta → Contrato → Fatura → Cliente Ativo
```

### Etapa 1 — Registrar o Contato

Quando alguém demonstra interesse nos serviços do estúdio, a **primeira ação** é criar um contato em **Comercial → Contatos → Novo Contato**.

Preencha obrigatoriamente: Nome completo, Telefone (com DDD), E-mail. Adicione a tag `lead` para identificar que ainda não é cliente. Se veio por indicação, registre na nota de onde veio o contato.

> **Regra:** Nunca inicie uma negociação sem ter o contato cadastrado. O CRM só funciona se os dados estiverem lá.

### Etapa 2 — Criar o Lead no Pipeline

Com o contato criado, vá em **Comercial → Pipeline → Novo Lead** e vincule ao contato recém-cadastrado. Selecione o estágio inicial (geralmente "Primeiro Contato" ou "Qualificação") e atribua um responsável.

O lead é o registro da **oportunidade de negócio**. O contato é a pessoa — o lead é a venda em andamento.

### Etapa 3 — Qualificar e Avançar no Pipeline

A cada interação com o lead, registre uma atividade no card do lead (ligação, e-mail, reunião) e mova-o para o próximo estágio conforme o avanço da negociação. Os estágios típicos são:

| Estágio | O que significa | O que fazer |
|---|---|---|
| **Primeiro Contato** | Lead recém-chegado | Ligar ou responder em até 2h |
| **Qualificação** | Entendendo a necessidade | Fazer perguntas, entender o projeto |
| **Proposta Enviada** | Orçamento enviado | Aguardar retorno, fazer follow-up em 48h |
| **Negociação** | Discutindo valores/escopo | Ajustar proposta se necessário |
| **Fechamento** | Decisão iminente | Pressionar gentilmente por decisão |

### Etapa 4 — Enviar o Orçamento

Quando o lead está qualificado e pronto para receber uma proposta, acesse **Financeiro → Orçamentos → Novo Orçamento**. Vincule ao contato, adicione os itens de serviço, defina o prazo de validade (recomendado: 7 dias) e clique em **Enviar por E-mail**.

O cliente recebe o orçamento por e-mail com um link para visualizar e aceitar.

### Etapa 5 — Converter em Contrato

Quando o cliente aceitar o orçamento, vá no orçamento e clique em **Converter em Contrato**. O sistema cria automaticamente um contrato com os dados do orçamento. Revise o contrato, selecione o modelo de cláusulas adequado e clique em **Enviar para Assinatura**.

O cliente recebe um link para assinar digitalmente pelo Portal do Cliente.

### Etapa 6 — Faturar

Após a assinatura do contrato, crie a fatura de entrada (sinal/entrada) em **Financeiro → Faturas → Nova Fatura**. Vincule ao contato e ao contrato. Defina o vencimento e envie por e-mail.

Quando o pagamento for confirmado, marque a fatura como **Paga** e registre a data do pagamento.

### Etapa 7 — Ativar o Cliente

Com o contrato assinado e o sinal pago, altere a tag do contato de `lead` para `cliente`. A partir daqui, o cliente entra no fluxo operacional: agendamentos, produção, faturas recorrentes.

---

## 3. Fluxo de Agendamento de Estúdio

Use este fluxo sempre que um cliente precisar reservar uma sala de estúdio.

### Passo 1 — Verificar disponibilidade

Acesse **Produção → Estúdio** e visualize o calendário. Verifique se a sala desejada está disponível no horário solicitado. Se houver conflito, ofereça alternativas de horário ou sala.

### Passo 2 — Criar o agendamento

Clique em **Novo Agendamento** e preencha:

| Campo | O que colocar |
|---|---|
| **Contato** | Buscar pelo nome do cliente |
| **Sala** | Sala selecionada |
| **Data e Hora** | Início e término da sessão |
| **Equipamentos** | Selecionar o que será usado |
| **Observações** | Tipo de gravação, necessidades especiais |

Salve com status **Agendado**.

### Passo 3 — Confirmar com o cliente

Após criar o agendamento, envie uma confirmação ao cliente (por e-mail ou WhatsApp). Mude o status para **Confirmado** somente após o cliente confirmar o recebimento.

### Passo 4 — No dia da sessão

Ao iniciar a sessão, mude o status para **Em andamento**. Ao finalizar, mude para **Concluído**.

### Passo 5 — Faturar a sessão

Com o agendamento concluído, crie a fatura correspondente em **Financeiro → Faturas**. Se o cliente tiver créditos pré-pagos, debite em **Créditos** em vez de gerar fatura.

---

## 4. Fluxo Financeiro — Do Orçamento ao Recebimento

O ciclo financeiro completo segue esta sequência:

```
Orçamento (Rascunho) → Enviado → Aceito → Contrato → Fatura (Rascunho) → Enviada → Paga
```

### Quando criar um Orçamento

Crie um orçamento sempre que um cliente pedir uma proposta formal. Nunca passe valores verbalmente sem registrar no sistema — o orçamento é o documento oficial da proposta.

### Quando criar uma Fatura

Crie faturas nas seguintes situações:

- **Sinal/entrada:** logo após a assinatura do contrato (geralmente 30–50% do valor total).
- **Parcelas:** conforme o cronograma acordado no contrato.
- **Sessão avulsa:** após cada sessão de estúdio concluída.
- **Serviço recorrente:** no início de cada período (mensal, trimestral).

### Controle de inadimplência

Faturas com vencimento passado aparecem automaticamente com status **Vencida** no sistema. O procedimento padrão é:

1. **Dia 1 após vencimento:** enviar lembrete por e-mail pelo sistema (botão "Reenviar" na fatura).
2. **Dia 3:** contato direto por WhatsApp ou telefone.
3. **Dia 7:** notificar o gestor e avaliar suspensão de serviços.

### Quando usar Créditos vs. Fatura

Use **Créditos** quando o cliente comprou um pacote pré-pago de horas ou sessões. A cada sessão realizada, debite os créditos em vez de emitir fatura avulsa. Emita fatura apenas para a compra do pacote em si.

---

## 5. Fluxo de Contrato

Os contratos formalizam o acordo com o cliente e protegem o estúdio juridicamente.

### Quando criar um contrato

Crie um contrato para **todo cliente novo** antes de iniciar qualquer serviço. Não inicie gravações, produções ou agendamentos recorrentes sem contrato assinado.

### Usando Modelos de Contrato

Acesse **Gestão → Modelos de Contrato** para ver os modelos disponíveis. Selecione o modelo adequado ao tipo de serviço (locação de estúdio, produção de podcast, serviço recorrente) e o sistema preenche automaticamente os campos padrão.

Personalize apenas o que for específico para aquele cliente: valores, datas, escopo do projeto.

### Assinatura Digital

Após finalizar o contrato, clique em **Enviar para Assinatura**. O cliente recebe um e-mail com o link do Portal do Cliente onde pode ler e assinar digitalmente. Você acompanha o status em tempo real — o contrato muda de **Enviado** para **Assinado** automaticamente quando o cliente assina.

> **Atenção:** Não marque o lead como "Ganho" manualmente. O sistema faz isso automaticamente quando o contrato é assinado.

---

## 6. Fluxo de Podcast — Da Ideia à Publicação

Use este fluxo para gerenciar a produção de podcasts de clientes.

### Passo 1 — Criar o Podcast

Acesse **Produção → Podcasts → Novo Podcast** e vincule ao contato do cliente. Preencha o nome do programa, descrição e frequência de publicação.

### Passo 2 — Criar os Episódios

Para cada episódio, clique em **Novo Episódio** dentro do podcast. O episódio começa no status **Roteiro**.

### Passo 3 — Acompanhar o Status de Produção

Mova o episódio pelos estágios conforme a produção avança:

| Status | O que está acontecendo |
|---|---|
| **Roteiro** | Pauta e roteiro sendo elaborados |
| **Gravação** | Sessão de gravação agendada ou realizada |
| **Edição** | Arquivo em edição de áudio/vídeo |
| **Revisão** | Cliente revisando o material editado |
| **Agendado** | Data de publicação definida |
| **Publicado** | Episódio no ar |
| **Arquivado** | Episódio descontinuado |

### Passo 4 — Registrar notas por episódio

Use o campo de comentários do episódio para registrar feedbacks do cliente, ajustes solicitados e aprovações. Isso evita retrabalho e mantém o histórico de decisões.

---

## 7. Gestão do Pipeline de Vendas

O Pipeline é o coração comercial do CRM. Ele precisa estar sempre atualizado para refletir a realidade das negociações.

### Regras do Pipeline

**Regra 1 — Todo lead tem dono.** Cada lead deve ter um responsável atribuído. Leads sem responsável ficam esquecidos.

**Regra 2 — Atualizar na hora.** Após cada interação com o lead (ligação, reunião, e-mail), registre a atividade e mova o lead para o estágio correto imediatamente. Não deixe para depois.

**Regra 3 — Lead parado é lead morto.** Se um lead ficar mais de 7 dias sem movimentação, ele precisa de atenção. O sistema não alerta automaticamente — é responsabilidade do dono do lead verificar.

**Regra 4 — Fechar com clareza.** Quando uma negociação terminar, marque o lead como **Ganho** (se fechou) ou **Perdido** (se não fechou). Nunca deixe um lead "esquecido" no pipeline sem status final.

### Revisão semanal do Pipeline

Todo início de semana, o gestor deve revisar o pipeline com a equipe:

1. Verificar leads parados há mais de 7 dias.
2. Identificar leads em "Proposta Enviada" há mais de 3 dias sem resposta — fazer follow-up.
3. Verificar leads em "Negociação" — o que está travando o fechamento?
4. Celebrar os leads marcados como "Ganho" na semana anterior.

---

## 8. Quando Usar Cada Módulo

Esta tabela responde à pergunta "o que eu abro quando preciso fazer X?":

| Situação | Módulo a usar |
|---|---|
| Chegou um novo interessado | **Contatos** → criar contato + **Pipeline** → criar lead |
| Cliente quer agendar estúdio | **Produção → Estúdio** → novo agendamento |
| Preciso enviar uma proposta | **Financeiro → Orçamentos** → novo orçamento |
| Cliente aceitou a proposta | **Orçamentos** → converter em contrato |
| Preciso cobrar o cliente | **Financeiro → Faturas** → nova fatura |
| Cliente vai assinar o contrato | **Gestão → Contratos** → enviar para assinatura |
| Preciso criar uma tarefa para a equipe | **Gestão → Tarefas** → nova tarefa |
| Quero ver o histórico de um cliente | **Contatos** → clicar no nome → Perfil Completo |
| Preciso ver a receita do mês | **Dashboard** (card) ou **Analytics** (detalhado) |
| Cliente quer pagar online | **Financeiro → Produtos** → gerar link de checkout |
| Preciso registrar horas trabalhadas | **Ferramentas → Controle de Horas** |
| Quero exportar dados para planilha | **Ferramentas → Exportar Dados** |
| Preciso adicionar um novo usuário | **Administração → Usuários** (somente Admin/Gerente) |
| Quero configurar uma automação | **Comercial → Automações** |
| Preciso gerenciar equipamentos | **Produção → Equipamentos** |
| Cliente tem pacote pré-pago | **Financeiro → Créditos** |

---

## 9. Checklist Semanal do Gestor

Execute este checklist toda **segunda-feira** antes das 10h:

### Comercial
- [ ] Revisar leads parados há mais de 7 dias no Pipeline.
- [ ] Verificar leads em "Proposta Enviada" sem resposta — fazer follow-up.
- [ ] Conferir se todos os leads ganhos na semana anterior geraram contrato.
- [ ] Verificar se há contatos novos sem lead associado.

### Financeiro
- [ ] Verificar faturas vencidas — tomar ação de cobrança.
- [ ] Conferir orçamentos com validade expirando nos próximos 3 dias.
- [ ] Revisar receita do mês vs. meta (Dashboard → Receita do Mês).
- [ ] Verificar se há contratos assinados sem fatura de entrada emitida.

### Produção
- [ ] Conferir agendamentos da semana no calendário do Estúdio.
- [ ] Verificar equipamentos em manutenção — previsão de retorno.
- [ ] Revisar episódios de podcast em "Revisão" — cliente já aprovou?

### Equipe
- [ ] Verificar usuários com status "Pendente" — aprovar ou rejeitar.
- [ ] Revisar tarefas vencidas sem conclusão — redistribuir se necessário.
- [ ] Verificar se há tarefas sem responsável atribuído.

---

## 10. Situações Comuns e Como Resolver

### "O cliente quer cancelar o contrato"

1. Acesse **Gestão → Contratos** e localize o contrato.
2. Mude o status para **Cancelado**.
3. Vá no lead vinculado e marque como **Perdido**, registrando o motivo.
4. Se houver fatura paga, verifique se há reembolso a processar conforme as cláusulas do contrato.
5. Mantenha o contato cadastrado — clientes cancelados podem voltar.

### "O cliente não recebeu o e-mail do orçamento/fatura"

1. Acesse o orçamento ou fatura em questão.
2. Clique em **Reenviar por E-mail**.
3. Se o problema persistir, verifique o e-mail cadastrado no perfil do contato — pode estar errado.
4. Como alternativa, acesse o Portal do Cliente e envie o link diretamente por WhatsApp.

### "Preciso dar acesso ao sistema para um novo funcionário"

1. Acesse **Administração → Usuários → Criar Usuário**.
2. Preencha nome e e-mail.
3. Selecione o perfil adequado (gerente, analista ou assistente).
4. O funcionário acessa a URL do sistema e faz login com a conta Manus.
5. O sistema mostrará "Aguardando aprovação" — volte em **Usuários** e mude o status para **Ativo**.

### "Um cliente quer ver suas faturas e contratos sem precisar pedir para mim"

1. Acesse o perfil do contato em **Contatos → [Nome do Cliente]**.
2. Clique em **Gerar Magic Link** ou **Enviar Portal por E-mail**.
3. O cliente recebe um link e acessa o Portal do Cliente com todas as suas faturas, contratos e agendamentos.

### "Preciso ver tudo o que aconteceu com um cliente específico"

Acesse **Contatos**, busque o cliente e clique no nome para abrir o **Perfil Completo**. Lá você encontra o histórico completo: todas as atividades registradas, leads, contratos, faturas, agendamentos e notas — em ordem cronológica.

### "Quero saber quais clientes estão gerando mais receita"

Acesse **Ferramentas → Analytics** e filtre por período. O painel mostra receita por cliente, taxa de conversão e evolução mensal. Para exportar os dados, use **Ferramentas → Exportar Dados → Faturas**.

### "Um agendamento foi cancelado em cima da hora"

1. Acesse **Produção → Estúdio** e localize o agendamento.
2. Mude o status para **Cancelado** e registre o motivo na observação.
3. Se houver cobrança de taxa de cancelamento conforme contrato, emita uma fatura com o valor da taxa.
4. Libere o horário para outros agendamentos.

---

## 11. Regras de Ouro do CRM

Estas são as regras que, se seguidas por toda a equipe, garantem que o CRM funcione como deve:

**Regra 1 — Registre na hora, não depois.**
Cada ligação, reunião, e-mail ou decisão deve ser registrada no CRM imediatamente. Informação não registrada não existe para o restante da equipe.

**Regra 2 — Todo cliente tem um contato cadastrado.**
Nunca faça negócio com alguém que não está no sistema. O contato é a base de tudo — sem ele, não há lead, não há contrato, não há fatura.

**Regra 3 — O Pipeline reflete a realidade.**
Se um lead está em "Proposta Enviada" mas a proposta foi recusada há uma semana, isso é um dado errado que distorce todas as métricas. Mantenha o pipeline honesto.

**Regra 4 — Fatura emitida, fatura acompanhada.**
Toda fatura enviada precisa de follow-up. O sistema não cobra o cliente sozinho — ele apenas organiza a informação. A cobrança é responsabilidade da equipe.

**Regra 5 — Contrato antes de qualquer serviço.**
Nenhuma sessão de estúdio, nenhuma produção, nenhum serviço começa sem contrato assinado. Sem exceções.

**Regra 6 — Dados limpos, decisões melhores.**
Nomes escritos errado, telefones sem DDD, e-mails inválidos — dados ruins geram relatórios ruins e comunicações que não chegam. Corrija imediatamente quando encontrar.

---

*Playbook criado em 29 de março de 2026. Atualize este documento sempre que um novo fluxo for estabelecido ou uma regra for alterada.*
