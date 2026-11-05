import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { dotArrayAriaLabel } from '../../ui/visuals/DotArrayVisual';
import { atAb, bugIdFor, expectSolidTexts, expectTopicRules } from './test-utils';
import { doppelt, doppeltLuecke, fastDoppelt, haelfte, haelfteLuecke, nachbarLuecke, verdoppelnHalbierenSkill as skill } from './verdoppeln-halbieren';

describeSkill(skill, { minDistinct: { 1: 15, 2: 25, 3: 25 } });

const exOf = (t: Omit<Exercise, 'topicId' | 'skillId' | 'stufe' | 'ab' | 'kmk' | 'srText'>): Exercise => ({ ...t, topicId: 'plusminus', skillId: skill.id, stufe: 1, ab: 1, kmk: skill.kmk, srText: 'x' });

/** The answer recomputed from the expression. */
function recompute(ex: Exercise): number {
  const e = ex.expression!;
  const d = /^Das Doppelte von (\d+)/.exec(e);
  if (d) return 2 * Number(d[1]);
  const h = /^Die Hälfte von (\d+)/.exec(e);
  if (h) return Number(h[1]) / 2;
  const dLuecke = /^Das Doppelte von □ = (\d+)$/.exec(e);
  if (dLuecke) return Number(dLuecke[1]) / 2;
  const hLuecke = /^Die Hälfte von □ = (\d+)$/.exec(e);
  if (hLuecke) return Number(hLuecke[1]) * 2;
  const nachbar = /^(\d+) \+ □ = (\d+)$/.exec(e);
  if (nachbar) {
    expect(Number(nachbar[2]) - Number(nachbar[1]), ex.key).toBe(Number(nachbar[1]) + 1);
    return Number(nachbar[1]) + 1;
  }
  const s = /(\d+) \+ (\d+) = □/.exec(e)!;
  expect(Math.abs(Number(s[1]) - Number(s[2])), ex.key).toBe(1);
  return Number(s[1]) + Number(s[2]);
}

const zahlen = (re: RegExp, exercises: Exercise[]) => exercises.flatMap((ex) => (re.test(ex.expression!) ? [Number(re.exec(ex.expression!)![1])] : []));
const DOPPELT = /^Das Doppelte von (\d+)/;
const HAELFTE = /^Die Hälfte von (\d+)/;
const DOPPELT_LUECKE = /^Das Doppelte von □ = (\d+)/;
const HAELFTE_LUECKE = /^Die Hälfte von □ = (\d+)/;

