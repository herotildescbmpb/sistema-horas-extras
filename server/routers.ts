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
          matricula: z.string().optional(),
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
          tipoEscala: z.string().optional(),
          date: z.string(),
          endDate: z.string().optional(),
          startTime: z.string(),
          endTime: z.string(),
          funcao: z.string().optional(),
          modalidade: z.string().optional(),
          dayType: z.enum(["weekday", "saturday", "sunday_holiday"]),
          reason: z.string().optional(),
          project: z.string().optional(),
          department: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        const totalMinutes = calcMinutes(input.startTime, input.endTime);
        const multiplier = MULTIPLIERS[input.dayType];
        // servidor = matricula do usuário logado (preenchida automaticamente)
        const servidor = (ctx.user as any).matricula ?? undefined;
        return createOvertimeRecord({
          userId: ctx.user.id,
          tipoEscala: input.tipoEscala,
          servidor,
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
          department: input.department ?? ctx.user.department ?? undefined,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          tipoEscala: z.string().optional(),
          date: z.string().optional(),
          endDate: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          funcao: z.string().optional(),
          modalidade: z.string().optional(),
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

        // Formato compatível com o CSV de escalas original
        const header = "Tipo de Escala;Servidor;Data Início;Hora Início:;Data Final;Hora Fim:;Função;Modalidade;Status;Horas;Multiplicador;Projeto;Setor;Motivo;Funcionário";
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
