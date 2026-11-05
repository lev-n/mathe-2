import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { createRng } from '../../core/rng';
import { CTX } from '../test-utils';
import { linealSkill } from './lineal';

describeSkill(linealSkill, { minDistinct: 30 });

const atAb = (stufe: Stufe, ab: Ab, n = 200): Exercise[] =>
  Array.from({ length: n }, (_, i) => linealSkill.generate(createRng(i * 4177 + 3), stufe, { ...CTX, ab }));
const valueOf = (ex: Exercise) => (ex.answer.kind === 'number' ? ex.answer.value! : NaN);

describe('groessen.lineal specifics', () => {
  it('the Stufe chooses the content, the AB the demand: the forms of each cell', () => {
    const forms = (stufe: Stufe, ab: Ab) => new Set(atAb(stufe, ab).map((ex) => ex.key.split(':')[2]));
    expect(forms(1, 1)).toEqual(new Set(['ab-null']));
    expect(forms(1, 2)).toEqual(new Set(['ab-null']));
    expect(forms(1, 3)).toEqual(new Set(['bis-marke']));
    expect(forms(2, 1)).toEqual(new Set(['andere-marke']));
    expect(forms(2, 2)).toEqual(new Set(['andere-marke']));
    expect(forms(2, 3)).toEqual(new Set(['ende-gelesen', 'bis-marke-versetzt']));
    expect(forms(3, 1)).toEqual(new Set(['vergleich', 'abgebrochen']));
    expect(forms(3, 2)).toEqual(new Set(['vergleich', 'abgebrochen']));
    expect(forms(3, 3)).toEqual(new Set(['vergleich', 'laenger']));
  });

  it('Stufe 1: the object starts at 0, whole cm, at most 15; AB 1 at most 10; the answer is measured from the picture', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(1, ab)) {
        if (ex.visual?.type !== 'ruler') throw new Error('ruler expected');
        expect(ex.visual.startCm).toBe(0);
        expect(ex.visual.maxCm).toBeLessThanOrEqual(15);
        if (ex.key.includes(':ab-null:')) {
          expect(valueOf(ex)).toBe(ex.visual.lengthCm);
          expect(valueOf(ex)).toBeLessThanOrEqual(ab === 1 ? 10 : 15);
        } else {
          const target = Number(ex.prompt.match(/bis (\d+)/)![1]);
          expect(valueOf(ex)).toBe(target - ex.visual.lengthCm);
          expect(target, ex.key).toBeLessThanOrEqual(15);
        }
      }
    }
  });

  it('Stufe 2: the object starts at another mark, at most 20; AB 1 ends by 12; the end mark is the bug "lineal-ende"', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(2, ab)) {
        if (ex.visual?.type !== 'ruler') throw new Error('ruler expected');
        expect(ex.visual.startCm).toBeGreaterThan(0);
        expect(ex.visual.minCm ?? 0, ex.key).toBe(0);
        expect(ex.visual.second, ex.key).toBeUndefined();
        const end = ex.visual.startCm + ex.visual.lengthCm;
        expect(end).toBeLessThanOrEqual(ab === 1 ? 12 : 20);
        if (ex.key.includes(':bis-marke-versetzt:')) {
          expect(valueOf(ex), ex.key).toBe(Number(ex.prompt.match(/bis (\d+)/)![1]) - end);
          continue;
        }
        expect(valueOf(ex)).toBe(ex.visual.lengthCm);
        expect(ex.visual.startCm, `${ex.key}: the length is not the start mark`).not.toBe(ex.visual.lengthCm);
        expect(ex.bugs?.find((b) => b.id === 'lineal-ende')?.match).toBe(end);
      }
    }
  });

  it('Stufe 3: two lengths: the difference; broken ruler: end minus start; which one is longer', () => {
    let two = 0;
    let broken = 0;
    let longer = 0;
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(3, ab)) {
        if (ex.visual?.type !== 'ruler') throw new Error('ruler expected');
        if (ex.key.includes(':laenger:')) {
          longer++;
          if (ex.answer.kind !== 'choice') throw new Error('choice expected');
          const label = ex.answer.options[ex.answer.correct].label;
          const [upper, lower] = [ex.visual.second!.lengthCm, ex.visual.lengthCm];
          expect(label, ex.key).toBe(upper === lower ? 'Beide gleich lang' : upper > lower ? 'Der obere Streifen' : 'Der untere Streifen');
        } else if (ex.visual.second) {
          two++;
          const longerOne = /obere/.test(ex.prompt) ? ex.visual.second.lengthCm : ex.visual.lengthCm;
          const shorter = /obere/.test(ex.prompt) ? ex.visual.lengthCm : ex.visual.second.lengthCm;
          expect(longerOne).toBeGreaterThan(shorter);
          expect(valueOf(ex)).toBe(longerOne - shorter);
          if (ab === 1) expect([ex.visual.startCm, ex.visual.second.startCm], ex.key).toEqual([0, 0]);
          if (ab === 2) expect(ex.visual.startCm + ex.visual.second.startCm, ex.key).toBeGreaterThan(0);
          if (ab === 3) expect(ex.visual.minCm, ex.key).toBeGreaterThan(0);
        } else {
          broken++;
          expect(ex.visual.minCm).toBeGreaterThan(0);
          expect(ex.visual.startCm).toBeGreaterThan(ex.visual.minCm!);
          expect(valueOf(ex)).toBe(ex.visual.lengthCm);
          expect(ex.visual.startCm, `${ex.key}: the hint names the start`).not.toBe(ex.visual.lengthCm);
          // End minus start with the marks of Stufe 2 would be Stufe 2: AB 1 there ends by 12 from a start up to 4, AB 2 ends by 20.
          if (ab === 1) expect(ex.visual.startCm, ex.key).toBeGreaterThan(8);
          if (ab === 2) {
            expect(ex.visual.startCm, ex.key).toBeLessThan(20);
            expect(ex.visual.startCm + ex.visual.lengthCm, ex.key).toBeGreaterThan(20);
          }
        }
      }
    }
    expect(two).toBeGreaterThan(50);
    expect(broken).toBeGreaterThan(50);
    expect(longer).toBeGreaterThan(50);
  });

  it('which one is longer: neither the longer reach nor the shorter reach decides, and sometimes both are equal', () => {
    const outcome = (ex: Exercise) => {
      if (ex.visual?.type !== 'ruler' || !ex.visual.second) throw new Error(ex.key);
      const [a, b] = [ex.visual, ex.visual.second];
      if (a.lengthCm === b.lengthCm) return 'equal';
      return (a.lengthCm - b.lengthCm) * (a.startCm + a.lengthCm - b.startCm - b.lengthCm) > 0 ? 'reach' : 'other';
    };
    const list = atAb(3, 3, 800).filter((ex) => ex.key.includes(':laenger:'));
    for (const form of ['equal', 'reach', 'other']) expect(list.filter((ex) => outcome(ex) === form).length, form).toBeGreaterThan(30);
  });

  it('no task hands over the readings: no calculation is shown, and the praise about measuring is true', () => {
    for (const ex of STUFEN.flatMap((s) => [1, 2, 3].flatMap((ab) => atAb(s, ab as Ab)))) {
      expect(ex.expression, ex.key).toBeUndefined();
      expect(ex.prompt, ex.key).not.toMatch(/^Rechne/);
      if (ex.visual?.type !== 'ruler' || ex.visual.second) continue;
      // The prompt names neither mark of a length task; only 'ende-gelesen' names the end, as its misreading.
      if (ex.key.includes(':andere-marke:') || ex.key.includes(':abgebrochen:')) expect(`${ex.prompt} ${ex.context ?? ''}`, ex.key).not.toMatch(/\d/);
    }
  });

  it('sometimes the shorter object reaches further to the right', () => {
    const tricky = atAb(3, 2).filter((ex) => {
      if (ex.visual?.type !== 'ruler' || !ex.visual.second) return false;
      const a = ex.visual;
      const b = ex.visual.second;
      return (a.lengthCm - b.lengthCm) * (a.startCm + a.lengthCm - b.startCm - b.lengthCm) < 0;
    });
    expect(tricky.length).toBeGreaterThan(0);
  });

  it('srText carries the strip on the ruler, so the answer field alone is enough for a screen reader', () => {
    for (const ex of STUFEN.flatMap((s) => [1, 2, 3].flatMap((ab) => atAb(s, ab as Ab, 100)))) {
      if (ex.visual?.type !== 'ruler') continue;
      expect(ex.srText, ex.key).toContain(`beginnt bei ${ex.visual.startCm} Zentimeter und endet bei ${ex.visual.startCm + ex.visual.lengthCm} Zentimeter`);
      if (ex.visual.second) expect(ex.srText, ex.key).toContain(`Der obere Streifen beginnt bei ${ex.visual.second.startCm} Zentimeter`);
    }
  });
});
