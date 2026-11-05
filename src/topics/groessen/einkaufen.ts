/**
 * Einkaufen und Rückgeld. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1 add two whole-euro prices. AB 1 sum up to 10 €, AB 2 sum from 11 € to 20 €, AB 3 the sum is given and one price is missing.
 * Stufe 2 Rückgeld by adding on from the price. AB 1 from 10 €, AB 2 from 20 €, also as a picture, AB 3 the Rückgeld is given: the price, or the note.
 * Stufe 3 Cent prices up to 100 ct, money for three things. AB 1 two Cent prices in steps of 5, Rückgeld from 1 € in steps of 10.
 * AB 2 Rückgeld from 1 € in steps of 5, the sum over a ten, is the money enough in steps of 10. AB 3 is the money enough in steps of 5, a missing price in the list.
 */
import { BOX, MINUS, NBSP } from '../../core/format';
import type { Ab, ChoiceAnswer, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, pickPerson, speak, targetAb } from '../shared';
import { fewestPieces, pictureChoice, sum } from './helpers';

const SKILL = { id: 'groessen.einkaufen', topicId: 'groessen' } as const;
const KMK = ['GM.geld', 'GM.sachsituationen'];

interface Thing {
  /** With the article, for the start of a sentence: 'Ein Heft'. */
  text: string;
  name: string;
  min: number;
  max: number;
}

/** Whole-euro prices. */
const EURO_THINGS: readonly Thing[] = [
  { text: 'Ein Heft', name: 'Heft', min: 1, max: 3 },
  { text: 'Ein Stift', name: 'Stift', min: 1, max: 4 },
  { text: 'Ein Kleber', name: 'Kleber', min: 2, max: 4 },
  { text: 'Ein Ball', name: 'Ball', min: 4, max: 12 },
  { text: 'Ein Buch', name: 'Buch', min: 5, max: 12 },
  { text: 'Ein Puzzle', name: 'Puzzle', min: 5, max: 12 },
  { text: 'Ein Spiel', name: 'Spiel', min: 6, max: 15 },
  { text: 'Eine Mütze', name: 'Mütze', min: 6, max: 12 },
];

/** Cent prices. */
const CENT_THINGS: readonly Thing[] = [
  { text: 'Ein Apfel', name: 'Apfel', min: 20, max: 60 },
  { text: 'Ein Keks', name: 'Keks', min: 10, max: 40 },
  { text: 'Eine Brezel', name: 'Brezel', min: 40, max: 80 },
  { text: 'Eine Banane', name: 'Banane', min: 20, max: 50 },
  { text: 'Ein Eis', name: 'Eis', min: 50, max: 90 },
  { text: 'Ein Bonbon', name: 'Bonbon', min: 5, max: 20 },
];

/** 'Ein Heft' inside a sentence: 'ein Heft'. */
const inSentence = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const euro = (n: number) => `${n}${NBSP}€`;
const cent = (n: number) => `${n}${NBSP}ct`;

const ADD_BACK = 'Beide Sachen kosten zusammen mehr. Rechne plus.';
const CHANGE_LESS = 'Das Rückgeld ist weniger als der Schein. Rechne vom Preis weiter.';

function priceOf(rng: Rng, t: Thing, step = 1, max = t.max): number {
  const low = Math.ceil(t.min / step);
  const high = Math.max(low, Math.floor(max / step));
  return rng.int(low, high) * step;
}

function twoPrices(rng: Rng, ab: Ab): { a: Thing; b: Thing; pa: number; pb: number } {
  const lo = ab === 1 ? 3 : 11;
  const hi = ab === 1 ? 10 : 20;
  for (let i = 0; i < 200; i++) {
    const [a, b] = rng.sample(EURO_THINGS, 2);
    const pa = priceOf(rng, a);
    const pb = priceOf(rng, b);
    if (pa !== pb && pa + pb >= lo && pa + pb <= hi) return { a, b, pa, pb };
  }
  return ab === 1 ? { a: EURO_THINGS[0], b: EURO_THINGS[3], pa: 2, pb: 5 } : { a: EURO_THINGS[0], b: EURO_THINGS[3], pa: 2, pb: 9 };
}

