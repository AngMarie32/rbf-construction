import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { buildReport, DEFAULT_OPTIONS, REPAIR_TYPES, type ReportOptions } from './engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const money = (n: number) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const APP_URL = Deno.env.get('APP_PUBLIC_URL') || 'https://portal.rbfconstruction.com';
const btn = (href: string, label: string, primary = false) =>
  `<a href="${href}" style="display:inline-block;padding:9px 14px;margin:4px 6px 4px 0;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;${
    primary
      ? 'background:#111;color:#fff;'
      : 'background:#f4f4f5;color:#111;border:1px solid #e5e5e5;'
  }">${label}</a>`;

interface Sub {
  id: string;
  user_id: string;
  name: string;
  recipients: string[];
  subject_override: string | null;
  frequency: string;
  day_of_week: number;
  day_of_month: number | null;
  hour: number;
  timezone: string;
  run_at: string | null;
  enabled: boolean;
  config: any;
  last_sent_at: string | null;
}

const KPI_LABELS: Record<string, string> = {
  periodSpend: 'Repair spend (period)',
  lifetimeSpend: 'Lifetime repairs',
  events: 'Repair events',
  costPerHour: 'Cost / hour',
  runRate: 'Annual run-rate',
  fleetBookValue: 'Fleet value (book)',
  fleetValue: 'Fleet value (depreciated)',
  pctOfFleet: 'Repairs % of book value',
  avgHealth: 'Avg health score',
  replaceWatch: 'Replace / watch',
  unitCount: 'Units in scope',
};

const UNIT_COLS: Record<string, { label: string; get: (u: any) => string }> = {
  adjustedValue: { label: 'Adj. value', get: (u) => money(u.adjustedValue) },
  periodSpend: { label: 'Period', get: (u) => money(u.periodSpend) },
  lifetimeSpend: { label: 'Lifetime', get: (u) => money(u.lifetimeSpend) },
  ratio: { label: 'Weighted %', get: (u) => `${u.ratio.toFixed(2)}%` },
  costPerHour: { label: '$ / hr', get: (u) => money(u.costPerHour) },
  annualRunRate: { label: 'Run-rate', get: (u) => money(u.annualRunRate) },
  trendPct: { label: 'Trend', get: (u) => `${u.trendPct.toFixed(2)}%` },
  majorShare: { label: 'Major %', get: (u) => `${u.majorShare.toFixed(2)}%` },
  healthScore: { label: 'Score', get: (u) => u.healthScore.toFixed(2) },
  verdict: { label: 'Verdict', get: (u) => u.verdict },
  residualValue: { label: 'Residual', get: (u) => money(u.residualValue) },
};

