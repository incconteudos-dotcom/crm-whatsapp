CREATE TABLE `brand_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_name` varchar(255) NOT NULL DEFAULT 'Pátio Estúdio',
	`logo_url` varchar(512),
	`primary_color` varchar(7) DEFAULT '#7c3aed',
	`accent_color` varchar(7) DEFAULT '#06b6d4',
	`tagline` varchar(255),
	`website` varchar(255),
	`support_email` varchar(255),
	`support_phone` varchar(50),
	`footer_text` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_magic_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`contact_id` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portal_magic_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `portal_magic_links_token_unique` UNIQUE(`token`)
);
