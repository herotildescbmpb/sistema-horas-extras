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
  role: mysqlEnum("role", ["user", "admin", "chefe", "auxiliar_administrativo"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  department: varchar("department", { length: 128 }),
  position: varchar("position", { length: 128 }),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
  matricula: varchar("matricula", { length: 32 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  shortName: varchar("shortName", { length: 32 }),
  description: text("description"),
  chefeId: int("chefeId"),  // FK para users.id
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
  funcao: varchar("funcao", { length: 64 }),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 32 }),
});

export type Servidor = typeof servidores.$inferSelect;
export type InsertServidor = typeof servidores.$inferInsert;

// Escala em lote (escala-mãe)
export const escalas = mysqlTable("escalas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // quem criou
  tipoEscala: varchar("tipoEscala", { length: 64 }).notNull(),
  mes: int("mes").notNull(),   // 1-12
  ano: int("ano").notNull(),   // ex: 2026
  startTime: varchar("startTime", { length: 8 }).notNull(),
  endTime: varchar("endTime", { length: 8 }).notNull(),
  funcao: varchar("funcao", { length: 64 }).notNull(),
  department: varchar("department", { length: 128 }),
  justificativa: text("justificativa"),
  status: mysqlEnum("status", ["rascunho", "lancado", "aprovado", "rejeitado"]).default("rascunho").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Escala = typeof escalas.$inferSelect;
export type InsertEscala = typeof escalas.$inferInsert;

// Itens individuais de uma escala em lote (1 item = 1 militar + 1 dia)
export const escalaItems = mysqlTable("escala_items", {
  id: int("id").autoincrement().primaryKey(),
  escalaId: int("escalaId").notNull(),
  matricula: varchar("matricula", { length: 16 }).notNull(),
  nomeServidor: varchar("nomeServidor", { length: 255 }).notNull(),
  posto: varchar("posto", { length: 64 }),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  startTime: varchar("startTime", { length: 8 }).notNull(),
  endTime: varchar("endTime", { length: 8 }).notNull(),
  totalMinutes: int("totalMinutes").notNull(),
  modalidade: varchar("modalidade", { length: 32 }).notNull(), // Especial | Extraordinário
  dayType: mysqlEnum("dayType", ["weekday", "saturday", "sunday_holiday"]).notNull(),
  overtimeRecordId: int("overtimeRecordId"), // FK para overtime_records após lançamento
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscalaItem = typeof escalaItems.$inferSelect;
export type InsertEscalaItem = typeof escalaItems.$inferInsert;

// Notificações para chefes de setor
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),          // destinatário (chefe do setor)
  type: varchar("type", { length: 64 }).notNull(), // "escala_lancada" | "registro_criado"
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  read: boolean("read").default(false).notNull(),
  relatedId: int("relatedId"),              // id da escala ou do overtime_record
  relatedType: varchar("relatedType", { length: 32 }), // "escala" | "overtime"
  fromUserId: int("fromUserId"),            // quem gerou o evento
  fromUserName: varchar("fromUserName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Permissões por perfil — configuráveis pelo admin
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["user", "admin", "chefe", "auxiliar_administrativo"]).notNull(),
  permissionKey: varchar("permissionKey", { length: 128 }).notNull(), // ex: "view_dashboard"
  enabled: boolean("enabled").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;
