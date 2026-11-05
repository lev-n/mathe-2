import { describe, expect, it } from 'vitest';
import { checkAnswer, formatAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { STUFEN } from '../../core/types';
import type { Exercise, VisualOf } from '../../core/types';
import { atAb, kindOf, numberValue, numbersIn } from './test-helpers';
import { zweiSchritteSkill } from './zwei-schritte';

describeSkill(zweiSchritteSkill, { minDistinct: 40 });

const fields = (ex: Exercise) => {
  if (ex.answer.kind !== 'multi') throw new Error(ex.key);
  return Object.fromEntries(ex.answer.fields.map((f) => [f.id, f.value]));
};

describe('sachaufgaben.zwei-schritte', () => {
  it('is an Extra, and every item is a Knobelaufgabe', () => {
    expect(zweiSchritteSkill.optional).toBe('extra');
    for (const stufe of STUFEN) for (const ab of [1, 2, 3] as const) for (const ex of atAb(zweiSchritteSkill, stufe, ab, 30)) expect(ex.knobel, ex.key).toBe(true);
  });
});

describe('sachaufgaben.zwei-schritte, Stufe 1: two additions, ≤ 20', () => {
  it('AB I: up to 10; AB II: over the ten in one of the steps', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(zweiSchritteSkill, 1, ab, 300)) {
        const [a, b, c] = numbersIn(ex.context!);
        expect(numberValue(ex), ex.key).toBe(a + b + c);
        if (ab === 1) expect(numberValue(ex), ex.key).toBeLessThanOrEqual(10);
        else {
          expect(numberValue(ex), ex.key).toBeLessThanOrEqual(20);
          expect(numberValue(ex), ex.key).toBeGreaterThan(10);
          expect(a + b !== 10, ex.key).toBe(true);
        }
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(a + b) }, ex.bugs).bugId).toBe('erster-schritt');
      }
    }
  });

  it('AB I and II: nobody gives something to themselves', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(zweiSchritteSkill, 1, ab, 300)) {
        const m = /^(\p{L}+) hat .* von (\p{L}+) und \d+ von (\p{L}+)\.$/u.exec(ex.context!);
        if (m) expect(new Set([m[1], m[2], m[3]]).size, ex.context).toBe(3);
      }
    }
  });

  it('AB III: "mehr" and "zusammen", or the second step is asked, recomputed, up to 20, only additions in the story', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(zweiSchritteSkill, 1, 3, 400)) {
      const kind = kindOf(ex);
      kinds.add(kind);
      const n = numbersIn(ex.context!);
      if (kind === 'mehr-zusammen') {
        const [a, b] = n;
        expect(numberValue(ex), ex.key).toBe(a + a + b);
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(a + b) }, ex.bugs).bugId, ex.key).toBe('erster-schritt');
      } else {
        const [a, b, end] = n;
        expect(numberValue(ex), ex.key).toBe(end - a - b);
        expect(end, ex.key).toBeLessThanOrEqual(20);
      }
      expect(numberValue(ex)).toBeLessThanOrEqual(20);
    }
    expect([...kinds].sort()).toEqual(['mehr-zusammen', 'zweite-fehlt']);
  });
});

