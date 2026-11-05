/**
 * Über den Zehner: Stufe 1 ZE + E in steps, Stufe 2 ZE − E, Stufe 3 missing numbers and two steps in order (docs/research.md §6).
 * The way always stops at the ten (Rechenstrich in the worked steps).
 */
import { BOX } from '../../core/format';
import type { Bug, MultiField, Rng, Visual } from '../../core/types';
import { bugList, makeChoice, multiBugs } from '../shared';
import { MINUS_OP, PLUS_OP, defineSkill, einer, gegen, gehen, kommen, minus, naechsterZehner, plus, rechenstrich, rechne, term, wegLuecke, zehner, zehnerLinie, zweistellig, type Formen, type Op, type Task } from './rechnen';

const RECHENZEICHEN = 'Schau noch einmal auf das Rechenzeichen.';

/** The two steps of a ± b: first to the ten, then the rest. */
function zerlege(a: number, op: Op, b: number) {
  const zuZehner = op === PLUS_OP ? naechsterZehner(a) - a : einer(a);
  const stop = rechne(a, op, zuZehner);
  return { zuZehner, stop, rest: b - zuZehner, ergebnis: rechne(a, op, b) };
}

/** Typical wrong results of a ± b across a ten (docs/research.md §5). */
export function rechenBugs(a: number, op: Op, b: number): [string, number | null, string][] {
  const { zuZehner, rest, ergebnis } = zerlege(a, op, b);
  const e = einer(a);
  if (op === PLUS_OP) {
    return [
      ['zehner-vergessen', ergebnis - 10, `${plus(e, b)} ist mehr als 10. Der Zehner wird größer.`],
      ['zaehlen-eins-daneben', ergebnis - 1, `Fast! Rechne erst ${plus(a, zuZehner)}, dann noch ${rest}.`],
      ['plus-minus-getauscht', a - b, RECHENZEICHEN],
    ];
  }
  return [
    ['kleiner-von-groesser', zehner(a) + (b - e), `${minus(e, b)} geht nicht. Rechne erst ${minus(a, e)}, dann weiter.`],
    ['zehner-vergessen', ergebnis + 10, `${b} ist mehr als ${e}. Der Zehner wird kleiner.`],
    ['zaehlen-eins-daneben', ergebnis + 1, `Fast! Rechne erst ${minus(a, e)}, dann noch ${rest} weg.`],
    ['plus-minus-getauscht', a + b, RECHENZEICHEN],
  ];
}

const schritte = (a: number, op: Op, b: number): Task['steps'] => {
  const { zuZehner, stop, rest, ergebnis } = zerlege(a, op, b);
  return [`Erst zum Zehner: ${term(a, op, zuZehner)} = ${stop}`, { text: `Dann weiter: ${term(stop, op, rest)} = ${ergebnis}`, visual: rechenstrich([a, stop, ergebnis]) }];
};

const praiseFor = (op: Op) => (op === PLUS_OP ? 'Du bist erst zum Zehner gegangen.' : 'Du bist erst zurück zum Zehner gegangen.');

/** a ± b as a number answer. The task's line starts at the ten below (plus) or one ten lower (minus). */
export function zehnerAufgabe(a: number, op: Op, b: number, scaffold: boolean): Task {
  const { zuZehner, stop, rest, ergebnis } = zerlege(a, op, b);
  const von = op === PLUS_OP ? zehner(a) : zehner(a) - 10;
  const linie = zehnerLinie(a, von) as Extract<Visual, { type: 'numberLine' }>;
  const visual: Visual = scaffold ? { ...linie, marks: [], labels: [a], jumps: [{ from: a, to: stop, label: term('', op, zuZehner).trim() }] } : linie;
  return {
    key: `${scaffold ? 'gestuetzt' : 'rechnen'}:${term(a, op, b)}`,
    prompt: 'Rechne.',
    expression: `${term(a, op, b)} = ${BOX}`,
    visual,
    answer: { kind: 'number', value: ergebnis },
    hints: [`Rechne erst zum Zehner: ${term(a, op, zuZehner)}.`, op === PLUS_OP ? `Dann ${kommen(rest)} noch ${rest} dazu.` : `Dann ${gehen(rest)} noch ${rest} weg.`],
    steps: schritte(a, op, b),
    bugs: bugList(ergebnis, rechenBugs(a, op, b)),
    praise: praiseFor(op),
  };
}

/**
 * a ± b in three fields: a ± [to the ten] = ten, then ten ± [rest], then the result. Fields wrap one by one on a phone and on
 * paper, so each carries its own text: a '=' at the end of one field would leave the next as a lone box on its own line.
 */
