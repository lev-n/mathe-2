/**
 * Age rules for 7–8-year-olds that generators, planners and tests share (docs/research.md §4, §7.1, §7.3).
 * All numbers are heuristics, chosen to be checkable by a unit test. Pure and free of React and of the state code.
 */
import type { Ab, Rng, Stufe } from './types';

/** Items of a practice round (§7.3). The 3-item Einstiegs-Check counts inside the round. */
export const ROUND_SIZE = 8;

/** AB I/II/III items per round of a Stufe (§7.3): every Stufe keeps some harder items. */
export const AB_MIX: Readonly<Record<Stufe, readonly [ab1: number, ab2: number, ab3: number]>> = {
  1: [5, 2, 1],
  2: [3, 3, 2],
  3: [2, 4, 2],
};

/** The AB levels of the items of one round, easier items first. */
export function abSequence(stufe: Stufe): Ab[] {
  return AB_MIX[stufe].flatMap((n, i) => Array.from({ length: n }, () => (i + 1) as Ab));
}

/** An AB level drawn with the weights of AB_MIX (items outside a planned round, such as worksheets). */
export function drawAb(rng: Rng, stufe: Stufe): Ab {
  return rng.pick(abSequence(stufe));
}

/** Answer limits (§7.1). */
export const MAX_CHOICE_OPTIONS: Readonly<Record<Stufe, number>> = { 1: 4, 2: 4, 3: 6 };
export const MAX_ORDER_ITEMS = 5;
export const MAX_MULTI_FIELDS = 3;

/** Largest number a task works with (§2.2). */
export const MAX_NUMBER = 100;

/** Text limits (§4, T1–T4, T15). */
export const TEXT_LIMITS = {
  /** T1: words of a task without a story. */
  taskWords: 12,
  /** T2: words of a story task (an exercise with `context`). */
  storyWords: { 1: 20, 2: 25, 3: 30 } as Readonly<Record<Stufe, number>>,
  /** T3: sentences, including the question. */
  sentences: 3,
  /** T4: words per sentence. */
  sentenceWords: { 1: 10, 2: 10, 3: 12 } as Readonly<Record<Stufe, number>>,
  /** T15: a hint. */
  hintWords: 12,
  hintSentences: 2,
  /** T15: praise. */
  praiseWords: 8,
  /** T15: "one line each" for a worked step, counted in words (the proxy a test can check). */
  stepWords: 12,
  /** T15: worked steps on Stufe 1. */
  stepsStufe1: 3,
} as const;