describe('sachaufgaben.zwei-schritte, Stufe 2: plus then minus, ≤ 100', () => {
  it('AB I: a field for each step, within a ten', () => {
    for (const ex of atAb(zweiSchritteSkill, 2, 1, 300)) {
      const [a, b, c] = numbersIn(ex.context!);
      expect(fields(ex), ex.key).toEqual({ erst: a + b, ende: a + b - c });
      expect(a + b).toBeLessThanOrEqual(100);
      expect(a % 10 + b % 10, ex.key).toBeLessThan(10);
      expect((a + b) % 10, ex.key).toBeGreaterThanOrEqual(c);
      const r = checkAnswer(ex.answer, { kind: 'multi', values: { erst: String(a + b), ende: String(a + b) } }, ex.bugs);
      expect(r.bugId, ex.key).toBe('erster-schritt');
    }
  });

  it('AB I: the last step does not call the state after the first step the start', () => {
    for (const ex of atAb(zweiSchritteSkill, 2, 1, 100)) {
      const [a, b] = numbersIn(ex.context!);
      const last = ex.steps[ex.steps.length - 1] as string;
      expect(last, ex.key).toMatch(new RegExp(`^Nach dem ersten Schritt sind es ${a + b} `));
    }
  });

  it('AB II: one number, over a ten', () => {
    for (const ex of atAb(zweiSchritteSkill, 2, 2, 300)) {
      expect(ex.answer.kind, ex.key).toBe('number');
      const [a, b, c] = numbersIn(ex.context!);
      expect(numberValue(ex), ex.key).toBe(a + b - c);
      expect(a + b).toBeLessThanOrEqual(100);
      expect(a % 10 + b % 10, ex.key).toBeGreaterThan(10);
      expect(checkAnswer(ex.answer, { kind: 'number', text: String(a + b) }, ex.bugs).bugId, ex.key).toBe('erster-schritt');
    }
  });

  it('AB III: the start or the second change is asked, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(zweiSchritteSkill, 2, 3, 400)) {
      const kind = kindOf(ex);
      kinds.add(kind);
      const n = numbersIn(ex.context!);
      if (kind === 'anfang-fehlt') {
        const [b, c, end] = n;
        expect(numberValue(ex), ex.key).toBe(end + c - b);
      } else {
        const [a, b, end] = n;
        expect(numberValue(ex), ex.key).toBe(a + b - end);
      }
      expect(numberValue(ex)).toBeGreaterThanOrEqual(2);
      expect(numberValue(ex)).toBeLessThanOrEqual(100);
    }
    expect([...kinds].sort()).toEqual(['anfang-fehlt', 'zweite-fehlt-minus']);
  });
});

describe('sachaufgaben.zwei-schritte, Stufe 3: buy two things, then Rückgeld', () => {
  it('AB I: a field for each step, and the picture shows the money paid', () => {
    for (const ex of atAb(zweiSchritteSkill, 3, 1, 300)) {
      const [p, q, paid] = numbersIn(ex.context!);
      expect((ex.visual as VisualOf<'money'>).items.reduce((s, c) => s + c, 0) / 100, ex.key).toBe(paid);
      expect(paid).toBe(20);
      expect(p + q, ex.key).toBeGreaterThan(10);
      expect(fields(ex), ex.key).toEqual({ kosten: p + q, zurueck: paid - p - q });
    }
  });

  it('AB I: the solution line of the two fields reads as one sentence', () => {
    for (const ex of atAb(zweiSchritteSkill, 3, 1, 100)) {
      const [p, q, paid] = numbersIn(ex.context!);
      expect(formatAnswer(ex.answer), ex.key).toMatch(new RegExp(`^Beides kostet ${p + q} €, \\p{L}+ bekommt ${paid - p - q} € zurück\\.$`, 'u'));
    }
  });

  it('AB II: one number, from 50 €; the sum of the prices as an answer gets its hint', () => {
    for (const ex of atAb(zweiSchritteSkill, 3, 2, 300)) {
      const [p, q, paid] = numbersIn(ex.context!);
      expect(paid).toBe(50);
      expect(numberValue(ex), ex.key).toBe(paid - p - q);
      const r = checkAnswer(ex.answer, { kind: 'number', text: String(p + q) }, ex.bugs);
      if (p + q !== paid - p - q) expect(r.bugId, ex.key).toBe('rueckgeld-preis');
    }
  });

  it('AB III: the second price or the money at the start is asked, recomputed; nobody pays with a sum that is no note', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(zweiSchritteSkill, 3, 3, 400)) {
      const kind = kindOf(ex);
      kinds.add(kind);
      const n = numbersIn(ex.context!);
      if (kind === 'preis-fehlt') {
        const [p, paid, back] = n;
        expect(numberValue(ex), ex.key).toBe(paid - back - p);
        expect(numberValue(ex), 'a real price').toBeGreaterThanOrEqual(3);
      } else {
        const [p, q, back] = n;
        expect(numberValue(ex), ex.key).toBe(p + q + back);
        expect(ex.prompt, ex.key).toMatch(/am Anfang\?$/);
        expect(ex.context, ex.key).not.toMatch(/bezahlt|zurück/);
      }
    }
    expect([...kinds].sort()).toEqual(['anfang-fehlt', 'preis-fehlt']);
  });
});
