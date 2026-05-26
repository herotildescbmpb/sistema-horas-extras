ALTER TABLE `overtime_records` MODIFY COLUMN `startTime` varchar(8) NOT NULL;--> statement-breakpoint
ALTER TABLE `overtime_records` MODIFY COLUMN `endTime` varchar(8) NOT NULL;--> statement-breakpoint
ALTER TABLE `overtime_records` ADD `tipoEscala` varchar(64);--> statement-breakpoint
ALTER TABLE `overtime_records` ADD `servidor` varchar(32);--> statement-breakpoint
ALTER TABLE `overtime_records` ADD `endDate` varchar(10);--> statement-breakpoint
ALTER TABLE `overtime_records` ADD `funcao` varchar(128);--> statement-breakpoint
ALTER TABLE `overtime_records` ADD `modalidade` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `matricula` varchar(32);