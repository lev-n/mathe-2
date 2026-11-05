import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise, VisualOf } from '../../core/types';
import { bildaufgabeSkill } from './bildaufgabe';
import { atAb, kindOf, numberValue, numbersIn } from './test-helpers';

describeSkill(bildaufgabeSkill, { minDistinct: 40 });

const picto = (ex: Exercise) => ex.visual as VisualOf<'pictogram'>;
const rowValue = (ex: Exercise, name: string) => picto(ex).values[picto(ex).categories.indexOf(name)];
const moneySum = (items: number[]) => items.reduce((s, c) => s + c, 0) / 100;
const notesOf = (ex: Exercise) => (ex.visual as VisualOf<'money'>).items.filter((c) => c >= 500);
const hasCoins = (ex: Exercise) => (ex.visual as VisualOf<'money'>).items.some((c) => c < 500);

describe('sachaufgaben.bildaufgabe, Stufe 1: a picture and one question, plus or minus, ≤ 20', () => {
  it('AB I: rows within 10, recomputed from the picture', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(bildaufgabeSkill, 1, 1, 300)) {
      kinds.add(kindOf(ex));
      expect(numberValue(ex), ex.key).toBeLessThanOrEqual(10);
      if (kindOf(ex) === 'summe') {
        const [p, q] = picto(ex).categories;
        expect(ex.prompt).toContain(p);
        expect(numbersIn(ex.prompt), 'the numbers are only in the picture').toEqual([]);
        expect(numberValue(ex)).toBe(rowValue(ex, p) + rowValue(ex, q));
      } else {
        expect(numberValue(ex)).toBe(picto(ex).values[0] - numbersIn(ex.prompt)[0]);
      }
    }
    expect([...kinds].sort()).toEqual(['summe', 'weg']);
  });

  it('AB II: rows over the ten, or money up to 20 €, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(bildaufgabeSkill, 1, 2, 300)) {
      kinds.add(kindOf(ex));
      expect(numberValue(ex), ex.key).toBeLessThanOrEqual(20);
      if (kindOf(ex) === 'summe-gross') {
        expect(numberValue(ex)).toBe(picto(ex).values[0] + picto(ex).values[1]);
        expect(numberValue(ex)).toBeGreaterThan(10);
      } else if (kindOf(ex) === 'weg-gross') {
        expect(numberValue(ex)).toBe(picto(ex).values[0] - numbersIn(ex.prompt)[0]);
      } else {
        const have = moneySum((ex.visual as VisualOf<'money'>).items);
        const other = numbersIn(ex.context!)[0];
        expect(numberValue(ex)).toBe(/bekommt/.test(ex.context!) ? have + other : have - other);
      }
    }
    expect([...kinds].sort()).toEqual(['geld', 'summe-gross', 'weg-gross']);
  });

  it('AB III: what is missing, or the start, recomputed; up to 20', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(bildaufgabeSkill, 1, 3, 300)) {
      kinds.add(kindOf(ex));
      const [n] = numbersIn(ex.context!);
      const given = numbersIn(ex.context!).at(-1)!;
      expect(Math.max(...numbersIn(ex.context!))).toBeLessThanOrEqual(20);
      if (kindOf(ex) === 'fehlt') expect(numberValue(ex), ex.key).toBe(n - picto(ex).values[0]);
      else if (kindOf(ex) === 'anfang') expect(numberValue(ex), ex.key).toBe(picto(ex).values[0] - n);
      else expect(numberValue(ex), ex.key).toBe(given - moneySum((ex.visual as VisualOf<'money'>).items));
    }
    expect([...kinds].sort()).toEqual(['anfang', 'fehlt', 'geld-fehlt']);
  });
});

