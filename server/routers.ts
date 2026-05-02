import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createDepartment,
  createOvertimeRecord,
  deleteOvertimeRecord,
  getAdminMonthSummary,
  getAllOvertimeRecords,
  getAllUsers,
  getDepartments,
  getMonthSummary,
  getOvertimeRecordById,
  getOvertimeRecordsByUser,
  reviewOvertimeRecord,
  setUserRole,
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
  const startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  if (endTotal <= startTotal) endTotal += 24 * 60; // overnight
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

  // ─── Departments ────────────────────────────────────────────────────────────
  departments: router({
    list: protectedProcedure.query(() => getDepartments()),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
      .mutation(({ input }) => createDepartment({ name: input.name, description: input.description })),
  }),

  // ─── Users (admin) ──────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure.query(() => getAllUsers()),

    updateProfile: protectedProcedure
      .input(
        z.object({
          targetUserId: z.number().optional(), // admin can pass a target userId
          name: z.string().optional(),
          department: z.string().optional(),
          position: z.string().optional(),
          hourlyRate: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        const { targetUserId, ...data } = input;
        // Only admins can update other users' profiles
        const userId = (ctx.user.role === "admin" && targetUserId) ? targetUserId : ctx.user.id;
        return updateUserProfile(userId, data);
      }),

    setRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(({ input }) => setUserRole(input.userId, input.role)),
  }),

  // ─── Overtime Records ────────────────────────────────────────────────────────
  overtime: router({
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
          date: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          dayType: z.enum(["weekday", "saturday", "sunday_holiday"]),
          reason: z.string().optional(),
          project: z.string().optional(),
          department: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        const totalMinutes = calcMinutes(input.startTime, input.endTime);
        const multiplier = MULTIPLIERS[input.dayType];
        return createOvertimeRecord({
          userId: ctx.user.id,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          totalMinutes,
          dayType: input.dayType,
          multiplier,
          reason: input.reason,
          project: input.project,
          department: input.department ?? ctx.user.department ?? undefined,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          date: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          dayType: z.enum(["weekday", "saturday", "sunday_holiday"]).optional(),
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
        const totalMinutes = calcMinutes(start, end);
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

  // ─── Dashboard / Reports ─────────────────────────────────────────────────────
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
          records = await getAllOvertimeRecords({
            startDate: input.startDate,
            endDate: input.endDate,
            userId: input.userId,
          });
        } else if (isAdmin && !input.userId) {
          records = await getAllOvertimeRecords({
            startDate: input.startDate,
            endDate: input.endDate,
          });
        } else {
          records = await getOvertimeRecordsByUser(ctx.user.id, {
            startDate: input.startDate,
            endDate: input.endDate,
          });
        }

        const header = "Data,Início,Fim,Horas,Tipo,Multiplicador,Projeto,Setor,Status,Motivo";
        const dayTypeLabel: Record<string, string> = {
          weekday: "Dia Útil",
          saturday: "Sábado",
          sunday_holiday: "Dom/Feriado",
        };
        const statusLabel: Record<string, string> = {
          pending: "Pendente",
          approved: "Aprovado",
          rejected: "Rejeitado",
        };

        const rows = records.map((r) => {
          const hours = (r.totalMinutes / 60).toFixed(2);
          const dt = dayTypeLabel[r.dayType] ?? r.dayType;
          const st = statusLabel[r.status] ?? r.status;
          const reason = (r.reason ?? "").replace(/,/g, ";");
          return `${r.date},${r.startTime},${r.endTime},${hours},${dt},${r.multiplier}x,${r.project ?? ""},${r.department ?? ""},${st},${reason}`;
        });

        return { csv: [header, ...rows].join("\n"), count: records.length };
      }),
  }),
});

export type AppRouter = typeof appRouter;
