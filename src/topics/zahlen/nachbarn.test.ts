import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { nachbarnSkill } from './nachbarn';
import { cell, dreherSweep, kindOf, kindsOf } from './test-utils';

describeSkill(nachbarnSkill, { minDistinct: 25 });

const sample = (stufe: Stufe, ab: Ab, n = 300) => cell(nachbarnSkill, stufe, ab, n, 9);
const values = (ex: Exercise) => (ex.answer.kind === 'multi' ? ex.answer.fields.map((f) => f.value) : []);
const tens = (n: number) => Math.floor(n / 10);
const param = (ex: Exercise, i = 3) => Number(ex.key.split(':')[i]);

describe('zahlen.nachbarn', () => {
  it('a Zahlendreher in any typed number gets a bug (F3)', () => {
    expect(dreherSweep(nachbarnSkill)).toEqual([]);
  });

  it('Stufe 1, AB I and II: neighbours inside one ten, with the line, then without', () => {
    for (const [ab, kind] of [[1, 'innen'], [2, 'innen-ohne']] as [Ab, string][]) {
      for (const ex of sample(1, ab)) {
        const n = param(ex);
        expect(kindOf(ex)).toBe(kind);
        expect(values(ex)).toEqual([n - 1, n + 1]);
        expect(tens(n - 1)).toBe(tens(n + 1));
        expect(ex.visual === undefined).toBe(ab === 2);
      }
    }
  });

  it('Stufe 1: the line labels only full tens, and no answer is one', () => {
    for (const ex of sample(1, 1)) for (const v of values(ex)) expect(v % 10, ex.key).not.toBe(0);
  });

  it('Stufe 1, AB III: two gaps inside one ten', () => {
    for (const ex of sample(1, 3)) {
      const [, , kind, where, k] = ex.key.split(':');
      const known = Number(k);
      expect(kind).toBe('zwei');
      const all = [...values(ex), known];
      expect(values(ex)).toEqual(where === 'vor' ? [known - 2, known - 1] : [known + 1, known + 2]);
      expect(new Set(all.map(tens)).size, ex.key).toBe(1);
      for (const v of all) expect(v % 10, ex.key).not.toBe(0);
    }
  });

  it('Stufe 2, AB I: across a ten with the 39, 30 bug', () => {
    for (const ex of sample(2, 1)) {
      const n = param(ex);
      expect(kindOf(ex)).toBe('ueber');
      expect(tens(n - 1)).not.toBe(tens(n + 1));
      const bug = ex.bugs?.find((b) => b.id === 'zaehlen-zehner');
      expect(bug?.match).toEqual(n % 10 === 9 ? { danach: n - 9 } : { davor: n + 9 });
      expect(values(ex), ex.key).toEqual(ex.key.endsWith('beide') ? [n - 1, n + 1] : [n % 10 === 9 ? n + 1 : n - 1]);
    }
  });

  it('Stufe 2, AB II: the Nachbarzehner', () => {
    for (const ex of sample(2, 2)) {
      const n = param(ex);
      const lo = tens(n) * 10;
      expect(kindOf(ex)).toBe('zehner');
      expect(values(ex)).toEqual([lo, lo + 10]);
    }
  });

  it('Stufe 2, AB III: two gaps across a ten; or the number from its Nachbarzehner', () => {
    const items = sample(2, 3);
    expect(kindsOf(items)).toEqual(['zehner-wahl', 'zwei-ueber']);
    for (const ex of items) {
      if (kindOf(ex) === 'zwei-ueber') {
        const [, , , where, k] = ex.key.split(':');
        const known = Number(k);
        expect(values(ex)).toEqual(where === 'vor' ? [known - 2, known - 1] : [known + 1, known + 2]);
        expect(new Set([...values(ex), known].map(tens)).size, ex.key).toBe(2);
      } else {
        const n = param(ex);
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        const lo = tens(n) * 10;
        const options = ex.answer.options.map((o) => Number(o.label));
        expect(options[ex.answer.correct]).toBe(n);
        expect(options.filter((w) => w > lo && w < lo + 10)).toEqual([n]);
        expect(ex.prompt, ex.key).not.toContain(String(n));
      }
    }
  });

  /** The numbers in a riddle, and the hidden number. */
  const riddle = (ex: Exercise) => ({ form: ex.key.split(':')[3], n: values(ex)[0], numbers: [...(ex.context ?? '').matchAll(/\d+/g)].map((m) => Number(m[0])) });

  it('Stufe 3, AB I: both neighbours are named, at a change of the ten', () => {
    for (const ex of sample(3, 1)) {
      const { form, n, numbers } = riddle(ex);
      expect(form).toBe('0');
      expect(numbers).toEqual([n - 1, n + 1]);
      expect(tens(n - 1), ex.key).not.toBe(tens(n + 1));
    }
  });

  it('Stufe 3, AB II: the Nachbarzehner and one neighbour', () => {
    const forms = new Set<string>();
    for (const ex of sample(3, 2)) {
      const { form, n, numbers } = riddle(ex);
      forms.add(form);
      const [lo, hi, clue] = numbers;
      expect(lo).toBeLessThan(n);
      expect(hi).toBeGreaterThan(n);
      expect(hi - lo).toBe(10);
      expect(clue).toBe(form === '1' ? n + 1 : n - 1);
      expect(ex.context).toContain(form === '1' ? 'Nach mir' : 'Vor mir');
    }
    expect([...forms].sort()).toEqual(['1', '2']);
  });

  it('Stufe 3, AB III: two clues on one side, or a full ten beside the number: exactly this number fits', () => {
    const forms = new Set<string>();
    for (const ex of sample(3, 3)) {
      const { form, n, numbers } = riddle(ex);
      forms.add(form);
      const after = ex.context!.startsWith('Nach mir');
      if (form === '3') {
        expect(numbers).toEqual(after ? [n + 1, n + 2] : [n - 1, n - 2]);
      } else {
        expect(form).toBe('4');
        const [ten] = numbers;
        expect(ten % 10).toBe(0);
        expect(after ? (n + 1) % 10 : (n - 1) % 10).toBe(0);
        expect(after ? tens(n) * 10 : tens(n) * 10 + 10).toBe(ten);
      }
    }
    expect([...forms].sort()).toEqual(['3', '4']);
  });

  it('no riddle before Stufe 3', () => {
    for (const stufe of [1, 2] as Stufe[]) for (const ab of [1, 2, 3] as Ab[]) for (const ex of sample(stufe, ab)) expect(ex.context, ex.key).toBeUndefined();
  });
});
