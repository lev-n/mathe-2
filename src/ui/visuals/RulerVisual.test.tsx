// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import RulerVisual, { rulerLabel } from './RulerVisual';

afterEach(cleanup);

describe('RulerVisual', () => {
  it('renders cm labels 0…maxCm, one tick per cm and no mm', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 10, startCm: 0, lengthCm: 7 }} />);
    const svg = screen.getByRole('img');
    const nums = [...svg.querySelectorAll('.rl-num')].map((t) => t.textContent);
    expect(nums).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(svg.querySelectorAll('.rl-tick')).toHaveLength(11);
    expect(svg.getAttribute('aria-label')).toBe('Lineal von 0 bis 10 cm. Ein Streifen beginnt bei 0 cm und endet bei 7 cm.');
    expect(svg.getAttribute('aria-label')).not.toContain('mm');
  });

  it('draws the bar exactly from start to end (24 px per cm)', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 12, startCm: 2, lengthCm: 3 }} />);
    const bar = screen.getByTestId('ruler-bar');
    expect(Number(bar.getAttribute('width'))).toBe(3 * 24);
    expect(Number(bar.getAttribute('x'))).toBe(18 + 2 * 24);
  });

  it('draws a broken ruler and a second object', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 12, minCm: 3, startCm: 4, lengthCm: 5, second: { startCm: 3, lengthCm: 4 } }} />);
    const svg = screen.getByRole('img');
    expect(svg.querySelector('.rl-num')?.textContent).toBe('3');
    expect(screen.getAllByTestId('ruler-bar')).toHaveLength(2);
    expect(rulerLabel({ type: 'ruler', maxCm: 12, minCm: 3, startCm: 4, lengthCm: 5 })).toContain('Abgebrochenes Lineal');
    expect(svg.getAttribute('aria-label')).toContain('Der obere Streifen beginnt bei 3 cm und endet bei 7 cm.');
  });

  it('labels every 2nd cm on a long ruler, which still fits a 375 px phone at its minimum scale', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 20, startCm: 0, lengthCm: 15 }} />);
    const svg = screen.getByRole('img');
    expect([...svg.querySelectorAll('.rl-num')]).toHaveLength(11);
    expect(Number(svg.getAttribute('width')) * 0.72).toBeLessThanOrEqual(311);
  });

  it('supports print mode', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 15, startCm: 0, lengthCm: 10 }} print />);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
  });
});
