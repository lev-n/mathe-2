import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { VisualOf } from '../../core/types';
import { mitGroessenSkill } from './mit-groessen';
import { atAb, kindOf, numberValue, numbersIn } from './test-helpers';

describeSkill(mitGroessenSkill, { minDistinct: 40 });

describe('sachaufgaben.mit-groessen, Stufe 1: whole euros, ≤ 20 €', () => {
  it('AB I: within a ten, recomputed; the money in the picture repeats the story', () => {
    for (const ex of atAb(mitGroessenSkill, 1, 1, 300)) {
      const [x, y] = numbersIn(ex.context!);
      const plus = kindOf(ex) !== 'kaufen';
      expect(numberValue(ex), ex.key).toBe(plus ? x + y : x - y);
      expect(numberValue(ex)).toBeLessThanOrEqual(20);
      expect(plus ? x % 10 + y % 10 <= 10 : x % 10 >= y % 10, ex.key).toBe(true);
      const shown = (ex.visual as VisualOf<'money'>).items.reduce((s, c) => s + c, 0) / 100;
      expect(shown, ex.key).toBe(kindOf(ex) === 'preise' ? x + y : x);
    }
  });

  it('AB II: over the ten, recomputed, without a picture', () => {
    for (const ex of atAb(mitGroessenSkill, 1, 2, 300)) {
      const [x, y] = numbersIn(ex.context!);
      const plus = kindOf(ex) !== 'kaufen';
      expect(numberValue(ex), ex.key).toBe(plus ? x + y : x - y);
      expect(Math.max(x, y, numberValue(ex)!)).toBeLessThanOrEqual(20);
      expect(plus ? x % 10 + y % 10 > 10 : x % 10 < y % 10, ex.key).toBe(true);
      expect(ex.visual, ex.key).toBeUndefined();
    }
  });

  it('AB III: what is missing, or the money at the start, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(mitGroessenSkill, 1, 3, 400)) {
      kinds.add(kindOf(ex));
      const [x, y] = numbersIn(ex.context!);
      expect(numberValue(ex), ex.key).toBe(kindOf(ex) === 'euro-fehlt' ? y - x : x + y);
      expect(Math.max(x, y, numberValue(ex)!)).toBeLessThanOrEqual(20);
    }
    expect([...kinds].sort()).toEqual(['euro-anfang', 'euro-fehlt']);
  });
});

describe('sachaufgaben.mit-groessen, Stufe 2: cm or m, ≤ 100; Rückgeld from 20 €', () => {
  it('AB I: on a ruler up to 20 cm, or Rückgeld with a price above 10 €, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(mitGroessenSkill, 2, 1, 400)) {
      const [x, y] = numbersIn(ex.context!);
      const kind = kindOf(ex);
      kinds.add(kind);
      expect(numberValue(ex), ex.key).toBe(kind === 'laenger' ? y - x : x - y);
      if (kind === 'rueckgeld') {
        expect(x).toBe(20);
        expect(y, ex.key).toBeGreaterThan(10);
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(y) }, ex.bugs).bugId, ex.key).toBe('rueckgeld-preis');
      } else {
        expect(ex.visual?.type, ex.key).toBe('ruler');
      }
    }
    expect([...kinds].sort()).toEqual(['band', 'laenger', 'rueckgeld']);
  });

  it('AB II: two-digit lengths over a ten, metres, and Rückgeld over the ten, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(mitGroessenSkill, 2, 2, 500)) {
      const [x, y] = numbersIn(ex.context!);
      const kind = kindOf(ex);
      kinds.add(kind);
      expect(numberValue(ex), ex.key).toBe(kind === 'laenger-gross' ? y - x : x - y);
      expect(Math.max(x, y)).toBeLessThanOrEqual(100);
      if (kind === 'rueckgeld') expect(y, ex.key).toBeLessThan(10);
    }
    expect([...kinds].sort()).toEqual(['band', 'hof', 'laenger-gross', 'rueckgeld']);
  });

  it('AB III: the start, the whole way or the price, recomputed; the Rückgeld as an answer gets its hint', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(mitGroessenSkill, 2, 3, 500)) {
      const [x, y] = numbersIn(ex.context!);
      const kind = kindOf(ex);
      kinds.add(kind);
      expect(numberValue(ex), ex.key).toBe(kind === 'preis-gesucht' ? x - y : x + y);
      expect(numberValue(ex)).toBeLessThanOrEqual(100);
      if (kind === 'preis-gesucht') {
        expect(x).toBe(20);
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(y) }, ex.bugs).bugId, ex.key).toBe('rueckgeld-preis');
      }
    }
    expect([...kinds].sort()).toEqual(['band-anfang', 'preis-gesucht', 'weg-ganz']);
  });

  it('Rückgeld: the price is never the change, and both hints stay and fit the price', () => {
    const items = [...atAb(mitGroessenSkill, 2, 1, 1000), ...atAb(mitGroessenSkill, 2, 2, 1000)].filter((e) => kindOf(e) === 'rueckgeld');
    expect(new Set(items.map((e) => numbersIn(e.context!)[1])).size).toBe(15);
    for (const ex of items) {
      const price = numbersIn(ex.context!)[1];
      expect(numberValue(ex), ex.key).not.toBe(price);
      expect(ex.hints, ex.key).toHaveLength(2);
      expect(ex.hints[0], ex.key).toContain('Wie viel fehlt von');
      if (price > 10) expect(ex.hints[1], ex.key).not.toMatch(/Zehner/);
    }
  });

  it('a ruler stops at 20 cm, so its whole picture fits a 375 px phone, with both lengths on it', () => {
    let rulers = 0;
    for (const ex of atAb(mitGroessenSkill, 2, 1, 800)) {
      if (ex.visual?.type !== 'ruler') continue;
      rulers += 1;
      expect(ex.visual.maxCm, ex.key).toBeLessThanOrEqual(20);
      expect(Math.max(ex.visual.lengthCm, ex.visual.second?.lengthCm ?? 0), ex.key).toBeLessThanOrEqual(ex.visual.maxCm);
    }
    expect(rulers).toBeGreaterThan(0);
  });
});

