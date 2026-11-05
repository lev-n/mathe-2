import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, Cell, Exercise, Stufe, Visual } from '../../core/types';
import { CTX, samples } from '../test-utils';
import { symmetrieSkill } from './symmetrie';

describeSkill(symmetrieSkill, { minDistinct: 30 });

type Grid = Extract<Visual, { type: 'grid' }>;
const all = (kind: string) => [1, 2, 3].flatMap((s) => samples(symmetrieSkill, s as Stufe)).filter((e) => e.key.includes(`:${kind}:`));

/** Folds the cells on the axis, without the helpers of the generator. */
function fits(cells: readonly Cell[], orientation: 'vertical' | 'horizontal', at: number): boolean {
  const set = new Set(cells.map((c) => c.join()));
  return cells.every(([x, y]) => set.has((orientation === 'vertical' ? [2 * at - 1 - x, y] : [x, 2 * at - 1 - y]).join()));
}
const at = (stufe: Stufe, ab: Ab, n = 200, extras = CTX.extras) => Array.from({ length: n }, (_, i) => symmetrieSkill.generate(createRng(i * 4177 + 11), stufe, { extras, ab }));
const formOf = (ex: Exercise) => ex.key.split(':')[2];
const axisOf = (v: Visual | undefined) => (v as Grid).axis as { orientation: 'vertical' | 'horizontal'; at: number };

/** All fold lines of a figure, by trying them: through the middle of its box, and the diagonals of a square box. */
function foldLines(cells: readonly Cell[]): string[] {
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const set = new Set(cells.map((c) => c.join()));
  const holds = (move: (x: number, y: number) => number[]) => cells.every(([x, y]) => set.has(move(x, y).join()));
  const out: string[] = [];
  if (holds((x, y) => [x0 + x1 - x, y])) out.push('down');
  if (holds((x, y) => [x, y0 + y1 - y])) out.push('across');
  if (x1 - x0 === y1 - y0) {
    if (holds((x, y) => [x0 + y - y0, y0 + x - x0])) out.push('diagonal');
    if (holds((x, y) => [x0 + y1 - y, y0 + x1 - x])) out.push('anti-diagonal');
  }
  return out;
}

const right = (ex: Exercise) => {
  if (ex.answer.kind !== 'choice') throw new Error('choice expected');
  return ex.answer.options[ex.answer.correct];
};

