/**
 * Project statuses used across the app. Older records (and the old New/Edit forms)
 * stored "Open" for an active job; treat it as "Active" everywhere.
 * Migration 20261111190000_project_status_values.sql converts stored values.
 */
export const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Closed'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export function normalizeProjectStatus(s?: string | null): string {
  const v = (s || '').trim();
  if (!v) return 'Planning';
  if (/^(open|in progress)$/i.test(v)) return 'Active';
  return v;
}

/** Postgres "check constraint violated". */
const CHECK_VIOLATION = '23514';

/**
 * Saves a status, coping with databases that have not had the status migration yet:
 * if "Active" is rejected, retry with the legacy "Open".
 * Returns a readable error message, or null on success.
 */
export async function saveWithStatus(
  status: string,
  write: (status: string) => PromiseLike<{ error: { code?: string; message: string } | null }>
): Promise<string | null> {
  let { error } = await write(status);
  if (error?.code === CHECK_VIOLATION && status === 'Active') {
    ({ error } = await write('Open'));
  }
  if (!error) return null;
  if (error.code === CHECK_VIOLATION) {
    return `The database doesn't accept the status "${status}" yet. Ask an admin to apply the latest database update (project status values), then try again.`;
  }
  return error.message;
}