/** Two prices, in three forms. */
function addPrices(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { a, b, pa, pb } = twoPrices(rng, ab);
  const total = pa + pb;
  const who = pickPerson(rng);
  const form = rng.pick(['frage', 'satz', 'rechnung'] as const);
  const context = `${a.text} kostet ${euro(pa)}. ${b.text} kostet ${euro(pb)}.`;
  const prompt = form === 'satz' ? `Wie viel bezahlt ${who.name} für beide Sachen?` : 'Wie viel kostet beides zusammen?';
  const expression = form === 'rechnung' ? `${euro(pa)} + ${euro(pb)} = ${BOX}` : undefined;
  const crossing = pa < 10 && pb < 10 && total > 10;
  return build(SKILL, stufe, {
    key: `zusammen:${form}:${a.name}${pa}:${b.name}${pb}${form === 'satz' ? `:${who.name}` : ''}`,
    ab,
    context,
    prompt,
    ...(expression ? { expression } : {}),
    answer: form === 'satz'
      ? { kind: 'number', value: total, before: `${who.name} bezahlt`, after: '€.', label: 'Preis in Euro' }
      : { kind: 'number', value: total, unit: '€', label: 'Preis in Euro' },
    hints: ['Rechne die beiden Preise zusammen.', crossing ? 'Rechne erst bis 10, dann weiter.' : 'Beginne mit dem größeren Preis.'],
    steps: [`${euro(pa)} + ${euro(pb)} = ${euro(total)}`, `Beides kostet ${euro(total)}.`],
    bugs: bugList(total, [['plus-minus-getauscht', Math.abs(pa - pb), ADD_BACK]]),
    praise: 'Du hast beide Preise plus gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** The sum is known, one price is missing. */
function missingPrice(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { a, b, pa, pb } = twoPrices(rng, 2);
  const total = pa + pb;
  const context = `${a.text} und ${inSentence(b.text)} kosten zusammen ${euro(total)}. ${a.text} kostet ${euro(pa)}.`;
  const prompt = `Wie viel kostet ${inSentence(b.text)}?`;
  const expression = `${euro(pa)} + ${BOX} = ${euro(total)}`;
  const onward = `Rechne von ${euro(pa)} weiter bis ${euro(total)}.`;
  return build(SKILL, stufe, {
    key: `preis-fehlt:${a.name}${pa}:${b.name}${pb}`,
    ab,
    context,
    prompt,
    expression,
    answer: { kind: 'number', value: pb, unit: '€', label: 'Preis in Euro' },
    hints: ['Der Preis von beiden Sachen ist schon da.', onward],
    steps: [`${euro(pa)} + ${euro(pb)} = ${euro(total)}`, `${b.text} kostet ${euro(pb)}.`],
    bugs: bugList(pb, [['plus-minus-getauscht', pa + total, 'Ein Preis ist weniger als beide Preise zusammen. Rechne zurück.']]),
    praise: 'Du hast den fehlenden Preis ausgerechnet.',
    srText: speak(`${context} ${prompt} ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Adding on from the price: price → 10 € → paid. */
function changeSteps(price: number, paid: number): string[] {
  if (price >= 10 || paid === 10) return [`${euro(price)} + ${euro(paid - price)} = ${euro(paid)}`, `Das Rückgeld ist ${euro(paid - price)}.`];
  const toTen = 10 - price;
  return [`${euro(price)} + ${euro(toTen)} = ${euro(10)}`, `${euro(10)} + ${euro(paid - 10)} = ${euro(paid)}`, `Rückgeld: ${euro(toTen)} + ${euro(paid - 10)} = ${euro(paid - price)}`];
}

function changeTask(rng: Rng, ab: Ab): { t: Thing; price: number; paid: number } {
  // AB 1 from 10 €, then from 20 €; AB 3 from both.
  const paid = ab === 1 || (ab === 3 && rng.chance(0.4)) ? 10 : 20;
  for (;;) {
    const t = rng.pick(EURO_THINGS);
    const price = priceOf(rng, t, 1, Math.min(t.max, paid - 1));
    // 5 € of 10 €: the Rückgeld would stand in the task as the price.
    if (price * 2 !== paid) return { t, price, paid };
  }
}

function changeNumber(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { t, price, paid } = changeTask(rng, ab);
  const who = pickPerson(rng);
  const change = paid - price;
  const form = rng.pick(['frage', 'satz', 'ergaenzen'] as const);
  const context = `${t.text} kostet ${euro(price)}. ${who.name} zahlt mit ${euro(paid)}.`;
  const prompt = `Wie viel Rückgeld bekommt ${who.name}?`;
  const expression = form === 'ergaenzen' ? `${euro(price)} + ${BOX} = ${euro(paid)}` : undefined;
  const missing = `Wie viel fehlt von ${euro(price)} bis ${euro(paid)}?`;
  return build(SKILL, stufe, {
    key: `rueckgeld:${form}:${t.name}:${price}:${paid}:${who.name}`,
    ab,
    context,
    prompt,
    ...(expression ? { expression } : {}),
    visual: { type: 'money', items: [paid * 100] },
    answer: form === 'satz'
      ? { kind: 'number', value: change, before: `${who.name} bekommt`, after: '€ zurück.', label: 'Rückgeld in Euro' }
      : { kind: 'number', value: change, unit: '€', label: 'Rückgeld in Euro' },
    hints: [missing, 'Rechne vom Preis weiter bis zum Schein.'],
    steps: changeSteps(price, paid),
    bugs: bugList(change, [
      ['rueckgeld-preis', price, missing],
      ['plus-minus-getauscht', price + paid, CHANGE_LESS],
    ]),
    praise: 'Du hast vom Preis bis zum Schein gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** The Rückgeld is known: what did the thing cost? */
function priceFromChange(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { t, price, paid } = changeTask(rng, ab);
  const who = pickPerson(rng);
  const change = paid - price;
  const context = `${who.name} zahlt mit ${euro(paid)}. ${who.name} bekommt ${euro(change)} zurück.`;
  const prompt = `Wie viel kostet ${inSentence(t.text)}?`;
  const back = `Rechne vom Schein ${euro(change)} zurück.`;
  return build(SKILL, stufe, {
    key: `preis-aus-rueckgeld:${t.name}:${price}:${paid}:${who.name}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: [paid * 100] },
    answer: { kind: 'number', value: price, unit: '€', label: 'Preis in Euro' },
    hints: ['Preis und Rückgeld sind zusammen so viel wie der Schein.', back],
    steps: [`${euro(paid)} ${MINUS} ${euro(change)} = ${euro(price)}`, `${t.text} kostet ${euro(price)}.`],
    bugs: bugList(price, [
      ['rueckgeld-preis', change, 'Das ist das Rückgeld. Gefragt ist der Preis.'],
      ['plus-minus-getauscht', paid + change, 'Der Preis ist weniger als der Schein. Rechne minus.'],
    ]),
    praise: 'Du hast vom Rückgeld auf den Preis geschlossen.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const NOTE_OPTIONS: readonly number[] = [5, 10, 20, 50];

/** Price and Rückgeld are known: which note was it? */
function noteFromChange(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { t, price, paid } = changeTask(rng, ab);
  const who = pickPerson(rng);
  const change = paid - price;
  const context = `${t.text} kostet ${euro(price)}. ${who.name} bekommt ${euro(change)} zurück.`;
  const prompt = `Mit welchem Schein zahlt ${who.name}?`;
  const line = 'Rechne Preis und Rückgeld zusammen.';
  return build(SKILL, stufe, {
    key: `schein:${t.name}:${price}:${paid}:${who.name}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: euro(paid) }, NOTE_OPTIONS.filter((n) => n !== paid).map((n) => ({ label: euro(n), whyWrong: `Dieser Schein passt nicht. ${line}` })), { order: NOTE_OPTIONS.map(euro) }),
    hints: [line, 'Das Ergebnis ist der Schein.'],
    steps: [`${euro(price)} + ${euro(change)} = ${euro(paid)}`, `${who.name} zahlt mit ${euro(paid)}.`],
    praise: 'Du hast den Schein rückwärts gefunden.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Which money comes back? */
function changePicture(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { t, price, paid } = changeTask(rng, ab);
  const who = pickPerson(rng);
  const change = paid - price;
  const context = `${t.text} kostet ${euro(price)}. ${who.name} zahlt mit ${euro(paid)}.`;
  const prompt = `Welches Geld bekommt ${who.name} zurück?`;
  const missing = `Wie viel fehlt von ${euro(price)} bis ${euro(paid)}?`;
  const money = (n: number): Visual => ({ type: 'money', items: fewestPieces(n * 100) });
  const others = [change + 1, change + 2, change - 1, change - 2, change + 3].filter((n) => n >= 1 && n !== price && n !== change && n !== paid);
  const wrongs = [
    ...(price !== change ? [{ visual: money(price), whyWrong: `Das ist der Preis. ${missing}` }] : []),
    ...others.map((n) => ({ visual: money(n), whyWrong: `Das sind ${euro(n)}. ${missing}` })),
  ].slice(0, 3);
  const { answer, rightLabel } = pictureChoice(rng, money(change), wrongs);
  return build(SKILL, stufe, {
    key: `rueckgeld-bild:${t.name}:${price}:${paid}:${who.name}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: [paid * 100] },
    answer,
    hints: [missing, 'Rechne vom Preis weiter bis zum Schein.'],
    steps: [`${euro(price)} + ${euro(change)} = ${euro(paid)}`, `Bild ${rightLabel} zeigt ${euro(change)}.`],
    praise: 'Du hast das Rückgeld ausgerechnet und gefunden.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Two prices in steps of 5 with a sum up to 100 ct; at least one is no full ten. AB 2: both are, so the Einer go over a ten. */
function centPair(rng: Rng, ab: Ab): { a: Thing; b: Thing; pa: number; pb: number } {
  for (;;) {
    const [a, b] = rng.sample(CENT_THINGS, 2);
    const [pa, pb] = [priceOf(rng, a, 5), priceOf(rng, b, 5)];
    const noTens = [pa, pb].filter((p) => p % 10 !== 0).length;
    if (pa !== pb && pa + pb <= 100 && noTens >= ab) return { a, b, pa, pb };
  }
}

function centSum(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { a, b, pa, pb } = centPair(rng, ab);
  const total = pa + pb;
  const context = `${a.text} kostet ${cent(pa)}. ${b.text} kostet ${cent(pb)}.`;
  const prompt = 'Wie viel kostet beides zusammen?';
  return build(SKILL, stufe, {
    key: `cent-summe:${a.name}${pa}:${b.name}${pb}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: total, unit: 'ct', label: 'Preis in Cent' },
    hints: ['Rechne zuerst die Zehner, dann die Einer.', 'Die Preise sind in Cent. Das Ergebnis auch.'],
    steps: [`${cent(pa)} + ${cent(pb)} = ${cent(total)}`, `Beides kostet ${cent(total)}.`],
    bugs: bugList(total, [['plus-minus-getauscht', Math.abs(pa - pb), ADD_BACK]]),
    praise: 'Du hast die Cent-Preise plus gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

function centChange(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const step = ab === 1 ? 10 : 5;
  const t = rng.pick(CENT_THINGS);
  const drawn = priceOf(rng, t, step);
  // 50 ct of 1 €: the Rückgeld would stand in the task as the price.
  const price = drawn === 50 ? drawn + step : drawn;
  const who = pickPerson(rng);
  const change = 100 - price;
  const context = `${t.text} kostet ${cent(price)}. ${who.name} zahlt mit 1${NBSP}€.`;
  const prompt = `Wie viel Cent Rückgeld bekommt ${who.name}?`;
  const missing = `Wie viel fehlt von ${cent(price)} bis 1${NBSP}€?`;
  return build(SKILL, stufe, {
    key: `cent-rueckgeld:${t.name}:${price}:${who.name}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: [100] },
    answer: { kind: 'number', value: change, unit: 'ct', label: 'Rückgeld in Cent' },
    hints: ['100 Cent sind 1 Euro.', missing],
    steps: ['1 € sind 100 ct.', `100 ct ${MINUS} ${cent(price)} = ${cent(change)}`, `Das Rückgeld ist ${cent(change)}.`],
    bugs: bugList(change, [['rueckgeld-preis', price, missing]]),
    praise: 'Du hast an 100 Cent gedacht.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

interface Basket {
  rows: { name: string; text: string; price: number }[];
  total: number;
  fmt: (n: number) => string;
  /** Smallest difference between the prices. */
  step: number;
}

const priceTable = ({ rows, fmt }: Basket, gap = -1): Visual => ({
  type: 'table',
  caption: 'Preise',
  header: ['Sache', 'Preis'],
  rows: rows.map((r, i) => [r.name, i === gap ? BOX : fmt(r.price)]),
});

/**
 * Three things with a price list (T14: a table is a diagram). AB 2 has full tens or small whole-euro prices, AB 3 prices in steps of 5 or larger whole-euro prices.
 * Reading the sum of three is the content of Stufe 3, in Cent as in Euro.
 */
function basket(rng: Rng, ab: Ab): Basket {
  const inCent = rng.chance(ab === 2 ? 0.5 : 0.7);
  const fmt = inCent ? cent : euro;
  const step = inCent ? (ab === 2 ? 10 : 5) : 1;
  const things = rng.sample(inCent ? CENT_THINGS : EURO_THINGS.slice(0, 5), 3);
  const maxTotal = inCent ? 90 : ab === 2 ? 12 : 18;
  let prices = things.map((t) => priceOf(rng, t, step, inCent ? 30 : Math.min(t.max, ab === 2 ? 5 : 7)));
  while (sum(prices) > maxTotal) prices = prices.map((p) => Math.max(step, p - step));
  const rows = things.map((t, i) => ({ name: t.name, text: t.text, price: prices[i] }));
  return { rows, total: sum(prices), fmt, step };
}

/** Is the money enough? */
function enoughMoney(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const list = basket(rng, ab);
  const { rows, total, fmt, step: unit } = list;
  const who = pickPerson(rng);
  // The money stays in the range as well: 110 ct is beyond 100 and would need 1 € 10 ct, mixed units (F15).
  const most = fmt(1).endsWith('ct') ? 100 : 2000;
  const have = total + rng.pick([-2, -1, 0, 1, 2].filter((d) => total + d * unit <= most)) * unit;
  const enough = have >= total;
  const context = `${who.name} hat ${fmt(have)}.`;
  const prompt = 'Reicht das Geld für alle 3 Sachen?';
  const line = `${rows.map((r) => fmt(r.price)).join(' + ')} = ${fmt(total)}`;
  const compare = have === total ? `${fmt(have)} ist genauso viel.` : `${fmt(have)} ist ${enough ? 'mehr' : 'weniger'} als ${fmt(total)}.`;
  const answer: ChoiceAnswer = makeChoice(
    rng,
    { label: enough ? 'Ja' : 'Nein' },
    [{ label: enough ? 'Nein' : 'Ja', whyWrong: `Rechne alle 3 Preise zusammen. Vergleiche dann mit ${fmt(have)}.` }],
    { order: ['Ja', 'Nein'] },
  );
  return build(SKILL, stufe, {
    key: `reicht:${rows.map((r) => `${r.name}${r.price}`).join('-')}:${have}:${unit}:${who.name}`,
    ab,
    context,
    prompt,
    visual: priceTable(list),
    answer,
    hints: ['Rechne alle 3 Preise zusammen.', `Vergleiche dann mit ${fmt(have)}.`],
    steps: [line, compare, enough ? 'Das Geld reicht.' : 'Das Geld reicht nicht.'],
    praise: 'Du hast alle Preise gerechnet und verglichen.',
    srText: speak(`${context} Die Preise: ${rows.map((r) => `${r.name} ${fmt(r.price)}`).join(', ')}. ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** The list has three prices and their sum, with one price missing: backwards from the sum. */
function missingInList(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const list = basket(rng, ab);
  const { rows, total, fmt } = list;
  // Not a price that also stands in the list: the answer would be there already.
  const open = rows.flatMap((r, i) => (rows.filter((o) => o.price === r.price).length === 1 ? [i] : []));
  const at = open.length ? rng.pick(open) : 0;
  const gap = rows[at];
  const known = rows.filter((_, i) => i !== at);
  const context = `Alle Sachen kosten zusammen ${fmt(total)}.`;
  const prompt = `Wie viel kostet ${inSentence(gap.text)}?`;
  const known2 = known[0].price + known[1].price;
  return build(SKILL, stufe, {
    key: `liste-fehlt:${rows.map((r) => `${r.name}${r.price}`).join('-')}:${at}:${fmt(1).endsWith('ct') ? 'ct' : 'e'}`,
    ab,
    context,
    prompt,
    visual: priceTable(list, at),
    answer: { kind: 'number', value: gap.price, unit: fmt(1).endsWith('ct') ? 'ct' : '€', label: `Preis in ${fmt(1).endsWith('ct') ? 'Cent' : 'Euro'}` },
    hints: ['Rechne zuerst die anderen Preise aus der Liste zusammen.', `Wie viel fehlt dann noch bis ${fmt(total)}?`],
    steps: [`${fmt(known[0].price)} + ${fmt(known[1].price)} = ${fmt(known2)}`, `${fmt(total)} ${MINUS} ${fmt(known2)} = ${fmt(gap.price)}`, `${gap.text} kostet ${fmt(gap.price)}.`],
    bugs: bugList(gap.price, [['plus-minus-getauscht', total + known2, 'Der Preis ist weniger als alle Sachen zusammen. Rechne minus.']]),
    praise: 'Du hast den fehlenden Preis ausgerechnet.',
    srText: speak(`${context} Die Preise: ${rows.map((r, i) => `${r.name} ${i === at ? 'fehlt' : fmt(r.price)}`).join(', ')}. ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [addPrices], 2: [addPrices], 3: [missingPrice] },
  2: { 1: [changeNumber], 2: [changeNumber, changeNumber, changePicture], 3: [priceFromChange, priceFromChange, noteFromChange] },
  3: { 1: [centSum, centChange], 2: [centSum, centChange, enoughMoney], 3: [enoughMoney, enoughMoney, missingInList] },
};

export const einkaufenSkill: SkillDef = {
  ...SKILL,
  title: 'Einkaufen und Rückgeld',
  description: 'Du rechnest Preise zusammen und findest das Rückgeld.',
  stufen: {
    1: '2 Preise plus rechnen, bis 20 €',
    2: 'Rückgeld von 10 € oder 20 €',
    3: 'Cent-Preise; reicht das Geld für 3 Sachen?',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
