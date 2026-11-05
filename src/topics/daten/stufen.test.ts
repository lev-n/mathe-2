/**
 * Stufe and AB are two separate things: the Stufe decides the content (docs/research.md §6), the AB the demand inside it. A generator that
 * picks its forms by AB alone gives the same item on every Stufe, and this suite fails. Each neighbouring pair of Stufen is held to it, too:
 * choosing the next Stufe has to change the task.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import topic from './index';

/** A key without its skill and its Stufe: the same task on two Stufen has the same rest. */
const task = (ex: Exercise) => ex.key.split(':').slice(2).join(':');

const SAMPLES = 200;
const PAIRS: readonly (readonly [Stufe, Stufe])[] = [[1, 2], [2, 3], [1, 3]];
function differing(skill: SkillDef, ab: Ab, extras: boolean, [low, high]: readonly [Stufe, Stufe]): number {
  let count = 0;
  for (let seed = 1; seed <= SAMPLES; seed++) {
    if (task(skill.generate(createRng(seed), low, { extras, ab })) !== task(skill.generate(createRng(seed), high, { extras, ab }))) count++;
  }
  return count / SAMPLES;
}

describe.each(topic.skills.map((s) => [s.id, s] as const))('%s', (_id, skill) => {
  describe.each(PAIRS)('Stufe %i and Stufe %i', (low, high) => {
    it.each([1, 2, 3] as Ab[])('AB %i: the same seed gives another task', (ab) => {
      expect(differing(skill, ab, true, [low, high])).toBeGreaterThanOrEqual(0.5);
      expect(differing(skill, ab, false, [low, high])).toBeGreaterThanOrEqual(0.5);
    });
  });
});
