import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise, VisualOf } from '../../core/types';
import { atAb, kindOf, numberValue, numbersIn } from './test-helpers';
import { vergleichenSkill } from './vergleichen';

describeSkill(vergleichenSkill, { minDistinct: 40 });

const picto = (ex: Exercise) => ex.visual as VisualOf<'pictogram'>;
const noTen = (x: number, y: number, plus: boolean) => (plus ? x % 10 + y % 10 <= 10 : x % 10 >= y % 10);

describe('sachaufgaben.vergleichen, Stufe 1: difference with a picture, ≤ 20', () => {
  it('has a picture at every AB, at most 10 pictures in a row, numbers up to 20; the difference is recomputed', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(vergleichenSkill, 1, ab, 300)) {
        const v = picto(ex);
        expect(v.values.length).toBe(2);
        expect(Math.max(...v.values) / v.iconValue).toBeLessThanOrEqual(10);
        expect(Math.max(...v.values)).toBeLessThanOrEqual(20);
        expect(numberValue(ex), ex.key).toBe(Math.abs(v.values[0] - v.values[1]));
      }
    }
  });

  it('AB I: "mehr", one picture for one thing', () => {
    for (const ex of atAb(vergleichenSkill, 1, 1, 300)) {
      expect(kindOf(ex)).toBe('bild');
      expect(picto(ex).iconValue).toBe(1);
      expect(ex.prompt, ex.key).toMatch(/mehr als/);
      expect(checkAnswer(ex.answer, { kind: 'number', text: String(Math.max(...picto(ex).values)) }, ex.bugs).bugId, ex.key).toBe('mehr-unterschied');
    }
  });

  it('AB II: "weniger", or pictures that stand for 2 with their hint', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(vergleichenSkill, 1, 2, 300)) {
      kinds.add(kindOf(ex));
      const v = picto(ex);
      if (kindOf(ex) === 'bild') expect(ex.prompt, ex.key).toMatch(/weniger als/);
      else {
        expect(v.iconValue).toBe(2);
        const pictures = Math.abs(v.values[0] - v.values[1]) / 2;
        // a row of the picture can be the same number: then the hint for that one comes first
        if (!v.values.includes(pictures)) expect(checkAnswer(ex.answer, { kind: 'number', text: String(pictures) }, ex.bugs).bugId, ex.key).toBe('bild-legende');
      }
    }
    expect([...kinds].sort()).toEqual(['bild', 'bild-zwei']);
  });

  it('AB III: how many are missing to have as many, and the row of the person asked about is the shorter one', () => {
    for (const ex of atAb(vergleichenSkill, 1, 3, 300)) {
      expect(kindOf(ex)).toBe('angleichen-bild');
      const q = /fehlen (\p{L}+) noch\?$/u.exec(ex.prompt)![1];
      const v = picto(ex);
      expect(v.values[v.categories.indexOf(q)], ex.key).toBe(Math.min(...v.values));
    }
  });

  it('the spoken task holds the data of the picture and ends with the question', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(vergleichenSkill, 1, ab, 100)) {
        const v = picto(ex);
        v.categories.forEach((c, i) => expect(ex.srText, ex.key).toContain(`${c}: ${v.values[i] / v.iconValue} Bilder`));
        expect(ex.srText.endsWith(ex.prompt), ex.srText).toBe(true);
      }
    }
  });
});

