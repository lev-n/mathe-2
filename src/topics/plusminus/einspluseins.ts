/**
 * Plus und Minus bis 20: Stufe 1 without crossing the ten and doubles, Stufe 2 crossing the ten via the 10, Stufe 3 missing numbers
 * and choosing the helpful easy task (docs/research.md §6). No timing: this skill is about seeing the structure (§7.1).
 */
import { BOX } from '../../core/format';
import type { Rng, Visual } from '../../core/types';
import { bugList, makeChoice } from '../shared';
import { MINUS_OP, PLUS_OP, defineSkill, einer, gehen, kommen, minus, neuerZehner, plus, rechenstrich, wegLuecke, type Formen, type Task } from './rechnen';

const feld = (filled: number, second?: number): Visual => ({ type: 'field', size: 20, filled, ...(second ? { second } : {}) });
const RECHENZEICHEN = 'Schau noch einmal auf das Rechenzeichen.';
const FAST_FELD = 'Fast! Schau noch einmal auf das Feld.';

/** a + b up to 20; crossing the ten means a and b are both below 10 with a + b > 10. */
export function plusAufgabe(a: number, b: number): Task {
  const s = a + b;
  const ueber = a < 10 && s > 10;
  // Equal addends leave no larger number to begin with; the relation to name is the double.
  if (a === b && !ueber) return doppelAufgabe(a);
  const d = 10 - a;
  const r = b - d;
  const teen = a > 10;
  // 18 + 2: the ones reach exactly 10, so the ten does change.
  const vollerZehner = teen && einer(a) + b === 10;
  const expression = `${plus(a, b)} = ${BOX}`;
  return {
    key: `plus:${a}:${b}`,
    prompt: 'Rechne.',
    expression,
    visual: feld(a, b),
    answer: { kind: 'number', value: s },
    hints: ueber
      ? [`Rechne erst zur 10: ${plus(a, d)}.`, `Dann ${kommen(r)} noch ${r} dazu.`]
      : teen
        ? [`Rechne die Einer: ${plus(einer(a), b)}.`, vollerZehner ? neuerZehner(einer(a), b) : 'Der Zehner bleibt gleich.']
        : ['Schau auf das Feld: volle Punkte und Ringe.', `Beginne mit der ${Math.max(a, b)}. Das ist leichter.`],
    steps: ueber
      ? [`Erst zur 10: ${plus(a, d)} = 10`, { text: `Dann weiter: ${plus(10, r)} = ${s}`, visual: rechenstrich([a, 10, s]) }]
      : teen
        ? [`Die Einer: ${plus(einer(a), b)} = ${einer(a) + b}`, `${plus(a, b)} = ${s}`]
        : [`${plus(a, b)} = ${s}`],
    bugs: bugList(s, [
      ['zaehlen-eins-daneben', s - 1, ueber ? `Fast! Rechne erst zur 10: ${plus(a, d)}, dann noch ${r}.` : FAST_FELD],
      ['zehner-vergessen', ueber ? s - 10 : null, `${plus(a, b)} ist mehr als 10. Der Zehner kommt dazu.`],
      ['zehner-vergessen', vollerZehner ? s - 10 : null, neuerZehner(einer(a), b)],
      ['plus-minus-getauscht', a > b ? a - b : null, RECHENZEICHEN],
    ]),
    praise: ueber ? 'Du bist erst zum Zehner gegangen.' : teen ? 'Du hast die Einer plus gerechnet.' : 'Du hast die Punkte im Feld genutzt.',
  };
}

