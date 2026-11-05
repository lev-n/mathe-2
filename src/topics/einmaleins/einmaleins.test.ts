import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, ChoiceAnswer, Exercise, FactBox, GenContext, MultiAnswer, Stufe } from '../../core/types';
import { KERN_FACT_KEYS, SQUARE_FACT_KEYS, factFactors, factKeyOf, isKernFact } from '../../state/facts';
import { checkWorkedSolution } from '../step-check';
import { INTRO_ORDER, MAX_LEARNING, einmaleinsSkill, pickFact } from './einmaleins';
import { allItems, atAb, kindsAt, solve } from './test-support';

describeSkill(einmaleinsSkill);

const CTX: GenContext = { extras: false, today: '2026-10-19' };
const factors = (expression: string) => /^(\d+) · (\d+) = □$/.exec(expression)!.slice(1).map(Number);
const picks = (ctx: GenContext, n = 300) => Array.from({ length: n }, (_, i) => pickFact(createRng(i * 13 + 1), ctx));

const MAP: [Stufe, Ab, string[]][] = [
  [1, 1, ['fakt']],
  [1, 2, ['fakt']],
  [1, 3, ['vergleich', 'stimmt']],
  [2, 1, ['luecke', 'gleich', 'fakt']],
  [2, 2, ['luecke', 'gleich', 'fakt']],
  [2, 3, ['luecke', 'zwei-luecken', 'gleich', 'fakt']],
  [3, 1, ['teilen', 'teilen-gleich']],
  [3, 2, ['dividend', 'teiler']],
  [3, 3, ['kette', 'waehlen', 'geteilt-waehlen']],
];

/** With a factor 1 or two equal factors the form is the exception; everything else follows the table. */
const plainFact = (key: string) => {
  const [k, n] = factFactors(key);
  return k !== 1 && n !== 1 && k !== n;
};
/** Items of one fact at one Stufe and AB level, with this fact due. */
function dueItems(key: string, stufe: Stufe, ab: Ab, n = 30): Exercise[] {
  const facts: Record<string, FactBox> = Object.fromEntries(INTRO_ORDER.map((k) => [k, { box: 4, due: '2026-12-01' }]));
  facts[key] = { box: 1, due: '2026-10-01' };
  return atAb(einmaleinsSkill, stufe, ab, { ...CTX, facts }, n);
}

