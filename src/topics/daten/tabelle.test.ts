import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { CAP, tabelleSkill } from './tabelle';
import { STUFEN_AB, assertBelievableRows, assertPlainTextEverywhere, atAb, choiceOf, correctLabel, formOf, named, numberOf, visualOf } from './test-support';

describeSkill(tabelleSkill, { minDistinct: 60 });

const numbers = (rows: string[][]) => rows.map((r) => Number(r[1]));

describe('daten.tabelle: the catalogue', () => {
  it('rows stay believable for the theme', () => assertBelievableRows(tabelleSkill));

  it('the hint for the larger number fits the two numbers: tens only if they decide', () => {
    const seen = new Set<string>();
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of atAb(tabelleSkill, stufe, 1, 400).filter((e) => formOf(e) === 'groesser')) {
        const [i, j] = ex.key.split(':').slice(-2).map(Number);
        const rows = numbers(visualOf(ex, 'table').rows);
        const [tensA, tensB] = [Math.floor(rows[i] / 10), Math.floor(rows[j] / 10)];
        const hint = ex.hints[1];
        seen.add(hint);
        if (tensA === tensB) expect(hint, ex.key).toMatch(/Schau auf die Einer/);
        else if (tensA === 0 || tensB === 0) expect(hint, ex.key).toBe('Nur eine der Zahlen hat Zehner.');
        else expect(hint, ex.key).toBe('Schau zuerst auf die Zehner.');
      }
    }
    expect(seen.size).toBe(4);
  });

  it('the Stufe chooses the content, the AB the demand: the forms of each cell', () => {
    const forms = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3) => new Set(atAb(tabelleSkill, stufe, ab).map(formOf));
    expect(forms(1, 1)).toEqual(new Set(['lesen']));
    expect(forms(1, 2)).toEqual(new Set(['lesen', 'zeile']));
    expect(forms(1, 3)).toEqual(new Set(['stimmt', 'zeile']));
    expect(forms(2, 1)).toEqual(new Set(['groesser', 'extrem']));
    expect(forms(2, 2)).toEqual(new Set(['unterschied', 'extrem']));
    expect(forms(2, 3)).toEqual(new Set(['zum-unterschied', 'spanne']));
    expect(forms(3, 1)).toEqual(new Set(['mit-antwort']));
    expect(forms(3, 2)).toEqual(new Set(['ohne-antwort']));
    expect(forms(3, 3)).toEqual(new Set(['ohne-antwort', 'zur-antwort']));
  });

  it('numbers stay within the Stufe and grow with the AB; 3 rows on Stufe 1, 4–5 on Stufe 2', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(tabelleSkill, stufe, ab)) {
        const t = visualOf(ex, 'table');
        const limit = ab === 1 && stufe === 1 ? 10 : ab === 1 && stufe === 2 ? 30 : CAP[stufe];
        numbers(t.rows).forEach((n) => expect(n, ex.key).toBeLessThanOrEqual(limit));
        if (stufe === 1) expect(t.rows).toHaveLength(3);
        if (stufe === 2) expect([4, 5]).toContain(t.rows.length);
      }
    }
  });

  it('text rules that describeSkill does not check (T7, T8)', () => assertPlainTextEverywhere(tabelleSkill));
});

