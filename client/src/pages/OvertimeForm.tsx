import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Clock, Save, Loader2, Info, User, Tag, FileText } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useEffect } from "react";

const schema = z.object({
  // Campos do CSV de escalas
  tipoEscala: z.string().optional(),
  date: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().optional(),
  startTime: z.string().min(1, "Hora de início é obrigatória"),
  endTime: z.string().min(1, "Hora de fim é obrigatória"),
  funcao: z.string().optional(),
  modalidade: z.string().optional(),
  // Campos complementares
  dayType: z.enum(["weekday", "saturday", "sunday_holiday"]),
  reason: z.string().optional(),
  project: z.string().optional(),
  department: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const dayTypeLabels = {
  weekday: { label: "Dia Útil", multiplier: "1,5×", color: "text-blue-600" },
  saturday: { label: "Sábado", multiplier: "2,0×", color: "text-purple-600" },
  sunday_holiday: { label: "Domingo / Feriado", multiplier: "2,0×", color: "text-orange-600" },
};

const TIPO_ESCALA_OPTIONS = [
  "Expediente",
  "Plantão",
  "Sobreaviso",
  "Hora Extra",
  "Trabalho Noturno",
  "Outro",
];

const MODALIDADE_OPTIONS = [
  "Especial",
  "Normal",
  "Remoto",
  "Presencial",
  "Híbrido",
];

function calcMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startTotal = sh * 60 + (sm || 0);
  let endTotal = eh * 60 + (em || 0);
  if (endTotal <= startTotal) endTotal += 24 * 60;
  return endTotal - startTotal;
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface OvertimeFormProps {
  editId?: number;
}

export default function OvertimeForm({ editId }: OvertimeFormProps) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isEdit = !!editId;

  const { data: departments } = trpc.departments.list.useQuery();

  const { data: existingRecord, isLoading: loadingRecord } = trpc.overtime.list.useQuery(
    {},
    { enabled: isEdit, select: (data) => data.find((r) => r.id === editId) }
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      dayType: "weekday",
      tipoEscala: "Expediente",
      modalidade: "Especial",
      funcao: (user as any)?.position ?? "",
    },
  });

  useEffect(() => {
    if (existingRecord) {
      reset({
        tipoEscala: (existingRecord as any).tipoEscala ?? "Expediente",
        date: existingRecord.date,
        endDate: (existingRecord as any).endDate ?? existingRecord.date,
        startTime: existingRecord.startTime,
        endTime: existingRecord.endTime,
        funcao: (existingRecord as any).funcao ?? "",
        modalidade: (existingRecord as any).modalidade ?? "Especial",
        dayType: existingRecord.dayType,
        reason: existingRecord.reason ?? "",
        project: existingRecord.project ?? "",
        department: existingRecord.department ?? "",
      });
    }
  }, [existingRecord, reset]);

  // Auto-fill funcao from user profile
  useEffect(() => {
    if (!isEdit && user && (user as any).position) {
      setValue("funcao", (user as any).position);
    }
  }, [user, isEdit, setValue]);

  const startTime = watch("startTime");
  const endTime = watch("endTime");
  const dayType = watch("dayType");
  const totalMinutes = calcMinutes(startTime, endTime);
  const multiplier = dayType === "weekday" ? 1.5 : 2.0;
  const effectiveHours = (totalMinutes / 60) * multiplier;

  const createMutation = trpc.overtime.create.useMutation({
    onSuccess: () => {
      utils.overtime.list.invalidate();
      utils.reports.monthSummary.invalidate();
      toast.success("Escala registrada com sucesso!");
      navigate("/horas");
    },
    onError: (err) => toast.error(err.message || "Erro ao registrar escala"),
  });

  const updateMutation = trpc.overtime.update.useMutation({
    onSuccess: () => {
      utils.overtime.list.invalidate();
      utils.reports.monthSummary.invalidate();
      toast.success("Registro atualizado com sucesso!");
      navigate("/horas");
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar registro"),
  });

  const onSubmit = (data: FormData) => {
    if (isEdit && editId) {
      updateMutation.mutate({ id: editId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isEdit && loadingRecord) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userMatricula = (user as any)?.matricula;

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild className="h-9 w-9">
          <Link href="/horas">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isEdit ? "Editar Registro" : "Novo Registro de Escala / Horas Extras"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Atualize as informações do registro" : "Preencha os dados conforme a escala realizada"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Servidor info (read-only) */}
        {userMatricula && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/40 border border-border/50">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              Servidor: <span className="font-semibold text-foreground">{userMatricula}</span>
              {user?.name && <> — {user.name}</>}
            </span>
          </div>
        )}

        {/* Tipo de Escala e Modalidade */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Tipo de Escala
            </CardTitle>
            <CardDescription className="text-xs">Classificação da escala conforme o sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo de Escala</Label>
                <Select
                  value={watch("tipoEscala") ?? ""}
                  onValueChange={(v) => setValue("tipoEscala", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_ESCALA_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Modalidade</Label>
                <Select
                  value={watch("modalidade") ?? ""}
                  onValueChange={(v) => setValue("modalidade", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALIDADE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="funcao" className="text-xs font-medium">Função</Label>
              <Input
                id="funcao"
                placeholder="Ex: Auxiliar Administrativo, Analista"
                {...register("funcao")}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Preenchida automaticamente com o cargo do perfil
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data e Horário */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Data e Horário
            </CardTitle>
            <CardDescription className="text-xs">
              Período da escala — Data Início, Hora Início, Data Final e Hora Fim
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs font-medium">Data Início *</Label>
                <Input id="date" type="date" {...register("date")} className="h-10" />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-xs font-medium">Hora Início *</Label>
                <Input id="startTime" type="time" {...register("startTime")} className="h-10" />
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-medium">Data Final</Label>
                <Input id="endDate" type="date" {...register("endDate")} className="h-10" />
                <p className="text-xs text-muted-foreground">Deixe igual à data início se for no mesmo dia</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="text-xs font-medium">Hora Fim *</Label>
                <Input id="endTime" type="time" {...register("endTime")} className="h-10" />
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
              </div>
            </div>

            {/* Time summary */}
            {totalMinutes > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Info className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-xs text-foreground">
                  <span className="font-semibold">{formatMinutes(totalMinutes)}</span> de horas extras ·{" "}
                  <span className="font-semibold">{effectiveHours.toFixed(2)}h</span> efetivas (multiplicador{" "}
                  <span className={`font-semibold ${dayTypeLabels[dayType]?.color}`}>
                    {dayTypeLabels[dayType]?.multiplier}
                  </span>
                  )
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classificação */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Classificação</CardTitle>
            <CardDescription className="text-xs">Tipo de dia e setor responsável</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo de Dia *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.entries(dayTypeLabels) as [keyof typeof dayTypeLabels, typeof dayTypeLabels[keyof typeof dayTypeLabels]][]).map(([value, info]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("dayType", value)}
                    className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all ${
                      dayType === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-xs font-semibold text-foreground">{info.label}</span>
                    <span className={`text-xs font-bold ${info.color}`}>{info.multiplier}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="project" className="text-xs font-medium">Projeto / Atividade</Label>
                <Input id="project" placeholder="Ex: Projeto Alpha" {...register("project")} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs font-medium">Setor</Label>
                {departments && departments.length > 0 ? (
                  <Select
                    value={watch("department") ?? ""}
                    onValueChange={(v) => setValue("department", v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id="department" placeholder="Ex: TI, RH, Financeiro" {...register("department")} className="h-10" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Justificativa */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Justificativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-medium">Motivo / Descrição</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo da escala ou horas extras realizadas..."
                rows={3}
                {...register("reason")}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/horas">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            className="gap-2 min-w-36"
          >
            {(isSubmitting || createMutation.isPending || updateMutation.isPending) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEdit ? "Salvar Alterações" : "Registrar Escala"}
          </Button>
        </div>
      </form>
    </div>
  );
}
