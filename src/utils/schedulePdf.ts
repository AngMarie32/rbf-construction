import { differenceInCalendarDays, format, max as maxDate, min as minDate, startOfMonth, addMonths, isWeekend, addDays } from 'date-fns';
import type { Task } from '@/types';
import { DocKit, COLORS, loadCompany, fileSlug, type RGB } from './pdfDocKit';
import { downloadCsv } from '@/components/ui/export-menu';

interface Project {
  id: string;
  name: string;
  color?: string;
  client?: string;
}

export interface SchedulePdfOptions {
  includeGanttChart: boolean;
  includeTaskList: boolean;
  includeCriticalPath: boolean;
  includeProgress: boolean;
  includeDependencies: boolean;
  includeProjectInfo: boolean;
  dateFormat: string;
}

const STATUS_COLOR: Record<string, RGB> = {
  Completed: [16, 185, 129],
  'In Progress': [37, 99, 235],
  'On Hold': [245, 158, 11],
  'Not Started': [148, 163, 184],
};
const valid = (d: any) => d instanceof Date && !isNaN(d.getTime());
const workdays = (a: Date, b: Date) => {
  let n = 0;
  for (let d = new Date(a); d <= b; d = addDays(d, 1)) if (!isWeekend(d)) n++;
  return Math.max(1, n);
};

/** Longest chain of dependent tasks by end date (simple forward pass). */
function criticalPath(tasks: Task[]) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const memo = new Map<string, Task[]>();
  const chain = (t: Task, seen = new Set<string>()): Task[] => {
    if (memo.has(t.id)) return memo.get(t.id)!;
    if (seen.has(t.id)) return [t];
    seen.add(t.id);
    let best: Task[] = [];
    for (const d of t.dependencies || []) {
      const p = byId.get(d);
      if (!p) continue;
      const c = chain(p, seen);
      const end = (x: Task[]) => (x.length ? x[x.length - 1].endDate.getTime() : 0);
      if (end(c) > end(best) || (end(c) === end(best) && c.length > best.length)) best = c;
    }
    const r = [...best, t];
    memo.set(t.id, r);
    return r;
  };
  let longest: Task[] = [];
  tasks.forEach((t) => {
    const c = chain(t);
    const span = (x: Task[]) => (x.length ? x[x.length - 1].endDate.getTime() - x[0].startDate.getTime() : 0);
    if (span(c) > span(longest)) longest = c;
  });
  return longest.length > 1 ? longest : [];
}

