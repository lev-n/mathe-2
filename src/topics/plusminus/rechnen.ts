/**
 * Small helpers of the topic "Plus und Minus": terms, place values, number-line visuals and the skill wrapper.
 * Pure functions; randomness only through the Rng parameter.
 */
import { BOX, MINUS, speak } from '../../core/format';
import type { Ab, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, targetAb, type ExerciseBody } from '../shared';

export type Op = '+' | typeof MINUS;
export const PLUS_OP: Op = '+';
export const MINUS_OP: Op = MINUS;

export const term = (a: number | string, op: Op, b: number | string) => `${a} ${op} ${b}`;
export const plus = (a: number | string, b: number | string) => term(a, PLUS_OP, b);
export const minus = (a: number | string, b: number | string) => term(a, MINUS_OP, b);
export const rechne = (a: number, op: Op, b: number) => (op === PLUS_OP ? a + b : a - b);
export const gegen = (op: Op): Op => (op === PLUS_OP ? MINUS_OP : PLUS_OP);

/** The ones of a number: 37 → 7. */
export const einer = (n: number) => n % 10;
/** The full tens of a number: 37 → 30. */
export const zehner = (n: number) => n - (n % 10);
/** The next ten above a number: 37 → 40, 40 → 50. */
export const naechsterZehner = (n: number) => zehner(n) + 10;

/** Bug hint for a forgotten new ten: the ones x + y reach at least 10. */
export function neuerZehner(x: number, y: number): string {
  return `${plus(x, y)} ${x + y > 10 ? 'ist mehr als' : 'sind genau'} 10. Der Zehner wird größer.`;
}

/** The verb agrees with the number: 'Dann kommt noch 1 dazu', 'Dann kommen noch 3 dazu'. */
export const kommen = (n: number) => (n === 1 ? 'kommt' : 'kommen');
export const gehen = (n: number) => (n === 1 ? 'geht' : 'gehen');

/** A two-digit number with ones ≠ 0: tens digit in [minT, maxT], ones digit in [minE, maxE]. */
export function zweistellig(rng: Rng, minT: number, maxT: number, minE = 1, maxE = 9): number {
  return rng.int(minT, maxT) * 10 + rng.int(minE, maxE);
}

/**
 * Empty Rechenstrich through the given stops, one jump arc per step: rechenstrich([35, 40, 43]) draws + 5 and + 3.
 * Used in worked steps and as a scaffold; the stops must lie in 0–100. At most 3 stops: the line is drawn to scale, so with
 * more of them the labels of close stops overlap. Split a longer way over two lines.
 */
export function rechenstrich(stops: readonly number[]): Visual {
  const min = Math.min(...stops);
  const max = Math.max(...stops);
  const jumps = stops.slice(1).map((to, i) => {
    const from = stops[i];
    return { from, to, label: to > from ? plus('', to - from).trim() : minus('', from - to).trim() };
  });
  return { type: 'numberLine', min, max, majorStep: max - min, minorStep: max - min, labelMajor: false, labels: [...stops], jumps };
}

/** Number line around a ten with a tick for each number and an arrow on `start`; `start` is where the child begins. */
export function zehnerLinie(start: number, von: number): Visual {
  return { type: 'numberLine', min: von, max: von + 20, majorStep: 10, minorStep: 1, labelMajor: true, marks: [{ value: start, label: String(start) }] };
}

/** Number line 0–100 in tens with an arrow on `start`. */
export function hunderterLinie(start: number): Visual {
  return { type: 'numberLine', min: 0, max: 100, majorStep: 10, minorStep: 10, labelMajor: true, marks: [{ value: start, label: String(start) }] };
}

/** What a task of this topic fills in; the wrapper adds the AB level, the KMK tags and (by default) the spoken text. */
export type Task = Omit<ExerciseBody, 'ab' | 'kmk' | 'srText'> & { kmk?: string[]; srText?: string };

/**
 * The task forms of a skill. The Stufe chooses the content (catalogue columns S1–S3, docs/research.md §6, and the skill's `stufen`
 * label). The AB level varies the demand inside that content: AB I the most direct form, AB II harder numbers or a less direct
 * form, AB III reversed, gap or reasoning forms. Other places of the □ start on Stufe 2; two-sided equalities (F6) and planted
 * errors (§7.1) wait for Stufe 3. Stufe 3 is harder than Stufe 2, and Stufe 2 than Stufe 1, at each AB level.
 */
export type Formen = Readonly<Record<Stufe, Readonly<Record<Ab, readonly ((rng: Rng) => Task)[]>>>>;

