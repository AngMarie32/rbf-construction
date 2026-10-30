import * as XLSX from 'xlsx';

export interface TakeoffLine {
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unit_cost: number;
}

const num = (v: unknown) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const FIELDS: Record<string, RegExp> = {
  description: /desc|item|name|scope|layer|block|material|element/i,
  category: /categ|division|trade|group|csi|section/i,
  quantity: /^qty|quant|count|length|area|volume|amount\s*\(qty\)/i,
  unit: /^unit$|^uom|units?\s*of|^um$/i,
  unit_cost: /unit\s*(cost|price|rate)|rate|price\/|cost\/|\$\/|^price$/i,
  total: /total|extended|ext\.?\s*(cost|price)|line\s*total|^cost$|^amount$/i,
};

/** Map header cells to field names; first match per field wins. */
export function mapHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const order = ['unit_cost', 'total', 'unit', 'quantity', 'category', 'description'];
  headers.forEach((h, i) => {
    const t = String(h ?? '').trim();
    if (!t) return;
    for (const f of order) {
      if (map[f] === undefined && FIELDS[f].test(t) && !Object.values(map).includes(i)) {
        map[f] = i;
        break;
      }
    }
  });
  return map;
}

export function rowsToTakeoff(rows: unknown[][]): TakeoffLine[] {
  // header = first row within the top 15 that maps a description plus a qty/cost column
  let hi = -1;
  let map: Record<string, number> = {};
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const m = mapHeaders((rows[i] || []).map((c) => String(c ?? '')));
    if (m.description !== undefined && (m.quantity !== undefined || m.unit_cost !== undefined || m.total !== undefined)) {
      hi = i;
      map = m;
      break;
    }
  }
  if (hi < 0) throw new Error('Could not find a header row with a description and a quantity or cost column.');
  const out: TakeoffLine[] = [];
  for (const r of rows.slice(hi + 1)) {
    const description = String(r[map.description] ?? '').trim();
    if (!description || /^(sub)?total|grand total/i.test(description)) continue;
    let quantity = map.quantity !== undefined ? num(r[map.quantity]) : 0;
    let unit_cost = map.unit_cost !== undefined ? num(r[map.unit_cost]) : 0;
    const total = map.total !== undefined ? num(r[map.total]) : 0;
    if (!quantity && !unit_cost && !total) continue;
    if (!quantity) quantity = 1;
    if (!unit_cost && total) unit_cost = total / quantity;
    out.push({
      description,
      category: (map.category !== undefined ? String(r[map.category] ?? '').trim() : '') || 'General',
      quantity,
      unit: (map.unit !== undefined ? String(r[map.unit] ?? '').trim() : '') || 'EA',
      unit_cost,
    });
  }
  return out;
}

export async function parseTakeoffFile(file: File): Promise<TakeoffLine[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  let best: TakeoffLine[] = [];
  let lastErr: Error | null = null;
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: '' });
    try {
      const lines = rowsToTakeoff(rows);
      if (lines.length > best.length) best = lines;
    } catch (e) {
      lastErr = e as Error;
    }
  }
  if (!best.length) throw lastErr || new Error('No bid lines found in this file.');
  return best;
}
