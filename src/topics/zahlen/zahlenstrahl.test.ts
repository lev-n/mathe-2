import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { cell, dreherSweep, kindOf, kindsOf } from './test-utils';
import { zahlenstrahlSkill } from './zahlenstrahl';

describeSkill(zahlenstrahlSkill, { minDistinct: { 1: 15, 2: 20, 3: 25 } });

const sample = (stufe: Stufe, ab: Ab, n = 300) => cell(zahlenstrahlSkill, stufe, ab, n, 1);
const axisOf = (ex: Exercise) => (ex.answer.kind === 'numberline' ? ex.answer : ex.visual);
const line = (ex: Exercise) => {
  if (ex.visual?.type !== 'numberLine') throw new Error('line');
  return ex.visual;
};
const arrow = (ex: Exercise) => line(ex).marks![0].value;
const all = (): Exercise[] => ([1, 2, 3] as Stufe[]).flatMap((stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) => sample(stufe, ab)));

describe('zahlen.zahlenstrahl', () => {
  it('a Zahlendreher in any typed number gets a bug (F3)', () => {
    expect(dreherSweep(zahlenstrahlSkill)).toEqual([]);
  });

  it('Stufe 1 has ticks every 10 on 0–100 at every AB level, Stufe 2 ticks every 5 and labels every 10', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of sample(1, ab)) expect(axisOf(ex), ex.key).toMatchObject({ min: 0, max: 100, minorStep: 10 });
      for (const ex of sample(2, ab)) expect(axisOf(ex), ex.key).toMatchObject({ min: 0, max: 100, minorStep: 5, majorStep: 10, labelMajor: true });
    }
  });

  it('a read number has no label on its line: reading it is the task', () => {
    for (const ex of all()) {
      if (ex.answer.kind !== 'number' || ex.visual?.type !== 'numberLine') continue;
      const v = line(ex);
      const labelled = [...(v.labels ?? []), ...(v.labelMajor ? Array.from({ length: Math.round((v.max - v.min) / v.majorStep) + 1 }, (_, i) => v.min + i * v.majorStep) : [])];
      expect(labelled, ex.key).not.toContain(ex.answer.value);
    }
  });

  it('Stufe 1, AB I: reads an arrow, with 50 labelled; or the jumps up to it', () => {
    const items = sample(1, 1);
    expect(kindsOf(items)).toEqual(['lesen', 'spruenge']);
    for (const ex of items) {
      expect(line(ex).labels).toEqual([0, 50, 100]);
      expect(arrow(ex) % 10).toBe(0);
      expect(ex.answer).toMatchObject({ kind: 'number', value: kindOf(ex) === 'lesen' ? arrow(ex) : arrow(ex) / 10 });
    }
  });

  it('Stufe 1, AB II: fewer labels, or two arrows', () => {
    const items = sample(1, 2);
    expect(kindsOf(items)).toEqual(['lesen', 'zwei-pfeile']);
    for (const ex of items) {
      expect(line(ex).labels).toEqual([0, 100]);
      if (kindOf(ex) === 'lesen') expect(ex.answer).toMatchObject({ kind: 'number', value: arrow(ex) });
      else {
        if (ex.answer.kind !== 'multi') throw new Error('multi');
        expect(ex.answer.fields.map((f) => f.value)).toEqual(line(ex).marks!.map((m) => m.value));
      }
    }
  });

  it('Stufe 1, AB III: an arrow moved by some ticks, or the arrow placed on a tick', () => {
    const items = sample(1, 3);
    expect(kindsOf(items)).toEqual(['setzen', 'weiter']);
    for (const ex of items) {
      if (kindOf(ex) === 'setzen') {
        expect(ex.answer).toMatchObject({ kind: 'numberline', step: 10 });
        if (ex.answer.kind === 'numberline') expect(ex.prompt).toContain(String(ex.answer.value));
      } else {
        const [, , , from, side, count] = ex.key.split(':');
        const value = Number(from) + (side === 'rechts' ? 1 : -1) * Number(count) * 10;
        expect(ex.answer).toMatchObject({ kind: 'number', value });
        expect(arrow(ex)).toBe(Number(from));
        expect(ex.prompt, ex.key).not.toContain(String(value));
      }
    }
  });

  it('Stufe 2, AB I: places a named number on a tick', () => {
    for (const ex of sample(2, 1)) {
      expect(kindOf(ex)).toBe('setzen');
      if (ex.answer.kind !== 'numberline') throw new Error('numberline');
      expect(ex.answer.step).toBe(5);
      expect(ex.answer.tolerance).toBe(0);
      expect(ex.prompt).toContain(String(ex.answer.value));
    }
  });

  it('Stufe 2, AB II: reads a tick between the tens, or two arrows', () => {
    const items = sample(2, 2);
    expect(kindsOf(items)).toEqual(['lesen', 'zwei-pfeile']);
    for (const ex of items) {
      if (ex.answer.kind === 'number') {
        expect(ex.answer.value).toBe(arrow(ex));
        expect(arrow(ex) % 10).toBe(5);
      } else {
        if (ex.answer.kind !== 'multi') throw new Error('multi');
        expect(ex.answer.fields.map((f) => f.value)).toEqual(line(ex).marks!.map((m) => m.value));
        for (const f of ex.answer.fields) expect(f.value % 10).toBe(5);
      }
    }
  });

  it('Stufe 2, AB III: the place is described and the prompt does not name the number', () => {
    const items = sample(2, 3);
    expect(kindsOf(items)).toEqual(['mitte', 'striche']);
    for (const ex of items) {
      if (ex.answer.kind !== 'numberline') throw new Error('numberline');
      const [, , kind, a, side, count] = ex.key.split(':');
      const value = kind === 'mitte' ? Number(a) + 5 : Number(a) + (side === 'rechts' ? 1 : -1) * Number(count) * 5;
      expect(ex.answer.value).toBe(value);
      expect(new RegExp(`(?<!\\d)${value}(?!\\d)`).test(ex.prompt), ex.key).toBe(false);
    }
  });

  it('Stufe 3, AB I: reads a section of ten', () => {
    for (const ex of sample(3, 1)) {
      const [, , kind, a] = ex.key.split(':');
      const t = Number(a);
      expect(kind).toBe('abschnitt-lesen');
      expect(line(ex)).toMatchObject({ min: t, max: t + 10, minorStep: 1 });
      expect(ex.answer).toMatchObject({ kind: 'number', value: arrow(ex) });
      expect(arrow(ex)).toBeGreaterThan(t);
      expect(arrow(ex)).toBeLessThan(t + 10);
    }
  });

  it('Stufe 3, AB II: places on a section, or estimates with the middle labelled', () => {
    const items = sample(3, 2);
    expect(kindsOf(items)).toEqual(['abschnitt-setzen', 'schaetzen-mitte']);
    for (const ex of items) {
      if (ex.answer.kind !== 'numberline') throw new Error('numberline');
      if (kindOf(ex) === 'schaetzen-mitte') expect(ex.answer).toMatchObject({ labels: [50], minorStep: 100, tolerance: 7 });
      else {
        const t = Number(ex.key.split(':')[3]);
        expect(ex.answer).toMatchObject({ min: t, max: t + 10, tolerance: 0 });
      }
    }
  });

  it('Stufe 3, AB III: estimates on the empty line, or reads back from the right end', () => {
    const items = sample(3, 3);
    expect(kindsOf(items)).toEqual(['abschnitt-rechts', 'schaetzen']);
    for (const ex of items) {
      if (kindOf(ex) === 'schaetzen') {
        expect(ex.answer).toMatchObject({ kind: 'numberline', majorStep: 100, minorStep: 100, tolerance: 7 });
      } else {
        const t = Number(ex.key.split(':')[3]);
        expect(line(ex).labels).toEqual([t + 10]);
        expect(ex.answer).toMatchObject({ kind: 'number', value: arrow(ex) });
        expect(ex.srText, ex.key).not.toContain(String(arrow(ex)));
      }
    }
  });

  it('the empty line accepts an estimate within its tolerance, and not beyond', () => {
    for (const ex of [...sample(3, 2), ...sample(3, 3)]) {
      if (ex.answer.kind !== 'numberline' || ex.answer.tolerance === 0) continue;
      const near = Math.min(100, ex.answer.value + ex.answer.tolerance);
      expect(checkAnswer(ex.answer, { kind: 'numberline', value: near }).correct).toBe(true);
      const far = ex.answer.value + ex.answer.tolerance + 1;
      if (far <= 100) expect(checkAnswer(ex.answer, { kind: 'numberline', value: far }).correct).toBe(false);
    }
  });
});
