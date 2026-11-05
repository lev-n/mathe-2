/**
 * Geschichten mit Geld, Längen und Zeit. The Stufe chooses the content (docs/research.md §6), the AB level the demand inside it:
 * Stufe 1, whole euros, ≤ 20 €. AB I: within a ten, with a picture. AB II: over the ten. AB III: what is missing, or what was there at the start.
 * Stufe 2, cm or m, ≤ 100; Rückgeld from 20 €. AB I: a ruler, a price above 10 €. AB II: two-digit, over a ten; a price below 10 €.
 * AB III: the length at the start, the whole way, or the price from the Rückgeld.
 * Stufe 3, whole hours and days; one step with another unit (1 m = 100 cm, 1 € = 100 ct, 1 Stunde = 60 Minuten, 1 Woche = 7 Tage).
 * AB I: hours and 1 week. AB II: afternoon hours, 2 weeks, one unit step. AB III: the start time, and the unit step backwards.
 * The face has no 14: a time story with a clock starts and ends on the face, and the afternoon stays in the text (T14).
 */
import { MINUS, fmtQty } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, pickPerson, targetAb, type ExerciseBody } from '../shared';
import {
  HINT_RECHENART,
  HINT_UNTERSCHIED,
  answerLine,
  calcStep,
  crossingDifference,
  crossingDifferenceTo20,
  crossingSumTo20,
  euroPieces,
  hintsWithoutAnswer,
  sentenceAnswer,
  spokenTask,
  type BugCandidate,
} from './helpers';

const KMK_GELD = ['ZO.sachrechnen', 'GM.geld', 'GM.sachsituationen'];
const KMK_LAENGE = ['ZO.sachrechnen', 'GM.laenge', 'GM.sachsituationen'];
const KMK_ZEIT = ['ZO.sachrechnen', 'GM.zeit', 'GM.sachsituationen'];

const PRICED = ['Ball', 'Buch', 'Spiel', 'Puzzle'];

const euro = (n: number) => fmtQty(n, '€');

/** A multiple of 5, not half of 100 or 60: the answer would be the number in the story. */
function stepsOf5(rng: Rng, lo: number, hi: number, half: number): number {
  let n = rng.int(lo, hi) * 5;
  while (n === half) n = rng.int(lo, hi) * 5;
  return n;
}

/** A ruler up to here still fits a 375 px phone without scrolling (as in groessen/lineal.ts). */
const RULER_MAX_CM = 20;

/** Not 10 €: from 20 € the change would be the price itself, and the price as the answer shows no thinking. */
const CHANGE_PRICES_LOW = [3, 4, 5, 6, 7, 8, 9];
const CHANGE_PRICES_HIGH = [11, 12, 13, 14, 15, 16, 17, 18];
const CHANGE_PRICES = [...CHANGE_PRICES_LOW, ...CHANGE_PRICES_HIGH];

const CHANGE_THINGS = [
  ['Das Buch', 'das Buch', 'ein Buch'],
  ['Das Spiel', 'das Spiel', 'ein Spiel'],
  ['Der Ball', 'der Ball', 'einen Ball'],
];

interface Item {
  key: string;
  context: string;
  question: string;
  visual?: Visual;
  value: number;
  before: string;
  after: string;
  hints: string[];
  steps: ExerciseBody['steps'];
  bugs: BugCandidate[];
  praise: string;
  kmk: string[];
}

