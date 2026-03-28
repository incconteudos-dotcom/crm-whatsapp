CREATE TABLE `automation_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequence_id` int NOT NULL,
	`step_id` int NOT NULL,
	`contact_id` int NOT NULL,
	`lead_id` int,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`scheduled_at` timestamp NOT NULL,
	`executed_at` timestamp,
	`error_message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `automation_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`trigger_stage` varchar(50) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_sequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequence_id` int NOT NULL,
	`step_order` int NOT NULL DEFAULT 1,
	`delay_days` int NOT NULL DEFAULT 1,
	`channel` varchar(20) NOT NULL DEFAULT 'whatsapp',
	`message_template` text NOT NULL,
	`subject` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `automation_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT 'follow_up',
	`channel` varchar(20) NOT NULL DEFAULT 'whatsapp',
	`subject` varchar(255),
	`content` text NOT NULL,
	`variables` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `message_templates_id` PRIMARY KEY(`id`)
);
