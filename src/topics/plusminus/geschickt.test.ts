import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise } from '../../core/types';
import { evalSide } from '../step-check';
import { ausgleichAufgabe, ausgleichVorne, geschicktSkill as skill, hilfsAufgabe, hilfsLuecke, hilfsZehner, minusAusgleich, wegErkennen, wegWaehlen } from './geschickt';
import { MINUS_OP, PLUS_OP } from './rechnen';
import { atAb, bugIdFor, expectGapSolved, expectSolidTexts, expectTopicRules } from './test-utils';

describeSkill(skill, { minDistinct: 25 });

const exOf = (t: Omit<Exercise, 'topicId' | 'skillId' | 'stufe' | 'ab' | 'kmk' | 'srText'>): Exercise => ({ ...t, topicId: 'plusminus', skillId: skill.id, stufe: 1, ab: 1, kmk: skill.kmk, srText: 'x' });

describe('plusminus.geschickt', () => {
  it('numbers stay in 0–100, lines stay readable, one key per visible task', () => expectTopicRules(skill));

  it('Stufe 1 keeps to + 9, + 11, − 9 and Stufe 2 to + 19, + 29, − 19 on AB I and II; AB I names the ten, AB II leaves it out', () => {
    for (const [stufe, list] of [[1, ['+11', '+9', '−9']], [2, ['+19', '+29', '−19']]] as const) {
      for (const ab of [1, 2] as const) {
        const seen = new Set<string>();
        for (const ex of atAb(skill, ab, stufe)) {
          const [, a, op, n] = /(\d+) ([+−]) (\d+) = □/.exec(ex.expression!)!;
          seen.add(`${op}${n}`);
          expect(hilfsZehner(Number(n)) % 10).toBe(0);
          expect(Number(a) % 10).not.toBe(0);
          if (ab === 1) expect(ex.prompt, ex.key).toBe(`Nimm die ${hilfsZehner(Number(n))} als Hilfe.`);
          else {
            expect(ex.prompt, ex.key).toBe('Rechne geschickt.');
            expect(ex.visual, ex.key).toBeUndefined();
          }
          expectGapSolved(ex);
          expectSolidTexts(ex);
        }
        expect([...seen].sort()).toEqual([...list]);
      }
    }
  });

  it('Stufe 1 and 2, AB III: the gap asks for the number next to the ten; the shown way belongs to one option', () => {
    for (const [stufe, list] of [[1, [9, 11]], [2, [19, 29]]] as const) {
      const kinds = new Set<string>();
      for (const ex of atAb(skill, 3, stufe)) {
        expectSolidTexts(ex);
        if (ex.answer.kind === 'number') {
          kinds.add('gap');
          expectGapSolved(ex);
          expect(ex.expression, ex.key).toMatch(/^\d+ [+−] □ = \d+$/);
          expect([...list], ex.key).toContain(ex.answer.value);
        } else if (ex.answer.kind === 'choice') {
          kinds.add('way');
          const way = evalSide(ex.expression!)!.value;
          ex.answer.options.forEach((o, i) => expect(evalSide(o.label)!.value === way, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
          expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
          // The option may read wrong signs, but its right number stays on the Stufe.
          const right = Number(/[+−] (\d+)$/.exec(ex.answer.options[ex.answer.correct].label)![1]);
          expect([...list, 9, 19].includes(right), ex.key).toBe(true);
        } else throw new Error(ex.key);
      }
      expect([...kinds].sort()).toEqual(['gap', 'way']);
    }
  });

  it('Stufe 3: AB I chooses the way, with neighbours up to 49', () => {
    const seen = new Set<string>();
    for (const ex of atAb(skill, 1, 3, 1000)) {
      expectSolidTexts(ex);
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const task = evalSide(ex.expression!.split(' = ')[0])!.value;
      const [, op, nText] = /([+−]) (\d+) = □/.exec(ex.expression!)!;
      const n = Number(nText);
      seen.add(`${op}${n}`);
      const right = ex.answer.options[ex.answer.correct].label;
      expect(evalSide(right)!.value, ex.key).toBe(task);
      expect(right, ex.key).toContain(String(hilfsZehner(n)));
      ex.answer.options.forEach((o, i) => expect(evalSide(o.label)!.value === task, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
    }
    expect([...seen].sort()).toEqual(['+19', '+29', '+39', '+49', '−19', '−29', '−39'].sort());
  });

  it('Stufe 3, AB II moves a number and AB III looks for the ten: both sides stay worth the same', () => {
    const second = new Set<string>();
    for (const ex of atAb(skill, 2, 3)) {
      expectSolidTexts(ex);
      if (ex.answer.kind === 'number') {
        second.add('gap');
        expectGapSolved(ex);
        expect(ex.expression, ex.key).toMatch(/^\d+ \+ \d+ = \d+ \+ □$/);
      } else if (ex.answer.kind === 'choice') {
        second.add('choice');
        const task = evalSide(ex.expression!)!.value;
        ex.answer.options.forEach((o, i) => expect(evalSide(o.label)!.value === task, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
      } else throw new Error(ex.key);
    }
    expect([...second].sort()).toEqual(['choice', 'gap']);
    const third = new Set<string>();
    for (const ex of atAb(skill, 3, 3)) {
      expectSolidTexts(ex);
      expectGapSolved(ex);
      third.add(ex.expression!.includes('+') ? 'plus' : 'minus');
      expect((ex.answer as { value: number }).value % 10, ex.key).toBe(0);
    }
    expect([...third].sort()).toEqual(['minus', 'plus']);
  });

  it('no two-sided task below Stufe 3', () => {
    for (const stufe of [1, 2] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(skill, ab, stufe, 500)) expect(ex.key, ex.key).not.toMatch(/:ausgleich|:weg:/);
      }
    }
  });

  it('names the bugs of the catalogue with exact numbers', () => {
    expect(bugIdFor(exOf(hilfsAufgabe(34, MINUS_OP, 19)), 13)).toBe('hilfsaufgabe-richtung');
    expect(bugIdFor(exOf(hilfsAufgabe(34, MINUS_OP, 19)), 14)).toBe('hilfsaufgabe-vergessen');
    expect(bugIdFor(exOf(hilfsAufgabe(34, PLUS_OP, 9)), 45)).toBe('hilfsaufgabe-richtung');
    expect(bugIdFor(exOf(hilfsAufgabe(34, PLUS_OP, 11)), 43)).toBe('hilfsaufgabe-richtung');
    const moved = exOf(ausgleichAufgabe(39, 24));
    expect(moved.answer).toMatchObject({ value: 23 });
    expect(bugIdFor(moved, 24)).toBe('hilfsaufgabe-vergessen');
    expect(bugIdFor(moved, 25)).toBe('hilfsaufgabe-richtung');
    expect(bugIdFor(moved, 63)).toBe('gleichheit');
    expect(bugIdFor(exOf(hilfsLuecke(34, PLUS_OP, 9)), 10)).toBe('hilfsaufgabe-vergessen');
    expect(bugIdFor(exOf(hilfsLuecke(34, PLUS_OP, 9)), 11)).toBe('hilfsaufgabe-richtung');
    const vorne = exOf(ausgleichVorne(39, 24));
    expect(vorne.expression).toBe('39 + 24 = □ + 23');
    expect(bugIdFor(vorne, 39)).toBe('hilfsaufgabe-vergessen');
    const weg = exOf(minusAusgleich(63, 29));
    expect(weg.expression).toBe('63 − 29 = 64 − □');
    expect(weg.answer).toMatchObject({ value: 30 });
    expect(bugIdFor(weg, 29)).toBe('hilfsaufgabe-vergessen');
    expect(bugIdFor(weg, 28)).toBe('hilfsaufgabe-richtung');
  });

  it('the worked way shows the ten and the step back', () => {
    const texts = hilfsAufgabe(34, MINUS_OP, 19).steps.map((s) => (typeof s === 'string' ? s : s.text));
    expect(texts).toEqual(['Hilfe: 34 − 20 = 14', '20 ist 1 zu viel: 14 + 1 = 15']);
    expect(wegWaehlen(createRng(2), 46, PLUS_OP, 29).steps).toHaveLength(3);
    // Minus takes 10 and gives 1 back, and that is still 9: the worked way says 10 − 1, not 10 + 1.
    expect(wegErkennen(createRng(2), 34, MINUS_OP, 9).steps[0]).toBe('10 − 1 = 9');
    expect(wegErkennen(createRng(2), 34, MINUS_OP, 9).expression).toBe('34 − 10 + 1');
  });
});
