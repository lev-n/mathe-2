import { describe, expect, it } from 'vitest';
import { spokenWords } from '../../core/format';
import { createRng } from '../../core/rng';
import { wordCount } from '../../core/textRules';
import { STUFEN } from '../../core/types';
import { ALL_FACT_KEYS, factSkillId } from '../../state/facts';
import topic from './index';
import { allItems, plannedRound } from './test-support';

describe('topic einmaleins', () => {
  it('has the catalogue skills in teaching order, with the fact trainer right after mal 5', () => {
    expect(topic.skills.map((s) => s.id)).toEqual([
      'einmaleins.mal-verstehen',
      'einmaleins.tausch',
      'einmaleins.mal-1-2-10',
      'einmaleins.mal-5',
      'einmaleins.einmaleins',
      'einmaleins.quadrate',
      'einmaleins.ableiten',
      'einmaleins.teilen-verstehen',
      'einmaleins.umkehren',
      'einmaleins.teilen-rest',
    ]);
  });

  it('marks exactly the optional catalogue skills as extras', () => {
    expect(topic.skills.filter((s) => s.optional === 'extra').map((s) => s.id)).toEqual(['einmaleins.quadrate', 'einmaleins.teilen-rest']);
  });

  it('describes each Stufe in at most 12 words', () => {
    for (const s of topic.skills) for (const stufe of STUFEN) expect(wordCount(s.stufen[stufe]), `${s.id} ${stufe}`).toBeLessThanOrEqual(12);
  });

  it('no planned round of any skill and Stufe repeats a task', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (let seed = 1; seed <= 200; seed++) {
          const keys = plannedRound(skill, stufe, seed).map((ex) => ex.key);
          expect(new Set(keys).size, `${skill.id} Stufe ${stufe}: ${keys.join(', ')}`).toBe(keys.length);
        }
      }
    }
  });

  it('once is "einmal" in every text and in every voice: read aloud, 1-mal would be eins-mal (T16)', () => {
    let seen = 0;
    for (const skill of topic.skills) {
      for (const ex of allItems(skill, {}, 200)) {
        const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.whyWrong) : [];
        const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
        const texts = [ex.context, ex.prompt, ex.srText, ...ex.hints, ...steps, ...(ex.bugs ?? []).map((b) => b.hint), ...options].filter((t): t is string => Boolean(t));
        for (const text of texts) {
          expect(text, `${ex.key}: ${text}`).not.toMatch(/(?<!\d)1-mal/);
          expect(spokenWords(text), `${ex.key}: ${text}`).not.toMatch(/eins-mal/);
          if (/[Ee]inmal (die|welche|gar)/.test(text)) seen += 1;
        }
      }
    }
    expect(seen, 'the sample holds the forms with 1').toBeGreaterThan(0);
  });

  it('only the Extra Quadrataufgaben starts the squares, and no Extra moves a Kern fact (no badge through an Extra)', () => {
    for (const skill of topic.skills) {
      for (const stufe of [1, 2, 3] as const) {
        for (let seed = 1; seed <= 300; seed++) {
          const { factKey } = skill.generate(createRng(seed), stufe, { extras: true });
          if (!factKey) continue;
          expect(factSkillId(factKey) === 'einmaleins.quadrate', `${skill.id}: ${factKey}`).toBe(skill.id === 'einmaleins.quadrate');
        }
      }
    }
  });

  it('every tracked fact has a skill of this topic that owns it', () => {
    const ids = new Set(topic.skills.map((s) => s.id));
    for (const key of ALL_FACT_KEYS) expect(ids.has(factSkillId(key)), key).toBe(true);
  });
});
