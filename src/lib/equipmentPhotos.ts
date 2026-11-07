/**
 * Stock photos (free-license, from Wikimedia Commons) shown for equipment that has no photo of its own.
 * Files live in public/equipment/<key>.jpg; credits are in public/equipment/credits.json.
 * Matching is by keywords in the unit's name/description first, then its category.
 */
const RULES: { key: string; words: RegExp }[] = [
  { key: 'mini-excavator', words: /\bmini[-\s]?(ex|excavator)\b|compact excavator/i },
  { key: 'skid-steer', words: /skid[-\s]?steer|\bbobcat\b|\bctl\b|track loader|compact track/i },
  { key: 'backhoe', words: /backhoe|\bjcb\b/i },
  { key: 'excavator', words: /excavat|\btrackhoe\b/i },
  { key: 'bulldozer', words: /dozer/i },
  { key: 'wheel-loader', words: /wheel loader|front[-\s]?end loader|\bloader\b/i },
  { key: 'telehandler', words: /telehandler|tele[-\s]?handler|\blull\b|\bgenie gth|reach ?forklift|skytrak/i },
  { key: 'forklift', words: /forklift|fork lift|pallet jack/i },
  { key: 'scissor-lift', words: /scissor|boom lift|man ?lift|aerial lift|\bjlg\b|\bgenie\b/i },
  { key: 'crane', words: /\bcrane\b/i },
  { key: 'roller', words: /roller|compactor|plate compactor|tamper|\bvibratory\b/i },
  { key: 'mixer', words: /mixer|concrete truck/i },
  { key: 'dump-truck', words: /dump truck|dumptruck|\bdump\b(?!.*trailer)|tandem|tri[-\s]?axle|haul truck/i },
  { key: 'trailer', words: /trailer|gooseneck|lowboy|flatbed|tilt deck|\bhauler\b/i },
  { key: 'generator', words: /generator|\bgenset\b|light tower|air compressor|compressor|welder/i },
  { key: 'tractor', words: /tractor|kubota|\bmower\b|\butv\b|gator/i },
  { key: 'pickup-truck', words: /pickup|pick-up|\bf-?[1-5]50\b|silverado|sierra|\bram\b|tundra|tacoma|\btruck\b|\bvan\b/i },
];

const BY_CATEGORY: Record<string, string> = {
  'heavy machinery': 'excavator',
  trucks: 'pickup-truck',
  trailers: 'trailer',
};

export interface EquipmentLike {
  name?: string | null;
  category?: string | null;
  description?: string | null;
}

/** Returns the stock photo URL for a unit (a general construction photo when nothing more specific matches). */
export function stockPhotoFor(eq: EquipmentLike): string {
  const text = `${eq.name || ''} ${eq.description || ''}`;
  const hit = RULES.find((r) => r.words.test(text));
  const key = hit?.key || BY_CATEGORY[(eq.category || '').toLowerCase()] || 'construction-equipment';
  return `/equipment/${key}.jpg`;
}
