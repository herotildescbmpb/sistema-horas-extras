import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, FileText, Rocket, Clock, Calendar } from "lucide-react";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2,"0")}min` : `${h}h`;
}

const STATUS_MAP: Record<string, { label: string; variant: "default"|"secondary"|"outline"|"destructive" }> = {
  rascunho:  { label: "Rascunho",  variant: "secondary" },
  lancado:   { label: "Lançado",   variant: "default" },
  aprovado:  { label: "Aprovado",  variant: "default" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
};

export default function EscalaDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const escalaId = Number(id);

  const { data: escala, isLoading, refetch } = trpc.escalas.getById.useQuery({ id: escalaId });
  const launchMutation = trpc.escalas.launch.useMutation({
    onSuccess: () => { toast.success("Escala lançada com sucesso!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        </div>
    );
  }

  if (!escala) {
    return (
        <div className="max-w-5xl mx-auto px-4 py-6 text-center py-20">
          <p className="text-muted-foreground">Escala não encontrada.</p>
          <Button variant="ghost" onClick={() => navigate("/escalas")} className="mt-4">Voltar</Button>
        </div>
    );
  }

  const items = (escala as any).items ?? [];
  const statusInfo = STATUS_MAP[(escala as any).status] ?? { label: (escala as any).status, variant: "outline" as const };

  // Agrupar itens por militar
  const militaresMap = new Map<string, { nome: string; posto: string; matricula: string; items: any[] }>();
  for (const item of items) {
    if (!militaresMap.has(item.matricula)) {
      militaresMap.set(item.matricula, { nome: item.nomeServidor, posto: item.posto ?? "", matricula: item.matricula, items: [] });
    }
    militaresMap.get(item.matricula)!.items.push(item);
  }
  const militares = Array.from(militaresMap.values());

  // Dias únicos ordenados
  const diasUnicos = Array.from(new Set(items.map((i: any) => i.date as string))).sort() as string[];

  const handleExportPdf = () => {
    const rows = militares.map(m => {
      const cells = diasUnicos.map(date => {
        const item = m.items.find((i: any) => i.date === date);
        if (!item) return `<td style="padding:5px 4px;text-align:center;border:1px solid #e2e8f0;color:#94a3b8">—</td>`;
        return `<td style="padding:5px 4px;text-align:center;border:1px solid #e2e8f0;font-size:10px">
          <strong style="color:#1e40af">${fmtHours(item.totalMinutes)}</strong><br>
          <span style="color:#94a3b8;font-size:9px">${item.startTime}–${item.endTime}</span>
        </td>`;
      }).join("");
      const total = m.items.reduce((s: number, i: any) => s + i.totalMinutes, 0);
      return `<tr>
        <td style="padding:6px 8px;border:1px solid #e2e8f0">
          <strong style="font-size:11px">${m.nome}</strong><br>
          <span style="color:#64748b;font-size:9px">${m.posto} — ${m.matricula}</span>
        </td>
        ${cells}
        <td style="padding:5px 6px;text-align:center;border:1px solid #e2e8f0">
          <strong style="color:#1e40af">${fmtHours(total)}</strong>
        </td>
      </tr>`;
    }).join("");

    const dayHeaders = diasUnicos.map(date => {
      const d = new Date(date + "T12:00:00");
      const dow = d.getDay();
      const isWE = dow === 0 || dow === 6;
      return `<th style="padding:6px 4px;text-align:center;background:${isWE?"#dbeafe":"#f1f5f9"};color:${isWE?"#1d4ed8":"#334155"};font-size:10px;border:1px solid #e2e8f0">
        ${date.split("-").slice(1).reverse().join("/")}<br><span style="font-weight:400">${DIAS[dow]}</span>
      </th>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Escala #${escalaId}</title>
    <style>body{font-family:Arial,sans-serif;margin:20px}@media print{body{margin:10px}}</style>
    </head><body>
    <div style="border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px">
      <h1 style="margin:0;font-size:18px;color:#1e3a5f">CBMPB — DAL — Escala de ${(escala as any).tipoEscala}</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:12px">
        ${MESES[((escala as any).mes ?? 1) - 1]}/${(escala as any).ano} | Setor: ${(escala as any).department ?? "—"} | Função: ${(escala as any).funcao} | Horário: ${(escala as any).startTime}–${(escala as any).endTime}
      </p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead><tr>
        <th style="padding:8px;text-align:left;background:#1e3a5f;color:#fff;border:1px solid #1e3a5f;min-width:160px">Militar</th>
        ${dayHeaders}
        <th style="padding:6px 8px;text-align:center;background:#1e3a5f;color:#fff;border:1px solid #1e3a5f">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${(escala as any).justificativa ? `<p style="margin-top:16px;font-size:11px"><strong>Justificativa:</strong> ${(escala as any).justificativa}</p>` : ""}
    <p style="margin-top:20px;font-size:10px;color:#94a3b8">Gerado em ${new Date().toLocaleString("pt-BR")} — DALGest/CBMPB</p>
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleExportCsv = () => {
    const rows: string[] = [
      `Escala #${escalaId} — ${(escala as any).tipoEscala} — ${MESES[((escala as any).mes ?? 1) - 1]}/${(escala as any).ano}`,
      `Setor: ${(escala as any).department ?? "—"} | Função: ${(escala as any).funcao}`,
      "",
      ["Militar","Matrícula","Posto",...diasUnicos.map(d => d.split("-").slice(1).reverse().join("/")),"Total"].join(";"),
    ];
    for (const m of militares) {
      const cells = diasUnicos.map(date => {
        const item = m.items.find((i: any) => i.date === date);
        return item ? fmtHours(item.totalMinutes) : "—";
      });
      const total = m.items.reduce((s: number, i: any) => s + i.totalMinutes, 0);
      rows.push([m.nome, m.matricula, m.posto, ...cells, fmtHours(total)].join(";"));
    }
    const csv = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escala_${escalaId}_${(escala as any).tipoEscala.replace(/\s+/g,"_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/escalas")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{(escala as any).tipoEscala}</h1>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span className="text-muted-foreground text-sm">
                {MESES[((escala as any).mes ?? 1) - 1]}/{(escala as any).ano}
              </span>
            </div>
            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {(escala as any).startTime} – {(escala as any).endTime}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {(escala as any).department ?? "—"}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(escala as any).status === "rascunho" && (
              <Button
                size="sm"
                onClick={() => launchMutation.mutate({ id: escalaId })}
                disabled={launchMutation.isPending}
                className="gap-1.5"
              >
                <Rocket className="w-4 h-4" />
                {launchMutation.isPending ? "Lançando..." : "Lançar Escala"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
              <FileText className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <FileText className="w-4 h-4" /> Excel/CSV
            </Button>
          </div>
        </div>

        {/* Grade */}
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground border-b border-border min-w-[180px]">Militar</th>
                {diasUnicos.map(date => {
                  const d = new Date(date + "T12:00:00");
                  const dow = d.getDay();
                  const isWE = dow === 0 || dow === 6;
                  return (
                    <th key={date} className={`px-2 py-3 text-center font-semibold border-b border-border min-w-[60px] ${isWE ? "text-blue-600 bg-blue-50" : "text-foreground"}`}>
                      <div>{date.split("-").slice(1).reverse().join("/")}</div>
                      <div className="font-normal text-[10px]">{DIAS[dow]}</div>
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-center font-semibold text-primary border-b border-border min-w-[80px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {militares.map((m, idx) => {
                const total = m.items.reduce((s: number, i: any) => s + i.totalMinutes, 0);
                return (
                  <tr key={m.matricula} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <td className="px-4 py-3 border-b border-border">
                      <div className="font-medium text-foreground">{m.nome}</div>
                      <div className="text-muted-foreground text-[10px]">{m.posto} — {m.matricula}</div>
                    </td>
                    {diasUnicos.map(date => {
                      const item = m.items.find((i: any) => i.date === date);
                      return (
                        <td key={date} className="px-2 py-3 text-center border-b border-border">
                          {item ? (
                            <>
                              <div className="text-primary font-medium">{fmtHours(item.totalMinutes)}</div>
                              <div className="text-muted-foreground text-[10px]">{item.startTime}–{item.endTime}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center border-b border-border">
                      <span className="font-bold text-primary">{fmtHours(total)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(escala as any).justificativa && (
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Justificativa</div>
            <div className="text-sm text-foreground">{(escala as any).justificativa}</div>
          </div>
        )}
      </div>
  );
}
