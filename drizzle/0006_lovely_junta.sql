CREATE TABLE `daily_routines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`completed_items` json DEFAULT ('[]'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_routines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pj_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`cnpj` varchar(18),
	`razao_social` varchar(255),
	`nome_fantasia` varchar(255),
	`inscricao_estadual` varchar(64),
	`endereco_completo` text,
	`responsavel_nome` varchar(255),
	`responsavel_cpf` varchar(14),
	`responsavel_email` varchar(320),
	`responsavel_telefone` varchar(32),
	`document_url` text,
	`extracted_data` json,
	`status` enum('pending','processing','completed','error') DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pj_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routine_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`order` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `routine_templates_id` PRIMARY KEY(`id`)
);
