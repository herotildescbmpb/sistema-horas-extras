import { and, desc, eq, gt, gte, isNull, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  departments,
  escalaItems,
  escalas,
  InsertDepartment,
  InsertEscala,
  InsertEscalaItem,
  InsertNotification,
  InsertOvertimeRecord,
  InsertUser,
  notifications,
  overtimeRecords,
  passwordResetTokens,
  rolePermissions,
  servidores,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, userId));
}

export async function setUserActive(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
}

export async function adminUpdateUser(
  userId: number,
  data: { name?: string; email?: string; department?: string; position?: string; role?: "user" | "admin" | "chefe" | "auxiliar_administrativo"; isActive?: boolean; matricula?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function createUser(
  data: { name: string; email?: string; department?: string; position?: string; role: "user" | "admin" | "chefe" | "auxiliar_administrativo"; matricula?: string }
) {
  const db = await getDb();
  if (!db) return;
  const { nanoid } = await import("nanoid");
  const bcrypt = await import("bcryptjs");
  const openId = `pre_${nanoid(12)}`;
  // Senha padrão: 20262026 — usuário deve trocar no primeiro acesso
  const passwordHash = await bcrypt.hash("20262026", 10);
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email ?? null,
    loginMethod: "local",
    role: data.role,
    department: data.department ?? null,
    position: data.position ?? null,
    matricula: data.matricula ?? null,
    isActive: true,
    passwordHash,
    mustChangePassword: true,
    lastSignedIn: new Date(),
  });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function updateUserProfile(
  userId: number,
  data: { name?: string; department?: string; position?: string; hourlyRate?: string; matricula?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function setUserRole(userId: number, role: "user" | "admin" | "chefe" | "auxiliar_administrativo") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Servidores ──────────────────────────────────────────────────────────────

export async function searchServidores(query: string, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  if (!query || query.trim().length < 2) return [];
  const term = `%${query.trim().toUpperCase()}%`;
  return db
    .select()
    .from(servidores)
    .where(like(servidores.nome, term))
    .limit(limit)
    .orderBy(servidores.nome);
}

export async function getServidorByMatricula(matricula: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(servidores)
    .where(eq(servidores.matricula, matricula))
    .limit(1);
  return result[0];
}

// ─── Departments ──────────────────────────────────────────────────────────────

export async function getDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(eq(departments.active, true)).orderBy(departments.id);
}

export async function getDepartmentsWithChefe() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: departments.id,
      name: departments.name,
      shortName: departments.shortName,
      description: departments.description,
      chefeId: departments.chefeId,
      active: departments.active,
      createdAt: departments.createdAt,
      chefeName: users.name,
      chefeEmail: users.email,
      chefePosition: users.position,
    })
    .from(departments)
    .leftJoin(users, eq(departments.chefeId, users.id))
    .where(eq(departments.active, true))
    .orderBy(departments.id);
  return rows;
}

export async function setDepartmentChefe(departmentId: number, chefeId: number | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(departments).set({ chefeId }).where(eq(departments.id, departmentId));
}

export async function createDepartment(data: InsertDepartment) {
  const db = await getDb();
  if (!db) return;
  await db.insert(departments).values(data);
}

export async function updateDepartment(id: number, data: Partial<InsertDepartment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(departments).set(data).where(eq(departments.id, id));
}

// ─── Overtime Records ─────────────────────────────────────────────────────────

export async function createOvertimeRecord(data: InsertOvertimeRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(overtimeRecords).values(data);
  return result;
}

