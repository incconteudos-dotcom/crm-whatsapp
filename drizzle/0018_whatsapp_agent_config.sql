-- Tabela de configuração do agente IA por conversa WhatsApp
CREATE TABLE IF NOT EXISTS `whatsapp_agent_configs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `chatJid` varchar(128) NOT NULL,
  `enabled` boolean NOT NULL DEFAULT false,
  `systemPrompt` text,
  `lastAgentMessageAt` timestamp,
  `stageHint` varchar(128),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `whatsapp_agent_configs_id` PRIMARY KEY(`id`),
  CONSTRAINT `whatsapp_agent_configs_chatJid_unique` UNIQUE(`chatJid`)
);
