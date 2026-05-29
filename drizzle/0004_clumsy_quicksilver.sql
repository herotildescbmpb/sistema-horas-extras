ALTER TABLE `departments` ADD `shortName` varchar(32);--> statement-breakpoint
ALTER TABLE `departments` ADD `chefeId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;