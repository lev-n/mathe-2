/**
 * The Stufe chooses the content (docs/research.md §6), the AB level the demand inside it. Same seed, same AB: the items of two Stufen
 * differ. Also, for all items of the topic, the defects a change of this kind tends to bring back.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { mentionsNumber } from '../shared';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import topic from './index';
import { numbersIn } from './test-helpers';

const SEEDS = 200;
const ABS = [1, 2, 3] as const;

/** What the child gets, without skill and Stufe: the form and the numbers of the item. */
const content = (ex: Exercise) => ex.key.split(':').slice(2).join(':');

const item = (skill: SkillDef, stufe: Stufe, ab: Ab, seed: number) => skill.generate(createRng(seed * 3571 + 11), stufe, { extras: true, ab });

function differs(skill: SkillDef, a: Stufe, b: Stufe, ab: Ab): number {
  let different = 0;
  for (let seed = 1; seed <= SEEDS; seed++) if (content(item(skill, a, ab, seed)) !== content(item(skill, b, ab, seed))) different += 1;
  return different / SEEDS;
}

const allItems = (skill: SkillDef, stufe: Stufe, ab: Ab, n = 120) => Array.from({ length: n }, (_, i) => item(skill, stufe, ab, i + 1));

const hintsOf = (ex: Exercise) => [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...(ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.whyWrong ? [o.whyWrong] : [])) : [])];

/** The largest number of the story, a proxy for the size of the numbers where the catalogue moves from 20 to 100. */
const largest = (ex: Exercise) => Math.max(0, ...numbersIn([ex.context, ex.prompt].filter(Boolean).join(' ')));
const meanLargest = (skill: SkillDef, stufe: Stufe, ab: Ab) => allItems(skill, stufe, ab).reduce((sum, ex) => sum + largest(ex), 0) / 120;

describe('the Stufe decides the content, not only the AB mix', () => {
  it('has all 8 skills', () => expect(topic.skills.length).toBe(8));

  for (const skill of topic.skills) {
    for (const ab of ABS) {
      it(`${skill.id}, AB ${ab}: at least half of the same-seed items differ between the Stufen`, () => {
        expect(differs(skill, 1, 3, ab), 'Stufe 1 and Stufe 3').toBeGreaterThanOrEqual(0.5);
        expect(differs(skill, 1, 2, ab), 'Stufe 1 and Stufe 2').toBeGreaterThanOrEqual(0.5);
        expect(differs(skill, 2, 3, ab), 'Stufe 2 and Stufe 3').toBeGreaterThanOrEqual(0.5);
      });
    }
    for (const stufe of STUFEN) {
      it(`${skill.id}, Stufe ${stufe}: the AB level changes the item`, () => {
        for (const [a, b] of [[1, 2], [2, 3]] as const) {
          let different = 0;
          for (let seed = 1; seed <= SEEDS; seed++) if (content(item(skill, stufe, a, seed)) !== content(item(skill, stufe, b, seed))) different += 1;
          expect(different / SEEDS, `AB ${a} and AB ${b}`).toBeGreaterThanOrEqual(0.5);
        }
      });
    }
  }
});

describe('what a Stufe holds', () => {
  const skill = (id: string) => topic.skills.find((s) => s.id === `sachaufgaben.${id}`)!;

  it('Stufe 1 keeps its range at every AB: up to 20, or up to 50 for equal groups', () => {
    const LIMITS: Record<string, number> = { bildaufgabe: 20, 'rechnung-finden': 20, 'plus-minus': 20, vergleichen: 20, 'mal-teilen': 50, 'mit-groessen': 20, 'zwei-schritte': 20 };
    for (const [id, limit] of Object.entries(LIMITS)) {
      for (const ab of ABS) {
        for (const ex of allItems(skill(id), 1, ab)) {
          expect(largest(ex), ex.key).toBeLessThanOrEqual(limit);
          if (ex.answer.kind === 'number' && ex.answer.value !== null) expect(ex.answer.value, ex.key).toBeLessThanOrEqual(limit);
        }
      }
    }
  });

  it('at every AB the numbers grow from Stufe 1 to Stufe 2, where the catalogue moves from 20 to 100', () => {
    for (const id of ['bildaufgabe', 'rechnung-finden', 'plus-minus', 'mal-teilen', 'zwei-schritte']) {
      for (const ab of ABS) expect(meanLargest(skill(id), 2, ab), `${id} AB ${ab}`).toBeGreaterThan(meanLargest(skill(id), 1, ab));
    }
  });

  it('at every AB Stufe 3 asks at least as much as Stufe 2 where both use the same numbers', () => {
    // plus-minus hides a start or a change behind the numbers of Stufe 2, vergleichen reverses the wording of Stufe 2
    for (const id of ['plus-minus', 'vergleichen']) {
      for (const ab of ABS) expect(meanLargest(skill(id), 3, ab), `${id} AB ${ab}`).toBeGreaterThan(meanLargest(skill(id), 2, ab) * 0.85);
    }
    for (const ab of ABS) {
      for (const ex of allItems(skill('plus-minus'), 3, ab)) expect(ex.key, 'start or change hidden').toMatch(/:(dazu-wieviel|fehlt-mehr|weg-wieviel|start-[a-z]+):/);
      for (const ex of allItems(skill('vergleichen'), 3, ab)) expect(ex.key, 'reverse wording').toMatch(/:umgekehrt/);
    }
  });

  it('Stufe 1 of plus-minus and rechnung-finden stays with its own content', () => {
    for (const ab of ABS) {
      for (const ex of allItems(skill('plus-minus'), 1, ab)) expect(ex.prompt, ex.key).not.toMatch(/am Anfang|dazu\?|weg\?/);
      for (const ex of allItems(skill('rechnung-finden'), 1, ab)) expect(ex.answer.kind === 'choice' && ex.answer.options.length, ex.key).toBe(2);
    }
  });
});

