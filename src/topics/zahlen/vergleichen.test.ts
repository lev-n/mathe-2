import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { cell, kindOf, kindsOf } from './test-utils';
import { vergleichenSkill } from './vergleichen';

describeSkill(vergleichenSkill, { minDistinct: 30 });

const sample = (stufe: Stufe, ab: Ab, n = 300) => cell(vergleichenSkill, stufe, ab, n, 2);
const choice = (ex: Exercise) => {
  if (ex.answer.kind !== 'choice') throw new Error('choice');
  return ex.answer;
};
const right = (ex: Exercise) => choice(ex).options[choice(ex).correct].label;
const sign = (a: number, b: number) => (a < b ? '<' : a > b ? '>' : '=');
const tens = (n: number) => Math.floor(n / 10);
const fits = (x: number, s: string, n: number) => (s === '<' ? x < n : x > n);
const swap = (n: number) => (n % 10) * 10 + tens(n);

describe('zahlen.vergleichen', () => {
  it('Stufe 1, AB I: different tens (or equal numbers), nothing misleads, and the right sign or number', () => {
    const kinds = new Set<string>();
    for (const ex of sample(1, 1)) {
      const [, , kind, x, y] = ex.key.split(':');
      kinds.add(kind);
      const a = Number(x);
      const b = Number(y);
      if (a !== b) {
        expect(tens(a)).not.toBe(tens(b));
        expect((tens(a) - tens(b)) * (a % 10 - b % 10), ex.key).toBeGreaterThanOrEqual(0);
      }
      if (kind === 'zeichen') expect(right(ex)).toBe(sign(a, b));
      else expect(Number(right(ex))).toBe(kind === 'groesser' ? Math.max(a, b) : Math.min(a, b));
    }
    expect([...kinds].sort()).toEqual(['groesser', 'kleiner', 'zeichen']);
  });

  it('Stufe 1, AB II: tens next to each other, and the ones point the wrong way', () => {
    for (const ex of sample(1, 2)) {
      const [, , kind, x, y] = ex.key.split(':');
      const a = Number(x);
      const b = Number(y);
      expect(kind).toBe('einer-taeuschen');
      expect(Math.abs(tens(a) - tens(b))).toBe(1);
      expect((tens(a) - tens(b)) * (a % 10 - b % 10), ex.key).toBeLessThan(0);
      expect(right(ex)).toBe(sign(a, b));
      expect(ex.visual).toBeUndefined();
    }
  });

  it('Stufe 1, AB III: the number for a gap, with another ten in every option; or a sign to check', () => {
    const items = sample(1, 3);
    expect(kindsOf(items)).toEqual(['luecke', 'stimmt']);
    for (const ex of items) {
      if (kindOf(ex) === 'luecke') {
        const [, , , s, x] = ex.key.split(':');
        const n = Number(x);
        const options = choice(ex).options.map((o) => Number(o.label));
        expect(options.filter((w) => fits(w, s, n))).toEqual([Number(right(ex))]);
        for (const w of options) expect(tens(w), ex.key).not.toBe(tens(n));
      } else {
        const [, , , x, s, y] = ex.key.split(':');
        expect(tens(Number(x))).not.toBe(tens(Number(y)));
        expect(right(ex).startsWith('Ja')).toBe(sign(Number(x), Number(y)) === s);
      }
    }
  });

  it('Stufe 2, AB I: same tens; AB II: swapped digits', () => {
    for (const ex of sample(2, 1)) {
      const [, , kind, x, y] = ex.key.split(':');
      expect(kind).toBe('gleiche-zehner');
      expect(tens(Number(x))).toBe(tens(Number(y)));
      expect(x).not.toBe(y);
      expect(right(ex)).toBe(sign(Number(x), Number(y)));
    }
    for (const ex of sample(2, 2)) {
      const [, , kind, x, y] = ex.key.split(':');
      expect(kind).toBe('getauscht');
      expect(Number(y)).toBe(swap(Number(x)));
      expect(right(ex)).toBe(sign(Number(x), Number(y)));
    }
  });

  it('Stufe 2, AB III: the number for a gap inside one ten; or the digits turned in the head', () => {
    const items = sample(2, 3);
    expect(kindsOf(items)).toEqual(['luecke-zehner', 'tausch']);
    for (const ex of items) {
      if (kindOf(ex) === 'luecke-zehner') {
        const [, , , s, x] = ex.key.split(':');
        const n = Number(x);
        const options = choice(ex).options.map((o) => Number(o.label));
        expect(options.filter((w) => fits(w, s, n))).toEqual([Number(right(ex))]);
        expect(options).toContain(n);
        for (const w of options) expect(tens(w), ex.key).toBe(tens(n));
      } else {
        const n = Number(ex.key.split(':')[3]);
        expect(right(ex)).toBe(swap(n) > n ? 'größer' : 'kleiner');
        expect(ex.prompt, ex.key).not.toContain(String(swap(n)));
      }
    }
  });

  it('whyWrong names the ones-first mistake exactly when it would give this sign', () => {
    for (const ex of sample(2, 2)) {
      const answer = choice(ex);
      const reversed = answer.options.find((o) => o.label === (right(ex) === '<' ? '>' : '<'))!;
      expect(reversed.whyWrong).toBe('Schau zuerst auf die Zehner.');
    }
  });

  it('the sign hint points to the larger number only when one number is larger', () => {
    let equal = 0;
    for (const ex of [...sample(1, 1), ...sample(1, 2), ...sample(2, 1), ...sample(2, 2)].filter((x) => /:(zeichen|einer-taeuschen|getauscht|gleiche-zehner):/.test(x.key))) {
      const [, , , x, y] = ex.key.split(':');
      if (x === y) equal++;
      if (x === y) expect(ex.hints.join(' '), ex.key).not.toMatch(/offene Seite|größeren Zahl/);
      else expect(ex.hints, ex.key).toContain('Die offene Seite zeigt zur größeren Zahl.');
    }
    expect(equal).toBeGreaterThan(5);
  });

  function checkOrder(ex: Exercise) {
    if (ex.answer.kind !== 'order') throw new Error('order');
    const { items, correct, direction } = ex.answer;
    const shown = items.map(Number);
    const sorted = correct.map((i) => shown[i]);
    expect(sorted).toEqual([...shown].sort((a, b) => (direction === 'aufsteigend' ? a - b : b - a)));
    expect(shown.length).toBeGreaterThanOrEqual(4);
    expect(shown.length).toBeLessThanOrEqual(5);
    return shown;
  }

  function checkBetween(ex: Exercise) {
    const [, , , lo, hi, x] = ex.key.split(':').map(Number);
    expect(Number(right(ex))).toBe(x);
    expect(choice(ex).options.map((o) => Number(o.label)).filter((w) => w > lo && w < hi)).toEqual([x]);
    expect(choice(ex).options.length).toBeGreaterThanOrEqual(3);
    return { lo, hi };
  }

  it('Stufe 3, AB I: four numbers to order, upwards, two with the same tens; or a wide range', () => {
    const items = sample(3, 1);
    expect(kindsOf(items)).toEqual(['ordnen-weit', 'zwischen-weit']);
    for (const ex of items) {
      if (kindOf(ex) === 'ordnen-weit') {
        const shown = checkOrder(ex);
        expect(shown.length).toBe(4);
        expect(ex.answer).toMatchObject({ direction: 'aufsteigend' });
        expect(new Set(shown.map(tens)).size, ex.key).toBe(3);
      } else {
        const { lo, hi } = checkBetween(ex);
        expect(hi - lo).toBeGreaterThanOrEqual(10);
        // The limits themselves are no option yet.
        expect(choice(ex).options.map((o) => Number(o.label)), ex.key).not.toContain(lo);
      }
    }
  });

  it('Stufe 3, AB II: numbers that sit close, both ways; or a narrow range with the limits among the options', () => {
    const items = sample(3, 2);
    expect(kindsOf(items)).toEqual(['ordnen', 'zwischen']);
    const directions = new Set<string>();
    for (const ex of items) {
      if (kindOf(ex) === 'ordnen') {
        const shown = checkOrder(ex);
        if (ex.answer.kind === 'order') directions.add(ex.answer.direction);
        expect(shown.some((n) => shown.includes(swap(n)) && swap(n) !== n), ex.key).toBe(true);
      } else {
        const { lo, hi } = checkBetween(ex);
        expect(hi - lo).toBeLessThan(10);
      }
    }
    expect(directions.size).toBe(2);
  });

  it('Stufe 3, AB III: how many numbers lie between; or a gap in a chain of signs', () => {
    const items = sample(3, 3);
    expect(kindsOf(items)).toEqual(['kette', 'wie-viele']);
    for (const ex of items) {
      if (kindOf(ex) === 'wie-viele') {
        const [, , , lo, hi] = ex.key.split(':').map(Number);
        expect(ex.answer).toMatchObject({ kind: 'number', value: hi - lo - 1 });
        expect(ex.bugs?.map((b) => b.match)).toEqual(expect.arrayContaining([hi - lo, hi - lo + 1]));
      } else {
        const [, , , a, lo, hi, x] = ex.key.split(':').map(Number);
        expect(a).toBeLessThan(lo);
        expect(ex.expression).toBe(`${a} < ${lo} < □ < ${hi}`);
        expect(Number(right(ex))).toBe(x);
        expect(choice(ex).options.map((o) => Number(o.label)).filter((w) => w > lo && w < hi)).toEqual([x]);
      }
    }
  });
});
