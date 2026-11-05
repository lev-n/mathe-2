import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, MultiAnswer, Stufe } from '../../core/types';
import { checkWorkedSolution, evalSide } from '../step-check';
import { ableitenSkill } from './ableiten';
import { allItems, atAb, kindsAt, solve } from './test-support';

describeSkill(ableitenSkill);

const MAP: [Stufe, Ab, string[]][] = [
  [1, 1, ['nachbar']],
  [1, 2, ['nachbar', 'zwei']],
  [1, 3, ['luecke', 'hilfe']],
  [2, 1, ['von-zehn', 'verdoppeln']],
  [2, 2, ['von-zehn', 'verdoppeln']],
  [2, 3, ['rueck', 'hilfe']],
  [3, 1, ['zerlegen']],
  [3, 2, ['zerlegen-luecke', 'weg']],
  [3, 3, ['zerlegen-rueck', 'weg']],
];

describe('einmaleins.ableiten', () => {
  it.each(MAP)('Stufe %i, AB %i holds exactly its forms', (stufe, ab, kinds) => {
    expect(kindsAt(ableitenSkill, stufe, ab)).toEqual(new Set(kinds));
  });

  it('worked solutions compute; gaps solve from the task; no task tracks a fact', () => {
    for (const ex of allItems(ableitenSkill)) {
      expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      expect(ex.factKey, ex.key).toBeUndefined();
      if (ex.answer.kind === 'number' && ex.expression) expect(solve(ex.expression), ex.key).toContain(ex.answer.value);
    }
  });

  it('the known task and the asked task lead to the answer', () => {
    let seen = 0;
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of atAb(ableitenSkill, stufe, ab)) {
          const m = /Du weißt: (\d+) · (\d+) = (\d+)\. Wie viel ist (\d+) · (\d+)\?/.exec(ex.prompt);
          if (!m) continue;
          seen += 1;
          const [a, b, known, c, d] = m.slice(1).map(Number);
          expect(a * b).toBe(known);
          expect(b).toBe(d);
          expect(ex.answer).toMatchObject({ kind: 'number', value: c * d });
        }
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('Stufe 1: one group apart, more in AB I, less or both tasks in AB II', () => {
    const prompt = /Du weißt: (\d+) · \d+ = \d+\. Wie viel ist (\d+) ·/;
    for (const ex of atAb(ableitenSkill, 1, 1)) {
      const [easy, target] = prompt.exec(ex.prompt)!.slice(1).map(Number);
      expect(target - easy, ex.key).toBe(1);
      expect(ex.visual, ex.key).toBeTruthy();
    }
    for (const ex of atAb(ableitenSkill, 1, 2).filter((e) => e.answer.kind === 'number')) {
      const [easy, target] = prompt.exec(ex.prompt)!.slice(1).map(Number);
      expect(target - easy, ex.key).toBe(-1);
    }
  });

  it('Stufe 1, AB I: 6 · 4 = 20 is the known error of forgetting the neighbour', () => {
    const items = atAb(ableitenSkill, 1, 1).filter((ex) => /Du weißt: 5 · 4 = 20\. Wie viel ist 6 · 4/.test(ex.prompt));
    expect(items.length).toBeGreaterThan(0);
    items.forEach((ex) => expect(ex.bugs?.find((b) => b.id === 'nachbar-vergessen')?.match).toBe(20));
  });

  it('Stufe 1, AB III: the gap is the easy task, not a number that stands in the task', () => {
    const items = atAb(ableitenSkill, 1, 3).filter((ex) => ex.key.includes(':luecke:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const value = (ex.answer as { value: number }).value;
      expect(solve(ex.expression!), ex.key).toEqual([value]);
      expect(ex.expression!.match(/\d+/g)!.map(Number), ex.key).not.toContain(value);
      expect(ex.visual, ex.key).toBeUndefined();
    }
  });

  it('which easy task helps: the right one is nearest of the offered tasks', () => {
    for (const [stufe, ab] of [[1, 3], [2, 3]] as const) {
      const items = atAb(ableitenSkill, stufe, ab).filter((ex) => ex.key.includes(':hilfe:'));
      expect(items.length).toBeGreaterThan(0);
      for (const ex of items) {
        const target = Number(/bei (\d+) ·/.exec(ex.prompt)![1]);
        const answer = ex.answer as ChoiceAnswer;
        const distance = (label: string) => Math.abs(Number(label.split(' · ')[0]) - target);
        const right = distance(answer.options[answer.correct].label);
        answer.options.filter((o) => / · /.test(o.label) && o !== answer.options[answer.correct]).forEach((o) => expect(distance(o.label), `${ex.key} ${o.label}`).toBeGreaterThan(right));
      }
    }
  });

  it('Stufe 2: from mal 10 and by doubling; AB I with a field, AB II without, AB III from one hard task to another', () => {
    atAb(ableitenSkill, 2, 1).forEach((ex) => expect(ex.visual, ex.key).toBeTruthy());
    atAb(ableitenSkill, 2, 2).forEach((ex) => expect(ex.visual, ex.key).toBeUndefined());
    const doubled = atAb(ableitenSkill, 2, 2).filter((ex) => ex.key.includes(':verdoppeln:'));
    expect(new Set(doubled.map((ex) => /x/.test(ex.key) && ex.key.split(':')[3].split('x')[0]))).toEqual(new Set(['3', '4']));
    for (const ex of atAb(ableitenSkill, 2, 3).filter((e) => e.key.includes(':rueck:'))) {
      const [from, , , to] = /Du weißt: (\d+) · (\d+) = (\d+)\. Wie viel ist (\d+) ·/.exec(ex.prompt)!.slice(1).map(Number);
      expect(from === 9 ? to === 8 : to * 2 === from, ex.key).toBe(true);
      // An easy target needs no route: 10 · 8 from 9 · 8 would ask less than AB I.
      expect([1, 2, 5, 10], ex.key).not.toContain(to);
    }
  });

  it('the hint on a gap counts the rows at the start, also where a row goes away', () => {
    const items = atAb(ableitenSkill, 1, 3, {}, 600).filter((e) => e.key.includes(':luecke:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [target] = ex.expression!.match(/\d+/g)!.map(Number);
      expect(ex.hints[1], ex.key).toBe(`Am Ende sind es ${target} Reihen. Wie viele sind es am Anfang?`);
    }
  });

  it('Stufe 3: every field of a split computes, and only one route gives the task', () => {
    let splits = 0;
    let routes = 0;
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(ableitenSkill, 3, ab)) {
        if (ex.answer.kind === 'multi') {
          splits += 1;
          const answer = ex.answer as MultiAnswer;
          if (ex.key.includes(':zerlegen-luecke:')) {
            const [a, b, first] = /^(\d+) · (\d+) = (\d+) ·/.exec(answer.fields[0].before!)!.slice(1).map(Number);
            expect(answer.fields[0].value, ex.key).toBe(a - first);
            expect(answer.fields[1].value, ex.key).toBe(a * b);
            expect(answer.fields[0].value, `${ex.key}: the gap must not stand in the task`).not.toBe(first);
            expect(answer.fields[0].value, `${ex.key}: the gap must not stand in the task`).not.toBe(b);
            continue;
          }
          for (const f of answer.fields) expect(evalSide(f.before!.replace(' =', ''))?.value, ex.key).toBe(f.value);
          expect(answer.fields[2].value).toBe(answer.fields[0].value + answer.fields[1].value);
        } else if (ex.answer.kind === 'choice') {
          routes += 1;
          const [a, b] = /(\d+) · (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
          const answer = ex.answer as ChoiceAnswer;
          answer.options.forEach((o, i) => {
            const value = evalSide(o.label)?.value;
            if (i === answer.correct) expect(value, `${ex.key} ${o.label}`).toBe(a * b);
            else expect(value, `${ex.key} ${o.label}`).not.toBe(a * b);
          });
        } else {
          const value = (ex.answer as { value: number }).value;
          expect(solve(ex.expression!), ex.key).toEqual([value]);
          expect(ex.expression!.match(/\d+/g)!.map(Number), ex.key).not.toContain(value);
        }
      }
    }
    expect(splits).toBeGreaterThan(0);
    expect(routes).toBeGreaterThan(0);
  });
});
