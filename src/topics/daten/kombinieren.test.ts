import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { kombinierenSkill, orders3 } from './kombinieren';
import { STUFEN_AB, assertPlainTextEverywhere, atAb, choiceOf, correctLabel, formOf, numberOf, visualOf } from './test-support';

const allStrings = (list: readonly unknown[]): string[] => list.map((x) => JSON.stringify(x));

describeSkill(kombinierenSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

const size = (ex: Exercise) => ex.key.split(':')[4].split('x').map(Number);
const sizes = (list: readonly Exercise[]) => new Set(list.map((e) => size(e).join('x')));
const PAIR_FORMS = ['paare', 'fehlt', 'dazu', 'rest', 'ohne'];
const PICTURE = /\p{Extended_Pictographic}/u;
/** A heading without its picture: the options and the spoken text name only the word. */
const word = (label: string) => label.replace(/^\P{L}+/u, '');

/** Pairs by brute force. */
function countPairs(a: number, b: number): number {
  let n = 0;
  for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) n++;
  return n;
}

describe('daten.kombinieren: the things are what the task calls them', () => {
  it('no crown is called a hat, no basket a bag, and an ice cream is no rice', () => {
    const words = allStrings(atAb(kombinierenSkill, 1, 1, 400).concat(atAb(kombinierenSkill, 3, 3, 400))).join(' ');
    for (const stray of ['Hut', 'Tasche', 'Krone', 'Korb', 'Reis', 'Honig']) expect(words, stray).not.toContain(stray);
  });

  it('Stufe 1: a new choice to 1 row is one new pair, in the singular', () => {
    const list = atAb(kombinierenSkill, 1, 3, 200).filter((e) => numberOf(e) === 3);
    expect(list.length).toBeGreaterThan(0);
    for (const ex of list) expect(ex.steps.join(' '), ex.key).toContain('1 neues Paar');
  });
});

