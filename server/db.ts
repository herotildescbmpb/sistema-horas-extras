import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  departments,
  InsertDepartment,
  InsertOvertimeRecord,
  InsertUser,
  overtimeRecords,
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

export async function updateUserProfile(
  userId: number,
  data: { name?: string; department?: string; position?: string; hourlyRate?: string }
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

// ─── Departments ──────────────────────────────────────────────────────────────

export async function getDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(eq(departments.active, true)).orderBy(departments.name);
}

export async function createDepartment(data: InsertDepartment) {
  const db = await getDb();
  if (!db) return;
  await db.insert(departments).values(data);
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
      date: overtimeRecords.date,
      startTime: overtimeRecords.startTime,
      endTime: overtimeRecords.endTime,
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
