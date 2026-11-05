/**
 * Zahlenmauer: rows of stones from top to bottom; every row is half a stone in from the row below, so a stone sits on two stones.
 * It fits a 375 px phone (311 px in the card) without shrinking. Hand-written SVG.
 */
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const STONE_W = 88;
const STONE_H = 56;
const PAD = 6;

type Wall = VisualOf<'numberWall'>;

/** 'Zahlenmauer. Oben: C. Darunter: A und B. Unten: 3, 4 und 5.' */
export function numberWallLabel(v: Wall): string {
  const list = (row: readonly string[]) => (row.length < 2 ? row.join('') : `${row.slice(0, -1).join(', ')} und ${row[row.length - 1]}`);
  const parts = v.rows.map((row, i) => `${i === 0 ? 'Oben' : i === v.rows.length - 1 ? 'Unten' : 'Darunter'}: ${list(row)}.`);
  return `Zahlenmauer. ${parts.join(' ')}`;
}

export default function NumberWallVisual({ visual, print }: VisualProps<Wall>) {
  const widest = Math.max(...visual.rows.map((r) => r.length));
  const W = widest * STONE_W + 2 * PAD;
  const H = visual.rows.length * STONE_H + 2 * PAD;
  return (
    <svg className="visual visual-wall" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={numberWallLabel(visual)}>
      {visual.rows.map((row, r) =>
        row.map((text, i) => {
          const x = PAD + ((widest - row.length) * STONE_W) / 2 + i * STONE_W;
          const y = PAD + r * STONE_H;
          return (
            <g key={`${r}-${i}`} data-stone={text}>
              <rect x={x} y={y} width={STONE_W} height={STONE_H} style={{ fill: print ? 'var(--surface)' : 'var(--primary-soft)', stroke: 'var(--ink)', strokeWidth: 2.5 }} />
              <text x={x + STONE_W / 2} y={y + STONE_H / 2} textAnchor="middle" dominantBaseline="central" style={{ fill: 'var(--text)', fontSize: 28, fontWeight: 700 }}>
                {text}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}