/** Vector Gantt chart: one row per task, grouped by project, month grid, today line, progress fill. */
function drawGantt(doc: DocKit, groups: { project: Project; tasks: Task[] }[], from: Date, to: Date) {
  const { pdf } = doc;
  const M = doc.M;
  const labelW = 70;
  const chartX = M + labelW;
  const chartW = doc.W - M - chartX;
  const rowH = 5.2;
  const totalDays = Math.max(1, differenceInCalendarDays(to, from) + 1);
  const xOf = (d: Date) => chartX + (differenceInCalendarDays(d, from) / totalDays) * chartW;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const header = () => {
    doc.ensure(14);
    const top = doc.y;
    doc.fill(COLORS.navy);
    pdf.rect(M, top, doc.W - 2 * M, 7, 'F');
    doc.font(7.5, 'bold', [255, 255, 255]);
    pdf.text('TASK', M + 2, top + 4.7);
    for (let m = startOfMonth(from); m <= to; m = addMonths(m, 1)) {
      const x = Math.max(chartX, xOf(m));
      const next = Math.min(xOf(addMonths(m, 1)), chartX + chartW);
      if (next - x > 9) pdf.text(format(m, next - x > 22 ? 'MMM yyyy' : 'MMM'), x + 1.5, top + 4.7);
      doc.stroke([71, 85, 105], 0.2);
      pdf.line(x, top, x, top + 7);
    }
    doc.y = top + 8;
  };

  const gridFor = (top: number, h: number) => {
    for (let m = startOfMonth(from); m <= to; m = addMonths(m, 1)) {
      const x = xOf(m);
      if (x < chartX) continue;
      doc.stroke(COLORS.line, 0.15);
      pdf.line(x, top, x, top + h);
    }
    if (today >= from && today <= to) {
      doc.stroke([225, 29, 72], 0.4);
      pdf.line(xOf(today), top, xOf(today), top + h);
    }
  };

  header();
  groups.forEach(({ project, tasks }) => {
    if (doc.y + rowH * 2 > doc.bottom) {
      doc.newPage();
      header();
    }
    // project row
    doc.fill(COLORS.tint);
    pdf.rect(M, doc.y, doc.W - 2 * M, rowH, 'F');
    doc.font(7.8, 'bold', COLORS.navy);
    pdf.text(pdf.splitTextToSize(project.name, labelW + chartW - 4)[0], M + 2, doc.y + 3.6);
    doc.y += rowH;
    tasks.forEach((t, i) => {
      if (doc.y + rowH > doc.bottom) {
        doc.newPage();
        header();
      }
      const top = doc.y;
      if (i % 2) {
        doc.fill(COLORS.zebra);
        pdf.rect(M, top, doc.W - 2 * M, rowH, 'F');
      }
      gridFor(top, rowH);
      doc.font(7, 'normal', COLORS.ink);
      pdf.text(pdf.splitTextToSize(t.title, labelW - 6)[0], M + 4, top + 3.6);
      if (valid(t.startDate) && valid(t.endDate)) {
        const x1 = Math.max(chartX, xOf(t.startDate));
        const x2 = Math.min(chartX + chartW, xOf(addDays(t.endDate, 1)));
        const w = Math.max(1.2, x2 - x1);
        const c = STATUS_COLOR[t.status] || STATUS_COLOR['Not Started'];
        doc.fill([Math.round(c[0] + (255 - c[0]) * 0.65), Math.round(c[1] + (255 - c[1]) * 0.65), Math.round(c[2] + (255 - c[2]) * 0.65)]);
        pdf.roundedRect(x1, top + 1.1, w, rowH - 2.2, 0.8, 0.8, 'F');
        const p = Math.max(0, Math.min(100, Number(t.progress) || 0));
        if (p > 0) {
          doc.fill(c);
          pdf.roundedRect(x1, top + 1.1, Math.max(0.8, (w * p) / 100), rowH - 2.2, 0.8, 0.8, 'F');
        }
        const late = t.status !== 'Completed' && t.endDate < today;
        if (late) {
          doc.stroke([225, 29, 72], 0.35);
          pdf.roundedRect(x1, top + 1.1, w, rowH - 2.2, 0.8, 0.8, 'S');
        }
      }
      doc.y += rowH;
    });
  });
  // legend
  doc.y += 2;
  doc.ensure(6);
  let lx = M;
  doc.font(7, 'normal', COLORS.muted);
  (['Not Started', 'In Progress', 'On Hold', 'Completed'] as const).forEach((k) => {
    doc.fill(STATUS_COLOR[k]);
    pdf.rect(lx, doc.y, 4, 2.6, 'F');
    pdf.text(k, lx + 5.5, doc.y + 2.3);
    lx += pdf.getTextWidth(k) + 12;
  });
  doc.stroke([225, 29, 72], 0.5);
  pdf.line(lx, doc.y - 0.4, lx, doc.y + 3);
  pdf.text('Today', lx + 2, doc.y + 2.3);
  lx += 16;
  pdf.text('Red outline = past due · darker fill = % complete', lx, doc.y + 2.3);
  doc.y += 7;
}

