/**
 * Wie viel Geld? The Stufe chooses the content (docs/research.md §6, F15 'Mixed units only at Stufe 3'), the AB the demand inside it:
 * Stufe 1 only ct or only €, at most 20, sorted. AB 1 up to 10, AB 2 from 11 to 20, AB 3 the total is given and one piece is missing.
 * Stufe 2 one unit, at most 100, unsorted. AB 1 up to 60, AB 2 more pieces and up to 100, AB 3 the total is given and one piece is missing.
 * Stufe 3 Euro and Cent mixed: 3 € 40 ct. AB 1 a few pieces in tens and fives of Cent, AB 2 more pieces, also ones, AB 3 the Cent bundle to a Euro, or the total is given and Cent are missing.
 */
import { fmtMoney, MINUS, NBSP } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, multiBugs, pickPerson, speak, targetAb } from '../shared';
import { describeMoney, drawPieces, largestFirst, printedNumber, sum } from './helpers';

const SKILL = { id: 'groessen.geld-betrag', topicId: 'groessen' } as const;
const KMK = ['GM.geld'];

const COUNT_VALUE = 'Zähle nicht die Münzen und Scheine. Rechne die Zahlen darauf zusammen.';

/** One unit: the pieces are printed numbers, in Cent or Euro. */
function oneUnit(rng: Rng, stufe: Stufe, ab: Ab, items: number[], isSorted: boolean): Exercise {
  const euro = items[0] >= 100;
  const unit = euro ? '€' : 'ct';
  const printed = items.map(printedNumber);
  const total = sum(printed);
  const sorted = largestFirst(printed);
  const person = pickPerson(rng);
  const sentence = rng.chance(0.4);
  const prompt = sentence ? `Wie viel Geld hat ${person.name}?` : 'Wie viel Geld ist das?';
  return build(SKILL, stufe, {
    key: `eine-einheit:${unit}:${items.join('-')}:${sentence ? person.name : ''}`,
    ab,
    prompt,
    visual: { type: 'money', items },
    answer: sentence
      ? { kind: 'number', value: total, before: `${person.name} hat`, after: `${unit}.`, label: euro ? 'Betrag in Euro' : 'Betrag in Cent' }
      : { kind: 'number', value: total, unit, label: euro ? 'Betrag in Euro' : 'Betrag in Cent' },
    hints: [
      isSorted ? 'Beginne beim größten Wert. Rechne dann weiter.' : 'Sortiere zuerst: Große Werte kommen nach vorn.',
      `Rechne zuerst ${sorted[0]} + ${sorted[1]}.`,
    ],
    steps: [`${sorted.join(' + ')} = ${total}`, `Das sind ${total}${NBSP}${unit}.`],
    bugs: bugList(total, [['muenzen-anzahl', items.length, COUNT_VALUE]]),
    praise: isSorted ? 'Du hast alle Werte gerechnet.' : 'Du hast jeden Wert mitgerechnet.',
    srText: speak(`${prompt} ${describeMoney(items)}`),
    kmk: KMK,
  });
}

const unitScale = (rng: Rng) => (rng.chance(0.5) ? 100 : 1);

function sortedPieces(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const scale = unitScale(rng);
  const pool = [10, 5, 2, 1].map((v) => v * scale);
  const small = ab === 1;
  return oneUnit(rng, stufe, ab, largestFirst(drawPieces(rng, pool, small ? rng.int(2, 3) : rng.int(3, 4), (small ? 3 : 11) * scale, (small ? 10 : 20) * scale)), true);
}

/** Never in the order of the values: Stufe 2 is the unsorted content. */
function unsorted(rng: Rng, items: readonly number[]): number[] {
  const out = rng.shuffle(items);
  const sorted = largestFirst(out);
  if (new Set(out).size > 1 && out.every((v, i) => v === sorted[i])) out.reverse();
  return out;
}

function unsortedPieces(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const scale = unitScale(rng);
  const pool = [50, 20, 10, 5, 2, 1].map((v) => v * scale);
  const hard = ab > 1;
  return oneUnit(rng, stufe, ab, unsorted(rng, drawPieces(rng, pool, hard ? rng.int(5, 6) : rng.int(3, 4), (hard ? 41 : 21) * scale, (hard ? 100 : 60) * scale)), false);
}

