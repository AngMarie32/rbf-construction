export type EnvelopeStatus = 'draft' | 'sent' | 'partially_signed' | 'completed' | 'declined' | 'expired' | 'voided';
export type SignerStatus = 'pending' | 'notified' | 'viewed' | 'signed' | 'declined';
export type FieldType = 'signature' | 'initial' | 'date' | 'text' | 'checkbox' | 'name';
export type SigningOrder = 'parallel' | 'sequential';

export interface EsignEnvelope {
  id: string;
  created_by: string | null;
  title: string;
  message: string | null;
  status: EnvelopeStatus;
  signing_order: SigningOrder;
  source_type: string | null;
  source_id: string | null;
  project_id: string | null;
  original_pdf_path: string | null;
  signed_pdf_path: string | null;
  certificate_path: string | null;
  expires_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EsignSigner {
  id: string;
  envelope_id: string;
  name: string;
  email: string;
  order_index: number;
  status: SignerStatus;
  access_token: string;
  token_expires_at: string | null;
  notified_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  signature_data: string | null;
  signature_type: 'drawn' | 'typed' | null;
  created_at: string;
}

export interface EsignField {
  id: string;
  envelope_id: string;
  signer_id: string | null;
  field_type: FieldType;
  page_number: number;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
  required: boolean;
  value: string | null;
  filled_at: string | null;
  created_at: string;
}

export interface EsignTemplate {
  id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  category: string | null;
  source_pdf_path: string | null;
  default_fields: any;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface EsignAuditEvent {
  id: string;
  envelope_id: string;
  signer_id: string | null;
  event_type: string;
  actor_name: string | null;
  actor_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

export const STATUS_COLORS: Record<EnvelopeStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  partially_signed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  declined: 'bg-red-500/10 text-red-600 dark:text-red-400',
  expired: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  voided: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

export const STATUS_LABELS: Record<EnvelopeStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_signed: 'Partially Signed',
  completed: 'Completed',
  declined: 'Declined',
  expired: 'Expired',
  voided: 'Voided',
};