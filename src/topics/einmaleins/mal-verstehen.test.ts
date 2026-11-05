import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, Stufe, VisualOf } from '../../core/types';
import { STUFEN } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { pickMalStory } from './helpers';
import { malVerstehenSkill } from './mal-verstehen';
import { allItems, atAb, kindsAt, rightPictureStep, solve } from './test-support';

describeSkill(malVerstehenSkill);

const dots = (v: VisualOf<'dotArray'>): number => ('groups' in v ? v.groups.reduce((a, b) => a + b, 0) : v.rows * v.cols);
const equalGroups = (v: VisualOf<'dotArray'>): boolean => !('groups' in v) || v.groups.every((g) => g === v.groups[0]);
const kindOf = (ex: Exercise) => ex.key.split(':')[2];
const factorsOf = (ex: Exercise) => /(\d+)x(\d+)/.exec(ex.key)!.slice(1).map(Number);

const MAP: [Stufe, Ab, string[]][] = [
  [1, 1, ['gruppen']],
  [1, 2, ['plus-zu-mal', 'mal-zu-plus']],
  [1, 3, ['summe-rueck', 'stimmt']],
  [2, 1, ['feld-zu-mal']],
  [2, 2, ['feld-zu-mal', 'feld-rechnen']],
  [2, 3, ['feld-rueck', 'feld-waehlen']],
  [3, 1, ['passt-nicht', 'geschichte-waehlen']],
  [3, 2, ['bild-mit-mal', 'geschichte-waehlen-spaet', 'geschichte-rechnen']],
  [3, 3, ['passt-nicht-zahl', 'geschichte-zu-mal']],
];

