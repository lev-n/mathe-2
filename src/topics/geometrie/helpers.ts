/** Small helpers of the geometry generators: the end of a task, pictures as options, Stimmt/Ja-Nein answers, Kästchen figures. */
import { speak } from '../../core/format';
import type { Ab, Axis, Cell, ChoiceAnswer, Exercise, SkillDef, Rng, Step, Stufe, Visual } from '../../core/types';
import { build, type ExerciseBody } from '../shared';

/** What a task function returns: `ab` and `kmk` come from the skill, srText defaults to the spoken task text. */
export type Task = Omit<ExerciseBody, 'ab' | 'kmk' | 'srText'> & { srText?: string };

export function finish(skill: Pick<SkillDef, 'id' | 'topicId'>, stufe: Stufe, ab: Ab, kmk: string[], task: Task): Exercise {
  const srText = task.srText ?? speak([task.context, task.prompt].filter(Boolean).join(' '));
  return build(skill, stufe, { ...task, ab, kmk, srText });
}

export const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

export const letter = (i: number): string => String.fromCharCode(65 + i);

export interface WrongPicture {
  visual: Visual;
  whyWrong: string;
}

/**
 * A choice between pictures, labelled A, B, C … by their shuffled position (a name on the option would give the answer away).
 * Pictures equal to the correct one or to an earlier one are dropped; the wrong list is in order of importance.
 */
export function pictureChoice(rng: Rng, correct: Visual, wrongs: readonly WrongPicture[], max: number): ChoiceAnswer {
  const seen = new Set([JSON.stringify(correct)]);
  const unique = wrongs.filter((w) => {
    const id = JSON.stringify(w.visual);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const order = rng.shuffle<{ visual: Visual; whyWrong?: string }>([{ visual: correct }, ...unique.slice(0, max - 1)]);
  return {
    kind: 'choice',
    options: order.map((o, i) => ({ label: letter(i), visual: o.visual, ...(o.whyWrong ? { whyWrong: o.whyWrong } : {}) })),
    correct: order.findIndex((o) => !o.whyWrong),
    layout: 'grid',
  };
}

/** How many distinct pictures pictureChoice would keep, the correct one included. */
export function distinctPictures(correct: Visual, wrongs: readonly WrongPicture[]): number {
  return new Set([correct, ...wrongs.map((w) => w.visual)].map((v) => JSON.stringify(v))).size;
}

/** The letter of the correct option: 'Bild B'. */
export const rightPicture = (a: ChoiceAnswer): string => `Bild ${a.options[a.correct].label}`;

/** A worked step that names the right picture and draws it: 'So geht's' shows no options, so a letter alone points at nothing. */
export const pictureStep = (a: ChoiceAnswer, text: string): Step => ({ text, visual: a.options[a.correct].visual as Visual });

/** Two options in a fixed order (Stimmt / Stimmt nicht, Ja / Nein). */
export function twoWay(first: string, second: string, firstIsRight: boolean, whyWrong: string): ChoiceAnswer {
  return {
    kind: 'choice',
    options: firstIsRight ? [{ label: first }, { label: second, whyWrong }] : [{ label: first, whyWrong }, { label: second }],
    correct: firstIsRight ? 0 : 1,
  };
}

// ─── Kästchen figures ────────────────────────────────────────────────────────

export const ck = (c: Cell): string => `${c[0]},${c[1]}`;

export function sortCells(cells: readonly Cell[]): Cell[] {
  return [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

/** Canonical id of a figure, for exercise keys. */
export const cellsId = (cells: readonly Cell[]): string => sortCells(cells).map(([x, y]) => `${x}${y}`).join('.');

export function rectCells(x0: number, y0: number, w: number, h: number): Cell[] {
  const out: Cell[] = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.push([x, y]);
  return out;
}

export const shift = (cells: readonly Cell[], dx: number, dy: number): Cell[] => cells.map(([x, y]) => [x + dx, y + dy]);
export const transpose = (cells: readonly Cell[]): Cell[] => cells.map(([x, y]) => [y, x]);

/** A connected figure of n cells inside a w × h box, grown from `start`. */
export function growFigure(rng: Rng, w: number, h: number, n: number, start: Cell): Cell[] {
  const on = new Map<string, Cell>([[ck(start), start]]);
  while (on.size < n) {
    const free: Cell[] = [];
    for (const [x, y] of on.values()) {
      for (const c of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]) {
        if (c[0] >= 0 && c[1] >= 0 && c[0] < w && c[1] < h && !on.has(ck(c))) free.push(c);
      }
    }
    if (free.length === 0) break;
    const c = rng.pick(free);
    on.set(ck(c), c);
  }
  return sortCells([...on.values()]);
}

export function bounds(cells: readonly Cell[]): { minX: number; minY: number; w: number; h: number } {
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, w: Math.max(...xs) - minX + 1, h: Math.max(...ys) - minY + 1 };
}

/** Is an empty Kästchen closed in by the figure? A connected figure without a hole also has no two Kästchen touching only at a corner. */
export function hasHole(cells: readonly Cell[]): boolean {
  const { minX, minY, w, h } = bounds(cells);
  const on = new Set(cells.map(ck));
  // spread over the empty Kästchen from a ring around the figure: what it does not reach is closed in
  const start: Cell = [minX - 1, minY - 1];
  const reached = new Set([ck(start)]);
  const todo = [start];
  while (todo.length > 0) {
    const [x, y] = todo.pop() as Cell;
    for (const c of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]) {
      if (c[0] < minX - 1 || c[1] < minY - 1 || c[0] > minX + w || c[1] > minY + h || on.has(ck(c)) || reached.has(ck(c))) continue;
      reached.add(ck(c));
      todo.push(c);
    }
  }
  return reached.size + cells.length < (w + 2) * (h + 2);
}

/** Kästchen sides on the border of a figure. Without a hole (hasHole), this is one walk around the figure. */
export function perimeter(cells: readonly Cell[]): number {
  const on = new Set(cells.map(ck));
  let n = 0;
  for (const [x, y] of cells) {
    for (const c of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]) if (!on.has(ck(c))) n++;
  }
  return n;
}

export type Line = Extract<Axis['orientation'], 'vertical' | 'horizontal'>;

/** The cell on the other side of a line between column (or row) at − 1 and at. */
export function mirrorCell([x, y]: Cell, line: Line, at: number): Cell {
  return line === 'vertical' ? [2 * at - 1 - x, y] : [x, 2 * at - 1 - y];
}

export const mirrored = (cells: readonly Cell[], line: Line, at: number): Cell[] => cells.map((c) => mirrorCell(c, line, at));

export function isSymmetric(cells: readonly Cell[], line: Line, at: number): boolean {
  const on = new Set(cells.map(ck));
  return cells.every((c) => on.has(ck(mirrorCell(c, line, at))));
}
