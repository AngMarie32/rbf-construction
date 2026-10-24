/**
 * TraderTaxHQ — information security program.
 *
 * A paid tax preparer is a "financial institution" under the Gramm-Leach-
 * Bliley Act, which puts the practice under the FTC Safeguards Rule
 * (16 CFR part 314). The IRS restates the same obligation in Pub. 4557 and
 * supplies a plan template in Pub. 5708. In practice the requirement is: a
 * written plan, a named owner, a risk assessment, specific safeguards, staff
 * training, oversight of vendors, an incident response plan, and periodic
 * review.
 *
 * This module holds the control catalog and the readiness math. It is a
 * tracking tool, not legal advice — the plan it produces has to be read,
 * corrected, and adopted by someone accountable for it.
 *
 * Note on scope: 16 CFR 314.6 exempts a financial institution that maintains
 * customer information concerning fewer than 5,000 consumers from a few
 * specific paragraphs — the written risk assessment, continuous monitoring or
 * penetration testing, the written incident response plan, and the annual
 * written report. Controls below carry `smallFirmExempt` where that applies.
 * Everything else applies at any size, and the exempt items remain good
 * practice.
 */

import { ControlStatus, TthSecurityControl } from '@/types/tradertax';

export interface SecurityControlTemplate {
  code: string;
  title: string;
  category:
    | 'Governance'
    | 'Access control'
    | 'Data protection'
    | 'Infrastructure'
    | 'People'
    | 'Service providers'
    | 'Incident response';
  requirement: string;
  authority: string;
  applicability: 'required' | 'recommended';
  /** Exempt for firms holding data on fewer than 5,000 consumers. */
  smallFirmExempt?: boolean;
  reviewMonths: number;
  evidencePrompt: string;
}