describe('daten.tabelle: answers recomputed', () => {
  it('reading a value, with a bug for every other row', () => {
    for (const ex of atAb(tabelleSkill, 1, 1).filter((e) => formOf(e) === 'lesen')) {
      const { rows } = visualOf(ex, 'table');
      const t = named(ex, rows.map((r) => r[0]));
      expect(numberOf(ex)).toBe(Number(rows[t][1]));
      expect(ex.bugs!.map((b) => b.match).sort()).toEqual(numbers(rows).filter((_, i) => i !== t).sort());
    }
  });

  it('finding the row of a number', () => {
    for (const ex of atAb(tabelleSkill, 1, 2).filter((e) => formOf(e) === 'zeile')) {
      const n = /Zahl (\d+)/.exec(ex.prompt)![1];
      expect(visualOf(ex, 'table').rows.filter((r) => r[1] === n).map((r) => r[0])).toEqual([correctLabel(ex)]);
    }
  });

  it('the difference of two rows; the larger value is the bug of §5', () => {
    for (const ex of atAb(tabelleSkill, 2, 2).filter((e) => formOf(e) === 'unterschied')) {
      const { rows } = visualOf(ex, 'table');
      const [a, b] = ex.key.split(':').slice(-2).map(Number);
      expect(numberOf(ex)).toBe(Number(rows[a][1]) - Number(rows[b][1]));
      expect(ex.bugs!.find((x) => x.id === 'mehr-unterschied')!.match).toBe(Number(rows[a][1]));
    }
  });

  it('most, least and the larger of two', () => {
    for (const ex of [...atAb(tabelleSkill, 2, 1), ...atAb(tabelleSkill, 2, 2)]) {
      const { rows } = visualOf(ex, 'table');
      const values = numbers(rows);
      const valueOf = (label: string) => values[rows.findIndex((r) => r[0] === label)];
      if (formOf(ex) === 'extrem') {
        const target = ex.key.endsWith('max') ? Math.max(...values) : Math.min(...values);
        expect(valueOf(correctLabel(ex))).toBe(target);
      }
      if (formOf(ex) === 'groesser') {
        const others = choiceOf(ex).options.map((o) => o.label).filter((l) => l !== correctLabel(ex));
        expect(valueOf(correctLabel(ex))).toBeGreaterThan(valueOf(others[0]));
      }
    }
  });

  it('a question without an answer names no number or row of the table; the other questions do', () => {
    for (const ex of atAb(tabelleSkill, 3, 3).filter((e) => formOf(e) === 'ohne-antwort')) {
      const { rows } = visualOf(ex, 'table');
      const open = correctLabel(ex);
      const inTable = rows.some((r) => open.split(/[\s?]+/).includes(r[0]));
      // a row of the table may be named only with something the table does not count ("Wie viele Jungen …", "Welche Farbe …")
      if (inTable) expect(open).toMatch(/Jungen|Farbe|gezählt|groß/);
      expect(choiceOf(ex).options).toHaveLength(4);
    }
  });

  it('"mehr" always asks from the larger to the smaller row, in every option', () => {
    let seen = 0;
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(tabelleSkill, 3, ab)) {
        const { rows } = visualOf(ex, 'table');
        for (const { label } of choiceOf(ex).options.filter((o) => /\bmehr\b/.test(o.label))) {
          const words = label.split(/[\s?]+/);
          const [first, second] = rows.filter((r) => words.includes(r[0])).sort((a, b) => words.indexOf(a[0]) - words.indexOf(b[0]));
          expect(Number(first[1]), `${ex.key}: ${label}`).toBeGreaterThan(Number(second[1]));
          seen++;
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('asking for the larger of two asks for the row, because a row label is no number', () => {
    const list = atAb(tabelleSkill, 2, 1).filter((e) => formOf(e) === 'groesser');
    expect(list.length).toBeGreaterThan(0);
    for (const ex of list) expect(ex.prompt).toMatch(/^In welcher Zeile steht die größere Zahl: /);
  });

  it('does the sentence hold: the number of the row decides', () => {
    const list = atAb(tabelleSkill, 1, 3).filter((e) => formOf(e) === 'stimmt');
    expect(new Set(list.map(correctLabel))).toEqual(new Set(['Stimmt', 'Stimmt nicht']));
    for (const ex of list) {
      const { rows } = visualOf(ex, 'table');
      const row = rows[named(ex, rows.map((r) => r[0]))];
      const said = /sagt: .*?(\d+)/.exec(ex.context!)![1];
      expect(correctLabel(ex), ex.key).toBe(row[1] === said ? 'Stimmt' : 'Stimmt nicht');
    }
  });

  it('the row to a difference: the named row plus the difference is the number of the answer, and only of it', () => {
    const list = atAb(tabelleSkill, 2, 3).filter((e) => formOf(e) === 'zum-unterschied');
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      const { rows } = visualOf(ex, 'table');
      const m = /hat (\d+) mehr als die Zeile (\S+)\?$/.exec(ex.prompt)!;
      const base = Number(rows.find((r) => r[0] === m[2])![1]);
      expect(rows.filter((r) => Number(r[1]) === base + Number(m[1])).map((r) => r[0]), ex.key).toEqual([correctLabel(ex)]);
      expect(choiceOf(ex).options.map((o) => o.label), `${ex.key}: the named row is no option`).not.toContain(m[2]);
    }
  });

  it('largest minus smallest; the difference is no number of the table', () => {
    const list = atAb(tabelleSkill, 2, 3).filter((e) => formOf(e) === 'spanne');
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      const values = numbers(visualOf(ex, 'table').rows);
      expect(numberOf(ex), ex.key).toBe(Math.max(...values) - Math.min(...values));
      expect(values, ex.key).not.toContain(numberOf(ex));
    }
  });

  it('the question to an answer: exactly the right question has this answer', () => {
    const list = atAb(tabelleSkill, 3, 3, 400).filter((e) => formOf(e) === 'zur-antwort');
    expect(list.length).toBeGreaterThan(50);
    expect(list.some((e) => /\bmehr\b/.test(correctLabel(e)))).toBe(true);
    for (const ex of list) {
      const { rows } = visualOf(ex, 'table');
      const given = Number(/ist (\d+)\./.exec(ex.prompt)![1]);
      const answerOf = (q: string) => {
        const words = q.split(/[\s?]+/);
        const named2 = rows.filter((r) => words.includes(r[0])).sort((a, b) => words.indexOf(a[0]) - words.indexOf(b[0]));
        return /\bmehr\b/.test(q) ? Number(named2[0][1]) - Number(named2[1][1]) : Number(named2[0][1]);
      };
      choiceOf(ex).options.forEach((o, i) => expect(answerOf(o.label) === given, `${ex.key}: ${o.label}`).toBe(i === choiceOf(ex).correct));
    }
  });

  it('a question with an answer is one that the table holds', () => {
    for (const ex of atAb(tabelleSkill, 3, 1).filter((e) => formOf(e) === 'mit-antwort')) {
      const { rows } = visualOf(ex, 'table');
      expect(correctLabel(ex)).not.toMatch(/Jungen|Farbe|gezählt|groß|alt|heißen/);
      const row = correctLabel(ex).split(/[\s?]+/).find((w) => rows.some((r) => r[0] === w));
      expect(row !== undefined || /meisten|am meisten|insgesamt/.test(correctLabel(ex)), correctLabel(ex)).toBe(true);
    }
  });
});
