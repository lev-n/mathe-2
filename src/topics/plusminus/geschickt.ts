/**
 * Geschickt rechnen: Stufe 1 + 9, + 11, − 9 via the neighbouring ten, Stufe 2 + 19, + 29, − 19, Stufe 3 choosing the way that holds
 * and moving 1 or 2 from one number to the other: 39 + 24 = 40 + 23 (docs/research.md §6).
 */
import { BOX } from '../../core/format';
import type { Rng } from '../../core/types';
import { bugList, makeChoice } from '../shared';
import { MINUS_OP, PLUS_OP, defineSkill, gegen, minus, plus, rechenstrich, rechne, term, zehner, zweistellig, type Formen, type Op, type Task } from './rechnen';

const RECHENZEICHEN = 'Schau noch einmal auf das Rechenzeichen.';

/** The ten that helps with n: 9 → 10, 11 → 10, 19 → 20, 29 → 30. */
export const hilfsZehner = (n: number) => Math.round(n / 10) * 10;

/** a ± n via the neighbouring ten. mitHilfe names the ten and draws its jump; without it the child finds the ten alone. */
export function hilfsAufgabe(a: number, op: Op, n: number, mitHilfe = true): Task {
  const ten = hilfsZehner(n);
  const v = rechne(a, op, n);
  const zwischen = rechne(a, op, ten);
  const zuViel = n < ten;
  // After the ten: + 9 takes 1 back, + 11 adds 1 more, − 9 gives 1 back.
  const korrektur: Op = (op === PLUS_OP) === zuViel ? MINUS_OP : PLUS_OP;
  const bugs =
    op === PLUS_OP
      ? zuViel
        ? ([
            ['hilfsaufgabe-richtung', a + ten + 1, `${ten} ist 1 zu viel. Nimm die 1 wieder weg.`],
            ['hilfsaufgabe-vergessen', a + ten, `Du hast ${plus(a, ten)} gerechnet. Nimm noch 1 weg.`],
          ] as [string, number, string][])
        : ([
            ['hilfsaufgabe-richtung', a + ten - 1, `${n} ist 1 mehr als ${ten}. Gib die 1 noch dazu.`],
            ['hilfsaufgabe-vergessen', a + ten, `Du hast ${plus(a, ten)} gerechnet. Gib noch 1 dazu.`],
          ] as [string, number, string][])
      : ([
          ['hilfsaufgabe-richtung', a - ten - 1, `${ten} ist 1 zu viel. Gib die 1 wieder dazu.`],
          ['hilfsaufgabe-vergessen', a - ten, `Du hast ${ten} weggenommen. Gib noch 1 dazu.`],
        ] as [string, number, string][]);
  return {
    key: `${mitHilfe ? 'hilfe' : 'ohne'}:${term(a, op, n)}`,
    prompt: mitHilfe ? `Nimm die ${ten} als Hilfe.` : 'Rechne geschickt.',
    expression: `${term(a, op, n)} = ${BOX}`,
    ...(mitHilfe ? { visual: rechenstrich([a, zwischen]) } : {}),
    answer: { kind: 'number', value: v },
    hints: [mitHilfe ? `Rechne zuerst ${term(a, op, ten)}.` : `Welcher Zehner liegt neben ${n}?`, zuViel ? `${n} ist 1 weniger als ${ten}.` : `${n} ist 1 mehr als ${ten}.`],
    steps: [
      `Hilfe: ${term(a, op, ten)} = ${zwischen}`,
      { text: `${zuViel ? `${ten} ist 1 zu viel` : `Noch 1 dazu`}: ${term(zwischen, korrektur, 1)} = ${v}`, visual: rechenstrich([a, zwischen, v]) },
    ],
    bugs: bugList(v, [...bugs, ['plus-minus-getauscht', op === PLUS_OP ? a - n : a + n, RECHENZEICHEN]]),
    praise: 'Du hast den Zehner genutzt und ausgeglichen.',
  };
}

