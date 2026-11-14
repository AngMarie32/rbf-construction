import { supabase } from '@/integrations/supabase/client';

/**
 * The company logo for PDFs (proposals, pay apps, reports...): the one uploaded in Settings → Company,
 * falling back to the built-in logo only when none has been uploaded. Cached per URL, so a new upload
 * is picked up the next time a PDF is made (no reload needed).
 */
const cache = new Map<string, string>();
const FALLBACK = '/images/rbf-logo.png';

async function toDataUrl(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url)!;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) return null;
  // PDFs embed the logo as PNG, so JPG / WebP / SVG uploads are converted (transparency kept).
  const dataUrl = await new Promise<string | null>((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, 1200 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 600) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 300) * scale));
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
  if (dataUrl) cache.set(url, dataUrl);
  return dataUrl;
}

/** Newest logo saved in Settings (there can be more than one company_settings row). */
export async function currentLogoUrl(): Promise<string | null> {
  const { data } = await supabase.from('company_settings').select('*');
  const rows = ((data as any[]) || [])
    .filter((r) => r.logo_url)
    // Uploads are named company-logo-<timestamp>.<ext>, so the newest upload wins; otherwise newest row.
    .sort((a, b) => {
      const ts = (r: any) => Number(/company-logo-(\d{10,})/.exec(String(r.logo_url))?.[1]) || 0;
      return ts(b) - ts(a) || String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
    });
  return rows[0]?.logo_url || null;
}

export async function loadLogoAsDataUrl(): Promise<string | null> {
  try {
    const url = await currentLogoUrl();
    if (url) {
      const uploaded = await toDataUrl(url).catch(() => null);
      if (uploaded) return uploaded;
    }
  } catch {
    /* fall back below */
  }
  try {
    return await toDataUrl(FALLBACK);
  } catch {
    return null;
  }
}