describe('sachaufgaben.mit-groessen, Stufe 3: whole hours and days; one mixed-unit step', () => {
  const RECOMPUTE: Record<string, (n: number[]) => number> = {
    ende: (n) => n[0] + n[1],
    dauer: (n) => n[1] - n[0],
    tage: (n) => 7 * n[0] + n[1],
    meter: (n) => 100 - n[1],
    euro: (n) => 100 - n[1],
    stunde: (n) => 60 - n[1],
    beginn: (n) => n[0] - n[1],
    'tage-rest': (n) => n[0] - 7,
    'meter-ab': (n) => 100 - n[1],
    'euro-preis': (n) => 100 - n[1],
    'stunde-schon': (n) => 60 - n[1],
  };

  const kindsAt = (ab: 1 | 2 | 3) => {
    const kinds = new Set<string>();
    for (const ex of atAb(mitGroessenSkill, 3, ab, 600)) {
      const n = numbersIn(ex.context!);
      kinds.add(kindOf(ex));
      expect(numberValue(ex), ex.key).toBe(RECOMPUTE[kindOf(ex)](n));
    }
    return [...kinds].sort();
  };

  it('AB I: hours and 1 week', () => expect(kindsAt(1)).toEqual(['dauer', 'ende', 'tage']));
  it('AB II: afternoon hours, 2 weeks, one step with another unit', () => {
    expect(kindsAt(2)).toEqual(['dauer', 'ende', 'euro', 'meter', 'stunde', 'tage']);
    for (const ex of atAb(mitGroessenSkill, 3, 2, 300)) {
      if (kindOf(ex) === 'tage') expect(numbersIn(ex.context!)[0], ex.key).toBe(2);
      if (kindOf(ex) === 'ende' || kindOf(ex) === 'dauer') expect(numbersIn(ex.context!)[0], ex.key).toBeGreaterThan(12);
    }
  });
  it('AB III: the start time and the unit step backwards', () => expect(kindsAt(3)).toEqual(['beginn', 'euro-preis', 'meter-ab', 'stunde-schon', 'tage-rest']));

  it('the answer is never the number of the story: 100 cm − 50 cm', () => {
    for (const ab of [2, 3] as const) for (const ex of atAb(mitGroessenSkill, 3, ab, 500)) expect(numbersIn(ex.context!).slice(1), ex.key).not.toContain(numberValue(ex));
  });

  it('a clock agrees with the story: on the face only up to 12 Uhr, the afternoon in text only (T14)', () => {
    const times = [...atAb(mitGroessenSkill, 3, 1, 800), ...atAb(mitGroessenSkill, 3, 2, 800), ...atAb(mitGroessenSkill, 3, 3, 800)].filter((e) => ['ende', 'dauer', 'beginn'].includes(kindOf(e)));
    const parts = new Set<string>();
    for (const ex of times) {
      const [first, second] = numbersIn(ex.context!);
      const kind = kindOf(ex);
      const clockHour = first;
      parts.add(`${kind}:${first > 12 ? 'nachmittag' : 'morgen'}`);
      if (first > 12) expect(ex.visual, ex.key).toBeUndefined();
      else {
        const end = kind === 'ende' ? first + second : kind === 'dauer' ? second : first;
        expect(end, ex.key).toBeLessThanOrEqual(12);
        expect(ex.visual, ex.key).toEqual({ type: 'clock', hours: clockHour, minutes: 0 });
      }
      for (const text of ex.hints) expect(text, ex.key).not.toMatch(/Zeiger|Uhr zeigt/);
    }
    expect(parts.size).toBe(6);
  });

  it('after 12 Uhr, the hour as read on a clock face gets its hint', () => {
    const afternoon = atAb(mitGroessenSkill, 3, 2, 800).filter((e) => kindOf(e) === 'ende');
    expect(afternoon.length).toBeGreaterThan(0);
    for (const ex of afternoon) {
      const wrong = numberValue(ex)! - 12;
      expect(checkAnswer(ex.answer, { kind: 'number', text: String(wrong) }, ex.bugs).bugId, ex.key).toBe('stunden-zwoelf');
    }
  });

  it('a mixed-unit purchase says that the child buys something, and subtraction hints count back', () => {
    const euros = atAb(mitGroessenSkill, 3, 2, 500).filter((e) => kindOf(e) === 'euro');
    expect(euros.length).toBeGreaterThan(0);
    for (const ex of euros) {
      expect(ex.context, ex.key).toMatch(/kauft einen Lolli für \d+ ct/);
      expect(ex.hints[1]).toBe('Rechne von 100 Cent aus zurück.');
    }
  });

  it('a time span given as a clock time and an hour as 100 minutes get their hints', () => {
    const exercises = atAb(mitGroessenSkill, 3, 2, 500);
    const dauer = exercises.find((e) => kindOf(e) === 'dauer')!;
    const end = numbersIn(dauer.context!)[1];
    expect(checkAnswer(dauer.answer, { kind: 'number', text: String(end) }, dauer.bugs).bugId).toBe('zeitpunkt-spanne');
    const stunde = exercises.find((e) => kindOf(e) === 'stunde')!;
    const seen = numbersIn(stunde.context!)[1];
    expect(checkAnswer(stunde.answer, { kind: 'number', text: String(100 - seen) }, stunde.bugs).bugId).toBe('stunde-100');
  });
});
