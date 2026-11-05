/**
 * Münzen und Scheine: know the money, order it by value. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1 coins from 1 ct to 2 €. AB 1 name a coin, the extreme of 3, order 3. AB 2 the extreme of 4, order 4. AB 3 a coin that does not exist, a gap in the row, between two coins.
 * Stufe 2 notes from 5 € to 100 €, coins and notes mixed. AB 1 coin or note, order 4 notes. AB 2 order coins and notes together, the extreme of a mix. AB 3 a note that does not exist, a gap in the row, between two pieces.
 * Stufe 3 more coins, more money? AB 1 two collections in one unit, no total like 1 € 50 ct (F15). AB 2 Euro and Cent together. AB 3 three children, and the coin that makes two amounts equal.
 */
import { fmtMoney } from '../../core/format';
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import type { Ab, Bug, ChoiceOption, Exercise, OrderAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, pickTwo, PEOPLE, speak, targetAb } from '../shared';
import { COINS, NOTES, describeMoney, drawPieces, isMixedAmount, labelledOrder, largestFirst, pictureChoice, plusLine, printedNumber, sum, waysToLay } from './helpers';

const SKILL = { id: 'groessen.geld-kennen', topicId: 'groessen' } as const;
const KMK = ['GM.geld'];

const HUNDRED = '100 Cent sind 1 Euro.';
const COUNT_VALUE = 'Zähle nicht die Münzen. Rechne die Zahlen darauf zusammen.';
const COMPARE_BOTH = 'Rechne beide Beträge aus. Vergleiche dann die Werte.';
/** No sign in this sentence: read aloud, 'Das Zeichen € heißt Euro' turns into 'Das Zeichen Euro heißt Euro' (T16). */
const SIGN_TELLS = 'Das Zeichen neben der Zahl sagt: Euro oder Cent.';

const word = (c: number) => (c >= 100 ? `${c / 100} Euro` : `${c} Cent`);

/** The order a child gets who compares only the printed numbers: 2 €, 5 ct, 50 ct. Empty when this is the right order or not clear. */
function printedOrderBug(shown: number[], answer: OrderAnswer): Bug[] {
  const printed = shown.map(printedNumber);
  if (new Set(printed).size < printed.length) return [];
  const sign = answer.direction === 'aufsteigend' ? 1 : -1;
  const match = shown.map((_, i) => i).sort((a, b) => sign * (printed[a] - printed[b]));
  return match.every((v, i) => v === answer.correct[i]) ? [] : [{ id: 'cent-euro-vergleich', match, hint: HUNDRED }];
}

/** Coin names: the sign decides between Cent and Euro. */
function nameCoin(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const coin = rng.pick(COINS);
  const printed = printedNumber(coin);
  const otherUnit = coin >= 100 ? `${printed} Cent` : `${printed} Euro`;
  const others = rng.sample(COINS.filter((c) => printedNumber(c) !== printed), 2).map((c) => ({ label: word(c), whyWrong: 'Schau genau auf die Zahl auf der Münze.' }));
  return build(SKILL, stufe, {
    key: `name:${coin}`,
    ab,
    prompt: 'Wie heißt diese Münze?',
    visual: { type: 'money', items: [coin] },
    answer: makeChoice(rng, { label: word(coin) }, [{ label: otherUnit, whyWrong: SIGN_TELLS }, ...others]),
    hints: ['Schau auf die Zahl und auf das Zeichen.', SIGN_TELLS],
    steps: [`Auf der Münze steht ${fmtMoney(coin)}.`, `Die Münze heißt ${word(coin)}.`],
    praise: 'Du hast auf Zahl und Zeichen geschaut.',
    srText: speak(`Wie heißt diese Münze? ${describeMoney([coin])}`),
    kmk: KMK,
  });
}

