CREATE TABLE `time_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`contact_id` int,
	`project_id` int,
	`description` text NOT NULL,
	`minutes` int NOT NULL,
	`date` timestamp NOT NULL,
	`billable` boolean DEFAULT true,
	`invoice_id` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `time_entries_id` PRIMARY KEY(`id`)
);
