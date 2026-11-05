import { describe, expect, it } from 'vitest';
import { AB_MIX } from '../core/age';
import { createRng } from '../core/rng';
import type { Stufe } from '../core/types';
import { addDays } from './dates';
import { factSkillId } from './facts';
import { applyAnswer } from './mastery';
import { MAX_TWINS, REVIEW_MAX, ROUND_SIZE, buildRound, mixedStufe } from './round';
import { REVIEWS_PER_DAY, dueFacts, dueReviews, reviewBudget, suggestedStufe } from './selectors';
import { createStore, emptyState } from './store';
import { entry, ev, skillDef, withFacts, withSkills } from './testkit';
import type { ProgressState, RoundSlot, StufeProgress } from './types';

const DAY = '2026-10-19';
const ZAHLEN = ['zahlen.zehner-einer', 'zahlen.zahlwort', 'zahlen.nachbarn', 'zahlen.vergleichen', 'zahlen.zahlenstrahl'].map((id) => skillDef(id));
/** The skills that own the facts of the tests below. */
const MAL = factSkillId('2x7');
const QUADRATE = factSkillId('7x7');
const FACT_SKILLS = [skillDef(MAL), skillDef(QUADRATE, true)];
const SKILLS = [...ZAHLEN, skillDef('zahlen.hundertertafel', true), skillDef('geometrie.flaechen'), ...FACT_SKILLS];
const isFactSlot = (s: RoundSlot) => s.factKey !== undefined;

function noAdjacentRepeats(slots: RoundSlot[]): boolean {
  return slots.every((s, i) => i === 0 || s.skillId !== slots[i - 1].skillId);
}

function counts(slots: RoundSlot[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of slots) m.set(s.skillId, (m.get(s.skillId) ?? 0) + 1);
  return m;
}

/** An arrangement without neighbours of the same skill exists iff the largest group ≤ others + 1. */
function separable(slots: RoundSlot[]): boolean {
  const max = Math.max(...counts(slots).values());
  return max <= slots.length - max + 1;
}

describe("plan 'skill'", () => {
  it('gives 8 practice slots of the chosen skill and Stufe', () => {
    const slots = buildRound({ mode: 'skill', skillId: 'zahlen.nachbarn', stufe: 2 }, emptyState(), DAY, createRng(1), SKILLS);
    expect(ROUND_SIZE).toBe(8);
    expect(slots).toHaveLength(ROUND_SIZE);
    expect(slots.every((s) => s.skillId === 'zahlen.nachbarn' && s.stufe === 2 && s.purpose === 'practice')).toBe(true);
    expect(MAX_TWINS).toBe(2);
  });

  it.each([
    [1, [1, 1, 1, 1, 1, 2, 2, 3]],
    [2, [1, 1, 1, 2, 2, 2, 3, 3]],
    [3, [1, 1, 2, 2, 2, 2, 3, 3]],
  ] as const)('Stufe %i has the AB mix of the research, easier items first', (stufe, abs) => {
    const slots = buildRound({ mode: 'skill', skillId: 'zahlen.nachbarn', stufe }, emptyState(), DAY, createRng(1), SKILLS);
    expect(slots.map((s) => s.ab)).toEqual(abs);
    expect(AB_MIX[stufe].reduce((a, b) => a + b, 0)).toBe(ROUND_SIZE);
  });
});