function orderTask(rng: Rng, stufe: Stufe, ab: Ab, kind: string, values: number[], what: string): Exercise {
  const bothUnits = new Set(values.map((v) => v >= 100)).size === 2;
  const direction: OrderAnswer['direction'] = rng.chance(0.7) ? 'aufsteigend' : 'absteigend';
  const { answer, shown } = labelledOrder(rng, values, (v) => fmtMoney(v), direction);
  const sorted = answer.correct.map((i) => shown[i]);
  const start = direction === 'aufsteigend' ? 'kleinsten' : 'größten';
  const prompt = `Ordne ${what}. Beginne mit dem ${start} Wert.`;
  return build(SKILL, stufe, {
    key: `${kind}:${direction}:${shown.join('-')}`,
    ab,
    prompt,
    visual: { type: 'money', items: shown },
    answer,
    hints: bothUnits ? ['Schau auf ct und €. Cent sind weniger wert als Euro.', HUNDRED] : ['Schau auf die Zahl auf jedem Stück.', 'Suche zuerst den Wert für den Anfang.'],
    steps: [...(bothUnits ? [HUNDRED] : []), `Geordnet: ${sorted.map((v) => fmtMoney(v)).join(direction === 'aufsteigend' ? ' < ' : ' > ')}`],
    bugs: printedOrderBug(shown, answer),
    praise: bothUnits ? 'Du hast Cent und Euro richtig verglichen.' : 'Du hast die Werte der Reihe nach geordnet.',
    srText: speak(`${prompt} ${describeMoney(shown)}`),
    kmk: KMK,
  });
}

function orderCoins(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // at least one coin of each unit, so that the sign matters
  const euro = rng.pick(COINS.filter((c) => c >= 100));
  const cent = rng.sample(COINS.filter((c) => c < 100), (ab === 1 ? 3 : 4) - 1);
  return orderTask(rng, stufe, ab, 'muenzen', [euro, ...cent], 'die Münzen');
}

