/** Test support of the topic (imported only by *.test.ts). */
import { expect } from 'vitest';
import { createRng } from '../../core/rng';
import { sentences } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import { CTX } from '../test-utils';
import { THEMES } from './helpers';

export const STUFEN_AB: readonly (readonly [Stufe, Ab])[] = ([1, 2, 3] as const).flatMap((s) => ([1, 2, 3] as const).map((a) => [s, a] as const));

/** n exercises of one Stufe with a planned AB level. */
export function atAb(skill: SkillDef, stufe: Stufe, ab: Ab, n = 200): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 4567 + stufe * 11 + ab), stufe, { ...CTX, ab }));
}

/** The task form: the first part of the key after skill and Stufe. */
export const formOf = (ex: Exercise) => ex.key.split(':')[2];

export function visualOf<T extends Visual['type']>(ex: Exercise, type: T): VisualOf<T> {
  expect(ex.visual?.type, ex.key).toBe(type);
  return ex.visual as VisualOf<T>;
}

export function numberOf(ex: Exercise): number {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(`number answer expected: ${ex.key}`);
  return ex.answer.value;
}

export function choiceOf(ex: Exercise): ChoiceAnswer {
  if (ex.answer.kind !== 'choice') throw new Error(`choice answer expected: ${ex.key}`);
  return ex.answer;
}

export const correctLabel = (ex: Exercise) => {
  const a = choiceOf(ex);
  return a.options[a.correct].label;
};

/** The one label of `labels` that the prompt names, as a whole word. */
export function named(ex: Exercise, labels: readonly string[]): number {
  const words = `${ex.context ?? ''} ${ex.prompt}`.split(/[^\p{L}-]+/u);
  const hits = labels.flatMap((l, i) => (words.includes(l) ? [i] : []));
  expect(hits.length, `${ex.key}: ${ex.prompt}`).toBe(1);
  return hits[0];
}

/** Every row is believable for its theme, and no setting promises fewer children or animals than the numbers show. */
export function assertBelievableRows(skill: SkillDef): void {
  for (const t of THEMES) expect(t.title, 'a class has about 25 children; the rows reach 50').not.toMatch(/Klasse/);
  for (const [stufe, ab] of STUFEN_AB) {
    for (const ex of atAb(skill, stufe, ab)) {
      const theme = THEMES.find((t) => t.id === ex.key.split(':')[3]);
      const v = ex.visual;
      if (!theme || !v) continue;
      const rows = v.type === 'tally' ? v.rows.map((r) => r.count) : v.type === 'table' ? v.rows.map((r) => Number(r[1])) : v.type === 'pictogram' || v.type === 'barChart' ? v.values : [];
      rows.forEach((n) => expect(n, ex.key).toBeLessThanOrEqual(theme.maxRow));
    }
  }
}

/** T8: long words only from the short list; T7: one question, last, and at most two numbers per sentence. */
export function assertPlainText(ex: Exercise): void {
  const whyWrong = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.whyWrong) : [];
  const texts = [ex.context, ex.prompt, ex.praise, ...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...whyWrong, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))].filter((t): t is string => !!t);
  for (const t of texts) {
    for (const w of t.split(/[^\p{L}]+/u)) {
      if (w === 'wahrscheinlich' || w === 'unwahrscheinlich') continue;
      expect(w.length, `long word "${w}" in "${t}"`).toBeLessThanOrEqual(12);
    }
    expect(t, 'one picture or bundle takes a singular verb').not.toMatch(/\b(sind|stehen) 1 (Bild|Bündel)\b/);
  }
  const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
  const parts = sentences(story);
  expect(parts.filter((s) => s.endsWith('?')).length, story).toBe(1);
  expect(parts[parts.length - 1].endsWith('?'), story).toBe(true);
  for (const s of parts) expect((s.match(/\d+/g) ?? []).length, `numbers in "${s}"`).toBeLessThanOrEqual(2);
}

/** Every Stufe × AB pair: the plain text rules hold. */
export function assertPlainTextEverywhere(skill: SkillDef): void {
  for (const [stufe, ab] of STUFEN_AB) atAb(skill, stufe, ab, 80).forEach(assertPlainText);
}
