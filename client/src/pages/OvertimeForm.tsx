import { trpc } from "@/lib/trpc";
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
import { ArrowLeft, Clock, Save, Loader2, Info } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";

const schema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Hora de início é obrigatória"),
  endTime: z.string().min(1, "Hora de fim é obrigatória"),
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

function calcMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
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
      dayType: "weekday",
    },
  });

  useEffect(() => {
    if (existingRecord) {
      reset({
        date: existingRecord.date,
        startTime: existingRecord.startTime,
        endTime: existingRecord.endTime,
        dayType: existingRecord.dayType,
        reason: existingRecord.reason ?? "",
        project: existingRecord.project ?? "",
        department: existingRecord.department ?? "",
      });
    }
  }, [existingRecord, reset]);

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
      toast.success("Horas extras registradas com sucesso!");
      navigate("/horas");
    },
    onError: (err) => toast.error(err.message || "Erro ao registrar horas extras"),
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
            {isEdit ? "Editar Registro" : "Novo Registro de Horas Extras"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Atualize as informações do registro" : "Preencha os dados das horas extras realizadas"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Date & Time */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Data e Horário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs font-medium">Data *</Label>
                <Input id="date" type="date" {...register("date")} className="h-10" />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-xs font-medium">Hora Início *</Label>
                <Input id="startTime" type="time" {...register("startTime")} className="h-10" />
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
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

        {/* Type & Classification */}
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

        {/* Reason */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Justificativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-medium">Motivo / Descrição</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo das horas extras realizadas..."
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
            className="gap-2 min-w-32"
          >
            {(isSubmitting || createMutation.isPending || updateMutation.isPending) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEdit ? "Salvar Alterações" : "Registrar Horas"}
          </Button>
        </div>
      </form>
    </div>
  );
}
