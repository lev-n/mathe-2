/**
 * Geld wechseln: the same amount with other coins. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1, an amount as two coins: AB I two equal coins, and how much they are; AB II two different coins; AB III the coin that is missing,
 * which two coins are worth most.
 * Stufe 2, fewest coins or notes for up to 20 €: AB I up to 10 € or round Cent; AB II up to 20 € or any Cent, how many of each; AB III can it be done with
 * fewer, how many pieces.
 * Stufe 3, all ways for a small amount: AB I two kinds of coins, up to 4 ways; AB II three kinds, up to 6 ways, the way that does not fit;
 * AB III which way has n coins, with which coins are there more ways.
 * Amounts like 1 € 50 ct do not appear below Stufe 3, also in the feedback (F15).
 */
import { fmtMoney, NBSP } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, joinDe, makeChoice, multiBugs, pickPerson, plural, speak, targetAb } from '../shared';
import { COINS, describeMoney, fewestPieces, isMixedAmount, pictureChoice, plusLine, sum, waysToLay } from './helpers';

const SKILL = { id: 'groessen.geld-wechseln', topicId: 'groessen' } as const;
const KMK = ['GM.geld'];

/** Two equal coins: total → coin. */
const EQUAL_PAIRS: readonly [total: number, coin: number][] = [[2, 1], [10, 5], [20, 10], [100, 50], [200, 100]];
/** Two different coins: total → coins. */
const TWO_COINS: readonly [total: number, a: number, b: number][] = [
  [3, 2, 1], [6, 5, 1], [7, 5, 2], [11, 10, 1], [12, 10, 2], [15, 10, 5], [22, 20, 2], [25, 20, 5], [30, 20, 10], [52, 50, 2], [55, 50, 5], [60, 50, 10], [70, 50, 20], [300, 200, 100],
];

function pairLabel(a: number, b: number): string {
  return `${fmtMoney(a)} und ${fmtMoney(b)}`;
}

/** Pairs of coins with a total near `total`, as wrong options. */
function nearPairs(rng: Rng, total: number, equalOnly: boolean): { label: string; whyWrong: string }[] {
  const out: { a: number; b: number; s: number }[] = [];
  for (const a of COINS) {
    for (const b of COINS) {
      if (b > a || a + b === total || (equalOnly && a !== b) || isMixedAmount(a + b)) continue;
      out.push({ a, b, s: a + b });
    }
  }
  out.sort((x, y) => Math.abs(x.s - total) - Math.abs(y.s - total));
  return rng.shuffle(out.slice(0, 6)).map(({ a, b, s }) => ({ label: pairLabel(a, b), whyWrong: `Diese Münzen sind zusammen ${fmtMoney(s)}.` }));
}

