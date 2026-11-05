import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { geradeUngeradeSkill } from './gerade-ungerade';
import { cell, kindOf, kindsOf } from './test-utils';

describeSkill(geradeUngeradeSkill, { minDistinct: { 1: 20, 2: 30, 3: 30 } });

const sample = (stufe: Stufe, ab: Ab, n = 300) => cell(geradeUngeradeSkill, stufe, ab, n, 8);
const choice = (ex: Exercise) => {
  if (ex.answer.kind !== 'choice') throw new Error('choice');
  return ex.answer;
};
const right = (ex: Exercise) => choice(ex).options[choice(ex).correct].label;
const word = (n: number) => (n % 2 === 0 ? 'gerade' : 'ungerade');

describe('zahlen.gerade-ungerade', () => {
  it('is marked as an Extra', () => {
    expect(geradeUngeradeSkill.optional).toBe('extra');
  });

  it('Stufe 1, AB I: numbers up to 20 as dot pairs', () => {
    for (const ex of sample(1, 1)) {
      const n = Number(ex.key.split(':')[3]);
      expect(kindOf(ex)).toBe('paare');
      expect(n).toBeLessThanOrEqual(20);
      expect(right(ex)).toBe(word(n));
      expect(ex.visual).toEqual({ type: 'dotArray', groups: [n], perRow: 2 });
    }
  });

  it('Stufe 1, AB II and Stufe 2, AB II: exactly one number of the wanted kind, in their own range', () => {
    for (const [stufe, max] of [[1, 20], [2, 100]] as [Stufe, number][]) {
      for (const ex of sample(stufe, 2)) {
        const [, , kind, m, w] = ex.key.split(':');
        expect(kind).toBe('waehlen');
        expect(Number(m)).toBe(max);
        expect(word(Number(right(ex)))).toBe(w);
        expect(choice(ex).options.filter((o) => word(Number(o.label)) === w).length).toBe(1);
        for (const o of choice(ex).options) expect(Number(o.label)).toBeLessThanOrEqual(max);
        expect(ex.visual).toBeUndefined();
      }
    }
  });

  it('Stufe 1 stays up to 20 at every AB level: no ones rule, no sums', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of sample(1, ab)) {
        for (const n of `${ex.prompt} ${ex.expression ?? ''}`.match(/\d+/g) ?? []) expect(Number(n), ex.key).toBeLessThanOrEqual(20);
        expect(ex.prompt, ex.key).not.toContain('+');
      }
    }
  });

  it('Stufe 1, AB III: the pairs in numbers, or a claim about the pairs, without a picture', () => {
    const items = sample(1, 3);
    expect(kindsOf(items)).toEqual(['paare-stimmt', 'paare-zaehlen']);
    for (const ex of items) {
      const [, , kind, x, claim] = ex.key.split(':');
      const n = Number(x);
      expect(ex.visual).toBeUndefined();
      if (kind === 'paare-zaehlen') {
        if (ex.answer.kind !== 'multi') throw new Error('multi');
        expect(ex.answer.fields.map((f) => f.value)).toEqual([Math.floor(n / 2), n % 2]);
      } else {
        const claimedEven = claim === 'alle';
        expect(right(ex).startsWith('Ja')).toBe(claimedEven === (n % 2 === 0));
      }
    }
  });

  it('Stufe 2, AB I: numbers above 20 by their ones, without dots', () => {
    for (const ex of sample(2, 1)) {
      const n = Number(ex.key.split(':')[3]);
      expect(kindOf(ex)).toBe('einer');
      expect(n).toBeGreaterThanOrEqual(21);
      expect(n).toBeLessThanOrEqual(100);
      expect(right(ex)).toBe(word(n));
      expect(ex.visual).toBeUndefined();
    }
  });

  it('Stufe 2, AB III: which ones fit, or a claim about the next number', () => {
    const items = sample(2, 3);
    expect(kindsOf(items)).toEqual(['einer-luecke', 'nach']);
    for (const ex of items) {
      const [, , kind, x, w] = ex.key.split(':');
      if (kind === 'einer-luecke') {
        expect(ex.expression).toBe(`${x}□`);
        expect(word(Number(right(ex)))).toBe(w);
        expect(choice(ex).options.filter((o) => word(Number(o.label)) === w).length).toBe(1);
      } else {
        expect(right(ex).startsWith('Ja')).toBe(word(Number(x) + 1) === w);
      }
    }
  });

  const odd = (n: number) => expect(n % 2).toBe(1);

  it('Stufe 3, AB I and II: the sum of two odd numbers up to 20 is even, and the verdict follows the claim', () => {
    for (const [ab, kind] of [[1, 'summe'], [2, 'summe-ohne']] as [Ab, string][]) {
      for (const ex of sample(3, ab)) {
        const [, , k, x, y, claim] = ex.key.split(':');
        const a = Number(x);
        const b = Number(y);
        expect(k).toBe(kind);
        odd(a);
        odd(b);
        expect(a + b).toBeLessThanOrEqual(20);
        expect(right(ex).startsWith('Ja')).toBe(claim === 'gerade');
        expect(ex.visual === undefined).toBe(ab === 2);
      }
    }
  });

  it('Stufe 3, AB III: a result to check, or the rule without the second number', () => {
    const items = sample(3, 3);
    expect(kindsOf(items)).toEqual(['pruefen', 'regel']);
    for (const ex of items) {
      const [, , kind, x, y, z] = ex.key.split(':');
      if (kind === 'pruefen') {
        const a = Number(x);
        const b = Number(y);
        const shown = Number(z);
        odd(a);
        odd(b);
        expect(a + b).toBeLessThanOrEqual(20);
        expect(ex.expression).toBe(`${a} + ${b} = ${shown}`);
        expect(right(ex).startsWith('Ja')).toBe(shown === a + b);
        // A wrong result is odd: the rule alone shows it.
        if (shown !== a + b) odd(shown);
      } else {
        odd(Number(x));
        expect(right(ex).startsWith('Ja')).toBe(y === 'gerade');
      }
    }
  });

  it('T7: a question comes last, in every task and in the Stufe texts', () => {
    const lastOnly = (text: string) => !text.includes('?') || text.indexOf('?') === text.length - 1;
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) for (const ex of sample(stufe, ab)) expect(lastOnly(ex.prompt), ex.prompt).toBe(true);
    }
    for (const text of Object.values(geradeUngeradeSkill.stufen)) expect(lastOnly(text), text).toBe(true);
    for (const ab of [1, 2] as Ab[]) for (const ex of sample(3, ab)) expect(ex.prompt.endsWith('Stimmt das?'), ex.prompt).toBe(true);
  });
});
