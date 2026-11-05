// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import BaseTenVisual, { baseTenLabel } from './BaseTenVisual';

afterEach(cleanup);

const count = (piece: string, look?: string) => screen.getByRole('img').querySelectorAll(`[data-piece="${piece}"]${look ? `[data-look="${look}"]` : ''}`).length;

describe('BaseTenVisual', () => {
  it('draws sticks of ten units and single cubes', () => {
    const { container } = render(<BaseTenVisual visual={{ type: 'baseTen', tens: 3, ones: 4 }} />);
    expect(count('stange')).toBe(3);
    expect(count('wuerfel')).toBe(4);
    expect(container.querySelectorAll('.bt-unit')).toHaveLength(27);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Zehnerstangen und Einerwürfel: 3 Zehnerstangen und 4 Einerwürfel.');
  });

  it('draws unbundled ones, in rows of five', () => {
    const { container } = render(<BaseTenVisual visual={{ type: 'baseTen', tens: 2, ones: 14 }} />);
    expect(count('wuerfel')).toBe(14);
    const ys = new Set([...container.querySelectorAll('[data-piece="wuerfel"] rect')].map((r) => r.getAttribute('y')));
    expect(ys.size).toBe(3);
  });

  it('adds material with mode dazu and crosses out with mode weg', () => {
    render(<BaseTenVisual visual={{ type: 'baseTen', tens: 6, ones: 4, second: { ones: 3, mode: 'dazu' } }} />);
    expect(count('wuerfel', 'second')).toBe(3);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Dazu kommen 3 Einerwürfel.');
    cleanup();
    render(<BaseTenVisual visual={{ type: 'baseTen', tens: 4, ones: 5, second: { tens: 1, ones: 2, mode: 'weg' } }} print />);
    expect(count('stange', 'crossed')).toBe(1);
    expect(count('wuerfel', 'crossed')).toBe(2);
    expect(count('wuerfel', 'first')).toBe(3);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Durchgestrichen sind 1 Zehnerstange und 2 Einerwürfel.');
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
  });

  it('puts cubes below the sticks when they would not fit beside them', () => {
    const { container } = render(<BaseTenVisual visual={{ type: 'baseTen', tens: 10, ones: 5 }} />);
    const svg = screen.getByRole('img');
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(310);
    const cube = container.querySelector('[data-piece="wuerfel"] rect')!;
    expect(Number(cube.getAttribute('y'))).toBeGreaterThan(160);
  });

  it('names an empty picture', () => {
    expect(baseTenLabel({ type: 'baseTen', tens: 0, ones: 0 })).toContain('nichts');
  });
});