/** Stufe 1, AB I within a ten, with the money as a picture; AB II over the ten, without the picture. */
function euroStory(rng: Rng, ab: 1 | 2): Item {
  const n = pickPerson(rng).name;
  const kind = rng.pick(['preise', 'kaufen', 'geschenk'] as const);
  const picture = (items: number[]) => (ab === 1 ? { visual: { type: 'money' as const, items } } : {});
  if (kind === 'preise') {
    const [x, y] = rng.sample(PRICED, 2);
    let a: number;
    let b: number;
    if (ab === 1) {
      a = rng.pick([3, 4, 5, 6, 7, 11, 12, 13, 14, 15]);
      b = rng.int(3, 10 - a % 10);
    } else {
      // at least 3 €: a game for 2 € is no real price
      a = rng.int(3, 9);
      b = rng.int(Math.max(3, 11 - a), 9);
    }
    const value = a + b;
    return {
      key: `preise:${x}:${y}:${a}:${b}`,
      context: `Ein ${x} kostet ${euro(a)}. Ein ${y} kostet ${euro(b)}.`,
      question: `Wie viel Euro kosten ${x} und ${y} zusammen?`,
      ...picture([...euroPieces(a), ...euroPieces(b)]),
      value,
      before: 'Zusammen sind das',
      after: '€.',
      hints: ['Beide Preise kommen zusammen.', ab === 1 ? `Rechne von ${a} aus ${b} weiter.` : 'Rechne erst bis zum nächsten Zehner, dann weiter.'],
      steps: ['Beide Preise kommen zusammen.', `${euro(a)} + ${euro(b)} = ${euro(value)}`, answerLine('Zusammen sind das', value, '€.')],
      bugs: [['plus-minus-getauscht', Math.abs(a - b), 'Gefragt sind beide Preise zusammen.']],
      praise: 'Du hast mit beiden Preisen gerechnet.',
      kmk: KMK_GELD,
    };
  }
  if (kind === 'kaufen') {
    let have: number;
    let price: number;
    if (ab === 1) {
      have = rng.pick([8, 9, 13, 14, 15, 16, 17, 18, 19]);
      price = rng.int(3, have < 10 ? have - 2 : have % 10);
    } else {
      [have, price] = crossingDifferenceTo20(rng); // the price is at least 3 €
    }
    const value = have - price;
    return {
      key: `kaufen:${have}:${price}`,
      context: `${n} hat ${euro(have)}. ${n} kauft ein Spiel für ${euro(price)}.`,
      // 'jetzt' as with a gift: 'noch' only with minus would give the operation away (T13).
      question: `Wie viel Euro hat ${n} jetzt?`,
      ...picture(euroPieces(have)),
      value,
      before: `${n} hat jetzt`,
      after: '€.',
      hints: hintsWithoutAnswer(['Beim Kaufen geht Geld weg.', ab === 1 ? `Rechne von ${have} aus ${price} zurück.` : 'Rechne erst bis zum nächsten Zehner, dann weiter.'], value, 'Beim Kaufen geht Geld weg.'),
      steps: ['Beim Kaufen geht Geld weg.', `${euro(have)} ${MINUS} ${euro(price)} = ${euro(value)}`, answerLine(`${n} hat jetzt`, value, '€.')],
      bugs: [['plus-minus-getauscht', have + price, HINT_RECHENART]],
      praise: 'Du hast das Geld richtig abgezogen.',
      kmk: KMK_GELD,
    };
  }
  let have: number;
  let gift: number;
  if (ab === 1) {
    have = rng.pick([3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15]);
    gift = rng.int(2, 10 - have % 10);
  } else {
    [have, gift] = crossingSumTo20(rng);
  }
  const value = have + gift;
  return {
    key: `geschenk:${have}:${gift}`,
    context: `${n} hat ${euro(have)}. Oma schenkt ${n} ${euro(gift)}.`,
    question: `Wie viel Euro hat ${n} jetzt?`,
    ...picture(euroPieces(have)),
    value,
    before: `${n} hat jetzt`,
    after: '€.',
    hints: ['Hier kommt Geld dazu.', ab === 1 ? `Rechne von ${have} aus ${gift} weiter.` : 'Rechne erst bis zum nächsten Zehner, dann weiter.'],
    steps: ['Hier kommt Geld dazu.', `${euro(have)} + ${euro(gift)} = ${euro(value)}`, answerLine(`${n} hat jetzt`, value, '€.')],
    bugs: [['plus-minus-getauscht', have - gift, HINT_RECHENART]],
    praise: 'Du hast das Geschenk mitgerechnet.',
    kmk: KMK_GELD,
  };
}

