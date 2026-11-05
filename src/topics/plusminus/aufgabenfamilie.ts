/**
 * Aufgabenfamilien: three numbers, four tasks. Stufe 1 families up to 20, Stufe 2 up to 100, Stufe 3 checking with the Umkehraufgabe
 * and the meaning of "=" in 3 + 7 = □ + 5 (docs/research.md §5 `gleichheit`, §6).
 */
import { BOX } from '../../core/format';
import type { MultiField, Rng, Visual } from '../../core/types';
import { bugList, makeChoice, multiBugs } from '../shared';
import { defineSkill, einer, minus, plus, type Formen, type Task } from './rechnen';

const RECHENZEICHEN = 'Schau noch einmal auf das Rechenzeichen.';

const feld = (a: number, b: number): Visual => ({ type: 'field', size: a + b <= 20 ? 20 : 100, filled: a, second: b });

/** One task of the family is given; the child writes the other three. */
export function familieSchreiben(a: number, b: number, gegeben: 'plus' | 'minus'): Task {
  const c = a + b;
  const fields: MultiField[] =
    gegeben === 'plus'
      ? [
          { id: 'tausch', before: `${plus(b, a)} =`, value: c },
          { id: 'weg', before: `${minus(c, b)} =`, value: a },
          { id: 'anders', before: `${minus(c, a)} =`, value: b },
        ]
      : [
          { id: 'anders', before: `${minus(c, a)} =`, value: b },
          { id: 'plus', before: `${plus(a, b)} =`, value: c },
          { id: 'tausch', before: `${plus(b, a)} =`, value: c },
        ];
  const expression = gegeben === 'plus' ? `${plus(a, b)} = ${c}` : `${minus(c, b)} = ${a}`;
  const bugs = multiBugs(
    [
      gegeben === 'plus'
        ? { id: 'plus-minus-getauscht', match: { weg: c + b }, hint: RECHENZEICHEN }
        : { id: 'plus-minus-getauscht', match: { anders: c + a }, hint: RECHENZEICHEN },
      gegeben === 'plus'
        ? { id: 'aufgabe-gespiegelt', match: { weg: b, anders: a }, hint: `Von ${c} geht ${b} weg. Was bleibt dann noch?` }
        : { id: 'aufgabe-gespiegelt', match: { anders: a }, hint: `Von ${c} geht ${a} weg. Was bleibt dann noch?` },
    ],
    fields,
  );
  return {
    key: `schreiben:${gegeben}:${a}:${b}`,
    prompt: 'Finde die anderen 3 Aufgaben.',
    expression,
    visual: feld(a, b),
    answer: { kind: 'multi', fields },
    hints: [`Die Zahlen sind ${a}, ${b} und ${c}.`, `Die größte Zahl ist ${c}. Bei Minus steht die größte Zahl vorne.`],
    steps: [`${plus(a, b)} = ${c} und ${plus(b, a)} = ${c}`, `${minus(c, b)} = ${a} und ${minus(c, a)} = ${b}`],
    bugs,
    praise: 'Du hast die ganze Familie gefunden.',
    kmk: ['ZO.grundaufgaben', 'MS.muster'],
  };
}

