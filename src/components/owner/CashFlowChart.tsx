import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface CashFlowPoint {
  month: string;
  collected: number;
  paid: number;
  net: number;
}

const compact = (n: number) =>
  `$${Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toFixed(0)}`;

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
        No payment activity in this range.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={56} />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
            color: 'hsl(var(--popover-foreground))',
          }}
          formatter={(v: number, name) => [
            (Number(v) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }),
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="collected" name="Collected" stroke="hsl(var(--primary))" fill="url(#gIn)" strokeWidth={2} />
        <Area type="monotone" dataKey="paid" name="Paid out" stroke="hsl(var(--muted-foreground))" fill="url(#gOut)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}