import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe, Visual } from '../../core/types';
import { CTX, samples } from '../test-utils';
import { musterSkill } from './muster';

describeSkill(musterSkill, { minDistinct: 25 });

type Row = Extract<Visual, { type: 'shapeRow' }>;
const items = (ex: Exercise) => (ex.visual as Row).items;
const right = (ex: Exercise) => {
  if (ex.answer.kind !== 'choice') throw new Error('choice expected');
  return ex.answer.options[ex.answer.correct];
};
const all = (kind: string) => [1, 2, 3].flatMap((s) => samples(musterSkill, s as Stufe)).filter((e) => e.key.includes(`:${kind}:`));
const shapeOf = (o: { visual?: Visual }) => (o.visual as Row).items[0];
const at = (stufe: Stufe, ab: Ab, n = 200) => Array.from({ length: n }, (_, i) => musterSkill.generate(createRng(i * 4177 + 11), stufe, { ...CTX, ab }));
const formOf = (ex: Exercise) => ex.key.split(':')[2];

/** The smallest period that fits all known places of a list. */
function period(list: (string | undefined)[]): number {
  for (let p = 1; p < list.length; p++) {
    if (list.every((v, i) => v === undefined || i < p || list[i - p] === undefined || list[i - p] === v)) return p;
  }
  return list.length;
}