/** Which way over a ten holds? Only one does: a longer true way as an option would be a right answer scored as wrong. */
export function wegWaehlen(rng: Rng, a: number, op: Op, n: number): Task {
  const ten = hilfsZehner(n);
  const v = rechne(a, op, n);
  const zurueck: Op = op === PLUS_OP ? MINUS_OP : PLUS_OP;
  const richtig = term(term(a, op, ten), zurueck, 1);
  const wrongs = [
    { label: term(term(a, op, ten), op, 1), whyWrong: `${ten} ist schon 1 zu viel. Gleiche anders aus.` },
    { label: term(term(a, op, zehner(n)), zurueck, 1), whyWrong: `Prüfe: ${zehner(n)} ist viel weniger als ${n}.` },
    ...(rechne(a, op, ten + 10) > 100 || rechne(a, op, ten + 10) < 1 ? [] : [{ label: term(term(a, op, ten + 10), zurueck, 1), whyWrong: `Prüfe: ${ten + 10} ist viel mehr als ${n}.` }]),
  ];
  return {
    key: `weg:${term(a, op, n)}`,
    prompt: 'Welcher Weg über den Zehner stimmt?',
    expression: `${term(a, op, n)} = ${BOX}`,
    answer: makeChoice(rng, { label: richtig }, wrongs),
    hints: [`Welcher Zehner liegt neben ${n}?`, `Mit dem Zehner rechnest du 1 zu viel. Gleiche danach aus.`],
    steps: [`${n} liegt neben ${ten}.`, `Hilfe: ${term(a, op, ten)} = ${rechne(a, op, ten)}`, `Ausgleichen: ${term(rechne(a, op, ten), zurueck, 1)} = ${v}`],
    praise: 'Du hast den Weg über den Zehner gewählt.',
  };
}

/** 39 + 24 = 40 + □: the first number goes up to a ten, the second goes down by as much. */
export function ausgleichAufgabe(a: number, b: number): Task {
  const ten = zehner(a) + 10;
  const d = ten - a;
  const v = b - d;
  const s = a + b;
  return {
    key: `ausgleich:${a}:${b}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `${plus(a, b)} = ${plus(ten, BOX)}`,
    answer: { kind: 'number', value: v },
    hints: [`${a} wird um ${d} größer: ${plus(a, d)} = ${ten}.`, `Wie muss sich ${b} dann ändern?`],
    steps: [`Links: ${plus(a, b)} = ${s}`, `Rechts: ${plus(ten, v)} = ${s}`, `Also: ${minus(b, d)} = ${v}`],
    bugs: bugList(v, [
      ['hilfsaufgabe-vergessen', b, `${a} wird ${d} größer. Also wird ${b} um ${d} kleiner.`],
      ['hilfsaufgabe-richtung', b + d, `${a} wird größer. Dann muss ${b} kleiner werden.`],
      ['gleichheit', s, `Beide Seiten sind gleich viel. Rechts steht schon ${ten}.`],
    ]),
    praise: 'Du hast von einer Zahl zur anderen ausgeglichen.',
    knobel: true,
  };
}

/** a + □ = c or a − □ = c with n next to a ten: the gap asks for the number the ten stands for. */
export function hilfsLuecke(a: number, op: Op, n: number): Task {
  const ten = hilfsZehner(n);
  const c = rechne(a, op, n);
  const zwischen = rechne(a, op, ten);
  const zuViel = n < ten;
  const korrektur: Op = (op === PLUS_OP) === zuViel ? MINUS_OP : PLUS_OP;
  const anders = zuViel ? ten + 1 : ten - 1;
  return {
    key: `luecke:${term(a, op, n)}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `${term(a, op, BOX)} = ${c}`,
    answer: { kind: 'number', value: n },
    hints: [`Rechne zuerst ${term(a, op, ten)}. Wie weit ist es dann bis ${c}?`, 'Der nächste Zehner hilft dir.'],
    steps: [{ text: `Hilfe: ${term(a, op, ten)} = ${zwischen}`, visual: rechenstrich([a, zwischen]) }, `Bis ${c}: ${term(zwischen, korrektur, 1)} = ${c}`, { text: `Also: ${term(a, op, n)} = ${c}`, visual: rechenstrich([a, zwischen, c]) }],
    bugs: bugList(n, [
      ['hilfsaufgabe-vergessen', ten, `Du hast den Zehner genannt. Das ist 1 ${zuViel ? 'zu viel' : 'zu wenig'}.`],
      ['hilfsaufgabe-richtung', anders, `Prüfe: ${term(a, op, anders)} ist nicht ${c}.`],
    ]),
    praise: 'Du hast den Zehner genutzt und ausgeglichen.',
  };
}

