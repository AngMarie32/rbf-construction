export interface SeedCostCode {
  code: string;
  name: string;
  division: string;
  /** words that commonly appear in QuickBooks account / item / memo text for this code */
  keywords: string[];
}

export const CSI_COST_CODES: SeedCostCode[] = [
  { code: '01-100', name: 'General Requirements', division: '01 - General Requirements', keywords: ['general', 'overhead', 'supervision', 'project management', 'admin'] },
  { code: '01-200', name: 'Permits & Fees', division: '01 - General Requirements', keywords: ['permit', 'fee', 'inspection', 'license'] },
  { code: '01-300', name: 'Temporary Facilities', division: '01 - General Requirements', keywords: ['temporary', 'portable', 'toilet', 'fence', 'dumpster', 'trash', 'debris'] },
  { code: '01-400', name: 'Equipment Rental', division: '01 - General Requirements', keywords: ['rental', 'rent', 'lift', 'scissor', 'boom', 'excavator', 'united rentals', 'sunbelt', 'herc'] },
  { code: '02-100', name: 'Demolition', division: '02 - Existing Conditions', keywords: ['demo', 'demolition', 'removal', 'abatement'] },
  { code: '03-100', name: 'Concrete', division: '03 - Concrete', keywords: ['concrete', 'ready mix', 'rebar', 'slab', 'footing', 'formwork'] },
  { code: '04-100', name: 'Masonry', division: '04 - Masonry', keywords: ['masonry', 'block', 'brick', 'cmu', 'mortar', 'stone'] },
  { code: '05-100', name: 'Structural Steel', division: '05 - Metals', keywords: ['steel', 'metal', 'joist', 'deck', 'weld', 'handrail'] },
  { code: '06-100', name: 'Rough Carpentry', division: '06 - Wood & Plastics', keywords: ['lumber', 'framing', 'carpentry', 'plywood', 'truss', 'wood'] },
  { code: '06-200', name: 'Finish Carpentry & Millwork', division: '06 - Wood & Plastics', keywords: ['millwork', 'casework', 'cabinet', 'trim', 'countertop'] },
  { code: '07-100', name: 'Waterproofing & Insulation', division: '07 - Thermal & Moisture', keywords: ['waterproof', 'insulation', 'sealant', 'caulk', 'vapor'] },
  { code: '07-500', name: 'Roofing', division: '07 - Thermal & Moisture', keywords: ['roof', 'shingle', 'tpo', 'membrane', 'gutter', 'flashing'] },
  { code: '08-100', name: 'Doors & Frames', division: '08 - Openings', keywords: ['door', 'frame', 'hardware', 'hollow metal'] },
  { code: '08-500', name: 'Windows & Glazing', division: '08 - Openings', keywords: ['window', 'glass', 'glazing', 'storefront', 'curtain wall'] },
  { code: '09-200', name: 'Drywall & Framing', division: '09 - Finishes', keywords: ['drywall', 'gypsum', 'sheetrock', 'stud', 'tape', 'texture'] },
  { code: '09-300', name: 'Tile & Flooring', division: '09 - Finishes', keywords: ['tile', 'flooring', 'carpet', 'vinyl', 'lvt', 'grout', 'epoxy floor'] },
  { code: '09-500', name: 'Ceilings', division: '09 - Finishes', keywords: ['ceiling', 'acoustical', 'act', 'grid'] },
  { code: '09-900', name: 'Painting', division: '09 - Finishes', keywords: ['paint', 'coating', 'primer', 'sherwin', 'stain'] },
  { code: '10-100', name: 'Specialties', division: '10 - Specialties', keywords: ['signage', 'partition', 'locker', 'accessories', 'fire extinguisher'] },
  { code: '11-100', name: 'Equipment', division: '11 - Equipment', keywords: ['appliance', 'kitchen equipment', 'commercial equipment'] },
  { code: '12-100', name: 'Furnishings', division: '12 - Furnishings', keywords: ['furniture', 'blind', 'window treatment', 'furnishing'] },
  { code: '14-100', name: 'Conveying Systems', division: '14 - Conveying', keywords: ['elevator', 'lift system', 'escalator'] },
  { code: '21-100', name: 'Fire Suppression', division: '21 - Fire Suppression', keywords: ['fire sprinkler', 'suppression', 'fire protection'] },
  { code: '22-100', name: 'Plumbing', division: '22 - Plumbing', keywords: ['plumbing', 'plumber', 'pipe', 'fixture', 'water heater', 'ferguson'] },
  { code: '23-100', name: 'HVAC', division: '23 - HVAC', keywords: ['hvac', 'mechanical', 'duct', 'air condition', 'furnace', 'rtu'] },
  { code: '26-100', name: 'Electrical', division: '26 - Electrical', keywords: ['electric', 'electrical', 'wire', 'panel', 'lighting', 'conduit', 'rexel', 'graybar'] },
  { code: '27-100', name: 'Communications', division: '27 - Communications', keywords: ['data', 'low voltage', 'cabling', 'network', 'telecom'] },
  { code: '28-100', name: 'Security & Fire Alarm', division: '28 - Electronic Safety', keywords: ['alarm', 'security', 'camera', 'access control'] },
  { code: '31-100', name: 'Earthwork', division: '31 - Earthwork', keywords: ['excavation', 'grading', 'earthwork', 'backfill', 'dirt', 'fill'] },
  { code: '32-100', name: 'Site Improvements', division: '32 - Exterior Improvements', keywords: ['asphalt', 'paving', 'landscape', 'irrigation', 'striping', 'sidewalk'] },
  { code: '33-100', name: 'Utilities', division: '33 - Utilities', keywords: ['utility', 'sewer', 'storm', 'water main', 'gas line'] },
  { code: '99-100', name: 'Labor', division: '99 - Other', keywords: ['labor', 'payroll', 'wages', 'time card', 'burden'] },
  { code: '99-200', name: 'Materials', division: '99 - Other', keywords: ['material', 'supply', 'supplies', 'home depot', 'lowes', 'hardware'] },
  { code: '99-300', name: 'Subcontractor', division: '99 - Other', keywords: ['subcontract', 'sub', 'contractor'] },
  { code: '99-900', name: 'Uncategorized', division: '99 - Other', keywords: [] },
];