describe('einmaleins.mal-verstehen', () => {
  it.each(MAP)('Stufe %i, AB %i holds exactly its forms', (stufe, ab, kinds) => {
    expect(kindsAt(malVerstehenSkill, stufe, ab)).toEqual(new Set(kinds));
  });

  it('worked solutions compute, and every number task solves from its own text', () => {
    for (const ex of allItems(malVerstehenSkill)) {
      expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      if (ex.answer.kind === 'number' && ex.expression?.includes(' = ') && ex.expression.split('□').length === 2) expect(solve(ex.expression), ex.key).toContain(ex.answer.value);
    }
  });

  it('Stufe 1: equal groups with factors up to 5; the picture shows the task', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(malVerstehenSkill, 1, ab)) {
        const [a, b] = factorsOf(ex);
        expect(a, ex.key).toBeLessThanOrEqual(5);
        expect(b, ex.key).toBeLessThanOrEqual(5);
        if (ex.visual?.type === 'dotArray') expect(dots(ex.visual), ex.key).toBe(a * b);
      }
    }
  });

  it('Stufe 1, AB II: the sum to Malaufgabe has no picture with the task: the frames would give the number of groups', () => {
    const items = atAb(malVerstehenSkill, 1, 2).filter((e) => kindOf(e) === 'plus-zu-mal');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      expect(ex.visual, ex.key).toBeUndefined();
      const [, b] = factorsOf(ex);
      const parts = /^([\d +]+) = □ · (\d+)$/.exec(ex.expression!)!;
      expect(Number(parts[2])).toBe(b);
      expect(ex.answer).toMatchObject({ kind: 'number', value: parts[1].split(' + ').length });
    }
  });

  it('Stufe 1, AB III: □ + □ + □ = 12 has the answer of the division, and the number of gaps is a known error', () => {
    const items = atAb(malVerstehenSkill, 1, 3).filter((e) => kindOf(e) === 'summe-rueck');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const gaps = ex.expression!.split('□').length - 1;
      const p = Number(/= (\d+)$/.exec(ex.expression!)![1]);
      expect(ex.answer).toMatchObject({ kind: 'number', value: p / gaps });
      expect(ex.bugs?.find((b) => b.id === 'gleiche-zahl')?.match, ex.key).toBe(gaps);
    }
  });

  it('Stufe 1, AB III: "stimmt" is the right answer exactly when the sum is a-mal the b', () => {
    const items = atAb(malVerstehenSkill, 1, 3).filter((e) => kindOf(e) === 'stimmt');
    const answers = new Set<string>();
    for (const ex of items) {
      const [a, b, sum] = /^(\d+) · (\d+) = (.+)$/.exec(ex.expression!)!.slice(1);
      const terms = sum.split(' + ').map(Number);
      const holds = terms.reduce((x, y) => x + y, 0) === Number(a) * Number(b);
      const answer = ex.answer as ChoiceAnswer;
      const label = answer.options[answer.correct].label;
      answers.add(label);
      expect(label, ex.key).toBe(holds ? 'Ja, das stimmt.' : 'Nein, das stimmt nicht.');
    }
    expect(answers.size).toBe(2);
  });

  it('Stufe 2: one factor is at least 6, so no item could come from Stufe 1', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      const items = atAb(malVerstehenSkill, 2, ab);
      for (const ex of items) {
        const [a, b] = factorsOf(ex);
        expect(Math.max(a, b), ex.key).toBeGreaterThanOrEqual(6);
        expect(Math.max(a, b), ex.key).toBeLessThanOrEqual(10);
      }
    }
  });

  it('Stufe 2: the right Malaufgabe has the rows and columns of the dot array; AB II has near options', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of atAb(malVerstehenSkill, 2, ab).filter((e) => kindOf(e) === 'feld-zu-mal')) {
        const v = ex.visual as Extract<VisualOf<'dotArray'>, { rows: number }>;
        const answer = ex.answer as ChoiceAnswer;
        expect(answer.options[answer.correct].label).toBe(`${v.rows} · ${v.cols}`);
        if (ab === 2) answer.options.forEach((o) => expect(o.label, ex.key).toMatch(/^\d+ · \d+$/));
      }
    }
  });

  it('Stufe 2, AB III: rows and all dots lead to one row; the field comes with the solution only', () => {
    const items = atAb(malVerstehenSkill, 2, 3).filter((e) => kindOf(e) === 'feld-rueck');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [rows, all] = ex.context!.match(/\d+/g)!.map(Number);
      expect(ex.answer).toMatchObject({ kind: 'number', value: all / rows });
      expect(ex.visual, ex.key).toBeUndefined();
      expect(all / rows, ex.key).not.toBe(rows);
    }
  });

  it('Stufe 2, AB III: the right field has the factors in order, and no two options show the same field', () => {
    const items = atAb(malVerstehenSkill, 2, 3).filter((e) => kindOf(e) === 'feld-waehlen');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [a, b] = /(\d+) · (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      const answer = ex.answer as ChoiceAnswer;
      answer.options.forEach((o, i) => {
        const v = o.visual as Extract<VisualOf<'dotArray'>, { rows: number }>;
        expect(v.rows === a && v.cols === b, `${ex.key} ${o.label}`).toBe(i === answer.correct);
        expect(v.cols, ex.key).toBeGreaterThanOrEqual(2);
      });
      expect(new Set(answer.options.map((o) => JSON.stringify(o.visual))).size, ex.key).toBe(answer.options.length);
      expect(rightPictureStep(ex), ex.key).toBeTruthy();
    }
  });

  it('no Tauschaufgabe is a wrong answer: the same field shows 8 · 10 and 10 · 8 (einmaleins.tausch)', () => {
    let tasks = 0;
    let fields = 0;
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(malVerstehenSkill, 2, ab, {}, 800)) {
        if (ex.answer.kind !== 'choice') continue;
        const right = ex.answer.options[ex.answer.correct];
        const wrongs = ex.answer.options.filter((o) => o !== right);
        const m = /^(\d+) · (\d+)$/.exec(right.label);
        if (m) {
          tasks += 1;
          wrongs.forEach((o) => expect(o.label, ex.key).not.toBe(`${m[2]} · ${m[1]}`));
        }
        const v = right.visual as { rows?: number; cols?: number } | undefined;
        if (v?.rows) {
          fields += 1;
          wrongs.forEach((o) => expect(o.visual, ex.key).not.toMatchObject({ rows: v.cols, cols: v.rows }));
        }
      }
    }
    expect(tasks).toBeGreaterThan(100);
    expect(fields).toBeGreaterThan(100);
  });

  it('a hint on the gaps of a field comes only with a field that has them, in the right number', () => {
    const items = atAb(malVerstehenSkill, 2, 2, {}, 600).filter((e) => kindOf(e) === 'feld-rechnen');
    const withGap = (ex: Exercise) => ['splitAfterRow', 'splitAfterCol'].filter((k) => k in ex.visual!).length;
    expect(items.some((ex) => withGap(ex) > 0)).toBe(true);
    for (const ex of items) {
      const gaps = withGap(ex);
      const hint = ex.hints[1];
      if (gaps === 0) expect(hint, ex.key).not.toMatch(/Lücke/);
      else expect(hint, ex.key).toBe(gaps === 1 ? 'Nutze die Lücke im Feld.' : 'Nutze die Lücken im Feld.');
    }
  });

  it('a field whose sizes only the picture shows has them in srText too', () => {
    const items = STUFEN.flatMap((s) => atAb(malVerstehenSkill, s, 2)).filter((e) => kindOf(e) === 'feld-zu-mal');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const v = ex.visual as Extract<VisualOf<'dotArray'>, { rows: number }>;
      expect(ex.srText, ex.key).toContain(`Das Feld hat ${v.rows} Reihen mit je ${v.cols} Punkten.`);
    }
  });

  it('stories keep numbers that fit their place; some story fits every pair of factors', () => {
    const limits: [RegExp, number, number][] = [
      [/An jedem Tisch sitzen (\d+)/, 6, 30],
      [/Auf jeder Bank sitzen (\d+)/, 5, 50],
      [/In jeder Gruppe sind (\d+)/, 6, 60],
    ];
    const stories = [...atAb(malVerstehenSkill, 3, 1, {}, 1500), ...atAb(malVerstehenSkill, 3, 2, {}, 1500)].filter((e) => e.context);
    for (const [re, maxEach, maxTotal] of limits) {
      const hits = stories.filter((ex) => re.test(ex.context!));
      expect(hits.length, String(re)).toBeGreaterThan(0);
      for (const ex of hits) {
        const each = Number(re.exec(ex.context!)![1]);
        const all = ex.context!.match(/\d+/g)!.map(Number).reduce((x, y) => x * y, 1);
        expect(each, ex.context).toBeLessThanOrEqual(maxEach);
        expect(all, ex.context).toBeLessThanOrEqual(maxTotal);
      }
    }
    for (let a = 2; a <= 10; a++) {
      for (let b = 2; b <= 10; b++) expect(pickMalStory(createRng(a * 100 + b), a, b).what, `${a} · ${b}`).toBeTruthy();
    }
  });

  it('Stufe 3: the picture that does not fit is the one with unequal groups, and the other way round', () => {
    const passtNicht = atAb(malVerstehenSkill, 3, 1).filter((e) => kindOf(e) === 'passt-nicht');
    const mitMal = atAb(malVerstehenSkill, 3, 2).filter((e) => kindOf(e) === 'bild-mit-mal');
    expect(passtNicht.length).toBeGreaterThan(0);
    expect(mitMal.length).toBeGreaterThan(0);
    for (const ex of passtNicht) {
      const answer = ex.answer as ChoiceAnswer;
      answer.options.forEach((o, i) => expect(equalGroups(o.visual as VisualOf<'dotArray'>), ex.key).toBe(i !== answer.correct));
    }
    for (const ex of mitMal) {
      const answer = ex.answer as ChoiceAnswer;
      answer.options.forEach((o, i) => expect(equalGroups(o.visual as VisualOf<'dotArray'>), ex.key).toBe(i === answer.correct));
    }
  });

  it('Stufe 3, AB III: all groups are equal, and only the picture that does not fit has another number of dots', () => {
    const items = atAb(malVerstehenSkill, 3, 3).filter((e) => kindOf(e) === 'passt-nicht-zahl');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [a, b] = /(\d+) · (\d+)\?/.exec(ex.prompt)!.slice(1).map(Number);
      const answer = ex.answer as ChoiceAnswer;
      answer.options.forEach((o, i) => {
        const v = o.visual as VisualOf<'dotArray'>;
        expect(equalGroups(v), ex.key).toBe(true);
        expect(dots(v) === a * b, `${ex.key} ${o.label}`).toBe(i !== answer.correct);
      });
    }
  });

  it('a worked step shows the right picture under its name, and no text points to a picture that is not there', () => {
    const items = allItems(malVerstehenSkill).filter((e) => ['passt-nicht', 'passt-nicht-zahl', 'bild-mit-mal'].includes(kindOf(e)));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      expect(rightPictureStep(ex), ex.key).toBeTruthy();
      const firstPicture = ex.steps.findIndex((s) => typeof s !== 'string' && s.visual);
      ex.steps.slice(0, firstPicture).forEach((s) => expect(s, ex.key).not.toMatch(/\bBild\b/));
    }
  });

  it('stories: the answer is the product of the two numbers; the story to compute names the groups first', () => {
    const stories = atAb(malVerstehenSkill, 3, 2).filter((e) => kindOf(e) === 'geschichte-rechnen');
    expect(stories.length).toBeGreaterThan(0);
    for (const ex of stories) {
      const [a, b] = ex.context!.match(/\d+/g)!.map(Number);
      expect(ex.answer).toMatchObject({ kind: 'number', value: a * b });
      expect(ex.bugs?.find((x) => x.id === 'mal-als-plus')?.match ?? a + b, ex.key).toBe(a + b);
    }
  });

  it('a story with the groups last has its Malaufgabe in the other order of the numbers', () => {
    const stories = atAb(malVerstehenSkill, 3, 2).filter((e) => kindOf(e) === 'geschichte-waehlen-spaet');
    expect(stories.length).toBeGreaterThan(0);
    for (const ex of stories) {
      const [first, second] = ex.context!.match(/\d+/g)!.map(Number);
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toBe(`${second} · ${first}`);
      expect(ex.context, ex.key).toMatch(/^(Auf|An|In) je/);
    }
  });

  it('the story to a Malaufgabe has a groups with b each, and no option turns the factors', () => {
    const items = atAb(malVerstehenSkill, 3, 3).filter((e) => kindOf(e) === 'geschichte-zu-mal');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [a, b] = /(\d+) · (\d+)\?/.exec(ex.prompt)!.slice(1);
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toMatch(new RegExp(`^${a} \\S+ mit je ${b} `));
      answer.options.forEach((o) => expect(o.label, ex.key).not.toMatch(new RegExp(`^${b} \\S+ mit je ${a} `)));
    }
  });
});