describe('plusminus.verdoppeln-halbieren', () => {
  it('numbers stay in 0–100, lines stay readable, one key per visible task', () => expectTopicRules(skill));

  it('answers recompute and every number stays up to 100', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(skill, ab, stufe)) {
          expect(ex.answer, ex.key).toMatchObject({ value: recompute(ex) });
          expect(recompute(ex)).toBeLessThanOrEqual(100);
          expect(Number.isInteger(recompute(ex))).toBe(true);
          expectSolidTexts(ex);
        }
      }
    }
  });

  it('Stufe 1: AB I doubles to 5 and halves to 10, AB II doubles to 10 and halves to 20, AB III the same numbers turned round', () => {
    const small = atAb(skill, 1, 1);
    for (const n of zahlen(DOPPELT, small)) expect(n).toBeLessThanOrEqual(5);
    for (const n of zahlen(HAELFTE, small)) expect(n).toBeLessThanOrEqual(10);
    const larger = atAb(skill, 2, 1);
    for (const n of zahlen(DOPPELT, larger)) expect(n).toBeGreaterThanOrEqual(6);
    for (const n of zahlen(DOPPELT, larger)) expect(n).toBeLessThanOrEqual(10);
    for (const n of zahlen(HAELFTE, larger)) expect(n).toBeGreaterThanOrEqual(12);
    for (const n of zahlen(HAELFTE, larger)) expect(n).toBeLessThanOrEqual(20);
    const round = atAb(skill, 3, 1);
    expect(round.every((ex) => ex.expression!.includes('□') && !ex.visual)).toBe(true);
    for (const v of zahlen(DOPPELT_LUECKE, round)) expect(v / 2).toBeLessThanOrEqual(10);
    for (const v of zahlen(HAELFTE_LUECKE, round)) expect(v * 2).toBeLessThanOrEqual(20);
  });

  it('Stufe 2: AB I without a new ten, AB II with one and odd tens, AB III turned round, always above the numbers of Stufe 1', () => {
    const easy = atAb(skill, 1, 2);
    for (const n of zahlen(DOPPELT, easy)) {
      expect(n).toBeGreaterThan(10);
      expect(n % 10).toBeLessThan(5);
    }
    for (const n of zahlen(HAELFTE, easy)) {
      expect(n).toBeGreaterThan(20);
      expect(Math.floor(n / 10) % 2).toBe(0);
    }
    const hard = atAb(skill, 2, 2);
    for (const n of zahlen(DOPPELT, hard)) {
      expect(n).toBeGreaterThan(10);
      expect(n).toBeLessThanOrEqual(50);
      if (n < 50) expect(n % 10).toBeGreaterThanOrEqual(5);
    }
    for (const n of zahlen(HAELFTE, hard)) {
      expect(Math.floor(n / 10) % 2).toBe(1);
      expect(n % 10).not.toBe(0);
    }
    for (const ex of atAb(skill, 3, 2)) expect(ex.expression, ex.key).toContain('□');
  });

  it('the halves of 30, 50, 70, 90 and their reversals belong to Stufe 3 only', () => {
    for (const stufe of [1, 2] as const) {
      for (const ab of [1, 2, 3] as const) {
        const items = atAb(skill, ab, stufe, 500);
        for (const n of zahlen(HAELFTE, items)) expect([30, 50, 70, 90]).not.toContain(n);
        for (const n of zahlen(DOPPELT_LUECKE, items)) expect([30, 50, 70, 90]).not.toContain(n);
        for (const n of zahlen(HAELFTE_LUECKE, items)) expect([15, 25, 35, 45]).not.toContain(n);
      }
    }
  });

  it('Stufe 3: AB I the odd tens or small neighbours, AB II neighbours with a new ten, AB III the neighbour or the odd ten turned round', () => {
    for (const ex of atAb(skill, 1, 3)) {
      const h = HAELFTE.exec(ex.expression!);
      if (h) expect([30, 50, 70, 90]).toContain(Number(h[1]));
      else {
        const v = recompute(ex);
        expect(v, ex.key).toBeGreaterThanOrEqual(23);
        expect(v, ex.key).toBeLessThanOrEqual(49);
      }
    }
    for (const ex of atAb(skill, 2, 3)) {
      const v = recompute(ex);
      expect(v, ex.key).toBeGreaterThanOrEqual(51);
      expect(v % 2, ex.key).toBe(1);
    }
    const kinds = new Set<string>();
    for (const ex of atAb(skill, 3, 3)) {
      if (DOPPELT_LUECKE.test(ex.expression!)) {
        kinds.add('doppelt');
        expect([30, 50, 70, 90]).toContain(Number(DOPPELT_LUECKE.exec(ex.expression!)![1]));
      } else {
        kinds.add('nachbar');
        expect(ex.expression, ex.key).toMatch(/^\d+ \+ □ = \d+$/);
      }
    }
    expect([...kinds].sort()).toEqual(['doppelt', 'nachbar']);
  });

  it('names the bugs of the catalogue with exact numbers', () => {
    const dreissig = exOf(haelfte(30));
    expect(bugIdFor(dreissig, 10)).toBe('halbieren-zehner');
    expect(bugIdFor(dreissig, 20)).toBe('halbieren-zehner');
    expect(dreissig.bugs?.find((b) => b.id === 'halbieren-zehner')?.hint).toBe('30 sind 20 und 10. Halbiere beide: 10 und 5.');
    expect(bugIdFor(exOf(haelfte(14)), 28)).toBe('verdoppelt');
    expect(bugIdFor(exOf(doppelt(37)), 64)).toBe('zehner-vergessen');
    expect(bugIdFor(exOf(doppelt(37)), 614)).toBe('ziffern-reihung');
    const fast = exOf(fastDoppelt(24, true));
    expect(bugIdFor(fast, 48)).toBe('doppelt-ohne-eins');
    expect(bugIdFor(fast, 50)).toBe('doppelt-grosse');
    expect(bugIdFor(exOf(doppeltLuecke(7)), 28)).toBe('verdoppelt');
    expect(bugIdFor(exOf(haelfteLuecke(6)), 3)).toBe('halbiert');
    expect(exOf(nachbarLuecke(24)).expression).toBe('24 + □ = 49');
    expect(bugIdFor(exOf(nachbarLuecke(24)), 24)).toBe('doppelt-ohne-eins');
    expect(bugIdFor(exOf(nachbarLuecke(24)), 26)).toBe('doppelt-grosse');
  });

  it('the picture of a half neither shows nor says the answer', () => {
    for (let n = 4; n <= 20; n += 2) {
      const v = haelfte(n).visual;
      if (v?.type !== 'dotArray') throw new Error(`haelfte(${n})`);
      expect(v).toEqual({ type: 'dotArray', groups: [n] });
      expect(dotArrayAriaLabel(v), `haelfte(${n})`).not.toMatch(new RegExp(`(?<!\\d)${n / 2}(?!\\d)`));
    }
  });

  it('dots while they fit, base-ten material above', () => {
    expect(doppelt(7).visual).toMatchObject({ type: 'dotArray', rows: 2, cols: 7 });
    expect(doppelt(17).visual).toMatchObject({ type: 'dotArray', groups: [17, 17] });
    expect(doppelt(37).visual).toMatchObject({ type: 'baseTen', tens: 3, ones: 7 });
    expect(haelfte(14).visual).toEqual({ type: 'dotArray', groups: [14] });
    expect(haelfte(46).visual).toMatchObject({ type: 'baseTen', tens: 4, ones: 6 });
  });
});
