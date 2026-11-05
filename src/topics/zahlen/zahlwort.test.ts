import { describe, expect, it } from 'vitest';
import { numberWord } from '../../core/format';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { taskSpeech } from '../../ui/practice/readAloud';
import { cell, dreherSweep, kindOf, kindsOf } from './test-utils';
import { zahlwortSkill } from './zahlwort';

describeSkill(zahlwortSkill, { minDistinct: 30 });

const sample = (stufe: Stufe, ab: Ab, n = 300) => cell(zahlwortSkill, stufe, ab, n, 7);
const choice = (ex: Exercise) => {
  if (ex.answer.kind !== 'choice') throw new Error('choice');
  return ex.answer;
};
const param = (ex: Exercise) => Number(ex.key.split(':')[3]);
const swap = (n: number) => (n % 10) * 10 + Math.floor(n / 10);

describe('zahlen.zahlwort', () => {
  it('a Zahlendreher in any typed number gets a bug (F3)', () => {
    expect(dreherSweep(zahlwortSkill)).toEqual([]);
  });

  it('Stufe 1 stays inside 21–59, and no option looks like the number, at every AB level', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of sample(1, ab)) {
        const n = param(ex);
        expect(n).toBeGreaterThanOrEqual(21);
        expect(n).toBeLessThanOrEqual(59);
        expect(ex.prompt).toContain(numberWord(n));
        if (ex.answer.kind === 'number' && ex.answer.value !== null) expect(ex.answer.value).toBeLessThanOrEqual(59);
      }
    }
  });

  it('Stufe 1, AB I: chooses without look-alikes', () => {
    for (const ex of sample(1, 1)) {
      const n = param(ex);
      const a = choice(ex);
      expect(kindOf(ex)).toBe('wort');
      expect(Number(a.options[a.correct].label)).toBe(n);
      expect(a.options.length).toBe(4);
      for (const o of a.options) {
        const w = Number(o.label);
        if (w === n) continue;
        expect(w).not.toBe(swap(n));
        expect(Math.floor(w / 10)).not.toBe(Math.floor(n / 10));
        expect(w % 10).not.toBe(n % 10);
      }
    }
  });

  it('Stufe 1, AB II: typed, with its bugs', () => {
    for (const ex of sample(1, 2)) {
      const n = param(ex);
      expect(kindOf(ex)).toBe('tippen');
      expect(ex.answer).toMatchObject({ kind: 'number', value: n });
      expect(ex.bugs?.find((b) => b.id === 'zahlendreher')?.match).toBe(swap(n));
    }
  });

  it('Stufe 1, AB III: the places behind the word, or the number after it', () => {
    const items = sample(1, 3);
    expect(kindsOf(items)).toEqual(['danach', 'stellen']);
    for (const ex of items) {
      const n = param(ex);
      if (kindOf(ex) === 'stellen') {
        if (ex.answer.kind !== 'multi') throw new Error('multi');
        expect(ex.answer.fields.map((f) => f.value)).toEqual([Math.floor(n / 10), n % 10]);
      } else {
        expect(ex.answer).toMatchObject({ kind: 'number', value: n + 1 });
      }
    }
  });

  it('Stufe 2, AB I: swapped digits among the options, up to 99', () => {
    const tens = new Set<number>();
    for (const ex of sample(2, 1)) {
      const n = param(ex);
      const a = choice(ex);
      tens.add(Math.floor(n / 10));
      expect(kindOf(ex)).toBe('dreher-wahl');
      expect(ex.prompt).toContain(numberWord(n));
      expect(Number(a.options[a.correct].label)).toBe(n);
      expect(a.options.map((o) => Number(o.label))).toContain(swap(n));
    }
    expect(tens.has(9)).toBe(true);
  });

  it('Stufe 2, AB II: typed: the words from 60 on, and the teens', () => {
    const teens = new Set<number>();
    for (const ex of sample(2, 2)) {
      const n = param(ex);
      if (n < 20) teens.add(n);
      expect(kindOf(ex)).toBe('tippen');
      expect(n >= 60 || (n >= 13 && n <= 19), ex.key).toBe(true);
      expect(ex.answer).toMatchObject({ kind: 'number', value: n });
      const z = Math.floor(n / 10);
      const e = n % 10;
      expect(ex.bugs?.map((b) => b.match)).toEqual(expect.arrayContaining([swap(n), z * 100 + e, e * 100 + z * 10]));
    }
    expect(teens.size).toBeGreaterThan(3);
  });

  it('Stufe 2, AB III: the word turned, or the larger of two words', () => {
    const items = sample(2, 3);
    expect(kindsOf(items)).toEqual(['groesser', 'tauschen']);
    for (const ex of items) {
      if (kindOf(ex) === 'tauschen') {
        const n = param(ex);
        expect(ex.prompt).toContain(numberWord(n));
        expect(ex.answer).toMatchObject({ kind: 'number', value: swap(n) });
        // The answer is not in the prompt: only the word of the other number is.
        expect(ex.prompt).not.toMatch(/\d/);
      } else {
        const small = param(ex);
        const a = choice(ex);
        expect(a.options.map((o) => o.label).sort()).toEqual([numberWord(small), numberWord(swap(small))].sort());
        expect(a.options[a.correct].label).toBe(numberWord(Math.max(small, swap(small))));
        // Digits among the options would show the larger number at a glance.
        expect(a.options.join('')).not.toMatch(/\d/);
      }
    }
  });

  it('Stufe 1 and 2 hold no number-to-word, Pasch or Dreher-spotting task', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of sample(stufe, ab)) expect(['zahl-zu-wort', 'pasch', 'dreher-finden'], ex.key).not.toContain(kindOf(ex));
      }
    }
  });

  it('Stufe 3, AB I: number to word; read aloud it does not say the number to find (T16)', () => {
    for (const ex of sample(3, 1)) {
      expect(kindOf(ex)).toBe('zahl-zu-wort');
      expect(ex.expression, ex.key).toBeUndefined();
      // The table carries the digits, also for a screen reader (its aria-label names Zehner and Einer).
      expect(ex.visual, ex.key).toMatchObject({ type: 'placeValue', rows: [{ values: [Math.floor(param(ex) / 10), param(ex) % 10] }] });
      expect(taskSpeech(ex).split(numberWord(param(ex))).length - 1, taskSpeech(ex)).toBe(1);
      // A numeral here would be voiced as the word to find.
      expect(ex.srText, ex.key).not.toMatch(/\d/);
      const a = choice(ex);
      expect(a.options.length).toBe(4);
      expect(a.options[a.correct].label).toBe(numberWord(param(ex)));
      expect(a.options.map((o) => o.label)).toContain(numberWord(swap(param(ex))));
    }
  });

  it('Stufe 3, AB II: number to word among more options, or the Paschzahl among words', () => {
    const items = sample(3, 2);
    expect(kindsOf(items)).toEqual(['pasch', 'zahl-zu-wort']);
    for (const ex of items) {
      const a = choice(ex);
      const label = a.options[a.correct].label;
      if (kindOf(ex) === 'zahl-zu-wort') {
        expect(a.options.length).toBeGreaterThan(4);
        expect(label).toBe(numberWord(param(ex)));
      } else {
        const p = param(ex);
        expect(p % 11).toBe(0);
        expect(label).toBe(numberWord(p));
        expect(a.options.join('')).not.toMatch(/\d/);
      }
    }
  });

  it('Stufe 3, AB III: exactly one line has its digits turned', () => {
    for (const ex of sample(3, 3)) {
      expect(kindOf(ex)).toBe('dreher-finden');
      const a = choice(ex);
      const lines = a.options.map((o) => o.label.split(' = '));
      for (const [i, [word, digits]] of lines.entries()) {
        expect(word === numberWord(Number(digits))).toBe(i !== a.correct);
        if (i === a.correct) expect(word).toBe(numberWord(swap(Number(digits))));
      }
    }
  });

  it('a tap is not praised as writing or speaking', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of sample(stufe, ab, 60)) {
          if (ex.answer.kind === 'choice') expect(ex.praise, ex.key).not.toMatch(/geschrieben|gesprochen|getippt/);
        }
      }
    }
  });
});
