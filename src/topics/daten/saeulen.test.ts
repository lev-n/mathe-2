import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise, VisualOf } from '../../core/types';
import { AXES, TOTAL_CAP, saeulenSkill } from './saeulen';
import { STUFEN_AB, assertBelievableRows, assertPlainTextEverywhere, atAb, choiceOf, correctLabel, formOf, named, numberOf, visualOf } from './test-support';

describeSkill(saeulenSkill, { minDistinct: 60 });

/** The chart of the task, or (table to chart) the correct option. */
function chartOf(ex: Exercise): VisualOf<'barChart'> {
  if (ex.visual?.type === 'barChart') return ex.visual;
  const a = choiceOf(ex);
  return a.options[a.correct].visual as VisualOf<'barChart'>;
}

describe('daten.saeulen: the catalogue', () => {
  it('rows stay believable for the theme', () => assertBelievableRows(saeulenSkill));

  it('every bar and its label stay on a 375 px phone', () => {
    // BarChartVisual: 64 px around, a slot of at least 72 px and 16 px + 10 px per letter per bar, shrinks to 444 px at most.
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(saeulenSkill, stufe, ab)) {
        const v = chartOf(ex);
        const slot = Math.max(72, 16 + 10 * Math.max(...v.categories.map((c) => c.length)));
        expect(64 + slot * v.categories.length, ex.key).toBeLessThanOrEqual(444);
      }
    }
  });

  it('the steps do not repeat a chart: it is wider than a phone there, and it stands among the options', () => {
    for (const ex of atAb(saeulenSkill, 3, 3).filter((e) => formOf(e) === 'tabelle')) {
      ex.steps.forEach((s) => expect(typeof s, ex.key).toBe('string'));
    }
  });

  it('axis and values follow the Stufe and the AB level; bars end on a grid line', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(saeulenSkill, stufe, ab)) {
        const c = chartOf(ex);
        expect(AXES[stufe][ab].some((x) => x.step === c.axisStep && x.max === c.axisMax), ex.key).toBe(true);
        c.values.forEach((v) => {
          expect(v % c.axisStep, ex.key).toBe(0);
          expect(v).toBeLessThanOrEqual(c.axisMax);
          expect(v).toBeGreaterThanOrEqual(2);
        });
        expect((c.axisMax - 0) / c.axisStep, 'at most 12 steps').toBeLessThanOrEqual(12);
      }
    }
  });

  it('the Stufe chooses the content, the AB the demand: the forms of each cell', () => {
    const forms = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3) => new Set(atAb(saeulenSkill, stufe, ab).map(formOf));
    expect(forms(1, 1)).toEqual(new Set(['lesen']));
    expect(forms(1, 2)).toEqual(new Set(['lesen']));
    expect(forms(1, 3)).toEqual(new Set(['aussage', 'saeule']));
    expect(forms(2, 1)).toEqual(new Set(['unterschied', 'gesamt', 'hoechste-wert']));
    expect(forms(2, 2)).toEqual(new Set(['unterschied', 'gesamt', 'hoechste']));
    expect(forms(2, 3)).toEqual(new Set(['welche-mehr', 'angleichen', 'aus-summe']));
    expect(forms(3, 1)).toEqual(new Set(['lesen', 'saeule']));
    expect(forms(3, 2)).toEqual(new Set(['unterschied', 'gesamt', 'tabelle']));
    expect(forms(3, 3)).toEqual(new Set(['tabelle', 'welche-mehr', 'angleichen', 'aus-summe']));
  });

  it('each axis fits the label of its Stufe at every AB: step 1 up to 10, step 1 with totals up to 20, step 2 or 5 up to 50', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(saeulenSkill, 1, ab)) {
        expect(chartOf(ex).axisStep, ex.key).toBe(1);
        expect(chartOf(ex).axisMax, ex.key).toBeLessThanOrEqual(10);
      }
      for (const ex of atAb(saeulenSkill, 2, ab)) expect(chartOf(ex).axisStep, ex.key).toBe(1);
      for (const ex of atAb(saeulenSkill, 3, ab)) {
        expect([2, 5], ex.key).toContain(chartOf(ex).axisStep);
        expect(chartOf(ex).axisMax, ex.key).toBeLessThanOrEqual(50);
      }
    }
    expect(atAb(saeulenSkill, 3, 3, 400).some((e) => chartOf(e).axisMax === 50)).toBe(true);
  });

  it('the content stays on its Stufe: no sums on Stufe 1, table to chart only on Stufe 3', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(saeulenSkill, 1, ab)) expect(['lesen', 'aussage', 'saeule'], ex.key).toContain(formOf(ex));
      for (const ex of atAb(saeulenSkill, 2, ab)) expect(formOf(ex), ex.key).not.toBe('tabelle');
    }
  });

  it('AB II of Stufe 1 and 2 is harder than AB I: 4 bars instead of 3', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of atAb(saeulenSkill, stufe, 1).filter((e) => formOf(e) !== 'gesamt')) expect(chartOf(ex).categories, ex.key).toHaveLength(3);
      for (const ex of atAb(saeulenSkill, stufe, 2).filter((e) => formOf(e) !== 'gesamt')) expect(chartOf(ex).categories, ex.key).toHaveLength(4);
    }
  });

  it('totals stay within the Stufe, and Stufe 2 reaches 20', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(saeulenSkill, stufe, ab).filter((e) => formOf(e) === 'gesamt')) expect(numberOf(ex), ex.key).toBeLessThanOrEqual(TOTAL_CAP[stufe]);
      for (const ex of atAb(saeulenSkill, stufe, ab).filter((e) => formOf(e) === 'aus-summe')) expect(Number(/sind es (\d+)/.exec(ex.context!)![1]), ex.key).toBeLessThanOrEqual(TOTAL_CAP[stufe]);
    }
    expect(atAb(saeulenSkill, 2, 2, 600).some((e) => formOf(e) === 'gesamt' && numberOf(e) === 20)).toBe(true);
  });

  it('no total is fixed for an axis: the bars decide, not memory', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      const list = atAb(saeulenSkill, stufe, ab, 1000).filter((e) => formOf(e) === 'gesamt');
      for (const axis of AXES[stufe][ab]) {
        const onAxis = list.filter((e) => chartOf(e).axisStep === axis.step && chartOf(e).axisMax === axis.max);
        if (onAxis.length === 0) continue;
        const counts = new Map<number, number>();
        for (const ex of onAxis) counts.set(numberOf(ex), (counts.get(numberOf(ex)) ?? 0) + 1);
        const where = `Stufe ${stufe}, AB ${ab}, step ${axis.step}, max ${axis.max}`;
        expect(counts.size, where).toBeGreaterThanOrEqual(3);
        expect(Math.max(...counts.values()) / onAxis.length, where).toBeLessThan(0.5);
      }
    }
  });

  it('text rules that describeSkill does not check (T7, T8)', () => assertPlainTextEverywhere(saeulenSkill));
});