export const SECURITY_CONTROL_CATALOG: SecurityControlTemplate[] = [
  // --- Governance ---------------------------------------------------------
  {
    code: 'GOV_QUALIFIED_INDIVIDUAL',
    title: 'Designate a qualified individual to own the program',
    category: 'Governance',
    requirement:
      'Name one person responsible for implementing and supervising the information security program. In a small firm this is usually the owner. The designation is written and the person is accountable for everything else on this list.',
    authority: '16 CFR 314.4(a)',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Who is named in the plan, and where is the designation recorded?',
  },
  {
    code: 'GOV_WISP',
    title: 'Maintain a written information security plan',
    category: 'Governance',
    requirement:
      'The program is written, covers the safeguards below, and is adopted with a date and a signature. Generate it from this page and keep the signed copy with firm records.',
    authority: '16 CFR 314.3; IRS Pub. 4557, Pub. 5708',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Where is the signed plan stored, and what version is current?',
  },
  {
    code: 'GOV_RISK_ASSESSMENT',
    title: 'Perform a written risk assessment',
    category: 'Governance',
    requirement:
      'Identify reasonably foreseeable internal and external risks to client information, assess their likelihood and impact, and record how each safeguard addresses them. Redo it when the practice materially changes.',
    authority: '16 CFR 314.4(b)',
    applicability: 'required',
    smallFirmExempt: true,
    reviewMonths: 12,
    evidencePrompt: 'Date of the last assessment and the top risks it identified.',
  },
  {
    code: 'GOV_ANNUAL_REPORT',
    title: 'Report on the program at least annually',
    category: 'Governance',
    requirement:
      'The qualified individual reports in writing to the owner or board on the program’s status, risks, and any incidents.',
    authority: '16 CFR 314.4(i)',
    applicability: 'required',
    smallFirmExempt: true,
    reviewMonths: 12,
    evidencePrompt: 'Date and recipient of the last written report.',
  },
  {
    code: 'GOV_ADJUST',
    title: 'Evaluate and adjust the program',
    category: 'Governance',
    requirement:
      'Update the program in light of testing results, material changes to the business, new client data, or anything learned from an incident.',
    authority: '16 CFR 314.4(g)',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'What changed at the last review, and why?',
  },

  // --- Access control -----------------------------------------------------
  {
    code: 'ACC_MFA',
    title: 'Enforce multi-factor authentication everywhere',
    category: 'Access control',
    requirement:
      'MFA for every individual accessing any system holding client information — this app, the tax software, email, TitanFile, the bank, e-Services. No exceptions without a written, approved compensating control.',
    authority: '16 CFR 314.4(c)(5)',
    applicability: 'required',
    reviewMonths: 6,
    evidencePrompt: 'List each system and confirm MFA is enforced, not merely available.',
  },
  {
    code: 'ACC_LEAST_PRIVILEGE',
    title: 'Limit access to what each person needs',
    category: 'Access control',
    requirement:
      'Grant the minimum access each role requires and review those grants periodically. Remove access the same day someone leaves.',
    authority: '16 CFR 314.4(c)(1)',
    applicability: 'required',
    reviewMonths: 3,
    evidencePrompt: 'Date of the last access review and what was revoked.',
  },
  {
    code: 'ACC_PASSWORDS',
    title: 'Use a password manager and unique credentials',
    category: 'Access control',
    requirement:
      'Long unique passwords per system, stored in a password manager. No shared logins, no reuse, no credentials in email or spreadsheets.',
    authority: 'IRS Pub. 4557',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Which password manager, and who has access to the shared vault?',
  },
  {
    code: 'ACC_PTIN_EFIN',
    title: 'Protect and monitor PTIN and EFIN',
    category: 'Access control',
    requirement:
      'Check the return volume filed under your EFIN in e-Services against your own records, and watch for returns filed under your PTIN that you did not prepare.',
    authority: 'IRS Pub. 3112',
    applicability: 'required',
    reviewMonths: 3,
    evidencePrompt: 'Date of the last e-Services volume check and the counts compared.',
  },

  // --- Data protection ----------------------------------------------------
  {
    code: 'DATA_INVENTORY',
    title: 'Inventory the data, systems, and devices holding client information',
    category: 'Data protection',
    requirement:
      'Know what client data you hold, where it lives, who can reach it, and on which devices. You cannot protect an asset you have not written down.',
    authority: '16 CFR 314.4(c)(2)',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Where is the inventory kept and when was it last updated?',
  },
  {
    code: 'DATA_ENCRYPTION',
    title: 'Encrypt client information in transit and at rest',
    category: 'Data protection',
    requirement:
      'Full-disk encryption on every laptop and workstation, TLS for everything in transit, and encrypted storage for backups. Client documents move through the secure channel, never email attachments.',
    authority: '16 CFR 314.4(c)(3)',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Which devices are encrypted, and how is that verified?',
  },
  {
    code: 'DATA_SECURE_TRANSFER',
    title: 'Exchange documents only through the secure portal',
    category: 'Data protection',
    requirement:
      'Client documents and returns move through TitanFile. Email is for notifications, never for tax documents, and never for credentials.',
    authority: 'IRS Pub. 4557',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'What is the portal, and how are clients told not to email documents?',
  },
  {
    code: 'DATA_RETENTION',
    title: 'Dispose of client information on a schedule',
    category: 'Data protection',
    requirement:
      'Securely dispose of customer information no later than two years after the last time it was used to serve the client, unless a legitimate business need or a legal retention requirement applies — and review the retention policy periodically. Set the firm retention period, then actually run the purge.',
    authority: '16 CFR 314.4(c)(6); Circular 230 sec. 10.28',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Retention period, disposal method, and the date of the last purge.',
  },
  {
    code: 'DATA_BACKUP',
    title: 'Back up client data and test the restore',
    category: 'Data protection',
    requirement:
      'Automated encrypted backups, at least one copy off-site or offline, and a restore actually performed and documented.',
    authority: 'IRS Pub. 4557',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Backup target, frequency, and the date of the last successful test restore.',
  },

  // --- Infrastructure -----------------------------------------------------
  {
    code: 'INF_ENDPOINT',
    title: 'Run anti-malware and keep systems patched',
    category: 'Infrastructure',
    requirement:
      'Current anti-malware on every endpoint, automatic operating system and application updates, and no unsupported operating systems.',
    authority: 'IRS Pub. 4557',
    applicability: 'required',
    reviewMonths: 6,
    evidencePrompt: 'Which product, on which machines, and how patching is confirmed.',
  },
  {
    code: 'INF_FIREWALL_NETWORK',
    title: 'Secure the network',
    category: 'Infrastructure',
    requirement:
      'Firewall enabled, router admin password changed from default, WPA2/WPA3 on wireless, guest network separated, and a VPN for any work over untrusted networks.',
    authority: 'IRS Pub. 4557',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Network setup and who administers it.',
  },
  {
    code: 'INF_LOGGING',
    title: 'Log and monitor access to client information',
    category: 'Infrastructure',
    requirement:
      'Keep logs of authorized user activity and enable detection of unauthorized access. Turn on the audit log in every system that offers one, and review it after anything unusual.',
    authority: '16 CFR 314.4(c)(8)',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Which systems log access, where the logs go, and who reads them.',
  },
  {
    code: 'INF_TESTING',
    title: 'Test the safeguards',
    category: 'Infrastructure',
    requirement:
      'Either continuous monitoring, or annual penetration testing plus vulnerability assessments at least every six months and after material changes.',
    authority: '16 CFR 314.4(d)',
    applicability: 'required',
    smallFirmExempt: true,
    reviewMonths: 6,
    evidencePrompt: 'What testing was performed, by whom, and what it found.',
  },
  {
    code: 'INF_CHANGE_MGMT',
    title: 'Manage changes to systems',
    category: 'Infrastructure',
    requirement:
      'Adopt procedures for evaluating the security impact of new software, new vendors, and configuration changes before they go live.',
    authority: '16 CFR 314.4(c)(7)',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'How a new tool gets approved before it touches client data.',
  },
  {
    code: 'INF_PHYSICAL',
    title: 'Secure the physical office',
    category: 'Infrastructure',
    requirement:
      'Locked storage for paper records, locked screens when unattended, no client data visible to visitors, and controlled access to any room holding records.',
    authority: 'IRS Pub. 4557',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Where paper lives and how it is secured.',
  },

  // --- People -------------------------------------------------------------
  {
    code: 'PPL_TRAINING',
    title: 'Train everyone with access, annually',
    category: 'People',
    requirement:
      'Security awareness training for all personnel including seasonal staff, refreshed annually, with phishing specifically covered. Log completion.',
    authority: '16 CFR 314.4(e)',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Training provider, date, and who completed it.',
  },
  {
    code: 'PPL_PHISHING',
    title: 'Have a rule for suspicious email and payment changes',
    category: 'People',
    requirement:
      'Written rule: never act on an emailed change of bank details or an urgent request for client data without verbal verification on a known number. Preparer-targeted phishing is the primary attack on this industry.',
    authority: 'IRS Pub. 4557',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Where the rule is written and how it is reinforced.',
  },
  {
    code: 'PPL_7216',
    title: 'Obtain section 7216 consents before disclosing or using return information',
    category: 'People',
    requirement:
      'Written, signed consent in the required form before disclosing or using tax return information for anything outside preparing the return. Consents do not carry over between years.',
    authority: 'IRC sec. 7216; Treas. Reg. sec. 301.7216-3',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Which consent form is used and where signed copies are filed.',
  },

  // --- Service providers --------------------------------------------------
  {
    code: 'VND_SELECTION',
    title: 'Select and oversee service providers',
    category: 'Service providers',
    requirement:
      'Take reasonable steps to select providers capable of safeguarding client information, require safeguards by contract, and periodically assess them based on the risk they present.',
    authority: '16 CFR 314.4(f)',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'The provider register, with contract status and last review for each.',
  },

  // --- Incident response --------------------------------------------------
  {
    code: 'IR_PLAN',
    title: 'Maintain a written incident response plan',
    category: 'Incident response',
    requirement:
      'A written plan covering goals, internal processes, roles and decision authority, communications, remediation, documentation, and post-incident revision.',
    authority: '16 CFR 314.4(h)',
    applicability: 'required',
    smallFirmExempt: true,
    reviewMonths: 12,
    evidencePrompt: 'Where the plan is stored and when it was last exercised.',
  },
  {
    code: 'IR_REPORTING',
    title: 'Know who to call on a data theft',
    category: 'Incident response',
    requirement:
      'A preparer who suffers a client data breach contacts their IRS Stakeholder Liaison promptly, and notifies state tax agencies and affected clients. Keep the contacts, counsel, and insurer numbers in the plan so nobody is searching for them mid-incident.',
    authority: 'IRS Pub. 4557; state breach notification statutes',
    applicability: 'required',
    reviewMonths: 12,
    evidencePrompt: 'Named contacts: Stakeholder Liaison, counsel, insurer, state agencies.',
  },
  {
    code: 'IR_INSURANCE',
    title: 'Carry cyber liability coverage',
    category: 'Incident response',
    requirement:
      'Coverage sized to the number of client records held, including breach response and notification costs.',
    authority: 'Recommended practice',
    applicability: 'recommended',
    reviewMonths: 12,
    evidencePrompt: 'Insurer, policy number, limit, and renewal date.',
  },
];