export async function getOvertimeRecordsByUser(
  userId: number,
  filters?: { startDate?: string; endDate?: string; status?: string; matricula?: string }
) {
  const db = await getDb();
  if (!db) return [];

  // Se matrícula fornecida, filtra por servidor beneficiário (ignora userId)
  // Caso contrário, filtra pelos registros cadastrados pelo userId
  const conditions = filters?.matricula
    ? [sql`SUBSTRING_INDEX(${overtimeRecords.servidor}, '-', 1) = ${filters.matricula}`]
    : [eq(overtimeRecords.userId, userId)];

  if (filters?.startDate) conditions.push(gte(overtimeRecords.date, filters.startDate));
  if (filters?.endDate) conditions.push(lte(overtimeRecords.date, filters.endDate));
  if (filters?.status) {
    conditions.push(
      eq(overtimeRecords.status, filters.status as "pending" | "approved" | "rejected")
    );
  }

  return db
    .select({
      id: overtimeRecords.id,
      userId: overtimeRecords.userId,
      tipoEscala: overtimeRecords.tipoEscala,
      servidor: overtimeRecords.servidor,
      date: overtimeRecords.date,
      endDate: overtimeRecords.endDate,
      startTime: overtimeRecords.startTime,
      endTime: overtimeRecords.endTime,
      funcao: overtimeRecords.funcao,
      modalidade: overtimeRecords.modalidade,
      totalMinutes: overtimeRecords.totalMinutes,
      dayType: overtimeRecords.dayType,
      multiplier: overtimeRecords.multiplier,
      reason: overtimeRecords.reason,
      project: overtimeRecords.project,
      department: overtimeRecords.department,
      status: overtimeRecords.status,
      reviewedBy: overtimeRecords.reviewedBy,
      reviewedAt: overtimeRecords.reviewedAt,
      reviewNote: overtimeRecords.reviewNote,
      createdAt: overtimeRecords.createdAt,
      updatedAt: overtimeRecords.updatedAt,
      nomeServidor: servidores.nome,
    })
    .from(overtimeRecords)
    .leftJoin(servidores, sql`SUBSTRING_INDEX(${overtimeRecords.servidor}, '-', 1) = ${servidores.matricula}`)
    .where(and(...conditions))
    .orderBy(desc(overtimeRecords.date));
}

export async function getAllOvertimeRecords(filters?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  userId?: number;
  department?: string;
  servidor?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.startDate) conditions.push(gte(overtimeRecords.date, filters.startDate));
  if (filters?.endDate) conditions.push(lte(overtimeRecords.date, filters.endDate));
  if (filters?.status) {
    conditions.push(
      eq(overtimeRecords.status, filters.status as "pending" | "approved" | "rejected")
    );
  }
  if (filters?.userId) conditions.push(eq(overtimeRecords.userId, filters.userId));
  if (filters?.department) conditions.push(eq(users.department, filters.department));
  if (filters?.servidor) conditions.push(eq(overtimeRecords.servidor, filters.servidor));

  const records = await db
    .select({
      id: overtimeRecords.id,
      userId: overtimeRecords.userId,
      tipoEscala: overtimeRecords.tipoEscala,
      servidor: overtimeRecords.servidor,
      date: overtimeRecords.date,
      endDate: overtimeRecords.endDate,
      startTime: overtimeRecords.startTime,
      endTime: overtimeRecords.endTime,
      funcao: overtimeRecords.funcao,
      modalidade: overtimeRecords.modalidade,
      totalMinutes: overtimeRecords.totalMinutes,
      dayType: overtimeRecords.dayType,
      multiplier: overtimeRecords.multiplier,
      reason: overtimeRecords.reason,
      project: overtimeRecords.project,
      department: overtimeRecords.department,
      status: overtimeRecords.status,
      reviewedBy: overtimeRecords.reviewedBy,
      reviewedAt: overtimeRecords.reviewedAt,
      reviewNote: overtimeRecords.reviewNote,
      createdAt: overtimeRecords.createdAt,
      updatedAt: overtimeRecords.updatedAt,
      userName: users.name,
      userEmail: users.email,
      userDepartment: users.department,
      userMatricula: users.matricula,
      nomeServidor: servidores.nome,
    })
    .from(overtimeRecords)
    .leftJoin(users, eq(overtimeRecords.userId, users.id))
    .leftJoin(servidores, sql`SUBSTRING_INDEX(${overtimeRecords.servidor}, '-', 1) = ${servidores.matricula}`)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(overtimeRecords.date));

  return records;
}

export async function getOvertimeRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(overtimeRecords).where(eq(overtimeRecords.id, id)).limit(1);
  return result[0];
}

