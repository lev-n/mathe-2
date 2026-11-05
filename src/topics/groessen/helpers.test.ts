import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { Visual } from '../../core/types';
import { addMinutes, describeClock, describeMoney, describeRuler, drawPieces, fewestPieces, h12, labelledOrder, pictureChoice, spoken, sum, waysToLay } from './helpers';

describe('groessen helpers', () => {
  it('spoken: the forms children say', () => {
    expect(spoken(3, 0)).toBe('drei Uhr');
    expect(spoken(1, 0)).toBe('ein Uhr');
    expect(spoken(13, 0)).toBe('ein Uhr');
    expect(spoken(3, 30)).toBe('halb vier');
    expect(spoken(12, 30)).toBe('halb eins');
    expect(spoken(8, 15)).toBe('Viertel nach acht');
    expect(spoken(8, 45)).toBe('Viertel vor neun');
    expect(spoken(11, 55)).toBe('fünf vor zwölf');
    expect(() => spoken(3, 25)).toThrow(RangeError);
  });

  it('h12 and addMinutes', () => {
    expect([h12(0), h12(12), h12(13), h12(23)]).toEqual([12, 12, 1, 11]);
    expect(addMinutes(9, 40, 35)).toEqual([10, 15]);
    expect(addMinutes(9, 10, -30)).toEqual([8, 40]);
  });

  it('fewestPieces: each amount with the fewest coins and notes', () => {
    expect(fewestPieces(1700)).toEqual([1000, 500, 200]);
    expect(fewestPieces(80)).toEqual([50, 20, 10]);
    for (let amount = 1; amount <= 2000; amount += 7) expect(sum(fewestPieces(amount))).toBe(amount);
  });

  it('waysToLay: all ways, by hand for small amounts', () => {
    expect(waysToLay(4, [2, 1])).toEqual([[2, 2], [2, 1, 1], [1, 1, 1, 1]]);
    expect(waysToLay(5, [5, 2, 1]).length).toBe(4);
    expect(waysToLay(7, [5, 2, 1]).length).toBe(6);
    expect(waysToLay(20, [10, 5]).length).toBe(3);
  });

  it('drawPieces keeps its range', () => {
    const rng = createRng(11);
    for (let i = 0; i < 200; i++) {
      const total = sum(drawPieces(rng, [10, 5, 2, 1], 3, 11, 20));
      expect(total).toBeGreaterThanOrEqual(11);
      expect(total).toBeLessThanOrEqual(20);
    }
  });

  it('labelledOrder and pictureChoice point to the right entries', () => {
    const rng = createRng(5);
    for (let i = 0; i < 100; i++) {
      const { answer, shown } = labelledOrder(rng, [5, 50, 200], (v) => String(v), 'aufsteigend');
      expect(answer.correct.map((c) => shown[c])).toEqual([5, 50, 200]);
      expect(shown).not.toEqual([5, 50, 200]);
      const right: Visual = { type: 'money', items: [10] };
      const { answer: choice, rightLabel } = pictureChoice(rng, right, [{ visual: { type: 'money', items: [20] }, whyWrong: 'x' }]);
      expect(choice.options[choice.correct].visual).toBe(right);
      expect(choice.options[choice.correct].label).toBe(rightLabel);
    }
  });


  it('describeMoney keeps the order shown', () => {
    expect(describeMoney([500, 10000, 5000])).toBe('Du siehst 1 Schein zu 5 Euro, 1 Schein zu 100 Euro, 1 Schein zu 50 Euro.');
    expect(describeMoney([100, 200, 100])).toBe('Du siehst 2 Münzen zu 1 Euro, 1 Münze zu 2 Euro.');
  });

  it('describeClock and describeRuler state the data', () => {
    expect(describeClock(2, 30)).toBe('Der kurze Zeiger steht zwischen der 2 und der 3. Der lange Zeiger zeigt auf die 6.');
    expect(describeClock(12, 0)).toBe('Der kurze Zeiger zeigt auf die 12. Der lange Zeiger zeigt auf die 12.');
    expect(describeClock(12, 45)).toContain('zwischen der 12 und der 1.');
    expect(describeRuler({ type: 'ruler', maxCm: 9, startCm: 0, lengthCm: 6 })).toBe('Lineal von 0 bis 9 cm. Der Streifen beginnt bei 0 cm und endet bei 6 cm.');
    expect(describeRuler({ type: 'ruler', maxCm: 12, minCm: 2, startCm: 3, lengthCm: 4 })).toContain('Das Lineal beginnt bei 2 cm');
  });
});
