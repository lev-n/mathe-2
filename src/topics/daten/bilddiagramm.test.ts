import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { CAP_TWO, bilddiagrammSkill } from './bilddiagramm';
import { THEMES, picturesBeside } from './helpers';
import { STUFEN_AB, assertBelievableRows, assertPlainTextEverywhere, atAb, choiceOf, correctLabel, formOf, named, numberOf, visualOf } from './test-support';

describeSkill(bilddiagrammSkill, { minDistinct: 60 });

const choiceOf2 = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.whyWrong ? [o.whyWrong] : [])) : []);

describe('daten.bilddiagramm: the catalogue', () => {
  it('rows stay believable for the theme', () => assertBelievableRows(bilddiagrammSkill));

  it('every picture stays whole on a 375 px phone: a picture cut at the edge looks like a half picture', () => {
    // PictogramVisual: 54 px around, 10 px per letter of the longest label, 38 px per picture, shrinks to 464 px at most.
    expect(picturesBeside(['Tennisbälle'])).toBe(7);
    expect(picturesBeside(['Reihe 1'])).toBe(8);
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(bilddiagrammSkill, stufe, ab)) {
        const v = visualOf(ex, 'pictogram');
        const most = Math.max(...v.values.map((x) => Math.ceil(x / v.iconValue)));
        expect(54 + 10 * Math.max(...v.categories.map((c) => c.length)) + 38 * most, ex.key).toBeLessThanOrEqual(464);
      }
    }
  });

  it('the Stufe chooses the content, the AB the demand inside it', () => {
    const forms = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3) => new Set(atAb(bilddiagrammSkill, stufe, ab).map(formOf));
    expect(forms(1, 1)).toEqual(new Set(['lesen']));
    expect(forms(1, 2)).toEqual(new Set(['lesen', 'reihe']));
    expect(forms(1, 3)).toEqual(new Set(['aussage', 'dazu', 'zusammen']));
    expect(forms(2, 1)).toEqual(new Set(['extrem']));
    expect(forms(2, 2)).toEqual(new Set(['extrem', 'unterschied']));
    expect(forms(2, 3)).toEqual(new Set(['welche-mehr', 'angleichen']));
    expect(forms(3, 1)).toEqual(new Set(['zweier']));
    expect(forms(3, 2)).toEqual(new Set(['zweier', 'zweier-unterschied']));
    expect(forms(3, 3)).toEqual(new Set(['malen', 'legende']));
  });

  it('1 picture = 1 up to 10 on Stufe 1 and 2; 1 picture = 2 as a Knobel on Stufe 3, up to 20', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(bilddiagrammSkill, stufe, ab)) {
        const v = visualOf(ex, 'pictogram');
        expect(v.iconValue).toBe(stufe === 3 ? 2 : 1);
        expect(!!ex.knobel).toBe(stufe === 3);
        v.values.forEach((x) => expect(x).toBeLessThanOrEqual(stufe === 3 ? CAP_TWO : 10));
        // half pictures only on Stufe 3
        if (stufe < 3) v.values.forEach((x) => expect(x % v.iconValue).toBe(0));
      }
    }
  });

  it('text rules that describeSkill does not check (T7, T8)', () => assertPlainTextEverywhere(bilddiagrammSkill));

  it('the one icon fits every row (T14): a child, a neutral star, or a thing that all rows are', () => {
    for (const theme of THEMES) {
      if (theme.unit === 'Kinder') expect(theme.icon, theme.id).toBe('person');
      else if (theme.icon !== 'stern') {
        expect(theme.icon, theme.id).toBe('ball');
        theme.cats.forEach((c) => expect(c).toMatch(/bälle$/));
      }
    }
  });
});

