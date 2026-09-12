/**
 * TraderTaxHQ — domain types for the consultation & filing system.
 *
 * Nothing in this module is tax advice. The engines produce *draft* preparer
 * work product that a licensed practitioner must review before delivery.
 */

// ---------------------------------------------------------------------------
// Core records (mirror the tth_* tables)
// ---------------------------------------------------------------------------

export type EntityType =
  | 'individual'
  | 'smllc'
  | 'partnership'
  | 's_corp'
  | 'c_corp'
  | 'trust';

export type FilingStatus =
  | 'single'
  | 'mfj'
  | 'mfs'
  | 'hoh'
  | 'qw';

export type ClientStatus = 'lead' | 'onboarding' | 'active' | 'inactive' | 'archived';

export type ServiceType =
  | 'consultation'
  | 'tax_return'
  | 'consultation_and_return'
  | 'entity_setup'
  | 'amended_return'
  | 'audit_support';

export type EngagementStatus =
  | 'intake'
  | 'docs_pending'
  | 'analysis'
  | 'consult_scheduled'
  | 'consult_complete'
  | 'prep'
  | 'review'
  | 'filed'
  | 'closed';

export interface TthClient {
  id: string;
  company_id: string | null;
  display_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  entity_type: EntityType;
  filing_status: FilingStatus | null;
  home_state: string | null;
  other_states: string[];
  tax_id_last4: string | null;
  spouse_name: string | null;
  occupation: string | null;
  status: ClientStatus;
  source: string | null;
  titanfile_channel_id: string | null;
  titanfile_channel_url: string | null;
  titanfile_contact_email: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TthEngagement {
  id: string;
  client_id: string;
  company_id: string | null;
  tax_year: number;
  service_type: ServiceType;
  status: EngagementStatus;
  fee: number | null;
  engagement_letter_signed_at: string | null;
  titanfile_channel_id: string | null;
  titanfile_channel_url: string | null;
  target_date: string | null;
  consult_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type IntakeStatus = 'draft' | 'sent' | 'in_progress' | 'submitted' | 'reviewed';

export interface TthIntake {
  id: string;
  engagement_id: string;
  client_id: string;
  tax_year: number;
  schema_version: string;
  status: IntakeStatus;
  answers: IntakeAnswers;
  completion_pct: number;
  access_token: string | null;
  token_expires_at: string | null;
  sent_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentRequestStatus =
  | 'requested'
  | 'received'
  | 'reviewed'
  | 'waived'
  | 'rejected';

export interface TthDocumentRequest {
  id: string;
  engagement_id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  is_required: boolean;
  status: DocumentRequestStatus;
  due_date: string | null;
  titanfile_file_id: string | null;
  titanfile_file_name: string | null;
  titanfile_path: string | null;
  titanfile_size: number | null;
  received_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TthAnalysis {
  id: string;
  engagement_id: string;
  tax_year: number;
  engine_version: string;
  computed: ConsultationAnalysis;
  ai_memo: string | null;
  ai_call_script: string | null;
  ai_model: string | null;
  ai_raw: unknown;
  status: 'draft' | 'final';
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PositionCategory =
  | 'tts'
  | 'election'
  | 'entity'
  | 'retirement'
  | 'deductions'
  | 'compliance'
  | 'state'
  | 'estimated_tax'
  | 'general';

export type PositionStatus =
  | 'proposed'
  | 'accepted'
  | 'declined'
  | 'deferred'
  | 'implemented';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface TthPosition {
  id: string;
  engagement_id: string;
  analysis_id: string | null;
  code: string;
  title: string;
  category: PositionCategory;
  recommendation: string | null;
  rationale: string | null;
  authority: string | null;
  risk_level: RiskLevel;
  impact_estimate: number | null;
  status: PositionStatus;
  due_date: string | null;
  owner: string | null;
  decided_at: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type FilingStatusCode =
  | 'not_started'
  | 'in_progress'
  | 'ready_for_review'
  | 'client_review'
  | 'efiled'
  | 'accepted'
  | 'rejected'
  | 'paper_filed'
  | 'n_a';

export interface TthFiling {
  id: string;
  engagement_id: string;
  tax_year: number;
  form_code: string;
  form_name: string;
  jurisdiction: string;
  entity_scope: string;
  due_date: string | null;
  extended_due_date: string | null;
  status: FilingStatusCode;
  extension_filed_at: string | null;
  filed_at: string | null;
  confirmation_number: string | null;
  preparer: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ConsultationActionItem {
  id: string;
  text: string;
  owner: string;
  due_date: string | null;
  done: boolean;
}

export interface TthConsultation {
  id: string;
  engagement_id: string;
  scheduled_at: string | null;
  duration_minutes: number;
  mode: 'video' | 'phone' | 'in_person';
  attendees: string[];
  agenda: string[];
  notes: string | null;
  action_items: ConsultationActionItem[];
  recording_url: string | null;
  summary_sent_at: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TthActivity {
  id: string;
  client_id: string | null;
  engagement_id: string | null;
  kind: string;
  message: string;
  meta: Record<string, unknown>;
  actor: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Intake schema
// ---------------------------------------------------------------------------

export type IntakeFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'boolean';

export interface IntakeOption {
  value: string;
  label: string;
}

export interface IntakeField {
  key: string;
  label: string;
  type: IntakeFieldType;
  help?: string;
  placeholder?: string;
  options?: IntakeOption[];
  required?: boolean;
  /** Only show when this predicate passes. */
  showIf?: (answers: IntakeAnswers) => boolean;
  /** Field drives an engine calculation — flagged in the UI as high value. */
  drivesAnalysis?: boolean;
}

export interface IntakeSection {
  id: string;
  title: string;
  description?: string;
  fields: IntakeField[];
}

export type IntakeAnswerValue = string | number | boolean | string[] | null;
export type IntakeAnswers = Record<string, IntakeAnswerValue>;

// ---------------------------------------------------------------------------
// Document catalog
// ---------------------------------------------------------------------------

export interface DocumentCatalogEntry {
  code: string;
  name: string;
  category: string;
  description: string;
  required: boolean;
  /** Include this request only when the intake answers match. */
  appliesIf?: (answers: IntakeAnswers) => boolean;
}

// ---------------------------------------------------------------------------
// Analysis engine output
// ---------------------------------------------------------------------------

export type TtsTier = 'strong' | 'defensible' | 'weak' | 'not_supported' | 'insufficient_data';

export interface TtsFactorResult {
  key: string;
  label: string;
  weight: number;
  /** 0-1 normalized score for the factor. */
  score: number;
  observed: string;
  benchmark: string;
  authority: string;
  comment: string;
}

export interface TtsAssessment {
  score: number;
  tier: TtsTier;
  factors: TtsFactorResult[];
  strengths: string[];
  weaknesses: string[];
  missingData: string[];
  narrative: string;
}

export interface ElectionDeadline {
  code: string;
  label: string;
  dueDate: string;
  description: string;
  authority: string;
  status: 'open' | 'past' | 'not_applicable' | 'already_made';
  daysRemaining: number | null;
}

export interface ElectionAssessment {
  currentState: string;
  recommended: 'elect_475_securities' | 'elect_475_securities_and_commodities' | 'do_not_elect' | 'revoke_475' | 'defer_decision';
  rationale: string[];
  tradeoffs: { pro: string[]; con: string[] };
  deadlines: ElectionDeadline[];
  form3115Required: boolean;
  estimatedImpact: number | null;
}

export interface EntityScenario {
  key: string;
  label: string;
  description: string;
  officerComp: number;
  payrollTaxCost: number;
  retirementDeduction: number;
  healthInsuranceDeduction: number;
  otherDeductions: number;
  adminCost: number;
  taxBenefit: number;
  netBenefit: number;
  notes: string[];
}

export interface EntityAssessment {
  currentStructure: string;
  scenarios: EntityScenario[];
  recommended: string;
  rationale: string[];
  cautions: string[];
}

export interface FilingRequirement {
  formCode: string;
  formName: string;
  jurisdiction: string;
  entityScope: string;
  dueDate: string | null;
  extendedDueDate: string | null;
  reason: string;
  notes?: string;
}

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'info';

export interface AnalysisFinding {
  id: string;
  area: string;
  severity: FindingSeverity;
  statement: string;
  detail: string;
  authority?: string;
  estimatedImpact?: number | null;
}

export interface RecommendedPosition {
  code: string;
  title: string;
  category: PositionCategory;
  recommendation: string;
  rationale: string;
  authority: string;
  riskLevel: RiskLevel;
  impactEstimate: number | null;
  dueDate: string | null;
}

export interface ReadinessGap {
  kind: 'intake_field' | 'document';
  key: string;
  label: string;
  blocking: boolean;
}

export interface TaxProjection {
  ordinaryIncome: number;
  tradingOrdinary: number;
  capitalShortTerm: number;
  capitalLongTerm: number;
  sec1256Net: number;
  sec1256ShortPortion: number;
  sec1256LongPortion: number;
  allowableCapitalLoss: number;
  capitalLossCarryforward: number;
  washSaleAddback: number;
  estimatedTaxableIncome: number;
  marginalRate: number;
  estimatedFederalTax: number;
  niitExposure: number;
  estimatedPaymentsMade: number;
  projectedBalanceDue: number;
  safeHarborTarget: number;
  quarterlyRecommendation: number;
  assumptions: string[];
}

export interface ConsultationAnalysis {
  engineVersion: string;
  generatedAt: string;
  taxYear: number;
  configStatus: 'verified' | 'unverified';
  configNote: string;
  readiness: {
    intakeCompletion: number;
    documentsReceived: number;
    documentsRequired: number;
    gaps: ReadinessGap[];
    readyForConsult: boolean;
  };
  tts: TtsAssessment;
  elections: ElectionAssessment;
  entity: EntityAssessment;
  projection: TaxProjection;
  filings: FilingRequirement[];
  findings: AnalysisFinding[];
  positions: RecommendedPosition[];
  consultAgenda: string[];
  clientQuestions: string[];
  disclaimers: string[];
}
