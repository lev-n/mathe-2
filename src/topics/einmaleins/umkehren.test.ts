import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, MultiAnswer, Stufe } from '../../core/types';
import { factKeyOf } from '../../state/facts';
import { checkWorkedSolution } from '../step-check';
import { atAb, allItems, kindsAt, solve } from './test-support';
import { umkehrenSkill } from './umkehren';

describeSkill(umkehrenSkill);

const MAP: [Stufe, Ab, string[], string[]][] = [
  [1, 1, ['mal-zu-geteilt'], []],
  [1, 2, ['mal-zu-geteilt'], []],
  [1, 3, ['geteilt-waehlen', 'mal-waehlen'], []],
  [2, 1, ['fakt'], []],
  [2, 2, ['fakt', 'teiler'], []],
  [2, 3, ['dividend', 'pruefen'], []],
  [3, 1, ['familie'], []],
  [3, 2, ['familie-geteilt', 'zwei'], []],
  [3, 3, ['familie-luecken', 'gehoert-nicht'], ['quadrat']],
];

describe('einmaleins.umkehren', () => {
  it.each(MAP)('Stufe %i, AB %i holds exactly its forms', (stufe, ab, kinds, extras) => {
    expect(kindsAt(umkehrenSkill, stufe, ab, { extras: false })).toEqual(new Set(kinds));
    expect(kindsAt(umkehrenSkill, stufe, ab, { extras: true })).toEqual(new Set([...kinds, ...extras]));
  });

  it('worked solutions compute; every gap solves from the task itself', () => {
    for (const ex of allItems(umkehrenSkill)) {
      expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      if (ex.answer.kind === 'number' && ex.expression && ex.expression.split('□').length === 2) expect(solve(ex.expression), ex.key).toContain(ex.answer.value);
    }
  });

  it('p : □ = q asks q-mal welche Zahl: the gap of its Malaufgabe stays behind', () => {
    const items = allItems(umkehrenSkill).filter((ex) => ex.key.includes(':teiler:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [p, q] = /^(\d+) : □ = (\d+)$/.exec(ex.expression!)!.slice(1);
      expect(ex.hints[1], ex.key).toBe(`${q === '1' ? 'Einmal' : `${q}-mal`} welche Zahl ergibt ${p}?`);
      (ex.bugs ?? []).forEach((b) => expect(b.hint, ex.key).not.toMatch(/Wie oft passt/));
    }
  });

  it('Stufe 1 shows the fact, so no fact is tracked; AB I divides by the Kern factor with a field, AB II by the other factor without', () => {
    for (const ab of [1, 2, 3] as Ab[]) atAb(umkehrenSkill, 1, ab).forEach((ex) => expect(ex.factKey, ex.key).toBeUndefined());
    for (const [ab, kern] of [[1, true], [2, false]] as const) {
      for (const ex of atAb(umkehrenSkill, 1, ab)) {
        const [a, b, p] = /^Du weißt: (\d+) · (\d+) = (\d+)\.$/.exec(ex.prompt)!.slice(1).map(Number);
        const [dividend, d] = /^(\d+) : (\d+) = □$/.exec(ex.expression!)!.slice(1).map(Number);
        expect(a * b).toBe(p);
        expect(dividend).toBe(p);
        expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: p / d });
        // In a fact with two easy factors each of them is a Kern factor.
        if (![a, b].every((x) => [2, 5, 10].includes(x))) expect([2, 5, 10].includes(d), ex.key).toBe(kern);
        expect(ex.visual !== undefined, ex.key).toBe(kern);
      }
    }
  });

  it('Stufe 1, AB III: only the right line holds and belongs to the fact', () => {
    for (const ex of atAb(umkehrenSkill, 1, 3).filter((e) => e.key.includes(':geteilt-waehlen:'))) {
      const [a, b, p] = /(\d+) · (\d+) = (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      const answer = ex.answer as ChoiceAnswer;
      answer.options.forEach((o, i) => {
        const [x, y, q] = /^(\d+) : (\d+) = (\d+)$/.exec(o.label)!.slice(1).map(Number);
        expect(x / y === q && x === p && [a, b].includes(y), `${ex.key} ${o.label}`).toBe(i === answer.correct);
      });
    }
    for (const ex of atAb(umkehrenSkill, 1, 3).filter((e) => e.key.includes(':mal-waehlen:'))) {
      const [p, d] = /(\d+) : (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toBe(`${p / d} · ${d}`);
    }
  });

  it('Stufe 2: divisors 1, 2, 5, 10 and dividends up to 100; a plain Geteiltaufgabe tracks its fact and never shows its answer', () => {
    let plain = 0;
    const divisors = new Set<number>();
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of atAb(umkehrenSkill, 2, ab, {}, 800)) {
        const gap = /^(\d+) : □ = (\d+)$/.exec(ex.expression!);
        if (gap) {
          const [p, q] = gap.slice(1).map(Number);
          divisors.add(p / q);
          expect(p, ex.key).toBeLessThanOrEqual(100);
          expect(q, ex.key).not.toBe(p / q);
          continue;
        }
        const m = /^(\d+) : (\d+) = □$/.exec(ex.expression!)!;
        plain += 1;
        const [p, d] = m.slice(1).map(Number);
        divisors.add(d);
        expect(p).toBeLessThanOrEqual(100);
        expect([2, 5, 10]).toContain(d);
        expect(p / d, ex.key).not.toBe(d);
        expect(ex.factKey, ex.key).toBe(factKeyOf(p / d, d));
      }
    }
    expect(plain).toBeGreaterThan(0);
    expect(divisors).toEqual(new Set([1, 2, 5, 10]));
  });

  it('Stufe 2, AB III: □ : d = q does not show its answer, and the check is the Malaufgabe', () => {
    const items = atAb(umkehrenSkill, 2, 3);
    for (const ex of items.filter((e) => e.key.includes(':dividend:'))) {
      const [d, q] = /^□ : (\d+) = (\d+)$/.exec(ex.expression!)!.slice(1).map(Number);
      expect(d, ex.key).toBeGreaterThan(1);
      expect(q, ex.key).toBeGreaterThan(1);
      expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: d * q });
    }
    for (const ex of items.filter((e) => e.key.includes(':pruefen:'))) {
      const [p, d, q] = /(\d+) : (\d+) = (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toBe(`${q} · ${d} = ${p}`);
    }
  });

  it('Stufe 3: every field of a family computes', () => {
    const items = [...atAb(umkehrenSkill, 3, 1), ...atAb(umkehrenSkill, 3, 2)].filter((ex) => /:familie(-geteilt)?:/.test(ex.key));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [a, b] = /(\d+)x(\d+)/.exec(ex.key)!.slice(1).map(Number);
      const answer = ex.answer as MultiAnswer;
      expect(answer.fields).toHaveLength(3);
      const shown = [ex.prompt, ex.expression, ...answer.fields.flatMap((f) => [f.before, f.after])].filter(Boolean).join(' ');
      if (ex.key.includes(':familie:')) {
        expect(answer.fields.map((f) => f.value), ex.key).toEqual([a * b, a * b, a]);
        // The Malaufgabe has its result as a gap, so nothing is copied: the product stands nowhere in the task.
        expect(shown, ex.key).not.toMatch(new RegExp(`(?<!\\d)${a * b}(?!\\d)`));
      } else {
        expect(answer.fields.map((f) => f.value), ex.key).toEqual([a, a, a]);
        expect(shown, ex.key).not.toMatch(new RegExp(`(?<!\\d)${a}(?!\\d)`));
      }
    }
  });

  it('Stufe 3, AB II: two gaps come from a fact that the task does not give', () => {
    const items = atAb(umkehrenSkill, 3, 2).filter((ex) => ex.key.includes(':zwei:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [q, d] = ex.key.split(':').slice(-2).map(Number);
      const answer = ex.answer as MultiAnswer;
      expect(answer.fields.map((f) => f.value)).toEqual([q * d, q * d]);
      expect(answer.fields[0].after).toBe(`: ${d} = ${q}`);
      expect(answer.fields[1].after).toBe(`: ${q} = ${d}`);
      expect(ex.prompt, ex.key).not.toMatch(/\d/);
    }
  });

  it('no hint of the check names the Malaufgabe of the answer', () => {
    const items = atAb(umkehrenSkill, 2, 3, {}, 400).filter((e) => e.key.includes(':pruefen:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [q, d] = ex.key.split(':').slice(-2);
      for (const hint of ex.hints) {
        expect(hint, ex.key).not.toContain(`${q} mal ${d}`);
        expect(hint, ex.key).not.toContain(`${q} · ${d}`);
      }
    }
  });

  it('Stufe 3, AB III: the gaps of a family solve, and only one line does not belong', () => {
    const items = atAb(umkehrenSkill, 3, 3);
    for (const ex of items.filter((e) => e.key.includes(':familie-luecken:'))) {
      const [a, b] = /(\d+)x(\d+)/.exec(ex.key)!.slice(1).map(Number);
      const answer = ex.answer as MultiAnswer;
      expect(answer.fields.map((f) => f.value), ex.key).toEqual([a, b, a * b]);
      expect(answer.fields[0].after, ex.key).toBe(`· ${b} = ${a * b}`);
      expect(answer.fields[1].after, ex.key).toBe(`= ${a}`);
      expect(answer.fields[2].after, ex.key).toBe(`: ${a} = ${b}`);
    }
    for (const ex of items.filter((e) => e.key.includes(':gehoert-nicht:'))) {
      const [a, b] = /(\d+) · (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      const family = new Set([`${b} · ${a} = ${a * b}`, `${a * b} : ${a} = ${b}`, `${a * b} : ${b} = ${a}`]);
      const answer = ex.answer as ChoiceAnswer;
      answer.options.forEach((o, i) => expect(family.has(o.label), `${ex.key} ${o.label}`).toBe(i !== answer.correct));
    }
  });

  it('a divisor from a square (Bayern) comes only with extras on, and neither the task nor a hint states the divisor', () => {
    const quadrat = (extras: boolean) => atAb(umkehrenSkill, 3, 3, { extras }).filter((ex) => ex.key.includes(':quadrat:'));
    expect(quadrat(false)).toEqual([]);
    expect(quadrat(true).length).toBeGreaterThan(0);
    quadrat(true).forEach((ex) => {
      const p = Number(/^(\d+) : □ = □$/.exec(ex.expression!)![1]);
      const d = (ex.answer as { value: number }).value;
      expect(d * d).toBe(p);
      for (const text of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(text, ex.key).not.toMatch(new RegExp(`(?<!\\d)${d}(?!\\d)`));
      // a core skill does not start the Extra's facts: Quadrataufgaben stays out of reviews until the child opens it
      expect(ex.factKey).toBeUndefined();
    });
  });
});