export async function updateOvertimeRecord(
  id: number,
  data: Partial<InsertOvertimeRecord>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(overtimeRecords).set(data).where(eq(overtimeRecords.id, id));
}

export async function deleteOvertimeRecord(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(overtimeRecords).where(eq(overtimeRecords.id, id));
}

export async function reviewOvertimeRecord(
  id: number,
  reviewerId: number,
  status: "approved" | "rejected",
  reviewNote?: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(overtimeRecords)
    .set({ status, reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: reviewNote ?? null })
    .where(eq(overtimeRecords.id, id));
}

// ─── Dashboard / Summary ──────────────────────────────────────────────────────

export async function getMonthSummary(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return { totalMinutes: 0, approvedMinutes: 0, pendingCount: 0, rejectedCount: 0 };

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const records = await db
    .select()
    .from(overtimeRecords)
    .where(
      and(
        eq(overtimeRecords.userId, userId),
        gte(overtimeRecords.date, startDate),
        lte(overtimeRecords.date, endDate)
      )
    );

  const totalMinutes = records.reduce((s, r) => s + r.totalMinutes, 0);
  const approvedMinutes = records
    .filter((r) => r.status === "approved")
    .reduce((s, r) => s + r.totalMinutes, 0);
  const pendingCount = records.filter((r) => r.status === "pending").length;
  const rejectedCount = records.filter((r) => r.status === "rejected").length;

  return { totalMinutes, approvedMinutes, pendingCount, rejectedCount, records };
}

export async function getAdminMonthSummary(year: number, month: number) {
  const db = await getDb();
  if (!db) return { totalMinutes: 0, pendingCount: 0, employeeCount: 0 };

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const records = await db
    .select()
    .from(overtimeRecords)
    .where(and(gte(overtimeRecords.date, startDate), lte(overtimeRecords.date, endDate)));

  const totalMinutes = records.reduce((s, r) => s + r.totalMinutes, 0);
  const pendingCount = records.filter((r) => r.status === "pending").length;
  const employeeIds = new Set(records.map((r) => r.userId));

  return { totalMinutes, pendingCount, employeeCount: employeeIds.size };
}

// ─── Escalas em Lote ─────────────────────────────────────────────────────────

export async function createEscala(data: InsertEscala, items: InsertEscalaItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(escalas).values(data).$returningId();
  const escalaId = result.id;
  if (items.length > 0) {
    await db.insert(escalaItems).values(items.map(i => ({ ...i, escalaId })));
  }
  return escalaId;
}

export async function getEscalasByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(escalas).where(eq(escalas.userId, userId)).orderBy(desc(escalas.createdAt));
}

export async function getAllEscalas(filters?: { status?: string; userId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(escalas.status, filters.status as any));
  if (filters?.userId) conditions.push(eq(escalas.userId, filters.userId));
  const rows = await db
    .select({
      id: escalas.id,
      userId: escalas.userId,
      tipoEscala: escalas.tipoEscala,
      mes: escalas.mes,
      ano: escalas.ano,
      startTime: escalas.startTime,
      endTime: escalas.endTime,
      funcao: escalas.funcao,
      department: escalas.department,
      justificativa: escalas.justificativa,
      status: escalas.status,
      reviewedBy: escalas.reviewedBy,
      reviewedAt: escalas.reviewedAt,
      reviewNote: escalas.reviewNote,
      createdAt: escalas.createdAt,
      updatedAt: escalas.updatedAt,
      creatorName: users.name,
    })
    .from(escalas)
    .leftJoin(users, eq(escalas.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(escalas.createdAt));
  return rows;
}

export async function getEscalaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [escala] = await db.select().from(escalas).where(eq(escalas.id, id)).limit(1);
  if (!escala) return undefined;
  const items = await db.select().from(escalaItems).where(eq(escalaItems.escalaId, id)).orderBy(escalaItems.date, escalaItems.nomeServidor);
  return { ...escala, items };
}

