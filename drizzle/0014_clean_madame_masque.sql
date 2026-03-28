CREATE TABLE `nps_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contact_id` int NOT NULL,
	`score` int,
	`comment` text,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`responded_at` timestamp,
	`channel` varchar(20) DEFAULT 'whatsapp',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nps_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chat_id` int NOT NULL,
	`chat_jid` varchar(128) NOT NULL,
	`contact_id` int,
	`contact_name` varchar(255),
	`messages_analyzed` int DEFAULT 0,
	`opportunity_score` int DEFAULT 0,
	`stage` varchar(50),
	`estimated_value` decimal(12,2),
	`urgency` varchar(20) DEFAULT 'low',
	`summary` text,
	`suggestions_json` text,
	`services_detected` text,
	`analyzed_at` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_analysis_id` PRIMARY KEY(`id`)
);
