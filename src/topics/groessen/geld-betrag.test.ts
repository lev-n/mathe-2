import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { createRng } from '../../core/rng';
import { CTX, cents, samples } from '../test-utils';
import { sum } from './helpers';
import { geldBetragSkill } from './geld-betrag';

describeSkill(geldBetragSkill, { minDistinct: 30 });

const atAb = (stufe: Stufe, ab: Ab, n = 200): Exercise[] =>
  Array.from({ length: n }, (_, i) => geldBetragSkill.generate(createRng(i * 3301 + 7), stufe, { ...CTX, ab }));
const items = (ex: Exercise) => (ex.visual?.type === 'money' ? ex.visual.items : []);

describe('groessen.geld-betrag specifics', () => {
  it('the answer is the value of the money in the picture, plus what is missing in the gap forms', () => {
    for (const stufe of STUFEN) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of atAb(stufe, ab)) {
          const total = sum(items(ex));
          if (ex.key.includes(':fehlt-gemischt:')) {
            expect(cents(ex.context!), ex.key).toBe(total + (ex.answer as { value: number }).value);
          } else if (ex.key.includes(':fehlt:')) {
            const scale = ex.key.includes(':€:') ? 100 : 1;
            expect(cents(ex.context!), ex.key).toBe(total + (ex.answer as { value: number }).value * scale);
          } else if (ex.answer.kind === 'number') {
            expect(ex.answer.value).toBe(items(ex).every((c) => c >= 100) ? total / 100 : total);
          } else if (ex.answer.kind === 'multi') {
            const [e, c] = ex.answer.fields;
            expect(e.value * 100 + c.value).toBe(total);
            expect(c.value).toBeLessThan(100);
          } else {
            throw new Error(`unexpected answer ${ex.answer.kind}`);
          }
        }
      }
    }
  });

  it('Stufe 1: one unit, sorted, at most 20; AB 1 up to 10, AB 2 from 11', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(1, ab)) {
        const list = items(ex);
        expect(ex.ab).toBe(ab);
        expect(new Set(list.map((c) => c >= 100)).size, ex.key).toBe(1);
        expect(list, ex.key).toEqual([...list].sort((a, b) => b - a));
        const value = (ex.answer as { value: number }).value;
        if (ab === 1) expect(value, ex.key).toBeLessThanOrEqual(10);
        if (ab === 2) {
          expect(value, ex.key).toBeGreaterThanOrEqual(11);
          expect(value, ex.key).toBeLessThanOrEqual(20);
        }
        if (ab === 3) expect(cents(ex.context!) / (ex.key.includes(':€:') ? 100 : 1), ex.key).toBeLessThanOrEqual(20);
      }
    }
  });

  it('Stufe 2: one unit, not sorted, at most 100; AB 1 up to 60, AB 2 has more pieces and more money', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(2, ab)) {
        const list = items(ex);
        expect(new Set(list.map((c) => c >= 100)).size, ex.key).toBe(1);
        if (new Set(list).size > 1) expect(list, ex.key).not.toEqual([...list].sort((a, b) => b - a));
        const value = (ex.answer as { value: number }).value;
        expect(value, ex.key).toBeLessThanOrEqual(100);
        if (ab === 1) expect(value, ex.key).toBeLessThanOrEqual(60);
        if (ab === 2) expect(value, ex.key).toBeGreaterThanOrEqual(41);
      }
    }
    const avg = (list: Exercise[]) => sum(list.map((ex) => items(ex).length)) / list.length;
    expect(avg(atAb(2, 2))).toBeGreaterThan(avg(atAb(2, 1)));
  });

  it('Stufe 3: Euro and Cent in every picture, at every AB; only AB 3 bundles or has a gap', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(3, ab)) {
        expect(new Set(items(ex).map((c) => c >= 100)).size, ex.key).toBe(2);
        const gap = ex.key.includes(':fehlt-gemischt:');
        if (ab < 3) expect(sum(items(ex).filter((c) => c < 100)), ex.key).toBeLessThan(100);
        expect(ex.answer.kind, ex.key).toBe(gap ? 'number' : 'multi');
        if (ab < 3) expect(gap, ex.key).toBe(false);
      }
    }
  });

  it('F15: mixed units only on Stufe 3, also in natural draws', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ex of samples(geldBetragSkill, stufe, 500)) {
        expect(ex.key, ex.key).not.toContain(':gemischt:');
        expect(new Set(items(ex).map((c) => c >= 100)).size, ex.key).toBe(1);
      }
    }
    expect(samples(geldBetragSkill, 3, 500).some((ex) => ex.key.includes(':gemischt:'))).toBe(true);
  });

  it('the gap forms: the missing number is not on show, and no hint says it', () => {
    const list = ([1, 2, 3] as Stufe[]).flatMap((s) => atAb(s, 3)).filter((ex) => ex.key.includes(':fehlt'));
    expect(list.length).toBeGreaterThan(100);
    for (const ex of list) {
      const value = (ex.answer as { value: number }).value;
      for (const h of ex.hints) expect(h, ex.key).not.toMatch(new RegExp(`(?<!\\d)${value}[\\s\\u00A0](ct|€)`));
    }
  });

  it('counting coins and adding all printed numbers are bugs with their hints', () => {
    const gemischt = atAb(3, 3).flatMap((ex) => ex.bugs ?? []).find((b) => b.id === 'einheiten-gemischt');
    expect(gemischt?.hint).toBe('Zähle Euro und Cent getrennt: erst Euro, dann Cent.');
    for (const ex of atAb(1, 1)) {
      const bug = ex.bugs?.find((b) => b.id === 'muenzen-anzahl');
      if (bug) expect(bug.match).toBe(items(ex).length);
    }
  });

  it('Stufe 3 can bundle Cent to a Euro', () => {
    expect(atAb(3, 3, 300).some((ex) => sum(items(ex).filter((c) => c < 100)) >= 100)).toBe(true);
  });
});