/** n + n: a double. It has the key of plusAufgabe(n, n): the child sees the same task, so it must not come twice in a round. */
export function doppelAufgabe(n: number): Task {
  const s = 2 * n;
  return {
    key: `plus:${n}:${n}`,
    prompt: 'Rechne.',
    expression: `${plus(n, n)} = ${BOX}`,
    visual: feld(n, n),
    answer: { kind: 'number', value: s },
    hints: ['Beide Zahlen sind gleich. Das ist eine Verdopplung.', 'Schau auf das Feld: Beide Teile sind gleich groß.'],
    steps: [`Das Doppelte von ${n}:`, `${plus(n, n)} = ${s}`],
    bugs: bugList(s, [
      ['zaehlen-eins-daneben', s - 1, FAST_FELD],
      ['plus-minus-getauscht', 0, RECHENZEICHEN],
    ]),
    praise: 'Du hast die Verdopplung erkannt.',
  };
}

/** a − b from a up to 20; crossing the ten means b is larger than the ones of a teen number. */
export function minusAufgabe(a: number, b: number): Task {
  const d = a - b;
  const e = einer(a);
  const teen = a > 10;
  const ueber = teen && b > e;
  const r = b - e;
  return {
    key: `minus:${a}:${b}`,
    prompt: 'Rechne.',
    expression: `${minus(a, b)} = ${BOX}`,
    visual: feld(a),
    answer: { kind: 'number', value: d },
    hints: ueber
      ? [`Rechne erst zur 10: ${minus(a, e)}.`, r === d ? 'Dann nimm den Rest weg.' : `Dann nimm noch ${r} weg.`]
      : teen
        ? [`Rechne die Einer: ${minus(e, b)}.`, 'Der Zehner bleibt gleich.']
        : [`Von ${a} ${gehen(b)} ${b} weg. Schau auf das Feld.`, 'Was bleibt in der Reihe stehen?'],
    steps: ueber
      ? [`Erst zur 10: ${minus(a, e)} = 10`, { text: `Dann weiter: ${minus(10, r)} = ${d}`, visual: rechenstrich([a, 10, d]) }]
      : teen
        ? [`Die Einer: ${minus(e, b)} = ${e - b}`, `${minus(a, b)} = ${d}`]
        : [`${minus(a, b)} = ${d}`],
    bugs: bugList(d, [
      ['kleiner-von-groesser', ueber ? 10 + (b - e) : null, `${minus(e, b)} geht nicht. Rechne erst ${minus(a, e)}, dann weiter.`],
      ['zaehlen-eins-daneben', d + 1, ueber ? (r === d ? `Fast! Rechne erst ${minus(a, e)}, dann den Rest.` : `Fast! Rechne erst ${minus(a, e)}, dann noch ${r} weg.`) : FAST_FELD],
      ['plus-minus-getauscht', a + b, RECHENZEICHEN],
    ]),
    praise: ueber ? 'Du bist erst zur 10 gegangen, dann weiter.' : teen ? 'Du hast die Einer abgezogen.' : 'Du hast die Punkte im Feld genutzt.',
  };
}

export type LueckenForm = 'plus-vorne' | 'plus-hinten' | 'minus-hinten' | 'minus-vorne';

