/**
 * Plus bis 100: Stufe 1 ZE + ZE without a new ten, Stufe 2 with a new ten, Stufe 3 missing numbers and the Zahlenmauer
 * (docs/research.md §6). The worked way is schrittweise: first the tens of the second number, then its ones.
 */
import { BOX } from '../../core/format';
import type { Bug, MultiField, Rng, Visual } from '../../core/types';
import { bugList, multiBugs, speak } from '../shared';
import { PLUS_OP, defineSkill, einer, ergebnisWaehlen, hunderterLinie, minus, naechsterZehner, neuerZehner, plus, rechenstrich, wegLuecke, zehner, zweistellig, type Formen, type Task } from './rechnen';

const RECHENZEICHEN = 'Schau noch einmal auf das Rechenzeichen.';

/** Typical wrong results of a + b (docs/research.md §5, numbers as in 38 + 27). */
export function plusBugs(a: number, b: number): [string, number | null, string][] {
  const s = a + b;
  const t = zehner(b);
  const e = einer(b);
  const uebergang = einer(a) + e >= 10;
  const zehnerSumme = zehner(a) + t;
  return [
    ['zehner-vergessen', uebergang ? s - 10 : null, neuerZehner(einer(a), e)],
    ['ziffern-reihung', uebergang ? zehnerSumme * 10 + einer(a) + e : null, `${plus(einer(a), e)} sind ${einer(a) + e} Einer. Bündle 10 Einer zu 1 Zehner.`],
    ['ziffern-einzeln', a + t / 10 + e, `${b} sind ${t / 10} Zehner und ${e} Einer.`],
    ['einer-vergessen', a + t, e === 1 ? `Der Einer von ${b} fehlt noch.` : `Die ${e} Einer von ${b} fehlen noch.`],
    ['zehner-nicht-gerechnet', a + e, `${b} hat auch ${t / 10} Zehner.`],
    ['zaehlen-eins-daneben', s - 1, 'Fast! Schau noch einmal auf die Einer.'],
    ['plus-minus-getauscht', a > b ? a - b : null, RECHENZEICHEN],
  ];
}

const weg = (a: number, b: number): Task['steps'] => {
  const t = zehner(b);
  const e = einer(b);
  return [`Erst die Zehner: ${plus(a, t)} = ${a + t}`, { text: `Dann die Einer: ${plus(a + t, e)} = ${a + b}`, visual: rechenstrich([a, a + t, a + b]) }];
};

const tipps = (a: number, b: number) => [`Zerlege ${b}: ${zehner(b)} und ${einer(b)}.`, `Rechne erst ${plus(a, zehner(b))}, dann die Einer.`];

/** a + b as a number answer: with a number line that shows the start, or on its own. */
export function plusAufgabe(a: number, b: number, mitLinie = true): Task {
  const s = a + b;
  return {
    key: `${mitLinie ? 'rechnen' : 'ohne'}:${a}+${b}`,
    prompt: 'Rechne.',
    expression: `${plus(a, b)} = ${BOX}`,
    ...(mitLinie ? { visual: hunderterLinie(a) } : {}),
    answer: { kind: 'number', value: s },
    hints: tipps(a, b),
    steps: weg(a, b),
    bugs: bugList(s, plusBugs(a, b)),
    praise: einer(a) + einer(b) >= 10 ? 'Du hast an den neuen Zehner gedacht.' : 'Du hast Zehner und Einer nacheinander gerechnet.',
  };
}

/** a + b in two fields: first the tens, then the ones. */
export function schrittAufgabe(a: number, b: number): Task {
  const s = a + b;
  const t = zehner(b);
  const e = einer(b);
  const fields: MultiField[] = [
    { id: 'zehner', before: `${plus(a, t)} =`, value: a + t },
    { id: 'ziel', before: `Noch ${e} dazu:`, value: s },
  ];
  const ziel = plusBugs(a, b).map(([id, m, hint]): Bug | null => (m === null ? null : { id, match: { ziel: m }, hint }));
  return {
    key: `schritte:${a}+${b}`,
    prompt: 'Rechne in 2 Schritten.',
    expression: `${plus(a, b)} = ${BOX}`,
    answer: { kind: 'multi', fields },
    hints: tipps(a, b),
    steps: weg(a, b),
    bugs: multiBugs([{ id: 'ziffern-einzeln', match: { zehner: a + t / 10 }, hint: `${b} hat ${t / 10} Zehner. Nimm die ganzen Zehner.` }, ...ziel], fields),
    praise: 'Du hast erst die Zehner gerechnet.',
  };
}

