/**
 * Verdoppeln und Halbieren: Stufe 1 doubles to 10 and halves to 20, Stufe 2 doubles to 50 and halves to 100, Stufe 3 odd tens and
 * double plus one (docs/research.md §5, §6). Dots for small numbers; base-ten material where a dot array no longer fits (at most
 * 10 rows or columns, groups of at most 20). The halves of 30, 50, 70, 90 stay on Stufe 3: Stufe 2 leaves them out.
 */
import { BOX } from '../../core/format';
import type { Rng, Visual } from '../../core/types';
import { bugList } from '../shared';
import { defineSkill, einer, neuerZehner, plus, zehner, type Formen, type Task } from './rechnen';

const doppeltBild = (n: number): Visual =>
  n <= 10 ? { type: 'dotArray', rows: 2, cols: n, splitAfterRow: 1 } : n <= 20 ? { type: 'dotArray', groups: [n, n] } : { type: 'baseTen', tens: Math.floor(n / 10), ones: einer(n), second: { tens: Math.floor(n / 10), ones: einer(n), mode: 'dazu' } };

/** The whole number, not yet split: two rows of n / 2 would already show the answer, also in the aria-label. */
const halbBild = (n: number): Visual => (n <= 20 ? { type: 'dotArray', groups: [n] } : { type: 'baseTen', tens: Math.floor(n / 10), ones: einer(n) });

/** Das Doppelte von n. */
export function doppelt(n: number): Task {
  const v = 2 * n;
  const t = zehner(n);
  const e = einer(n);
  const zweistellig = n >= 10 && e > 0;
  const uebergang = e >= 5;
  return {
    key: `doppelt:${n}`,
    prompt: 'Verdopple die Zahl.',
    expression: `Das Doppelte von ${n} = ${BOX}`,
    visual: doppeltBild(n),
    answer: { kind: 'number', value: v },
    hints: zweistellig
      ? [`Zerlege ${n}: ${t} und ${e}. Verdopple beide.`, 'Rechne dann beide Teile zusammen.']
      : n >= 10
        ? [`Verdopple die Zehner: ${plus(t / 10, t / 10)}.`, 'Das Ergebnis sind auch Zehner.']
        : [`Das Doppelte heißt: ${plus(n, n)}.`, 'Schau auf die 2 Reihen.'],
    steps: zweistellig
      ? [`${n} = ${plus(t, e)}`, `Verdoppeln: ${plus(2 * t, 2 * e)}`, `Das Doppelte von ${n} ist ${v}`]
      : [`${plus(n, n)} = ${v}`, `Das Doppelte von ${n} ist ${v}`],
    bugs: bugList(v, [
      ['halbiert', n % 2 === 0 ? n / 2 : null, 'Du hast halbiert. Verdoppeln heißt: noch einmal so viel.'],
      ['plus-zwei', n + 2, 'Doppelt heißt: zweimal die Zahl, nicht plus 2.'],
      ['zehner-vergessen', n >= 10 && uebergang ? v - 10 : null, neuerZehner(e, e)],
      ['ziffern-reihung', n >= 10 && uebergang ? Math.floor(n / 10) * 2 * 100 + 2 * e : null, `${plus(e, e)} sind ${2 * e} Einer. Bündle 10 Einer zu 1 Zehner.`],
      ['zaehlen-eins-daneben', v - 1, `Fast! Prüfe: ${plus(n, n)} ist nicht ${v - 1}.`],
    ]),
    praise: zweistellig ? 'Du hast Zehner und Einer einzeln verdoppelt.' : 'Du hast die Zahl noch einmal plus gerechnet.',
    kmk: ['ZO.grundaufgaben', 'MS.funktional'],
  };
}

