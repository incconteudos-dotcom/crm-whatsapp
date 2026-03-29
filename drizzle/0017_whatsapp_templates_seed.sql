-- Seed: 16 WhatsApp message templates por etapa do funil
-- Sprint 2 — WhatsApp Refactor

INSERT IGNORE INTO `message_templates` (`name`, `category`, `channel`, `content`, `variables`, `createdAt`, `updatedAt`) VALUES

-- PRIMEIRO CONTATO
('Boas-vindas',
 'primeiro_contato', 'whatsapp',
 'Oi, {{nome}}! 😊 Aqui é {{agente}}, do Pátio Estúdios.\n\nFicamos felizes com seu contato! Para te ajudar da melhor forma, me conta: o que você quer criar? Podcast, videocast, entrevistas...?\n\nPode ser bem informal aqui mesmo! 🎙️',
 '["nome","agente"]', NOW(), NOW()),

('Pergunta sobre preço',
 'primeiro_contato', 'whatsapp',
 'Oi, {{nome}}! Boa pergunta — vou ser transparente com você 😊\n\nOs valores variam pelo formato e escopo do projeto. Temos pacotes a partir de R$ 497.\n\nMe conta mais sobre o que você quer criar? Com isso te passo um número bem mais preciso.',
 '["nome"]', NOW(), NOW()),

-- QUALIFICAÇÃO
('Qualificação inicial',
 'qualificacao', 'whatsapp',
 'Que legal, {{nome}}! Já estou imaginando o projeto 🎙️\n\nMe conta:\n1️⃣ Qual seria o tema central?\n2️⃣ Sozinho ou com convidados?\n3️⃣ Tem ideia de frequência? (semanal, quinzenal...)',
 '["nome"]', NOW(), NOW()),

('Descobrir urgência',
 'qualificacao', 'whatsapp',
 'Perfeito, {{nome}}! E me ajuda com uma coisa:\n\nVocê tem alguma data em mente para lançar? Ou é algo mais para quando o projeto estiver redondo?\n\nPergunto porque isso me ajuda a montar a proposta certa 😊',
 '["nome"]', NOW(), NOW()),

('Descobrir orçamento',
 'qualificacao', 'whatsapp',
 'Ótimo, {{nome}}! Só mais uma coisa para eu te ajudar melhor:\n\nVocê já tem uma ideia de quanto quer investir no projeto? Pode ser uma faixa mesmo.\n\nPergunto porque temos formatos bem diferentes e quero te mostrar o que faz mais sentido para você agora.',
 '["nome"]', NOW(), NOW()),

-- PROPOSTA
('Envio de proposta',
 'proposta', 'whatsapp',
 'Oi, {{nome}}! Preparei a proposta personalizada para o seu projeto 🎙️\n\nMontei três opções pensando no que você me contou:\n📦 Start+ → Para começar com qualidade\n🚀 Pro+ → O mais escolhido. Produção completa\n👑 Vip+ → Experiência premium, zero preocupação\n\nEstou enviando o PDF agora. Qual opção chamou mais atenção?',
 '["nome"]', NOW(), NOW()),

('Confirmação de recebimento',
 'proposta', 'whatsapp',
 'Oi, {{nome}}! Só passando para confirmar que o PDF chegou certinho 📄\n\nSe preferir, posso te passar um resumo aqui mesmo no WhatsApp — às vezes é mais prático do que abrir arquivo.\n\nTem alguma dúvida que posso já responder? 😊',
 '["nome"]', NOW(), NOW()),

-- FOLLOW-UP
('Follow-up leve D+2',
 'follow_up', 'whatsapp',
 'Oi, {{nome}}! Tudo bem? 😊\n\nPassaram alguns dias desde que enviei a proposta e queria saber se você teve chance de olhar.\n\nSurgiu alguma dúvida? Posso adaptar algo para ficar mais dentro do que você precisa.',
 '["nome"]', NOW(), NOW()),

('Follow-up com valor D+5',
 'follow_up', 'whatsapp',
 'Oi, {{nome}}! Aqui é {{agente}} do Pátio Estúdios.\n\nSeparei um case que acho que vai te interessar — um cliente que começou exatamente do mesmo ponto que você e hoje está no 20º episódio com mais de 2.000 ouvintes.\n\nQuando quiser dar esse próximo passo, a gente está aqui 🎙️',
 '["nome","agente"]', NOW(), NOW()),

('Follow-up urgência D+10',
 'follow_up', 'whatsapp',
 'Oi, {{nome}}! Não quero encher sua caixa, então vou ser direto 😊\n\nNossa agenda está fechando e estou reservando as últimas vagas do mês.\n\nSe ainda tem interesse, me fala qualquer coisa. Se não for o momento certo, tudo bem! Guardo seu contato.',
 '["nome"]', NOW(), NOW()),

('Reativação fria D+30',
 'follow_up', 'whatsapp',
 'Oi, {{nome}}! Faz um tempo que não nos falamos 👋\n\nVi que você demonstrou interesse no estúdio e queria saber se ainda está no radar criar seu podcast.\n\nTemos algumas novidades no portfólio e datas abertas. Se quiser, posso te contar? 🎙️',
 '["nome"]', NOW(), NOW()),

-- FECHAMENTO
('Resumo para fechamento',
 'fechamento', 'whatsapp',
 'Oi, {{nome}}! Para facilitar a decisão, aqui vai o resumo:\n\n✅ Pacote confirmado\n✅ Gravação: a combinar\n✅ Entrega: conforme proposta\n\nPara confirmar, é só me falar "fechado" e eu te mando o link de pagamento + contrato 😊',
 '["nome"]', NOW(), NOW()),

('Confirmação de fechamento',
 'fechamento', 'whatsapp',
 '🎉 Fechamos, {{nome}}! Que alegria!\n\nO que acontece agora:\n1️⃣ Link de pagamento em seguida\n2️⃣ Contrato para assinar digitalmente\n3️⃣ Equipe entra em contato para briefing\n\nBem-vindo(a) à família Pátio Estúdios! 🎙️🚀',
 '["nome"]', NOW(), NOW()),

-- ONBOARDING
('Boas-vindas pós-pagamento',
 'onboarding', 'whatsapp',
 'Oi, {{nome}}! Aqui é {{agente}}, produtor responsável pelo seu projeto 🎙️\n\nSeja muito bem-vindo(a)!\n\nPara começarmos:\n📋 Nome do programa\n🎯 Público-alvo\n📝 Já tem pauta para a 1ª gravação?\n📅 Data sugerida: a combinar\n\nPode responder aqui mesmo 😊',
 '["nome","agente"]', NOW(), NOW()),

('Lembrete D-1 gravação',
 'onboarding', 'whatsapp',
 'Oi, {{nome}}! Amanhã é o grande dia! 🎉\n\n📍 Local: Pátio Estúdios\n⏰ Chegue 10 minutos antes\n👕 Evite camisas listradas ou brancas\n🎤 Traga sua pauta no celular\n\nQualquer dúvida me chama. Vai arrasar! 🚀',
 '["nome"]', NOW(), NOW()),

-- NPS / RETENÇÃO
('Pesquisa NPS',
 'nps', 'whatsapp',
 'Oi, {{nome}}! Como está indo o projeto? 🎉\n\nQuero saber sua opinião honesta sobre a experiência.\n\nEm uma escala de 0 a 10, quanto você recomendaria o Pátio Estúdios para um amigo?\n\n0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟\n\nSua resposta nos ajuda muito! 🙏',
 '["nome"]', NOW(), NOW());
