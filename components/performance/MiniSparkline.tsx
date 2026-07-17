import React, { useMemo } from 'react';

interface MiniSparklineProps {
  values: Array<number | null | undefined>;
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  /** Si true, une hausse est positive (vert). Pour les Δ% fatigue, passer invertColors. */
  invertColors?: boolean;
  className?: string;
  ariaLabel?: string;
}

const MiniSparkline: React.FC<MiniSparklineProps> = ({
  values,
  width = 96,
  height = 28,
  stroke,
  fill,
  invertColors = false,
  className = '',
  ariaLabel,
}) => {
  const points = useMemo(
    () => values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)),
    [values]
  );

  if (points.length < 2) {
    return (
      <div
        className={`inline-flex items-center justify-center text-[10px] text-gray-400 ${className}`}
        style={{ width, height }}
      >
        —
      </div>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padY = 2;
  const usableH = height - padY * 2;

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * (width - 2) + 1;
    const y = padY + (1 - (v - min) / range) * usableH;
    return { x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height} L${coords[0].x.toFixed(1)},${height} Z`;

  const delta = points[points.length - 1] - points[0];
  const improving = invertColors ? delta < 0 : delta > 0;
  const worsening = invertColors ? delta > 0 : delta < 0;
  const autoStroke = improving ? '#059669' : worsening ? '#dc2626' : '#64748b';
  const autoFill = improving ? 'rgba(5,150,105,0.15)' : worsening ? 'rgba(220,38,38,0.12)' : 'rgba(100,116,139,0.12)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <path d={areaPath} fill={fill || autoFill} />
      <path d={linePath} fill="none" stroke={stroke || autoStroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r={2.2}
        fill={stroke || autoStroke}
      />
    </svg>
  );
};

export default MiniSparkline;
