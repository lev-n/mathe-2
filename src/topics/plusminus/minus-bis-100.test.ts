import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise } from '../../core/types';
import { evalSide } from '../step-check';
import { detektivErgebnis, detektivWahl, lueckenAufgabe, minusAufgabe, minusBis100Skill as skill, schrittAufgabe } from './minus-bis-100';
import { atAb, bugIdFor, expectFieldsTrue, expectGapSolved, expectSolidTexts, expectTopicRules } from './test-utils';

describeSkill(skill, { minDistinct: 25 });

const exOf = (t: Omit<Exercise, 'topicId' | 'skillId' | 'stufe' | 'ab' | 'kmk' | 'srText'>): Exercise => ({ ...t, topicId: 'plusminus', skillId: skill.id, stufe: 1, ab: 1, kmk: skill.kmk, srText: 'x' });
const nums = (ex: Exercise) => /(\d+) − (\d+) = □/.exec(ex.expression!)!.slice(1).map(Number);

describe('plusminus.minus-bis-100', () => {
  it('numbers stay in 0–100, lines stay readable, one key per visible task', () => expectTopicRules(skill));

  it('Stufe 1 has no borrowing: AB I smaller numbers with help, AB II larger numbers alone', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(skill, ab, 1)) {
        const [a, b] = nums(ex);
        expect(a % 10).toBeGreaterThanOrEqual(b % 10);
        expect(a).toBeGreaterThan(b);
        expect(b).toBeGreaterThanOrEqual(11);
        expect(a, ex.key).toBeLessThanOrEqual(ab === 1 ? 59 : 99);
        if (ab === 2) {
          expect(a, ex.key).toBeGreaterThanOrEqual(60);
          expect(ex.visual, ex.key).toBeUndefined();
        }
        expectSolidTexts(ex);
        if (ex.answer.kind === 'number') expectGapSolved(ex);
        else expectFieldsTrue(ex);
      }
    }
  });

  it('Stufe 2 goes across a ten on AB I and II', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(skill, ab, 2)) {
        const [a, b] = nums(ex);
        expect(a % 10).toBeLessThan(b % 10);
        expect(a).toBeGreaterThan(b);
        expectSolidTexts(ex);
        if (ex.answer.kind === 'number') expectGapSolved(ex);
        else expectFieldsTrue(ex);
      }
    }
  });

  it('AB III keeps the numbers of its Stufe: Stufe 1 no borrowing, Stufe 2 across a ten, with a choice that has one right option', () => {
    for (const [stufe, across] of [[1, false], [2, true]] as const) {
      const kinds = new Set<string>();
      for (const ex of atAb(skill, 3, stufe)) {
        expectSolidTexts(ex);
        expect(ex.knobel, ex.key).toBeUndefined();
        if (ex.answer.kind === 'choice') {
          kinds.add('choice');
          const r = Number(/ergibt (\d+)\?/.exec(ex.prompt)![1]);
          expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
          ex.answer.options.forEach((o, i) => {
            const [, x, y] = /^(\d+) − (\d+)$/.exec(o.label)!;
            expect(Number(x) % 10 < Number(y) % 10, `${ex.key} ${o.label}`).toBe(across);
            expect(Number(x) - Number(y) === r, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct);
          });
        } else {
          kinds.add('gap');
          expectGapSolved(ex);
          if (stufe === 1) {
            const [, a, d] = /^(\d+) − □ = (\d+)$/.exec(ex.expression!)!;
            expect(Number(a) % 10 >= (Number(a) - Number(d)) % 10, ex.key).toBe(true);
          } else {
            // A step of the way, never the plain gap of Stufe 3.
            expect(ex.expression, ex.key).toMatch(/^\d+ − (\d+|□) − (\d+|□) = \d+$/);
          }
        }
      }
      expect([...kinds].sort()).toEqual(['choice', 'gap']);
    }
  });

  it('Stufe 3: AB I the gap in the second place, AB II the gap in the first place or a correction, AB III the detective', () => {
    for (const ex of atAb(skill, 1, 3)) {
      expectGapSolved(ex);
      expectSolidTexts(ex);
      expect(ex.expression, ex.key).toMatch(/^\d+ − □ = \d+$/);
      const [, a, d] = /^(\d+) − □ = (\d+)$/.exec(ex.expression!)!;
      expect(Number(a) % 10, ex.key).toBeLessThan((Number(a) - Number(d)) % 10);
    }
    const second = new Set<string>();
    for (const ex of atAb(skill, 2, 3)) {
      expectSolidTexts(ex);
      if (ex.expression!.includes('□')) {
        second.add('luecke');
        expectGapSolved(ex);
        expect(ex.expression, ex.key).toMatch(/^□ − \d+ = \d+$/);
      } else {
        second.add('ergebnis');
        const [l, shown] = ex.expression!.split(' = ');
        const right = evalSide(l)!.value;
        expect(Number(shown)).not.toBe(right);
        expect(ex.answer).toMatchObject({ value: right });
      }
    }
    expect([...second].sort()).toEqual(['ergebnis', 'luecke']);
    const third = new Set<string>();
    for (const ex of atAb(skill, 3, 3)) {
      expectSolidTexts(ex);
      expect(ex.knobel, ex.key).toBe(true);
      if (ex.answer.kind === 'choice') {
        third.add('wahl');
        const holds = ex.answer.options.map((o) => {
          const [l, r] = o.label.split(' = ');
          return evalSide(l)!.value === Number(r);
        });
        holds.forEach((h, i) => expect(h, `${ex.key} ${ex.answer.kind}`).toBe(i !== (ex.answer as { correct: number }).correct));
      } else {
        third.add('ergebnis');
        const [l, shown] = ex.expression!.split(' = ');
        const right = evalSide(l)!.value;
        expect(Number(shown)).not.toBe(right);
        expect(ex.answer).toMatchObject({ value: right });
      }
    }
    expect([...third].sort()).toEqual(['ergebnis', 'wahl']);
  });

  it('the Fehlerdetektiv waits for Stufe 3', () => {
    for (const stufe of [1, 2] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(skill, ab, stufe, 500)) expect(ex.knobel, ex.key).toBeUndefined();
      }
    }
  });

  it('the hint of the detective names the place where the planted error shows', () => {
    const place = (a: number, b: number, planted: 'kleiner' | 'zehner') => detektivWahl(createRng(1), a, b, [[68, 25], [51, 34], [90, 18]], planted).hints[1];
    expect(place(88, 79, 'zehner')).toBe('Schau besonders auf die Zehner.');
    expect(place(64, 27, 'zehner')).toBe('Schau besonders auf die Zehner.');
    expect(place(64, 27, 'kleiner')).toBe('Schau besonders auf die Einer.');
    // 62 − 27: the ones subtracted the wrong way round give 45; the right result is 35, so here too only the tens differ.
    expect(place(62, 27, 'kleiner')).toBe('Schau besonders auf die Zehner.');
    let tasks = 0;
    for (const ex of atAb(skill, 3, 3, 2000)) {
      if (ex.answer.kind !== 'choice') continue;
      const [, a, b, shown] = /(\d+) − (\d+) = (\d+)/.exec(ex.answer.options[ex.answer.correct].label)!;
      const einerGleich = Number(shown) % 10 === (Number(a) - Number(b)) % 10;
      expect(ex.hints[1], ex.key).toBe(einerGleich ? 'Schau besonders auf die Zehner.' : 'Schau besonders auf die Einer.');
      tasks++;
    }
    expect(tasks).toBeGreaterThan(0);
  });

  it('a calculation is shown as wrong only where it is wrong', () => {
    const ex = detektivWahl(createRng(3), 62, 27, [[68, 25], [51, 34], [90, 18]], 'kleiner');
    if (ex.answer.kind !== 'choice') throw new Error('choice');
    expect(ex.answer.options[ex.answer.correct].label).toBe('62 − 27 = 45');
  });

  it('the plus check of a planted result stays up to 100', () => {
    let tasks = 0;
    for (const ex of [...atAb(skill, 2, 3, 1000), ...atAb(skill, 3, 3, 1000)]) {
      if (ex.answer.kind === 'choice') {
        const planted = ex.answer.options[ex.answer.correct].label;
        const [, , b, shown] = /(\d+) − (\d+) = (\d+)/.exec(planted)!;
        expect(Number(shown) + Number(b), planted).toBeLessThanOrEqual(100);
        tasks++;
      } else if (!ex.expression!.includes('□')) {
        const [, , b, shown] = /(\d+) − (\d+) = (\d+)/.exec(ex.expression!)!;
        expect(Number(shown) + Number(b), ex.expression).toBeLessThanOrEqual(100);
        tasks++;
      }
    }
    expect(tasks).toBeGreaterThan(0);
  });

  it('the praise names the way the steps show', () => {
    for (const [a, b] of [[40, 17], [78, 69], [62, 27]]) expect(minusAufgabe(a, b).praise).toBe('Du hast erst die Zehner abgezogen.');
    for (const stufe of [1, 2, 3] as const) for (const ab of [1, 2] as const) for (const ex of atAb(skill, ab, stufe)) expect(ex.praise, ex.key).not.toMatch(/zurück/);
  });

  it('the way across a ten takes two lines: the tens, then the part around the ten', () => {
    const lines = minusAufgabe(91, 82).steps.flatMap((s) => (typeof s === 'string' || s.visual?.type !== 'numberLine' ? [] : [s.visual.labels]));
    expect(lines).toEqual([[91, 11], [11, 10, 9]]);
  });

  it('names the bugs of the catalogue with exact numbers', () => {
    const ex = exOf(minusAufgabe(62, 27));
    expect(bugIdFor(ex, 45)).toBe('kleiner-von-groesser');
    expect(bugIdFor(ex, 89)).toBe('plus-minus-getauscht');
    expect(bugIdFor(exOf(lueckenAufgabe(62, 27, 'hinten')), 97)).toBe('platzhalter-summe');
    const berichtigen = exOf(detektivErgebnis('Mia', 64, 27, 'zehner'));
    expect(berichtigen.answer).toMatchObject({ value: 37 });
    expect(bugIdFor(berichtigen, 47)).toBe('zehner-vergessen');
    const steps = exOf(schrittAufgabe(62, 27));
    if (steps.answer.kind !== 'multi') throw new Error('multi');
    expect(checkAnswer(steps.answer, { kind: 'multi', values: { zehner: '60', ziel: '53' } }, steps.bugs).bugId).toBe('ziffern-einzeln');
  });

  it('the worked way across a ten stops at the ten', () => {
    const texts = minusAufgabe(62, 27).steps.map((s) => (typeof s === 'string' ? s : s.text));
    expect(texts).toEqual(['Erst die Zehner: 62 − 20 = 42', 'Zum Zehner: 42 − 2 = 40', 'Noch 5 weg: 40 − 5 = 35']);
  });
});
