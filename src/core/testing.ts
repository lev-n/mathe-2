/**
 * Shared invariant suite for exercise generators. Only imported by *.test.ts files.
 *
 * Usage in a topic test:
 *   import { describeSkill } from '../../core/testing';
 *   describeSkill(zerlegenSkill, { minDistinct: 30 });
 */
import { describe, expect, it } from 'vitest';
import { ALL_FACT_KEYS, factSkillId, isFactKey } from '../state/facts';
import { MAX_CHOICE_OPTIONS, MAX_MULTI_FIELDS, MAX_NUMBER, MAX_ORDER_ITEMS } from './age';
import { checkAnswer, correctResponse, responseForBug } from './check';
import { fmt } from './format';
import { createRng } from './rng';
import { clauseProblems, hintProblems, longWordProblems, numberWordProblems, NUMBER_WORD_SKILLS, praiseAndStepProblems, pronounProblems, taskTextProblems } from './textRules';
import { isKmkTag } from '../data/curriculum';
import type { Ab, Answer, Exercise, GenContext, SkillDef, Step, Stufe, Visual } from './types';
import { STUFEN } from './types';

export { wordCount, sentences } from './textRules';

/** Phrases that must never appear (docs/research.md §6.4 and M15). Matched case-insensitively as whole words. */
export const BANNED_PHRASES = [
  'falsch', 'leider', 'konzentrier', 'schlau', 'genie', 'naturtalent', 'perfekt', 'unglaublich', 'fantastisch',
  'weltklasse', 'zu langsam', 'so schnell', 'schon wieder', 'war doch einfach', 'alle anderen',
];

/**
 * Extra traps of improvement praise (docs/research.md M15 "Verbesserung", M16): pressure, inflation, comparison
 * with others and error framing. Checked on every improvement text (round notes, progress view, badges).
 */
export const IMPROVEMENT_BANNED_PHRASES = [
  ...BANNED_PHRASES,
  'endlich', 'na also', 'besser als', 'andere kinder', 'viel besser', 'keine fehler', 'nie wieder', 'fehlerfrei',
];

/** Whole number `shown` in `text`, not as a part of a longer number. */
function mentions(text: string, shown: string): boolean {
  return new RegExp(`(?<!\\d)${shown}(?!\\d)`).test(text);
}

const CONTEXTS: GenContext[] = [
  { extras: false, today: '2026-10-19' },
  { extras: true, today: '2026-10-19' },
];

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out));
  return out;
}

function allNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allNumbers(v, out));
  return out;
}

/** Answer limits for this age (docs/research.md §7.1; no comma key, §2.4 no decimal notation). */
export function assertAnswerLimits(answer: Answer, stufe: Stufe): void {
  switch (answer.kind) {
    case 'number':
      if (answer.offerUnsolvable) expect(stufe, '"Nicht lösbar" only on Stufe 3 (F17)').toBe(3);
      break;
    case 'choice':
      expect(answer.options.length, `at most ${MAX_CHOICE_OPTIONS[stufe]} options on Stufe ${stufe}`).toBeLessThanOrEqual(MAX_CHOICE_OPTIONS[stufe]);
      break;
    case 'order':
      expect(answer.items.length, `order: at most ${MAX_ORDER_ITEMS} items`).toBeLessThanOrEqual(MAX_ORDER_ITEMS);
      break;
    case 'multi':
      expect(answer.fields.length, `multi: at most ${MAX_MULTI_FIELDS} fields`).toBeLessThanOrEqual(MAX_MULTI_FIELDS);
      break;
    case 'numberline':
      expect(answer.min, 'number line below 0').toBeGreaterThanOrEqual(0);
      expect(answer.max, `number line above ${MAX_NUMBER}`).toBeLessThanOrEqual(MAX_NUMBER);
      break;
    case 'cells':
      // 6 columns of 49 px fit a 375 px phone (src/ui/answers/CellsInput.css)
      expect(answer.width, 'cells: at most 6 columns').toBeLessThanOrEqual(6);
      expect(answer.height, 'cells: at most 6 rows').toBeLessThanOrEqual(6);
      break;
    default:
      break;
  }
}

