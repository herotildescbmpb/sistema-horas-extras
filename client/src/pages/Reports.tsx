import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, DayTypeBadge } from "@/components/StatusBadge";
import {
  BarChart3,
  Download,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
  Star,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const PRESET_RANGES = [
  {
    label: "Este mês",
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  },
  {
    label: "Mês passado",
    start: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
    end: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
  },
  {
    label: "Esta semana",
    start: format(startOfWeek(new Date(), { locale: ptBR }), "yyyy-MM-dd"),
    end: format(endOfWeek(new Date(), { locale: ptBR }), "yyyy-MM-dd"),
  },
  {
    label: "Últimos 3 meses",
    start: format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  },
];

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedServidor, setSelectedServidor] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const { data: servidoresList } = trpc.reports.listServidores.useQuery(
    {
      startDate,
      endDate,
      department: selectedDepartment !== "all" ? selectedDepartment : undefined,
    },
    { enabled: isAdmin }
  );
  const { data: departments } = trpc.departments.list.useQuery();

  const { data: records, isLoading } = isAdmin
    ? trpc.overtime.listAll.useQuery({
        startDate,
        endDate,
        servidor: selectedServidor !== "all" ? selectedServidor : undefined,
        department: selectedDepartment !== "all" ? selectedDepartment : undefined,
      })
    : trpc.overtime.list.useQuery({ startDate, endDate });

  const { refetch: fetchCsv } = trpc.reports.exportCsv.useQuery(
    {
      startDate,
      endDate,
    },
    { enabled: false }
  );

  const { refetch: fetchCsvDal } = trpc.reports.exportCsvDal.useQuery(
    {
      startDate,
      endDate,
      servidor: isAdmin && selectedServidor !== "all" ? selectedServidor : undefined,
      department: isAdmin && selectedDepartment !== "all" ? selectedDepartment : undefined,
    },
    { enabled: false }
  );

  const [exportingDal, setExportingDal] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await fetchCsv();
      if (!result.data?.csv) {
        toast.error("Nenhum dado para exportar");
        return;
      }
      const blob = new Blob(["\uFEFF" + result.data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `horas-extras-${startDate}-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${result.data.count} registros exportados`);
    } catch {
      toast.error("Erro ao exportar relatório");
    } finally {
      setExporting(false);
    }
  };

  const handleExportDal = async () => {
    setExportingDal(true);
    try {
      const result = await fetchCsvDal();
      if (!result.data?.csv) {
        toast.error("Nenhum dado para exportar");
        return;
      }
      // BOM UTF-8 (﻿) garante que o Excel abra o arquivo com encoding correto
      const blob = new Blob(["﻿" + result.data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `escalas_dal_${startDate}_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${result.data.count} registros exportados no formato DAL`);
    } catch {
      toast.error("Erro ao exportar relatório DAL");
    } finally {
      setExportingDal(false);
    }
  };

  // Stats
  const totalMinutes = records?.reduce((s, r) => s + r.totalMinutes, 0) ?? 0;
  const approvedMinutes = records?.filter((r) => r.status === "approved").reduce((s, r) => s + r.totalMinutes, 0) ?? 0;
  const pendingCount = records?.filter((r) => r.status === "pending").length ?? 0;

  // Chart data by tipo de serviço (modalidade: Especial vs Extraordinário)
  const byModalidade: Record<string, number> = {};
  records?.forEach((r) => {
    const key = (r as any).modalidade || "Não informado";
    byModalidade[key] = (byModalidade[key] ?? 0) + r.totalMinutes;
  });

  const MODALIDADE_COLORS: Record<string, string> = {
    "Especial": "#f59e0b",
    "Extraordinário": "#3b82f6",
  };
  const DEFAULT_COLORS = ["#10b981", "#6366f1", "#ef4444", "#8b5cf6"];

  const chartData = Object.entries(byModalidade)
    .map(([name, minutes], i) => ({
      name,
      horas: parseFloat((minutes / 60).toFixed(2)),
      fill: MODALIDADE_COLORS[name] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }))
    .filter((d) => d.horas > 0)
    .sort((a, b) => b.horas - a.horas);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Análise e exportação de horas extras
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportDal}
            disabled={exportingDal || !records?.length}
            variant="outline"
            className="gap-2 shadow-sm h-10"
          >
            {exportingDal ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Exportar CSV (DAL)
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || !records?.length}
            className="gap-2 shadow-sm h-10"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-border/60 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Período do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESET_RANGES.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setStartDate(preset.start);
                  setEndDate(preset.end);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Data início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Data fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            {isAdmin && (
              <div className="space-y-1">
                <Label className="text-xs">Servidor</Label>
                <Select value={selectedServidor} onValueChange={setSelectedServidor}>
                  <SelectTrigger className="h-9 w-full sm:w-52 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os servidores</SelectItem>
                    {servidoresList?.map((s) => (
                      <SelectItem key={s.matricula} value={s.matricula}>
                        {s.nome ? `${s.matricula} — ${s.nome}` : s.matricula}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isAdmin && (
              <div className="space-y-1">
                <Label className="text-xs">Setor</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-9 w-full sm:w-52 text-sm">
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.shortName ? `${d.shortName} — ${d.name}` : d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="shadow-sm border-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Horas</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-xl font-bold text-foreground">{formatMinutes(totalMinutes)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horas Aprovadas</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-xl font-bold text-emerald-600">{formatMinutes(approvedMinutes)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Registros</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <p className="text-xl font-bold text-foreground">
                    {records?.length ?? 0}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      ({pendingCount} pendente{pendingCount !== 1 ? "s" : ""})
                    </span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Horas Especiais */}
        <Card className="shadow-sm border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/10">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horas Especiais</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {formatMinutes(byModalidade["Especial"] ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {records?.filter((r) => (r as any).modalidade === "Especial").length ?? 0} registro{(records?.filter((r) => (r as any).modalidade === "Especial").length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Horas Extraordinárias */}
        <Card className="shadow-sm border-blue-200/60 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/10">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horas Extraordinárias</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                ) : (
                  <>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatMinutes(byModalidade["Extraordinário"] ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {records?.filter((r) => (r as any).modalidade === "Extraordinário").length ?? 0} registro{(records?.filter((r) => (r as any).modalidade === "Extraordinário").length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        {chartData.length > 0 && (
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Horas por Tipo de Serviço</CardTitle>
              <CardDescription className="text-xs">Especial vs. Extraordinário no período</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(v) => [`${v}h`, "Horas"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      color: "#0f172a",
                    }}
                  />
                  <Bar dataKey="horas" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Records list */}
        <div className={chartData.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Registros do Período
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {records?.length ?? 0} registro{records?.length !== 1 ? "s" : ""} encontrado{records?.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="px-6 pb-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : !records?.length ? (
                <div className="py-12 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">Nenhum registro no período</p>
                  <p className="text-xs text-muted-foreground mt-1">Ajuste o período ou os filtros</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                  {records.map((record) => (
                    <div key={record.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isAdmin && (
                            <span className="text-xs font-semibold text-foreground">
                              {(record as any).nomeServidor ?? (record as any).servidor ?? "Servidor"}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(record.date + "T12:00:00"), "dd/MM/yyyy")}
                          </span>
                          <span className="text-xs font-medium text-foreground">
                            {record.startTime}–{record.endTime} ({formatMinutes(record.totalMinutes)})
                          </span>
                          <DayTypeBadge type={record.dayType} />
                        </div>
                        {record.project && (
                          <p className="text-xs text-muted-foreground mt-0.5">{record.project}</p>
                        )}
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
