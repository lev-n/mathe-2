// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ShapeKind } from '../../core/types';
import ShapeVisual from './ShapeVisual';

afterEach(cleanup);

const SHAPES: ShapeKind[] = ['quadrat', 'rechteck', 'dreieck', 'gleichseitiges-dreieck', 'kreis'];

describe('ShapeVisual', () => {
  it.each(SHAPES)('%s: aria-label without the name, and without a word for the out-of-scope right angle', (shape) => {
    render(<ShapeVisual visual={{ type: 'shape', shape }} />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toMatch(/^Flache Figur: /);
    expect(label.toLowerCase()).not.toContain(shape.split('-').pop()!);
    expect(label).not.toMatch(/Winkel/);
  });

  it('named: the name only, when a task asks for what the description would state', () => {
    render(<ShapeVisual visual={{ type: 'shape', shape: 'dreieck', named: true }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Flache Figur: ein Dreieck.');
  });

  it('says that a figure is turned', () => {
    render(<ShapeVisual visual={{ type: 'shape', shape: 'quadrat', rotate: 45 }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Die Figur ist gedreht.');
  });

  it('a thin Dreieck or Rechteck is flatter than the usual one', () => {
    const height = (thin: boolean) => {
      const { container } = render(<ShapeVisual visual={{ type: 'shape', shape: 'rechteck', thin }} />);
      const ys = container.querySelector('polygon')!.getAttribute('points')!.split(' ').map((p) => Number(p.split(',')[1]));
      cleanup();
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(height(true)).toBeLessThan(height(false));
  });
});
