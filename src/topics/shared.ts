/**
 * Generic helpers for the generators of every topic: bug lists, choice and order answers, hint safety, spoken text,
 * small grammar helpers, the exercise builder and first names. Topics import from here, never from another topic's
 * directory (src/topics/contract.test.ts). Pure functions only (no React, randomness only through the Rng parameter).
 */
import { drawAb } from '../core/age';
import { fmt } from '../core/format';
import type { Ab, Bug, ChoiceAnswer, ChoiceOption, Exercise, GenContext, MultiField, OrderAnswer, Rng, SkillDef, Stufe } from '../core/types';

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** true if a child can type x: a whole number. */
function typeable(x: number): boolean {
  return Number.isInteger(x) && x >= 0;
}

// ─── AB level ────────────────────────────────────────────────────────────────

/**
 * The AB level a generator builds for: GenContext.ab when the round planned one, otherwise a draw with the weights of
 * the Stufe's AB mix (worksheets, mixed and review rounds). Set Exercise.ab to this value. The Stufe chooses the content (the
 * catalogue columns S1, S2, S3, docs/research.md §6); this level varies the demand inside that content. Keep the limits of `stufe`
 * as well (for example the number of choice options, src/core/age.ts).
 */
export function targetAb(rng: Rng, stufe: Stufe, ctx: Pick<GenContext, 'ab'>): Ab {
  return ctx.ab ?? drawAb(rng, stufe);
}

// ─── Bugs ────────────────────────────────────────────────────────────────────

type BugMatch = number | Record<string, number>;