describe("plan 'mixed'", () => {
  const mixed = (state: ProgressState, seed: number, skills = SKILLS) => buildRound({ mode: 'mixed', topicId: 'zahlen' }, state, DAY, createRng(seed), skills);

  it('new topic: 8 slots spread evenly over the non-optional skills, never the same skill twice in a row', () => {
    for (let seed = 0; seed < 200; seed++) {
      const slots = mixed(emptyState(), seed);
      expect(slots).toHaveLength(8);
      expect(slots.every((s) => s.purpose === 'mixed' && s.stufe === 1)).toBe(true); // new skills: Stufe 1
      expect(noAdjacentRepeats(slots)).toBe(true);
      const c = counts(slots);
      expect([...c.keys()].sort()).toEqual(ZAHLEN.map((s) => s.id).sort());
      expect([...c.values()].sort()).toEqual([1, 1, 2, 2, 2]);
    }
  });

  it('prefers practised skills, each at its practised/suggested Stufe', () => {
    const state = withSkills({
      'zahlen.nachbarn#1': entry('sicher'),
      'zahlen.nachbarn#2': entry('geuebt'),
      'zahlen.vergleichen#1': entry('geuebt'),
      'zahlen.zahlenstrahl#1': entry('gemeistert'),
      'geometrie.flaechen#1': entry('sicher'),
    });
    for (let seed = 0; seed < 100; seed++) {
      const slots = mixed(state, seed);
      expect(slots).toHaveLength(8);
      expect(noAdjacentRepeats(slots)).toBe(true);
      const c = counts(slots);
      expect([...c.keys()].sort()).toEqual(['zahlen.nachbarn', 'zahlen.vergleichen', 'zahlen.zahlenstrahl']);
      expect(Math.max(...c.values()) - Math.min(...c.values())).toBeLessThanOrEqual(1);
      for (const s of slots) {
        // zahlen.zahlenstrahl#1 is mastered and the new Stufe 2 is not opened yet: practised Stufe
        const expected: Record<string, Stufe> = { 'zahlen.nachbarn': 2, 'zahlen.vergleichen': 1, 'zahlen.zahlenstrahl': 1 };
        expect(s.stufe).toBe(expected[s.skillId]);
      }
    }
  });

  it('mixedStufe: suggested Stufe once worked on, otherwise the practised one', () => {
    const s = withSkills({
      'zahlen.nachbarn#1': entry('sicher'),
      'zahlen.vergleichen#2': entry('geuebt'),
      'zahlen.zahlenstrahl#1': entry('sicher'),
      'zahlen.zahlenstrahl#2': entry('sicher'),
      'zahlen.zahlenstrahl#3': entry('sicher'),
    });
    expect(mixedStufe(s, 'zahlen.nachbarn')).toBe(1); // Stufe 2 not opened yet
    expect(mixedStufe(s, 'zahlen.vergleichen')).toBe(2); // works on Stufe 2
    expect(mixedStufe(s, 'zahlen.zahlenstrahl')).toBe(3);
    expect(mixedStufe(s, 'zahlen.zahlwort')).toBe(1); // new: the default suggestion
  });

  it('with fewer than 2 practised skills the whole topic is used, practised skills first for extra slots', () => {
    const three = ZAHLEN.slice(0, 3);
    const state = withSkills({ 'zahlen.zahlwort#1': entry('geuebt') });
    for (let seed = 0; seed < 50; seed++) {
      const slots = mixed(state, seed, three);
      expect(noAdjacentRepeats(slots)).toBe(true);
      expect(counts(slots).get('zahlen.zahlwort')).toBe(3);
    }
  });

  it('includes an optional extra only once the child has practised it, and only while shown', () => {
    expect(mixed(emptyState(), 3).some((s) => s.skillId === 'zahlen.hundertertafel')).toBe(false);
    const practised = withSkills({ 'zahlen.hundertertafel#1': entry('geuebt', { optional: true }), 'zahlen.nachbarn#1': entry('geuebt') });
    expect(counts(mixed(practised, 3)).get('zahlen.hundertertafel')).toBeGreaterThan(0);
    const off = { ...practised, settings: { ...practised.settings, extras: false } };
    expect(mixed(off, 3).some((s) => s.skillId === 'zahlen.hundertertafel')).toBe(false);
  });

  it('is deterministic per rng seed and varies between seeds', () => {
    expect(mixed(emptyState(), 42)).toEqual(mixed(emptyState(), 42));
    const orders = new Set(Array.from({ length: 20 }, (_, seed) => mixed(emptyState(), seed).map((s) => s.skillId).join()));
    expect(orders.size).toBeGreaterThan(10);
  });

  it('handles tiny and huge topics', () => {
    expect(mixed(emptyState(), 1, [])).toEqual([]);
    const one = mixed(emptyState(), 1, [skillDef('zahlen.nachbarn')]);
    expect(one).toHaveLength(8);
    expect(one.every((s) => s.skillId === 'zahlen.nachbarn')).toBe(true);
    const twelve = Array.from({ length: 12 }, (_, i) => skillDef(`zahlen.s${i}`));
    const practisedAll: Record<string, StufeProgress> = {};
    twelve.forEach((s) => (practisedAll[`${s.id}#1`] = entry('geuebt')));
    const slots = mixed(withSkills(practisedAll), 9, twelve);
    expect(slots).toHaveLength(8);
    expect(new Set(slots.map((s) => s.skillId)).size).toBe(8);
  });
});