export function schrittAufgabe(a: number, op: Op, b: number): Task {
  const { zuZehner, stop, rest, ergebnis } = zerlege(a, op, b);
  const e = einer(a);
  const fields: MultiField[] = [
    { id: 'bis', before: `${term(a, op, '')}`.trim(), value: zuZehner, after: `= ${stop}` },
    { id: 'rest', before: `Dann: ${term(stop, op, '')}`.trim(), value: rest },
    { id: 'ziel', before: 'Ergebnis:', value: ergebnis, label: 'Ergebnis' },
  ];
  const bugs: Bug[] = multiBugs(
    [
      ...rechenBugs(a, op, b)
        .filter(([id]) => id !== 'zaehlen-eins-daneben')
        .map(([id, m, hint]): Bug | null => (m === null ? null : { id, match: { ziel: m }, hint })),
      // The hint of the plain task names both parts: here they are answers of their own.
      { id: 'zaehlen-eins-daneben', match: { ziel: op === PLUS_OP ? ergebnis - 1 : ergebnis + 1 }, hint: 'Fast! Schau noch einmal auf die Einer.' },
      op === PLUS_OP && { id: 'einer-genannt', match: { bis: e }, hint: `${e === 1 ? '1 ist der Einer' : `${e} sind die Einer`}. Wie viel fehlt bis zum Zehner?` },
      { id: 'rest-ganz', match: { rest: b }, hint: `Ein Teil von ${b} ist schon gerechnet. Wie viel bleibt?` },
    ],
    fields,
  );
  return {
    key: `schritte:${term(a, op, b)}`,
    prompt: 'Rechne in 2 Schritten.',
    expression: `${term(a, op, b)} = ${BOX}`,
    answer: { kind: 'multi', fields },
    hints: [`Wie weit ist es von ${a} bis ${stop}?`, `Zerlege die ${b}: Ein Teil geht bis ${stop}, der Rest kommt danach.`],
    steps: schritte(a, op, b),
    bugs,
    praise: praiseFor(op),
  };
}

