import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Check, Calendar, Users, FileText,
  Settings2, Plus, Trash2, Clock, AlertCircle, X
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

// ─── Constantes ───────────────────────────────────────────────────────────────
const TIPOS_ESCALA = [
  "Expediente", "Formatura", "Instrução e Treinamento",
  "Operacional", "Prontidão", "Representação", "Sobreaviso",
];
const FUNCOES = ["Chefe", "Auxiliar Administrativo", "Diretor", "Vice-Diretor"];
const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// Feriados nacionais fixos (MM-DD)
const FERIADOS_FIXOS = [
  "01-01","04-21","05-01","09-07","10-12","11-02","11-15","11-20","12-25",
];

function calcEaster(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getFeriadosMoveis(year: number): Set<string> {
  const easter = calcEaster(year);
  const fmt = (d: Date) => `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };
  return new Set([
    fmt(addDays(easter, -48)), // Carnaval 2ª
    fmt(addDays(easter, -47)), // Carnaval 3ª
    fmt(addDays(easter, -2)),  // Sexta-feira Santa
    fmt(easter),               // Páscoa
    fmt(addDays(easter, 60)),  // Corpus Christi
  ]);
}

function isFeriado(date: Date): boolean {
  const mmdd = `${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const moveis = getFeriadosMoveis(date.getFullYear());
  return FERIADOS_FIXOS.includes(mmdd) || moveis.has(mmdd);
}

function getDayType(date: Date): "weekday" | "saturday" | "sunday_holiday" {
  const dow = date.getDay();
  if (dow === 0 || isFeriado(date)) return "sunday_holiday";
  if (dow === 6) return "saturday";
  return "weekday";
}

function getModalidade(date: Date): string {
  const dow = date.getDay();
  if (dow === 5 || dow === 6 || dow === 0 || isFeriado(date)) return "Especial";
  return "Extraordinário";
}

function calcMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + (sm || 0);
  let e = eh * 60 + (em || 0);
  if (e <= s) e += 24 * 60;
  return e - s;
}

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2,"0")}min` : `${h}h`;
}

function generateTimeOptions(from = "13:00", to = "23:50", step = 10): string[] {
  const opts: string[] = [];
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let cur = fh * 60 + fm;
  const end = th * 60 + tm;
  while (cur <= end) {
    opts.push(`${String(Math.floor(cur/60)).padStart(2,"0")}:${String(cur%60).padStart(2,"0")}`);
    cur += step;
  }
  return opts;
}
const TIME_OPTIONS = generateTimeOptions();

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Militar {
  id: string;
  matricula: string;
  nome: string;
  posto: string;
  searchQuery: string;
  showSuggestions: boolean;
}

interface DayOverride {
  startTime: string;
  endTime: string;
}

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Configuração", icon: Settings2 },
  { id: 2, label: "Calendário", icon: Calendar },
  { id: 3, label: "Militares", icon: Users },
  { id: 4, label: "Resumo", icon: FileText },
];

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function EscalaWizard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Step
  const [step, setStep] = useState(1);

  // Step 1 — Configuração
  const now = new Date();
  const [tipoEscala, setTipoEscala] = useState("");
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("17:00");
  const [funcao, setFuncao] = useState("");
  const [department, setDepartment] = useState("");
  const [justificativa, setJustificativa] = useState("");

  // Step 2 — Calendário
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [dayOverrides, setDayOverrides] = useState<Record<number, DayOverride>>({});

  // Step 3 — Militares
  const [militares, setMilitares] = useState<Militar[]>([
    { id: "1", matricula: "", nome: "", posto: "", searchQuery: "", showSuggestions: false },
  ]);

  // Mutation
  const createEscala = trpc.escalas.create.useMutation();
  const launchEscala = trpc.escalas.launch.useMutation();

  // Departments
  const { data: departments_data } = trpc.departments.list.useQuery();

  // ─── Calendário helpers ───────────────────────────────────────────────────
  const daysInMonth = useMemo(() => {
    return new Date(ano, mes, 0).getDate();
  }, [mes, ano]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(ano, mes - 1, 1).getDay();
  }, [mes, ano]);

  const getDayDate = useCallback((day: number) => new Date(ano, mes - 1, day), [ano, mes]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const sortedDays = useMemo(() => Array.from(selectedDays).sort((a, b) => a - b), [selectedDays]);

  // ─── Militares helpers ────────────────────────────────────────────────────
  const { data: servidoresData } = trpc.servidores.search.useQuery(
    { query: militares.find(m => m.showSuggestions)?.searchQuery ?? "" },
    { enabled: militares.some(m => m.showSuggestions && m.searchQuery.length >= 2) }
  );

  const addMilitar = () => {
    if (militares.length >= 10) return;
    setMilitares(prev => [...prev, {
      id: Date.now().toString(),
      matricula: "", nome: "", posto: "",
      searchQuery: "", showSuggestions: false,
    }]);
  };

  const removeMilitar = (id: string) => {
    setMilitares(prev => prev.filter(m => m.id !== id));
  };

  const updateMilitar = (id: string, patch: Partial<Militar>) => {
    setMilitares(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const selectServidor = (militarId: string, s: any) => {
    updateMilitar(militarId, {
      matricula: `${s.matricula}-${s.digito}`,
      nome: s.nome,
      posto: s.posto ?? "",
      searchQuery: s.nome,
      showSuggestions: false,
    });
  };

  // ─── Resumo / Items ───────────────────────────────────────────────────────
  const buildItems = useCallback(() => {
    const items: any[] = [];
    for (const militar of militares) {
      if (!militar.matricula) continue;
      for (const day of sortedDays) {
        const date = getDayDate(day);
        const override = dayOverrides[day];
        const st = override?.startTime ?? startTime;
        const et = override?.endTime ?? endTime;
        const totalMinutes = calcMinutes(st, et);
        const dayType = getDayType(date);
        const modalidade = getModalidade(date);
        const dateStr = `${ano}-${String(mes).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        items.push({
          matricula: militar.matricula,
          nomeServidor: militar.nome,
          posto: militar.posto,
          date: dateStr,
          startTime: st,
          endTime: et,
          totalMinutes,
          modalidade,
          dayType,
        });
      }
    }
    return items;
  }, [militares, sortedDays, dayOverrides, startTime, endTime, ano, mes, getDayDate]);

  const totalHoursByMilitar = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of militares) {
      if (!m.matricula) continue;
      let total = 0;
      for (const day of sortedDays) {
        const override = dayOverrides[day];
        const st = override?.startTime ?? startTime;
        const et = override?.endTime ?? endTime;
        total += calcMinutes(st, et);
      }
      map[m.matricula] = total;
    }
    return map;
  }, [militares, sortedDays, dayOverrides, startTime, endTime]);

  // ─── Validações por step ──────────────────────────────────────────────────
  const canAdvance = useMemo(() => {
    if (step === 1) return tipoEscala && startTime && endTime && funcao && department && justificativa;
    if (step === 2) return selectedDays.size > 0;
    if (step === 3) return militares.some(m => m.matricula);
    return true;
  }, [step, tipoEscala, startTime, endTime, funcao, department, justificativa, selectedDays, militares]);

  // ─── Ações finais ─────────────────────────────────────────────────────────
  const [savedEscalaId, setSavedEscalaId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSaveRascunho = async () => {
    setSaving(true);
    try {
      const items = buildItems();
      const result = await createEscala.mutateAsync({
        tipoEscala, mes, ano, startTime, endTime, funcao, department, justificativa, items,
      });
      setSavedEscalaId(result.id);
      toast.success("Rascunho salvo com sucesso!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar rascunho");
    } finally {
      setSaving(false);
    }
  };

  const handleLancar = async () => {
    setSaving(true);
    try {
      let escalaId = savedEscalaId;
      if (!escalaId) {
        const items = buildItems();
        const result = await createEscala.mutateAsync({
          tipoEscala, mes, ano, startTime, endTime, funcao, department, justificativa, items,
        });
        escalaId = result.id;
        setSavedEscalaId(escalaId);
      }
      await launchEscala.mutateAsync({ id: escalaId! });
      toast.success("Escala lançada com sucesso! Os registros foram criados.");
      navigate("/escalas");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao lançar escala");
    } finally {
      setSaving(false);
    }
  };

  // ─── Export PDF ───────────────────────────────────────────────────────────
  const handleExportPdf = () => {
    const validMilitares = militares.filter(m => m.matricula);
    const html = buildPdfHtml(validMilitares, sortedDays, dayOverrides, startTime, endTime, tipoEscala, mes, ano, funcao, department, justificativa, getDayDate, totalHoursByMilitar);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  // ─── Export Excel (CSV) ───────────────────────────────────────────────────
  const handleExportExcel = () => {
    const validMilitares = militares.filter(m => m.matricula);
    const rows: string[] = [
      `Escala — ${tipoEscala} — ${MESES[mes-1]}/${ano}`,
      `Setor: ${department} | Função: ${funcao}`,
      `Horário: ${startTime} às ${endTime}`,
      `Justificativa: ${justificativa}`,
      "",
      ["Militar", "Matrícula", "Posto", ...sortedDays.map(d => `${String(d).padStart(2,"0")}/${String(mes).padStart(2,"0")}`), "Total Horas"].join(";"),
    ];
    for (const m of validMilitares) {
      const cells = sortedDays.map(day => {
        const override = dayOverrides[day];
        const st = override?.startTime ?? startTime;
        const et = override?.endTime ?? endTime;
        return fmtHours(calcMinutes(st, et));
      });
      rows.push([m.nome, m.matricula, m.posto, ...cells, fmtHours(totalHoursByMilitar[m.matricula] ?? 0)].join(";"));
    }
    const csv = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escala_${tipoEscala.replace(/\s+/g,"_")}_${mes}_${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Nova Escala em Lote</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie escalas para múltiplos militares e dias de forma rápida e organizada.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8 gap-0">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1 min-w-[72px]">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone ? "bg-primary border-primary text-primary-foreground" :
                    isActive ? "bg-primary/10 border-primary text-primary" :
                    "bg-muted border-border text-muted-foreground"
                  }`}>
                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-primary" : isDone ? "text-primary" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-5 ${step > s.id ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px]">

          {/* ── Step 1: Configuração ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" /> Configurações da Escala
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo de Escala <span className="text-destructive">*</span></Label>
                  <Select value={tipoEscala} onValueChange={setTipoEscala}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_ESCALA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Função <span className="text-destructive">*</span></Label>
                  <Select value={funcao} onValueChange={setFuncao}>
                    <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                    <SelectContent>
                      {FUNCOES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Mês de Referência <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MESES.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Setor <span className="text-destructive">*</span></Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                    <SelectContent>
                      {(departments_data ?? []).map((d: any) => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Hora Início <span className="text-destructive">*</span></Label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Hora Fim <span className="text-destructive">*</span></Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {startTime && endTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Duração padrão: <strong>{fmtHours(calcMinutes(startTime, endTime))}</strong> por dia
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Justificativa <span className="text-destructive">*</span></Label>
                <Textarea
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                  placeholder="Descreva o motivo da escala..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Calendário ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Selecione os Dias — {MESES[mes-1]} {ano}
                </h2>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary inline-block" /> Selecionado</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Feriado</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 inline-block" /> Fim de semana</span>
                </div>
              </div>

              {/* Grade do calendário */}
              <div className="select-none">
                <div className="grid grid-cols-7 mb-1">
                  {DIAS_SEMANA.map(d => (
                    <div key={d} className={`text-center text-xs font-semibold py-1 ${d === "Dom" || d === "Sáb" ? "text-blue-500" : "text-muted-foreground"}`}>
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfWeek }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const date = getDayDate(day);
                    const dow = date.getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    const isFer = isFeriado(date);
                    const isSelected = selectedDays.has(day);
                    const override = dayOverrides[day];

                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`
                          relative rounded-lg p-1.5 text-center transition-all border
                          ${isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                            : isFer
                              ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                              : isWeekend
                                ? "bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100"
                                : "bg-background border-border text-foreground hover:bg-muted"
                          }
                        `}
                      >
                        <div className="text-sm font-bold">{day}</div>
                        <div className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {DIAS_SEMANA[dow]}
                        </div>
                        {isFer && !isSelected && (
                          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                        )}
                        {override && (
                          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dias selecionados com ajuste de horário */}
              {sortedDays.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {sortedDays.length} dia{sortedDays.length > 1 ? "s" : ""} selecionado{sortedDays.length > 1 ? "s" : ""}
                      {" — "}Total padrão: <span className="text-primary">{fmtHours(sortedDays.length * calcMinutes(startTime, endTime))}</span>
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setDayOverrides({})}>
                      Limpar ajustes
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sortedDays.map(day => {
                      const date = getDayDate(day);
                      const dow = date.getDay();
                      const isFer = isFeriado(date);
                      const override = dayOverrides[day];
                      const st = override?.startTime ?? startTime;
                      const et = override?.endTime ?? endTime;
                      const mins = calcMinutes(st, et);
                      const modalidade = getModalidade(date);

                      return (
                        <div key={day} className="border border-border rounded-lg p-3 bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {String(day).padStart(2,"0")}/{String(mes).padStart(2,"0")} — {DIAS_SEMANA[dow]}
                              </span>
                              {isFer && <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">Feriado</Badge>}
                            </div>
                            <Badge variant={modalidade === "Especial" ? "secondary" : "outline"} className="text-[10px]">
                              {modalidade}
                            </Badge>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Select
                              value={st}
                              onValueChange={v => setDayOverrides(prev => ({ ...prev, [day]: { startTime: v, endTime: et } }))}
                            >
                              <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                              <SelectContent className="max-h-40">
                                {TIME_OPTIONS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground text-xs">às</span>
                            <Select
                              value={et}
                              onValueChange={v => setDayOverrides(prev => ({ ...prev, [day]: { startTime: st, endTime: v } }))}
                            >
                              <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                              <SelectContent className="max-h-40">
                                {TIME_OPTIONS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <span className="text-xs font-medium text-primary whitespace-nowrap">{fmtHours(mins)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {sortedDays.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4" />
                  Clique nos dias do calendário para selecioná-los.
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Militares ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Militares da Escala
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMilitar}
                  disabled={militares.length >= 10}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar ({militares.length}/10)
                </Button>
              </div>

              <div className="space-y-3">
                {militares.map((m, idx) => (
                  <div key={m.id} className="border border-border rounded-lg p-4 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">Militar {idx + 1}</span>
                      {militares.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeMilitar(m.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <Label className="text-xs mb-1 block">Nome do Servidor</Label>
                      <Input
                        value={m.searchQuery}
                        onChange={e => updateMilitar(m.id, { searchQuery: e.target.value, showSuggestions: true, matricula: "", nome: "", posto: "" })}
                        onFocus={() => updateMilitar(m.id, { showSuggestions: true })}
                        onBlur={() => setTimeout(() => updateMilitar(m.id, { showSuggestions: false }), 200)}
                        placeholder="Digite o nome para buscar..."
                        className="h-9"
                      />
                      {m.showSuggestions && m.searchQuery.length >= 2 && servidoresData && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {(servidoresData as any[]).length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</div>
                          ) : (
                            (servidoresData as any[]).map((s: any) => (
                              <button
                                key={s.id}
                                onMouseDown={() => selectServidor(m.id, s)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                              >
                                <span className="font-medium">{s.nome}</span>
                                <span className="text-muted-foreground text-xs">— {s.posto} — {s.matricula}-{s.digito}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {m.matricula && (
                      <div className="flex gap-3 text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                        <span><strong>Matrícula:</strong> {m.matricula}</span>
                        <span><strong>Posto:</strong> {m.posto}</span>
                        <span className="text-primary font-medium">
                          <strong>Total:</strong> {fmtHours(sortedDays.length * calcMinutes(startTime, endTime))} ({sortedDays.length} dia{sortedDays.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Resumo ── */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Resumo da Escala
              </h2>

              {/* Info da escala */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Tipo", value: tipoEscala },
                  { label: "Período", value: `${MESES[mes-1]}/${ano}` },
                  { label: "Horário", value: `${startTime} – ${endTime}` },
                  { label: "Setor", value: department },
                  { label: "Função", value: funcao },
                  { label: "Dias", value: `${sortedDays.length} dia${sortedDays.length !== 1 ? "s" : ""}` },
                  { label: "Militares", value: `${militares.filter(m => m.matricula).length}` },
                  { label: "Total Registros", value: `${militares.filter(m => m.matricula).length * sortedDays.length}` },
                ].map(item => (
                  <div key={item.label} className="bg-muted/30 rounded-lg p-3 border border-border">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5 truncate">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Grade Militares × Dias */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border min-w-[160px]">Militar</th>
                      {sortedDays.map(day => {
                        const date = getDayDate(day);
                        const dow = date.getDay();
                        const isFer = isFeriado(date);
                        const isWeekend = dow === 0 || dow === 6;
                        return (
                          <th key={day} className={`px-2 py-2 text-center font-semibold border-b border-border min-w-[52px] ${
                            isFer ? "text-amber-600 bg-amber-50" :
                            isWeekend ? "text-blue-600 bg-blue-50" : "text-foreground"
                          }`}>
                            <div>{String(day).padStart(2,"0")}/{String(mes).padStart(2,"0")}</div>
                            <div className="font-normal text-[10px]">{DIAS_SEMANA[dow]}</div>
                          </th>
                        );
                      })}
                      <th className="px-3 py-2 text-center font-semibold text-primary border-b border-border min-w-[80px]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {militares.filter(m => m.matricula).map((m, idx) => (
                      <tr key={m.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="px-3 py-2 border-b border-border">
                          <div className="font-medium text-foreground truncate max-w-[150px]">{m.nome}</div>
                          <div className="text-muted-foreground text-[10px]">{m.posto} — {m.matricula}</div>
                        </td>
                        {sortedDays.map(day => {
                          const override = dayOverrides[day];
                          const st = override?.startTime ?? startTime;
                          const et = override?.endTime ?? endTime;
                          const mins = calcMinutes(st, et);
                          return (
                            <td key={day} className="px-2 py-2 text-center border-b border-border">
                              <div className="text-primary font-medium">{fmtHours(mins)}</div>
                              <div className="text-muted-foreground text-[10px]">{st}–{et}</div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center border-b border-border">
                          <span className="font-bold text-primary">{fmtHours(totalHoursByMilitar[m.matricula] ?? 0)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Justificativa */}
              {justificativa && (
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Justificativa</div>
                  <div className="text-sm text-foreground">{justificativa}</div>
                </div>
              )}

              {/* Botões de exportação */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
                  <FileText className="w-4 h-4" /> Exportar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
                  <FileText className="w-4 h-4" /> Exportar Excel/CSV
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/escalas")}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Cancelar" : "Anterior"}
          </Button>

          <div className="flex gap-2">
            {step === 4 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveRascunho}
                  disabled={saving}
                  className="gap-1.5"
                >
                  {saving ? "Salvando..." : "Salvar Rascunho"}
                </Button>
                <Button
                  onClick={handleLancar}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {saving ? "Lançando..." : "Lançar Escala"}
                </Button>
              </>
            )}
            {step < 4 && (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance}
                className="gap-1.5"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── PDF Builder ──────────────────────────────────────────────────────────────
function buildPdfHtml(
  militares: any[], sortedDays: number[], dayOverrides: Record<number, any>,
  startTime: string, endTime: string, tipoEscala: string, mes: number, ano: number,
  funcao: string, department: string, justificativa: string,
  getDayDate: (d: number) => Date, totalHoursByMilitar: Record<string, number>
): string {
  const DIAS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const fmtH = (m: number) => { const h = Math.floor(m/60); const min = m%60; return min > 0 ? `${h}h${String(min).padStart(2,"0")}` : `${h}h`; };
  const calc = (s: string, e: string) => { const [sh,sm] = s.split(":").map(Number); const [eh,em] = e.split(":").map(Number); let end = eh*60+(em||0); const start = sh*60+(sm||0); if(end<=start) end+=1440; return end-start; };

  const dayHeaders = sortedDays.map(day => {
    const d = getDayDate(day);
    const dow = d.getDay();
    const isWE = dow === 0 || dow === 6;
    return `<th style="padding:6px 4px;text-align:center;background:${isWE?"#dbeafe":"#f1f5f9"};color:${isWE?"#1d4ed8":"#334155"};font-size:10px;border:1px solid #e2e8f0;min-width:44px">
      ${String(day).padStart(2,"0")}/${String(mes).padStart(2,"0")}<br><span style="font-weight:400">${DIAS[dow]}</span>
    </th>`;
  }).join("");

  const rows = militares.map((m, idx) => {
    const cells = sortedDays.map(day => {
      const ov = dayOverrides[day];
      const st = ov?.startTime ?? startTime;
      const et = ov?.endTime ?? endTime;
      const mins = calc(st, et);
      return `<td style="padding:5px 4px;text-align:center;border:1px solid #e2e8f0;font-size:10px;background:${idx%2===0?"#fff":"#f8fafc"}">
        <strong style="color:#1e40af">${fmtH(mins)}</strong><br><span style="color:#94a3b8;font-size:9px">${st}–${et}</span>
      </td>`;
    }).join("");
    return `<tr>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;background:${idx%2===0?"#fff":"#f8fafc"}">
        <strong style="font-size:11px">${m.nome}</strong><br>
        <span style="color:#64748b;font-size:9px">${m.posto} — ${m.matricula}</span>
      </td>
      ${cells}
      <td style="padding:5px 6px;text-align:center;border:1px solid #e2e8f0;background:${idx%2===0?"#fff":"#f8fafc"}">
        <strong style="color:#1e40af;font-size:11px">${fmtH(totalHoursByMilitar[m.matricula]??0)}</strong>
      </td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Escala — ${tipoEscala} — ${MESES_PT[mes-1]}/${ano}</title>
  <style>body{font-family:Arial,sans-serif;margin:20px;color:#1e293b}@media print{body{margin:10px}}</style>
  </head><body>
  <div style="border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px">
    <h1 style="margin:0;font-size:18px;color:#1e3a5f">CBMPB — DAL — Escala de ${tipoEscala}</h1>
    <p style="margin:4px 0 0;color:#64748b;font-size:12px">${MESES_PT[mes-1]}/${ano} | Setor: ${department} | Função: ${funcao} | Horário padrão: ${startTime}–${endTime}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead><tr>
      <th style="padding:8px;text-align:left;background:#1e3a5f;color:#fff;border:1px solid #1e3a5f;min-width:160px">Militar</th>
      ${dayHeaders}
      <th style="padding:6px 8px;text-align:center;background:#1e3a5f;color:#fff;border:1px solid #1e3a5f">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${justificativa ? `<p style="margin-top:16px;font-size:11px;color:#475569"><strong>Justificativa:</strong> ${justificativa}</p>` : ""}
  <p style="margin-top:20px;font-size:10px;color:#94a3b8">Gerado em ${new Date().toLocaleString("pt-BR")} — Sistema DALGest/CBMPB</p>
  </body></html>`;
}