describe('einmaleins.einmaleins: the fact trainer', () => {
  it.each(MAP)('Stufe %i, AB %i holds exactly its forms', (stufe, ab, kinds) => {
    expect(kindsAt(einmaleinsSkill, stufe, ab, {}, 1000)).toEqual(new Set(kinds));
  });

  it('the question fits the side of the gap: □ · 2 asks how often, 2 · □ asks 2-mal welche Zahl', () => {
    const items = atAb(einmaleinsSkill, 2, 2, { extras: true }, 600).filter((ex) => /:luecke:(vorn|hinten):/.test(ex.key));
    const shown = (ex: (typeof items)[number]) => JSON.stringify([ex.hints, ex.steps, ex.bugs?.map((b) => b.hint)]);
    const front = items.filter((ex) => ex.expression!.startsWith('□'));
    const back = items.filter((ex) => !ex.expression!.startsWith('□'));
    expect(front.length).toBeGreaterThan(0);
    expect(back.length).toBeGreaterThan(0);
    for (const ex of front) expect(shown(ex), ex.key).not.toMatch(/(-mal|Einmal) welche Zahl/);
    for (const ex of back) {
      const [known, p] = /^(\d+) · □ = (\d+)$/.exec(ex.expression!)!.slice(1);
      expect(shown(ex), ex.key).toContain(`${known === '1' ? 'Einmal' : `${known}-mal`} welche Zahl ergibt ${p}?`);
      expect(shown(ex), ex.key).not.toMatch(/Welche Zahl mal|Wie oft passt/);
    }
  });

  it('has the fixed id and title', () => {
    expect(einmaleinsSkill.id).toBe('einmaleins.einmaleins');
    expect(einmaleinsSkill.title).toBe('Kernaufgaben üben');
    expect(einmaleinsSkill.optional).toBeUndefined();
  });

  it('introduces all 40 Kern facts, never a whole row in a row', () => {
    expect([...INTRO_ORDER].sort()).toEqual([...KERN_FACT_KEYS].sort());
    INTRO_ORDER.forEach((key, i) => {
      if (i === 0) return;
      const partner = (k: string) => Number(k.split('x')[1]);
      expect(partner(key), `${INTRO_ORDER[i - 1]} then ${key}`).not.toBe(partner(INTRO_ORDER[i - 1]) + 1);
    });
  });

  it('serves only what it promises, mal 1, 2, 5 and 10: no squares, with extras on or off and with fact data', () => {
    for (const extras of [false, true]) {
      allItems(einmaleinsSkill, { extras }, 200).forEach((ex) => {
        expect(ex.factKey === undefined || isKernFact(ex.factKey), ex.key).toBe(true);
        expect(ex.expression ?? '', ex.key).not.toMatch(/\b([346789]) · \1\b/);
      });
    }
    const facts: Record<string, FactBox> = Object.fromEntries(SQUARE_FACT_KEYS.map((k) => [k, { box: 0, due: '2026-10-01' }]));
    picks({ ...CTX, extras: true, facts }).forEach((k) => expect(isKernFact(k), k).toBe(true));
  });

  it('Stufe 1: a Malaufgabe to recall; AB I in the direct order, AB II in the other order where the fact allows it', () => {
    for (const key of KERN_FACT_KEYS.filter(plainFact)) {
      const [k, n] = factFactors(key);
      if (factKeyOf(n, k) !== key) continue;
      const direct = k === 10 ? `${n} · 10 = □` : `${k} · ${n} = □`;
      const other = k === 10 ? `10 · ${n} = □` : `${n} · ${k} = □`;
      dueItems(key, 1, 1, 5).forEach((ex) => expect(ex.expression, key).toBe(direct));
      dueItems(key, 1, 2, 5).forEach((ex) => expect(ex.expression, key).toBe(other));
    }
  });

  it('Stufe 1, AB III: the bigger result is really bigger, and "stimmt" fits the line', () => {
    const items = atAb(einmaleinsSkill, 1, 3);
    for (const ex of items.filter((e) => e.key.includes(':vergleich:'))) {
      const answer = ex.answer as ChoiceAnswer;
      const values = answer.options.map((o) => o.label.split(' · ').map(Number)).map(([x, y]) => x * y);
      expect(values, ex.key).toHaveLength(2);
      expect(values[answer.correct], ex.key).toBe(Math.max(...values));
      expect(values[0], ex.key).not.toBe(values[1]);
      expect(ex.factKey, ex.key).toBeUndefined();
    }
    const seen = new Set<string>();
    for (const ex of items.filter((e) => e.key.includes(':stimmt:'))) {
      const [a, b, shown] = /^(\d+) · (\d+) = (\d+)$/.exec(ex.expression!)!.slice(1).map(Number);
      const answer = ex.answer as ChoiceAnswer;
      const label = answer.options[answer.correct].label;
      seen.add(label);
      expect(label, ex.key).toBe(a * b === shown ? 'Ja, das stimmt.' : 'Nein, das stimmt nicht.');
      expect(shown, ex.key).toBeLessThanOrEqual(100);
      expect(ex.factKey, ex.key).toBeUndefined();
    }
    expect(seen.size).toBe(2);
  });

  it('Stufe 2: a missing factor in every fact, and none shows its answer except 1 · 1', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const key of KERN_FACT_KEYS) {
        const [k, n] = factFactors(key);
        for (const ex of dueItems(key, 2, ab, 12)) {
          expect(ex.factKey, ex.key).toBe(key);
          if (key === '1x1') continue;
          if (ex.answer.kind === 'number') {
            expect(ex.expression, ex.key).toContain('□');
            expect(ex.answer.value, ex.key).toBe(k === 1 || n === 1 ? 1 : k === n ? k : ex.answer.value);
            if (ex.expression!.split('□').length === 2) expect(solve(ex.expression!), ex.key).toContain(ex.answer.value);
            else expect(ex.answer.value! ** 2, ex.key).toBe(k * n);
            const shown = ex.expression!.match(/\d+/g)!.map(Number);
            expect(shown, ex.key).not.toContain(ex.answer.value);
          } else {
            const fields = (ex.answer as MultiAnswer).fields;
            const [gap, known] = factKeyOf(n, k) === key ? [n, k] : [k, n];
            fields.forEach((f) => expect(f.value, ex.key).toBe(gap));
            expect(fields[0].after, ex.key).toBe(`· ${known} = ${k * n}`);
          }
        }
      }
    }
  });

  it('Stufe 2: the task is the fact it records, in its order: 10 = □ · 2 is 5 · 2 and never counts for 2 · 5', () => {
    for (const key of KERN_FACT_KEYS) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of dueItems(key, 2, ab, 30)) {
          if (key === '1x1' || ex.expression?.includes('□ · □')) continue;
          const text = ex.answer.kind === 'multi' ? `□ ${ex.answer.fields[0].after}` : ex.expression!;
          const value = ex.answer.kind === 'multi' ? ex.answer.fields[0].value : (ex.answer as { value: number }).value;
          const [x, y] = /(\S+) · (\S+)/.exec(text)!.slice(1).map((s) => (s === '□' ? value : Number(s)));
          expect(factKeyOf(x, y), `${ex.key}: ${x} · ${y}`).toBe(key);
        }
      }
    }
  });

  it('Stufe 2: AB I keeps the Kern factor as the known number; AB III turns the equation round or asks 2 facts', () => {
    for (const ex of dueItems('2x7', 2, 1, 10)) expect(ex.expression).toBe('□ · 2 = 14');
    const third = dueItems('2x7', 2, 3, 60);
    expect(third.some((ex) => /^14 = /.test(ex.expression ?? ''))).toBe(true);
    expect(third.some((ex) => ex.answer.kind === 'multi')).toBe(true);
  });

  it('Stufe 3: a Geteiltaufgabe of the fact; with a factor 1 it divides by the number itself and the answer is 1', () => {
    for (const key of KERN_FACT_KEYS) {
      const [k, n] = factFactors(key);
      for (const ex of dueItems(key, 3, 1, 8)) {
        expect(ex.factKey, ex.key).toBe(key);
        if (k === n && k > 1) {
          expect(ex.expression, ex.key).toBe(`${k * k} : □ = □`);
          expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: k });
          continue;
        }
        const [p, d] = /^(\d+) : (\d+) = □$/.exec(ex.expression!)!.slice(1).map(Number);
        expect(p, ex.key).toBe(k * n);
        expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: p / d });
        if (k === 1 || n === 1) expect(p / d, ex.key).toBe(1);
        else expect([1, 2, 5, 10], ex.key).toContain(d);
      }
    }
  });

  it('Stufe 3, AB II: a gap in the Geteiltaufgabe keeps the fact and solves from the task', () => {
    const forms = new Set<string>();
    for (const key of KERN_FACT_KEYS) {
      for (const ex of dueItems(key, 3, 2, 6)) {
        expect(ex.factKey, ex.key).toBe(key);
        expect(solve(ex.expression!), ex.key).toContain((ex.answer as { value: number }).value);
        if (key !== '1x1') expect(ex.expression!.match(/\d+/g)!.map(Number), ex.key).not.toContain((ex.answer as { value: number }).value);
        forms.add(ex.expression!.startsWith('□') ? 'dividend' : 'teiler');
      }
    }
    expect(forms.size).toBe(2);
  });

  it('Stufe 3, AB III: the choice has one option with the result of the task, and it tracks no fact', () => {
    const items = atAb(einmaleinsSkill, 3, 3, {}, 400).filter((e) => e.key.includes(':geteilt-waehlen:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [tp, td] = /wie (\d+) : (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      const answer = ex.answer as ChoiceAnswer;
      answer.options.forEach((o, i) => {
        const [p, d] = o.label.split(' : ').map(Number);
        expect(p % d, o.label).toBe(0);
        expect([2, 5, 10], o.label).toContain(d);
        expect(p / d === tp / td, `${ex.key} ${o.label}`).toBe(i === answer.correct);
      });
      expect(ex.factKey, ex.key).toBeUndefined();
    }
  });

  it('Stufe 3, AB III asks more than a gap of Stufe 2: no prompt names the result, and a typed task has 2 sides to work out', () => {
    const items = atAb(einmaleinsSkill, 3, 3, {}, 600);
    expect(items.some((e) => e.answer.kind === 'number')).toBe(true);
    for (const ex of items) {
      expect(ex.prompt, ex.key).not.toMatch(/Ergebnis \d/);
      if (ex.answer.kind === 'choice') expect(ex.prompt, ex.key).toMatch(/\d+ : \d+\?$/);
      else {
        expect(ex.expression, ex.key).toMatch(/^\d+ : \d+ = □ · \d+$/);
        expect(solve(ex.expression!), ex.key).toContain((ex.answer as { value: number }).value);
      }
    }
  });

  it('the matching task offers only Kern facts: other facts appear only as derivation tasks', () => {
    const items = atAb(einmaleinsSkill, 3, 3, { extras: true }, 2000).filter((e) => e.key.includes(':waehlen:'));
    expect(items.length).toBeGreaterThan(100);
    for (const ex of items) {
      const { options } = ex.answer as ChoiceAnswer;
      expect(options.length, ex.key).toBeGreaterThanOrEqual(3);
      for (const { label } of options) {
        const [x, y] = label.split(' · ').map(Number);
        const fact = factKeyOf(x, y);
        expect(fact !== undefined && isKernFact(fact), `${ex.key}: ${label}`).toBe(true);
      }
      const [p, d] = /wie (\d+) : (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      const right = (ex.answer as ChoiceAnswer).options[(ex.answer as ChoiceAnswer).correct].label.split(' · ').map(Number);
      expect(right[0] * right[1], ex.key).toBe(p / d);
    }
  });

  it('a new learner starts with the first new facts', () => {
    const c: GenContext = { ...CTX, facts: {} };
    expect(new Set(picks(c))).toEqual(new Set(INTRO_ORDER.slice(0, 3)));
  });

  it('due facts come first, most overdue first', () => {
    const facts: Record<string, FactBox> = {};
    INTRO_ORDER.forEach((k) => (facts[k] = { box: 4, due: '2026-12-01' }));
    facts['5x7'] = { box: 2, due: '2026-10-01' };
    expect(new Set(picks({ ...CTX, facts }))).toEqual(new Set(['5x7']));
    facts['2x9'] = { box: 2, due: '2026-10-19' };
    expect(new Set(picks({ ...CTX, facts }))).toEqual(new Set(['5x7', '2x9']));
  });

  it(`new facts wait while ${MAX_LEARNING} facts are still being learned`, () => {
    const open = INTRO_ORDER.slice(0, MAX_LEARNING);
    const facts: Record<string, FactBox> = Object.fromEntries(open.map((k) => [k, { box: 0, due: '2026-12-01' }]));
    expect(new Set(picks({ ...CTX, facts }))).toEqual(new Set(open));
  });

  it('a fact that is due also appears in the planned task, except in the tasks of comparing', () => {
    for (const [stufe, ab] of [[1, 1], [1, 2], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2]] as [Stufe, Ab][]) {
      dueItems('2x9', stufe, ab, 60).forEach((ex) => expect(ex.factKey, ex.key).toBe('2x9'));
    }
    for (const [stufe, ab] of [[1, 3], [3, 3]] as [Stufe, Ab][]) dueItems('2x9', stufe, ab, 60).forEach((ex) => expect(ex.factKey, ex.key).toBeUndefined());
    // A task with a gap on Stufe 3, AB III is typed, so it counts.
    dueItems('2x8', 3, 3, 60).forEach((ex) => expect(ex.factKey, ex.key).toBe(ex.answer.kind === 'number' ? '2x8' : undefined));
  });

  describe('a review slot (GenContext.factKey)', () => {
    const slot = (key: string, stufe: Stufe, seed: number, ab?: Ab) => einmaleinsSkill.generate(createRng(seed), stufe, { ...CTX, factKey: key, ...(ab ? { ab } : {}) });

    it('forces its fact with exactly this factKey, on every Stufe and for every Kern fact', () => {
      for (const key of KERN_FACT_KEYS) {
        for (const stufe of [1, 2, 3] as Stufe[]) {
          for (let seed = 1; seed <= 8; seed++) expect(slot(key, stufe, seed).factKey, `${key} Stufe ${stufe}`).toBe(key);
        }
      }
    });

    it('Stufe 1, the only one a review round names (src/state/round.ts), is the plain task', () => {
      for (const key of KERN_FACT_KEYS) {
        const [k, n] = factFactors(key);
        for (let seed = 1; seed <= 8; seed++) {
          const ex = slot(key, 1, seed);
          const [a, b] = factors(ex.expression!);
          expect(a * b, key).toBe(k * n);
          expect(ex.answer, key).toMatchObject({ kind: 'number', value: k * n });
          expect(ex.visual, key).toBeUndefined();
          expect(ex.ab, key).toBe(1);
        }
      }
    });

    it('Stufe 2 asks the fact as a gap, Stufe 3 as a Geteiltaufgabe; the planned AB stays', () => {
      expect(slot('2x7', 2, 3).expression).toBe('□ · 2 = 14');
      expect(slot('2x7', 3, 3).expression).toBe('14 : 2 = □');
      for (const ab of [1, 2, 3] as Ab[]) expect(slot('5x8', 3, 1, ab).ab).toBe(ab);
    });
  });

  it('every task computes; a task with a fact has the numbers of its fact', () => {
    for (const ex of allItems(einmaleinsSkill)) {
      expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      if (ex.factKey === undefined) {
        expect(ex.answer.kind, 'only a choice tracks no fact').toBe('choice');
        continue;
      }
      const [k, n] = factFactors(ex.factKey);
      const numbers = [ex.expression ?? '', JSON.stringify(ex.answer)].join(' ');
      expect(numbers, ex.key).toMatch(new RegExp(`(?<!\\d)${k * n}(?!\\d)`));
      if (ex.answer.kind === 'number' && ex.expression!.split('□').length === 2) expect(solve(ex.expression!), ex.key).toContain(ex.answer.value);
    }
  });

  it('a new fact gets its Punktefeld on Stufe 1, a known fact does not', () => {
    const fresh = atAb(einmaleinsSkill, 1, 1, { ...CTX, facts: {} }, 40);
    fresh.forEach((ex) => expect(ex.visual?.type).toBe('dotArray'));
    // Only in the most direct form.
    atAb(einmaleinsSkill, 1, 2, { ...CTX, facts: {} }, 40).forEach((ex) => expect(ex.visual).toBeUndefined());
    const facts: Record<string, FactBox> = Object.fromEntries(INTRO_ORDER.map((k) => [k, { box: 3, due: '2026-12-01' }]));
    atAb(einmaleinsSkill, 1, 1, { ...CTX, facts }, 40).forEach((ex) => expect(ex.visual).toBeUndefined());
  });
});
