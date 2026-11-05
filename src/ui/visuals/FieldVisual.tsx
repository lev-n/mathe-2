/**
 * Zwanzigerfeld and Hunderterfeld with 5/10 structure (docs/research.md §6): a wider gap after every 5th dot and row, so
 * amounts can be seen without counting in ones. Dots fill row by row: `filled` solid, then `second` with a ring (look, not
 * only colour). Hand-written SVG. The aria-label gives the rows, never the total, so counting tasks stay tasks.
 */
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './FieldVisual.css';

type Field = VisualOf<'field'>;

const PER_ROW = 10;
/** Drawn at most 310 px wide: it fits a 375 px phone (343 px page, 16 px card padding) without shrinking. */
const STEP: Record<Field['size'], number> = { 20: 27, 100: 26 };
const GAP_5 = 10;
const GAP_SPLIT = 10;
const PAD = 8;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function amounts(v: Field): { filled: number; second: number } {
  const filled = Math.max(0, Math.min(v.size, Math.floor(v.filled)));
  const second = Math.max(0, Math.min(v.size - filled, Math.floor(v.second ?? 0)));
  return { filled, second };
}

export function fieldLabel(v: Field): string {
  const { filled, second } = amounts(v);
  const rows = v.size / PER_ROW;
  const parts: string[] = [];
  const name = v.size === 20 ? 'Zwanzigerfeld' : 'Hunderterfeld';
  parts.push(v.rotated ? `${name}, gedreht: ${rows} Spalten mit je ${PER_ROW} Punkten.` : `${name}: ${rows} Reihen mit je ${PER_ROW} Punkten.`);
  const line = v.rotated ? 'Spalte' : 'Reihe';
  const full = Math.floor(filled / PER_ROW);
  const rest = filled % PER_ROW;
  if (filled === 0) parts.push('Kein Punkt ist ausgefüllt.');
  if (full > 0) parts.push(`${count(full, `${line} ist`, `${line}n sind`)} ganz ausgefüllt.`);
  if (rest > 0) parts.push(`In der ${full === 0 ? 'ersten' : 'nächsten'} ${line} ${rest === 1 ? 'ist 1 Punkt' : `sind ${rest} Punkte`} ausgefüllt.`);
  if (second > 0) parts.push(`Danach ${second === 1 ? 'kommt 1 Punkt' : `kommen ${second} Punkte`} mit Ring.`);
  if (v.split?.afterCol) parts.push(`Eine Linie teilt das Feld nach ${v.split.afterCol} Punkten in jeder ${line}.`);
  if (v.split?.afterRow) parts.push(`Eine Linie teilt das Feld nach ${count(v.split.afterRow, line, `${line}n`)}.`);
  return parts.join(' ');
}

export default function FieldVisual({ visual, print }: VisualProps<Field>) {
  const { filled, second } = amounts(visual);
  const { size, split, rotated } = visual;
  const step = STEP[size];
  const r = step / 2 - 2.5;
  const rows = size / PER_ROW;
  const afterCol = split?.afterCol;
  const afterRow = split?.afterRow;
  // Offset of a column or row: its dots, the 5-gap after the 5th, and the gap of a split.
  const along = (i: number, after: number | undefined, gapAt5: boolean) =>
    i * step + (gapAt5 && i >= 5 ? GAP_5 : 0) + (after !== undefined && i >= after ? GAP_SPLIT : 0);
  const colAt = (c: number) => along(c, afterCol, true);
  const rowAt = (y: number) => along(y, afterRow, size === 100);
  const lenCols = colAt(PER_ROW - 1) + step;
  const lenRows = rowAt(rows - 1) + step;
  const w = (rotated ? lenRows : lenCols) + 2 * PAD;
  const h = (rotated ? lenCols : lenRows) + 2 * PAD;
  // A quarter turn: a row of dots becomes a column.
  const point = (y: number, c: number): [number, number] => {
    const along1 = colAt(c) + step / 2 + PAD;
    const along2 = rowAt(y) + step / 2 + PAD;
    return rotated ? [along2, along1] : [along1, along2];
  };
  const lineAt = (after: number, at: (i: number) => number) => at(after) - GAP_SPLIT / 2;
  const splitLine = (span: number, pos: number, vertical: boolean) =>
    vertical ? <line className="fd-split" x1={pos + PAD} y1={PAD / 2} x2={pos + PAD} y2={span - PAD / 2} /> : <line className="fd-split" x1={PAD / 2} y1={pos + PAD} x2={span - PAD / 2} y2={pos + PAD} />;
  return (
    <svg
      className={`visual visual-field${print ? ' visual--print' : ''}`}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={fieldLabel(visual)}
      data-field={size}
    >
      <rect className="fd-frame" x={1} y={1} width={w - 2} height={h - 2} rx={8} />
      {Array.from({ length: rows }, (_, y) =>
        Array.from({ length: PER_ROW }, (_, c) => {
          const i = y * PER_ROW + c;
          const kind = i < filled ? 'filled' : i < filled + second ? 'second' : 'empty';
          const [cx, cy] = point(y, c);
          return (
            <g key={i}>
              <circle className={`fd-dot fd-dot--${kind}`} cx={cx} cy={cy} r={r} data-dot={kind} />
              {kind === 'second' && <circle className="fd-ring" cx={cx} cy={cy} r={r / 2.2} />}
            </g>
          );
        }),
      )}
      {afterCol !== undefined && (rotated ? splitLine(w, lineAt(afterCol, colAt), false) : splitLine(h, lineAt(afterCol, colAt), true))}
      {afterRow !== undefined && (rotated ? splitLine(h, lineAt(afterRow, rowAt), true) : splitLine(w, lineAt(afterRow, rowAt), false))}
    </svg>
  );
}
