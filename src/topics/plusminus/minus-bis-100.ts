/**
 * Minus bis 100: Stufe 1 ZE − ZE without crossing, Stufe 2 across a ten, Stufe 3 missing numbers and the Fehlerdetektiv
 * (docs/research.md §6, §7.1). The worked way: first the tens of the second number, then its ones, across the ten in two more steps.
 */
import { BOX } from '../../core/format';
import type { Bug, MultiField, Rng } from '../../core/types';
import { bugList, makeChoice, multiBugs, pickPerson } from '../shared';
import { MINUS_OP, defineSkill, einer, ergebnisWaehlen, hunderterLinie, minus, neuerZehner, plus, rechenstrich, wegLuecke, zehner, type Formen, type Task } from './rechnen';

const RECHENZEICHEN = 'Schau noch einmal auf das Rechenzeichen.';

/** Wrong results of a − b across a ten: the ones subtracted the wrong way round (64 − 27 → 43), or the ten kept (→ 47). */
export function fehlerErgebnis(a: number, b: number): { kleinerVonGroesser: number; zehnerVergessen: number } {
  const ohneZehner = zehner(a) - zehner(b);
  return { kleinerVonGroesser: ohneZehner + Math.abs(einer(a) - einer(b)), zehnerVergessen: a - b + 10 };
}

/** Typical wrong results of a − b (docs/research.md §5, numbers as in 62 − 27). */
export function minusBugs(a: number, b: number): [string, number | null, string][] {
  const d = a - b;
  const t = zehner(b);
  const e = einer(b);
  const uebergang = einer(a) < e;
  const fehler = fehlerErgebnis(a, b);
  return [
    ['kleiner-von-groesser', uebergang ? fehler.kleinerVonGroesser : null, a === 2 * t ? `${minus(einer(a), e)} geht nicht. Rechne erst die Zehner, dann weiter.` : `${minus(einer(a), e)} geht nicht. Rechne erst ${minus(a, t)}, dann weiter.`],
    ['zehner-vergessen', uebergang ? fehler.zehnerVergessen : null, `${e} ist mehr als ${einer(a)}. Der Zehner wird kleiner.`],
    ['ziffern-einzeln', a - t / 10 - e, `${b} sind ${t / 10} Zehner und ${e} Einer.`],
    ['einer-vergessen', a - t, e === 1 ? `Der Einer von ${b} muss auch noch weg.` : `Die ${e} Einer von ${b} müssen auch noch weg.`],
    ['zehner-nicht-gerechnet', a - e, `${b} hat auch ${t / 10} Zehner.`],
    ['zaehlen-eins-daneben', d + 1, 'Fast! Schau noch einmal auf die Einer.'],
    ['plus-minus-getauscht', a + b, RECHENZEICHEN],
  ];
}

const weg = (a: number, b: number): Task['steps'] => {
  const t = zehner(b);
  const e = einer(b);
  const zwischen = a - t;
  const zuZehner = einer(zwischen);
  if (e > zuZehner && zuZehner > 0) {
    // Two lines: on one line the big jump of the tens would squeeze the stops around the ten until their labels overlap.
    return [
      { text: `Erst die Zehner: ${minus(a, t)} = ${zwischen}`, visual: rechenstrich([a, zwischen]) },
      `Zum Zehner: ${minus(zwischen, zuZehner)} = ${zehner(zwischen)}`,
      { text: `Noch ${e - zuZehner} weg: ${minus(zehner(zwischen), e - zuZehner)} = ${a - b}`, visual: rechenstrich([zwischen, zehner(zwischen), a - b]) },
    ];
  }
  return [`Erst die Zehner: ${minus(a, t)} = ${zwischen}`, { text: `Dann die Einer: ${minus(zwischen, e)} = ${a - b}`, visual: rechenstrich([a, zwischen, a - b]) }];
};

