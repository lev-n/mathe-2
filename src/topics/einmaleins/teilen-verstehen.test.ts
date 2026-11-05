import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, MultiAnswer, Stufe, VisualOf } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { teilenVerstehenSkill } from './teilen-verstehen';
import { allItems, atAb, kindsAt, rightPictureStep, solve } from './test-support';
import DotArrayVisual from '../../ui/visuals/DotArrayVisual';

describeSkill(teilenVerstehenSkill);

/** The dividend and divisor in a story or key. */
const parts = (key: string) => /:(\d+):(\d+)/.exec(key)!.slice(1).map(Number);

const MAP: [Stufe, Ab, string[]][] = [
  [1, 1, ['aufteilen-bild', 'verteilen-bild']],
  [1, 2, ['aufteilen-bild', 'verteilen-bild']],
  [1, 3, ['bild-luecke', 'teiler-bild']],
  [2, 1, ['rechnen', 'aufteilen-text', 'verteilen-text']],
  [2, 2, ['geschichte']],
  [2, 3, ['dividend', 'teiler', 'zurueck']],
  [3, 1, ['rechnung', 'bild']],
  [3, 2, ['schreiben', 'bild-gleich']],
  [3, 3, ['geschichte-waehlen', 'bild-zu-rechnung']],
];

