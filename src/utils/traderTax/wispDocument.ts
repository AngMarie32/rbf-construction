/**
 * TraderTaxHQ — written information security plan (WISP) generator.
 *
 * Produces the document the Safeguards Rule and IRS Pub. 4557 expect, filled
 * in from the firm profile, the control register, and the service provider
 * list. It is a starting draft assembled from what the firm has actually
 * recorded — the plan still has to be read, corrected, and signed by the
 * person accountable for it, and a firm with unusual facts needs counsel.
 */

import jsPDF from 'jspdf';
import {
  TthFirmProfile,
  TthSecurityControl,
  TthSecurityTraining,
  TthServiceProvider,
} from '@/types/tradertax';
import { assessSecurityReadiness, reviewDueDate } from './securityProgram';

export interface WispInput {
  profile: TthFirmProfile;
  controls: TthSecurityControl[];
  providers: TthServiceProvider[];
  training: TthSecurityTraining[];
}

const M = 56;
const LINE = 13;

const longDate = (iso: string | null | undefined) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'long' }) : '__________';

export function generateWisp(input: WispInput): jsPDF {
  const { profile, controls, providers, training } = input;
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const width = W - M * 2;
  let y = M;
  let section = 0;

  const space = (needed: number) => {
    if (y + needed > H - M - 26) {
      footer();
      pdf.addPage();
      y = M;
    }
  };

  const footer = () => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(130, 138, 150);
    pdf.text(
      `${profile.firm_name} — Written Information Security Plan v${profile.wisp_version}`,
      M,
      H - 30
    );
    pdf.text(String(pdf.getNumberOfPages()), W - M, H - 30, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  };

  const heading = (title: string) => {
    section += 1;
    space(46);
    y += 12;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(`${section}. ${title}`, M, y);
    y += 6;
    pdf.setDrawColor(200, 208, 220);
    pdf.line(M, y, W - M, y);
    y += 14;
  };

  const sub = (title: string) => {
    space(26);
    y += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(title, M, y);
    y += LINE;
  };

  const body = (text: string, indent = 0) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    (pdf.splitTextToSize(text, width - indent) as string[]).forEach((line) => {
      space(LINE);
      pdf.text(line, M + indent, y);
      y += LINE;
    });
  };

  const bullet = (text: string) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    (pdf.splitTextToSize(text, width - 16) as string[]).forEach((line, i) => {
      space(LINE);
      if (i === 0) pdf.text('•', M + 2, y);
      pdf.text(line, M + 16, y);
      y += LINE;
    });
  };

  const kv = (rows: [string, string][]) => {
    pdf.setFontSize(10);
    rows.forEach(([k, v]) => {
      space(LINE);
      pdf.setFont('helvetica', 'bold');
      pdf.text(k, M, y);
      pdf.setFont('helvetica', 'normal');
      (pdf.splitTextToSize(v, width - 180) as string[]).forEach((line, i) => {
        if (i > 0) {
          y += LINE;
          space(LINE);
        }
        pdf.text(line, M + 180, y);
      });
      y += LINE;
    });
  };

  // --- Cover ---------------------------------------------------------------
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('Written Information Security Plan', M, y);
  y += 26;
  pdf.setFontSize(14);
  pdf.setTextColor(60, 70, 90);
  pdf.text(profile.firm_name, M, y);
  pdf.setTextColor(0, 0, 0);
  y += 24;

  kv([
    ['Plan version', profile.wisp_version],
    ['Adopted', longDate(profile.wisp_adopted_on)],
    ['Last reviewed', longDate(profile.wisp_last_reviewed_on)],
    ['Qualified individual', profile.security_officer_name ?? '__________'],
    ['Title', profile.security_officer_title ?? '__________'],
    [
      'Business address',
      [profile.street, profile.city, profile.state, profile.postal_code].filter(Boolean).join(', ') ||
        '__________',
    ],
    ['EFIN', profile.efin ?? '__________'],
    ['Records retention', `${profile.retention_years} years`],
  ]);

  y += 8;
  space(58);
  pdf.setFillColor(255, 248, 225);
  pdf.setDrawColor(230, 190, 90);
  pdf.roundedRect(M, y - 10, width, 52, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('DRAFT — requires review and adoption', M + 10, y + 4);
  pdf.setFont('helvetica', 'normal');
  (
    pdf.splitTextToSize(
      'This plan was assembled from the firm’s own control register. It is not legal advice. Read every statement, correct anything that does not describe what the firm actually does, and have the qualified individual sign it. A plan that overstates the safeguards in place is worse than no plan.',
      width - 20
    ) as string[]
  ).forEach((line, i) => pdf.text(line, M + 10, y + 16 + i * 10));
  y += 62;

  // --- 1. Purpose ----------------------------------------------------------
  heading('Purpose and scope');
  body(
    `${profile.firm_name} prepares federal and state tax returns for compensation. A paid tax return preparer is a "financial institution" for purposes of the Gramm-Leach-Bliley Act, and is therefore subject to the Federal Trade Commission's Safeguards Rule at 16 CFR part 314. The Internal Revenue Service restates this obligation in Publication 4557 and provides a plan template in Publication 5708.`
  );
  y += 6;
  body(
    'This plan describes the administrative, technical, and physical safeguards the firm uses to protect customer information. It applies to every partner, employee, contractor, and seasonal worker with access to that information, and to every system and device on which it is held.'
  );
  y += 6;
  sub('Information covered');
  body(
    'Customer information means any record containing nonpublic personal information about a client, in any form. For this firm that includes: names, addresses, and contact details; Social Security and taxpayer identification numbers; dates of birth; brokerage account numbers and trade histories; income, expense, and banking records; prior-year returns and workpapers; and any document a client uploads to the secure portal.'
  );

  // --- 2. Qualified individual --------------------------------------------
  heading('Qualified individual and responsibilities');
  body(
    `${profile.security_officer_name ?? '__________'}${
      profile.security_officer_title ? `, ${profile.security_officer_title}` : ''
    }, is designated as the qualified individual responsible for implementing and supervising this program, as required by 16 CFR 314.4(a).`
  );
  y += 6;
  body('The qualified individual is responsible for:');
  [
    'Maintaining this plan and reviewing it at least annually and whenever the business materially changes.',
    'Assessing risks to customer information and confirming that the safeguards below address them.',
    'Approving access to systems holding customer information and reviewing that access periodically.',
    'Selecting and overseeing service providers that receive customer information.',
    'Directing the response to any security incident, and reporting on the program to firm ownership.',
  ].forEach(bullet);
  if (profile.security_officer_email) {
    y += 4;
    body(`Contact: ${profile.security_officer_email}`);
  }

  // --- 3. Risk assessment --------------------------------------------------
  heading('Risk assessment');
  body(
    'The firm has identified the following reasonably foreseeable risks to customer information. Each is addressed by one or more safeguards in section 4.'
  );
  y += 4;
  [
    'Phishing and business email compromise directed at preparers, including fraudulent requests to change payment details or release client data. Tax professionals are a standing target during filing season.',
    'Credential theft or reuse leading to unauthorized access to the tax software, the client portal, or e-Services, including fraudulent returns filed under the firm’s EFIN.',
    'Loss or theft of a laptop, phone, or backup drive holding client data.',
    'Ransomware or other malware encrypting or exfiltrating firm records.',
    'Unauthorized disclosure by insiders, whether deliberate or accidental — most often documents sent to the wrong recipient.',
    'Compromise of a service provider that stores or processes client information.',
    'Retention of client records beyond the period they are needed, enlarging the impact of any breach.',
  ].forEach(bullet);

  // --- 4. Safeguards -------------------------------------------------------
  heading('Safeguards in place');
  const byCategory = controls
    .filter((c) => c.status !== 'not_applicable')
    .reduce<Record<string, TthSecurityControl[]>>((acc, c) => {
      (acc[c.category] ||= []).push(c);
      return acc;
    }, {});

  Object.entries(byCategory).forEach(([category, list]) => {
    sub(category);
    list
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((c) => {
        const state =
          c.status === 'implemented'
            ? 'In place'
            : c.status === 'in_progress'
            ? 'In progress'
            : 'NOT YET IMPLEMENTED';
        bullet(
          `${c.title} — ${state}${c.owner ? `, owned by ${c.owner}` : ''}. ${c.requirement}${
            c.evidence ? ` Evidence: ${c.evidence}.` : ''
          }${c.authority ? ` [${c.authority}]` : ''}`
        );
      });
    y += 4;
  });

  const readiness = assessSecurityReadiness(controls);
  if (readiness.gaps.length) {
    y += 4;
    sub('Open gaps');
    body(
      `${readiness.gaps.length} required safeguard${
        readiness.gaps.length === 1 ? ' is' : 's are'
      } not yet fully implemented. They are listed here rather than omitted, because a plan that claims safeguards the firm does not have is a liability in itself.`
    );
    readiness.gaps.forEach((g) => bullet(`${g.title} — ${g.status.replace(/_/g, ' ')}`));
  }

  // --- 5. Service providers ------------------------------------------------
  heading('Service providers');
  body(
    'The firm takes reasonable steps to select providers capable of safeguarding customer information, requires safeguards by contract, and reassesses them periodically, as required by 16 CFR 314.4(f).'
  );
  y += 6;
  if (providers.length === 0) {
    body('No service providers have been recorded. This section is incomplete.');
  } else {
    providers
      .filter((p) => p.status === 'active')
      .forEach((p) => {
        bullet(
          `${p.name} — ${p.purpose}. Data accessed: ${p.data_accessed ?? 'not recorded'}. Contract on file: ${
            p.contract_on_file ? 'yes' : 'NO'
          }. MFA enforced: ${p.mfa_enforced ? 'yes' : 'NO'}.${
            p.security_review_on ? ` Last reviewed ${longDate(p.security_review_on)}.` : ' Not yet reviewed.'
          }`
        );
      });
  }

  // --- 6. Training ---------------------------------------------------------
  heading('Personnel and training');
  body(
    'Everyone with access to customer information receives security awareness training on hire and at least annually thereafter, covering phishing, credential hygiene, secure document handling, and how to report a suspected incident (16 CFR 314.4(e)).'
  );
  y += 6;
  if (training.length === 0) {
    body('No training has been logged. This section is incomplete.');
  } else {
    training
      .slice()
      .sort((a, b) => b.completed_on.localeCompare(a.completed_on))
      .slice(0, 12)
      .forEach((t) =>
        bullet(
          `${t.person_name}${t.role ? ` (${t.role})` : ''} — ${t.topic}, completed ${longDate(
            t.completed_on
          )}${t.next_due_on ? `, next due ${longDate(t.next_due_on)}` : ''}.`
        )
      );
  }

  // --- 7. Incident response ------------------------------------------------
  heading('Incident response plan');
  body('On discovering an actual or suspected unauthorized acquisition of customer information, the firm will:');
  [
    'Contain first — disconnect affected systems from the network, disable compromised accounts, and preserve logs and images before remediating.',
    'Notify the qualified individual immediately. Anyone who suspects an incident reports it without waiting to confirm it.',
    'Assess scope — what data, whose data, how many clients, and over what period.',
    'Contact the IRS Stakeholder Liaison promptly. A preparer data theft is reported to the Service so returns filed with the stolen data can be flagged.',
    'Notify state tax agencies and the state attorney general as required, and notify affected clients as required by applicable state breach notification law.',
    'Engage counsel and the cyber insurer before making external statements.',
    'Remediate, then document the incident, the response, and what changed as a result.',
    'Revise this plan in light of what the incident revealed.',
  ].forEach(bullet);

  y += 6;
  sub('Contacts');
  kv([
    ['Qualified individual', profile.security_officer_name ?? '__________'],
    ['Legal counsel', profile.breach_counsel ?? '__________'],
    ['Cyber insurer', profile.cyber_insurer ?? '__________'],
    ['Policy number', profile.cyber_policy_number ?? '__________'],
    ['IRS Stakeholder Liaison', '__________ (record your local liaison here)'],
    ['State tax agency', '__________'],
  ]);

  // --- 8. Retention --------------------------------------------------------
  heading('Records retention and disposal');
  body(
    `The firm retains client records for ${profile.retention_years} years, after which they are securely disposed of. Customer information is disposed of no later than two years after the last date it was used to provide a service, unless a legitimate business need or legal requirement supports keeping it, and the retention policy is reviewed periodically (16 CFR 314.4(c)(6)).`
  );
  y += 6;
  body(
    'Paper records are shredded. Electronic records are deleted from primary systems and from backups on the backup rotation schedule. Devices are wiped or physically destroyed before disposal or resale.'
  );

  // --- 9. Review -----------------------------------------------------------
  heading('Program review');
  body(
    'This plan is evaluated and adjusted in light of testing results, material changes to the firm’s operations, and anything learned from an incident (16 CFR 314.4(g)). The qualified individual reports in writing on the program at least annually.'
  );
  y += 6;
  const overdue = controls.filter((c) => {
    const due = reviewDueDate(c);
    return due !== null && due < new Date().toISOString().slice(0, 10);
  });
  if (overdue.length) {
    body(
      `${overdue.length} safeguard${overdue.length === 1 ? '' : 's'} ${
        overdue.length === 1 ? 'is' : 'are'
      } past the review date recorded for ${overdue.length === 1 ? 'it' : 'them'}: ${overdue
        .map((c) => c.title)
        .join('; ')}.`
    );
  }

  // --- 10. Adoption --------------------------------------------------------
  heading('Adoption');
  body(
    'The undersigned adopts this plan on behalf of the firm and accepts responsibility for its implementation.'
  );
  y += 28;
  space(70);
  pdf.setDrawColor(120, 130, 145);
  pdf.line(M, y, M + 240, y);
  pdf.line(M + 290, y, M + 470, y);
  y += 13;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Signature — qualified individual', M, y);
  pdf.text('Date', M + 290, y);
  y += 20;
  pdf.setFontSize(10);
  pdf.text(profile.security_officer_name ?? '', M, y);

  footer();
  return pdf;
}

export function downloadWisp(input: WispInput) {
  const pdf = generateWisp(input);
  const safe = input.profile.firm_name.replace(/[^a-z0-9]+/gi, '_');
  pdf.save(`${safe}_WISP_v${input.profile.wisp_version}.pdf`);
}