describe('Spiegeln und Falten – independent checks', () => {
  it('yes or no: "Ja" exactly when the figure folds onto itself; both answers occur', () => {
    const list = all('falten');
    expect(list.length).toBeGreaterThan(50);
    const seen = new Set<string>();
    for (const ex of list) {
      const g = ex.visual as Grid;
      const ax = g.axis as { orientation: 'vertical' | 'horizontal'; at: number };
      seen.add(right(ex).label);
      expect(right(ex).label, ex.key).toBe(fits(g.cells, ax.orientation, ax.at) ? 'Ja' : 'Nein');
    }
    expect(seen).toEqual(new Set(['Ja', 'Nein']));
  });

  it('yes or no asks whether the halves fit, not whether they are the same: moved halves are the same but do not fit', () => {
    const list = all('falten');
    for (const ex of list) {
      expect(ex.prompt, ex.key).toBe('Falte an der Linie. Passen beide Hälften genau aufeinander?');
      const text = ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).join(' ');
      expect(text, ex.key).not.toMatch(/gleich/);
    }
    expect(list.some((e) => e.steps.some((s) => typeof s === 'string' && s.includes('verschoben')))).toBe(true);
  });

  it('direction: the fold goes across the line, and the crease runs along it', () => {
    const list = all('richtung');
    expect(new Set(list.map((e) => right(e).label)).size).toBe(2);
    for (const ex of list) {
      const across = right(ex).label === 'von links nach rechts';
      expect(ex.steps[0], ex.key).toBe(across ? 'Klappe in Gedanken die obere Hälfte auf die untere.' : 'Klappe in Gedanken die linke Hälfte auf die rechte.');
      expect(ex.steps[ex.steps.length - 1], ex.key).toBe(`Die Faltlinie läuft ${right(ex).label}.`);
    }
  });

  it('a step that names a picture also draws it: \'So geht\'s\' shows no options', () => {
    for (const ex of [...all('linie'), ...all('form'), ...all('spiegelbild'), ...all('passt'), ...all('passt-nicht'), ...all('urbild')]) {
      const last = ex.steps[ex.steps.length - 1];
      expect(typeof last === 'object' && last.visual, ex.key).toEqual(right(ex).visual);
    }
  });

  it('the Stufe chooses the content, the AB the demand: the forms of each cell', () => {
    const forms = (stufe: Stufe, ab: Ab, extras = true) => new Set(at(stufe, ab, 300, extras).map(formOf));
    expect(forms(1, 1)).toEqual(new Set(['falten']));
    expect(forms(1, 2)).toEqual(new Set(['falten', 'passt']));
    expect(forms(1, 3)).toEqual(new Set(['passt-nicht', 'fehlt']));
    expect(forms(2, 1)).toEqual(new Set(['falten', 'richtung']));
    expect(forms(2, 2)).toEqual(new Set(['falten', 'linie']));
    expect(forms(2, 3)).toEqual(new Set(['form', 'linien']));
    expect(forms(3, 1, false)).toEqual(new Set(['spiegelbild']));
    expect(forms(3, 2, false)).toEqual(new Set(['spiegelbild']));
    expect(forms(3, 3, false)).toEqual(new Set(['spiegelbild', 'urbild']));
    expect(forms(3, 1)).toEqual(new Set(['spiegelbild']));
    expect(forms(3, 2)).toEqual(new Set(['spiegelbild', 'ergaenzen']));
    expect(forms(3, 3)).toEqual(new Set(['spiegelbild', 'urbild', 'ergaenzen']));
  });

  it('Stufe 1 keeps to the vertical line on every AB; the content of Stufe 2 and 3 stays out', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of at(1, ab)) {
        expect(ex.key, ex.key).not.toMatch(/:horizontal:|:linie:|:richtung:|:spiegelbild:|:ergaenzen:/);
        const pictures = [ex.visual, ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.visual) : [])].filter(Boolean);
        for (const v of pictures) expect(axisOf(v).orientation, ex.key).toBe('vertical');
      }
    }
  });

  it('a falten task of Stufe 2 is never one of Stufe 1: its line lies horizontally', () => {
    for (const ab of [1, 2] as Ab[]) {
      const list = at(2, ab).filter((e) => formOf(e) === 'falten');
      expect(list.length).toBeGreaterThan(30);
      for (const ex of list) expect(axisOf(ex.visual).orientation, ex.key).toBe('horizontal');
    }
  });

  it('AB II is harder than AB I: larger figures, and one Kästchen off instead of a moved half', () => {
    const size = (stufe: Stufe, ab: Ab) => at(stufe, ab).filter((e) => formOf(e) === 'falten').map((e) => (e.visual as Grid).cells.length);
    const mean = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length;
    for (const stufe of [1, 2] as Stufe[]) expect(mean(size(stufe, 2)), `Stufe ${stufe}`).toBeGreaterThan(mean(size(stufe, 1)));
    for (const ex of at(1, 1).filter((e) => formOf(e) === 'falten' && right(e).label === 'Nein')) expect(ex.steps.join(' '), ex.key).toContain('verschoben');
    for (const ex of at(1, 2).filter((e) => formOf(e) === 'falten' && right(e).label === 'Nein')) expect(ex.steps.join(' '), ex.key).not.toContain('verschoben');
  });

  it('which picture fits, and which does not: the fold of each picture decides', () => {
    for (const [ab, form] of [[2, 'passt'], [3, 'passt-nicht']] as const) {
      const list = at(1, ab).filter((e) => formOf(e) === form);
      expect(list.length).toBeGreaterThan(30);
      for (const ex of list) {
        if (ex.answer.kind !== 'choice') throw new Error('choice expected');
        ex.answer.options.forEach((o, i) => {
          const ax = axisOf(o.visual);
          const folds = fits((o.visual as Grid).cells, ax.orientation, ax.at);
          expect(folds, `${ex.key} option ${i}`).toBe(form === 'passt' ? i === (ex.answer as { correct: number }).correct : i !== (ex.answer as { correct: number }).correct);
        });
      }
    }
  });

  it('Kästchen missing: the figure folds once they are there, and the number varies', () => {
    const list = at(1, 3, 300).filter((e) => formOf(e) === 'fehlt');
    expect(list.length).toBeGreaterThan(30);
    expect(new Set(list.map((e) => (e.answer as { value: number }).value))).toEqual(new Set([1, 2, 3]));
    for (const ex of list) {
      const { cells } = ex.visual as Grid;
      const set = new Set(cells.map((c) => c.join()));
      const lonely = cells.filter(([x, y]) => !set.has([5 - x, y].join()));
      expect((ex.answer as { value: number }).value, ex.key).toBe(lonely.length);
      for (const [x] of lonely) expect(x, `${ex.key}: Kästchen are only missing on the right`).toBeLessThan(3);
    }
  });

  it('how many Faltlinien: recomputed by folding, 0, 1 and 2 all occur, and no figure folds along a diagonal', () => {
    const list = at(2, 3, 400).filter((e) => formOf(e) === 'linien');
    expect(new Set(list.map((e) => (e.answer as { value: number }).value))).toEqual(new Set([0, 1, 2]));
    for (const ex of list) {
      const lines = foldLines((ex.visual as Grid).cells);
      expect(lines.length, ex.key).toBe((ex.answer as { value: number }).value);
      expect(lines.filter((l) => l.includes('diagonal')), ex.key).toEqual([]);
      expect((ex.visual as Grid).axis, 'the line is the question').toBeUndefined();
    }
  });

  it('the mirror image: AB I gives the left half; AB II the other sides; AB III also a gap to the line', () => {
    const sides = (ab: Ab) => new Set(at(3, ab, 300, false).filter((e) => formOf(e) === 'spiegelbild').map((e) => e.key.split(':')[3]));
    expect(sides(1)).toEqual(new Set(['links']));
    expect(sides(2)).toEqual(new Set(['rechts', 'oben', 'unten']));
    expect(sides(3)).toEqual(new Set(['links', 'rechts', 'oben', 'unten']));
    const touches = (ex: Exercise) => {
      const ax = axisOf(ex.visual);
      return (ex.visual as Grid).cells.some(([x, y]) => (ax.orientation === 'vertical' ? x === ax.at || x === ax.at - 1 : y === ax.at || y === ax.at - 1));
    };
    for (const ab of [1, 2] as Ab[]) for (const ex of at(3, ab, 200, false)) expect(touches(ex), ex.key).toBe(true);
    expect(at(3, 3, 300, false).some((e) => formOf(e) === 'spiegelbild' && !touches(e))).toBe(true);
  });

  it('from the mirror image back: only the right picture mirrors to the task', () => {
    const list = at(3, 3, 300, false).filter((e) => formOf(e) === 'urbild');
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const task = (ex.visual as Grid).cells.map((c) => c.join()).sort().join(' ');
      ex.answer.options.forEach((o, i) => {
        const back = (o.visual as Grid).cells.map(([x, y]) => [5 - x, y].join()).sort().join(' ');
        expect(back === task, `${ex.key} option ${i}`).toBe(i === (ex.answer as { correct: number }).correct);
      });
    }
  });

  it('task and options compare at the same size: no picture of a mirror image has 6 rows, which would shrink in its option', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of at(3, ab, 200, false)) {
        if (ex.answer.kind !== 'choice') throw new Error('choice expected');
        const g = ex.visual as Grid;
        expect(g.height, ex.key).toBeLessThanOrEqual(5);
        for (const o of ex.answer.options) {
          expect((o.visual as Grid).width, ex.key).toBe(g.width);
          expect((o.visual as Grid).height, ex.key).toBe(g.height);
        }
      }
    }
  });

  it('which line: only the right picture folds onto itself', () => {
    const list = all('linie');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      const a = ex.answer;
      if (a.kind !== 'choice') throw new Error('choice expected');
      a.options.forEach((o, i) => {
        const g = o.visual as Grid;
        const ax = g.axis as { orientation: 'vertical' | 'horizontal'; at: number };
        expect(fits(g.cells, ax.orientation, ax.at), `${ex.key} option ${i}`).toBe(i === a.correct);
      });
    }
    expect(new Set(list.map((e) => axisOf(right(e).visual).orientation))).toEqual(new Set(['vertical', 'horizontal']));
  });

  it('direction: the figure folds along the right way only', () => {
    const list = all('richtung');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      const g = ex.visual as Grid;
      const across = right(ex).label === 'von links nach rechts';
      const ok = fits(g.cells, across ? 'horizontal' : 'vertical', 3);
      expect(ok, ex.key).toBe(true);
      expect(g.axis, 'the line is the question').toBeUndefined();
      // the other way does not fold at any line, not even one through the middle of a row or a column
      const pos = g.cells.map((c) => c[across ? 0 : 1]);
      const sum = Math.min(...pos) + Math.max(...pos);
      const set = new Set(g.cells.map((c) => c.join()));
      const both = g.cells.every(([x, y]) => set.has((across ? [sum - x, y] : [x, sum - y]).join()));
      expect(both, `${ex.key} folds both ways`).toBe(false);
    }
  });

  it('mirror image: the right picture is the half and its reflection; wrong pictures do not fold', () => {
    const list = all('spiegelbild');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      const a = ex.answer;
      if (a.kind !== 'choice') throw new Error('choice expected');
      const half = (ex.visual as Grid).cells;
      const ax = axisOf(ex.visual);
      const reflect = ([x, y]: Cell): Cell => (ax.orientation === 'vertical' ? [2 * ax.at - 1 - x, y] : [x, 2 * ax.at - 1 - y]);
      const want = [...half, ...half.map(reflect)].map((c) => c.join()).sort();
      expect((right(ex).visual as Grid).cells.map((c) => c.join()).sort(), ex.key).toEqual(want);
      a.options.forEach((o, i) => {
        if (i !== a.correct) expect(fits((o.visual as Grid).cells, ax.orientation, ax.at), `${ex.key} option ${i}`).toBe(false);
      });
    }
  });

  it('completing: given + solution fold onto themselves on a 4 × 6 grid, only on Stufe 3 with extras on', () => {
    const list = [...at(3, 2, 200), ...at(3, 3, 200)].filter((e) => e.key.includes(':ergaenzen:'));
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      if (ex.answer.kind !== 'cells') throw new Error('cells expected');
      const { width, height, given, solution, axis } = ex.answer;
      expect([width, height].sort()).toEqual([4, 6]);
      expect(fits([...given, ...solution], axis!.orientation as 'vertical', axis!.at), ex.key).toBe(true);
      expect(given.length, ex.key).toBe(solution.length);
    }
    for (const stufe of [1, 2] as Stufe[]) {
      for (let seed = 1; seed < 120; seed++) expect(symmetrieSkill.generate(createRng(seed + stufe), stufe, { extras: true, ab: 3 }).answer.kind).not.toBe('cells');
    }
    for (let seed = 1; seed < 120; seed++) expect(symmetrieSkill.generate(createRng(seed), 3, { extras: false, ab: 3 }).answer.kind).not.toBe('cells');
  });

  it('the label of Stufe 3 keeps its promise with extras off: completing stands only behind "Mit Extras"', () => {
    const [always, extra] = symmetrieSkill.stufen[3].split('Mit Extras');
    expect(always).not.toMatch(/ergänz/i);
    expect(extra).toMatch(/ergänz/i);
    expect(always).toMatch(/Spiegelbild finden/);
    const off = Array.from({ length: 120 }, (_, seed) => symmetrieSkill.generate(createRng(seed + 1), 3, { extras: false, ab: 3 }));
    expect(off.every((e) => /:(spiegelbild|urbild):/.test(e.key))).toBe(true);
    const on = Array.from({ length: 120 }, (_, seed) => symmetrieSkill.generate(createRng(seed + 1), 3, { extras: true, ab: 3 }));
    expect(on.some((e) => e.answer.kind === 'cells')).toBe(true);
  });

  it('cannot be folded: only the right picture has no fold line, and that picture changes from task to task', () => {
    const list = at(2, 3, 400).filter((e) => formOf(e) === 'form');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      ex.answer.options.forEach((o, i) => {
        const lines = foldLines((o.visual as Grid).cells);
        if (i === (ex.answer as { correct: number }).correct) expect(lines, ex.key).toEqual([]);
        else expect(lines.length, `${ex.key} option ${i}`).toBeGreaterThan(0);
      });
    }
    const pictures = new Set(list.map((e) => JSON.stringify(right(e).visual)));
    expect(pictures.size, 'the same answer picture in every task').toBeGreaterThan(list.length / 2);
  });
});
