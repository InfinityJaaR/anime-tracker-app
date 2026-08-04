/** Utilidades de formato compartidas. */

/** "2017-10-08", "2018-03" o undefined → rango legible tipo "2017-10-08 - 2018-03-25". */
export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'Fecha desconocida';
  return `${start ?? '?'} - ${end ?? '?'}`;
}

/** ISO completo de Jikan ("2017-10-08T00:00:00+00:00") → "2017-10-08". */
export function isoToDate(iso?: string | null): string | undefined {
  return iso ? iso.slice(0, 10) : undefined;
}
