/**
 * The Stufe chooses the content, the AB level the demand inside it (docs/research.md §6). Same seed and same AB level on Stufe 1 and
 * Stufe 3 give another task: compared by the key without its skill and Stufe parts.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import topic from './index';

const SEEDS = 200;
const ABS: readonly Ab[] = [1, 2, 3];
const item = (skill: SkillDef, seed: number, stufe: Stufe, ab: Ab): Exercise => skill.generate(createRng(seed * 131 + 7), stufe, { extras: true, ab });
const bareKey = (ex: Exercise) => ex.key.split(':').slice(2).join(':');

/** Share of seeds whose items differ between two Stufen at one AB level. */
function differs(skill: SkillDef, ab: Ab, from: Stufe, to: Stufe): number {
  let count = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    if (bareKey(item(skill, seed, from, ab)) !== bareKey(item(skill, seed, to, ab))) count++;
  }
  return count / SEEDS;
}

describe.each(topic.skills.map((s) => [s.id, s] as const))('%s: the Stufe chooses the content', (_id, skill) => {
  it.each(ABS)('AB %i: at least half of the items differ between Stufe 1 and Stufe 3', (ab) => {
    expect(differs(skill, ab, 1, 3)).toBeGreaterThanOrEqual(0.5);
  });

  it.each(ABS)('AB %i: the forms of neighbouring Stufen differ too', (ab) => {
    expect(differs(skill, ab, 1, 2)).toBeGreaterThanOrEqual(0.5);
    expect(differs(skill, ab, 2, 3)).toBeGreaterThanOrEqual(0.5);
  });

  it('keeps the planned AB level on every Stufe, and its key shows skill and Stufe', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of ABS) {
        for (let seed = 1; seed <= 40; seed++) {
          const ex = item(skill, seed, stufe, ab);
          expect(ex.ab, ex.key).toBe(ab);
          expect(ex.key.startsWith(`${skill.id}:${stufe}:`), ex.key).toBe(true);
        }
      }
    }
  });

  it('after 1 comes the singular', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of ABS) {
        for (let seed = 1; seed <= 200; seed++) {
          const ex = item(skill, seed, stufe, ab);
          const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
          for (const text of [ex.prompt, ...ex.hints, ...steps, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(text, ex.key).not.toMatch(/(?<![\d,])1 (Stangen|Würfeln|Zehnern|Einern|Zeilen|Punkte|Reihen)\b/);
        }
      }
    }
  });

  it('is pure: the same seed gives the same item', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of ABS) expect(JSON.stringify(item(skill, 5, stufe, ab))).toBe(JSON.stringify(item(skill, 5, stufe, ab)));
    }
  });

  it('each cell of Stufe × AB offers real variety', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of ABS) {
        const keys = new Set(Array.from({ length: SEEDS }, (_, i) => item(skill, i + 1, stufe, ab).key));
        expect(keys.size, `${skill.id} Stufe ${stufe} AB ${ab}`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('never shows the answer in the task text, except a task that names where to put it', () => {
    const texts = (ex: Exercise) => [ex.prompt, ex.context, ex.expression].filter(Boolean).join(' ');
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of ABS) {
        for (let seed = 1; seed <= 60; seed++) {
          const ex = item(skill, seed, stufe, ab);
          if (ex.answer.kind !== 'number') continue;
          const value = ex.answer.value;
          if (value === null || value < 10) continue;
          expect(new RegExp(`(?<!\\d)${value}(?!\\d)`).test(texts(ex)), `${ex.key}: ${texts(ex)}`).toBe(false);
        }
      }
    }
  });
});
