import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { taskSpeech } from '../../ui/practice/readAloud';
import { cell, dreherSweep, kindOf, kindsOf } from './test-utils';
import { zehnerEinerSkill } from './zehner-einer';

describeSkill(zehnerEinerSkill, { minDistinct: 25 });

const sample = (stufe: Stufe, ab: Ab, n = 300) => cell(zehnerEinerSkill, stufe, ab, n, 3);
const value = (ex: Exercise) => (ex.answer.kind === 'number' ? ex.answer.value : null);
const fields = (ex: Exercise) => (ex.answer.kind === 'multi' ? Object.fromEntries(ex.answer.fields.map((f) => [f.id, f.value])) : {});
const parts = (ex: Exercise) => {
  const z = /(\d+) Z/.exec(ex.expression ?? '');
  const e = /(\d+) E/.exec(ex.expression ?? '');
  return { z: Number(z?.[1]), e: Number(e?.[1]) };
};
const param = (ex: Exercise) => Number(ex.key.split(':')[3]);

describe('zahlen.zehner-einer', () => {
  it('a Zahlendreher in any typed number gets a bug (F3)', () => {
    expect(dreherSweep(zehnerEinerSkill)).toEqual([]);
  });

  it('a lone 1 takes the singular: no "1 Zehner sind", no "aus 1 Zehnern"', () => {
    // '3 Zehner und 1 Einer sind 31.' is right: two things are the subject.
    const wrong = /(?<![\d,]|und )1 (?:Z|E|Zehner|Einer) sind\b|\b(?:Hier|viel) sind 1 |(?<![\d,])1 (?:Zehnern|Einern)\b/;
    const texts: string[] = [];
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of sample(stufe, ab, 600)) {
          const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
          texts.push(...steps, ...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ex.praise, ex.prompt);
        }
      }
    }
    expect(texts.filter((t) => wrong.test(t))).toEqual([]);
    for (const right of ['Aus 1 Zehner werden 2 Zehner.', 'Hier ist 1 Zehner.', '1 Z ist 1 Zehner.', '1 E ist 1 Einer.', 'Wie viel ist 1 Zehner?']) {
      expect(texts.some((t) => t.includes(right)), right).toBe(true);
    }
  });

  it('Stufe 1, AB I: sticks or a table with few pieces; AB II with more, or the split into Z and E', () => {
    for (const ex of sample(1, 1)) {
      const n = param(ex);
      expect(['stangen', 'tafel']).toContain(kindOf(ex));
      expect(Math.floor(n / 10)).toBeLessThanOrEqual(5);
      expect(n % 10).toBeLessThanOrEqual(5);
      expect(value(ex)).toBe(n);
      if (ex.visual?.type === 'baseTen') expect(ex.visual.tens * 10 + ex.visual.ones).toBe(n);
    }
    const kinds = new Set<string>();
    for (const ex of sample(1, 2)) {
      const n = param(ex);
      kinds.add(kindOf(ex));
      expect(n).toBeGreaterThanOrEqual(11);
      expect(n).toBeLessThanOrEqual(99);
      if (kindOf(ex) === 'stellen') expect(fields(ex)).toEqual({ z: Math.floor(n / 10), e: n % 10 });
      else {
        expect(Math.floor(n / 10) > 5 || n % 10 > 5, ex.key).toBe(true);
        expect(value(ex)).toBe(n);
      }
    }
    expect([...kinds].sort()).toEqual(['stangen', 'stellen', 'tafel']);
  });

  it('Stufe 1, AB III: from the number to its picture; only the right picture shows the number', () => {
    for (const ex of sample(1, 3)) {
      expect(kindOf(ex)).toBe('bild');
      const n = param(ex);
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const worth = ex.answer.options.map((o) => (o.visual?.type === 'baseTen' ? o.visual.tens * 10 + o.visual.ones : -1));
      expect(worth[ex.answer.correct], ex.key).toBe(n);
      expect(worth.filter((w) => w === n).length, ex.key).toBe(1);
      expect(ex.expression).toBe(String(n));
    }
  });

  it('Stufe 1 stays at reading and naming: no unordered form, no bundling', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of sample(1, ab)) {
        expect(ex.expression ?? '', ex.key).not.toMatch(/ E \d+ Z| Z \d+ E/);
        if (ex.visual?.type === 'baseTen') expect(ex.visual.ones).toBeLessThan(10);
      }
    }
  });

  it('Stufe 2, AB I: 7 E 3 Z has the number 37 and the bug 73', () => {
    for (const ex of sample(2, 1)) {
      expect(kindOf(ex)).toBe('ungeordnet');
      const { z, e } = parts(ex);
      expect(value(ex)).toBe(z * 10 + e);
      expect(ex.expression!.indexOf(' E')).toBeLessThan(ex.expression!.indexOf(' Z'));
      if (z !== e) expect(ex.bugs?.find((b) => b.id === 'z-e-reihenfolge')?.match).toBe(e * 10 + z);
    }
  });

  it('Stufe 2, AB II: numbers like 40 in either order; a number like 7 goes into its 2 places, as 0 Z 9 E = □ only repeats the 9', () => {
    const orders = new Set<boolean>();
    const items = sample(2, 2);
    expect(kindsOf(items)).toEqual(['null', 'null-zehner']);
    for (const ex of items) {
      if (kindOf(ex) === 'null-zehner') {
        if (ex.answer.kind !== 'multi') throw new Error(ex.key);
        const fields = Object.fromEntries(ex.answer.fields.map((f) => [f.id, f.value]));
        expect(fields, ex.key).toEqual({ z: 0, e: Number(ex.expression) });
        continue;
      }
      const { z, e } = parts(ex);
      orders.add(ex.expression!.indexOf(' E') < ex.expression!.indexOf(' Z'));
      expect(e, ex.key).toBe(0);
      expect(z, ex.key).toBeGreaterThanOrEqual(1);
      expect(value(ex)).toBe(z * 10);
    }
    expect(orders.size).toBe(2);
  });

  it('a hint in a gap of a bundling does not name the answer, also not a small one', () => {
    const items = sample(3, 3).filter((ex) => kindOf(ex) === 'buendel-luecke');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const v = value(ex)!;
      for (const hint of ex.hints) expect(new RegExp(`(?<!\\d)${v}(?!\\d)`).test(hint), `${ex.key}: ${hint}`).toBe(false);
    }
  });

  it('Stufe 2, AB III: from the number to its parts, ones first; or the notation that fits', () => {
    const items = sample(2, 3);
    expect(kindsOf(items)).toEqual(['schreibweise', 'umgekehrt']);
    for (const ex of items) {
      const n = param(ex);
      if (kindOf(ex) === 'umgekehrt') {
        expect(fields(ex)).toEqual({ e: n % 10, z: Math.floor(n / 10) });
        if (ex.answer.kind !== 'multi') throw new Error('multi');
        expect(ex.answer.fields[0].id).toBe('e');
      } else {
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        const worth = ex.answer.options.map((o) => Number(/(\d+) Z/.exec(o.label)?.[1]) * 10 + Number(/(\d+) E/.exec(o.label)?.[1]));
        expect(worth[ex.answer.correct], ex.key).toBe(n);
        expect(worth.filter((w) => w === n).length, ex.key).toBe(1);
      }
    }
  });

  it('Stufe 3, AB I: bundling with the picture; AB II without it, or the split', () => {
    for (const ex of sample(3, 1)) {
      expect(kindOf(ex)).toBe('buendeln');
      const { z, e } = parts(ex);
      expect(e).toBeGreaterThanOrEqual(10);
      expect(value(ex)).toBe(z * 10 + e);
      expect(ex.bugs?.find((b) => b.id === 'buendeln')?.match).toBe(z * 100 + e);
      expect(ex.visual).toEqual({ type: 'baseTen', tens: z, ones: e });
    }
    const items = sample(3, 2);
    expect(kindsOf(items)).toEqual(['buendeln-ohne', 'buendeln-stellen', 'zerlegen']);
    for (const ex of items) {
      expect(ex.visual, ex.key).toBeUndefined();
      if (kindOf(ex) === 'zerlegen') {
        const n = param(ex);
        const f = fields(ex);
        expect(f.z + f.e).toBe(n);
        expect(f.z % 10).toBe(0);
      } else {
        const { z, e } = parts(ex);
        if (kindOf(ex) === 'buendeln-ohne') expect(value(ex)).toBe(z * 10 + e);
        else {
          const f = fields(ex);
          expect(f.z * 10 + f.e).toBe(z * 10 + e);
          expect(f.e).toBeLessThan(10);
        }
      }
    }
  });

  it('Stufe 3, AB III: gaps in a bundling and another split, recomputed from the shown equation', () => {
    const items = sample(3, 3);
    expect(kindsOf(items)).toEqual(['anders-zerlegen', 'buendel-luecke']);
    for (const ex of items) {
      const expr = ex.expression!;
      const total = Number(expr.split(' = ')[kindOf(ex) === 'buendel-luecke' ? 1 : 0]);
      if (kindOf(ex) === 'buendel-luecke') {
        const z = /(\d+) Z/.exec(expr)?.[1];
        const e = /(\d+) E/.exec(expr)?.[1];
        expect(z !== undefined || e !== undefined).toBe(true);
        if (z === undefined) expect(value(ex)! * 10 + Number(e)).toBe(total);
        else expect(Number(z) * 10 + value(ex)!).toBe(total);
        // The ones are more than 9 in every form: it is a bundling.
        expect(e === undefined ? value(ex)! : Number(e)).toBeGreaterThanOrEqual(11);
      } else {
        const shown = Number(/\d+(?= \+ □)|(?<=\+ )\d+/.exec(expr)?.[0]);
        expect(shown + value(ex)!).toBe(total);
        // One ten less than the number shows: not the usual split.
        const tens = [shown, value(ex)!].find((x) => x % 10 === 0);
        expect(tens, ex.key).toBe((Math.floor(total / 10) - 1) * 10);
      }
    }
  });

  it('bundled places in swapped fields get the bug', () => {
    let seen = 0;
    for (const ex of sample(3, 2).filter((x) => kindOf(x) === 'buendeln-stellen')) {
      const { z, e } = fields(ex);
      if (z === e) continue;
      seen++;
      const res = checkAnswer(ex.answer, { kind: 'multi', values: { z: String(e), e: String(z) } }, ex.bugs);
      expect(res.bugId, ex.key).toBe('z-e-reihenfolge');
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('splitting is an equation, and the digit in its first gap gets the bug at every ten', () => {
    const tens = new Set<number>();
    for (const ex of sample(3, 2, 900).filter((x) => kindOf(x) === 'zerlegen')) {
      const n = param(ex);
      const t = Math.floor(n / 10);
      const e = n % 10;
      tens.add(t);
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      // A word beside a field is what the child writes there: 'Zehner' takes 3, never 30 (compare the form 'stellen').
      expect(ex.answer.fields.map((f) => [f.before, f.after]), ex.key).toEqual([[`${n} =`, undefined], ['+', undefined]]);
      expect(taskSpeech(ex), ex.key).toContain('gleich Lücke. plus Lücke.');
      const digit = checkAnswer(ex.answer, { kind: 'multi', values: { z: String(t), e: String(e) } }, ex.bugs);
      expect(digit.bugId, ex.key).toBe('zerlegen-ziffern');
      const swapped = checkAnswer(ex.answer, { kind: 'multi', values: { z: String(e), e: String(t * 10) } }, ex.bugs);
      expect(swapped.bugId, ex.key).toBe('zerlegen-tausch');
    }
    expect([...tens].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
