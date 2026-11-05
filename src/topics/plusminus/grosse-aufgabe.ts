/**
 * Kleine und große Aufgabe: Stufe 1 the ones (4 + 3 helps with 64 + 3), Stufe 2 the tens (3 + 2 helps with 34 + 20), Stufe 3
 * choosing the small task and continuing a pattern (docs/research.md §6). The base-ten material keeps the tens and ones apart.
 */
import { BOX } from '../../core/format';
import type { MultiField, Rng, Visual } from '../../core/types';
import { bugList, makeChoice, multiBugs, speak } from '../shared';
import { MINUS_OP, PLUS_OP, defineSkill, einer, gegen, minus, plus, rechenstrich, rechne, term, type Formen, type Op, type Task } from './rechnen';

const RECHENZEICHEN = 'Schau noch einmal auf das Rechenzeichen.';

function material(a: number, op: Op, b: number): Visual {
  const mode = op === PLUS_OP ? ('dazu' as const) : ('weg' as const);
  const second = b % 10 === 0 ? { tens: b / 10, mode } : { ones: b, mode };
  return { type: 'baseTen', tens: Math.floor(a / 10), ones: einer(a), second };
}

/** ZE ± E without crossing. mitKlein shows the small task in the expression. */
export function einerAufgabe(a: number, op: Op, b: number, mitKlein: boolean): Task {
  const e = einer(a);
  const klein = term(e, op, b);
  const kleinWert = rechne(e, op, b);
  const v = rechne(a, op, b);
  const gross = term(a, op, b);
  return {
    key: `einer:${mitKlein ? 'k' : 'o'}:${gross}`,
    prompt: mitKlein ? 'Nutze die kleine Aufgabe.' : 'Rechne.',
    expression: mitKlein ? `${klein} = ${kleinWert}, also ${gross} = ${BOX}` : `${gross} = ${BOX}`,
    visual: material(a, op, b),
    answer: { kind: 'number', value: v },
    hints: [`Rechne die kleine Aufgabe: ${klein}.`, 'Der Zehner bleibt gleich.'],
    steps: [`Kleine Aufgabe: ${klein} = ${kleinWert}`, { text: `Große Aufgabe: ${gross} = ${v}`, visual: rechenstrich([a, v]) }],
    bugs: bugList(v, [
      ['stelle-verwechselt', rechne(a, op, 10 * b), `${b === 1 ? '1 ist ein Einer' : `${b} sind Einer`}. Der Zehner bleibt gleich.`],
      ['kleine-aufgabe-genannt', kleinWert, 'Das ist die kleine Aufgabe. Die Zehner kommen noch dazu.'],
      ['plus-minus-getauscht', rechne(a, gegen(op), b), RECHENZEICHEN],
    ]),
    praise: 'Du hast die kleine Aufgabe genutzt.',
  };
}

/** Whole tens: 40 + 30, 90 − 50, 34 + 20, 34 − 20. */
export function zehnerAufgabe(a: number, op: Op, b: number, mitKlein: boolean): Task {
  const z1 = Math.floor(a / 10);
  const z2 = b / 10;
  const e = einer(a);
  const klein = term(z1, op, z2);
  const kleinWert = rechne(z1, op, z2);
  const v = rechne(a, op, b);
  const gross = term(a, op, b);
  return {
    key: `zehner:${mitKlein ? 'k' : 'o'}:${gross}`,
    prompt: mitKlein ? 'Nutze die kleine Aufgabe.' : 'Rechne.',
    expression: mitKlein ? `${klein} = ${kleinWert}, also ${gross} = ${BOX}` : `${gross} = ${BOX}`,
    visual: material(a, op, b),
    answer: { kind: 'number', value: v },
    hints: [`Rechne mit den Zehnern: ${klein}.`, e > 0 ? 'Die Einer bleiben gleich.' : 'Das Ergebnis sind auch Zehner.'],
    steps: [
      `Kleine Aufgabe: ${klein} = ${kleinWert}`,
      ...(e > 0 ? [`${kleinWert === 1 ? 'Das ist 1 Zehner' : `Das sind ${kleinWert} Zehner`}. Die Einer bleiben.`] : []),
      { text: `Große Aufgabe: ${gross} = ${v}`, visual: rechenstrich([a, v]) },
    ],
    bugs: bugList(v, [
      // 34 + 20 = 36, 40 + 30 = 43: the tens taken as ones.
      ['stelle-verwechselt', rechne(a, op, z2), `${b} sind ${z2} Zehner. Die Einer bleiben gleich.`],
      ['nur-zehner-gezaehlt', e === 0 ? kleinWert : null, `Du hast ${kleinWert} Zehner. Wie heißt diese Zahl?`],
      ['plus-minus-getauscht', rechne(a, gegen(op), b), RECHENZEICHEN],
    ]),
    praise: 'Du hast mit den Zehnern gerechnet.',
  };
}

