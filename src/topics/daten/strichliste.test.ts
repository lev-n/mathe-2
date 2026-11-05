import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise, VisualOf } from '../../core/types';
import TallyVisual from '../../ui/visuals/TallyVisual';
import { THEMES } from './helpers';
import { CAP, PICTURES_PER_ROW, asFour, asOne, solvedTally, strichlisteSkill } from './strichliste';
import { STUFEN_AB, assertBelievableRows, assertPlainTextEverywhere, atAb, choiceOf, correctLabel, formOf, named, numberOf, visualOf } from './test-support';

describeSkill(strichlisteSkill, { minDistinct: 60 });

const isPicture = (e: Exercise) => formOf(e).startsWith('bild-');

describe('daten.strichliste: the catalogue', () => {
  it('rows stay believable for the theme, in the story too: no 28 Schwäne', () => {
    assertBelievableRows(strichlisteSkill);
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of atAb(strichlisteSkill, stufe, 2, 400).filter((e) => formOf(e) === 'zahl-buendel')) {
        const [, , , , cat, n] = ex.key.split(':');
        const fits = THEMES.filter((t) => t.unit !== 'Kinder' && t.cats.includes(cat)).some((t) => t.maxRow >= Number(n));
        expect(fits, ex.key).toBe(true);
      }
    }
  });

  it('every picture to count stays whole on a 375 px phone', () => {
    let rows4 = 0;
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of atAb(strichlisteSkill, stufe, 2).filter((e) => isPicture(e))) {
        const v = visualOf(ex, 'pictogram');
        v.values.forEach((x) => expect(x, ex.key).toBeLessThanOrEqual(PICTURES_PER_ROW));
        if (v.values.length === 4) rows4++;
      }
    }
    expect(rows4).toBeGreaterThan(0);
  });

  it('the solved Strichliste stays whole inside a step on a 375 px phone, with all its strokes', () => {
    const shownWidth = (v: VisualOf<'tally'>) => {
      const html = renderToStaticMarkup(createElement(TallyVisual, { visual: v }));
      return Number(/--vw:\s*(\d+)px/.exec(html)![1]) * Number(/--min-scale:\s*([\d.]+)/.exec(html)![1]);
    };
    const STEP_WIDTH = 223; // .pr-steps__visual, measured in a 375 px frame
    for (let n = 7; n <= 30; n++) {
      const v = solvedTally(n) as VisualOf<'tally'>;
      expect(shownWidth(v), `${n} strokes`).toBeLessThanOrEqual(STEP_WIDTH);
      expect(v.rows.reduce((a, r) => a + r.count, 0)).toBe(n);
    }
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of atAb(strichlisteSkill, stufe, 2).filter((e) => formOf(e).endsWith('-buendel'))) {
        if (ex.answer.kind !== 'multi') throw new Error('multi expected');
        const [b, s] = ex.answer.fields.map((f) => f.value);
        const step = ex.steps[ex.steps.length - 1];
        if (typeof step === 'string') throw new Error('a step with a picture expected');
        expect(step.visual, ex.key).toEqual(solvedTally(b * 5 + s));
      }
    }
  });

  it('every form stays within the numbers of its Stufe', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(strichlisteSkill, stufe, ab)) {
        if (ex.visual?.type === 'tally') {
          ex.visual.rows.forEach((r) => expect(r.count, ex.key).toBeLessThanOrEqual(CAP[stufe]));
          expect(ex.visual.rows.reduce((a, r) => a + (formOf(ex) === 'gesamt' ? r.count : 0), 0)).toBeLessThanOrEqual(CAP[stufe]);
        }
      }
    }
  });

  it('the Stufe chooses the content, the AB the demand: the forms of each cell', () => {
    const forms = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3) => new Set(atAb(strichlisteSkill, stufe, ab).map(formOf));
    expect(forms(1, 1)).toEqual(new Set(['lesen']));
    expect(forms(1, 2)).toEqual(new Set(['lesen']));
    expect(forms(1, 3)).toEqual(new Set(['zeile', 'zeile-fehlt']));
    expect(forms(2, 1)).toEqual(new Set(['zahl-buendel', 'bild-liste']));
    expect(forms(2, 2)).toEqual(new Set(['bild-buendel', 'bild-liste', 'zahl-buendel']));
    expect(forms(2, 3)).toEqual(new Set(['buendel-zahl', 'bis-buendel', 'strich-dazu']));
    expect(forms(3, 1)).toEqual(new Set(['vergleich', 'gesamt']));
    expect(forms(3, 2)).toEqual(new Set(['vergleich', 'gesamt']));
    expect(forms(3, 3)).toEqual(new Set(['fehler', 'aus-summe']));
  });

  it('the numbers grow with the AB: Stufe 1 up to 12, then 20; Stufe 2 up to 15, then from 16; Stufe 3 up to 30, then to 50', () => {
    for (const ex of atAb(strichlisteSkill, 1, 1)) visualOf(ex, 'tally').rows.forEach((r) => expect(r.count, ex.key).toBeLessThanOrEqual(15));
    const pictured = (ex: Exercise) => (ex.visual?.type === 'pictogram' ? ex.visual.values.reduce((a, b) => a + b, 0) : Number(ex.context!.match(/(\d+)/)![1]));
    for (const ex of atAb(strichlisteSkill, 2, 1)) expect(pictured(ex), ex.key).toBeLessThanOrEqual(15);
    for (const ex of atAb(strichlisteSkill, 2, 2)) expect(pictured(ex), ex.key).toBeGreaterThanOrEqual(16);
    for (const ex of atAb(strichlisteSkill, 3, 1)) {
      const rows = visualOf(ex, 'tally').rows.map((r) => r.count);
      expect(formOf(ex) === 'gesamt' ? rows.reduce((a, b) => a + b, 0) : Math.max(...rows), ex.key).toBeLessThanOrEqual(30);
    }
    expect(atAb(strichlisteSkill, 3, 2).some((ex) => formOf(ex) === 'gesamt' && numberOf(ex) > 30)).toBe(true);
  });

  it('Stufe 2, AB III stays above the reading of Stufe 1 and within its 30: from 16 strokes on, never 31', () => {
    const list = atAb(strichlisteSkill, 2, 3, 600);
    for (const ex of list.filter((e) => formOf(e) !== 'strich-dazu')) {
      const n = Number(ex.key.split(':').pop());
      expect(n, ex.key).toBeGreaterThanOrEqual(16);
      expect(n, ex.key).toBeLessThanOrEqual(30);
    }
    const added = list.filter((e) => formOf(e) === 'strich-dazu');
    expect(added.length).toBeGreaterThan(50);
    for (const ex of added) {
      const [start, k] = ex.key.split(':').slice(5, 7).map(Number);
      if (ex.answer.kind !== 'multi') throw new Error('multi expected');
      const [b, s] = ex.answer.fields.map((f) => f.value);
      expect(visualOf(ex, 'tally').rows[0].count, ex.key).toBe(start);
      expect(b * 5 + s, ex.key).toBe(start + k);
      expect(start + k, ex.key).toBeLessThanOrEqual(30);
    }
  });

  it('a hint speaks of single strokes only where the row has some', () => {
    const list = [...atAb(strichlisteSkill, 1, 1, 400), ...atAb(strichlisteSkill, 1, 2, 400)].filter((e) => formOf(e) === 'lesen');
    const whole = list.filter((e) => numberOf(e) % 5 === 0);
    expect(whole.length).toBeGreaterThan(5);
    for (const ex of whole) expect(ex.hints.join(' '), ex.key).not.toMatch(/einzeln/);
    expect(list.some((e) => numberOf(e) % 5 !== 0 && e.hints.join(' ').includes('einzeln'))).toBe(true);
  });

  it('the Fehlerdetektiv waits for Stufe 3 (§7.1)', () => {
    for (const stufe of [1, 2] as const) for (const ab of [1, 2, 3] as const) expect(atAb(strichlisteSkill, stufe, ab).filter((e) => formOf(e) === 'fehler')).toEqual([]);
  });

  it('text rules that describeSkill does not check (T7, T8)', () => assertPlainTextEverywhere(strichlisteSkill));
});

