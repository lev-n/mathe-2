/**
 * Round planning (docs/research.md L2 spacing, L3 interleaving).
 * Pure and deterministic for a given rng state.
 */
import { ROUND_SIZE, abSequence } from '../core/age';
import type { Rng, SkillDef, Stufe, TopicId } from '../core/types';
import { factSkillId } from './facts';
import { dueFacts, dueReviews, practisedStufe, reviewBudget, stufeProgress, suggestedStufe } from './selectors';
import type { Day, PracticePlan, ProgressState, RoundSlot } from './types';

export { ROUND_SIZE };
/** Max. number of Zwillingsaufgaben inserted per round after a 2nd wrong attempt. */
export const MAX_TWINS = 2;
/** The warm-up "Heute wiederholen" has 3 items; a further round today only gets the rest of REVIEWS_PER_DAY (5). */
export const REVIEW_MAX = 3;
/** Up to 3 Einmaleins slots in a review round when facts are due. */
export const REVIEW_FACT_SLOTS = 3;

/** One slot still to place. */
type Seed = Pick<RoundSlot, 'stufe' | 'factKey'>;

interface Group {
  id: string;
  /** Slots still to place, in order. */
  queue: Seed[];
}

/**
 * After placing one slot of `picked`, can the remaining slots still be ordered without two
 * neighbours from the same group? (Exact condition: with r slots left and the next slot not
 * allowed to be `picked`, `picked` fits at most ⌊r/2⌋ more times, every other group ⌈r/2⌉.)
 */
function stillSeparable(open: readonly Group[], picked: Group): boolean {
  const left = open.reduce((n, g) => n + g.queue.length, 0) - 1;
  return open.every((g) => {
    const n = g.queue.length - (g === picked ? 1 : 0);
    return n <= (g === picked ? Math.floor(left / 2) : Math.ceil(left / 2));
  });
}

/**
 * Orders the groups' slots so that no two consecutive slots share a group id whenever that is
 * possible. At each step `choose` picks among the groups that keep this possible (in insertion
 * order: priority order for reviews, a random pick for mixed practice). If the slots cannot be
 * separated at all, the group with the most remaining slots goes first to keep runs short.
 */
function interleave(groups: Group[], choose: (candidates: Group[]) => Group): (Seed & { id: string })[] {
  const out: (Seed & { id: string })[] = [];
  let prev: string | undefined;
  for (;;) {
    const open = groups.filter((g) => g.queue.length > 0);
    if (open.length === 0) return out;
    const others = open.filter((g) => g.id !== prev);
    const safe = others.filter((g) => stillSeparable(open, g));
    let g: Group;
    if (safe.length > 0) g = choose(safe);
    else {
      const pool = others.length > 0 ? others : open;
      const most = Math.max(...pool.map((c) => c.queue.length));
      g = choose(pool.filter((c) => c.queue.length === most));
    }
    out.push({ id: g.id, ...g.queue.shift()! });
    prev = g.id;
  }
}

/**
 * Stufe used for a skill in mixed practice: the suggested Stufe once the child has worked on it,
 * otherwise the Stufe the child has practised (so mixed practice does not open a new Stufe),
 * otherwise the suggested Stufe (Stufe 1 for a new skill, docs/research.md §7.1).
 */
export function mixedStufe(state: ProgressState, skillId: string): Stufe {
  const suggested = suggestedStufe(state, skillId);
  if ((stufeProgress(state, skillId, suggested)?.attempts ?? 0) > 0) return suggested;
  return practisedStufe(state, skillId) ?? suggested;
}

function buildMixed(topicId: TopicId, state: ProgressState, rng: Rng, skills: readonly SkillDef[]): RoundSlot[] {
  const isPractised = (s: SkillDef) => practisedStufe(state, s.id) !== undefined;
  // Extras are visible by default, but not every Land teaches them: mixed rounds use only those the child has chosen to practise.
  const eligible = skills.filter((s) => s.topicId === topicId && (!s.optional || (state.settings.extras && isPractised(s))));
  if (eligible.length === 0) return [];
  const practised = rng.shuffle(eligible.filter(isPractised));
  const fresh = rng.shuffle(eligible.filter((s) => !isPractised(s)));
  // Prefer skills the child has already worked on; fall back to the whole topic if fewer than 2.
  const chosen = (practised.length >= 2 ? practised : [...practised, ...fresh]).slice(0, ROUND_SIZE);
  const base = Math.floor(ROUND_SIZE / chosen.length);
  const extra = ROUND_SIZE % chosen.length;
  const groups: Group[] = chosen.map((s, i) => {
    const stufe = mixedStufe(state, s.id);
    return { id: s.id, queue: Array.from({ length: base + (i < extra ? 1 : 0) }, () => ({ stufe })) };
  });
  return interleave(groups, (candidates) => rng.pick(candidates)).map(({ id, stufe }) => ({ skillId: id, stufe, purpose: 'mixed' }));
}