describe("plan 'review'", () => {
  const review = (state: ProgressState, seed = 1, skills = SKILLS) => buildRound({ mode: 'review' }, state, DAY, createRng(seed), skills);
  const due = (d: string, extra: Partial<StufeProgress> & { optional?: true } = {}) => entry('sicher', { box: 2, due: d, ...extra });
  const facts = (n: number) => {
    const f: Record<string, { box: number; due: string; seen: number; correct: number }> = {};
    ['2x7', '5x8', '2x9', '7x7', '1x9'].slice(0, n).forEach((k) => (f[k] = { box: 1, due: DAY, seen: 1, correct: 1 }));
    return f;
  };

  it('is empty when nothing is due', () => {
    const s = withSkills({ 'zahlen.nachbarn#1': due('2026-10-20'), 'zahlen.vergleichen#1': entry('geuebt') }, withFacts({ '2x7': { box: 2, due: '2026-10-22', seen: 2, correct: 2 } }));
    expect(review(s)).toEqual([]);
    expect(review(emptyState())).toEqual([]);
  });

  it('one due skill-Stufe gets 2 slots', () => {
    const slots = review(withSkills({ 'zahlen.nachbarn#2': due('2026-10-18') }));
    expect(slots).toEqual([
      { skillId: 'zahlen.nachbarn', stufe: 2, purpose: 'review' },
      { skillId: 'zahlen.nachbarn', stufe: 2, purpose: 'review' },
    ]);
  });

  it('the warm-up has 3 slots, the most overdue first, with a due fact as its own slot', () => {
    const s = withSkills(
      {
        'zahlen.nachbarn#2': due('2026-10-18'),
        'zahlen.vergleichen#1': due('2026-10-10'),
        'geometrie.flaechen#1': due('2026-10-19'),
        'daten.sicher-moeglich#3': due('2026-10-15'),
      },
      withFacts(facts(5)),
    );
    const slots = review(s);
    expect(REVIEW_MAX).toBe(3);
    expect(slots).toHaveLength(REVIEW_MAX);
    expect(slots.every((x) => x.purpose === 'review')).toBe(true);
    expect(noAdjacentRepeats(slots)).toBe(true);
    // the most overdue item opens the round (useful when the child stops early)
    expect(slots[0]).toEqual({ skillId: 'zahlen.vergleichen', stufe: 1, purpose: 'review' });
    expect(slots.filter(isFactSlot)).toHaveLength(1);
  });

  it('a due fact runs the skill that owns it, with the fact on the slot', () => {
    const s = withFacts({ '2x7': { box: 1, due: '2026-10-10', seen: 1, correct: 1 }, '5x8': { box: 1, due: '2026-10-11', seen: 1, correct: 1 } });
    expect(review(s)).toEqual([
      { skillId: MAL, stufe: 1, factKey: '2x7', purpose: 'review' },
      { skillId: MAL, stufe: 1, factKey: '5x8', purpose: 'review' },
    ]);
  });

  it('interleaves an overdue item with the fact slots, most overdue first', () => {
    const s = withSkills({ 'zahlen.vergleichen#1': due('2026-10-10') }, withFacts({ '2x7': { box: 1, due: DAY, seen: 1, correct: 1 } }));
    // 1 fact slot leaves room for 2 skill slots
    expect(review(s).map((x) => x.skillId)).toEqual(['zahlen.vergleichen', MAL, 'zahlen.vergleichen']);
  });

  it('many due items: capped at 3, at least one fact slot if facts are due', () => {
    const many: Record<string, StufeProgress> = {};
    for (let i = 0; i < 10; i++) many[`zahlen.s${i}#1`] = due(`2026-10-${String(i + 1).padStart(2, '0')}`);
    const s = withSkills(many, withFacts(facts(2)));
    const defs = [...Object.keys(many).map((k) => skillDef(k.split('#')[0])), ...FACT_SKILLS];
    const slots = review(s, 1, defs);
    expect(slots).toHaveLength(3);
    expect(slots.filter(isFactSlot)).toHaveLength(1);
    const expectedIds = dueReviews(s, DAY, 2).map((d) => d.skillId).sort();
    expect(slots.filter((x) => !isFactSlot(x)).map((x) => x.skillId).sort()).toEqual(expectedIds);
    expect(noAdjacentRepeats(slots)).toBe(true);
  });

  it('the cap of 5 is per day: a second warm-up gets the rest, then nothing more today, the rest comes tomorrow', () => {
    const many: Record<string, StufeProgress> = {};
    for (let i = 0; i < 12; i++) many[`zahlen.s${i}#1`] = due(`2026-10-${String(i + 1).padStart(2, '0')}`);
    const defs = Object.keys(many).map((k) => skillDef(k.split('#')[0]));
    let s = withSkills(many);
    const answerAll = (slots: RoundSlot[]) => {
      for (const slot of slots) s = applyAnswer(s, { skillId: slot.skillId, topicId: 'zahlen', stufe: slot.stufe, firstTry: true, solved: true, usedHint: false, purpose: 'review', day: DAY }).state;
    };
    const first = review(s, 1, defs);
    expect(first).toHaveLength(3);
    answerAll(first);
    expect(reviewBudget(s, DAY)).toBe(2);
    const second = review(s, 1, defs);
    expect(second).toHaveLength(2);
    answerAll(second);
    expect(s.reviewed).toEqual({ day: DAY, count: REVIEWS_PER_DAY });
    expect(reviewBudget(s, DAY)).toBe(0);
    // 7 skill-Stufen are still due, but today's 5 are done
    expect(dueReviews(s, DAY, 100)).toHaveLength(7);
    expect(review(s, 2, defs)).toEqual([]);
    // tomorrow the rest comes back
    const tomorrow = buildRound({ mode: 'review' }, s, addDays(DAY, 1), createRng(3), defs);
    expect(tomorrow.map((x) => x.skillId)).toEqual(['zahlen.s5', 'zahlen.s6', 'zahlen.s7']);
  });

  it('a budget of 1 still gives one slot, and a count from an earlier day does not limit today', () => {
    const s = withSkills({ 'zahlen.vergleichen#1': due('2026-10-10'), 'zahlen.nachbarn#1': due('2026-10-12') });
    expect(reviewBudget({ ...s, reviewed: { day: '2026-10-18', count: 5 } }, DAY)).toBe(REVIEWS_PER_DAY);
    expect(review({ ...s, reviewed: { day: DAY, count: 4 } })).toHaveLength(1);
  });

  it('facts only: as many slots as due facts, at most 3', () => {
    expect(review(withFacts(facts(2))).map((x) => x.factKey)).toEqual(['2x7', '5x8']);
    expect(review(withFacts(facts(5)))).toHaveLength(3);
    expect(review(withFacts(facts(5))).every((x) => x.stufe === 1)).toBe(true);
  });

  it('two Stufen of one skill are treated as one skill for interleaving', () => {
    const s = withSkills({ 'zahlen.nachbarn#1': due('2026-10-10'), 'zahlen.nachbarn#2': due('2026-10-11'), 'zahlen.vergleichen#1': due('2026-10-12') });
    const slots = review(s);
    expect(slots).toHaveLength(3);
    expect(counts(slots).get('zahlen.nachbarn')).toBe(2);
    expect(noAdjacentRepeats(slots)).toBe(true);
  });

  it('drops skills that no longer exist in a loaded topic and hidden optional extras; keeps skills of topics not loaded', () => {
    const s = withSkills({
      'zahlen.alt#1': due('2026-10-10'),
      'zahlen.hundertertafel#1': due('2026-10-10', { optional: true }),
      'sachaufgaben.zwei-schritte#1': due('2026-10-11'),
    });
    expect(new Set(review(s).map((x) => x.skillId))).toEqual(new Set(['zahlen.hundertertafel', 'sachaufgaben.zwei-schritte']));
    const off = { ...s, settings: { ...s.settings, extras: false } };
    expect(review(off).map((x) => x.skillId)).toEqual(['sachaufgaben.zwei-schritte', 'sachaufgaben.zwei-schritte']);
    // einmaleins loaded without the fact's skill → no fact slots
    expect(review(withFacts(facts(3)), 1, [skillDef('einmaleins.ableiten')])).toEqual([]);
  });

  it('a due square waits while extras are hidden', () => {
    const f = withFacts({ '7x7': { box: 1, due: DAY, seen: 1, correct: 1 } });
    expect(review(f)).toEqual([{ skillId: QUADRATE, stufe: 1, factKey: '7x7', purpose: 'review' }]);
    expect(review({ ...f, settings: { ...f.settings, extras: false } })).toEqual([]);
  });

  it('random states: ≤ 3 slots, only due items, every slot purpose review, no neighbours when separable, deterministic', () => {
    const rng = createRng(2024);
    const ids = ['zahlen.a', 'zahlen.b', 'geometrie.c', 'daten.d', 'groessen.e', 'plusminus.f'];
    for (let trial = 0; trial < 300; trial++) {
      const skills: Record<string, StufeProgress> = {};
      for (const id of ids) {
        for (const st of [1, 2, 3] as Stufe[]) {
          if (rng.chance(0.3)) skills[`${id}#${st}`] = due(`2026-10-${String(rng.int(10, 25)).padStart(2, '0')}`, { box: rng.int(1, 5) });
        }
      }
      const s = withSkills(skills, withFacts(facts(rng.int(0, 5))));
      // alternately with all topics loaded and with no topic loaded (nothing can be verified → keep)
      const defs = trial % 2 ? [...ids.map((id) => skillDef(id)), ...FACT_SKILLS] : [];
      const slots = review(s, trial, defs);
      expect(slots.length).toBeLessThanOrEqual(REVIEW_MAX);
      const dueIds = new Set(dueReviews(s, DAY, 100).map((d) => `${d.skillId}#${d.stufe}`));
      for (const x of slots) {
        expect(x.purpose).toBe('review');
        if (!isFactSlot(x)) expect(dueIds.has(`${x.skillId}#${x.stufe}`)).toBe(true);
      }
      if (dueIds.size > 0) expect(slots.length).toBeGreaterThan(0);
      if (slots.length > 0 && separable(slots)) expect(noAdjacentRepeats(slots), JSON.stringify(slots)).toBe(true);
      expect(review(s, trial, defs)).toEqual(slots);
    }
  });
});