/** a + □ = c or a − □ = c across a ten. */
export function lueckenAufgabe(a: number, op: Op, b: number): Task {
  const { zuZehner, stop, rest, ergebnis } = zerlege(a, op, b);
  const eA = einer(a);
  const eC = einer(ergebnis);
  return {
    key: `luecke:${term(a, op, b)}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `${term(a, op, BOX)} = ${ergebnis}`,
    answer: { kind: 'number', value: b },
    hints: [`Gehe erst von ${a} bis zum Zehner.`, `Wie weit ist es von dort bis ${ergebnis}?`],
    steps: [`Bis zum Zehner: ${term(a, op, zuZehner)} = ${stop}`, { text: `Bis ${ergebnis}: ${term(stop, op, rest)} = ${ergebnis}`, visual: rechenstrich([a, stop, ergebnis]) }, `Zusammen: ${plus(zuZehner, rest)} = ${b}`],
    bugs: bugList(b, [
      ['platzhalter-summe', a + ergebnis, op === PLUS_OP ? `Die ganze Seite ergibt ${ergebnis}. Wie viel fehlt bis ${ergebnis}?` : `Von ${a} geht etwas weg. Es bleiben ${ergebnis}.`],
      ['einer-genannt', Math.abs(eA - eC), 'Schau nicht nur auf die Einer. Du gehst über den Zehner.'],
      ['zaehlen-eins-daneben', b - 1, `Fast! Prüfe: ${term(a, op, b - 1)} ist nicht ${ergebnis}.`],
      ['zaehlen-eins-daneben', b + 1, `Fast! Prüfe: ${term(a, op, b + 1)} ist nicht ${ergebnis}.`],
    ]),
    praise: 'Du hast den Weg in 2 Schritten geteilt.',
  };
}

/** Two steps in order: name the ten first, then the result. */
export function zehnerZuerst(a: number, op: Op, b: number): Task {
  const { stop, ergebnis } = zerlege(a, op, b);
  const fields: MultiField[] = [
    { id: 'zehner', before: 'Erst zum Zehner:', value: stop },
    { id: 'ziel', before: 'Dann weiter:', value: ergebnis },
  ];
  const zehnerRichtung = op === PLUS_OP ? stop - 10 : stop + 10;
  const bugs = multiBugs(
    [
      { id: 'zehner-richtung', match: { zehner: zehnerRichtung }, hint: op === PLUS_OP ? `Du rechnest plus. Der Zehner liegt über ${a}.` : `Du rechnest minus. Der Zehner liegt unter ${a}.` },
      ...rechenBugs(a, op, b)
        .filter(([id]) => id !== 'zaehlen-eins-daneben')
        .map(([id, m, hint]): Bug | null => (m === null ? null : { id, match: { ziel: m }, hint })),
      { id: 'zaehlen-eins-daneben', match: { ziel: op === PLUS_OP ? ergebnis - 1 : ergebnis + 1 }, hint: 'Fast! Schau noch einmal auf die Einer.' },
    ],
    fields,
  );
  return {
    key: `zuerst:${term(a, op, b)}`,
    prompt: 'Rechne in 2 Schritten.',
    expression: `${term(a, op, b)} = ${BOX}`,
    answer: { kind: 'multi', fields },
    hints: [op === PLUS_OP ? 'Welcher Zehner kommt als nächster?' : 'Welcher Zehner kommt rückwärts als nächster?', `Zerlege die ${b}: Erst bis zum Zehner, dann den Rest.`],
    steps: schritte(a, op, b),
    bugs,
    praise: 'Du hast 2 Schritte der Reihe nach gemacht.',
  };
}

/** □ + b = c or □ − b = c across a ten: the start of the way is missing. */
export function startLuecke(a: number, op: Op, b: number): Task {
  const { zuZehner, stop, rest, ergebnis } = zerlege(a, op, b);
  const zurueck = gegen(op);
  return {
    key: `start:${term(a, op, b)}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `${term(BOX, op, b)} = ${ergebnis}`,
    answer: { kind: 'number', value: a },
    hints: [`Rechne rückwärts: ${term(ergebnis, zurueck, b)}.`, `Gehe erst von ${ergebnis} bis zum Zehner.`],
    steps: [`Bis zum Zehner: ${term(ergebnis, zurueck, rest)} = ${stop}`, { text: `Dann weiter: ${term(stop, zurueck, zuZehner)} = ${a}`, visual: rechenstrich([ergebnis, stop, a]) }, `Probe: ${term(a, op, b)} = ${ergebnis}`],
    bugs: bugList(a, [
      ['platzhalter-summe', op === PLUS_OP ? b + ergebnis : Math.abs(ergebnis - b), op === PLUS_OP ? `Die ganze Seite ergibt ${ergebnis}. Die Zahl vorne ist kleiner.` : `Das Ergebnis ist ${ergebnis}. Die Zahl vorne ist größer.`],
      ['zaehlen-eins-daneben', a - 1, `Fast! Prüfe: ${term(a - 1, op, b)} ist nicht ${ergebnis}.`],
      ['zaehlen-eins-daneben', a + 1, `Fast! Prüfe: ${term(a + 1, op, b)} ist nicht ${ergebnis}.`],
    ]),
    praise: 'Du hast rückwärts gerechnet und geprüft.',
  };
}

/** a + b = stop + □ (also with minus): both sides are worth the same, and the ten is already on the right. */
export function gleichZumZehner(a: number, op: Op, b: number): Task {
  const { stop, rest, ergebnis } = zerlege(a, op, b);
  return {
    key: `gleich:${term(a, op, b)}`,
    prompt: 'Beide Seiten sind gleich viel. Welche Zahl fehlt?',
    expression: `${term(a, op, b)} = ${term(stop, op, BOX)}`,
    answer: { kind: 'number', value: rest },
    hints: [`Wie weit ist es von ${a} bis ${stop}?`, `Zerlege die ${b}. Wie viel bleibt?`],
    steps: [`Links: ${term(a, op, b)} = ${ergebnis}`, { text: `Rechts: ${term(stop, op, rest)} = ${ergebnis}`, visual: rechenstrich([a, stop, ergebnis]) }],
    bugs: bugList(rest, [
      ['gleichheit', ergebnis, 'Beide Seiten sind gleich viel. Rechne links zuerst.'],
      ['rest-ganz', b, `Ein Teil von ${b} ist schon gerechnet. Wie viel bleibt?`],
      ['zaehlen-eins-daneben', rest + 1, `Fast! Prüfe: ${term(stop, op, rest + 1)} ist nicht ${ergebnis}.`],
    ]),
    praise: 'Du hast beide Seiten gleich groß gemacht.',
    knobel: true,
  };
}

