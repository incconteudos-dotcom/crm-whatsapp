CREATE TABLE `toc_action_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`constraint_id` int NOT NULL,
	`session_id` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assigned_to` int,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`priority` varchar(20) NOT NULL DEFAULT 'medium',
	`due_date` timestamp,
	`completed_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `toc_action_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `toc_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business_context` text,
	`domains` text NOT NULL DEFAULT ('["comercial","financeiro","producao","pessoas","tecnologia"]'),
	`weekly_day` varchar(20) NOT NULL DEFAULT 'monday',
	`weekly_time` varchar(10) NOT NULL DEFAULT '08:00',
	`auto_generate` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `toc_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `toc_constraints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int,
	`domain` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`severity` varchar(20) NOT NULL DEFAULT 'medium',
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`root_cause` text,
	`impact` text,
	`resolved_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `toc_constraints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `toc_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`week_date` timestamp NOT NULL,
	`summary` text,
	`main_constraint` text,
	`recommendations` text,
	`completed_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `toc_sessions_id` PRIMARY KEY(`id`)
);
