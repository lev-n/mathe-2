// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DotArrayVisual, { dotArrayAriaLabel } from './DotArrayVisual';

describe('DotArrayVisual', () => {
  it('draws rows × cols dots with a German aria-label', () => {
    const { container } = render(<DotArrayVisual visual={{ type: 'dotArray', rows: 6, cols: 7, splitAfterRow: 5, splitAfterCol: 5 }} />);
    expect(container.querySelectorAll('circle')).toHaveLength(42);
    const label = screen.getByRole('img').getAttribute('aria-label');
    expect(label).toBe('Punktefeld: 6 Reihen mit je 7 Punkten. Nach 5 Reihen ist eine Lücke. In jeder Reihe ist nach 5 Punkten eine Lücke.');
  });

  it('calls one box a pile, not a group: a task may ask how many groups it makes', () => {
    expect(dotArrayAriaLabel({ type: 'dotArray', groups: [12] })).toBe('12 Punkte.');
    expect(dotArrayAriaLabel({ type: 'dotArray', groups: [1] })).toBe('1 Punkt.');
    expect(dotArrayAriaLabel({ type: 'dotArray', groups: [4, 4] })).toBe('Punkte in 2 Gruppen mit je 4 Punkten.');
  });

  it('leaves a gap after the split row', () => {
    const { container } = render(<DotArrayVisual visual={{ type: 'dotArray', rows: 7, cols: 2, splitAfterRow: 5 }} print />);
    const y = (id: string) => Number(container.querySelector(`[data-dot="${id}"]`)?.getAttribute('cy'));
    expect(y('5-0') - y('4-0')).toBeGreaterThan(y('4-0') - y('3-0'));
  });

  it('uses singular forms', () => {
    expect(dotArrayAriaLabel({ type: 'dotArray', rows: 1, cols: 1 })).toBe('Punktefeld: 1 Reihe mit je 1 Punkt.');
  });
});

describe('DotArrayVisual: repeated splits and groups', () => {
  it('leaves a gap at the split', () => {
    const { container } = render(<DotArrayVisual visual={{ type: 'dotArray', rows: 1, cols: 9, splitAfterCol: 3 }} />);
    const x = (c: number) => Number(container.querySelector(`[data-dot="0-${c}"]`)?.getAttribute('cx'));
    expect(x(3) - x(2)).toBeGreaterThan(x(2) - x(1));
  });

  it('draws equal groups, each in a frame', () => {
    const { container } = render(<DotArrayVisual visual={{ type: 'dotArray', groups: [4, 4, 4] }} print />);
    expect(container.querySelectorAll('[data-group]')).toHaveLength(3);
    expect(container.querySelectorAll('circle')).toHaveLength(12);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Punkte in 3 Gruppen mit je 4 Punkten.');
  });

  it('names unequal groups, draws dot pairs, and wraps to a phone width', () => {
    expect(dotArrayAriaLabel({ type: 'dotArray', groups: [5, 5, 2] })).toBe('Punkte in 3 Gruppen: 5, 5 und 2 Punkte.');
    expect(dotArrayAriaLabel({ type: 'dotArray', groups: [5, 5, 1] })).toBe('Punkte in 3 Gruppen: 5, 5 und 1 Punkt.');
    const { container } = render(<DotArrayVisual visual={{ type: 'dotArray', groups: Array.from({ length: 10 }, () => 10), perRow: 5 }} />);
    const svg = screen.getByRole('img');
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(310);
    expect(container.querySelectorAll('circle')).toHaveLength(100);
  });
});