describe('Muster – independent checks', () => {
  it('the Stufe chooses the content, the AB the demand: the forms of each cell', () => {
    const forms = (stufe: Stufe, ab: Ab) => new Set(at(stufe, ab).map(formOf));
    expect(forms(1, 1)).toEqual(new Set(['reihe']));
    expect(forms(1, 2)).toEqual(new Set(['reihe']));
    expect(forms(1, 3)).toEqual(new Set(['zwei-luecken', 'teil']));
    for (const ab of [1, 2, 3] as Ab[]) {
      expect(forms(2, ab)).toEqual(new Set(['merkmale']));
      expect(forms(3, ab)).toEqual(new Set(['fehler', 'waechst', 'figur']));
    }
  });

  it('Stufe 1 repeats only AB or ABC, on every AB', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of at(1, ab)) {
        const unit = ex.key.split(':')[3].split('.');
        expect(new Set(unit).size, ex.key).toBe(unit.length);
        expect(unit.length, ex.key).toBeLessThanOrEqual(3);
      }
    }
  });

  it('two gaps on Stufe 1: the answer is the form on the second gap', () => {
    const list = at(1, 3).filter((e) => formOf(e) === 'zwei-luecken');
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      const shapes = items(ex).map((i) => i.shape as string | undefined);
      const unit = ex.key.split(':')[3].split('.');
      expect(shapes.slice(-2), ex.key).toEqual([undefined, undefined]);
      expect(shapeOf(right(ex)).shape, ex.key).toBe(unit[(shapes.length - 1) % unit.length]);
    }
  });

  it('which part repeats: only the right option can be found in the row', () => {
    const list = at(1, 3).filter((e) => formOf(e) === 'teil');
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const line = items(ex).map((i) => i.shape).join(' ');
      ex.answer.options.forEach((o, i) => expect(line.includes((o.visual as Row).items.map((x) => x.shape).join(' ')), ex.key).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  it('continuing: the empty place is filled by the period of the row', () => {
    const list = all('reihe');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const shapes = items(ex).map((i) => i.shape as string | undefined);
      const p = period(shapes);
      const hole = shapes.indexOf(undefined);
      expect(shapes.filter((s) => s === undefined).length, ex.key).toBe(1);
      const twin = shapes[hole - p] ?? shapes[hole + p];
      expect(shapeOf(right(ex)).shape, ex.key).toBe(twin);
    }
  });

  it('AB I keeps the gap at the end, AB II has it inside', () => {
    for (const ex of at(1, 1)) expect(items(ex)[items(ex).length - 1].shape, ex.key).toBeUndefined();
    for (const ex of at(1, 2)) expect(items(ex)[items(ex).length - 1].shape, ex.key).toBeDefined();
  });

  it('two features: form and colour each follow their own rule, at the gap the task asks for', () => {
    const list = ([1, 2, 3] as Ab[]).flatMap((ab) => at(2, ab));
    for (const ex of list) {
      const [form, shapeList, colorList, , asked] = ex.key.split(':').slice(3);
      const shapes = shapeList.split('.');
      const colors = colorList.split('.');
      const k = Number(asked);
      const r = shapeOf(right(ex)) as { shape: string; color: string };
      expect(r.shape, ex.key).toBe(shapes[k % shapes.length]);
      expect(r.color, ex.key).toBe(colors[k % colors.length]);
      const row2 = items(ex) as { shape?: string; color?: string }[];
      const holes = row2.flatMap((x, i) => (x.shape ? [] : [i]));
      expect(holes, ex.key).toEqual(form === 'zwei' ? [k - 1, k] : [k]);
      row2.forEach((x, i) => {
        if (!x.shape) return;
        expect(x.shape, ex.key).toBe(shapes[i % shapes.length]);
        expect(x.color, ex.key).toBe(colors[i % colors.length]);
      });
    }
  });

  it('rules of two features: AB I one rule with each part twice, AB II rules of 2 and 3', () => {
    const lengths = (ex: Exercise) => ex.key.split(':').slice(4, 6).map((x) => x.split('.').length).sort();
    for (const ex of at(2, 1)) expect(lengths(ex), ex.key).toEqual([2, 4]);
    for (const ex of at(2, 2)) expect(lengths(ex), ex.key).toEqual([2, 3]);
  });

  it('form and colour never move in step: in the row a form comes with 2 colours and a colour with 2 forms, so both features count', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of at(2, ab, 300)) {
        const row = items(ex).filter((i) => i.shape) as { shape: string; color: string }[];
        const colorsOf = new Map<string, Set<string>>();
        const shapesOf = new Map<string, Set<string>>();
        for (const { shape, color } of row) {
          colorsOf.set(shape, (colorsOf.get(shape) ?? new Set()).add(color));
          shapesOf.set(color, (shapesOf.get(color) ?? new Set()).add(shape));
        }
        expect([...colorsOf.values()].some((c) => c.size > 1), `${ex.key}: the form tells the colour`).toBe(true);
        expect([...shapesOf.values()].some((c) => c.size > 1), `${ex.key}: the colour tells the form`).toBe(true);
        // the answer needs both: one option has the right form and another colour, one the right colour and another form
        if (ex.answer.kind !== 'choice') throw new Error('choice expected');
        const r = shapeOf(right(ex));
        const options = ex.answer.options.map(shapeOf) as { shape: string; color: string }[];
        expect(options.some((o) => o.shape === r.shape && o.color !== (r as { color?: string }).color) || options.some((o) => o.shape !== r.shape && o.color === (r as { color?: string }).color), ex.key).toBe(true);
      }
    }
  });

  it('the Fehlerdetektiv waits for Stufe 3 (§7.1)', () => {
    for (const stufe of [1, 2] as Stufe[]) expect(samples(musterSkill, stufe).filter((e) => e.key.includes(':fehler:'))).toEqual([]);
  });

  it('wrong piece: exactly one place breaks the rule, and the answer is the form that belongs there', () => {
    const list = all('fehler');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      const shapes = items(ex).map((i) => i.shape as string);
      const at = Number(ex.key.split(':')[5]);
      const fixedRow = (ex.steps[2] as { visual: Row }).visual.items.map((i) => i.shape as string);
      expect(fixedRow.filter((s, i) => s !== shapes[i]).length, ex.key).toBe(1);
      expect(shapeOf(right(ex)).shape, ex.key).toBe(fixedRow[at]);
      // repairing this place gives a periodic row, repairing any other place does not
      const repairs = shapes.map((_, i) => {
        return [1, 2, 3].some((p) => {
          if (p >= i && i + p >= shapes.length) return false;
          const fixed = [...shapes];
          fixed[i] = i >= p ? shapes[i - p] : shapes[i + p];
          return fixed.every((v, k) => k < p || v === fixed[k - p]) && fixed.length >= 2 * p + 1;
        });
      });
      expect(repairs.map((r, i) => (r ? i : -1)).filter((i) => i >= 0), ex.key).toContain(at);
      expect(repairs.filter(Boolean).length, `${ex.key}: ${shapes.join(' ')}`).toBe(1);
    }
  });

  it('wrong piece: no task needs a place number, as the row wraps and shows none', () => {
    const list = all('fehler');
    expect(list.some((e) => items(e).length > 5)).toBe(true);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const texts = [ex.prompt, ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)), ...ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? ''])];
      for (const t of texts) expect(t, ex.key).not.toMatch(/Platz|\d/);
      // the piece that breaks the rule is on offer: the child who spots it and picks it gets told what to do next
      const wrongShape = ex.key.split(':').pop() as string;
      expect(ex.answer.options.map((o) => shapeOf(o).shape), ex.key).toContain(wrongShape);
    }
  });

  it('growing figure: given + solution is figure 4 of the same family, and figure 3 is inside', () => {
    const list = [1, 2, 3].flatMap((s) => samples(musterSkill, s as Stufe)).filter((e) => e.answer.kind === 'cells');
    expect(list.length).toBeGreaterThan(10);
    const fourth: Record<string, number> = { doppel: 8, band: 8, winkel: 7, haken: 7, treppe: 10, gegentreppe: 10, quadrat: 16 };
    for (const ex of list) {
      if (ex.answer.kind !== 'cells') throw new Error('cells expected');
      const name = ex.key.split(':').pop()!;
      const total = ex.answer.given.length + ex.answer.solution.length;
      expect(total, ex.key).toBe(fourth[name]);
      expect(ex.answer.given.length, ex.key).toBe({ doppel: 6, band: 6, winkel: 5, haken: 5, treppe: 6, gegentreppe: 6, quadrat: 9 }[name]);
    }
  });

  it('no hint names the shape on the empty place', () => {
    const list = [1, 2, 3].flatMap((s) => samples(musterSkill, s as Stufe)).filter((e) => e.answer.kind === 'choice' && /^(reihe|waechst|merkmale|fehler|zwei-luecken)$/.test(e.key.split(':')[2]));
    expect(list.length).toBeGreaterThan(100);
    for (const ex of list) {
      const shape = right(ex).label.split(' ')[0];
      for (const h of ex.hints) expect(h, ex.key).not.toContain(shape);
    }
  });

  it('growing figures: every family grows by what the step says, and mirrored ones grow from the right', () => {
    const list = ([1, 2, 3] as Ab[]).flatMap((ab) => at(3, ab, 400)).filter((e) => e.answer.kind === 'cells');
    expect(new Set(list.map((e) => e.key.split(':').pop()))).toEqual(new Set(['doppel', 'band', 'winkel', 'haken', 'treppe', 'gegentreppe', 'quadrat']));
    for (const ex of list) {
      if (ex.answer.kind !== 'cells') throw new Error('cells expected');
      expect(ex.steps[1], ex.key).toBe(`Für Figur 4 kommen ${ex.answer.solution.length} Kästchen dazu.`);
      const mirrored = /:(haken|gegentreppe)$/.test(ex.key);
      const bottom = ex.answer.height - 1;
      // the corner of the figure stays where it is
      const corner = [mirrored ? ex.answer.width - 1 : 0, bottom];
      expect(ex.answer.given.some((c) => c[0] === corner[0] && c[1] === corner[1]), ex.key).toBe(true);
    }
  });

  it('the caption of growing figures fits the width of the grid, also with the wider school font', () => {
    const list = [1, 2, 3].flatMap((s) => samples(musterSkill, s as Stufe)).filter((e) => e.answer.kind === 'cells');
    expect(new Set(list.map((e) => e.key.split(':').pop())).size).toBeGreaterThanOrEqual(4);
    for (const ex of list) {
      const g = ex.visual as Extract<Visual, { type: 'grid' }>;
      const cell = g.width <= 4 && g.height <= 4 ? 64 : 32;
      // Andika, the widest font of the app: about 8.25 px per character at this size
      expect(g.caption!.length * 8.5, ex.key).toBeLessThanOrEqual(g.width * cell + 2 * 14);
    }
  });

  it('a growing row keeps its groups: each group of the second form is 1 longer, and the answer fits the place in the group', () => {
    const list = ([1, 2, 3] as Ab[]).flatMap((ab) => at(3, ab, 400)).filter((e) => formOf(e) === 'waechst');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const shapes = items(ex).map((i) => i.shape as string);
      const [a, b, first, place] = ex.key.split(':').slice(3);
      const size = Number(first);
      expect(shapes[0], ex.key).toBe(a);
      expect(shapes.slice(1, 1 + size).every((s) => s === b), ex.key).toBe(true);
      expect(shapes[1 + size], ex.key).toBe(a);
      expect(shapeOf(right(ex)).shape, ex.key).toBe(place === 'neu' ? a : b);
    }
    expect(new Set(at(3, 3, 400).filter((e) => formOf(e) === 'waechst').map((e) => e.key.split(':').pop()))).toEqual(new Set(['mitte']));
    expect(new Set(at(3, 1, 400).filter((e) => formOf(e) === 'waechst').map((e) => e.key.split(':')[5]))).toEqual(new Set(['1']));
  });
});
