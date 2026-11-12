import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronsLeft, ChevronsRight, FolderKanban } from 'lucide-react';
import { getRecentProjects, onRecentProjectsChange, type RecentProject } from '@/utils/recentProjects';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { navGroups as allNavGroups, isActivePath } from './navigation';
import { useHiddenNav } from '@/hooks/useHiddenNav';

interface SidebarProps {
  onNavigate?: (path: string) => void;
  /** Mobile drawer mode: always expanded, no collapse control, no sticky positioning. */
  mobile?: boolean;
}

const COLLAPSE_KEY = 'rbf.sidebar.collapsed';
const GROUPS_KEY = 'rbf.sidebar.groups';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function Sidebar({ onNavigate, mobile = false }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsedPref, setCollapsedPref] = useState<boolean>(() => readStorage(COLLAPSE_KEY, false));
  const collapsed = !mobile && collapsedPref;
  const hiddenNav = useHiddenNav();
  const navGroups = allNavGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => !hiddenNav.includes(i.href)) }))
    .filter((g) => g.items.length > 0);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    readStorage(GROUPS_KEY, { Overview: true, 'Quick Access': true })
  );

  // Always expand the group that contains the current page.
  useEffect(() => {
    const active = navGroups.find((g) => g.items.some((i) => isActivePath(location.pathname, i.href)));
    if (active && !openGroups[active.label]) {
      setOpenGroups((prev) => ({ ...prev, [active.label]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => writeStorage(GROUPS_KEY, openGroups), [openGroups]);

  const [recent, setRecent] = useState<RecentProject[]>(() => getRecentProjects());
  useEffect(() => onRecentProjectsChange(() => setRecent(getRecentProjects())), []);

  const toggleCollapsed = () => {
    setCollapsedPref((c) => {
      writeStorage(COLLAPSE_KEY, !c);
      return !c;
    });
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleItemClick = (href: string) => {
    navigate(href);
    onNavigate?.(href);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          'h-screen flex flex-col flex-shrink-0 glass-sidebar transition-[width] duration-300',
          mobile ? 'w-full' : 'sticky top-0 hidden lg:flex',
          !mobile && (collapsed ? 'w-[68px]' : 'w-[248px]')
        )}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className={cn('flex items-center gap-3 h-16 px-4 border-b border-white/10', collapsed && 'justify-center px-0')}>
          <button
            onClick={() => handleItemClick('/dashboard')}
            className="flex items-center gap-3 min-w-0"
            aria-label="Go to dashboard"
          >
            {collapsed && (
              <span className="font-display text-sm font-extrabold tracking-tight text-sidebar-foreground">RBF</span>
            )}
            {!collapsed && (
              <span className="flex flex-col leading-tight text-left">
                <span className="font-display font-extrabold text-[15px] text-sidebar-foreground tracking-tight">RBF Construction</span>
                <span className="text-[11px] text-sidebar-foreground/50">Operations Hub</span>
              </span>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {!collapsed && recent.length > 0 && (
            <div className="mb-2">
              <div className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">Recent jobs</div>
              <ul className="space-y-0.5 px-3">
                {recent.map((p) => {
                  const active = location.pathname === `/projects/${p.id}`;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => handleItemClick(`/projects/${p.id}`)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-left transition-colors',
                          active ? 'nav-active text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        <FolderKanban className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-accent' : 'text-sidebar-foreground/50')} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mx-5 mt-3 h-px bg-sidebar-foreground/10" />
            </div>
          )}
          {navGroups.map((group) => {
            const groupActive = group.items.some((i) => isActivePath(location.pathname, i.href));
            const isOpen = collapsed || openGroups[group.label];
            return (
              <div key={group.label} className={cn('mb-1', collapsed && 'mb-2')}>
                {collapsed ? (
                  <div className="mx-auto my-2 h-px w-8 bg-sidebar-foreground/10 first:hidden" />
                ) : (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={isOpen}
                    className={cn(
                      'w-full flex items-center justify-between px-5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                      groupActive ? 'text-accent' : 'text-sidebar-foreground/45 hover:text-sidebar-foreground/80'
                    )}
                  >
                    {group.label}
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', !isOpen && '-rotate-90')} />
                  </button>
                )}

                {isOpen && (
                  <ul className={cn('space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActivePath(location.pathname, item.href);
                      const button = (
                        <button
                          onClick={() => handleItemClick(item.href)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'group w-full flex items-center gap-3 rounded-lg text-[13.5px] font-medium transition-all duration-150 text-left',
                            collapsed ? 'justify-center h-10' : 'px-3 py-2',
                            active
                              ? 'nav-active text-sidebar-foreground'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-[18px] w-[18px] shrink-0 transition-colors',
                              active ? 'text-accent' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
                            )}
                          />
                          {!collapsed && <span className="truncate">{item.name}</span>}
                        </button>
                      );
                      return (
                        <li key={item.href}>
                          {collapsed ? (
                            <Tooltip>
                              <TooltipTrigger asChild>{button}</TooltipTrigger>
                              <TooltipContent side="right">{item.name}</TooltipContent>
                            </Tooltip>
                          ) : (
                            button
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse control */}
        {!mobile && (
          <div className="border-t border-white/10 p-3">
            <button
              onClick={toggleCollapsed}
              className={cn(
                'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors',
                collapsed && 'justify-center px-0'
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
            </button>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
