/**
 * Zehner voll machen: Stufe 1 number pairs to 10 and completing to 20, Stufe 2 completing to the next ten, Stufe 3 completing to
 * 100 (docs/research.md §6). AB I shows the start on a field, so the child sees what is missing without counting in ones (F1);
 * AB II moves the □; AB III turns the task round.
 */
import { BOX } from '../../core/format';
import type { Rng, Visual } from '../../core/types';
import { bugList, makeChoice } from '../shared';
import { defineSkill, einer, minus, naechsterZehner, plus, rechenstrich, zweistellig, type Formen, type Task } from './rechnen';

export type ErgaenzenForm = 'vorne' | 'hinten' | 'frage' | 'zerlegen' | 'minus' | 'start';

const field = (a: number, ziel: number, second?: number): Visual => ({ type: 'field', size: ziel <= 20 ? 20 : 100, filled: a, ...(second ? { second } : {}) });

/** a + □ = ziel in one of its forms; 'start' asks for a: □ + 3 = 40. ziel is 10 (a below 10), 20 or the next ten after a, or 100. */
export function ergaenzen(a: number, ziel: number, form: ErgaenzenForm): Task {
  const fehlt = ziel - a;
  const e = einer(a);
  const bisHundert = ziel === 100 && a < 90;
  const bisZehner = !bisHundert && a > 10;
  const start = form === 'start';
  const value = start ? a : fehlt;
  const mitFeld = form === 'vorne' || form === 'frage';
  const expression = {
    vorne: `${plus(a, BOX)} = ${ziel}`,
    hinten: `${plus(BOX, a)} = ${ziel}`,
    zerlegen: `${ziel} = ${plus(a, BOX)}`,
    minus: `${minus(ziel, BOX)} = ${a}`,
    start: `${plus(BOX, fehlt)} = ${ziel}`,
    frage: undefined,
  }[form];
  const prompt = {
    frage: `Wie viel fehlt von ${a} bis ${ziel}?`,
    zerlegen: `Zerlege die ${ziel}.`,
    vorne: `Wie viel fehlt bis ${ziel}?`,
    hinten: `Wie viel fehlt bis ${ziel}?`,
    minus: 'Welche Zahl gehört in die Lücke?',
    start: 'Welche Zahl gehört in die Lücke?',
  }[form];
  const naechster = naechsterZehner(a);
  const bisZ = naechster - a;

  let hints: string[];
  let steps: Task['steps'];
  if (start) {
    hints = [`Rechne rückwärts: ${minus(ziel, fehlt)}.`, `Von der Zahl bis ${ziel} ${fehlt === 1 ? 'fehlt 1' : `fehlen ${fehlt}`}.`];
    steps = [`Rückwärts: ${minus(ziel, fehlt)} = ${a}`, { text: `Probe: ${plus(a, fehlt)} = ${ziel}`, visual: rechenstrich([a, ziel]) }];
  } else if (bisHundert) {
    hints = [`Rechne erst bis ${naechster}: ${plus(a, bisZ)} = ${naechster}.`, 'Wie viele Zehner fehlen dann noch bis 100?'];
    steps = [
      `Bis zum Zehner: ${plus(a, bisZ)} = ${naechster}`,
      { text: `Bis 100: ${plus(naechster, 100 - naechster)} = 100`, visual: rechenstrich([a, naechster, 100]) },
      `Zusammen: ${plus(bisZ, 100 - naechster)} = ${fehlt}`,
    ];
  } else if (bisZehner) {
    // With 5 ones the number of ones is also what is missing: the hint must not name it.
    hints = [e === fehlt ? 'Schau auf die Einer. Wie viel fehlt bis 10?' : `Schau auf die Einer: ${e}. Wie viel fehlt bis 10?`, mitFeld ? 'Schau auf das Feld. Sieh die angefangene Reihe an.' : 'Mach den Zehner voll.'];
    steps = [`Die Einer: ${plus(e, fehlt)} = 10`, { text: `${plus(a, fehlt)} = ${ziel}`, visual: rechenstrich([a, ziel]) }];
  } else {
    hints = [mitFeld ? 'Schau auf das Feld. Wie viele Plätze sind in der Reihe frei?' : `Wie weit ist es von ${a} bis ${ziel}?`, mitFeld ? 'Eine volle Reihe hat 10 Punkte.' : 'Gehe von der kleinen Zahl nach oben.'];
    steps = [{ text: `Bis ${ziel} ${fehlt === 1 ? 'fehlt noch 1' : `fehlen noch ${fehlt}`}.`, visual: field(a, ziel, fehlt) }, `${plus(a, fehlt)} = ${ziel}`];
  }

  const ganzeSeite = form === 'frage' ? `Rechne nicht zusammen. Wie viel fehlt bis ${ziel}?` : form === 'minus' ? `Von ${ziel} geht etwas weg. Es ${a === 1 ? 'bleibt' : 'bleiben'} ${a}.` : `Die ganze Seite ergibt ${ziel}. Wie viel fehlt bis ${ziel}?`;
  const bugs = start
    ? bugList(a, [
        ['zaehlen-eins-daneben', a - 1, `Fast! Prüfe: ${plus(a - 1, fehlt)} ist noch nicht ${ziel}.`],
        ['zaehlen-eins-daneben', a + 1, `Fast! Prüfe: ${plus(a + 1, fehlt)} ist schon mehr als ${ziel}.`],
        ['platzhalter-summe', ziel + fehlt, `Die ganze Seite ergibt ${ziel}. Die Zahl vorne ist kleiner.`],
        ['ziel-genannt', ziel, `${ziel} ist das Ziel. Welche Zahl steht davor?`],
      ])
    : bugList(fehlt, [
        ['zaehlen-eins-daneben', fehlt - 1, `Fast! Prüfe: ${plus(a, fehlt - 1)} ist noch nicht ${ziel}.`],
        ['zaehlen-eins-daneben', fehlt + 1, `Fast! Prüfe: ${plus(a, fehlt + 1)} ist schon mehr als ${ziel}.`],
        ['platzhalter-summe', a + ziel, ganzeSeite],
        ['ziel-genannt', ziel, `${ziel} ist das Ziel. Wie viel fehlt bis dahin?`],
        ['einer-genannt', a > 10 && !bisHundert ? e : null, `${e === 1 ? '1 ist der Einer' : `${e} sind die Einer`} von ${a}. Wie viel fehlt bis 10?`],
        // 37 → 73: each digit completed to 10.
        ['zehner-zu-viel', bisHundert ? fehlt + 10 : null, `Prüfe: ${plus(a, fehlt + 10)} ist mehr als 100. Rechne erst bis ${naechster}.`],
        // 37 → 60: only the way from the next ten to 100.
        ['einer-vergessen', bisHundert ? 100 - naechster : null, `Von ${naechster} bis 100 stimmt. Von ${a} bis ${naechster} fehlt noch.`],
      ]);

  return {
    key: `${form}:${a}:${ziel}`,
    prompt,
    ...(expression ? { expression } : {}),
    ...(mitFeld ? { visual: field(a, ziel) } : {}),
    answer: { kind: 'number', value },
    hints,
    steps,
    bugs,
    praise: start ? 'Du hast rückwärts gerechnet und geprüft.' : bisHundert ? 'Du bist über den Zehner bis 100 gegangen.' : `Du hast bis ${ziel} ergänzt.`,
  };
}

