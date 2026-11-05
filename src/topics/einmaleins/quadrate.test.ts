import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, ChoiceAnswer, MultiAnswer, Stufe } from '../../core/types';
import { ALL_FACT_KEYS, SQUARE_FACT_KEYS, factSkillId } from '../../state/facts';
import { checkWorkedSolution } from '../step-check';
import { quadrateSkill } from './quadrate';
import { allItems, atAb, kindsAt, plannedRound, solve } from './test-support';

describeSkill(quadrateSkill);

const MAP: [Stufe, Ab, string[]][] = [
  [1, 1, ['fakt', 'plus']],
  [1, 2, ['reihen', 'wahl']],
  [1, 3, ['zweimal', 'ergebnis']],
  [2, 1, ['fakt']],
  [2, 2, ['reihen', 'wahl']],
  [2, 3, ['zweimal', 'ergebnis']],
  [3, 1, ['nachbar']],
  [3, 2, ['nachbar', 'zum-quadrat']],
  [3, 3, ['zum-quadrat', 'beide', 'weg']],
];

describe('einmaleins.quadrate', () => {
  it.each(MAP)('Stufe %i, AB %i holds exactly its forms', (stufe, ab, kinds) => {
    expect(kindsAt(quadrateSkill, stufe, ab)).toEqual(new Set(kinds));
  });

  it('a smaller neighbour goes back from the square, a larger one on', () => {
    const list = [...atAb(quadrateSkill, 3, 1), ...atAb(quadrateSkill, 3, 2)];
    expect(list.length).toBeGreaterThan(5);
    for (const ex of list) {
      const less = ex.hints[0].includes('weniger');
      expect(ex.hints[1], ex.key).toMatch(less ? /aus zurück\.$/ : /aus weiter\.$/);
    }
  });

  it('Stufe 3 asks more than Stufe 2 at every AB: never a Kern fact as the target, never a square up to 5 · 5', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      const items = atAb(quadrateSkill, 3, ab, {}, 400);
      for (const ex of items) {
        const [, a, b] = /:(?:nachbar|zum-quadrat|weg):(\d+)x(\d+)/.exec(ex.key) ?? [];
        if (a) {
          expect([1, 2, 5, 10], ex.key).not.toContain(Number(a));
          expect([1, 2, 5, 10], ex.key).not.toContain(Number(b));
        }
        const known = /Du weißt: (\d+) · (\d+)/.exec(ex.prompt);
        if (known) expect(Math.max(Number(known[1]), Number(known[2])), ex.key).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('is an extra', () => {
    expect(quadrateSkill.optional).toBe('extra');
  });

  it('worked solutions compute; every gap solves from the task itself', () => {
    for (const ex of allItems(quadrateSkill)) {
      expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      if (ex.answer.kind === 'number' && ex.expression && ex.expression.split('□').length === 2) expect(solve(ex.expression), ex.key).toContain(ex.answer.value);
    }
  });

  it('owns the 6 squares outside the Kern facts, and a review slot returns its own square', () => {
    const owned = ALL_FACT_KEYS.filter((k) => factSkillId(k) === quadrateSkill.id);
    expect([...owned].sort()).toEqual([...SQUARE_FACT_KEYS].sort());
    for (const factKey of owned) {
      const ex = quadrateSkill.generate(createRng(2), 1, { extras: true, factKey });
      const n = Number(factKey.split('x')[0]);
      expect(ex.factKey).toBe(factKey);
      expect(ex.answer).toMatchObject({ kind: 'number', value: n * n });
      expect(ex.visual).toBeUndefined();
    }
  });

  it('asks 2 · 2, 5 · 5 and 10 · 10, but moves only its own squares: an Extra never moves a Kern fact', () => {
    const items = allItems(quadrateSkill);
    expect(items.some((ex) => ex.expression === '5 · 5 = □' && ex.factKey === undefined)).toBe(true);
    for (const ex of items) if (ex.factKey) expect(SQUARE_FACT_KEYS, ex.key).toContain(ex.factKey);
  });

  it('Stufe 1 keeps to squares up to 5 · 5, Stufe 2 to squares above them, at every AB', () => {
    const sizes = (stufe: Stufe, ab: Ab) => atAb(quadrateSkill, stufe, ab).map((ex) => Number(/(\d+)(?:x\d+)?$/.exec(ex.key)![1]));
    for (const ab of [1, 2, 3] as Ab[]) {
      expect(Math.max(...sizes(1, ab)), `AB ${ab}`).toBeLessThanOrEqual(5);
      expect(Math.min(...sizes(2, ab)), `AB ${ab}`).toBeGreaterThanOrEqual(6);
      expect(Math.max(...sizes(2, ab)), `AB ${ab}`).toBeLessThanOrEqual(10);
    }
    expect(Math.max(...atAb(quadrateSkill, 2, 1).map((ex) => (ex.answer as { value: number }).value))).toBe(100);
  });

  it('n rows of a square: the answer is n · n, without a picture', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ex of atAb(quadrateSkill, stufe, 2).filter((e) => e.key.includes(':reihen:'))) {
        const n = Number(/hat (\d+) Reihen/.exec(ex.prompt)![1]);
        expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: n * n });
        expect(ex.visual, ex.key).toBeUndefined();
      }
    }
  });

  it('which square has this result: only the right option has it', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ex of atAb(quadrateSkill, stufe, 3).filter((e) => e.key.includes(':ergebnis:'))) {
        const p = Number(/Ergebnis (\d+)\?/.exec(ex.prompt)![1]);
        const answer = ex.answer as ChoiceAnswer;
        answer.options.forEach((o, i) => {
          const [x, y] = o.label.split(' · ').map(Number);
          expect(x * y === p, `${ex.key} ${o.label}`).toBe(i === answer.correct);
        });
      }
    }
  });

  it('n · n = □ has one key, with a field or without: a sheet or a twin does not repeat the calculation', () => {
    const keys = (expression: string) => new Set(allItems(quadrateSkill).filter((ex) => ex.expression === expression).map((ex) => ex.key.split(':').slice(2).join(':')));
    expect(keys('4 · 4 = □')).toEqual(new Set(['fakt:4x4']));
    expect(allItems(quadrateSkill).some((ex) => ex.expression === '4 · 4 = □' && ex.visual)).toBe(true);
  });

  it('a round of Stufe 1 repeats no task, with squares to 5 · 5 in all its AB I items', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const round = plannedRound(quadrateSkill, 1, seed);
      const keys = round.map((ex) => ex.key);
      expect(new Set(keys).size, keys.join(', ')).toBe(keys.length);
      for (const ex of round.filter((e) => e.ab === 1)) expect((ex.answer as { value: number }).value, ex.key).toBeLessThanOrEqual(25);
    }
  });

  it('□ · □ = p asks for the same number twice', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      const items = atAb(quadrateSkill, stufe, 3).filter((ex) => ex.key.includes(':zweimal:'));
      expect(items.length).toBeGreaterThan(0);
      for (const ex of items) {
        const p = Number(/= (\d+)$/.exec(ex.expression!)![1]);
        const v = (ex.answer as { value: number }).value;
        expect(v * v).toBe(p);
      }
    }
  });

  it('Stufe 3: the neighbour of a square, one factor apart, with its square in the task and no factKey; one more with a field in AB I, either way without one in AB II', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(quadrateSkill, 3, ab).filter((e) => e.key.includes(':nachbar:'))) {
        const [n, s, a, b] = [.../Du weißt: (\d+) · \1 = (\d+)\. Wie viel ist (\d+) · (\d+)\?/.exec(ex.prompt)!].slice(1).map(Number);
        expect(s).toBe(n * n);
        expect(Math.abs(a - b)).toBe(1);
        expect([a, b]).toContain(n);
        expect(n, ex.key).toBeGreaterThanOrEqual(6);
        if (ab === 1) expect(a * b, ex.key).toBeGreaterThan(s);
        expect(ex.visual !== undefined, ex.key).toBe(ab === 1);
        expect(ex.answer).toMatchObject({ kind: 'number', value: a * b });
        expect(ex.factKey).toBeUndefined();
        expect(ex.bugs?.find((x) => x.id === 'nachbar-vergessen')?.match).toBe(s);
      }
    }
  });

  it('Stufe 3, AB III: back to the square, both neighbours, and which way leads to the neighbour', () => {
    const items = atAb(quadrateSkill, 3, 3);
    for (const ex of items.filter((e) => e.key.includes(':zum-quadrat:'))) {
      const [a, b, known, n] = /Du weißt: (\d+) · (\d+) = (\d+)\. Wie viel ist (\d+) · \4\?/.exec(ex.prompt)!.slice(1).map(Number);
      expect(a * b).toBe(known);
      expect([a, b]).toContain(n);
      expect(ex.answer).toMatchObject({ kind: 'number', value: n * n });
    }
    for (const ex of items.filter((e) => e.key.includes(':beide:'))) {
      const n = Number(/Du weißt: (\d+) ·/.exec(ex.prompt)![1]);
      expect((ex.answer as MultiAnswer).fields.map((f) => f.value), ex.key).toEqual([n * (n - 1), n * (n + 1)]);
    }
    for (const ex of items.filter((e) => e.key.includes(':weg:'))) {
      const [n, s, a, b] = /Du weißt: (\d+) · \1 = (\d+)\. Welcher Weg führt zu (\d+) · (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      expect(s, ex.key).toBe(n * n);
      const answer = ex.answer as ChoiceAnswer;
      answer.options.forEach((o, i) => {
        const [x, sign, y] = o.label.split(' ');
        expect(Number(x), `${ex.key} ${o.label}`).toBe(s);
        expect((sign === '+' ? s + Number(y) : s - Number(y)) === a * b, `${ex.key} ${o.label}`).toBe(i === answer.correct);
      });
      // Every option starts at the square and no hint tells the way.
      for (const hint of ex.hints) expect(hint, ex.key).not.toContain(answer.options[answer.correct].label);
    }
    items.forEach((ex) => expect(ex.factKey, ex.key).toBeUndefined());
  });
});
