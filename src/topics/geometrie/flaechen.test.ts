import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Cell, Exercise, Stufe, Visual } from '../../core/types';
import { samples } from '../test-utils';
import { MOST_PAIR_COLUMNS, flaechenSkill } from './flaechen';

describeSkill(flaechenSkill, { minDistinct: 30 });

type Grid = Extract<Visual, { type: 'grid' }>;
const all = (kind: string) => [1, 2, 3].flatMap((s) => samples(flaechenSkill, s as Stufe)).filter((e) => e.key.includes(`:${kind}:`));
const cellsOf = (ex: Exercise) => (ex.visual as Grid).cells;
const value = (ex: Exercise) => (ex.answer.kind === 'number' ? ex.answer.value : null);
const right = (ex: Exercise) => {
  if (ex.answer.kind !== 'choice') throw new Error('choice expected');
  return ex.answer.options[ex.answer.correct].label;
};

/** Sides without a neighbour, counted without the helpers of the generator. */
function border(cells: readonly Cell[]): number {
  const has = (x: number, y: number) => cells.some((c) => c[0] === x && c[1] === y);
  return cells.reduce((n, [x, y]) => n + [has(x + 1, y), has(x - 1, y), has(x, y + 1), has(x, y - 1)].filter((b) => !b).length, 0);
}

/** Sides reached from outside the figure: one walk around it, without the helpers of the generator. */
function outerBorder(cells: readonly Cell[]): number {
  const has = (x: number, y: number) => cells.some((c) => c[0] === x && c[1] === y);
  const seen = new Set(['-1,-1']);
  const todo: Cell[] = [[-1, -1]];
  let n = 0;
  while (todo.length > 0) {
    const [x, y] = todo.pop()!;
    for (const [a, b] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (a < -1 || b < -1 || a > 12 || b > 12) continue;
      if (has(a, b)) n++;
      else if (!seen.has(`${a},${b}`)) {
        seen.add(`${a},${b}`);
        todo.push([a, b]);
      }
    }
  }
  return n;
}

/** The two figures of a pair: left and right of the empty column. */
function split(ex: Exercise): [Cell[], Cell[]] {
  const g = ex.visual as Grid;
  const gap = Array.from({ length: g.width }, (_, x) => x).find((x) => !g.cells.some((c) => c[0] === x))!;
  return [g.cells.filter((c) => c[0] < gap), g.cells.filter((c) => c[0] > gap)];
}

/** A task with the letters A and B shows two figures. */
const figuresOf = (ex: Exercise): Cell[][] => ((ex.visual as Grid).labels?.length ? split(ex) : [cellsOf(ex)]);

const atAb = (stufe: Stufe, ab: 1 | 2 | 3, n = 400) => Array.from({ length: n }, (_, i) => flaechenSkill.generate(createRng(i * 523 + 7), stufe, { extras: true, ab }));
const formsAt = (stufe: Stufe, ab: 1 | 2 | 3) => new Set(atAb(stufe, ab).map((e) => e.key.split(':')[2]));