/** Stufe 1, AB III: what is missing for a price, or the money at the start. */
function euroReversed(rng: Rng): Item {
  const n = pickPerson(rng).name;
  if (rng.chance(0.5)) {
    const thing = rng.pick(PRICED);
    const have = rng.int(3, 15);
    const price = rng.int(have + 2, 20);
    const value = price - have;
    return {
      key: `euro-fehlt:${thing}:${have}:${price}`,
      context: `${n} hat ${euro(have)}. Ein ${thing} kostet ${euro(price)}.`,
      question: `Wie viel Euro fehlen ${n} noch?`,
      visual: { type: 'money', items: euroPieces(have) },
      value,
      before: `${n} fehlen noch`,
      after: '€.',
      hints: ['Der Preis ist das Ziel.', 'Wie weit ist es vom Geld bis zum Preis?'],
      steps: ['Der Preis ist das Ziel.', `${euro(price)} ${MINUS} ${euro(have)} = ${euro(value)}`, answerLine(`${n} fehlen noch`, value, '€.')],
      bugs: [
        ['plus-minus-getauscht', have + price, 'Der Preis ist das Ziel. Wie viel fehlt bis dahin?'],
        ['mehr-unterschied', price, 'Das ist der ganze Preis. Wie viel fehlt noch?'],
      ],
      praise: 'Du hast vom Geld bis zum Preis gerechnet.',
      kmk: KMK_GELD,
    };
  }
  const price = rng.int(3, 12);
  const rest = rng.int(2, 20 - price);
  const value = price + rest;
  return {
    key: `euro-anfang:${price}:${rest}`,
    context: `${n} kauft ein Spiel für ${euro(price)}. Jetzt hat ${n} ${euro(rest)}.`,
    question: `Wie viel Euro hat ${n} am Anfang?`,
    value,
    before: 'Am Anfang sind es',
    after: '€.',
    hints: ['Am Anfang ist das Geld für das Spiel noch da.', 'Am Anfang ist es mehr als jetzt.'],
    steps: ['Am Anfang ist das Geld für das Spiel noch da.', `${euro(rest)} + ${euro(price)} = ${euro(value)}`, answerLine('Am Anfang sind es', value, '€.')],
    bugs: [['plus-minus-getauscht', Math.abs(price - rest), 'Am Anfang ist das Geld für das Spiel noch da.']],
    praise: 'Du hast die Geschichte rückwärts gedacht.',
    kmk: KMK_GELD,
  };
}

function changeItem(rng: Rng, price: number): Item {
  const n = pickPerson(rng).name;
  const value = 20 - price;
  const [thing] = rng.pick(CHANGE_THINGS);
  return {
    key: `rueckgeld:${price}:${thing}`,
    context: `${n} bezahlt mit ${euro(20)}. ${thing} kostet ${euro(price)}.`,
    question: `Wie viel Euro bekommt ${n} zurück?`,
    visual: { type: 'money', items: [2000] },
    value,
    before: `${n} bekommt`,
    after: '€ zurück.',
    // Above 10 € the next ten is the 20 € already.
    hints: [`Wie viel fehlt von ${euro(price)} bis ${euro(20)}?`, price < 10 ? 'Rechne erst bis zum nächsten Zehner.' : `Zähle von ${euro(price)} bis ${euro(20)}.`],
    steps: [`Das Rückgeld ist der Rest bis ${euro(20)}.`, `${euro(20)} ${MINUS} ${euro(price)} = ${euro(value)}`, `${n} bekommt ${euro(value)} zurück.`],
    bugs: [['rueckgeld-preis', price, `Wie viel fehlt von ${euro(price)} bis ${euro(20)}?`]],
    praise: 'Du hast vom Preis aus die Lücke gefunden.',
    kmk: KMK_GELD,
  };
}

function longerItem(rng: Rng, ab: 1 | 2): Item {
  // AB I: both strips on a ruler. AB II: the numbers are too large for a ruler and cross a ten.
  let a: number;
  let b: number;
  if (ab === 1) {
    a = rng.int(6, 15);
    b = rng.int(a + 3, RULER_MAX_CM);
  } else {
    [b, a] = crossingDifference(rng, 1);
  }
  const value = b - a;
  const [thing1, thing2, name] = ab === 1 ? ['Ein Stift', 'Ein Pinsel', 'der Pinsel'] : ['Ein Band', 'Ein Seil', 'das Seil'];
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  return {
    key: `${ab === 1 ? 'laenger' : 'laenger-gross'}:${a}:${b}`,
    // No Lineal in this story: the picture draws a real ruler below the two strips, which would contradict its length.
    context: `${thing1} ist ${a} cm lang. ${thing2} ist ${b} cm lang.`,
    question: `Wie viele Zentimeter ist ${name} länger?`,
    ...(ab === 1 ? { visual: { type: 'ruler' as const, maxCm: RULER_MAX_CM, startCm: 0, lengthCm: a, second: { startCm: 0, lengthCm: b } } } : {}),
    value,
    before: `${label} ist`,
    after: 'cm länger.',
    hints: ['Gefragt ist der Unterschied.', `Wie weit ist es von ${a} bis ${b}?`],
    steps: ['Gesucht ist der Unterschied.', calcStep(b, -a), answerLine(`${label} ist`, value, 'cm länger.')],
    bugs: [
      ['mehr-unterschied', b, 'Gefragt ist der Unterschied: Wie viel länger?'],
      ['plus-minus-getauscht', a + b, HINT_UNTERSCHIED],
    ],
    praise: 'Du hast den Unterschied gefunden.',
    kmk: KMK_LAENGE,
  };
}