/** Which small task helps? Works for ZE ± E and for ZE ± Z. */
export function kleineWaehlen(rng: Rng, a: number, op: Op, b: number): Task {
  const z = Math.floor(a / 10);
  const e = einer(a);
  const v = rechne(a, op, b);
  const gross = term(a, op, b);
  const mitZehnern = b % 10 === 0;
  const zb = mitZehnern ? b / 10 : b;
  const stelle = mitZehnern ? z : e;
  const andere = mitZehnern ? e : z;
  const richtig = term(stelle, op, zb);
  // Wrong options never go below 0, and z + e comes only if zb is a new number: for 71 + 7, 7 + 1 is the Tauschaufgabe of the
  // right 1 + 7; for 34 + 4, 3 + 4 already has the 4.
  const wrongs = [
    ...(rechne(andere, op, zb) < 0 ? [] : [{ label: term(andere, op, zb), whyWrong: mitZehnern ? `${e === 1 ? '1 ist der Einer' : `${e} sind die Einer`}. ${b === 10 ? '10 ist 1 Zehner' : `${b} sind Zehner`}.` : `${z} ist der Zehner. Nimm die Einer von ${a}.` }]),
    { label: rechne(stelle, gegen(op), zb) < 0 ? term(zb, gegen(op), stelle) : term(stelle, gegen(op), zb), whyWrong: RECHENZEICHEN },
    ...(zb === z || zb === e ? [] : [{ label: plus(z, e), whyWrong: `${z} und ${e} stecken beide in ${a}. Nimm auch die ${zb}.` }]),
  ];
  const kleinWert = rechne(stelle, op, zb);
  return {
    key: `waehlen:${gross}`,
    prompt: 'Welche kleine Aufgabe hilft dir?',
    expression: `${gross} = ${BOX}`,
    answer: makeChoice(rng, { label: richtig }, wrongs),
    hints: [mitZehnern ? `${b} sind Zehner. Schau auf die Zehner von ${a}.` : `${b === 1 ? '1 ist ein Einer' : `${b} sind Einer`}. Schau auf die Einer von ${a}.`, 'Das Rechenzeichen bleibt gleich.'],
    steps: [`Kleine Aufgabe: ${richtig} = ${kleinWert}`, `Große Aufgabe: ${gross} = ${v}`],
    praise: 'Du hast die passende kleine Aufgabe gefunden.',
  };
}

/**
 * A gap in the large task, ones or tens: 64 + □ = 67, 67 − □ = 64; with tens also □ + 20 = 54 and □ − 20 = 34 (Stufe 2 on, F6).
 * The result a ± b is the second number of the gap.
 */
