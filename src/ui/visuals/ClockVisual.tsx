/**
 * Analog clock with numbers 1–12, a short thick hour hand and a long thin minute hand (the hands differ in length and
 * width, not only in colour). face: all 60 minute ticks, only the 5-minute ticks, or only 12, 3, 6, 9 (full, half and quarter
 * hours). highlight tints the part of the face from the 12 to a quarter, half or three quarters. Optional digital display below.
 * The aria-label describes the hand positions so the time can be read without seeing it.
 */
import { fmtTime } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './ClockVisual.css';

type Clock = VisualOf<'clock'>;

const SIZE = 240;
const C = SIZE / 2;
const R = 108;
const DIGITAL_H = 64;

const HIGHLIGHT: Record<NonNullable<Clock['highlight']>, { deg: number; word: string }> = {
  quarter: { deg: 90, word: 'eine Viertelstunde' },
  half: { deg: 180, word: 'eine halbe Stunde' },
  'three-quarters': { deg: 270, word: 'eine Dreiviertelstunde' },
};

function h12(h: number): number {
  const x = h % 12;
  return x === 0 ? 12 : x;
}

/** German description of the hands, e.g. 'Der kurze Stundenzeiger steht zwischen der 8 und der 9. …' */
export function clockLabel(v: Clock): string {
  const h = Math.max(0, Math.min(23, Math.floor(v.hours)));
  const m = Math.max(0, Math.min(59, Math.floor(v.minutes)));
  const cur = h12(h);
  const next = h12(cur + 1);
  const hour = m === 0 ? `Der kurze Stundenzeiger zeigt auf die ${cur}.` : `Der kurze Stundenzeiger steht zwischen der ${cur} und der ${next}.`;
  const num = Math.floor(m / 5) === 0 ? 12 : Math.floor(m / 5);
  const rest = m % 5;
  const minute = rest === 0
    ? `Der lange Minutenzeiger zeigt auf die ${num}.`
    : `Der lange Minutenzeiger steht ${rest} ${rest === 1 ? 'Strich' : 'Striche'} nach der ${num}.`;
  const digital = v.showDigital ? ` Die Digitalanzeige zeigt ${fmtTime(h, m)}.` : '';
  const part = v.highlight ? ` Getönt ist ${HIGHLIGHT[v.highlight].word} von der 12 an.` : '';
  return `Uhr mit Zeigern. ${hour} ${minute}${digital}${part}`;
}

/** Point on the clock for an angle in degrees (0 = 12 o'clock, clockwise). */
function polar(deg: number, r: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

/** Pie slice from the 12, clockwise by `deg`. */
function sectorPath(deg: number): string {
  const r = R - 2;
  const [x, y] = polar(deg, r);
  return `M ${C} ${C} L ${C} ${C - r} A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 1 ${x} ${y} Z`;
}

export default function ClockVisual({ visual, print }: VisualProps<Clock>) {
  const h = Math.max(0, Math.min(23, Math.floor(visual.hours)));
  const m = Math.max(0, Math.min(59, Math.floor(visual.minutes)));
  const height = SIZE + (visual.showDigital ? DIGITAL_H : 0);
  const hourAngle = ((h % 12) + m / 60) * 30;
  const minuteAngle = m * 6;
  const [hx, hy] = polar(hourAngle, 56);
  const [mx, my] = polar(minuteAngle, 88);
  const ticks = Array.from({ length: 60 }, (_, i) => i).filter((i) => (visual.face === 'quarters' ? i % 15 === 0 : visual.face === 'five' ? i % 5 === 0 : true));
  return (
    <svg
      className={`visual visual-clock${print ? ' visual--print' : ''}`}
      viewBox={`0 0 ${SIZE} ${height}`}
      width={SIZE}
      height={height}
      role="img"
      aria-label={clockLabel(visual)}
    >
      <circle className="ck-face" cx={C} cy={C} r={R} />
      {visual.highlight && <path className="ck-part" d={sectorPath(HIGHLIGHT[visual.highlight].deg)} data-testid="clock-highlight" />}
      {ticks.map((i) => {
        const major = i % 5 === 0;
        const [x1, y1] = polar(i * 6, R - (major ? 14 : 7));
        const [x2, y2] = polar(i * 6, R - 2);
        return <line key={i} className={major ? 'ck-tick ck-tick--major' : 'ck-tick'} x1={x1} y1={y1} x2={x2} y2={y2} data-tick="" />;
      })}
      <line className="ck-hand ck-hand--hour" x1={C} y1={C} x2={hx} y2={hy} data-testid="clock-hour-hand" />
      <line className="ck-hand ck-hand--minute" x1={C} y1={C} x2={mx} y2={my} data-testid="clock-minute-hand" />
      {/* Numbers above the hands (with a halo) so a hand never hides a number. */}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const [x, y] = polar(n * 30, R - 32);
        return (
          <text key={n} className="ck-num" x={x} y={y + 8} textAnchor="middle">
            {n}
          </text>
        );
      })}
      <circle className="ck-center" cx={C} cy={C} r={7} />
      {visual.showDigital && (
        <g data-testid="clock-digital">
          <rect className="ck-digital" x={C - 64} y={SIZE + 6} width={128} height={48} rx={8} />
          <text className="ck-digital-text" x={C} y={SIZE + 40} textAnchor="middle">
            {fmtTime(h, m, false)}
          </text>
        </g>
      )}
    </svg>
  );
}