function sameMatch(a: Bug['match'], b: BugMatch): boolean {
  if (Array.isArray(a)) return false;
  if (typeof a === 'number' || typeof b === 'number') return a === b;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

/**
 * Build a bug list: skips missing/invalid matches, matches equal to the correct answer and duplicates.
 * For record matches, `correct` must hold all field values.
 */
export function bugList(correct: BugMatch, candidates: [id: string, match: BugMatch | null | undefined, hint: string][]): Bug[] {
  const out: Bug[] = [];
  for (const [id, match, hint] of candidates) {
    if (match === null || match === undefined) continue;
    if (typeof match === 'number' && (!Number.isFinite(match) || match < 0 || !Number.isInteger(match))) continue;
    if (sameMatch(match, correct)) continue;
    if (out.some((b) => sameMatch(b.match, match))) continue;
    out.push({ id, match, hint });
  }
  return out;
}

export type MaybeBug = Bug | null | undefined | false;

/**
 * Keep only bugs that make sense for a number answer: typeable, different from the correct value and from earlier bugs.
 */
export function numberBugs(bugs: MaybeBug[], correct: number | null): Bug[] {
  const out: Bug[] = [];
  const seen = new Set<number>();
  for (const b of bugs) {
    if (!b || typeof b.match !== 'number') continue;
    if (!typeable(b.match)) continue;
    const m = b.match;
    if (m === correct) continue;
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(b);
  }
  return out;
}

/** Same for multi answers: every matched field exists, values are typeable, and at least one field differs. */
export function multiBugs(bugs: MaybeBug[], fields: MultiField[]): Bug[] {
  const out: Bug[] = [];
  const seen = new Set<string>();
  for (const b of bugs) {
    if (!b || typeof b.match !== 'object' || Array.isArray(b.match)) continue;
    const m = b.match;
    const keys = Object.keys(m);
    if (keys.length === 0) continue;
    let ok = true;
    let differs = false;
    for (const k of keys) {
      const f = fields.find((x) => x.id === k);
      if (!f || !typeable(m[k])) ok = false;
      else if (m[k] !== f.value) differs = true;
    }
    if (!ok || !differs) continue;
    const sig = JSON.stringify(fields.map((f) => (f.id in m ? m[f.id] : f.value)));
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(b);
  }
  return out;
}

// ─── Answers ─────────────────────────────────────────────────────────────────

/** Order answer for distinct numbers, shown shuffled (never already in the target order). */
export function orderAnswer(rng: Rng, values: number[], direction: 'aufsteigend' | 'absteigend'): OrderAnswer {
  const sorted = [...values].sort((a, b) => (direction === 'aufsteigend' ? a - b : b - a));
  let shown = rng.shuffle(values);
  if (shown.every((v, i) => v === sorted[i])) shown = [...shown.slice(1), shown[0]];
  return {
    kind: 'order',
    items: shown.map((v) => fmt(v)),
    correct: sorted.map((v) => shown.indexOf(v)),
    direction,
  };
}

export interface ChoiceOpts {
  layout?: ChoiceAnswer['layout'];
  /** Total number of options (default 4). */
  max?: number;
  /** Keep this fixed label order instead of shuffling (e.g. ['<', '>', '=']). */
  order?: string[];
}

/** Build a choice answer: de-duplicates labels, caps the count, shuffles with rng. */
export function makeChoice(rng: Rng, correct: ChoiceOption, wrongs: ChoiceOption[], opts: ChoiceOpts = {}): ChoiceAnswer {
  const seen = new Set<string>([correct.label]);
  const ws: ChoiceOption[] = [];
  for (const w of wrongs) {
    if (seen.has(w.label)) continue;
    seen.add(w.label);
    ws.push(w);
  }
  const chosen = ws.slice(0, (opts.max ?? 4) - 1);
  const right: ChoiceOption = { label: correct.label, ...(correct.visual ? { visual: correct.visual } : {}) };
  let all: ChoiceOption[];
  if (opts.order) {
    const pool = [right, ...chosen];
    all = opts.order.map((l) => pool.find((o) => o.label === l)).filter((o): o is ChoiceOption => !!o);
  } else {
    all = rng.shuffle([right, ...chosen]);
  }
  const answer: ChoiceAnswer = { kind: 'choice', options: all, correct: all.indexOf(right) };
  if (opts.layout) answer.layout = opts.layout;
  return answer;
}

// ─── Hints ───────────────────────────────────────────────────────────────────

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** true if `text` contains the number `shown` as a whole number (not as part of a longer one). */
export function mentionsNumber(text: string, shown: string): boolean {
  return new RegExp(`(?<!\\d)${escapeRe(shown)}(?!\\d)`).test(text);
}

/**
 * Hints must never give the answer away. Drops hints that mention the answer
 * (≥ 100: any occurrence, as the shared test suite checks; 10–99: as a whole number).
 */
export function safeHints(hints: string[], value: number | null | undefined, fallback: string): string[] {
  if (value === null || value === undefined || Math.abs(value) < 10) return hints.length ? hints : [fallback];
  const form = fmt(value);
  const strict = Math.abs(value) >= 100;
  const ok = hints.filter((h) => !(strict ? h.includes(form) : mentionsNumber(h, form)));
  return ok.length ? ok : [fallback];
}

// ─── Speech ──────────────────────────────────────────────────────────────────

export { speak } from '../core/format';

// ─── Small grammar helpers ───────────────────────────────────────────────────

/** Singular for exactly 1, plural otherwise: plural(1, 'Stunde', 'Stunden') → 'Stunde'. */
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** German list: ['a', 'b', 'c'] → 'a, b und c'. */
export function joinDe(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

// ─── Exercise builder ────────────────────────────────────────────────────────

export type ExerciseBody = Omit<Exercise, 'topicId' | 'skillId' | 'stufe'>;

/** Fill in topic/skill/stufe and prefix the key with '<skillId>:<stufe>:'. */
export function build(skill: Pick<SkillDef, 'id' | 'topicId'>, stufe: Stufe, body: ExerciseBody): Exercise {
  const { key, ...rest } = body;
  const ex: Exercise = { key: `${skill.id}:${stufe}:${key}`, topicId: skill.topicId, skillId: skill.id, stufe, ...rest };
  if (ex.bugs && ex.bugs.length === 0) delete ex.bugs;
  return ex;
}

// ─── Names (short, with regular spelling: T12) ──────────────────────────────

export interface Person {
  name: string;
  /** 'sie' or 'er' */
  p: 'sie' | 'er';
}

export const PEOPLE: readonly Person[] = [
  { name: 'Tom', p: 'er' }, { name: 'Mia', p: 'sie' }, { name: 'Ali', p: 'er' }, { name: 'Lea', p: 'sie' },
  { name: 'Ben', p: 'er' }, { name: 'Ida', p: 'sie' }, { name: 'Emil', p: 'er' }, { name: 'Lena', p: 'sie' },
  { name: 'Finn', p: 'er' }, { name: 'Nele', p: 'sie' }, { name: 'Paul', p: 'er' }, { name: 'Elif', p: 'sie' },
  { name: 'Can', p: 'er' }, { name: 'Sara', p: 'sie' }, { name: 'Omar', p: 'er' }, { name: 'Lina', p: 'sie' },
];

export function pickPerson(rng: Rng): Person {
  return rng.pick(PEOPLE);
}

/** Two different people. */
export function pickTwo(rng: Rng): [Person, Person] {
  const [a, b] = rng.sample(PEOPLE, 2);
  return [a, b];
}

