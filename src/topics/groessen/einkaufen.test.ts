import { describe, expect, it } from 'vitest';
import { checkAnswer, correctResponse } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe, Visual } from '../../core/types';
import { STUFEN } from '../../core/types';
import { createRng } from '../../core/rng';
import { CTX, cents } from '../test-utils';
import { sum } from './helpers';
import { einkaufenSkill } from './einkaufen';

describeSkill(einkaufenSkill, { minDistinct: 30 });

const at = (stufe: Stufe, ab: Ab, n = 300): Exercise[] => Array.from({ length: n }, (_, i) => einkaufenSkill.generate(createRng(i * 4243 + 3), stufe, { ...CTX, ab }));
const all = STUFEN.flatMap((s: Stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) => at(s, ab)));
const kind = (k: string) => all.filter((ex) => ex.key.includes(`:${k}:`));
/** All amounts of the story, in Cent. */
const amounts = (text: string) => [...text.matchAll(/(\d+) (€|ct)/g)].map((m) => Number(m[1]) * (m[2] === '€' ? 100 : 1));
const moneyOf = (v?: Visual) => (v?.type === 'money' ? v.items : []);
const valueOf = (ex: Exercise) => (ex.answer.kind === 'number' ? ex.answer.value! : NaN);

describe('groessen.einkaufen specifics', () => {
  it('the Stufe chooses the content, the AB the demand: the forms of each cell', () => {
    const forms = (stufe: Stufe, ab: Ab) => new Set(at(stufe, ab).map((ex) => ex.key.split(':')[2]));
    expect(forms(1, 1)).toEqual(new Set(['zusammen']));
    expect(forms(1, 2)).toEqual(new Set(['zusammen']));
    expect(forms(1, 3)).toEqual(new Set(['preis-fehlt']));
    expect(forms(2, 1)).toEqual(new Set(['rueckgeld']));
    expect(forms(2, 2)).toEqual(new Set(['rueckgeld', 'rueckgeld-bild']));
    expect(forms(2, 3)).toEqual(new Set(['preis-aus-rueckgeld', 'schein']));
    expect(forms(3, 1)).toEqual(new Set(['cent-summe', 'cent-rueckgeld']));
    expect(forms(3, 2)).toEqual(new Set(['cent-summe', 'cent-rueckgeld', 'reicht']));
    expect(forms(3, 3)).toEqual(new Set(['reicht', 'liste-fehlt']));
  });

  it('two prices: AB 1 up to 10 €, AB 2 from 11 € on', () => {
    for (const ex of at(1, 1)) expect(valueOf(ex), ex.key).toBeLessThanOrEqual(10);
    for (const ex of at(1, 2)) expect(valueOf(ex), ex.key).toBeGreaterThanOrEqual(11);
  });

  it('names inside a sentence keep their capital letter', () => {
    for (const ex of [...at(1, 3), ...at(2, 3), ...at(3, 3)]) expect(`${ex.context} ${ex.prompt}`, ex.key).not.toMatch(/\b(ein|eine) [a-zäöü]/);
  });

  it('a missing price: the sum minus the known price, and it is not on show', () => {
    for (const ex of at(1, 3)) {
      const [sumOf, known] = amounts(ex.context!);
      expect(valueOf(ex) * 100, ex.key).toBe(sumOf - known);
      expect(sumOf, ex.key).toBeLessThanOrEqual(2000);
      expect(known, ex.key).not.toBe(sumOf - known);
    }
  });

  it('Rückgeld on Stufe 2: AB 1 from 10 €, AB 2 from 20 €; the Rückgeld never stands in the task as the price', () => {
    for (const ex of at(2, 1)) expect(amounts(ex.context!)[1], ex.key).toBe(1000);
    for (const ex of at(2, 2)) expect(amounts(ex.context!)[1], ex.key).toBe(2000);
    for (const ex of [...at(2, 1), ...at(2, 2)]) {
      const [price, paid] = amounts(ex.context!);
      expect(price * 2, ex.key).not.toBe(paid);
    }
  });

  it('backwards from the Rückgeld: the price and the note are recomputed', () => {
    for (const ex of kind('preis-aus-rueckgeld')) {
      const [paid, change] = amounts(ex.context!);
      expect([1000, 2000], ex.key).toContain(paid);
      expect(valueOf(ex) * 100, ex.key).toBe(paid - change);
      expect(moneyOf(ex.visual), ex.key).toEqual([paid]);
      expect(ex.bugs?.find((b) => b.id === 'rueckgeld-preis')?.match, ex.key).toBe(change / 100);
    }
    const notes = kind('schein');
    expect(notes.length).toBeGreaterThan(20);
    for (const ex of notes) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const [price, change] = amounts(ex.context!);
      expect(cents(ex.answer.options[ex.answer.correct].label), ex.key).toBe(price + change);
    }
  });

  it('Stufe 3 is harder than Stufe 2 at AB 1: no sum of full tens, no Rückgeld without Cent', () => {
    for (const ex of at(3, 1).filter((e) => e.key.includes(':cent-summe:'))) {
      const [a, b] = amounts(ex.context!);
      expect(a % 10 !== 0 || b % 10 !== 0, ex.key).toBe(true);
    }
    for (const ex of at(3, 2).filter((e) => e.key.includes(':cent-summe:'))) {
      const [a, b] = amounts(ex.context!);
      expect(a % 10 !== 0 && b % 10 !== 0, ex.key).toBe(true);
    }
    for (const ex of [...kind('cent-rueckgeld')]) expect(amounts(ex.context!)[0], ex.key).not.toBe(50);
  });

  it('a gap in the price list: the sum minus the two prices shown; the list has one empty place', () => {
    const list = at(3, 3).filter((e) => e.key.includes(':liste-fehlt:'));
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      if (ex.visual?.type !== 'table') throw new Error('table expected');
      const shown = ex.visual.rows.filter((r) => r[1] !== '□');
      expect(shown).toHaveLength(2);
      expect(valueOf(ex), ex.key).toBe((cents(ex.context!) - sum(shown.map((r) => cents(r[1])))) / (ex.context!.includes('ct') ? 1 : 100));
    }
  });

  it('two prices: the sum, in whole euro, at most 20 €', () => {
    const tasks = kind('zusammen');
    expect(tasks.length).toBeGreaterThan(30);
    for (const ex of tasks) {
      const [a, b] = amounts(ex.context!);
      expect(valueOf(ex) * 100).toBe(a + b);
      expect(a + b).toBeLessThanOrEqual(2000);
      expect(a % 100).toBe(0);
      expect(b % 100).toBe(0);
    }
  });

  it('Rückgeld: paid minus price, from 10 € or 20 €; the price itself is a bug', () => {
    const tasks = kind('rueckgeld');
    expect(tasks.length).toBeGreaterThan(30);
    for (const ex of tasks) {
      const [price, paid] = amounts(ex.context!);
      expect([1000, 2000]).toContain(paid);
      expect(valueOf(ex) * 100).toBe(paid - price);
      expect(moneyOf(ex.visual)).toEqual([paid]);
      const bug = ex.bugs?.find((b) => b.id === 'rueckgeld-preis');
      if (bug) {
        expect(bug.match).toBe(price / 100);
        expect(bug.hint).toMatch(/^Wie viel fehlt von /);
      }
    }
  });

  it('the picture of the Rückgeld has the right value; the others do not', () => {
    const tasks = kind('rueckgeld-bild');
    expect(tasks.length).toBeGreaterThan(10);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const [price, paid] = amounts(ex.context!);
      ex.answer.options.forEach((o, i) => expect(sum(moneyOf(o.visual)) === paid - price).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  it('Cent prices: at most 100 ct', () => {
    for (const ex of kind('cent-summe')) {
      const [a, b] = amounts(ex.context!);
      expect(valueOf(ex)).toBe(a + b);
      expect(a + b).toBeLessThanOrEqual(100);
    }
    for (const ex of kind('cent-rueckgeld')) {
      const [price] = amounts(ex.context!);
      expect(valueOf(ex)).toBe(100 - price);
    }
  });

  it('is the money enough: recomputed from the price list', () => {
    const tasks = kind('reicht');
    expect(tasks.length).toBeGreaterThan(20);
    const seen = new Set<string>();
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'table') continue;
      const total = sum(ex.visual.rows.map((r) => cents(r[1])));
      const [have] = amounts(ex.context!);
      const label = ex.answer.options[ex.answer.correct].label;
      expect(label).toBe(have >= total ? 'Ja' : 'Nein');
      seen.add(label);
      expect(ex.visual.rows.length).toBe(3);
      expect(checkAnswer(ex.answer, correctResponse(ex.answer)).correct).toBe(true);
    }
    expect(seen).toEqual(new Set(['Ja', 'Nein']));
  });

  it('is the money enough: the money stays in the range as well, at most 100 ct and at most 20 € (§2.4, §6, F15)', () => {
    const tasks = ([2, 3] as Ab[]).flatMap((ab) => at(3, ab, 1500)).filter((ex) => ex.key.includes(':reicht:'));
    const inCent = tasks.filter((ex) => ex.context!.includes('ct'));
    expect(inCent.length).toBeGreaterThan(50);
    for (const ex of tasks) expect(amounts(ex.context!)[0], ex.key).toBeLessThanOrEqual(inCent.includes(ex) ? 100 : 2000);
  });

  it('no unmarked two-step task: "wie viel fehlt" belongs to sachaufgaben.zwei-schritte (§2.2, §6)', () => {
    expect(kind('fehlt')).toEqual([]);
    for (const ex of all) expect(ex.prompt, ex.key).not.toBe('Wie viel Geld fehlt noch?');
  });

  it('srText of a price table holds the prices', () => {
    for (const ex of kind('reicht')) {
      if (ex.visual?.type !== 'table') continue;
      for (const [name] of ex.visual.rows) expect(ex.srText, ex.key).toContain(name);
      expect(ex.srText, ex.key).toMatch(/Die Preise: /);
    }
  });
});
