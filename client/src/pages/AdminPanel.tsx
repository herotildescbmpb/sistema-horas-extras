import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, DayTypeBadge } from "@/components/StatusBadge";
import {
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  X,
  Shield,
  Clock,
  Users,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function AdminPanel() {
  const utils = trpc.useUtils();
  const now = new Date();
  const [startDate, setStartDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  );
  const [endDate, setEndDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`
  );
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [reviewDialog, setReviewDialog] = useState<{
    id: number;
    action: "approved" | "rejected";
    userName: string;
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data: users } = trpc.users.list.useQuery();

  const { data: records, isLoading } = trpc.overtime.listAll.useQuery({
    startDate,
    endDate,
    status: statusFilter !== "all" ? statusFilter : undefined,
    userId: userFilter !== "all" ? parseInt(userFilter) : undefined,
  });

  const reviewMutation = trpc.overtime.review.useMutation({
    onSuccess: () => {
      utils.overtime.listAll.invalidate();
      utils.reports.adminMonthSummary.invalidate();
      toast.success(
        reviewDialog?.action === "approved" ? "Horas extras aprovadas!" : "Registro rejeitado."
      );
      setReviewDialog(null);
      setReviewNote("");
    },
    onError: (err) => toast.error(err.message || "Erro ao processar revisão"),
  });

  const pendingCount = records?.filter((r) => r.status === "pending").length ?? 0;
  const totalMinutes = records?.reduce((s, r) => s + r.totalMinutes, 0) ?? 0;

  const clearFilters = () => {
    setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
    setEndDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`);
    setStatusFilter("pending");
    setUserFilter("all");
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie e aprove as horas extras de todos os funcionários
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-xl font-bold text-foreground">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Horas</p>
              <p className="text-xl font-bold text-foreground">{formatMinutes(totalMinutes)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Registros</p>
              <p className="text-xl font-bold text-foreground">{records?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-border/60 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
              <span className="text-muted-foreground text-sm flex-shrink-0">até</span>
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
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-9 w-full sm:w-48 text-sm">
                <SelectValue placeholder="Funcionário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funcionários</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name ?? u.email ?? `Usuário #${u.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 h-9 text-xs">
              <X className="w-3.5 h-3.5" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records table */}
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
                <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Nenhum registro encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros para ver outros registros</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  {/* Employee */}
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {getInitials(record.userName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-foreground">
                        {record.userName ?? "Funcionário"}
                      </span>
                      {record.userDepartment && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                          {record.userDepartment}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(record.date + "T12:00:00"), "dd/MM/yyyy")}
                      </span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-xs text-foreground font-medium">
                        {record.startTime} – {record.endTime} ({formatMinutes(record.totalMinutes)})
                      </span>
                      <DayTypeBadge type={record.dayType} />
                      {record.project && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground">{record.project}</span>
                        </>
                      )}
                    </div>
                    {record.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">{record.reason}</p>
                    )}
                    {record.reviewNote && record.status !== "pending" && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">Nota: {record.reviewNote}</p>
                    )}
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={record.status} />
                    {record.status === "pending" && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() =>
                            setReviewDialog({
                              id: record.id,
                              action: "approved",
                              userName: record.userName ?? "Funcionário",
                            })
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                          onClick={() =>
                            setReviewDialog({
                              id: record.id,
                              action: "rejected",
                              userName: record.userName ?? "Funcionário",
                            })
                          }
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rejeitar
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

      {/* Review dialog */}
      <Dialog open={reviewDialog !== null} onOpenChange={(open) => !open && setReviewDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === "approved" ? "Aprovar Horas Extras" : "Rejeitar Horas Extras"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog?.action === "approved"
                ? `Confirmar aprovação das horas extras de ${reviewDialog?.userName}?`
                : `Informe o motivo da rejeição para ${reviewDialog?.userName}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder={
                reviewDialog?.action === "approved"
                  ? "Observação opcional..."
                  : "Motivo da rejeição (obrigatório)..."
              }
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setReviewDialog(null); setReviewNote(""); }}>
              Cancelar
            </Button>
            <Button
              className={
                reviewDialog?.action === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              }
              disabled={reviewMutation.isPending || (reviewDialog?.action === "rejected" && !reviewNote.trim())}
              onClick={() => {
                if (!reviewDialog) return;
                reviewMutation.mutate({
                  id: reviewDialog.id,
                  status: reviewDialog.action,
                  reviewNote: reviewNote || undefined,
                });
              }}
            >
              {reviewMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : reviewDialog?.action === "approved" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Confirmar Aprovação
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Confirmar Rejeição
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
