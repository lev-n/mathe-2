import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { rechnungFindenSkill } from './rechnung-finden';
import { atAb, correctLabel, evalTerm, kindOf, numbersIn } from './test-helpers';

describeSkill(rechnungFindenSkill, { minDistinct: 40 });

const whyWrongOf = (ex: Exercise, sign: string) => {
  if (ex.answer.kind !== 'choice') throw new Error(ex.key);
  return ex.answer.options.find((o, i) => i !== (ex.answer.kind === 'choice' ? ex.answer.correct : -1) && o.label.split(' ')[1] === sign)?.whyWrong;
};
const optionCount = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options.length : 0);
const PLUS_STORIES = ['halle', 'regal', 'kastanien', 'fehlen-beide', 'frei-beide'];

describe('sachaufgaben.rechnung-finden, Stufe 1: dazu oder weg, ≤ 20, two options', () => {
  it('has two options at every AB and stays up to 20', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(rechnungFindenSkill, 1, ab, 200)) {
        expect(optionCount(ex), ex.key).toBe(2);
        numbersIn([ex.context, ex.prompt].join(' ')).forEach((n) => expect(n, ex.key).toBeLessThanOrEqual(20));
      }
    }
  });

  it('AB I: the word "dazu" or "weg" stands in the story and decides', () => {
    for (const ex of atAb(rechnungFindenSkill, 1, 1, 300)) {
      expect(kindOf(ex)).toBe('dazu-weg');
      const dazu = /dazu/.test(ex.context!);
      expect(dazu || /weg/.test(ex.context!), ex.context).toBe(true);
      expect(correctLabel(ex), ex.context).toContain(dazu ? '+' : '−');
      expect(numbersIn(correctLabel(ex))).toEqual(numbersIn(ex.context!));
      expect(evalTerm(correctLabel(ex))).toBeLessThanOrEqual(20);
    }
  });

  it('AB II: another verb decides, over the ten', () => {
    for (const ex of atAb(rechnungFindenSkill, 1, 2, 300)) {
      expect(kindOf(ex)).toBe('verben');
      expect(ex.context, ex.key).not.toMatch(/dazu|\bweg\b/);
      const plus = /findet|backt|pflückt|steigen ein/.test(ex.context!);
      expect(correctLabel(ex), ex.context).toContain(plus ? '+' : '−');
      const [a, b] = numbersIn(correctLabel(ex));
      expect(plus ? a % 10 + b % 10 > 10 || a + b > 10 : a > 10 && a - b < 10, ex.key).toBe(true);
      expect(evalTerm(correctLabel(ex))).toBeLessThanOrEqual(20);
    }
  });

  it('AB II: both calculations can be done, so the story decides and not the impossible one', () => {
    for (const ex of atAb(rechnungFindenSkill, 1, 2, 800)) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      for (const o of ex.answer.options) {
        const [x, sign, y] = o.label.split(' ');
        if (sign === '−') expect(Number(x), `${ex.key}: ${o.label}`).toBeGreaterThan(Number(y));
      }
    }
  });

  it('T13: "noch" stands in no story of AB II, as it came only with plus', () => {
    for (const ex of atAb(rechnungFindenSkill, 1, 2, 400)) expect(ex.context, ex.key).not.toMatch(/\bnoch\b/);
  });

  it('AB III: from the calculation to the story; the right story has the sign of the calculation', () => {
    for (const ex of atAb(rechnungFindenSkill, 1, 3, 300)) {
      expect(kindOf(ex)).toBe('zur-rechnung');
      const plus = ex.prompt.includes('+');
      expect(correctLabel(ex), ex.key).toMatch(plus ? /findet|backt|pflückt|steigen ein/ : /verliert|isst|verschenkt|steigen aus/);
      expect(numbersIn(correctLabel(ex))).toEqual(numbersIn(ex.prompt));
    }
  });
});