/** Which piece is worth the most or the least? */
function extreme(rng: Rng, stufe: Stufe, ab: Ab, pieces: readonly number[], what: 'Welche Münze' | 'Was'): Exercise {
  const coins = [...pieces];
  const most = rng.chance(0.6);
  const right = most ? Math.max(...coins) : Math.min(...coins);
  const prompt = `${what} ist am ${most ? 'meisten' : 'wenigsten'} wert?`;
  // Cent and Euro are a question only when both stand among the options.
  const bothUnits = new Set(coins.map((c) => c >= 100)).size === 2;
  const wrongs: ChoiceOption[] = coins
    .filter((c) => c !== right)
    .map((c) => ({ label: fmtMoney(c), whyWrong: right >= 100 !== c >= 100 ? HUNDRED : bothUnits ? 'Schau auf die Zahl und auf das Zeichen.' : 'Schau genau auf die Zahlen.' }));
  const result = `${fmtMoney(right)} ist am ${most ? 'meisten' : 'wenigsten'} wert.`;
  return build(SKILL, stufe, {
    key: `extrem:${most ? 'max' : 'min'}:${[...coins].sort((a, b) => a - b).join('-')}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fmtMoney(right) }, wrongs, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: bothUnits ? ['Schau zuerst auf das Zeichen: Euro oder Cent?', HUNDRED] : ['Alle Werte haben dasselbe Zeichen.', `Such die ${most ? 'größte' : 'kleinste'} Zahl.`],
    steps: bothUnits ? [HUNDRED, result] : [result],
    praise: 'Du hast auf den Wert geachtet.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

const extremeCoin = (count: number) => (rng: Rng, stufe: Stufe, ab: Ab) => extreme(rng, stufe, ab, rng.sample(COINS, count), 'Welche Münze');

/** At least one coin and one note: the number alone does not decide. */
function extremeMixed(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const notes = rng.sample(NOTES, rng.int(1, 2));
  return extreme(rng, stufe, ab, [...notes, ...rng.sample(COINS, 4 - notes.length)], 'Was');
}

function orderNotes(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  return orderTask(rng, stufe, ab, 'scheine', rng.sample(NOTES, 4), 'die Scheine');
}

function orderMixed(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const notes = rng.sample(NOTES, 2);
  const coins = rng.sample(COINS, rng.int(2, 3));
  return orderTask(rng, stufe, ab, 'gemischt', [...notes, ...coins], 'das Geld');
}

/** Which note or coin does not exist? */
function doesNotExist(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const notes = stufe === 2;
  const fake = rng.pick(notes ? ['3 €', '15 €', '25 €', '30 €', '40 €', '60 €'] : ['3 ct', '4 ct', '25 ct', '30 ct', '3 €', '5 €']);
  const real = rng.sample(notes ? NOTES : COINS, MAX_CHOICE_OPTIONS[stufe] - 1);
  const prompt = notes ? 'Welchen Schein gibt es nicht?' : 'Welche Münze gibt es nicht?';
  const thing = notes ? 'Diesen Schein gibt es wirklich.' : 'Diese Münze gibt es wirklich.';
  return build(SKILL, stufe, {
    key: `gibt-es-nicht:${fake}:${[...real].sort((a, b) => a - b).join('-')}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fake }, real.map((c) => ({ label: fmtMoney(c), whyWrong: thing })), { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: [notes ? 'Der kleinste Schein ist 5 €.' : 'Die kleinste Münze ist 1 ct. Die größte Münze ist 2 €.', notes ? 'Denk an die Scheine in einer Geldbörse.' : 'Denk an die Münzen in einer Geldbörse.'],
    steps: notes
      ? ['Bis 100 € gibt es Scheine zu 5, 10, 20, 50 und 100 €.', `${fake} gibt es nicht als Schein.`]
      : ['Cent-Münzen gibt es zu 1, 2, 5, 10, 20 und 50 ct.', 'Euro-Münzen gibt es zu 1 € und 2 €.', `${fake} gibt es nicht als Münze.`],
    praise: notes ? 'Du kennst die Scheine genau.' : 'Du kennst die Münzen genau.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

function coinOrNote(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const piece = rng.pick([50, 100, 200, 500, 1000, 2000, 5000, 10000]);
  const note = piece >= 500;
  const prompt = `Ist ${fmtMoney(piece)} eine Münze oder ein Schein?`;
  const rule = '2 € ist die größte Münze. Ab 5 € gibt es Scheine.';
  // On 2 € and on 5 € the rule states the answer itself: there the hints speak of the money in the hand.
  const edge = piece === 200 || piece === 500;
  const inHand = 'Stell dir das Geld in deiner Hand vor.';
  const material = 'Münzen sind aus Metall. Scheine sind aus Papier.';
  return build(SKILL, stufe, {
    key: `muenze-schein:${piece}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: note ? 'Schein' : 'Münze' }, [{ label: note ? 'Münze' : 'Schein', whyWrong: edge ? material : rule }], { order: ['Münze', 'Schein'] }),
    hints: edge ? [inHand, material] : ['2 € ist die größte Münze.', 'Ab 5 € gibt es Scheine.'],
    steps: [rule, `${fmtMoney(piece)} ist ${note ? 'ein Schein' : 'eine Münze'}.`],
    praise: 'Du kennst den Unterschied von Münzen und Scheinen.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** F15, AB 1 of Stufe 3: one unit in a collection, and a total without Euro and Cent together. */
const fitsOneUnit = (items: readonly number[]) => new Set(items.map((c) => c >= 100)).size === 1 && !isMixedAmount(sum(items));

/** One way to lay `total` with more than `fewCount` coins: the child with many coins has more here. */
function manyCoinsFor(rng: Rng, total: number, fewCount: number, reach: number): number[] {
  return rng.pick(waysToLay(total, [50, 20, 10, 5], fewCount + reach).filter((w) => w.length >= fewCount + 2));
}

/**
 * Few large coins against many small coins. The right answer is the larger value: sometimes few coins, sometimes many coins,
 * sometimes the same value twice, so neither 'more coins' nor 'fewer coins' works as a shortcut.
 */
function collections(rng: Rng, ab: Ab): { few: number[]; many: number[]; winner: 'few' | 'many' | 'equal' } {
  const kind = rng.int(1, 4);
  if (kind === 1) {
    const pairs: [number[], number[]][] = [
      [[50, 50], [50, 20, 20, 10]],
      [[100], [50, 50]],
      [[200], [100, 50, 50]],
      [[50], [20, 20, 10]],
      [[20], [10, 5, 5]],
      [[10, 10], [10, 5, 5]],
      [[10], [5, 2, 2, 1]],
    ];
    const [few, many] = rng.pick(pairs.filter((pair) => ab > 1 || pair.every(fitsOneUnit)));
    return { few, many, winner: 'equal' };
  }
  const fewCount = rng.int(1, 2);
  if (kind === 2) {
    // on AB 1 the larger total stays under 1 €
    const few = ab > 1 ? drawPieces(rng, [100, 50, 20], fewCount, 1, 200) : drawPieces(rng, [50, 20], fewCount, 1, 80);
    return { few, many: rng.shuffle(manyCoinsFor(rng, sum(few) + rng.pick([5, 10, 20]), fewCount, ab > 1 ? 5 : 4)), winner: 'many' };
  }
  const few = drawPieces(rng, ab > 1 ? [200, 100, 50] : rng.pick([[200, 100], [50]]), fewCount, 1, 400);
  const many = drawPieces(rng, [20, 10, 5, 2], fewCount + rng.int(2, ab > 1 ? 4 : 3), 1, sum(few) - 1);
  return { few, many, winner: 'few' };
}

/** "Wer hat mehr Geld?" The number of coins says nothing: only the values decide. */
function whoHasMore(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { few, many, winner } = collections(rng, ab);
  const equal = winner === 'equal';
  const [a, b] = pickTwo(rng);
  const prompt = 'Wer hat mehr Geld?';
  const options: ChoiceOption[] = [
    { label: a.name, visual: { type: 'money', items: few }, ...(winner === 'few' ? {} : { whyWrong: COMPARE_BOTH }) },
    { label: b.name, visual: { type: 'money', items: many }, ...(winner === 'many' ? {} : { whyWrong: equal ? COMPARE_BOTH : COUNT_VALUE }) },
    { label: 'Beide gleich viel', ...(equal ? {} : { whyWrong: COMPARE_BOTH }) },
  ];
  const shown = rng.shuffle(options.slice(0, 2));
  const all = [...shown, options[2]];
  const right = equal ? options[2] : winner === 'few' ? options[0] : options[1];
  const [more, less] = winner === 'few' ? [few, many] : [many, few];
  return build(SKILL, stufe, {
    key: `vergleich:${few.join('-')}:${many.join('-')}`,
    ab,
    prompt,
    answer: { kind: 'choice', options: all, correct: all.indexOf(right), layout: 'grid' },
    hints: [COUNT_VALUE, 'Rechne für jedes Kind den Wert aus.'],
    steps: [
      `${a.name} hat ${fmtMoney(sum(few))}.`,
      `${b.name} hat ${fmtMoney(sum(many))}.`,
      equal ? 'Beide haben gleich viel Geld.' : `${fmtMoney(sum(more))} ist mehr als ${fmtMoney(sum(less))}.`,
    ],
    praise: 'Du hast den Wert verglichen, nicht die Anzahl.',
    srText: speak(`${prompt} ${a.name}: ${describeMoney(few)} ${b.name}: ${describeMoney(many)}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Three children: the one with the most coins sometimes has the most money, and sometimes the one with the fewest (Stufe 3). */
function whoHasMost(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const manyWins = rng.chance(0.35);
  const few = manyWins ? drawPieces(rng, [100, 50], 2, 100, 150) : drawPieces(rng, [200, 100], 2, 200, 400);
  const many = manyWins ? drawPieces(rng, [50, 20, 10], 5, sum(few) + 10, 200) : drawPieces(rng, [20, 10, 5], 5, 1, sum(few) - 1);
  const top = Math.max(sum(few), sum(many));
  const low = Math.min(sum(few), sum(many));
  let mid = drawPieces(rng, [100, 50, 20], 3, 1, top - 10);
  if (sum(mid) === low) mid = [...mid.slice(1), 10];
  const [a, b, c] = rng.sample(PEOPLE, 3);
  const prompt = 'Wer hat am meisten Geld?';
  const compareAll = COMPARE_BOTH.replace('beide', 'alle');
  const winner = manyWins ? b.name : a.name;
  const options: ChoiceOption[] = rng.shuffle([
    { label: a.name, visual: { type: 'money', items: few }, ...(manyWins ? { whyWrong: compareAll } : {}) },
    { label: b.name, visual: { type: 'money', items: many }, ...(manyWins ? {} : { whyWrong: COUNT_VALUE }) },
    { label: c.name, visual: { type: 'money', items: mid }, whyWrong: compareAll },
  ]);
  return build(SKILL, stufe, {
    key: `meiste:${few.join('-')}:${many.join('-')}:${mid.join('-')}`,
    ab,
    prompt,
    answer: { kind: 'choice', options, correct: options.findIndex((o) => o.label === winner), layout: 'grid' },
    hints: [COUNT_VALUE, 'Rechne für jedes Kind den Wert aus.'],
    steps: [`${a.name} hat ${fmtMoney(sum(few))}.`, `${b.name} hat ${fmtMoney(sum(many))}.`, `${c.name} hat ${fmtMoney(sum(mid))}.`, `${winner} hat am meisten Geld.`],
    praise: 'Du hast den Wert verglichen, nicht die Anzahl.',
    srText: speak(`${prompt} ${a.name}: ${describeMoney(few)} ${b.name}: ${describeMoney(many)} ${c.name}: ${describeMoney(mid)}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Which coins make this amount? */
function exactAmount(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const total = rng.pick(ab > 1 ? [70, 100, 120, 150, 200] : [30, 50, 70, 100]);
  const pieces = (t: number) => COINS.filter((c) => c < t);
  const way = (t: number, most = 4) => rng.pick(waysToLay(t, pieces(t), most).filter((w) => w.length >= 2));
  // At most 3 coins: the steps add them up in one line (T15).
  const right = way(total, 3);
  const wrongTotals = rng.sample([total - 10, total + 10, total + 20, total - 20, total - 30].filter((t) => t > 5 && (ab > 1 || !isMixedAmount(t))), 3);
  const wrongs = wrongTotals.map((t) => {
    const items = way(t);
    return { visual: { type: 'money' as const, items }, whyWrong: `Diese Münzen sind zusammen ${fmtMoney(t)}.` };
  });
  const { answer, rightLabel } = pictureChoice(rng, { type: 'money', items: right }, wrongs);
  const prompt = `Welche Münzen sind zusammen ${fmtMoney(total)}?`;
  return build(SKILL, stufe, {
    key: `genau:${total}:${right.join('-')}`,
    ab,
    prompt,
    answer,
    hints: [COUNT_VALUE, 'Rechne jedes Bild einzeln aus.'],
    steps: [`Bild ${rightLabel}: ${plusLine(right)} = ${fmtMoney(total)}`],
    praise: 'Du hast den Wert der Münzen ausgerechnet.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** The money of a Stufe from small to large, for a row. Stufe 2: from 50 ct to 100 €, so that each row has a note. */
const rowOf = (stufe: Stufe): readonly number[] => (stufe === 1 ? COINS : [...COINS.filter((c) => c >= 50), ...NOTES]);

/** A row from small to large with one place missing: a gap, the money that is not in the picture has to come from memory. */
function gapInRow(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const all = rowOf(stufe);
  const from = rng.int(0, all.length - 5);
  const row = all.slice(from, from + 5);
  const at = rng.int(1, 3);
  const missing = row[at];
  const shown = row.filter((_, i) => i !== at);
  const prompt = stufe === 1 ? 'Welche Münze fehlt in der Reihe?' : 'Was fehlt in der Reihe?';
  const inRow = 'Das ist schon in der Reihe. Such die Lücke.';
  const elsewhere = all.filter((c) => !row.includes(c));
  const wrongs = [...rng.sample(shown, 2), ...rng.sample(elsewhere, Math.min(1, elsewhere.length))].map((c) => ({
    label: fmtMoney(c),
    whyWrong: shown.includes(c) ? inRow : 'Das passt nicht zwischen die Nachbarn in der Reihe.',
  }));
  return build(SKILL, stufe, {
    key: `luecke:${shown.join('-')}`,
    ab,
    prompt,
    visual: { type: 'money', items: shown },
    answer: makeChoice(rng, { label: fmtMoney(missing) }, wrongs, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Die Reihe geht vom kleinsten Wert zum größten.', 'Denk an alle Werte aus der Geldbörse.'],
    steps: [`Die Reihe: ${row.map((c) => fmtMoney(c)).join(', ')}.`, `Es fehlt: ${fmtMoney(missing)}.`],
    praise: 'Du kennst die Reihe vom Geld genau.',
    srText: speak(`${prompt} ${describeMoney(shown)}`),
    kmk: KMK,
  });
}

/** Two pieces with exactly one between them. */
function betweenTwo(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const all = rowOf(stufe);
  const at = rng.int(1, all.length - 2);
  const [low, right, high] = [all[at - 1], all[at], all[at + 1]];
  const prompt = `${stufe === 1 ? 'Welche Münze' : 'Welches Geld'} liegt zwischen ${fmtMoney(low)} und ${fmtMoney(high)}?`;
  const named = 'Das steht schon in der Frage. Gesucht ist der Wert dazwischen.';
  const wrongs = [low, high, ...rng.sample(all.filter((c) => c !== low && c !== right && c !== high), 2)].map((c) => ({
    label: fmtMoney(c),
    whyWrong: c === low || c === high ? named : c < low ? `Dieser Wert ist kleiner als ${fmtMoney(low)}.` : `Dieser Wert ist größer als ${fmtMoney(high)}.`,
  }));
  return build(SKILL, stufe, {
    key: `zwischen:${low}:${high}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fmtMoney(right) }, rng.shuffle(wrongs), { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Denk an die Reihe vom kleinsten Wert zum größten.', `Was kommt in dieser Reihe nach ${fmtMoney(low)}?`],
    steps: [`Die Reihe: ${fmtMoney(low)}, ${fmtMoney(right)}, ${fmtMoney(high)}.`, `Dazwischen liegt ${fmtMoney(right)}.`],
    praise: 'Du kennst die Reihe vom Geld genau.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** Two children shall have the same: which coin is missing? Backwards from the total to the piece. */
function coinToEqual(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const total = rng.pick([50, 70, 100, 120, 150, 200]);
  const way = rng.pick(waysToLay(total, COINS.filter((c) => c >= 5 && c < total), 4).filter((w) => w.length >= 3 && w.some((c) => !fmtMoney(total).includes(fmtMoney(c)))));
  // Not the 50 ct of 1 € 50 ct: the answer would stand in the task.
  const missing = rng.pick(way.filter((c) => !fmtMoney(total).includes(fmtMoney(c))));
  const at = way.indexOf(missing);
  const shown = rng.shuffle(way.filter((_, i) => i !== at));
  const have = sum(shown);
  const [a, b] = pickTwo(rng);
  const context = `${a.name} hat ${fmtMoney(total)}. ${b.name} hat die Münzen im Bild.`;
  const prompt = `Welche Münze fehlt ${b.name} für gleich viel Geld?`;
  const wrongs = rng.sample(COINS.filter((c) => c !== missing && c >= 5 && c < 200), 3).map((c) => ({
    label: fmtMoney(c),
    whyWrong: `Dann hat ${b.name} ${fmtMoney(have + c)}.`,
  }));
  return build(SKILL, stufe, {
    key: `gleich-viel:${total}:${shown.join('-')}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: shown },
    answer: makeChoice(rng, { label: fmtMoney(missing) }, wrongs, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Rechne zuerst die Münzen im Bild zusammen.', `Wie viel fehlt dann noch bis ${fmtMoney(total)}?`],
    steps: [`Im Bild: ${plusLine(largestFirst(shown))} = ${fmtMoney(have)}`, `${fmtMoney(have)} + ${fmtMoney(missing)} = ${fmtMoney(total)}`, `Es fehlt: ${fmtMoney(missing)}`],
    praise: 'Du hast vom Betrag zurück gerechnet.',
    srText: speak(`${context} ${prompt} ${describeMoney(shown)}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [nameCoin, extremeCoin(3), orderCoins], 2: [extremeCoin(4), orderCoins, orderCoins], 3: [doesNotExist, gapInRow, betweenTwo] },
  2: { 1: [coinOrNote, orderNotes], 2: [orderMixed, orderMixed, extremeMixed], 3: [doesNotExist, gapInRow, betweenTwo] },
  3: { 1: [whoHasMore, whoHasMore, exactAmount], 2: [whoHasMore, whoHasMore, exactAmount], 3: [whoHasMost, whoHasMost, coinToEqual] },
};

export const geldKennenSkill: SkillDef = {
  ...SKILL,
  title: 'Münzen und Scheine',
  description: 'Du kennst unser Geld und ordnest es nach dem Wert.',
  stufen: {
    1: 'Münzen benennen und ordnen',
    2: 'Scheine kennen, mit Münzen ordnen',
    3: 'Mehr Münzen, mehr Geld? Du vergleichst.',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