describe('daten.saeulen: answers recomputed', () => {
  it('reading a bar; counting the boxes is the achse-schritt bug', () => {
    for (const ex of atAb(saeulenSkill, 3, 1).filter((e) => formOf(e) === 'lesen')) {
      const c = chartOf(ex);
      const v = c.values[named(ex, c.categories)];
      expect(numberOf(ex)).toBe(v);
      expect(ex.bugs!.find((b) => b.id === 'achse-schritt')?.match).toBe(v / c.axisStep);
    }
  });

  it('on an axis of ones there is no achse-schritt bug', () => {
    for (const ex of atAb(saeulenSkill, 1, 1).filter((e) => formOf(e) === 'lesen')) expect(ex.bugs!.some((b) => b.id === 'achse-schritt')).toBe(false);
  });

  it('finding the bar of a number', () => {
    for (const ex of [...atAb(saeulenSkill, 1, 3), ...atAb(saeulenSkill, 3, 1)].filter((e) => formOf(e) === 'saeule')) {
      const n = Number(/Zahl (\d+)/.exec(ex.prompt)![1]);
      const c = chartOf(ex);
      expect(c.categories.filter((_, i) => c.values[i] === n)).toEqual([correctLabel(ex)]);
    }
  });

  it('difference and total, recomputed from the chart', () => {
    for (const [stufe, ab] of [[2, 1], [2, 2], [3, 2]] as const) {
      for (const ex of atAb(saeulenSkill, stufe, ab)) {
        const c = chartOf(ex);
        if (formOf(ex) === 'unterschied') {
          const [a, b] = ex.key.split(':').slice(-2).map(Number);
          expect(numberOf(ex), ex.key).toBe(c.values[a] - c.values[b]);
        }
        if (formOf(ex) === 'gesamt') expect(numberOf(ex), ex.key).toBe(c.values.reduce((x, y) => x + y, 0));
      }
    }
  });

  it('the number on the highest or lowest bar, and which bar it is', () => {
    for (const ex of atAb(saeulenSkill, 2, 1).filter((e) => formOf(e) === 'hoechste-wert')) {
      const { values } = chartOf(ex);
      expect(numberOf(ex), ex.key).toBe(ex.key.endsWith('max') ? Math.max(...values) : Math.min(...values));
    }
    for (const ex of atAb(saeulenSkill, 2, 2).filter((e) => formOf(e) === 'hoechste')) {
      const c = chartOf(ex);
      const target = ex.key.endsWith('max') ? Math.max(...c.values) : Math.min(...c.values);
      expect(c.values[c.categories.indexOf(correctLabel(ex))], ex.key).toBe(target);
      expect(c.values.filter((v) => v === target), ex.key).toHaveLength(1);
      expect(c.values.some((v) => Math.abs(v - target) === 1), `${ex.key}: two bars stand close`).toBe(true);
    }
  });

  it('a claim about a bar holds by reading that bar', () => {
    const list = atAb(saeulenSkill, 1, 3, 400).filter((e) => formOf(e) === 'aussage');
    expect(list.length).toBeGreaterThan(50);
    expect(new Set(list.map(correctLabel)).size).toBe(2);
    for (const ex of list) {
      const c = chartOf(ex);
      const claim = Number(/(\d+)/.exec(ex.context!)![1]);
      expect(correctLabel(ex).startsWith('Ja'), ex.key).toBe(c.values[named(ex, c.categories)] === claim);
    }
  });

  it('AB III: exactly one bar has so many more; the bars still missing; a bar from the total', () => {
    for (const stufe of [2, 3] as const) {
      const list = atAb(saeulenSkill, stufe, 3, 400);
      for (const ex of list.filter((e) => formOf(e) === 'welche-mehr')) {
        const c = chartOf(ex);
        const d = Number(/zeigt (\d+) mehr/.exec(ex.prompt)![1]);
        const base = c.values[c.categories.findIndex((x) => ex.prompt.endsWith(`als ${x}?`))];
        expect(c.categories.filter((_, i) => c.values[i] === base + d), ex.key).toEqual([correctLabel(ex)]);
      }
      for (const ex of list.filter((e) => formOf(e) === 'angleichen')) {
        const [a, b] = ex.key.split(':').slice(-2).map(Number);
        expect(numberOf(ex), ex.key).toBe(chartOf(ex).values[a] - chartOf(ex).values[b]);
      }
      const fromSum = list.filter((e) => formOf(e) === 'aus-summe');
      expect(fromSum.length).toBeGreaterThan(30);
      for (const ex of fromSum) {
        const c = chartOf(ex);
        expect(c.values, ex.key).toHaveLength(2);
        expect(c.values, `${ex.key}: the answer stands in the picture`).not.toContain(numberOf(ex));
        const total = Number(/sind es (\d+)/.exec(ex.context!)![1]);
        expect(numberOf(ex), ex.key).toBe(total - c.values[0] - c.values[1]);
      }
    }
  });

  it('table to chart: only the correct chart shows the numbers of the table', () => {
    for (const ex of [...atAb(saeulenSkill, 3, 2), ...atAb(saeulenSkill, 3, 3)].filter((e) => formOf(e) === 'tabelle')) {
      const { rows } = visualOf(ex, 'table');
      const options = choiceOf(ex).options;
      expect(options.map((o) => o.label)).toEqual(['Diagramm A', 'Diagramm B', 'Diagramm C']);
      const fits = options.filter((o) => {
        const c = o.visual as VisualOf<'barChart'>;
        return c.categories.every((name, i) => rows[i][0] === name && Number(rows[i][1]) === c.values[i]);
      });
      expect(fits.map((o) => o.label)).toEqual([correctLabel(ex)]);
      options.forEach((o) => {
        const c = o.visual as VisualOf<'barChart'>;
        c.values.forEach((v) => expect(v).toBeLessThanOrEqual(c.axisMax));
      });
    }
  });
});
