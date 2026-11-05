/**
 * Helpers of the Sachaufgaben generators: Antwortsatz, Rechenstrich for worked steps, whole-euro pieces, number pairs with and
 * without crossing a ten, and the hints of docs/research.md §5. Pure, randomness only through the Rng parameter.
 */
import { MINUS, NBSP, speak } from '../../core/format';
import type { NumberAnswer, Rng, Step, Visual, VisualOf } from '../../core/types';
import { mentionsNumber, plural } from '../shared';

export type BugCandidate = [id: string, match: number | null | undefined, hint: string];

/** Hints from docs/research.md §5, and one for the wrong operation. */
export const HINT_ALLE_ZAHLEN = 'Schau: Passt diese Frage zu den Zahlen im Text?';
/** Only where the result of a change is asked: with a hidden start or change, or a comparison, the true answer can support the wrong operation. */
export const HINT_SIGNALWORT = 'Stell dir die Geschichte vor. Wird es mehr oder weniger?';
export const HINT_RECHENART = 'Kommt in der Geschichte etwas dazu oder geht etwas weg?';
export const HINT_EINKAUF = 'Kann das stimmen? Denk an einen echten Einkauf.';
/** Only where there are no equal groups: it gives no reason against mal in a story with equal groups. */
export const HINT_GLEICH_GROSS = 'Mal geht nur bei gleich großen Gruppen.';
/** For two amounts side by side, where nothing comes or goes: HINT_RECHENART and HINT_SIGNALWORT have no true answer there. */
export const HINT_ZUSAMMEN = 'Gefragt sind beide Mengen zusammen.';
export const HINT_UNTERSCHIED = 'Gefragt ist der Unterschied, nicht alle zusammen.';

/**
 * Keeps the hints that do not name the answer as a whole number, also a small answer: safeHints lets those through. Without this,
 * 'Rechne von 8 aus 4 zurück.' would state the answer for these digits.
 */
export function hintsWithoutAnswer(hints: string[], value: number, fallback: string): string[] {
  const kept = hints.filter((h) => !mentionsNumber(h, String(value)));
  return kept.length ? kept : [fallback];
}

/** Number answer inside an Antwortsatz (docs/research.md §7.1). */
export function sentenceAnswer(value: number | null, before: string, after: string, label: string, extra: Partial<NumberAnswer> = {}): NumberAnswer {
  return { kind: 'number', value, before, after, label, ...extra };
}

/** The Antwortsatz as text: answerLine('Tom hat jetzt', 12, 'Sticker.') → 'Tom hat jetzt 12 Sticker.' */
export function answerLine(before: string, value: number, after: string): string {
  return `${before} ${value}${/^(€|cm|m|ct)(?=[ .])/.test(after) ? NBSP : ' '}${after}`;
}

/** A picture in words, with what the child sees (pictures and pieces, not their worth), so that counting stays the task. */
export function describePicture(v: Visual): string {
  if (v.type === 'pictogram') {
    const rows = v.categories.map((c, i) => {
      const pictures = v.values[i] / v.iconValue;
      return `${c}: ${pictures} ${plural(pictures, 'Bild', 'Bilder')}`;
    });
    return `Bilddiagramm ${v.title}. Ein Bild steht für ${v.iconValue}. ${rows.join('. ')}.`;
  }
  if (v.type === 'money') {
    const counts = new Map<number, number>();
    v.items.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
    const pieces = [...counts.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([c, k]) => `${k} ${c >= 500 ? plural(k, 'Schein', 'Scheine') : plural(k, 'Münze', 'Münzen')} zu ${c >= 100 ? `${c / 100} Euro` : `${c} Cent`}`);
    return `Du siehst ${pieces.join(', ')}.`;
  }
  return '';
}

/**
 * What the screen reader gets as the task (srText). `picture` is the visual of a task whose data is only in the
 * picture (T14): it comes first, so the question stays last (T7).
 */
export function spokenTask(context: string | undefined, prompt: string, picture?: Visual): string {
  return speak([picture ? describePicture(picture) : '', context, prompt].filter(Boolean).join(' '));
}

const WHOLE_EURO_PIECES = [5000, 2000, 1000, 500, 200, 100];

/** A whole-euro amount as notes and coins (values in Cent), largest first: 17 → 10 €, 5 €, 2 €. */
export function euroPieces(euros: number): number[] {
  let rest = euros * 100;
  const out: number[] = [];
  for (const piece of WHOLE_EURO_PIECES) {
    while (rest >= piece) {
      out.push(piece);
      rest -= piece;
    }
  }
  return out;
}

/** Width of the drawn line (NL.W − 2 · NL.PAD in src/ui/visuals/NumberLineVisual.tsx) and of a label such as '− 1' on it. */
const LINE_WIDTH = 340;
const JUMP_LABEL_WIDTH = 34;

/**
 * The stops of a Rechenstrich: first the tens of `delta`, then to the next ten, then the rest. The line is drawn to scale, so
 * after a large tens jump the two small jumps can be too narrow for their labels: then the ones are one jump.
 */
export function jumpPoints(start: number, delta: number): number[] {
  const sign = Math.sign(delta);
  const size = Math.abs(delta);
  const points = [start];
  let at = start;
  const tens = Math.floor(size / 10) * 10;
  if (tens > 0) {
    at += sign * tens;
    points.push(at);
  }
  const ones = size % 10;
  if (ones > 0) {
    const toTen = sign > 0 ? (10 - (at % 10)) % 10 : at % 10;
    // the labels sit in the middle of their jumps, half of the ones apart
    const labelsFit = ((ones / 2) * LINE_WIDTH) / size >= JUMP_LABEL_WIDTH;
    if (toTen > 0 && toTen < ones && labelsFit) {
      at += sign * toTen;
      points.push(at);
      at += sign * (ones - toTen);
    } else {
      at += sign * ones;
    }
    points.push(at);
  }
  return points;
}

