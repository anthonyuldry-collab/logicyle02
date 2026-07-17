import React, { useMemo } from 'react';
import { ChartSlice, MonthlyCashflowPoint } from '../../utils/financialChartUtils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, children, className = '' }) => (
  <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
    <div className="mb-3">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

export const DonutChart: React.FC<{
  slices: ChartSlice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}> = ({ slices, size = 160, centerLabel, centerValue }) => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = slices.map((slice) => {
    const pct = total > 0 ? slice.value / total : 0;
    const dash = pct * circumference;
    const seg = { ...slice, dash, offset, pct };
    offset += dash;
    return seg;
  });

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height: size }}>
        Aucune donnée
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
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
            />
          ))}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            {centerValue && <span className="text-lg font-bold text-gray-900">{centerValue}</span>}
            {centerLabel && <span className="text-[10px] text-gray-500 uppercase tracking-wide">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="flex-1 space-y-1.5 min-w-0 w-full">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="truncate text-gray-700 flex-1">{seg.label}</span>
            <span className="font-medium text-gray-900 tabular-nums">{Math.round(seg.pct * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const CashflowBarChart: React.FC<{
  points: MonthlyCashflowPoint[];
  height?: number;
}> = ({ points, height = 200 }) => {
  const maxVal = useMemo(() => {
    const m = Math.max(...points.flatMap((p) => [p.income, p.expenses]), 1);
    return m * 1.15;
  }, [points]);

  const barWidth = Math.min(28, Math.max(12, 320 / Math.max(points.length, 1)));
  const chartWidth = points.length * (barWidth * 2 + 16) + 40;
  const chartHeight = height;

  if (points.every((p) => p.income === 0 && p.expenses === 0)) {
    return <div className="text-sm text-gray-400 text-center py-12">Aucune donnée sur la période</div>;
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <svg width={Math.max(chartWidth, 280)} height={chartHeight + 28} className="min-w-full">
        {points.map((p, i) => {
          const x = 32 + i * (barWidth * 2 + 16);
          const incomeH = (p.income / maxVal) * (chartHeight - 24);
          const expenseH = (p.expenses / maxVal) * (chartHeight - 24);
          return (
            <g key={p.key}>
              <rect
                x={x}
                y={chartHeight - incomeH}
                width={barWidth}
                height={incomeH}
                rx={3}
                fill="#10b981"
                opacity={0.9}
              />
              <rect
                x={x + barWidth + 4}
                y={chartHeight - expenseH}
                width={barWidth}
                height={expenseH}
                rx={3}
                fill="#ef4444"
                opacity={0.85}
              />
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
      <div className="flex gap-4 justify-center mt-2 text-xs text-gray-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Revenus</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" /> Dépenses</span>
      </div>
    </div>
  );
};

export const BalanceLineChart: React.FC<{
  points: { label: string; value: number }[];
  height?: number;
}> = ({ points, height = 120 }) => {
  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const w = Math.max(280, points.length * 48);
  const h = height;
  const pad = 16;

  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (p.value - min) / range) * (h - pad * 2);
    return { x, y, ...p };
  });

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaD = `${pathD} L ${coords[coords.length - 1]?.x ?? 0} ${h - pad} L ${coords[0]?.x ?? 0} ${h - pad} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="max-h-32">
      <defs>
        <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#balanceGrad)" />
      <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c) => (
        <circle key={c.label} cx={c.x} cy={c.y} r={3} fill="#4f46e5" />
      ))}
    </svg>
  );
};

export const PipelineBar: React.FC<{
  steps: { label: string; count: number; amount: number; color: string }[];
  formatAmount: (n: number) => string;
}> = ({ steps, formatAmount }) => {
  const max = Math.max(...steps.map((s) => s.amount), 1);
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700">{step.label}</span>
            <span className="text-gray-500">{step.count} · {formatAmount(step.amount)}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(step.amount / max) * 100}%`, backgroundColor: step.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const KpiSparkline: React.FC<{ values: number[]; color?: string }> = ({ values, color = '#10b981' }) => {
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
};
