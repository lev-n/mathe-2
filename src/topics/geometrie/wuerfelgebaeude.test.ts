import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Exercise, Stufe, Visual } from '../../core/types';
import { frontSilhouette, sideSilhouette } from '../../ui/visuals/CubeBuildingVisual';
import { samples } from '../test-utils';
import { frontView, hiddenCubes, sideView, wuerfelgebaeudeSkill } from './wuerfelgebaeude';

describeSkill(wuerfelgebaeudeSkill, { minDistinct: { 1: 25, 2: 40, 3: 40 } });

type Building = Extract<Visual, { type: 'cubeBuilding' }>;
const heightsOf = (ex: Exercise) => (ex.visual as Building).heights;
const all = (kind: string) => [1, 2, 3].flatMap((s) => samples(wuerfelgebaeudeSkill, s as Stufe)).filter((e) => e.key.includes(`:${kind}:`));
const sum = (h: number[][]) => h.flat().reduce((a, b) => a + b, 0);
const value = (ex: Exercise) => (ex.answer.kind === 'number' ? ex.answer.value : null);

describe('Würfel bauen – independent checks', () => {
  it('hidden cubes: only those with a cube in front, to the right and on top', () => {
    expect(hiddenCubes([[2, 1], [1, 0]])).toBe(1);
    expect(hiddenCubes([[3, 3], [3, 3]])).toBe(2);
    expect(hiddenCubes([[1, 1], [1, 1]])).toBe(0);
    expect(hiddenCubes([[3, 2, 1]])).toBe(0);
  });

  it('AB I counts up to 6 and hides nothing', () => {
    for (const kind of ['reihe', 'flach']) {
      for (const ex of all(kind)) {
        expect(value(ex), ex.key).toBe(sum(heightsOf(ex)));
        expect(sum(heightsOf(ex)), ex.key).toBeLessThanOrEqual(6);
        expect(hiddenCubes(heightsOf(ex)), ex.key).toBe(0);
      }
    }
  });

  it('Stufe 2: the sum of the heights, at most 10, with a hidden cube; the bug counts the visible cubes', () => {
    const list = all('verdeckt');
    expect(list.length).toBeGreaterThan(20);
    for (const ex of list) {
      const h = heightsOf(ex);
      expect(value(ex), ex.key).toBe(sum(h));
      expect(ex.stufe, ex.key).toBe(2);
      expect(sum(h), ex.key).toBeLessThanOrEqual(10);
      expect(hiddenCubes(h), ex.key).toBeGreaterThan(0);
      const bug = ex.bugs?.find((b) => b.id === 'wuerfel-verdeckt');
      expect(bug?.match, ex.key).toBe(sum(h) - hiddenCubes(h));
    }
  });

  it('every tower top of a generated building can be seen: never higher towards the front or the right', () => {
    for (const ex of [...all('verdeckt'), ...all('waehle')]) {
      const h = heightsOf(ex);
      h.forEach((row, r) => row.forEach((v, c) => {
        if (r > 0) expect(v, ex.key).toBeLessThanOrEqual(h[r - 1][c]);
        if (c > 0) expect(v, ex.key).toBeLessThanOrEqual(row[c - 1]);
      }));
    }
  });

  it('Bauplan: the sum of its numbers; choosing a plan: the right picture is the building itself', () => {
    for (const ex of all('plan')) expect(value(ex), ex.key).toBe(sum(heightsOf(ex)));
    const list = all('waehle');
    expect(list.length).toBeGreaterThan(20);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      expect((ex.answer.options[ex.answer.correct].visual as Building).heights, ex.key).toEqual(heightsOf(ex));
      expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
    }
  });

  it('every building of Stufe 2 keeps the limit of cubes: at most 10', () => {
    for (const kind of ['verdeckt', 'plan', 'waehle']) {
      const list = all(kind);
      expect(list.length, kind).toBeGreaterThan(10);
      for (const ex of list) expect(sum(heightsOf(ex)), ex.key).toBeLessThanOrEqual(10);
    }
  });

  it('a step that names a picture also draws it: \'So geht\'s\' shows no options', () => {
    for (const ex of [...all('waehle'), ...all('ansicht')]) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const last = ex.steps[ex.steps.length - 1];
      expect(typeof last === 'object' && last.visual, ex.key).toEqual(ex.answer.options[ex.answer.correct].visual);
    }
  });

  it('views: the right picture shows the same columns as the drawn view of this building', () => {
    const list = all('ansicht');
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const h = heightsOf(ex);
      const v = ex.answer.options[ex.answer.correct].visual as Building;
      const drawn = v.view === 'front' ? frontSilhouette(v.heights) : sideSilhouette(v.heights);
      const asked = ex.prompt.includes('vorne') ? frontSilhouette(h) : sideSilhouette(h);
      expect(drawn, ex.key).toEqual(asked);
      expect(v.view, ex.key).toBe(ex.prompt.includes('vorne') ? 'front' : 'side');
      expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
    }
    expect(frontView([[3, 0, 1], [1, 2, 0]])).toEqual([3, 2, 1]);
    expect(sideView([[3, 0, 1], [1, 2, 0]])).toEqual([2, 3]);
  });

  const atAb = (stufe: Stufe, ab: 1 | 2 | 3, n = 300) => Array.from({ length: n }, (_, i) => wuerfelgebaeudeSkill.generate(createRng(i * 433 + 9), stufe, { extras: true, ab }));
  const formsAt = (stufe: Stufe, ab: 1 | 2 | 3) => new Set(atAb(stufe, ab).map((e) => e.key.split(':')[2]));

  it('the Stufe chooses the content, the AB the demand inside it', () => {
    expect(formsAt(1, 1)).toEqual(new Set(['reihe', 'flach']));
    expect(formsAt(1, 2)).toEqual(new Set(['hoch', 'mehr']));
    expect(formsAt(1, 3)).toEqual(new Set(['fehlen', 'gleich-hoch', 'bild']));
    expect(formsAt(2, 1)).toEqual(new Set(['verdeckt', 'plan']));
    expect(formsAt(2, 2)).toEqual(new Set(['verdeckt', 'waehle']));
    expect(formsAt(2, 3)).toEqual(new Set(['unsichtbar', 'plan-rest', 'zahl-im-plan']));
    expect(formsAt(3, 1)).toEqual(new Set(['ansicht']));
    expect(formsAt(3, 2)).toEqual(new Set(['ansicht']));
    expect(formsAt(3, 3)).toEqual(new Set(['ansicht', 'umgekehrt', 'in-ansicht']));
  });

  it('Stufe 1: at most 6 cubes and none hidden, at every AB', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(1, ab)) {
        const visuals = [ex.visual, ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.visual) : [])].filter(Boolean) as Building[];
        for (const v of visuals) {
          expect(sum(v.heights), ex.key).toBeLessThanOrEqual(6);
          expect(hiddenCubes(v.heights), ex.key).toBe(0);
        }
      }
    }
  });

  it('Stufe 1, AB II and III: answers recomputed from the towers', () => {
    for (const ex of atAb(1, 2).filter((e) => e.key.includes(':mehr:'))) {
      const row = heightsOf(ex)[0];
      expect(value(ex), ex.key).toBe(Math.max(...row) - Math.min(...row));
    }
    const third = atAb(1, 3, 600);
    for (const ex of third.filter((e) => e.key.includes(':gleich-hoch:'))) {
      const row = heightsOf(ex)[0];
      expect(value(ex), ex.key).toBe(row.length * Math.max(...row) - sum([row]));
      expect(row.length * Math.max(...row), ex.key).toBeLessThanOrEqual(6);
    }
    for (const ex of third.filter((e) => e.key.includes(':fehlen:'))) {
      const want = Number(/brauchst (\d+)/.exec(ex.prompt)![1]);
      expect(value(ex), ex.key).toBe(want - sum(heightsOf(ex)));
    }
    for (const ex of third.filter((e) => e.key.includes(':bild:'))) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const n = Number(/zeigt (\d+)/.exec(ex.prompt)![1]);
      ex.answer.options.forEach((o, i) => expect(sum((o.visual as Building).heights) === n, ex.key).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  it('Stufe 2, AB III: answers recomputed', () => {
    const list = atAb(2, 3, 600);
    const hidden = list.filter((e) => e.key.includes(':unsichtbar:'));
    expect(hidden.length).toBeGreaterThan(50);
    for (const ex of hidden) expect(value(ex), ex.key).toBe(hiddenCubes(heightsOf(ex)));
    for (const ex of list.filter((e) => e.key.includes(':plan-rest:'))) {
      const have = Number(/hast (\d+)/.exec(ex.context!)![1]);
      expect(value(ex), ex.key).toBe(have - sum(heightsOf(ex)));
      expect(have, ex.key).toBeLessThanOrEqual(10);
    }
    for (const ex of list.filter((e) => e.key.includes(':zahl-im-plan:'))) {
      const h = heightsOf(ex);
      const [row, col] = /Bauplan (hinten|vorne) (links|rechts)/.exec(ex.prompt)!.slice(1);
      expect(value(ex), ex.key).toBe(h[row === 'hinten' ? 0 : h.length - 1][col === 'links' ? 0 : h[0].length - 1]);
    }
  });

  it('Stufe 3: AB I only from the front; AB III from a Bauplan', () => {
    for (const ex of atAb(3, 1)) expect(ex.prompt, ex.key).toContain('vorne');
    expect(atAb(3, 2).some((e) => e.prompt.includes('rechts'))).toBe(true);
    for (const ex of atAb(3, 3).filter((e) => e.key.includes(':ansicht:'))) expect((ex.visual as Building).view, ex.key).toBe('plan');
  });

  it('from the view back to the building: only the right building has this view', () => {
    const list = atAb(3, 3, 600).filter((e) => e.key.includes(':umgekehrt:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const shown = ex.visual as Building;
      const front = shown.view === 'front';
      const view = (h: number[][]) => (front ? frontSilhouette(h) : sideSilhouette(h));
      const want = view(shown.heights);
      ex.answer.options.forEach((o, i) => expect(view((o.visual as Building).heights).join() === want.join(), ex.key).toBe(i === (ex.answer as { correct: number }).correct));
      const last = ex.steps[ex.steps.length - 1];
      expect(typeof last === 'object' && last.visual, ex.key).toEqual(ex.answer.options[ex.answer.correct].visual);
    }
  });

  it('the cubes of a view: the sum of its columns, and all cubes are the bug', () => {
    const list = atAb(3, 3, 600).filter((e) => e.key.includes(':in-ansicht:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const h = heightsOf(ex);
      const cols = ex.prompt.includes('vorne') ? frontSilhouette(h) : sideSilhouette(h);
      expect(value(ex), ex.key).toBe(cols.reduce((a, b) => a + b, 0));
      expect(ex.bugs?.find((b) => b.id === 'wuerfel-verdeckt')?.match, ex.key).toBe(sum(h));
    }
  });
});
