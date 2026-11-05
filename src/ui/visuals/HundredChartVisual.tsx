/**
 * Hundertertafel 1–100 (docs/research.md §6): 10 numbers per row, so one row down is 10 more. Cells can be masked (empty, with □
 * or a letter), a row or column can be highlighted (tint and thick outline), cells can be ringed, and a cut-out piece shows only
 * some cells in their original arrangement, larger. Hand-written SVG. The aria-label names a masked cell by its place, never by
 * its number.
 */
import { BOX } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './HundredChartVisual.css';

type Chart = VisualOf<'hundredChart'>;

/** Drawn 308 px wide: it fits a 375 px phone without shrinking, and '100' fits a cell at 16 px. */
const CELL = 30;
const PIECE_CELL = 56;
const PAD = 4;

const rowOf = (n: number) => Math.floor((n - 1) / 10);
const colOf = (n: number) => (n - 1) % 10;

/** Text of a masked cell: □ when only one is masked, otherwise letters in the array's order. */
function maskText(chart: Chart, n: number): string | null {
  const masked = chart.masked ?? [];
  const i = masked.indexOf(n);
  if (i < 0) return null;
  return masked.length === 1 ? BOX : String.fromCharCode(65 + i);
}

function shownText(chart: Chart, n: number): string {
  return maskText(chart, n) ?? String(chart.replaced?.find((r) => r.cell === n)?.shows ?? n);
}

export function hundredChartLabel(v: Chart): string {
  const parts: string[] = [];
  if (v.piece?.length) {
    const rows = [...new Set(v.piece.map(rowOf))].sort((a, b) => a - b);
    const cellsOf = (row: number) => v.piece!.filter((n) => rowOf(n) === row).sort((a, b) => a - b);
    const minCol = Math.min(...v.piece.map(colOf));
    // A piece that is no rectangle (a plus): without the column, a blind child cannot place a Lücke in its arm.
    const rectangle = rows.every((row) => cellsOf(row).length === cellsOf(rows[0]).length && colOf(cellsOf(row)[0]) === minCol);
    parts.push('Ausschnitt aus der Hundertertafel.');
    for (const [i, row] of rows.entries()) {
      const cells = cellsOf(row);
      const spoken = cells.map((n) => (shownText(v, n) === BOX ? 'Lücke' : shownText(v, n)));
      parts.push(`Reihe ${i + 1}${rectangle ? '' : `, ab Spalte ${colOf(cells[0]) - minCol + 1}`}: ${spoken.join(', ')}.`);
    }
    return parts.join(' ');
  }
  parts.push('Hundertertafel von 1 bis 100, mit 10 Zahlen in jeder Reihe.');
  for (const n of v.masked ?? []) {
    const text = maskText(v, n);
    parts.push(`${text === BOX ? 'Lücke' : `Feld ${text}`}: Reihe ${rowOf(n) + 1}, Spalte ${colOf(n) + 1}.`);
  }
  if (v.marked?.length) parts.push(`Mit Ring: ${v.marked.join(', ')}.`);
  return parts.join(' ');
}

export default function HundredChartVisual({ visual, print }: VisualProps<Chart>) {
  const piece = visual.piece?.length ? visual.piece : null;
  const cells = piece ?? Array.from({ length: 100 }, (_, i) => i + 1);
  const cell = piece ? PIECE_CELL : CELL;
  const minCol = Math.min(...cells.map(colOf));
  const minRow = Math.min(...cells.map(rowOf));
  const cols = Math.max(...cells.map(colOf)) - minCol + 1;
  const rows = Math.max(...cells.map(rowOf)) - minRow + 1;
  const x = (n: number) => PAD + (colOf(n) - minCol) * cell;
  const y = (n: number) => PAD + (rowOf(n) - minRow) * cell;
  const w = cols * cell + 2 * PAD;
  const h = rows * cell + 2 * PAD;
  return (
    <svg
      className={`visual visual-hundred${piece ? ' visual-hundred--piece' : ''}${print ? ' visual--print' : ''}`}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={hundredChartLabel(visual)}
    >
      {cells.map((n) => {
        const mask = maskText(visual, n);
        return (
          <g key={n} data-cell={n} data-masked={mask ? '' : undefined}>
            <rect className={`hc-cell${mask ? ' hc-cell--masked' : ''}`} x={x(n)} y={y(n)} width={cell} height={cell} />
            <text className={mask ? 'hc-num hc-num--masked' : 'hc-num'} x={x(n) + cell / 2} y={y(n) + cell / 2} textAnchor="middle" dominantBaseline="central">
              {shownText(visual, n)}
            </text>
            {visual.marked?.includes(n) && <circle className="hc-ring" cx={x(n) + cell / 2} cy={y(n) + cell / 2} r={cell / 2 - 2} data-ring="" />}
          </g>
        );
      })}
    </svg>
  );
}
