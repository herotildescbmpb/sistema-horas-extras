import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  createOvertimeRecord: vi.fn().mockResolvedValue({ insertId: 1 }),
  getOvertimeRecordsByUser: vi.fn().mockResolvedValue([]),
  getAllOvertimeRecords: vi.fn().mockResolvedValue([]),
  getOvertimeRecordById: vi.fn().mockResolvedValue(null),
  updateOvertimeRecord: vi.fn().mockResolvedValue(undefined),
  deleteOvertimeRecord: vi.fn().mockResolvedValue(undefined),
  reviewOvertimeRecord: vi.fn().mockResolvedValue(undefined),
  getDepartments: vi.fn().mockResolvedValue([]),
  getDepartmentsWithChefe: vi.fn().mockResolvedValue([]),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUserById: vi.fn().mockResolvedValue(null),
  getMonthSummary: vi.fn().mockResolvedValue({ totalMinutes: 0, approvedMinutes: 0, pendingCount: 0, rejectedCount: 0 }),
  getAdminMonthSummary: vi.fn().mockResolvedValue({ totalMinutes: 0, pendingCount: 0, employeeCount: 0 }),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  setUserRole: vi.fn().mockResolvedValue(undefined),
  adminUpdateUser: vi.fn().mockResolvedValue(undefined),
  createUser: vi.fn().mockResolvedValue(undefined),
  getUserByEmail: vi.fn().mockResolvedValue(undefined),
  setUserActive: vi.fn().mockResolvedValue(undefined),
  setDepartmentChefe: vi.fn().mockResolvedValue(undefined),
  updateDepartment: vi.fn().mockResolvedValue(undefined),
  createDepartment: vi.fn().mockResolvedValue(undefined),
  searchServidores: vi.fn().mockResolvedValue([]),
  getServidorByMatricula: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  // Chefe / Notifications
  getDepartmentByChefe: vi.fn().mockResolvedValue(null),
  getOvertimeRecordsByDepartment: vi.fn().mockResolvedValue([]),
  getEscalasByDepartment: vi.fn().mockResolvedValue([]),
  createNotification: vi.fn().mockResolvedValue(undefined),
  getNotificationsByUser: vi.fn().mockResolvedValue([]),
  getUnreadCount: vi.fn().mockResolvedValue(0),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  notifyChefe: vi.fn().mockResolvedValue(undefined),
  // Escalas
  getAllEscalas: vi.fn().mockResolvedValue([]),
  getEscalasByUser: vi.fn().mockResolvedValue([]),
  getEscalaById: vi.fn().mockResolvedValue(null),
  createEscala: vi.fn().mockResolvedValue(1),
  launchEscala: vi.fn().mockResolvedValue(undefined),
  updateEscalaItem: vi.fn().mockResolvedValue(undefined),
  updateEscalaStatus: vi.fn().mockResolvedValue(undefined),
  duplicateEscala: vi.fn().mockResolvedValue({ id: 2, mes: 7, ano: 2026 }),
}));

function makeCtx(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      department: "TI",
      position: "Analista",
      hourlyRate: "35.00",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("overtime.create", () => {
  it("creates a record with correct totalMinutes and multiplier for weekday", async () => {
    const { createOvertimeRecord } = await import("./db");
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);

    await caller.overtime.create({
      date: "2025-01-15",
      startTime: "18:00",
      endTime: "20:00",
      dayType: "weekday",
      reason: "Urgência no projeto",
    });

    expect(createOvertimeRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        totalMinutes: 120,
        multiplier: "1.50",
        dayType: "weekday",
      })
    );
  });

  it("creates a record with 2.0x multiplier for sunday_holiday", async () => {
    const { createOvertimeRecord } = await import("./db");
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);

    await caller.overtime.create({
      date: "2025-01-19",
      startTime: "08:00",
      endTime: "12:00",
      dayType: "sunday_holiday",
    });

    expect(createOvertimeRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        totalMinutes: 240,
        multiplier: "2.00",
        dayType: "sunday_holiday",
      })
    );
  });

  it("handles overnight shifts correctly", async () => {
    const { createOvertimeRecord } = await import("./db");
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);

    await caller.overtime.create({
      date: "2025-01-15",
      startTime: "22:00",
      endTime: "02:00",
      dayType: "weekday",
    });

    expect(createOvertimeRecord).toHaveBeenCalledWith(
      expect.objectContaining({ totalMinutes: 240 })
    );
  });
});

describe("overtime.list", () => {
  it("returns records for the authenticated user", async () => {
    const { getOvertimeRecordsByUser } = await import("./db");
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);

    await caller.overtime.list({});

    expect(getOvertimeRecordsByUser).toHaveBeenCalledWith(1, expect.any(Object));
  });
});

