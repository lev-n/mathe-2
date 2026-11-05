import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import NumberWallVisual from '../../ui/visuals/NumberWallVisual';
import { gleichAufgabe, lueckenAufgabe, mauerAufgabe, mauerRueckwaerts, plusAufgabe, plusBis100Skill as skill, schrittAufgabe } from './plus-bis-100';
import { atAb, bugIdFor, expectFieldsTrue, expectGapSolved, expectSolidTexts, expectTopicRules } from './test-utils';

describeSkill(skill, { minDistinct: 25 });

const exOf = (t: Omit<Exercise, 'topicId' | 'skillId' | 'stufe' | 'ab' | 'kmk' | 'srText'>): Exercise => ({ ...t, topicId: 'plusminus', skillId: skill.id, stufe: 1, ab: 1, kmk: skill.kmk, srText: 'x' });
const nums = (ex: Exercise) => /(\d+) \+ (\d+) = □/.exec(ex.expression!)!.slice(1).map(Number);

describe('plusminus.plus-bis-100', () => {
  it('numbers stay in 0–100, lines stay readable, one key per visible task', () => expectTopicRules(skill));

  it('Stufe 1 adds two-digit numbers without a new ten, sum up to 99: AB I smaller sums and help, AB II larger sums alone', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(skill, ab, 1)) {
        const [a, b] = nums(ex);
        expect(a).toBeGreaterThanOrEqual(11);
        expect(b).toBeGreaterThanOrEqual(11);
        expect((a % 10) + (b % 10)).toBeLessThan(10);
        expect(a + b).toBeLessThanOrEqual(ab === 1 ? 59 : 99);
        if (ab === 2) {
          expect(a + b).toBeGreaterThanOrEqual(60);
          expect(ex.visual, ex.key).toBeUndefined();
        }
        expectSolidTexts(ex);
        if (ex.answer.kind === 'number') expectGapSolved(ex);
        else expectFieldsTrue(ex);
      }
    }
  });

  it('Stufe 1, AB III stays without a new ten: the □ in the second place, or the task to a result', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(skill, 3, 1)) {
      expectSolidTexts(ex);
      if (ex.answer.kind === 'number') {
        kinds.add('gap');
        expectGapSolved(ex);
        const [, a, s] = /^(\d+) \+ □ = (\d+)$/.exec(ex.expression!)!;
        expect((Number(a) % 10) + (ex.answer.value! % 10), ex.key).toBeLessThan(10);
        expect(Number(a) + ex.answer.value!, ex.key).toBe(Number(s));
      } else if (ex.answer.kind === 'choice') {
        kinds.add('choice');
        const r = Number(/ergibt (\d+)\?/.exec(ex.prompt)![1]);
        expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
        ex.answer.options.forEach((o, i) => {
          const [, x, y] = /^(\d+) \+ (\d+)$/.exec(o.label)!;
          expect((Number(x) % 10) + (Number(y) % 10), `${ex.key} ${o.label}`).toBeLessThan(10);
          expect(Number(x) + Number(y) === r, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct);
        });
      } else throw new Error(ex.key);
    }
    expect([...kinds].sort()).toEqual(['choice', 'gap']);
  });

  it('Stufe 2 adds with a new ten, sum up to 100, and reaches exactly 100', () => {
    const sums = new Set<number>();
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(skill, ab, 2, 400)) {
        const [a, b] = nums(ex);
        expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10);
        expect(a + b).toBeLessThanOrEqual(100);
        sums.add(a + b);
        expectSolidTexts(ex);
        if (ex.answer.kind === 'number') expectGapSolved(ex);
        else expectFieldsTrue(ex);
      }
    }
    expect(sums).toContain(100);
  });

  it('Stufe 2, AB III has a new ten: a step of the way as a gap, or the task to a result; never the plain gap of Stufe 3', () => {
    for (const ex of atAb(skill, 3, 2)) {
      expectSolidTexts(ex);
      if (ex.answer.kind === 'number') {
        expectGapSolved(ex);
        expect(ex.expression, ex.key).toMatch(/^\d+ \+ (\d+|□) \+ (\d+|□) = \d+$/);
      } else if (ex.answer.kind === 'choice') {
        const r = Number(/ergibt (\d+)\?/.exec(ex.prompt)![1]);
        expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
        ex.answer.options.forEach((o, i) => {
          const [, x, y] = /^(\d+) \+ (\d+)$/.exec(o.label)!;
          expect((Number(x) % 10) + (Number(y) % 10), `${ex.key} ${o.label}`).toBeGreaterThanOrEqual(10);
          expect(Number(x) + Number(y) === r, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct);
        });
      } else throw new Error(ex.key);
    }
  });

  it('Stufe 3: AB I the gap in the second place; AB II in the first place or a wall from the bottom; AB III a wall with X or both sides', () => {
    for (const ex of atAb(skill, 1, 3)) {
      expectGapSolved(ex);
      expect(ex.expression, ex.key).toMatch(/^\d+ \+ □ = \d+$/);
    }
    let walls = 0;
    for (const ex of atAb(skill, 2, 3)) {
      expectSolidTexts(ex);
      if (ex.answer.kind === 'number') {
        expectGapSolved(ex);
        expect(ex.expression, ex.key).toMatch(/^□ \+ \d+ = \d+$/);
      } else if (ex.answer.kind === 'multi' && ex.visual?.type === 'numberWall') {
        walls++;
        const [a, b, c] = ex.visual.rows[2].map(Number);
        expect(ex.answer.fields.map((f) => f.value)).toEqual([a + b, b + c, a + 2 * b + c]);
        expect(a + 2 * b + c).toBeLessThanOrEqual(100);
      } else throw new Error(ex.key);
    }
    expect(walls).toBeGreaterThan(0);
    const kinds = new Set<string>();
    for (const ex of atAb(skill, 3, 3)) {
      expectSolidTexts(ex);
      if (ex.answer.kind === 'number') {
        kinds.add('gleich');
        const [, a, b, ten] = /^(\d+) \+ (\d+) = (\d+) \+ □$/.exec(ex.expression!)!;
        expect(Number(ten) % 10, ex.key).toBe(0);
        expect(ex.answer.value, ex.key).toBe(Number(a) + Number(b) - Number(ten));
      } else if (ex.answer.kind === 'multi' && ex.visual?.type === 'numberWall') {
        kinds.add('mauer');
        const A = Number(ex.visual.rows[1][0]);
        const [b, c] = ex.visual.rows[2].slice(1).map(Number);
        expect(ex.visual.rows[2][0]).toBe('X');
        expect(ex.answer.fields.map((f) => f.value), ex.key).toEqual([A - b, b + c, A + b + c]);
        expect(A + b + c).toBeLessThanOrEqual(100);
      } else throw new Error(ex.key);
    }
    expect([...kinds].sort()).toEqual(['gleich', 'mauer']);
  });

  it('a wall stays readable on paper: its stones are not hatched, each one carries its number or letter', () => {
    const { visual } = mauerAufgabe(15, 21, 21);
    if (visual?.type !== 'numberWall') throw new Error('numberWall');
    expect(visual.rows).toEqual([['C'], ['A', 'B'], ['15', '21', '21']]);
    const paper = renderToStaticMarkup(createElement(NumberWallVisual, { visual, print: true }));
    expect(paper).not.toContain('url(#');
    expect([...paper.matchAll(/<text[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(['C', 'A', 'B', '15', '21', '21']);
  });

  it('names the bugs of the catalogue with exact numbers', () => {
    const ex = exOf(plusAufgabe(38, 27));
    expect(bugIdFor(ex, 55)).toBe('zehner-vergessen');
    expect(bugIdFor(ex, 515)).toBe('ziffern-reihung');
    expect(bugIdFor(exOf(lueckenAufgabe(38, 27, false)), 103)).toBe('platzhalter-summe');
    const wall = exOf(mauerAufgabe(12, 15, 23));
    if (wall.answer.kind !== 'multi') throw new Error('multi');
    expect(checkAnswer(wall.answer, { kind: 'multi', values: { a: '27', b: '38', c: '50' } }, wall.bugs).bugId).toBe('mauer-unten');
    expect(checkAnswer(wall.answer, { kind: 'multi', values: { a: '27', b: '38', c: '55' } }, wall.bugs).bugId).toBe('zehner-vergessen');
    const steps = exOf(schrittAufgabe(34, 25));
    if (steps.answer.kind !== 'multi') throw new Error('multi');
    expect(checkAnswer(steps.answer, { kind: 'multi', values: { zehner: '36', ziel: '41' } }, steps.bugs).bugId).toBe('ziffern-einzeln');
    const back = exOf(mauerRueckwaerts(12, 15, 23));
    if (back.answer.kind !== 'multi') throw new Error('multi');
    expect(back.answer.fields.map((f) => f.value)).toEqual([12, 38, 65]);
    expect(checkAnswer(back.answer, { kind: 'multi', values: { x: '42', b: '38', c: '65' } }, back.bugs).bugId).toBe('platzhalter-summe');
    const gleich = exOf(gleichAufgabe(38, 27));
    expect(gleich.expression).toBe('38 + 27 = 40 + □');
    expect(gleich.answer).toMatchObject({ value: 25 });
    expect(bugIdFor(gleich, 65)).toBe('gleichheit');
  });
});
