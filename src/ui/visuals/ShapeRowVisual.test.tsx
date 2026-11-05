// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ShapeRowVisual from './ShapeRowVisual';

afterEach(cleanup);

describe('ShapeRowVisual', () => {
  it('draws each entry, names colours in words and marks the empty place', () => {
    const { container } = render(<ShapeRowVisual visual={{ type: 'shapeRow', items: [{ shape: 'kreis', color: 'rot' }, { shape: 'quadrat', color: 'gruen' }, {}] }} />);
    expect(container.querySelector('[data-item="kreis"] circle')).not.toBeNull();
    expect(container.querySelector('[data-item="quadrat"] rect')).not.toBeNull();
    expect(container.querySelector('[data-item="empty"]')).not.toBeNull();
    expect([...container.querySelectorAll('.sr-word')].map((t) => t.textContent)).toEqual(['rot', 'grün']);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Musterreihe: Kreis rot, Quadrat grün, leerer Platz.');
  });

  it('wraps to stay within a phone width and supports print mode', () => {
    const items = Array.from({ length: 12 }, () => ({ shape: 'dreieck' as const }));
    render(<ShapeRowVisual visual={{ type: 'shapeRow', items }} print />);
    const svg = screen.getByRole('img');
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(310);
    expect(svg.getAttribute('class')).toContain('visual--print');
  });
});
