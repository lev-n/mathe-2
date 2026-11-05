/**
 * Ebene Figuren. rotate turns the figure, thin draws a long, narrow rechteck or dreieck ("Lage der Figur", docs/research.md §6
 * `geometrie.formen`). The aria-label describes the figure by its properties (not by its name, so naming tasks stay tasks).
 */
import type { ShapeKind, VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const W = 200;
const H = 160;
const CX = 100;
const CY = 80;

type P = [number, number];

const POLYGONS: Record<Exclude<ShapeKind, 'kreis'>, P[]> = {
  quadrat: [[45, 25], [155, 25], [155, 135], [45, 135]],
  rechteck: [[20, 40], [180, 40], [180, 125], [20, 125]],
  dreieck: [[20, 140], [180, 140], [50, 30]],
  'gleichseitiges-dreieck': [[25, 142], [175, 142], [100, 12.1]],
};

/** Long, narrow forms (the catalogue's "thin shapes"). */
const THIN: Partial<Record<ShapeKind, P[]>> = {
  rechteck: [[12, 62], [188, 62], [188, 98], [12, 98]],
  dreieck: [[12, 112], [188, 112], [40, 62]],
};

const DESCRIPTION: Record<ShapeKind, string> = {
  quadrat: '4 Ecken, 4 gleich lange Seiten',
  rechteck: '4 Ecken, 2 lange und 2 kurze Seiten',
  dreieck: '3 Ecken, alle Seiten sind verschieden lang',
  'gleichseitiges-dreieck': '3 Ecken und 3 gleich lange Seiten',
  kreis: 'ganz rund, ohne Ecken',
};

const NAME: Record<ShapeKind, string> = {
  quadrat: 'ein Quadrat',
  rechteck: 'ein Rechteck',
  dreieck: 'ein Dreieck',
  'gleichseitiges-dreieck': 'ein Dreieck',
  kreis: 'ein Kreis',
};

/** By its properties, or (named) by its name when a task asks for a property. */
export function shapeAriaLabel(shape: ShapeKind, rotate?: number, named?: boolean): string {
  return `Flache Figur: ${named ? NAME[shape] : DESCRIPTION[shape]}.${rotate ? ' Die Figur ist gedreht.' : ''}`;
}

export default function ShapeVisual({ visual, print }: VisualProps<VisualOf<'shape'>>) {
  const { shape, rotate, thin, named } = visual;
  const points = shape === 'kreis' ? [] : ((thin ? THIN[shape] : undefined) ?? POLYGONS[shape]);
  const style = {
    fill: print ? 'var(--surface)' : 'var(--fill-1)',
    stroke: 'var(--ink)',
    strokeWidth: 3,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg className="visual visual-shape" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={shapeAriaLabel(shape, rotate, named)} data-shape={shape}>
      {shape === 'kreis' ? (
        <circle cx={CX} cy={CY} r={66} style={style} />
      ) : (
        // A turned figure is drawn a little smaller, so its corners stay inside the picture.
        <g transform={rotate ? `rotate(${rotate} ${CX} ${CY}) translate(${CX} ${CY}) scale(0.72) translate(${-CX} ${-CY})` : undefined}>
          <polygon points={points.map(([x, y]) => `${x},${y}`).join(' ')} style={style} />
        </g>
      )}
    </svg>
  );
}