describe("overtime.listAll (admin only)", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.overtime.listAll({})).rejects.toThrow();
  });

  it("succeeds for admin users", async () => {
    const ctx = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.overtime.listAll({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("reports.monthSummary", () => {
  it("returns summary for current user", async () => {
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reports.monthSummary({ year: 2025, month: 1 });
    expect(result).toHaveProperty("totalMinutes");
    expect(result).toHaveProperty("approvedMinutes");
  });
});

describe("departments.list", () => {
  it("returns department list for authenticated users", async () => {
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.departments.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("overtime.create with CSV fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes tipoEscala, endDate, funcao and modalidade to createOvertimeRecord", async () => {
    const { createOvertimeRecord } = await import("./db");
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);

    await caller.overtime.create({
      tipoEscala: "Expediente",
      date: "2025-02-10",
      endDate: "2025-02-10",
      startTime: "08:00",
      endTime: "12:00",
      funcao: "Analista de Sistemas",
      modalidade: "Especial",
      dayType: "weekday",
      reason: "Demanda urgente",
    });

    expect(createOvertimeRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEscala: "Expediente",
        endDate: "2025-02-10",
        funcao: "Analista de Sistemas",
        modalidade: "Especial",
        totalMinutes: 240,
        multiplier: "1.50",
      })
    );
  });

  it("auto-fills servidor from user matricula when available", async () => {
    const { createOvertimeRecord } = await import("./db");
    // user with matricula
    const ctx: TrpcContext = {
      user: {
        id: 2,
        openId: "server-user",
        name: "Servidor Teste",
        email: "srv@example.com",
        loginMethod: "manus",
        role: "user",
        department: "RH",
        position: "Auxiliar",
        hourlyRate: "20.00",
        matricula: "527352",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await caller.overtime.create({
      date: "2025-02-15",
      startTime: "07:00",
      endTime: "11:00",
      dayType: "saturday",
    });

    expect(createOvertimeRecord).toHaveBeenCalledWith(
      expect.objectContaining({ servidor: "527352" })
    );
  });

  it("reports.exportCsv returns count and csv string", async () => {
    const { getOvertimeRecordsByUser } = await import("./db");
    (getOvertimeRecordsByUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: 1,
        userId: 1,
        tipoEscala: "Expediente",
        servidor: "527352",
        date: "2025-02-10",
        endDate: "2025-02-10",
        startTime: "08:00",
        endTime: "12:00",
        funcao: "Analista",
        modalidade: "Especial",
        totalMinutes: 240,
        dayType: "weekday",
        multiplier: "1.50",
        reason: "Urgente",
        project: "Alpha",
        department: "TI",
        status: "approved",
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reports.exportCsv({
      startDate: "2025-02-01",
      endDate: "2025-02-28",
    });

    expect(result.count).toBe(1);
    expect(result.csv).toContain("Tipo de Escala");
    expect(result.csv).toContain("Expediente");
    expect(result.csv).toContain("527352");
    expect(result.csv).toContain("Analista");
    expect(result.csv).toContain("Especial");
  });
});

// ─── Admin Users tests ────────────────────────────────────────────────────────
describe("users.adminUpdate", () => {
  it("allows admin to update another user's data", async () => {
    const { adminUpdateUser } = await import("./db");
    const ctx = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);

    await caller.users.adminUpdate({
      userId: 2,
      name: "Novo Nome",
      department: "DAL/1",
      role: "user",
    });

    expect(adminUpdateUser).toHaveBeenCalledWith(2, expect.objectContaining({
      name: "Novo Nome",
      department: "DAL/1",
      role: "user",
    }));
  });

  it("throws FORBIDDEN when non-admin tries to call adminUpdate", async () => {
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.adminUpdate({ userId: 2, name: "Hack" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("users.setActive", () => {
  it("allows admin to deactivate a user", async () => {
    const { setUserActive } = await import("./db");
    const ctx = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);

    await caller.users.setActive({ userId: 3, isActive: false });

    expect(setUserActive).toHaveBeenCalledWith(3, false);
  });

  it("throws FORBIDDEN when non-admin tries to setActive", async () => {
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.setActive({ userId: 3, isActive: false })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("departments.setChefe", () => {
  it("allows admin to set a department chief", async () => {
    const { setDepartmentChefe } = await import("./db");
    const ctx = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);

    await caller.departments.setChefe({ departmentId: 1, chefeId: 5 });

    expect(setDepartmentChefe).toHaveBeenCalledWith(1, 5);
  });

  it("allows admin to remove a department chief (null)", async () => {
    const { setDepartmentChefe } = await import("./db");
    const ctx = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);

    await caller.departments.setChefe({ departmentId: 1, chefeId: null });

    expect(setDepartmentChefe).toHaveBeenCalledWith(1, null);
  });

  it("throws FORBIDDEN when non-admin tries to setChefe", async () => {
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.departments.setChefe({ departmentId: 1, chefeId: 5 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─── users.create tests ───────────────────────────────────────────────────────
describe("users.create", () => {
  it("allows admin to create a new user", async () => {
    const { createUser, getUserByEmail } = await import("./db");
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    const ctx = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.create({
      name: "Novo Servidor",
      email: "novo@cbmpb.pb.gov.br",
      department: "DAL/1",
      role: "user",
    });

    expect(result).toEqual({ success: true });
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
      name: "Novo Servidor",
      email: "novo@cbmpb.pb.gov.br",
      department: "DAL/1",
      role: "user",
    }));
  });

  it("throws CONFLICT when email already exists", async () => {
    const { getUserByEmail } = await import("./db");
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 99, email: "dup@cbmpb.pb.gov.br" });
    const ctx = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.create({ name: "Duplicado", email: "dup@cbmpb.pb.gov.br", role: "user" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("throws FORBIDDEN when non-admin tries to create user", async () => {
    const ctx = makeCtx("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.create({ name: "Hack", role: "user" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