describe('einmaleins.teilen-verstehen', () => {
  it.each(MAP)('Stufe %i, AB %i holds exactly its forms', (stufe, ab, kinds) => {
    expect(kindsAt(teilenVerstehenSkill, stufe, ab)).toEqual(new Set(kinds));
  });

  it('worked solutions compute; tasks with an expression solve from it', () => {
    for (const ex of allItems(teilenVerstehenSkill)) {
      expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      if (ex.answer.kind === 'number' && ex.expression) expect(solve(ex.expression), ex.key).toContain(ex.answer.value);
    }
  });

  it('every division is exact, and no plain division shows its answer: q is never d', () => {
    for (const ex of allItems(teilenVerstehenSkill)) {
      const [p, d] = parts(ex.key);
      expect(p % d, ex.key).toBe(0);
      expect(p / d, ex.key).not.toBe(d);
    }
  });

  it('Stufe 1: dividend ≤ 20, divisors 2 to 5, with a picture; AB I stays up to 12 and shows the Geteiltaufgabe, AB II does not', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(teilenVerstehenSkill, 1, ab)) {
        const [p, d] = parts(ex.key);
        expect(p, ex.key).toBeLessThanOrEqual(20);
        expect([2, 3, 4, 5], ex.key).toContain(d);
        expect(ex.visual?.type, ex.key).toBe('dotArray');
        if (ab === 1) {
          expect(p, ex.key).toBeLessThanOrEqual(12);
          expect(ex.expression, ex.key).toBe(`${p} : ${d} = □`);
        }
        if (ab === 2) {
          expect(p, ex.key).toBeGreaterThanOrEqual(12);
          expect(ex.expression, ex.key).toBeUndefined();
          expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: p / d });
        }
      }
    }
  });

  it('Stufe 2: dividend from 10 to 50, divisors 2, 5, 10, both meanings', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(teilenVerstehenSkill, 2, ab)) {
        const [p, d] = parts(ex.key);
        expect(p, ex.key).toBeLessThanOrEqual(50);
        expect(p, ex.key).toBeGreaterThanOrEqual(10);
        expect([2, 5, 10], ex.key).toContain(d);
        expect(ex.visual, ex.key).toBeUndefined();
      }
    }
    const stories = atAb(teilenVerstehenSkill, 2, 2);
    expect(stories.some((ex) => ex.key.includes(':aufteilen:'))).toBe(true);
    expect(stories.some((ex) => ex.key.includes(':verteilen:'))).toBe(true);
  });

  it('Stufe 2, AB III: the gaps and the story back all solve from the task', () => {
    const items = atAb(teilenVerstehenSkill, 2, 3);
    for (const ex of items.filter((e) => e.expression)) expect(solve(ex.expression!), ex.key).toEqual([(ex.answer as { value: number }).value]);
    const back = items.filter((e) => e.key.includes(':zurueck:'));
    expect(back.length).toBeGreaterThan(0);
    for (const ex of back) {
      const [d, q] = ex.context!.match(/\d+/g)!.map(Number);
      expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: d * q });
    }
  });

  it('stories: the answer is the first number divided by the second, and the error 20 : 5 = 15 is known', () => {
    for (const ex of atAb(teilenVerstehenSkill, 2, 2).filter((e) => e.context)) {
      const [p, d] = ex.context!.match(/\d+/g)!.map(Number);
      expect(ex.answer).toMatchObject({ kind: 'number', value: p / d });
      expect(ex.bugs?.find((b) => b.id === 'teilen-als-minus')?.match ?? p - d).toBe(p - d);
    }
  });

  it('a table holds at most 6 children and the room at most 30, in every story with tables', () => {
    const tables = [...atAb(teilenVerstehenSkill, 2, 2, {}, 1500), ...atAb(teilenVerstehenSkill, 3, 1, {}, 1500), ...atAb(teilenVerstehenSkill, 3, 2, {}, 1500)].filter((ex) => ex.context?.includes('Tischen'));
    expect(tables.length).toBeGreaterThan(0);
    for (const ex of tables) {
      const [p, d] = ex.context!.match(/\d+/g)!.map(Number);
      expect(p, ex.context).toBeLessThanOrEqual(30);
      expect(p / d, ex.context).toBeLessThanOrEqual(6);
    }
  });

  it('Stufe 1: the picture of a division leaves the answer open, the frames come with the solution', () => {
    const items = [...atAb(teilenVerstehenSkill, 1, 1), ...atAb(teilenVerstehenSkill, 1, 2), ...atAb(teilenVerstehenSkill, 1, 3)].filter((ex) => /:(aufteilen|verteilen|teiler)-bild:/.test(ex.key));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [p, d] = parts(ex.key);
      const v = ex.visual as Extract<VisualOf<'dotArray'>, { groups: number[] }>;
      expect(v.groups, ex.key).toEqual([p]);
      expect([d, p / d], ex.key).not.toContain(v.perRow);
      const solved = ex.steps.flatMap((s) => (typeof s !== 'string' && s.visual ? [s.visual as Extract<VisualOf<'dotArray'>, { groups: number[] }>] : []));
      expect(solved.map((s) => s.groups.reduce((a, b) => a + b, 0)), ex.key).toEqual([p]);
      expect(new Set(solved[0].groups).size, ex.key).toBe(1);
    }
  });

  it('the first factor counts the groups: Verteilen is d · q, and asks d-mal welche Zahl', () => {
    const verteilen = [...atAb(teilenVerstehenSkill, 1, 1), ...atAb(teilenVerstehenSkill, 2, 1), ...atAb(teilenVerstehenSkill, 2, 2)].filter((ex) => /:verteilen(-bild|-text)?:/.test(ex.key));
    expect(verteilen.length).toBeGreaterThan(0);
    for (const ex of verteilen) {
      const [p, d] = parts(ex.key);
      const line = ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).find((t) => / · /.test(t));
      expect(line, ex.key).toBe(`${d} · ${p / d} = ${p}`);
      expect(ex.hints.join(' '), ex.key).toContain(`${d}-mal welche Zahl ergibt ${p}?`);
      expect(JSON.stringify([ex.hints, ex.bugs?.map((b) => b.hint)]), ex.key).not.toMatch(/Welche Zahl mal|Wie oft passt/);
    }
    for (const ex of atAb(teilenVerstehenSkill, 2, 2).filter((e) => e.key.includes(':aufteilen:'))) {
      const [p, d] = parts(ex.key);
      expect(ex.steps, ex.key).toContain(`${p / d} · ${d} = ${p}`);
    }
  });

  it('the story to a Geteiltaufgabe puts things where they go: in Tüten and Dosen, auf Teller', () => {
    const items = atAb(teilenVerstehenSkill, 3, 3, {}, 600).filter((ex) => ex.key.includes(':geschichte-waehlen:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const answer = ex.answer as ChoiceAnswer;
      const right = answer.options[answer.correct].label;
      expect(right, ex.key).toMatch(/kommen (auf \d+ Teller|in \d+ (Tüten|Dosen)),/);
    }
  });

  it('the pictures of one choice have one width, so that the dots keep their size side by side on a phone', () => {
    const widthOf = (visual: VisualOf<'dotArray'>) => /<svg[^>]* width="(\d+)"/.exec(renderToStaticMarkup(createElement(DotArrayVisual, { visual })))![1];
    const items = [...atAb(teilenVerstehenSkill, 3, 1, {}, 400), ...atAb(teilenVerstehenSkill, 3, 2, {}, 400)].filter((ex) => /:bild(-gleich)?:/.test(ex.key));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const answer = ex.answer as ChoiceAnswer;
      expect(new Set(answer.options.map((o) => widthOf(o.visual as VisualOf<'dotArray'>))).size, ex.key).toBe(1);
    }
  });

  it('a worked step shows the right picture under its name', () => {
    const items = [...atAb(teilenVerstehenSkill, 3, 1), ...atAb(teilenVerstehenSkill, 3, 2)].filter((ex) => /:bild(-gleich)?:/.test(ex.key));
    expect(items.length).toBeGreaterThan(0);
    items.forEach((ex) => expect(rightPictureStep(ex), ex.key).toBeTruthy());
  });

  it('Stufe 3: only the right picture has the dots of the task in equal groups; in AB II all pictures have equal groups', () => {
    const items = [...atAb(teilenVerstehenSkill, 3, 1), ...atAb(teilenVerstehenSkill, 3, 2)].filter((ex) => /:bild(-gleich)?:/.test(ex.key));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [p] = parts(ex.key);
      const answer = ex.answer as ChoiceAnswer;
      answer.options.forEach((o, i) => {
        const groups = (o.visual as Extract<VisualOf<'dotArray'>, { groups: number[] }>).groups;
        const equal = groups.every((g) => g === groups[0]);
        const fits = groups.reduce((a, b) => a + b, 0) === p && equal;
        expect(fits, `${ex.key} ${o.label}`).toBe(i === answer.correct);
        if (ex.key.includes(':bild-gleich:')) expect(equal, `${ex.key} ${o.label}`).toBe(true);
      });
    }
  });

  it('Stufe 3, AB I: the Rechnung of a story divides its two numbers', () => {
    const items = atAb(teilenVerstehenSkill, 3, 1).filter((ex) => ex.key.includes(':rechnung:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [p, d] = ex.context!.match(/\d+/g)!.map(Number);
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toBe(`${p} : ${d}`);
    }
  });

  it('Stufe 3, AB II: the written Rechnung is dividend, divisor, result', () => {
    const items = atAb(teilenVerstehenSkill, 3, 2).filter((ex) => ex.key.includes(':schreiben:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [p, d] = ex.context!.match(/\d+/g)!.map(Number);
      expect((ex.answer as MultiAnswer).fields.map((f) => f.value), ex.key).toEqual([p, d, p / d]);
    }
  });

  it('Stufe 3, AB III: the story of the Rechnung is the one with equal shares; the other Rechnung of the picture is no option', () => {
    const items = atAb(teilenVerstehenSkill, 3, 3);
    for (const ex of items.filter((e) => e.key.includes(':geschichte-waehlen:'))) {
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toMatch(/überall gleich viele/);
    }
    for (const ex of items.filter((e) => e.key.includes(':bild-zu-rechnung:'))) {
      const [p, d] = parts(ex.key);
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toBe(`${p} : ${d}`);
      expect(answer.options.map((o) => o.label), ex.key).not.toContain(`${p} : ${p / d}`);
      expect(ex.visual, ex.key).toMatchObject({ groups: Array.from({ length: d }, () => p / d) });
    }
  });
});
