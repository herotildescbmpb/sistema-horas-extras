import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  adminUpdateUser,
  createDepartment,
  createOvertimeRecord,
  deleteOvertimeRecord,
  getAdminMonthSummary,
  getAllOvertimeRecords,
  getAllUsers,
  getDepartments,
  getDepartmentsWithChefe,
  getMonthSummary,
  getOvertimeRecordById,
  getOvertimeRecordsByUser,
  getUserById,
  reviewOvertimeRecord,
  searchServidores,
  getServidorByMatricula,
  setDepartmentChefe,
  setUserActive,
  setUserRole,
  updateDepartment,
  updateOvertimeRecord,
  updateUserProfile,
} from "./db";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

// ─── Overtime multipliers ─────────────────────────────────────────────────────
const MULTIPLIERS = { weekday: "1.50", saturday: "2.00", sunday_holiday: "2.00" };

function calcMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startTotal = sh * 60 + (sm || 0);
  let endTotal = eh * 60 + (em || 0);
  if (endTotal <= startTotal) endTotal += 24 * 60;
  return endTotal - startTotal;
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Servidores ──────────────────────────────────────────────────────────────
  servidores: router({
    search: protectedProcedure
      .input(z.object({ query: z.string().min(2) }))
      .query(({ input }) => searchServidores(input.query, 15)),
    getByMatricula: protectedProcedure
      .input(z.object({ matricula: z.string() }))
      .query(({ input }) => getServidorByMatricula(input.matricula)),
  }),

  // ─── Departments ─────────────────────────────────────────────────────────────
  departments: router({
    list: protectedProcedure.query(() => getDepartments()),
    listWithChefe: adminProcedure.query(() => getDepartmentsWithChefe()),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), shortName: z.string().optional(), description: z.string().optional() }))
      .mutation(({ input }) => createDepartment({ name: input.name, shortName: input.shortName, description: input.description })),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), shortName: z.string().optional(), description: z.string().optional() }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateDepartment(id, data);
      }),
    setChefe: adminProcedure
      .input(z.object({ departmentId: z.number(), chefeId: z.number().nullable() }))
      .mutation(({ input }) => setDepartmentChefe(input.departmentId, input.chefeId)),
  }),

  // ─── Users ───────────────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure.query(() => getAllUsers()),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getUserById(input.id)),

    adminUpdate: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          name: z.string().optional(),
          email: z.string().optional(),
          department: z.string().optional(),
          position: z.string().optional(),
          role: z.enum(["user", "admin"]).optional(),
          isActive: z.boolean().optional(),
          matricula: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { userId, ...data } = input;
        return adminUpdateUser(userId, data);
      }),

    setActive: adminProcedure
      .input(z.object({ userId: z.number(), isActive: z.boolean() }))
      .mutation(({ input }) => setUserActive(input.userId, input.isActive)),

    updateProfile: protectedProcedure
      .input(
        z.object({
          targetUserId: z.number().optional(),
          name: z.string().optional(),
          department: z.string().optional(),
          position: z.string().optional(),
          hourlyRate: z.string().optional(),
          matricula: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        const { targetUserId, ...data } = input;
        const userId = ctx.user.role === "admin" && targetUserId ? targetUserId : ctx.user.id;
        return updateUserProfile(userId, data);
      }),

    setRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(({ input }) => setUserRole(input.userId, input.role)),
  }),

  // ─── Overtime Records ─────────────────────────────────────────────────────────
  overtime: router({
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const record = await getOvertimeRecordById(input.id);
        if (!record) throw new TRPCError({ code: "NOT_FOUND" });
        if (record.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return record;
      }),

    list: protectedProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          status: z.string().optional(),
        })
      )
      .query(({ ctx, input }) =>
        getOvertimeRecordsByUser(ctx.user.id, {
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
        })
      ),

    listAll: adminProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          status: z.string().optional(),
          userId: z.number().optional(),
        })
      )
      .query(({ input }) => getAllOvertimeRecords(input)),

    create: protectedProcedure
      .input(
        z.object({
          tipoEscala: z.string().optional(),
          servidor: z.string().optional(),
          date: z.string(),
          endDate: z.string().optional(),
          startTime: z.string(),
          endTime: z.string(),
          funcao: z.string().optional(),
          modalidade: z.string().optional(),
          dayType: z.enum(["weekday", "saturday", "sunday_holiday"]),
          totalMinutes: z.number().optional(),
          reason: z.string().optional(),
          project: z.string().optional(),
          department: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        const totalMinutes = input.totalMinutes ?? calcMinutes(input.startTime, input.endTime);
        const multiplier = MULTIPLIERS[input.dayType];
        return createOvertimeRecord({
          userId: ctx.user.id,
          tipoEscala: input.tipoEscala,
          servidor: input.servidor ?? (ctx.user as any).matricula ?? undefined,
          date: input.date,
          endDate: input.endDate,
          startTime: input.startTime,
          endTime: input.endTime,
          funcao: input.funcao ?? (ctx.user as any).position ?? undefined,
          modalidade: input.modalidade,
          totalMinutes,
          dayType: input.dayType,
          multiplier,
          reason: input.reason,
          project: input.project,
          department: input.department ?? (ctx.user as any).department ?? undefined,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          tipoEscala: z.string().optional(),
          servidor: z.string().optional(),
          date: z.string().optional(),
          endDate: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          funcao: z.string().optional(),
          modalidade: z.string().optional(),
          dayType: z.enum(["weekday", "saturday", "sunday_holiday"]).optional(),
          totalMinutes: z.number().optional(),
          reason: z.string().optional(),
          project: z.string().optional(),
          department: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const record = await getOvertimeRecordById(input.id);
        if (!record) throw new TRPCError({ code: "NOT_FOUND" });
        if (record.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (record.status !== "pending" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas registros pendentes podem ser editados." });
        }
        const { id, ...data } = input;
        const start = data.startTime ?? record.startTime;
        const end = data.endTime ?? record.endTime;
        const totalMinutes = data.totalMinutes ?? calcMinutes(start, end);
        const dayType = data.dayType ?? record.dayType;
        const multiplier = MULTIPLIERS[dayType];
        return updateOvertimeRecord(id, { ...data, totalMinutes, multiplier });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const record = await getOvertimeRecordById(input.id);
        if (!record) throw new TRPCError({ code: "NOT_FOUND" });
        if (record.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (record.status !== "pending" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas registros pendentes podem ser excluídos." });
        }
        return deleteOvertimeRecord(input.id);
      }),

    review: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["approved", "rejected"]),
          reviewNote: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        reviewOvertimeRecord(input.id, ctx.user.id, input.status, input.reviewNote)
      ),
  }),

  // ─── Reports ──────────────────────────────────────────────────────────────────
  reports: router({
    monthSummary: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(({ ctx, input }) => getMonthSummary(ctx.user.id, input.year, input.month)),

    adminMonthSummary: adminProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(({ input }) => getAdminMonthSummary(input.year, input.month)),

    exportCsv: protectedProcedure
      .input(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
          userId: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin";
        let records;
        if (isAdmin && input.userId) {
          records = await getAllOvertimeRecords({ startDate: input.startDate, endDate: input.endDate, userId: input.userId });
        } else if (isAdmin && !input.userId) {
          records = await getAllOvertimeRecords({ startDate: input.startDate, endDate: input.endDate });
        } else {
          records = await getOvertimeRecordsByUser(ctx.user.id, { startDate: input.startDate, endDate: input.endDate });
        }

        const header = "Tipo de Escala;Servidor;Data Início;Hora Início;Data Final;Hora Fim;Função;Modalidade;Status;Horas;Multiplicador;Projeto;Setor;Motivo;Funcionário";
        const rows = records.map((r) => {
          const rec = r as any;
          const servidor = rec.servidor ?? rec.userMatricula ?? "";
          const funcao = rec.funcao ?? rec.userDepartment ?? "";
          const endDate = rec.endDate ?? r.date;
          const motivo = (r.reason ?? "").replace(/;/g, ",");
          const statusLabel: Record<string, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado" };
          const st = statusLabel[r.status] ?? r.status;
          const hours = (r.totalMinutes / 60).toFixed(2).replace(".", ",");
          const startFmt = r.startTime.length === 5 ? r.startTime + ":00" : r.startTime;
          const endFmt = r.endTime.length === 5 ? r.endTime + ":00" : r.endTime;
          const dateFmt = r.date.split("-").reverse().join("/");
          const endDateFmt = endDate.split("-").reverse().join("/");
          const userName = rec.userName ?? "";
          return `${rec.tipoEscala ?? ""};${servidor};${dateFmt};${startFmt};${endDateFmt};${endFmt};${funcao};${rec.modalidade ?? ""};${st};${hours};${r.multiplier}x;${r.project ?? ""};${r.department ?? ""};${motivo};${userName}`;
        });

        return { csv: [header, ...rows].join("\n"), count: records.length };
      }),
  }),
});

export type AppRouter = typeof appRouter;
