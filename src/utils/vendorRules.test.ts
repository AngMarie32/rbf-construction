import { describe, expect, it } from 'bun:test';
import { applyVendorRules, vendorRuleKey, type VendorRule, type VendorRuleLine } from './vendorRules';

const rule: VendorRule = {
  key: 'abc supply',
  vendorName: 'ABC Supply',
  destination: 'project_cost',
  projectId: 'project-123',
  costCodeId: 'code-456',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const line: VendorRuleLine = {
  account: 'ABC Supply',
  vendor: '',
  destination: 'operating',
  projectId: null,
  costCodeId: null,
};

describe('vendor import rules', () => {
  it('fills destination, project, and cost code for a remembered line name', () => {
    const [result] = applyVendorRules([line], [rule]);
    expect(result.destination).toBe('project_cost');
    expect(result.projectId).toBe('project-123');
    expect(result.costCodeId).toBe('code-456');
  });

  it('matches the vendor column when the line name differs and ignores unrelated lines', () => {
    const lines = [
      { ...line, account: 'Materials', vendor: ' abc   supply ' },
      { ...line, account: 'Other vendor' },
    ];
    const result = applyVendorRules(lines, [rule]);
    expect(result[0].projectId).toBe('project-123');
    expect(result[1]).toEqual(lines[1]);
  });

  it('normalizes capitalization and repeated spaces', () => {
    expect(vendorRuleKey('  ABC   Supply ')).toBe('abc supply');
  });
});
