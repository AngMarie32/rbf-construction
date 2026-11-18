/** Parse a stored YYYY-MM-DD proposal date without shifting it through UTC. */
export function parseProposalDate(value?: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
    ? date
    : null;
}

/** An exact valid-through date takes precedence over the legacy number-of-days setting. */
export function resolveProposalValidUntil(createdAt: Date, validDays: number, validUntil?: string | null): Date {
  const exact = parseProposalDate(validUntil);
  if (exact) return exact;
  const result = new Date(createdAt);
  result.setDate(result.getDate() + validDays);
  return result;
}
