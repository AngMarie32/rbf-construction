/**
 * Trades the estimator can be told to leave out. Each has the words that identify its cost lines,
 * used both in the AI instructions and to strip any line that slips through anyway.
 */
export interface Trade {
  id: string;
  label: string;
  group: 'Site & civil' | 'Site utilities' | 'Building';
  keywords: string[];
}

export const TRADES: Trade[] = [
  { id: 'demo', label: 'Demolition & clearing', group: 'Site & civil', keywords: ['demolition', 'demo', 'clearing', 'grubbing', 'tree removal', 'removals'] },
  { id: 'earthwork', label: 'Earthwork & grading', group: 'Site & civil', keywords: ['earthwork', 'excavation', 'grading', 'cut and fill', 'cut/fill', 'fill', 'topsoil', 'undercut', 'subgrade', 'aggregate base', 'compaction'] },
  { id: 'asphalt', label: 'Asphalt paving', group: 'Site & civil', keywords: ['asphalt', 'bituminous', 'hma', 'hot mix', 'blacktop', 'milling', 'sealcoat', 'seal coat'] },
  { id: 'concrete', label: 'Concrete (flatwork, curb, foundations, slabs)', group: 'Site & civil', keywords: ['concrete', 'curb', 'gutter', 'sidewalk', 'flatwork', 'slab', 'footing', 'foundation', 'apron', 'dumpster pad', 'cast-in-place', 'cip', 'rebar', 'reinforcing'] },
  { id: 'striping', label: 'Striping & signage', group: 'Site & civil', keywords: ['striping', 'pavement marking', 'pavement markings', 'signage', 'sign', 'signs', 'bollard', 'bollards', 'wheel stop', 'wheel stops'] },
  { id: 'landscape', label: 'Landscaping & irrigation', group: 'Site & civil', keywords: ['landscape', 'landscaping', 'irrigation', 'sod', 'seed', 'seeding', 'mulch', 'trees', 'shrubs', 'planting', 'restoration'] },
  { id: 'fence', label: 'Fencing & gates', group: 'Site & civil', keywords: ['fence', 'fencing', 'gate', 'gates', 'screen wall', 'dumpster enclosure'] },
  { id: 'erosion', label: 'Erosion control (SESC)', group: 'Site & civil', keywords: ['erosion', 'sesc', 'silt fence', 'inlet protection', 'construction entrance', 'swppp'] },
  { id: 'retaining', label: 'Retaining walls', group: 'Site & civil', keywords: ['retaining wall', 'retaining walls', 'segmental wall', 'modular block wall'] },
  { id: 'sitelighting', label: 'Site lighting', group: 'Site & civil', keywords: ['site lighting', 'light pole', 'light poles', 'pole base', 'pole bases', 'parking lot lighting'] },
  { id: 'storm', label: 'Storm sewer & detention', group: 'Site utilities', keywords: ['storm', 'detention', 'retention', 'catch basin', 'catch basins', 'culvert', 'drainage', 'underdrain', 'outlet structure'] },
  { id: 'sanitary', label: 'Sanitary sewer', group: 'Site utilities', keywords: ['sanitary', 'sewer lead', 'sewer', 'grease interceptor', 'grease trap', 'lift station', 'cleanout', 'cleanouts'] },
  { id: 'water', label: 'Water main & service', group: 'Site utilities', keywords: ['water main', 'water service', 'watermain', 'hydrant', 'hydrants', 'tapping', 'domestic water service', 'fire service', 'backflow'] },
  { id: 'dryutil', label: 'Gas, electric & telecom service', group: 'Site utilities', keywords: ['gas service', 'gas line', 'electrical service', 'primary electric', 'transformer pad', 'duct bank', 'conduit bank', 'telecom', 'fiber'] },
  { id: 'fuel', label: 'Fuel system & canopy', group: 'Site utilities', keywords: ['fuel', 'ust', 'underground storage tank', 'dispenser', 'dispensers', 'canopy', 'fuel piping'] },
  { id: 'masonry', label: 'Masonry', group: 'Building', keywords: ['masonry', 'cmu', 'block', 'brick', 'stone veneer', 'veneer'] },
  { id: 'steel', label: 'Structural steel & joists', group: 'Building', keywords: ['structural steel', 'steel', 'joist', 'joists', 'metal deck', 'decking', 'misc metals', 'miscellaneous metals'] },
  { id: 'carpentry', label: 'Framing & carpentry', group: 'Building', keywords: ['framing', 'carpentry', 'trusses', 'sheathing', 'blocking', 'millwork', 'casework'] },
  { id: 'roofing', label: 'Roofing & sheet metal', group: 'Building', keywords: ['roof', 'roofing', 'membrane', 'tpo', 'epdm', 'flashing', 'gutters', 'downspouts', 'coping', 'sheet metal'] },
  { id: 'openings', label: 'Doors, windows & storefront', group: 'Building', keywords: ['door', 'doors', 'window', 'windows', 'storefront', 'glazing', 'glass', 'hardware', 'overhead door'] },
  { id: 'drywall', label: 'Drywall & ceilings', group: 'Building', keywords: ['drywall', 'gypsum', 'metal stud', 'metal studs', 'ceiling', 'ceilings', 'act', 'acoustical'] },
  { id: 'flooring', label: 'Flooring & tile', group: 'Building', keywords: ['flooring', 'tile', 'vct', 'lvt', 'carpet', 'epoxy floor', 'quarry tile', 'frp'] },
  { id: 'painting', label: 'Painting & coatings', group: 'Building', keywords: ['paint', 'painting', 'coating', 'coatings', 'wall covering'] },
  { id: 'specialties', label: 'Specialties & equipment', group: 'Building', keywords: ['specialties', 'toilet accessories', 'toilet partitions', 'fire extinguisher', 'lockers', 'food service equipment', 'kitchen equipment', 'walk-in cooler', 'walk-in freezer'] },
  { id: 'plumbing', label: 'Plumbing', group: 'Building', keywords: ['plumbing', 'fixtures', 'water heater', 'domestic water piping', 'sanitary piping', 'gas piping'] },
  { id: 'hvac', label: 'HVAC / mechanical', group: 'Building', keywords: ['hvac', 'mechanical', 'rtu', 'rooftop unit', 'ductwork', 'exhaust', 'refrigeration'] },
  { id: 'electrical', label: 'Electrical (building)', group: 'Building', keywords: ['electrical', 'lighting', 'panel', 'switchgear', 'branch wiring', 'low voltage', 'fire alarm'] },
  { id: 'fireprot', label: 'Fire sprinkler', group: 'Building', keywords: ['sprinkler', 'fire protection', 'fire suppression'] },
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const wordRe = (k: string) => new RegExp(`(^|[^a-z0-9])${esc(k.toLowerCase())}($|[^a-z0-9])`);

/** The trade a cost line belongs to, if it is one of the excluded ones. */
export function excludedTradeOf(line: { section_name?: string | null; name?: string | null }, excluded: Pick<Trade, 'label' | 'keywords'>[]) {
  const text = `${line.section_name || ''} ${line.name || ''}`.toLowerCase();
  return excluded.find((t) => [t.label, ...t.keywords].some((k) => wordRe(k).test(text)));
}

/** Trades the notes say to leave out, e.g. "no concrete or asphalt", "exclude landscaping", "paving by others". */
export function tradesFromNotes(notes: string): Trade[] {
  const n = ` ${notes.toLowerCase()} `;
  const phrases: string[] = [];
  const re = /\b(?:exclud(?:e|es|ed|ing)|not includ(?:e|ing)|do not (?:price|include|estimate)|don'?t (?:price|include|estimate)|without|leave out|omit|no)\s*[:\-]?\s*([^.;\n]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(n))) phrases.push(m[1]);
  const byOthers = /([^.;\n,]+?)\s+(?:by others|by owner|owner (?:supplied|provided)|nic|n\.i\.c\.)/g;
  while ((m = byOthers.exec(n))) phrases.push(m[1]);
  if (!phrases.length) return [];
  const text = phrases.join(' , ');
  return TRADES.filter((t) => [t.label.toLowerCase(), ...t.keywords].some((k) => wordRe(k).test(text)));
}