/** A due item can be built if its topic is not loaded (unknown) or the loaded topic still has the skill. */
function makeAvailable(state: ProgressState, skills: readonly SkillDef[]): (skillId: string) => boolean {
  const loadedTopics = new Set(skills.map((s) => s.topicId as string));
  return (skillId) => {
    const def = skills.find((s) => s.id === skillId);
    if (def) return !def.optional || state.settings.extras;
    return !loadedTopics.has(skillId.split('.')[0]);
  };
}

function buildReview(state: ProgressState, day: Day, skills: readonly SkillDef[]): RoundSlot[] {
  // The cap is per day: review answers already given today use it up (a 2nd round only gets the rest).
  const max = Math.min(REVIEW_MAX, reviewBudget(state, day));
  if (max <= 0) return [];
  const available = makeAvailable(state, skills);
  const items = dueReviews(state, day, Number.MAX_SAFE_INTEGER)
    .filter((i) => available(i.skillId))
    .slice(0, max);
  const facts = dueFacts(state, day).filter((k) => available(factSkillId(k)));
  const wantFacts = Math.min(REVIEW_FACT_SLOTS, facts.length);
  // Due skill-Stufen come first; facts give way down to one slot when many skill-Stufen are due.
  const factSlots = items.length + wantFacts > max ? Math.max(Math.min(1, wantFacts), max - items.length) : wantFacts;
  const capacity = max - factSlots;
  const singles = items.slice(0, capacity);
  const doubles = Math.min(singles.length, capacity - singles.length);

  const groups: Group[] = [];
  const groupOf = (id: string): Group => {
    let g = groups.find((x) => x.id === id);
    if (!g) groups.push((g = { id, queue: [] }));
    return g;
  };
  // Groups are per skill (not per Stufe) so two Stufen of one skill are not placed back to back either.
  singles.forEach((item, i) => {
    const g = groupOf(item.skillId);
    g.queue.push({ stufe: item.stufe });
    if (i < doubles) g.queue.push({ stufe: item.stufe });
  });
  // A due fact runs the skill that owns it, with the fact as GenContext.factKey. Stufe 1 only names the plain form: the answer counts for the fact alone.
  for (const factKey of facts.slice(0, factSlots)) groupOf(factSkillId(factKey)).queue.push({ stufe: 1, factKey });
  // Most overdue first wherever the interleaving allows it (groups are in priority order).
  return interleave(groups, (candidates) => candidates[0]).map(({ id, ...seed }) => ({ skillId: id, ...seed, purpose: 'review' }));
}

/**
 * Build the slots of one round.
 * - 'skill': ROUND_SIZE practice slots of one skill-Stufe with the AB mix of the Stufe (src/core/age.ts), easier items first.
 * - 'mixed': ROUND_SIZE slots over the topic's skills (optional extras only once practised), preferring skills the
 *   child has practised, at their practised/suggested Stufe, never the same skill twice in a row
 *   when the topic offers ≥ 2 skills. Each generator draws its AB level with the weights of the slot's Stufe.
 * - 'review': a warm-up of up to REVIEW_MAX slots, and at most REVIEWS_PER_DAY a day (review answers already given today
 *   count), 1–2 per due skill-Stufe (most overdue first) plus Einmaleins slots if facts are due, interleaved;
 *   [] if nothing is due or today's 5 are done.
 * @param skills all SkillDefs of the topics involved (the UI loads the topic modules first).
 */
export function buildRound(plan: PracticePlan, state: ProgressState, day: Day, rng: Rng, skills: SkillDef[]): RoundSlot[] {
  switch (plan.mode) {
    case 'skill':
      return abSequence(plan.stufe).map((ab) => ({ skillId: plan.skillId, stufe: plan.stufe, purpose: 'practice' as const, ab }));
    case 'mixed':
      return buildMixed(plan.topicId, state, rng, skills);
    case 'review':
      return buildReview(state, day, skills);
  }
}
