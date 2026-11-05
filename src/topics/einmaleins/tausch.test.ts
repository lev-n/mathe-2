import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { tauschSkill } from './tausch';
import { allItems, atAb, kindsAt, rightPictureStep, solve } from './test-support';

describeSkill(tauschSkill);

const kindOf = (ex: Exercise) => ex.key.split(':')[2];
const chosen = (ex: Exercise) => {
  const a = ex.answer as ChoiceAnswer;
  return a.options[a.correct].label;
};
const factorsOf = (ex: Exercise) => (/(\d+)x(\d+)/.exec(ex.key) ?? []).slice(1).map(Number);

const MAP: [Stufe, Ab, string[]][] = [
  [1, 1, ['gleiches-ergebnis']],
  [1, 2, ['luecke', 'gedreht']],
  [1, 3, ['zwei-aufgaben', 'warum']],
  [2, 1, ['luecke']],
  [2, 2, ['luecke', 'waehlen']],
  [2, 3, ['zeile-stimmt', 'zeile-neu']],
  [3, 1, ['stimmt-mal', 'beide-rechnen', 'minus-rechnen']],
  [3, 2, ['stimmt-neu', 'stimmt-minus']],
  [3, 3, ['warum-minus', 'welche-vier']],
];

describe('einmaleins.tausch', () => {
  it.each(MAP)('Stufe %i, AB %i holds exactly its forms', (stufe, ab, kinds) => {
    expect(kindsAt(tauschSkill, stufe, ab)).toEqual(new Set(kinds));
  });

  it('worked solutions compute; every gap solves from the task itself', () => {
    for (const ex of allItems(tauschSkill)) {
      expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      if (ex.answer.kind === 'number' && ex.expression?.includes('□')) expect(solve(ex.expression), ex.key).toContain(ex.answer.value);
    }
  });

  it('Stufe 1 stays with factors up to 5 and shows a field; Stufe 2 goes beyond 5 without a field', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(tauschSkill, 1, ab)) {
        expect(Math.max(...factorsOf(ex)), ex.key).toBeLessThanOrEqual(5);
        expect(ex.visual?.type, ex.key).toBe('dotArray');
      }
      for (const ex of atAb(tauschSkill, 2, ab)) {
        expect(Math.max(...factorsOf(ex)), ex.key).toBeGreaterThanOrEqual(6);
        expect(Math.max(...factorsOf(ex)), ex.key).toBeLessThanOrEqual(10);
        expect(ex.visual, ex.key).toBeUndefined();
      }
    }
  });

  it('Stufe 2: the gap is on the right in AB I, on the left in AB II', () => {
    atAb(tauschSkill, 2, 1).forEach((ex) => expect(ex.expression, ex.key).toMatch(/^\d+ · \d+ = /));
    atAb(tauschSkill, 2, 2).filter((e) => kindOf(e) === 'luecke').forEach((ex) => expect(ex.expression, ex.key).toMatch(/□ .*= \d+ · \d+$/));
  });

  it('a task never gives its result away: no line like "Du weißt: 3 · 5 = 15. 5 · 3 = □"', () => {
    for (const ex of allItems(tauschSkill)) expect(`${ex.prompt} ${ex.expression ?? ''}`, ex.key).not.toMatch(/Du weißt/);
  });

  it('"Stimmt das?" is true exactly when the numbers hold; a swap with minus never does; no form has only one answer', () => {
    const first = atAb(tauschSkill, 3, 1);
    const second = atAb(tauschSkill, 3, 2);
    const mal = first.filter((e) => kindOf(e) === 'stimmt-mal');
    const minus = second.filter((e) => kindOf(e) === 'stimmt-minus');
    const neu = second.filter((e) => kindOf(e) === 'stimmt-neu');
    for (const list of [mal, minus, neu]) expect(list.length).toBeGreaterThan(0);
    minus.forEach((e) => expect(chosen(e)).toBe('Nein, das stimmt nicht.'));
    for (const ex of mal) {
      const [a, b, c, d, shown] = /^(\d+) · (\d+) = (\d+) · (\d+) = (\d+)$/.exec(ex.expression!)!.slice(1).map(Number);
      expect([c, d], ex.key).toEqual([b, a]);
      expect(chosen(ex), ex.key).toBe(a * b === shown ? 'Ja, das stimmt.' : 'Nein, das stimmt nicht.');
    }
    for (const ex of neu) {
      const [a, b, c, d] = /^(\d+) · (\d+) = (\d+) · (\d+)$/.exec(ex.expression!)!.slice(1).map(Number);
      expect(chosen(ex), ex.key).toBe(a * b === c * d ? 'Ja, das stimmt.' : 'Nein, das stimmt nicht.');
    }
    for (const list of [mal, neu]) expect(new Set(list.map(chosen)).size).toBe(2);
  });

  it('Stufe 3, AB I asks more than the gap of Stufe 2 at AB I: a result to work out, no field, and no answer that is always the same', () => {
    const items = atAb(tauschSkill, 3, 1, {}, 600);
    for (const ex of items) {
      expect(ex.visual, ex.key).toBeUndefined();
      if (ex.answer.kind === 'number') expect(ex.expression, ex.key).toMatch(/^\d+ − \d+ oder \d+ − \d+$/);
      else if (ex.answer.kind === 'choice') expect(ex.expression, ex.key).toMatch(/= \d+$/);
      else if (ex.answer.kind === 'multi') ex.answer.fields.forEach((f) => expect(f.value, ex.key).toBeGreaterThanOrEqual(6));
    }
    for (const ex of items.filter((e) => kindOf(e) === 'minus-rechnen')) {
      const [x, y] = ex.expression!.match(/\d+/g)!.map(Number);
      expect(ex.answer, ex.key).toMatchObject({ value: Math.abs(x - y) });
    }
  });

  it('the Tauschaufgabe is exactly the swapped term', () => {
    const items = [...atAb(tauschSkill, 2, 2), ...atAb(tauschSkill, 1, 1)].filter((e) => ['waehlen', 'gleiches-ergebnis'].includes(kindOf(e)));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [a, b] = factorsOf(ex);
      expect(chosen(ex), ex.key).toBe(`${b} · ${a}`);
    }
  });

  it('the lines to choose from: only the right one holds, or only the right one does not', () => {
    const holds = (line: string) => {
      const m = /^(\d+) ([·+−]) (\d+) = (\d+) ([·+−]) (\d+)$/.exec(line)!;
      const value = (x: string, op: string, y: string) => (op === '·' ? Number(x) * Number(y) : op === '+' ? Number(x) + Number(y) : Number(x) - Number(y));
      return value(m[1], m[2], m[3]) === value(m[4], m[5], m[6]);
    };
    for (const ex of [...atAb(tauschSkill, 2, 3), ...atAb(tauschSkill, 3, 3)]) {
      if (!['zeile-stimmt', 'zeile-neu', 'welche-vier'].includes(kindOf(ex))) continue;
      const answer = ex.answer as ChoiceAnswer;
      const wanted = kindOf(ex) !== 'zeile-neu';
      answer.options.forEach((o, i) => expect(holds(o.label) === wanted, `${ex.key} ${o.label}`).toBe(i === answer.correct));
    }
  });

  it('"neue Zahl" is said only of a factor that is not in the task, and that factor stays up to 10', () => {
    const items = atAb(tauschSkill, 2, 2, {}, 1500).filter((e) => kindOf(e) === 'waehlen');
    expect(items.length).toBeGreaterThan(100);
    for (const ex of items) {
      const [a, b] = factorsOf(ex);
      for (const o of (ex.answer as ChoiceAnswer).options.filter((x) => x.whyWrong?.includes('neue Zahl'))) {
        const factors = o.label.split(' · ').map(Number);
        const fresh = factors.filter((n) => n !== a && n !== b);
        expect(fresh, `${ex.prompt} ${o.label}`).toHaveLength(1);
        expect(fresh[0], `${ex.prompt} ${o.label}`).toBeGreaterThanOrEqual(2);
        expect(fresh[0], `${ex.prompt} ${o.label}`).toBeLessThanOrEqual(10);
      }
    }
  });

  it('the turned field has the rows and columns swapped, and a worked step shows it under its name', () => {
    const items = atAb(tauschSkill, 1, 2).filter((e) => kindOf(e) === 'gedreht');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const v = ex.visual as { rows: number; cols: number };
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].visual, ex.key).toMatchObject({ rows: v.cols, cols: v.rows });
      expect(rightPictureStep(ex), ex.key).toBeTruthy();
    }
  });

  it('stays with mal and minus: Geteiltaufgaben come later in the teaching order', () => {
    const items = allItems(tauschSkill);
    expect(items.some((e) => kindOf(e) === 'welche-vier')).toBe(true);
    for (const ex of items) {
      const text = JSON.stringify({ ...ex, bugs: ex.bugs?.map((b) => b.hint) });
      expect(text, ex.key).not.toMatch(/\d : \d|geteilt/i);
    }
  });

  it('carries no factKey: this skill is about the swap, not about one fact', () => {
    allItems(tauschSkill, {}, 40).forEach((ex) => expect(ex.factKey).toBeUndefined());
  });
});
