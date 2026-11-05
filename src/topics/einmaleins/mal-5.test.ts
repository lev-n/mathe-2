import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { generateUnique } from '../../core/generate';
import type { Ab, ChoiceAnswer, MultiAnswer, Stufe } from '../../core/types';
import { factKeyOf } from '../../state/facts';
import { checkWorkedSolution } from '../step-check';
import { factBugs, factHints, factSteps } from './helpers';
import { mal5Skill } from './mal-5';
import { allItems, atAb, kindsAt, solve } from './test-support';

describeSkill(mal5Skill);

const factors = (expression: string) => /^(\d+) · (\d+) = □$/.exec(expression)?.slice(1).map(Number);
const partnerOf = (f: number[]) => (f[0] === 5 ? f[1] : f[0]);

const MAP: [Stufe, Ab, string[]][] = [
  [1, 1, ['fakt', 'fuenfer', 'haende']],
  [1, 2, ['fakt', 'plus-wahl']],
  [1, 3, ['haende-luecke', 'ergebnis', 'stimmt']],
  [2, 1, ['haelfte', 'feld-haelfte']],
  [2, 2, ['fakt', 'zwei-schritte']],
  [2, 3, ['zurueck', 'weg']],
  [3, 1, ['luecke']],
  [3, 2, ['luecke', 'haende-luecke']],
  [3, 3, ['gleich-zehn', 'zwei-luecken', 'stimmt']],
];