/** The total is given and one piece is not in the picture: the child counts on from what is there. */
function missingPiece(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const scale = unitScale(rng);
  const unit = scale === 100 ? '€' : 'ct';
  const pool = (stufe === 1 ? [10, 5, 2, 1] : [50, 20, 10, 5, 2, 1]).map((v) => v * scale);
  const pieces = stufe === 1 ? drawPieces(rng, pool, 4, 11 * scale, 20 * scale) : drawPieces(rng, pool, rng.int(4, 5), 31 * scale, 100 * scale);
  const missing = rng.pick(pieces);
  const at = pieces.indexOf(missing);
  const rest = pieces.filter((_, i) => i !== at);
  const items = stufe === 1 ? largestFirst(rest) : unsorted(rng, rest);
  const printed = items.map(printedNumber);
  const have = sum(printed);
  const total = have + printedNumber(missing);
  const value = printedNumber(missing);
  const word = scale === 100 ? 'Euro' : 'Cent';
  const person = pickPerson(rng);
  const context = `${person.name} hat ${total}${NBSP}${unit}. Im Bild fehlt noch ein Stück.`;
  const prompt = `Wie viel ${word} fehlen im Bild?`;
  return build(SKILL, stufe, {
    key: `fehlt:${unit}:${items.join('-')}:${total}:${person.name}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items },
    answer: { kind: 'number', value, unit, label: `Betrag in ${word}` },
    hints: ['Rechne zuerst das Geld im Bild zusammen.', `Wie viel fehlt dann noch bis ${total}${NBSP}${unit}?`],
    steps: [`Im Bild: ${largestFirst(printed).join(' + ')} = ${have}`, `${total} ${MINUS} ${have} = ${value}`, `Es fehlt noch: ${value}${NBSP}${unit}.`],
    bugs: bugList(value, [['muenzen-anzahl', items.length, COUNT_VALUE]]),
    praise: 'Du hast vom Betrag aus weiter gerechnet.',
    srText: speak(`${context} ${prompt} ${describeMoney(items)}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** The total is given in Euro and Cent, one Cent piece is not in the picture. */
function missingCents(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const euroItems = drawPieces(rng, [500, 200, 100], rng.int(1, 2), 100, 1000);
  const centItems = drawPieces(rng, [50, 20, 10, 5], 3, 15, 99);
  // Neither the Euro of 10 € 65 ct: the answer would stand in the task.
  const open = centItems.filter((c) => c !== sum(euroItems) / 100);
  const value = rng.pick(open.length ? open : centItems);
  const at = centItems.indexOf(value);
  const restCents = centItems.filter((_, i) => i !== at);
  const items = rng.shuffle([...euroItems, ...restCents]);
  const have = sum(items);
  const total = have + value;
  const person = pickPerson(rng);
  const context = `${person.name} hat ${fmtMoney(total)}. Im Bild fehlt noch eine Münze.`;
  const prompt = 'Wie viel Cent fehlen im Bild?';
  return build(SKILL, stufe, {
    key: `fehlt-gemischt:${items.join('-')}:${total}:${person.name}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items },
    answer: { kind: 'number', value, unit: 'ct', label: 'Betrag in Cent' },
    hints: ['Der Euro-Teil stimmt schon. Schau nur auf die Cent.', 'Rechne die Cent im Bild zusammen.'],
    steps: [`Im Bild: ${fmtMoney(have)}`, `Cent: ${total % 100} ${MINUS} ${sum(restCents)} = ${value}`, `Es fehlt noch: ${value}${NBSP}ct.`],
    bugs: bugList(value, [['muenzen-anzahl', items.length, COUNT_VALUE]]),
    praise: 'Du hast Euro und Cent getrennt gedacht.',
    srText: speak(`${context} ${prompt} ${describeMoney(items)}`),
    kmk: [...KMK, 'GM.einheiten', 'PK.problemloesen'],
  });
}

/** Euro and Cent mixed. */
function mixed(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const euroItems = ab === 1 ? drawPieces(rng, [500, 200, 100], rng.int(1, 2), 100, 1000) : drawPieces(rng, [1000, 500, 200, 100], rng.int(1, 2), 100, 2000);
  // AB 3: the Cent reach a Euro and bundle.
  const centItems = ab === 1 ? drawPieces(rng, [50, 20, 10, 5], rng.int(2, 3), 15, 90) : ab === 2 ? drawPieces(rng, [50, 20, 10, 5, 2, 1], rng.int(3, 4), 1, 99) : drawPieces(rng, [50, 20, 10, 5], rng.int(3, 4), 105, 170);
  const items = rng.shuffle([...euroItems, ...centItems]);
  const euroSum = sum(euroItems) / 100;
  const centSum = sum(centItems);
  const total = euroSum * 100 + centSum;
  const e = Math.floor(total / 100);
  const c = total % 100;
  const person = pickPerson(rng);
  const sentence = rng.chance(0.4);
  const fields: MultiField[] = [
    { id: 'e', value: e, ...(sentence ? { before: `${person.name} hat` } : {}), after: '€', label: 'Euro' },
    { id: 'c', value: c, after: sentence ? 'ct.' : 'ct', label: 'Cent' },
  ];
  const printedAll = sum(items.map(printedNumber));
  const prompt = sentence ? `Wie viel Geld hat ${person.name}?` : 'Wie viel Geld ist das?';
  const euroLine = largestFirst(euroItems).map(printedNumber);
  const centLine = largestFirst(centItems);
  const steps = [
    euroLine.length > 1 ? `Euro: ${euroLine.join(' + ')} = ${euroSum}` : `Euro: ${euroSum}`,
    centLine.length > 1 ? `Cent: ${centLine.join(' + ')} = ${centSum}` : `Cent: ${centSum}`,
    ...(centSum >= 100 ? [`${centSum}${NBSP}ct = ${fmtMoney(centSum)}`] : []),
    `Zusammen: ${fmtMoney(total)}`,
  ];
  return build(SKILL, stufe, {
    key: `gemischt:${items.join('-')}:${sentence ? person.name : ''}`,
    ab,
    prompt,
    visual: { type: 'money', items },
    answer: { kind: 'multi', fields },
    hints: ['Zähle Euro und Cent getrennt: erst Euro, dann Cent.', ...(centSum >= 100 ? ['100 Cent sind 1 Euro. Bündle die Cent.'] : ['Rechne zuerst alle Euro zusammen.'])],
    steps,
    bugs: multiBugs(
      [
        { id: 'einheiten-gemischt', match: { e: printedAll, c: 0 }, hint: 'Zähle Euro und Cent getrennt: erst Euro, dann Cent.' },
        { id: 'muenzen-anzahl', match: { e: euroItems.length, c: centItems.length }, hint: COUNT_VALUE },
        centSum >= 100 && { id: 'cent-euro-vergleich', match: { e: euroSum, c: centSum }, hint: '100 Cent sind 1 Euro. Bündle die Cent.' },
      ],
      fields,
    ),
    praise: centSum >= 100 ? 'Du hast die Cent zu einem Euro gebündelt.' : 'Du hast Euro und Cent getrennt gezählt.',
    srText: speak(`${prompt} ${describeMoney(items)}`),
    kmk: [...KMK, 'GM.einheiten'],
  });
}

export const geldBetragSkill: SkillDef = {
  ...SKILL,
  title: 'Wie viel Geld?',
  description: 'Du zählst den Wert von Münzen und Scheinen.',
  stufen: {
    1: 'Nur Cent oder nur Euro, bis 20',
    2: 'Eine Einheit bis 100, nicht sortiert',
    3: 'Euro und Cent gemischt',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 3) return ab === 3 && rng.chance(0.4) ? missingCents(rng, stufe, ab) : mixed(rng, stufe, ab);
    if (ab === 3) return missingPiece(rng, stufe, ab);
    return stufe === 1 ? sortedPieces(rng, stufe, ab) : unsortedPieces(rng, stufe, ab);
  },
};
