import React, { useMemo, useState, memo } from 'react';
import { ChartSlice, MonthlyCashflowPoint } from '../../utils/financialChartUtils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = memo(({ title, subtitle, children, className = '' }) => (
  <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
    <div className="mb-3">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
));
ChartCard.displayName = 'ChartCard';

export const DonutChart: React.FC<{
  slices: ChartSlice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  formatAmount?: (n: number) => string;
  emptyLabel?: string;
}> = memo(({ slices, size = 160, centerLabel, centerValue, formatAmount, emptyLabel = 'Aucune donnée' }) => {
  const { total, r, cx, cy, circumference, segments } = useMemo(() => {
    const totalValue = slices.reduce((s, x) => s + x.value, 0);
    const radius = size / 2 - 12;
    const circ = 2 * Math.PI * radius;
    let offset = 0;
    const segs = slices.map((slice) => {
      const pct = totalValue > 0 ? slice.value / totalValue : 0;
      const dash = pct * circ;
      const seg = { ...slice, dash, offset, pct };
      offset += dash;
      return seg;
    });
    return {
      total: totalValue,
      r: radius,
      cx: size / 2,
      cy: size / 2,
      circumference: circ,
      segments: segs,
    };
  }, [slices, size]);

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height: size }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={centerLabel}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={20} />
          {segments.map((seg) => (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={20}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset}
              className="transition-all duration-500"
            >
              <title>
                {seg.label}: {formatAmount ? formatAmount(seg.value) : seg.value} (
                {Math.round(seg.pct * 100)}%)
              </title>
            </circle>
          ))}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            {centerValue && <span className="text-lg font-bold text-gray-900 tabular-nums">{centerValue}</span>}
            {centerLabel && (
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">{centerLabel}</span>
            )}
          </div>
        )}
      </div>
      <ul className="flex-1 space-y-1.5 min-w-0 w-full">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="truncate text-gray-700 flex-1" title={seg.label}>
              {seg.label}
            </span>
            {formatAmount && (
              <span className="text-gray-500 tabular-nums shrink-0">{formatAmount(seg.value)}</span>
            )}
            <span className="font-medium text-gray-900 tabular-nums w-9 text-right">
              {Math.round(seg.pct * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
});
DonutChart.displayName = 'DonutChart';

export const CashflowBarChart: React.FC<{
  points: MonthlyCashflowPoint[];
  height?: number;
  formatAmount?: (n: number) => string;
  emptyLabel?: string;
  incomeLabel?: string;
  expenseLabel?: string;
  balanceLabel?: string;
}> = memo(({
  points,
  height = 200,
  formatAmount,
  emptyLabel = 'Aucune donnée sur la période',
  incomeLabel = 'Revenus',
  expenseLabel = 'Dépenses',
  balanceLabel = 'Solde',
}) => {
  const [hover, setHover] = useState<{
    label: string;
    income: number;
    expenses: number;
    balance: number;
    x: number;
    y: number;
  } | null>(null);

  const maxVal = useMemo(() => {
    const m = Math.max(...points.flatMap((p) => [p.income, p.expenses]), 1);
    return m * 1.15;
  }, [points]);

  const barWidth = Math.min(28, Math.max(12, 320 / Math.max(points.length, 1)));
  const chartWidth = points.length * (barWidth * 2 + 16) + 40;
  const chartHeight = height;

  if (points.length === 0 || points.every((p) => p.income === 0 && p.expenses === 0)) {
    return <div className="text-sm text-gray-400 text-center py-12">{emptyLabel}</div>;
  }

  const fmt = formatAmount || ((n: number) => String(Math.round(n)));

  return (
    <div className="relative overflow-x-auto -mx-1 px-1">
      <svg width={Math.max(chartWidth, 280)} height={chartHeight + 28} className="min-w-full">
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = chartHeight - frac * (chartHeight - 24);
          return (
            <line
              key={frac}
              x1={28}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
          );
        })}
        {points.map((p, i) => {
          const x = 32 + i * (barWidth * 2 + 16);
          const incomeH = (p.income / maxVal) * (chartHeight - 24);
          const expenseH = (p.expenses / maxVal) * (chartHeight - 24);
          return (
            <g
              key={p.key}
              onMouseEnter={() =>
                setHover({
                  label: p.label,
                  income: p.income,
                  expenses: p.expenses,
                  balance: p.balance,
                  x: x + barWidth,
                  y: Math.min(chartHeight - incomeH, chartHeight - expenseH) - 8,
                })
              }
              onMouseLeave={() => setHover(null)}
              className="cursor-default"
            >
              <rect
                x={x}
                y={chartHeight - incomeH}
                width={barWidth}
                height={Math.max(incomeH, 0)}
                rx={3}
                fill="#10b981"
                opacity={0.9}
              >
                <title>
                  {p.label} — {incomeLabel}: {fmt(p.income)}
                </title>
              </rect>
              <rect
                x={x + barWidth + 4}
                y={chartHeight - expenseH}
                width={barWidth}
                height={Math.max(expenseH, 0)}
                rx={3}
                fill="#ef4444"
                opacity={0.85}
              >
                <title>
                  {p.label} — {expenseLabel}: {fmt(p.expenses)}
                </title>
              </rect>
              <text
                x={x + barWidth}
                y={chartHeight + 14}
                textAnchor="middle"
                className="fill-gray-500 text-[9px]"
              >
                {p.label}
              </text>
            </g>
          );
        })}
        <line x1={28} y1={0} x2={28} y2={chartHeight} stroke="#e2e8f0" strokeWidth={1} />
        <line x1={28} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#e2e8f0" strokeWidth={1} />
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md"
          style={{ left: Math.min(hover.x, chartWidth - 140), top: Math.max(hover.y, 4) }}
        >
          <p className="font-semibold text-gray-900">{hover.label}</p>
          <p className="text-emerald-700">
            {incomeLabel}: {fmt(hover.income)}
          </p>
          <p className="text-red-600">
            {expenseLabel}: {fmt(hover.expenses)}
          </p>
          <p className={hover.balance >= 0 ? 'text-blue-700' : 'text-red-700'}>
            {balanceLabel}: {fmt(hover.balance)}
          </p>
        </div>
      )}
      <div className="flex gap-4 justify-center mt-2 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" /> {incomeLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500" /> {expenseLabel}
        </span>
      </div>
    </div>
  );
});
CashflowBarChart.displayName = 'CashflowBarChart';

