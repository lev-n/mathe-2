import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, MultiAnswer, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { teilenRestSkill } from './teilen-rest';
import { allItems, atAb, kindsAt } from './test-support';

describeSkill(teilenRestSkill);

const fieldsOf = (ex: { answer: unknown }) => Object.fromEntries((ex.answer as MultiAnswer).fields.map((f) => [f.id, f.value]));
const parts = (key: string) => /:(\d+):(\d+)/.exec(key)!.slice(1).map(Number);
const isMulti = (ex: Exercise) => ex.answer.kind === 'multi';

const MAP: [Stufe, Ab, string[]][] = [
  [1, 1, ['bild']],
  [1, 2, ['bild']],
  [1, 3, ['dividend', 'stimmt']],
  [2, 1, ['rechnen']],
  [2, 2, ['rechnen']],
  [2, 3, ['dividend', 'stimmt', 'welche']],
  [3, 1, ['uebrig']],
  [3, 2, ['aufrunden']],
  [3, 3, ['bedeutung', 'abrunden']],
];

describe('einmaleins.teilen-rest', () => {
  it.each(MAP)('Stufe %i, AB %i holds exactly its forms', (stufe, ab, kinds) => {
    expect(kindsAt(teilenRestSkill, stufe, ab)).toEqual(new Set(kinds));
  });

  it('the car story has no "du": the question asks what the children need', () => {
    const cars = atAb(teilenRestSkill, 3, 2).filter((ex) => ex.key.endsWith(':Autos'));
    expect(cars.length).toBeGreaterThan(5);
    for (const ex of cars) {
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      expect(ex.answer.fields[2].before, ex.key).toBe('Die Kinder brauchen');
      expect(JSON.stringify(ex.steps), ex.key).not.toMatch(/\bdu\b/);
    }
  });

  it('Stufe 2 asks more than Stufe 1 at AB I and II: 47 : 10 can be read from its digits, so it is no plain task', () => {
    for (const ab of [1, 2] as Ab[]) for (const ex of atAb(teilenRestSkill, 2, ab, {}, 400)) expect(parts(ex.key)[1], ex.key).not.toBe(10);
  });

  it('the hint on a Rest of no use fits the thing in the story: no "für einen mehr" for Packungen', () => {
    const items = atAb(teilenRestSkill, 3, 3, {}, 400).filter((e) => e.key.includes(':abrunden:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) expect(ex.hints[1], ex.key).toBe(ex.key.endsWith(':kuchen') ? 'Reicht der Rest noch für einen Kuchen?' : 'Reicht der Rest noch für eine volle Packung?');
  });

  it('is an extra; the forms that compute have multi answers', () => {
    expect(teilenRestSkill.optional).toBe('extra');
    for (const [stufe, ab] of [[1, 1], [1, 2], [2, 1], [2, 2], [3, 1], [3, 2]] as [Stufe, Ab][]) {
      atAb(teilenRestSkill, stufe, ab, {}, 40).forEach((ex) => expect(ex.answer.kind).toBe('multi'));
    }
  });

  it('worked solutions compute; quotient and Rest come from the division, the Rest is never 0 and smaller than the divisor', () => {
    for (const ex of allItems(teilenRestSkill)) {
      expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      const [p, d] = parts(ex.key);
      expect(p % d, ex.key).toBeGreaterThan(0);
      expect(Math.floor(p / d), ex.key).toBeLessThanOrEqual(9);
      expect(Math.floor(p / d), `${ex.key}: the quotient would stand in the task`).not.toBe(d);
      if (!isMulti(ex)) continue;
      const { q, r } = fieldsOf(ex);
      expect(q * d + r, ex.key).toBe(p);
      expect(r, ex.key).toBeLessThan(d);
    }
  });

  it('keeps the ranges of the catalogue: Stufe 1 with a picture, Stufe 2 larger and without, Stufe 3 in stories', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(teilenRestSkill, 1, ab)) {
        const [p, d] = parts(ex.key);
        expect(p, ex.key).toBeLessThanOrEqual(20);
        expect([2, 3, 4, 5], ex.key).toContain(d);
        const groups = (ex.visual as { groups: number[] }).groups;
        expect(groups.reduce((a, b) => a + b, 0), ex.key).toBe(p);
      }
      for (const ex of atAb(teilenRestSkill, 2, ab)) {
        const [p, d] = parts(ex.key);
        expect(p, ex.key).toBeLessThanOrEqual(50);
        expect(p, ex.key).toBeGreaterThan(10);
        expect([2, 5, 10], ex.key).toContain(d);
        expect(ex.visual, ex.key).toBeUndefined();
      }
      for (const ex of atAb(teilenRestSkill, 3, ab)) {
        const [p, d] = parts(ex.key);
        expect(p, ex.key).toBeLessThanOrEqual(30);
        expect([2, 5, 10], ex.key).toContain(d);
        expect(ex.visual, ex.key).toBeUndefined();
        expect(ex.context, ex.key).toBeTruthy();
      }
    }
    const sizes = (ab: Ab) => atAb(teilenRestSkill, 1, ab).map((ex) => parts(ex.key)[0]);
    expect(Math.max(...sizes(1))).toBeLessThanOrEqual(12);
    expect(Math.min(...sizes(2))).toBeGreaterThanOrEqual(13);
    expect(atAb(teilenRestSkill, 2, 2).every((ex) => parts(ex.key)[1] === 5 && parts(ex.key)[0] > 20)).toBe(true);
  });

  it('□ : d = q Rest r solves from the task, and forgetting the Rest is a known error', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      const items = atAb(teilenRestSkill, stufe, 3).filter((ex) => ex.key.includes(':dividend:'));
      expect(items.length).toBeGreaterThan(0);
      for (const ex of items) {
        const [d, q, r] = /^□ : (\d+) = (\d+) Rest (\d+)$/.exec(ex.expression!)!.slice(1).map(Number);
        expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: q * d + r });
        expect(ex.bugs?.find((b) => b.id === 'rest-vergessen')?.match, ex.key).toBe(q * d);
      }
    }
  });

  it('"stimmt" is right exactly when the line holds and the Rest is smaller than the divisor', () => {
    const seen = new Set<string>();
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ex of atAb(teilenRestSkill, stufe, 3).filter((e) => e.key.includes(':stimmt:'))) {
        const [p, d, q, r] = /^(\d+) : (\d+) = (\d+) Rest (\d+)$/.exec(ex.expression!)!.slice(1).map(Number);
        const answer = ex.answer as ChoiceAnswer;
        const label = answer.options[answer.correct].label;
        seen.add(label);
        expect(label, ex.key).toBe(q * d + r === p && r < d ? 'Ja, das stimmt.' : 'Nein, das stimmt nicht.');
      }
    }
    expect(seen.size).toBe(2);
  });

  it('which task leaves a Rest: only the right one', () => {
    const items = atAb(teilenRestSkill, 2, 3).filter((e) => e.key.includes(':welche:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const answer = ex.answer as ChoiceAnswer;
      answer.options.forEach((o, i) => {
        const [p, d] = o.label.split(' : ').map(Number);
        expect(p % d !== 0, `${ex.key} ${o.label}`).toBe(i === answer.correct);
      });
    }
  });

  it('what the Rest means: the line about what is left over; the line with the full ones is no option if it would hold', () => {
    const items = atAb(teilenRestSkill, 3, 3).filter((e) => e.key.includes(':bedeutung:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [p, d] = parts(ex.key);
      expect(ex.expression, ex.key).toBe(`${p} : ${d} = ${Math.floor(p / d)} Rest ${p % d}`);
      const answer = ex.answer as ChoiceAnswer;
      expect(answer.options[answer.correct].label, ex.key).toMatch(new RegExp(`^${p % d} .*(übrig|Platz)\\.$`));
      if (Math.floor(p / d) === p % d) answer.options.forEach((o) => expect(o.label, ex.key).not.toMatch(/voll/));
    }
  });

  it('a Rest of no use: the answer is the quotient, one more is the known error', () => {
    const items = atAb(teilenRestSkill, 3, 3).filter((e) => e.key.includes(':abrunden:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [p, d] = ex.context!.match(/\d+/g)!.map(Number);
      expect(Math.floor(p / d), ex.key).toBeGreaterThanOrEqual(2);
      expect(ex.answer, ex.key).toMatchObject({ kind: 'number', value: Math.floor(p / d) });
      expect(ex.bugs?.find((b) => b.id === 'rest-sache')?.match, ex.key).toBe(Math.floor(p / d) + 1);
    }
  });

  it('17 : 5 = 2 Rest 7 and 17 : 5 = 3 are the known errors', () => {
    const ex = allItems(teilenRestSkill, {}, 400).find((e) => e.key.endsWith(':bild:17:5'))!;
    expect(ex.bugs?.find((b) => b.id === 'rest-zu-gross')?.match).toEqual({ q: 2, r: 7 });
    expect(ex.bugs?.find((b) => b.id === 'rest-vergessen')?.match).toEqual({ q: 3, r: 0 });
    expect(checkAnswer(ex.answer, { kind: 'multi', values: { q: '2', r: '7' } }, ex.bugs).bugId).toBe('rest-zu-gross');
  });

  it('a value of 1 takes the singular in every text, and the frames of the fields do not give it away', () => {
    const items = allItems(teilenRestSkill, {}, 500);
    const stories = items.filter((ex) => ex.context && isMulti(ex));
    const fields = (ex: { answer: unknown }) => (ex.answer as MultiAnswer).fields;
    // Both a quotient and a Rest of 1 are in the sample, so the check below has something to bite on.
    expect(stories.some((ex) => fieldsOf(ex).q === 1)).toBe(true);
    expect(stories.some((ex) => fieldsOf(ex).r === 1)).toBe(true);
    for (const ex of items) {
      const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => [o.label, o.whyWrong]) : [];
      const shown = JSON.stringify({ c: ex.context, h: ex.hints, s: ex.steps, b: ex.bugs?.map((b) => b.hint), f: isMulti(ex) ? fields(ex) : [], options });
      expect(shown, ex.key).not.toMatch(/(?<!\d)1 (Äpfel|Kekse|Autos|Kinder|Kisten|Bücher)\b|1 sind voll|fehlen noch 1\b|Reichen 1\b/);
    }
    const frames = new Map<string, Set<string>>();
    for (const ex of stories) {
      const story = ex.key.split(':').slice(2, 3).concat(ex.key.split(':').pop()!).join(':');
      const frame = fields(ex).map((f) => `${f.before} | ${f.after}`).join(' / ');
      frames.set(story, (frames.get(story) ?? new Set()).add(frame));
    }
    expect(frames.size).toBe(4);
    frames.forEach((set, story) => expect([...set], story).toHaveLength(1));
  });

  it('only the last field may end in a full stop: the solution line joins the fields with commas', () => {
    for (const ex of allItems(teilenRestSkill).filter(isMulti)) {
      (ex.answer as MultiAnswer).fields.slice(0, -1).forEach((f) => expect(f.after ?? '', ex.key).not.toMatch(/\.$/));
    }
  });

  it('a picture leaves the answer open: loose dots with the task, the groups and the Rest with the solution', () => {
    const items = allItems(teilenRestSkill).filter((ex) => ex.visual && !ex.key.includes(':dividend:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [p, d] = parts(ex.key);
      const v = ex.visual as { groups: number[]; perRow: number };
      expect(v.groups, ex.key).toEqual([p]);
      expect([d, Math.floor(p / d)], ex.key).not.toContain(v.perRow);
      const solved = ex.steps.flatMap((s) => (typeof s !== 'string' && s.visual ? [s.visual as { groups: number[] }] : []));
      expect(solved.flatMap((x) => x.groups).reduce((a, b) => a + b, 0), ex.key).toBe(p);
      expect(solved.at(-1)!.groups.at(-1), ex.key).toBe(p % d);
      expect(new Set(solved[0].groups).size, `${ex.key}: the Rest reads apart from the groups`).toBeGreaterThan(1);
    }
  });

  it('□ : d = q Rest r shows the groups: its answer is their sum, and it stands in no label', () => {
    const items = atAb(teilenRestSkill, 1, 3).filter((ex) => ex.key.includes(':dividend:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [p, d] = parts(ex.key);
      const groups = (ex.visual as { groups: number[] }).groups;
      expect(groups.reduce((a, b) => a + b, 0), ex.key).toBe(p);
      expect(groups.at(-1), ex.key).toBe(p % d);
      expect(ex.srText, ex.key).not.toMatch(new RegExp(`(?<!\\d)${p}(?!\\d)`));
    }
  });

  it('the first factor counts the groups: shares among d are d · q, in the steps and in the check', () => {
    const items = atAb(teilenRestSkill, 3, 1);
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [p, d] = parts(ex.key);
      const q = Math.floor(p / d);
      const first = ex.steps[0];
      expect(typeof first === 'string' ? first : first.text, ex.key).toBe(`${d} · ${q} = ${d * q}`);
      expect(ex.bugs?.find((b) => b.id === 'rest-vergessen')?.hint, ex.key).toContain(`${d} · ${q} sind`);
    }
  });

  it('Stufe 3: AB I asks what stays over, AB II asks for one more', () => {
    const left = atAb(teilenRestSkill, 3, 1);
    const more = atAb(teilenRestSkill, 3, 2);
    for (const ex of left) {
      const [p, d] = parts(ex.key);
      const { q, r } = fieldsOf(ex);
      expect(q * d + r, ex.key).toBe(p);
    }
    expect(atAb(teilenRestSkill, 3, 1, {}, 600).some((ex) => parts(ex.key)[1] === 10)).toBe(true);
    for (const ex of more) {
      const { q, alle } = fieldsOf(ex);
      expect(alle).toBe(q + 1);
      expect(ex.bugs?.find((b) => b.id === 'rest-sache')?.match).toEqual({ alle: q });
    }
    for (const ex of more.filter((e) => e.context?.includes('Auto'))) expect(parts(ex.key)[1], ex.key).toBeLessThanOrEqual(5);
  });
});