/** The way is shown: which task does it belong to? a + 10 − 1 belongs to a + 9. */
export function wegErkennen(rng: Rng, a: number, op: Op, n: number): Task {
  const ten = hilfsZehner(n);
  const zuViel = n < ten;
  const korrektur: Op = (op === PLUS_OP) === zuViel ? MINUS_OP : PLUS_OP;
  const anders = zuViel ? ten + 1 : ten - 1;
  // What the ten and the 1 stand for: 10 − 1 is 9, also in a − 10 + 1.
  const wert = zuViel ? minus(ten, 1) : plus(ten, 1);
  const anderes = gegen(op);
  const moeglich = (o: Op, x: number) => rechne(a, o, x) >= 0 && rechne(a, o, x) <= 100;
  const wrongs = [
    ...(moeglich(op, anders) ? [{ label: term(a, op, anders), whyWrong: `Prüfe: ${wert} ist nicht ${anders}.` }] : []),
    ...(moeglich(anderes, n) ? [{ label: term(a, anderes, n), whyWrong: RECHENZEICHEN }] : []),
    ...(moeglich(anderes, anders) ? [{ label: term(a, anderes, anders), whyWrong: RECHENZEICHEN }] : []),
    ...(moeglich(op, n + 10) ? [{ label: term(a, op, n + 10), whyWrong: `Prüfe: ${wert} ist nicht ${n + 10}.` }] : []),
  ];
  const v = rechne(a, op, n);
  return {
    key: `erkennen:${term(a, op, n)}`,
    prompt: 'Zu welcher Aufgabe passt dieser Weg?',
    expression: term(term(a, op, ten), korrektur, 1),
    answer: makeChoice(rng, { label: term(a, op, n) }, wrongs),
    hints: ['Schau auf beide Rechenzeichen im Weg.', `Rechne die ${ten} und die 1 zusammen.`],
    steps: [`${wert} = ${n}`, `${term(term(a, op, ten), korrektur, 1)} = ${v}`, `Also passt: ${term(a, op, n)} = ${v}`],
    praise: 'Du hast die Aufgabe hinter dem Weg erkannt.',
  };
}

/** 39 + 24 = □ + 23: the same move, with the ten as the missing number. */
export function ausgleichVorne(a: number, b: number): Task {
  const ten = zehner(a) + 10;
  const d = ten - a;
  const v = b - d;
  const s = a + b;
  return {
    key: `ausgleich-vorne:${a}:${b}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `${plus(a, b)} = ${plus(BOX, v)}`,
    answer: { kind: 'number', value: ten },
    hints: [`${b} wird um ${d} kleiner.`, `Wie muss sich ${a} dann ändern?`],
    steps: [`Links: ${plus(a, b)} = ${s}`, `Rechts: ${plus(ten, v)} = ${s}`, `Also: ${plus(a, d)} = ${ten}`],
    bugs: bugList(ten, [
      ['hilfsaufgabe-vergessen', a, `${b} wird ${d} kleiner. Also wird ${a} um ${d} größer.`],
      ['hilfsaufgabe-richtung', a - d, `${b} wird kleiner. Dann muss ${a} größer werden.`],
      ['gleichheit', s, 'Beide Seiten sind gleich viel. Rechne links zuerst.'],
    ]),
    praise: 'Du hast von einer Zahl zur anderen ausgeglichen.',
    knobel: true,
  };
}

/** 63 − 29 = 64 − □: with minus both numbers move the same way, so the difference stays. */
export function minusAusgleich(a: number, b: number): Task {
  const ten = zehner(b) + 10;
  const d = ten - b;
  const links = a - b;
  return {
    key: `ausgleich-minus:${a}:${b}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `${minus(a, b)} = ${minus(a + d, BOX)}`,
    answer: { kind: 'number', value: ten },
    hints: [`${a} wird um ${d} größer.`, `Bei Minus ändert sich ${b} genauso.`],
    steps: [`Links: ${minus(a, b)} = ${links}`, `Rechts: ${minus(a + d, ten)} = ${links}`, `Also: ${plus(b, d)} = ${ten}`],
    bugs: bugList(ten, [
      ['hilfsaufgabe-vergessen', b, `${a} wird ${d} größer. Also wird auch ${b} um ${d} größer.`],
      ['hilfsaufgabe-richtung', b - d, `Bei Minus ändern sich beide Zahlen gleich. ${b} wird auch größer.`],
      ['gleichheit', links, 'Beide Seiten sind gleich viel. Rechne links zuerst.'],
    ]),
    praise: 'Du hast beide Zahlen gleich verändert.',
    knobel: true,
  };
}

