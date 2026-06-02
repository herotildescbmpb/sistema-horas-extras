import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  adminUpdateUser,
  createUser,
  getUserByEmail,
  createDepartment,
  createOvertimeRecord,
  createEscala,
  deleteOvertimeRecord,
  getAdminMonthSummary,
  getAllEscalas,
  getAllOvertimeRecords,
  getAllUsers,
  getDepartments,
  getDepartmentsWithChefe,
  getEscalaById,
  getEscalasByUser,
  getMonthSummary,
  getOvertimeRecordById,
  getOvertimeRecordsByUser,
  getUserById,
  launchEscala,
  reviewOvertimeRecord,
  searchServidores,
  getServidorByMatricula,
  setDepartmentChefe,
  setUserActive,
  setUserRole,
  updateDepartment,
  updateEscalaItem,
  duplicateEscala,
  updateEscalaStatus,
  updateOvertimeRecord,
  updateUserProfile,
  getDepartmentByChefe,
  getOvertimeRecordsByDepartment,
  getEscalasByDepartment,
  createNotification,
  getNotificationsByUser,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  notifyChefe,
  getRolePermissions,
  getAllRolePermissions,
  setRolePermission,
  DEFAULT_PERMISSIONS,
  RoleType,
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
          role: z.enum(["user", "admin", "chefe", "auxiliar_administrativo"]).optional(),
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
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "chefe", "auxiliar_administrativo"]) }))
      .mutation(({ input }) => setUserRole(input.userId, input.role)),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(2, "Nome obrigatório"),
          email: z.string().email("E-mail inválido").optional().or(z.literal("")),
          department: z.string().optional(),
          position: z.string().optional(),
          role: z.enum(["user", "admin", "chefe", "auxiliar_administrativo"]).default("user"),
          matricula: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Verificar e-mail duplicado
        if (input.email) {
          const existing = await getUserByEmail(input.email);
          if (existing) {
            throw new TRPCError({ code: "CONFLICT", message: "Já existe um usuário com este e-mail." });
          }
        }
        await createUser({
          name: input.name,
          email: input.email || undefined,
          department: input.department || undefined,
          position: input.position || undefined,
          role: input.role,
          matricula: input.matricula || undefined,
        });
        return { success: true };
      }),
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
      .mutation(async ({ ctx, input }) => {
        const totalMinutes = input.totalMinutes ?? calcMinutes(input.startTime, input.endTime);
        const multiplier = MULTIPLIERS[input.dayType];
        const dept = input.department ?? (ctx.user as any).department ?? undefined;
        const record = await createOvertimeRecord({
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
          department: dept,
        });
        // Notificar chefe do setor
        if (dept) {
          const [day, month, year] = input.date.split("-").reverse();
          const dateLabel = `${day}/${month}/${year}`;
          await notifyChefe(dept, {
            type: "registro_criado",
            title: "Novo registro de horas extras",
            body: `${ctx.user.name ?? "Um militar"} registrou horas extras em ${dateLabel} (${input.tipoEscala ?? ""}).`,
            relatedId: (record as any)?.insertId ?? undefined,
            relatedType: "overtime",
            fromUserId: ctx.user.id,
            fromUserName: ctx.user.name ?? undefined,
          }).catch(() => {/* silencioso */});
        }
        return record;
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

  // ─── Chefe de Setor ──────────────────────────────────────────────────────────
  chefe: router({
    /** Retorna o departamento onde o usuário logado é chefe */
    myDepartment: protectedProcedure.query(({ ctx }) =>
      getDepartmentByChefe(ctx.user.id)
    ),

    /** Registros de horas extras de todos os usuários do setor do chefe */
    listOvertimes: protectedProcedure
      .input(z.object({
        mes: z.number().optional(),
        ano: z.number().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const dept = await getDepartmentByChefe(ctx.user.id);
        if (!dept) throw new TRPCError({ code: "FORBIDDEN", message: "Você não é chefe de nenhum setor." });
        return getOvertimeRecordsByDepartment(dept.name, input);
      }),

    /** Escalas em lote de todos os usuários do setor do chefe */
    listEscalas: protectedProcedure
      .input(z.object({
        mes: z.number().optional(),
        ano: z.number().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const dept = await getDepartmentByChefe(ctx.user.id);
        if (!dept) throw new TRPCError({ code: "FORBIDDEN", message: "Você não é chefe de nenhum setor." });
        return getEscalasByDepartment(dept.name, input);
      }),
  }),

  // ─── Notificações ─────────────────────────────────────────────────────────
  notifications: router({
    /** Lista as últimas 30 notificações do usuário logado */
    list: protectedProcedure.query(({ ctx }) =>
      getNotificationsByUser(ctx.user.id)
    ),

    /** Contagem de não lidas */
    unreadCount: protectedProcedure.query(({ ctx }) =>
      getUnreadCount(ctx.user.id)
    ),

    /** Marca uma notificação como lida */
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) =>
        markNotificationRead(input.id, ctx.user.id)
      ),

    /** Marca todas as notificações como lidas */
    markAllRead: protectedProcedure.mutation(({ ctx }) =>
      markAllNotificationsRead(ctx.user.id)
    ),
  }),

  // ─── Escalas em Lote ─────────────────────────────────────────────────────────
  escalas: router({
    list: protectedProcedure.query(({ ctx }) =>
      ctx.user.role === "admin" ? getAllEscalas() : getEscalasByUser(ctx.user.id)
    ),

    listAll: adminProcedure
      .input(z.object({ status: z.string().optional(), userId: z.number().optional() }))
      .query(({ input }) => getAllEscalas(input)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const escala = await getEscalaById(input.id);
        if (!escala) throw new TRPCError({ code: "NOT_FOUND" });
        if (escala.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return escala;
      }),

    create: protectedProcedure
      .input(
        z.object({
          tipoEscala: z.string().min(1),
          mes: z.number().min(1).max(12),
          ano: z.number().min(2020).max(2100),
          startTime: z.string(),
          endTime: z.string(),
          funcao: z.string().min(1),
          department: z.string().optional(),
          justificativa: z.string().optional(),
          items: z.array(z.object({
            matricula: z.string(),
            nomeServidor: z.string(),
            posto: z.string().optional(),
            date: z.string(),
            startTime: z.string(),
            endTime: z.string(),
            totalMinutes: z.number(),
            modalidade: z.string(),
            dayType: z.enum(["weekday", "saturday", "sunday_holiday"]),
          })),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { items, ...escalaData } = input;
        const id = await createEscala(
          { ...escalaData, userId: ctx.user.id },
          items.map(i => ({ ...i, escalaId: 0 })) // escalaId set in createEscala
        );
        return { id };
      }),

    updateItem: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        totalMinutes: z.number().optional(),
        modalidade: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { itemId, ...data } = input;
        return updateEscalaItem(itemId, data);
      }),

    launch: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const escala = await getEscalaById(input.id);
        if (!escala) throw new TRPCError({ code: "NOT_FOUND" });
        if (escala.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (escala.status !== "rascunho") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas rascunhos podem ser lançados." });
        }
        await launchEscala(input.id, ctx.user.id);
        // Notificar chefe do setor
        const dept = escala.department;
        if (dept) {
          const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
          const mesLabel = `${meses[(escala.mes ?? 1) - 1] ?? escala.mes}/${escala.ano}`;
          await notifyChefe(dept, {
            type: "escala_lancada",
            title: "Nova escala lançada",
            body: `${ctx.user.name ?? "Um militar"} lançou uma escala de ${escala.tipoEscala} para ${mesLabel}.`,
            relatedId: input.id,
            relatedType: "escala",
            fromUserId: ctx.user.id,
            fromUserName: ctx.user.name ?? undefined,
          }).catch(() => {/* silencioso */});
        }
        return { success: true };
      }),

    review: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["aprovado", "rejeitado"]),
        reviewNote: z.string().optional(),
      }))
      .mutation(({ ctx, input }) =>
        updateEscalaStatus(input.id, input.status, ctx.user.id, input.reviewNote)
      ),

    duplicate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const escala = await getEscalaById(input.id);
        if (!escala) throw new TRPCError({ code: "NOT_FOUND" });
        if (escala.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await duplicateEscala(input.id, ctx.user.id);
        return result;
      }),
   }),

  // ─── Permissions ────────────────────────────────────────────────────────────────────────────────
  permissions: router({
    // Retorna permissões do usuário logado
    mine: protectedProcedure.query(async ({ ctx }) => {
      const role = ctx.user.role as RoleType;
      return getRolePermissions(role);
    }),

    // Lista todas as permissões de todos os perfis (admin only)
    listAll: adminProcedure.query(async () => {
      const all = await getAllRolePermissions();
      // Retornar também a definição de cada permissão (label, category)
      const definitions = Object.entries(DEFAULT_PERMISSIONS).map(([key, def]) => ({
        key,
        label: def.label,
        category: def.category,
      }));
      return { permissions: all, definitions };
    }),

    // Atualiza uma permissão de um perfil (admin only)
    update: adminProcedure
      .input(z.object({
        role: z.enum(["user", "admin", "chefe", "auxiliar_administrativo"]),
        permissionKey: z.string(),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await setRolePermission(input.role as RoleType, input.permissionKey, input.enabled);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
