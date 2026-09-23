// Local-timezone date helpers.
// new Date().toISOString() is always UTC, which shifts the calendar date
// for users behind UTC (e.g. Eastern is UTC-4). Use these instead so the
// app works in the user's local day.

/** Today's date (or a given date) as YYYY-MM-DD in local time. */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Value for a datetime-local input from an ISO timestamp, in local time. */
export function localDateTimeInputValue(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}
