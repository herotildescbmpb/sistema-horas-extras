import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Calendar, Users, Clock, ChevronRight, FileText, Rocket } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const STATUS_MAP: Record<string, { label: string; variant: "default"|"secondary"|"outline"|"destructive" }> = {
  rascunho:  { label: "Rascunho",  variant: "secondary" },
  lancado:   { label: "Lançado",   variant: "default" },
  aprovado:  { label: "Aprovado",  variant: "default" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
};

export default function EscalaList() {
  const [, navigate] = useLocation();
  const { data: escalas, isLoading, refetch } = trpc.escalas.list.useQuery();
  const launchMutation = trpc.escalas.launch.useMutation({
    onSuccess: () => { toast.success("Escala lançada!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              const statusInfo = STATUS_MAP[escala.status] ?? { label: escala.status, variant: "outline" as const };
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
                        <span className="text-muted-foreground text-xs">
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
                    <div className="flex items-center gap-2 shrink-0">
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
    </AppLayout>
  );
}