export function assertWellFormedAnswer(answer: Answer): void {
  switch (answer.kind) {
    case 'number':
      if (answer.value === null) expect(answer.offerUnsolvable, 'value null requires offerUnsolvable').toBe(true);
      else expect(Number.isFinite(answer.value)).toBe(true);
      if (answer.value !== null) expect(Number.isInteger(answer.value), `integer answer expected, got ${answer.value}`).toBe(true);
      break;
    case 'choice': {
      expect(answer.options.length).toBeGreaterThanOrEqual(2);
      expect(answer.options.length).toBeLessThanOrEqual(MAX_CHOICE_OPTIONS[3]);
      expect(answer.correct).toBeGreaterThanOrEqual(0);
      expect(answer.correct).toBeLessThan(answer.options.length);
      const labels = answer.options.map((o) => o.label + JSON.stringify(o.visual ?? null));
      expect(new Set(labels).size, `duplicate choice options: ${labels.join(' | ')}`).toBe(labels.length);
      expect(answer.options[answer.correct].whyWrong, 'correct option must not have whyWrong').toBeUndefined();
      break;
    }
    case 'multi': {
      expect(answer.fields.length).toBeGreaterThanOrEqual(1);
      expect(new Set(answer.fields.map((f) => f.id)).size).toBe(answer.fields.length);
      for (const f of answer.fields) {
        expect(Number.isFinite(f.value)).toBe(true);
        expect(Number.isInteger(f.value)).toBe(true);
      }
      break;
    }
    case 'cells': {
      const inside = (c: readonly [number, number]) => c[0] >= 0 && c[1] >= 0 && c[0] < answer.width && c[1] < answer.height;
      answer.given.forEach((c) => expect(inside(c)).toBe(true));
      answer.solution.forEach((c) => expect(inside(c)).toBe(true));
      expect(answer.solution.length).toBeGreaterThan(0);
      const given = new Set(answer.given.map((c) => c.join()));
      answer.solution.forEach((c) => expect(given.has(c.join()), 'solution overlaps given').toBe(false));
      break;
    }
    case 'numberline':
      expect(answer.value).toBeGreaterThanOrEqual(answer.min);
      expect(answer.value).toBeLessThanOrEqual(answer.max);
      expect(answer.step).toBeGreaterThan(0);
      expect(answer.max).toBeGreaterThan(answer.min);
      expect(Math.abs(((answer.value - answer.min) / answer.step) - Math.round((answer.value - answer.min) / answer.step))).toBeLessThan(1e-9);
      break;
    case 'order': {
      expect(answer.items.length).toBeGreaterThanOrEqual(2);
      expect([...answer.correct].sort((a, b) => a - b)).toEqual(answer.items.map((_, i) => i));
      break;
    }
  }
}

const inRange = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

/** Coins and notes of the Klasse-2 range, in Cent (1 ct to 100 €). */
const MONEY_ITEMS: ReadonlySet<number> = new Set([1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]);

/** Clock minutes by level (§2.2): full and half hours, then quarters, five-minute steps only at level 3. */
function clockMinutesAllowed(minutes: number, level: 1 | 2 | 3): boolean {
  if (level === 1) return minutes % 30 === 0;
  if (level === 2) return minutes % 15 === 0;
  return minutes % 5 === 0;
}

/**
 * A visual is complete and fits Klasse 2. `level` (the larger of Stufe and AB of the exercise, default 3) decides what the clock may show.
 */