/** Which task fills the 10 or the 20? Only one option adds up: the others are one off, in either number. */
export function paarWaehlen(rng: Rng, a: number, ziel: 10 | 20): Task {
  const fehlt = ziel - a;
  const falsch = (x: number, y: number) => ({ label: plus(x, y), whyWrong: `Prüfe: ${plus(x, y)} ist nicht ${ziel}.` });
  return {
    key: `paar:${a}:${ziel}`,
    prompt: `Welche Aufgabe macht die ${ziel} voll?`,
    answer: makeChoice(rng, { label: plus(a, fehlt) }, [falsch(a, fehlt + 1), ...(fehlt > 1 ? [falsch(a, fehlt - 1)] : []), falsch(a + 1, fehlt), ...(a > 1 ? [falsch(a - 1, fehlt)] : [])]),
    hints: [ziel === 10 ? 'Beide Zahlen zusammen ergeben genau 10.' : 'Schau auf die Einer: Beide zusammen ergeben genau 10.', 'Rechne jede Aufgabe aus.'],
    steps: [`Bis ${ziel} ${fehlt === 1 ? 'fehlt noch 1' : `fehlen noch ${fehlt}`}.`, `${plus(a, fehlt)} = ${ziel}`],
    praise: 'Du hast das passende Paar erkannt.',
  };
}

const bis10 = (rng: Rng) => rng.int(1, 9);
const bis20 = (rng: Rng) => rng.int(11, 19);
/** A two-digit number from 21 on: the numbers up to 20 belong to Stufe 1. */
const startZehner = (rng: Rng) => zweistellig(rng, 2, 9);
/** The way to 100 has a stop at a ten: whole tens are a task of the next ten, 90 and above too. */
const startHundert = (rng: Rng) => zweistellig(rng, 1, 8);

const zumZehner = (rng: Rng, form: ErgaenzenForm) => {
  const a = startZehner(rng);
  return ergaenzen(a, naechsterZehner(a), form);
};

const formen: Formen = {
  1: {
    1: [(rng) => ergaenzen(bis10(rng), 10, 'vorne'), (rng) => ergaenzen(bis10(rng), 10, 'frage')],
    2: [(rng) => ergaenzen(bis20(rng), 20, 'vorne'), (rng) => ergaenzen(bis20(rng), 20, 'frage')],
    3: [
      (rng) => paarWaehlen(rng, bis10(rng), 10),
      (rng) => paarWaehlen(rng, bis20(rng), 20),
      (rng) => ergaenzen(rng.pick([1, 2, 3, 4, 6, 7, 8, 9]), 10, 'minus'),
      (rng) => ergaenzen(bis20(rng), 20, 'minus'),
    ],
  },
  2: {
    1: [(rng) => zumZehner(rng, 'vorne'), (rng) => zumZehner(rng, 'frage')],
    2: [(rng) => zumZehner(rng, 'hinten'), (rng) => zumZehner(rng, 'zerlegen')],
    3: [(rng) => zumZehner(rng, 'minus'), (rng) => zumZehner(rng, 'start')],
  },
  3: {
    1: [(rng) => ergaenzen(startHundert(rng), 100, 'vorne'), (rng) => ergaenzen(startHundert(rng), 100, 'frage')],
    2: [(rng) => ergaenzen(startHundert(rng), 100, 'hinten'), (rng) => ergaenzen(startHundert(rng), 100, 'zerlegen')],
    3: [(rng) => ergaenzen(startHundert(rng), 100, 'minus'), (rng) => ergaenzen(startHundert(rng), 100, 'start')],
  },
};

export const zehnerVollSkill = defineSkill({
  id: 'plusminus.zehner-voll',
  title: 'Zehner voll machen',
  description: 'Du zerlegst Zahlen und ergänzt bis zum nächsten Zehner.',
  stufen: { 1: 'Bis 10 und bis 20 ergänzen', 2: 'Bis zum nächsten Zehner: 37 + □ = 40', 3: 'Bis 100 ergänzen: 37 + □ = 100' },
  kmk: ['ZO.grundaufgaben', 'ZO.strategien'],
  formen,
});