function equalCoins(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [total, coin] = rng.pick(EQUAL_PAIRS);
  const prompt = `Welche 2 gleichen Münzen sind zusammen ${fmtMoney(total)}?`;
  return build(SKILL, stufe, {
    key: `gleich:${total}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: pairLabel(coin, coin) }, nearPairs(rng, total, true)),
    hints: ['2 gleiche Münzen: Jede ist die Hälfte.', total >= 100 ? '1 € sind 100 ct.' : 'Rechne jede Antwort nach.'],
    steps: [`${fmtMoney(coin)} + ${fmtMoney(coin)} = ${fmtMoney(total)}`, `Die Münzen sind ${pairLabel(coin, coin)}.`],
    praise: 'Du hast den Betrag gerecht geteilt.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

function twoCoins(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [total, a, b] = rng.pick(TWO_COINS);
  const prompt = `Welche 2 Münzen sind zusammen ${fmtMoney(total)}?`;
  return build(SKILL, stufe, {
    key: `zwei:${total}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: pairLabel(a, b) }, nearPairs(rng, total, false)),
    hints: ['Nimm zuerst die größte passende Münze.', 'Wie viel fehlt dann noch?'],
    steps: [`${fmtMoney(a)} + ${fmtMoney(b)} = ${fmtMoney(total)}`, `Die Münzen sind ${pairLabel(a, b)}.`],
    praise: 'Du hast 2 passende Münzen gefunden.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** AB I on Stufe 1, the other way round: how much are two equal coins? */
function doubleCoin(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const coin = rng.pick([1, 2, 5, 10, 20, 50, 100]);
  const total = 2 * coin;
  const prompt = `Wie viel Geld sind 2 Münzen zu ${fmtMoney(coin)}?`;
  const wrongs = [{ v: coin, why: 'Das ist erst 1 Münze.' }, { v: 3 * coin, why: 'Das sind 3 Münzen.' }, { v: 4 * coin, why: 'Das sind 4 Münzen.' }]
    .filter((o) => !isMixedAmount(o.v))
    .map((o) => ({ label: fmtMoney(o.v), whyWrong: o.why }));
  return build(SKILL, stufe, {
    key: `doppelt:${coin}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fmtMoney(total) }, wrongs),
    hints: ['Rechne die Münze 2-mal.', 'Rechne jede Antwort nach.'],
    steps: [`${fmtMoney(coin)} + ${fmtMoney(coin)} = ${fmtMoney(total)}`, `Zusammen: ${fmtMoney(total)}.`],
    praise: 'Du hast die Münze 2-mal gerechnet.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** AB III on Stufe 1, a gap: which coin is missing? */
function missingCoin(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const tasks: [number, number, number][] = [...TWO_COINS.flatMap(([t, a, b]): [number, number, number][] => [[t, a, b], [t, b, a]]), ...EQUAL_PAIRS.map(([t, c]): [number, number, number] => [t, c, c])];
  const [total, have, right] = rng.pick(tasks);
  const wrongs = COINS.filter((c) => c !== right && !isMixedAmount(have + c)).sort((x, y) => Math.abs(x - right) - Math.abs(y - right)).slice(0, 3);
  const context = `Du hast ${fmtMoney(have)}.`;
  const prompt = `Welche Münze fehlt bis ${fmtMoney(total)}?`;
  return build(SKILL, stufe, {
    key: `fehlt:${total}:${have}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: fmtMoney(right) }, wrongs.map((c) => ({ label: fmtMoney(c), whyWrong: `Dann sind es zusammen ${fmtMoney(have + c)}.` }))),
    hints: ['Wie viel fehlt noch?', 'Rechne jede Antwort nach.'],
    steps: [`${fmtMoney(have)} + ${fmtMoney(right)} = ${fmtMoney(total)}`, `Es fehlt ${fmtMoney(right)}.`],
    praise: 'Du hast den fehlenden Betrag gefunden.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** AB III on Stufe 1: which two coins are worth most? The feedback gives the sum of the picked pair. */
function mostWorth(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  for (;;) {
    const pairs = Array.from({ length: 3 }, () => rng.sample(COINS, 2).sort((x, y) => y - x));
    const sums = pairs.map(([a, b]) => a + b);
    if (new Set(sums).size < 3 || sums.some(isMixedAmount)) continue;
    const best = sums.indexOf(Math.max(...sums));
    const prompt = 'Welche 2 Münzen sind zusammen am meisten?';
    return build(SKILL, stufe, {
      key: `meiste:${pairs.map((p) => p.join('+')).sort().join('-')}`,
      ab,
      prompt,
      answer: makeChoice(rng, { label: pairLabel(pairs[best][0], pairs[best][1]) }, pairs.flatMap(([a, b], i) => (i === best ? [] : [{ label: pairLabel(a, b), whyWrong: `Diese Münzen sind zusammen ${fmtMoney(sums[i])}.` }]))),
      hints: ['Rechne jedes Paar einzeln zusammen.', 'Vergleiche dann die Beträge.'],
      steps: [`${fmtMoney(pairs[best][0])} + ${fmtMoney(pairs[best][1])} = ${fmtMoney(sums[best])}`, 'Das ist am meisten.'],
      praise: 'Du hast jedes Paar genau gerechnet.',
      srText: speak(prompt),
      kmk: KMK,
    });
  }
}

/** Choose the way with the fewest pieces. AB I up to 10 €, AB II up to 20 € or in Cent. */
function fewestChoice(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const inCent = rng.chance(0.3);
  const pieces = inCent ? [50, 20, 10, 5, 2, 1] : [2000, 1000, 500, 200, 100];
  const total = ab === 1 ? (inCent ? rng.int(3, 9) * 10 : rng.int(4, 10) * 100) : inCent ? rng.int(6, 19) * 5 : rng.int(11, 20) * 100;
  const best = fewestPieces(total, pieces);
  const longer = rng.shuffle(waysToLay(total, pieces, 5).filter((w) => w.length > best.length));
  const label = plusLine(best);
  const prompt = `Lege ${fmtMoney(total)} mit möglichst wenigen Stücken.`;
  return build(SKILL, stufe, {
    key: `wenigste:${total}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label }, longer.map((w) => ({ label: plusLine(w), whyWrong: 'Das geht mit weniger Stücken. Nimm zuerst den größten Wert.' }))),
    hints: ['Nimm zuerst den größten passenden Wert.', 'Wie viel fehlt dann noch? Nimm wieder den größten Wert.'],
    steps: [`Die wenigsten Stücke: ${label}`, `Das ${plural(best.length, 'ist', 'sind')} ${best.length} ${plural(best.length, 'Stück', 'Stücke')}.`],
    praise: 'Du hast zuerst an den größten Wert gedacht.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** How many of each piece, for the fewest pieces? */
function fewestFields(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const total = rng.pick([7, 9, 10, 12, 14, 15, 17, 19]);
  const tens = Math.floor(total / 10);
  const fives = Math.floor((total % 10) / 5);
  const twos = (total % 5) / 2;
  const fields: MultiField[] = [
    { id: 'z', value: tens, before: `10${NBSP}€:`, after: 'Stück', label: 'Scheine zu 10 Euro' },
    { id: 'f', value: fives, before: `5${NBSP}€:`, after: 'Stück', label: 'Scheine zu 5 Euro' },
    { id: 'w', value: twos, before: `2${NBSP}€:`, after: 'Stück', label: 'Münzen zu 2 Euro' },
  ];
  const prompt = `Lege ${total}${NBSP}€ mit möglichst wenigen Stücken.`;
  const parts = [...Array<number>(tens).fill(1000), ...Array<number>(fives).fill(500), ...Array<number>(twos).fill(200)];
  return build(SKILL, stufe, {
    key: `felder:${total}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Nimm zuerst den größten passenden Schein.', 'Wie viel fehlt dann noch?'],
    steps: [`${plusLine(parts)} = ${fmtMoney(total * 100)}`, `Also ${[[tens, 10], [fives, 5], [twos, 2]].filter(([n]) => n > 0).map(([n, v]) => `${n}-mal ${v}${NBSP}€`).join(', ')}.`],
    bugs: multiBugs(
      [{ id: 'nicht-wenigste', match: { z: 0, f: Math.floor(total / 5), w: twos }, hint: 'Nimm zuerst den größten passenden Schein.' }],
      fields,
    ),
    praise: 'Du hast zuerst an den größten Schein gedacht.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

const NOTES_AND_EURO = [2000, 1000, 500, 200, 100];

/** Stufe 2, AB III: a way is shown. Can it be done with fewer pieces? */
function withFewer(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const total = rng.int(4, 20) * 100;
  const best = fewestPieces(total, NOTES_AND_EURO);
  const longer = waysToLay(total, NOTES_AND_EURO, 6).filter((w) => w.length > best.length);
  const fewer = longer.length > 0 && rng.chance(0.6);
  const way = fewer ? rng.pick(longer) : best;
  const { name } = pickPerson(rng);
  const context = `${name} legt ${fmtMoney(total)} so.`;
  const prompt = 'Geht es mit weniger Stücken?';
  const visual = { type: 'money' as const, items: way };
  return build(SKILL, stufe, {
    key: `weniger:${total}:${way.join('-')}`,
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: fewer ? 'Ja' : 'Nein' }, [{ label: fewer ? 'Nein' : 'Ja', whyWrong: 'Nimm zuerst den größten passenden Wert. Vergleiche dann.' }], { order: ['Ja', 'Nein'] }),
    hints: ['Nimm zuerst den größten passenden Wert.', 'Wie viel fehlt dann noch? Vergleiche die Stücke.'],
    steps: [`Die wenigsten Stücke: ${plusLine(best)}`, `Im Bild ${plural(way.length, 'ist', 'sind')} ${way.length} ${plural(way.length, 'Stück', 'Stücke')}.`, fewer ? 'Ja, es geht mit weniger Stücken.' : 'Nein, weniger Stücke gehen nicht.'],
    praise: 'Du hast die Stücke genau verglichen.',
    srText: speak(`${context} ${describeMoney(way)} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 2, AB III: how many pieces at least? */
function howManyPieces(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const totals = [4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((e) => e * 100);
  const total = rng.pick(totals);
  const best = fewestPieces(total, NOTES_AND_EURO);
  const n = best.length;
  const context = `Du legst ${fmtMoney(total)} mit möglichst wenigen Stücken.`;
  const prompt = 'Wie viele Stücke brauchst du?';
  return build(SKILL, stufe, {
    key: `stuecke:${total}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: n, unit: 'Stücke', label: 'Anzahl der Stücke' },
    hints: ['Nimm zuerst den größten passenden Wert.', 'Wie viel fehlt dann noch? Nimm wieder den größten Wert.'],
    steps: [`${plusLine(best)} = ${fmtMoney(total)}`, `Das sind ${n} Stücke.`],
    bugs: bugList(n, [['nicht-wenigste', fewestPieces(total, [500, 200, 100]).length, 'Nimm zuerst den größten passenden Wert. Das spart Stücke.']]),
    praise: 'Du hast zuerst an den größten Wert gedacht.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Amount and coins for "how many ways?", with the number of ways computed by waysToLay. */
const WAY_TASKS: readonly [amount: number, coins: number[]][] = [
  [3, [2, 1]], [4, [2, 1]], [5, [2, 1]], [6, [2, 1]], [7, [2, 1]], [8, [2, 1]],
  [20, [10, 5]], [30, [10, 5]], [40, [20, 10]], [50, [20, 10]], [60, [20, 10]],
  [5, [5, 2, 1]], [6, [5, 2, 1]], [7, [5, 2, 1]],
];
/** The most ways of a task, per AB. */
const MAX_WAYS: Record<Ab, number> = { 1: 4, 2: 6, 3: 6 };

/** One way in short form: '2-mal 2 ct + 1 ct'. */
function wayText(way: number[]): string {
  const counts = new Map<number, number>();
  way.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
  return [...counts.entries()].map(([c, n]) => (n === 1 ? fmtMoney(c) : `${n}-mal ${fmtMoney(c)}`)).join(' + ');
}

function countWays(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const tasks = WAY_TASKS.filter(([amount, coins]) => waysToLay(amount, coins, 8).length <= MAX_WAYS[ab] && (ab === 1 ? coins.length === 2 : true));
  const [amount, coins] = rng.pick(tasks);
  const ways = waysToLay(amount, coins, 8);
  const n = ways.length;
  const fields: MultiField[] = [{ id: 'wege', value: n, after: 'Wege', label: 'Anzahl der Wege' }];
  const prompt = 'Wie viele Wege gibt es?';
  const context = `Lege ${fmtMoney(amount)} nur mit diesen Münzen. Du darfst jede Münze oft nehmen.`;
  const steps = ways.map((w, i) => `Weg ${i + 1}: ${wayText(w)}`);
  steps[steps.length - 1] += `. Also ${n} Wege.`;
  return build(SKILL, stufe, {
    key: `wege:${amount}:${coins.join('-')}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: coins },
    answer: { kind: 'multi', fields },
    hints: ['Beginne mit der größten Münze. Nimm dann immer kleinere.', 'Schreibe jeden Weg auf. So fehlt keiner.'],
    steps,
    praise: 'Du hast geordnet nach allen Wegen gesucht.',
    srText: speak(`${context} ${describeMoney(coins)} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
    knobel: true,
  });
}

/** Three ways give the amount, one does not. */
function oddWay(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const total = rng.pick([20, 30, 40, 50]);
  const pieces = COINS.filter((c) => c < total && c >= (total >= 50 ? 5 : 1));
  const right = rng.sample(waysToLay(total, pieces, 4), 3);
  const base = rng.pick(right);
  // the odd one: one coin of a right way swapped for a smaller coin
  const i = base.findIndex((c) => pieces.some((p) => p < c));
  const swapped = base.map((c, at) => (at === i ? Math.max(...pieces.filter((p) => p < c)) : c));
  const prompt = `Welche Münzen sind nicht ${fmtMoney(total)}?`;
  const { answer, rightLabel } = pictureChoice(
    rng,
    { type: 'money', items: swapped },
    right.map((items) => ({ visual: { type: 'money' as const, items }, whyWrong: `Diese Münzen sind zusammen genau ${fmtMoney(total)}.` })),
  );
  return build(SKILL, stufe, {
    key: `passt-nicht:${total}:${swapped.join('-')}`,
    ab,
    prompt,
    answer,
    hints: ['Rechne jedes Bild einzeln aus.', 'Rechne immer von der größten Münze aus.'],
    steps: [`Bild ${rightLabel}: ${plusLine(swapped)} = ${fmtMoney(sum(swapped))}`, `Diese Münzen sind nur ${fmtMoney(sum(swapped))}.`],
    praise: 'Du hast jeden Weg genau geprüft.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: which way has exactly n coins? */
function wayWithCount(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  for (;;) {
    const [amount, coins] = rng.pick(WAY_TASKS);
    const ways = waysToLay(amount, coins, 8);
    const sizes = [...new Set(ways.map((w) => w.length))].filter((x) => x > 1);
    if (sizes.length < 2) continue;
    const n = rng.pick(sizes);
    const right = rng.pick(ways.filter((w) => w.length === n));
    const others = ways.filter((w) => w.length !== n);
    const wrong = rng.sample(others, Math.min(2, others.length));
    const prompt = `Welcher Weg für ${fmtMoney(amount)} hat genau ${n} Münzen?`;
    return build(SKILL, stufe, {
      key: `genau:${amount}:${coins.join('-')}:${n}`,
      ab,
      prompt,
      answer: makeChoice(rng, { label: wayText(right) }, wrong.map((w) => ({ label: wayText(w), whyWrong: w.length === 1 ? 'Das ist nur 1 Münze.' : `Das sind ${w.length} Münzen.` }))),
      hints: ['Rechne bei jedem Weg die Münzen zusammen.', '2-mal heißt: 2 Münzen.'],
      steps: [`Der Weg: ${wayText(right)}.`, `Das sind ${n} Münzen.`],
      praise: 'Du hast bei jedem Weg die Münzen gezählt.',
      srText: speak(prompt),
      kmk: [...KMK, 'PK.problemloesen'],
      knobel: true,
    });
  }
}

const COIN_SETS: readonly [amount: number, a: number[], b: number[]][] = [
  [5, [2, 1], [5, 2, 1]], [6, [2, 1], [5, 2, 1]], [7, [2, 1], [5, 2, 1]], [4, [2, 1], [5, 2, 1]], [20, [10, 5], [20, 10]], [40, [20, 10], [10, 5]], [60, [20, 10], [10, 5]], [30, [10, 5], [20, 10]],
];

/** Stufe 3, AB III: with which coins are there more ways? */
function moreWays(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [amount, setA, setB] = rng.pick(COIN_SETS);
  const [a, b] = rng.chance(0.5) ? [setA, setB] : [setB, setA];
  const [na, nb] = [waysToLay(amount, a, 12).length, waysToLay(amount, b, 12).length];
  const label = (c: number[]) => `Mit ${joinDe(c.map((x) => fmtMoney(x)))}`;
  const same = 'Mit beiden gleich viele';
  const right = na === nb ? same : na > nb ? label(a) : label(b);
  const context = `Du legst ${fmtMoney(amount)}.`;
  const prompt = 'Mit welchen Münzen gibt es mehr Wege?';
  const options = [label(a), label(b), same];
  return build(SKILL, stufe, {
    key: `mehr-wege:${amount}:${a.join('-')}:${b.join('-')}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, options.filter((o) => o !== right).map((o) => ({ label: o, whyWrong: 'Schreibe bei beiden Münzen alle Wege auf. Vergleiche dann.' })), { order: options }),
    hints: ['Schreibe bei beiden Münzen alle Wege auf.', 'Beginne immer mit der größten Münze.'],
    steps: [`${label(a)}: ${na} ${plural(na, 'Weg', 'Wege')}.`, `${label(b)}: ${nb} ${plural(nb, 'Weg', 'Wege')}.`, na === nb ? 'Beide haben gleich viele Wege.' : `Mehr Wege: ${right}.`],
    praise: 'Du hast geordnet nach allen Wegen gesucht.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
    knobel: true,
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, Form[]>> = {
  1: { 1: [equalCoins, doubleCoin], 2: [twoCoins], 3: [missingCoin, mostWorth] },
  2: { 1: [fewestChoice], 2: [fewestChoice, fewestFields], 3: [withFewer, howManyPieces] },
  3: { 1: [countWays], 2: [countWays, oddWay], 3: [wayWithCount, moreWays] },
};

export const geldWechselnSkill: SkillDef = {
  ...SKILL,
  title: 'Geld wechseln',
  description: 'Du legst denselben Betrag mit anderen Münzen.',
  stufen: {
    1: 'Einen Betrag mit 2 Münzen legen',
    2: 'Möglichst wenige Münzen und Scheine bis 20 €',
    3: 'Alle Wege für einen kleinen Betrag finden',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
