/**
 * Stellenwerttafel (Z, E) with digits. Hand-written SVG.
 */
import type { PlaceColumn, VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const NAMES: Record<PlaceColumn, string> = { Z: 'Zehner', E: 'Einer' };

const COL_W = 64;
const HEAD_H = 44;
const ROW_H = 60;
const PAD = 4;

/** Spoken description, e.g. 'Stellenwerttafel. Zehner: 3, Einer: 4.' */
export function placeValueAriaLabel(v: VisualOf<'placeValue'>): string {
  const parts = ['Stellenwerttafel.'];
  v.rows.forEach((row, i) => {
    const cells = v.columns.map((c, j) => {
      const x = row.values[j];
      return x === null || x === undefined ? `${NAMES[c]}: leer` : `${NAMES[c]}: ${x}`;
    });
    const prefix = v.rows.length > 1 ? `Zeile ${i + 1}: ` : '';
    parts.push(`${prefix}${cells.join(', ')}.`);
  });
  return parts.join(' ');
}

export default function PlaceValueVisual({ visual, print }: VisualProps<VisualOf<'placeValue'>>) {
  const { columns, rows } = visual;
  const W = PAD * 2 + columns.length * COL_W;
  const H = 2 * PAD + HEAD_H + rows.length * ROW_H;
  const colX = (i: number) => PAD + i * COL_W;
  const ink = 'var(--ink)';

  return (
    <svg
      className="visual visual-placevalue"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={placeValueAriaLabel(visual)}
    >
      {columns.map((c, i) => (
        <g key={c}>
          <rect
            x={colX(i)}
            y={PAD}
            width={COL_W}
            height={HEAD_H}
            style={{ fill: print ? 'var(--surface)' : 'var(--surface-2)', stroke: 'var(--grid-line)', strokeWidth: 1.5 }}
          />
          <text x={colX(i) + COL_W / 2} y={PAD + HEAD_H / 2 + 7} textAnchor="middle" style={{ fill: ink, fontSize: 20, fontWeight: 700 }}>
            {c}
          </text>
        </g>
      ))}
      {rows.map((row, r) => {
        const top = PAD + HEAD_H + r * ROW_H;
        return (
          <g key={r} data-row={r}>
            {columns.map((c, i) => {
              const v = row.values[i];
              return (
                <g key={c}>
                  <rect x={colX(i)} y={top} width={COL_W} height={ROW_H} style={{ fill: 'var(--surface)', stroke: 'var(--grid-line)', strokeWidth: 1.5 }} />
                  {v !== null && v !== undefined && (
                    <text
                      x={colX(i) + COL_W / 2}
                      y={top + ROW_H / 2 + 11}
                      textAnchor="middle"
                      data-cell={`${r}-${c}`}
                      style={{ fill: ink, fontSize: 32, fontFamily: 'var(--font-mono)' }}
                    >
                      {v}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
      <rect x={PAD} y={PAD} width={columns.length * COL_W} height={H - 2 * PAD} style={{ fill: 'none', stroke: ink, strokeWidth: 2 }} />
    </svg>
  );
}
