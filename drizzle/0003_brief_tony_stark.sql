CREATE TABLE `servidores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matricula` varchar(16) NOT NULL,
	`digito` varchar(4),
	`posto` varchar(64),
	`nome` varchar(255) NOT NULL,
	`email` varchar(320),
	`telefone` varchar(32),
	CONSTRAINT `servidores_id` PRIMARY KEY(`id`)
);