/** Which task belongs to the three numbers? No wrong option goes above `max`, the range of the Stufe. */
export function familieWaehlen(rng: Rng, a: number, b: number, max = 100): Task {
  const c = a + b;
  const gross = Math.max(a, b);
  const klein = Math.min(a, b);
  const diff = gross - klein;
  const familie = new Set([a, b, c]);
  const nichtDabei = (label: string, x: number) => ({ label, whyWrong: `Die ${x} gehört nicht zu den 3 Zahlen.` });
  const wrongs = [
    ...(familie.has(diff) ? [] : [nichtDabei(`${minus(gross, klein)} = ${diff}`, diff)]),
    ...(c + b <= max ? [nichtDabei(`${plus(c, b)} = ${c + b}`, c + b)] : []),
    ...(c + a <= max ? [nichtDabei(`${plus(c, a)} = ${c + a}`, c + a)] : []),
    // never a true member of the family: a + 1 or a − 1 must not be b
    ...(a + 1 === b ? [] : [nichtDabei(`${minus(c, a + 1)} = ${b - 1}`, a + 1)]),
    ...(a - 1 === b ? [] : [nichtDabei(`${minus(c, a - 1)} = ${b + 1}`, a - 1)]),
  ];
  const richtige = [`${minus(c, a)} = ${b}`, `${minus(c, b)} = ${a}`, `${plus(b, a)} = ${c}`];
  const nr = rng.int(0, richtige.length - 1);
  const richtig = richtige[nr];
  return {
    key: `waehlen:${a}:${b}:${nr}`,
    prompt: `Welche Aufgabe gehört zu ${a}, ${b} und ${c}?`,
    visual: feld(a, b),
    answer: makeChoice(rng, { label: richtig }, wrongs),
    hints: ['In der Aufgabe kommen genau diese 3 Zahlen vor.', `Die größte Zahl ist ${c}. Bei Minus steht die größte Zahl vorne.`],
    steps: [`Die Familie: ${plus(a, b)} = ${c} und ${plus(b, a)} = ${c}`, `Minus: ${minus(c, b)} = ${a} und ${minus(c, a)} = ${b}`],
    praise: 'Du hast die passende Aufgabe erkannt.',
    kmk: ['ZO.grundaufgaben', 'MS.muster'],
  };
}

/** Which task checks the calculation? The Umkehraufgabe leads back to where it started. */
export function umkehrWaehlen(rng: Rng, a: number, b: number, form: 'minus' | 'plus'): Task {
  const c = a + b;
  const istMinus = form === 'minus';
  const expression = istMinus ? `${minus(c, b)} = ${a}` : `${plus(a, b)} = ${c}`;
  const richtig = istMinus ? `${plus(a, b)} = ${c}` : `${minus(c, b)} = ${a}`;
  const zurueck = istMinus ? c : a;
  const nein = `Diese Aufgabe führt nicht zurück zur ${zurueck}.`;
  // An option that ends in that number would contradict `nein`: 30 − 15 = 15 for 15 + 30 = 45.
  const option = (rechnung: string, ergebnis: number) => (ergebnis === zurueck ? [] : [{ label: `${rechnung} = ${ergebnis}`, whyWrong: nein }]);
  const wrongs = [
    ...(c + b <= 100 ? option(plus(c, b), c + b) : []),
    ...(c + a <= 100 ? option(plus(c, a), c + a) : []),
    ...option(minus(Math.max(a, b), Math.min(a, b)), Math.abs(a - b)),
    ...(a + 1 === b ? [] : option(minus(c, a + 1), b - 1)),
    ...(a - 1 === b ? [] : option(minus(c, a - 1), b + 1)),
  ];
  return {
    key: `umkehr:${form}:${a}:${b}`,
    prompt: 'Mit welcher Aufgabe prüfst du das?',
    expression,
    answer: makeChoice(rng, { label: richtig }, wrongs),
    hints: ['Die Umkehraufgabe rechnet rückwärts.', istMinus ? 'Bei Minus prüfst du mit Plus.' : 'Bei Plus prüfst du mit Minus.'],
    steps: [`Du rechnest ${expression}.`, `Rückwärts: ${richtig}`, `Das führt zurück zur ${zurueck}.`],
    praise: 'Du hast die Umkehraufgabe gefunden.',
    kmk: ['ZO.kontrolle'],
  };
}

