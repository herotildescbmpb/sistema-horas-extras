import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Plus, Calendar, Clock, ChevronRight, FileText, Rocket, Copy } from "lucide-react";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const STATUS_MAP: Record<string, { label: string; variant: "default"|"secondary"|"outline"|"destructive"; color: string }> = {
  rascunho:  { label: "Rascunho",  variant: "secondary",    color: "text-muted-foreground" },
  lancado:   { label: "Lançado",   variant: "default",      color: "text-primary" },
  aprovado:  { label: "Aprovado",  variant: "default",      color: "text-emerald-600" },
  rejeitado: { label: "Rejeitado", variant: "destructive",  color: "text-destructive" },
};

export default function EscalaList() {
  const [, navigate] = useLocation();
  const { data: escalas, isLoading, refetch } = trpc.escalas.list.useQuery();

  // Estado para confirmação de duplicação
  const [duplicateTarget, setDuplicateTarget] = useState<{ id: number; tipoEscala: string; mes: number; ano: number } | null>(null);

  const launchMutation = trpc.escalas.launch.useMutation({
    onSuccess: () => { toast.success("Escala lançada com sucesso!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const duplicateMutation = trpc.escalas.duplicate.useMutation({
    onSuccess: (result) => {
      refetch();
      const mesNome = MESES_FULL[(result.mes ?? 1) - 1];
      toast.success(
        `Escala duplicada para ${mesNome}/${result.ano}!`,
        {
          action: {
            label: "Ver escala",
            onClick: () => navigate(`/escalas/${result.id}`),
          },
          duration: 6000,
        }
      );
      setDuplicateTarget(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setDuplicateTarget(null);
    },
  });

  // Calcular próximo mês para exibir no diálogo
  const getNextMonth = (mes: number, ano: number) => {
    const novoMes = mes === 12 ? 1 : mes + 1;
    const novoAno = mes === 12 ? ano + 1 : ano;
    return { mes: novoMes, ano: novoAno, label: `${MESES_FULL[novoMes - 1]}/${novoAno}` };
  };

  if (isLoading) {
    return (
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
        </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Escalas em Lote</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie escalas com múltiplos militares e dias.
            </p>
          </div>
          <Button onClick={() => navigate("/escalas/nova")} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Escala
          </Button>
        </div>

        {/* Lista */}
        {(!escalas || escalas.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Nenhuma escala criada</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              Crie sua primeira escala em lote para múltiplos militares.
            </p>
            <Button onClick={() => navigate("/escalas/nova")} className="gap-2">
              <Plus className="w-4 h-4" /> Criar Primeira Escala
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {(escalas as any[]).map((escala) => {
              const statusInfo = STATUS_MAP[escala.status] ?? { label: escala.status, variant: "outline" as const, color: "" };
              const nextMonth = getNextMonth(escala.mes ?? 1, escala.ano ?? new Date().getFullYear());
              return (
                <div
                  key={escala.id}
                  className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{escala.tipoEscala}</h3>
                        <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                        <span className="text-muted-foreground text-xs font-medium">
                          {MESES[(escala.mes ?? 1) - 1]}/{escala.ano}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {escala.startTime} – {escala.endTime}
                        </span>
                        {escala.department && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> {escala.department}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Criado em {new Date(escala.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {escala.justificativa && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-lg">
                          {escala.justificativa}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {/* Lançar — apenas rascunhos */}
                      {escala.status === "rascunho" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => launchMutation.mutate({ id: escala.id })}
                          disabled={launchMutation.isPending}
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          Lançar
                        </Button>
                      )}

                      {/* Duplicar — disponível para qualquer status */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs border-dashed hover:border-solid hover:bg-primary/5"
                        onClick={() => setDuplicateTarget({
                          id: escala.id,
                          tipoEscala: escala.tipoEscala,
                          mes: escala.mes ?? 1,
                          ano: escala.ano ?? new Date().getFullYear(),
                        })}
                        disabled={duplicateMutation.isPending}
                        title={`Duplicar para ${nextMonth.label}`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicar
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() => navigate(`/escalas/${escala.id}`)}
                      >
                        Ver <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Diálogo de confirmação de duplicação */}
      <AlertDialog open={!!duplicateTarget} onOpenChange={(open) => { if (!open) setDuplicateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary" />
              Duplicar Escala para o Próximo Mês
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Você está prestes a duplicar a escala de{" "}
                  <strong className="text-foreground">{duplicateTarget?.tipoEscala}</strong>{" "}
                  de{" "}
                  <strong className="text-foreground">
                    {duplicateTarget ? MESES_FULL[(duplicateTarget.mes ?? 1) - 1] : ""}
                    /{duplicateTarget?.ano}
                  </strong>{" "}
                  para{" "}
                  <strong className="text-foreground">
                    {duplicateTarget ? getNextMonth(duplicateTarget.mes, duplicateTarget.ano).label : ""}
                  </strong>.
                </p>
                <div className="bg-muted/60 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-medium text-foreground">O que será copiado:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Todos os militares e seus dias de serviço</li>
                    <li>Horários de início e fim de cada registro</li>
                    <li>Tipo de escala, setor e justificativa</li>
                  </ul>
                  <p className="font-medium text-foreground mt-2">O que será ajustado automaticamente:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Datas transpostas para o novo mês</li>
                    <li>Modalidade recalculada (Especial/Extraordinário) conforme o dia da semana</li>
                    <li>Nova escala criada como <strong>Rascunho</strong> para revisão antes do lançamento</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => duplicateTarget && duplicateMutation.mutate({ id: duplicateTarget.id })}
              disabled={duplicateMutation.isPending}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              {duplicateMutation.isPending ? "Duplicando..." : "Confirmar Duplicação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
