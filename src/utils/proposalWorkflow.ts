import { supabase } from '@/integrations/supabase/client';

export interface WorkflowProposalItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface ProposalForSov {
  id: string;
  project_id: string;
  project_name: string;
  proposal_items: unknown;
}

export function proposalItemsFromBid(bidItems: any[]): WorkflowProposalItem[] {
  return bidItems
    .filter((item) => item.description?.trim())
    .map((item, index) => {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = (Number(item.unit_cost) || 0) * (1 + (Number(item.markup_pct) || 0) / 100);
      return {
        id: String(item.id || index + 1),
        description: item.description,
        quantity,
        unit: item.unit || 'each',
        unitPrice,
        total: quantity * unitPrice,
      };
    });
}

export async function createProposalFromBid(projectId: string, bidItems: any[]) {
  const proposalItems = proposalItemsFromBid(bidItems);
  if (!proposalItems.length) throw new Error('Add at least one bid line before creating a proposal.');

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, client, address')
    .eq('id', projectId)
    .single();
  if (projectError) throw projectError;
  if (!project.client) throw new Error('Add a client to this project before creating its proposal.');

  const { data, error } = await supabase
    .from('proposals')
    .insert({
      project_id: projectId,
      project_name: project.name,
      client: project.client,
      project_address: project.address,
      amount: proposalItems.reduce((sum, item) => sum + item.total, 0),
      status: 'Draft',
      valid_days: 30,
      proposal_items: proposalItems as any,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

/** Create or update the SOV lines tied to a proposal without touching billed progress. */
export async function syncProposalToSov(proposal: ProposalForSov) {
  const items = (Array.isArray(proposal.proposal_items) ? proposal.proposal_items : []) as any[];
  const lines = items.filter((item) => String(item.description || '').trim() || Number(item.total));
  if (!lines.length) throw new Error('This proposal has no lines to send to the Schedule of Values.');

  const { data: existing, error: existingError } = await supabase
    .from('sov_items')
    .select('id, item_number, total_completed_and_stored, project_id')
    .eq('source_proposal_id', proposal.id)
    .order('item_number');
  if (existingError) throw existingError;

  const rows = existing || [];
  const sameProject = rows.filter((row) => row.project_id === proposal.project_id);
  for (const row of rows.filter((row) => row.project_id !== proposal.project_id)) {
    if (!Number(row.total_completed_and_stored)) {
      const { error } = await supabase.from('sov_items').delete().eq('id', row.id);
      if (error) throw error;
    }
  }

  const { data: projectLines, error: projectLinesError } = await supabase
    .from('sov_items')
    .select('item_number')
    .eq('project_id', proposal.project_id);
  if (projectLinesError) throw projectLinesError;
  let next = Math.max(0, ...(projectLines || []).map((row) => parseInt(row.item_number, 10) || 0)) + 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fields = {
      category: 'Proposal',
      subcategory: proposal.project_name,
      description: line.description || `Line ${i + 1}`,
      scheduled_value: Number(line.total) || 0,
    };
    if (sameProject[i]) {
      const { error } = await supabase.from('sov_items').update(fields).eq('id', sameProject[i].id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('sov_items').insert({
        ...fields,
        project_id: proposal.project_id,
        item_number: String(next++).padStart(3, '0'),
        source_proposal_id: proposal.id,
      });
      if (error) throw error;
    }
  }

  for (const row of sameProject.slice(lines.length)) {
    if (!Number(row.total_completed_and_stored)) {
      const { error } = await supabase.from('sov_items').delete().eq('id', row.id);
      if (error) throw error;
    }
  }

  const { error: syncedError } = await supabase
    .from('proposals')
    .update({ sov_synced_at: new Date().toISOString() })
    .eq('id', proposal.id);
  if (syncedError) throw syncedError;
  return lines.length;
}

const hasProgress = (row: any) =>
  (Number(row.previous_applications) || 0) + (Number(row.this_period) || 0) + (Number(row.materials_stored) || 0) > 0;

/** How many SOV lines a project already has, and how many have billed progress. */
export async function sovLineCounts(projectId: string) {
  const { data, error } = await supabase
    .from('sov_items')
    .select('id, previous_applications, this_period, materials_stored')
    .eq('project_id', projectId);
  if (error) throw error;
  const rows = data || [];
  return { total: rows.length, billed: rows.filter(hasProgress).length };
}

/**
 * Turn the project's saved bid lines into Schedule of Values lines.
 * With `replace`, lines that have no billed progress are removed first, so
 * re-sending an updated bid doesn't create duplicates; billed lines are kept.
 */
export async function sendBidToSov(projectId: string, { replace = true }: { replace?: boolean } = {}) {
  const { data: bid, error: bidError } = await supabase
    .from('bid_items')
    .select('*')
    .eq('project_id', projectId)
    .order('category');
  if (bidError) throw bidError;
  const lines = (bid || []).filter((b: any) => String(b.description || '').trim() || Number(b.unit_cost));
  if (!lines.length) throw new Error('Save at least one bid line before sending it to the Schedule of Values.');

  const { data: existing, error: existingError } = await supabase
    .from('sov_items')
    .select('id, item_number, previous_applications, this_period, materials_stored')
    .eq('project_id', projectId);
  if (existingError) throw existingError;

  let keep = existing || [];
  if (replace) {
    const removable = keep.filter((r) => !hasProgress(r)).map((r) => r.id);
    if (removable.length) {
      const { error } = await supabase.from('sov_items').delete().in('id', removable);
      if (error) throw error;
    }
    keep = keep.filter(hasProgress);
  }

  let next = Math.max(0, ...keep.map((r) => parseInt(r.item_number, 10) || 0)) + 1;
  const rows = lines.map((b: any) => ({
    project_id: projectId,
    item_number: String(next++).padStart(3, '0'),
    category: b.category || 'General',
    subcategory: b.subcategory || null,
    description: b.description || b.category || 'Bid line',
    scheduled_value:
      Math.round(
        (b.total != null && Number(b.total)
          ? Number(b.total)
          : (Number(b.unit_cost) || 0) * (Number(b.quantity) || 1) * (1 + (Number(b.markup_pct) || 0) / 100)) * 100
      ) / 100,
    previous_applications: 0,
    this_period: 0,
    materials_stored: 0,
    percent_complete: 0,
    change_orders: 0,
    retainage_percentage: 10,
  }));
  const { error } = await supabase.from('sov_items').insert(rows);
  if (error) throw error;
  return { added: rows.length, kept: keep.length };
}
