import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise } from '../../core/types';
import { evalSide } from '../step-check';
import { MINUS_OP, PLUS_OP } from './rechnen';
import { atAb, bugIdFor, expectFieldsTrue, expectGapSolved, expectSolidTexts, expectTopicRules } from './test-utils';
import { gleichZumZehner, lueckenAufgabe, schrittAufgabe, startLuecke, ueberDenZehnerSkill as skill, wegWaehlen, zehnerAufgabe, zehnerZuerst } from './ueber-den-zehner';

describeSkill(skill, { minDistinct: 25 });

const exOf = (t: Omit<Exercise, 'topicId' | 'skillId' | 'stufe' | 'ab' | 'kmk' | 'srText'>): Exercise => ({ ...t, topicId: 'plusminus', skillId: skill.id, stufe: 1, ab: 1, kmk: skill.kmk, srText: 'x' });

describe('plusminus.ueber-den-zehner', () => {
  it('numbers stay in 0–100, lines stay readable, one key per visible task', () => expectTopicRules(skill));

  /** a, the sign and the result of a task, recomputed from its expression; null for a choice without a plain term. */
  function crossing(ex: Exercise): { a: number; op: string; c: number } {
    const expression = ex.expression!;
    const plain = /^(\d+) ([+−]) (\d+) = □$/.exec(expression);
    if (plain) {
      const [a, b] = [Number(plain[1]), Number(plain[3])];
      return { a, op: plain[2], c: plain[2] === '+' ? a + b : a - b };
    }
    const gap = /^(\d+) ([+−]) □ = (\d+)$/.exec(expression);
    if (gap) return { a: Number(gap[1]), op: gap[2], c: Number(gap[3]) };
    const start = /^□ ([+−]) (\d+) = (\d+)$/.exec(expression);
    if (start) {
      const [b, c] = [Number(start[2]), Number(start[3])];
      return { a: start[1] === '+' ? c - b : c + b, op: start[1], c };
    }
    const chain = /^(\d+) ([+−]) (\d+|□) [+−] (\d+|□) = (\d+)$/.exec(expression);
    if (chain) return { a: Number(chain[1]), op: chain[2], c: Number(chain[5]) };
    const both = /^(\d+) ([+−]) (\d+) = (\d+) [+−] □$/.exec(expression);
    if (both) {
      const [a, b] = [Number(both[1]), Number(both[3])];
      return { a, op: both[2], c: both[2] === '+' ? a + b : a - b };
    }
    throw new Error(`${ex.key}: ${expression}`);
  }

  it('every task crosses a ten; number answers solve the gap and field lines hold', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(skill, ab, stufe)) {
          expectSolidTexts(ex);
          if (ex.answer.kind === 'number') expectGapSolved(ex);
          else if (ex.answer.kind === 'multi') expectFieldsTrue(ex);
          const { a, c } = crossing(ex);
          expect(Math.floor(a / 10), ex.key).not.toBe(Math.floor(c / 10));
          expect(a % 10 === 0 || c % 10 === 0, ex.key).toBe(false);
          expect(c).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('Stufe 1 only adds and goes in steps, Stufe 2 only subtracts, Stufe 3 does both', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(skill, ab, 1)) expect(crossing(ex).op, ex.key).toBe('+');
      for (const ex of atAb(skill, ab, 2)) expect(crossing(ex).op, ex.key).toBe('−');
      expect(new Set(atAb(skill, ab, 3).map((ex) => crossing(ex).op)).size).toBe(2);
    }
  });

  it('Stufe 1 and 2: AB I in steps, AB III a step of the way as a gap or the way to choose', () => {
    for (const ex of atAb(skill, 1, 1)) {
      expect(ex.answer.kind, ex.key).toBe('multi');
      if (ex.answer.kind === 'multi') expect(ex.answer.fields, ex.key).toHaveLength(3);
    }
    for (const ex of atAb(skill, 2, 1)) {
      if (ex.visual?.type !== 'numberLine') throw new Error(ex.key);
      expect(ex.visual.jumps?.length, ex.key).toBe(1);
    }
    for (const ex of atAb(skill, 2, 2)) {
      if (ex.visual?.type !== 'numberLine') throw new Error(ex.key);
      expect(ex.visual.jumps, ex.key).toBeUndefined();
    }
    for (const stufe of [1, 2] as const) {
      const kinds = new Set<string>();
      for (const ex of atAb(skill, 3, stufe)) {
        if (ex.answer.kind === 'number') {
          kinds.add('gap');
          expect(ex.expression, ex.key).toMatch(/^\d+ [+−] (\d+|□) [+−] (\d+|□) = \d+$/);
        } else if (ex.answer.kind === 'choice') {
          kinds.add('way');
          const [, a, op, b] = /^(\d+) ([+−]) (\d+) = □$/.exec(ex.expression!)!;
          const target = op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
          ex.answer.options.forEach((o, i) => expect(evalSide(o.label)!.value === target, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
          expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
        } else throw new Error(ex.key);
      }
      expect([...kinds].sort()).toEqual(['gap', 'way']);
    }
  });

  it('Stufe 3: AB I names the ten itself, AB II the gap in the second place, AB III the start or both sides', () => {
    for (const ex of atAb(skill, 1, 3)) {
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      expect(ex.answer.fields.map((f) => f.id)).toEqual(['zehner', 'ziel']);
    }
    for (const ex of atAb(skill, 2, 3)) expect(ex.expression, ex.key).toMatch(/^\d+ [+−] □ = \d+$/);
    const kinds = new Set<string>();
    for (const ex of atAb(skill, 3, 3)) {
      if (ex.expression!.startsWith('□')) kinds.add('start');
      else {
        kinds.add('gleich');
        expect(ex.expression, ex.key).toMatch(/^\d+ [+−] \d+ = \d+ [+−] □$/);
      }
    }
    expect([...kinds].sort()).toEqual(['gleich', 'start']);
  });

  it('names the bugs of the catalogue with exact numbers', () => {
    const plus = exOf(zehnerAufgabe(35, PLUS_OP, 8, true));
    expect(bugIdFor(plus, 33)).toBe('zehner-vergessen');
    expect(bugIdFor(plus, 42)).toBe('zaehlen-eins-daneben');
    const minus = exOf(zehnerAufgabe(43, MINUS_OP, 7, false));
    expect(bugIdFor(minus, 44)).toBe('kleiner-von-groesser');
    expect(bugIdFor(minus, 46)).toBe('zehner-vergessen');
    expect(bugIdFor(exOf(lueckenAufgabe(35, PLUS_OP, 7)), 77)).toBe('platzhalter-summe');
    const start = exOf(startLuecke(35, PLUS_OP, 8));
    expect(start.answer).toMatchObject({ value: 35 });
    expect(bugIdFor(start, 51)).toBe('platzhalter-summe');
    const gleich = exOf(gleichZumZehner(35, PLUS_OP, 8));
    expect(gleich.answer).toMatchObject({ value: 3 });
    expect(bugIdFor(gleich, 43)).toBe('gleichheit');
    expect(bugIdFor(gleich, 8)).toBe('rest-ganz');
  });

  it('each field of the steps stands on its own when the line wraps', () => {
    const ex = schrittAufgabe(54, PLUS_OP, 7);
    if (ex.answer.kind !== 'multi') throw new Error('multi');
    expect(ex.answer.fields.map((f) => [f.before, f.value, f.after])).toEqual([
      ['54 +', 6, '= 60'],
      ['Dann: 60 +', 1, undefined],
      ['Ergebnis:', 61, undefined],
    ]);
  });

  it('field bugs are matched on the field alone', () => {
    const ex = exOf(schrittAufgabe(35, PLUS_OP, 8));
    if (ex.answer.kind !== 'multi') throw new Error('multi');
    const res = checkAnswer(ex.answer, { kind: 'multi', values: { bis: '5', rest: '8', ziel: '48' } }, ex.bugs);
    expect(res.bugId).toBe('rest-ganz');
    const zuerst = exOf(zehnerZuerst(43, MINUS_OP, 7));
    if (zuerst.answer.kind !== 'multi') throw new Error('multi');
    expect(checkAnswer(zuerst.answer, { kind: 'multi', values: { zehner: '50', ziel: '36' } }, zuerst.bugs).bugId).toBe('zehner-richtung');
  });

  it('only the right way adds up to the second number', () => {
    const t = wegWaehlen(createRng(1), 35, PLUS_OP, 8);
    if (t.answer.kind !== 'choice') throw new Error(t.key);
    expect(t.answer.options[t.answer.correct].label).toBe('35 + 5 + 3');
    expect(t.answer.options.map((o) => o.label)).not.toContain('35 + 3 + 5');
    expect(wegWaehlen(createRng(1), 39, PLUS_OP, 2).answer.kind).toBe('choice');
  });

  it('a task with the ten among its answers never names that ten in a hint', () => {
    const ex = exOf(zehnerZuerst(35, PLUS_OP, 8));
    for (const h of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(h).not.toMatch(/\b40\b/);
  });
});
