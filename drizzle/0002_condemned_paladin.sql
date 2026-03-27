ALTER TABLE `invoices` ADD `stripeCheckoutSessionId` varchar(255);--> statement-breakpoint
ALTER TABLE `invoices` ADD `paymentPlan` enum('full','installment_50_50') DEFAULT 'full';--> statement-breakpoint
ALTER TABLE `invoices` ADD `installmentNumber` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `invoices` ADD `parentInvoiceId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);