export interface BuiltSecurityControl {
  code: string;
  title: string;
  category: string;
  requirement: string;
  authority: string;
  status: ControlStatus;
  review_months: number;
  applicability: 'required' | 'recommended';
  notes: string;
  sort_order: number;
}

export function buildSecurityControls(): BuiltSecurityControl[] {
  return SECURITY_CONTROL_CATALOG.map((c, i) => ({
    code: c.code,
    title: c.title,
    category: c.category,
    requirement: c.requirement,
    authority: c.authority,
    status: 'not_started' as ControlStatus,
    review_months: c.reviewMonths,
    applicability: c.applicability,
    notes: c.evidencePrompt,
    sort_order: i,
  }));
}

export function templateFor(code: string): SecurityControlTemplate | undefined {
  return SECURITY_CONTROL_CATALOG.find((c) => c.code === code);
}

// ---------------------------------------------------------------------------
// Readiness
// ---------------------------------------------------------------------------

export interface SecurityReadiness {
  score: number;
  requiredTotal: number;
  requiredImplemented: number;
  inProgress: number;
  notStarted: number;
  notApplicable: number;
  overdueReviews: TthSecurityControl[];
  gaps: TthSecurityControl[];
  tier: 'not_started' | 'building' | 'substantial' | 'complete';
}

