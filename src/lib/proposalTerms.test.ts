import { describe, expect, it } from 'bun:test';
import { resolveProposalTerms } from './proposalSettings';

const vars = { company: 'RBF Construction', project: 'Maple Street Deck', days: 30 };

describe('proposal terms for the PDF', () => {
  it('returns nothing when the proposal and the company wording both have no terms', () => {
    expect(resolveProposalTerms([], [], vars)).toEqual([]);
    expect(resolveProposalTerms(undefined, [], vars)).toEqual([]);
  });

  it('drops blank and whitespace-only terms so an empty section is not printed', () => {
    expect(resolveProposalTerms(undefined, ['', '   ', '\t\n'], vars)).toEqual([]);
  });

  it('uses the proposal\'s own terms when it has them', () => {
    expect(resolveProposalTerms(['Deposit due on signing'], ['Company default'], vars)).toEqual([
      'Deposit due on signing',
    ]);
  });

  it('falls back to the company-wide terms and fills the placeholders', () => {
    expect(resolveProposalTerms([], ['Valid for {days} days for {project} by {company}'], vars)).toEqual([
      'Valid for 30 days for Maple Street Deck by RBF Construction',
    ]);
  });

  it('keeps real terms alongside blanks', () => {
    expect(resolveProposalTerms(undefined, ['', 'Permits obtained by contractor', '  '], vars)).toEqual([
      'Permits obtained by contractor',
    ]);
  });
});