/** Missing number with a + b = s (crossing the ten): □ + b = s, a + □ = s, s − □ = a, □ − b = a. */
export function lueckenAufgabe(a: number, b: number, form: LueckenForm): Task {
  const s = a + b;
  const value = { 'plus-vorne': a, 'plus-hinten': b, 'minus-hinten': b, 'minus-vorne': s }[form];
  const bekannt = form === 'plus-hinten' || form === 'minus-hinten' ? a : b;
  const expression = {
    'plus-vorne': `${plus(BOX, b)} = ${s}`,
    'plus-hinten': `${plus(a, BOX)} = ${s}`,
    'minus-hinten': `${minus(s, BOX)} = ${a}`,
    'minus-vorne': `${minus(BOX, b)} = ${a}`,
  }[form];
  const istPlus = form === 'plus-vorne' || form === 'plus-hinten';
  const vorneMinus = form === 'minus-vorne';
  const pruefe = (w: number) => (vorneMinus ? `Fast! Prüfe: ${minus(w, b)} ist nicht ${a}.` : `Fast! Prüfe: ${plus(bekannt, w)} ist nicht ${s}.`);
  return {
    key: `luecke:${form}:${a}:${b}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value },
    hints: vorneMinus
      ? [`Rechne rückwärts: ${plus(a, b)}.`, `Von der Zahl gehen ${b} weg. Es bleiben ${a}.`]
      : [`Rechne rückwärts: ${minus(s, bekannt)}.`, `Wie weit ist es von ${bekannt} bis ${s}?`],
    steps: vorneMinus
      ? [`Rückwärts: ${plus(a, b)} = ${s}`, `Probe: ${minus(s, b)} = ${a}`]
      : [`Rückwärts: ${minus(s, bekannt)} = ${value}`, `Probe: ${plus(bekannt, value)} = ${s}`],
    bugs: bugList(value, [
      ['platzhalter-summe', vorneMinus ? a - b : s + bekannt, vorneMinus ? `Das Ergebnis ist ${a}. Die Zahl vorne ist größer.` : istPlus ? `Die ganze Seite ergibt ${s}. Wie viel fehlt bis ${s}?` : `Von ${s} geht etwas weg. Es bleiben ${a}.`],
      ['zaehlen-eins-daneben', value - 1, pruefe(value - 1)],
      ['zaehlen-eins-daneben', value + 1, pruefe(value + 1)],
    ]),
    praise: 'Du hast rückwärts gerechnet und die Lücke gefunden.',
    kmk: ['ZO.grundaufgaben', 'ZO.kontrolle'],
  };
}

/** Choose the easy task that helps with a ± b: split b at the 10. */
export function zurZehnWaehlen(rng: Rng, a: number, b: number, op: 'plus' | 'minus'): Task {
  const istPlus = op === 'plus';
  const bisZehn = istPlus ? 10 - a : einer(a);
  const rest = b - bisZehn;
  const opTerm = istPlus ? plus : minus;
  const label = (x: number, y: number) => opTerm(opTerm(a, x), y);
  const result = istPlus ? a + b : a - b;
  const falsch = (x: number, y: number) => ({ label: label(x, y), whyWrong: `Prüfe: ${plus(x, y)} sind nicht ${b}.` });
  const wrongs = [falsch(bisZehn, b), falsch(bisZehn, rest + 1), falsch(bisZehn + 1, rest), ...(bisZehn > 1 ? [falsch(bisZehn - 1, rest)] : [])];
  return {
    key: `hilfe:${op}:${a}:${b}`,
    prompt: 'Welche Aufgabe hilft dir?',
    expression: `${opTerm(a, b)} = ${BOX}`,
    answer: makeChoice(rng, { label: label(bisZehn, rest) }, wrongs),
    hints: ['Mit welcher Aufgabe kommst du genau zur 10?', `Beide Teile zusammen müssen ${b} ergeben.`],
    steps: [`Zerlege die ${b}: ${b} = ${plus(bisZehn, rest)}`, `Erst zur 10: ${opTerm(a, bisZehn)} = 10`, `Dann weiter: ${opTerm(10, rest)} = ${result}`],
    praise: 'Du hast den Weg über die 10 gefunden.',
  };
}

/** Choose the double that helps with n + (n + 1). */
export function doppelWaehlen(rng: Rng, n: number): Task {
  const s = 2 * n + 1;
  return {
    key: `hilfe-doppel:${n}`,
    prompt: 'Welche Aufgabe hilft dir?',
    expression: `${plus(n, n + 1)} = ${BOX}`,
    answer: makeChoice(rng, { label: plus(plus(n, n), 1) }, [
      { label: plus(plus(n, n), 2), whyWrong: `Prüfe: ${n + 1} ist nur 1 mehr als ${n}.` },
      { label: minus(plus(n, n), 1), whyWrong: `Prüfe: ${n + 1} ist mehr als ${n}.` },
      { label: plus(n, n), whyWrong: `Prüfe: ${n + 1} ist 1 mehr als ${n}.` },
    ]),
    hints: ['Die 2 Zahlen sind Nachbarn.', `Nimm ${plus(n, n)}. Wie viel fehlt dann noch?`],
    steps: [`${plus(n, n + 1)} = ${plus(plus(n, n), 1)}`, `Das Doppelte: ${plus(n, n)} = ${2 * n}`, `Noch 1 dazu: ${plus(2 * n, 1)} = ${s}`],
    praise: 'Du hast die Verdopplung als Hilfe genutzt.',
  };
}

/** Which double gives this sum? The other doubles are the neighbours; a sum of two neighbours is no double. */
export function doppelFinden(rng: Rng, n: number): Task {
  const s = 2 * n;
  const falsch = (x: number, y: number) => ({ label: plus(x, y), whyWrong: x === y ? `Prüfe: ${plus(x, y)} ist nicht ${s}.` : 'Eine Verdopplung hat 2 gleiche Zahlen.' });
  return {
    key: `doppel-finden:${n}`,
    prompt: `Welche Verdopplung ergibt ${s}?`,
    answer: makeChoice(rng, { label: plus(n, n) }, [falsch(n - 1, n - 1), ...(n < 10 ? [falsch(n + 1, n + 1)] : [falsch(n - 2, n - 2)]), falsch(n, n - 1)]),
    hints: ['Beide Zahlen sind gleich.', `Beide Zahlen zusammen ergeben ${s}.`],
    steps: [`Das Doppelte von ${n}:`, `${plus(n, n)} = ${s}`],
    praise: 'Du hast die passende Verdopplung erkannt.',
  };
}

/** Which task goes over the 10? a + b or a − b crosses it; the other options reach the 10 at most or stay above it. */
export function ueberDieZehnErkennen(rng: Rng, a: number, b: number, op: 'plus' | 'minus'): Task {
  const istPlus = op === 'plus';
  const opTerm = istPlus ? plus : minus;
  const e = einer(a);
  const paare: [number, number][] = istPlus
    ? [[a, 10 - a], [a, 9 - a], [10 - b, b], [9 - b, b]]
    : [[a, e], [a, e - 1], [10 + b, b], [11 + b, b]];
  const wrongs = paare.filter(([x, y]) => x > 0 && y > 0 && x <= 20).map(([x, y]) => ({ label: opTerm(x, y), whyWrong: 'Diese Aufgabe kommt nicht über die 10.' }));
  const bisZehn = istPlus ? 10 - a : e;
  const r = b - bisZehn;
  return {
    key: `ueber-erkennen:${op}:${a}:${b}`,
    prompt: 'Welche Aufgabe geht über die 10?',
    answer: makeChoice(rng, { label: opTerm(a, b) }, wrongs),
    hints: ['Rechne die Aufgaben aus.', istPlus ? 'Das Ergebnis ist größer als 10.' : 'Das Ergebnis ist kleiner als 10.'],
    steps: [`Erst zur 10: ${opTerm(a, bisZehn)} = 10`, { text: `Dann weiter: ${opTerm(10, r)} = ${istPlus ? a + b : a - b}`, visual: rechenstrich([a, 10, istPlus ? a + b : a - b]) }],
    praise: 'Du hast die Aufgabe über die 10 erkannt.',
  };
}

/** Which task helps with the gap in □ + b = s? Backwards with minus; the others use the wrong sign or a neighbour of b. */
export function umkehrHilfe(rng: Rng, a: number, b: number): Task {
  const s = a + b;
  return {
    key: `umkehr-hilfe:${a}:${b}`,
    prompt: 'Welche Aufgabe hilft dir?',
    expression: `${plus(BOX, b)} = ${s}`,
    answer: makeChoice(rng, { label: minus(s, b) }, [
      { label: plus(s, b), whyWrong: RECHENZEICHEN },
      { label: minus(s, b + 1), whyWrong: `In der Aufgabe steht die ${b}.` },
      { label: minus(s, b - 1), whyWrong: `In der Aufgabe steht die ${b}.` },
    ]),
    hints: ['Rechne rückwärts.', 'Bei Plus hilft dir eine Minusaufgabe.'],
    steps: [`Rückwärts: ${minus(s, b)} = ${a}`, `Probe: ${plus(a, b)} = ${s}`],
    praise: 'Du hast die Aufgabe für den Rückweg gefunden.',
  };
}

/** a + b = □ + c: both sides are worth the same, across the ten. */
export function gleichAufgabe(a: number, b: number, c: number): Task {
  const s = a + b;
  const value = s - c;
  return {
    key: `gleich:${a}:${b}:${c}`,
    prompt: 'Beide Seiten sind gleich viel. Welche Zahl fehlt?',
    expression: `${plus(a, b)} = ${plus(BOX, c)}`,
    answer: { kind: 'number', value },
    hints: ['Rechne zuerst die linke Seite.', 'Die rechte Seite muss genauso viel ergeben.'],
    steps: [`Links: ${plus(a, b)} = ${s}`, `Rechts: ${plus(value, c)} = ${s}`],
    bugs: bugList(value, [
      ['gleichheit', s, 'Beide Seiten sind gleich viel. Rechne links zuerst.'],
      ['gleichheit', s + c, 'Rechne nicht alle Zahlen zusammen. Beide Seiten sind gleich viel.'],
      ['zaehlen-eins-daneben', value + 1, `Fast! Prüfe: ${plus(value + 1, c)} ist nicht ${s}.`],
      ['zaehlen-eins-daneben', value > 1 ? value - 1 : null, `Fast! Prüfe: ${plus(value - 1, c)} ist nicht ${s}.`],
    ]),
    praise: 'Du hast beide Seiten gleich groß gemacht.',
    kmk: ['ZO.grundaufgaben', 'MS.muster'],
    knobel: true,
  };
}

// ─── Numbers of each Stufe ────────────────────────────────────────────────────

/** Up to 10, a one-digit start. */
const kleinesPlus = (rng: Rng): [number, number] => {
  const a = rng.int(2, 8);
  return [a, rng.int(1, 10 - a)];
};
/** 10 + e with b, up to 20 and without a jump over a ten inside the teens. */
const teenPlus = (rng: Rng): [number, number] => {
  const e = rng.int(1, 8);
  return [10 + e, rng.int(1, 10 - e)];
};

/** A number pair without crossing, with two different numbers and at least 2 to find: □ = 1 leaves no real gap. */
function lueckePaar(rng: Rng): [number, number] {
  const [a, b] = rng.chance(0.5) ? kleinesPlus(rng) : teenPlus(rng);
  if (b >= 2 && a !== b) return [a, b];
  return rng.pick<[number, number]>([[3, 5], [4, 5], [12, 5], [13, 6], [11, 7], [14, 4]]);
}

/** Crossing the ten without a double: a is the larger number on AB I, the smaller one on AB II. */
function uebergangPlus(rng: Rng, von: number, bis: number): [number, number] {
  const a = rng.int(von, bis);
  const b = rng.int(11 - a, 9);
  return a === b ? [a, b === 9 ? 8 : b + 1] : [a, b];
}

/** a − b crossing the ten, a from 11 to 18. */
function uebergangMinus(rng: Rng): [number, number] {
  const e = rng.int(1, 8);
  return [10 + e, rng.int(e + 1, 9)];
}

/** Any crossing pair: both numbers differ, so a gap never shows its own answer. */
const lueckeUeber = (rng: Rng) => uebergangPlus(rng, 2, 9);

/** Crossing pairs whose gap shows no copy of its answer: in 8 + 2 + □ = 12 the 2 would stand next to the gap, in 5 + □ + 1 = 11 and 11 − 1 − □ = 5 the 5 too. */
const KETTEN_PLUS: [number, number][] = [];
for (let a = 2; a <= 9; a++) for (let b = 11 - a; b <= 9; b++) if (a !== b && a !== 5 && 10 - a !== b - (10 - a)) KETTEN_PLUS.push([a, b]);
const KETTEN_MINUS: [number, number][] = [];
for (let e = 1; e <= 8; e++) for (let b = e + 1; b <= 9; b++) if (e !== b - e && b - e !== 5) KETTEN_MINUS.push([10 + e, b]);

function kette(rng: Rng, op: 'plus' | 'minus', teil: 'erster' | 'zweiter'): Task {
  if (op === 'plus') {
    const [a, b] = rng.pick(KETTEN_PLUS);
    return wegLuecke(a, PLUS_OP, 10 - a, b - (10 - a), teil);
  }
  const [a, b] = rng.pick(KETTEN_MINUS);
  return wegLuecke(a, MINUS_OP, einer(a), b - einer(a), teil);
}

const formen: Formen = {
  1: {
    1: [
      (rng) => plusAufgabe(...kleinesPlus(rng)),
      (rng) => {
        const a = rng.int(3, 10);
        return minusAufgabe(a, rng.int(1, a - 1));
      },
      (rng) => doppelAufgabe(rng.int(2, 5)),
    ],
    2: [
      (rng) => plusAufgabe(...teenPlus(rng)),
      (rng) => {
        const e = rng.int(2, 9);
        return minusAufgabe(10 + e, rng.int(1, e));
      },
      (rng) => doppelAufgabe(rng.int(6, 10)),
    ],
    3: [
      (rng) => lueckenAufgabe(...lueckePaar(rng), 'plus-hinten'),
      (rng) => lueckenAufgabe(...lueckePaar(rng), 'minus-hinten'),
      (rng) => doppelFinden(rng, rng.int(2, 10)),
    ],
  },
  2: {
    1: [(rng) => plusAufgabe(...uebergangPlus(rng, 6, 9))],
    2: [(rng) => minusAufgabe(...uebergangMinus(rng)), (rng) => plusAufgabe(...uebergangPlus(rng, 2, 5))],
    3: [
      (rng) => kette(rng, 'plus', 'zweiter'),
      (rng) => kette(rng, 'minus', 'zweiter'),
      (rng) => kette(rng, 'plus', 'erster'),
      (rng) => ueberDieZehnErkennen(rng, ...uebergangPlus(rng, 2, 9), 'plus'),
      (rng) => ueberDieZehnErkennen(rng, ...uebergangMinus(rng), 'minus'),
    ],
  },
  3: {
    1: [(rng) => lueckenAufgabe(...lueckeUeber(rng), 'plus-hinten'), (rng) => lueckenAufgabe(...lueckeUeber(rng), 'minus-hinten')],
    2: [
      (rng) => lueckenAufgabe(...lueckeUeber(rng), 'plus-vorne'),
      (rng) => lueckenAufgabe(...lueckeUeber(rng), 'minus-vorne'),
      (rng) => zurZehnWaehlen(rng, ...lueckeUeber(rng), 'plus'),
      (rng) => doppelWaehlen(rng, rng.int(3, 8)),
    ],
    3: [
      (rng) => {
        const [a, b] = lueckeUeber(rng);
        const c = rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== a && x !== b && x !== a + b - x));
        return gleichAufgabe(a, b, c);
      },
      (rng) => umkehrHilfe(rng, ...lueckeUeber(rng)),
      (rng) => zurZehnWaehlen(rng, ...uebergangMinus(rng), 'minus'),
    ],
  },
};

export const einspluseinsSkill = defineSkill({
  id: 'plusminus.einspluseins',
  title: 'Plus und Minus bis 20',
  description: 'Du rechnest bis 20 und findest die Aufgaben im Kopf.',
  stufen: { 1: 'Bis 20, ohne über die 10 zu gehen; Verdoppeln', 2: 'Über die 10: 8 + 5, 13 − 6', 3: 'Lücken füllen: □ + 7 = 15; die leichte Aufgabe finden' },
  kmk: ['ZO.grundaufgaben'],
  formen,
});
