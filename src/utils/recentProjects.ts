/** Remembers the last few jobs a user opened so navigation can start from the project. */
export interface RecentProject { id: string; name: string }

const KEY = 'rbf.recentProjects';
const EVENT = 'rbf:recent-projects';
const MAX = 5;

export function getRecentProjects(): RecentProject[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((p) => p && p.id && p.name).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberProject(project: RecentProject) {
  try {
    const next = [project, ...getRecentProjects().filter((p) => p.id !== project.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage unavailable */
  }
}

export function onRecentProjectsChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
