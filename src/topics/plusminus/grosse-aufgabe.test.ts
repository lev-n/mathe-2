import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise } from '../../core/types';
import { evalSide } from '../step-check';
import { einerAufgabe, grosseAufgabeSkill as skill, grosseLuecke, grosseWaehlen, kleineWaehlen, musterAufgabe, zehnerAufgabe } from './grosse-aufgabe';
import { MINUS_OP, PLUS_OP } from './rechnen';
import { atAb, bugIdFor, expectFieldsTrue, expectGapSolved, expectSolidTexts, expectTopicRules } from './test-utils';

describeSkill(skill, { minDistinct: 25 });

const exOf = (t: Omit<Exercise, 'topicId' | 'skillId' | 'stufe' | 'ab' | 'kmk' | 'srText'>): Exercise => ({ ...t, topicId: 'plusminus', skillId: skill.id, stufe: 1, ab: 1, kmk: skill.kmk, srText: 'x' });
/** The left side of the last 'x op y = □' in an expression. */
const grossTerm = (ex: Exercise) => /(\d+) ([+−]) (\d+) = □$/.exec(ex.expression!)!;

describe('plusminus.grosse-aufgabe', () => {
  it('numbers stay in 0–100, lines stay readable, one key per visible task', () => expectTopicRules(skill));

  it('Stufe 1: ones only, the ten stays; AB I shows the small task, AB II leaves it out, AB III asks for the gap', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(skill, ab, 1)) {
        const [, l, op, r] = grossTerm(ex);
        const [a, b] = [Number(l), Number(r)];
        expect(b).toBeLessThan(10);
        if (ex.answer.kind !== 'number') throw new Error(ex.key);
        expect(Math.floor(ex.answer.value! / 10)).toBe(Math.floor(a / 10));
        expect(ex.answer.value).toBe(op === '+' ? a + b : a - b);
        expect(ex.expression!.includes('also'), ex.key).toBe(ab === 1);
        expectSolidTexts(ex);
      }
    }
    for (const ex of atAb(skill, 3, 1)) {
      expectGapSolved(ex);
      expectSolidTexts(ex);
      const [, a, c] = /^(\d+) [+−] □ = (\d+)$/.exec(ex.expression!)!;
      expect(Math.floor(Number(a) / 10), ex.key).toBe(Math.floor(Number(c) / 10));
      expect(ex.answer).toMatchObject({ value: Math.abs(Number(a) - Number(c)) });
    }
  });

  it('Stufe 2: whole tens, the ones stay; AB I also shows a small task, AB III asks for the gap', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(skill, ab, 2)) {
        const [, l, op, r] = grossTerm(ex);
        const [a, b] = [Number(l), Number(r)];
        expect(b % 10).toBe(0);
        if (ex.answer.kind !== 'number') throw new Error(ex.key);
        expect(ex.answer.value! % 10).toBe(a % 10);
        expect(ex.answer.value).toBe(op === '+' ? a + b : a - b);
        expect(ex.answer.value).toBeLessThanOrEqual(100);
        if (ab === 2) expect(a % 10, ex.key).not.toBe(0);
        expectSolidTexts(ex);
      }
    }
    for (const ex of atAb(skill, 3, 2)) {
      expectGapSolved(ex);
      expectSolidTexts(ex);
      const value = (ex.answer as { value: number }).value;
      const m = /^□ [+−] (\d+) = \d+$/.exec(ex.expression!);
      // A missing start keeps its ones; a missing step is whole tens.
      if (m) expect(Number(m[1]) % 10, ex.key).toBe(0);
      else expect(value % 10, ex.key).toBe(0);
    }
  });

  it('the small task in the expression really holds', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of [...atAb(skill, 1, stufe), ...atAb(skill, 2, stufe)]) {
        const m = /^(\d+ [+−] \d+) = (\d+), also/.exec(ex.expression!);
        if (m) expect(evalSide(m[1])!.value, ex.key).toBe(Number(m[2]));
      }
    }
    expectGapSolved(exOf(einerAufgabe(64, PLUS_OP, 3, false)));
  });

  it('Stufe 3: AB I chooses the small task, AB II a rising pattern or the large task, AB III a falling pattern', () => {
    let choices = 0;
    for (const ex of atAb(skill, 1, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      expectSolidTexts(ex);
      choices++;
      const [, l, op, r] = grossTerm(ex);
      const [a, b] = [Number(l), Number(r)];
      const want = b % 10 === 0 ? `${Math.floor(a / 10)} ${op} ${b / 10}` : `${a % 10} ${op} ${b}`;
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(want);
      expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
    }
    expect(choices).toBeGreaterThan(0);

    let rising = 0;
    let large = 0;
    for (const ex of atAb(skill, 2, 3)) {
      expectSolidTexts(ex);
      if (ex.visual?.type === 'table') {
        rising++;
        const firsts = ex.visual.rows.map((row) => Number(row[0].split(' ')[0]));
        expect(firsts.map((x) => x - firsts[0])).toEqual([0, 10, 20, 30]);
        ex.visual.rows.slice(0, 3).forEach((row) => expect(evalSide(row[0])!.value).toBe(Number(row[1])));
        expect(ex.answer).toMatchObject({ value: evalSide(ex.visual.rows[3][0])!.value });
        expect(ex.visual.rows[3][1]).toBe('□');
      } else if (ex.answer.kind === 'choice') {
        large++;
        const [, x, op, y, wert] = /^(\d+) ([+−]) (\d+) = (\d+)$/.exec(ex.expression!)!;
        expect(evalSide(`${x} ${op} ${y}`)!.value, ex.key).toBe(Number(wert));
        const right = ex.answer.options[ex.answer.correct].label;
        const [, a, opR, b] = /^(\d+) ([+−]) (\d+)$/.exec(right)!;
        expect(opR, ex.key).toBe(op);
        const place = Number(b) % 10 === 0 ? Math.floor(Number(a) / 10) : Number(a) % 10;
        expect(place, ex.key).toBe(Number(x));
        expect(Number(b) % 10 === 0 ? Number(b) / 10 : Number(b), ex.key).toBe(Number(y));
        expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
      } else throw new Error(ex.key);
    }
    expect(rising).toBeGreaterThan(0);
    expect(large).toBeGreaterThan(0);

    let one = 0;
    let two = 0;
    for (const ex of atAb(skill, 3, 3)) {
      expectSolidTexts(ex);
      if (ex.visual?.type !== 'table') throw new Error(ex.key);
      const firsts = ex.visual.rows.map((row) => Number(row[0].split(' ')[0]));
      firsts.slice(1).forEach((x, i) => expect(firsts[i] - x, ex.key).toBe(10));
      const given = ex.visual.rows.filter((row) => row[1] !== '□');
      expect(given).toHaveLength(3);
      given.forEach((row) => expect(evalSide(row[0])!.value).toBe(Number(row[1])));
      const open = ex.visual.rows.filter((row) => row[1] === '□').map((row) => evalSide(row[0])!.value);
      if (ex.answer.kind === 'multi') {
        two++;
        expectFieldsTrue(ex);
        expect(ex.answer.fields.map((f) => f.value)).toEqual(open);
      } else {
        one++;
        expect(ex.answer).toMatchObject({ value: open[0] });
      }
    }
    expect(one).toBeGreaterThan(0);
    expect(two).toBeGreaterThan(0);
  });

  it('the choice of the small task has one right option: no Tauschaufgabe of it, no result below 0', () => {
    const sorted = (label: string) => label.split(' ').sort().join(' ');
    for (const op of [PLUS_OP, MINUS_OP]) {
      for (let a = 11; a <= 89; a++) {
        if (a % 10 === 0 || Math.floor(a / 10) === a % 10) continue;
        const [z, e] = [Math.floor(a / 10), a % 10];
        const bs = op === PLUS_OP ? [...Array.from({ length: 9 - e }, (_, i) => i + 1), ...Array.from({ length: 9 - z }, (_, i) => (i + 1) * 10)] : [...Array.from({ length: e - 1 }, (_, i) => i + 1), ...Array.from({ length: z - 1 }, (_, i) => (i + 1) * 10)];
        for (const b of bs) {
          const ex = kleineWaehlen(createRng(a * b), a, op, b);
          if (ex.answer.kind !== 'choice') throw new Error(ex.key);
          const { options, correct } = ex.answer;
          expect(options.length, ex.key).toBeGreaterThanOrEqual(3);
          options.forEach((o, i) => {
            expect(evalSide(o.label)!.value, `${ex.key} ${o.label}`).toBeGreaterThanOrEqual(0);
            if (i !== correct) expect(sorted(o.label), `${ex.key} ${o.label}`).not.toBe(sorted(options[correct].label));
          });
        }
      }
    }
    const labels = (t: ReturnType<typeof kleineWaehlen>) => (t.answer.kind === 'choice' ? t.answer.options.map((o) => o.label) : []);
    expect(labels(kleineWaehlen(createRng(1), 71, PLUS_OP, 7))).not.toContain('7 + 1');
    expect(labels(kleineWaehlen(createRng(1), 45, PLUS_OP, 4))).not.toContain('4 + 5');
  });

  it('"Nimm auch die …" names a number of the right option: the tens form takes the digit, not the whole ten', () => {
    const whyWrong = (a: number, b: number, label: string) => {
      const ex = kleineWaehlen(createRng(a * b), a, PLUS_OP, b);
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      return ex.answer.options.find((o) => o.label === label)?.whyWrong;
    };
    expect(whyWrong(57, 10, '5 + 7')).toBe('5 und 7 stecken beide in 57. Nimm auch die 1.');
    expect(whyWrong(75, 20, '7 + 5')).toBe('7 und 5 stecken beide in 75. Nimm auch die 2.');
    expect(whyWrong(64, 3, '6 + 4')).toBe('6 und 4 stecken beide in 64. Nimm auch die 3.');
    let named = 0;
    for (const ex of atAb(skill, 1, 3, 1000)) {
      if (ex.answer.kind !== 'choice') continue;
      const right = ex.answer.options[ex.answer.correct].label.split(' ');
      for (const o of ex.answer.options) {
        const m = /Nimm auch die (\d+)\.$/.exec(o.whyWrong ?? '');
        if (!m) continue;
        named++;
        expect(right, `${ex.key}: ${o.whyWrong}`).toContain(m[1]);
      }
    }
    expect(named).toBeGreaterThan(0);
  });

  it('names the bugs of the catalogue with exact numbers', () => {
    expect(bugIdFor(exOf(einerAufgabe(64, PLUS_OP, 3, false)), 94)).toBe('stelle-verwechselt');
    expect(bugIdFor(exOf(zehnerAufgabe(34, PLUS_OP, 20, false)), 36)).toBe('stelle-verwechselt');
    expect(bugIdFor(exOf(zehnerAufgabe(40, PLUS_OP, 30, false)), 7)).toBe('nur-zehner-gezaehlt');
    expect(bugIdFor(exOf(einerAufgabe(67, MINUS_OP, 3, false)), 4)).toBe('kleine-aufgabe-genannt');
    const muster = exOf(musterAufgabe(3, PLUS_OP, 4));
    expect(bugIdFor(muster, 27)).toBe('muster-letzte');
    expect(bugIdFor(muster, 28)).toBe('muster-schritt');
    expect(kleineWaehlen(createRng(1), 64, PLUS_OP, 3).steps[0]).toBe('Kleine Aufgabe: 4 + 3 = 7');
    expect(bugIdFor(exOf(grosseLuecke(34, PLUS_OP, 20, false)), 2)).toBe('stelle-verwechselt');
    expect(bugIdFor(exOf(grosseLuecke(64, PLUS_OP, 3, false)), 30)).toBe('stelle-verwechselt');
    expect(bugIdFor(exOf(grosseLuecke(64, PLUS_OP, 3, false)), 131)).toBe('platzhalter-summe');
    const fallend = exOf(musterAufgabe(63, PLUS_OP, 4, 'ab'));
    expect(fallend.answer).toMatchObject({ value: 37 });
    expect(bugIdFor(fallend, 47)).toBe('muster-letzte');
    expect(bugIdFor(fallend, 46)).toBe('muster-schritt');
  });

  it('the large task to a small one has one right option: the small task fits no wrong option', () => {
    const labels = (t: ReturnType<typeof grosseWaehlen>) => (t.answer.kind === 'choice' ? t.answer.options.map((o) => o.label) : []);
    expect(labels(grosseWaehlen(createRng(1), 64, PLUS_OP, 3)).sort()).toEqual(['46 + 3', '64 + 3', '64 + 30', '64 − 3'].sort());
    const t = grosseWaehlen(createRng(1), 64, PLUS_OP, 30);
    if (t.answer.kind !== 'choice') throw new Error(t.key);
    expect(t.expression).toBe('6 + 3 = 9');
    expect(t.answer.options[t.answer.correct].label).toBe('64 + 30');
  });
});