const NACHEINANDER = 'Rechne erst die Zehner, dann die Einer.';
/** Hints for a − b that never name a result in passing: 23 − 13 = 10 cannot say 'Rechne erst 23 − 10'. */
const tipps = (a: number, b: number) => {
  const t = zehner(b);
  const namensgleich = a - b === t || a - t === t;
  return namensgleich ? [NACHEINANDER, `Schau auf die Einer von ${b}.`] : [`Zerlege ${b}: ${t} und ${einer(b)}.`, `Rechne erst ${minus(a, t)}, dann die Einer.`];
};

/** a − b as a number answer: with a number line that shows the start, or on its own. */
export function minusAufgabe(a: number, b: number, mitLinie = true): Task {
  const d = a - b;
  return {
    key: `${mitLinie ? 'rechnen' : 'ohne'}:${a}-${b}`,
    prompt: 'Rechne.',
    expression: `${minus(a, b)} = ${BOX}`,
    ...(mitLinie ? { visual: hunderterLinie(a) } : {}),
    answer: { kind: 'number', value: d },
    hints: tipps(a, b),
    steps: weg(a, b),
    bugs: bugList(d, minusBugs(a, b)),
    praise: einer(a) < einer(b) ? 'Du hast erst die Zehner abgezogen.' : 'Du hast Zehner und Einer nacheinander abgezogen.',
  };
}

/** a − b in two fields: first the tens, then the ones. */
export function schrittAufgabe(a: number, b: number): Task {
  const d = a - b;
  const t = zehner(b);
  const e = einer(b);
  const fields: MultiField[] = [
    { id: 'zehner', before: `${minus(a, t)} =`, value: a - t },
    { id: 'ziel', before: `Noch ${e} weg:`, value: d },
  ];
  const ziel = minusBugs(a, b).map(([id, m, hint]): Bug | null => (m === null ? null : { id, match: { ziel: m }, hint }));
  return {
    key: `schritte:${a}-${b}`,
    prompt: 'Rechne in 2 Schritten.',
    expression: `${minus(a, b)} = ${BOX}`,
    answer: { kind: 'multi', fields },
    hints: tipps(a, b),
    steps: weg(a, b),
    bugs: multiBugs([{ id: 'ziffern-einzeln', match: { zehner: a - t / 10 }, hint: `${b} hat ${t / 10} Zehner. Nimm die ganzen Zehner.` }, ...ziel], fields),
    praise: 'Du hast erst die Zehner abgezogen.',
  };
}