export function assertWellFormedVisual(v: Visual, level: 1 | 2 | 3 = 3): void {
  switch (v.type) {
    case 'placeValue':
      v.rows.forEach((r) => {
        expect(r.values.length).toBe(v.columns.length);
        // 2 Z 14 E is a bundling task, so a cell may hold more than one digit.
        r.values.forEach((x) => expect(x === null || inRange(x, 0, MAX_NUMBER), `place value cell ${x}`).toBe(true));
      });
      break;
    case 'numberLine':
      expect(v.max).toBeGreaterThan(v.min);
      expect(v.min, 'number line below 0').toBeGreaterThanOrEqual(0);
      expect(v.max, `number line above ${MAX_NUMBER}`).toBeLessThanOrEqual(MAX_NUMBER);
      expect(v.minorStep).toBeGreaterThan(0);
      expect((v.max - v.min) / v.minorStep, 'too many ticks').toBeLessThanOrEqual(100);
      (v.marks ?? []).forEach((m) => {
        expect(m.value).toBeGreaterThanOrEqual(v.min);
        expect(m.value).toBeLessThanOrEqual(v.max);
      });
      (v.jumps ?? []).forEach((j) => {
        expect(inRange(j.from, v.min, v.max), `jump from ${j.from}`).toBe(true);
        expect(inRange(j.to, v.min, v.max), `jump to ${j.to}`).toBe(true);
        expect(j.from, 'a jump goes somewhere').not.toBe(j.to);
      });
      break;
    case 'field':
      expect([20, 100]).toContain(v.size);
      expect(inRange(v.filled, 0, v.size), `field filled ${v.filled}`).toBe(true);
      expect(inRange(v.filled + (v.second ?? 0), 0, v.size), 'field: filled + second above its size').toBe(true);
      if (v.split?.afterCol !== undefined) expect(inRange(v.split.afterCol, 1, 9), 'field: split column').toBe(true);
      if (v.split?.afterRow !== undefined) expect(inRange(v.split.afterRow, 1, v.size / 10 - 1), 'field: split row').toBe(true);
      break;
    case 'baseTen': {
      expect(inRange(v.tens, 0, 10), `baseTen tens ${v.tens}`).toBe(true);
      expect(inRange(v.ones, 0, MAX_NUMBER), `baseTen ones ${v.ones}`).toBe(true);
      const moreTens = v.second?.tens ?? 0;
      const moreOnes = v.second?.ones ?? 0;
      if (v.second?.mode === 'weg') {
        expect(moreTens, 'baseTen: crossed out more sticks than drawn').toBeLessThanOrEqual(v.tens);
        expect(moreOnes, 'baseTen: crossed out more cubes than drawn').toBeLessThanOrEqual(v.ones);
      }
      const total = v.tens * 10 + v.ones + (v.second?.mode === 'dazu' ? moreTens * 10 + moreOnes : 0);
      expect(total, `baseTen shows ${total}`).toBeLessThanOrEqual(MAX_NUMBER);
      break;
    }
    case 'hundredChart': {
      const cell = (n: number) => expect(inRange(n, 1, 100), `hundred chart cell ${n}`).toBe(true);
      (v.masked ?? []).forEach(cell);
      (v.marked ?? []).forEach(cell);
      (v.piece ?? []).forEach(cell);
      (v.replaced ?? []).forEach((r) => cell(r.cell));
      if (v.piece) {
        expect(v.piece.length, 'a cut-out piece has at most 16 cells').toBeLessThanOrEqual(16);
        // a piece hangs together: every cell has a neighbour in the piece
        const touches = (a: number, b: number) => Math.abs(a - b) === 10 || (Math.abs(a - b) === 1 && Math.floor((a - 1) / 10) === Math.floor((b - 1) / 10));
        if (v.piece.length > 1) v.piece.forEach((n) => expect(v.piece!.some((m) => touches(n, m)), `piece cell ${n} hangs alone`).toBe(true));
        (v.masked ?? []).forEach((n) => expect(v.piece, `masked cell ${n} outside the piece`).toContain(n));
      }
      break;
    }
    case 'dotArray':
      if ('groups' in v) {
        expect(v.groups.length).toBeGreaterThanOrEqual(1);
        v.groups.forEach((g) => expect(inRange(g, 1, 20), `group of ${g}`).toBe(true));
        expect(v.groups.reduce((a, b) => a + b, 0), 'more than 100 dots').toBeLessThanOrEqual(MAX_NUMBER);
      } else {
        expect(inRange(v.rows, 1, 10), `dot rows ${v.rows}`).toBe(true);
        expect(inRange(v.cols, 1, 10), `dot columns ${v.cols}`).toBe(true);
      }
      break;
    case 'barChart':
    case 'pictogram':
      expect(v.values.length).toBe(v.categories.length);
      v.values.forEach((x) => expect(inRange(x, 0, MAX_NUMBER), `data value ${x}`).toBe(true));
      break;
    case 'tally':
      v.rows.forEach((r) => expect(inRange(r.count, 0, 50), `tally count ${r.count}`).toBe(true));
      break;
    case 'table':
      v.rows.forEach((r) => expect(r.length, 'table row length').toBe(v.header.length));
      expect(v.header.length, 'at most 7 columns fit a phone').toBeLessThanOrEqual(7);
      break;
    case 'grid':
      v.cells.forEach((c) => {
        expect(c[0]).toBeLessThan(v.width);
        expect(c[1]).toBeLessThan(v.height);
      });
      (v.labels ?? []).forEach((l) => {
        expect(l.cell[0]).toBeLessThan(v.width);
        expect(l.cell[1]).toBeLessThan(v.height);
      });
      break;
    case 'shapeRow':
      expect(v.items.length).toBeGreaterThanOrEqual(1);
      break;
    case 'clock':
      expect(v.hours).toBeGreaterThanOrEqual(0);
      expect(v.hours).toBeLessThan(24);
      expect(v.minutes).toBeGreaterThanOrEqual(0);
      expect(v.minutes).toBeLessThan(60);
      expect(clockMinutesAllowed(v.minutes, level), `clock at minute ${v.minutes} on level ${level}`).toBe(true);
      break;
    case 'money':
      v.items.forEach((c) => expect(MONEY_ITEMS.has(c), `no such coin or note in Klasse 2: ${c} ct`).toBe(true));
      expect(v.items.length, 'too many pieces').toBeLessThanOrEqual(14);
      break;
    case 'ruler': {
      const from = v.minCm ?? 0;
      expect(inRange(v.maxCm, 1, 30), `ruler to ${v.maxCm} cm`).toBe(true);
      expect(inRange(from, 0, v.maxCm - 1), `ruler from ${from} cm`).toBe(true);
      for (const b of [v, ...(v.second ? [v.second] : [])]) {
        expect(inRange(b.startCm, from, v.maxCm), `object starts at ${b.startCm} cm`).toBe(true);
        expect(inRange(b.startCm + b.lengthCm, from, v.maxCm), `object ends at ${b.startCm + b.lengthCm} cm`).toBe(true);
        expect(b.lengthCm, 'an object has a length').toBeGreaterThan(0);
      }
      break;
    }
    default:
      break;
  }
}