describe('defects to keep out, on every skill, Stufe and AB', () => {
  for (const skill of topic.skills) {
    it(`${skill.id}: the answer is not in the prompt or the spoken task, apart from a rare equal number`, () => {
      for (const stufe of STUFEN) {
        for (const ab of ABS) {
          const items = allItems(skill, stufe, ab);
          const numberItems = items.filter((ex) => ex.answer.kind === 'number' && ex.answer.value !== null);
          const shown = numberItems.filter((ex) => {
            if (ex.answer.kind !== 'number' || ex.answer.value === null) return false;
            const text = [ex.context, ex.prompt].filter(Boolean).join(' ');
            return mentionsNumber(text, String(ex.answer.value));
          });
          expect(shown.length / Math.max(1, numberItems.length), `Stufe ${stufe} AB ${ab}: ${shown[0]?.key}`).toBeLessThan(0.1);
        }
      }
    });

    it(`${skill.id}: no hint names the answer, also not a small one`, () => {
      for (const stufe of STUFEN) {
        for (const ab of ABS) {
          for (const ex of allItems(skill, stufe, ab)) {
            const values = ex.answer.kind === 'number' && ex.answer.value !== null ? [ex.answer.value] : ex.answer.kind === 'multi' ? ex.answer.fields.map((f) => f.value) : [];
            for (const value of values) for (const hint of hintsOf(ex)) expect(mentionsNumber(hint, String(value)), `${ex.key}: ${value} in "${hint}"`).toBe(false);
          }
        }
      }
    });

    it(`${skill.id}: praise never claims writing or placing, and an answer by choice is no calculation`, () => {
      for (const stufe of STUFEN) {
        for (const ab of ABS) {
          for (const ex of allItems(skill, stufe, ab)) {
            expect(ex.praise, ex.key).not.toMatch(/geschrieben|aufgeschrieben|eingetragen|gesetzt|platziert|gelegt|gezeichnet/);
            if (ex.answer.kind === 'choice') expect(ex.praise, ex.key).not.toMatch(/gerechnet|ausgerechnet/);
          }
        }
      }
    });

    it(`${skill.id}: every form is varied, with at least 12 different items per Stufe and AB`, () => {
      for (const stufe of STUFEN) {
        for (const ab of ABS) expect(new Set(allItems(skill, stufe, ab, 200).map(content)).size, `Stufe ${stufe} AB ${ab}`).toBeGreaterThanOrEqual(12);
      }
    });
  }

  it('two items with the same key are the same item', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ab of ABS) {
          const byKey = new Map<string, string>();
          for (const ex of allItems(skill, stufe, ab, 200)) {
            const story = [ex.context, ex.prompt].filter(Boolean).join(' ').replace(/\p{Lu}\p{Ll}+/gu, 'X');
            const answer = JSON.stringify(ex.answer.kind === 'number' ? ex.answer.value : ex.answer.kind);
            const seen = byKey.get(ex.key);
            if (seen !== undefined) expect(`${numbersIn(story).join()}|${answer}`, ex.key).toBe(seen);
            byKey.set(ex.key, `${numbersIn(story).join()}|${answer}`);
          }
        }
      }
    }
  });
});
