import React from 'react';

const SHORT_AXIS_LABELS: Record<string, string> = {
  Sprint: 'Sprint',
  Anaérobie: 'Anaé.',
  Puncheur: 'Punch.',
  Grimpeur: 'Grimp.',
  Rouleur: 'Roul.',
};

type SpiderChartProps = {
  data: { axis: string; value: number }[];
  size?: number;
  maxValue?: number;
  fill?: string;
  stroke?: string;
  labelColor?: string;
  gridStroke?: string;
};

/** Radar avec marge dédiée aux libellés (évite les textes coupés). */
const SpiderChart: React.FC<SpiderChartProps> = ({
  data,
  size = 180,
  maxValue = 100,
  fill = 'rgba(74, 222, 128, 0.4)',
  stroke = 'rgba(74, 222, 128, 1)',
  labelColor = 'rgb(226, 232, 240)',
  gridStroke = 'rgba(148, 163, 184, 0.45)',
}) => {
  const numAxes = data.length;
  if (numAxes < 3) {
    return (
      <p className="text-xs text-center text-slate-400">
        Données insuffisantes pour le graphique radar.
      </p>
    );
  }

  const angleSlice = (Math.PI * 2) / numAxes;
  const labelMargin = Math.max(42, Math.round(size * 0.28));
  const radius = Math.max(20, size / 2 - labelMargin);
  const center = size / 2;
  const fontSize = Math.max(9, Math.min(13, Math.round(size * 0.055)));
  const useShortLabels = size < 170;
  const labelOffset = Math.max(14, Math.round(labelMargin * 0.42));

  const displayLabel = (axis: string) =>
    useShortLabels ? (SHORT_AXIS_LABELS[axis] ?? axis) : axis;

  const points = data
    .map((d, i) => {
      const value = Math.max(0, Math.min(d.value || 0, maxValue));
      const x = center + radius * (value / maxValue) * Math.cos(angleSlice * i - Math.PI / 2);
      const y = center + radius * (value / maxValue) * Math.sin(angleSlice * i - Math.PI / 2);
      return `${x},${y}`;
    })
    .join(' ');

  const axisLines = data.map((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const x2 = center + radius * cosAngle;
    const y2 = center + radius * sinAngle;
    const lx = center + (radius + labelOffset) * cosAngle;
    const ly = center + (radius + labelOffset) * sinAngle;

    let textAnchor: 'start' | 'middle' | 'end' = 'middle';
    if (lx > center + 4) textAnchor = 'start';
    else if (lx < center - 4) textAnchor = 'end';

    // Décale légèrement haut/bas pour ne pas chevaucher le polygone
    let dy = 0;
    if (Math.abs(cosAngle) < 0.25) {
      dy = sinAngle < 0 ? -fontSize * 0.2 : fontSize * 0.45;
    }

    return {
      x1: center,
      y1: center,
      x2,
      y2,
      label: displayLabel(d.axis),
      lx,
      ly: ly + dy,
      textAnchor,
    };
  });

  const gridLevels = 5;
  const concentricPolygons = Array.from({ length: gridLevels }).map((_, levelIndex) => {
    const levelRadius = radius * ((levelIndex + 1) / gridLevels);
    return data
      .map((_, i) => {
        const x = center + levelRadius * Math.cos(angleSlice * i - Math.PI / 2);
        const y = center + levelRadius * Math.sin(angleSlice * i - Math.PI / 2);
        return `${x},${y}`;
      })
      .join(' ');
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto block overflow-visible"
      style={{ overflow: 'visible' }}
    >
      <g>
        {concentricPolygons.map((polyPoints, i) => (
          <polygon
            key={`grid-${i}`}
            points={polyPoints}
            fill="none"
            stroke={gridStroke}
            strokeWidth="0.75"
          />
        ))}
        {axisLines.map((line, i) => (
          <line
            key={`axis-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={gridStroke}
            strokeWidth="0.75"
          />
        ))}
        <polygon points={points} fill={fill} stroke={stroke} strokeWidth="1.25" />
        {axisLines.map((line, i) => (
          <text
            key={`label-${i}`}
            x={line.lx}
            y={line.ly}
            fontSize={fontSize}
            fontWeight={600}
            fill={labelColor}
            textAnchor={line.textAnchor}
            dominantBaseline="middle"
          >
            {line.label}
          </text>
        ))}
      </g>
    </svg>
  );
};

export default SpiderChart;
