import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { evalSide } from '../step-check';
import { atAb, bugIdFor, expectGapSolved, expectSolidTexts, expectTopicRules } from './test-utils';
import { ergaenzen, paarWaehlen, zehnerVollSkill as skill } from './zehner-voll';

describeSkill(skill, { minDistinct: 25 });

const exOf = (t: ReturnType<typeof ergaenzen>): Exercise => ({ ...t, topicId: 'plusminus', skillId: skill.id, stufe: 1, ab: 1, kmk: skill.kmk, srText: 'x' });

/** Start and target, recomputed from what the child reads: 37 + □ = 40, □ + 37 = 40, 40 = 37 + □, 40 − □ = 37, □ + 3 = 40, the question. */
function read(ex: Exercise): { a: number; ziel: number } {
  const e = ex.expression ?? '';
  const frage = /Wie viel fehlt von (\d+) bis (\d+)\?/.exec(ex.prompt);
  if (frage) return { a: Number(frage[1]), ziel: Number(frage[2]) };
  const vorne = /^(\d+) \+ □ = (\d+)$/.exec(e);
  if (vorne) return { a: Number(vorne[1]), ziel: Number(vorne[2]) };
  const zerlegen = /^(\d+) = (\d+) \+ □$/.exec(e);
  if (zerlegen) return { a: Number(zerlegen[2]), ziel: Number(zerlegen[1]) };
  const weg = /^(\d+) − □ = (\d+)$/.exec(e);
  if (weg) return { a: Number(weg[2]), ziel: Number(weg[1]) };
  const hinten = /^□ \+ (\d+) = (\d+)$/.exec(e);
  if (hinten) {
    const [x, ziel] = [Number(hinten[1]), Number(hinten[2])];
    // Start of the way: the missing number is the larger one, or the given one is the start.
    return ex.key.includes(':start:') ? { a: ziel - x, ziel } : { a: x, ziel };
  }
  throw new Error(`${ex.key}: ${e}`);
}

const NUMBER_FORMS = (stufe: Stufe, ab: Ab) => atAb(skill, ab, stufe).filter((ex) => ex.answer.kind === 'number');

describe('plusminus.zehner-voll', () => {
  it('numbers stay in 0–100, lines stay readable, one key per visible task', () => expectTopicRules(skill));

  it('Stufe 1 completes to 10 on AB I, to 20 on AB II, both turned round on AB III', () => {
    for (const ex of NUMBER_FORMS(1, 1)) expect(read(ex).ziel, ex.key).toBe(10);
    for (const ex of NUMBER_FORMS(1, 2)) {
      const { a, ziel } = read(ex);
      expect(ziel, ex.key).toBe(20);
      expect(a, ex.key).toBeGreaterThan(10);
    }
    for (const ex of atAb(skill, 3, 1)) {
      if (ex.answer.kind === 'choice') {
        const ziel = Number(/die (\d+) voll/.exec(ex.prompt)![1]);
        ex.answer.options.forEach((o, i) => expect(evalSide(o.label)!.value === ziel, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
      } else {
        expect(ex.expression, ex.key).toMatch(/^(10|20) − □ = \d+$/);
      }
    }
  });

  it('Stufe 2 completes a number from 21 on to its next ten, Stufe 3 to 100 with a stop at a ten', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of NUMBER_FORMS(2, ab)) {
        const { a, ziel } = read(ex);
        expect(a, ex.key).toBeGreaterThan(20);
        expect(a % 10, ex.key).not.toBe(0);
        expect(ziel, ex.key).toBe(a - (a % 10) + 10);
      }
      for (const ex of NUMBER_FORMS(3, ab)) {
        const { a, ziel } = read(ex);
        expect(ziel, ex.key).toBe(100);
        expect(a, ex.key).toBeLessThan(90);
        expect(a % 10, ex.key).not.toBe(0);
      }
    }
  });

  it('within a Stufe: AB I has the field, AB II moves the □, AB III turns the task round', () => {
    for (const stufe of [2, 3] as const) {
      for (const ex of atAb(skill, 1, stufe)) {
        expect(ex.visual?.type, ex.key).toBe('field');
        if (ex.expression) expect(ex.expression, ex.key).toMatch(/^\d+ \+ □ = \d+$/);
      }
      for (const ex of atAb(skill, 2, stufe)) {
        expect(ex.visual, ex.key).toBeUndefined();
        expect(ex.expression, ex.key).toMatch(/^□ \+ \d+ = \d+$|^\d+ = \d+ \+ □$/);
      }
      for (const ex of atAb(skill, 3, stufe)) {
        expect(ex.visual, ex.key).toBeUndefined();
        expect(ex.expression, ex.key).toMatch(/^□ \+ \d+ = \d+$|^\d+ − □ = \d+$/);
      }
    }
  });

  it('answers solve the gap; worked steps add up', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(skill, ab, stufe)) {
          if (ex.expression?.includes('□')) expectGapSolved(ex);
          if (ex.answer.kind === 'number' && !ex.expression) {
            const { a, ziel } = read(ex);
            expect(ex.answer.value, ex.key).toBe(ziel - a);
          }
          expectSolidTexts(ex);
        }
      }
    }
  });

  it('names the bugs of the catalogue with exact numbers', () => {
    expect(bugIdFor(exOf(ergaenzen(3, 10, 'vorne')), 13)).toBe('platzhalter-summe');
    expect(bugIdFor(exOf(ergaenzen(3, 10, 'vorne')), 6)).toBe('zaehlen-eins-daneben');
    const zehner = exOf(ergaenzen(37, 40, 'vorne'));
    expect(bugIdFor(zehner, 7)).toBe('einer-genannt');
    expect(bugIdFor(zehner, 40)).toBe('ziel-genannt');
    const hundert = exOf(ergaenzen(37, 100, 'vorne'));
    expect(bugIdFor(hundert, 73)).toBe('zehner-zu-viel');
    expect(bugIdFor(hundert, 60)).toBe('einer-vergessen');
    const start = exOf(ergaenzen(37, 40, 'start'));
    expect(start.answer).toMatchObject({ value: 37 });
    expect(bugIdFor(start, 40)).toBe('ziel-genannt');
    expect(bugIdFor(start, 43)).toBe('platzhalter-summe');
    expect(bugIdFor(exOf(ergaenzen(37, 40, 'minus')), 77)).toBe('platzhalter-summe');
  });

  it('5 ones: the hint does not name the 5 that is missing', () => {
    expect(ergaenzen(35, 40, 'vorne').hints[0]).toBe('Schau auf die Einer. Wie viel fehlt bis 10?');
    expect(ergaenzen(37, 40, 'vorne').hints[0]).toBe('Schau auf die Einer: 7. Wie viel fehlt bis 10?');
  });

  it('only one option fills the 10 or the 20', () => {
    for (const ziel of [10, 20] as const) {
      for (let a = ziel - 9; a < ziel; a++) {
        const t = paarWaehlen(createRng(a), a, ziel);
        if (t.answer.kind !== 'choice') throw new Error(t.key);
        expect(t.answer.options.length).toBeGreaterThanOrEqual(3);
        t.answer.options.forEach((o, i) => expect(evalSide(o.label)!.value === ziel, `${t.key} ${o.label}`).toBe(i === (t.answer as { correct: number }).correct));
      }
    }
  });
});
