import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import topic from './index';

const SEEDS = 200;
/** What the child gets, without the skill and the Stufe in the key: the form and the numbers of the item. */
const inhalt = (ex: Exercise) => ex.key.split(':').slice(2).join(':');

/** The share of same-seed items that differ between two Stufen. */
function unterschied(skill: SkillDef, a: Stufe, b: Stufe, ab: Ab): number {
  let anders = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const x = skill.generate(createRng(seed * 3571), a, { extras: true, ab });
    const y = skill.generate(createRng(seed * 3571), b, { extras: true, ab });
    if (inhalt(x) !== inhalt(y)) anders++;
  }
  return anders / SEEDS;
}

describe('the Stufe decides the content, not only the AB mix', () => {
  it('has all 9 skills', () => expect(topic.skills).toHaveLength(9));

  it('after 1 comes the singular: no "Es bleiben 1." in any hint', () => {
    for (const skill of topic.skills) {
      for (const stufe of [1, 2, 3] as Stufe[]) {
        for (const ab of [1, 2, 3] as Ab[]) {
          for (let seed = 1; seed <= 400; seed++) {
            const ex = skill.generate(createRng(seed * 3571), stufe, { extras: true, ab });
            for (const text of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(text, ex.key).not.toMatch(/\b(bleiben|fehlen) 1\b/);
          }
        }
      }
    }
  });

  for (const skill of topic.skills) {
    for (const ab of [1, 2, 3] as Ab[]) {
      it(`${skill.id}, AB ${ab}: at least half of the same-seed items differ between the Stufen`, () => {
        expect(unterschied(skill, 1, 3, ab), 'Stufe 1 and Stufe 3').toBeGreaterThanOrEqual(0.5);
        expect(unterschied(skill, 1, 2, ab), 'Stufe 1 and Stufe 2').toBeGreaterThanOrEqual(0.5);
        expect(unterschied(skill, 2, 3, ab), 'Stufe 2 and Stufe 3').toBeGreaterThanOrEqual(0.5);
      });
    }

    it(`${skill.id}: the planned AB comes back, and no item is exactly the same on two Stufen with the same AB`, () => {
      for (const ab of [1, 2, 3] as Ab[]) {
        const perStufe = ([1, 2, 3] as Stufe[]).map((stufe) => {
          const keys = new Set<string>();
          for (let seed = 1; seed <= SEEDS; seed++) {
            const ex = skill.generate(createRng(seed * 977 + stufe), stufe, { extras: true, ab });
            expect(ex.ab, ex.key).toBe(ab);
            keys.add(inhalt(ex));
          }
          return keys;
        });
        const [s1, s2, s3] = perStufe;
        expect([...s1].filter((k) => s2.has(k)), `${skill.id} AB ${ab}: Stufe 1 and 2`).toEqual([]);
        expect([...s2].filter((k) => s3.has(k)), `${skill.id} AB ${ab}: Stufe 2 and 3`).toEqual([]);
        expect([...s1].filter((k) => s3.has(k)), `${skill.id} AB ${ab}: Stufe 1 and 3`).toEqual([]);
      }
    });
  }
});