describe('a fact review counts for the fact, not for the skill that supplies its task', () => {
  const NEXT = addDays(DAY, 1);
  const fact = { skillId: MAL, topicId: 'einmaleins' as const, factKey: '2x7' };
  const sicherOnStufe2 = () => {
    const s = createStore(null);
    for (let i = 0; i < 8; i++) s.recordAnswer(ev({ ...fact, stufe: 2, day: DAY }));
    expect(suggestedStufe(s.get(), MAL)).toBe(3);
    expect(mixedStufe(s.get(), MAL)).toBe(2);
    return s;
  };

  it('keeps the recommended and the mixed Stufe, and creates no Stufe 1 entry', () => {
    const s = sicherOnStufe2();
    const slots = buildRound({ mode: 'review' }, s.get(), NEXT, createRng(1), FACT_SKILLS);
    expect(slots).toContainEqual({ skillId: MAL, stufe: 1, factKey: '2x7', purpose: 'review' });
    const skills = s.get().skills;
    s.recordAnswer(ev({ ...fact, stufe: 1, purpose: 'review', factOnly: true, day: NEXT }));
    expect(s.get().skills).toEqual(skills);
    expect(s.get().skills[`${MAL}#1`]).toBeUndefined();
    expect(suggestedStufe(s.get(), MAL)).toBe(3);
    expect(mixedStufe(s.get(), MAL)).toBe(2);
    expect(s.get().lastPlayed).toEqual({ skillId: MAL, stufe: 2 });
  });

  it('still moves the fact and uses up the daily review budget', () => {
    const s = sicherOnStufe2();
    const before = s.get().facts['2x7'];
    s.recordAnswer(ev({ ...fact, stufe: 1, purpose: 'review', factOnly: true, day: NEXT }));
    expect(s.get().facts['2x7'].box).toBe(before.box + 1);
    expect(reviewBudget(s.get(), NEXT)).toBe(REVIEWS_PER_DAY - 1);
    expect(dueFacts(s.get(), NEXT)).not.toContain('2x7');
    expect(s.get().days).toContain(NEXT);
  });

  it('the twin of a fact review leaves the Stufe alone too', () => {
    const s = sicherOnStufe2();
    s.recordAnswer(ev({ ...fact, stufe: 1, purpose: 'twin', factOnly: true, day: NEXT }));
    expect(s.get().skills[`${MAL}#1`]).toBeUndefined();
    expect(s.get().growth.stufen[`${MAL}#1`]).toBeUndefined();
  });
});
