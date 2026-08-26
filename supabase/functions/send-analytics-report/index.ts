import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { buildAnalytics, DEFAULT_ANALYTICS_OPTIONS, type AnalyticsOptions } from './engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = Deno.env.get('APP_PUBLIC_URL') || 'https://portal.rbfconstruction.com';

const money = (n: number) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${Number(n || 0).toFixed(2)}%`;

const btn = (href: string, label: string, primary = false) =>
  `<a href="${href}" style="display:inline-block;padding:9px 14px;margin:4px 6px 4px 0;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;${
    primary ? 'background:#111;color:#fff;' : 'background:#f4f4f5;color:#111;border:1px solid #e5e5e5;'
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
}

const KPI_LABELS: Record<string, string> = {
  contractValue: 'Original contract',
  changeOrders: 'Change orders',
  revisedContract: 'Revised contract',
  billed: 'Billed to date',
  received: 'Cash received',
  outstanding: 'Outstanding A/R',
  expenses: 'Costs to date',
  profit: 'Gross profit',
  margin: 'Profit margin',
  backlog: 'Backlog (unbilled)',
  collectionRate: 'Collection rate',
  burnPct: 'Contract burned',
  projectCount: 'Projects in scope',
  activeProjects: 'Active projects',
  avgCompletion: 'Avg completion',
  changeOrderCount: 'Change order count',
};

const COLS: Record<string, { label: string; get: (r: any) => string }> = {
  client: { label: 'Client', get: (r) => r.client },
  status: { label: 'Status', get: (r) => r.status },
  fieldLeader: { label: 'Field leader', get: (r) => r.fieldLeader },
  completion: { label: '% complete', get: (r) => pct(r.completion) },
  contractValue: { label: 'Contract', get: (r) => money(r.contractValue) },
  changeOrders: { label: 'Change orders', get: (r) => money(r.changeOrders) },
  revisedContract: { label: 'Revised contract', get: (r) => money(r.revisedContract) },
  billed: { label: 'Billed', get: (r) => money(r.billed) },
  received: { label: 'Received', get: (r) => money(r.received) },
  outstanding: { label: 'Outstanding', get: (r) => money(r.outstanding) },
  expenses: { label: 'Costs', get: (r) => money(r.expenses) },
  profit: { label: 'Profit', get: (r) => money(r.profit) },
  margin: { label: 'Margin', get: (r) => pct(r.margin) },
  backlog: { label: 'Backlog', get: (r) => money(r.backlog) },
  burnPct: { label: 'Burn %', get: (r) => pct(r.burnPct) },
};

const kpiValue = (key: string, t: any): string => {
  switch (key) {
    case 'margin':
    case 'collectionRate':
    case 'burnPct':
    case 'avgCompletion':
      return pct(t[key]);
    case 'projectCount':
    case 'activeProjects':
    case 'changeOrderCount':
      return String(t[key] ?? 0);
    default:
      return money(t[key]);
  }
};

const grandTotal = (key: string, t: any): string => {
  if (key === 'completion') return pct(t.avgCompletion);
  if (['margin', 'burnPct'].includes(key)) return pct(t[key]);
  if (COLS[key] && typeof t[key] === 'number') return money(t[key]);
  return '';
};

// Inline SVG bar chart so the email needs no external images.
function svgBars(data: { label: string; value: number }[], color = '#111') {
  if (!data.length) return '';
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return `<table role="presentation" style="width:100%;border-collapse:collapse;font-size:11px">${data
    .map(
      (d) => `<tr>
        <td style="padding:3px 8px 3px 0;width:34%;border:none">${d.label}</td>
        <td style="padding:3px 0;border:none">
          <div style="background:#eee;border-radius:3px;height:10px;width:100%">
            <div style="background:${color};height:10px;border-radius:3px;width:${Math.round(
        (Math.abs(d.value) / max) * 100
      )}%"></div>
          </div>
        </td>
        <td style="padding:3px 0 3px 8px;text-align:right;white-space:nowrap;border:none">${money(d.value)}</td>
      </tr>`
    )
    .join('')}</table>`;
}

