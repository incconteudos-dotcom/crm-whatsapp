CREATE TABLE `equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT 'audio',
	`serial_number` varchar(100),
	`brand` varchar(100),
	`model` varchar(100),
	`status` varchar(20) NOT NULL DEFAULT 'available',
	`notes` text,
	`room_id` int,
	`purchase_date` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`booking_id` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studio_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`capacity` int DEFAULT 1,
	`color` varchar(20) DEFAULT '#6366f1',
	`is_active` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studio_rooms_id` PRIMARY KEY(`id`)
);
