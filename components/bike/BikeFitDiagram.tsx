import React from 'react';
import { BikeFitMeasurements } from '../../types';
import { BIKE_IMG_VB, ROAD_POINTS } from './bikeDiagramPoints';

interface BikeFitDiagramProps {
  cotes: BikeFitMeasurements;
  bikeLabel?: string;
}

const ROAD_IMG = '/bike-fit/road-bike.png';
const P = ROAD_POINTS;
const { w: VB_W, h: VB_H } = BIKE_IMG_VB;

function fmt(v?: string) {
  return v ? `${v} mm` : '— mm';
}

function DimLine({
  x1, y1, x2, y2, label, value, labelX, labelY, extLines,
}: {
  x1: number; y1: number; x2: number; y2: number;
  label: string; value: string; labelX: number; labelY: number;
  extLines?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}) {
  return (
    <g>
      {extLines?.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 2" />
      ))}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#dc2626" strokeWidth="2" markerStart="url(#arrRoad)" markerEnd="url(#arrRoad)" />
      <rect x={labelX - 54} y={labelY - 18} width="108" height="34" rx="5" fill="#fff" fillOpacity="0.95" stroke="#dc2626" strokeWidth="1" />
      <text x={labelX} y={labelY - 4} textAnchor="middle" fontSize="8" fill="#6b7280" fontFamily="system-ui">{label}</text>
      <text x={labelX} y={labelY + 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#111" fontFamily="system-ui">{value}</text>
    </g>
  );
}

const BikeFitDiagram: React.FC<BikeFitDiagramProps> = ({ cotes, bikeLabel }) => {
  const measurements = [
    { key: 'hauteurSelle', label: 'Hauteur selle', value: fmt(cotes.hauteurSelle) },
    { key: 'reculSelle', label: 'Recul selle', value: fmt(cotes.reculSelle) },
    { key: 'reach', label: 'Bec selle → cintre', value: fmt(cotes.longueurBecSelleAxeCintre) },
    { key: 'drop', label: 'Axe roue → cintre', value: fmt(cotes.hauteurGuidonAxeRoueCentreCintre) },
  ];

  const { BB, saddleTop, saddleNose, barCenter, frontAxle } = P;

  const seatDx = saddleTop.x - BB.x;
  const seatDy = saddleTop.y - BB.y;
  const seatLen = Math.hypot(seatDx, seatDy);
  const seatNx = -seatDy / seatLen * 55;
  const seatNy = seatDx / seatLen * 55;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {bikeLabel && (
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 py-2 text-center">{bikeLabel}</p>
      )}

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto block"
        aria-label="Schéma vélo route avec cotes"
      >
        <defs>
          <marker id="arrRoad" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#dc2626" />
          </marker>
        </defs>

        <image href={ROAD_IMG} x="0" y="0" width={VB_W} height={VB_H} />

        <DimLine
          x1={BB.x + seatNx} y1={BB.y + seatNy}
          x2={saddleTop.x + seatNx} y2={saddleTop.y + seatNy}
          label="Hauteur selle" value={fmt(cotes.hauteurSelle)}
          labelX={500} labelY={310}
          extLines={[
            { x1: BB.x, y1: BB.y, x2: BB.x + seatNx, y2: BB.y + seatNy },
            { x1: saddleTop.x, y1: saddleTop.y, x2: saddleTop.x + seatNx, y2: saddleTop.y + seatNy },
          ]}
        />

        <DimLine
          x1={BB.x} y1={598} x2={saddleNose.x} y2={598}
          label="Recul selle" value={fmt(cotes.reculSelle)}
          labelX={(BB.x + saddleNose.x) / 2} labelY={628}
          extLines={[
            { x1: BB.x, y1: BB.y, x2: BB.x, y2: 598 },
            { x1: saddleNose.x, y1: saddleNose.y, x2: saddleNose.x, y2: 598 },
          ]}
        />

        <DimLine
          x1={saddleNose.x} y1={58} x2={barCenter.x} y2={58}
          label="Bec selle → cintre" value={fmt(cotes.longueurBecSelleAxeCintre)}
          labelX={(saddleNose.x + barCenter.x) / 2} labelY={38}
          extLines={[
            { x1: saddleNose.x, y1: saddleNose.y, x2: saddleNose.x, y2: 58 },
            { x1: barCenter.x, y1: barCenter.y, x2: barCenter.x, y2: 58 },
          ]}
        />

        <DimLine
          x1={frontAxle.x + 40} y1={frontAxle.y} x2={frontAxle.x + 40} y2={barCenter.y}
          label="Axe roue → cintre" value={fmt(cotes.hauteurGuidonAxeRoueCentreCintre)}
          labelX={frontAxle.x + 40} labelY={(frontAxle.y + barCenter.y) / 2}
          extLines={[
            { x1: frontAxle.x, y1: frontAxle.y, x2: frontAxle.x + 40, y2: frontAxle.y },
            { x1: barCenter.x, y1: barCenter.y, x2: frontAxle.x + 40, y2: barCenter.y },
          ]}
        />

        {[
          [BB.x, BB.y],
          [saddleTop.x, saddleTop.y],
          [saddleNose.x, saddleNose.y],
          [barCenter.x, barCenter.y],
          [frontAxle.x, frontAxle.y],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#dc2626" stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>

      <div className="grid grid-cols-2 gap-2 p-3 border-t border-gray-100 bg-slate-50">
        {measurements.map(m => (
          <div key={m.key} className="rounded-lg bg-white border border-gray-200 px-3 py-2.5 shadow-sm">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{m.label}</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BikeFitDiagram;
