/**
 * Punktefeld for the Einmaleins: rows × cols dots, optionally with gaps after rows and/or columns (Kraft der Fünf, a split for
 * derivation), or dots in repeated groups with a frame each (3 groups of 4). Hand-written SVG.
 */
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';

type DotArray = VisualOf<'dotArray'>;
type DotGroups = Extract<DotArray, { groups: number[] }>;
type DotGrid = Exclude<DotArray, { groups: number[] }>;

const STEP = 28;
const R = 10;
const GAP = 16;
const PAD = 14;

/** Groups: smaller dots, as there are often many; the rows wrap to fit a 375 px phone without shrinking. */
const GROUP_STEP = 22;
const GROUP_R = 8;
const GROUP_PAD = 8;
const GROUP_GAP = 12;
const GROUPS_MAX_W = 310;

const points = (n: number) => `${n} ${n === 1 ? 'Punkt' : 'Punkten'}`;

/** A gap only where there are dots on both sides. */
function splits(single: number | undefined, size: number): number[] {
  return single && single > 0 && single < size ? [single] : [];
}

export function dotArrayAriaLabel(v: DotArray): string {
  if ('groups' in v) {
    const n = v.groups.length;
    // One box only: a pile of dots, not a group (a task may ask how many groups it makes).
    if (n === 1) return `${v.groups[0]} ${v.groups[0] === 1 ? 'Punkt' : 'Punkte'}.`;
    const equal = v.groups.every((g) => g === v.groups[0]);
    if (equal) return `Punkte in ${n} Gruppen mit je ${points(v.groups[0] ?? 0)}.`;
    return `Punkte in ${n} Gruppen: ${v.groups.slice(0, -1).join(', ')} und ${v.groups[n - 1]} ${v.groups[n - 1] === 1 ? 'Punkt' : 'Punkte'}.`;
  }
  const parts = [`Punktefeld: ${v.rows} ${v.rows === 1 ? 'Reihe' : 'Reihen'} mit je ${points(v.cols)}.`];
  for (const s of splits(v.splitAfterRow, v.rows)) parts.push(`Nach ${s} ${s === 1 ? 'Reihe' : 'Reihen'} ist eine Lücke.`);
  for (const s of splits(v.splitAfterCol, v.cols)) parts.push(`In jeder Reihe ist nach ${points(s)} eine Lücke.`);
  return parts.join(' ');
}

function DotGroupsView({ visual, print }: VisualProps<DotGroups>) {
  const perRow = Math.max(1, visual.perRow ?? 5);
  const boxes: { size: number; x: number; y: number; w: number; h: number }[] = [];
  let x = PAD;
  let y = PAD;
  let rowH = 0;
  let width = 0;
  for (const size of visual.groups) {
    const cols = Math.min(size, perRow);
    const rows = Math.ceil(size / perRow);
    const w = cols * GROUP_STEP + 2 * GROUP_PAD;
    const h = rows * GROUP_STEP + 2 * GROUP_PAD;
    if (x > PAD && x + w + PAD > GROUPS_MAX_W) {
      x = PAD;
      y += rowH + GROUP_GAP;
      rowH = 0;
    }
    boxes.push({ size, x, y, w, h });
    width = Math.max(width, x + w + PAD);
    rowH = Math.max(rowH, h);
    x += w + GROUP_GAP;
  }
  const height = y + rowH + PAD;
  return (
    <svg className="visual visual-dotarray" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={dotArrayAriaLabel(visual)}>
      {boxes.map((b, g) => (
        <g key={g} data-group={g}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} style={{ fill: 'none', stroke: 'var(--ink)', strokeWidth: 2 }} />
          {Array.from({ length: b.size }, (_, i) => (
            <circle
              key={i}
              cx={b.x + GROUP_PAD + GROUP_STEP / 2 + (i % perRow) * GROUP_STEP}
              cy={b.y + GROUP_PAD + GROUP_STEP / 2 + Math.floor(i / perRow) * GROUP_STEP}
              r={GROUP_R}
              style={{ fill: print ? 'var(--ink)' : 'var(--c-blau)', stroke: 'var(--ink)', strokeWidth: 1 }}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function DotGridView({ visual, print }: VisualProps<DotGrid>) {
  const { rows, cols } = visual;
  const rowSplits = splits(visual.splitAfterRow, rows);
  const colSplits = splits(visual.splitAfterCol, cols);
  const W = PAD * 2 + cols * STEP + colSplits.length * GAP;
  const H = PAD * 2 + rows * STEP + rowSplits.length * GAP;
  const cx = (c: number) => PAD + STEP / 2 + c * STEP + colSplits.filter((s) => c >= s).length * GAP;
  const cy = (r: number) => PAD + STEP / 2 + r * STEP + rowSplits.filter((s) => r >= s).length * GAP;
  return (
    <svg className="visual visual-dotarray" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={dotArrayAriaLabel(visual)}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={cx(c)}
            cy={cy(r)}
            r={R}
            data-dot={`${r}-${c}`}
            style={{ fill: print ? 'var(--ink)' : 'var(--c-blau)', stroke: 'var(--ink)', strokeWidth: 1 }}
          />
        )),
      )}
    </svg>
  );
}

export default function DotArrayVisual({ visual, print }: VisualProps<DotArray>) {
  return 'groups' in visual ? <DotGroupsView visual={visual} print={print} /> : <DotGridView visual={visual} print={print} />;
}