/** Which way goes over the ten? Only one split adds up to b: a true way in another order would be a right answer scored as wrong. */
export function wegWaehlen(rng: Rng, a: number, op: Op, b: number): Task {
  const { zuZehner, stop, rest, ergebnis } = zerlege(a, op, b);
  const weg = (x: number, y: number) => term(term(a, op, x), op, y);
  const falsch = (x: number, y: number) => ({ label: weg(x, y), whyWrong: `Prüfe: ${plus(x, y)} ist nicht ${b}.` });
  const paare: [number, number][] = [[zuZehner, rest + 1], [zuZehner + 1, rest], [zuZehner, rest - 1], [zuZehner - 1, rest]];
  return {
    key: `weg-waehlen:${term(a, op, b)}`,
    prompt: 'Welcher Weg geht über den Zehner?',
    expression: `${term(a, op, b)} = ${BOX}`,
    answer: makeChoice(rng, { label: weg(zuZehner, rest) }, paare.filter(([x, y]) => x > 0 && y > 0).map(([x, y]) => falsch(x, y))),
    hints: [`Mit welcher Zahl kommst du von ${a} genau zum Zehner?`, `Beide Teile zusammen müssen ${b} ergeben.`],
    steps: [`Zum Zehner: ${term(a, op, zuZehner)} = ${stop}`, { text: `Dann weiter: ${term(stop, op, rest)} = ${ergebnis}`, visual: rechenstrich([a, stop, ergebnis]) }],
    praise: 'Du hast den Weg über den Zehner erkannt.',
  };
}

/** a with ones ≥ 2 and b such that a + b crosses a ten, or a with ones ≤ 8 and b such that a − b crosses a ten. */
function paar(rng: Rng, op: Op): [number, number] {
  if (op === PLUS_OP) {
    const a = zweistellig(rng, 1, 8, 2, 9);
    return [a, rng.int(11 - einer(a), 9)];
  }
  const a = zweistellig(rng, 2, 9, 1, 8);
  return [a, rng.int(einer(a) + 1, 9)];
}

const mitPaar = (op: Op, form: (a: number, op: Op, b: number) => Task) => (rng: Rng) => {
  const [a, b] = paar(rng, op);
  return form(a, op, b);
};

/** A step of the way as a gap, when no copy of the answer stands next to the gap (35 + 5 + □ = 40 would show the 5). */
const schrittLuecke = (op: Op, teil: 'erster' | 'zweiter') => (rng: Rng) => {
  for (let i = 0; i < 40; i++) {
    const [a, b] = paar(rng, op);
    const { zuZehner, rest } = zerlege(a, op, b);
    if (zuZehner !== rest) return wegLuecke(a, op, zuZehner, rest, teil);
  }
  return op === PLUS_OP ? wegLuecke(35, op, 5, 3, teil) : wegLuecke(43, op, 3, 4, teil);
};

const formen: Formen = {
  1: {
    1: [mitPaar(PLUS_OP, schrittAufgabe)],
    2: [mitPaar(PLUS_OP, (a, op, b) => zehnerAufgabe(a, op, b, true))],
    3: [schrittLuecke(PLUS_OP, 'zweiter'), schrittLuecke(PLUS_OP, 'erster'), (rng) => mitPaar(PLUS_OP, (a, op, b) => wegWaehlen(rng, a, op, b))(rng)],
  },
  2: {
    1: [mitPaar(MINUS_OP, schrittAufgabe), mitPaar(MINUS_OP, (a, op, b) => zehnerAufgabe(a, op, b, true))],
    2: [mitPaar(MINUS_OP, (a, op, b) => zehnerAufgabe(a, op, b, false))],
    3: [schrittLuecke(MINUS_OP, 'zweiter'), schrittLuecke(MINUS_OP, 'erster'), (rng) => mitPaar(MINUS_OP, (a, op, b) => wegWaehlen(rng, a, op, b))(rng)],
  },
  3: {
    1: [mitPaar(PLUS_OP, zehnerZuerst), mitPaar(MINUS_OP, zehnerZuerst)],
    2: [mitPaar(PLUS_OP, lueckenAufgabe), mitPaar(MINUS_OP, lueckenAufgabe)],
    3: [mitPaar(PLUS_OP, startLuecke), mitPaar(MINUS_OP, startLuecke), mitPaar(PLUS_OP, gleichZumZehner), mitPaar(MINUS_OP, gleichZumZehner)],
  },
};

export const ueberDenZehnerSkill = defineSkill({
  id: 'plusminus.ueber-den-zehner',
  title: 'Über den Zehner',
  description: 'Du rechnest erst zum Zehner und dann weiter.',
  stufen: { 1: 'Plus über den Zehner in Schritten: 35 + 5 + 3', 2: 'Minus über den Zehner: 43 − 7', 3: 'Lücken füllen: 35 + □ = 42; 2 Schritte der Reihe nach' },
  kmk: ['ZO.strategien'],
  formen,
});