/** Die Hälfte der geraden Zahl n. Odd tens split into an even part and 10 plus the ones: 34 = 20 + 14. */
export function haelfte(n: number): Task {
  const v = n / 2;
  const t = zehner(n);
  const e = einer(n);
  const zehnerUngerade = n >= 10 && (t / 10) % 2 === 1 && n > 20;
  const teilA = zehnerUngerade ? t - 10 : t;
  const teilB = zehnerUngerade ? 10 + e : e;
  const bugZehner = zehnerUngerade ? `${t} sind ${t - 10} und 10. Halbiere beide: ${(t - 10) / 2} und 5.` : '';
  let hints: string[];
  let steps: Task['steps'];
  if (n <= 20) {
    hints = ['Teile die Punkte in 2 gleich große Teile.', `Beide Teile zusammen ergeben ${n}.`];
    steps = [`${plus(v, v)} = ${n}`, `Die Hälfte von ${n} ist ${v}`];
  } else if (teilB === 0) {
    hints = [`${n} sind ${t / 10} Zehner. Halbiere die Zehner.`, 'Das Ergebnis sind auch Zehner.'];
    steps = [`${plus(v, v)} = ${n}`, `Die Hälfte von ${n} ist ${v}`];
  } else {
    hints = [`Zerlege ${n}: ${teilA} und ${teilB}. Halbiere beide.`, 'Rechne dann beide Hälften zusammen.'];
    steps = [`${n} = ${plus(teilA, teilB)}`, `Die Hälften: ${plus(teilA / 2, teilB / 2)}`, `Die Hälfte von ${n} ist ${v}`];
  }
  return {
    key: `haelfte:${n}`,
    prompt: 'Halbiere die Zahl.',
    expression: `Die Hälfte von ${n} = ${BOX}`,
    visual: halbBild(n),
    answer: { kind: 'number', value: v },
    hints,
    steps,
    bugs: bugList(v, [
      ['verdoppelt', 2 * n, 'Du hast verdoppelt. Halbieren heißt: in 2 gleiche Teile teilen.'],
      ['minus-zwei', n - 2, 'Die Hälfte heißt: 2 gleiche Teile, nicht minus 2.'],
      ['halbieren-zehner', zehnerUngerade ? (t - 10) / 2 + e / 2 : null, bugZehner],
      ['halbieren-zehner', zehnerUngerade ? (t + 10) / 2 + e / 2 : null, bugZehner],
      ['zaehlen-eins-daneben', v + 1, `Fast! Prüfe: ${plus(v + 1, v + 1)} ist nicht ${n}.`],
    ]),
    praise: zehnerUngerade ? 'Du hast den ungeraden Zehner geschickt zerlegt.' : 'Du hast in 2 gleiche Teile geteilt.',
    kmk: ['ZO.grundaufgaben', 'MS.funktional'],
  };
}

/** n + (n + 1): double the smaller number, then 1 more. */
export function fastDoppelt(n: number, kleineZuerst: boolean): Task {
  const v = 2 * n + 1;
  const m = n + 1;
  const eN = einer(n);
  const eM = einer(m);
  return {
    key: `fast:${n}:${kleineZuerst ? 'k' : 'g'}`,
    prompt: 'Verdopple und rechne 1 dazu.',
    expression: `${kleineZuerst ? plus(n, m) : plus(m, n)} = ${BOX}`,
    visual: m <= 20 ? { type: 'dotArray', groups: [n, m] } : { type: 'baseTen', tens: Math.floor(n / 10), ones: eN, second: { tens: Math.floor(m / 10), ones: eM, mode: 'dazu' } },
    answer: { kind: 'number', value: v },
    hints: [`Verdopple die kleinere Zahl: ${plus(n, n)}.`, 'Dann rechne noch 1 dazu.'],
    steps: [`Das Doppelte von ${n}: ${plus(n, n)} = ${2 * n}`, `Noch 1 dazu: ${plus(2 * n, 1)} = ${v}`],
    bugs: bugList(v, [
      ['doppelt-ohne-eins', 2 * n, `Du hast ${n} verdoppelt. Jetzt fehlt noch 1.`],
      ['doppelt-grosse', 2 * m, `Du hast ${m} verdoppelt. Das ist 1 zu viel.`],
      ['zehner-vergessen', eN + eM >= 10 ? v - 10 : null, neuerZehner(eN, eM)],
    ]),
    praise: 'Du hast die Nachbarzahlen als Verdopplung erkannt.',
    kmk: ['ZO.strategien', 'MS.funktional'],
  };
}