describe('sachaufgaben.bildaufgabe, Stufe 2: one sentence and a picture, ≤ 100', () => {
  it('has a sentence besides the question, and a picture, at every AB', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(bildaufgabeSkill, 2, ab, 200)) {
        expect(ex.context!.split('. ').length, ex.key).toBe(1);
        expect(ex.visual, ex.key).toBeDefined();
        expect(numberValue(ex), ex.key).toBeLessThanOrEqual(100);
      }
    }
  });

  it('AB I: tens in the picture, or money within a ten', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(bildaufgabeSkill, 2, 1, 300)) {
      kinds.add(kindOf(ex));
      if (kindOf(ex) === 'zehner-summe') {
        expect(picto(ex).iconValue).toBe(10);
        expect(picto(ex).showKey).not.toBe(false);
        expect(numberValue(ex)).toBe(picto(ex).values[0] + picto(ex).values[1]);
      } else {
        const have = moneySum((ex.visual as VisualOf<'money'>).items);
        const other = numbersIn(ex.context!)[0];
        const plus = /dazu/.test(ex.context!);
        expect(numberValue(ex)).toBe(plus ? have + other : have - other);
        expect(Math.floor(numberValue(ex)! / 10), ex.key).toBe(Math.floor(have / 10));
      }
    }
    expect([...kinds].sort()).toEqual(['geld', 'zehner-summe']);
  });

  it('AB II: every item crosses a ten, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(bildaufgabeSkill, 2, 2, 300)) {
      kinds.add(kindOf(ex));
      const other = numbersIn(ex.context!)[0];
      const have = ex.visual?.type === 'money' ? moneySum(ex.visual.items) : picto(ex).values[0];
      const plus = /dazu/.test(ex.context!);
      expect(numberValue(ex), ex.key).toBe(plus ? have + other : have - other);
      expect(plus ? have % 10 + other % 10 > 10 : have % 10 < other % 10, ex.key).toBe(true);
    }
    expect([...kinds].sort()).toEqual(['geld', 'zehner-weg']);
  });

  it('AB III: what is missing, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(bildaufgabeSkill, 2, 3, 300)) {
      kinds.add(kindOf(ex));
      const goal = numbersIn(ex.context!)[0];
      const have = ex.visual?.type === 'money' ? moneySum(ex.visual.items) : picto(ex).values[0];
      expect(numberValue(ex), ex.key).toBe(goal - have);
    }
    expect([...kinds].sort()).toEqual(['geld-fehlt', 'zehner-fehlt']);
  });
});

describe('sachaufgaben.bildaufgabe, Stufe 3: the picture holds something not needed, at every AB', () => {
  it('three rows, or notes beside coins', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(bildaufgabeSkill, 3, ab, 200)) {
        if (ex.visual?.type === 'pictogram') {
          expect(ex.visual.categories.length, ex.key).toBe(3);
          expect(ex.visual.iconValue, ex.key).toBe(10);
        } else {
          expect(hasCoins(ex), ex.key).toBe(true);
        }
      }
    }
  });

  it('AB I: adds what is asked; using everything gets the targeted hint', () => {
    for (const ex of atAb(bildaufgabeSkill, 3, 1, 300)) {
      if (kindOf(ex) === 'dritte-reihe') {
        const named = picto(ex).categories.filter((c) => ex.prompt.includes(c));
        expect(named.length, ex.prompt).toBe(2);
        expect(numberValue(ex)).toBe(rowValue(ex, named[0]) + rowValue(ex, named[1]));
        const all = picto(ex).values.reduce((s, x) => s + x, 0);
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(all) }, ex.bugs).bugId).toBe('alle-zahlen');
      } else if (kindOf(ex) === 'dritte-reihe-mehr') {
        const m = /hat (\p{L}+) mehr als (\p{L}+)\?/u.exec(ex.prompt)!;
        expect(numberValue(ex), ex.key).toBe(rowValue(ex, m[1]) - rowValue(ex, m[2]));
      } else {
        const items = (ex.visual as VisualOf<'money'>).items;
        expect(numberValue(ex)).toBe(moneySum(notesOf(ex)));
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(moneySum(items)) }, ex.bugs).bugId).toBe('alle-zahlen');
      }
    }
  });

  it('AB II and III: recomputed from the part of the picture that counts', () => {
    const kinds = new Set<string>();
    for (const ab of [2, 3] as const) {
      for (const ex of atAb(bildaufgabeSkill, 3, ab, 400)) {
        const kind = kindOf(ex);
        kinds.add(kind);
        const person = /^\p{L}+/u.exec(ex.context ?? ex.prompt)![0];
        const n = numbersIn(ex.context ?? '')[0];
        if (kind === 'dritte-reihe-weg') expect(numberValue(ex), ex.key).toBe(rowValue(ex, person) - n);
        else if (kind === 'dritte-reihe-fehlt') expect(numberValue(ex), ex.key).toBe(n - rowValue(ex, person));
        else if (kind === 'nur-kauf') expect(numberValue(ex), ex.key).toBe(moneySum(notesOf(ex)) - n);
        else expect(numberValue(ex), ex.key).toBe(n - moneySum(notesOf(ex)));
      }
    }
    expect([...kinds].sort()).toEqual(['dritte-reihe-fehlt', 'dritte-reihe-weg', 'nur-fehlt', 'nur-kauf']);
  });
});

