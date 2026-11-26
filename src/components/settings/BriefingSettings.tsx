import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { loadBriefingPrefs, saveBriefingPrefs } from '@/lib/briefingPrefs';

export function BriefingSettings() {
  const [prefs, setPrefs] = useState(() => loadBriefingPrefs());
  const set = (patch: Partial<typeof prefs>) => { const p = { ...prefs, ...patch }; setPrefs(p); saveBriefingPrefs(p); };
  return (
    <Card>
      <CardHeader><CardTitle>Morning Briefing</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Show Morning Briefing</div>
            <div className="text-xs text-muted-foreground">Turning this off hides the Briefing button and the daily pop-up.</div>
          </div>
          <Switch checked={prefs.enabled} onCheckedChange={(v) => set({ enabled: v })} aria-label="Show Morning Briefing" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">Pop up automatically on first visit each day</div>
          <Switch checked={prefs.autoOpen} disabled={!prefs.enabled} onCheckedChange={(v) => set({ autoOpen: v })} aria-label="Auto open" />
        </div>
        <p className="text-xs text-muted-foreground">Choose which sections appear using Customize inside the briefing.</p>
      </CardContent>
    </Card>
  );
}