function buildHtml(sub: Sub, report: any, cfg: any) {
  const t = report.totals;
  const sections: string[] = cfg.sections || ['kpis', 'charts', 'projects', 'categories', 'aging'];
  const kpis: string[] = cfg.kpis || ['revisedContract', 'billed', 'received', 'outstanding', 'expenses', 'profit', 'margin', 'backlog'];
  const columns: string[] = (cfg.columns || ['status', 'billed', 'expenses', 'profit', 'margin']).filter((c: string) => COLS[c]);
  const limit: number = cfg.chartLimit || 10;

  const dir = cfg.sortDir === 'asc' ? 1 : -1;
  const rows = [...report.rows].sort((a: any, b: any) => {
    const key = cfg.sortBy || 'revisedContract';
    const va = a[key], vb = b[key];
    if (typeof va === 'string') return String(va).localeCompare(String(vb)) * dir;
    return ((va || 0) - (vb || 0)) * dir;
  });

  const parts: string[] = [];

  parts.push(`<div style="margin:12px 0 4px">${btn(`${APP_URL}/analytics`, 'Open analytics', true)}${btn(
    `${APP_URL}/projects`,
    'Projects'
  )}${btn(`${APP_URL}/owner-money`, 'Owner cockpit')}${btn(`${APP_URL}/expenses`, 'Expenses')}</div>`);

  if (sections.includes('kpis')) {
    parts.push(`<h2>Executive summary</h2><table role="presentation" style="width:100%;border-collapse:collapse"><tr>${kpis
      .map(
        (k, i) =>
          `<td style="width:25%;padding:8px;border:1px solid #e5e5e5;border-radius:6px"><div style="font-size:11px;color:#666">${
            KPI_LABELS[k] || k
          }</div><div style="font-size:16px;font-weight:600">${kpiValue(k, t)}</div></td>${
            (i + 1) % 4 === 0 ? '</tr><tr>' : ''
          }`
      )
      .join('')}</tr></table>`);
  }

  if (sections.includes('charts')) {
    const charts: string[] = cfg.charts || [];
    if (charts.includes('monthly') && report.monthly.length) {
      parts.push(`<h2>Billed vs costs by month</h2><table><thead><tr><th>Month</th><th class="num">Billed</th><th class="num">Received</th><th class="num">Costs</th><th class="num">Profit</th></tr></thead><tbody>${report.monthly
        .slice(-limit)
        .map(
          (m: any) =>
            `<tr><td>${m.month}</td><td class="num">${money(m.billed)}</td><td class="num">${money(
              m.received
            )}</td><td class="num">${money(m.expenses)}</td><td class="num">${money(m.profit)}</td></tr>`
        )
        .join('')}</tbody></table>`);
    }
    if (charts.includes('profitByProject')) {
      parts.push(
        `<h2>Profit by project</h2>${svgBars(
          rows.slice(0, limit).map((r: any) => ({ label: r.name, value: r.profit })),
          '#16a34a'
        )}`
      );
    }
    if (charts.includes('categoryMix')) {
      parts.push(
        `<h2>Cost category mix</h2>${svgBars(
          report.categories.slice(0, limit).map((c: any) => ({ label: c.label, value: c.total })),
          '#3b82f6'
        )}`
      );
    }
    if (charts.includes('agingChart')) {
      parts.push(
        `<h2>Receivables aging</h2>${svgBars(
          report.aging.map((a: any) => ({ label: a.label, value: a.total })),
          '#f59e0b'
        )}`
      );
    }
  }

  if (sections.includes('projects')) {
    parts.push(`<h2>Project scorecard</h2><table><thead><tr><th>Project</th>${columns
      .map((c) => `<th class="num">${COLS[c].label}</th>`)
      .join('')}<th></th></tr></thead><tbody>${rows
      .map(
        (r: any) =>
          `<tr><td><b>${r.name}</b><div style="font-size:11px;color:#666">${r.client}</div></td>${columns
            .map((c) => `<td class="num">${COLS[c].get(r)}</td>`)
            .join('')}<td class="num">${btn(`${APP_URL}/projects/${r.id}`, 'View')}</td></tr>`
      )
      .join('')}${
      cfg.showGrandTotals !== false
        ? `<tr><td><b>Grand total</b></td>${columns
            .map((c) => `<td class="num"><b>${grandTotal(c, t)}</b></td>`)
            .join('')}<td></td></tr>`
        : ''
    }</tbody></table>`);
  }

  if (sections.includes('categories')) {
    parts.push(`<h2>Cost by category</h2><table><thead><tr><th>Category</th><th class="num">Spend</th><th class="num">% of total</th></tr></thead><tbody>${report.categories
      .map((c: any) => `<tr><td>${c.label}</td><td class="num">${money(c.total)}</td><td class="num">${pct(c.pct)}</td></tr>`)
      .join('')}</tbody></table>`);
  }

  if (sections.includes('aging')) {
    parts.push(`<h2>Receivables aging</h2><table><thead><tr>${report.aging
      .map((a: any) => `<th class="num">${a.label}</th>`)
      .join('')}</tr></thead><tbody><tr>${report.aging
      .map((a: any) => `<td class="num">${money(a.total)}</td>`)
      .join('')}</tr></tbody></table>`);
  }

  if (sections.includes('leaders')) {
    parts.push(`<h2>Field leader summary</h2><table><thead><tr><th>Leader</th><th class="num">Projects</th><th class="num">Contract</th><th class="num">Billed</th><th class="num">Costs</th><th class="num">Profit</th></tr></thead><tbody>${report.leaders
      .map(
        (l: any) =>
          `<tr><td>${l.leader}</td><td class="num">${l.projects}</td><td class="num">${money(
            l.contract
          )}</td><td class="num">${money(l.billed)}</td><td class="num">${money(l.expenses)}</td><td class="num">${money(
            l.profit
          )}</td></tr>`
      )
      .join('')}</tbody></table>`);
  }

  if (sections.includes('vendors')) {
    parts.push(`<h2>Top vendors</h2><table><thead><tr><th>Vendor</th><th class="num">Spend</th></tr></thead><tbody>${report.vendors
      .map((v: any) => `<tr><td>${v.label}</td><td class="num">${money(v.total)}</td></tr>`)
      .join('')}</tbody></table>`);
  }

  if (sections.includes('changeOrders')) {
    parts.push(`<h2>Change order log</h2><table><thead><tr><th>#</th><th>Project</th><th>Description</th><th>Date</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>${report.changeOrderRows
      .slice(0, 50)
      .map(
        (c: any) =>
          `<tr><td>${c.number ?? ''}</td><td>${c.project}</td><td>${c.description}</td><td>${c.date || ''}</td><td>${
            c.status
          }</td><td class="num">${money(c.amount)}</td></tr>`
      )
      .join('')}</tbody></table>`);
  }

  const o = cfg.options || {};
  const rangeLabel = o.startDate || o.endDate ? `${o.startDate || 'start'} → ${o.endDate || 'today'}` : 'All time';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:'DM Sans',system-ui,sans-serif;color:#111;margin:24px;}
    h1{font-size:20px;margin:0 0 4px;} h2{font-size:14px;margin:22px 0 6px;}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px;}
    th,td{padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:left;}
    th{background:#f6f6f6;font-weight:600;}
    .num{text-align:right;}
  </style></head><body>
    <h1>${cfg.title || sub.name}</h1>
    <p style="color:#666;font-size:12px">RBF Construction &bull; ${new Date().toLocaleDateString(
      'en-US'
    )} &bull; ${rangeLabel} &bull; ${report.rows.length} projects</p>
    ${parts.join('')}
  </body></html>`;
}

async function sendOne(admin: any, resendKey: string, sub: Sub, isTest: boolean) {
  const cfg = sub.config || {};
  const options: AnalyticsOptions = { ...DEFAULT_ANALYTICS_OPTIONS, ...(cfg.options || {}) };

  const [p, e, b, c] = await Promise.all([
    admin.from('projects').select('*'),
    admin.from('expenses').select('*'),
    admin.from('project_billing').select('*'),
    admin.from('change_orders').select('*'),
  ]);

  const report = buildAnalytics(
    { projects: p.data || [], expenses: e.data || [], billing: b.data || [], changeOrders: c.data || [] },
    options
  );

  const recipients = (sub.recipients || []).filter((r) => !!r && r.includes('@'));
  if (!recipients.length) return { ok: false, error: 'No recipients configured' };

  const html = buildHtml(sub, report, cfg);

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: 'RBF Construction <noreply@portal.rbfconstruction.com>',
      to: recipients,
      subject: `${isTest ? '[TEST] ' : ''}${sub.subject_override || cfg.title || sub.name}`,
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
        .from('analytics_report_subscriptions')
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
        .from('analytics_report_subscriptions')
        .update({ last_sent_at: new Date().toISOString(), next_send_at: next })
        .eq('id', sub.id);
    }
  }

  return { ok: true, recipients: recipients.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return json({ error: 'RESEND_API_KEY not configured' }, 500);

    const payload = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    if (payload.subscription_id) {
      const { data: sub, error } = await admin
        .from('analytics_report_subscriptions')
        .select('*')
        .eq('id', payload.subscription_id)
        .maybeSingle();
      if (error || !sub) return json({ ok: false, error: error?.message || 'Subscription not found' }, 404);
      const result = await sendOne(admin, resendKey, sub as Sub, !!payload.test);
      return json(result, result.ok ? 200 : 400);
    }

    // Cron dispatch: send everything that is due.
    const { data: due } = await admin
      .from('analytics_report_subscriptions')
      .select('*')
      .eq('enabled', true)
      .not('next_send_at', 'is', null)
      .lte('next_send_at', new Date().toISOString());

    const results = [];
    for (const sub of (due || []) as Sub[]) {
      results.push({ id: sub.id, ...(await sendOne(admin, resendKey, sub, false)) });
    }
    return json({ ok: true, processed: results.length, results });
  } catch (err) {
    console.error('send-analytics-report error', err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
