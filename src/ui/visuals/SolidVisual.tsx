/**
 * Line drawings of the seven Körper (oblique projection, seen from front-right-above).
 * Hidden edges are dashed. Visible faces are lightly filled. The aria-label describes the shape
 * without naming it (so naming tasks stay tasks) and without counting corners or edges.
 *
 * What a child sees as solid lines (used for "nur sichtbare gezählt" bugs in the generators):
 * Würfel/Quader 7 Ecken, 9 Kanten, 3 Flächen; Pyramide 4/5/2; Prisma 5/6/2.
 *
 * The Kugel has no Kante, so it gets no equator line: in this app a line (solid or dashed) on a Körper
 * always means a Kante. Its roundness is suggested by an unstroked highlight instead. On paper the faces lose their fill, and a Kugel
 * would be the same circle as a Kreis: there a soft shade keeps it round (a shade, not hatching: hatching is lines).
 */
import { useId } from 'react';
import type { SolidKind, VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const W = 220;
const H = 180;

type P = readonly [number, number];
const pts = (...p: P[]) => p.map(([x, y]) => `${x},${y}`).join(' ');

const DESCRIPTION: Record<SolidKind, string> = {
  wuerfel: 'Zeichnung eines Körpers: Alle Flächen sind gleich große Quadrate, alle Kanten sind gleich lang.',
  quader: 'Zeichnung eines Körpers: Die Flächen sind Rechtecke. Er ist breiter als hoch.',
  kugel: 'Zeichnung eines Körpers: Er ist überall gleich rund, wie ein Ball.',
  zylinder: 'Zeichnung eines Körpers: Oben und unten ist je ein gleich großer Kreis, dazwischen eine gebogene Fläche.',
  kegel: 'Zeichnung eines Körpers: Unten ist ein Kreis, oben eine Spitze, dazwischen eine gebogene Fläche.',
  pyramide: 'Zeichnung eines Körpers: Unten ist ein Quadrat, an den Seiten sind Dreiecke, die sich oben in einer Spitze treffen.',
  prisma: 'Zeichnung eines Körpers: Vorne und hinten ist je ein gleiches Dreieck, dazwischen sind Rechtecke.',
};

const NAME: Record<SolidKind, string> = {
  wuerfel: 'ein Würfel',
  quader: 'ein Quader',
  kugel: 'eine Kugel',
  zylinder: 'ein Zylinder',
  kegel: 'ein Kegel',
  pyramide: 'eine Pyramide',
  prisma: 'ein Prisma',
};

/** By its properties, or (named) by its name when a task asks for a property. */
export function solidAriaLabel(solid: SolidKind, named?: boolean): string {
  const text = named ? `Zeichnung eines Körpers: ${NAME[solid]}.` : DESCRIPTION[solid];
  // The Kugel has no Kanten (and none are drawn), so the dashed-line convention is not mentioned for it.
  return solid === 'kugel' ? text : `${text} Verdeckte Kanten sind gestrichelt.`;
}

interface Drawing {
  /** Visible faces, back to front. */
  faces: { points: P[]; tone: 'front' | 'top' | 'side' }[];
  visible: [P, P][];
  hidden: [P, P][];
  /** Extra curved paths (solid / dashed) for round bodies. */
  curves?: { d: string; dashed?: boolean; tone?: 'front' | 'top' | 'side' | 'none'; stroke?: boolean }[];
}

function box(A: P, B: P, C: P, D: P, dx: number, dy: number): Drawing {
  const m = (p: P): P => [p[0] + dx, p[1] - dy];
  const [A2, B2, C2, D2] = [m(A), m(B), m(C), m(D)];
  return {
    faces: [
      { points: [D, C, C2, D2], tone: 'top' },
      { points: [B, B2, C2, C], tone: 'side' },
      { points: [A, B, C, D], tone: 'front' },
    ],
    visible: [[A, B], [B, C], [C, D], [D, A], [B, B2], [C, C2], [D, D2], [B2, C2], [C2, D2]],
    hidden: [[A, A2], [A2, B2], [A2, D2]],
  };
}

function drawing(solid: SolidKind): Drawing {
  switch (solid) {
    case 'wuerfel':
      return box([40, 155], [130, 155], [130, 65], [40, 65], 45, 35);
    case 'quader':
      return box([22, 155], [152, 155], [152, 100], [22, 100], 42, 32);
    case 'pyramide': {
      const P1: P = [30, 155];
      const P2: P = [140, 155];
      const P3: P = [185, 120];
      const P4: P = [75, 120];
      const T: P = [107, 22];
      return {
        faces: [
          { points: [P2, P3, T], tone: 'side' },
          { points: [P1, P2, T], tone: 'front' },
        ],
        visible: [[P1, P2], [P2, P3], [P1, T], [P2, T], [P3, T]],
        hidden: [[P1, P4], [P4, P3], [P4, T]],
      };
    }
    case 'prisma': {
      const T1: P = [30, 155];
      const T2: P = [115, 155];
      const T3: P = [72, 83];
      const m = (p: P): P => [p[0] + 70, p[1] - 40];
      const [U1, U2, U3] = [m(T1), m(T2), m(T3)];
      return {
        faces: [
          { points: [T2, U2, U3, T3], tone: 'side' },
          { points: [T1, T2, T3], tone: 'front' },
        ],
        visible: [[T1, T2], [T2, T3], [T3, T1], [T2, U2], [T3, U3], [U2, U3]],
        hidden: [[T1, U1], [U1, U2], [U1, U3]],
      };
    }
    case 'zylinder': {
      const cx = 110;
      const rx = 62;
      const ry = 18;
      const top = 42;
      const bottom = 148;
      return {
        faces: [],
        visible: [[[cx - rx, top], [cx - rx, bottom]], [[cx + rx, top], [cx + rx, bottom]]],
        hidden: [],
        curves: [
          // mantle (filled), drawn first
          { d: `M ${cx - rx} ${top} L ${cx - rx} ${bottom} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bottom} L ${cx + rx} ${top} Z`, tone: 'front' },
          { d: `M ${cx - rx} ${top} A ${rx} ${ry} 0 1 0 ${cx + rx} ${top} A ${rx} ${ry} 0 1 0 ${cx - rx} ${top} Z`, tone: 'top', stroke: true },
          { d: `M ${cx - rx} ${bottom} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bottom}`, tone: 'none', stroke: true },
          { d: `M ${cx - rx} ${bottom} A ${rx} ${ry} 0 0 1 ${cx + rx} ${bottom}`, dashed: true, tone: 'none' },
        ],
      };
    }
    case 'kegel': {
      const cx = 110;
      const rx = 66;
      const ry = 20;
      const base = 148;
      const apex: P = [cx, 20];
      return {
        faces: [],
        visible: [[apex, [cx - rx, base]], [apex, [cx + rx, base]]],
        hidden: [],
        curves: [
          { d: `M ${apex[0]} ${apex[1]} L ${cx - rx} ${base} A ${rx} ${ry} 0 0 0 ${cx + rx} ${base} Z`, tone: 'front' },
          { d: `M ${cx - rx} ${base} A ${rx} ${ry} 0 0 0 ${cx + rx} ${base}`, tone: 'none', stroke: true },
          { d: `M ${cx - rx} ${base} A ${rx} ${ry} 0 0 1 ${cx + rx} ${base}`, dashed: true, tone: 'none' },
        ],
      };
    }
    case 'kugel': {
      const cx = 110;
      const cy = 90;
      const r = 68;
      // highlight up left (filled, never stroked: a line on a Körper would read as a Kante)
      const hx = cx - 24;
      const hy = cy - 26;
      const hrx = 22;
      const hry = 14;
      return {
        faces: [],
        visible: [],
        hidden: [],
        curves: [
          { d: `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`, tone: 'front', stroke: true },
          { d: `M ${hx - hrx} ${hy} A ${hrx} ${hry} 0 1 0 ${hx + hrx} ${hy} A ${hrx} ${hry} 0 1 0 ${hx - hrx} ${hy} Z`, tone: 'top' },
        ],
      };
    }
  }
}

export default function SolidVisual({ visual, print }: VisualProps<VisualOf<'solid'>>) {
  const shadeId = `kugel-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const d = drawing(visual.solid);
  const shaded = print && visual.solid === 'kugel';
  const toneFill = (tone: 'front' | 'top' | 'side' | 'none' | undefined) => {
    if (!tone || tone === 'none') return 'none';
    if (shaded && tone === 'front') return `url(#${shadeId})`;
    if (print) return 'var(--surface)';
    return tone === 'front' ? 'var(--fill-1)' : tone === 'top' ? 'var(--primary-soft)' : 'var(--fill-hidden)';
  };
  const line = { stroke: 'var(--ink)', strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const dashed = { stroke: 'var(--ink)', strokeWidth: 2, strokeDasharray: '7 6', strokeLinecap: 'round' as const };
  return (
    <svg className="visual visual-solid" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={solidAriaLabel(visual.solid, visual.named)} data-solid={visual.solid}>
      {shaded && (
        <defs>
          <radialGradient id={shadeId} cx="0.38" cy="0.35" r="0.72" data-shade="kugel">
            <stop offset="0" style={{ stopColor: 'var(--surface)' }} />
            <stop offset="0.55" style={{ stopColor: 'var(--surface)' }} />
            <stop offset="1" style={{ stopColor: 'var(--ink)', stopOpacity: 0.45 }} />
          </radialGradient>
        </defs>
      )}
      {d.faces.map((f, i) => (
        <polygon key={`f${i}`} points={pts(...f.points)} style={{ fill: toneFill(f.tone), stroke: 'none' }} />
      ))}
      {(d.curves ?? []).filter((c) => c.tone && c.tone !== 'none').map((c, i) => (
        <path key={`cf${i}`} d={c.d} style={{ fill: toneFill(c.tone), stroke: 'none' }} />
      ))}
      {d.hidden.map(([a, b], i) => (
        <line key={`h${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={dashed} data-edge="hidden" />
      ))}
      {(d.curves ?? []).filter((c) => c.dashed).map((c, i) => (
        <path key={`cd${i}`} d={c.d} style={{ ...dashed, fill: 'none' }} data-edge="hidden" />
      ))}
      {d.visible.map(([a, b], i) => (
        <line key={`v${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={line} data-edge="visible" />
      ))}
      {(d.curves ?? []).filter((c) => c.stroke).map((c, i) => (
        <path key={`cv${i}`} d={c.d} style={{ ...line, fill: 'none' }} data-edge="visible" />
      ))}
    </svg>
  );
}
