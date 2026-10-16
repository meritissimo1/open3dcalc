/**
 * Buma Labs fork: print time is typed the way MakerWorld shows it — decimal
 * hours ("5.3", "5.3 h") or, under an hour, minutes ("30 min", "30m").
 * The calculator keeps storing hours.
 */

const PRINT_TIME_RE =
  /^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hora|horas|m|min|mins|minuto|minutos)?$/;

/** Parses a typed print time into hours; `null` when it can't be read. */
export function parsePrintTime(input: string): number | null {
  const text = input.trim().toLowerCase().replace(",", ".");
  const match = PRINT_TIME_RE.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return match[2]?.startsWith("m") ? value / 60 : value;
}

/** MakerWorld style: "30 min" under an hour, otherwise "5.3 h". */
export function formatPrintTime(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0 min";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${Number(hours.toFixed(2))} h`;
}

/** Clock reading of decimal hours, e.g. 5.3 → "5h 18min". */
export function formatHoursMinutes(hours: number): string {
  const total = Math.round(Math.max(0, hours) * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
