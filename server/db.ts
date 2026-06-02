import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { like, or } from "drizzle-orm";
import {
  departments,
  escalaItems,
  escalas,
  InsertDepartment,
  InsertEscala,
  InsertEscalaItem,
  InsertOvertimeRecord,
  InsertUser,
  overtimeRecords,
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

export async function setUserActive(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
}

export async function adminUpdateUser(
  userId: number,
  data: { name?: string; email?: string; department?: string; position?: string; role?: "user" | "admin"; isActive?: boolean; matricula?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function createUser(
  data: { name: string; email?: string; department?: string; position?: string; role: "user" | "admin"; matricula?: string }
) {
  const db = await getDb();
  if (!db) return;
  const { nanoid } = await import("nanoid");
  const openId = `pre_${nanoid(12)}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email ?? null,
    loginMethod: "pre-cadastro",
    role: data.role,
    department: data.department ?? null,
    position: data.position ?? null,
    matricula: data.matricula ?? null,
    isActive: true,
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

export async function setUserRole(userId: number, role: "user" | "admin") {
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
  filters?: { startDate?: string; endDate?: string; status?: string }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(overtimeRecords.userId, userId)];
  if (filters?.startDate) conditions.push(gte(overtimeRecords.date, filters.startDate));
  if (filters?.endDate) conditions.push(lte(overtimeRecords.date, filters.endDate));
  if (filters?.status) {
    conditions.push(
      eq(overtimeRecords.status, filters.status as "pending" | "approved" | "rejected")
    );
  }

  return db
    .select()
    .from(overtimeRecords)
    .where(and(...conditions))
    .orderBy(desc(overtimeRecords.date));
}

export async function getAllOvertimeRecords(filters?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  userId?: number;
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
    })
    .from(overtimeRecords)
    .leftJoin(users, eq(overtimeRecords.userId, users.id))
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

export async function launchEscala(escalaId: number, creatorUserId: number) {
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
      status: "pending",
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
    })
    .from(overtimeRecords)
    .innerJoin(users, eq(overtimeRecords.userId, users.id))
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
