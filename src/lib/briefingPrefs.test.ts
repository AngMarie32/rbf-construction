import { describe, expect, test } from 'bun:test';
import { DEFAULT_ORDER, moveSection, normalizePrefs, shouldAutoOpen } from './briefingPrefs';

describe('morning briefing prefs', () => {
  test('pops up once per day until reviewed', () => {
    const day = new Date(2026, 10, 26, 7);
    expect(shouldAutoOpen(normalizePrefs({}), day)).toBe(true);
    expect(shouldAutoOpen(normalizePrefs({ reviewedOn: '2026-11-26' }), day)).toBe(false);
    expect(shouldAutoOpen(normalizePrefs({ reviewedOn: '2026-11-25' }), day)).toBe(true);
  });
  test('turning off the pop-up stops it', () => {
    expect(shouldAutoOpen(normalizePrefs({ autoOpen: false }), new Date())).toBe(false);
  });
  test('disabling the briefing prevents daily opening while preserving customization', () => {
    const prefs = normalizePrefs({ enabled: false, hidden: ['exec_snapshot'], order: ['exec_receivables'] });
    expect(prefs.enabled).toBe(false);
    expect(shouldAutoOpen(prefs, new Date(2026, 10, 26, 7))).toBe(false);
    expect(prefs.hidden).toEqual(['exec_snapshot']);
    expect(prefs.order[0]).toBe('exec_receivables');
  });
  test('saved order keeps every section', () => {
    const p = normalizePrefs({ order: ['lease_expirations'] as any });
    expect(p.order[0]).toBe('lease_expirations');
    expect(p.order.length).toBe(DEFAULT_ORDER.length);
  });
  test('moving a section swaps it with its neighbor', () => {
    expect(moveSection(['tasks_today', 'inspections'], 'inspections', -1)).toEqual(['inspections', 'tasks_today']);
    expect(moveSection(DEFAULT_ORDER, 'exec_snapshot', -1)).toEqual(DEFAULT_ORDER);
  });
});
