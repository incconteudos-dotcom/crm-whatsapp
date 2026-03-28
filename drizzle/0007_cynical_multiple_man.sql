CREATE TABLE `episode_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`episode_id` int NOT NULL,
	`user_id` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `episode_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`podcast_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`number` int,
	`description` text,
	`guest_name` varchar(255),
	`guest_bio` text,
	`recording_date` timestamp,
	`publish_date` timestamp,
	`duration` int,
	`script_url` text,
	`raw_audio_url` text,
	`edited_audio_url` text,
	`thumbnail_url` text,
	`published_url` text,
	`production_status` enum('roteiro','gravacao','edicao','revisao','agendado','publicado') DEFAULT 'roteiro',
	`studio_booking_id` int,
	`assigned_editor_id` int,
	`tags` json DEFAULT ('[]'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `episodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `podcasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`cover_url` text,
	`contact_id` int,
	`category` varchar(128),
	`language` varchar(32) DEFAULT 'pt-BR',
	`publishing_frequency` varchar(64),
	`rss_url` text,
	`spotify_url` text,
	`youtube_url` text,
	`podcast_status` enum('active','paused','finished') DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcasts_id` PRIMARY KEY(`id`)
);
