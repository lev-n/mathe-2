import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Stufe } from '../../core/types';
import { ALL_FACT_KEYS, factFactors, factKeyOf } from '../../state/facts';
import { mentionsNumber } from '../shared';
import { checkWorkedSolution } from '../step-check';
import { factBugs, factHints, factSteps } from './helpers';
import { mal1210Skill } from './mal-1-2-10';
import { allItems, atAb, kindsAt, solve } from './test-support';

describeSkill(mal1210Skill);

const factors = (expression: string) => /^(\d+) · (\d+) = □$/.exec(expression)?.slice(1).map(Number);

const MAP: [Stufe, Ab, string[], string[]][] = [
  [1, 1, ['fakt'], []],
  [1, 2, ['fakt', 'zehner-plus'], []],
  [1, 3, ['zehner', 'ergebnis', 'stimmt'], []],
  [2, 1, ['fakt', 'verdoppeln'], []],
  [2, 2, ['fakt', 'verdoppeln', 'doppel-wahl'], []],
  [2, 3, ['doppel-kette', 'stimmt-doppel'], []],
  [3, 1, ['luecke'], []],
  [3, 2, ['luecke'], []],
  [3, 3, ['geschichte', 'paar'], ['null']],
];

describe('einmaleins.mal-1-2-10', () => {
  it.each(MAP)('Stufe %i, AB %i holds exactly its forms', (stufe, ab, kinds, extras) => {
    expect(kindsAt(mal1210Skill, stufe, ab, { extras: false })).toEqual(new Set(kinds));
    expect(kindsAt(mal1210Skill, stufe, ab, { extras: true })).toEqual(new Set([...kinds, ...extras]));
  });

  it('worked solutions compute; every gap solves from the task itself', () => {
    for (const ex of allItems(mal1210Skill)) {
      expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      if (ex.answer.kind === 'number' && ex.expression && !ex.expression.includes('Zehner')) expect(solve(ex.expression), ex.key).toContain(ex.answer.value);
    }
  });

  it('Stufe 1 is mal 10 and mal 1 and no mal 2; AB I names n · 10 and 1 · n, AB II the other order', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(mal1210Skill, 1, ab)) {
        const f = factors(ex.expression ?? '');
        if (f) expect(f.includes(10) || f.includes(1), ex.key).toBe(true);
      }
    }
    atAb(mal1210Skill, 1, 1).forEach((ex) => expect(ex.expression, ex.key).toMatch(/^(\d+ · 10|1 · \d+) = □$/));
    atAb(mal1210Skill, 1, 2).filter((ex) => factors(ex.expression ?? '')).forEach((ex) => expect(ex.expression, ex.key).toMatch(/^(10 · \d+|\d+ · 1) = □$/));
  });

  it('Stufe 2 is mal 2; AB I names 2 · n, AB II also n · 2', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of atAb(mal1210Skill, 2, ab)) {
        const f = factors(ex.expression ?? '');
        if (f) expect(f, ex.key).toContain(2);
      }
    }
    atAb(mal1210Skill, 2, 1).filter((ex) => factors(ex.expression ?? '')).forEach((ex) => expect(factors(ex.expression!)![0], ex.key).toBe(2));
    expect(atAb(mal1210Skill, 2, 2).some((ex) => /^\d+ · 2 = □$/.test(ex.expression ?? ''))).toBe(true);
  });

  it('Stufe 3: a missing factor with mal 2 or mal 10, gap in front in AB I, behind in AB II', () => {
    for (const [ab, re] of [[1, /^□ · (2|10) = (\d+)$/], [2, /^(2|10) · □ = (\d+)$/]] as const) {
      for (const ex of atAb(mal1210Skill, 3, ab)) {
        const [known, p] = re.exec(ex.expression!)!.slice(1).map(Number);
        expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: p / known });
        expect(p / known, `${ex.key}: the gap must not show its answer`).not.toBe(known);
      }
    }
  });

  it('70 = □ Zehner: the number is on the left, no picture and no Malaufgabe come with the task', () => {
    const items = atAb(mal1210Skill, 1, 3).filter((ex) => ex.key.includes(':zehner:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const number = Number(/^(\d+) = □ Zehner$/.exec(ex.expression!)![1]);
      expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: number / 10 });
      expect(ex.visual, ex.key).toBeUndefined();
    }
  });

  it('double twice: the fields are 2n and 4n; a story with socks or pens is the missing factor', () => {
    for (const ex of atAb(mal1210Skill, 2, 3).filter((e) => e.key.includes(':doppel-kette:'))) {
      const n = Number(/Verdopple (\d+)\./.exec(ex.prompt)![1]);
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      expect(ex.answer.fields.map((f) => f.value)).toEqual([2 * n, 4 * n]);
    }
    const stories = atAb(mal1210Skill, 3, 3).filter((e) => e.key.includes(':geschichte:'));
    expect(stories.length).toBeGreaterThan(0);
    for (const ex of stories) {
      const [k, p] = ex.context!.match(/\d+/g)!.map(Number);
      expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: p / k });
    }
  });

  it('the "stimmt" forms hold exactly when the line computes', () => {
    const items = [...atAb(mal1210Skill, 1, 3), ...atAb(mal1210Skill, 2, 3)].filter((e) => /:stimmt/.test(e.key));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const value = (side: string) => {
        const m = /^(\d+) ([·+]) (\d+)$/.exec(side.trim());
        return m ? (m[2] === '·' ? Number(m[1]) * Number(m[3]) : Number(m[1]) + Number(m[3])) : Number(side);
      };
      const [left, right] = ex.expression!.split(' = ');
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toBe(value(left) === value(right) ? 'Ja, das stimmt.' : 'Nein, das stimmt nicht.');
    }
  });

  it('a recalled fact carries its key, in the normal order of the key', () => {
    let seen = 0;
    for (const ex of allItems(mal1210Skill)) {
      const f = factors(ex.expression ?? '');
      if (f && f[0] > 0 && f[1] > 0) {
        expect(ex.factKey, ex.key).toBe(factKeyOf(f[0], f[1]));
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('mal 0 (Bayern) comes only with extras on, and its hint does not state the result', () => {
    const hasZero = (extras: boolean) => atAb(mal1210Skill, 3, 3, { extras }).some((ex) => /(^| )0( |$)/.test(ex.expression ?? ''));
    expect(hasZero(true)).toBe(true);
    expect(hasZero(false)).toBe(false);
    atAb(mal1210Skill, 3, 3, { extras: true }, 600).filter((ex) => ex.key.includes(':null:')).forEach((ex) => expect(ex.hints.join(' '), ex.key).not.toMatch(/bleibt nichts|gar nicht\./));
  });

  it('after naming the task, no fact hint states the result, also not for mal 1 (7 · 1, 1 · 7)', () => {
    for (const key of ALL_FACT_KEYS) {
      const [x, y] = factFactors(key);
      for (const [a, b] of [[x, y], [y, x]]) {
        const p = String(a * b);
        const label = `${a} · ${b}`;
        factHints(a, b).slice(1).forEach((h) => expect(mentionsNumber(h, p), `${label}: ${h}`).toBe(false));
        factBugs(a, b).filter((bug) => bug.id === 'mal-eins').forEach((bug) => expect(mentionsNumber(bug.hint, p), `${label}: ${bug.hint}`).toBe(false));
      }
    }
  });

  it('a fact reads as a-mal die b, like its Punktefeld: n · 10 is n Zehner, 10 · n is 10 Achter (F5)', () => {
    const names = ['Zweier', 'Dreier', 'Vierer', 'Fünfer', 'Sechser', 'Siebener', 'Achter', 'Neuner'];
    names.forEach((name, i) => {
      const n = i + 2;
      expect(factHints(n, 10)).toEqual(['Bei mal 10 denkst du an Zehner.', `Das sind ${n} Zehner.`]);
      expect(factSteps(n, 10)[0]).toBe(`${n} · 10 sind ${n} Zehner.`);
      // 10 · n: the Zehner only through the Tauschaufgabe, and the text names it.
      expect(factHints(10, n)).toEqual([`10 · ${n} sind 10 ${name}.`, `Tausche: ${n} · 10 sind ${n} Zehner.`]);
      expect(factSteps(10, n).slice(0, 2)).toEqual([`10 · ${n} sind 10 ${name}.`, `Tausche: ${n} · 10 sind ${n} Zehner.`]);
      expect(factBugs(10, n).find((bug) => bug.id === 'mal-zehn')?.hint).toBe(`Tausche: ${n} · 10 sind ${n} Zehner.`);
    });
    expect(factHints(10, 10)[1]).toBe('Das sind 10 Zehner.');
    expect(factSteps(10, 10)[0]).toBe('10 · 10 sind 10 Zehner.');
  });

  it('a fact reads as a-mal die b, like its Punktefeld: 2 · n doubles n, n · 2 says the Tausch', () => {
    for (let n = 3; n <= 9; n++) {
      expect(factHints(2, n)[1]).toBe(`Rechne ${n} + ${n}.`);
      expect(factSteps(2, n)[0]).toBe(`Mal 2 heißt verdoppeln: ${n} + ${n}.`);
      expect(factHints(n, 2)).toEqual([`${n} · 2 heißt ${n}-mal die 2.`, `Tausche und verdopple: 2 · ${n} heißt ${n} + ${n}.`]);
      expect(factSteps(n, 2).slice(0, 2)).toEqual([`${n} · 2 heißt ${n}-mal die 2.`, `Tausche und verdopple: 2 · ${n} = ${n} + ${n}`]);
    }
  });

  it('the Punktefeld of a fact shows a rows of b, by the step that names a · b', () => {
    const items = allItems(mal1210Skill).filter((ex) => ex.visual && factors(ex.expression ?? ''));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [a, b] = factors(ex.expression!)!;
      expect(ex.visual, ex.key).toMatchObject({ rows: a, cols: b });
      const pictured = ex.steps.filter((s) => typeof s !== 'string' && s.visual) as { text: string; visual: unknown }[];
      expect(pictured, ex.key).toHaveLength(1);
      expect(pictured[0].visual, ex.key).toEqual(ex.visual);
      expect(pictured[0].text, ex.key).toBe(`${a} · ${b} = ${a * b}`);
    }
  });

  it('typical errors: 7 · 10 = 17 and 710, 5 · 0 = 5', () => {
    const tens = atAb(mal1210Skill, 1, 1).find((ex) => ex.expression === '7 · 10 = □')!;
    expect(tens.bugs!.filter((b) => b.id === 'mal-zehn').map((b) => b.match).sort()).toEqual([17, 710]);
    const zero = atAb(mal1210Skill, 3, 3).find((ex) => ex.expression === '5 · 0 = □')!;
    expect(zero.bugs).toEqual([expect.objectContaining({ id: 'mal-null', match: 5 })]);
  });
});