/** a − □ = d or □ − b = d. */
export function lueckenAufgabe(a: number, b: number, form: 'hinten' | 'vorne'): Task {
  const d = a - b;
  const hinten = form === 'hinten';
  const value = hinten ? b : a;
  const uebergang = einer(a) < einer(b);
  const bleiben = d === 1 ? 'Es bleibt 1.' : `Es bleiben ${d}.`;
  const pruefe = (w: number) => (hinten ? `Fast! Prüfe: ${minus(a, w)} ist nicht ${d}.` : `Fast! Prüfe: ${minus(w, b)} ist nicht ${d}.`);
  return {
    key: `luecke:${form}:${a}:${b}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: hinten ? `${minus(a, BOX)} = ${d}` : `${minus(BOX, b)} = ${d}`,
    answer: { kind: 'number', value },
    hints: hinten ? [`Wie weit ist es von ${d} bis ${a}?`, `Rechne: ${minus(a, d)}.`] : [`Rechne rückwärts: ${plus(d, b)}.`, `Von der Zahl gehen ${b} weg. ${bleiben}`],
    steps: hinten ? [`Rechne: ${minus(a, d)} = ${b}`, `Probe: ${minus(a, b)} = ${d}`] : [`Rückwärts: ${plus(d, b)} = ${a}`, `Probe: ${minus(a, b)} = ${d}`],
    bugs: bugList(value, [
      ['platzhalter-summe', hinten ? a + d : Math.abs(d - b), hinten ? `Von ${a} geht etwas weg. ${bleiben}` : `Das Ergebnis ist ${d}. Die Zahl vorne ist größer.`],
      ['zehner-vergessen', !hinten && uebergang ? a - 10 : null, neuerZehner(einer(d), einer(b))],
      ['zaehlen-eins-daneben', value - 1, pruefe(value - 1)],
      ['zaehlen-eins-daneben', value + 1, pruefe(value + 1)],
    ]),
    praise: 'Du hast rückwärts gerechnet und die Probe gemacht.',
  };
}

/** Fehlerdetektiv: one of four calculations has a planted error (a calculation the child finds and names). */
export function detektivWahl(rng: Rng, a: number, b: number, andere: [number, number][], planted: 'kleiner' | 'zehner'): Task {
  const fehler = fehlerErgebnis(a, b);
  const shown = planted === 'kleiner' ? fehler.kleinerVonGroesser : fehler.zehnerVergessen;
  const richtig = `${minus(a, b)} = ${shown}`;
  const stimmt = andere.map(([x, y]) => ({
    label: `${minus(x, y)} = ${x - y}`,
    whyWrong: `Diese Rechnung stimmt. Prüfe: ${plus(x - y, y)} = ${x}.`,
  }));
  return {
    key: `detektiv:${a}:${b}:${shown}:${andere.flat().join('-')}`,
    prompt: 'Welche Rechnung stimmt nicht?',
    answer: makeChoice(rng, { label: richtig }, stimmt),
    // The place the error shows in: with a forgotten ten, and with 62 − 27 = 45, the ones are right.
    hints: ['Prüfe jede Rechnung mit Plus.', einer(shown) === einer(a - b) ? 'Schau besonders auf die Zehner.' : 'Schau besonders auf die Einer.'],
    steps: [`${richtig} stimmt nicht.`, `Prüfe: ${plus(shown, b)} = ${shown + b}`, `Richtig ist: ${minus(a, b)} = ${a - b}`],
    praise: 'Du hast den Fehler mit Plus gefunden.',
    kmk: ['ZO.strategien', 'ZO.kontrolle'],
    knobel: true,
  };
}

/** Fehlerdetektiv: a person's calculation shows an error; the child gives the right result. */
export function detektivErgebnis(name: string, a: number, b: number, planted: 'kleiner' | 'zehner'): Task {
  const fehler = fehlerErgebnis(a, b);
  const shown = planted === 'kleiner' ? fehler.kleinerVonGroesser : fehler.zehnerVergessen;
  return {
    key: `berichtigen:${a}:${b}:${shown}`,
    prompt: `Bei ${name} steckt ein Fehler. Was ist richtig?`,
    expression: `${minus(a, b)} = ${shown}`,
    answer: { kind: 'number', value: a - b },
    hints: [`Prüfe mit Plus: ${plus(shown, b)}. Das ist nicht ${a}.`, tipps(a, b)[1]],
    steps: weg(a, b),
    bugs: bugList(a - b, minusBugs(a, b)),
    praise: 'Du hast die Rechnung geprüft und berichtigt.',
    kmk: ['ZO.strategien', 'ZO.kontrolle'],
    knobel: true,
  };
}

/**
 * A result that a hint would name by chance is left out: 68 − 59 = 9 with 'Zerlege 59: 50 und 9', 58 − 53 = 5 with '53 hat auch 5
 * Zehner'.
 */
const nenntKeinErgebnis = ([a, b]: [number, number]) => a - b !== einer(b) && a - b !== zehner(b) / 10;

function waehle(zug: () => [number, number], ersatz: [number, number]): [number, number] {
  for (let i = 0; i < 40; i++) {
    const paar = zug();
    if (nenntKeinErgebnis(paar)) return paar;
  }
  return ersatz;
}

function ohneUebergang(rng: Rng, minZehner = 2, maxZehner = 9): [number, number] {
  return waehle(() => {
    const e1 = rng.int(1, 9);
    const z1 = rng.int(minZehner, maxZehner);
    return [z1 * 10 + e1, rng.int(1, z1 - 1) * 10 + rng.int(1, e1)];
  }, [minZehner * 10 + 8, 15]);
}

function mitUebergang(rng: Rng, maxZehner = 9): [number, number] {
  return waehle(() => {
    const e1 = rng.int(0, 8);
    const z1 = rng.int(3, maxZehner);
    return [z1 * 10 + e1, rng.int(1, z1 - 1) * 10 + rng.int(e1 + 1, 9)];
  }, [62, 27]);
}

/** A gap where the answer does not also stand in the task: 62 − □ = 31 would show it. */
function ohneKopie(pair: (rng: Rng) => [number, number], ersatz: [number, number]) {
  return (rng: Rng): [number, number] => {
    for (let i = 0; i < 40; i++) {
      const [a, b] = pair(rng);
      if (a - b !== b) return [a, b];
    }
    return ersatz;
  };
}
const ohneLuecke = ohneKopie((rng) => ohneUebergang(rng), [68, 25]);
const mitLuecke = ohneKopie((rng) => mitUebergang(rng), [62, 27]);
/** The detective checks a planted result with plus. With a up to 89, that sum stays up to 100 for both errors. */
const detektivPaar = ohneKopie((rng) => mitUebergang(rng, 8), [62, 27]);

const istOhne = (x: number, y: number) => x > y && einer(x) >= einer(y);
const istMit = (x: number, y: number) => x > y && einer(x) < einer(y);

const formen: Formen = {
  1: {
    1: [(rng) => schrittAufgabe(...ohneUebergang(rng, 2, 5)), (rng) => minusAufgabe(...ohneUebergang(rng, 2, 5))],
    2: [(rng) => minusAufgabe(...ohneUebergang(rng, 6, 9), false)],
    3: [
      (rng) => {
        const [a, b] = ohneLuecke(rng);
        return lueckenAufgabe(a, b, 'hinten');
      },
      (rng) => {
        const [a, b] = ohneLuecke(rng);
        return ergebnisWaehlen(rng, a, MINUS_OP, b, istOhne, weg(a, b));
      },
    ],
  },
  2: {
    1: [(rng) => schrittAufgabe(...mitUebergang(rng)), (rng) => minusAufgabe(...mitUebergang(rng))],
    2: [(rng) => minusAufgabe(...mitUebergang(rng), false)],
    3: [
      (rng) => {
        const [a, b] = mitLuecke(rng);
        return wegLuecke(a, MINUS_OP, zehner(b), einer(b), 'zweiter');
      },
      (rng) => {
        const [a, b] = mitLuecke(rng);
        return wegLuecke(a, MINUS_OP, zehner(b), einer(b), 'erster');
      },
      (rng) => {
        const [a, b] = mitLuecke(rng);
        return ergebnisWaehlen(rng, a, MINUS_OP, b, istMit, weg(a, b));
      },
    ],
  },
  3: {
    1: [
      (rng) => {
        const [a, b] = mitLuecke(rng);
        return lueckenAufgabe(a, b, 'hinten');
      },
    ],
    2: [
      (rng) => {
        const [a, b] = mitLuecke(rng);
        return lueckenAufgabe(a, b, 'vorne');
      },
      (rng) => detektivErgebnis(pickPerson(rng).name, ...detektivPaar(rng), rng.pick(['kleiner', 'zehner'] as const)),
    ],
    3: [
      (rng) => {
        const [a, b] = detektivPaar(rng);
        return detektivWahl(rng, a, b, [ohneUebergang(rng), mitUebergang(rng), mitUebergang(rng)], rng.pick(['kleiner', 'zehner'] as const));
      },
      (rng) => detektivErgebnis(pickPerson(rng).name, ...detektivPaar(rng), rng.pick(['kleiner', 'zehner'] as const)),
    ],
  },
};

export const minusBis100Skill = defineSkill({
  id: 'plusminus.minus-bis-100',
  title: 'Minus bis 100',
  description: 'Du subtrahierst zweistellige Zahlen.',
  stufen: { 1: '2 Zahlen ohne neuen Zehner: 68 − 25', 2: '2 Zahlen über den Zehner: 62 − 27', 3: 'Lücken füllen: 62 − □ = 35; Fehlerdetektiv' },
  kmk: ['ZO.strategien'],
  formen,
});
