/**
 * Small helpers of the topic 'groessen': money collections, clock times in words, answers with pictures.
 * Pure (randomness only through the Rng parameter). Text rules: docs/research.md §4.
 */
import { fmtMoney, fmtTime } from '../../core/format';
import type { ChoiceAnswer, MultiField, OrderAnswer, Rng, Visual, VisualOf } from '../../core/types';

// ─── Money ───────────────────────────────────────────────────────────────────

export const COINS: readonly number[] = [1, 2, 5, 10, 20, 50, 100, 200];
export const NOTES: readonly number[] = [500, 1000, 2000, 5000, 10000];

export const sum = (items: readonly number[]) => items.reduce((a, b) => a + b, 0);
export const largestFirst = (items: readonly number[]) => [...items].sort((a, b) => b - a);

/** An amount that needs Euro and Cent together: 1 € 50 ct, not 50 ct or 2 € (F15: only at Stufe 3). */
export const isMixedAmount = (cents: number) => cents > 100 && cents % 100 !== 0;

/** The number printed on a coin or note: 200 → 2, 20 → 20. */
export const printedNumber = (cents: number) => (cents >= 100 ? cents / 100 : cents);

/** '20 ct + 10 ct + 5 ct' */
export const plusLine = (items: readonly number[]) => items.map((c) => fmtMoney(c)).join(' + ');

/** 'Du siehst 1 Schein zu 20 Euro, 2 Münzen zu 1 Euro.' for screen readers, in the order shown: a sorted list would state the answer of an order task. */
export function describeMoney(items: readonly number[]): string {
  const counts = new Map<number, number>();
  items.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
  const parts = [...counts.entries()]
    .map(([c, n]) => {
      const kind = c >= 500 ? (n === 1 ? 'Schein' : 'Scheine') : n === 1 ? 'Münze' : 'Münzen';
      return `${n} ${kind} zu ${c >= 100 ? `${c / 100} Euro` : `${c} Cent`}`;
    });
  return `Du siehst ${parts.join(', ')}.`;
}

/** Largest pieces first: the fewest pieces in the euro system. */
export function fewestPieces(amount: number, pieces: readonly number[] = [...NOTES, ...COINS]): number[] {
  const out: number[] = [];
  let rest = amount;
  for (const p of largestFirst(pieces)) {
    while (rest >= p) {
      out.push(p);
      rest -= p;
    }
  }
  return out;
}

/** `count` pieces from the pool with a total in [min, max] (largest pieces make the fallback). */
export function drawPieces(rng: Rng, pool: readonly number[], count: number, min: number, max: number): number[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const items = Array.from({ length: count }, () => rng.pick(pool));
    const total = sum(items);
    if (total >= min && total <= max) return items;
  }
  return fewestPieces(max, pool);
}

/** All ways to lay an amount with these pieces, at most maxPieces pieces each; every way has its largest piece first. */
export function waysToLay(amount: number, pieces: readonly number[], maxPieces = 8): number[][] {
  const sorted = largestFirst(pieces);
  const out: number[][] = [];
  const walk = (rest: number, from: number, way: number[]) => {
    if (rest === 0) {
      out.push(way);
      return;
    }
    if (way.length === maxPieces) return;
    for (let i = from; i < sorted.length; i++) if (sorted[i] <= rest) walk(rest - sorted[i], i, [...way, sorted[i]]);
  };
  walk(amount, 0, []);
  return out;
}

// ─── Answers with labels or pictures ─────────────────────────────────────────

/**
 * Order answer for values with their own labels ('2 €', '50 ct'): shown shuffled, never already in order. `shown` is the display order.
 * `instruction` is for items that are no quantities (months, weekdays): they have a sequence, not a smallest and a largest.
 */
export function labelledOrder(
  rng: Rng,
  values: readonly number[],
  label: (value: number) => string,
  direction: OrderAnswer['direction'],
  instruction?: string,
): { answer: OrderAnswer; shown: number[] } {
  const sorted = [...values].sort((a, b) => (direction === 'aufsteigend' ? a - b : b - a));
  let shown = rng.shuffle(values);
  if (shown.every((v, i) => v === sorted[i])) shown = [...shown.slice(1), shown[0]];
  return {
    answer: { kind: 'order', items: shown.map(label), correct: sorted.map((v) => shown.indexOf(v)), direction, ...(instruction ? { instruction } : {}) },
    shown,
  };
}