export function grosseLuecke(a: number, op: Op, b: number, vorne: boolean): Task {
  const c = rechne(a, op, b);
  const mitZehnern = b % 10 === 0;
  const value = vorne ? a : b;
  const klein = mitZehnern ? term(Math.floor(a / 10), op, b / 10) : term(einer(a), op, b);
  const kleinWert = mitZehnern ? rechne(Math.floor(a / 10), op, b / 10) : rechne(einer(a), op, b);
  const stelle = mitZehnern ? 'Die Einer bleiben gleich.' : 'Der Zehner bleibt gleich.';
  const pruefe = (w: number) => (vorne ? `Fast! Prüfe: ${term(w, op, b)} ist nicht ${c}.` : `Fast! Prüfe: ${term(a, op, w)} ist nicht ${c}.`);
  return {
    key: `luecke:${vorne ? 'v' : 'h'}:${term(a, op, b)}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: vorne ? `${term(BOX, op, b)} = ${c}` : `${term(a, op, BOX)} = ${c}`,
    answer: { kind: 'number', value },
    hints: vorne
      ? [`Rechne rückwärts: ${term(c, gegen(op), b)}.`, stelle]
      : [mitZehnern ? `Schau auf die Zehner von ${a} und ${c}.` : `Schau auf die Einer von ${a} und ${c}.`, stelle],
    steps: vorne
      ? [`Rückwärts: ${term(c, gegen(op), b)} = ${a}`, { text: `Probe: ${term(a, op, b)} = ${c}`, visual: rechenstrich([a, c]) }]
      : [`Kleine Aufgabe: ${klein} = ${kleinWert}`, { text: `Große Aufgabe: ${term(a, op, b)} = ${c}`, visual: rechenstrich([a, c]) }],
    bugs: bugList(value, [
      ['platzhalter-summe', vorne ? (op === PLUS_OP ? b + c : Math.abs(c - b)) : a + c, op === PLUS_OP ? `Die ganze Seite ergibt ${c}. Wie viel fehlt bis ${c}?` : vorne ? `Das Ergebnis ist ${c}. Die Zahl vorne ist größer.` : `Von ${a} geht etwas weg. Es bleiben ${c}.`],
      ['stelle-verwechselt', !vorne && mitZehnern ? b / 10 : null, 'Es fehlen Zehner, nicht Einer.'],
      ['stelle-verwechselt', !vorne && !mitZehnern ? b * 10 : null, 'Es fehlen Einer, nicht Zehner.'],
      ['zaehlen-eins-daneben', value + 1, pruefe(value + 1)],
      ['zaehlen-eins-daneben', value > 1 ? value - 1 : null, pruefe(value - 1)],
    ]),
    praise: vorne ? 'Du hast rückwärts gerechnet und geprüft.' : 'Du hast die Lücke an der Stelle gefunden.',
  };
}

/** The other way round: which large task belongs to this small one? The wrong options use another place or another sign. */
export function grosseWaehlen(rng: Rng, a: number, op: Op, b: number): Task {
  const z = Math.floor(a / 10);
  const e = einer(a);
  const mitZehnern = b % 10 === 0;
  const zb = mitZehnern ? b / 10 : b;
  const stelle = mitZehnern ? z : e;
  const klein = term(stelle, op, zb);
  const kleinWert = rechne(stelle, op, zb);
  const gedreht = e * 10 + z;
  const andereStelle = mitZehnern ? zb : zb * 10;
  const moeglich = (x: number, y: number, o: Op = op) => x >= 1 && y >= 1 && rechne(x, o, y) >= 0 && rechne(x, o, y) <= 100;
  const candidates: [number, Op, number, string][] = [
    [a, op, andereStelle, mitZehnern ? `${zb} ${zb === 1 ? 'ist ein Einer' : 'sind Einer'}. Die kleine Aufgabe rechnet mit Zehnern.` : `${andereStelle} sind Zehner. Die kleine Aufgabe rechnet mit Einern.`],
    [gedreht, op, b, mitZehnern ? `Der Zehner von ${gedreht} ist nicht ${stelle}.` : `Der Einer von ${gedreht} ist nicht ${stelle}.`],
    [a, gegen(op), b, RECHENZEICHEN],
    [a, op, mitZehnern ? b + 10 : b + 1, `In der kleinen Aufgabe steht die ${zb}.`],
    [a, op, mitZehnern ? b - 10 : b - 1, `In der kleinen Aufgabe steht die ${zb}.`],
  ];
  const wrongs = candidates.filter(([x, o, y]) => moeglich(x, y, o)).map(([x, o, y, whyWrong]) => ({ label: term(x, o, y), whyWrong }));
  return {
    key: `grosse-waehlen:${term(a, op, b)}`,
    prompt: 'Welche große Aufgabe passt?',
    expression: `${klein} = ${kleinWert}`,
    answer: makeChoice(rng, { label: term(a, op, b) }, wrongs),
    hints: [`Suche die ${stelle} und die ${zb} in der großen Aufgabe.`, 'Das Rechenzeichen bleibt gleich.'],
    steps: [`Kleine Aufgabe: ${klein} = ${kleinWert}`, `Große Aufgabe: ${term(a, op, b)} = ${rechne(a, op, b)}`],
    praise: 'Du hast die passende große Aufgabe gefunden.',
  };
}

/** Continue a pattern in a table: the first number grows by 10 from row to row, or falls by 10. */
export function musterAufgabe(start: number, op: Op, b: number, richtung: 'auf' | 'ab' = 'auf'): Task {
  const schritt = richtung === 'auf' ? 10 : -10;
  const auf = richtung === 'auf';
  const zeilen = [0, 1, 2].map((i) => start + i * schritt);
  const letzte = start + 3 * schritt;
  const v = rechne(letzte, op, b);
  const vorher = rechne(start + 2 * schritt, op, b);
  const rows = zeilen.map((x) => [term(x, op, b), String(rechne(x, op, b))]);
  const spoken = [...rows.map(([t, r]) => `${t} = ${r}`), `${term(letzte, op, b)} = ${BOX}`].join('. ');
  const wort = auf ? 'größer' : 'kleiner';
  const mehr = auf ? 'mehr' : 'weniger';
  return {
    key: `muster:${auf ? '' : 'ab:'}${term(start, op, b)}`,
    prompt: 'Setze das Muster fort.',
    visual: { type: 'table', header: ['Aufgabe', 'Ergebnis'], rows: [...rows, [term(letzte, op, b), BOX]] },
    answer: { kind: 'number', value: v, before: `${term(letzte, op, b)} =` },
    hints: ['Schau von Zeile zu Zeile. Was ändert sich?', `Die erste Zahl wird um 10 ${wort}.`],
    steps: [`Von Zeile zu Zeile: Die erste Zahl wird um 10 ${wort}.`, `Das Ergebnis auch: ${auf ? plus(vorher, 10) : minus(vorher, 10)} = ${v}`, `${term(letzte, op, b)} = ${v}`],
    bugs: bugList(v, [
      ['muster-letzte', vorher, `Das ist die Zeile darüber. Eine Zeile tiefer sind es 10 ${mehr}.`],
      ['muster-schritt', auf ? vorher + 1 : vorher - 1, `Eine Zeile tiefer sind es 10 ${mehr}.`],
      ['plus-minus-getauscht', rechne(letzte, gegen(op), b), RECHENZEICHEN],
    ]),
    praise: 'Du hast das Muster fortgesetzt.',
    srText: speak(`Setze das Muster fort. ${spoken}.`),
    kmk: ['ZO.grundaufgaben', 'MS.muster'],
  };
}

/** Continue a falling pattern by 2 rows: the first number falls by 10, and each result with it. */
export function musterZweiZeilen(start: number, op: Op, b: number): Task {
  const zeilen = [0, 1, 2].map((i) => start - i * 10);
  const [z4, z5] = [start - 30, start - 40];
  const [r3, r4, r5] = [zeilen[2], z4, z5].map((x) => rechne(x, op, b));
  const rows = zeilen.map((x) => [term(x, op, b), String(rechne(x, op, b))]);
  const fields: MultiField[] = [
    { id: 'z4', before: `${term(z4, op, b)} =`, value: r4 },
    { id: 'z5', before: `${term(z5, op, b)} =`, value: r5 },
  ];
  const spoken = [...rows.map(([t, r]) => `${t} = ${r}`), `${term(z4, op, b)} = ${BOX}`, `${term(z5, op, b)} = ${BOX}`].join('. ');
  return {
    key: `muster2:${term(start, op, b)}`,
    prompt: 'Setze das Muster um 2 Zeilen fort.',
    visual: { type: 'table', header: ['Aufgabe', 'Ergebnis'], rows: [...rows, [term(z4, op, b), BOX], [term(z5, op, b), BOX]] },
    answer: { kind: 'multi', fields },
    hints: ['Schau von Zeile zu Zeile. Was ändert sich?', 'Die erste Zahl wird um 10 kleiner.'],
    steps: ['Von Zeile zu Zeile wird das Ergebnis um 10 kleiner.', `Erst: ${minus(r3, 10)} = ${r4}`, `Dann: ${minus(r4, 10)} = ${r5}`],
    bugs: multiBugs(
      [
        { id: 'muster-letzte', match: { z4: r3 }, hint: 'Das ist die Zeile darüber. Eine Zeile tiefer sind es 10 weniger.' },
        { id: 'muster-schritt', match: { z4: r3 - 1 }, hint: 'Eine Zeile tiefer sind es 10 weniger.' },
        { id: 'muster-schritt', match: { z5: r4 - 1 }, hint: 'Eine Zeile tiefer sind es 10 weniger.' },
      ],
      fields,
    ),
    praise: 'Du hast das Muster 2 Zeilen weit fortgesetzt.',
    srText: speak(`Setze das Muster um 2 Zeilen fort. ${spoken}.`),
    kmk: ['ZO.grundaufgaben', 'MS.muster'],
  };
}

// ─── Numbers of each Stufe ────────────────────────────────────────────────────

/** ZE ± E without crossing. */
function einerZahlen(rng: Rng): [number, Op, number] {
  if (rng.chance(0.5)) {
    const e = rng.int(1, 8);
    return [rng.int(1, 9) * 10 + e, PLUS_OP, rng.int(1, 9 - e)];
  }
  const g = rng.int(2, 9);
  return [rng.int(1, 9) * 10 + g, MINUS_OP, rng.int(1, g)];
}

/** Whole tens: 40 + 30 up to 100, 90 − 50. */
function reineZehner(rng: Rng): [number, Op, number] {
  if (rng.chance(0.5)) {
    const z1 = rng.int(1, 8);
    return [z1 * 10, PLUS_OP, rng.int(1, 10 - z1) * 10];
  }
  const z1 = rng.int(2, 9);
  return [z1 * 10, MINUS_OP, rng.int(1, z1 - 1) * 10];
}

/** ZE ± Z: 34 + 20, 76 − 30. */
function zehnerZahlen(rng: Rng): [number, Op, number] {
  const e = rng.int(1, 9);
  if (rng.chance(0.5)) {
    const z1 = rng.int(1, 8);
    return [z1 * 10 + e, PLUS_OP, rng.int(1, 9 - z1) * 10];
  }
  const z1 = rng.int(2, 9);
  return [z1 * 10 + e, MINUS_OP, rng.int(1, z1 - 1) * 10];
}

/** Digits that differ, so the options of a choice stay distinct. b is ones or whole tens. */
function waehlZahlen(rng: Rng, mitZehnern: boolean): [number, Op, number] {
  const z = rng.int(1, 8);
  const e = rng.pick([1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x !== z));
  const a = z * 10 + e;
  const op = rng.pick([PLUS_OP, MINUS_OP]);
  if (mitZehnern) {
    if (op === PLUS_OP) return [a, op, rng.int(1, 9 - z) * 10];
    return z > 1 ? [a, op, rng.int(1, z - 1) * 10] : [a, PLUS_OP, 20];
  }
  if (op === PLUS_OP) return [a, op, rng.int(1, 9 - e)];
  return e > 1 ? [a, op, rng.int(1, e - 1)] : [a, PLUS_OP, 3];
}

function musterSteigend(rng: Rng): Task {
  const art = rng.pick(['einer', 'zehner', 'minus'] as const);
  if (art === 'einer') {
    const e = rng.int(1, 8);
    return musterAufgabe(rng.int(0, 3) * 10 + e, PLUS_OP, rng.int(1, 9 - e));
  }
  if (art === 'zehner') return musterAufgabe(rng.int(1, 3) * 10, PLUS_OP, rng.int(1, 3) * 10);
  const g = rng.int(3, 9);
  return musterAufgabe(rng.int(0, 3) * 10 + g, MINUS_OP, rng.int(1, g - 1));
}

/** A falling pattern starts high enough for its last row: 2 rows on need a start of at least 50. */
function fallendeZahlen(rng: Rng): [number, Op, number] {
  if (rng.chance(0.5)) {
    const e = rng.int(1, 8);
    return [rng.int(5, 8) * 10 + e, PLUS_OP, rng.int(1, 9 - e)];
  }
  const g = rng.int(3, 9);
  return [rng.int(5, 9) * 10 + g, MINUS_OP, rng.int(1, g - 1)];
}

const formen: Formen = {
  1: {
    // AB I shows the small task with its result, AB II leaves it out, AB III asks for the gap.
    1: [(rng) => einerAufgabe(...einerZahlen(rng), true)],
    2: [(rng) => einerAufgabe(...einerZahlen(rng), false)],
    3: [
      (rng) => {
        const [a, op, b] = einerZahlen(rng);
        return grosseLuecke(a, op, b, false);
      },
    ],
  },
  2: {
    1: [(rng) => zehnerAufgabe(...reineZehner(rng), false), (rng) => zehnerAufgabe(...zehnerZahlen(rng), true)],
    2: [(rng) => zehnerAufgabe(...zehnerZahlen(rng), false)],
    3: [
      (rng) => {
        const [a, op, b] = zehnerZahlen(rng);
        return grosseLuecke(a, op, b, false);
      },
      (rng) => {
        const [a, op, b] = zehnerZahlen(rng);
        return grosseLuecke(a, op, b, true);
      },
    ],
  },
  3: {
    1: [(rng) => kleineWaehlen(rng, ...waehlZahlen(rng, false)), (rng) => kleineWaehlen(rng, ...waehlZahlen(rng, true))],
    2: [musterSteigend, (rng) => grosseWaehlen(rng, ...waehlZahlen(rng, rng.chance(0.5)))],
    3: [(rng) => musterAufgabe(...fallendeZahlen(rng), 'ab'), (rng) => musterZweiZeilen(...fallendeZahlen(rng))],
  },
};

export const grosseAufgabeSkill = defineSkill({
  id: 'plusminus.grosse-aufgabe',
  title: 'Kleine und große Aufgabe',
  description: 'Du nutzt 4 + 3, um 64 + 3 zu rechnen.',
  stufen: { 1: 'Einer dazu oder weg: 64 + 3', 2: 'Zehner dazu oder weg: 40 + 30, 34 + 20', 3: 'Die passende kleine Aufgabe finden; ein Muster fortsetzen' },
  kmk: ['ZO.grundaufgaben'],
  formen,
});