describe('daten.bilddiagramm: answers recomputed', () => {
  it('reading a row', () => {
    for (const ex of atAb(bilddiagrammSkill, 1, 1).filter((e) => formOf(e) === 'lesen')) {
      const v = visualOf(ex, 'pictogram');
      expect(numberOf(ex)).toBe(v.values[named(ex, v.categories)]);
    }
  });

  it('finding the row with a number of pictures', () => {
    for (const ex of atAb(bilddiagrammSkill, 1, 2).filter((e) => formOf(e) === 'reihe')) {
      const n = Number(/(\d+) Bild/.exec(ex.prompt)![1]);
      const v = visualOf(ex, 'pictogram');
      expect(v.categories.filter((_, i) => v.values[i] === n)).toEqual([correctLabel(ex)]);
    }
  });

  it('the worked steps say "ist 1 Bild", and name the row of the longest or shortest', () => {
    const one = [...atAb(bilddiagrammSkill, 3, 1), ...atAb(bilddiagrammSkill, 3, 2)].filter((e) => {
      if (formOf(e) !== 'zweier') return false;
      const v = visualOf(e, 'pictogram');
      return Math.floor(v.values[named(e, v.categories)] / 2) === 1;
    });
    expect(one.length).toBeGreaterThan(0);
    for (const ex of one) expect(ex.steps[0]).toMatch(/^In der Reihe \S+ ist 1 Bild/);
    for (const ex of atAb(bilddiagrammSkill, 2, 2).filter((e) => formOf(e) === 'extrem')) expect(ex.steps[2]).toBe(`Das ist die Reihe ${correctLabel(ex)}.`);
  });

  it('most, least and the difference', () => {
    for (const ex of atAb(bilddiagrammSkill, 2, 2)) {
      const v = visualOf(ex, 'pictogram');
      if (formOf(ex) === 'extrem') {
        const target = ex.key.endsWith('max') ? Math.max(...v.values) : Math.min(...v.values);
        expect(v.values[v.categories.indexOf(correctLabel(ex))]).toBe(target);
      } else {
        const [a, b] = ex.key.split(':').slice(-2).map(Number);
        expect(numberOf(ex)).toBe(v.values[a] - v.values[b]);
      }
    }
  });

  it('1 picture = 2: reading gives the value; counting pictures is the bild-legende bug', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(bilddiagrammSkill, 3, ab).filter((e) => formOf(e) === 'zweier')) {
        const v = visualOf(ex, 'pictogram');
        const value = v.values[named(ex, v.categories)];
        expect(numberOf(ex)).toBe(value);
        expect(ex.bugs!.filter((b) => b.id === 'bild-legende').map((b) => b.match)).toContain(Math.floor(value / 2));
      }
    }
  });

  it('half pictures appear on Stufe 3, AB II and not on AB I', () => {
    const odd = (ab: 1 | 2) => atAb(bilddiagrammSkill, 3, ab).filter((e) => formOf(e) === 'zweier').some((e) => visualOf(e, 'pictogram').values.some((x) => x % 2 === 1));
    expect(odd(1)).toBe(false);
    expect(odd(2)).toBe(true);
  });

  it('Stufe 1, AB I reads values up to 6; AB II 4 rows', () => {
    for (const ex of atAb(bilddiagrammSkill, 1, 1)) visualOf(ex, 'pictogram').values.forEach((x) => expect(x, ex.key).toBeLessThanOrEqual(6));
    for (const ex of atAb(bilddiagrammSkill, 1, 2).filter((e) => formOf(e) === 'lesen')) expect(visualOf(ex, 'pictogram').values, ex.key).toHaveLength(4);
  });

  it('Stufe 1, AB III: the claim compares with the row; pictures added; two rows together', () => {
    const list = atAb(bilddiagrammSkill, 1, 3, 400);
    for (const ex of list.filter((e) => formOf(e) === 'aussage')) {
      const v = visualOf(ex, 'pictogram');
      const claim = Number(/(\d+)/.exec(ex.context!)![1]);
      const row = v.values[v.categories.findIndex((c) => ex.context!.includes(c))];
      expect(correctLabel(ex).startsWith('Ja'), ex.key).toBe(claim === row);
    }
    for (const ex of list.filter((e) => formOf(e) === 'dazu')) {
      const v = visualOf(ex, 'pictogram');
      const k = Number(/malt (\d+)/.exec(ex.context!)![1]);
      expect(numberOf(ex), ex.key).toBe(v.values[named(ex, v.categories)] + k);
      expect(numberOf(ex), ex.key).toBeLessThanOrEqual(10);
    }
    for (const ex of list.filter((e) => formOf(e) === 'zusammen')) {
      const v = visualOf(ex, 'pictogram');
      const words = ex.prompt.split(/[^\p{L}]+/u);
      const both = v.categories.flatMap((c, i) => (words.includes(c) ? [v.values[i]] : []));
      expect(both, ex.key).toHaveLength(2);
      expect(numberOf(ex), ex.key).toBe(both[0] + both[1]);
    }
  });

  it('Stufe 2, AB III: exactly one row has so many more; the pictures to add', () => {
    const list = atAb(bilddiagrammSkill, 2, 3, 400);
    for (const ex of list.filter((e) => formOf(e) === 'welche-mehr')) {
      const v = visualOf(ex, 'pictogram');
      const d = Number(/(\d+) Bild/.exec(ex.prompt)![1]);
      const base = v.values[v.categories.findIndex((c) => ex.prompt.endsWith(`als ${c}?`))];
      expect(v.categories.filter((_, i) => v.values[i] === base + d), ex.key).toEqual([correctLabel(ex)]);
    }
    for (const ex of list.filter((e) => formOf(e) === 'angleichen')) {
      const v = visualOf(ex, 'pictogram');
      const [a, b] = ex.key.split(':').slice(-2).map(Number);
      expect(numberOf(ex), ex.key).toBe(v.values[a] - v.values[b]);
    }
  });

  it('backwards: half of the number, and the number itself is the bug', () => {
    for (const ex of atAb(bilddiagrammSkill, 3, 3).filter((e) => formOf(e) === 'malen')) {
      const n = Number(/(\d+)/.exec(ex.context!)![1]);
      expect(numberOf(ex) * 2).toBe(n);
      expect(ex.bugs!.find((b) => b.id === 'bild-legende-rueck')!.match).toBe(n);
    }
  });

  it('hidden legend: one row gives its number, another is asked; the answer varies and is no number of the task', () => {
    const list = atAb(bilddiagrammSkill, 3, 3, 400).filter((e) => formOf(e) === 'legende');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const v = visualOf(ex, 'pictogram');
      expect(v.showKey, ex.key).toBe(false);
      const given = v.values[v.categories.findIndex((c) => ex.context!.includes(c))];
      expect(ex.context, ex.key).toContain(String(given));
      const asked = v.categories.findIndex((c) => ex.prompt.includes(c));
      expect(numberOf(ex), ex.key).toBe(v.values[asked]);
      expect(numberOf(ex), ex.key).not.toBe(given);
      expect(ex.bugs!.map((b) => b.match), ex.key).toContain(numberOf(ex) / 2);
    }
    expect(new Set(list.map(numberOf)).size, 'a fixed answer needs no reading').toBeGreaterThanOrEqual(5);
  });

  it('a row name never stands bare after a preposition: "bei Fische" is no German', () => {
    const names = new Set(THEMES.flatMap((t) => [...t.cats]));
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(bilddiagrammSkill, stufe, ab)) {
        const whyWrong = choiceOf2(ex);
        for (const text of [ex.context ?? '', ex.prompt, ...ex.hints, ...whyWrong]) {
          for (const m of text.matchAll(/\b(bei|mit|von|zu|in|an|auf)\s+(\p{L}+)/gu)) expect(names.has(m[2]), `${ex.key}: ${text}`).toBe(false);
        }
      }
    }
  });

  it('never more than 10 pictures in a row', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(bilddiagrammSkill, stufe, ab)) {
        const v = visualOf(ex, 'pictogram');
        v.values.forEach((x) => expect(Math.ceil(x / v.iconValue)).toBeLessThanOrEqual(10));
      }
    }
    expect(choiceOf(atAb(bilddiagrammSkill, 1, 2).find((e) => formOf(e) === 'reihe')!).options).toHaveLength(3);
  });
});
