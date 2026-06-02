/**
 * Janela de lançamento de horas extras.
 *
 * Regra: o mês de referência é sempre o mês corrente.
 * A janela fica aberta do dia 1 do mês atual até o dia 1 do mês seguinte (inclusive).
 *
 * Exemplo: junho/2026 → janela de 01/06/2026 a 01/07/2026.
 */

export interface LaunchWindow {
  /** Mês de referência (1-12) */
  mesRef: number;
  /** Ano de referência */
  anoRef: number;
  /** Data de início da janela (inclusive) — primeiro dia do mês ref */
  dataInicio: Date;
  /** Data de fim da janela (inclusive) — primeiro dia do mês seguinte */
  dataFim: Date;
  /** Janela está aberta agora? */
  isOpen: boolean;
}

/**
 * Retorna a janela de lançamento baseada na data atual (ou em `now` para testes).
 */
export function getLaunchWindow(now?: Date): LaunchWindow {
  const today = now ?? new Date();
  const mesRef = today.getMonth() + 1; // 1-12
  const anoRef = today.getFullYear();

  // Início: 1º dia do mês de referência
  const dataInicio = new Date(anoRef, mesRef - 1, 1, 0, 0, 0, 0);

  // Fim: 1º dia do mês seguinte
  const fimMes = mesRef === 12 ? 1 : mesRef + 1;
  const fimAno = mesRef === 12 ? anoRef + 1 : anoRef;
  const dataFim = new Date(fimAno, fimMes - 1, 1, 23, 59, 59, 999);

  const isOpen = today >= dataInicio && today <= dataFim;

  return { mesRef, anoRef, dataInicio, dataFim, isOpen };
}

/**
 * Verifica se uma data (string YYYY-MM-DD) está dentro da janela de lançamento.
 */
export function isDateInWindow(dateStr: string, window: LaunchWindow): boolean {
  const [y, m] = dateStr.split("-").map(Number);
  return y === window.anoRef && m === window.mesRef;
}

/**
 * Formata a janela para exibição amigável.
 * Ex: "01/06/2026 a 01/07/2026"
 */
export function formatWindow(window: LaunchWindow): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fimMes = window.mesRef === 12 ? 1 : window.mesRef + 1;
  const fimAno = window.mesRef === 12 ? window.anoRef + 1 : window.anoRef;
  return `01/${pad(window.mesRef)}/${window.anoRef} a 01/${pad(fimMes)}/${fimAno}`;
}