/** An empty Rechenstrich with the jumps of start + delta. */
export function jumpLine(start: number, delta: number): VisualOf<'numberLine'> {
  const points = jumpPoints(start, delta);
  const min = Math.min(...points);
  const max = Math.max(...points);
  return {
    type: 'numberLine',
    min,
    max,
    majorStep: max - min,
    minorStep: max - min,
    labelMajor: false,
    labels: points,
    jumps: points.slice(1).map((to, i) => ({ from: points[i], to, label: `${to > points[i] ? '+' : MINUS} ${Math.abs(to - points[i])}` })),
  };
}

/** Worked step 'a + b = c' or 'a − b = c' with its Rechenstrich. */
export function calcStep(start: number, delta: number): Step {
  const sign = delta > 0 ? '+' : MINUS;
  return { text: `${start} ${sign} ${Math.abs(delta)} = ${start + delta}`, visual: jumpLine(start, delta) };
}

/** a + b crossing a ten, both ones not 0, the sum ≤ 99. minTensB 1 makes b a two-digit number. */
export function crossingSum(rng: Rng, minTensB = 0): [number, number] {
  const oa = rng.int(2, 9);
  const ob = rng.int(11 - oa, 9);
  const ta = rng.int(1, 6);
  const tb = rng.int(minTensB, Math.min(3, 8 - ta));
  return [ta * 10 + oa, tb * 10 + ob];
}

/** a − b crossing a ten: the ones of a are smaller, and not 0. The result is ≥ 2. minTensB 1 makes b a two-digit number. */
export function crossingDifference(rng: Rng, minTensB = 0): [number, number] {
  const ob = rng.int(2, 9);
  const oa = rng.int(1, ob - 1);
  const ta = rng.int(minTensB + 1, 9);
  const tb = rng.int(minTensB, ta - 1);
  return [ta * 10 + oa, tb * 10 + ob];
}

/** A two-digit number plus a one-digit number, crossing a ten: 35 + 8. The sum is ≤ 98. */
export function crossingSumOnes(rng: Rng): [number, number] {
  const oa = rng.int(2, 9);
  const ob = rng.int(11 - oa, 9);
  return [rng.int(1, 8) * 10 + oa, ob];
}

/** A two-digit number minus a one-digit number, crossing a ten: 43 − 7. */
export function crossingDifferenceOnes(rng: Rng): [number, number] {
  const ob = rng.int(2, 9);
  const oa = rng.int(1, ob - 1);
  return [rng.int(2, 9) * 10 + oa, ob];
}

/** A two-digit number plus a one-digit number within the same ten: 34 + 5. */
export function plainSumOnes(rng: Rng): [number, number] {
  const oa = rng.int(1, 6);
  const ob = rng.int(2, 9 - oa);
  return [rng.int(1, 8) * 10 + oa, ob];
}

/** A two-digit number minus a one-digit number within the same ten: 38 − 5. */
export function plainDifferenceOnes(rng: Rng): [number, number] {
  const oa = rng.int(3, 9);
  const ob = rng.int(2, oa - 1);
  return [rng.int(2, 9) * 10 + oa, ob];
}

/** Up to 20, within a ten: 12 + 5, 3 + 4. */
export function plainSumTo20(rng: Rng): [number, number] {
  const oa = rng.int(2, 8);
  const ob = rng.int(2, Math.max(2, 10 - oa));
  return [rng.int(0, 1) * 10 + oa, ob];
}

/** Up to 20, within a ten: 17 − 5, 8 − 3. The result is ≥ 2. */
export function plainDifferenceTo20(rng: Rng): [number, number] {
  const oa = rng.int(4, 9);
  const ob = rng.int(2, oa - 2);
  return [rng.int(0, 1) * 10 + oa, ob];
}

/** Up to 20, over the ten: 8 + 5. */
export function crossingSumTo20(rng: Rng): [number, number] {
  const a = rng.int(3, 9);
  return [a, rng.int(11 - a, 9)];
}

/** Up to 20, over the ten: 13 − 5. */
export function crossingDifferenceTo20(rng: Rng): [number, number] {
  const b = rng.int(3, 9);
  return [10 + rng.int(1, b - 1), b];
}

/** The ten is forgotten: 35 + 8 = 33; 38 + 27 = 55 (docs/research.md §5). Only where the ones cross a ten. */
export function zehnerVergessen(a: number, b: number): BugCandidate {
  const oa = a % 10;
  const ob = b % 10;
  return ['zehner-vergessen', oa + ob > 10 ? a + b - 10 : null, `${oa} + ${ob} ist mehr als 10. Der Zehner wird größer.`];
}

/** Smaller ones taken from larger ones: 43 − 7 = 44; 62 − 27 = 45 (docs/research.md §5). Only where the ones cross a ten. */
export function kleinerVonGroesser(a: number, b: number): BugCandidate {
  const oa = a % 10;
  const ob = b % 10;
  const match = oa > 0 && oa < ob ? (Math.floor(a / 10) - Math.floor(b / 10)) * 10 + (ob - oa) : null;
  // 14 − 7: the hint must not name 7 or 4 where one of them is the result
  const namesResult = [oa, ob, a].includes(a - b);
  return ['kleiner-von-groesser', match, namesResult ? 'Die Einer reichen nicht. Rechne erst bis zum Zehner, dann weiter.' : `${oa} ${MINUS} ${ob} geht nicht. Rechne erst ${a} ${MINUS} ${oa}, dann weiter.`];
}
