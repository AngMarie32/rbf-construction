import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Credit { title: string; artist: string; license: string; source: string }

/** Attribution for the free-license stock equipment photos (required by CC BY / CC BY-SA). */
export function StockPhotoCredits() {
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState<Record<string, Credit>>({});

  useEffect(() => {
    if (!open) return;
    fetch('/equipment/credits.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setCredits)
      .catch(() => setCredits({}));
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
        Stock photo credits
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Stock photo credits</DialogTitle>
            <DialogDescription>
              Units without their own photo show a representative picture from Wikimedia Commons. Upload your own photo on any unit to replace it.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {Object.entries(credits).map(([key, c]) => (
              <li key={key} className="flex gap-3">
                <img src={`/equipment/${key}.jpg`} alt="" className="h-10 w-14 shrink-0 rounded object-cover" />
                <span className="min-w-0">
                  <a href={c.source} target="_blank" rel="noreferrer" className="block truncate font-medium hover:text-primary">
                    {c.title.replace(/^File:/, '')}
                  </a>
                  <span className="block truncate text-xs text-muted-foreground">{c.artist} · {c.license}</span>
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