function ribbon(rng: Rng, a: number, b: number): Item {
  const n = pickPerson(rng).name;
  const value = a - b;
  const ruler: Visual | undefined = a <= RULER_MAX_CM ? { type: 'ruler', maxCm: RULER_MAX_CM, startCm: 0, lengthCm: a } : undefined;
  return {
    key: `band:${a}:${b}`,
    context: `Ein Band ist ${a} cm lang. ${n} schneidet ${b} cm ab.`,
    question: 'Wie viele Zentimeter bleiben?',
    ...(ruler ? { visual: ruler } : {}),
    value,
    before: 'Es bleiben',
    after: 'cm.',
    hints: ['Vom Band geht ein Stück weg.', 'Rechne vom ganzen Band aus zurück.'],
    steps: ['Vom Band geht ein Stück weg.', calcStep(a, -b), answerLine('Es bleiben', value, 'cm.')],
    bugs: [['plus-minus-getauscht', a + b, HINT_RECHENART]],
    praise: 'Du hast das Stück richtig abgezogen.',
    kmk: KMK_LAENGE,
  };
}

/** Stufe 2, AB I: lengths on a ruler, and Rückgeld with a price above 10 €, within a ten. */
function lengthOrChangeEasy(rng: Rng): Item {
  const kind = rng.pick(['laenger', 'band', 'rueckgeld'] as const);
  if (kind === 'laenger') return longerItem(rng, 1);
  if (kind === 'rueckgeld') return changeItem(rng, rng.pick(CHANGE_PRICES_HIGH));
  const a = rng.int(14, RULER_MAX_CM);
  return ribbon(rng, a, rng.int(4, a - 4));
}

/** Stufe 2, AB II: two-digit lengths over a ten, metres in steps of 5, and Rückgeld over the ten. */
function lengthOrChangeHard(rng: Rng): Item {
  const n = pickPerson(rng).name;
  const kind = rng.pick(['laenger', 'band', 'hof', 'rueckgeld'] as const);
  if (kind === 'laenger') return longerItem(rng, 2);
  if (kind === 'rueckgeld') return changeItem(rng, rng.pick(CHANGE_PRICES_LOW));
  if (kind === 'band') {
    const [a, b] = crossingDifference(rng, 1);
    return ribbon(rng, a, b);
  }
  const a = rng.int(8, 20) * 5;
  const b = rng.int(2, a / 5 - 2) * 5;
  const value = a - b;
  return {
    key: `hof:${a}:${b}`,
    context: `Der Schulhof ist ${a} m lang. ${n} rennt ${b} m.`,
    question: 'Wie viele Meter fehlen bis zum Ende?',
    value,
    before: 'Bis zum Ende fehlen',
    after: 'm.',
    hints: ['Ein Teil vom Weg ist schon geschafft.', 'Rechne vom ganzen Weg aus zurück.'],
    steps: ['Ein Teil vom Weg ist schon geschafft.', calcStep(a, -b), answerLine('Bis zum Ende fehlen', value, 'm.')],
    bugs: [['plus-minus-getauscht', a + b, 'Ein Teil vom Weg ist schon geschafft. Wie viel fehlt noch?']],
    praise: 'Du hast den restlichen Weg gefunden.',
    kmk: KMK_LAENGE,
  };
}