function stepVisual(step: Step): Visual | undefined {
  return typeof step === 'string' ? undefined : step.visual;
}

/** All visuals of an exercise: the task, the options and the worked steps. */
function visualsOf(ex: Exercise): Visual[] {
  const out: Visual[] = [];
  if (ex.visual) out.push(ex.visual);
  if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => o.visual && out.push(o.visual));
  ex.steps.forEach((s) => {
    const v = stepVisual(s);
    if (v) out.push(v);
  });
  return out;
}

/** The strategy hints, bug hints and whyWrong texts of an exercise. */
function allHints(ex: Exercise): string[] {
  const whyWrong = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.whyWrong ? [o.whyWrong] : [])) : [];
  return [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...whyWrong];
}

/** The answers a hint must not state: whole numbers ≥ 10 (docs/research.md §6.1; for a multi answer, its field values). */
function revealableAnswers(answer: Answer): number[] {
  switch (answer.kind) {
    case 'number':
      return answer.value === null ? [] : [answer.value];
    case 'numberline':
      return [answer.value];
    case 'multi':
      return answer.fields.map((f) => f.value);
    case 'choice': {
      const label = answer.options[answer.correct].label.trim();
      return /^\d+$/.test(label) ? [Number(label)] : [];
    }
    default:
      return [];
  }
}

/**
 * Hints never give the result away: a hint must not mention an answer ≥ 10 as a whole number, unless the task itself shows
 * this number (8 + □ = 15 can say 15; the answer is another number then). safeHints() in src/topics/shared.ts filters this way.
 */
export function revealedAnswers(ex: Exercise): string[] {
  const task = [ex.context, ex.prompt, ex.expression].filter(Boolean).join(' ');
  const out: string[] = [];
  for (const value of revealableAnswers(ex.answer)) {
    if (Math.abs(value) < 10) continue;
    const shown = fmt(value);
    if (mentions(task, shown)) continue;
    for (const h of allHints(ex)) if (mentions(h, shown)) out.push(`hint reveals answer ${shown}: "${h}"`);
  }
  return out;
}

