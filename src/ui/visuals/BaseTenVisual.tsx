/**
 * Zehnerstangen and Einerwürfel (docs/research.md §6): a stick shows its ten units, cubes come in fives, so a Bündel can be
 * seen. ones may exceed 9 (Bündeln: 2 Z 14 E). `second` adds material in another look ('dazu') or crosses out the last pieces
 * of the first amount ('weg'). Hand-written SVG; cubes go below the sticks when they would not fit beside them.
 */
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './BaseTenVisual.css';

type BaseTen = VisualOf<'baseTen'>;

const UNIT = 16;
const STICK_W = 20;
const STICK_STEP = 28;
const CUBE = 20;
const CUBE_STEP = 24;
const PER_ROW = 5;
const PAD = 8;
const SECTION_GAP = 18;
/** Drawn at most 310 px wide: it fits a 375 px phone without shrinking. */
const MAX_W = 310;

const pieces = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function baseTenLabel(v: BaseTen): string {
  const named = (tens: number, ones: number) =>
    [tens > 0 ? pieces(tens, 'Zehnerstange', 'Zehnerstangen') : '', ones > 0 ? pieces(ones, 'Einerwürfel', 'Einerwürfel') : ''].filter(Boolean).join(' und ');
  const first = named(v.tens, v.ones);
  const parts = [`Zehnerstangen und Einerwürfel: ${first || 'nichts'}.`];
  const added = v.second ? named(v.second.tens ?? 0, v.second.ones ?? 0) : '';
  if (v.second && added) parts.push(v.second.mode === 'dazu' ? `Dazu kommen ${added}.` : `Durchgestrichen sind ${added}.`);
  return parts.join(' ');
}

type Look = 'first' | 'second' | 'crossed';

export default function BaseTenVisual({ visual, print }: VisualProps<BaseTen>) {
  const { tens, ones, second } = visual;
  const addTens = second?.mode === 'dazu' ? (second.tens ?? 0) : 0;
  const addOnes = second?.mode === 'dazu' ? (second.ones ?? 0) : 0;
  const goneTens = second?.mode === 'weg' ? (second.tens ?? 0) : 0;
  const goneOnes = second?.mode === 'weg' ? (second.ones ?? 0) : 0;
  const sticks: Look[] = [
    ...Array.from({ length: tens }, (_, i): Look => (i >= tens - goneTens ? 'crossed' : 'first')),
    ...Array.from({ length: addTens }, (): Look => 'second'),
  ];
  const cubes: Look[] = [
    ...Array.from({ length: ones }, (_, i): Look => (i >= ones - goneOnes ? 'crossed' : 'first')),
    ...Array.from({ length: addOnes }, (): Look => 'second'),
  ];
  const stickArea = sticks.length * STICK_STEP - (sticks.length ? STICK_STEP - STICK_W : 0);
  const stickH = UNIT * 10;
  const cubeRows = Math.ceil(cubes.length / PER_ROW);
  const cubeW = Math.min(cubes.length, PER_ROW) * CUBE_STEP - (cubes.length ? CUBE_STEP - CUBE : 0);
  const cubeH = cubeRows * CUBE_STEP - (cubes.length ? CUBE_STEP - CUBE : 0);
  const beside = stickArea + (stickArea && cubeW ? SECTION_GAP : 0) + cubeW + 2 * PAD <= MAX_W;
  const cubeX = PAD + (beside && stickArea ? stickArea + SECTION_GAP : 0);
  const cubeY = PAD + (beside || !stickArea ? (sticks.length ? stickH - cubeH : 0) : stickH + SECTION_GAP);
  const w = Math.max(2 * PAD + 10, beside ? cubeX + cubeW + PAD : Math.max(stickArea, cubeW) + 2 * PAD);
  const h = Math.max(2 * PAD + 10, Math.max(sticks.length ? PAD + stickH : 0, cubes.length ? cubeY + cubeH : 0) + PAD);
  return (
    <svg
      className={`visual visual-baseten${print ? ' visual--print' : ''}`}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={baseTenLabel(visual)}
    >
      {sticks.map((look, i) => {
        const x = PAD + i * STICK_STEP;
        return (
          <g key={`s${i}`} data-piece="stange" data-look={look}>
            <rect className={`bt-piece bt-piece--${look}`} x={x} y={PAD} width={STICK_W} height={stickH} rx={3} />
            {Array.from({ length: 9 }, (_, u) => (
              <line key={u} className="bt-unit" x1={x} y1={PAD + (u + 1) * UNIT} x2={x + STICK_W} y2={PAD + (u + 1) * UNIT} />
            ))}
            {look === 'crossed' && <line className="bt-cross" x1={x - 3} y1={PAD + stickH - 4} x2={x + STICK_W + 3} y2={PAD + 4} />}
          </g>
        );
      })}
      {cubes.map((look, i) => {
        const x = cubeX + (i % PER_ROW) * CUBE_STEP;
        const y = cubeY + Math.floor(i / PER_ROW) * CUBE_STEP;
        return (
          <g key={`c${i}`} data-piece="wuerfel" data-look={look}>
            <rect className={`bt-piece bt-piece--${look}`} x={x} y={y} width={CUBE} height={CUBE} rx={3} />
            {look === 'crossed' && <line className="bt-cross" x1={x - 2} y1={y + CUBE + 2} x2={x + CUBE + 2} y2={y - 2} />}
          </g>
        );
      })}
    </svg>
  );
}
