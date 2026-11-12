export const BOND_TYPES = ['Bid', 'Performance', 'Payment', 'Performance & Payment', 'Maintenance', 'License', 'Other'] as const;
export const BOND_STATUSES = ['Requested', 'Active', 'Released', 'Expired'] as const;

/** A row in `project_bonds` (dates are ISO yyyy-mm-dd strings). */
export interface Bond {
  id: string;
  project_id: string;
  bond_type: string;
  bond_number: string | null;
  surety: string | null;
  obligee: string | null;
  amount: number;
  premium: number | null;
  premium_paid: boolean;
  status: string;
  effective_date: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  projects?: { name: string; contract_value?: number | null; status?: string | null; client?: string | null } | null;
}

export interface BondCapacity {
  single: number;
  aggregate: number;
  surety?: string | null;
  agent?: string | null;
  agentEmail?: string | null;
  agentPhone?: string | null;
}

/**
 * Bonded work that counts against capacity: active (or requested) performance/payment bonds.
 * Bid, license and maintenance bonds don't use program capacity; a "Performance & Payment"
 * bond counts once; separate Performance and Payment bonds on the same job count once (the larger).
 */
export function bondedExposure(bonds: Bond[]) {
  const byJob = new Map<string, number>();
  for (const b of bonds) {
    if (!['Active', 'Requested'].includes(b.status)) continue;
    if (!['Performance', 'Payment', 'Performance & Payment'].includes(b.bond_type)) continue;
    byJob.set(b.project_id, Math.max(byJob.get(b.project_id) || 0, Number(b.amount) || 0));
  }
  return { total: [...byJob.values()].reduce((a, b) => a + b, 0), byJob };
}

export async function loadBondCapacity(supabase: any): Promise<BondCapacity> {
  const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
  return {
    single: Number(data?.bond_capacity_single) || 0,
    aggregate: Number(data?.bond_capacity_aggregate) || 0,
    surety: data?.surety_company ?? null,
    agent: data?.surety_agent ?? null,
    agentEmail: data?.surety_agent_email ?? null,
    agentPhone: data?.surety_agent_phone ?? null,
  };
}
