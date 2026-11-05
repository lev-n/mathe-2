import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { hundertertafelSkill } from './hundertertafel';
import { cell, dreherSweep, kindOf, kindsOf } from './test-utils';

describeSkill(hundertertafelSkill, { minDistinct: 30 });

const sample = (stufe: Stufe, ab: Ab, n = 300) => cell(hundertertafelSkill, stufe, ab, n, 4);
const chart = (ex: Exercise) => {
  if (ex.visual?.type !== 'hundredChart') throw new Error('hundredChart');
  return ex.visual;
};
const values = (ex: Exercise) => (ex.answer.kind === 'multi' ? ex.answer.fields.map((f) => f.value) : []);
const sameRow = (a: number, b: number) => Math.floor((a - 1) / 10) === Math.floor((b - 1) / 10);
const param = (ex: Exercise, i = 3) => Number(ex.key.split(':')[i]);

describe('zahlen.hundertertafel', () => {
  it('a Zahlendreher in any typed number gets a bug (F3)', () => {
    expect(dreherSweep(hundertertafelSkill)).toEqual([]);
  });

  it('is marked as an Extra', () => {
    expect(hundertertafelSkill.optional).toBe('extra');
  });

  it('every masked cell is an answer, and the answers are the masked numbers', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of sample(stufe, ab)) {
          const v = chart(ex);
          if (ex.key.includes(':fehler:')) continue;
          const masked = v.masked ?? [];
          if (ex.answer.kind === 'number') expect(masked).toEqual([ex.answer.value]);
          else expect(values(ex)).toEqual(masked);
        }
      }
    }
  });

  it('no answer is a 10: the hints name it', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of sample(stufe, ab)) {
          const answers = ex.answer.kind === 'number' ? [ex.answer.value] : values(ex);
          expect(answers, ex.key).not.toContain(10);
        }
      }
    }
  });

  it('Stufe 1 stays in the row: no row up or down, no piece', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of sample(1, ab)) {
        expect(chart(ex).piece, ex.key).toBeUndefined();
        const answers = ex.answer.kind === 'number' ? [ex.answer.value as number] : values(ex);
        if (kindOf(ex) !== 'rand' && kindOf(ex) !== 'finden') for (const a of answers) expect(sameRow(a, answers[0]), ex.key).toBe(true);
        expect(ex.prompt, ex.key).not.toMatch(/Zeile|Spalte/);
      }
    }
  });

  it('Stufe 1, AB I: finds a cell; a hint says "rechts neben dem Feld" only if the number is in its row', () => {
    const edges = new Set<number>();
    for (const ex of cell(hundertertafelSkill, 1, 1, 3000, 4)) {
      expect(kindOf(ex)).toBe('finden');
      const n = param(ex);
      const bug = ex.bugs?.find((b) => b.match === n + 1);
      expect(bug, ex.key).toBeDefined();
      expect(bug?.hint.includes('rechts neben dem Feld'), ex.key).toBe(sameRow(n, n + 1));
      if (!sameRow(n, n + 1)) edges.add(n);
    }
    expect([...edges].sort((a, b) => a - b)).toEqual([20, 30, 40, 50, 60, 70, 80, 90]);
  });

  it('Stufe 1, AB II: left and right stay in the row of the number', () => {
    for (const ex of sample(1, 2)) {
      const n = param(ex);
      expect(kindOf(ex)).toBe('links-rechts');
      expect(values(ex)).toEqual([n - 1, n + 1]);
      expect(sameRow(n - 1, n)).toBe(true);
      expect(sameRow(n, n + 1)).toBe(true);
    }
  });

  it('Stufe 1, AB II: the feedback on left and right is true at every number, also where the next ten starts', () => {
    const ends = new Set<number>();
    for (const ex of cell(hundertertafelSkill, 1, 2, 3000, 4)) {
      const n = param(ex);
      if (n % 10 === 9) ends.add(n);
      const res = checkAnswer(ex.answer, { kind: 'multi', values: { A: String(n - 10), B: String(n + 10) } }, ex.bugs);
      expect(res.bugId, ex.key).toBe('tafel-spalte');
      expect(res.bugHint, ex.key).not.toMatch(/\bnur\b/);
      expect(res.bugHint, ex.key).toBe('Links ist es 1 weniger. Rechts ist es 1 mehr.');
    }
    expect([...ends].sort((a, b) => a - b)).toEqual([19, 29, 39, 49, 59, 69, 79, 89, 99]);
  });

  it('Stufe 1, AB III: three gaps in a row, or the empty cell at the left edge', () => {
    const items = sample(1, 3);
    expect(kindsOf(items)).toEqual(['rand', 'reihe']);
    for (const ex of items) {
      const n = param(ex);
      if (kindOf(ex) === 'reihe') {
        expect(values(ex)).toEqual([n - 1, n, n + 1]);
        expect(sameRow(n - 1, n + 1), ex.key).toBe(true);
      } else {
        expect(n % 10).toBe(1);
        expect(ex.answer).toMatchObject({ kind: 'number', value: n });
      }
    }
  });

  it('Stufe 2, AB I: a row is ±10 with the +1 bug', () => {
    for (const ex of sample(2, 1)) {
      const [, , kind, a, b] = ex.key.split(':');
      const n = Number(b);
      expect(kind).toBe('zeile');
      expect(ex.answer).toMatchObject({ value: a === 'unten' ? n + 10 : n - 10 });
      expect(ex.bugs?.find((x) => x.id === 'tafel-zeile')?.match).toBe(a === 'unten' ? n + 1 : n - 1);
    }
  });

  it('Stufe 2, AB II: gaps fit the chart; two rows are ±20', () => {
    const items = sample(2, 2);
    expect(kindsOf(items)).toEqual(['luecken', 'zwei-zeilen']);
    for (const ex of items) {
      const [, , kind, a, b] = ex.key.split(':');
      if (kind === 'zwei-zeilen') {
        expect(ex.answer).toMatchObject({ value: a === 'unten' ? Number(b) + 20 : Number(b) - 20 });
      } else {
        const n = Number(a);
        expect(values(ex)).toEqual([n, n + 1, n + 10]);
        expect(sameRow(n, n + 1)).toBe(true);
      }
    }
  });

  it('Stufe 2, AB III: a way of two moves stays in the row; a column of gaps is ±10', () => {
    const items = sample(2, 3);
    expect(kindsOf(items)).toEqual(['spalte', 'weg']);
    for (const ex of items) {
      const [, , kind, a, b, c] = ex.key.split(':');
      if (kind === 'weg') {
        const n = Number(c);
        const mid = a === 'unten' ? n + 10 : n - 10;
        const value = b === 'rechts' ? mid + 1 : mid - 1;
        expect(ex.answer).toMatchObject({ kind: 'number', value });
        expect(sameRow(mid, value), ex.key).toBe(true);
        expect(ex.prompt, ex.key).not.toContain(String(value));
      } else {
        const n = Number(a);
        expect(values(ex)).toEqual([n - 10, n, n + 10]);
      }
    }
  });

  it('the spoken text of a plus-shaped piece places its top and bottom cell', () => {
    const forms = new Set<string>();
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of sample(3, ab)) {
        const [, , kind, form] = ex.key.split(':');
        const plus = kind === 'fehler' || form === 'plus';
        forms.add(plus ? 'plus' : 'block');
        expect(ex.srText.includes('über und unter der Mitte von Reihe 2'), ex.key).toBe(plus);
      }
    }
    expect([...forms].sort()).toEqual(['block', 'plus']);
  });

  it('Stufe 3, AB I and II: a piece keeps its arrangement, and more of it is missing at AB II', () => {
    for (const [ab, count] of [[1, 2], [2, 3]] as [Ab, number][]) {
      for (const ex of sample(3, ab)) {
        const v = chart(ex);
        const piece = v.piece ?? [];
        expect(kindOf(ex)).toBe('ausschnitt');
        expect(piece.length).toBeGreaterThanOrEqual(5);
        expect(Math.max(...piece)).toBeLessThanOrEqual(100);
        expect(Math.min(...piece)).toBeGreaterThanOrEqual(1);
        expect((v.masked ?? []).length).toBe(count);
        expect(piece.length - count).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('Stufe 3, AB III: the wrong number is outside the piece', () => {
    for (const ex of sample(3, 3)) {
      expect(kindOf(ex)).toBe('fehler');
      const v = chart(ex);
      const [{ cell: right, shows }] = v.replaced ?? [];
      expect(v.piece).toContain(right);
      expect(v.piece).not.toContain(shows);
      expect(values(ex)).toEqual([shows, right]);
    }
  });

  it('the Fehlerdetektiv waits for Stufe 3 (§7.1)', () => {
    for (const stufe of [1, 2] as const) {
      for (const ab of [1, 2, 3] as Ab[]) expect(sample(stufe, ab).filter((ex) => kindOf(ex) === 'fehler')).toEqual([]);
    }
  });
});
