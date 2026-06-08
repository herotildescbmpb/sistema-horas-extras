import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge, DayTypeBadge } from "@/components/StatusBadge";
import {
  Building2, CalendarRange, Clock, ExternalLink, Filter,
  Users, FileText, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getLaunchWindow } from "@shared/launchWindow";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const STATUS_ESCALA_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  lancado: "Lançado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const STATUS_ESCALA_COLORS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-700 border-gray-200",
  lancado: "bg-blue-100 text-blue-700 border-blue-200",
  aprovado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejeitado: "bg-red-100 text-red-700 border-red-200",
};

type TabType = "escalas" | "horas";

export default function MeuSetor() {
  const launchWindow = getLaunchWindow();
  const [tab, setTab] = useState<TabType>("escalas");
  const [mesFilter, setMesFilter] = useState(String(launchWindow.mesRef));
  const [anoFilter, setAnoFilter] = useState(String(launchWindow.anoRef));
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: dept, isLoading: loadingDept } = trpc.chefe.myDepartment.useQuery();

  const mesNum = mesFilter && mesFilter !== "all" ? Number(mesFilter) : undefined;
  const anoNum = anoFilter ? Number(anoFilter) : undefined;

  const { data: escalas, isLoading: loadingEscalas } = trpc.chefe.listEscalas.useQuery(
    {
      mes: mesNum,
      ano: anoNum,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    { enabled: tab === "escalas" && !!dept }
  );

  const { data: horas, isLoading: loadingHoras } = trpc.chefe.listOvertimes.useQuery(
    {
      mes: mesNum,
      ano: anoNum,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    { enabled: tab === "horas" && !!dept }
  );

  // Usuário não é chefe de nenhum setor
  if (!loadingDept && !dept) {
    return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">
            Você não está registrado como chefe de nenhum setor. Entre em contato com o administrador para obter acesso.
          </p>
        </div>
    );
  }

  const totalHoras = (horas ?? []).reduce((s, r) => s + r.totalMinutes, 0);
  const totalEscalas = (escalas ?? []).length;
  const escalasLancadas = (escalas ?? []).filter(e => e.status === "lancado" || e.status === "aprovado").length;

  return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {loadingDept ? (
              <Skeleton className="h-7 w-48 mb-1" />
            ) : (
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                {dept?.name}
              </h1>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">
              Visão do chefe — registros e escalas do seu setor
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CalendarRange className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Escalas</p>
                <p className="text-xl font-bold text-foreground">{totalEscalas}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lançadas/Aprovadas</p>
                <p className="text-xl font-bold text-foreground">{escalasLancadas}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Horas</p>
                <p className="text-xl font-bold text-foreground">{formatMinutes(totalHoras)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Select value={mesFilter} onValueChange={setMesFilter}>
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {MESES.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={anoFilter} onValueChange={setAnoFilter}>
                <SelectTrigger className="h-9 w-28 text-sm">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tab === "horas" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-44 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {tab === "escalas" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-44 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="lancado">Lançado</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setTab("escalas")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "escalas"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4" /> Escalas em Lote
            </span>
          </button>
          <button
            onClick={() => setTab("horas")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "horas"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Registros de Horas
            </span>
          </button>
        </div>

        {/* Conteúdo das abas */}
        {tab === "escalas" && (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-0">
              {loadingEscalas ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : !escalas?.length ? (
                <div className="py-14 text-center">
                  <CalendarRange className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma escala encontrada para os filtros selecionados.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {escalas.map(e => (
                    <div key={e.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-foreground">{e.tipoEscala}</span>
                          <span className="text-xs text-muted-foreground">—</span>
                          <span className="text-sm text-muted-foreground">{MESES[(e.mes ?? 1) - 1]}/{e.ano}</span>
                          <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${STATUS_ESCALA_COLORS[e.status] ?? ""}`}>
                            {STATUS_ESCALA_LABELS[e.status] ?? e.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <Users className="w-3.5 h-3.5" />
                          <span>{e.creatorName ?? "—"}</span>
                          {e.creatorMatricula && <span className="font-mono">({e.creatorMatricula})</span>}
                          {e.department && <><span>·</span><span>{e.department}</span></>}
                        </div>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                        <Link href={`/escalas/${e.id}`}>
                          <ExternalLink className="w-3.5 h-3.5" /> Ver
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "horas" && (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-0">
              {loadingHoras ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : !horas?.length ? (
                <div className="py-14 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum registro encontrado para os filtros selecionados.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {horas.map(r => (
                    <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                      <div className="w-11 h-11 rounded-xl bg-primary/8 flex flex-col items-center justify-center flex-shrink-0 border border-primary/10">
                        <span className="text-[10px] font-bold text-primary/70 uppercase leading-none">
                          {format(new Date(r.date + "T12:00:00"), "MMM", { locale: ptBR })}
                        </span>
                        <span className="text-base font-bold text-primary leading-none">
                          {format(new Date(r.date + "T12:00:00"), "dd")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-semibold text-foreground">
                            {r.startTime} – {r.endTime}
                          </span>
                          <span className="text-sm font-semibold text-primary">{formatMinutes(r.totalMinutes)}</span>
                          <DayTypeBadge type={r.dayType} />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <Users className="w-3.5 h-3.5" />
                          <span>{(r as any).nomeServidor ?? (r as any).servidor ?? "—"}</span>
                          {(r as any).servidor && <span className="font-mono">({(r as any).servidor})</span>}
                          {(r as any).tipoEscala && <><span>·</span><span>{(r as any).tipoEscala}</span></>}
                          {(r as any).modalidade && <><span>·</span><span>{(r as any).modalidade}</span></>}
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
  );
}