/** Stufe 2, AB III: the length at the start, the whole way, or the price from the Rückgeld. */
function lengthOrChangeReversed(rng: Rng): Item {
  const n = pickPerson(rng).name;
  const kind = rng.pick(['band-anfang', 'weg-ganz', 'preis-gesucht'] as const);
  if (kind === 'preis-gesucht') {
    const price = rng.pick(CHANGE_PRICES);
    const back = 20 - price;
    const [thing, thingLower, accusative] = rng.pick(CHANGE_THINGS);
    return {
      key: `preis-gesucht:${back}:${thing}`,
      context: `${n} kauft ${accusative} und bezahlt mit ${euro(20)}. ${n} bekommt ${euro(back)} zurück.`,
      question: `Wie viel Euro kostet ${thingLower}?`,
      value: price,
      before: `${thing} kostet`,
      after: '€.',
      hints: ['Vom ganzen Geld geht das Rückgeld wieder zurück.', 'Der Rest ist der Preis.'],
      steps: [`Von ${euro(20)} kommt das Rückgeld zurück.`, `${euro(20)} ${MINUS} ${euro(back)} = ${euro(price)}`, answerLine(`${thing} kostet`, price, '€.')],
      bugs: [
        ['rueckgeld-preis', back, 'Das ist das Rückgeld. Wie viel Euro kostet die Sache?'],
        ['plus-minus-getauscht', 20 + back, 'Das Rückgeld geht vom bezahlten Geld weg.'],
      ],
      praise: 'Du hast den Preis aus dem Rückgeld gefunden.',
      kmk: KMK_GELD,
    };
  }
  if (kind === 'weg-ganz') {
    const done = rng.int(2, 12) * 5;
    const left = rng.int(2, Math.min(12, 20 - done / 5)) * 5;
    const value = done + left;
    return {
      key: `weg-ganz:${done}:${left}`,
      context: `${n} rennt schon ${done} m. Bis zum Ziel fehlen noch ${left} m.`,
      question: 'Wie viele Meter ist der ganze Weg lang?',
      value,
      before: 'Der ganze Weg ist',
      after: 'm lang.',
      hints: ['Beide Teile gehören zum ganzen Weg.', 'Nimm beide Teile zusammen.'],
      steps: ['Beide Teile gehören zum ganzen Weg.', calcStep(done, left), answerLine('Der ganze Weg ist', value, 'm lang.')],
      bugs: [['plus-minus-getauscht', Math.abs(done - left), 'Beide Teile gehören zum ganzen Weg.']],
      praise: 'Du hast beide Teile zusammen gerechnet.',
      kmk: KMK_LAENGE,
    };
  }
  const [start, cut] = crossingDifference(rng, 1);
  const rest = start - cut;
  return {
    key: `band-anfang:${cut}:${rest}`,
    context: `${n} schneidet ${cut} cm vom Band ab. Jetzt ist das Band ${rest} cm lang.`,
    question: 'Wie viele Zentimeter ist das Band am Anfang lang?',
    value: start,
    before: 'Am Anfang ist das Band',
    after: 'cm lang.',
    hints: ['Am Anfang ist das Band länger als jetzt.', 'Lege das Stück in Gedanken wieder an.'],
    steps: ['Am Anfang ist das Band länger.', calcStep(rest, cut), answerLine('Am Anfang ist das Band', start, 'cm lang.')],
    bugs: [['plus-minus-getauscht', Math.abs(rest - cut), 'Am Anfang ist das Band länger als jetzt.']],
    praise: 'Du hast die Geschichte rückwärts gedacht.',
    kmk: KMK_LAENGE,
  };
}

const EVENTS = [
  ['Das Fest', 'das Fest'],
  ['Der Ausflug', 'der Ausflug'],
  ['Die Feier', 'die Feier'],
];

function timeItem(rng: Rng, kind: 'ende' | 'dauer', afternoon: boolean): Item {
  // Never over 12 Uhr from the morning: 11 Uhr + 3 h is 14 Uhr and also, on the clock, 2 Uhr.
  const hours = rng.int(2, afternoon ? 5 : 4);
  const start = afternoon ? rng.int(13, 14) : rng.int(8, 12 - hours);
  const end = start + hours;
  const [what, whatLower] = rng.pick(EVENTS);
  const clock = afternoon ? {} : { visual: { type: 'clock' as const, hours: start, minutes: 0 } };
  if (kind === 'ende') {
    return {
      key: `ende:${what}:${start}:${hours}`,
      context: `${what} beginnt um ${start} Uhr. ${what} dauert ${hours} Stunden.`,
      question: `Um wie viel Uhr endet ${whatLower}?`,
      ...clock,
      value: end,
      before: `${what} endet um`,
      after: 'Uhr.',
      hints: [`Rechne von ${start} Uhr aus ${hours} Stunden weiter.`, 'Gefragt ist die Uhrzeit.'],
      steps: [`Der Beginn ist um ${start} Uhr.`, `${start} + ${hours} = ${end}`, `${what} endet um ${end} Uhr.`],
      bugs: [
        ['zeitpunkt-spanne', hours, 'Gefragt ist: Wann? Nicht: Wie lange?'],
        ['stunden-zwoelf', afternoon ? end - 12 : null, 'Nach 12 Uhr zählst du weiter. Rechne mit der ersten Uhrzeit.'],
      ],
      praise: 'Du hast die Stunden richtig dazugezählt.',
      kmk: KMK_ZEIT,
    };
  }
  return {
    key: `dauer:${what}:${start}:${end}`,
    context: `${what} beginnt um ${start} Uhr. ${what} endet um ${end} Uhr.`,
    question: `Wie viele Stunden dauert ${whatLower}?`,
    ...clock,
    value: hours,
    before: `${what} dauert`,
    after: 'Stunden.',
    hints: [`Wie viele Stunden sind es von ${start} bis ${end} Uhr?`, 'Gefragt ist die Zeit dazwischen.'],
    steps: ['Gesucht ist die Zeit dazwischen.', `${end} ${MINUS} ${start} = ${hours}`, `${what} dauert ${hours} Stunden.`],
    bugs: [['zeitpunkt-spanne', end, 'Gefragt ist: Wie lange? Nicht: Wann?']],
    praise: 'Du hast die Zeit dazwischen gefunden.',
    kmk: KMK_ZEIT,
  };
}