/** Which task is worth the same and easier? 39 + 24 is 40 + 23; each other option changes the sum. */
export function ausgleichWaehlen(rng: Rng, a: number, b: number): Task {
  const ten = zehner(a) + 10;
  const d = ten - a;
  const falsch = (x: number, y: number, whyWrong: string) => ({ label: plus(x, y), whyWrong });
  return {
    key: `ausgleich-wahl:${a}:${b}`,
    prompt: 'Welche Aufgabe ist gleich viel und leichter?',
    expression: plus(a, b),
    answer: makeChoice(rng, { label: plus(ten, b - d) }, [
      ...(ten + b <= 100 ? [falsch(ten, b, `${a} wird ${d} größer. Also wird ${b} um ${d} kleiner.`)] : []),
      ...(ten + b + d <= 100 ? [falsch(ten, b + d, `${a} wird größer. Dann muss ${b} kleiner werden.`)] : []),
      falsch(zehner(a), b - d, `Prüfe: ${zehner(a)} ist viel kleiner als ${a}.`),
      falsch(ten, b - d - 1, `${a} wird ${d} größer. Also wird ${b} um ${d} kleiner.`),
    ]),
    hints: ['Eine Zahl wird größer. Die andere wird um genauso viel kleiner.', `Welcher Zehner liegt neben ${a}?`],
    steps: [`${a} wird zu ${ten}: ${plus(a, d)} = ${ten}`, `${b} wird kleiner: ${minus(b, d)} = ${b - d}`, `Also: ${plus(ten, b - d)} = ${a + b}`],
    praise: 'Du hast die leichtere Aufgabe erkannt.',
    knobel: true,
  };
}

function zeZahl(rng: Rng, von: number, bis: number): number {
  const a = rng.int(von, bis);
  return a % 10 === 0 ? a + 1 : a;
}

/** a − n with a result that is no neighbouring ten of n: 19 − 9 = 10 and 39 − 19 = 20 have their answer in 'Nimm die 10 als Hilfe'. */
function minusStart(rng: Rng, von: number, bis: number, n: number): number {
  const a = zeZahl(rng, von, bis);
  return a === n + hilfsZehner(n) ? a + 2 : a;
}

