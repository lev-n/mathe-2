import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { anzahlErkennenSkill } from './anzahl-erkennen';
import { cell, dreherSweep, kindOf, kindsOf } from './test-utils';

describeSkill(anzahlErkennenSkill, { minDistinct: { 1: 18, 2: 25, 3: 25 } });

const sample = (stufe: Stufe, ab: Ab, n = 300) => cell(anzahlErkennenSkill, stufe, ab, n, 5);
const value = (ex: Exercise) => (ex.answer.kind === 'number' ? ex.answer.value : null);
const fieldOf = (ex: Exercise) => {
  if (ex.visual?.type !== 'field') throw new Error('field');
  return ex.visual;
};

describe('zahlen.anzahl-erkennen', () => {
  it('a Zahlendreher in any typed number gets a bug (F3)', () => {
    expect(dreherSweep(anzahlErkennenSkill)).toEqual([]);
  });

  it('Stufe 1 stays on the Zwanzigerfeld at every AB level; Stufe 2 and 3 on the Hunderterfeld', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of sample(1, ab)) expect(fieldOf(ex).size, ex.key).toBe(20);
      for (const stufe of [2, 3] as Stufe[]) for (const ex of sample(stufe, ab)) expect(fieldOf(ex).size, ex.key).toBe(100);
    }
  });

  it('Stufe 1, AB I reads at most 20 dots; AB II adds dots with a ring; AB III finds what is missing up to 20', () => {
    for (const ex of sample(1, 1)) {
      expect(kindOf(ex)).toBe('zwanzig');
      expect(fieldOf(ex).filled).toBeLessThanOrEqual(20);
      expect(value(ex)).toBe(fieldOf(ex).filled);
    }
    for (const ex of sample(1, 2)) {
      const f = fieldOf(ex);
      expect(kindOf(ex)).toBe('zwei-teile');
      expect(f.second).toBeGreaterThan(0);
      expect(value(ex)).toBe(f.filled + f.second!);
      expect(value(ex)).toBeLessThanOrEqual(20);
    }
    for (const ex of sample(1, 3)) {
      expect(kindOf(ex)).toBe('bis-zwanzig');
      expect(value(ex)).toBe(20 - fieldOf(ex).filled);
    }
  });

  it('Stufe 2, AB I reads few rows and few dots; AB II many of them, or two kinds of dots; no rotation, split or "bis 100"', () => {
    for (const ex of sample(2, 1)) {
      const n = fieldOf(ex).filled;
      expect(kindOf(ex)).toBe('hundert');
      expect(n).toBeGreaterThanOrEqual(21);
      expect(n).toBeLessThanOrEqual(55);
      expect(n % 10).toBeLessThanOrEqual(5);
      expect(value(ex)).toBe(n);
    }
    const ones = new Set<number>();
    const items = sample(2, 2);
    expect(kindsOf(items)).toEqual(['hundert', 'zwei-teile']);
    for (const ex of items) {
      const f = fieldOf(ex);
      if (kindOf(ex) === 'zwei-teile') {
        expect(value(ex)).toBe(f.filled + f.second!);
        continue;
      }
      const n = f.filled;
      ones.add(n % 10);
      expect(n).toBeGreaterThanOrEqual(21);
      expect(n > 55 || n % 10 > 5, ex.key).toBe(true);
      expect(value(ex)).toBe(n);
    }
    expect(ones.has(9)).toBe(true);
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of sample(2, ab)) {
        expect(fieldOf(ex).rotated, ex.key).toBeUndefined();
        expect(fieldOf(ex).split, ex.key).toBeUndefined();
        expect(ex.prompt, ex.key).not.toContain('bis 100');
      }
    }
  });

  it('Stufe 2, AB III: up to the next full row', () => {
    for (const ex of sample(2, 3)) {
      const f = fieldOf(ex);
      expect(kindOf(ex)).toBe('volle-reihe');
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      expect(ex.answer.fields.map((x) => x.value)).toEqual([10 - (f.filled % 10), Math.ceil(f.filled / 10) * 10]);
    }
  });

  it('Stufe 3: AB I turned, AB II split, AB III missing up to 100, each recomputed from the field', () => {
    for (const ex of sample(3, 1)) {
      expect(kindOf(ex)).toBe('gedreht');
      expect(fieldOf(ex).rotated).toBe(true);
      expect(value(ex)).toBe(fieldOf(ex).filled);
    }
    for (const ex of sample(3, 2)) {
      expect(kindOf(ex)).toBe('linie');
      expect(value(ex)).toBe(fieldOf(ex).filled - fieldOf(ex).split!.afterRow! * 10);
    }
    const until = sample(3, 3);
    expect(kindsOf(until)).toEqual(['bis-hundert', 'bis-hundert-gedreht']);
    for (const ex of until) {
      expect(value(ex)).toBe(100 - fieldOf(ex).filled);
      expect(fieldOf(ex).rotated === true).toBe(kindOf(ex) === 'bis-hundert-gedreht');
    }
  });

  it('a split field asks for the filled dots, and all dots below the line get a hint', () => {
    for (const ex of sample(3, 2)) {
      expect(ex.prompt).toContain('ausgefüllte Punkte');
      const allBelow = (10 - fieldOf(ex).split!.afterRow!) * 10;
      expect(ex.bugs?.some((b) => b.match === allBelow), ex.key).toBe(true);
    }
  });

  it('below 10, the hints name the 5 and do not send the child counting on', () => {
    let seen = 0;
    for (const ex of sample(1, 1).filter((x) => value(x)! < 10)) {
      seen++;
      expect(ex.hints.join(' '), ex.key).not.toMatch(/zähl/i);
      expect(ex.hints[1], ex.key).toContain('5 Punkte');
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('a partly filled row is never called half: "halb" means exactly half (Verdoppeln und Halbieren)', () => {
    const texts = ([1, 2, 3] as Stufe[]).flatMap((stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) => sample(stufe, ab))).map((ex) => [ex.key, JSON.stringify(ex)]);
    for (const [key, text] of texts) expect(text, key).not.toMatch(/halb/i);
    // All three wordings that used to say it were generated.
    for (const form of [/:linie:/, /:bis-hundert:/, /:hundert:\d*0$/]) expect(texts.some(([key]) => form.test(key)), String(form)).toBe(true);
  });

  it('the visual label leaves the total to the child', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of sample(stufe, ab, 60)) if (value(ex) !== null) expect(ex.srText, ex.key).not.toMatch(new RegExp(`(?<!\\d)${value(ex)}(?!\\d)`));
      }
    }
  });
});