describe('Flächen vergleichen – independent checks', () => {
  it('is an optional skill', () => expect(flaechenSkill.optional).toBe('extra'));

  it('rectangle: the number of drawn Kästchen, at most 12', () => {
    const list = all('rechteck');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      expect(value(ex), ex.key).toBe(cellsOf(ex).length);
      expect(cellsOf(ex).length, ex.key).toBeLessThanOrEqual(12);
    }
  });

  it('free figure: the number of drawn Kästchen; the bug is its border', () => {
    const list = all('figur');
    expect(list.length).toBeGreaterThan(20);
    for (const ex of list) {
      expect(value(ex), ex.key).toBe(cellsOf(ex).length);
      expect(cellsOf(ex).length, ex.key).toBeLessThanOrEqual(ex.stufe === 1 ? 12 : 20);
      const bug = ex.bugs?.find((b) => b.id === 'rand-statt-flaeche');
      if (bug) expect(bug.match, ex.key).toBe(border(cellsOf(ex)));
    }
  });

  it('which is larger: the answer compares the counted Kästchen', () => {
    const list = all('groesser');
    expect(list.length).toBeGreaterThan(30);
    const seen = new Set<string>();
    for (const ex of list) {
      const [a, b] = split(ex);
      expect(a.length, ex.key).toBeLessThanOrEqual(20);
      expect(b.length, ex.key).toBeLessThanOrEqual(20);
      const want = a.length === b.length ? 'Beide sind gleich groß' : a.length > b.length ? 'Figur A' : 'Figur B';
      seen.add(want);
      expect(right(ex), ex.key).toBe(want);
      expect((ex.visual as Grid).width, 'fits a phone').toBeLessThanOrEqual(MOST_PAIR_COLUMNS);
    }
    expect(seen.size).toBe(3);
  });

  it('border: the number of free sides', () => {
    const list = all('rand');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) expect(value(ex), ex.key).toBe(border(cellsOf(ex)));
  });

  it('every task form keeps the limit of the Stufe: 12 Kästchen on Stufe 1, 20 above', () => {
    const counts = new Set<number>();
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as const) {
        for (let seed = 1; seed <= 500; seed++) {
          const ex = flaechenSkill.generate(createRng(seed * 41 + stufe), stufe, { extras: true, ab });
          const figures = figuresOf(ex);
          for (const f of figures) {
            expect(f.length, ex.key).toBeLessThanOrEqual(stufe === 1 ? 12 : 20);
            if (stufe === 1) counts.add(f.length);
          }
          for (const b of ex.bugs ?? []) if (b.id === 'flaeche-statt-rand') expect(b.match as number, ex.key).toBeLessThanOrEqual(stufe === 1 ? 12 : 20);
        }
      }
    }
    expect(Math.max(...counts), 'Stufe 1 still reaches its limit').toBe(12);
  });

  it('no free figure has a hole: the border is one walk around the figure, as the hint says', () => {
    // holes were rare, so many seeds on the AB levels and Stufen with free figures
    for (const ab of [2, 3] as const) {
      for (const stufe of [2, 3] as Stufe[]) {
        for (let seed = 1; seed <= 500; seed++) {
          const ex = flaechenSkill.generate(createRng(seed * 37 + stufe), stufe, { extras: true, ab });
          const figures = figuresOf(ex);
          for (const f of figures) expect(outerBorder(f), ex.key).toBe(border(f));
          if (ex.key.includes(':rand:')) expect(value(ex), ex.key).toBe(outerBorder(cellsOf(ex)));
        }
      }
    }
    expect(outerBorder([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]]), 'a ring: only the outside').toBe(12);
  });

  it('comparing borders: the answer compares the free sides', () => {
    const list = all('randvergleich');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      const [a, b] = split(ex);
      const pa = border(a);
      const pb = border(b);
      expect(right(ex), ex.key).toBe(pa === pb ? 'Beide sind gleich lang' : pa > pb ? 'Figur A' : 'Figur B');
    }
  });

  it('the Stufe chooses the content, the AB the demand inside it', () => {
    expect(formsAt(1, 1)).toEqual(new Set(['rechteck']));
    expect(formsAt(1, 2)).toEqual(new Set(['rechteck', 'ausgelegt']));
    expect(formsAt(1, 3)).toEqual(new Set(['fehlend', 'reihen']));
    expect(formsAt(2, 1)).toEqual(new Set(['groesser']));
    expect(formsAt(2, 2)).toEqual(new Set(['groesser', 'figur']));
    expect(formsAt(2, 3)).toEqual(new Set(['mehr', 'gleich', 'genauso']));
    expect(formsAt(3, 1)).toEqual(new Set(['rand']));
    expect(formsAt(3, 2)).toEqual(new Set(['rand', 'randvergleich']));
    expect(formsAt(3, 3)).toEqual(new Set(['randvergleich', 'gleich-kaestchen', 'anbau']));
  });

  it('Stufe 1: only rectangles, at most 9 Kästchen on AB I', () => {
    for (const ex of atAb(1, 1)) {
      expect(value(ex), ex.key).toBe(cellsOf(ex).length);
      expect(value(ex), ex.key).toBeLessThanOrEqual(9);
    }
    for (const ex of atAb(1, 2).filter((e) => e.key.includes(':rechteck:'))) {
      expect(value(ex), ex.key).toBeGreaterThanOrEqual(10);
      expect(value(ex), ex.key).toBeLessThanOrEqual(12);
    }
  });

  it('Stufe 1, a rectangle at its edge: columns times rows of the drawn cross', () => {
    const list = atAb(1, 2).filter((e) => e.key.includes(':ausgelegt:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const c = cellsOf(ex);
      const w = new Set(c.map((x) => x[0])).size;
      const h = new Set(c.map((x) => x[1])).size;
      expect(value(ex), ex.key).toBe(w * h);
      expect(c.length, ex.key).toBe(w + h - 1);
    }
  });

  it('Stufe 1, what is missing and how many rows: recomputed from the drawing', () => {
    const list = atAb(1, 3);
    const gap = list.filter((e) => e.key.includes(':fehlend:'));
    expect(gap.length).toBeGreaterThan(50);
    for (const ex of gap) {
      const c = cellsOf(ex);
      const w = new Set(c.map((x) => x[0])).size;
      const h = new Set(c.map((x) => x[1])).size;
      expect(value(ex), ex.key).toBe(w * h - c.length);
      expect(value(ex), ex.key).toBeGreaterThan(0);
    }
    const rows = list.filter((e) => e.key.includes(':reihen:'));
    expect(rows.length).toBeGreaterThan(50);
    for (const ex of rows) {
      const n = Number(/hat (\d+) Kästchen/.exec(ex.context!)![1]);
      expect(value(ex)! * cellsOf(ex).length, ex.key).toBe(n);
    }
  });

  it('Stufe 2, AB I: two rectangles at least 2 Kästchen apart, never the same', () => {
    for (const ex of atAb(2, 1)) {
      const [a, b] = split(ex);
      expect(Math.abs(a.length - b.length), ex.key).toBeGreaterThanOrEqual(2);
      expect(right(ex), ex.key).toBe(a.length > b.length ? 'Figur A' : 'Figur B');
    }
  });

  it('Stufe 2, AB III: how many more, and how many are missing, recomputed', () => {
    const list = atAb(2, 3);
    for (const kind of ['mehr', 'gleich']) {
      const some = list.filter((e) => e.key.includes(`:${kind}:`));
      expect(some.length, kind).toBeGreaterThan(50);
      for (const ex of some) {
        const [a, b] = split(ex);
        expect(value(ex), ex.key).toBe(Math.abs(a.length - b.length));
        expect(value(ex), ex.key).toBeGreaterThan(0);
      }
    }
  });

  it('the letters A and B of a pair stay at 16 px on a 375 px phone: drawn at 18 px, the picture may shrink to 311 px at most', () => {
    expect((MOST_PAIR_COLUMNS * 32 + 2 * 14) * (16 / 18)).toBeLessThanOrEqual(311);
    for (const stufe of [2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(stufe, ab)) {
          const g = ex.visual as Grid | undefined;
          if (g?.labels?.length) expect(g.width, ex.key).toBeLessThanOrEqual(MOST_PAIR_COLUMNS);
        }
      }
    }
  });

  it('just as large: the figure of the task and the options have Kästchen of one size on a phone', () => {
    // GridVisual: 64 px per Kästchen up to 4 × 4, otherwise 32 px, 2 × 14 px around; .ans-choice__visual shrinks a picture above 192 px (12rem) high.
    const cellOf = (g: Grid, room = Infinity) => {
      const cell = g.width <= 4 && g.height <= 4 ? 64 : 32;
      return cell * Math.min(1, room / (g.height * cell + 28));
    };
    for (const ex of atAb(2, 3).filter((e) => e.key.includes(':genauso:'))) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      for (const o of ex.answer.options) expect(cellOf(o.visual as Grid, 192), ex.key).toBe(cellOf(ex.visual as Grid));
    }
  });

  it('just as large: only the right figure has the Kästchen of the shown one', () => {
    const list = atAb(2, 3).filter((e) => e.key.includes(':genauso:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const n = cellsOf(ex).length;
      ex.answer.options.forEach((o, i) => expect((o.visual as Grid).cells.length === n, ex.key).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  it('Stufe 3: AB I only rectangles; the same Kästchen with another border; a Kästchen added', () => {
    for (const ex of atAb(3, 1)) expect(ex.key, ex.key).toMatch(/:rand:\dx\d$/);
    const list = atAb(3, 3);
    const same = list.filter((e) => e.key.includes(':gleich-kaestchen:'));
    expect(same.length).toBeGreaterThan(50);
    for (const ex of same) {
      const [a, b] = split(ex);
      expect(a.length, ex.key).toBe(b.length);
      expect(border(a), ex.key).not.toBe(border(b));
      expect(right(ex), ex.key).toBe(border(a) > border(b) ? 'Figur A' : 'Figur B');
    }
    const added = list.filter((e) => e.key.includes(':anbau:'));
    expect(added.length).toBeGreaterThan(50);
    for (const ex of added) {
      const c = cellsOf(ex);
      const right2 = Math.max(...c.map((x) => x[0])) + 1;
      expect(value(ex), ex.key).toBe(border([...c, [right2, 0]]));
    }
  });
});