/** A start and a number next to a ten, on the Stufe's list. a stays in the range of its task, a − n at least 1. */
type Paar = [number, Op, number];
const stufe1: readonly ((rng: Rng) => Paar)[] = [
  (rng) => [zeZahl(rng, 12, 89), PLUS_OP, 9],
  (rng) => [zeZahl(rng, 12, 88), PLUS_OP, 11],
  (rng) => [minusStart(rng, 12, 98, 9), MINUS_OP, 9],
];
const stufe2: readonly ((rng: Rng) => Paar)[] = [
  (rng) => [zeZahl(rng, 12, 79), PLUS_OP, 19],
  (rng) => [zeZahl(rng, 12, 69), PLUS_OP, 29],
  (rng) => [minusStart(rng, 22, 98, 19), MINUS_OP, 19],
];
/** Choosing a way on Stufe 3 goes further: + 39, + 49, − 29 and − 39 too. */
const stufe3: readonly ((rng: Rng) => Paar)[] = [
  ...stufe2.slice(0, 2),
  (rng) => [zeZahl(rng, 12, 59), PLUS_OP, 39],
  (rng) => [zeZahl(rng, 12, 49), PLUS_OP, 49],
  (rng) => [minusStart(rng, 41, 98, 19), MINUS_OP, 19],
  (rng) => [minusStart(rng, 51, 98, 29), MINUS_OP, 29],
  (rng) => [minusStart(rng, 61, 98, 39), MINUS_OP, 39],
];

const mit = (liste: readonly ((rng: Rng) => Paar)[], form: (rng: Rng, a: number, op: Op, n: number) => Task) => (rng: Rng) => form(rng, ...rng.pick(liste)(rng));

/** 39 + 24: a close below a ten, b large enough to give away d. */
function ausgleichZahlen(rng: Rng): [number, number] {
  for (let i = 0; i < 40; i++) {
    const a = zweistellig(rng, 1, 7, 8, 9);
    const b = rng.int(11, 100 - a - 1);
    const ten = zehner(a) + 10;
    const v = b - (ten - a);
    // No number of the task may be its answer: 39 + 40 = 40 + □, 39 + 41 = □ + 40.
    if (a !== b && b !== ten && v !== a && v !== ten) return [a, b];
  }
  return [39, 24];
}

/** 63 − 29: b close below a ten, the difference at least 1 and a + d up to 100. */
function minusZahlen(rng: Rng): [number, number] {
  for (let i = 0; i < 40; i++) {
    const b = zweistellig(rng, 1, 7, 8, 9);
    const a = rng.int(b + 1, 98);
    // 30 − 29 = 31 − □ would show the answer 30.
    if (a !== zehner(b) + 10) return [a, b];
  }
  return [63, 29];
}

/** 18 − □ = 9 and 19 + □ = 38 would show their answer. */
const lueckeOhneKopie = (_: Rng, a: number, op: Op, n: number) => hilfsLuecke((op === MINUS_OP ? a === 2 * n : a === n) ? a + 2 : a, op, n);

const formen: Formen = {
  1: {
    1: [mit(stufe1, (_, a, op, n) => hilfsAufgabe(a, op, n))],
    2: [mit(stufe1, (_, a, op, n) => hilfsAufgabe(a, op, n, false))],
    3: [mit(stufe1, lueckeOhneKopie), mit(stufe1, wegErkennen)],
  },
  2: {
    1: [mit(stufe2, (_, a, op, n) => hilfsAufgabe(a, op, n))],
    2: [mit(stufe2, (_, a, op, n) => hilfsAufgabe(a, op, n, false))],
    3: [mit(stufe2, lueckeOhneKopie), mit(stufe2, wegErkennen)],
  },
  3: {
    1: [mit(stufe3, wegWaehlen)],
    2: [(rng) => ausgleichAufgabe(...ausgleichZahlen(rng)), (rng) => ausgleichWaehlen(rng, ...ausgleichZahlen(rng))],
    3: [(rng) => ausgleichVorne(...ausgleichZahlen(rng)), (rng) => minusAusgleich(...minusZahlen(rng))],
  },
};

export const geschicktSkill = defineSkill({
  id: 'plusminus.geschickt',
  title: 'Geschickt rechnen',
  description: 'Du nimmst eine Nachbarzahl und rechnest leichter.',
  stufen: { 1: 'Plus 9, plus 11, minus 9 über den Zehner', 2: 'Plus 19, plus 29, minus 19 über den Zehner', 3: 'Den leichten Weg finden: 39 + 24 = 40 + 23' },
  kmk: ['ZO.strategien'],
  formen,
});
