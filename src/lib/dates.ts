// Fechas "de calendario" (sin hora), siempre según el día de Argentina.
export type CalendarDate = { year: number; month: number; day: number };

const AR_TIMEZONE = 'America/Argentina/Buenos_Aires';

export function todayInArgentina(now: Date = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

// Devuelve null si la fecha no existe (ej. 31/02).
export function parseCalendarDate(day: string, month: string, year: string): CalendarDate | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || year.length !== 4) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return { year: y, month: m, day: d };
}

export function ageOn(birth: CalendarDate, today: CalendarDate): number {
  const hadBirthday = today.month > birth.month || (today.month === birth.month && today.day >= birth.day);
  return today.year - birth.year - (hadBirthday ? 0 : 1);
}

export function toIsoDate({ year, month, day }: CalendarDate): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function fromIsoDate(iso: string): CalendarDate {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

// ── Fecha y hora de planes, siempre en hora de Argentina (spec 03) ──────────

function arParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    time: `${get('hour')}:${get('minute')}`,
    weekday: get('weekday'),
  };
}

const WEEKDAYS: Record<string, string> = { Sun: 'Dom', Mon: 'Lun', Tue: 'Mar', Wed: 'Mié', Thu: 'Jue', Fri: 'Vie', Sat: 'Sáb' };

function daysBetween(a: CalendarDate, b: CalendarDate): number {
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

// "Hoy 18:00", "Mañana 18:00", "Sáb 18:00" (esta semana) o "Sáb 12/10 18:00".
export function formatPlanWhen(iso: string, now: Date = new Date()): string {
  const when = arParts(new Date(iso));
  const days = daysBetween(todayInArgentina(now), when);
  const time = when.time;
  if (days === 0) return `Hoy ${time}`;
  if (days === 1) return `Mañana ${time}`;
  const weekday = WEEKDAYS[when.weekday] ?? when.weekday;
  if (days > 1 && days < 7) return `${weekday} ${time}`;
  return `${weekday} ${when.day}/${when.month} ${time}`;
}

export function formatTime(iso: string): string {
  return arParts(new Date(iso)).time;
}

// Argentina usa UTC-3 todo el año (sin horario de verano desde 2009).
export function fromArgentina(date: CalendarDate, time: string): Date {
  return new Date(`${toIsoDate(date)}T${time}:00-03:00`);
}

export function formatCalendarDate({ year, month, day }: CalendarDate): string {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][weekday]} ${day}/${month}/${year}`;
}
