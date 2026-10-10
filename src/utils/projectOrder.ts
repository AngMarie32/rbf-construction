/** Keep selectable open projects ahead of completed/closed ones, then order by name. */
export function sortProjectsOpenFirst<T extends { name: string; status?: string | null }>(projects: T[]): T[] {
  const isClosed = (status?: string | null) => ['completed', 'closed'].includes((status || '').toLowerCase());
  return [...projects].sort((a, b) =>
    Number(isClosed(a.status)) - Number(isClosed(b.status)) ||
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}