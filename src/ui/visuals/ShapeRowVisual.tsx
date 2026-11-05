/**
 * Musterreihe (docs/research.md §6 `geometrie.muster`): shapes side by side; an entry without a shape is the empty place to fill.
 * Colours carry their word below the shape, so colour is never the only signal. Wraps to fit a 375 px phone. Hand-written SVG.
 */
import type { ColorName, ShapeKind, VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './ShapeRowVisual.css';

const TILE = 52;
const STEP = 62;
const PER_ROW = 5;
const LABEL_H = 20;
const PAD = 4;

const COLOR_WORD: Record<ColorName, string> = { rot: 'rot', blau: 'blau', gelb: 'gelb', gruen: 'grün', lila: 'lila', orange: 'orange' };
const SHAPE_WORD: Partial<Record<ShapeKind, string>> = { quadrat: 'Quadrat', rechteck: 'Rechteck', dreieck: 'Dreieck', 'gleichseitiges-dreieck': 'Dreieck', kreis: 'Kreis' };

export function shapeRowLabel(v: VisualOf<'shapeRow'>): string {
  const words = v.items.map((it) => (it.shape ? [SHAPE_WORD[it.shape] ?? it.shape, it.color ? COLOR_WORD[it.color] : ''].filter(Boolean).join(' ') : 'leerer Platz'));
  return `Musterreihe: ${words.join(', ')}.`;
}

function tile(shape: ShapeKind, x: number, y: number, cls: string) {
  const r = TILE / 2;
  if (shape === 'kreis') return <circle className={cls} cx={x + r} cy={y + r} r={r - 4} />;
  if (shape === 'quadrat') return <rect className={cls} x={x + 6} y={y + 6} width={TILE - 12} height={TILE - 12} />;
  if (shape === 'rechteck') return <rect className={cls} x={x + 2} y={y + 13} width={TILE - 4} height={TILE - 26} />;
  return <polygon className={cls} points={`${x + r},${y + 4} ${x + TILE - 3},${y + TILE - 6} ${x + 3},${y + TILE - 6}`} />;
}

export default function ShapeRowVisual({ visual, print }: VisualProps<VisualOf<'shapeRow'>>) {
  const hasWords = visual.items.some((it) => it.shape && it.color);
  const cellH = TILE + (hasWords ? LABEL_H : 0) + 8;
  const rows = Math.max(1, Math.ceil(visual.items.length / PER_ROW));
  const cols = Math.min(PER_ROW, Math.max(1, visual.items.length));
  const w = cols * STEP - (STEP - TILE) + 2 * PAD;
  const h = rows * cellH + 2 * PAD;
  return (
    <svg className={`visual visual-shaperow${print ? ' visual--print' : ''}`} viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={shapeRowLabel(visual)}>
      {visual.items.map((it, i) => {
        const x = PAD + (i % PER_ROW) * STEP;
        const y = PAD + Math.floor(i / PER_ROW) * cellH;
        if (!it.shape) {
          return (
            <g key={i} data-item="empty">
              <rect className="sr-empty" x={x + 2} y={y + 2} width={TILE - 4} height={TILE - 4} rx={6} />
              <text className="sr-mark" x={x + TILE / 2} y={y + TILE / 2 + 8} textAnchor="middle">
                ?
              </text>
            </g>
          );
        }
        return (
          <g key={i} data-item={it.shape}>
            {tile(it.shape, x, y, `sr-shape sr-shape--${it.color ?? 'plain'}`)}
            {it.color && (
              <text className="sr-word" x={x + TILE / 2} y={y + TILE + 15} textAnchor="middle">
                {COLOR_WORD[it.color]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
