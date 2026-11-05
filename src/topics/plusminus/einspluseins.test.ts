import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise } from '../../core/types';
import { evalSide } from '../step-check';
import { doppelAufgabe, doppelFinden, doppelWaehlen, einspluseinsSkill as skill, gleichAufgabe, lueckenAufgabe, minusAufgabe, plusAufgabe, ueberDieZehnErkennen, umkehrHilfe, zurZehnWaehlen } from './einspluseins';
import { atAb, bugIdFor, expectGapSolved, expectSolidTexts, expectTopicRules } from './test-utils';

describeSkill(skill, { minDistinct: 25 });

const exOf = (t: Omit<Exercise, 'topicId' | 'skillId' | 'stufe' | 'ab' | 'kmk' | 'srText'>): Exercise => ({ ...t, topicId: 'plusminus', skillId: skill.id, stufe: 1, ab: 1, kmk: skill.kmk, srText: 'x' });
/** The two numbers of 'a + b = □' or 'a − b = □'. */
const parts = (ex: Exercise) => /(\d+) ([+−]) (\d+) = □/.exec(ex.expression ?? '')!;

describe('plusminus.einspluseins', () => {
  it('numbers stay in 0–100, lines stay readable, one key per visible task', () => expectTopicRules(skill));

  it('Stufe 1, AB I stays up to 10, or is a small double; AB II uses the teens or a large double', () => {
    for (const ex of atAb(skill, 1, 1)) {
      expectGapSolved(ex);
      expectSolidTexts(ex);
      const [, l, op, r] = parts(ex);
      const [a, b] = [Number(l), Number(r)];
      expect(a, ex.key).toBeLessThanOrEqual(10);
      if (op === '+') expect(a + b, ex.key).toBeLessThanOrEqual(10);
    }
    for (const ex of atAb(skill, 2, 1)) {
      expectGapSolved(ex);
      expectSolidTexts(ex);
      const [, l, op, r] = parts(ex);
      const [a, b] = [Number(l), Number(r)];
      if (op === '+' && a === b) {
        expect(a, ex.key).toBeGreaterThanOrEqual(6);
        expect(a, ex.key).toBeLessThanOrEqual(10);
      } else {
        expect(a, ex.key).toBeGreaterThan(10);
        if (op === '+') expect((a % 10) + b, ex.key).toBeLessThanOrEqual(10);
        else expect(b, ex.key).toBeLessThanOrEqual(a % 10);
      }
    }
  });

  it('Stufe 1, AB III: a gap in the second place, without crossing; or the double of a sum', () => {
    let gaps = 0;
    let doubles = 0;
    for (const ex of atAb(skill, 3, 1)) {
      expectSolidTexts(ex);
      if (ex.answer.kind === 'number') {
        gaps++;
        expectGapSolved(ex);
        const m = /^(\d+) ([+−]) □ = (\d+)$/.exec(ex.expression!)!;
        const [x, y] = [Number(m[1]), Number(m[3])];
        const [klein, gross] = [Math.min(x, y), Math.max(x, y)];
        expect(gross, ex.key).toBeLessThanOrEqual(20);
        expect(klein >= 10 || gross <= 10, ex.key).toBe(true);
      } else if (ex.answer.kind === 'choice') {
        doubles++;
        const s = Number(/ergibt (\d+)\?/.exec(ex.prompt)![1]);
        const right = ex.answer.options[ex.answer.correct].label;
        expect(right, ex.key).toBe(`${s / 2} + ${s / 2}`);
      } else throw new Error(ex.key);
    }
    expect(gaps).toBeGreaterThan(0);
    expect(doubles).toBeGreaterThan(0);
  });

  it('Stufe 2 crosses the ten on every AB, and has no gap of Stufe 3', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(skill, ab, 2)) {
        expectGapSolved(ex);
        expectSolidTexts(ex);
        const [, l, op, r] = parts(ex);
        const [a, b] = [Number(l), Number(r)];
        expect(a === b, ex.key).toBe(false);
        if (op === '+') {
          expect(a).toBeLessThan(10);
          expect(a + b).toBeGreaterThan(10);
          expect(a + b).toBeLessThanOrEqual(20);
        } else {
          expect(a).toBeGreaterThan(10);
          expect(b).toBeGreaterThan(a % 10);
        }
      }
    }
    for (const ex of atAb(skill, 1, 2)) expect(ex.expression, ex.key).toContain('+');
    for (const ex of atAb(skill, 3, 2)) {
      expectSolidTexts(ex);
      if (ex.answer.kind === 'number') {
        expectGapSolved(ex);
        // A step of the way, never the gap in a plain task: 8 + 2 + □ = 13.
        expect(ex.expression, ex.key).toMatch(/^\d+ [+−] (\d+|□) [+−] (\d+|□) = \d+$/);
      } else if (ex.answer.kind === 'choice') {
        const { options, correct } = ex.answer;
        options.forEach((o, i) => {
          const [, x, op, y] = /^(\d+) ([+−]) (\d+)$/.exec(o.label)!;
          const [p, q] = [Number(x), Number(y)];
          const crosses = op === '+' ? p + q > 10 : p > 10 && p - q < 10;
          expect(crosses, `${ex.key} ${o.label}`).toBe(i === correct);
        });
      } else throw new Error(ex.key);
    }
  });

  it('Stufe 3: AB I the gap in the second place, AB II in the first place or the helping task, AB III both sides or the way back', () => {
    for (const ex of atAb(skill, 1, 3)) {
      expectGapSolved(ex);
      expect(ex.expression, ex.key).toMatch(/^\d+ \+ □ = \d+$|^\d+ − □ = \d+$/);
    }
    const seen = new Set<string>();
    for (const ex of atAb(skill, 2, 3)) {
      expectSolidTexts(ex);
      if (ex.answer.kind === 'number') {
        expectGapSolved(ex);
        expect(ex.expression, ex.key).toMatch(/^□ [+−] \d+ = \d+$/);
        seen.add('gap');
      } else if (ex.answer.kind === 'choice') {
        seen.add('choice');
        const target = evalSide(ex.expression!.split(' = ')[0])!.value;
        ex.answer.options.forEach((o, i) => expect(evalSide(o.label)!.value === target, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
      }
    }
    expect([...seen].sort()).toEqual(['choice', 'gap']);
    const kinds = new Set<string>();
    for (const ex of atAb(skill, 3, 3)) {
      expectSolidTexts(ex);
      if (ex.answer.kind === 'number') {
        kinds.add('gleich');
        const [, a, b, c] = /^(\d+) \+ (\d+) = □ \+ (\d+)$/.exec(ex.expression!)!;
        expect(ex.answer.value, ex.key).toBe(Number(a) + Number(b) - Number(c));
        expect(ex.answer.value!, ex.key).toBeGreaterThan(0);
      } else if (ex.answer.kind === 'choice' && ex.expression!.startsWith('□')) {
        kinds.add('umkehr');
        const [, b, s] = /^□ \+ (\d+) = (\d+)$/.exec(ex.expression!)!;
        expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(`${s} − ${b}`);
      } else if (ex.answer.kind === 'choice') {
        kinds.add('zur-zehn');
        const target = evalSide(ex.expression!.split(' = ')[0])!.value;
        expect(evalSide(ex.answer.options[ex.answer.correct].label)!.value, ex.key).toBe(target);
      } else throw new Error(ex.key);
    }
    expect([...kinds].sort()).toEqual(['gleich', 'umkehr', 'zur-zehn']);
  });

  it('names the bugs of the catalogue with exact numbers', () => {
    const plus = exOf(plusAufgabe(3, 9));
    expect(bugIdFor(plus, 11)).toBe('zaehlen-eins-daneben');
    expect(bugIdFor(plus, 2)).toBe('zehner-vergessen');
    const minus = exOf(minusAufgabe(13, 6));
    expect(bugIdFor(minus, 13)).toBe('kleiner-von-groesser');
    expect(bugIdFor(minus, 19)).toBe('plus-minus-getauscht');
    expect(bugIdFor(exOf(lueckenAufgabe(8, 7, 'plus-hinten')), 23)).toBe('platzhalter-summe');
    expect(bugIdFor(exOf(lueckenAufgabe(8, 7, 'minus-hinten')), 23)).toBe('platzhalter-summe');
    const gleich = exOf(gleichAufgabe(8, 5, 6));
    expect(gleich.answer).toMatchObject({ value: 7 });
    expect(bugIdFor(gleich, 13)).toBe('gleichheit');
    expect(bugIdFor(gleich, 19)).toBe('gleichheit');
  });

  it('"Der Zehner bleibt gleich" only where the ten stays the same; 18 + 2 names the new ten', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(skill, ab, stufe, 1000)) {
          if (!ex.hints.includes('Der Zehner bleibt gleich.') || ex.answer.kind !== 'number') continue;
          const first = Number(/^\d+/.exec(ex.expression!)![0]);
          expect(Math.floor(ex.answer.value! / 10), ex.key).toBe(Math.floor(first / 10));
        }
      }
    }
    for (let e = 1; e <= 8; e++) {
      const ex = exOf(plusAufgabe(10 + e, 10 - e));
      expect(ex.hints[1]).toBe(`${e} + ${10 - e} sind genau 10. Der Zehner wird größer.`);
      expect(bugIdFor(ex, 10)).toBe('zehner-vergessen');
    }
  });

  it('a double has one key, whichever generator made it', () => {
    for (let n = 2; n <= 9; n++) {
      const [plus, doppel] = [plusAufgabe(n, n), doppelAufgabe(n)];
      expect(doppel.expression).toBe(plus.expression);
      expect(doppel.key).toBe(plus.key);
    }
  });

  it('equal addends get the doubling hint, not a choice of the larger number', () => {
    for (const n of [1, 2, 3, 4, 5, 10]) {
      const task = plusAufgabe(n, n);
      expect(task.hints, task.key).toEqual(doppelAufgabe(n).hints);
      expect(task.praise, task.key).toBe('Du hast die Verdopplung erkannt.');
    }
    // Over the 10, the way over the ten stays the hint of this form.
    expect(plusAufgabe(6, 6).hints[0]).toBe('Rechne erst zur 10: 6 + 4.');
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of atAb(skill, 1, stufe, 1000)) {
        if (!ex.hints.some((h) => h.startsWith('Beginne mit der'))) continue;
        const [, l, , r] = parts(ex);
        expect(l, ex.key).not.toBe(r);
      }
    }
  });

  it('steps go through the 10, in at most 3 lines', () => {
    expect(plusAufgabe(8, 5).steps[0]).toBe('Erst zur 10: 8 + 2 = 10');
    expect(typeof minusAufgabe(13, 6).steps[1] === 'object' ? (minusAufgabe(13, 6).steps[1] as { text: string }).text : '').toBe('Dann weiter: 10 − 3 = 7');
    expect(zurZehnWaehlen(createRng(1), 8, 5, 'plus').steps).toHaveLength(3);
    expect(doppelWaehlen(createRng(1), 7).steps).toHaveLength(3);
    expect(doppelAufgabe(6).answer).toMatchObject({ value: 12 });
  });

  it('11 − 6: the hint does not say the 5 that is also the answer', () => {
    expect(minusAufgabe(11, 6).hints[1]).toBe('Dann nimm den Rest weg.');
    expect(minusAufgabe(13, 6).hints[1]).toBe('Dann nimm noch 3 weg.');
  });

  it('the new choices have one right option', () => {
    const chosen = (t: ReturnType<typeof doppelFinden>) => {
      if (t.answer.kind !== 'choice') throw new Error(t.key);
      return t.answer.options[t.answer.correct].label;
    };
    expect(chosen(doppelFinden(createRng(1), 7))).toBe('7 + 7');
    expect(chosen(ueberDieZehnErkennen(createRng(1), 8, 5, 'plus'))).toBe('8 + 5');
    expect(chosen(ueberDieZehnErkennen(createRng(1), 13, 6, 'minus'))).toBe('13 − 6');
    expect(chosen(umkehrHilfe(createRng(1), 8, 7))).toBe('15 − 7');
  });
});
