/** Utilidades de formato compartidas. */

/** "2017-10-08", "2018-03" o undefined → rango legible tipo "2017-10-08 - 2018-03-25". */
export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'Fecha desconocida';
  return `${start ?? '?'} - ${end ?? '?'}`;
}

/** Milisegundos restantes → "42 min", "5h 12m" o "2d 5h". */
export function formatCountdown(msLeft: number): string {
  const totalMinutes = Math.max(0, Math.floor(msLeft / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(minutes, 1)} min`;
}

/** ISO completo de Jikan ("2017-10-08T00:00:00+00:00") → "2017-10-08". */
export function isoToDate(iso?: string | null): string | undefined {
  return iso ? iso.slice(0, 10) : undefined;
}

const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Epoch en ms → "lun 3 nov · 08:30" en hora local (sin depender de Intl). */
export function formatAiringDate(epochMs: number): string {
  const date = new Date(epochMs);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} · ${time}`;
}

/** Tiempo transcurrido en español: "hace 5 min", "hace 3 h", "hace 2 d". */
export function formatTimeAgo(epochMs: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - epochMs) / 60000));
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  return months < 12 ? `hace ${months} mes${months === 1 ? '' : 'es'}` : `hace ${Math.floor(months / 12)} a`;
}

/** Segundos → "4:32" o "1:02:15". */
export function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
