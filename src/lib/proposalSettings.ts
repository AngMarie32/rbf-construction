import { supabase } from '@/integrations/supabase/client';

/**
 * Company-wide proposal wording, edited in Settings → Proposals and stored in app_settings
 * (key "proposal_settings"). Used by the proposal PDF, the proposal view and the bid proposal export.
 * {company}, {project} and {days} are filled in when a proposal is made.
 */
export interface ProposalSettings {
  intro: string;
  terms: string[];
  validDays: number;
  acceptance: string;
}

export const DEFAULT_PROPOSAL_SETTINGS: ProposalSettings = {
  intro: '{company} is pleased to submit this proposal for {project}. The price below is the total for the scope of work described in this proposal.',
  terms: [
    'This proposal is valid for {days} days from the date above.',
    'Payment terms: 50% deposit to schedule the work, with the balance due upon completion.',
    'All materials will be of good quality and installed in a workmanlike manner according to standard practice.',
    'Any change to this scope of work must be agreed in writing and may change the price and schedule.',
    'Contractor will obtain the permits required for the work described above.',
    'Work areas will be kept orderly and debris removed on a regular basis.',
    'This proposal becomes a binding agreement when signed by both parties.',
  ],
  validDays: 30,
  acceptance:
    'The above price, scope and conditions are satisfactory and are hereby accepted. The contractor is authorized to do the work as specified, and payment will be made as outlined above.',
};

const KEY = 'proposal_settings';

export async function loadProposalSettings(): Promise<ProposalSettings> {
  try {
    const { data, error } = await (supabase as any).from('app_settings').select('value').eq('key', KEY).maybeSingle();
    if (error || !data?.value) return DEFAULT_PROPOSAL_SETTINGS;
    const v = data.value as Partial<ProposalSettings>;
    return {
      intro: typeof v.intro === 'string' ? v.intro : DEFAULT_PROPOSAL_SETTINGS.intro,
      terms: Array.isArray(v.terms) ? v.terms.map(String).filter((t) => t.trim()) : DEFAULT_PROPOSAL_SETTINGS.terms,
      validDays: Number(v.validDays) > 0 ? Number(v.validDays) : DEFAULT_PROPOSAL_SETTINGS.validDays,
      acceptance: typeof v.acceptance === 'string' && v.acceptance.trim() ? v.acceptance : DEFAULT_PROPOSAL_SETTINGS.acceptance,
    };
  } catch {
    return DEFAULT_PROPOSAL_SETTINGS;
  }
}

export async function saveProposalSettings(s: ProposalSettings) {
  const { data, error } = await (supabase as any)
    .from('app_settings')
    .upsert({ key: KEY, value: s, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select('key');
  if (error) {
    throw new Error(
      /app_settings|schema cache|does not exist/i.test(error.message)
        ? 'The database needs the "app settings" update (the same SQL as the menu visibility fix) before proposal wording can be saved.'
        : error.message
    );
  }
  if (!data?.length) throw new Error("Proposal settings weren't saved. Your account may not have permission to change settings.");
}

/** Fills {company}, {project} and {days}. */
export const fillProposalText = (text: string, vars: { company?: string; project?: string; days?: number }) =>
  text
    .replace(/\{company\}/g, vars.company || 'We')
    .replace(/\{project\}/g, vars.project || 'this project')
    .replace(/\{days\}/g, String(vars.days ?? 30));

/**
 * The terms a proposal should show: its own terms when it has them, otherwise the
 * company-wide wording. Blank entries are dropped, so an empty result means there is
 * nothing to show and the proposal PDF leaves the Terms and conditions section out.
 */
export const resolveProposalTerms = (
  proposalTerms: string[] | undefined,
  wordingTerms: string[],
  vars: { company?: string; project?: string; days?: number }
) =>
  (proposalTerms?.length ? proposalTerms : wordingTerms)
    .map((t) => fillProposalText(t, vars))
    .filter((t) => t.trim());
