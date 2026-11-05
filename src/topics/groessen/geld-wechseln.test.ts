import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe, Visual } from '../../core/types';
import { STUFEN } from '../../core/types';
import { createRng } from '../../core/rng';
import { CTX, samples, cents } from '../test-utils';
import { fewestPieces, isMixedAmount, sum, waysToLay } from './helpers';
import { geldWechselnSkill } from './geld-wechseln';

describeSkill(geldWechselnSkill, { minDistinct: 25 });

const all = STUFEN.flatMap((s: Stufe) => samples(geldWechselnSkill, s));
const kind = (k: string) => all.filter((ex) => ex.key.includes(`:${k}:`));
const moneyOf = (v?: Visual) => (v?.type === 'money' ? v.items : []);

/** '1 € und 50 ct', '10 € + 5 € + 2 €' → pieces in Cent. */
const piecesOf = (label: string) => label.split(/ und | \+ /).map(cents);

describe('groessen.geld-wechseln specifics', () => {
  it('F15: below Stufe 3 no amount and no pair of coins needs Euro and Cent together, also in the feedback', () => {
    const below = ([1, 2] as const).flatMap((ab) => Array.from({ length: 400 }, (_, i) => geldWechselnSkill.generate(createRng(i * 2903 + 3), 1, { ...CTX, ab })));
    const pairs = below.filter((ex) => /:(gleich|zwei):/.test(ex.key));
    expect(pairs.length).toBeGreaterThan(100);
    for (const ex of pairs) {
      expect(isMixedAmount(cents(ex.prompt)), ex.key).toBe(false);
      if (ex.answer.kind !== 'choice') continue;
      for (const o of ex.answer.options) expect(isMixedAmount(sum(piecesOf(o.label))), `${ex.key}: ${o.label}`).toBe(false);
    }
  });

  it('two coins: only the right pair has the amount', () => {
    for (const ex of [...kind('gleich'), ...kind('zwei')]) {
      if (ex.answer.kind !== 'choice') continue;
      const target = cents(ex.prompt);
      ex.answer.options.forEach((o, i) => expect(sum(piecesOf(o.label)) === target, o.label).toBe(i === (ex.answer as { correct: number }).correct));
      if (ex.key.includes(':gleich:')) {
        const [a, b] = piecesOf(ex.answer.options[ex.answer.correct].label);
        expect(a).toBe(b);
      }
    }
  });

  it('fewest pieces: the right way has fewer pieces than all others, and all ways have the amount', () => {
    const tasks = kind('wenigste');
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const target = cents(ex.prompt);
      const right = piecesOf(ex.answer.options[ex.answer.correct].label);
      expect(right).toEqual(fewestPieces(target, right.every((c) => c >= 100) ? [2000, 1000, 500, 200, 100] : [50, 20, 10, 5, 2, 1]));
      for (const o of ex.answer.options) {
        expect(sum(piecesOf(o.label))).toBe(target);
        if (o.label !== ex.answer.options[ex.answer.correct].label) expect(piecesOf(o.label).length).toBeGreaterThan(right.length);
      }
      expect(target).toBeLessThanOrEqual(2000);
    }
  });

  it('fewest pieces in fields: the fields make the amount with the fewest pieces', () => {
    const tasks = kind('felder');
    expect(tasks.length).toBeGreaterThan(5);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'multi') continue;
      const [z, f, w] = ex.answer.fields.map((x) => x.value);
      const total = cents(ex.prompt);
      expect(z * 1000 + f * 500 + w * 200).toBe(total);
      expect(z + f + w).toBe(fewestPieces(total, [1000, 500, 200]).length);
    }
  });

  it('all ways: the answer is an independent count of the ways', () => {
    const tasks = kind('wege');
    expect(tasks.length).toBeGreaterThan(10);
    const count = (amount: number, coins: number[]): number => {
      if (amount === 0) return 1;
      if (coins.length === 0) return 0;
      let n = 0;
      for (let k = 0; k * coins[0] <= amount; k++) n += count(amount - k * coins[0], coins.slice(1));
      return n;
    };
    for (const ex of tasks) {
      if (ex.answer.kind !== 'multi') continue;
      const amount = cents(ex.context!);
      const coins = moneyOf(ex.visual);
      expect(ex.answer.fields[0].value).toBe(count(amount, coins));
      expect(ex.answer.fields[0].value).toBe(waysToLay(amount, coins).length);
      expect(ex.steps.length).toBe(ex.answer.fields[0].value);
      expect(ex.stufe, ex.key).toBe(3);
      expect(ex.answer.fields[0].value).toBeLessThanOrEqual(ex.ab === 1 ? 4 : 6);
    }
  });

  it('the odd way: only the right picture misses the amount', () => {
    const tasks = kind('passt-nicht') as Exercise[];
    expect(tasks.length).toBeGreaterThan(5);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const target = cents(ex.prompt);
      ex.answer.options.forEach((o, i) => expect(sum(moneyOf(o.visual)) !== target).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  const atAb = (stufe: Stufe, ab: Ab, n = 300): Exercise[] => Array.from({ length: n }, (_, i) => geldWechselnSkill.generate(createRng(i * 1109 + 5), stufe, { ...CTX, ab }));

  it('the Stufe chooses the content, the AB the demand inside it', () => {
    const forms = (stufe: Stufe, ab: Ab) => new Set(atAb(stufe, ab).map((ex) => ex.key.split(':')[2]));
    expect(forms(1, 1)).toEqual(new Set(['gleich', 'doppelt']));
    expect(forms(1, 2)).toEqual(new Set(['zwei']));
    expect(forms(1, 3)).toEqual(new Set(['fehlt', 'meiste']));
    expect(forms(2, 1)).toEqual(new Set(['wenigste']));
    expect(forms(2, 2)).toEqual(new Set(['wenigste', 'felder']));
    expect(forms(2, 3)).toEqual(new Set(['weniger', 'stuecke']));
    expect(forms(3, 1)).toEqual(new Set(['wege']));
    expect(forms(3, 2)).toEqual(new Set(['wege', 'passt-nicht']));
    expect(forms(3, 3)).toEqual(new Set(['genau', 'mehr-wege']));
  });

  it('Stufe 1, AB I: two equal coins are twice the coin', () => {
    const list = atAb(1, 1).filter((ex) => ex.key.includes(':doppelt:'));
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      expect(cents(ex.answer.options[ex.answer.correct].label), ex.key).toBe(2 * Number(ex.key.split(':').pop()));
    }
  });

  it('Stufe 1, AB III: the missing coin and the pair worth most, recomputed', () => {
    const list = atAb(1, 3, 600);
    const gaps = list.filter((ex) => ex.key.includes(':fehlt:'));
    expect(gaps.length).toBeGreaterThan(30);
    for (const ex of gaps) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const [total, have] = ex.key.split(':').slice(3).map(Number);
      expect(cents(ex.answer.options[ex.answer.correct].label) + have, ex.key).toBe(total);
    }
    const most = list.filter((ex) => ex.key.includes(':meiste:'));
    expect(most.length).toBeGreaterThan(30);
    for (const ex of most) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const sums = ex.answer.options.map((o) => sum(piecesOf(o.label)));
      expect(sums[ex.answer.correct], ex.key).toBe(Math.max(...sums));
      expect(new Set(sums).size, ex.key).toBe(sums.length);
    }
  });

  it('Stufe 2: AB I up to 10 €, AB II up to 20 €', () => {
    for (const ex of atAb(2, 1)) expect(cents(ex.prompt), ex.key).toBeLessThanOrEqual(1000);
    expect(atAb(2, 2).some((ex) => cents(ex.prompt) > 1000)).toBe(true);
  });

  it('Stufe 2, AB III: can it be done with fewer; how many pieces', () => {
    const list = atAb(2, 3, 500);
    const fewer = list.filter((ex) => ex.key.includes(':weniger:'));
    expect(fewer.length).toBeGreaterThan(30);
    for (const ex of fewer) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const items = moneyOf(ex.visual);
      expect(sum(items), ex.key).toBe(cents(ex.context!));
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(items.length > fewestPieces(sum(items), [2000, 1000, 500, 200, 100]).length ? 'Ja' : 'Nein');
    }
    // The question is about fewer pieces: the reply to a wrong pick does not talk about more.
    for (const ex of fewer) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      for (const o of ex.answer.options) expect(o.whyWrong ?? '', ex.key).not.toMatch(/Mehr|mehr/);
    }
    const pieces = list.filter((ex) => ex.key.includes(':stuecke:'));
    expect(pieces.length).toBeGreaterThan(30);
    for (const ex of pieces) expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(fewestPieces(cents(ex.context!), [2000, 1000, 500, 200, 100]).length);
  });

  it('Stufe 3: AB I two kinds of coins; AB III which way has n coins, with which coins more ways, recomputed', () => {
    for (const ex of atAb(3, 1)) expect(moneyOf(ex.visual), ex.key).toHaveLength(2);
    const list = atAb(3, 3, 500);
    const exact = list.filter((ex) => ex.key.includes(':genau:'));
    expect(exact.length).toBeGreaterThan(30);
    const coinsIn = (label: string) => label.split(' + ').reduce((a, p) => a + (/^(\d+)-mal/.exec(p) ? Number(/^(\d+)-mal/.exec(p)![1]) : 1), 0);
    for (const ex of exact) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const n = Number(/genau (\d+) Münzen/.exec(ex.prompt)![1]);
      ex.answer.options.forEach((o, i) => expect(coinsIn(o.label) === n, `${ex.key}: ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
    }
    const more = list.filter((ex) => ex.key.includes(':mehr-wege:'));
    expect(more.length).toBeGreaterThan(30);
    for (const ex of more) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const [amount, a, b] = ex.key.split(':').slice(3);
      const count = (c: string) => waysToLay(Number(amount), c.split('-').map(Number), 12).length;
      const [na, nb] = [count(a), count(b)];
      const pick = ex.answer.options[ex.answer.correct].label;
      if (na === nb) expect(pick, ex.key).toBe('Mit beiden gleich viele');
      else expect(pick, ex.key).toBe(ex.answer.options[na > nb ? 0 : 1].label);
    }
  });

  it('fewest pieces: the steps read right for one piece as well', () => {
    const tasks = all.filter((ex) => ex.key.includes(':wenigste:'));
    expect(tasks.length).toBeGreaterThan(10);
    for (const ex of tasks) expect(String(ex.steps[0]), ex.key).toMatch(/^Die wenigsten Stücke: /);
    const single = tasks.filter((ex) => String(ex.steps[0]).match(/^Die wenigsten Stücke: \d+[\s\u00A0]€$/));
    expect(single.length).toBeGreaterThan(0);
    for (const ex of single) expect(ex.steps[1], ex.key).toBe('Das ist 1 Stück.');
  });
});
