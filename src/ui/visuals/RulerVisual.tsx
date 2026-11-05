/**
 * Lineal in whole cm (mm is out of scope in Klasse 2) with an object (bar) above it from startCm to startCm + lengthCm; dashed guide
 * lines lead from the bar ends down to the scale. minCm > 0 draws a broken ruler that starts at this number; `second` is a
 * second object above the first (compare two lengths). Long rulers label every 2nd cm, so the labels stay readable on a phone.
 */
import type { VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';
import './RulerVisual.css';

type Ruler = VisualOf<'ruler'>;

const MARGIN = 18;
/** Room on the right for the unit label 'cm'. */
const RIGHT = 42;
const BAR_H = 22;
const BAR_GAP = 10;
const RULER_H = 58;
const LONG_RULER_CM = 15;
const pxPerCm = (cm: number) => (cm > LONG_RULER_CM ? 18 : 24);

function bars(v: Ruler) {
  return v.second ? [v.second, { startCm: v.startCm, lengthCm: v.lengthCm }] : [{ startCm: v.startCm, lengthCm: v.lengthCm }];
}

export function rulerLabel(v: Ruler): string {
  const from = v.minCm ?? 0;
  const objects = bars(v).map((b, i, all) => {
    const name = all.length === 1 ? 'Ein Streifen' : i === 0 ? 'Der obere Streifen' : 'Der untere Streifen';
    return `${name} beginnt bei ${b.startCm} cm und endet bei ${b.startCm + b.lengthCm} cm.`;
  });
  return `${from > 0 ? `Abgebrochenes Lineal, es beginnt erst bei ${from} cm und geht bis ${v.maxCm} cm.` : `Lineal von 0 bis ${v.maxCm} cm.`} ${objects.join(' ')}`;
}

export default function RulerVisual({ visual, print }: VisualProps<Ruler>) {
  const minCm = Math.max(0, Math.round(visual.minCm ?? 0));
  const maxCm = Math.max(minCm + 1, Math.round(visual.maxCm));
  const span = maxCm - minCm;
  const px = pxPerCm(span);
  const objects = bars(visual);
  const rulerY = objects.length * (BAR_H + BAR_GAP) + 8;
  const width = MARGIN + span * px + RIGHT;
  const height = rulerY + RULER_H + 8;
  const x = (cm: number) => MARGIN + (cm - minCm) * px;
  const clamp = (cm: number) => Math.max(minCm, Math.min(maxCm, cm));
  const labelEvery = span > LONG_RULER_CM ? 2 : 1;
  return (
    <svg
      className={`visual visual-ruler ${READABLE}${print ? ' visual--print' : ''}`}
      style={readableStyle(width, 0.72)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={rulerLabel(visual)}
    >
      {objects.map((b, i) => {
        const start = clamp(Math.round(b.startCm));
        const end = Math.max(start, clamp(start + Math.round(b.lengthCm)));
        const y = 8 + i * (BAR_H + BAR_GAP);
        return (
          <g key={i}>
            <rect className="rl-bar" x={x(start)} y={y} width={x(end) - x(start)} height={BAR_H} rx={5} data-testid="ruler-bar" />
            <line className="rl-guide" x1={x(start)} y1={y + BAR_H} x2={x(start)} y2={rulerY} />
            <line className="rl-guide" x1={x(end)} y1={y + BAR_H} x2={x(end)} y2={rulerY} />
          </g>
        );
      })}
      <rect className={`rl-body${minCm > 0 ? ' rl-body--broken' : ''}`} x={MARGIN - 12} y={rulerY} width={span * px + 24} height={RULER_H} rx={4} />
      {Array.from({ length: span + 1 }, (_, i) => (
        <line key={i} className="rl-tick rl-tick--cm" x1={x(minCm + i)} y1={rulerY} x2={x(minCm + i)} y2={rulerY + 22} />
      ))}
      {Array.from({ length: span + 1 }, (_, i) => minCm + i)
        .filter((cm) => (cm - minCm) % labelEvery === 0)
        .map((cm) => (
          <text key={cm} className="rl-num" x={x(cm)} y={rulerY + 46} textAnchor="middle">
            {cm}
          </text>
        ))}
      <text className="rl-unit" x={x(maxCm) + 28} y={rulerY + 46} textAnchor="middle">
        cm
      </text>
    </svg>
  );
}
