import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, DayTypeBadge } from "@/components/StatusBadge";
import {
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Calendar,
  DollarSign,
  Users,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatCurrency(minutes: number, rate: number) {
  const hours = minutes / 60;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(hours * rate);
}

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  const isAdmin = user?.role === "admin";
  const hourlyRate = parseFloat(user?.hourlyRate ?? "0") || 0;

  const { data: summary, isLoading: loadingSummary } = trpc.reports.monthSummary.useQuery(
    { year, month },
    { enabled: !isAdmin }
  );

  const { data: adminSummary, isLoading: loadingAdmin } = trpc.reports.adminMonthSummary.useQuery(
    { year, month },
    { enabled: isAdmin }
  );

  const { data: recentRecords, isLoading: loadingRecords } = trpc.overtime.list.useQuery({
    startDate: `${year}-${String(month).padStart(2, "0")}-01`,
    endDate: `${year}-${String(month).padStart(2, "0")}-31`,
  });

  const monthName = format(new Date(year, month - 1), "MMMM 'de' yyyy", { locale: ptBR });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const isLoading = isAdmin ? loadingAdmin : loadingSummary;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {user?.name?.split(" ")[0] ?? "Usuário"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumo de {capitalizedMonth}
          </p>
        </div>
        <Button asChild className="gap-2 shadow-sm h-10">
          <Link href="/novo">
            <Plus className="w-4 h-4" />
            Registrar Horas Extras
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Total de Horas (Mês)"
            value={loadingAdmin ? null : formatMinutes(adminSummary?.totalMinutes ?? 0)}
            icon={Clock}
            iconColor="text-primary"
            iconBg="bg-primary/10"
            loading={loadingAdmin}
          />
          <StatCard
            title="Aguardando Aprovação"
            value={loadingAdmin ? null : String(adminSummary?.pendingCount ?? 0)}
            icon={AlertCircle}
            iconColor="text-amber-600"
            iconBg="bg-amber-50 dark:bg-amber-950/30"
            loading={loadingAdmin}
            suffix="registros"
          />
          <StatCard
            title="Servidores Ativos"
            value={loadingAdmin ? null : String(adminSummary?.employeeCount ?? 0)}
            icon={Users}
            iconColor="text-blue-600"
            iconBg="bg-blue-50 dark:bg-blue-950/30"
            loading={loadingAdmin}
            suffix="este mês"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total de Horas"
            value={loadingSummary ? null : formatMinutes(summary?.totalMinutes ?? 0)}
            icon={Clock}
            iconColor="text-primary"
            iconBg="bg-primary/10"
            loading={loadingSummary}
          />
          <StatCard
            title="Horas Aprovadas"
            value={loadingSummary ? null : formatMinutes(summary?.approvedMinutes ?? 0)}
            icon={CheckCircle2}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50 dark:bg-emerald-950/30"
            loading={loadingSummary}
          />
          <StatCard
            title="Pendentes"
            value={loadingSummary ? null : String(summary?.pendingCount ?? 0)}
            icon={AlertCircle}
            iconColor="text-amber-600"
            iconBg="bg-amber-50 dark:bg-amber-950/30"
            loading={loadingSummary}
            suffix="registros"
          />
          {hourlyRate > 0 && (
            <StatCard
              title="Valor Estimado"
              value={loadingSummary ? null : formatCurrency(summary?.approvedMinutes ?? 0, hourlyRate * 1.5)}
              icon={DollarSign}
              iconColor="text-green-600"
              iconBg="bg-green-50 dark:bg-green-950/30"
              loading={loadingSummary}
              subtitle="horas aprovadas"
            />
          )}
        </div>
      )}

      {/* Recent records */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Registros Recentes</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground gap-1">
                <Link href="/horas">
                  Ver todos
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRecords ? (
                <div className="px-6 pb-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : !recentRecords?.length ? (
                <div className="px-6 pb-8 pt-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Nenhum registro este mês</p>
                  <p className="text-xs text-muted-foreground mt-1">Comece registrando suas horas extras</p>
                  <Button asChild size="sm" className="mt-4 gap-2">
                    <Link href="/novo">
                      <Plus className="w-3.5 h-3.5" />
                      Novo Registro
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentRecords.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {format(new Date(record.date + "T12:00:00"), "dd/MM/yyyy")}
                          </span>
                          <DayTypeBadge type={record.dayType} />
                        </div>
                        {(record.nomeServidor || record.servidor) && (
                          <p className="text-xs font-medium text-foreground/70 mt-0.5">
                            {record.nomeServidor || record.servidor}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {record.startTime} – {record.endTime} · {formatMinutes(record.totalMinutes)}
                          {record.project && ` · ${record.project}`}
                        </p>
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start gap-3 h-10 text-sm">
                <Link href="/novo">
                  <Plus className="w-4 h-4 text-primary" />
                  Novo Registro
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-3 h-10 text-sm">
                <Link href="/horas">
                  <Clock className="w-4 h-4 text-primary" />
                  Meus Registros
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-3 h-10 text-sm">
                <Link href="/relatorios">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Relatórios
                </Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="outline" className="w-full justify-start gap-3 h-10 text-sm border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30">
                  <Link href="/admin">
                    <AlertCircle className="w-4 h-4" />
                    Aprovar Pendentes
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Month progress */}
          {!isAdmin && (
            <Card className="shadow-sm border-border/60 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Progresso do Mês</span>
                </div>
                {loadingSummary ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>Horas aprovadas</span>
                      <span className="font-semibold text-foreground">
                        {formatMinutes(summary?.approvedMinutes ?? 0)} / {formatMinutes(summary?.totalMinutes ?? 0)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{
                          width: summary?.totalMinutes
                            ? `${Math.min(100, ((summary.approvedMinutes ?? 0) / summary.totalMinutes) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  loading,
  suffix,
  subtitle,
}: {
  title: string;
  value: string | null;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  loading?: boolean;
  suffix?: string;
  subtitle?: string;
}) {
  return (
    <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{value}</span>
                {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
              </div>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
