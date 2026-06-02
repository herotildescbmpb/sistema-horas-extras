import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge, DayTypeBadge } from "@/components/StatusBadge";
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Filter,
  Calendar,
  Search,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function OvertimeList() {
  const utils = trpc.useUtils();
  const now = new Date();
  const [startDate, setStartDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  );
  const [endDate, setEndDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: records, isLoading } = trpc.overtime.list.useQuery({
    startDate,
    endDate,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const deleteMutation = trpc.overtime.delete.useMutation({
    onSuccess: () => {
      utils.overtime.list.invalidate();
      utils.reports.monthSummary.invalidate();
      toast.success("Registro excluído com sucesso");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao excluir registro");
      setDeleteId(null);
    },
  });

  const totalMinutes = records?.reduce((s, r) => s + r.totalMinutes, 0) ?? 0;
  const approvedMinutes = records?.filter((r) => r.status === "approved").reduce((s, r) => s + r.totalMinutes, 0) ?? 0;

  const clearFilters = () => {
    setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
    setEndDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`);
    setStatusFilter("all");
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas Horas Extras</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {records?.length ?? 0} registro{records?.length !== 1 ? "s" : ""} encontrado{records?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild className="gap-2 shadow-sm h-10">
          <Link href="/novo">
            <Plus className="w-4 h-4" />
            Novo Registro
          </Link>
        </Button>
      </div>

      {/* Summary bar */}
      {records && records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border border-border/60 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{formatMinutes(totalMinutes)}</p>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Aprovadas</p>
            <p className="text-lg font-bold text-emerald-600">{formatMinutes(approvedMinutes)}</p>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-lg font-bold text-amber-600">
              {records.filter((r) => r.status === "pending").length}
            </p>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Rejeitadas</p>
            <p className="text-lg font-bold text-red-600">
              {records.filter((r) => r.status === "rejected").length}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="shadow-sm border-border/60 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
              <span className="text-muted-foreground text-sm">até</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 h-9 text-xs">
              <X className="w-3.5 h-3.5" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : !records?.length ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Nenhum registro encontrado</p>
              <p className="text-xs text-muted-foreground mt-1 mb-5">
                Tente ajustar os filtros ou registre suas primeiras horas extras
              </p>
              <Button asChild size="sm" className="gap-2">
                <Link href="/novo">
                  <Plus className="w-3.5 h-3.5" />
                  Novo Registro
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors group"
                >
                  {/* Date icon */}
                  <div className="w-12 h-12 rounded-xl bg-primary/8 flex flex-col items-center justify-center flex-shrink-0 border border-primary/10">
                    <span className="text-[10px] font-bold text-primary/70 uppercase leading-none">
                      {format(new Date(record.date + "T12:00:00"), "MMM", { locale: ptBR })}
                    </span>
                    <span className="text-lg font-bold text-primary leading-none">
                      {format(new Date(record.date + "T12:00:00"), "dd")}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {(record as any).tipoEscala && (
                        <span className="text-xs font-bold text-foreground">{(record as any).tipoEscala}</span>
                      )}
                      <span className="text-sm font-semibold text-foreground">
                        {record.startTime} – {record.endTime}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-sm font-semibold text-primary">
                        {formatMinutes(record.totalMinutes)}
                      </span>
                      <DayTypeBadge type={record.dayType} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(record as any).funcao && (
                        <span className="text-xs text-muted-foreground">{(record as any).funcao}</span>
                      )}
                      {(record as any).modalidade && (
                        <>
                          {(record as any).funcao && <span className="text-muted-foreground/40">·</span>}
                          <span className="text-xs font-medium text-muted-foreground">{(record as any).modalidade}</span>
                        </>
                      )}
                      {record.project && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground">{record.project}</span>
                        </>
                      )}
                      {record.department && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground">{record.department}</span>
                        </>
                      )}
                      {record.reason && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground truncate max-w-48">{record.reason}</span>
                        </>
                      )}
                    </div>
                    {record.reviewNote && record.status === "rejected" && (
                      <p className="text-xs text-destructive mt-1 font-medium">
                        Motivo: {record.reviewNote}
                      </p>
                    )}
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={record.status} />
                    {record.status === "pending" && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          asChild
                        >
                          <Link href={`/horas/${record.id}/editar`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(record.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de horas extras? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
