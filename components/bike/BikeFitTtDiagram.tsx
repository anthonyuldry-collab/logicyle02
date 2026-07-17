import React from 'react';
import { BikeFitMeasurements } from '../../types';
import { UciMeasurementCheck, UciTtComplianceResult } from '../../utils/uciBikeFitUtils';
import { BIKE_IMG_VB, TT_POINTS } from './bikeDiagramPoints';

interface BikeFitTtDiagramProps {
  cotes: BikeFitMeasurements;
  bikeLabel?: string;
  compliance?: UciTtComplianceResult;
}

const TT_IMG = '/bike-fit/tt-bike.png';
const P = TT_POINTS;
const { w: VB_W, h: VB_H } = BIKE_IMG_VB;

function fmt(v?: string) {
  return v ? `${v} mm` : '— mm';
}

function checkStatus(key: 'S' | 'E' | 'H', checks?: UciMeasurementCheck[]) {
  return checks?.find(c => c.key === key)?.status;
}

const STATUS: Record<string, { border: string; bg: string; text: string; stroke: string }> = {
  ok: { border: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-800', stroke: '#16a34a' },
  error: { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-800', stroke: '#dc2626' },
  warning: { border: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-800', stroke: '#d97706' },
  missing: { border: 'border-gray-200', bg: 'bg-white', text: 'text-gray-500', stroke: '#dc2626' },
};

function UciDimLine({
  x1, y1, x2, y2, letter, value, color, labelX, labelY, extLines,
}: {
  x1: number; y1: number; x2: number; y2: number;
  letter: string; value: string; color: string; labelX: number; labelY: number;
  extLines?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}) {
  return (
    <g>
      {extLines?.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 2" />
      ))}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2.5" markerStart="url(#arrTt)" markerEnd="url(#arrTt)" />
      <rect x={labelX - 48} y={labelY - 20} width="96" height="36" rx="6" fill="#fff" fillOpacity="0.95" stroke={color} strokeWidth="1.5" />
      <text x={labelX} y={labelY - 4} textAnchor="middle" fontSize="14" fontWeight="800" fill={color} fontFamily="system-ui">{letter}</text>
      <text x={labelX} y={labelY + 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#111" fontFamily="system-ui">{value}</text>
    </g>
  );
}

const BikeFitTtDiagram: React.FC<BikeFitTtDiagramProps> = ({ cotes, bikeLabel, compliance }) => {
  const items = [
    { key: 'S' as const, label: 'Recul selle (S)', value: fmt(cotes.reculSelle), status: checkStatus('S', compliance?.checks) ?? 'missing' },
    { key: 'E' as const, label: 'Prolongateurs (E)', value: fmt(cotes.distanceExtensionE), status: checkStatus('E', compliance?.checks) ?? 'missing' },
    { key: 'H' as const, label: 'Hauteur barres (H)', value: fmt(cotes.hauteurProlongateursH), status: checkStatus('H', compliance?.checks) ?? 'missing' },
  ];

  const { BB, saddleNose, extTip, armrest, extHigh } = P;
  /** Cote H : verticale au niveau du sommet des prolongateurs (mesure UCI) */
  const hLineX = extHigh.x;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {bikeLabel && (
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 py-2 text-center">{bikeLabel}</p>
      )}

      {compliance && (
        <p className="text-xs text-center text-gray-600 px-3 pb-2">
          {compliance.effectiveCategory === 'default' ? 'Catégorie par défaut' : compliance.limits.label}
          {' · '}E ≤ {compliance.effectiveLimits.E} · H ≤ {compliance.effectiveLimits.H} · S ≥ {compliance.effectiveLimits.SMin} mm
        </p>
      )}

      {/* Image intégrée dans le SVG pour garantir l'alignement des repères */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto block"
        aria-label="Schéma vélo CLM avec cotes UCI"
      >
        <defs>
          <marker id="arrTt" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#dc2626" />
          </marker>
        </defs>

        <image href={TT_IMG} x="0" y="0" width={VB_W} height={VB_H} />

        <line x1={BB.x} y1={50} x2={BB.x} y2={610} stroke="#dc2626" strokeWidth="1" strokeDasharray="5 3" opacity="0.45" />
        <line x1={saddleNose.x} y1={50} x2={saddleNose.x} y2={610} stroke="#dc2626" strokeWidth="1" strokeDasharray="5 3" opacity="0.45" />
        <line x1={extTip.x} y1={50} x2={extTip.x} y2={610} stroke="#dc2626" strokeWidth="1" strokeDasharray="5 3" opacity="0.45" />

        <UciDimLine
          x1={BB.x} y1={598} x2={saddleNose.x} y2={598}
          letter="S" value={fmt(cotes.reculSelle)} color={STATUS[items[0].status].stroke}
          labelX={(BB.x + saddleNose.x) / 2} labelY={628}
          extLines={[
            { x1: BB.x, y1: BB.y, x2: BB.x, y2: 598 },
            { x1: saddleNose.x, y1: saddleNose.y, x2: saddleNose.x, y2: 598 },
          ]}
        />
        <UciDimLine
          x1={BB.x} y1={52} x2={extTip.x} y2={52}
          letter="E" value={fmt(cotes.distanceExtensionE)} color={STATUS[items[1].status].stroke}
          labelX={(BB.x + extTip.x) / 2} labelY={32}
          extLines={[
            { x1: BB.x, y1: BB.y, x2: BB.x, y2: 52 },
            { x1: extTip.x, y1: extTip.y, x2: extTip.x, y2: 52 },
          ]}
        />
        <UciDimLine
          x1={hLineX} y1={armrest.y} x2={hLineX} y2={extHigh.y}
          letter="H" value={fmt(cotes.hauteurProlongateursH)} color={STATUS[items[2].status].stroke}
          labelX={hLineX + 52} labelY={(armrest.y + extHigh.y) / 2}
          extLines={[
            { x1: armrest.x, y1: armrest.y, x2: hLineX, y2: armrest.y },
          ]}
        />

        {[
          [BB.x, BB.y],
          [saddleNose.x, saddleNose.y],
          [extTip.x, extTip.y],
          [armrest.x, armrest.y],
          [extHigh.x, extHigh.y],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="5" fill="#dc2626" stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>

      <div className="grid grid-cols-3 gap-2 p-3 border-t border-gray-100 bg-slate-50">
        {items.map(item => {
          const s = STATUS[item.status] ?? STATUS.missing;
          return (
            <div key={item.key} className={`rounded-lg border-2 ${s.border} ${s.bg} px-3 py-2.5 shadow-sm`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{item.label}</p>
              <p className={`text-base font-bold mt-0.5 ${s.text}`}>{item.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BikeFitTtDiagram;
