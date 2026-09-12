/**
 * Typed Supabase accessor for the TraderTaxHQ tables.
 *
 * `src/integrations/supabase/types.ts` is generated and will not know about the
 * tth_* tables until it is regenerated against the migration. Rather than edit a
 * generated file, this module re-types the shared client for these tables using
 * the hand-written domain types. It is the same client instance, so it carries
 * the same auth session.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';
import type {
  TthActivity,
  TthFirmDeadline,
  TthFirmProfile,
  TthLead,
  TthSecurityControl,
  TthSecurityIncident,
  TthSecurityTraining,
  TthServiceProvider,
  TthAnalysis,
  TthClient,
  TthConsultation,
  TthDocumentRequest,
  TthEngagement,
  TthFiling,
  TthIntake,
  TthPosition,
} from '@/types/tradertax';

type TableShape<Row> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row> & Record<string, unknown>;
  Relationships: [];
};

export interface TraderTaxSchema {
  public: {
    Tables: {
      tth_clients: TableShape<TthClient>;
      tth_engagements: TableShape<TthEngagement>;
      tth_intakes: TableShape<TthIntake>;
      tth_document_requests: TableShape<TthDocumentRequest>;
      tth_analyses: TableShape<TthAnalysis>;
      tth_positions: TableShape<TthPosition>;
      tth_filings: TableShape<TthFiling>;
      tth_consultations: TableShape<TthConsultation>;
      tth_activity: TableShape<TthActivity>;
      tth_firm_profile: TableShape<TthFirmProfile>;
      tth_firm_deadlines: TableShape<TthFirmDeadline>;
      tth_security_controls: TableShape<TthSecurityControl>;
      tth_security_incidents: TableShape<TthSecurityIncident>;
      tth_security_training: TableShape<TthSecurityTraining>;
      tth_service_providers: TableShape<TthServiceProvider>;
      tth_leads: TableShape<TthLead>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export const tth = supabase as unknown as SupabaseClient<TraderTaxSchema>;

/** Generates the opaque token used in a public intake link. */
export function generateIntakeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function intakeLinkFor(token: string): string {
  return `${window.location.origin}/intake/${token}`;
}

export function inquiryLinkFor(companyId: string | null): string {
  const base = `${window.location.origin}/inquiry`;
  return companyId ? `${base}?firm=${companyId}` : base;
}
