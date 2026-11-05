import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { spokenWords } from '../../core/format';
import { describeSkill } from '../../core/testing';
import { MAX_ORDER_ITEMS } from '../../core/age';
import type { Ab, Exercise, Stufe, Visual } from '../../core/types';
import { STUFEN } from '../../core/types';
import { createRng } from '../../core/rng';
import { CTX, samples, cents } from '../test-utils';
import { COINS, NOTES, isMixedAmount, sum } from './helpers';
import { geldKennenSkill } from './geld-kennen';

describeSkill(geldKennenSkill, { minDistinct: 30 });

const all = STUFEN.flatMap((s: Stufe) => samples(geldKennenSkill, s));
const of = (kind: string) => all.filter((ex) => ex.key.includes(`:${kind}:`));
const moneyOf = (v?: Visual) => (v?.type === 'money' ? v.items : []);
const at = (stufe: Stufe, ab: Ab, n = 200) => Array.from({ length: n }, (_, i) => geldKennenSkill.generate(createRng(i * 3301 + 7), stufe, { ...CTX, ab }));

describe('groessen.geld-kennen specifics', () => {
  it('the Stufe chooses the content, the AB the demand: the forms of each cell', () => {
    const forms = (stufe: Stufe, ab: Ab) => new Set(at(stufe, ab).map((ex) => ex.key.split(':')[2]));
    expect(forms(1, 1)).toEqual(new Set(['name', 'extrem', 'muenzen']));
    expect(forms(1, 2)).toEqual(new Set(['extrem', 'muenzen']));
    expect(forms(1, 3)).toEqual(new Set(['gibt-es-nicht', 'luecke', 'zwischen']));
    expect(forms(2, 1)).toEqual(new Set(['muenze-schein', 'scheine']));
    expect(forms(2, 2)).toEqual(new Set(['gemischt', 'extrem']));
    expect(forms(2, 3)).toEqual(new Set(['gibt-es-nicht', 'luecke', 'zwischen']));
    expect(forms(3, 1)).toEqual(new Set(['vergleich', 'genau']));
    expect(forms(3, 2)).toEqual(new Set(['vergleich', 'genau']));
    expect(forms(3, 3)).toEqual(new Set(['meiste', 'gleich-viel']));
  });

  it('Stufe 1 holds only coins, Stufe 2 always a note or asks about one', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of at(1, ab)) {
        expect(moneyOf(ex.visual).every((c) => c <= 200), ex.key).toBe(true);
        if (ex.answer.kind === 'choice' && !ex.key.includes(':gibt-es-nicht:')) for (const o of ex.answer.options) expect(o.label, ex.key).not.toMatch(/^(5|10|20|50|100)\s€/);
      }
      for (const ex of at(2, ab)) {
        const shown = moneyOf(ex.visual);
        if (shown.length) expect(shown.some((c) => c >= 500), ex.key).toBe(true);
      }
    }
  });

  it('F15: on AB 1 of Stufe 3 a collection has one unit and no total like 1 € 50 ct', () => {
    const collections = at(3, 1);
    expect(collections.length).toBeGreaterThan(100);
    for (const ex of collections) {
      if (ex.answer.kind !== 'choice') continue;
      for (const o of ex.answer.options) {
        const items = moneyOf(o.visual);
        if (items.length === 0) continue;
        expect(new Set(items.map((c) => c >= 100)).size, `${ex.key}: ${items.join('+')}`).toBe(1);
        expect(isMixedAmount(sum(items)), `${ex.key}: ${items.join('+')}`).toBe(false);
      }
    }
  });

  it('a gap in the row: the missing piece is the only one that fits between its neighbours, and it is not in the picture', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ex of at(stufe, 3).filter((e) => e.key.includes(':luecke:'))) {
        if (ex.answer.kind !== 'choice') throw new Error('choice expected');
        const shown = moneyOf(ex.visual);
        const right = cents(ex.answer.options[ex.answer.correct].label);
        expect(shown, ex.key).not.toContain(right);
        const all = stufe === 1 ? COINS : [...COINS.filter((c) => c >= 50), ...NOTES];
        expect(all.indexOf(shown[0]) < all.indexOf(right) && all.indexOf(right) < all.indexOf(shown[3]), ex.key).toBe(true);
      }
    }
  });

  it('between two pieces: exactly one value lies between them', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      const list = at(stufe, 3).filter((e) => e.key.includes(':zwischen:'));
      expect(list.length).toBeGreaterThan(10);
      for (const ex of list) {
        if (ex.answer.kind !== 'choice') throw new Error('choice expected');
        const [, low, high] = ex.key.split(':').slice(2).map(Number);
        const all = stufe === 1 ? COINS : [...COINS, ...NOTES];
        expect(all.filter((c) => c > low && c < high), ex.key).toEqual([cents(ex.answer.options[ex.answer.correct].label)]);
      }
    }
  });

  it('the coin that makes two amounts equal: the picture and the coin give the amount, no other option does', () => {
    const list = at(3, 3, 400).filter((e) => e.key.includes(':gleich-viel:'));
    expect(list.length).toBeGreaterThan(20);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const target = cents(ex.context!);
      const have = sum(moneyOf(ex.visual));
      ex.answer.options.forEach((o, i) => expect(have + cents(o.label) === target, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  it('coin or note: no hint and no reply names the piece of the task, as the rule would state the answer on 2 € and 5 €', () => {
    const list = at(2, 1, 600).filter((e) => e.key.includes(':muenze-schein:'));
    const pieces = new Set(list.map((e) => Number(e.key.split(':').pop())));
    expect(pieces).toContain(200);
    expect(pieces).toContain(500);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const piece = new RegExp(`(?<!\\d)${Number(ex.key.split(':').pop()) / 100}[\\s\\u00A0]€`);
      for (const t of [...ex.hints, ...ex.answer.options.flatMap((o) => o.whyWrong ?? [])]) expect(t, ex.key).not.toMatch(piece);
    }
  });

  it('which is worth most: the hint asks about Euro or Cent only if the options have both', () => {
    const list = ([[1, 1], [1, 2], [2, 2]] as [Stufe, Ab][]).flatMap(([s, ab]) => at(s, ab, 300)).filter((e) => e.key.includes(':extrem:'));
    const singleUnit = list.filter((ex) => ex.answer.kind === 'choice' && new Set(ex.answer.options.map((o) => o.label.endsWith('ct'))).size === 1);
    expect(singleUnit.length).toBeGreaterThan(10);
    expect(singleUnit.length).toBeLessThan(list.length);
    for (const ex of list) {
      const single = singleUnit.includes(ex);
      expect(/Euro oder Cent/.test(ex.hints.join(' ')), ex.key).toBe(!single);
      expect(ex.hints.includes('100 Cent sind 1 Euro.'), ex.key).toBe(!single);
    }
  });

  it('T16: read aloud, the sign hint does not name the same word twice', () => {
    for (const ex of of('name')) {
      for (const h of ex.hints) expect(spokenWords(h), ex.key).not.toMatch(/Zeichen (Euro|Cent)/);
    }
  });

  it('order tasks: the correct order is really sorted by value', () => {
    const orders = all.filter((ex) => ex.answer.kind === 'order');
    expect(orders.length).toBeGreaterThan(50);
    for (const ex of orders) {
      if (ex.answer.kind !== 'order') continue;
      const { items, correct, direction } = ex.answer;
      const values = correct.map((i) => cents(items[i]));
      const sorted = [...values].sort((a, b) => (direction === 'aufsteigend' ? a - b : b - a));
      expect(values).toEqual(sorted);
      expect(new Set(values).size).toBe(values.length);
      expect(items.length).toBeLessThanOrEqual(MAX_ORDER_ITEMS);
    }
  });

  it('the printed-number order is a bug with the hint "100 Cent sind 1 Euro"', () => {
    const withBug = all.filter((ex) => ex.bugs?.some((b) => b.id === 'cent-euro-vergleich'));
    expect(withBug.length).toBeGreaterThan(10);
    for (const ex of withBug) {
      if (ex.answer.kind !== 'order') continue;
      const bug = ex.bugs![0];
      const { items } = ex.answer;
      const printed = (bug.match as number[]).map((i) => parseInt(items[i], 10));
      const sorted = [...printed].sort((a, b) => (ex.answer.kind === 'order' && ex.answer.direction === 'aufsteigend' ? a - b : b - a));
      expect(printed).toEqual(sorted);
      expect(checkAnswer(ex.answer, { kind: 'order', order: bug.match as number[] }, ex.bugs).bugHint).toBe('100 Cent sind 1 Euro.');
    }
  });

  it('more pieces on AB 2 of Stufe 1, 4 notes on Stufe 2, 4 or 5 pieces when they are mixed', () => {
    const count = (stufe: Stufe, ab: Ab) => new Set(at(stufe, ab).filter((ex) => ex.answer.kind === 'order').map((ex) => (ex.answer.kind === 'order' ? ex.answer.items.length : 0)));
    expect(count(1, 1)).toEqual(new Set([3]));
    expect(count(1, 2)).toEqual(new Set([4]));
    expect(count(2, 1)).toEqual(new Set([4]));
    expect(count(2, 2)).toEqual(new Set([4, 5]));
  });

  it('coins, notes and mixed: each form holds what it says', () => {
    for (const ex of of('muenzen')) expect(moneyOf(ex.visual).every((c) => c <= 200)).toBe(true);
    for (const ex of of('scheine')) expect(moneyOf(ex.visual).every((c) => c >= 500 && c <= 10000)).toBe(true);
    for (const ex of of('gemischt')) expect(moneyOf(ex.visual).some((c) => c >= 500)).toBe(true);
  });

  it('coins and notes: the fake one really does not exist', () => {
    for (const ex of of('gibt-es-nicht')) {
      if (ex.answer.kind !== 'choice') continue;
      const note = ex.prompt.includes('Schein');
      const real = note ? [500, 1000, 2000, 5000, 10000] : [1, 2, 5, 10, 20, 50, 100, 200];
      ex.answer.options.forEach((o, i) => expect(real.includes(cents(o.label)), `${ex.key} ${o.label}`).toBe(i !== (ex.answer as { correct: number }).correct));
    }
  });

  it('who has more: the right child has the larger value; with more coins, the other child has less money', () => {
    const tasks = [...all, ...at(3, 3)].filter((ex) => /:(vergleich|meiste):/.test(ex.key)) as Exercise[];
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const options = ex.answer.options;
      const right = options[ex.answer.correct];
      const totals = options.filter((o) => o.visual).map((o) => sum(moneyOf(o.visual)));
      if (right.visual) {
        const others = options.filter((o) => o.visual && o !== right);
        for (const o of others) {
          expect(sum(moneyOf(right.visual))).toBeGreaterThan(sum(moneyOf(o.visual)));
          expect(moneyOf(o.visual).length).toBeGreaterThan(0);
        }
      } else {
        expect(new Set(totals).size).toBe(1);
      }
    }
  });

  it('which coins make the amount: only the right picture has this value', () => {
    for (const ex of all.filter((e) => e.key.includes(':genau:'))) {
      if (ex.answer.kind !== 'choice') continue;
      const target = cents(ex.prompt);
      ex.answer.options.forEach((o, i) => expect(sum(moneyOf(o.visual)) === target).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  it('neither "more coins" nor "fewer coins" works as a shortcut', () => {
    const outcome = (ex: Exercise) => {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const right = ex.answer.options[ex.answer.correct];
      if (!right.visual) return 'equal';
      const counts = ex.answer.options.filter((o) => o.visual).map((o) => moneyOf(o.visual).length);
      const n = moneyOf(right.visual).length;
      return n === Math.max(...counts) ? 'many' : n === Math.min(...counts) ? 'few' : 'mid';
    };
    const more = ([1, 2] as Ab[]).flatMap((ab) => Array.from({ length: 1000 }, (_, i) => geldKennenSkill.generate(createRng(i * 971 + ab), 3, { ...CTX, ab }))).filter((ex) => ex.key.includes(':vergleich:'));
    const share = (o: string) => more.filter((ex) => outcome(ex) === o).length / more.length;
    expect(more.length).toBeGreaterThan(500);
    expect(share('many')).toBeGreaterThan(0.15);
    expect(share('few')).toBeGreaterThan(0.15);
    expect(share('equal')).toBeGreaterThan(0.15);
    const most = Array.from({ length: 1500 }, (_, i) => geldKennenSkill.generate(createRng(i * 971 + 3), 3, { ...CTX, ab: 3 })).filter((ex) => ex.key.includes(':meiste:'));
    expect(most.filter((ex) => outcome(ex) === 'many').length / most.length).toBeGreaterThan(0.15);
    expect(most.filter((ex) => outcome(ex) === 'few').length / most.length).toBeGreaterThan(0.15);
  });

  it('order tasks: srText lists the pieces as shown, never in the order of the answer', () => {
    const orders = all.filter((ex) => ex.answer.kind === 'order');
    expect(orders.length).toBeGreaterThan(50);
    for (const ex of orders) {
      if (ex.answer.kind !== 'order') continue;
      const named = [...ex.srText.matchAll(/zu (\d+) (Euro|Cent)/g)].map((m) => Number(m[1]) * (m[2] === 'Euro' ? 100 : 1));
      expect(named, ex.key).toEqual(moneyOf(ex.visual));
    }
  });
});