describe('daten.strichliste: answers recomputed', () => {
  it('reading a row gives the strokes of that row', () => {
    for (const ex of atAb(strichlisteSkill, 1, 1).filter((e) => formOf(e) === 'lesen')) {
      const rows = visualOf(ex, 'tally').rows;
      const row = rows[named(ex, rows.map((r) => r.label))];
      expect(numberOf(ex)).toBe(row.count);
      expect(row.count).toBeGreaterThanOrEqual(6);
    }
  });

  it('a bundle counted as 4 or as 1 is matched, with the §5 hint', () => {
    expect(asFour(13)).toBe(11);
    expect(asOne(13)).toBe(5);
    const ex = atAb(strichlisteSkill, 1, 1).find((e) => formOf(e) === 'lesen')!;
    const v = numberOf(ex);
    const four = ex.bugs!.find((b) => b.id === 'strich-buendel-vier')!;
    expect(four.match).toBe(asFour(v));
    expect(four.hint).toBe('4 Striche und der Querstrich sind zusammen 5.');
  });

  it('finding a row: exactly the correct row has that number', () => {
    for (const ex of atAb(strichlisteSkill, 1, 3).filter((e) => formOf(e) === 'zeile')) {
      const n = Number(/(\d+) Striche/.exec(ex.prompt)![1]);
      const rows = visualOf(ex, 'tally').rows.filter((r) => r.count === n);
      expect(rows.map((r) => r.label)).toEqual([correctLabel(ex)]);
    }
  });

  it('a picture gives bundles of 5 and the rest', () => {
    for (const ex of atAb(strichlisteSkill, 2, 2).filter((e) => formOf(e) === 'bild-buendel')) {
      const v = visualOf(ex, 'pictogram');
      expect(v.iconValue).toBe(1);
      expect(v.showKey).toBe(false);
      const n = v.values.reduce((a, b) => a + b, 0);
      expect(n).toBeLessThanOrEqual(30);
      if (ex.answer.kind !== 'multi') throw new Error('multi expected');
      expect(ex.answer.fields.map((f) => f.value)).toEqual([Math.floor(n / 5), n % 5]);
    }
  });

  it('no bundling at all is its own mistake; the bundle of 10 is only named if the answer shows one', () => {
    let small = 0;
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(strichlisteSkill, 2, ab, 400)) {
        if (ex.answer.kind !== 'multi') continue;
        const [b, s] = ex.answer.fields.map((f) => f.value);
        const n = b * 5 + s;
        const none = ex.bugs!.find((x) => JSON.stringify(x.match) === JSON.stringify({ b: 0, s: n }))!;
        expect(none.id, ex.key).toBe('strich-summe');
        expect(none.hint).toBe('Das sind alle Striche. Bündle immer 5 Striche zusammen.');
        const ten = ex.bugs!.find((x) => x.id === 'strich-buendel-zehn');
        if (n < 10) {
          expect(ten, ex.key).toBeUndefined();
          small++;
        } else expect(ten!.match, ex.key).toEqual({ b: Math.floor(n / 10), s: n % 10 });
      }
    }
    expect(small).toBeGreaterThan(0);
  });

  it('the picture matches exactly one Strichliste', () => {
    for (const ex of atAb(strichlisteSkill, 2, 2).filter((e) => formOf(e) === 'bild-liste')) {
      const n = visualOf(ex, 'pictogram').values.reduce((a, b) => a + b, 0);
      const counts = choiceOf(ex).options.map((o) => (o.visual?.type === 'tally' ? o.visual.rows[0].count : -1));
      expect(counts.filter((c) => c === n)).toHaveLength(1);
      expect(counts[choiceOf(ex).correct]).toBe(n);
      expect(choiceOf(ex).options.map((o) => o.label)).toEqual(['Liste A', 'Liste B', 'Liste C']);
    }
  });

  it('1 bundle takes "Das ist" in every form with bundles', () => {
    let seen = 0;
    for (const ex of atAb(strichlisteSkill, 2, 1, 400)) {
      const n = ex.answer.kind === 'multi' ? ex.answer.fields[0].value : Math.floor(visualOf(ex, 'pictogram').values.reduce((a, b) => a + b, 0) / 5);
      const line = ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).find((t) => /^Das (ist|sind) /.test(t))!;
      expect(line.startsWith(n === 1 ? 'Das ist 1 Bündel' : `Das sind ${n} Bündel`), line).toBe(true);
      if (n === 1) seen++;
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a number in the story gives bundles of 5 and the rest', () => {
    for (const ex of atAb(strichlisteSkill, 2, 2).filter((e) => formOf(e) === 'zahl-buendel')) {
      const n = Number(/(\d+)/.exec(ex.context!)![1]);
      if (ex.answer.kind !== 'multi') throw new Error('multi expected');
      expect(ex.answer.fields.map((f) => f.value)).toEqual([Math.floor(n / 5), n % 5]);
    }
  });

  it('comparing and adding rows', () => {
    for (const ex of atAb(strichlisteSkill, 3, 2)) {
      const rows = ex.visual?.type === 'tally' ? ex.visual.rows : [];
      if (formOf(ex) === 'gesamt') expect(numberOf(ex)).toBe(rows.reduce((a, r) => a + r.count, 0));
      if (formOf(ex) === 'vergleich') {
        const [a, b] = ex.key.split(':').slice(-2).map(Number);
        expect(numberOf(ex)).toBe(rows[a].count - rows[b].count);
        expect(numberOf(ex)).toBeGreaterThanOrEqual(2);
        expect(ex.bugs!.find((x) => x.id === 'mehr-unterschied')!.match).toBe(rows[a].count);
      }
    }
  });

  it('strokes missing in a row, up to the next bundle: recomputed from the row', () => {
    const list = atAb(strichlisteSkill, 1, 3).filter((e) => formOf(e) === 'zeile-fehlt');
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      const rows = visualOf(ex, 'tally').rows;
      const row = rows[named(ex, rows.map((r) => r.label))];
      const goal = Number(/sollen (\d+)/.exec(ex.context!)![1]);
      expect(goal, ex.key).toBeLessThanOrEqual(20);
      expect(goal % 5, ex.key).toBe(0);
      expect(goal - row.count, ex.key).toBeLessThanOrEqual(5);
      expect(numberOf(ex), ex.key).toBe(goal - row.count);
    }
  });

  it('from the bundles to the number, and how far to the next bundle', () => {
    const list = atAb(strichlisteSkill, 2, 3);
    for (const ex of list.filter((e) => formOf(e) === 'buendel-zahl')) {
      const n = Number(ex.key.split(':').pop());
      expect(numberOf(ex), ex.key).toBe(n);
      expect(ex.context, ex.key).toContain(`${Math.floor(n / 5)} Bündel`);
      expect(n % 5, ex.key).not.toBe(0);
    }
    for (const ex of list.filter((e) => formOf(e) === 'bis-buendel')) {
      const n = Number(/(\d+)/.exec(ex.context!)![1]);
      expect(numberOf(ex), ex.key).toBe(5 - (n % 5));
      expect(n % 5, ex.key).not.toBe(0);
    }
  });

  it('a row from the sum: the sum minus the rows shown; the rows are no answer', () => {
    const list = atAb(strichlisteSkill, 3, 3).filter((e) => formOf(e) === 'aus-summe');
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      const rows = visualOf(ex, 'tally').rows;
      expect(rows).toHaveLength(2);
      const total = Number(/sind es (\d+)/.exec(ex.context!)![1]);
      expect(total, ex.key).toBeLessThanOrEqual(50);
      expect(numberOf(ex), ex.key).toBe(total - rows[0].count - rows[1].count);
      expect(rows.map((r) => r.count), ex.key).not.toContain(numberOf(ex));
    }
  });

  it('Fehlerdetektiv: only the correct row has a number that differs from its strokes', () => {
    for (const ex of atAb(strichlisteSkill, 3, 3).filter((e) => formOf(e) === 'fehler')) {
      const rows = visualOf(ex, 'tally').rows;
      const off = rows.filter((r) => Number(r.label.split(': ')[1]) !== r.count);
      expect(off.map((r) => r.label)).toEqual([correctLabel(ex)]);
    }
  });
});