export async function updateEscalaStatus(
  id: number,
  status: "rascunho" | "lancado" | "aprovado" | "rejeitado",
  reviewerId?: number,
  reviewNote?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.update(escalas).set({
    status,
    reviewedBy: reviewerId ?? null,
    reviewedAt: reviewerId ? new Date() : null,
    reviewNote: reviewNote ?? null,
  }).where(eq(escalas.id, id));
}

export async function updateEscalaItem(
  itemId: number,
  data: Partial<InsertEscalaItem>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(escalaItems).set(data).where(eq(escalaItems.id, itemId));
}

export async function launchEscala(escalaId: number, creatorUserId: number, autoApprove = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const escala = await getEscalaById(escalaId);
  if (!escala) throw new Error("Escala não encontrada");

  // Cria um overtime_record para cada item da escala
  for (const item of escala.items) {
    const date = item.date;
    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    const isFeriado = false; // simplificado — modalidade já está no item
    const dayType: "weekday" | "saturday" | "sunday_holiday" =
      item.dayType === "saturday" ? "saturday" :
      item.dayType === "sunday_holiday" ? "sunday_holiday" : "weekday";
    const multiplier = dayType === "weekday" ? "1.50" : "2.00";

    const [rec] = await db.insert(overtimeRecords).values({
      userId: creatorUserId,
      tipoEscala: escala.tipoEscala,
      servidor: item.matricula,
      date,
      startTime: item.startTime,
      endTime: item.endTime,
      funcao: escala.funcao,
      modalidade: item.modalidade,
      totalMinutes: item.totalMinutes,
      dayType,
      multiplier,
      reason: escala.justificativa ?? "",
      department: escala.department ?? "",
      status: autoApprove ? "approved" : "pending",
    }).$returningId();

    // Vincula o overtime_record ao item da escala
    await db.update(escalaItems).set({ overtimeRecordId: rec.id }).where(eq(escalaItems.id, item.id));
  }

  await updateEscalaStatus(escalaId, "lancado");
}