/** a + □ = s or □ + b = s. */
export function lueckenAufgabe(bekannt: number, gesucht: number, vorne: boolean): Task {
  const s = bekannt + gesucht;
  const uebergang = einer(bekannt) + einer(gesucht) >= 10;
  const zumZehner = naechsterZehner(bekannt);
  return {
    key: `luecke:${vorne ? 'v' : 'h'}:${bekannt}:${gesucht}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: vorne ? `${plus(BOX, bekannt)} = ${s}` : `${plus(bekannt, BOX)} = ${s}`,
    answer: { kind: 'number', value: gesucht },
    hints: [`Rechne rückwärts: ${minus(s, bekannt)}.`, `Wie weit ist es von ${bekannt} bis ${s}?`],
    steps: [`Rückwärts: ${minus(s, zehner(bekannt))} = ${s - zehner(bekannt)}`, `Dann die Einer: ${minus(s - zehner(bekannt), einer(bekannt))} = ${gesucht}`, `Probe: ${plus(bekannt, gesucht)} = ${s}`],
    bugs: bugList(gesucht, [
      ['platzhalter-summe', s + bekannt, `Die ganze Seite ergibt ${s}. Wie viel fehlt bis ${s}?`],
      ['kleiner-von-groesser', uebergang ? zehner(s) - zehner(bekannt) + Math.abs(einer(s) - einer(bekannt)) : null, `${minus(einer(s), einer(bekannt))} geht nicht. Rechne erst bis ${zumZehner}.`],
      ['zaehlen-eins-daneben', gesucht - 1, `Fast! Prüfe: ${plus(bekannt, gesucht - 1)} ist nicht ${s}.`],
      ['zaehlen-eins-daneben', gesucht + 1, `Fast! Prüfe: ${plus(bekannt, gesucht + 1)} ist nicht ${s}.`],
    ]),
    praise: 'Du hast rückwärts gerechnet und die Probe gemacht.',
  };
}

/** Zahlenmauer: bottom a, b, c; middle A, B; top C. */
export function mauerAufgabe(a: number, b: number, c: number): Task {
  const A = a + b;
  const B = b + c;
  const C = A + B;
  const visual: Visual = {
    type: 'numberWall',
    rows: [['C'], ['A', 'B'], [String(a), String(b), String(c)]],
  };
  const fields: MultiField[] = [
    { id: 'a', before: 'A =', value: A },
    { id: 'b', before: 'B =', value: B },
    { id: 'c', before: 'C =', value: C },
  ];
  const prompt = 'Zahlenmauer: 2 Steine zusammen ergeben den Stein darüber.';
  return {
    key: `mauer:${a}:${b}:${c}`,
    prompt,
    visual,
    answer: { kind: 'multi', fields },
    hints: ['Rechne zuerst die mittlere Reihe.', 'Rechne danach A und B zusammen.'],
    steps: [`A: ${plus(a, b)} = ${A}`, `B: ${plus(b, c)} = ${B}`, `C: ${plus(A, B)} = ${C}`],
    bugs: multiBugs(
      [
        { id: 'mauer-unten', match: { c: a + b + c }, hint: 'Rechne die 2 Steine direkt darunter zusammen.' },
        einer(A) + einer(B) >= 10 && { id: 'zehner-vergessen', match: { c: C - 10 }, hint: neuerZehner(einer(A), einer(B)) },
        einer(a) + einer(b) >= 10 && { id: 'zehner-vergessen', match: { a: A - 10 }, hint: neuerZehner(einer(a), einer(b)) },
        einer(b) + einer(c) >= 10 && { id: 'zehner-vergessen', match: { b: B - 10 }, hint: neuerZehner(einer(b), einer(c)) },
        { id: 'zaehlen-eins-daneben', match: { c: C - 1 }, hint: 'Fast! Schau noch einmal auf die Einer.' },
      ],
      fields,
    ),
    praise: 'Du hast die Mauer Reihe für Reihe gebaut.',
    srText: speak(`${prompt} Unten stehen ${a}, ${b} und ${c}. Darüber stehen A und B. Oben steht C.`),
    kmk: ['ZO.strategien', 'MS.muster'],
    knobel: true,
  };
}

/** The wall with a stone of the bottom row missing: X comes from the stone above it, then the wall is built up as usual. */
export function mauerRueckwaerts(a: number, b: number, c: number): Task {
  const A = a + b;
  const B = b + c;
  const C = A + B;
  const visual: Visual = { type: 'numberWall', rows: [['C'], [String(A), 'B'], ['X', String(b), String(c)]] };
  const fields: MultiField[] = [
    { id: 'x', before: 'X =', value: a },
    { id: 'b', before: 'B =', value: B },
    { id: 'c', before: 'C =', value: C },
  ];
  const prompt = 'Zahlenmauer: 2 Steine zusammen ergeben den Stein darüber.';
  return {
    key: `mauer-x:${a}:${b}:${c}`,
    prompt,
    visual,
    answer: { kind: 'multi', fields },
    hints: [`Über X und ${b} steht die ${A}. Rechne rückwärts.`, 'Rechne danach B und dann C.'],
    steps: [`X: ${minus(A, b)} = ${a}`, `B: ${plus(b, c)} = ${B}`, `C: ${plus(A, B)} = ${C}`],
    bugs: multiBugs(
      [
        { id: 'platzhalter-summe', match: { x: A + b }, hint: `Die 2 Steine unten ergeben ${A}. X ist kleiner als ${A}.` },
        { id: 'mauer-unten', match: { c: a + b + c }, hint: 'Rechne die 2 Steine direkt darunter zusammen.' },
        einer(A) + einer(B) >= 10 && { id: 'zehner-vergessen', match: { c: C - 10 }, hint: neuerZehner(einer(A), einer(B)) },
        einer(b) + einer(c) >= 10 && { id: 'zehner-vergessen', match: { b: B - 10 }, hint: neuerZehner(einer(b), einer(c)) },
        { id: 'zaehlen-eins-daneben', match: { c: C - 1 }, hint: 'Fast! Schau noch einmal auf die Einer.' },
      ],
      fields,
    ),
    praise: 'Du hast die Mauer von 2 Seiten gelöst.',
    srText: speak(`${prompt} Unten stehen X, ${b} und ${c}. Darüber stehen ${A} und B. Oben steht C.`),
    kmk: ['ZO.strategien', 'MS.muster'],
    knobel: true,
  };
}

/** 38 + 27 = 40 + □: the first number goes up to its ten, the other side stays worth the same. */
export function gleichAufgabe(a: number, b: number): Task {
  const ten = naechsterZehner(a);
  const value = a + b - ten;
  const s = a + b;
  return {
    key: `gleich:${a}:${b}`,
    prompt: 'Beide Seiten sind gleich viel. Welche Zahl fehlt?',
    expression: `${plus(a, b)} = ${plus(ten, BOX)}`,
    answer: { kind: 'number', value },
    hints: [`${a} wird um ${ten - a} größer.`, `Wie muss sich ${b} dann ändern?`],
    steps: [`Links: ${plus(a, b)} = ${s}`, `Rechts: ${plus(ten, value)} = ${s}`],
    bugs: bugList(value, [
      ['gleichheit', s, 'Beide Seiten sind gleich viel. Rechne links zuerst.'],
      ['gleichheit', b, `${a} wird größer. Dann muss ${b} kleiner werden.`],
      ['zaehlen-eins-daneben', value + 1, `Fast! Prüfe: ${plus(ten, value + 1)} ist nicht ${s}.`],
    ]),
    praise: 'Du hast beide Seiten gleich groß gemacht.',
    knobel: true,
  };
}

/** Without a new ten, with a sum in the given range. */
function ohneUebergang(rng: Rng, vonSumme = 22, bisSumme = 99): [number, number] {
  for (let i = 0; i < 40; i++) {
    const z1 = rng.int(1, 7);
    const e1 = rng.int(1, 8);
    const a = z1 * 10 + e1;
    const b = rng.int(1, 8 - z1 + 1) * 10 + rng.int(1, 9 - e1);
    if (a + b >= vonSumme && a + b <= bisSumme) return [a, b];
  }
  return vonSumme >= 60 ? [43, 25] : [23, 14];
}

function mitUebergang(rng: Rng): [number, number] {
  const e1 = rng.int(1, 9);
  // now and then the sum is exactly 100
  if (rng.chance(0.1)) {
    const z1 = rng.int(1, 8);
    return [z1 * 10 + e1, (9 - z1) * 10 + (10 - e1)];
  }
  const z1 = rng.int(1, 7);
  return [z1 * 10 + e1, rng.int(1, 8 - z1) * 10 + rng.int(10 - e1, 9)];
}

/** Two different addends: in 22 + □ = 44 the answer would stand in the task. */
function verschieden(pair: (rng: Rng) => [number, number]) {
  return (rng: Rng): [number, number] => {
    for (let i = 0; i < 40; i++) {
      const [a, b] = pair(rng);
      if (a !== b) return [a, b];
    }
    return pair === mitUebergang ? [38, 27] : [34, 25];
  };
}
const ohneVerschieden = verschieden(ohneUebergang);
const mitVerschieden = verschieden(mitUebergang);

/** Near 100 hardly any neighbour keeps a new ten and stays up to 100: a choice needs room for its wrong options. */
function mitAuswahl(rng: Rng): [number, number] {
  for (let i = 0; i < 40; i++) {
    const [a, b] = mitUebergang(rng);
    if (a + b <= 90) return [a, b];
  }
  return [38, 27];
}

const istOhne = (x: number, y: number) => einer(x) + einer(y) < 10;
const istMit = (x: number, y: number) => einer(x) + einer(y) >= 10;

/** A wall with the top up to 100 and stones that differ: a hint names the stones, so it must not name an answer by chance. */
function mauerZahlen(rng: Rng): [number, number, number] {
  for (let i = 0; i < 40; i++) {
    const b = zweistellig(rng, 1, 2, 1, 5);
    const a = zweistellig(rng, 1, 2);
    const c = rng.int(11, Math.min(35, 100 - a - 2 * b));
    if (a !== b && a !== c) return [a, b, c];
  }
  return [12, 15, 23];
}

/** A new ten where the number in the gap stands nowhere else: 14 + 26 = 20 + □ would show its 20. */
function gleichZahlen(rng: Rng): [number, number] {
  for (let i = 0; i < 40; i++) {
    const [a, b] = mitUebergang(rng);
    const ten = naechsterZehner(a);
    const v = a + b - ten;
    if (v !== ten && v !== a && v !== b) return [a, b];
  }
  return [38, 27];
}

const formen: Formen = {
  1: {
    1: [(rng) => schrittAufgabe(...ohneUebergang(rng, 22, 59)), (rng) => plusAufgabe(...ohneUebergang(rng, 22, 59))],
    2: [(rng) => plusAufgabe(...ohneUebergang(rng, 60, 99), false)],
    3: [
      (rng) => {
        const [a, b] = ohneVerschieden(rng);
        return lueckenAufgabe(a, b, false);
      },
      (rng) => {
        const [a, b] = ohneVerschieden(rng);
        return ergebnisWaehlen(rng, a, PLUS_OP, b, istOhne, weg(a, b));
      },
    ],
  },
  2: {
    1: [(rng) => schrittAufgabe(...mitUebergang(rng)), (rng) => plusAufgabe(...mitUebergang(rng))],
    2: [(rng) => plusAufgabe(...mitUebergang(rng), false)],
    3: [
      (rng) => {
        const [a, b] = mitUebergang(rng);
        return wegLuecke(a, PLUS_OP, zehner(b), einer(b), 'zweiter');
      },
      (rng) => {
        const [a, b] = mitUebergang(rng);
        return wegLuecke(a, PLUS_OP, zehner(b), einer(b), 'erster');
      },
      (rng) => {
        const [a, b] = mitAuswahl(rng);
        return ergebnisWaehlen(rng, a, PLUS_OP, b, istMit, weg(a, b));
      },
    ],
  },
  3: {
    1: [
      (rng) => {
        const [a, b] = mitVerschieden(rng);
        return lueckenAufgabe(a, b, false);
      },
    ],
    2: [
      (rng) => {
        const [a, b] = mitVerschieden(rng);
        return lueckenAufgabe(a, b, true);
      },
      (rng) => mauerAufgabe(...mauerZahlen(rng)),
    ],
    3: [
      (rng) => mauerRueckwaerts(...mauerZahlen(rng)),
      (rng) => gleichAufgabe(...gleichZahlen(rng)),
    ],
  },
};

export const plusBis100Skill = defineSkill({
  id: 'plusminus.plus-bis-100',
  title: 'Plus bis 100',
  description: 'Du addierst zweistellige Zahlen.',
  stufen: { 1: '2 Zahlen ohne neuen Zehner: 34 + 25', 2: '2 Zahlen mit neuem Zehner: 38 + 27', 3: 'Lücken füllen: 38 + □ = 65; Zahlenmauern bis 100' },
  kmk: ['ZO.strategien'],
  formen,
});
