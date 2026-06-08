CREATE TABLE `bravo_escalas_mes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesAno` varchar(7) NOT NULL,
	`bravoEscalaId` int,
	`bravoEscalaNome` varchar(128),
	`status` enum('pending','created','error') NOT NULL DEFAULT 'pending',
	`errorMsg` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bravo_escalas_mes_id` PRIMARY KEY(`id`),
	CONSTRAINT `bravo_escalas_mes_mesAno_unique` UNIQUE(`mesAno`)
);
--> statement-breakpoint
CREATE TABLE `bravo_lancamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`overtimeRecordId` int NOT NULL,
	`bravoEscalaMesId` int NOT NULL,
	`bravoServicoId` int,
	`matricula` varchar(16) NOT NULL,
	`data` varchar(10) NOT NULL,
	`horaInicio` varchar(8) NOT NULL,
	`horaFim` varchar(8) NOT NULL,
	`status` enum('pending','success','error','duplicate') NOT NULL DEFAULT 'pending',
	`errorMsg` text,
	`tentativas` int NOT NULL DEFAULT 0,
	`lancadoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bravo_lancamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bravo_sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesAno` varchar(7) NOT NULL,
	`triggeredBy` enum('schedule','manual') NOT NULL DEFAULT 'schedule',
	`totalRegistros` int NOT NULL DEFAULT 0,
	`sucessos` int NOT NULL DEFAULT 0,
	`erros` int NOT NULL DEFAULT 0,
	`duplicatas` int NOT NULL DEFAULT 0,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`errorMsg` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `bravo_sync_logs_id` PRIMARY KEY(`id`)
);