/** Stimmt die Rechnung? The child checks a − b = x with x + b. */
export function stimmtDas(rng: Rng, a: number, b: number, shown: number): Task {
  const c = a + b;
  const stimmt = shown === a;
  const probe = shown + b;
  return {
    key: `stimmt:${a}:${b}:${shown}`,
    prompt: 'Prüfe mit Plus. Stimmt die Rechnung?',
    expression: `${minus(c, b)} = ${shown}`,
    answer: makeChoice(
      rng,
      { label: stimmt ? 'Stimmt' : 'Stimmt nicht' },
      [{ label: stimmt ? 'Stimmt nicht' : 'Stimmt', whyWrong: stimmt ? `Rechne ${plus(shown, b)}. Das sind genau ${c}.` : `Rechne ${plus(shown, b)}. Das sind nicht ${c}.` }],
      { order: ['Stimmt', 'Stimmt nicht'] },
    ),
    hints: [`Rechne ${plus(shown, b)}.`, `Kommt ${c} heraus?`],
    steps: stimmt
      ? [`Prüfe: ${plus(shown, b)} = ${probe}`, `Das ist ${c}. Die Rechnung stimmt.`]
      : [`Prüfe: ${plus(shown, b)} = ${probe}`, `Das ist nicht ${c}. Die Rechnung stimmt nicht.`, `Richtig ist: ${minus(c, b)} = ${a}`],
    praise: 'Du hast mit der Umkehraufgabe geprüft.',
    kmk: ['ZO.kontrolle'],
  };
}

/** 3 + 7 = □ + 5: the left side first, then the gap on the right. */
export function gleichheitAufgabe(a: number, b: number, c: number, vorne: boolean): Task {
  const s = a + b;
  const luecke = s - c;
  const fields: MultiField[] = [
    { id: 'links', before: 'Links ergibt', value: s },
    { id: 'luecke', before: 'Die fehlende Zahl ist', value: luecke },
  ];
  return {
    key: `gleich:${a}:${b}:${c}:${vorne ? 'v' : 'h'}`,
    prompt: 'Beide Seiten sind gleich viel. Welche Zahl fehlt?',
    expression: `${plus(a, b)} = ${vorne ? plus(BOX, c) : plus(c, BOX)}`,
    answer: { kind: 'multi', fields },
    hints: ['Rechne die linke Seite aus.', 'Die rechte Seite muss genauso viel ergeben.'],
    steps: [`Links: ${plus(a, b)} = ${s}`, `Rechts: ${plus(luecke, c)} = ${s}`, `Die Lücke ist ${luecke}. Links sind es ${s}.`],
    bugs: multiBugs(
      [
        { id: 'gleichheit', match: { luecke: s }, hint: 'Beide Seiten sind gleich viel. Rechne links zuerst.' },
        { id: 'gleichheit', match: { luecke: s + c }, hint: 'Rechne nicht alle Zahlen zusammen. Beide Seiten sind gleich viel.' },
      ],
      fields,
    ),
    praise: 'Du hast beide Seiten gleich groß gemacht.',
    kmk: ['MS.muster', 'ZO.grundaufgaben'],
  };
}

export type FamilienLuecke = 'plus-hinten' | 'minus-hinten' | 'plus-vorne' | 'minus-vorne';