function daysItem(rng: Rng, weeks: 1 | 2): Item {
  const n = pickPerson(rng).name;
  const d = rng.int(2, 6);
  const value = 7 * weeks + d;
  return {
    key: `tage:${weeks}:${d}`,
    context: `${n} ist ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'} und ${d} Tage bei Oma.`,
    question: 'Wie viele Tage sind das zusammen?',
    value,
    before: 'Das sind zusammen',
    after: 'Tage.',
    hints: ['1 Woche hat 7 Tage.', `Rechne ${weeks === 1 ? 'die Woche' : 'die Wochen'} zuerst in Tage um.`],
    steps: ['1 Woche hat 7 Tage.', `${7 * weeks} + ${d} = ${value}`, answerLine('Das sind zusammen', value, 'Tage.')],
    bugs: [['einheiten-gemischt', weeks + d, '1 Woche hat 7 Tage.']],
    praise: `Du hast ${weeks === 1 ? 'die Woche' : 'die Wochen'} in Tage umgerechnet.`,
    kmk: KMK_ZEIT,
  };
}

/** Stufe 3, AB I: hours, and 1 week as days. */
function timeEasy(rng: Rng): Item {
  const kind = rng.pick(['ende', 'dauer', 'tage'] as const);
  return kind === 'tage' ? daysItem(rng, 1) : timeItem(rng, kind, rng.chance(0.5));
}

/** Stufe 3, AB II: afternoon hours, 2 weeks, or one step with another unit. */
function timeOrMixedUnit(rng: Rng): Item {
  const n = pickPerson(rng).name;
  const kind = rng.pick(['ende', 'dauer', 'tage', 'meter', 'euro', 'stunde'] as const);
  if (kind === 'ende' || kind === 'dauer') return timeItem(rng, kind, true);
  if (kind === 'tage') return daysItem(rng, 2);
  if (kind === 'meter') {
    const cut = stepsOf5(rng, 2, 19, 50);
    const value = 100 - cut;
    return {
      key: `meter:${cut}`,
      context: `Das Seil ist 1 m lang. ${n} schneidet ${cut} cm ab.`,
      question: 'Wie viele Zentimeter bleiben?',
      value,
      before: 'Es bleiben',
      after: 'cm.',
      hints: ['1 m sind 100 cm.', 'Rechne von 100 cm aus zurück.'],
      steps: ['1 m sind 100 cm.', `100 cm ${MINUS} ${cut} cm = ${value} cm`, answerLine('Es bleiben', value, 'cm.')],
      bugs: [
        ['einheiten-gemischt', cut - 1, '1 m sind 100 cm.'],
        ['plus-minus-getauscht', 100 + cut, HINT_RECHENART],
      ],
      praise: 'Du hast den Meter in Zentimeter umgerechnet.',
      kmk: KMK_LAENGE,
    };
  }
  if (kind === 'euro') {
    const price = stepsOf5(rng, 2, 18, 50);
    const value = 100 - price;
    return {
      key: `euro:${price}`,
      context: `${n} hat 1 €. ${n} kauft einen Lolli für ${price} ct.`,
      question: `Wie viel Cent hat ${n} noch?`,
      visual: { type: 'money', items: [100] },
      value,
      before: `${n} hat noch`,
      after: 'ct.',
      hints: ['1 € sind 100 Cent.', 'Rechne von 100 Cent aus zurück.'],
      steps: ['1 € sind 100 ct.', `100 ct ${MINUS} ${price} ct = ${value} ct`, answerLine(`${n} hat noch`, value, 'ct.')],
      bugs: [
        ['einheiten-gemischt', price - 1, '1 € sind 100 Cent.'],
        ['plus-minus-getauscht', 100 + price, HINT_RECHENART],
      ],
      praise: 'Du hast den Euro in Cent umgerechnet.',
      kmk: KMK_GELD,
    };
  }
  const seen = stepsOf5(rng, 2, 10, 30);
  const value = 60 - seen;
  return {
    key: `stunde:${seen}`,
    context: `Der Film dauert 1 Stunde. ${n} sieht schon ${seen} Minuten.`,
    question: 'Wie viele Minuten fehlen noch?',
    value,
    before: 'Es fehlen noch',
    after: 'Minuten.',
    hints: ['1 Stunde sind 60 Minuten.', 'Rechne von 60 Minuten aus zurück.'],
    steps: ['1 Stunde sind 60 Minuten.', `60 ${MINUS} ${seen} = ${value}`, answerLine('Es fehlen noch', value, 'Minuten.')],
    bugs: [
      ['stunde-100', 100 - seen, 'Eine Stunde hat 60 Minuten, nicht 100.'],
      ['einheiten-gemischt', seen - 1, '1 Stunde sind 60 Minuten.'],
    ],
    praise: 'Du hast die Stunde in Minuten umgerechnet.',
    kmk: KMK_ZEIT,
  };
}

