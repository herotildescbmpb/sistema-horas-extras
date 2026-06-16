import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Pencil, Trash2, Search, Filter, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  approved: "bg-green-500/10 text-green-600 border-green-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function minutesToHours(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

type OvertimeRecord = {
  id: number;
  servidor: string | null;
  nomeServidor: string | null;
  date: string;
  startTime: string;
  endTime: string;
  totalMinutes: number;
  dayType: string;
  modalidade: string | null;
  tipoEscala: string | null;
  funcao: string | null;
  department: string | null;
  status: string;
  reason: string | null;
  reviewNote: string | null;
  userName: string | null;
};

export default function AdminEscalas() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-31`;
  });
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const [editRecord, setEditRecord] = useState<OvertimeRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<OvertimeRecord & { reviewNote: string }>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: departments = [] } = trpc.departments.list.useQuery();

  const { data, refetch, isLoading } = trpc.overtime.listPaginated.useQuery({
    startDate,
    endDate,
    status: statusFilter !== "all" ? statusFilter : undefined,
    department: departmentFilter !== "all" ? departmentFilter : undefined,
    search: search.trim() || undefined,
    page,
    pageSize,
  });

  const records: OvertimeRecord[] = (data?.records ?? []) as OvertimeRecord[];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const adminUpdateMutation = trpc.overtime.adminUpdate.useMutation({
    onSuccess: () => {
      toast.success("Registro atualizado com sucesso.");
      setEditRecord(null);
      refetch();
    },
    onError: (e) => toast.error("Erro ao atualizar registro", { description: e.message }),
  });

  const deleteMutation = trpc.overtime.delete.useMutation({
    onSuccess: () => {
      toast.success("Registro excluído.");
      setDeleteId(null);
      refetch();
    },
    onError: (e) => toast.error("Erro ao excluir registro", { description: e.message }),
  });

  const reviewMutation = trpc.overtime.review.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.status === "approved" ? "Registro aprovado." : "Registro rejeitado.");
      refetch();
    },
    onError: (e) => toast.error("Erro ao revisar registro", { description: e.message }),
  });

  function openEdit(r: OvertimeRecord) {
    setEditRecord(r);
    setEditForm({
      startTime: r.startTime,
      endTime: r.endTime,
      reason: r.reason ?? undefined,
      tipoEscala: r.tipoEscala ?? undefined,
      funcao: r.funcao ?? undefined,
      modalidade: r.modalidade ?? undefined,
      department: r.department ?? undefined,
      status: r.status as any,
      reviewNote: r.reviewNote ?? undefined,
    });
  }

  function handleSaveEdit() {
    if (!editRecord) return;
    adminUpdateMutation.mutate({
      id: editRecord.id,
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      reason: editForm.reason ?? undefined,
      tipoEscala: editForm.tipoEscala ?? undefined,
      funcao: editForm.funcao ?? undefined,
      modalidade: editForm.modalidade ?? undefined,
      department: editForm.department ?? undefined,
      status: editForm.status as any,
      reviewNote: editForm.reviewNote,
    });
  }

  const totalHours = useMemo(
    () => records.reduce((s, r) => s + r.totalMinutes, 0),
    [records]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel de Escalas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualize, edite e gerencie todos os registros de horas extras.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total no período</p>
          <p className="text-2xl font-bold text-primary">{minutesToHours(totalHours)}</p>
          <p className="text-xs text-muted-foreground">{totalCount} registros</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <div className="flex gap-2">
              <div>
                <Label className="text-xs">De</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="h-8 text-sm w-36"
                />
              </div>
              <div>
                <Label className="text-xs">Até</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="h-8 text-sm w-36"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-sm w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Setor</Label>
              <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-sm w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.shortName ?? d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-40">
              <Label className="text-xs">Busca</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, matrícula..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="h-8 text-sm pl-7"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Servidor</th>
                <th className="text-left px-4 py-2 font-medium">Data</th>
                <th className="text-left px-4 py-2 font-medium">Horário</th>
                <th className="text-left px-4 py-2 font-medium">Horas</th>
                <th className="text-left px-4 py-2 font-medium">Tipo</th>
                <th className="text-left px-4 py-2 font-medium">Setor</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2">
                      <p className="font-medium">{r.nomeServidor ?? r.servidor ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">{r.servidor}</p>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">
                      {r.startTime}–{r.endTime}
                    </td>
                    <td className="px-4 py-2 font-semibold">{minutesToHours(r.totalMinutes)}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-0.5">
                        {r.modalidade && (
                          <Badge variant="outline" className="text-xs w-fit">{r.modalidade}</Badge>
                        )}
                        {r.dayType && (
                          <span className="text-xs text-muted-foreground">
                            {r.dayType === "weekday" ? "Dia Útil" : r.dayType === "saturday" ? "Sábado" : "Dom/Feriado"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.department ?? "-"}</td>
                    <td className="px-4 py-2">
                      <Badge className={`text-xs border ${STATUS_COLORS[r.status] ?? ""}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-end">
                        {r.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              title="Aprovar"
                              onClick={() => reviewMutation.mutate({ id: r.id, status: "approved" })}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:text-red-700"
                              title="Rejeitar"
                              onClick={() => reviewMutation.mutate({ id: r.id, status: "rejected" })}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-yellow-600 hover:text-yellow-700"
                            title="Marcar como pendente"
                            onClick={() => reviewMutation.mutate({ id: r.id, status: "rejected" })}
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Editar"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Excluir"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages} ({totalCount} registros)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹ Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima ›
            </Button>
          </div>
        </div>
      )}

      {/* Modal: Editar registro */}
      <Dialog open={!!editRecord} onOpenChange={(o) => !o && setEditRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Editar Registro — {editRecord ? formatDate(editRecord.date) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs">Hora Início</Label>
              <Input
                type="time"
                value={editForm.startTime ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Hora Fim</Label>
              <Input
                type="time"
                value={editForm.endTime ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Modalidade</Label>
              <Select
                value={editForm.modalidade ?? ""}
                onValueChange={(v) => setEditForm((f) => ({ ...f, modalidade: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Especial">Especial</SelectItem>
                  <SelectItem value="Extraordinário">Extraordinário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={editForm.status ?? ""}
                onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Função</Label>
              <Input
                value={editForm.funcao ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, funcao: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Justificativa</Label>
              <Input
                value={editForm.reason ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Nota de Revisão</Label>
              <Input
                value={editForm.reviewNote ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, reviewNote: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancelar</Button>
            <Button
              disabled={adminUpdateMutation.isPending}
              onClick={handleSaveEdit}
            >
              {adminUpdateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