/** One number of the family is missing: a + □ = c, c − □ = a, and from Stufe 2 on (F6) □ + b = c and □ − b = a. */
export function familieLuecke(a: number, b: number, form: FamilienLuecke): Task {
  const c = a + b;
  const expression = { 'plus-hinten': `${plus(a, BOX)} = ${c}`, 'minus-hinten': `${minus(c, BOX)} = ${a}`, 'plus-vorne': `${plus(BOX, b)} = ${c}`, 'minus-vorne': `${minus(BOX, b)} = ${a}` }[form];
  const value = { 'plus-hinten': b, 'minus-hinten': b, 'plus-vorne': a, 'minus-vorne': c }[form];
  const vorneMinus = form === 'minus-vorne';
  const rueckwaerts = { 'plus-hinten': minus(c, a), 'minus-hinten': minus(c, a), 'plus-vorne': minus(c, b), 'minus-vorne': plus(a, b) }[form];
  return {
    key: `luecke:${form}:${a}:${b}`,
    prompt: 'Welche Zahl fehlt in der Familie?',
    expression,
    answer: { kind: 'number', value },
    hints: [`Rechne rückwärts: ${rueckwaerts}.`, vorneMinus ? 'Bei Minus steht die größte Zahl vorne.' : `Die größte Zahl ist ${c}.`],
    steps: vorneMinus
      ? [`Rückwärts: ${plus(a, b)} = ${c}`, `Probe: ${minus(c, b)} = ${a}`]
      : [`Die Familie: ${plus(a, b)} = ${c}`, `Minus: ${minus(c, b)} = ${a} und ${minus(c, a)} = ${b}`],
    bugs: bugList(value, [
      ['plus-minus-getauscht', { 'plus-hinten': a + c, 'minus-hinten': a + c, 'plus-vorne': b + c, 'minus-vorne': Math.abs(a - b) }[form], RECHENZEICHEN],
      ['aufgabe-gespiegelt', form === 'minus-hinten' ? a : null, `Von ${c} geht etwas weg. Es bleiben ${a}.`],
    ]),
    praise: 'Du hast die fehlende Zahl gefunden.',
    kmk: ['ZO.grundaufgaben', 'MS.muster'],
  };
}

/** Which task does not belong? Three of the family and one true task with another number, up to `max`, the range of the Stufe. */
export function familieFremd(rng: Rng, a: number, b: number, max = 100): Task {
  const c = a + b;
  const familie = [`${plus(a, b)} = ${c}`, `${minus(c, a)} = ${b}`, `${minus(c, b)} = ${a}`];
  const hatFremde = c + b <= max;
  const gross = Math.max(a, b);
  const klein = Math.min(a, b);
  const diff = gross - klein;
  const fremd = hatFremde ? `${plus(c, b)} = ${c + b}` : diff !== a && diff !== b && diff !== c ? `${minus(gross, klein)} = ${diff}` : `${minus(c, a + 1)} = ${b - 1}`;
  return {
    key: `fremd:${a}:${b}`,
    prompt: `Welche Aufgabe gehört nicht zu ${a}, ${b} und ${c}?`,
    answer: makeChoice(rng, { label: fremd }, familie.map((label) => ({ label, whyWrong: 'Diese Aufgabe hat genau die 3 Zahlen.' }))),
    hints: ['Schau jede Zahl in den Aufgaben an.', `Bei einer Aufgabe steht eine andere Zahl als ${a}, ${b} und ${c}.`],
    steps: [`Die Familie: ${plus(a, b)} = ${c} und ${plus(b, a)} = ${c}`, `Minus: ${minus(c, b)} = ${a} und ${minus(c, a)} = ${b}`, `Nicht dabei: ${fremd}`],
    praise: 'Du hast die fremde Aufgabe erkannt.',
    kmk: ['ZO.grundaufgaben', 'MS.muster'],
  };
}

/** Two different addends from 2 on, with a sum in the range. */
function paarBis(rng: Rng, vonSumme: number, bisSumme: number): [number, number] {
  for (let i = 0; i < 60; i++) {
    const a = rng.int(2, bisSumme - 2);
    const b = rng.int(2, bisSumme - a);
    if (a !== b && a + b >= vonSumme) return [a, b];
  }
  return [vonSumme - 3, 3];
}

/** Two different two-digit addends with a sum up to 100; with or without a new ten. */
function grossesPaar(rng: Rng, neuerZehner?: boolean): [number, number] {
  for (let i = 0; i < 60; i++) {
    const a = rng.int(11, 60);
    const b = rng.int(11, 100 - a);
    if (a === b || a % 10 === 0 || b % 10 === 0) continue;
    if (neuerZehner === undefined || einer(a) + einer(b) >= 10 === neuerZehner) return [a, b];
  }
  return neuerZehner ? [38, 27] : [34, 25];
}

