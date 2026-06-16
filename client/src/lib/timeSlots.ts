/**
 * Utilitário de slots de horário para o formulário de horas extras.
 *
 * Dias úteis (weekday): 07:00 – 22:00 em intervalos de 30 min
 * Sábados, domingos e feriados: 07:00 – 23:30 em intervalos de 30 min
 */

export type DayType = "weekday" | "saturday" | "sunday_holiday";

function generateSlots(startHour: number, endHour: number, stepMin = 30): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += stepMin) {
      if (h === endHour && m > 0) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

/** Slots de início: 07:00 até 22:00 (dias úteis) ou 07:00 até 23:30 (outros) */
export function getStartSlots(dayType: DayType): string[] {
  if (dayType === "weekday") return generateSlots(7, 22);
  return generateSlots(7, 23, 30).filter((s) => s !== "23:30");
}

/** Slots de fim: 07:30 até 23:00 (dias úteis) ou 07:30 até 23:50 (outros) */
export function getEndSlots(dayType: DayType): string[] {
  if (dayType === "weekday") {
    return generateSlots(7, 23).filter((s) => s !== "07:00");
  }
  // Para sábados/domingos/feriados: até 23:50
  const slots = generateSlots(7, 23, 30).filter((s) => s !== "07:00");
  // Adicionar 23:50 manualmente
  slots.push("23:50");
  return slots;
}

/** Verifica se uma data é feriado nacional fixo (BR) */
export function isNationalHoliday(dateStr: string): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
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