/** Das Doppelte von □ = 2n: the number to double is missing. */
export function doppeltLuecke(n: number): Task {
  const v = 2 * n;
  return {
    key: `doppelt-luecke:${n}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `Das Doppelte von ${BOX} = ${v}`,
    answer: { kind: 'number', value: n },
    hints: [`2 gleiche Zahlen ergeben zusammen ${v}.`, `Teile die ${v} in 2 gleiche Teile.`],
    steps: [`${plus(n, n)} = ${v}`, `Das Doppelte von ${n} ist ${v}`],
    bugs: bugList(n, [
      ['verdoppelt', 2 * v <= 100 ? 2 * v : null, `Du hast verdoppelt. Die Zahl in der Lücke ist kleiner als ${v}.`],
      ['minus-zwei', v - 2, 'Doppelt heißt: zweimal die Zahl, nicht plus 2.'],
      ['zaehlen-eins-daneben', n + 1, `Fast! Prüfe: ${plus(n + 1, n + 1)} ist nicht ${v}.`],
      ['zaehlen-eins-daneben', n > 1 ? n - 1 : null, `Fast! Prüfe: ${plus(n - 1, n - 1)} ist nicht ${v}.`],
    ]),
    praise: 'Du hast rückwärts gedacht und halbiert.',
    kmk: ['ZO.grundaufgaben', 'MS.funktional'],
  };
}

/** Die Hälfte von □ = n: the number to halve is missing. */
export function haelfteLuecke(n: number): Task {
  const v = 2 * n;
  return {
    key: `haelfte-luecke:${n}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `Die Hälfte von ${BOX} = ${n}`,
    answer: { kind: 'number', value: v },
    hints: [`Die Zahl hat 2 gleiche Teile. Jeder Teil ist ${n}.`, `Rechne ${plus(n, n)}.`],
    steps: [`${plus(n, n)} = ${v}`, `Die Hälfte von ${v} ist ${n}`],
    bugs: bugList(v, [
      ['halbiert', n % 2 === 0 ? n / 2 : null, `Du hast halbiert. Die Zahl in der Lücke ist größer als ${n}.`],
      ['plus-zwei', n + 2, 'Die Hälfte heißt: 2 gleiche Teile, nicht minus 2.'],
      ['zaehlen-eins-daneben', v + 1, `Fast! Prüfe: ${plus(n, n)} ist nicht ${v + 1}.`],
    ]),
    praise: 'Du hast rückwärts gedacht und verdoppelt.',
    kmk: ['ZO.grundaufgaben', 'MS.funktional'],
  };
}

/** n + □ = 2n + 1: the neighbour of n is missing. */
export function nachbarLuecke(n: number): Task {
  const m = n + 1;
  const v = 2 * n + 1;
  return {
    key: `nachbar-luecke:${n}`,
    prompt: 'Die 2 Zahlen sind Nachbarn. Welche Zahl fehlt?',
    expression: `${plus(n, BOX)} = ${v}`,
    answer: { kind: 'number', value: m },
    hints: [`Verdopple die ${n}: ${plus(n, n)}.`, `Dann fehlt noch 1 bis ${v}.`],
    steps: [`Das Doppelte von ${n}: ${plus(n, n)} = ${2 * n}`, `Noch 1 dazu: ${plus(2 * n, 1)} = ${v}`, `Also: ${plus(n, m)} = ${v}`],
    bugs: bugList(m, [
      ['doppelt-ohne-eins', n, `Dann ist es ${plus(n, n)}. Es fehlt noch 1.`],
      ['doppelt-grosse', n + 2, `Prüfe: ${plus(n, n + 2)} ist nicht ${v}.`],
    ]),
    praise: 'Du hast die Nachbarzahl über die Verdopplung gefunden.',
    kmk: ['ZO.strategien', 'MS.funktional'],
    knobel: true,
  };
}