export async function generateSchedulePdf(tasks: Task[], projects: Project[], options: SchedulePdfOptions, title = 'Project Schedule') {
  const company = await loadCompany();
  const fmt = (d: Date) => (valid(d) ? format(d, options.dateFormat || 'MM/dd/yyyy') : '—');
  const usable = tasks.filter((t) => valid(t.startDate) && valid(t.endDate));
  const groups = projects
    .map((p) => ({ project: p, tasks: usable.filter((t) => t.projectId === p.id).sort((a, b) => a.startDate.getTime() - b.startDate.getTime()) }))
    .filter((g) => g.tasks.length);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const done = usable.filter((t) => t.status === 'Completed').length;
  const late = usable.filter((t) => t.status !== 'Completed' && t.endDate < today);
  const avg = usable.length ? Math.round(usable.reduce((a, t) => a + (Number(t.progress) || 0), 0) / usable.length) : 0;
  const from = usable.length ? startOfMonth(minDate(usable.map((t) => t.startDate))) : startOfMonth(today);
  const to = usable.length ? maxDate(usable.map((t) => t.endDate)) : addMonths(today, 1);

  const doc = new DocKit(company, title, groups.length === 1 ? groups[0].project.name : `${groups.length} projects`, 'landscape');
  doc.letterhead([
    { label: 'Printed', value: format(new Date(), 'MMM d, yyyy') },
    { label: 'Schedule window', value: `${fmt(from)} – ${fmt(to)}` },
    { label: 'Tasks', value: `${usable.length} (${done} done)` },
    { label: 'Average progress', value: `${avg}%` },
    { label: 'Past due', value: String(late.length) },
  ]);

  if (options.includeProjectInfo && groups.length) {
    doc.infoBoxes(
      groups.slice(0, 3).map((g) => {
        const s = minDate(g.tasks.map((t) => t.startDate));
        const e = maxDate(g.tasks.map((t) => t.endDate));
        const pct = Math.round(g.tasks.reduce((a, t) => a + (Number(t.progress) || 0), 0) / g.tasks.length);
        return { title: g.project.name, lines: [g.project.client, `${fmt(s)} – ${fmt(e)}`, `${g.tasks.length} tasks · ${pct}% average progress`] };
      })
    );
  }

  if (options.includeGanttChart && groups.length) {
    doc.heading('Timeline');
    drawGantt(doc, groups, from, to);
  }

  if (options.includeTaskList) {
    const byId = new Map(usable.map((t) => [t.id, t]));
    groups.forEach((g) => {
      doc.heading(`${g.project.name}: tasks`);
      const cols = [
        { header: 'Task', width: 30 },
        { header: 'Start', width: 10 },
        { header: 'Finish', width: 10 },
        { header: 'Days', width: 6, align: 'right' as const },
        ...(options.includeProgress ? [{ header: 'Progress', width: 8, align: 'right' as const }] : []),
        { header: 'Status', width: 10 },
        ...(options.includeDependencies ? [{ header: 'Depends on', width: 22 }] : []),
      ];
      doc.table(
        cols,
        g.tasks.map((t) => {
          const isLate = t.status !== 'Completed' && t.endDate < today;
          return [
            { text: t.title, bold: true },
            fmt(t.startDate),
            { text: fmt(t.endDate), color: isLate ? ([225, 29, 72] as RGB) : undefined },
            String(workdays(t.startDate, t.endDate)),
            ...(options.includeProgress ? [`${Math.round(Number(t.progress) || 0)}%`] : []),
            { text: isLate ? `${t.status} · late` : t.status, color: isLate ? ([225, 29, 72] as RGB) : undefined },
            ...(options.includeDependencies ? [(t.dependencies || []).map((d) => byId.get(d)?.title).filter(Boolean).join(', ') || '—'] : []),
          ];
        }),
        { fontSize: 8 }
      );
    });
  }

  if (options.includeCriticalPath) {
    const cp = criticalPath(usable);
    doc.heading('Critical path');
    if (!cp.length) doc.paragraph('No dependency chain found. Link tasks with dependencies to see the critical path.', 9, COLORS.muted);
    else
      doc.table(
        [
          { header: '#', width: 4, align: 'center' },
          { header: 'Task', width: 40 },
          { header: 'Start', width: 12 },
          { header: 'Finish', width: 12 },
          { header: 'Status', width: 12 },
        ],
        cp.map((t, i) => [String(i + 1), { text: t.title, bold: true }, fmt(t.startDate), fmt(t.endDate), t.status]),
        { fontSize: 8 }
      );
  }

  doc.save(`schedule-${fileSlug(groups.length === 1 ? groups[0].project.name : 'projects')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function scheduleCsv(tasks: Task[], projects: Project[]) {
  const name = new Map(projects.map((p) => [p.id, p.name]));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  downloadCsv(
    `schedule-${format(new Date(), 'yyyy-MM-dd')}`,
    ['Project', 'Task', 'Start', 'Finish', 'Work days', 'Progress %', 'Status', 'Depends on'],
    tasks
      .filter((t) => valid(t.startDate) && valid(t.endDate))
      .sort((a, b) => String(name.get(a.projectId)).localeCompare(String(name.get(b.projectId))) || a.startDate.getTime() - b.startDate.getTime())
      .map((t) => [
        name.get(t.projectId) || '',
        t.title,
        format(t.startDate, 'yyyy-MM-dd'),
        format(t.endDate, 'yyyy-MM-dd'),
        workdays(t.startDate, t.endDate),
        Math.round(Number(t.progress) || 0),
        t.status,
        (t.dependencies || []).map((d) => byId.get(d)?.title).filter(Boolean).join('; '),
      ])
  );
}
