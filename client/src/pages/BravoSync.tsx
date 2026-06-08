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
  Copy,
  AlertTriangle,
  ExternalLink,
  Play,
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BravoSync() {
  const [selectedMes, setSelectedMes] = useState<string>(() =>
    new Date().toISOString().slice(0, 7)
  );

  const { data, isLoading, refetch } = trpc.bravo.status.useQuery(undefined, {
    refetchInterval: 15000, // atualiza a cada 15s
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bravo Escalas — Sincronização</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lançamento automático de horas extras no sistema Bravo Escalas (CBMPB)
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

      {/* Cards de status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Escala do mês */}
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

        {/* Lançamentos do mês */}
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
                  <span className="text-green-600 font-semibold">
                    ✓ {resumoMes.sucessos}
                  </span>
                  <span className="text-red-500 font-semibold">
                    ✗ {resumoMes.erros}
                  </span>
                  <span className="text-muted-foreground">
                    ↩ {resumoMes.duplicatas} dup.
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {resumoMes.totalRegistros} registros
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Nenhuma execução este mês</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Última execução */}
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
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(logs[0].startedAt)}
                </p>
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

      {/* Detalhes dos lançamentos */}
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
                      {l.data
                        ? new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.horaInicio} – {l.horaFim}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(l.lancadoEm)}
                    </TableCell>
                    <TableCell className="text-center text-sm">{l.tentativas}</TableCell>
                    <TableCell className="text-sm text-red-500 max-w-xs truncate">
                      {l.errorMsg || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Histórico de execuções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Execuções</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Nenhuma execução registrada</p>
            </div>
          ) : (
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
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="text-center">{log.totalRegistros}</TableCell>
                    <TableCell className="text-center text-green-600 font-semibold">
                      {log.sucessos}
                    </TableCell>
                    <TableCell className="text-center text-red-500 font-semibold">
                      {log.erros}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {log.duplicatas}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(log.startedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDuration(log.startedAt, log.finishedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                Em caso de falha, uma notificação é enviada ao administrador.
              </p>
              <p className="text-muted-foreground">
                Para lançar manualmente, clique em <strong>"Sincronizar Agora"</strong> acima.
                A execução ocorre em segundo plano — atualize a página após alguns minutos para ver o resultado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