export function assertWellFormedExercise(skill: SkillDef, stufe: Stufe, ex: Exercise): void {
  expect(ex.skillId).toBe(skill.id);
  expect(ex.topicId).toBe(skill.topicId);
  expect(ex.stufe).toBe(stufe);
  expect([1, 2, 3]).toContain(ex.ab);
  expect(ex.key.length).toBeGreaterThan(0);
  expect(ex.key.startsWith(skill.id), `key must start with skill id: ${ex.key}`).toBe(true);
  expect(ex.prompt.trim().length).toBeGreaterThan(0);
  expect(ex.hints.length).toBeGreaterThanOrEqual(1);
  expect(ex.steps.length).toBeGreaterThanOrEqual(1);
  expect(ex.praise.trim().length).toBeGreaterThan(0);
  expect(ex.srText.trim().length).toBeGreaterThan(0);
  expect(ex.kmk.length).toBeGreaterThanOrEqual(1);
  ex.kmk.forEach((t) => expect(isKmkTag(t), `unknown KMK tag ${t}`).toBe(true));

  // Bug ids are internal (never shown to children), so they are exempt from the wording checks.
  const strings = allStrings({ ...ex, bugs: ex.bugs?.map(({ id: _id, ...shown }) => shown) });
  for (const s of strings) {
    expect(/\bundefined\b|\bNaN\b|\[object|\bInfinity\b/.test(s), `suspicious text: "${s}"`).toBe(false);
    const lower = s.toLowerCase();
    for (const banned of BANNED_PHRASES) {
      const re = new RegExp(`(^|[^a-zäöüß])${banned}([^a-zäöüß]|$)`);
      expect(re.test(lower), `banned phrase "${banned}" in "${s}"`).toBe(false);
    }
    expect(s.includes('×') || s.includes('÷'), `use · and : instead of × ÷ in "${s}"`).toBe(false);
    expect(/\d,\d/.test(s), `no comma notation in Klasse 2 (T10): "${s}"`).toBe(false);
  }
  allNumbers(ex).forEach((n) => expect(Number.isFinite(n), 'non-finite number in exercise').toBe(true));

  // Text rules (docs/research.md §4). Bug ids are not text; visuals hold labels, not sentences.
  const childTexts = [
    ...[ex.context, ex.prompt, ex.praise].filter((t): t is string => !!t),
    ...allHints(ex),
    ...ex.steps.map((step) => (typeof step === 'string' ? step : step.text)),
  ];
  const problems = [
    ...taskTextProblems(ex, stufe),
    ...allHints(ex).flatMap(hintProblems),
    ...praiseAndStepProblems(ex, stufe),
    ...clauseProblems(childTexts),
    ...longWordProblems(childTexts),
    ...pronounProblems([...childTexts, [ex.context, ex.prompt].filter(Boolean).join(' ')]),
    ...(NUMBER_WORD_SKILLS.has(skill.id) ? [] : numberWordProblems([...childTexts, ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label ?? '') : [])])),
    ...revealedAnswers(ex),
  ];
  expect(problems.length, `text rules in ${ex.key}:\n${problems.join('\n')}`).toBe(0);

  assertWellFormedAnswer(ex.answer);
  assertAnswerLimits(ex.answer, stufe);
  const level = Math.max(stufe, ex.ab) as 1 | 2 | 3;
  visualsOf(ex).forEach((v) => assertWellFormedVisual(v, level));
  if (ex.factKey !== undefined) expect(isFactKey(ex.factKey), `factKey ${ex.factKey} is not a tracked fact (use factKeyOf)`).toBe(true);

  // The correct response is accepted.
  const ok = checkAnswer(ex.answer, correctResponse(ex.answer), ex.bugs);
  expect(ok.correct, `correct response rejected for ${ex.key}: ${JSON.stringify(ok)}`).toBe(true);

  // Bugs never coincide with the correct answer and always produce their hint.
  for (const bug of ex.bugs ?? []) {
    const r = responseForBug(ex.answer, bug);
    if (!r) continue;
    const res = checkAnswer(ex.answer, r, ex.bugs);
    expect(res.correct, `bug ${bug.id} equals the correct answer in ${ex.key}`).toBe(false);
    expect(res.invalid, `bug ${bug.id} response is not parseable in ${ex.key}`).toBeUndefined();
    expect(res.bugHint, `bug ${bug.id} hint not returned`).toBeTruthy();
  }
}