export const BalanceLineChart: React.FC<{
  points: { label: string; value: number }[];
  height?: number;
  formatAmount?: (n: number) => string;
  emptyLabel?: string;
  /** Soldes mensuels (non cumulés) pour afficher la variation */
  monthlyBalances?: number[];
}> = memo(({ points, height = 160, formatAmount, emptyLabel = 'Aucune donnée', monthlyBalances }) => {
  if (points.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-8">{emptyLabel}</div>;
  }

  const values = points.map((p) => p.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const dataRange = dataMax - dataMin;
  // Zoom sur la plage utile si le solde est plat / élevé (évite une ligne collée en haut)
  const padRatio = dataRange < Math.max(Math.abs(dataMax) * 0.05, 1) ? 0.15 : 0.08;
  const span = Math.max(dataRange, Math.abs(dataMax) * 0.08, 1);
  const min = dataMin - span * padRatio;
  const max = dataMax + span * padRatio;
  const range = max - min || 1;
  const w = Math.max(320, points.length * 52);
  const h = height;
  const padX = 44;
  const padY = 18;

  const coords = points.map((p, i) => {
    const x = padX + (i / Math.max(points.length - 1, 1)) * (w - padX - 12);
    const y = padY + (1 - (p.value - min) / range) * (h - padY * 2 - 16);
    return { x, y, ...p };
  });

  const zeroInRange = min <= 0 && max >= 0;
  const zeroY = padY + (1 - (0 - min) / range) * (h - padY * 2 - 16);
  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const baselineY = h - padY - 16;
  const areaD = `${pathD} L ${coords[coords.length - 1]?.x ?? 0} ${baselineY} L ${coords[0]?.x ?? 0} ${baselineY} Z`;
  const fmt = formatAmount || ((n: number) => String(Math.round(n)));
  const last = coords[coords.length - 1];
  const ticks = [max, (max + min) / 2, min];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="max-h-48">
        <defs>
          <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((tick, i) => {
          const y = padY + (1 - (tick - min) / range) * (h - padY * 2 - 16);
          return (
            <g key={`tick-${i}`}>
              <line x1={padX} y1={y} x2={w - 12} y2={y} stroke="#334155" strokeWidth={1} />
              <text x={padX - 6} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize={9}>
                {fmt(tick)}
              </text>
            </g>
          );
        })}
        {zeroInRange && (
          <line
            x1={padX}
            y1={zeroY}
            x2={w - 12}
            y2={zeroY}
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}
        <path d={areaD} fill="url(#balanceGrad)" />
        <path
          d={pathD}
          fill="none"
          stroke="#a5b4fc"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => {
          const monthly = monthlyBalances?.[i];
          return (
            <g key={`${c.label}-${i}`}>
              <circle cx={c.x} cy={c.y} r={4} fill="#818cf8" stroke="#0f172a" strokeWidth={1.5}>
                <title>
                  {c.label}: {fmt(c.value)}
                  {monthly != null ? ` (mois: ${fmt(monthly)})` : ''}
                </title>
              </circle>
              <text
                x={c.x}
                y={h - 4}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={9}
              >
                {c.label}
              </text>
            </g>
          );
        })}
        {last && (
          <text
            x={Math.min(last.x + 8, w - 8)}
            y={Math.max(last.y - 10, 12)}
            fill="#c7d2fe"
            fontSize={11}
            fontWeight={600}
          >
            {fmt(last.value)}
          </text>
        )}
      </svg>
      {monthlyBalances && monthlyBalances.some((v) => v !== 0) && (
        <div className="mt-2 flex flex-wrap gap-2 justify-center text-[10px] text-slate-400">
          <span>Variation mensuelle :</span>
          {points.map((p, i) => (
            <span
              key={p.label}
              className={
                (monthlyBalances[i] || 0) > 0
                  ? 'text-emerald-400'
                  : (monthlyBalances[i] || 0) < 0
                    ? 'text-red-400'
                    : 'text-slate-500'
              }
            >
              {p.label} {fmt(monthlyBalances[i] || 0)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
BalanceLineChart.displayName = 'BalanceLineChart';

export const PipelineBar: React.FC<{
  steps: { label: string; count: number; amount: number; color: string }[];
  formatAmount: (n: number) => string;
}> = memo(({ steps, formatAmount }) => {
  const max = Math.max(...steps.map((s) => Math.abs(s.amount)), 1);
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.label}>
          <div className="flex justify-between text-xs mb-1 gap-2">
            <span className="font-medium text-gray-700">{step.label}</span>
            <span className="text-gray-500 tabular-nums shrink-0">
              {step.count} · {formatAmount(step.amount)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(Math.abs(step.amount) / max) * 100}%`,
                backgroundColor: step.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});
PipelineBar.displayName = 'PipelineBar';

export const KpiSparkline: React.FC<{ values: number[]; color?: string }> = memo(({
  values,
  color = '#10b981',
}) => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="opacity-80">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
});
KpiSparkline.displayName = 'KpiSparkline';
