// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import FieldVisual, { fieldLabel } from './FieldVisual';

afterEach(cleanup);

const dots = (kind: string) => screen.getByRole('img').querySelectorAll(`[data-dot="${kind}"]`).length;

describe('FieldVisual', () => {
  it('draws a Zwanzigerfeld with filled and second dots', () => {
    render(<FieldVisual visual={{ type: 'field', size: 20, filled: 8, second: 5 }} />);
    expect(dots('filled')).toBe(8);
    expect(dots('second')).toBe(5);
    expect(dots('empty')).toBe(7);
  });

  it('keeps a wider gap after the 5th dot and the 5th row', () => {
    const { container } = render(<FieldVisual visual={{ type: 'field', size: 100, filled: 0 }} />);
    const all = [...container.querySelectorAll('.fd-dot')].map((c) => [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]);
    expect(all).toHaveLength(100);
    expect(all[5][0] - all[4][0]).toBeGreaterThan(all[4][0] - all[3][0]);
    expect(all[50][1] - all[40][1]).toBeGreaterThan(all[40][1] - all[30][1]);
  });

  it('never states the total in the aria-label', () => {
    expect(fieldLabel({ type: 'field', size: 100, filled: 74 })).toBe('Hunderterfeld: 10 Reihen mit je 10 Punkten. 7 Reihen sind ganz ausgefüllt. In der nächsten Reihe sind 4 Punkte ausgefüllt.');
    expect(fieldLabel({ type: 'field', size: 20, filled: 13 })).not.toContain('13');
    expect(fieldLabel({ type: 'field', size: 20, filled: 1 })).toContain('In der ersten Reihe ist 1 Punkt ausgefüllt.');
    expect(fieldLabel({ type: 'field', size: 20, filled: 0 })).toContain('Kein Punkt');
  });

  it('draws a split line and names it', () => {
    const { container } = render(<FieldVisual visual={{ type: 'field', size: 100, filled: 30, split: { afterCol: 7, afterRow: 3 } }} />);
    expect(container.querySelectorAll('.fd-split')).toHaveLength(2);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('nach 7 Punkten');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('nach 3 Reihen');
  });

  it('turns the field by a quarter when rotated', () => {
    const { container } = render(<FieldVisual visual={{ type: 'field', size: 20, filled: 3, rotated: true }} />);
    const svg = screen.getByRole('img');
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(Number(svg.getAttribute('width')));
    expect(svg.getAttribute('aria-label')).toContain('2 Spalten');
    expect(container.querySelectorAll('.fd-dot')).toHaveLength(20);
  });

  it('clamps out-of-range amounts and supports print mode', () => {
    render(<FieldVisual visual={{ type: 'field', size: 20, filled: 15, second: 40 }} print />);
    expect(dots('second')).toBe(5);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
  });
});