export interface SkillSuiteOptions {
  /** Samples per Stufe and context (default 150). */
  samples?: number;
  /** Minimum number of distinct exercise keys per Stufe across samples (default 20). */
  minDistinct?: number | Partial<Record<Stufe, number>>;
  /** Stufen to test (default all). */
  stufen?: Stufe[];
}

/** Registers a vitest suite that checks every invariant above for one skill. */
export function describeSkill(skill: SkillDef, opts: SkillSuiteOptions = {}): void {
  const samples = opts.samples ?? 150;
  describe(`skill ${skill.id}`, () => {
    it('has complete metadata', () => {
      expect(skill.id.startsWith(skill.topicId + '.')).toBe(true);
      expect(skill.title.trim()).not.toBe('');
      expect(skill.description.trim()).not.toBe('');
      STUFEN.forEach((s) => expect(skill.stufen[s].trim()).not.toBe(''));
      expect(longWordProblems([skill.title, skill.description, ...STUFEN.map((s) => skill.stufen[s])])).toEqual([]);
      // Title and description come word for word from the catalogue (docs/research.md §6); the Stufen lines are ours.
      const stufenLines = STUFEN.map((s) => skill.stufen[s]);
      expect([...clauseProblems(stufenLines), ...pronounProblems(stufenLines), ...(NUMBER_WORD_SKILLS.has(skill.id) ? [] : numberWordProblems(stufenLines))]).toEqual([]);
      skill.kmk.forEach((t) => expect(isKmkTag(t), `unknown KMK tag ${t}`).toBe(true));
    });
    it('returns the planned AB level (GenContext.ab), and keeps every rule at each Stufe', () => {
      const AB_SAMPLES = Math.min(samples, 40);
      for (const stufe of opts.stufen ?? STUFEN) {
        for (const ab of [1, 2, 3] as Ab[]) {
          for (let seed = 1; seed <= AB_SAMPLES; seed++) {
            const ex = skill.generate(createRng(seed * 6271 + stufe * 31 + ab), stufe, { ...CONTEXTS[1], ab });
            expect(ex.ab, `${skill.id} Stufe ${stufe}, planned AB ${ab}`).toBe(ab);
            assertWellFormedExercise(skill, stufe, ex);
          }
        }
      }
    });
    const ownedFacts = ALL_FACT_KEYS.filter((k) => factSkillId(k) === skill.id);
    if (ownedFacts.length > 0) {
      it('returns the fact a review slot asks for (GenContext.factKey)', () => {
        for (const factKey of ownedFacts) {
          const ex = skill.generate(createRng(factKey.length * 17), 1, { ...CONTEXTS[1], factKey });
          expect(ex.factKey, factKey).toBe(factKey);
          assertWellFormedExercise(skill, 1, ex);
        }
      });
    }
    for (const stufe of opts.stufen ?? STUFEN) {
      it(`Stufe ${stufe}: ${samples} samples are well-formed, deterministic and varied`, () => {
        for (const ctx of CONTEXTS) {
          const keys = new Set<string>();
          for (let seed = 1; seed <= samples; seed++) {
            const ex = skill.generate(createRng(seed * 7919 + stufe), stufe, ctx);
            assertWellFormedExercise(skill, stufe, ex);
            keys.add(ex.key);
            if (seed <= 5) {
              const again = skill.generate(createRng(seed * 7919 + stufe), stufe, ctx);
              expect(JSON.stringify(again)).toBe(JSON.stringify(ex));
            }
          }
          const min = typeof opts.minDistinct === 'number' ? opts.minDistinct : (opts.minDistinct?.[stufe] ?? 20);
          expect(keys.size, `only ${keys.size} distinct exercises at Stufe ${stufe}`).toBeGreaterThanOrEqual(Math.min(min, samples));
        }
      });
    }
  });
}
