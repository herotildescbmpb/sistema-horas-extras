/**
 * Utilitário de slots de horário para o formulário de horas extras.
 *
 * Dias úteis (weekday): 13:00 – 23:50 em intervalos de 10 min
 * Sábados, domingos e feriados: 07:30 – 23:50 em intervalos de 10 min
 *
 * SLOTS_WEEKDAY e SLOTS_EXTENDED são constantes de módulo (referência estável)
 * para uso em useMemo/useEffect sem causar re-renders infinitos.
 */

export type DayType = "weekday" | "saturday" | "sunday_holiday";

function generateSlots(startH: number, startM: number, endH: number, endM: number, stepMin = 10): string[] {
  const slots: string[] = [];
  let h = startH, m = startM;
  while (h < endH || (h === endH && m <= endM)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += stepMin;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}

/** Slots para dias úteis: 13:00 – 23:50 (10 min) — referência de módulo estável */
export const SLOTS_WEEKDAY: readonly string[] = generateSlots(13, 0, 23, 50);

/** Slots para sáb/dom/feriado: 07:30 – 23:50 (10 min) — referência de módulo estável */
export const SLOTS_EXTENDED: readonly string[] = generateSlots(7, 30, 23, 50);

/** Slots de início por tipo de dia */
export function getStartSlots(dayType: DayType): readonly string[] {
  return dayType === "weekday" ? SLOTS_WEEKDAY : SLOTS_EXTENDED;
}

/** Slots de fim por tipo de dia */
export function getEndSlots(dayType: DayType): readonly string[] {
  return dayType === "weekday" ? SLOTS_WEEKDAY : SLOTS_EXTENDED;
}

/** Verifica se uma data (ISO YYYY-MM-DD) é feriado nacional fixo (BR) */
export function isNationalHoliday(dateStr: string): boolean {
  const [, month, day] = dateStr.split("-").map(Number);
  const mmdd = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const fixedHolidays = [
    "01-01", // Ano Novo
    "04-21", // Tiradentes
    "05-01", // Dia do Trabalho
    "09-07", // Independência
    "10-12", // Nossa Senhora Aparecida
    "11-02", // Finados
    "11-15", // Proclamação da República
    "11-20", // Consciência Negra
    "12-25", // Natal
  ];
  return fixedHolidays.includes(mmdd);
}

/** Determina o dayType de uma data, considerando feriados customizados */
export function getDayType(
  dateStr: string,
  customHolidayDates: string[] = []
): DayType {
  const date = new Date(dateStr + "T12:00:00");
  const dow = date.getDay(); // 0=Dom, 6=Sáb
  if (customHolidayDates.includes(dateStr) || isNationalHoliday(dateStr)) {
    return "sunday_holiday";
  }
  if (dow === 0) return "sunday_holiday";
  if (dow === 6) return "saturday";
  return "weekday";
}

/** Retorna o label do tipo de dia */
export function getDayTypeLabel(dayType: DayType): string {
  switch (dayType) {
    case "weekday": return "Dia Útil";
    case "saturday": return "Sábado";
    case "sunday_holiday": return "Dom/Feriado";
  }
}
