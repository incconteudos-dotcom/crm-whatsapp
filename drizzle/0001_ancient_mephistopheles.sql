CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`contactId` int,
	`leadId` int,
	`type` enum('whatsapp','email','call','note','status_change','contract','invoice','booking') NOT NULL,
	`description` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`whatsappJid` varchar(128),
	`company` varchar(255),
	`position` varchar(128),
	`tags` json DEFAULT ('[]'),
	`notes` text,
	`avatarUrl` text,
	`source` enum('manual','whatsapp','import','website') DEFAULT 'manual',
	`assignedUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`contactId` int,
	`leadId` int,
	`assignedUserId` int,
	`status` enum('draft','sent','signed','cancelled') DEFAULT 'draft',
	`content` text,
	`fileUrl` text,
	`signatureUrl` text,
	`signedAt` timestamp,
	`signerName` varchar(255),
	`signerEmail` varchar(320),
	`value` decimal(12,2),
	`validUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(64) NOT NULL,
	`contactId` int,
	`leadId` int,
	`contractId` int,
	`assignedUserId` int,
	`status` enum('draft','sent','paid','overdue','cancelled') DEFAULT 'draft',
	`items` json DEFAULT ('[]'),
	`subtotal` decimal(12,2),
	`tax` decimal(12,2) DEFAULT '0',
	`total` decimal(12,2),
	`currency` varchar(8) DEFAULT 'BRL',
	`dueDate` timestamp,
	`paidAt` timestamp,
	`stripePaymentIntentId` varchar(255),
	`stripePaymentUrl` text,
	`fileUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`contactId` int,
	`stageId` int,
	`assignedUserId` int,
	`value` decimal(12,2),
	`currency` varchar(8) DEFAULT 'BRL',
	`probability` int DEFAULT 0,
	`expectedCloseDate` timestamp,
	`status` enum('open','won','lost') DEFAULT 'open',
	`notes` text,
	`tags` json DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`color` varchar(16) DEFAULT '#6366f1',
	`position` int DEFAULT 0,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pipeline_stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(64) NOT NULL,
	`contactId` int,
	`leadId` int,
	`assignedUserId` int,
	`status` enum('draft','sent','accepted','rejected','expired') DEFAULT 'draft',
	`items` json DEFAULT ('[]'),
	`subtotal` decimal(12,2),
	`discount` decimal(12,2) DEFAULT '0',
	`tax` decimal(12,2) DEFAULT '0',
	`total` decimal(12,2),
	`currency` varchar(8) DEFAULT 'BRL',
	`validUntil` timestamp,
	`fileUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `studio_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int,
	`leadId` int,
	`assignedUserId` int,
	`title` varchar(255) NOT NULL,
	`sessionType` enum('recording','mixing','mastering','rehearsal','other') DEFAULT 'recording',
	`status` enum('scheduled','confirmed','in_progress','completed','cancelled') DEFAULT 'scheduled',
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`studio` varchar(128) DEFAULT 'Estúdio Principal',
	`engineer` varchar(255),
	`notes` text,
	`value` decimal(12,2),
	`invoiceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studio_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assignedUserId` int,
	`contactId` int,
	`leadId` int,
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`status` enum('pending','in_progress','done','cancelled') DEFAULT 'pending',
	`dueDate` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_chats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jid` varchar(128) NOT NULL,
	`name` varchar(255),
	`isGroup` boolean DEFAULT false,
	`contactId` int,
	`lastMessageAt` timestamp,
	`lastMessagePreview` text,
	`unreadCount` int DEFAULT 0,
	`syncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_chats_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_chats_jid_unique` UNIQUE(`jid`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` varchar(255) NOT NULL,
	`chatJid` varchar(128) NOT NULL,
	`chatId` int,
	`senderJid` varchar(128),
	`senderName` varchar(255),
	`crmUserId` int,
	`crmUserName` varchar(255),
	`content` text,
	`mediaType` enum('text','image','video','audio','document','sticker') DEFAULT 'text',
	`mediaUrl` text,
	`isFromMe` boolean DEFAULT false,
	`timestamp` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_messages_messageId_unique` UNIQUE(`messageId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','gerente','analista','assistente') NOT NULL DEFAULT 'assistente';--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('pending','active','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `whatsappAccess` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);