interface PlusMinusSkill extends Pick<SkillDef, 'id' | 'title' | 'description' | 'stufen' | 'kmk'> {
  formen: Formen;
}

export function defineSkill(def: PlusMinusSkill): SkillDef {
  const { formen, ...meta } = def;
  const skill = { ...meta, topicId: 'plusminus' as const };
  return {
    ...skill,
    generate(rng, stufe, ctx) {
      const ab = targetAb(rng, stufe, ctx);
      const { kmk, srText, ...body } = rng.pick(formen[stufe][ab])(rng);
      return build(skill, stufe, {
        ...body,
        ab,
        kmk: kmk ?? def.kmk,
        srText: srText ?? speak([body.prompt, body.expression].filter(Boolean).join(' ')),
      });
    },
  };
}

/**
 * A gap inside a worked way: a + x + □ = c or a + □ + y = c (also with minus). The child rebuilds one step of the way, which stays
 * on the Stufe of the plain task. Each jump gets its own line: on one line the stops around a ten could overlap.
 */
export function wegLuecke(a: number, op: Op, x: number, y: number, teil: 'erster' | 'zweiter'): Task {
  const mitte = rechne(a, op, x);
  const c = rechne(mitte, op, y);
  const zweiter = teil === 'zweiter';
  const value = zweiter ? y : x;
  const pruefe = (w: number) => `Fast! Prüfe: ${term(term(a, op, zweiter ? x : w), op, zweiter ? w : y)} ist nicht ${c}.`;
  return {
    key: `weg:${teil}:${term(term(a, op, x), op, y)}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `${term(term(a, op, zweiter ? x : BOX), op, zweiter ? BOX : y)} = ${c}`,
    answer: { kind: 'number', value },
    hints: zweiter ? [`Rechne erst ${term(a, op, x)}.`, `Wie weit ist es von dort bis ${c}?`] : [`Rechne von hinten: ${term(c, gegen(op), y)}.`, `Wie weit ist es von ${a} bis dorthin?`],
    steps: zweiter
      ? [{ text: `Erst: ${term(a, op, x)} = ${mitte}`, visual: rechenstrich([a, mitte]) }, { text: `Dann: ${term(mitte, op, y)} = ${c}`, visual: rechenstrich([mitte, c]) }]
      : [{ text: `Von hinten: ${term(c, gegen(op), y)} = ${mitte}`, visual: rechenstrich([c, mitte]) }, { text: `Dann: ${term(a, op, x)} = ${mitte}`, visual: rechenstrich([a, mitte]) }],
    bugs: bugList(value, [
      ['platzhalter-summe', op === PLUS_OP ? a + (zweiter ? x : y) + c : a - (zweiter ? x : y) + c, op === PLUS_OP ? `Die ganze Seite ergibt ${c}. Wie viel fehlt bis ${c}?` : `Am Ende ${c === 1 ? 'bleibt' : 'bleiben'} ${c}. Wie viel geht noch weg?`],
      ['zaehlen-eins-daneben', value > 1 ? value - 1 : null, pruefe(value - 1)],
      ['zaehlen-eins-daneben', value + 1, pruefe(value + 1)],
    ]),
    praise: 'Du hast den Schritt im Weg gefunden.',
  };
}

/**
 * Which task gives this result? The wrong options change one number by 1 or by 10, so a child checks ones and tens. `passt` keeps the
 * options on the Stufe of the task (with or without a new ten). No wrong option has the result, so only one option is right.
 */
export function ergebnisWaehlen(rng: Rng, a: number, op: Op, b: number, passt: (x: number, y: number) => boolean, steps: Task['steps']): Task {
  const r = rechne(a, op, b);
  const nachbarn: [number, number][] = [[a, b - 1], [a, b + 1], [a, b - 10], [a, b + 10], [a - 10, b], [a + 10, b], [a - 1, b], [a + 1, b]];
  const wrongs = nachbarn
    .filter(([x, y]) => x >= 11 && x <= 100 && y >= 11 && y % 10 !== 0 && rechne(x, op, y) >= 1 && rechne(x, op, y) <= 100 && passt(x, y))
    .map(([x, y]) => ({ label: term(x, op, y), whyWrong: `Prüfe: ${term(x, op, y)} ist nicht ${r}.` }));
  return {
    key: `ergebnis:${term(a, op, b)}`,
    prompt: `Welche Aufgabe ergibt ${r}?`,
    answer: makeChoice(rng, { label: term(a, op, b) }, wrongs),
    hints: [`Schau zuerst auf die Einer von ${r}.`, 'Prüfe dann die Zehner.'],
    steps,
    praise: 'Du hast die passende Aufgabe erkannt.',
  };
}
