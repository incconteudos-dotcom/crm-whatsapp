ALTER TABLE `contacts` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `contacts` ADD `subscriptionStatus` enum('active','cancelled','past_due','trialing','none') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `equipment_bookings` ADD `studio_booking_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `bookingId` int;--> statement-breakpoint
ALTER TABLE `studio_bookings` ADD `room_id` int;--> statement-breakpoint
ALTER TABLE `studio_bookings` ADD `paymentStatus` enum('pending_payment','paid','waived') DEFAULT 'waived';--> statement-breakpoint
ALTER TABLE `studio_bookings` ADD `entryInvoiceId` int;--> statement-breakpoint
ALTER TABLE `studio_bookings` ADD `reminderSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `studio_rooms` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `equipment_bookings` DROP COLUMN `booking_id`;