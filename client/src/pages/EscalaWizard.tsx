import { useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Check, Calendar, Users, FileText,
  Settings2, Plus, Trash2, Clock, AlertCircle, AlertTriangle,
  Edit2, X, UserPlus, CalendarDays
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
const DIAS_SEMANA_FULL = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const DIAS_SEMANA_SHORT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

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
    fmt(addDays(easter, -48)),
    fmt(addDays(easter, -47)),
    fmt(addDays(easter, -2)),
    fmt(easter),
    fmt(addDays(easter, 60)),
  ]);
}

function isFeriado(date: Date): boolean {
  const mmdd = `${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const moveis = getFeriadosMoveis(date.getFullYear());
  return FERIADOS_FIXOS.includes(mmdd) || moveis.has(mmdd);
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
  if (!minutes || minutes <= 0) return "0h";
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
interface MilitarEntry {
  id: string;
  // Dados do servidor
  matricula: string;
  nome: string;
  posto: string;
  searchQuery: string;
  showSuggestions: boolean;
  // Dias selecionados e overrides por dia
  selectedDays: Set<number>;
  dayOverrides: Record<number, { startTime: string; endTime: string }>;
}

interface EditingRecord {
  militarId: string;
  day: number;
  startTime: string;
  endTime: string;
  funcao: string;
  modalidade: string;
}

// ─── Steps ────────────────────────────────────────────────────────────────────
// Step 1: Configuração geral
// Step 2+N: Militar N (dados + calendário) — dinâmico
// Last step: Revisão

// ─── Calendário Mini ──────────────────────────────────────────────────────────
function MiniCalendar({
  mes, ano, markedDays,
}: { mes: number; ano: number; markedDays: Map<number, string[]> }) {
  const daysInMonth = new Date(ano, mes, 0).getDate();
  const firstDayOfWeek = new Date(ano, mes - 1, 1).getDay();

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA_SHORT.map(d => (
          <div key={d} className={`text-center text-[10px] font-semibold py-0.5 ${d === "Dom" || d === "Sáb" ? "text-blue-500" : "text-muted-foreground"}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(ano, mes - 1, day);
          const dow = date.getDay();
          const isWeekend = dow === 0 || dow === 6;
          const isFer = isFeriado(date);
          const names = markedDays.get(day) ?? [];
          const hasMarks = names.length > 0;

          return (
            <div
              key={day}
              className={`relative rounded p-1 text-center min-h-[36px] border transition-all
                ${hasMarks
                  ? "bg-primary/10 border-primary/40"
                  : isFer
                    ? "bg-amber-50 border-amber-200"
                    : isWeekend
                      ? "bg-blue-50 border-blue-100"
                      : "bg-background border-border"
                }
              `}
            >
              <div className={`text-[11px] font-bold ${hasMarks ? "text-primary" : isWeekend || isFer ? "text-blue-600" : "text-foreground"}`}>
                {day}
              </div>
              {hasMarks && (
                <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                  {names.slice(0, 3).map((n, ni) => (
                    <div key={ni} className="w-2 h-2 rounded-full bg-primary" title={n} />
                  ))}
                  {names.length > 3 && (
                    <div className="text-[8px] text-primary font-bold">+{names.length - 3}</div>
                  )}
                </div>
              )}
              {isFer && !hasMarks && (
                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function EscalaWizard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // ── Configuração geral (Step 1) ──
  const now = new Date();
  const [tipoEscala, setTipoEscala] = useState("");
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [globalStartTime, setGlobalStartTime] = useState("13:00");
  const [globalEndTime, setGlobalEndTime] = useState("17:00");
  const [funcao, setFuncao] = useState("");
  const [department, setDepartment] = useState("");
  const [justificativa, setJustificativa] = useState("");

  // ── Militares ──
  const [militares, setMilitares] = useState<MilitarEntry[]>([
    {
      id: "1", matricula: "", nome: "", posto: "",
      searchQuery: "", showSuggestions: false,
      selectedDays: new Set(), dayOverrides: {},
    },
  ]);
  const [currentMilitarIdx, setCurrentMilitarIdx] = useState(0); // qual militar está sendo editado no step 2+

  // ── Navegação ──
  // step 1 = config, step 2..N+1 = militar[0..N-1], step N+2 = revisão
  const [step, setStep] = useState(1);
  const totalSteps = militares.length + 2; // 1 config + N militares + 1 revisão

  // ── Edição individual na revisão ──
  const [editingRecord, setEditingRecord] = useState<EditingRecord | null>(null);

  // ── Confirmação de lançamento ──
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [savedEscalaId, setSavedEscalaId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Queries ──
  const { data: departments_data } = trpc.departments.list.useQuery();
  const createEscala = trpc.escalas.create.useMutation();
  const launchEscala = trpc.escalas.launch.useMutation();

  // Autocomplete — busca para o militar atual
  const currentMilitar = militares[currentMilitarIdx];
  const searchQuery = currentMilitar?.searchQuery ?? "";
  const { data: servidoresData } = trpc.servidores.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 && (currentMilitar?.showSuggestions ?? false) }
  );

  // ── Helpers de calendário ──
  const daysInMonth = useMemo(() => new Date(ano, mes, 0).getDate(), [mes, ano]);
  const firstDayOfWeek = useMemo(() => new Date(ano, mes - 1, 1).getDay(), [mes, ano]);
  const getDayDate = useCallback((day: number) => new Date(ano, mes - 1, day), [ano, mes]);

  // ── Helpers de militar ──
  const updateMilitar = (id: string, patch: Partial<MilitarEntry>) => {
    setMilitares(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const toggleDay = (militarId: string, day: number) => {
    setMilitares(prev => prev.map(m => {
      if (m.id !== militarId) return m;
      const next = new Set(m.selectedDays);
      if (next.has(day)) { next.delete(day); }
      else { next.add(day); }
      return { ...m, selectedDays: next };
    }));
  };

  const setDayOverride = (militarId: string, day: number, override: { startTime: string; endTime: string }) => {
    setMilitares(prev => prev.map(m => {
      if (m.id !== militarId) return m;
      return { ...m, dayOverrides: { ...m.dayOverrides, [day]: override } };
    }));
  };

  const addMilitar = () => {
    if (militares.length >= 10) return;
    const newId = Date.now().toString();
    setMilitares(prev => [...prev, {
      id: newId, matricula: "", nome: "", posto: "",
      searchQuery: "", showSuggestions: false,
      selectedDays: new Set(), dayOverrides: {},
    }]);
    const newIdx = militares.length;
    setCurrentMilitarIdx(newIdx);
    setStep(newIdx + 2); // step do novo militar
  };

  const removeMilitar = (id: string) => {
    if (militares.length <= 1) return;
    setMilitares(prev => prev.filter(m => m.id !== id));
    // Volta para o primeiro militar
    setCurrentMilitarIdx(0);
    setStep(2);
  };

  // ── Mapa de dias marcados para o calendário de revisão ──
  const markedDaysMap = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const m of militares) {
      for (const day of Array.from(m.selectedDays)) {
        const existing = map.get(day) ?? [];
        map.set(day, [...existing, m.nome || m.matricula]);
      }
    }
    return map;
  }, [militares]);

  // ── Build items para salvar ──
  const buildItems = useCallback(() => {
    const items: any[] = [];
    for (const m of militares) {
      if (!m.matricula) continue;
      for (const day of Array.from(m.selectedDays).sort((a, b) => a - b)) {
        const date = getDayDate(day);
        const override = m.dayOverrides[day];
        const st = override?.startTime ?? globalStartTime;
        const et = override?.endTime ?? globalEndTime;
        const totalMinutes = calcMinutes(st, et);
        const dayType = (() => {
          const dow = date.getDay();
          if (dow === 0 || isFeriado(date)) return "sunday_holiday";
          if (dow === 6) return "saturday";
          return "weekday";
        })();
        const modalidade = getModalidade(date);
        const dateStr = `${ano}-${String(mes).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        items.push({
          matricula: m.matricula,
          nomeServidor: m.nome,
          posto: m.posto,
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
  }, [militares, globalStartTime, globalEndTime, ano, mes, getDayDate]);

  // ── Validações ──
  const canAdvanceStep1 = tipoEscala && globalStartTime && globalEndTime && funcao && department && justificativa;
  const canAdvanceMilitar = (idx: number) => {
    const m = militares[idx];
    return m && m.matricula && Array.from(m.selectedDays).length > 0;
  };

  // ── Ações finais ──
  const handleSaveRascunho = async () => {
    setSaving(true);
    try {
      const items = buildItems();
      const result = await createEscala.mutateAsync({
        tipoEscala, mes, ano, startTime: globalStartTime, endTime: globalEndTime,
        funcao, department, justificativa, items,
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
          tipoEscala, mes, ano, startTime: globalStartTime, endTime: globalEndTime,
          funcao, department, justificativa, items,
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
      setShowLaunchConfirm(false);
    }
  };

  // ── Export PDF ──
  const handleExportPdf = () => {
    const militaresValidos = militares.filter(m => m.matricula && m.selectedDays.size > 0);
    const allDays = Array.from(new Set(militaresValidos.flatMap(m => Array.from(m.selectedDays)))).sort((a, b) => a - b);

    const rows = militaresValidos.map(m => {
      const sortedDays = Array.from(m.selectedDays).sort((a, b) => a - b);
      const totalMins = sortedDays.reduce((acc, day) => {
        const ov = m.dayOverrides[day];
        return acc + calcMinutes(ov?.startTime ?? globalStartTime, ov?.endTime ?? globalEndTime);
      }, 0);
      const cells = allDays.map(day => {
        if (!m.selectedDays.has(day)) return `<td style="background:#f5f5f5;color:#ccc;text-align:center">—</td>`;
        const ov = m.dayOverrides[day];
        const st = ov?.startTime ?? globalStartTime;
        const et = ov?.endTime ?? globalEndTime;
        const date = getDayDate(day);
        const mod = getModalidade(date);
        return `<td style="text-align:center;background:${mod === "Especial" ? "#fff3cd" : "#e8f4fd"};font-size:11px">${st}<br/>${et}<br/><span style="font-size:9px;color:#666">${fmtHours(calcMinutes(st,et))}</span></td>`;
      });
      return `<tr>
        <td style="padding:6px 10px;font-weight:600;white-space:nowrap">${m.posto} ${m.nome}</td>
        <td style="text-align:center;color:#666">${m.matricula}</td>
        ${cells.join("")}
        <td style="text-align:center;font-weight:700;color:#1a3a5c">${fmtHours(totalMins)}</td>
      </tr>`;
    });

    const headerCells = allDays.map(day => {
      const date = getDayDate(day);
      const dow = date.getDay();
      const isFer = isFeriado(date);
      const bg = isFer ? "#fff3cd" : (dow === 0 || dow === 6) ? "#dbeafe" : "#f0f4f8";
      return `<th style="text-align:center;padding:4px 6px;background:${bg};font-size:11px">${String(day).padStart(2,"0")}/${String(mes).padStart(2,"0")}<br/><span style="font-weight:400;font-size:9px">${DIAS_SEMANA_SHORT[dow]}</span></th>`;
    });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Escala — ${tipoEscala} — ${MESES[mes-1]}/${ano}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:4px 6px}th{background:#1a3a5c;color:#fff}@media print{button{display:none}}</style>
    </head><body>
      <h2 style="color:#1a3a5c;margin-bottom:4px">Escala — ${tipoEscala}</h2>
      <p style="margin:2px 0;color:#555">Período: ${MESES[mes-1]}/${ano} &nbsp;|&nbsp; Setor: ${department} &nbsp;|&nbsp; Função: ${funcao}</p>
      <p style="margin:2px 0;color:#555">Horário padrão: ${globalStartTime} às ${globalEndTime} &nbsp;|&nbsp; Justificativa: ${justificativa}</p>
      <br/>
      <table>
        <thead><tr>
          <th style="text-align:left">Militar</th>
          <th>Matrícula</th>
          ${headerCells.join("")}
          <th>Total</th>
        </tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
      <br/><p style="font-size:11px;color:#999">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
      <script>window.onload=()=>window.print()</script>
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  // ── Export CSV ──
  const handleExportCsv = () => {
    const militaresValidos = militares.filter(m => m.matricula && m.selectedDays.size > 0);
    const allDays = Array.from(new Set(militaresValidos.flatMap(m => Array.from(m.selectedDays)))).sort((a, b) => a - b);
    const rows: string[] = [
      `Escala — ${tipoEscala} — ${MESES[mes-1]}/${ano}`,
      `Setor: ${department} | Função: ${funcao} | Horário: ${globalStartTime} às ${globalEndTime}`,
      "",
      ["Militar", "Matrícula", "Posto", ...allDays.map(d => `${String(d).padStart(2,"0")}/${String(mes).padStart(2,"0")}`), "Total"].join(";"),
    ];
    for (const m of militaresValidos) {
      let total = 0;
      const cells = allDays.map(day => {
        if (!m.selectedDays.has(day)) return "—";
        const ov = m.dayOverrides[day];
        const st = ov?.startTime ?? globalStartTime;
        const et = ov?.endTime ?? globalEndTime;
        const mins = calcMinutes(st, et);
        total += mins;
        return fmtHours(mins);
      });
      rows.push([m.nome, m.matricula, m.posto, ...cells, fmtHours(total)].join(";"));
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

  // ── Stepper visual ──
  const stepLabels = [
    { label: "Configuração", icon: Settings2 },
    ...militares.map((m, i) => ({
      label: m.nome ? m.nome.split(" ")[0] : `Militar ${i + 1}`,
      icon: Users,
    })),
    { label: "Revisão", icon: FileText },
  ];

  const isReviewStep = step === totalSteps;
  const militarStepIdx = step - 2; // 0-based index of current militar in step 2+

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova Escala em Lote</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Registre escalas para múltiplos militares com dias individuais por servidor.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/escalas")} className="gap-1 text-muted-foreground">
            <X className="w-4 h-4" /> Cancelar
          </Button>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8 overflow-x-auto pb-2">
          {stepLabels.map((s, idx) => {
            const Icon = s.icon;
            const stepNum = idx + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={idx} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center gap-1 min-w-[64px]">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone ? "bg-primary border-primary text-primary-foreground" :
                    isActive ? "bg-primary/10 border-primary text-primary" :
                    "bg-muted border-border text-muted-foreground"
                  }`}>
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight max-w-[60px] truncate ${
                    isActive ? "text-primary" : isDone ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {s.label}
                  </span>
                </div>
                {idx < stepLabels.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 mb-5 flex-shrink-0 ${step > stepNum ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[420px]">

          {/* ── Step 1: Configuração ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" /> Configurações Gerais da Escala
              </h2>
              <p className="text-sm text-muted-foreground">
                Defina os parâmetros comuns a todos os militares desta escala. Cada militar poderá ter horários ajustados individualmente.
              </p>
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
                  <Label>Hora Início Padrão <span className="text-destructive">*</span></Label>
                  <Select value={globalStartTime} onValueChange={setGlobalStartTime}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Hora Fim Padrão <span className="text-destructive">*</span></Label>
                  <Select value={globalEndTime} onValueChange={setGlobalEndTime}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">
                      {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {globalStartTime && globalEndTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Duração padrão por dia: <strong>{fmtHours(calcMinutes(globalStartTime, globalEndTime))}</strong>
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

          {/* ── Steps 2..N: Militar ── */}
          {step >= 2 && !isReviewStep && (() => {
            const mIdx = step - 2;
            const m = militares[mIdx];
            if (!m) return null;
            const sortedDays = Array.from(m.selectedDays).sort((a, b) => a - b);
            const totalMins = sortedDays.reduce((acc, day) => {
              const ov = m.dayOverrides[day];
              return acc + calcMinutes(ov?.startTime ?? globalStartTime, ov?.endTime ?? globalEndTime);
            }, 0);

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Militar {mIdx + 1} de {militares.length}
                  </h2>
                  {militares.length > 1 && (
                    <Button
                      variant="ghost" size="sm"
                      className="text-destructive hover:text-destructive gap-1"
                      onClick={() => removeMilitar(m.id)}
                    >
                      <Trash2 className="w-4 h-4" /> Remover militar
                    </Button>
                  )}
                </div>

                {/* Busca do servidor */}
                <div className="bg-muted/20 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" /> Identificação do Servidor
                  </h3>
                  <div className="relative">
                    <Label className="text-xs mb-1 block">Nome do Servidor <span className="text-destructive">*</span></Label>
                    <Input
                      value={m.searchQuery}
                      onChange={e => updateMilitar(m.id, {
                        searchQuery: e.target.value,
                        showSuggestions: true,
                        matricula: "", nome: "", posto: "",
                      })}
                      onFocus={() => updateMilitar(m.id, { showSuggestions: true })}
                      onBlur={() => setTimeout(() => updateMilitar(m.id, { showSuggestions: false }), 200)}
                      placeholder="Digite o nome para buscar..."
                      className="h-10"
                    />
                    {m.showSuggestions && m.searchQuery.length >= 2 && servidoresData && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {(servidoresData as any[]).length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado encontrado</div>
                        ) : (
                          (servidoresData as any[]).map((s: any) => (
                            <button
                              key={s.id}
                              onMouseDown={() => updateMilitar(m.id, {
                                matricula: `${s.matricula}-${s.digito}`,
                                nome: s.nome,
                                posto: s.posto ?? "",
                                searchQuery: s.nome,
                                showSuggestions: false,
                              })}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex items-center justify-between border-b border-border/50 last:border-0"
                            >
                              <span className="font-medium">{s.nome}</span>
                              <span className="text-muted-foreground text-xs">{s.posto} · {s.matricula}-{s.digito}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {m.matricula && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background rounded-md px-3 py-2 border border-border">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Matrícula</div>
                        <div className="text-sm font-semibold text-foreground">{m.matricula}</div>
                      </div>
                      <div className="bg-background rounded-md px-3 py-2 border border-border">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Posto/Graduação</div>
                        <div className="text-sm font-semibold text-foreground">{m.posto || "—"}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Calendário */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      Selecione os Dias — {MESES[mes-1]} {ano}
                    </h3>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary inline-block" /> Selecionado</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" /> Feriado</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-200 inline-block" /> Fim de semana</span>
                    </div>
                  </div>

                  <div className="select-none">
                    <div className="grid grid-cols-7 mb-1">
                      {DIAS_SEMANA_SHORT.map(d => (
                        <div key={d} className={`text-center text-xs font-semibold py-1 ${d === "Dom" || d === "Sáb" ? "text-blue-500" : "text-muted-foreground"}`}>
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`e-${i}`} />)}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const date = getDayDate(day);
                        const dow = date.getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        const isFer = isFeriado(date);
                        const isSelected = m.selectedDays.has(day);
                        const hasOverride = !!m.dayOverrides[day];

                        return (
                          <button
                            key={day}
                            onClick={() => toggleDay(m.id, day)}
                            className={`relative rounded-lg p-1.5 text-center transition-all border
                              ${isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                : isFer
                                  ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                                  : isWeekend
                                    ? "bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100"
                                    : "bg-background border-border text-foreground hover:bg-muted"
                              }`}
                          >
                            <div className="text-sm font-bold">{day}</div>
                            <div className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {DIAS_SEMANA_SHORT[dow]}
                            </div>
                            {isFer && !isSelected && (
                              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                            )}
                            {hasOverride && isSelected && (
                              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-300" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dias selecionados com ajuste individual */}
                  {sortedDays.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-foreground">
                          {sortedDays.length} dia{sortedDays.length > 1 ? "s" : ""} selecionado{sortedDays.length > 1 ? "s" : ""}
                          {" — "}Total: <span className="text-primary">{fmtHours(totalMins)}</span>
                        </div>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setMilitares(prev => prev.map(mil => mil.id === m.id ? { ...mil, dayOverrides: {} } : mil))}
                          className="text-xs text-muted-foreground"
                        >
                          Limpar ajustes
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {sortedDays.map(day => {
                          const date = getDayDate(day);
                          const dow = date.getDay();
                          const isFer = isFeriado(date);
                          const override = m.dayOverrides[day];
                          const st = override?.startTime ?? globalStartTime;
                          const et = override?.endTime ?? globalEndTime;
                          const mins = calcMinutes(st, et);
                          const modalidade = getModalidade(date);

                          return (
                            <div key={day} className="border border-border rounded-lg p-3 bg-muted/20 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">
                                    {String(day).padStart(2,"0")}/{String(mes).padStart(2,"0")} — {DIAS_SEMANA_SHORT[dow]}
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
                                  onValueChange={v => setDayOverride(m.id, day, { startTime: v, endTime: et })}
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                                  <SelectContent className="max-h-40">
                                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <span className="text-muted-foreground text-xs">às</span>
                                <Select
                                  value={et}
                                  onValueChange={v => setDayOverride(m.id, day, { startTime: st, endTime: v })}
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
              </div>
            );
          })()}

          {/* ── Step Revisão ── */}
          {isReviewStep && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Revisão da Escala
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1 text-xs">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1 text-xs">
                    <FileText className="w-3.5 h-3.5" /> CSV/Excel
                  </Button>
                </div>
              </div>

              {/* Resumo da configuração */}
              <div className="bg-muted/30 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs block">Tipo</span><strong>{tipoEscala}</strong></div>
                <div><span className="text-muted-foreground text-xs block">Período</span><strong>{MESES[mes-1]}/{ano}</strong></div>
                <div><span className="text-muted-foreground text-xs block">Setor</span><strong>{department}</strong></div>
                <div><span className="text-muted-foreground text-xs block">Função</span><strong>{funcao}</strong></div>
                <div><span className="text-muted-foreground text-xs block">Horário Padrão</span><strong>{globalStartTime} – {globalEndTime}</strong></div>
                <div className="col-span-2 md:col-span-3"><span className="text-muted-foreground text-xs block">Justificativa</span><strong>{justificativa}</strong></div>
              </div>

              {/* Calendário visual completo */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Visão Geral do Calendário — {MESES[mes-1]} {ano}
                </h3>
                <div className="border border-border rounded-xl p-4 bg-muted/10">
                  <MiniCalendar mes={mes} ano={ano} markedDays={markedDaysMap} />
                  <div className="mt-3 flex flex-wrap gap-3">
                    {militares.filter(m => m.matricula && m.selectedDays.size > 0).map(m => (
                      <div key={m.id} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        <span className="text-foreground font-medium">{m.posto} {m.nome}</span>
                        <span className="text-muted-foreground">({m.selectedDays.size} dia{m.selectedDays.size > 1 ? "s" : ""})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Registros por militar com edição individual */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Registros por Militar
                </h3>
                {militares.filter(m => m.matricula && m.selectedDays.size > 0).map(m => {
                  const sortedDays = Array.from(m.selectedDays).sort((a, b) => a - b);
                  const totalMins = sortedDays.reduce((acc, day) => {
                    const ov = m.dayOverrides[day];
                    return acc + calcMinutes(ov?.startTime ?? globalStartTime, ov?.endTime ?? globalEndTime);
                  }, 0);
                  return (
                    <div key={m.id} className="border border-border rounded-xl overflow-hidden">
                      <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground">{m.posto} {m.nome}</span>
                          <span className="text-muted-foreground text-xs ml-2">· {m.matricula}</span>
                        </div>
                        <div className="text-sm font-medium text-primary">
                          {sortedDays.length} dia{sortedDays.length > 1 ? "s" : ""} · {fmtHours(totalMins)}
                        </div>
                      </div>
                      <div className="divide-y divide-border">
                        {sortedDays.map(day => {
                          const date = getDayDate(day);
                          const dow = date.getDay();
                          const isFer = isFeriado(date);
                          const override = m.dayOverrides[day];
                          const st = override?.startTime ?? globalStartTime;
                          const et = override?.endTime ?? globalEndTime;
                          const mins = calcMinutes(st, et);
                          const modalidade = getModalidade(date);
                          const isEditing = editingRecord?.militarId === m.id && editingRecord?.day === day;

                          return (
                            <div key={day} className={`px-4 py-2.5 flex items-center gap-3 ${isEditing ? "bg-primary/5" : "hover:bg-muted/20"}`}>
                              <div className="w-24 flex-shrink-0">
                                <div className="text-sm font-semibold">
                                  {String(day).padStart(2,"0")}/{String(mes).padStart(2,"0")}
                                </div>
                                <div className="text-xs text-muted-foreground">{DIAS_SEMANA_FULL[dow]}</div>
                              </div>
                              {isEditing ? (
                                <div className="flex items-center gap-2 flex-1 flex-wrap">
                                  <Select
                                    value={editingRecord.startTime}
                                    onValueChange={v => setEditingRecord(r => r ? { ...r, startTime: v } : r)}
                                  >
                                    <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-40">
                                      {TIME_OPTIONS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <span className="text-xs text-muted-foreground">às</span>
                                  <Select
                                    value={editingRecord.endTime}
                                    onValueChange={v => setEditingRecord(r => r ? { ...r, endTime: v } : r)}
                                  >
                                    <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-40">
                                      {TIME_OPTIONS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={editingRecord.funcao}
                                    onValueChange={v => setEditingRecord(r => r ? { ...r, funcao: v } : r)}
                                  >
                                    <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {FUNCOES.map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={editingRecord.modalidade}
                                    onValueChange={v => setEditingRecord(r => r ? { ...r, modalidade: v } : r)}
                                  >
                                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Especial">Especial</SelectItem>
                                      <SelectItem value="Extraordinário">Extraordinário</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" className="h-7 text-xs px-3" onClick={() => {
                                    if (editingRecord) {
                                      setDayOverride(m.id, day, {
                                        startTime: editingRecord.startTime,
                                        endTime: editingRecord.endTime,
                                      });
                                    }
                                    setEditingRecord(null);
                                  }}>
                                    <Check className="w-3 h-3 mr-1" /> Salvar
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setEditingRecord(null)}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="flex items-center gap-1 text-sm">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>{st} – {et}</span>
                                    <span className="text-primary font-medium ml-1">({fmtHours(mins)})</span>
                                  </div>
                                  <Badge variant={modalidade === "Especial" ? "secondary" : "outline"} className="text-[10px]">
                                    {modalidade}
                                  </Badge>
                                  {isFer && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Feriado</Badge>}
                                  {override && <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-300">Ajustado</Badge>}
                                </div>
                              )}
                              {!isEditing && (
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
                                  onClick={() => setEditingRecord({
                                    militarId: m.id, day,
                                    startTime: st, endTime: et,
                                    funcao, modalidade,
                                  })}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totais */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Resumo Total</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {militares.filter(m => m.matricula && m.selectedDays.size > 0).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Militares</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {new Set(militares.flatMap(m => Array.from(m.selectedDays))).size}
                    </div>
                    <div className="text-xs text-muted-foreground">Dias únicos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {militares.reduce((acc, m) => acc + Array.from(m.selectedDays).length, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Registros</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {fmtHours(militares.reduce((acc, m) => {
                        return acc + Array.from(m.selectedDays).reduce((a, day) => {
                          const ov = m.dayOverrides[day];
                          return a + calcMinutes(ov?.startTime ?? globalStartTime, ov?.endTime ?? globalEndTime);
                        }, 0);
                      }, 0))}
                    </div>
                    <div className="text-xs text-muted-foreground">Total de Horas</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>

          <div className="flex gap-3">
            {/* Adicionar militar (no último step de militar, antes da revisão) */}
              {step >= 2 && step === totalSteps - 1 && !isReviewStep && militares.length < 10 && (
              <Button
                variant="outline"
                onClick={addMilitar}
                className="gap-2"
                disabled={!canAdvanceMilitar(step - 2)}
              >
                <UserPlus className="w-4 h-4" /> Adicionar Militar ({militares.length}/10)
              </Button>
            )}

            {/* Salvar rascunho (na revisão) */}
            {isReviewStep && (
              <Button
                variant="outline"
                onClick={handleSaveRascunho}
                disabled={saving}
                className="gap-2"
              >
                {saving ? <Clock className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Salvar Rascunho
              </Button>
            )}

            {/* Próximo / Lançar */}
            {!isReviewStep ? (
              <Button
                onClick={() => {
                  if (step === 1 && !canAdvanceStep1) {
                    toast.error("Preencha todos os campos obrigatórios antes de continuar.");
                    return;
                  }
                  if (step >= 2 && !canAdvanceMilitar(step - 2)) {
                    toast.error("Selecione o servidor e pelo menos um dia antes de continuar.");
                    return;
                  }
                  if (step === totalSteps - 1) {
                    setCurrentMilitarIdx(step - 1);
                  }
                  setStep(s => s + 1);
                }}
                className="gap-2"
              >
                {step === totalSteps - 1 ? "Revisar Escala" : "Próximo"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setShowLaunchConfirm(true)}
                disabled={saving}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Check className="w-4 h-4" /> Lançar Escala
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialog de Confirmação de Lançamento ── */}
      <Dialog open={showLaunchConfirm} onOpenChange={setShowLaunchConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Lançamento da Escala
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive font-medium">
                Atenção: esta ação não pode ser desfeita.
              </div>
              <p className="text-sm text-muted-foreground">
                Ao confirmar, serão criados <strong>{militares.reduce((acc, m) => acc + m.selectedDays.size, 0)} registros</strong> de horas extras para <strong>{militares.filter(m => m.matricula && m.selectedDays.size > 0).length} militar(es)</strong> no mês de <strong>{MESES[mes-1]}/{ano}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Os registros serão enviados para aprovação e <strong>não poderão ser excluídos</strong> após o lançamento. Verifique todas as informações antes de confirmar.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLaunchConfirm(false)} disabled={saving}>
              Cancelar — Revisar
            </Button>
            <Button
              variant="destructive"
              onClick={handleLancar}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirmar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
