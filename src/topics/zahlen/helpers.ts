/** Small number and visual helpers of the topic 'zahlen'. Pure. */
import type { Ab, Bug, ChoiceAnswer, ChoiceOption, Exercise, MultiField, Rng, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import { targetAb } from '../shared';

/** One task form: it builds an exercise of this Stufe with this AB level. */
export type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;
/** The Stufe chooses the content (docs/research.md §6), the AB level the demand inside it. */
export type Forms = Readonly<Record<Stufe, Readonly<Record<Ab, readonly Form[]>>>>;

/** The generator of a skill: the planned AB level first, then one form of this Stufe and level. */
export const fromForms =
  (forms: Forms): SkillDef['generate'] =>
  (rng, stufe, ctx) => {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(forms[stufe][ab])(rng, stufe, ab);
  };

export const YES = 'Ja, das stimmt.';
export const NO = 'Nein, das stimmt nicht.';

/** Choice between pictures, named 'Bild A', 'Bild B', … after shuffling. */
export function pictureChoice(rng: Rng, correct: Visual, wrong: readonly { visual: Visual; whyWrong: string }[]): ChoiceAnswer {
  const right: ChoiceOption = { label: '', visual: correct };
  const shown = rng.shuffle<ChoiceOption>([right, ...wrong.map((w) => ({ label: '', visual: w.visual, whyWrong: w.whyWrong }))]);
  return { kind: 'choice', options: shown.map((o, i) => ({ ...o, label: `Bild ${String.fromCharCode(65 + i)}` })), correct: shown.indexOf(right), layout: 'grid' };
}

export const tensOf = (n: number) => Math.floor(n / 10);
export const onesOf = (n: number) => n % 10;
/** Zahlendreher: 34 → 43. */
export const swapDigits = (n: number) => onesOf(n) * 10 + tensOf(n);
export const isPasch = (n: number) => n >= 11 && n <= 99 && tensOf(n) === onesOf(n);
/** The Zahlendreher of a number, or null if turning its digits is no mistake to detect: 7, 40, 33 and 100 have none. */
export const dreherOf = (n: number): number | null => (n >= 12 && n <= 98 && onesOf(n) !== 0 && !isPasch(n) ? swapDigits(n) : null);

/** No 'Hör genau hin' (§5): outside `zahlen.zahlwort` the number is read from a picture or worked out, not heard. */
export const DREHER_HINT = 'Der Zehner steht vorne, der Einer hinten.';
/**
 * Swapped digits are a detected bug everywhere (docs/research.md F3). Put these last in a bug list: where another mistake gives
 * the same number, its more specific hint wins.
 */
export const dreherBug = (n: number): [string, number | null, string] => ['zahlendreher', dreherOf(n), DREHER_HINT];
/** The same for fields: a swapped field matches alone, as the other fields may be right. */
export const dreherFieldBugs = (fields: readonly MultiField[]): Bug[] =>
  fields.flatMap((f) => {
    const swapped = dreherOf(f.value);
    return swapped === null ? [] : [{ id: 'zahlendreher', match: { [f.id]: swapped }, hint: DREHER_HINT }];
  });

/** Stellenwerttafel with one row per number. */
export function placeValueOf(...numbers: number[]): VisualOf<'placeValue'> {
  return { type: 'placeValue', columns: ['Z', 'E'], rows: numbers.map((n) => ({ values: [tensOf(n), onesOf(n)] })) };
}

/** Zahlenstrahl from the ten below `from` to the ten above `to`, labelled at the tens, ticks every 1. */
export function tensLine(from: number, to: number): VisualOf<'numberLine'> {
  const min = tensOf(Math.min(from, to)) * 10;
  const top = Math.ceil(Math.max(from, to) / 10) * 10;
  return { type: 'numberLine', min, max: top > min ? top : min + 10, majorStep: 10, minorStep: 1, labelMajor: true };
}