/** Choice between pictures, labelled A, B, C … in display order. `rightLabel` is for the worked steps. */
export function pictureChoice(
  rng: Rng,
  right: Visual,
  wrongs: readonly { visual: Visual; whyWrong: string }[],
): { answer: ChoiceAnswer; rightLabel: string } {
  const pool: { visual: Visual; whyWrong?: string }[] = rng.shuffle([{ visual: right }, ...wrongs]);
  const label = (i: number) => String.fromCharCode(65 + i);
  const options = pool.map((o, i) => ({ label: label(i), visual: o.visual, ...(o.whyWrong ? { whyWrong: o.whyWrong } : {}) }));
  const correct = pool.findIndex((o) => o.visual === right);
  return { answer: { kind: 'choice', options, correct, layout: 'grid' }, rightLabel: label(correct) };
}

// ─── Clock ───────────────────────────────────────────────────────────────────

const HOUR_WORDS = ['zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];

/** 13 → 1, 0 → 12 */
export function h12(h: number): number {
  const x = h % 12;
  return x === 0 ? 12 : x;
}

/** The hour as a word: hourWord(3) → 'drei', hourWord(13) → 'eins'. */
export const hourWord = (h: number) => HOUR_WORDS[h12(h)];

/** A time as children say it: spoken(3, 30) → 'halb vier', spoken(3, 45) → 'Viertel vor vier', spoken(1, 0) → 'ein Uhr'. */
export function spoken(h: number, m: number): string {
  const now = hourWord(h);
  const next = hourWord(h + 1);
  switch (m) {
    case 0: return h12(h) === 1 ? 'ein Uhr' : `${now} Uhr`;
    case 5: return `fünf nach ${now}`;
    case 10: return `zehn nach ${now}`;
    case 15: return `Viertel nach ${now}`;
    case 20: return `zwanzig nach ${now}`;
    case 30: return `halb ${next}`;
    case 40: return `zwanzig vor ${next}`;
    case 45: return `Viertel vor ${next}`;
    case 50: return `zehn vor ${next}`;
    case 55: return `fünf vor ${next}`;
    default: throw new RangeError(`spoken: no everyday form for minute ${m}`);
  }
}

/** The answer fields of a clock time: [3] : [30] Uhr. */
export function timeFields(h: number, m: number): MultiField[] {
  return [
    { id: 'h', value: h, after: ':', label: 'Stunden' },
    { id: 'min', value: m, after: 'Uhr', label: 'Minuten' },
  ];
}

/** The time `delta` minutes after h:m (delta may be negative), within one day. */
export function addMinutes(h: number, m: number, delta: number): [number, number] {
  const total = (h * 60 + m + delta + 1440) % 1440;
  return [Math.floor(total / 60), total % 60];
}

/** '3:30 Uhr' */
export const timeText = (h: number, m: number) => fmtTime(h, m);

/** The hands of a clock for screen readers: the data of the task, not the time in words. */
export function describeClock(h: number, m: number): string {
  const hour = m === 0 ? `Der kurze Zeiger zeigt auf die ${h12(h)}.` : `Der kurze Zeiger steht zwischen der ${h12(h)} und der ${h12(h + 1)}.`;
  return `${hour} Der lange Zeiger zeigt auf die ${m === 0 ? 12 : m / 5}.`;
}

// ─── Ruler ───────────────────────────────────────────────────────────────────

/** A ruler and its strips for screen readers. */
export function describeRuler(v: VisualOf<'ruler'>): string {
  const strip = (name: string, b: { startCm: number; lengthCm: number }) => `${name} beginnt bei ${b.startCm} cm und endet bei ${b.startCm + b.lengthCm} cm.`;
  const ruler = v.minCm ? `Das Lineal beginnt bei ${v.minCm} cm und geht bis ${v.maxCm} cm.` : `Lineal von 0 bis ${v.maxCm} cm.`;
  return v.second
    ? `${ruler} ${strip('Der obere Streifen', v.second)} ${strip('Der untere Streifen', v)}`
    : `${ruler} ${strip('Der Streifen', v)}`;
}