/** Stufe 3, AB III: the start time, or the step with another unit backwards. */
function timeOrMixedUnitReversed(rng: Rng): Item {
  const n = pickPerson(rng).name;
  const kind = rng.pick(['beginn', 'tage-rest', 'meter-ab', 'euro-preis', 'stunde-schon'] as const);
  if (kind === 'beginn') {
    const afternoon = rng.chance(0.5);
    const hours = rng.int(2, 5);
    const end = afternoon ? rng.int(15, 19) : rng.int(hours + 7, 12);
    const value = end - hours;
    const [what, whatLower] = rng.pick(EVENTS);
    return {
      key: `beginn:${what}:${end}:${hours}`,
      context: `${what} endet um ${end} Uhr. ${what} dauert ${hours} Stunden.`,
      question: `Um wie viel Uhr beginnt ${whatLower}?`,
      ...(afternoon ? {} : { visual: { type: 'clock' as const, hours: end, minutes: 0 } }),
      value,
      before: `${what} beginnt um`,
      after: 'Uhr.',
      hints: ['Am Anfang ist es früher als am Ende.', `Rechne von ${end} Uhr aus zurück.`],
      steps: [`Das Ende ist um ${end} Uhr.`, `${end} ${MINUS} ${hours} = ${value}`, `${what} beginnt um ${value} Uhr.`],
      bugs: [
        ['zeitpunkt-spanne', hours, 'Gefragt ist: Wann? Nicht: Wie lange?'],
        ['plus-minus-getauscht', end + hours, 'Der Beginn ist vor dem Ende.'],
      ],
      praise: 'Du hast die Zeit rückwärts gerechnet.',
      kmk: KMK_ZEIT,
    };
  }
  if (kind === 'tage-rest') {
    const left = rng.int(2, 6);
    const total = 7 + left;
    return {
      key: `tage-rest:${total}`,
      context: `${n} ist ${total} Tage bei Oma. 1 Woche ist schon vorbei.`,
      question: `Wie viele Tage bleibt ${n} noch?`,
      value: left,
      before: `${n} bleibt noch`,
      after: 'Tage.',
      hints: ['1 Woche hat 7 Tage.', 'Rechne die Woche zuerst in Tage um.'],
      steps: ['1 Woche hat 7 Tage.', `${total} ${MINUS} 7 = ${left}`, answerLine(`${n} bleibt noch`, left, 'Tage.')],
      bugs: [['einheiten-gemischt', total - 1, '1 Woche hat 7 Tage.']],
      praise: 'Du hast die Woche in Tage umgerechnet.',
      kmk: KMK_ZEIT,
    };
  }
  if (kind === 'meter-ab') {
    const rest = stepsOf5(rng, 2, 19, 50);
    const value = 100 - rest;
    return {
      key: `meter-ab:${rest}`,
      context: `Das Seil ist am Anfang 1 m lang. Jetzt ist das Seil ${rest} cm lang.`,
      question: `Wie viele Zentimeter schneidet ${n} ab?`,
      value,
      before: `${n} schneidet`,
      after: 'cm ab.',
      hints: ['1 m sind 100 cm.', 'Wie weit ist es bis 100 cm?'],
      steps: ['1 m sind 100 cm.', `100 cm ${MINUS} ${rest} cm = ${value} cm`, answerLine(`${n} schneidet`, value, 'cm ab.')],
      bugs: [
        ['einheiten-gemischt', rest - 1, '1 m sind 100 cm.'],
        ['plus-minus-getauscht', 100 + rest, 'Das Seil wird kürzer.'],
      ],
      praise: 'Du hast den Meter in Zentimeter umgerechnet.',
      kmk: KMK_LAENGE,
    };
  }
  if (kind === 'euro-preis') {
    const rest = stepsOf5(rng, 2, 18, 50);
    const value = 100 - rest;
    return {
      key: `euro-preis:${rest}`,
      context: `${n} hat 1 € und kauft einen Lolli. Jetzt hat ${n} ${rest} ct.`,
      question: 'Wie viel Cent kostet der Lolli?',
      value,
      before: 'Der Lolli kostet',
      after: 'ct.',
      hints: ['1 € sind 100 Cent.', 'Wie weit ist es bis 100 Cent?'],
      steps: ['1 € sind 100 ct.', `100 ct ${MINUS} ${rest} ct = ${value} ct`, answerLine('Der Lolli kostet', value, 'ct.')],
      bugs: [
        ['einheiten-gemischt', rest - 1, '1 € sind 100 Cent.'],
        ['plus-minus-getauscht', 100 + rest, 'Beim Kaufen geht Geld weg.'],
      ],
      praise: 'Du hast den Euro in Cent umgerechnet.',
      kmk: KMK_GELD,
    };
  }
  const left = stepsOf5(rng, 2, 10, 30);
  const value = 60 - left;
  return {
    key: `stunde-schon:${left}`,
    context: `Der Film dauert 1 Stunde. Es fehlen noch ${left} Minuten.`,
    question: `Wie viele Minuten sieht ${n} schon?`,
    value,
    before: `${n} sieht schon`,
    after: 'Minuten.',
    hints: ['1 Stunde sind 60 Minuten.', 'Wie weit ist es bis 60 Minuten?'],
    steps: ['1 Stunde sind 60 Minuten.', `60 ${MINUS} ${left} = ${value}`, answerLine(`${n} sieht schon`, value, 'Minuten.')],
    bugs: [
      ['stunde-100', 100 - left, 'Eine Stunde hat 60 Minuten, nicht 100.'],
      ['einheiten-gemischt', left - 1, '1 Stunde sind 60 Minuten.'],
    ],
    praise: 'Du hast die Stunde in Minuten umgerechnet.',
    kmk: KMK_ZEIT,
  };
}

