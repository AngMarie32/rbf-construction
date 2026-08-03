import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface AgingBucket {
  bucket: string;
  amount: number;
  tone: 'ok' | 'warn' | 'bad';
}

const TONE: Record<AgingBucket['tone'], string> = {
  ok: 'hsl(142 71% 45%)',
  warn: 'hsl(45 93% 47%)',
  bad: 'hsl(0 72% 51%)',
};

const compact = (n: number) => `$${Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toFixed(0)}`;

export function AgingChart({ data }: { data: AgingBucket[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
        Nothing outstanding. All caught up.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={56} />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
            color: 'hsl(var(--popover-foreground))',
          }}
          formatter={(v: number) => [
            (Number(v) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }),
            'Outstanding',
          ]}
        />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {data.map((d) => (
            <Cell key={d.bucket} fill={TONE[d.tone]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}