export async function duplicateEscala(escalaId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const original = await getEscalaById(escalaId);
  if (!original) throw new Error("Escala não encontrada");

  // Calcular próximo mês/ano
  let novoMes = original.mes + 1;
  let novoAno = original.ano;
  if (novoMes > 12) { novoMes = 1; novoAno += 1; }

  // Criar nova escala-mãe como rascunho
  const [result] = await db.insert(escalas).values({
    userId,
    tipoEscala: original.tipoEscala,
    mes: novoMes,
    ano: novoAno,
    startTime: original.startTime,
    endTime: original.endTime,
    funcao: original.funcao,
    department: original.department,
    justificativa: original.justificativa,
    status: "rascunho",
  }).$returningId();

  const novaEscalaId = result.id;

  // Duplicar os itens ajustando as datas para o novo mês
  if (original.items.length > 0) {
    const novosItems: InsertEscalaItem[] = original.items.map(item => {
      // Substituir mês e ano na data (formato YYYY-MM-DD)
      const [, , dd] = item.date.split("-");
      // Verificar se o dia existe no novo mês
      const daysInNewMonth = new Date(novoAno, novoMes, 0).getDate();
      const dia = Math.min(parseInt(dd, 10), daysInNewMonth);
      const novaData = `${novoAno}-${String(novoMes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

      // Recalcular modalidade para o novo dia
      const date = new Date(novaData + "T12:00:00");
      const dow = date.getDay();
      const novaModalidade = (dow === 5 || dow === 6 || dow === 0) ? "Especial" : "Extraordinário";

      // Recalcular dayType
      const novoDayType: "weekday" | "saturday" | "sunday_holiday" =
        dow === 6 ? "saturday" : dow === 0 ? "sunday_holiday" : "weekday";

      return {
        escalaId: novaEscalaId,
        nomeServidor: item.nomeServidor,
        matricula: item.matricula,
        posto: item.posto ?? undefined,
        date: novaData,
        startTime: item.startTime,
        endTime: item.endTime,
        totalMinutes: item.totalMinutes,
        dayType: novoDayType,
        modalidade: novaModalidade,
      };
    });
    await db.insert(escalaItems).values(novosItems);
  }

  return { id: novaEscalaId, mes: novoMes, ano: novoAno };
}

// ─── Acesso do Chefe de Setor ─────────────────────────────────────────────────

/**
 * Retorna o departamento onde o usuário é chefe (chefeId = userId).
 * Retorna null se o usuário não for chefe de nenhum setor.
 */
export async function getDepartmentByChefe(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(departments)
    .where(and(eq(departments.chefeId, userId), eq(departments.active, true)))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Retorna todos os usuários que pertencem ao departamento informado (pelo nome).
 */
export async function getUsersByDepartment(departmentName: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: users.id, name: users.name, matricula: users.matricula, position: users.position })
    .from(users)
    .where(eq(users.department, departmentName));
}

/**
 * Retorna registros de horas extras de todos os usuários de um setor.
 * Inclui nome do criador para exibição.
 */
export async function getOvertimeRecordsByDepartment(
  departmentName: string,
  filters?: { startDate?: string; endDate?: string; status?: string; mes?: number; ano?: number }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions: ReturnType<typeof eq>[] = [eq(users.department, departmentName)];
  if (filters?.startDate) conditions.push(gte(overtimeRecords.date, filters.startDate) as any);
  if (filters?.endDate) conditions.push(lte(overtimeRecords.date, filters.endDate) as any);
  if (filters?.status) {
    conditions.push(eq(overtimeRecords.status, filters.status as "pending" | "approved" | "rejected") as any);
  }
  if (filters?.mes && filters?.ano) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const start = `${filters.ano}-${pad(filters.mes)}-01`;
    const end = `${filters.ano}-${pad(filters.mes)}-31`;
    conditions.push(gte(overtimeRecords.date, start) as any);
    conditions.push(lte(overtimeRecords.date, end) as any);
  }

  return db
    .select({
      id: overtimeRecords.id,
      userId: overtimeRecords.userId,
      tipoEscala: overtimeRecords.tipoEscala,
      servidor: overtimeRecords.servidor,
      date: overtimeRecords.date,
      endDate: overtimeRecords.endDate,
      startTime: overtimeRecords.startTime,
      endTime: overtimeRecords.endTime,
      funcao: overtimeRecords.funcao,
      modalidade: overtimeRecords.modalidade,
      totalMinutes: overtimeRecords.totalMinutes,
      dayType: overtimeRecords.dayType,
      multiplier: overtimeRecords.multiplier,
      reason: overtimeRecords.reason,
      project: overtimeRecords.project,
      department: overtimeRecords.department,
      status: overtimeRecords.status,
      reviewedBy: overtimeRecords.reviewedBy,
      reviewedAt: overtimeRecords.reviewedAt,
      reviewNote: overtimeRecords.reviewNote,
      createdAt: overtimeRecords.createdAt,
      updatedAt: overtimeRecords.updatedAt,
      userName: users.name,
      userMatricula: users.matricula,
      userDepartment: users.department,
      nomeServidor: servidores.nome,
    })
    .from(overtimeRecords)
    .innerJoin(users, eq(overtimeRecords.userId, users.id))
    .leftJoin(servidores, sql`SUBSTRING_INDEX(${overtimeRecords.servidor}, '-', 1) = ${servidores.matricula}`)
    .where(and(...(conditions as any[])))
    .orderBy(desc(overtimeRecords.date));
}

/**
 * Retorna escalas em lote de todos os usuários de um setor.
 */
export async function getEscalasByDepartment(
  departmentName: string,
  filters?: { mes?: number; ano?: number; status?: string }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [eq(users.department, departmentName)];
  if (filters?.mes) conditions.push(eq(escalas.mes, filters.mes));
  if (filters?.ano) conditions.push(eq(escalas.ano, filters.ano));
  if (filters?.status) conditions.push(eq(escalas.status, filters.status as any));

  return db
    .select({
      id: escalas.id,
      userId: escalas.userId,
      tipoEscala: escalas.tipoEscala,
      mes: escalas.mes,
      ano: escalas.ano,
      startTime: escalas.startTime,
      endTime: escalas.endTime,
      funcao: escalas.funcao,
      department: escalas.department,
      justificativa: escalas.justificativa,
      status: escalas.status,
      reviewedBy: escalas.reviewedBy,
      reviewedAt: escalas.reviewedAt,
      reviewNote: escalas.reviewNote,
      createdAt: escalas.createdAt,
      updatedAt: escalas.updatedAt,
      creatorName: users.name,
      creatorMatricula: users.matricula,
    })
    .from(escalas)
    .innerJoin(users, eq(escalas.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(escalas.createdAt));
}

// ─── Notificações ─────────────────────────────────────────────────────────────

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getNotificationsByUser(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return Number(result[0]?.count ?? 0);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

/**
 * Encontra o chefe do setor pelo nome do departamento e cria uma notificação para ele.
 * Se o departamento não tiver chefe, não faz nada.
 */
export async function notifyChefe(
  departmentName: string,
  notification: Omit<InsertNotification, "userId">
) {
  const db = await getDb();
  if (!db) return;
  const dept = await db
    .select({ chefeId: departments.chefeId })
    .from(departments)
    .where(and(eq(departments.name, departmentName), eq(departments.active, true)))
    .limit(1);
  const chefeId = dept[0]?.chefeId;
  if (!chefeId) return; // setor sem chefe cadastrado
  await db.insert(notifications).values({ ...notification, userId: chefeId });
}

// ─── Role Permissions ─────────────────────────────────────────────────────────

// Permissões padrão por perfil
export const DEFAULT_PERMISSIONS: Record<string, { label: string; category: string; defaults: Record<string, boolean> }> = {
  // Dashboard
  view_dashboard:       { label: "Ver Dashboard",              category: "Dashboard",  defaults: { admin: true,  chefe: true,  auxiliar_administrativo: true,  user: true  } },
  // Registros de horas
  create_overtime:      { label: "Criar Registro de Horas",    category: "Registros",  defaults: { admin: true,  chefe: true,  auxiliar_administrativo: true,  user: true  } },
  view_own_overtime:    { label: "Ver Próprios Registros",      category: "Registros",  defaults: { admin: true,  chefe: true,  auxiliar_administrativo: true,  user: true  } },
  edit_own_overtime:    { label: "Editar Próprios Registros",   category: "Registros",  defaults: { admin: true,  chefe: true,  auxiliar_administrativo: true,  user: true  } },
  delete_own_overtime:  { label: "Excluir Próprios Registros",  category: "Registros",  defaults: { admin: true,  chefe: false, auxiliar_administrativo: false, user: false } },
  // Escalas em lote
  create_escala:        { label: "Criar Escala em Lote",        category: "Escalas",    defaults: { admin: true,  chefe: true,  auxiliar_administrativo: true,  user: false } },
  view_own_escalas:     { label: "Ver Próprias Escalas",        category: "Escalas",    defaults: { admin: true,  chefe: true,  auxiliar_administrativo: true,  user: false } },
  launch_escala:        { label: "Lançar Escala",               category: "Escalas",    defaults: { admin: true,  chefe: true,  auxiliar_administrativo: false, user: false } },
  // Painel do setor
  view_setor:           { label: "Ver Painel do Setor",         category: "Setor",      defaults: { admin: true,  chefe: true,  auxiliar_administrativo: false, user: false } },
  // Relatórios
  view_reports:         { label: "Ver Relatórios",              category: "Relatórios", defaults: { admin: true,  chefe: true,  auxiliar_administrativo: true,  user: false } },
  // Admin
  view_admin_panel:     { label: "Acessar Painel Admin",        category: "Admin",      defaults: { admin: true,  chefe: false, auxiliar_administrativo: false, user: false } },
  approve_overtime:     { label: "Aprovar/Rejeitar Registros",  category: "Admin",      defaults: { admin: true,  chefe: false, auxiliar_administrativo: false, user: false } },
  manage_users:         { label: "Gerenciar Usuários",          category: "Admin",      defaults: { admin: true,  chefe: false, auxiliar_administrativo: false, user: false } },
  manage_departments:   { label: "Gerenciar Setores",           category: "Admin",      defaults: { admin: true,  chefe: false, auxiliar_administrativo: false, user: false } },
  manage_permissions:   { label: "Gerenciar Permissões",        category: "Admin",      defaults: { admin: true,  chefe: false, auxiliar_administrativo: false, user: false } },
};

export type RoleType = "admin" | "chefe" | "auxiliar_administrativo" | "user";

export async function getRolePermissions(role: RoleType): Promise<Record<string, boolean>> {
  const db = await getDb();
  // Montar mapa de defaults
  const result: Record<string, boolean> = {};
  for (const [key, def] of Object.entries(DEFAULT_PERMISSIONS)) {
    result[key] = def.defaults[role] ?? false;
  }
  if (!db) return result;
  // Sobrescrever com valores customizados do banco
  const rows = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.role, role));
  for (const row of rows) {
    result[row.permissionKey] = row.enabled;
  }
  return result;
}

export async function getAllRolePermissions(): Promise<Record<RoleType, Record<string, boolean>>> {
  const roles: RoleType[] = ["admin", "chefe", "auxiliar_administrativo", "user"];
  const all = {} as Record<RoleType, Record<string, boolean>>;
  for (const role of roles) {
    all[role] = await getRolePermissions(role);
  }
  return all;
}

export async function setRolePermission(role: RoleType, permissionKey: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Upsert: se já existe, atualiza; senão insere
  const existing = await db
    .select({ id: rolePermissions.id })
    .from(rolePermissions)
    .where(and(eq(rolePermissions.role, role), eq(rolePermissions.permissionKey, permissionKey)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(rolePermissions)
      .set({ enabled })
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.permissionKey, permissionKey)));
  } else {
    await db.insert(rolePermissions).values({ role, permissionKey, enabled });
  }
}

// ─── Autenticação Local ──────────────────────────────────────────────────────

export async function getUserByEmailWithPassword(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash, mustChangePassword: false }).where(eq(users.id, userId));
}

export async function resetUserPassword(userId: number) {
  const db = await getDb();
  if (!db) return;
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash("20262026", 10);
  await db.update(users).set({ passwordHash, mustChangePassword: true }).where(eq(users.id, userId));
}

// ─── Tokens de Recuperação de Senha ──────────────────────────────────────────

/**
 * Cria um token de recuperação de senha para o usuário.
 * Invalida tokens anteriores não utilizados do mesmo usuário.
 */
export async function createPasswordResetToken(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { randomBytes } = await import("crypto");
  const token = randomBytes(48).toString("hex"); // 96 chars hex
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  // Invalida tokens anteriores não usados do mesmo usuário
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));

  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  return token;
}

/**
 * Valida um token de recuperação de senha.
 * Retorna o userId se válido, undefined se inválido/expirado/já usado.
 */
export async function validatePasswordResetToken(token: string): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  return result[0]?.userId;
}

/**
 * Marca um token como usado (após a senha ser redefinida com sucesso).
 */
export async function consumePasswordResetToken(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.token, token));
}

/**
 * Retorna os servidores únicos que possuem horas cadastradas no período,
 * fazendo JOIN com a tabela servidores para obter o nome completo.
 * Usado para popular o dropdown de filtro na tela de Relatórios.
 */
export async function getServidoresUnicos(filters?: {
  startDate?: string;
  endDate?: string;
  department?: string;
}): Promise<Array<{ matricula: string; nome: string | null }>> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.startDate) conditions.push(gte(overtimeRecords.date, filters.startDate));
  if (filters?.endDate) conditions.push(lte(overtimeRecords.date, filters.endDate));
  if (filters?.department) conditions.push(eq(users.department, filters.department));

  const rows = await db
    .selectDistinct({
      matricula: overtimeRecords.servidor,
      nome: servidores.nome,
    })
    .from(overtimeRecords)
    .leftJoin(servidores, sql`SUBSTRING_INDEX(${overtimeRecords.servidor}, '-', 1) = ${servidores.matricula}`)
    .leftJoin(users, eq(overtimeRecords.userId, users.id))
    .where(
      and(
        sql`${overtimeRecords.servidor} IS NOT NULL`,
        ...(conditions.length > 0 ? conditions : [])
      )
    )
    .orderBy(servidores.nome);

  return rows.filter((r) => r.matricula != null) as Array<{ matricula: string; nome: string | null }>;
}

// ─── Dashboard Analítico ──────────────────────────────────────────────────────

/**
 * Retorna horas totais por servidor (top 20) para um período.
 */
export async function getHorasPorServidor(filters: {
  startDate: string;
  endDate: string;
  department?: string;
}): Promise<Array<{ matricula: string; nome: string | null; totalMinutes: number }>> {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [
    gte(overtimeRecords.date, filters.startDate),
    lte(overtimeRecords.date, filters.endDate),
    sql`${overtimeRecords.servidor} IS NOT NULL AND ${overtimeRecords.servidor} != ''`,
  ];
  if (filters.department) conditions.push(eq(users.department, filters.department));

  const rows = await db
    .select({
      matricula: sql<string>`SUBSTRING_INDEX(${overtimeRecords.servidor}, '-', 1)`,
      nome: servidores.nome,
      totalMinutes: sql<number>`SUM(${overtimeRecords.totalMinutes})`,
    })
    .from(overtimeRecords)
    .leftJoin(servidores, sql`SUBSTRING_INDEX(${overtimeRecords.servidor}, '-', 1) = ${servidores.matricula}`)
    .leftJoin(users, eq(overtimeRecords.userId, users.id))
    .where(and(...conditions))
    .groupBy(sql`SUBSTRING_INDEX(${overtimeRecords.servidor}, '-', 1)`, servidores.nome)
    .orderBy(sql`SUM(${overtimeRecords.totalMinutes}) DESC`)
    .limit(20);

  return rows.map((r) => ({
    matricula: r.matricula ?? "",
    nome: r.nome ?? null,
    totalMinutes: Number(r.totalMinutes) || 0,
  }));
}

/**
 * Retorna horas totais por setor para um período.
 */
export async function getHorasPorSetor(filters: {
  startDate: string;
  endDate: string;
}): Promise<Array<{ setor: string; totalMinutes: number }>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      setor: overtimeRecords.department,
      totalMinutes: sql<number>`SUM(${overtimeRecords.totalMinutes})`,
    })
    .from(overtimeRecords)
    .where(
      and(
        gte(overtimeRecords.date, filters.startDate),
        lte(overtimeRecords.date, filters.endDate),
        sql`${overtimeRecords.department} IS NOT NULL AND ${overtimeRecords.department} != ''`
      )
    )
    .groupBy(overtimeRecords.department)
    .orderBy(sql`SUM(${overtimeRecords.totalMinutes}) DESC`);

  return rows.map((r) => ({
    setor: r.setor ?? "Sem setor",
    totalMinutes: Number(r.totalMinutes) || 0,
  }));
}

/**
 * Retorna evolução mensal de horas (últimos N meses).
 */
export async function getEvolucaoMensal(
  months: number = 6
): Promise<Array<{ mes: string; totalMinutes: number; approvedMinutes: number }>> {
  const db = await getDb();
  if (!db) return [];

  const result: Array<{ mes: string; totalMinutes: number; approvedMinutes: number }> = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const rows = await db
      .select({
        totalMinutes: sql<number>`SUM(${overtimeRecords.totalMinutes})`,
        approvedMinutes: sql<number>`SUM(CASE WHEN ${overtimeRecords.status} = 'approved' THEN ${overtimeRecords.totalMinutes} ELSE 0 END)`,
      })
      .from(overtimeRecords)
      .where(and(gte(overtimeRecords.date, startDate), lte(overtimeRecords.date, endDate)));

    const mesLabel = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    result.push({
      mes: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
      totalMinutes: Number(rows[0]?.totalMinutes) || 0,
      approvedMinutes: Number(rows[0]?.approvedMinutes) || 0,
    });
  }

  return result;
}
