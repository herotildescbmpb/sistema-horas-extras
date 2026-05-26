import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  department: varchar("department", { length: 128 }),
  position: varchar("position", { length: 128 }),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
  matricula: varchar("matricula", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

export const overtimeRecords = mysqlTable("overtime_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tipoEscala: varchar("tipoEscala", { length: 64 }), // Ex: Expediente, Plantão
  servidor: varchar("servidor", { length: 32 }), // Matrícula do servidor (preenchida automaticamente)
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD (Data Início)
  endDate: varchar("endDate", { length: 10 }), // YYYY-MM-DD (Data Final - pode ser diferente)
  startTime: varchar("startTime", { length: 8 }).notNull(), // HH:MM ou HH:MM:SS
  endTime: varchar("endTime", { length: 8 }).notNull(), // HH:MM ou HH:MM:SS
  funcao: varchar("funcao", { length: 128 }), // Função do servidor
  modalidade: varchar("modalidade", { length: 64 }), // Ex: Especial, Normal
  totalMinutes: int("totalMinutes").notNull(),
  dayType: mysqlEnum("dayType", ["weekday", "saturday", "sunday_holiday"]).notNull(),
  multiplier: decimal("multiplier", { precision: 4, scale: 2 }).notNull(), // 1.5, 2.0, 2.0
  reason: text("reason"),
  project: varchar("project", { length: 128 }),
  department: varchar("department", { length: 128 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OvertimeRecord = typeof overtimeRecords.$inferSelect;
export type InsertOvertimeRecord = typeof overtimeRecords.$inferInsert;

export const servidores = mysqlTable("servidores", {
  id: int("id").autoincrement().primaryKey(),
  matricula: varchar("matricula", { length: 16 }).notNull(),
  digito: varchar("digito", { length: 4 }),
  posto: varchar("posto", { length: 64 }),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 32 }),
});

export type Servidor = typeof servidores.$inferSelect;
export type InsertServidor = typeof servidores.$inferInsert;
