import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList, CalendarRange, ChevronRight, Clock, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";

export default function NovoRegistro() {
  const [, navigate] = useLocation();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Novo Registro</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Escolha o tipo de lançamento que deseja realizar.
            </p>
          </div>
        </div>

        {/* Cards de seleção */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Lançamento Único */}
          <button
            onClick={() => navigate("/horas/novo")}
            className="group relative flex flex-col items-start gap-4 rounded-2xl border-2 border-border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {/* Ícone */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <ClipboardList className="w-6 h-6" />
            </div>

            {/* Texto */}
            <div className="flex-1 space-y-1.5">
              <h2 className="text-base font-semibold text-foreground">Lançamento Único</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Registre horas extras de um único militar em uma data específica.
              </p>
            </div>

            {/* Detalhes */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Um militar
              </span>
              <span className="flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5" /> Uma data
              </span>
            </div>

            {/* Seta */}
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
          </button>

          {/* Escala em Lote */}
          <button
            onClick={() => navigate("/escalas/nova")}
            className="group relative flex flex-col items-start gap-4 rounded-2xl border-2 border-border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {/* Ícone */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <CalendarRange className="w-6 h-6" />
            </div>

            {/* Texto */}
            <div className="flex-1 space-y-1.5">
              <h2 className="text-base font-semibold text-foreground">Escala em Lote</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Registre uma escala completa com múltiplos militares e vários dias de uma vez.
              </p>
            </div>

            {/* Detalhes */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Até 10 militares
              </span>
              <span className="flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5" /> Múltiplos dias
              </span>
            </div>

            {/* Seta */}
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Dica */}
        <p className="text-center text-xs text-muted-foreground">
          Use <strong>Lançamento Único</strong> para registros pontuais e <strong>Escala em Lote</strong> para escalas mensais recorrentes.
        </p>
      </div>
    </AppLayout>
  );
}
