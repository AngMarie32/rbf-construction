import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { navGroups } from '@/components/layout/navigation';
import { LOCKED_NAV, saveHiddenNav, useHiddenNav } from '@/hooks/useHiddenNav';

/** Admin-only: choose which pages appear in the left menu for everyone in the company. */
export function MenuVisibilitySettings() {
  const saved = useHiddenNav();
  const [hidden, setHidden] = useState<string[]>(saved);
  const [saving, setSaving] = useState(false);

  useEffect(() => setHidden(saved), [saved]);

  const dirty = [...hidden].sort().join('|') !== [...saved].sort().join('|');
  const toggle = (href: string, show: boolean) => setHidden((h) => (show ? h.filter((x) => x !== href) : [...h, href]));
  const setGroup = (hrefs: string[], show: boolean) =>
    setHidden((h) => (show ? h.filter((x) => !hrefs.includes(x)) : [...new Set([...h, ...hrefs.filter((x) => !LOCKED_NAV.includes(x))])]));

  const save = async () => {
    setSaving(true);
    try {
      await saveHiddenNav(hidden);
      toast.success(hidden.length ? `${hidden.length} page${hidden.length === 1 ? '' : 's'} hidden from the menu` : 'All pages are showing in the menu');
    } catch (e: any) {
      toast.error(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5" /> Menu pages
        </CardTitle>
        <CardDescription>
          Turn off pages you don't use. They disappear from the left menu and the search bar for everyone in the company.
          Hidden pages still work from links elsewhere in the app, and nothing is deleted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {navGroups.map((group) => {
          const hrefs = group.items.map((i) => i.href);
          const shown = hrefs.filter((h) => !hidden.includes(h)).length;
          return (
            <div key={group.label} className="rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                <p className="text-sm font-semibold">
                  {group.label} <span className="font-normal text-muted-foreground">· {shown} of {hrefs.length} showing</span>
                </p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setGroup(hrefs, true)}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> Show all
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setGroup(hrefs, false)}>
                    <EyeOff className="mr-1 h-3.5 w-3.5" /> Hide all
                  </Button>
                </div>
              </div>
              <ul className="divide-y">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const locked = LOCKED_NAV.includes(item.href);
                  const on = !hidden.includes(item.href);
                  return (
                    <li key={item.href} className="flex items-center justify-between px-4 py-2.5">
                      <label htmlFor={`nav-${item.href}`} className={on ? 'flex items-center gap-3 text-sm' : 'flex items-center gap-3 text-sm text-muted-foreground line-through'}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.name}
                        {locked && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground no-underline">
                            <Lock className="h-3 w-3" /> always shown
                          </span>
                        )}
                      </label>
                      <Switch id={`nav-${item.href}`} checked={on} disabled={locked} onCheckedChange={(v) => toggle(item.href, v)} />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        <div className="flex items-center justify-end gap-2">
          {dirty && (
            <Button variant="ghost" onClick={() => setHidden(saved)} disabled={saving}>
              Undo changes
            </Button>
          )}
          <Button onClick={save} disabled={!dirty || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save menu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
