CREATE TABLE `lead_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lead_id` int NOT NULL,
	`user_id` int,
	`type` enum('created','stage_changed','status_changed','note_added','whatsapp_sent','email_sent','invoice_generated','contract_generated','value_updated','score_updated','manual') NOT NULL,
	`description` text NOT NULL,
	`metadata` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_activities_id` PRIMARY KEY(`id`)
);
