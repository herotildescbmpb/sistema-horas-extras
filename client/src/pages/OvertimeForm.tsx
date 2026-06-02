import { trpc } from "@/lib/trpc";
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
import AppLayout from "@/components/AppLayout";

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

// Time slots from 13:00 to 23:50 every 10 min
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  let h = 13, m = 0;
  while (h * 60 + m <= 23 * 60 + 50) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 10;
    if (m >= 60) { h++; m -= 60; }
  }
  return slots;
}
const TIME_SLOTS = generateTimeSlots();

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
  [1,1],[4,21],[5,1],[9,7],[10,12],[11,2],[11,15],[12,25],
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

function getModalidade(dateStr: string): "Especial" | "Extraordinário" | "" {
  const date = parseDateBR(dateStr);
  if (!date) return "";
  const dow = date.getDay();
  return (dow === 5 || dow === 6 || dow === 0 || isBrazilianHoliday(date))
    ? "Especial" : "Extraordinário";
}

function getDayType(dateStr: string): "weekday" | "saturday" | "sunday_holiday" {
  const date = parseDateBR(dateStr);
  if (!date) return "weekday";
  const dow = date.getDay();
  if (dow === 6) return "saturday";
  if (dow === 0 || isBrazilianHoliday(date)) return "sunday_holiday";
  return "weekday";
}

function calcMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  let e = eh * 60 + em;
  if (e <= s) e += 24 * 60;
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
  startTime: z.string().min(1, "Hora início obrigatória"),
  endTime: z.string().min(1, "Hora fim obrigatória"),
  funcao: z.string().min(1, "Função obrigatória"),
  modalidade: z.string().min(1, "Modalidade obrigatória"),
  reason: z.string().min(1, "Justificativa obrigatória"),
  department: z.string().min(1, "Setor obrigatório"),
  project: z.string().optional(),
});

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
      date: "", startTime: "", endTime: "", funcao: "", modalidade: "",
      reason: "", department: "", project: "",
    },
  });

  const watchDate = watch("date");
  const watchStart = watch("startTime");
  const watchEnd = watch("endTime");
  const watchModalidade = watch("modalidade");

  // Auto-set modalidade when date changes
  useEffect(() => {
    if (watchDate?.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      setValue("modalidade", getModalidade(watchDate), { shouldValidate: true });
    }
  }, [watchDate, setValue]);

  // Current record duration
  const currentMinutes = useMemo(() => calcMinutes(watchStart, watchEnd), [watchStart, watchEnd]);

  // Month total query
  const dateObj = parseDateBR(watchDate);
  const qYear = dateObj?.getFullYear() ?? new Date().getFullYear();
  const qMonth = dateObj ? dateObj.getMonth() + 1 : new Date().getMonth() + 1;
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
        project: existingRecord.project ?? "",
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
    const dayType = getDayType(data.date);
    const totalMinutes = calcMinutes(data.startTime, data.endTime);
    const payload = {
      tipoEscala: data.tipoEscala,
      servidor: data.matricula,
      date: isoDate,
      startTime: data.startTime,
      endTime: data.endTime,
      funcao: data.funcao,
      modalidade: data.modalidade,
      dayType,
      totalMinutes,
      reason: data.reason,
      department: data.department && data.department !== "none" ? data.department : undefined,
      project: data.project || undefined,
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

  return (
    <AppLayout>
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
              {/* Data */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Data *</Label>
                <Input
                  {...register("date")}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  className={`max-w-[200px] ${errors.date ? "border-destructive" : ""}`}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "");
                    if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                    if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5);
                    val = val.slice(0, 10);
                    e.target.value = val;
                    register("date").onChange(e);
                  }}
                />
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
                          {TIME_SLOTS.map((t) => (
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
                          {TIME_SLOTS.map((t) => (
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
            <Button type="submit" disabled={isPending} className="px-8 gap-2">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? "Salvar Alterações" : "Registrar Escala"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
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
      <div>
        <Label className="text-xs font-medium mb-1.5 block">Projeto</Label>
        <Input {...register("project")} placeholder="Ex: Projeto Alpha" />
      </div>
    </div>
  );
}
