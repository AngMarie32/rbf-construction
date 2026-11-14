import { supabase } from '@/integrations/supabase/client';
import { DocKit, COLORS, loadCompany, usd, fmtDate, fileSlug } from './pdfDocKit';

/** One change order as a signable PDF on the company letterhead, with the contract sum before and after. */
export async function exportChangeOrderPdf(changeOrderId: string) {
  const { data: co, error } = await supabase.from('change_orders').select('*').eq('id', changeOrderId).single();
  if (error || !co) throw new Error(error?.message || 'Change order not found');
  const [{ data: project }, { data: all }, company] = await Promise.all([
    supabase.from('projects').select('name,client,address,project_code,contract_value,original_contract_sum').eq('id', co.project_id).single(),
    supabase.from('change_orders').select('id,number,amount,status,date,created_at').eq('project_id', co.project_id),
    loadCompany(),
  ]);
  const approved = (s: string | null) => /approv|execut|signed/i.test(String(s || ''));
  const order = (c: any) => `${c.date || c.created_at || ''}|${String(c.number || '').padStart(6, '0')}`;
  const others = (all || []).filter((c: any) => c.id !== co.id && approved(c.status) && order(c) < order(co));
  const prior = others.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
  const allApproved = (all || []).filter((c: any) => approved(c.status)).reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
  // Original contract: stored value, or current contract minus every approved change.
  const original = Number(project?.original_contract_sum) || Math.max(0, (Number(project?.contract_value) || 0) - allApproved);
  const amount = Number(co.amount) || 0;
  const before = original + prior;

  const doc = new DocKit(company, 'Change Order', `CO #${co.number}`);
  doc.letterhead([
    { label: 'Change order', value: `#${co.number}` },
    { label: 'Date', value: co.date ? fmtDate(new Date(`${co.date}T00:00:00`)) : fmtDate(new Date()) },
    { label: 'Status', value: co.status || 'Pending' },
  ]);
  doc.infoBoxes([
    { title: 'Project', lines: [project?.name, project?.project_code ? `Job #${project.project_code}` : null, project?.address] },
    { title: 'Owner / client', lines: [project?.client || '—'] },
  ]);
  doc.heading('Description of change');
  doc.paragraph(co.description || '—');
  doc.heading('Contract sum');
  doc.totals([
    { label: 'Original contract sum', value: usd(original) },
    { label: `Previously approved change orders (${others.length})`, value: usd(prior) },
    { label: 'Contract sum before this change', value: usd(before) },
    { label: `This change order ${amount < 0 ? '(credit)' : ''}`.trim(), value: usd(amount) },
    { label: 'New contract sum', value: usd(before + amount) },
  ]);
  doc.paragraph(
    'This change order becomes part of the contract when signed by both parties. Unless stated above, all other terms of the contract stay the same.',
    8.5,
    COLORS.muted
  );
  doc.signatures([{ title: 'Owner / client', name: project?.client || undefined }, { title: 'Contractor', name: company.name }]);
  doc.save(`change-order-${co.number}-${fileSlug(project?.name || 'project')}.pdf`);
}
