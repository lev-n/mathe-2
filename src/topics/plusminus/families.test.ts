import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { bugKey } from '../errorFamilies';
import families from './families';
import topic from './index';
import phrases from './phrases';

/** The same sweep as src/topics/errorFamilies.test.ts, for this topic alone. */
describe('plusminus: bug families', () => {
  const ctx = { extras: true, today: '2026-10-19' };
  const entries = Object.entries(families).flatMap(([family, skills]) =>
    Object.entries(skills).flatMap(([skillId, keys]) => keys.split(/\s+/).map((key) => ({ family, skillId, key }))),
  );

  it('every family has a phrase, and every phrase a family', () => {
    expect(Object.keys(phrases).sort()).toEqual(Object.keys(families).sort());
    for (const id of Object.keys(families)) expect(id).toMatch(/^plusminus-[a-z-]+$/);
  });

  it('every emitted bug id has a family of its skill, and every table entry is emitted', () => {
    const known = new Set(entries.map((e) => `${e.skillId}|${e.key}`));
    const emitted = new Set<string>();
    const unmapped = new Set<string>();
    for (const skill of topic.skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        for (let seed = 1; seed <= 400; seed++) {
          for (const bug of skill.generate(createRng(seed * 104_729 + stufe * 31), stufe, ctx).bugs ?? []) {
            const k = `${skill.id}|${bugKey(bug.id)}`;
            emitted.add(k);
            if (!known.has(k)) unmapped.add(k);
          }
        }
      }
    }
    expect([...unmapped]).toEqual([]);
    expect([...known].filter((k) => !emitted.has(k))).toEqual([]);
  });

  it('within a skill, every family has its own sentence', () => {
    const bySkill = new Map<string, string[]>();
    for (const e of entries) {
      const { object, participle } = phrases[e.family].phrase;
      const list = bySkill.get(e.skillId) ?? [];
      if (!list.includes(`${object} ${participle}`)) list.push(`${object} ${participle}`);
      bySkill.set(e.skillId, list);
    }
    for (const [skillId, texts] of bySkill) {
      const familyCount = new Set(entries.filter((e) => e.skillId === skillId).map((e) => e.family)).size;
      expect(texts.length, skillId).toBe(familyCount);
    }
  });
});
