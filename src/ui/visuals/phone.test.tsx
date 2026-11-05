// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Visual } from '../../core/types';
import VisualView from './Visual';

afterEach(cleanup);

/** Width for a picture in a practice card on a 375 px phone: 343 px page minus 16 px card padding on both sides. */
const PHONE_CONTENT = 311;

const WIDEST: Visual[] = [
  { type: 'field', size: 20, filled: 20 },
  { type: 'field', size: 20, filled: 13, split: { afterCol: 7, afterRow: 1 } },
  { type: 'field', size: 100, filled: 100, split: { afterCol: 7 } },
  { type: 'field', size: 100, filled: 40, rotated: true },
  { type: 'baseTen', tens: 10, ones: 0 },
  { type: 'baseTen', tens: 6, ones: 4, second: { ones: 3, mode: 'dazu' } },
  { type: 'baseTen', tens: 2, ones: 14 },
  { type: 'hundredChart', masked: [37], marked: [34] },
  { type: 'hundredChart', piece: [24, 25, 26, 27, 34, 35, 36, 37], masked: [35] },
  { type: 'dotArray', groups: Array.from({ length: 10 }, () => 10) },
  { type: 'shapeRow', items: Array.from({ length: 12 }, () => ({ shape: 'quadrat' as const, color: 'orange' as const })) },
  { type: 'money', items: [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] },
];

describe('new visuals on a phone', () => {
  it.each(WIDEST.map((v, i) => [`${v.type} ${i}`, v] as const))('%s fits the card at 375 px without shrinking', (_name, visual) => {
    const { container } = render(<VisualView visual={visual} />);
    const svg = container.querySelector('svg.visual')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')?.length).toBeGreaterThan(0);
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(PHONE_CONTENT);
    // A picture narrower than its container never overflows: base.css sets .visual { max-width: 100%; height: auto }.
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d/);
  });

  it('the Zahlenstrahl keeps a minimum width that fits the card', () => {
    const { container } = render(<VisualView visual={{ type: 'numberLine', min: 0, max: 100, majorStep: 10, minorStep: 5, labelMajor: true, jumps: [{ from: 40, to: 45, label: '+ 5' }] }} />);
    const box = container.querySelector<HTMLElement>('.nl-scroll')!;
    expect(parseInt(box.style.getPropertyValue('--nl-min-width'), 10)).toBeLessThanOrEqual(PHONE_CONTENT);
  });
});

describe('colours of the new visuals', () => {
  it('come only from tokens (so the picture follows the theme and prints in black and white)', () => {
    for (const name of ['Field', 'BaseTen', 'HundredChart', 'ShapeRow']) {
      const f = `./${name}Visual.css`; // (a variable: Vite would turn a literal new URL(…) into an asset URL)
      const text = readFileSync(new URL(f, import.meta.url), 'utf8');
      expect(text, f).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
      expect(text, f).toMatch(/\.visual--print/);
      expect(text, f).toMatch(/@media print/);
    }
  });
});
