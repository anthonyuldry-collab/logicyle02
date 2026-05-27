import React from 'react';

export interface BenchmarkStatsRow {
  id: string;
  label: string;
  sampleCount: number;
  min: string;
  avg: string;
  max: string;
  winnerAvg?: string | null;
  winnerTitle?: string;
  elite?: string | null;
}

export interface BenchmarkStatsSection {
  id: string;
  title: string;
  subtitle?: string;
  rows: BenchmarkStatsRow[];
}

interface BenchmarkStatsTableProps {
  /** Tableau plat */
  rows?: BenchmarkStatsRow[];
  /** Plusieurs blocs (Endurance, Sprint…) dans un seul tableau */
  sections?: BenchmarkStatsSection[];
  unitLabel: string;
  showWinnerColumn?: boolean;
  measureColumnLabel?: string;
  maxHeight?: string;
  emptyMessage?: string;
  /** Légende sous le titre du tableau */
  caption?: string;
}

const thNum =
  'px-2 py-2 text-right text-[11px] font-semibold text-slate-600 whitespace-nowrap w-[3.25rem] sm:w-14';
const tdNum = 'px-2 py-2 text-right tabular-nums text-sm whitespace-nowrap';

function NumCell({
  value,
  variant,
}: {
  value: string;
  variant: 'min' | 'avg' | 'max' | 'neutral' | 'winner' | 'elite';
}) {
  const styles: Record<typeof variant, string> = {
    min: 'bg-rose-50/80 text-rose-900 border-rose-100',
    avg: 'bg-slate-100 text-slate-900 font-semibold border-slate-200',
    max: 'bg-emerald-50/80 text-emerald-900 border-emerald-100',
    neutral: 'text-slate-500',
    winner: 'bg-green-50/80 text-green-900 font-medium border-green-100',
    elite: 'bg-indigo-50/80 text-indigo-900 font-medium border-indigo-100',
  };
  return (
    <span
      className={`inline-block min-w-[2.75rem] rounded border px-1.5 py-0.5 text-center ${styles[variant]}`}
    >
      {value}
    </span>
  );
}

function DataRows({
  rows,
  showWinnerColumn,
  startIndex,
}: {
  rows: BenchmarkStatsRow[];
  showWinnerColumn: boolean;
  startIndex: number;
}) {
  return (
    <>
      {rows.map((row, i) => {
        const idx = startIndex + i;
        return (
          <tr
            key={row.id}
            className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
          >
            <td className="px-3 py-2 text-sm font-medium text-slate-800 whitespace-nowrap">
              {row.label}
            </td>
            <td className={`${tdNum} text-slate-500 text-xs`}>{row.sampleCount}</td>
            <td className={tdNum}>
              <NumCell value={row.min} variant="min" />
            </td>
            <td className={tdNum}>
              <NumCell value={row.avg} variant="avg" />
            </td>
            <td className={tdNum}>
              <NumCell value={row.max} variant="max" />
            </td>
            {showWinnerColumn && (
              <td className={tdNum} title={row.winnerTitle}>
                <NumCell value={row.winnerAvg ?? '—'} variant={row.winnerAvg ? 'winner' : 'neutral'} />
              </td>
            )}
            <td className={tdNum}>
              <NumCell value={row.elite ?? '—'} variant={row.elite ? 'elite' : 'neutral'} />
            </td>
          </tr>
        );
      })}
    </>
  );
}

const BenchmarkStatsTable: React.FC<BenchmarkStatsTableProps> = ({
  rows = [],
  sections,
  unitLabel,
  showWinnerColumn = false,
  measureColumnLabel = 'Durée',
  maxHeight = 'max-h-80',
  emptyMessage = 'Aucune mesure sur cet échantillon.',
  caption,
}) => {
  const flatRows = sections
    ? sections.flatMap(s => s.rows)
    : rows;

  if (flatRows.length === 0) {
    return <p className="text-xs text-slate-500 px-3 py-4">{emptyMessage}</p>;
  }

  let rowOffset = 0;

  return (
    <div className={`overflow-auto overscroll-contain ${maxHeight}`}>
      <table className="w-full min-w-[320px] border-collapse text-sm">
        {caption && (
          <caption className="caption-top px-3 pt-2 pb-1 text-left text-xs text-slate-500">
            {caption}
          </caption>
        )}
        <thead className="sticky top-0 z-10 bg-slate-200/95 backdrop-blur-sm">
          <tr className="border-b border-slate-300">
            <th
              rowSpan={2}
              className="px-3 py-2 text-left text-xs font-semibold text-slate-700 align-bottom border-r border-slate-300/60"
            >
              {measureColumnLabel}
            </th>
            <th
              rowSpan={2}
              className="px-2 py-2 text-right text-xs font-semibold text-slate-700 align-bottom border-r border-slate-300/60 w-10"
            >
              n
            </th>
            <th
              colSpan={3}
              className="px-2 py-1 text-center text-xs font-semibold text-slate-800 border-r border-slate-300/60"
            >
              Effectif
              <span className="ml-1 font-normal text-slate-500">({unitLabel})</span>
            </th>
            {showWinnerColumn && (
              <th
                rowSpan={2}
                className="px-2 py-2 text-right text-xs font-semibold text-green-800 align-bottom border-r border-slate-300/60"
                title={`Moyenne gagnantes · ${unitLabel}`}
              >
                Gagn.
              </th>
            )}
            <th
              rowSpan={2}
              className="px-2 py-2 text-right text-xs font-semibold text-indigo-800 align-bottom"
              title={`Seuil quartile supérieur · ${unitLabel}`}
            >
              Top 25 %
            </th>
          </tr>
          <tr className="border-b border-slate-300 text-[10px] uppercase tracking-wide">
            <th className={`${thNum} bg-rose-50/50 text-rose-800`}>Min</th>
            <th className={`${thNum} bg-slate-100 text-slate-800`}>Moy</th>
            <th className={`${thNum} bg-emerald-50/50 text-emerald-800`}>Max</th>
          </tr>
        </thead>
        <tbody>
          {sections
            ? sections.map(section => {
                if (section.rows.length === 0) return null;
                const block = (
                  <React.Fragment key={section.id}>
                    <tr className="bg-slate-100 border-y border-slate-200">
                      <td
                        colSpan={showWinnerColumn ? 7 : 6}
                        className="px-3 py-1.5 text-xs font-bold text-slate-700"
                      >
                        {section.title}
                        {section.subtitle && (
                          <span className="font-normal text-slate-500 ml-2">{section.subtitle}</span>
                        )}
                      </td>
                    </tr>
                    <DataRows
                      rows={section.rows}
                      showWinnerColumn={showWinnerColumn}
                      startIndex={rowOffset}
                    />
                  </React.Fragment>
                );
                rowOffset += section.rows.length;
                return block;
              })
            : (
              <DataRows rows={rows} showWinnerColumn={showWinnerColumn} startIndex={0} />
            )}
        </tbody>
      </table>
    </div>
  );
};

export default BenchmarkStatsTable;