describe('daten.kombinieren: the catalogue', () => {
  it('the Stufe chooses the content, the AB the demand: the forms and sizes of each cell', () => {
    const forms = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3) => new Set(atAb(kombinierenSkill, stufe, ab).map(formOf));
    expect(forms(1, 1)).toEqual(new Set(['paare', 'fehlt']));
    expect(forms(1, 2)).toEqual(new Set(['paare', 'fehlt']));
    expect(forms(1, 3)).toEqual(new Set(['dazu']));
    expect(forms(2, 1)).toEqual(new Set(['paare', 'rest']));
    expect(forms(2, 2)).toEqual(new Set(['paare', 'fehlt', 'ohne']));
    expect(forms(2, 3)).toEqual(new Set(['dazu', 'paare-rueck']));
    expect(forms(3, 1)).toEqual(new Set(['paare', 'rest', 'reihen-rest']));
    expect(forms(3, 2)).toEqual(new Set(['paare', 'reihen', 'ohne']));
    expect(forms(3, 3)).toEqual(new Set(['dazu', 'reihen-rest', 'reihe-fehlt']));
    expect(sizes(atAb(kombinierenSkill, 1, 1))).toEqual(new Set(['2x2', '2x1', '3x1']));
  });

  it('each Stufe keeps to its size: no 2 × 2 on Stufe 2, no 3 × 2 on Stufe 3, so that a task of the next Stufe is another task', () => {
    for (const ab of [1, 2] as const) {
      expect(sizes(atAb(kombinierenSkill, 2, ab, 400).filter((e) => e.visual && PAIR_FORMS.includes(formOf(e))))).toEqual(new Set(['3x2']));
      expect(sizes(atAb(kombinierenSkill, 3, ab, 400).filter((e) => PAIR_FORMS.includes(formOf(e))))).toEqual(new Set(['3x3']));
    }
    expect(sizes(atAb(kombinierenSkill, 2, 2, 400).filter((e) => formOf(e) === 'paare'))).toEqual(new Set(['3x2', '2x3']));
    const pairsAt = (stufe: 1 | 2 | 3) => new Set(([1, 2, 3] as const).flatMap((ab) => atAb(kombinierenSkill, stufe, ab, 300).filter((e) => formOf(e) === 'paare').map(numberOf)));
    expect(pairsAt(2)).toEqual(new Set([6]));
    expect(pairsAt(3)).toEqual(new Set([9]));
  });

  it('pictures only on AB I of Stufe 1; no table for all pairs on AB II of Stufe 2 and 3', () => {
    for (const ex of atAb(kombinierenSkill, 1, 1)) {
      const t = visualOf(ex, 'table');
      expect(PICTURE.test(t.header[1]), `${ex.key} ${t.header[1]}`).toBe(true);
      expect(PICTURE.test(t.rows[0][0]), `${ex.key} ${t.rows[0][0]}`).toBe(true);
    }
    for (const ex of atAb(kombinierenSkill, 1, 2).concat(atAb(kombinierenSkill, 2, 1))) {
      expect(JSON.stringify(ex.visual), ex.key).not.toMatch(PICTURE);
    }
    for (const stufe of [2, 3] as const) {
      for (const ex of atAb(kombinierenSkill, stufe, 2).filter((e) => formOf(e) === 'paare')) expect(ex.visual, ex.key).toBeUndefined();
    }
    for (const ex of atAb(kombinierenSkill, 3, 1).filter((e) => formOf(e) === 'paare')) expect(ex.visual, ex.key).toBeDefined();
  });

  it('Stufe 1, AB III stays small: one more choice to a small table', () => {
    const list = atAb(kombinierenSkill, 1, 3);
    for (const ex of list) expect(formOf(ex)).toBe('dazu');
    expect(new Set(list.map(numberOf))).toEqual(new Set([3, 4]));
  });

  it('§6: the tables and the pairs stay within 2 × 2, 2 × 3 and 3 × 3 per Stufe', () => {
    // Stufe 1 keeps its tables to 2 × 2 and 3 × 1, and a new choice stays within 2 × 2 (§6).
    const limit = { 1: { cells: 4, pairs: 4 }, 2: { cells: 6, pairs: 6 }, 3: { cells: 9, pairs: 9 } } as const;
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(kombinierenSkill, stufe, ab, 300).filter((e) => PAIR_FORMS.includes(formOf(e)))) {
        const [a, b] = size(ex);
        expect(Math.max(a, b), ex.key).toBeLessThanOrEqual(3);
        if (ex.visual) expect(b, ex.key).toBeLessThanOrEqual(stufe === 3 ? 3 : 2);
        expect(a * b, ex.key).toBeLessThanOrEqual(limit[stufe].cells);
        if (ex.answer.kind === 'number') expect(ex.answer.value, ex.key).toBeLessThanOrEqual(limit[stufe].pairs);
      }
    }
  });

  it('no number answer is fixed inside a Stufe and AB level: the table decides, not memory', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      const list = atAb(kombinierenSkill, stufe, ab, 300);
      const where = `Stufe ${stufe}, AB ${ab}`;
      for (const form of ['dazu', 'rest', 'ohne']) {
        const values = new Set(list.filter((e) => formOf(e) === form).map(numberOf));
        if (values.size > 0) expect(values.size, `${where}, ${form}`).toBeGreaterThan(1);
      }
      const numbers = list.filter((e) => e.answer.kind === 'number').map(numberOf);
      const counts = new Map<number, number>();
      for (const n of numbers) counts.set(n, (counts.get(n) ?? 0) + 1);
      expect(counts.size, where).toBeGreaterThanOrEqual(2);
      expect(Math.max(...counts.values()) / numbers.length, where).toBeLessThan(0.75);
    }
    for (const stufe of [2, 3] as const) {
      expect(new Set(atAb(kombinierenSkill, stufe, 3, 400).filter((e) => formOf(e) === 'dazu').map(numberOf)).size, `Stufe ${stufe}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every pair task says what a pair is, and "dazu" always shows the pairs so far', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(kombinierenSkill, stufe, ab, 120).filter((e) => PAIR_FORMS.includes(formOf(e)))) {
        expect(ex.context, ex.key).toMatch(/Ein Paar ist 1 .+ und 1 .+\./);
        if (['dazu', 'rest', 'ohne'].includes(formOf(ex))) {
          const [a, b] = size(ex);
          const t = visualOf(ex, 'table');
          expect(t.rows).toHaveLength(a);
          expect(t.header).toHaveLength(b + 1);
        }
        expect(ex.srText, ex.key).not.toMatch(/\b1 (Brote|Beläge|Früchte|Getränke|T-Shirts|Hosen|Soßen)\b/);
        // No table on screen, so no talk of rows.
        if (!ex.visual) (ex.bugs ?? []).forEach((b) => expect(b.hint).not.toMatch(/Reihe/));
      }
    }
  });

  it('a table with up to 2 choices per row fits a 375 px phone; rows hold the longer side', () => {
    // 17 letters is the widest set that measured 311 px in Chrome at 375 px. 4 columns need a compact table (src/ui).
    const lettersOf = (t: { header: string[]; rows: string[][] }) =>
      t.header.reduce((sum, _, c) => sum + Math.max(3, ...[t.header[c], ...t.rows.map((r) => r[c])].flatMap((x) => x.split(' ').map((w) => w.length))), 0);
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(kombinierenSkill, stufe, ab, 120)) {
        const t = ex.visual?.type === 'table' ? ex.visual : null;
        if (!t) continue;
        expect(t.rows.length >= t.header.length - 1 || formOf(ex).startsWith('reihe') || ex.key.includes(':dazu:') && ex.key.includes(':1x2:'), ex.key).toBe(true);
        if (t.header.length <= 3) expect(lettersOf(t), ex.key).toBeLessThanOrEqual(17);
        // Without narrow words such as 'T-Shirt' or 'lange Hose' 15 letters is the limit: 'Birne', 'Kakao', 'Beere' measured 310 px, 16 letters over 311 px.
        if (t.header.length === 3 && ![...t.header, ...t.rows.map((r) => r[0])].some((x) => /[ -]/.test(x))) expect(lettersOf(t), ex.key).toBeLessThanOrEqual(15);
      }
    }
  });

  it('3 columns of pairs show only pictures: with words the third column is cut off on a 375 px phone', () => {
    const wide = atAb(kombinierenSkill, 3, 1, 400).filter((e) => e.visual?.type === 'table' && e.visual.header.length === 4);
    expect(wide.length).toBeGreaterThan(0);
    for (const ex of wide) {
      const t = visualOf(ex, 'table');
      expect(t.header[0], ex.key).toBe('');
      for (const label of [...t.header.slice(1), ...t.rows.map((r) => r[0])]) expect(label, ex.key).not.toMatch(/\p{L}/u);
    }
  });

  it('the steps show no table with a column per pair or per place: they have about 232 px on a 375 px phone', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(kombinierenSkill, stufe, ab, 120)) {
        for (const s of ex.steps) {
          if (typeof s === 'string' || s.visual?.type !== 'table') continue;
          expect(s.visual.header.length, ex.key).toBeLessThanOrEqual(2);
          // 34 px padding per column, about 13 px per letter or digit and 7 px per other sign: an estimate, measured in Chrome at 375 px.
          const width = (x: string) => x.replace(/[\p{L}\d]/gu, '').length * 7 + x.replace(/[^\p{L}\d]/gu, '').length * 13;
          const { header, rows } = s.visual;
          const columns = header.map((h, c) => Math.max(width(h), ...rows.map((r) => width(r[c]))) + 34);
          expect(columns.reduce((a, b) => a + b, 0), ex.key).toBeLessThanOrEqual(232);
        }
      }
    }
  });

  it('the spoken text of a missing pair gives every row, every column and the gap', () => {
    for (const ex of atAb(kombinierenSkill, 2, 2).concat(atAb(kombinierenSkill, 1, 1)).filter((e) => formOf(e) === 'fehlt')) {
      const t = visualOf(ex, 'table');
      for (const r of t.rows) {
        expect(ex.srText).toContain(`Zeile ${word(r[0])}: `);
        r.slice(1).forEach((c, j) => expect(ex.srText).toContain(`${word(t.header[j + 1])} ${c === '□' ? 'leer' : 'Haken'}`));
      }
      expect(ex.srText.match(/\bleer\b/g)).toHaveLength(1);
    }
  });

  it('text rules that describeSkill does not check (T7, T8)', () => assertPlainTextEverywhere(kombinierenSkill));
});

describe('daten.kombinieren: answers recomputed', () => {
  it('the number of pairs, and the table has one empty cell per pair', () => {
    for (const ex of atAb(kombinierenSkill, 2, 1).concat(atAb(kombinierenSkill, 3, 1)).filter((e) => formOf(e) === 'paare' && e.visual)) {
      const [a, b] = size(ex);
      expect(numberOf(ex)).toBe(countPairs(a, b));
      const t = visualOf(ex, 'table');
      expect(t.rows).toHaveLength(a);
      expect(t.header).toHaveLength(b + 1);
      expect(t.rows.flatMap((r) => r.slice(1)).filter((c) => c === '□')).toHaveLength(countPairs(a, b));
    }
  });

  it('adding the two sets is the kombi-addiert bug, whenever it differs; AB I has such sizes too', () => {
    for (const ab of [1, 2] as const) {
      const list = atAb(kombinierenSkill, 1, ab).filter((e) => formOf(e) === 'paare');
      expect(list.some((e) => e.bugs!.some((x) => x.id === 'kombi-addiert'))).toBe(true);
      for (const ex of list) {
        const [a, b] = size(ex);
        const bug = ex.bugs!.find((x) => x.id === 'kombi-addiert');
        if (a + b === a * b) expect(bug).toBeUndefined();
        else expect(bug!.match).toBe(a + b);
      }
    }
  });

  it('the missing pair is the one empty cell', () => {
    for (const ex of atAb(kombinierenSkill, 2, 2).concat(atAb(kombinierenSkill, 1, 1)).filter((e) => formOf(e) === 'fehlt')) {
      const t = visualOf(ex, 'table');
      const missing = t.rows.flatMap((r) => r.slice(1).flatMap((c, j) => (c === '□' ? [`${word(r[0])} und ${word(t.header[j + 1])}`] : [])));
      expect(missing).toEqual([correctLabel(ex)]);
    }
  });

  it('new choices: the pairs after them minus the pairs of the table; the pairs at the end stay inside the Stufe', () => {
    for (const [stufe, end] of [[2, 6], [3, 9]] as const) {
      const list = atAb(kombinierenSkill, stufe, 3, 300).filter((e) => formOf(e) === 'dazu');
      expect(list.length).toBeGreaterThan(30);
      for (const ex of list) {
        const [a, b] = size(ex);
        const [rows, cols] = ex.key.split(':')[5].split('x').map(Number);
        expect(countPairs(a + rows, b + cols), ex.key).toBe(end);
        expect(numberOf(ex), ex.key).toBe(countPairs(a + rows, b + cols) - countPairs(a, b));
        expect(ex.bugs!.map((x) => x.match), ex.key).toContain(end);
      }
    }
  });

  it('pairs left: all pairs of the table minus those chosen; the table does not mark them, so the answer does not stand in it', () => {
    for (const stufe of [2, 3] as const) {
      const list = atAb(kombinierenSkill, stufe, 1, 300).filter((e) => formOf(e) === 'rest');
      expect(list.length).toBeGreaterThan(30);
      for (const ex of list) {
        const [a, b] = size(ex);
        const chosen = Number(/wählt (\d+) Paare/.exec(ex.context!)![1]);
        expect(numberOf(ex), ex.key).toBe(countPairs(a, b) - chosen);
        expect(visualOf(ex, 'table').rows.flatMap((r) => r.slice(1)).every((c) => c === '□'), ex.key).toBe(true);
      }
    }
  });

  it('dropped choices: the rows and columns left, multiplied', () => {
    for (const stufe of [2, 3] as const) {
      const list = atAb(kombinierenSkill, stufe, 2, 400).filter((e) => formOf(e) === 'ohne');
      expect(list.length).toBeGreaterThan(30);
      for (const ex of list) {
        const [a, b] = size(ex);
        const [rows, cols] = ex.key.split(':')[5].split('x').map(Number);
        expect(numberOf(ex), ex.key).toBe(countPairs(a - rows, b - cols));
      }
    }
  });

  it('the orders still missing: 6 minus the rows of the table', () => {
    const list = atAb(kombinierenSkill, 3, 3, 300).concat(atAb(kombinierenSkill, 3, 1, 300)).filter((e) => formOf(e) === 'reihen-rest');
    expect(list.length).toBeGreaterThan(0);
    for (const ex of atAb(kombinierenSkill, 3, 1, 300).filter((e) => formOf(e) === 'reihen-rest')) expect(visualOf(ex, 'table').rows.length, ex.key).toBeGreaterThanOrEqual(3);
    for (const ex of atAb(kombinierenSkill, 3, 3, 300).filter((e) => formOf(e) === 'reihen-rest')) expect(visualOf(ex, 'table').rows.length, ex.key).toBeLessThanOrEqual(2);
    for (const ex of list) {
      const { rows } = visualOf(ex, 'table');
      expect(new Set(rows.map((r) => r.join())).size).toBe(rows.length);
      expect(numberOf(ex)).toBe(6 - rows.length);
      rows.forEach((r) => expect(ex.srText).toContain(r.join(', ')));
    }
  });

  it('from the pairs back to the choices: pairs divided by the first choices; the answer does not stand in the task', () => {
    const list = atAb(kombinierenSkill, 2, 3).filter((e) => formOf(e) === 'paare-rueck');
    expect(list.length).toBeGreaterThan(30);
    expect(new Set(list.map(numberOf))).toEqual(new Set([2, 3]));
    for (const ex of list) {
      const [a, b] = size(ex);
      expect(numberOf(ex), ex.key).toBe(b);
      expect(ex.context, ex.key).toContain(`hat ${a} `);
      expect(a, ex.key).not.toBe(b);
    }
  });

  it('orders of 3 things are 6, all different', () => {
    const all = orders3(['a', 'b', 'c']);
    expect(new Set(all.map((o) => o.join())).size).toBe(6);
    for (const ex of atAb(kombinierenSkill, 3, 2).filter((e) => formOf(e) === 'reihen')) {
      expect(numberOf(ex)).toBe(all.length);
      expect(ex.bugs!.map((b) => b.match).sort()).toEqual([3, 9]);
    }
  });

  it('the missing order is the one the table does not show', () => {
    for (const ex of atAb(kombinierenSkill, 3, 3).filter((e) => formOf(e) === 'reihe-fehlt')) {
      const shown = visualOf(ex, 'table').rows.map((r) => r.join(', '));
      expect(shown).toHaveLength(5);
      expect(shown).not.toContain(correctLabel(ex));
      const others = choiceOf(ex).options.map((o) => o.label).filter((l) => l !== correctLabel(ex));
      others.forEach((o) => expect(shown).toContain(o));
    }
  });
});