const bis10 = (rng: Rng) => paarBis(rng, 5, 10);
const bis20 = (rng: Rng) => paarBis(rng, 11, 20);
const ohneZehner = (rng: Rng) => grossesPaar(rng, false);
const mitZehner = (rng: Rng) => grossesPaar(rng, true);
const beliebig = (rng: Rng) => grossesPaar(rng);

/** a + b = □ + c or c + □: both sides up to 20 across the ten, or whole tens up to 100. */
function gleichZahlen(rng: Rng): [number, number, number] {
  const faktor = rng.chance(0.5) ? 1 : 10;
  const a = rng.int(3, faktor === 1 ? 9 : 5) * faktor;
  const b = rng.int(3, faktor === 1 ? 9 : 5) * faktor;
  const s = a + b;
  const moegliche = Array.from({ length: 8 }, (_, i) => (i + 2) * faktor).filter((c) => c < s && c !== a && c !== b && s - c !== c);
  return [a, b, rng.pick(moegliche)];
}

/** Half of the shown calculations hold an error in the tens. The check x + b stays up to 100: a + 10 needs a + b ≤ 90. */
function stimmtZahlen(rng: Rng): Task {
  const [a, b] = beliebig(rng);
  const hoch = a + b <= 90;
  const fehler = !hoch || (a >= 20 && rng.chance(0.5)) ? a - 10 : a + 10;
  return stimmtDas(rng, a, b, rng.chance(0.5) ? a : fehler);
}

const formen: Formen = {
  1: {
    1: [(rng) => familieSchreiben(...bis10(rng), 'plus'), (rng) => familieWaehlen(rng, ...bis10(rng), 20)],
    2: [(rng) => familieSchreiben(...bis20(rng), 'minus'), (rng) => familieWaehlen(rng, ...bis20(rng), 20)],
    3: [
      (rng) => familieLuecke(...paarBis(rng, 5, 20), 'plus-hinten'),
      (rng) => familieLuecke(...paarBis(rng, 5, 20), 'minus-hinten'),
      (rng) => familieFremd(rng, ...paarBis(rng, 5, 20), 20),
    ],
  },
  2: {
    1: [(rng) => familieSchreiben(...ohneZehner(rng), 'plus'), (rng) => familieWaehlen(rng, ...ohneZehner(rng))],
    2: [(rng) => familieSchreiben(...mitZehner(rng), 'minus'), (rng) => familieWaehlen(rng, ...mitZehner(rng))],
    3: [
      (rng) => familieLuecke(...beliebig(rng), 'plus-hinten'),
      (rng) => familieLuecke(...beliebig(rng), 'minus-hinten'),
      (rng) => familieLuecke(...beliebig(rng), 'plus-vorne'),
      (rng) => familieLuecke(...beliebig(rng), 'minus-vorne'),
      (rng) => familieFremd(rng, ...beliebig(rng)),
    ],
  },
  3: {
    1: [(rng) => umkehrWaehlen(rng, ...mitZehner(rng), 'minus'), (rng) => umkehrWaehlen(rng, ...mitZehner(rng), 'plus')],
    2: [stimmtZahlen],
    3: [(rng) => gleichheitAufgabe(...gleichZahlen(rng), rng.chance(0.5))],
  },
};

export const aufgabenfamilieSkill = defineSkill({
  id: 'plusminus.aufgabenfamilie',
  title: 'Aufgabenfamilien',
  description: 'Drei Zahlen, vier Aufgaben: Du prüfst mit der Umkehraufgabe.',
  stufen: { 1: 'Familien bis 20: 5 + 3 = 8, 8 − 3 = □', 2: 'Familien bis 100', 3: 'Mit der Umkehraufgabe prüfen; 3 + 7 = □ + 5' },
  kmk: ['ZO.grundaufgaben', 'ZO.kontrolle', 'MS.muster'],
  formen,
});