describe('einmaleins.mal-5', () => {
  it('Stufe 1, AB III and Stufe 3, AB I have real variety, at least 12 items each', () => {
    for (const [stufe, ab] of [[1, 3], [3, 1]] as [Stufe, Ab][]) {
      expect(new Set(atAb(mal5Skill, stufe, ab, {}, 400).map((ex) => ex.key)).size, `Stufe ${stufe} AB ${ab}`).toBeGreaterThanOrEqual(12);
    }
  });

  it('after 1 comes the singular: "Das ist nur 1 Fünfer."', () => {
    for (const ex of atAb(mal5Skill, 1, 2, {}, 400)) {
      const texts = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.whyWrong ? [o.whyWrong] : [])) : [];
      for (const text of texts) expect(text, ex.key).not.toMatch(/sind (nur )?1 Fünfer/);
    }
  });

  it.each(MAP)('Stufe %i, AB %i holds exactly its forms', (stufe, ab, kinds) => {
    expect(kindsAt(mal5Skill, stufe, ab)).toEqual(new Set(kinds));
  });

  it('worked solutions compute; every gap solves from the task itself', () => {
    for (const ex of allItems(mal5Skill)) {
      expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      if (ex.answer.kind === 'number' && ex.expression) expect(solve(ex.expression), ex.key).toContain(ex.answer.value);
    }
  });

  it('Stufe 1 has 1–5 · 5, Stufe 2 6–10 · 5, at every AB', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(mal5Skill, 1, ab)) {
        const f = factors(ex.expression ?? '');
        if (f) expect(partnerOf(f), ex.key).toBeLessThanOrEqual(5);
        if (ex.answer.kind === 'number') expect(ex.answer.value, ex.key).toBeLessThanOrEqual(25);
      }
      for (const ex of atAb(mal5Skill, 2, ab)) {
        const f = factors(ex.expression ?? '');
        if (f) expect(partnerOf(f), ex.key).toBeGreaterThanOrEqual(6);
        const value = ex.answer.kind === 'number' ? ex.answer.value! : ex.answer.kind === 'multi' ? (ex.answer as MultiAnswer).fields[1].value : 30;
        expect(value, ex.key).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it('Stufe 2, AB I reaches mal 5 through a given mal 10: forgetting the half is a known error', () => {
    const items = atAb(mal5Skill, 2, 1);
    const given = items.filter((ex) => ex.prompt.startsWith('Du weißt'));
    expect(given.length).toBeGreaterThan(0);
    for (const ex of given) {
      const ten = Number(/= (\d+)\./.exec(ex.prompt)![1]);
      expect(ex.answer).toMatchObject({ kind: 'number', value: ten / 2 });
      expect(ex.bugs?.find((b) => b.id === 'haelfte-vergessen')?.match).toBe(ten);
    }
  });

  it('Stufe 2, AB III goes back to mal 10 and asks for the way, whose right label is the half', () => {
    const items = atAb(mal5Skill, 2, 3);
    for (const ex of items.filter((e) => e.key.includes(':zurueck:'))) {
      const [n, five, , ten] = /Du weißt: (\d+) · 5 = (\d+)\. Wie viel ist (\d+) · (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      expect(n * 5).toBe(five);
      expect(ten).toBe(10);
      expect(ex.answer).toMatchObject({ kind: 'number', value: 10 * n });
    }
    for (const ex of items.filter((e) => e.key.includes(':weg:'))) {
      const [a, b] = /(\d+) · (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toBe(`Die Hälfte von ${2 * a * b}`);
    }
  });

  it('Stufe 3: the gap is in front in AB I, also with the result first, behind in AB II; none shows its answer', () => {
    for (const ex of atAb(mal5Skill, 3, 1)) expect(ex.expression, ex.key).toMatch(/^□ · 5 = \d+$|^\d+ = □ · 5$/);
    for (const ex of atAb(mal5Skill, 3, 2).filter((e) => e.expression)) expect(ex.expression, ex.key).toMatch(/^5 · □ = \d+$/);
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of atAb(mal5Skill, 3, ab).filter((e) => e.expression)) {
        const p = Number(/\d+$|^\d+/.exec(ex.expression!.replace('· 5', '').replace('5 ·', ''))![0]);
        expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: p / 5 });
        expect(p / 5, ex.key).not.toBe(5);
      }
    }
  });

  it('Stufe 3, AB III: □ · 5 = 4 · 10 solves, the 2 gaps are 8 and 4 for 40, and "stimmt" fits the line', () => {
    const items = atAb(mal5Skill, 3, 3);
    for (const ex of items.filter((e) => e.key.includes(':gleich-zehn:'))) expect(solve(ex.expression!), ex.key).toEqual([(ex.answer as { value: number }).value]);
    for (const ex of items.filter((e) => e.key.includes(':zwei-luecken:'))) {
      const p = Number(ex.key.split(':').pop());
      expect((ex.answer as MultiAnswer).fields.map((f) => f.value), ex.key).toEqual([p / 5, p / 10]);
    }
    for (const ex of items.filter((e) => e.key.includes(':stimmt:'))) {
      const [n, shown] = /^(\d+) · 5 = (\d+)$/.exec(ex.expression!)!.slice(1).map(Number);
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toBe(n * 5 === shown ? 'Ja, das stimmt.' : 'Nein, das stimmt nicht.');
    }
  });

  it('a recalled fact carries its key', () => {
    for (const ex of allItems(mal5Skill)) {
      const f = factors(ex.expression ?? '');
      if (f) expect(ex.factKey, ex.key).toBe(factKeyOf(f[0], f[1]));
    }
  });

  it('a fact keeps its key with or without a picture, so sheets and twins do not repeat the calculation', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const seen = new Set<string>();
      const sheet = Array.from({ length: 6 }, (_, i) => {
        const ex = generateUnique(mal5Skill, 1, seed * 101 + i, { extras: true }, seen);
        seen.add(ex.key);
        return ex;
      });
      const facts = sheet.flatMap((ex) => (factors(ex.expression ?? '') ? [ex.expression] : []));
      expect(new Set(facts).size, `seed ${seed}: ${facts.join(', ')}`).toBe(facts.length);
    }
  });

  it('the picture of the hands comes only with the solution: its frames show the answer', () => {
    const items = [...atAb(mal5Skill, 1, 3), ...atAb(mal5Skill, 3, 2)].filter((ex) => ex.key.includes(':haende-luecke:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      expect(ex.visual, ex.key).toBeUndefined();
      expect(ex.steps.some((s) => typeof s !== 'string' && s.visual), ex.key).toBe(true);
      expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: Number(/(\d+) Finger/.exec(ex.prompt)![1]) / 5 });
    }
    // In every gap of Stufe 3 a picture would have to leave the answer open.
    atAb(mal5Skill, 3, 3).forEach((ex) => expect(ex.visual, ex.key).toBeUndefined());
  });

  it('half a field: the task text names the dots per row, so reading aloud and srText can solve it (T14)', () => {
    const items = atAb(mal5Skill, 2, 1).filter((ex) => ex.key.includes(':feld-haelfte:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const n = Number(ex.key.split(':').pop());
      expect(ex.context, ex.key).toContain(`10 Reihen mit je ${n} Punkten`);
      expect(ex.srText, ex.key).toContain(`10 Reihen mit je ${n} Punkten`);
    }
  });

  it('half of mal 10 keeps the first factor: 3 · 5 from 3 · 10, 5 · 3 from 10 · 3 (F5)', () => {
    for (const n of [3, 4, 6, 7, 8, 9]) {
      for (const [a, b, ten] of [[n, 5, `${n} · 10`], [5, n, `10 · ${n}`]] as const) {
        expect(factHints(a, b)[0]).toBe(`Rechne zuerst ${ten}.`);
        expect(factSteps(a, b)[0]).toBe(`${ten} = ${10 * n}`);
        expect(factBugs(a, b).find((bug) => bug.id === 'haelfte-vergessen')?.hint).toBe(`Das ist ${ten}. Du brauchst die Hälfte davon.`);
      }
    }
  });

  it('the Punktefeld of a fact stands by the step that names this fact, not by the easier task', () => {
    const items = atAb(mal5Skill, 1, 1).filter((ex) => ex.visual && factors(ex.expression ?? ''));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [a, b] = factors(ex.expression!)!;
      const pictured = ex.steps.filter((s) => typeof s !== 'string' && s.visual) as { text: string; visual: unknown }[];
      expect(pictured, ex.key).toHaveLength(1);
      expect(pictured[0].visual, ex.key).toEqual(ex.visual);
      expect(pictured[0].text, ex.key).toBe(`${a} · ${b} = ${a * b}`);
    }
  });

  it('Stufe 3: the gap is found through mal, and minus is a known error', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of atAb(mal5Skill, 3, ab).filter((e) => e.expression)) {
        expect(ex.expression).toMatch(/□/);
        const p = (ex.answer as { value: number }).value * 5;
        expect(ex.bugs?.find((b) => b.id === 'minus-statt-mal')?.match).toBe(p - 5);
      }
    }
  });
});