describe('sachaufgaben.bildaufgabe, all Stufen', () => {
  it('every row has at least 2 pictures: the worked steps have no singular for "1 Bücher"', () => {
    for (const ex of atAb(bildaufgabeSkill, 1, 2, 1500).filter((e) => kindOf(e) === 'summe-gross')) {
      picto(ex).values.forEach((v) => expect(v, ex.key).toBeGreaterThanOrEqual(2));
    }
  });

  it('T13: the money stories ask the same question with plus and with minus', () => {
    for (const [stufe, ab] of [[1, 2], [2, 1], [2, 2]] as const) {
      const money = atAb(bildaufgabeSkill, stufe, ab, 400).filter((e) => kindOf(e) === 'geld');
      expect(money.length).toBeGreaterThan(0);
      for (const ex of money) expect(ex.prompt, ex.key).toMatch(/^Wie viel Euro hat \p{L}+ dann\?$/u);
      expect(new Set(money.map((e) => e.key.split(':')[4])).size).toBe(2);
    }
  });


  it('the spoken task holds the data of the picture, in rows or pieces, and ends with the question', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(bildaufgabeSkill, stufe, ab, 100)) {
          if (ex.visual?.type === 'pictogram') {
            const v = ex.visual;
            v.categories.forEach((c, i) => expect(ex.srText, ex.key).toContain(`${c}: ${v.values[i] / v.iconValue} `));
            expect(ex.srText, ex.key).toContain(`Ein Bild steht für ${v.iconValue}.`);
          } else {
            const euros = new Set((ex.visual as VisualOf<'money'>).items.map((c) => c / 100));
            euros.forEach((e) => expect(ex.srText, ex.key).toContain(`zu ${e} Euro`));
          }
          expect(ex.srText.endsWith('?'), ex.srText).toBe(true);
        }
      }
    }
  });

  it('the third row gets a hint about the rows, not about a text without numbers', () => {
    const rows = atAb(bildaufgabeSkill, 3, 1, 200).filter((e) => kindOf(e) === 'dritte-reihe');
    expect(rows.length).toBeGreaterThan(0);
    for (const ex of rows) expect(ex.bugs!.find((b) => b.id === 'alle-zahlen')?.hint, ex.key).toMatch(/^Schau nur die Reihen von /);
  });

  it('counting notes instead of their value gets the note hint', () => {
    const ex = atAb(bildaufgabeSkill, 3, 1, 200).find((e) => kindOf(e) === 'nur')!;
    const r = checkAnswer(ex.answer, { kind: 'number', text: String(notesOf(ex).length) }, ex.bugs);
    expect(r.bugHint).toMatch(/Zähle nicht/);
  });

  it('a price stays plausible: nobody buys a book for 80 €', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(bildaufgabeSkill, stufe, ab, 200)) {
          const m = /(Buch|Ball|Spiel|Puzzle)[^.]*? (\d+) €/.exec(ex.context ?? '');
          if (m) expect(Number(m[2]), ex.context).toBeLessThanOrEqual(39);
        }
      }
    }
  });
});
