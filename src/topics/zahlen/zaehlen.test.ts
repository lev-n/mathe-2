import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise } from '../../core/types';
import { cell, dreherSweep, kindsOf } from './test-utils';
import { zaehlenSkill } from './zaehlen';

describeSkill(zaehlenSkill, { minDistinct: 40 });

const fields = (ex: Exercise) => (ex.answer.kind === 'multi' ? ex.answer.fields : []);
const values = (ex: Exercise) => fields(ex).map((f) => f.value);
/** The numbers of the shown row: a gap as null. */
const row = (ex: Exercise) => (ex.expression ?? '').split(', ').map((p) => (p === '□' ? null : Number(p)));
const crossesTen = (nums: number[]) => nums.some((v, i) => i > 0 && Math.floor(v / 10) !== Math.floor(nums[i - 1] / 10));

describe('zahlen.zaehlen', () => {
  it('a Zahlendreher in any typed number gets a bug (F3)', () => {
    expect(dreherSweep(zaehlenSkill)).toEqual([]);
  });

  it('Stufe 1, AB I: forwards by one with the line, starts at most at 89 and crosses a ten', () => {
    for (const ex of cell(zaehlenSkill, 1, 1)) {
      const [, , kind, dir, last] = ex.key.split(':');
      expect([kind, dir]).toEqual(['eins', 'vor']);
      expect(values(ex)).toEqual([1, 2, 3].map((k) => Number(last) + k));
      expect(Number(last) - 1).toBeLessThanOrEqual(89);
      expect(crossesTen([Number(last), ...values(ex)])).toBe(true);
      expect(ex.visual?.type).toBe('numberLine');
    }
  });

  it('Stufe 1: the line labels no number the child has to write', () => {
    for (const ex of cell(zaehlenSkill, 1, 1)) {
      if (ex.visual?.type !== 'numberLine') throw new Error('line');
      expect(ex.visual.labelMajor).toBe(false);
      for (const v of values(ex)) expect(ex.visual.labels, ex.key).not.toContain(v);
    }
  });

  it('Stufe 1, AB II: backwards by one without the line', () => {
    for (const ex of cell(zaehlenSkill, 1, 2)) {
      const [, , kind, dir, last] = ex.key.split(':');
      expect([kind, dir]).toEqual(['eins', 'zurueck']);
      expect(values(ex)).toEqual([1, 2, 3].map((k) => Number(last) - k));
      expect(Number(last) + 1).toBeLessThanOrEqual(89);
      expect(crossesTen([Number(last), ...values(ex)])).toBe(true);
      expect(ex.visual).toBeUndefined();
    }
  });

  it('Stufe 1, AB III: gaps in a row by one, across a ten, the first number at most 89', () => {
    for (const ex of cell(zaehlenSkill, 1, 3)) {
      expect(ex.key.split(':')[2]).toBe('eins-luecke');
      const shown = row(ex);
      expect(shown.length).toBe(5);
      const known = shown.flatMap((n, i) => (n === null ? [] : [{ n, i }]));
      expect(known.length).toBe(2);
      const d = (known[1].n - known[0].n) / (known[1].i - known[0].i);
      expect(Math.abs(d)).toBe(1);
      const full = shown.map((_, i) => known[0].n + d * (i - known[0].i));
      expect(values(ex)).toEqual(full.filter((_, i) => shown[i] === null));
      expect(crossesTen(full)).toBe(true);
      expect(full[0]).toBeLessThanOrEqual(89);
    }
  });

  it('Stufe 2, AB I: forwards in steps of 2, 5 or 10 from a multiple; AB II backwards', () => {
    for (const [ab, d] of [[1, 1], [2, -1]] as [Ab, number][]) {
      for (const ex of cell(zaehlenSkill, 2, ab)) {
        const [, , kind, s, dir, first] = ex.key.split(':');
        const step = Number(s);
        expect(kind).toBe('schritt');
        expect(dir).toBe(d === 1 ? 'vor' : 'zurueck');
        expect([2, 5, 10]).toContain(step);
        expect(Number(first) % step).toBe(0);
        expect(values(ex)).toEqual([3, 4].map((k) => Number(first) + d * k * step));
        for (const v of values(ex)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('Stufe 2, AB III: gaps in a row of multiples, and the prompt names the step', () => {
    for (const ex of cell(zaehlenSkill, 2, 3)) {
      const [, , kind, s, dir, first] = ex.key.split(':');
      const step = Number(s);
      const d = dir === 'vor' ? 1 : -1;
      expect(kind).toBe('schritt-luecke');
      expect(ex.prompt).toContain(`${step}er-Schritten`);
      expect(Number(first) % step).toBe(0);
      const full = [0, 1, 2, 3, 4].map((i) => Number(first) + d * i * step);
      const shown = row(ex);
      expect(values(ex)).toEqual(full.filter((_, i) => shown[i] === null));
      for (const v of full) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('Stufe 3, AB I and II: any start that is no multiple, forwards then backwards', () => {
    for (const [ab, d] of [[1, 1], [2, -1]] as [Ab, number][]) {
      for (const ex of cell(zaehlenSkill, 3, ab)) {
        const [, , kind, s, dir, first] = ex.key.split(':');
        const step = Number(s);
        expect(kind).toBe('beliebig');
        expect(dir).toBe(d === 1 ? 'vor' : 'zurueck');
        expect(Number(first) % step).not.toBe(0);
        expect(values(ex)).toEqual([3, 4].map((k) => Number(first) + d * k * step));
      }
    }
  });

  it('Stufe 3, AB III: the step is found, from any start, and no text names it first', () => {
    const items = cell(zaehlenSkill, 3, 3);
    expect(kindsOf(items)).toEqual(['finden', 'finden-luecke']);
    for (const ex of items) {
      const [, , kind, s, dir, first] = ex.key.split(':');
      const step = Number(s);
      const d = dir === 'vor' ? 1 : -1;
      expect(Number(first) % step).not.toBe(0);
      expect(ex.prompt).not.toMatch(/\d/);
      if (kind === 'finden') expect(values(ex)).toEqual([step, Number(first) + d * 4 * step]);
      else expect(values(ex)).toEqual([step, Number(first) + d * step, Number(first) + d * 4 * step]);
    }
  });

  it('no separable verb is split in two: never "weiter gesprungen" or "zurück gesprungen"', () => {
    const splitVerb = /\b(?:weiter|zurück|vor)\s+ge\p{L}+/iu;
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of cell(zaehlenSkill, stufe, ab)) expect(JSON.stringify(ex), ex.key).not.toMatch(splitVerb);
      }
    }
  });

  it('the bug for a kept ten is 39, 30 or 40, 49', () => {
    for (const [ab, d] of [[1, 1], [2, -1]] as [Ab, number][]) {
      let seen = 0;
      for (const ex of cell(zaehlenSkill, 1, ab)) {
        const bug = ex.bugs?.find((b) => b.id === 'zaehlen-zehner');
        if (!bug) continue;
        seen++;
        const [id, wrong] = Object.entries(bug.match as Record<string, number>)[0];
        const right = fields(ex).find((f) => f.id === id)!.value;
        expect(wrong).toBe(right - d * 10);
      }
      expect(seen).toBeGreaterThan(100);
    }
  });
});