function itemFor(rng: Rng, stufe: Stufe, ab: Ab): Item {
  if (stufe === 1) return ab === 3 ? euroReversed(rng) : euroStory(rng, ab);
  if (stufe === 2) return ab === 1 ? lengthOrChangeEasy(rng) : ab === 2 ? lengthOrChangeHard(rng) : lengthOrChangeReversed(rng);
  return ab === 1 ? timeEasy(rng) : ab === 2 ? timeOrMixedUnit(rng) : timeOrMixedUnitReversed(rng);
}

function toExercise(item: Item, stufe: Stufe, ab: 1 | 2 | 3): Exercise {
  const fallback = item.hints[0];
  return build(mitGroessenSkill, stufe, {
    key: item.key,
    ab,
    context: item.context,
    prompt: item.question,
    ...(item.visual ? { visual: item.visual } : {}),
    answer: sentenceAnswer(item.value, item.before, item.after, item.question),
    hints: hintsWithoutAnswer(item.hints, item.value, fallback),
    steps: item.steps,
    bugs: bugList(item.value, item.bugs),
    praise: item.praise,
    srText: spokenTask(item.context, item.question),
    kmk: item.kmk,
  });
}

export const mitGroessenSkill: SkillDef = {
  id: 'sachaufgaben.mit-groessen',
  topicId: 'sachaufgaben',
  title: 'Geschichten: Geld, Länge, Zeit',
  description: 'Du rechnest mit Euro, Metern oder Stunden.',
  stufen: {
    1: 'Ganze Euro, bis 20 €',
    2: 'Zentimeter und Meter, Rückgeld von 20 €',
    3: 'Stunden und Tage; eine Umrechnung von Einheiten',
  },
  kmk: ['ZO.sachrechnen', 'GM.sachsituationen', 'GM.geld', 'GM.laenge', 'GM.zeit'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return toExercise(itemFor(rng, stufe, ab), stufe, ab);
  },
};
