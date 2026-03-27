CREATE TABLE `client_portal_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`type` enum('contract','invoice','quote') NOT NULL,
	`documentId` int NOT NULL,
	`contactId` int,
	`expiresAt` timestamp,
	`usedAt` timestamp,
	`approvedAt` timestamp,
	`signedName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_portal_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_portal_tokens_token_unique` UNIQUE(`token`)
);
