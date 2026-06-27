import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Download,
  FileText,
  History,
  Eye,
  X,
  Check,
  ChevronDown,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(ts: Date | string | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-BR");
}

function formatDuration(start: Date | string | null, end: Date | string | null) {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    success: { label: "Sucesso", variant: "default" },
    completed: { label: "Concluído", variant: "default" },
    created: { label: "Criada", variant: "default" },
    error: { label: "Erro", variant: "destructive" },
    failed: { label: "Falhou", variant: "destructive" },
    pending: { label: "Pendente", variant: "secondary" },
    running: { label: "Executando", variant: "outline" },
    duplicate: { label: "Duplicata", variant: "secondary" },
  };
  const cfg = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Painel de Exportação Manual ─────────────────────────────────────────────

function ExportPanel() {
  const utils = trpc.useUtils();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);

  // Buscar lista de setores
  const { data: deptList } = trpc.departments.list.useQuery();
  const allDepts = (deptList || []).map((d: any) => d.name).sort();

  const toggleDept = (name: string) => {
    setSelectedDepts((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
  };

  const { data: preview, isLoading: loadingPreview, refetch: refetchPreview } =
    trpc.bravo.exportPreview.useQuery(
      {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        departments: selectedDepts.length > 0 ? selectedDepts : undefined,
      },
      { enabled: true }
    );

  const { data: batches, isLoading: loadingBatches, refetch: refetchBatches } =
    trpc.bravo.exportBatches.useQuery();

  const createBatch = trpc.bravo.createExportBatch.useMutation({
    onSuccess: (res) => {
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `bravo_lote_${res.batchId}_${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Lote #${res.batchId} exportado com ${res.totalRegistros} registros.`);
      refetchPreview();
      refetchBatches();
      utils.bravo.exportPreview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleExport = () => {
    if (!preview || preview.total === 0) {
      toast.error("Nenhum registro novo para exportar.");
      return;
    }
    createBatch.mutate({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      departments: selectedDepts.length > 0 ? selectedDepts : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Filtros e prévia */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Exportar Registros para Lançamento Manual</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Cada exportação marca os registros como "exportados". Na próxima exportação, apenas os registros novos serão incluídos — evitando duplicidade no lançamento manual no Bravo.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm border rounded px-2 py-1.5 bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm border rounded px-2 py-1.5 bg-background text-foreground"
              />
            </div>
            {/* Multi-select de setores */}
            <div className="relative">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                <Building2 className="inline w-3 h-3 mr-1" />
                Setores (múltiplos)
              </label>
              <button
                type="button"
                onClick={() => setDeptDropdownOpen((o) => !o)}
                className="w-full text-sm border rounded px-2 py-1.5 bg-background text-foreground flex items-center justify-between gap-1 hover:bg-muted/50 transition-colors"
              >
                <span className="truncate text-left">
                  {selectedDepts.length === 0
                    ? "Todos os setores"
                    : selectedDepts.length === 1
                    ? selectedDepts[0]
                    : `${selectedDepts.length} setores selecionados`}
                </span>
                <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
              </button>
              {deptDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover shadow-md">
                  {/* Limpar seleção */}
                  {selectedDepts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDepts([])}
                      className="w-full px-3 py-1.5 text-xs text-destructive hover:bg-muted/50 flex items-center gap-1 border-b"
                    >
                      <X className="w-3 h-3" /> Limpar seleção
                    </button>
                  )}
                  {allDepts.map((dept: string) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDept(dept)}
                      className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted/50 flex items-center gap-2"
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selectedDepts.includes(dept)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground"
                      }`}>
                        {selectedDepts.includes(dept) && <Check className="w-3 h-3" />}
                      </span>
                      <span className="truncate">{dept}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Tags dos setores selecionados */}
          {selectedDepts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedDepts.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 border border-primary/20"
                >
                  {d}
                  <button type="button" onClick={() => toggleDept(d)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Contador de prévia */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {loadingPreview ? (
                  "Carregando..."
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{preview?.total ?? 0}</span>
                    {" "}registro{(preview?.total ?? 0) !== 1 ? "s" : ""} aprovado{(preview?.total ?? 0) !== 1 ? "s" : ""} ainda não exportado{(preview?.total ?? 0) !== 1 ? "s" : ""}
                  </>
                )}
              </span>
            </div>
            <Button
              onClick={handleExport}
              disabled={createBatch.isPending || (preview?.total ?? 0) === 0}
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {createBatch.isPending ? "Exportando..." : "Exportar CSV"}
            </Button>
          </div>

          {/* Tabela prévia */}
          {!loadingPreview && preview && preview.total > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-muted-foreground mb-2">Prévia dos registros que serão exportados:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.records.slice(0, 20).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.servidor || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(r.date + "T12:00:00").toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">{r.startTime.slice(0, 5)} – {r.endTime.slice(0, 5)}</TableCell>
                      <TableCell className="text-sm">{r.modalidade || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{r.department || "—"}</TableCell>
                      <TableCell className="text-sm">{Math.floor(r.totalMinutes / 60)}h{r.totalMinutes % 60 > 0 ? ` ${r.totalMinutes % 60}m` : ""}</TableCell>
                    </TableRow>
                  ))}
                  {preview.total > 20 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-2">
                        ... e mais {preview.total - 20} registros
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!loadingPreview && (preview?.total ?? 0) === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
              <p className="text-sm">Todos os registros aprovados já foram exportados.</p>
              <p className="text-xs mt-1">Novos registros aprovados aparecerão aqui automaticamente.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de lotes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Histórico de Exportações</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBatches ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !batches || batches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Nenhuma exportação realizada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote #</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Exportado por</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Período filtrado</TableHead>
                    <TableHead>Setor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-sm font-semibold">#{b.id}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(b.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">{b.exportedByName || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{b.totalRegistros}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b.startDate && b.endDate
                          ? `${new Date(b.startDate + "T12:00:00").toLocaleDateString("pt-BR")} – ${new Date(b.endDate + "T12:00:00").toLocaleDateString("pt-BR")}`
                          : b.startDate
                          ? `A partir de ${new Date(b.startDate + "T12:00:00").toLocaleDateString("pt-BR")}`
                          : b.endDate
                          ? `Até ${new Date(b.endDate + "T12:00:00").toLocaleDateString("pt-BR")}`
                          : "Todos os períodos"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.department || "Todos"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BravoSync() {
  const [activeTab, setActiveTab] = useState<"export" | "sync">("export");
  const [selectedMes, setSelectedMes] = useState<string>(() =>
    new Date().toISOString().slice(0, 7)
  );

  const { data, isLoading, refetch } = trpc.bravo.status.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const { data: lancamentos, isLoading: loadingLancamentos } =
    trpc.bravo.lancamentos.useQuery({ mesAno: selectedMes });

  const syncMutation = trpc.bravo.triggerSync.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setTimeout(() => refetch(), 3000);
    },
    onError: (e) => toast.error(e.message),
  });

  const escalaMes = data?.escalaMes;
  const logs = data?.logs || [];
  const mesAtual = new Date().toISOString().slice(0, 7);
  const resumoMes = logs.find((l) => l.mesAno === mesAtual && l.status !== "running");

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bravo Escalas — Sincronização</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lançamento de horas extras no sistema Bravo Escalas (CBMPB)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <Play className="w-4 h-4 mr-2" />
            {syncMutation.isPending ? "Iniciando..." : "Sincronizar Agora"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("export")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "export"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Download className="w-4 h-4 inline mr-1.5" />
          Exportação Manual
        </button>
        <button
          onClick={() => setActiveTab("sync")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "sync"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <RefreshCw className="w-4 h-4 inline mr-1.5" />
          Sincronização Automática
        </button>
      </div>

      {/* Conteúdo da aba Exportação Manual */}
      {activeTab === "export" && <ExportPanel />}

      {/* Conteúdo da aba Sincronização Automática */}
      {activeTab === "sync" && (
        <div className="space-y-6">
          {/* Cards de status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Escala do Mês ({mesAtual})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 bg-muted animate-pulse rounded" />
                ) : escalaMes ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={escalaMes.status} />
                      {escalaMes.bravoEscalaId && (
                        <span className="text-xs text-muted-foreground">
                          ID: {escalaMes.bravoEscalaId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {escalaMes.bravoEscalaNome || "EXTRA EXPEDIENTE"}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Aguardando criação</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lançamentos do Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 bg-muted animate-pulse rounded" />
                ) : resumoMes ? (
                  <div className="space-y-1">
                    <div className="flex gap-3 text-sm">
                      <span className="text-green-600 font-semibold">✓ {resumoMes.sucessos}</span>
                      <span className="text-red-500 font-semibold">✗ {resumoMes.erros}</span>
                      <span className="text-muted-foreground">↩ {resumoMes.duplicatas} dup.</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Total: {resumoMes.totalRegistros} registros</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Nenhuma execução este mês</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Última Execução
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 bg-muted animate-pulse rounded" />
                ) : logs[0] ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={logs[0].status} />
                      <span className="text-xs text-muted-foreground">
                        {logs[0].triggeredBy === "manual" ? "Manual" : "Agendado"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(logs[0].startedAt)}</p>
                    {logs[0].errorMsg && (
                      <p className="text-xs text-red-500 truncate" title={logs[0].errorMsg}>
                        {logs[0].errorMsg}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Nenhuma execução registrada</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lançamentos por mês */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Lançamentos por Mês</CardTitle>
                <input
                  type="month"
                  value={selectedMes}
                  onChange={(e) => setSelectedMes(e.target.value)}
                  className="text-sm border rounded px-2 py-1 bg-background text-foreground"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingLancamentos ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : !lancamentos || lancamentos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Nenhum lançamento registrado para {selectedMes}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matrícula</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Lançado em</TableHead>
                        <TableHead>Tentativas</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lancamentos.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-mono text-sm">{l.matricula}</TableCell>
                          <TableCell className="text-sm">
                            {l.data ? new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell className="text-sm">{l.horaInicio} – {l.horaFim}</TableCell>
                          <TableCell><StatusBadge status={l.status} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDateTime(l.lancadoEm)}</TableCell>
                          <TableCell className="text-center text-sm">{l.tentativas}</TableCell>
                          <TableCell className="text-sm text-red-500 max-w-xs truncate">{l.errorMsg || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de execuções */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Execuções Automáticas</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Nenhuma execução registrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Sucesso</TableHead>
                        <TableHead>Erros</TableHead>
                        <TableHead>Dup.</TableHead>
                        <TableHead>Iniciado em</TableHead>
                        <TableHead>Duração</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">{log.mesAno}</TableCell>
                          <TableCell className="text-sm capitalize">
                            {log.triggeredBy === "manual" ? "Manual" : "Agendado"}
                          </TableCell>
                          <TableCell><StatusBadge status={log.status} /></TableCell>
                          <TableCell className="text-center">{log.totalRegistros}</TableCell>
                          <TableCell className="text-center text-green-600 font-semibold">{log.sucessos}</TableCell>
                          <TableCell className="text-center text-red-500 font-semibold">{log.erros}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{log.duplicatas}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDateTime(log.startedAt)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDuration(log.startedAt, log.finishedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info sobre agendamento */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium text-amber-600">Agendamento Automático</p>
                  <p className="text-muted-foreground">
                    O agente executa automaticamente às <strong>00:01</strong> todos os dias.
                    No primeiro dia de cada mês, cria uma nova escala "EXTRA EXPEDIENTE" no Bravo Escalas
                    antes de lançar os registros. Duplicatas são detectadas automaticamente e ignoradas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
