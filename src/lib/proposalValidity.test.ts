import { describe, expect, it } from 'bun:test';
import { parseProposalDate, resolveProposalValidUntil } from './proposalValidity';

describe('proposal validity date', () => {
  const createdAt = new Date(2026, 10, 18);

  it('uses the exact valid-through date when one is chosen', () => {
    expect(resolveProposalValidUntil(createdAt, 30, '2026-12-31')).toEqual(new Date(2026, 11, 31));
  });

  it('keeps using the number of valid days when no exact date is chosen', () => {
    expect(resolveProposalValidUntil(createdAt, 30, null)).toEqual(new Date(2026, 11, 18));
  });

  it('parses calendar dates as local dates rather than shifting them through UTC', () => {
    expect(parseProposalDate('2026-11-30')).toEqual(new Date(2026, 10, 30));
  });
});
