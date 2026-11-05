import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise, VisualOf } from '../../core/types';
import { malTeilenSkill } from './mal-teilen';
import { atAb, correctLabel, evalTerm, kindOf, numberValue, numbersIn } from './test-helpers';

describeSkill(malTeilenSkill, { minDistinct: 40 });

const groupsOf = (ex: Exercise) => {
  const v = ex.visual as VisualOf<'dotArray'>;
  if (!('groups' in v)) throw new Error(ex.key);
  return v.groups;
};

describe('sachaufgaben.mal-teilen, Stufe 1: equal groups with Kernaufgaben, ≤ 50, with a picture', () => {
  it('AB I: up to 5 groups. AB II: more of them. The picture shows the story', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(malTeilenSkill, 1, ab, 300)) {
        const [groups, size] = numbersIn(ex.context!);
        expect([2, 5, 10]).toContain(size);
        expect(numberValue(ex), ex.key).toBe(groups * size);
        expect(numberValue(ex)).toBeLessThanOrEqual(50);
        expect(groupsOf(ex)).toEqual(Array.from({ length: groups }, () => size));
        if (ab === 1) expect(groups, ex.key).toBeLessThanOrEqual(5);
        else expect(groups, ex.key).toBeGreaterThanOrEqual(4);
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(groups + size) }, ex.bugs).bugId, ex.key).toBe(groups + size === groups * size ? undefined : 'mal-als-plus');
      }
    }
  });

  it('AB III: one whole group comes or goes, recomputed; forgetting it gets its hint; no division: that is Stufe 2', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(malTeilenSkill, 1, 3, 300)) {
      kinds.add(kindOf(ex));
      const [shown, size] = numbersIn(ex.context!);
      const more = kindOf(ex) === 'eine-mehr';
      expect(numberValue(ex), ex.key).toBe((more ? shown + 1 : shown - 1) * size);
      expect(numberValue(ex)).toBeLessThanOrEqual(50);
      expect(groupsOf(ex)).toEqual(Array.from({ length: shown }, () => size));
      expect(checkAnswer(ex.answer, { kind: 'number', text: String(shown * size) }, ex.bugs).bugId, ex.key).toBe('gruppe-vergessen');
      expect(ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).join(' '), ex.key).not.toMatch(/:/);
    }
    expect([...kinds].sort()).toEqual(['eine-mehr', 'eine-weniger']);
  });
});

describe('sachaufgaben.mal-teilen, Stufe 2: Aufteilen and Verteilen, Kern divisors, ≤ 100', () => {
  it('AB I: up to 5 parts; AB II: 6 to 10 parts, also "teilen sich"; exact, recomputed', () => {
    for (const [ab, kindCount] of [[1, 4], [2, 5]] as const) {
      const kinds = new Set<string>();
      for (const ex of atAb(malTeilenSkill, 2, ab, 500)) {
        kinds.add(kindOf(ex));
        const n = numbersIn(ex.context!);
        const [total, k] = kindOf(ex) === 'teilen-sich' ? [n[1], n[0]] : n;
        expect([2, 5, 10]).toContain(k);
        expect(total).toBeLessThanOrEqual(100);
        expect(numberValue(ex)! * k, ex.key).toBe(total);
        if (ab === 1) expect(numberValue(ex), ex.key).toBeLessThanOrEqual(5);
        else expect(numberValue(ex), ex.key).toBeGreaterThanOrEqual(6);
      }
      expect(kinds.size).toBe(kindCount);
    }
  });

  it('AB III: the words of the other way, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(malTeilenSkill, 2, 3, 500)) {
      const kind = kindOf(ex);
      kinds.add(kind);
      const n = numbersIn(ex.context!);
      if (kind === 'alle-gesucht') expect(numberValue(ex), ex.key).toBe(n[0] * n[1]);
      else {
        expect([2, 5, 10]).toContain(n[1]);
        expect(numberValue(ex)! * n[1], ex.key).toBe(n[0]);
      }
    }
    expect([...kinds].sort()).toEqual(['alle-gesucht', 'kinder-gesucht', 'tueten-gleich']);
  });
});

describe('sachaufgaben.mal-teilen, Stufe 3: which operation', () => {
  it('AB I: the calculation fits, also for unequal groups', () => {
    for (const ex of atAb(malTeilenSkill, 3, 1, 500)) {
      expect(kindOf(ex)).toBe('welche');
      const kind = ex.key.split(':')[3];
      const label = correctLabel(ex);
      const [x, y] = numbersIn(ex.context!);
      if (kind === 'mal') expect(label).toBe(`${x} · ${y}`);
      if (kind === 'teilen') {
        expect(label).toBe(`${x} : ${y}`);
        expect(Number.isInteger(evalTerm(label))).toBe(true);
      }
      if (kind === 'ungleich') {
        expect(label).toBe(`${x} + ${y}`);
        expect(x, 'really unequal').not.toBe(y);
      }
    }
  });

  it('AB II: the child finds the operation and calculates; recomputed for each operation', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(malTeilenSkill, 3, 2, 500)) {
      const kind = ex.key.split(':')[3];
      kinds.add(kind);
      const [x, y] = numbersIn(ex.context!);
      expect(numberValue(ex), ex.key).toBe(kind === 'mal' ? x * y : kind === 'ungleich' ? x + y : x / y);
      expect(Number.isInteger(numberValue(ex)), ex.key).toBe(true);
    }
    expect([...kinds].sort()).toEqual(['mal', 'teilen', 'ungleich', 'verteilen']);
  });

  it('AB III with extras off: from the calculation to the story, never the Rest', () => {
    const off = atAb(malTeilenSkill, 3, 3, 400, false);
    expect(off.filter((ex) => kindOf(ex).startsWith('rest-'))).toEqual([]);
    for (const ex of off) {
      expect(kindOf(ex)).toBe('geschichte');
      expect(ex.answer.kind).toBe('choice');
      const [x, y] = numbersIn(ex.prompt);
      expect(numbersIn(correctLabel(ex)), ex.key).toEqual([x, y]);
      expect(correctLabel(ex), ex.key).toMatch(ex.prompt.includes('·') ? /In jeder Tüte/ : /bilden Gruppen/);
    }
    expect(atAb(malTeilenSkill, 3, 3, 300, true).some((ex) => kindOf(ex).startsWith('rest-'))).toBe(true);
  });

  it('the Rest appears only on Stufe 3 at AB III, with extras on, and means what the story says', () => {
    for (const stufe of [1, 2] as const) for (const ab of [1, 2, 3] as const) for (const ex of atAb(malTeilenSkill, stufe, ab, 100)) expect(kindOf(ex), ex.key).not.toMatch(/^rest-/);
    for (const ab of [1, 2] as const) for (const ex of atAb(malTeilenSkill, 3, ab, 100)) expect(kindOf(ex), ex.key).not.toMatch(/^rest-/);
    for (const ex of atAb(malTeilenSkill, 3, 3, 500)) {
      const kind = kindOf(ex);
      if (!kind.startsWith('rest-')) continue;
      const [total, size] = numbersIn(ex.context!);
      const q = Math.floor(total / size);
      const r = total % size;
      expect(r, ex.key).toBeGreaterThan(0);
      if (kind === 'rest-braucht') {
        expect(numberValue(ex), ex.key).toBe(q + 1);
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(q) }, ex.bugs).bugId).toBe('rest-sache');
      } else if (kind === 'rest-voll') {
        expect(numberValue(ex), ex.key).toBe(q);
      } else {
        expect(numberValue(ex), ex.key).toBe(r);
      }
    }
  });
});