describe('sachaufgaben.rechnung-finden, Stufe 2: Vereinigen and Ergänzen, ≤ 100', () => {
  it('AB I: two options, whole tens', () => {
    for (const ex of atAb(rechnungFindenSkill, 2, 1, 300)) {
      expect(kindOf(ex)).toBe('ab2-direkt');
      expect(optionCount(ex), ex.key).toBe(2);
      numbersIn(ex.context!).forEach((n) => expect(n % 10, ex.key).toBe(0));
      expect(evalTerm(correctLabel(ex))).toBeLessThanOrEqual(100);
    }
  });

  it('AB II: three options; a keyword does not predict the operation: "mehr" goes with minus (T13)', () => {
    const exercises = atAb(rechnungFindenSkill, 2, 2, 400);
    const withMehr = exercises.filter((e) => /\bmehr\b/.test(e.context!));
    expect(withMehr.length).toBeGreaterThan(0);
    for (const ex of withMehr) expect(correctLabel(ex), ex.context).toContain('−');
    for (const ex of exercises) {
      expect(optionCount(ex), ex.key).toBe(3);
      expect(numbersIn(correctLabel(ex)).sort((a, b) => a - b)).toEqual(numbersIn(ex.context!).sort((a, b) => a - b));
      expect(evalTerm(correctLabel(ex))).toBeLessThanOrEqual(100);
      expect(evalTerm(correctLabel(ex))).toBeGreaterThan(0);
    }
    const signs = new Set(exercises.map((e) => correctLabel(e).split(' ')[1]));
    expect([...signs].sort()).toEqual(['+', '−']);
  });

  it('AB II: in a story with a gap, the wrong plus says what is already counted', () => {
    const expected: Record<string, RegExp> = { sticker: /Ziel/, plaetze: /schon auf den Plätzen/, seiten: /schon zum Buch/, mehr: /Unterschied/ };
    const seen = new Set<string>();
    for (const ex of atAb(rechnungFindenSkill, 2, 2, 800)) {
      const id = ex.key.split(':')[3];
      if (!(id in expected)) continue;
      seen.add(id);
      expect(whyWrongOf(ex, '+'), ex.key).toMatch(expected[id]);
    }
    expect(seen.size).toBe(4);
  });

  it('T13: "alle", "fehlenden" and "freien" in the question do not predict the operation (at least a quarter of each sign)', () => {
    const items = [...atAb(rechnungFindenSkill, 2, 1, 1000), ...atAb(rechnungFindenSkill, 2, 2, 1000)];
    for (const word of [/\balle\b/, /\bfehlenden\b/, /\bfreien\b/]) {
      const asked = items.filter((ex) => word.test(ex.prompt));
      expect(asked.length, String(word)).toBeGreaterThan(0);
      const plus = asked.filter((ex) => correctLabel(ex).includes('+')).length / asked.length;
      // The sign of a gap story is in the calculation: small + □ = large is no plus.
      expect(plus, String(word)).toBeGreaterThanOrEqual(0.25);
      expect(plus, String(word)).toBeLessThanOrEqual(0.75);
    }
  });

  it('AB III: the word points the other way, or the gap calculation fits the story', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(rechnungFindenSkill, 2, 3, 500)) {
      kinds.add(kindOf(ex));
      const [x, y] = numbersIn(ex.context!);
      const [small, large] = [Math.min(x, y), Math.max(x, y)];
      if (kindOf(ex) === 'falle') {
        const together = /alle/.test(ex.prompt);
        expect(ex.context, ex.key).toMatch(together ? /weniger/ : /mehr/);
        expect(correctLabel(ex), ex.key).toBe(together ? `${large} + ${small}` : `${large} − ${small}`);
      } else {
        expect(correctLabel(ex), ex.key).toBe(PLUS_STORIES.includes(ex.key.split(':')[3]) ? `${large} + ${small} = □` : `${small} + □ = ${large}`);
      }
    }
    expect([...kinds].sort()).toEqual(['falle', 'luecke']);
  });
});

describe('sachaufgaben.rechnung-finden, Stufe 3: all four operations and which question fits', () => {
  for (const [ab, kind] of [[1, 'vier'], [2, 'vier-indirekt']] as const) {
    it(`AB ${ab}: all four operations occur with four options; groups fit, division is exact`, () => {
      const signs = new Set<string>();
      for (const ex of atAb(rechnungFindenSkill, 3, ab, 500)) {
        expect(kindOf(ex)).toBe(kind);
        const label = correctLabel(ex);
        const sign = label.split(' ')[1];
        signs.add(sign);
        if (/In jede[rs]? /.test(ex.context!)) expect(['·', ':']).toContain(sign);
        if (sign === ':') expect(Number.isInteger(evalTerm(label)), label).toBe(true);
        if (sign === '·') {
          expect(evalTerm(label)).toBeLessThanOrEqual(100);
          expect(label, 'two groups of 2 would allow 2 + 2 as well').not.toBe('2 · 2');
        }
        expect(optionCount(ex)).toBe(4);
      }
      expect([...signs].sort()).toEqual(['+', ':', '·', '−']);
    });
  }

  it('AB I: on a story with equal groups, the wrong mal says why it does not fit', () => {
    const teilen = atAb(rechnungFindenSkill, 3, 1, 800).filter((e) => correctLabel(e).includes(':'));
    expect(teilen.length).toBeGreaterThan(0);
    for (const ex of teilen) {
      expect(whyWrongOf(ex, '·'), ex.key).toMatch(/^Die Kekse sind schon alle da\./);
      expect(ex.hints, ex.key).not.toContain('Schau: Gibt es gleich große Gruppen?');
      expect(whyWrongOf(ex, '+'), ex.key).not.toMatch(/wirklich/);
      expect(whyWrongOf(ex, '−'), ex.key).not.toMatch(/wirklich/);
    }
  });

  it('AB I: the wrong mal keeps "gleich große Gruppen" where there are no groups', () => {
    const noGroups = atAb(rechnungFindenSkill, 3, 1, 800).filter((e) => /[+−]/.test(correctLabel(e)));
    expect(noGroups.length).toBeGreaterThan(0);
    for (const ex of noGroups) expect(whyWrongOf(ex, '·'), ex.key).toBe('Mal geht nur bei gleich großen Gruppen.');
  });

  it('AB II: no word "dazu" or "weg": the question names the goal', () => {
    for (const ex of atAb(rechnungFindenSkill, 3, 2, 500)) {
      expect(ex.context, ex.key).not.toMatch(/\bdazu\b|\bweg\b/);
      expect(ex.prompt, ex.key).toMatch(/^Welche Rechnung findet /);
    }
  });

  it('AB III: the question fits the calculation or the numbers', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(rechnungFindenSkill, 3, 3, 500)) {
      kinds.add(kindOf(ex));
      if (kindOf(ex) === 'frage') expect(correctLabel(ex), ex.key).toMatch(ex.prompt.includes('+') ? /zusammen/ : /mehr/);
      if (kindOf(ex) === 'frage-gruppen') expect(correctLabel(ex), ex.key).toMatch(ex.prompt.includes('·') ? /Äpfel hat/ : /bekommt jedes Kind/);
      if (kindOf(ex) === 'frage-geschichte') expect(correctLabel(ex), ex.key).toMatch(/zusammen|mehr als/);
      expect(optionCount(ex)).toBe(4);
    }
    expect([...kinds].sort()).toEqual(['frage', 'frage-geschichte', 'frage-gruppen']);
  });
});