/** The whole-number halves 30, 50, 70, 90 (and their doubles 15, 25, 35, 45) belong to Stufe 3. */
const UNGERADE_ZEHNER = [30, 50, 70, 90];
const istUngeradeZehnerZahl = (n: number) => UNGERADE_ZEHNER.includes(n);

/** Das Doppelte bis 50 without a new ten: 23, 41; with a new ten: 37, 18. Whole tens and 10 itself are no harder than Stufe 1. */
const doppeltOhneUebertrag = (rng: Rng) => rng.int(1, 4) * 10 + rng.int(1, 4);
const doppeltMitUebertrag = (rng: Rng) => rng.int(1, 4) * 10 + rng.int(5, 9);
/** Even tens with ones: 46, 82, and 100. */
const haelfteLeicht = (rng: Rng) => (rng.chance(0.05) ? 100 : rng.pick([2, 4, 6, 8]) * 10 + rng.pick([2, 4, 6, 8]));
/** Odd tens with ones: 34, 78. The whole odd tens wait for Stufe 3. */
const haelfteSchwer = (rng: Rng) => rng.pick([3, 5, 7, 9]) * 10 + rng.pick([2, 4, 6, 8]);

/** Reversed doubles of Stufe 2: never the double of 15, 25, 35, 45. */
function umkehrZahl(rng: Rng): number {
  for (let i = 0; i < 40; i++) {
    const n = rng.int(11, 49);
    if (!istUngeradeZehnerZahl(2 * n)) return n;
  }
  return 24;
}

const formen: Formen = {
  1: {
    1: [(rng) => doppelt(rng.int(2, 5)), (rng) => haelfte(2 * rng.int(2, 5))],
    2: [(rng) => doppelt(rng.int(6, 10)), (rng) => haelfte(2 * rng.int(6, 10))],
    3: [(rng) => doppeltLuecke(rng.int(2, 10)), (rng) => haelfteLuecke(rng.int(2, 10))],
  },
  2: {
    1: [(rng) => doppelt(doppeltOhneUebertrag(rng)), (rng) => haelfte(haelfteLeicht(rng))],
    2: [(rng) => doppelt(rng.chance(0.1) ? 50 : doppeltMitUebertrag(rng)), (rng) => haelfte(haelfteSchwer(rng))],
    3: [(rng) => doppeltLuecke(umkehrZahl(rng)), (rng) => haelfteLuecke(umkehrZahl(rng))],
  },
  3: {
    1: [(rng) => haelfte(rng.pick(UNGERADE_ZEHNER)), (rng) => fastDoppelt(rng.int(11, 24), true), (rng) => fastDoppelt(rng.int(11, 24), false)],
    2: [(rng) => fastDoppelt(rng.int(25, 49), true), (rng) => fastDoppelt(rng.int(25, 49), false)],
    3: [(rng) => nachbarLuecke(rng.int(15, 49)), (rng) => doppeltLuecke(rng.pick(UNGERADE_ZEHNER) / 2)],
  },
};

export const verdoppelnHalbierenSkill = defineSkill({
  id: 'plusminus.verdoppeln-halbieren',
  title: 'Verdoppeln und Halbieren',
  description: 'Du rechnest das Doppelte und die Hälfte.',
  stufen: { 1: 'Das Doppelte bis 10, die Hälfte bis 20', 2: 'Das Doppelte bis 50, die Hälfte bis 100', 3: 'Hälfte von 30, 50, 70, 90; doppelt und 1 dazu' },
  kmk: ['ZO.grundaufgaben', 'MS.funktional'],
  formen,
});
