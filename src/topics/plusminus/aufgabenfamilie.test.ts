import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise } from '../../core/types';
import { evalSide } from '../step-check';
import { aufgabenfamilieSkill as skill, familieFremd, familieLuecke, familieSchreiben, gleichheitAufgabe, stimmtDas, umkehrWaehlen } from './aufgabenfamilie';
import { atAb, bugIdFor, expectFieldsTrue, expectGapSolved, expectSolidTexts, expectTopicRules } from './test-utils';

describeSkill(skill, { minDistinct: 25 });

const exOf = (t: Omit<Exercise, 'topicId' | 'skillId' | 'stufe' | 'ab' | 'kmk' | 'srText'>): Exercise => ({ ...t, topicId: 'plusminus', skillId: skill.id, stufe: 1, ab: 1, kmk: skill.kmk, srText: 'x' });
const holds = (label: string) => {
  const [l, r] = label.split(' = ');
  return evalSide(l)!.value === Number(r);
};
const numbersOf = (label: string) => [...label.matchAll(/\d+/g)].map((m) => Number(m[0]));

describe('plusminus.aufgabenfamilie', () => {
  it('numbers stay in 0–100, lines stay readable, one key per visible task', () => expectTopicRules(skill));

  it('AB I and II write or choose: Stufe 1 up to 20, Stufe 2 up to 100 with two-digit numbers', () => {
    for (const [stufe, ab, min, max] of [[1, 1, 5, 10], [1, 2, 11, 20], [2, 1, 22, 100], [2, 2, 22, 100]] as const) {
      for (const ex of atAb(skill, ab, stufe)) {
        expectSolidTexts(ex);
        if (ex.visual?.type !== 'field') throw new Error(ex.key);
        const { filled: a, second: b } = ex.visual;
        const c = a + b!;
        expect(a).not.toBe(b);
        expect(c, ex.key).toBeGreaterThanOrEqual(min);
        expect(c, ex.key).toBeLessThanOrEqual(max);
        if (stufe === 2) {
          expect(a, ex.key).toBeGreaterThan(10);
          expect(b!, ex.key).toBeGreaterThan(10);
          // AB I without a new ten, AB II with one.
          expect((a % 10) + (b! % 10) >= 10, ex.key).toBe(ab === 2);
        }
        if (ex.answer.kind === 'multi') {
          expectFieldsTrue(ex);
          expect(ex.answer.fields).toHaveLength(3);
        } else if (ex.answer.kind === 'choice') {
          const family = new Set([a, b!, c]);
          ex.answer.options.forEach((o, i) => {
            const inFamily = numbersOf(o.label).every((n) => family.has(n));
            expect(holds(o.label), `${ex.key} ${o.label}`).toBe(true);
            expect(inFamily, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct);
          });
        } else throw new Error(ex.key);
      }
    }
  });

  it('Stufe 1 and 2, AB III: a missing number or the task that does not belong; the □ moves only on Stufe 2', () => {
    for (const [stufe, max] of [[1, 20], [2, 100]] as const) {
      const kinds = new Set<string>();
      for (const ex of atAb(skill, 3, stufe)) {
        expectSolidTexts(ex);
        if (ex.answer.kind === 'number') {
          kinds.add('gap');
          expectGapSolved(ex);
          if (stufe === 1) expect(ex.expression, ex.key).toMatch(/^\d+ [+−] □ = \d+$/);
          const numbers = numbersOf(ex.expression!);
          expect(Math.max(...numbers, ex.answer.value!), ex.key).toBeLessThanOrEqual(max);
        } else if (ex.answer.kind === 'choice') {
          kinds.add('fremd');
          const [a, b, c] = numbersOf(ex.prompt);
          const family = new Set([a, b, c]);
          expect(a + b, ex.key).toBe(c);
          ex.answer.options.forEach((o, i) => {
            expect(holds(o.label), `${ex.key} ${o.label}`).toBe(true);
            expect(numbersOf(o.label).every((n) => family.has(n)), `${ex.key} ${o.label}`).toBe(i !== (ex.answer as { correct: number }).correct);
          });
        } else throw new Error(ex.key);
      }
      expect([...kinds].sort()).toEqual(['fremd', 'gap']);
    }
  });

  it('Stufe 1 stays up to 20, in the wrong options too', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(skill, ab, 1, 500)) {
        const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [];
        for (const text of [ex.prompt, ex.expression ?? '', ...options]) for (const n of numbersOf(text)) expect(n, `${ex.key}: ${text}`).toBeLessThanOrEqual(20);
      }
    }
  });

  it('Stufe 3: AB I the Umkehraufgabe, AB II Stimmt, AB III gleichheit; each recomputes', () => {
    for (const ex of atAb(skill, 1, 3)) {
      expectSolidTexts(ex);
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const right = ex.answer.options[ex.answer.correct].label;
      expect(holds(right)).toBe(true);
      expect(numbersOf(right).sort()).toEqual(numbersOf(ex.expression!).sort());
      expect(right.includes('+')).toBe(ex.expression!.includes('−'));
    }
    for (const ex of atAb(skill, 2, 3)) {
      expectSolidTexts(ex);
      if (ex.answer.kind !== 'choice' || ex.answer.options.length !== 2) throw new Error(ex.key);
      expect(ex.answer.options[ex.answer.correct].label).toBe(holds(ex.expression!) ? 'Stimmt' : 'Stimmt nicht');
    }
    for (const ex of atAb(skill, 3, 3)) {
      expectSolidTexts(ex);
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      const m = /(\d+) \+ (\d+) = (\d+|□) \+ (\d+|□)/.exec(ex.expression!)!;
      const s = Number(m[1]) + Number(m[2]);
      const given = m[3] === '□' ? Number(m[4]) : Number(m[3]);
      expect(ex.answer.fields.map((f) => f.value)).toEqual([s, s - given]);
      expect(s - given).toBeGreaterThan(0);
    }
  });

  it('the plus check of a shown calculation stays up to 100', () => {
    for (const ex of atAb(skill, 2, 3, 2000)) {
      if (ex.answer.kind !== 'choice' || ex.answer.options.length !== 2) continue;
      const [, , b, shown] = /(\d+) − (\d+) = (\d+)/.exec(ex.expression!)!;
      expect(Number(shown) + Number(b), ex.key).toBeLessThanOrEqual(100);
    }
  });

  it('below Stufe 3: no two-sided equality, no shown error', () => {
    for (const stufe of [1, 2] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(skill, ab, stufe, 500)) expect(ex.key, ex.key).not.toMatch(/:gleich:|:stimmt:|:umkehr:/);
      }
    }
  });

  it('no distractor ends in the number it "does not lead back to"', () => {
    const ex = umkehrWaehlen(createRng(1), 15, 30, 'plus');
    if (ex.answer.kind !== 'choice') throw new Error('choice');
    expect(ex.answer.options.map((o) => o.label)).not.toContain('30 − 15 = 15');
    let tasks = 0;
    for (const task of atAb(skill, 1, 3, 3000)) {
      if (task.answer.kind !== 'choice' || task.answer.options.length === 2) continue;
      const zurueck = /zurück zur (\d+)\./.exec(task.steps[2] as string)![1];
      for (const o of task.answer.options) if (o.whyWrong) expect(o.label.split(' = ')[1], `${task.key} ${o.label}`).not.toBe(zurueck);
      tasks++;
    }
    expect(tasks).toBeGreaterThan(0);
    for (const [a, b] of [[15, 30], [22, 44], [12, 24], [27, 54], [33, 66]]) {
      for (const form of ['plus', 'minus'] as const) {
        const t = umkehrWaehlen(createRng(a), a, b, form);
        if (t.answer.kind !== 'choice') throw new Error('choice');
        const zurueck = String(form === 'plus' ? a : a + b);
        for (const o of t.answer.options) if (o.whyWrong) expect(o.label.split(' = ')[1], `${t.key} ${o.label}`).not.toBe(zurueck);
        expect(t.answer.options.length, t.key).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('names the bugs of the catalogue with exact numbers', () => {
    const gleich = exOf(gleichheitAufgabe(3, 7, 5, true));
    if (gleich.answer.kind !== 'multi') throw new Error('multi');
    expect(gleich.expression).toBe('3 + 7 = □ + 5');
    expect(checkAnswer(gleich.answer, { kind: 'multi', values: { links: '10', luecke: '10' } }, gleich.bugs).bugId).toBe('gleichheit');
    expect(checkAnswer(gleich.answer, { kind: 'multi', values: { links: '10', luecke: '15' } }, gleich.bugs).bugId).toBe('gleichheit');
    const family = exOf(familieSchreiben(5, 3, 'plus'));
    if (family.answer.kind !== 'multi') throw new Error('multi');
    expect(checkAnswer(family.answer, { kind: 'multi', values: { tausch: '8', weg: '11', anders: '3' } }, family.bugs).bugId).toBe('plus-minus-getauscht');
    expect(checkAnswer(family.answer, { kind: 'multi', values: { tausch: '8', weg: '3', anders: '5' } }, family.bugs).bugId).toBe('aufgabe-gespiegelt');
    const gap = exOf(familieLuecke(5, 3, 'minus-hinten'));
    expect(gap.expression).toBe('8 − □ = 5');
    expect(gap.answer).toMatchObject({ value: 3 });
    expect(bugIdFor(gap, 5)).toBe('aufgabe-gespiegelt');
    expect(bugIdFor(gap, 13)).toBe('plus-minus-getauscht');
  });

  it('the field texts of gleichheit read well with the spoken "Lücke"', () => {
    const task = gleichheitAufgabe(5, 7, 11, true);
    if (task.answer.kind !== 'multi') throw new Error('multi');
    expect(task.answer.fields.map((f) => f.before)).toEqual(['Links ergibt', 'Die fehlende Zahl ist']);
  });

  it('the task that does not belong holds, and has a number from outside', () => {
    const t = familieFremd(createRng(1), 5, 3);
    if (t.answer.kind !== 'choice') throw new Error(t.key);
    expect(t.answer.options[t.answer.correct].label).toBe('8 + 3 = 11');
    expect(t.answer.options).toHaveLength(4);
  });

  it('an Umkehraufgabe leads back; a wrong calculation is named', () => {
    const umkehr = umkehrWaehlen(createRng(5), 35, 27, 'minus');
    if (umkehr.answer.kind !== 'choice') throw new Error('choice');
    expect(umkehr.answer.options[umkehr.answer.correct].label).toBe('35 + 27 = 62');
    const nein = stimmtDas(createRng(5), 35, 27, 45);
    if (nein.answer.kind !== 'choice') throw new Error('choice');
    expect(nein.answer.options[nein.answer.correct].label).toBe('Stimmt nicht');
    expect(nein.answer.options.map((o) => o.label)).toEqual(['Stimmt', 'Stimmt nicht']);
  });
});