/** A control is due for review `review_months` after it was last looked at. */
export function reviewDueDate(control: TthSecurityControl): string | null {
  const base = control.last_reviewed_on ?? control.implemented_on;
  if (!base) return null;
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + (control.review_months || 12));
  return d.toISOString().slice(0, 10);
}

export function assessSecurityReadiness(
  controls: TthSecurityControl[],
  today: Date = new Date()
): SecurityReadiness {
  const applicable = controls.filter((c) => c.status !== 'not_applicable');
  const required = applicable.filter((c) => c.applicability === 'required');
  const implemented = required.filter((c) => c.status === 'implemented');
  const todayIso = today.toISOString().slice(0, 10);

  const overdueReviews = applicable.filter((c) => {
    if (c.status !== 'implemented') return false;
    const due = reviewDueDate(c);
    return due !== null && due < todayIso;
  });

  // Partial credit for in-progress work, and an overdue review costs half the
  // control's value — an unreviewed safeguard is a claim, not a control.
  const inProgress = required.filter((c) => c.status === 'in_progress');
  const earned =
    implemented.length - overdueReviews.filter((c) => c.applicability === 'required').length * 0.5 +
    inProgress.length * 0.4;
  const score = required.length ? Math.max(0, Math.round((earned / required.length) * 100)) : 0;

  return {
    score,
    requiredTotal: required.length,
    requiredImplemented: implemented.length,
    inProgress: inProgress.length,
    notStarted: required.filter((c) => c.status === 'not_started').length,
    notApplicable: controls.filter((c) => c.status === 'not_applicable').length,
    overdueReviews,
    gaps: required.filter((c) => c.status !== 'implemented'),
    tier:
      score >= 95 ? 'complete' : score >= 70 ? 'substantial' : score >= 25 ? 'building' : 'not_started',
  };
}

export const DEFAULT_SERVICE_PROVIDERS = [
  { name: 'TitanFile', purpose: 'Secure client document exchange', data_accessed: 'Client tax documents' },
  { name: 'Supabase', purpose: 'Application database and authentication', data_accessed: 'Client records, intake answers' },
  { name: 'Resend', purpose: 'Transactional email', data_accessed: 'Client names and email addresses' },
  { name: 'Tax preparation software', purpose: 'Return preparation and e-file', data_accessed: 'Full return data, SSNs' },
  { name: 'Bookkeeping / accounting', purpose: 'Firm books and client billing', data_accessed: 'Client names, billing detail' },
];
