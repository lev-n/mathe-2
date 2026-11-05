// The round flow with the real skills: the state code and the generators have to agree on slots, levels and facts.
import { beforeAll, describe, expect, it } from 'vitest';
import { AB_MIX } from '../core/age';
import { createRng } from '../core/rng';
import type { SkillDef, Stufe } from '../core/types';
import { STUFEN } from '../core/types';
import { TOPICS, loadTopic } from '../topics/registry';
import { KERN_FACT_KEYS, SQUARE_FACT_KEYS, factSkillId, isKernFact } from './facts';
import { ROUND_SIZE, buildRound } from './round';
import { emptyState } from './store';
import type { ProgressState } from './types';

const DAY = '2026-10-19';
let skills: SkillDef[] = [];
const skillOf = (id: string) => skills.find((s) => s.id === id)!;

beforeAll(async () => {
  skills = (await Promise.all(TOPICS.map((t) => loadTopic(t.id)))).flatMap((m) => m.skills);
});

/** A state with these facts due today (and the settings the test wants). */
function withDueFacts(keys: readonly string[], extras = true): ProgressState {
  const state = emptyState();
  return {
    ...state,
    settings: { ...state.settings, extras },
    facts: Object.fromEntries(keys.map((k) => [k, { box: 1, due: DAY, seen: 1, correct: 1 }])),
  };
}

describe('skill rounds', () => {
  it('every real skill: 8 items with the AB mix of the Stufe, easier items first, each item at its planned level', () => {
    expect(skills).toHaveLength(59);
    for (const skill of skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        const slots = buildRound({ mode: 'skill', skillId: skill.id, stufe }, emptyState(), DAY, createRng(1), skills);
        expect(slots).toHaveLength(ROUND_SIZE);
        expect(ROUND_SIZE).toBe(8);
        const counts = [1, 2, 3].map((ab) => slots.filter((s) => s.ab === ab).length);
        expect(counts, `${skill.id} Stufe ${stufe}`).toEqual([...AB_MIX[stufe]]);
        expect(slots.map((s) => s.ab), skill.id).toEqual([...slots.map((s) => s.ab)].sort());
        slots.forEach((slot, i) => {
          const ex = skill.generate(createRng(i * 37 + 5), stufe, { extras: true, ab: slot.ab, today: DAY });
          expect(ex.ab, `${ex.key} planned AB ${slot.ab}`).toBe(slot.ab);
          expect(ex.skillId).toBe(skill.id);
          expect(ex.stufe).toBe(stufe);
        });
      }
    }
  });
});

describe('review rounds', () => {
  it('a due Kern fact goes to the fact trainer, which returns exactly this fact', () => {
    for (const key of KERN_FACT_KEYS) {
      const slots = buildRound({ mode: 'review' }, withDueFacts([key]), DAY, createRng(2), skills);
      expect(slots, key).toHaveLength(1);
      const [slot] = slots;
      expect(slot.factKey).toBe(key);
      expect(slot.skillId).toBe('einmaleins.einmaleins');
      expect(slot.purpose).toBe('review');
      expect(skillOf(slot.skillId).optional, key).toBeUndefined();
      for (let seed = 1; seed <= 5; seed++) {
        const ex = skillOf(slot.skillId).generate(createRng(seed), slot.stufe, { extras: true, factKey: key, today: DAY });
        expect(ex.factKey, key).toBe(key);
        expect(isKernFact(ex.factKey!), key).toBe(true);
      }
    }
  });

  it('Kern facts come first in a review round only as far as they are due: at most 3 slots, all of them Kern facts', () => {
    const slots = buildRound({ mode: 'review' }, withDueFacts(KERN_FACT_KEYS), DAY, createRng(3), skills);
    expect(slots.length).toBe(3);
    for (const slot of slots) {
      expect(slot.skillId).toBe('einmaleins.einmaleins');
      expect(isKernFact(slot.factKey!), slot.factKey).toBe(true);
    }
  });

  it('a due square goes to its Extra skill, and waits while extras are hidden', () => {
    for (const key of SQUARE_FACT_KEYS) {
      expect(factSkillId(key)).toBe('einmaleins.quadrate');
      const [slot] = buildRound({ mode: 'review' }, withDueFacts([key]), DAY, createRng(4), skills);
      expect(slot.skillId).toBe('einmaleins.quadrate');
      expect(skillOf(slot.skillId).generate(createRng(1), slot.stufe, { extras: true, factKey: key, today: DAY }).factKey).toBe(key);
      expect(buildRound({ mode: 'review' }, withDueFacts([key], false), DAY, createRng(4), skills)).toEqual([]);
    }
  });

  it('no core skill feeds a square into the review schedule', () => {
    for (const skill of skills.filter((s) => !s.optional)) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        for (let seed = 1; seed <= 40; seed++) {
          const ex = skill.generate(createRng(seed * 11 + stufe), stufe, { extras: true, today: DAY });
          if (ex.factKey) expect(isKernFact(ex.factKey), `${ex.key} ${ex.factKey}`).toBe(true);
        }
      }
    }
  });
});

describe('mixed rounds', () => {
  it('a new topic: 8 slots over core skills only, whose generators accept the slot', () => {
    for (const topic of TOPICS) {
      const slots = buildRound({ mode: 'mixed', topicId: topic.id }, emptyState(), DAY, createRng(5), skills);
      expect(slots, topic.id).toHaveLength(ROUND_SIZE);
      for (const slot of slots) {
        const skill = skillOf(slot.skillId);
        expect(skill.topicId).toBe(topic.id);
        expect(skill.optional, slot.skillId).toBeUndefined();
        expect(skill.generate(createRng(9), slot.stufe, { extras: true }).skillId).toBe(slot.skillId);
      }
    }
  });
});