describe('sachaufgaben.vergleichen, Stufe 2: "7 mehr als", ≤ 100', () => {
  const recompute = (ex: Exercise) => {
    const n = numbersIn(ex.context!);
    const kind = kindOf(ex);
    if (kind === 'beziehung-zuerst') return /mehr als/.test(ex.context!) ? n[1] + n[0] : n[1] - n[0];
    if (kind === 'mehr-als') return n[0] + n[1];
    if (kind === 'weniger-als') return n[0] - n[1];
    if (kind === 'unterschied') return n[1] - n[0];
    return n[0] - n[1];
  };

  it('AB I: "mehr als", "weniger als" and the difference within a ten, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(vergleichenSkill, 2, 1, 400)) {
      kinds.add(kindOf(ex));
      expect(numberValue(ex), ex.key).toBe(recompute(ex));
      const [a, d] = numbersIn(ex.context!);
      if (kindOf(ex) === 'unterschied') {
        expect(noTen(d, a, false), ex.key).toBe(true);
        continue;
      }
      expect(noTen(a, d, kindOf(ex) === 'mehr-als'), ex.key).toBe(true);
      expect(d, ex.key).toBeLessThan(10);
    }
    expect([...kinds].sort()).toEqual(['mehr-als', 'unterschied', 'weniger-als']);
  });

  it('T13: "mehr" does not predict plus at any AB: at least a quarter of the stories with "mehr" are solved by minus, and of the others by plus', () => {
    for (const ab of [1, 2, 3] as const) {
      const withMehr = atAb(vergleichenSkill, 2, ab, 1000).filter((ex) => /\bmehr\b/.test(`${ex.context} ${ex.prompt}`));
      const minus = withMehr.filter((ex) => kindOf(ex) === 'unterschied').length / withMehr.length;
      expect(minus, `AB ${ab}`).toBeGreaterThanOrEqual(0.25);
      expect(minus, `AB ${ab}`).toBeLessThanOrEqual(0.75);
    }
  });

  it('AB II: over a ten, and the difference, ≤ 100, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(vergleichenSkill, 2, 2, 500)) {
      const kind = kindOf(ex);
      kinds.add(kind);
      expect(numberValue(ex), ex.key).toBe(recompute(ex));
      expect(numberValue(ex)).toBeLessThanOrEqual(100);
      expect(numberValue(ex)).toBeGreaterThanOrEqual(2);
      if (kind !== 'unterschied') {
        const [a, d] = numbersIn(ex.context!);
        expect(noTen(a, d, kind === 'mehr-als'), ex.key).toBe(false);
      }
    }
    expect([...kinds].sort()).toEqual(['mehr-als', 'unterschied', 'weniger-als']);
  });

  it('AB III: the relation comes first, how many are missing, or the difference; no reverse wording, as that is Stufe 3', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(vergleichenSkill, 2, 3, 500)) {
      kinds.add(kindOf(ex));
      expect(numberValue(ex), ex.key).toBe(recompute(ex));
      expect(ex.context, ex.key).not.toMatch(/Das sind/);
    }
    expect([...kinds].sort()).toEqual(['angleichen', 'beziehung-zuerst', 'unterschied']);
  });

  it('the swapped operation gets a question about the two people, as nothing changes in the story', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(vergleichenSkill, 2, ab, 400)) {
        const bug = ex.bugs?.find((b) => b.id === 'plus-minus-getauscht');
        if (bug) expect(bug.hint, ex.key).toMatch(/^Hat \p{L}+ mehr oder weniger als \p{L}+\?$/u);
      }
    }
  });
});

describe('sachaufgaben.vergleichen, Stufe 3: the reverse wording, at every AB', () => {
  const recompute = (ex: Exercise) => {
    const more = /\bmehr als\b/.test(ex.context!);
    const n = numbersIn(ex.context!);
    const [a, d] = kindOf(ex) === 'umgekehrt-vorn' ? [n[1], n[0]] : n;
    return { a, d, more, value: more ? a - d : a + d };
  };

  it('"mehr" means minus and "weniger" means plus; the keyword answer gets the signalwort hint', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(vergleichenSkill, 3, ab, 400)) {
        const { a, d, more, value } = recompute(ex);
        expect(numberValue(ex), ex.key).toBe(value);
        expect(numberValue(ex)).toBeLessThanOrEqual(100);
        const keyword = more ? a + d : a - d;
        if (keyword < 0) continue;
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(keyword) }, ex.bugs).bugId, ex.key).toBe('signalwort');
      }
    }
  });

  it('AB I: within a ten. AB II: over a ten, one-digit. AB III: over a ten, two-digit, and also the relation first', () => {
    for (const ex of atAb(vergleichenSkill, 3, 1, 300)) {
      const { a, d, more } = recompute(ex);
      expect(noTen(a, d, !more), ex.key).toBe(true);
      expect(d, ex.key).toBeLessThan(10);
    }
    for (const ex of atAb(vergleichenSkill, 3, 2, 300)) {
      const { a, d, more } = recompute(ex);
      expect(noTen(a, d, !more), ex.key).toBe(false);
      expect(d, ex.key).toBeLessThan(10);
    }
    const kinds = new Set<string>();
    for (const ex of atAb(vergleichenSkill, 3, 3, 300)) {
      kinds.add(kindOf(ex));
      const { a, d, more } = recompute(ex);
      expect(noTen(a, d, !more), ex.key).toBe(false);
      expect(d, ex.key).toBeGreaterThan(10);
    }
    expect([...kinds].sort()).toEqual(['umgekehrt', 'umgekehrt-vorn']);
  });

  it('the keyword answer gets a hint about who has more, with the right direction and no number', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(vergleichenSkill, 3, ab, 300)) {
        const p = /^\p{L}+/u.exec(ex.context!)![0];
        const word = /\bmehr als\b/.test(ex.context!) ? 'mehr' : 'weniger';
        const q = /hat (\p{L}+)\?$/u.exec(ex.prompt)![1];
        const bug = ex.bugs?.find((b) => b.id === 'signalwort');
        if (!bug) continue;
        expect(bug.hint, ex.key).toBe(`${p} hat ${word}. Also hat ${q} ${word === 'mehr' ? 'weniger' : 'mehr'}.`);
      }
    }
  });
});