function buildHtml(sub: Sub, report: any, options: ReportOptions) {
  const cfg = sub.config || {};
  const sections: string[] = cfg.sections || ['summary', 'mix', 'units'];
  const kpis: string[] = cfg.kpis || ['periodSpend', 'lifetimeSpend', 'events', 'costPerHour', 'runRate', 'fleetBookValue', 'avgHealth', 'replaceWatch'];
  const unitCols: string[] = cfg.unitColumns || ['adjustedValue', 'periodSpend', 'lifetimeSpend', 'costPerHour', 'healthScore', 'verdict'];
  const showEstimatedHours: boolean = cfg.showEstimatedHours !== false;
  const t = report.totals;

  const kpiValue = (k: string) => {
    switch (k) {
      case 'periodSpend': return money(t.periodSpend);
      case 'lifetimeSpend': return money(t.lifetimeSpend);
      case 'events': return String(t.events);
      case 'costPerHour': return money(t.costPerHour);
      case 'runRate': return money(t.runRate);
      case 'fleetBookValue': return money(t.fleetBookValue);
      case 'fleetValue': return money(t.fleetValue);
      case 'pctOfFleet': return `${t.pctOfFleet.toFixed(2)}%`;
      case 'avgHealth': return t.avgHealth.toFixed(2);
      case 'replaceWatch': return `${t.replaceCount} / ${t.watchCount}`;
      case 'unitCount': return String(report.units.length);
      default: return '';
    }
  };

  const parts: string[] = [];

  parts.push(`<div style="margin:12px 0 4px">${btn(
    `${APP_URL}/equipment-insights?tab=report`,
    'Open full report',
    true
  )}${btn(`${APP_URL}/equipment-insights`, 'Fleet overview')}${btn(
    `${APP_URL}/equipment`,
    'Equipment list'
  )}</div>`);

  if (sections.includes('summary')) {
    parts.push(`<h2>Executive summary</h2><table role="presentation" style="width:100%;border-collapse:collapse">
      <tr>${kpis
        .map(
          (k, i) =>
            `<td style="width:25%;padding:8px;border:1px solid #e5e5e5;border-radius:6px"><div style="font-size:11px;color:#666">${
              KPI_LABELS[k] || k
            }</div><div style="font-size:16px;font-weight:600">${kpiValue(k)}</div></td>${
              (i + 1) % 4 === 0 ? '</tr><tr>' : ''
            }`
        )
        .join('')}</tr></table>
      <p style="font-size:12px;color:#555">Repairs consume ${t.pctOfFleet.toFixed(2)}% of fleet book value. ${
      t.replaceCount > 0
        ? `${t.replaceCount} unit(s) scored below 40 and should be evaluated for replacement.`
        : 'No unit is currently in replacement territory.'
    }</p>`);
  }

  if (sections.includes('mix')) {
    parts.push(`<h2>Repair mix by type</h2><table><thead><tr><th>Type</th><th class="num">Spend</th><th class="num">% of total</th></tr></thead><tbody>
      ${report.typeTotals
        .map(
          (r: any) =>
            `<tr><td>${r.label}</td><td class="num">${money(r.total)}</td><td class="num">${
              t.lifetimeSpend > 0 ? ((r.total / t.lifetimeSpend) * 100).toFixed(2) : '0.00'
            }%</td></tr>`
        )
        .join('')}
    </tbody></table>`);
  }

  if (sections.includes('units')) {
    parts.push(`<h2>Unit scorecard</h2><table><thead><tr><th>Equipment</th>${unitCols
      .map((c) => `<th class="num">${UNIT_COLS[c]?.label || c}</th>`)
      .join('')}<th></th></tr></thead><tbody>
      ${report.units
        .map((u: any) => {
          const estimated = !(options.useHours && u.hours > 0);
          const hoursText = estimated
            ? showEstimatedHours
              ? ` &bull; ${u.effectiveHours.toFixed(0)} hrs (est.)`
              : ''
            : ` &bull; ${u.effectiveHours.toFixed(0)} hrs`;
          return `<tr><td><b>${u.name}</b><div style="font-size:11px;color:#666">${u.category}${
            u.year ? ` &bull; ${u.year}` : ''
          } &bull; ${u.events} events${hoursText}</div></td>${unitCols
            .map((c) => `<td class="num">${UNIT_COLS[c] ? UNIT_COLS[c].get(u) : ''}</td>`)
            .join('')}<td class="num">${btn(
            `${APP_URL}/equipment-insights?unit=${u.id}`,
            'View unit'
          )}</td></tr>`;
        })
        .join('')}
    </tbody></table>`);
  }

  if (sections.includes('drivers')) {
    const risky = report.units.filter((u: any) => u.verdict !== 'Healthy').slice(0, 10);
    parts.push(`<h2>Risk drivers &amp; recommended actions</h2>${
      risky.length
        ? risky
            .map(
              (u: any) =>
                `<div style="border:1px solid #e5e5e5;border-radius:6px;padding:8px;margin-bottom:8px"><b>${u.name}</b> — ${u.verdict}<ul style="font-size:12px;color:#555">${
                  (u.drivers.length ? u.drivers : ['Cumulative cost pressure'])
                    .map((d: string) => `<li>${d}</li>`)
                    .join('')
                }</ul>${btn(`${APP_URL}/equipment-insights?unit=${u.id}`, 'Review unit')}</div>`
            )
            .join('')
        : '<p style="font-size:12px;color:#555">Every unit in scope scores healthy under the current assumptions.</p>'
    }`);
  }

  const rangeLabel = options.startDate || options.endDate
    ? `${options.startDate || 'start'} → ${options.endDate || 'today'}`
    : options.months
    ? `Last ${options.months} months`
    : 'All time';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:'DM Sans',system-ui,sans-serif;color:#111;margin:24px;}
    h1{font-size:20px;margin:0 0 4px;} h2{font-size:14px;margin:22px 0 6px;}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px;}
    th,td{padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:left;}
    th{background:#f6f6f6;font-weight:600;}
    .num{text-align:right;}
  </style></head><body>
    <h1>${cfg.title || sub.name}</h1>
    <p style="color:#666;font-size:12px">RBF Construction &bull; ${new Date().toLocaleDateString('en-US')} &bull; ${rangeLabel} &bull; ${report.units.length} units &bull; ${
    options.useHours ? 'hours logged included' : 'hours estimated'
  }</p>
    ${parts.join('')}
  </body></html>`;
}

async function sendOne(admin: any, resendKey: string, sub: Sub, isTest: boolean) {
  const cfg = sub.config || {};
  const options: ReportOptions = { ...DEFAULT_OPTIONS, ...(cfg.options || {}) };
  if (!options.includedTypes?.length) options.includedTypes = REPAIR_TYPES.map((t) => t.key);

  let eq = admin.from('equipment').select('id,name,category,year,value,purchase_date,depreciation_rate,total_hours_used,status');
  if (Array.isArray(cfg.unitIds) && cfg.unitIds.length) eq = eq.in('id', cfg.unitIds);
  const { data: equipment, error: eqErr } = await eq;
  if (eqErr) return { ok: false, error: eqErr.message };

  const ids = (equipment || []).map((e: any) => e.id);
  let repairs: any[] = [];
  if (ids.length) {
    const { data } = await admin
      .from('maintenance_logs')
      .select('id,equipment_id,date,description,cost,next_due')
      .in('equipment_id', ids);
    repairs = data || [];
  }

  const report = buildReport(equipment || [], repairs, options);
  const html = buildHtml(sub, report, options);
  const recipients = (sub.recipients || []).filter((r) => !!r && r.includes('@'));
  if (!recipients.length) return { ok: false, error: 'No recipients configured' };

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: 'RBF Construction <noreply@portal.rbfconstruction.com>',
      to: recipients,
      subject: `${isTest ? '[TEST] ' : ''}${sub.subject_override || sub.name}`,
      html,
    }),
  });
  const body = await resp.text();
  if (!resp.ok) {
    console.error('Resend error', resp.status, body);
    return { ok: false, error: `Resend ${resp.status}: ${body}` };
  }

  if (!isTest) {
    if (sub.frequency === 'one_time') {
      await admin
        .from('fleet_report_subscriptions')
        .update({ last_sent_at: new Date().toISOString(), enabled: false, next_send_at: null })
        .eq('id', sub.id);
    } else {
      const { data: next } = await admin.rpc('compute_next_scheduled_send', {
        p_frequency: sub.frequency,
        p_day_of_week: sub.day_of_week,
        p_day_of_month: sub.day_of_month,
        p_hour: sub.hour,
        p_tz: sub.timezone,
        p_run_at: sub.run_at,
        p_after: new Date().toISOString(),
      });
      await admin
        .from('fleet_report_subscriptions')
        .update({ last_sent_at: new Date().toISOString(), next_send_at: next })
        .eq('id', sub.id);
    }
  }

  return { ok: true, recipients: recipients.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    if (payload.subscription_id && payload.test) {
      const { data: sub, error } = await admin
        .from('fleet_report_subscriptions')
        .select('*')
        .eq('id', payload.subscription_id)
        .maybeSingle();
      if (error || !sub) {
        return new Response(JSON.stringify({ error: 'Subscription not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await sendOne(admin, resendKey, sub as Sub, true);
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: due } = await admin
      .from('fleet_report_subscriptions')
      .select('*')
      .eq('enabled', true)
      .not('next_send_at', 'is', null)
      .lte('next_send_at', new Date().toISOString());

    const results: any[] = [];
    for (const sub of due || []) {
      results.push({ id: sub.id, ...(await sendOne(admin, resendKey, sub as Sub, false)) });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-fleet-report failed', e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});