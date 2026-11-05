// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import HundredChartVisual, { hundredChartLabel } from './HundredChartVisual';

afterEach(cleanup);

const cellText = (c: Element, n: number) => c.querySelector(`[data-cell="${n}"] text`)?.textContent;

describe('HundredChartVisual', () => {
  it('a piece that is no rectangle says where each row starts, so a Lücke in its arm can be placed', () => {
    expect(hundredChartLabel({ type: 'hundredChart', piece: [15, 24, 25, 26, 35], masked: [15] })).toBe('Ausschnitt aus der Hundertertafel. Reihe 1, ab Spalte 2: Lücke. Reihe 2, ab Spalte 1: 24, 25, 26. Reihe 3, ab Spalte 2: 35.');
    expect(hundredChartLabel({ type: 'hundredChart', piece: [24, 25, 34, 35] })).toBe('Ausschnitt aus der Hundertertafel. Reihe 1: 24, 25. Reihe 2: 34, 35.');
  });

  it('draws 100 cells, 10 per row, fitting a phone without shrinking', () => {
    const { container } = render(<HundredChartVisual visual={{ type: 'hundredChart' }} />);
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(100);
    expect(cellText(container, 37)).toBe('37');
    const x = (n: number) => container.querySelector(`[data-cell="${n}"] rect`)!.getAttribute('x');
    const y = (n: number) => container.querySelector(`[data-cell="${n}"] rect`)!.getAttribute('y');
    expect(x(37)).toBe(x(47));
    expect(y(31)).toBe(y(40));
    expect(Number(screen.getByRole('img').getAttribute('width'))).toBeLessThanOrEqual(310);
  });

  it('masks cells and never names their numbers in the label', () => {
    const { container } = render(<HundredChartVisual visual={{ type: 'hundredChart', masked: [37] }} />);
    expect(cellText(container, 37)).toBe('□');
    const label = screen.getByRole('img').getAttribute('aria-label') ?? '';
    expect(label).toContain('Lücke: Reihe 4, Spalte 7.');
    expect(label).not.toContain('37');
  });

  it('names several masked cells with letters', () => {
    const { container } = render(<HundredChartVisual visual={{ type: 'hundredChart', masked: [12, 23] }} />);
    expect(cellText(container, 12)).toBe('A');
    expect(cellText(container, 23)).toBe('B');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Feld B: Reihe 3, Spalte 3.');
  });

  it('rings marked cells', () => {
    const { container } = render(<HundredChartVisual visual={{ type: 'hundredChart', marked: [34] }} />);
    expect(container.querySelector('[data-cell="34"] [data-ring]')).not.toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Mit Ring: 34.');
  });

  it('draws a cut-out piece in its original arrangement, with a planted number', () => {
    const { container } = render(<HundredChartVisual visual={{ type: 'hundredChart', piece: [24, 34, 35, 36, 44], masked: [35], replaced: [{ cell: 44, shows: 54 }] }} print />);
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(5);
    expect(cellText(container, 44)).toBe('54');
    expect(cellText(container, 35)).toBe('□');
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('aria-label')).toBe('Ausschnitt aus der Hundertertafel. Reihe 1, ab Spalte 1: 24. Reihe 2, ab Spalte 1: 34, Lücke, 36. Reihe 3, ab Spalte 1: 54.');
    expect(svg.getAttribute('class')).toContain('visual--print');
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(310);
  });

  it('labels the full chart', () => {
    expect(hundredChartLabel({ type: 'hundredChart' })).toBe('Hundertertafel von 1 bis 100, mit 10 Zahlen in jeder Reihe.');
  });
});
