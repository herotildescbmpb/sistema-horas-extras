import { trpc } from "@/lib/trpc";
import { getStartSlots, getEndSlots } from "@/lib/timeSlots";
import { useAuth } from "@/_core/hooks/useAuth";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Clock, Save, ArrowLeft, Loader2, Search, User, Calendar, Info, CheckCircle2, Tag,
} from "lucide-react";
import { getLaunchWindow, isDateInWindow, formatWindow } from "@shared/launchWindow";
import { AlertTriangle, Lock } from "lucide-react";

// ─── Mini Calendar ───────────────────────────────────────────────────────────

const DIAS_SEMANA_SHORT_FORM = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MESES_FORM = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const FERIADOS_FIXOS_FORM = ["01-01","04-21","05-01","09-07","10-12","11-02","11-15","11-20","12-25"];
function calcEasterForm(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
function isFeriadoFormBase(date: Date): boolean {
  const mmdd = `${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const easter = calcEasterForm(date.getFullYear());
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };
  const fmt = (d: Date) => `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const moveis = new Set([fmt(addDays(easter,-48)),fmt(addDays(easter,-47)),fmt(addDays(easter,-2)),fmt(easter),fmt(addDays(easter,60))]);
  return FERIADOS_FIXOS_FORM.includes(mmdd) || moveis.has(mmdd);
}
function isFeriadoForm(date: Date, customs: string[] = []): boolean {
  if (isFeriadoFormBase(date)) return true;
  const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  return customs.includes(iso);
}

interface DateCalendarProps {
  mes: number;  // 1-12
  ano: number;
  selectedDate: string; // DD/MM/AAAA
  onSelect: (dateBR: string) => void;
  customHolidayDates?: string[]; // ISO YYYY-MM-DD
}
function DateCalendar({ mes, ano, selectedDate, onSelect, customHolidayDates = [] }: DateCalendarProps) {
  const daysInMonth = new Date(ano, mes, 0).getDate();
  const firstDayOfWeek = new Date(ano, mes - 1, 1).getDay();
  const selectedDay = (() => {
    const m = selectedDate?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    if (Number(m[2]) === mes && Number(m[3]) === ano) return Number(m[1]);
    return null;
  })();
  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() + 1 === mes && today.getFullYear() === ano;

  return (
    <div className="select-none">
      <div className="text-center text-xs font-semibold text-muted-foreground mb-2">
        {MESES_FORM[mes - 1]} {ano}
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA_SHORT_FORM.map(d => (
          <div key={d} className={`text-center text-[10px] font-semibold py-0.5 ${
            d === "Dom" || d === "Sáb" ? "text-blue-500" : "text-muted-foreground"
          }`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(ano, mes - 1, day);
          const dow = date.getDay();
          const isWeekend = dow === 0 || dow === 6;
          const isFer = isFeriadoForm(date, customHolidayDates);
          const isSelected = selectedDay === day;
          const isTod = isToday(day);
          const dd = String(day).padStart(2,"0");
          const mm = String(mes).padStart(2,"0");
          const dateBR = `${dd}/${mm}/${ano}`;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(dateBR)}
              className={`relative rounded p-1 text-center min-h-[36px] border transition-all text-[11px] font-bold hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                  : isTod
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : isFer
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : isWeekend
                        ? "bg-blue-50 border-blue-100 text-blue-600"
                        : "bg-background border-border text-foreground hover:bg-muted/60"
              }`}
              title={isFer ? "Feriado" : isWeekend ? "Fim de semana" : ""}
            >
              {day}
              {isFer && !isSelected && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-50 border border-blue-100 inline-block" /> Fim de semana</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-200 inline-block" /> Feriado</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary inline-block" /> Selecionado</span>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_ESCALA = [
  "Expediente",
  "Formatura",
  "Instrução e Treinamento",
  "Operacional",
  "Prontidão",
  "Representação",
  "Sobreaviso",
];

const FUNCOES = [
  "Chefe",
  "Auxiliar Administrativo",
  "Diretor",
  "Vice-Diretor",
];

// Time slots dinâmicos — ver import no topo do arquivo

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseDateBR(str: string): Date | null {
  const match = str?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return isNaN(date.getTime()) ? null : date;
}

function toISO(str: string): string {
  const m = str?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

function fromISO(iso: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso ?? "";
}

const FIXED_HOLIDAYS: [number, number][] = [
  // Nacionais
  [1,1],   // Confraternização Universal
  [4,21],  // Tiradentes
  [5,1],   // Dia do Trabalho
  [9,7],   // Independência do Brasil
  [10,12], // Nossa Senhora Aparecida
  [11,2],  // Finados
  [11,15], // Proclamação da República
  [11,20], // Consciência Negra (nacional desde 2024)
  [12,25], // Natal
  // Estaduais – Paraíba
  [8,5],   // Nossa Senhora das Neves (padroeira da PB)
  // Municipais – João Pessoa
  [10,4],  // São Francisco de Assis (padroeiro de JP)
];

// Easter calculation (Meeus/Jones/Butcher algorithm)
function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getMobileHolidays(year: number): Date[] {
  const easter = getEaster(year);
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return [
    addDays(easter, -48), // Carnaval segunda
    addDays(easter, -47), // Carnaval terça
    addDays(easter, -2),  // Sexta-feira Santa
    easter,               // Páscoa
    addDays(easter, 60),  // Corpus Christi
  ];
}

function isBrazilianHoliday(date: Date): boolean {
  const m = date.getMonth() + 1, d = date.getDate();
  if (FIXED_HOLIDAYS.some(([hm, hd]) => hm === m && hd === d)) return true;
  const mobile = getMobileHolidays(date.getFullYear());
  return mobile.some(h => h.getMonth() === date.getMonth() && h.getDate() === date.getDate());
}

function getModalidade(dateStr: string, customs: Array<{ date: string }> = []): "Especial" | "Extraordinário" | "" {
  const date = parseDateBR(dateStr);
  if (!date) return "";
  const dow = date.getDay();
  const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const isCustomHol = customs.some(h => h.date === iso);
  return (dow === 5 || dow === 6 || dow === 0 || isBrazilianHoliday(date) || isCustomHol)
    ? "Especial" : "Extraordinário";
}

function getDayType(dateStr: string, customs: Array<{ date: string }> = []): "weekday" | "saturday" | "sunday_holiday" {
  const date = parseDateBR(dateStr);
  if (!date) return "weekday";
  const dow = date.getDay();
  if (dow === 6) return "saturday";
  const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const isCustomHol = customs.some(h => h.date === iso);
  if (dow === 0 || isBrazilianHoliday(date) || isCustomHol) return "sunday_holiday";
  return "weekday";
}

function calcMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  let e = eh * 60 + em;
  // Apenas adiciona 24h se o fim for ESTRITAMENTE menor (turno vira meia-noite)
  // Se forem iguais, retorna 0 para o guard rejeitar
  if (e < s) e += 24 * 60;
  return e - s;
}

function formatMinutes(min: number): string {
  if (!min || min <= 0) return "0h";
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  tipoEscala: z.string().min(1, "Tipo de escala obrigatório"),
  servidorNome: z.string().min(2, "Nome do servidor obrigatório"),
  matricula: z.string().min(1, "Matrícula obrigatória"),
  posto: z.string().optional(),
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Data inválida — use DD/MM/AAAA"),
  endDate: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Data final inválida — use DD/MM/AAAA")
    .optional()
    .or(z.literal("")),
  startTime: z.string().min(1, "Hora início obrigatória"),
  endTime: z.string().min(1, "Hora fim obrigatória"),
  funcao: z.string().min(1, "Função obrigatória"),
  modalidade: z.string().min(1, "Modalidade obrigatória"),
  reason: z.string().min(1, "Justificativa obrigatória"),
  department: z.string().min(1, "Setor obrigatório"),
}).refine(
  (data) => data.startTime !== data.endTime,
  { message: "Hora início e hora fim não podem ser iguais", path: ["endTime"] }
);

type FormData = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OvertimeForm() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const {
    register, handleSubmit, control, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoEscala: "", servidorNome: "", matricula: "", posto: "",
      date: "", endDate: "", startTime: "", endTime: "", funcao: "", modalidade: "",
      reason: "", department: "",
    },
  });

  const watchDate = watch("date");
  const watchStart = watch("startTime");
  const watchEnd = watch("endTime");
  const watchModalidade = watch("modalidade");

  // Current record duration
  const currentMinutes = useMemo(() => calcMinutes(watchStart, watchEnd), [watchStart, watchEnd]);

  // Month total query
  const dateObj = parseDateBR(watchDate);
  const qYear = dateObj?.getFullYear() ?? new Date().getFullYear();
  const qMonth = dateObj ? dateObj.getMonth() + 1 : new Date().getMonth() + 1;

  // Slots de horário dinâmicos baseados no dayType da data selecionada
  const { data: customHolidays = [] } = trpc.holidays.list.useQuery(
    { year: qYear },
    { enabled: !!watchDate }
  );

  // Auto-set modalidade when date changes (after customHolidays is declared)
  useEffect(() => {
    if (watchDate?.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      setValue("modalidade", getModalidade(watchDate, customHolidays), { shouldValidate: true });
    }
  }, [watchDate, customHolidays, setValue]);
  const customHolidayDates = useMemo(
    () => customHolidays.map((h: { date: string }) => h.date),
    [customHolidays]
  );
  const activeDayType = useMemo(() => {
    if (!watchDate?.match(/^\d{2}\/\d{2}\/\d{4}$/)) return "weekday" as const;
    const iso = toISO(watchDate);
    const dow = new Date(iso + "T12:00:00").getDay();
    if (customHolidayDates.includes(iso)) return "sunday_holiday" as const;
    if (dow === 0 || isBrazilianHoliday(parseDateBR(watchDate)!)) return "sunday_holiday" as const;
    if (dow === 6) return "saturday" as const;
    return "weekday" as const;
  }, [watchDate, customHolidayDates]);
  const startSlots = useMemo(() => getStartSlots(activeDayType), [activeDayType]);
  const endSlots = useMemo(() => getEndSlots(activeDayType), [activeDayType]);
  const { data: monthSummary } = trpc.reports.monthSummary.useQuery(
    { year: qYear, month: qMonth },
    { enabled: !!user }
  );

  // Servidor search
  const { data: searchResults, isFetching: isSearching } =
    trpc.servidores.search.useQuery(
      { query: searchQuery },
      { enabled: searchQuery.length >= 2 }
    );

  // Load existing record for edit
  const { data: existingRecord } = trpc.overtime.getById.useQuery(
    { id: Number(params.id) },
    { enabled: isEdit && !!params.id }
  );

  useEffect(() => {
    if (existingRecord) {
      const nome = existingRecord.servidor ?? "";
      reset({
        tipoEscala: (existingRecord as any).tipoEscala ?? "",
        servidorNome: nome,
        matricula: nome,
        posto: "",
        date: fromISO(existingRecord.date),
        startTime: existingRecord.startTime,
        endTime: existingRecord.endTime,
        funcao: (existingRecord as any).funcao ?? "",
        modalidade: (existingRecord as any).modalidade ?? "",
        reason: existingRecord.reason ?? "",
        department: existingRecord.department ?? "",

      });
      setSearchQuery(nome);
    }
  }, [existingRecord, reset]);

  // Close autocomplete on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const createMutation = trpc.overtime.create.useMutation({
    onSuccess: () => {
      utils.overtime.list.invalidate();
      utils.reports.monthSummary.invalidate();
      toast.success("Registro criado com sucesso!");
      navigate("/horas");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.overtime.update.useMutation({
    onSuccess: () => {
      utils.overtime.list.invalidate();
      utils.reports.monthSummary.invalidate();
      toast.success("Registro atualizado com sucesso!");
      navigate("/horas");
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(data: FormData) {
    const isoDate = toISO(data.date);
    const isoEndDate = data.endDate ? toISO(data.endDate) : isoDate;
    const dayType = getDayType(data.date);
    const totalMinutes = calcMinutes(data.startTime, data.endTime);

    // Guard client-side: impede envio com duração inválida (0 min ou >= 24h)
    if (totalMinutes <= 0 || totalMinutes >= 1440) {
      toast.error("Duração inválida. Verifique os horários de início e fim.");
      return;
    }

    const payload = {
      tipoEscala: data.tipoEscala,
      servidor: data.matricula,
      date: isoDate,
      endDate: isoEndDate,
      startTime: data.startTime,
      endTime: data.endTime,
      funcao: data.funcao,
      modalidade: data.modalidade,
      dayType,
      totalMinutes,
      reason: data.reason,
      department: data.department && data.department !== "none" ? data.department : undefined,

    };
    if (isEdit) {
      updateMutation.mutate({ id: Number(params.id), ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function selectServidor(s: { nome: string; matricula: string; posto?: string | null; funcao?: string | null }) {
    setValue("servidorNome", s.nome, { shouldValidate: true });
    setValue("matricula", s.matricula, { shouldValidate: true });
    setValue("posto", s.posto ?? "");
    // Preenche função automaticamente se o servidor tiver função cadastrada
    if (s.funcao) setValue("funcao", s.funcao, { shouldValidate: true });
    setSearchQuery(s.nome);
    setShowSuggestions(false);
  }

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  // ── Janela de lançamento ──────────────────────────────────────────────────────
  const launchWindow = getLaunchWindow();
  const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const mesRefLabel = `${MESES_PT[launchWindow.mesRef - 1]}/${launchWindow.anoRef}`;

  // Valida se a data digitada pertence ao mês de referência
  const dateInWindow = watchDate?.match(/^\d{2}\/\d{2}\/\d{4}$/)
    ? isDateInWindow(toISO(watchDate), launchWindow)
    : true; // não valida enquanto não está completa

  return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/horas")} className="h-9 w-9 rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isEdit ? "Editar Registro" : "Novo Registro de Escala"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? "Atualize as informações do registro" : "Preencha todos os campos para registrar a escala"}
            </p>
          </div>
        </div>

        {/* Banner de janela de lançamento */}
        {!launchWindow.isOpen ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
            <Lock className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Janela de lançamento encerrada</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O período de lançamento para <strong>{mesRefLabel}</strong> foi encerrado.
                A janela estava aberta de <strong>{formatWindow(launchWindow)}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Mês de referência: <span className="text-primary">{mesRefLabel}</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Janela de lançamento aberta de <strong>{formatWindow(launchWindow)}</strong>.
                Registros devem ser do mês de <strong>{mesRefLabel}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Aviso de data fora do mês */}
        {!dateInWindow && watchDate?.match(/^\d{2}\/\d{2}\/\d{4}$/) && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Data fora do mês de referência</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                A data informada não pertence a <strong>{mesRefLabel}</strong>. Altere para uma data dentro do mês de referência.
              </p>
            </div>
          </div>
        )}

        {/* Duration cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Este Registro</p>
                <p className="text-lg font-bold text-foreground">
                  {currentMinutes > 0 ? formatMinutes(currentMinutes) : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total no Mês</p>
                <p className="text-lg font-bold text-foreground">
                  {monthSummary ? formatMinutes(monthSummary.totalMinutes) : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* ── Tipo de Escala ── */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Tipo de Escala *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="tipoEscala"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.tipoEscala ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione o tipo de escala" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_ESCALA.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipoEscala && <p className="text-xs text-destructive mt-1">{errors.tipoEscala.message}</p>}
            </CardContent>
          </Card>

          {/* ── Servidor ── */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Servidor *
              </CardTitle>
              <CardDescription className="text-xs">
                Digite o nome para buscar e selecionar o servidor — matrícula e posto preenchidos automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Autocomplete */}
              <div ref={autocompleteRef} className="relative">
                <Label className="text-xs font-medium mb-1.5 block">Nome do Servidor *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className={`pl-9 ${errors.servidorNome ? "border-destructive" : ""}`}
                    placeholder="Digite o nome do servidor..."
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      setValue("servidorNome", val, { shouldValidate: val.length >= 2 });
                      setShowSuggestions(val.length >= 2);
                    }}
                    onFocus={() => { if (searchQuery.length >= 2) setShowSuggestions(true); }}
                    autoComplete="off"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {errors.servidorNome && <p className="text-xs text-destructive mt-1">{errors.servidorNome.message}</p>}

                {/* Dropdown */}
                {showSuggestions && searchResults && searchResults.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto divide-y divide-border/40">
                      {searchResults.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors flex items-center justify-between gap-3"
                          onMouseDown={(e) => { e.preventDefault(); selectServidor(s); }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{s.nome}</p>
                            <p className="text-xs text-muted-foreground">{s.posto}</p>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
                            {s.matricula}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {showSuggestions && searchResults?.length === 0 && !isSearching && searchQuery.length >= 2 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-sm px-4 py-3 text-sm text-muted-foreground">
                    Nenhum servidor encontrado para "{searchQuery}"
                  </div>
                )}
              </div>

              {/* Matrícula + Posto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Matrícula *</Label>
                  <Input
                    {...register("matricula")}
                    placeholder="Preenchida automaticamente"
                    className={`font-mono ${errors.matricula ? "border-destructive" : ""}`}
                    readOnly
                  />
                  {errors.matricula && <p className="text-xs text-destructive mt-1">{errors.matricula.message}</p>}
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Posto / Graduação</Label>
                  <Input
                    {...register("posto")}
                    placeholder="Preenchido automaticamente"
                    readOnly
                    className="bg-muted/40 text-muted-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Data e Horários ── */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Data e Horários *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mini Calendário */}
              <div>
                <Label className="text-xs font-medium mb-2 block">Data * — clique no dia para selecionar</Label>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <DateCalendar
                      mes={launchWindow.mesRef}
                      ano={launchWindow.anoRef}
                      selectedDate={field.value}
                      onSelect={(dateBR) => {
                        field.onChange(dateBR);
                        setValue("date", dateBR, { shouldValidate: true });
                      }}
                      customHolidayDates={customHolidayDates}
                    />
                  )}
                />
                {/* Campo de texto auxiliar para digitar manualmente se necessário */}
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    {...register("date")}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    className={`max-w-[160px] text-sm ${errors.date ? "border-destructive" : ""}`}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "");
                      if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                      if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5);
                      val = val.slice(0, 10);
                      e.target.value = val;
                      register("date").onChange(e);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">ou digite manualmente</span>
                </div>
                {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
              </div>

              {/* Hora Início / Hora Fim */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Hora Início *</Label>
                  <Controller
                    name="startTime"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.startTime ? "border-destructive" : ""}>
                          <SelectValue placeholder="[HH:MM]" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {startSlots.map((t: string) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.startTime && <p className="text-xs text-destructive mt-1">{errors.startTime.message}</p>}
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Hora Fim *</Label>
                  <Controller
                    name="endTime"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.endTime ? "border-destructive" : ""}>
                          <SelectValue placeholder="[HH:MM]" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {endSlots.map((t: string) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.endTime && <p className="text-xs text-destructive mt-1">{errors.endTime.message}</p>}
                </div>
              </div>

              {/* Live duration */}
              {currentMinutes > 0 && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    Duração deste registro: <strong>{formatMinutes(currentMinutes)}</strong>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Função e Modalidade ── */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Função e Modalidade *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Função *</Label>
                  <Controller
                    name="funcao"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={errors.funcao ? "border-destructive" : ""}>
                          <SelectValue placeholder="Selecione a função" />
                        </SelectTrigger>
                        <SelectContent>
                          {FUNCOES.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.funcao && <p className="text-xs text-destructive mt-1">{errors.funcao.message}</p>}
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Modalidade</Label>
                  <div className="flex items-center h-10">
                    {watchModalidade ? (
                      <Badge
                        variant="outline"
                        className={`text-sm px-3 py-1 ${
                          watchModalidade === "Especial"
                            ? "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400"
                            : "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400"
                        }`}
                      >
                        {watchModalidade}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Automática pela data
                      </span>
                    )}
                    <input type="hidden" {...register("modalidade")} />
                  </div>
                  {watchModalidade && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {watchModalidade === "Especial"
                        ? "Sexta, sábado, domingo ou feriado"
                        : "Dia útil (segunda a quinta)"}
                    </p>
                  )}
                  {errors.modalidade && <p className="text-xs text-destructive mt-1">{errors.modalidade.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Setor e Projeto ── */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Setor e Projeto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DepartmentProjectFields control={control} register={register} />
            </CardContent>
          </Card>

          {/* ── Justificativa ── */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Justificativa *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                {...register("reason")}
                placeholder="Descreva o motivo da escala, atividade realizada ou observações relevantes..."
                rows={4}
                className={errors.reason ? "border-destructive" : ""}
              />
              {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason.message}</p>}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/horas")} className="px-6">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !launchWindow.isOpen || !dateInWindow} className="px-8 gap-2">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? "Salvar Alterações" : "Registrar Escala"}
            </Button>
          </div>
        </form>
      </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function DepartmentProjectFields({ control, register, errors }: any) {
  const { data: departments } = trpc.departments.list.useQuery();
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-xs font-medium mb-1.5 block">Setor *</Label>
        <Controller
          name="department"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <SelectTrigger className={errors?.department ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((d) => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors?.department && <p className="text-xs text-destructive mt-1">{errors.department.message}</p>}
      </div>
    </div>
  );
}
