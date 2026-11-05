/**
 * Bildaufgaben: the data of the question is in the picture (the one skill where this is allowed, T14).
 * The Stufe chooses the content (docs/research.md §6), the AB level the demand inside it:
 * Stufe 1, picture and one question, plus or minus, ≤ 20. AB I: rows that stay within 10. AB II: rows over the ten, or money.
 * AB III: what is missing, or what was there at the start.
 * Stufe 2, one sentence and a picture, ≤ 100. AB I: pictures that stand for 10, money within a ten. AB II: over a ten.
 * AB III: what is missing.
 * Stufe 3, the picture shows something that is not needed. AB I: the sum or difference of two rows of three, or notes beside coins.
 * AB II: one purchase or gift from what is needed. AB III: what is missing, from what is needed.
 */
import { fmtQty } from '../../core/format';
import type { Ab, Exercise, PictoIcon, Rng, SkillDef, Stufe } from '../../core/types';
import { PEOPLE, build, bugList, pickPerson, pickTwo, safeHints, targetAb, type ExerciseBody } from '../shared';
import { HINT_RECHENART, answerLine, crossingDifference, crossingSum, euroPieces, hintsWithoutAnswer, sentenceAnswer, spokenTask } from './helpers';

const SCENES: readonly { icon: PictoIcon; noun: string }[] = [
  { icon: 'apfel', noun: 'Äpfel' },
  { icon: 'ball', noun: 'Bälle' },
  { icon: 'buch', noun: 'Bücher' },
  { icon: 'stern', noun: 'Sterne' },
];

const KMK = ['ZO.sachrechnen', 'GM.sachsituationen', 'PK.darstellen'];

/** Things to buy, with their article in the accusative. */
const THINGS = ['ein Buch', 'einen Ball', 'ein Spiel'];

/** What costs up to 39 €, and what can cost more: the topic teaches plausible prices (frage-pruefen), so the stories keep to them. */
const WANTED = ['Ein Buch', 'Ein Ball', 'Ein Spiel', 'Ein Puzzle'];
const WANTED_DEAR = ['Ein Roller', 'Ein Zelt', 'Eine Schultasche'];
const MAX_PRICE = 80;

const wantedFor = (rng: Rng, price: number) => rng.pick(price <= 39 ? WANTED : WANTED_DEAR);

const COUNT_HINT = (pieces: string) => `Zähle nicht die ${pieces}. Rechne die Zahlen darauf zusammen.`;

/** Rows side by side, where nothing comes or goes: HINT_RECHENART has no true answer there. */
const BEIDE_REIHEN = 'Nimm beide Reihen zusammen.';

const LEGEND = (noun: string) => `Schau in die Legende: Ein Bild steht für 10 ${noun}.`;

const euro = (n: number) => fmtQty(n, '€');

const sum = (items: number[]) => items.reduce((total, c) => total + c, 0) / 100;

/** The data is in the picture, so the spoken task always says what the picture shows. */
function result(stufe: Stufe, ab: Ab, key: string, body: Omit<ExerciseBody, 'key' | 'ab' | 'kmk' | 'srText'>): Exercise {
  return build(bildaufgabeSkill, stufe, { key, ab, kmk: KMK, srText: spokenTask(body.context, body.prompt, body.visual), ...body });
}

/** Stufe 1: two rows of pictures, all counted. AB I within 10, AB II over the ten. */
function pictureSum(rng: Rng, ab: 1 | 2): Exercise {
  const { icon, noun } = rng.pick(SCENES);
  const [p, q] = pickTwo(rng);
  const a = ab === 1 ? rng.int(2, 5) : rng.int(5, 10);
  // At least 2 in a row: with a = 10 the sum is over the ten anyway, and 'Lena hat 1 Bücher' would not read.
  const b = ab === 1 ? rng.int(2, 5) : rng.int(Math.max(2, 11 - a), 10);
  const value = a + b;
  const prompt = `Wie viele ${noun} haben ${p.name} und ${q.name} zusammen?`;
  const before = `${p.name} und ${q.name} haben zusammen`;
  return result(1, ab, `${ab === 1 ? 'summe' : 'summe-gross'}:${icon}:${a}:${b}`, {
    prompt,
    visual: { type: 'pictogram', title: noun, categories: [p.name, q.name], values: [a, b], iconValue: 1, icon },
    answer: sentenceAnswer(value, before, `${noun}.`, prompt),
    hints: ['Schau genau: Wie viele Bilder hat jede Reihe?', BEIDE_REIHEN],
    steps: [`${p.name} hat ${a} ${noun}. ${q.name} hat ${b} ${noun}.`, `${a} + ${b} = ${value}`, answerLine(before, value, `${noun}.`)],
    bugs: bugList(value, [['plus-minus-getauscht', Math.abs(a - b), BEIDE_REIHEN]]),
    praise: 'Du hast das Bild genau angeschaut.',
  });
}

/** Stufe 1: one row of pictures and something goes away. AB I up to 8 pictures, AB II up to 10. */
function pictureTakeAway(rng: Rng, ab: 1 | 2): Exercise {
  const { icon, noun } = rng.pick(SCENES);
  const n = pickPerson(rng).name;
  const a = ab === 1 ? rng.int(5, 8) : rng.int(8, 10);
  const b = rng.int(2, a - 2);
  const value = a - b;
  const prompt = `${n} gibt ${b} ${noun} ab. Wie viele ${noun} hat ${n} dann?`;
  const before = `${n} hat dann`;
  return result(1, ab, `${ab === 1 ? 'weg' : 'weg-gross'}:${icon}:${a}:${b}`, {
    prompt,
    visual: { type: 'pictogram', title: noun, categories: [n], values: [a], iconValue: 1, icon },
    answer: sentenceAnswer(value, before, `${noun}.`, prompt),
    hints: hintsWithoutAnswer(['Schau genau: Wie viele Bilder hat die Reihe?', `Nimm ${b} Bilder weg.`], value, 'Schau genau: Wie viele Bilder hat die Reihe?'),
    steps: [`Im Bild sind ${a} ${noun}.`, `${a} − ${b} = ${value}`, answerLine(before, value, `${noun}.`)],
    bugs: bugList(value, [['plus-minus-getauscht', a + b, HINT_RECHENART]]),
    praise: 'Du hast das Bild genau angeschaut.',
  });
}

/** Stufe 1, AB III: a row of pictures and a goal: what is missing? */
function pictureGap(rng: Rng): Exercise {
  const { icon, noun } = rng.pick(SCENES);
  const n = pickPerson(rng).name;
  const have = rng.int(3, 10);
  const value = rng.int(2, Math.min(9, 20 - have));
  const goal = have + value;
  const context = `${n} möchte ${goal} ${noun} haben.`;
  const prompt = `Wie viele ${noun} fehlen ${n} noch?`;
  const before = `${n} fehlen noch`;
  return result(1, 3, `fehlt:${icon}:${have}:${goal}`, {
    context,
    prompt,
    visual: { type: 'pictogram', title: noun, categories: [n], values: [have], iconValue: 1, icon },
    answer: sentenceAnswer(value, before, `${noun}.`, prompt),
    hints: hintsWithoutAnswer(['Wie viele Bilder hat die Reihe schon?', `Wie weit ist es bis ${goal}?`], value, 'Wie viele Bilder hat die Reihe schon?'),
    steps: [`Im Bild sind ${have} ${noun}.`, `${goal} − ${have} = ${value}`, answerLine(before, value, `${noun}.`)],
    bugs: bugList(value, [
      ['plus-minus-getauscht', have + goal, 'Die große Zahl ist das Ziel. Wie viele fehlen bis dahin?'],
      ['alle-zahlen', goal, 'Das ist das Ziel. Wie viele fehlen noch?'],
    ]),
    praise: 'Du hast vom Bild bis zum Ziel gerechnet.',
  });
}

/** Stufe 1, AB III: the picture shows the end of the story, the start is asked. */
function pictureStart(rng: Rng): Exercise {
  const { icon, noun } = rng.pick(SCENES);
  const n = pickPerson(rng).name;
  const end = rng.int(5, 10);
  const change = rng.int(2, end - 2);
  const value = end - change;
  const context = `${n} bekommt ${change} ${noun} dazu. Das Bild zeigt jetzt alle ${noun}.`;
  const prompt = `Wie viele ${noun} hat ${n} am Anfang?`;
  const before = 'Am Anfang sind es';
  return result(1, 3, `anfang:${icon}:${end}:${change}`, {
    context,
    prompt,
    visual: { type: 'pictogram', title: noun, categories: [n], values: [end], iconValue: 1, icon },
    answer: sentenceAnswer(value, before, `${noun}.`, prompt),
    hints: ['Im Bild sind die neuen Bilder schon dabei.', 'Am Anfang sind es weniger. Nimm die neuen wieder weg.'],
    steps: [`Im Bild sind ${end} ${noun}.`, `${end} − ${change} = ${value}`, answerLine(before, value, `${noun}.`)],
    bugs: bugList(value, [['plus-minus-getauscht', end + change, 'Im Bild sind die neuen Bilder schon dabei.']]),
    praise: 'Du hast die Geschichte rückwärts gedacht.',
  });
}

/** Stufe 1, AB II: money in the picture and one purchase or gift, up to 20 €. */
function moneySmall(rng: Rng): Exercise {
  const n = pickPerson(rng).name;
  const plus = rng.chance(0.5);
  const have = plus ? rng.int(3, 15) : rng.int(7, 20);
  const other = rng.int(plus ? 2 : 3, Math.min(plus ? 20 - have : have - 2, 9)); // a purchase: no book for 2 €
  const thing = rng.pick(THINGS);
  const context = plus ? `${n} hat das Geld im Bild. ${n} bekommt ${euro(other)}.` : `${n} hat das Geld im Bild. ${n} kauft ${thing} für ${euro(other)}.`;
  return moneyStory(1, 2, n, plus, have, other, thing, context);
}

/** Stufe 2: money in the picture and one sentence. AB I within a ten, AB II over a ten. */
function moneyLarge(rng: Rng, ab: 1 | 2): Exercise {
  const n = pickPerson(rng).name;
  const plus = rng.chance(0.5);
  let have: number;
  let other: number;
  if (plus) {
    [have, other] = ab === 1 ? [rng.int(2, 9) * 10, rng.int(2, 9)] : crossingSum(rng);
  } else if (ab === 1) {
    const ones = rng.int(3, 9);
    have = rng.int(2, 9) * 10 + ones;
    other = rng.int(3, ones);
  } else {
    do [have, other] = crossingDifference(rng);
    while (other < 3 || other > 39); // a purchase: no book for 2 € or 80 €
  }
  const thing = rng.pick(THINGS);
  const context = plus ? `${n} legt ${euro(other)} zum Geld im Bild dazu.` : `${n} kauft vom Geld im Bild ${thing} für ${euro(other)}.`;
  return moneyStory(2, ab, n, plus, have, other, thing, context);
}

function moneyStory(stufe: Stufe, ab: Ab, n: string, plus: boolean, have: number, other: number, thing: string, context: string): Exercise {
  const pieces = euroPieces(have);
  const value = plus ? have + other : have - other;
  // One question for both: 'noch' only with minus and 'jetzt' only with plus would give the operation away (T13).
  const question = `Wie viel Euro hat ${n} dann?`;
  const before = `${n} hat dann`;
  return result(stufe, ab, `geld:${have}:${plus ? '+' : '-'}:${other}:${thing}`, {
    context,
    prompt: question,
    visual: { type: 'money', items: pieces },
    answer: sentenceAnswer(value, before, '€.', question),
    hints: safeHints(['Rechne zuerst aus: Wie viel Geld ist im Bild?', plus ? 'Dann kommt noch Geld dazu.' : 'Dann geht Geld weg.'], value, 'Rechne zuerst aus: Wie viel Geld ist im Bild?'),
    steps: [`Im Bild sind ${euro(have)}.`, `${have} ${plus ? '+' : '−'} ${other} = ${value}`, answerLine(before, value, '€.')],
    bugs: bugList(value, [
      ['plus-minus-getauscht', plus ? have - other : have + other, HINT_RECHENART],
      ['muenzen-anzahl', plus ? pieces.length + other : pieces.length - other, COUNT_HINT('Münzen und Scheine')],
    ]),
    praise: 'Du hast den Wert im Bild genau gezählt.',
  });
}

/** AB III on Stufe 1 and 2: the money in the picture is not enough for something. */
function moneyGap(rng: Rng, stufe: 1 | 2): Exercise {
  const n = pickPerson(rng).name;
  let have: number;
  let price: number;
  if (stufe === 1) {
    have = rng.int(3, 15);
    price = rng.int(have + 2, 20);
  } else {
    do [price, have] = crossingDifference(rng, 1);
    while (price > MAX_PRICE);
  }
  const thing = wantedFor(rng, price);
  const value = price - have;
  const pieces = euroPieces(have);
  const context = stufe === 1 ? `${n} hat das Geld im Bild. ${thing} kostet ${euro(price)}.` : `${thing} kostet ${euro(price)}.`;
  const prompt = stufe === 1 ? `Wie viel Euro fehlen ${n} noch?` : 'Wie viel Euro fehlen zum Geld im Bild?';
  const before = 'Es fehlen noch';
  return result(stufe, 3, `geld-fehlt:${thing}:${have}:${price}`, {
    context,
    prompt,
    visual: { type: 'money', items: pieces },
    answer: sentenceAnswer(value, before, '€.', prompt),
    hints: safeHints(['Rechne zuerst aus: Wie viel Geld ist im Bild?', 'Wie weit ist es von dort bis zum Preis?'], value, 'Wie weit ist es von dort bis zum Preis?'),
    steps: [`Im Bild sind ${euro(have)}.`, `${price} − ${have} = ${value}`, answerLine(before, value, '€.')],
    bugs: bugList(value, [
      ['plus-minus-getauscht', price + have, 'Der Preis ist das Ziel. Wie viel fehlt bis dahin?'],
      ['muenzen-anzahl', price - pieces.length, COUNT_HINT('Münzen und Scheine')],
    ]),
    praise: 'Du hast vom Geld bis zum Preis gerechnet.',
  });
}

/** Stufe 2, AB I: pictures that stand for 10, all counted. */
function tensSum(rng: Rng): Exercise {
  const { icon, noun } = rng.pick(SCENES);
  const [p, q] = pickTwo(rng);
  const a = rng.int(2, 6);
  const b = rng.int(2, 10 - a);
  const value = (a + b) * 10;
  const context = `Ein Bild bedeutet 10 ${noun}.`;
  const question = `Wie viele ${noun} haben ${p.name} und ${q.name} zusammen?`;
  const before = `${p.name} und ${q.name} haben zusammen`;
  return result(2, 1, `zehner-summe:${icon}:${a}:${b}`, {
    context,
    prompt: question,
    visual: { type: 'pictogram', title: noun, categories: [p.name, q.name], values: [a * 10, b * 10], iconValue: 10, icon },
    answer: sentenceAnswer(value, before, `${noun}.`, question),
    hints: ['Ein Bild steht für 10. Zähle immer 10 weiter.', BEIDE_REIHEN],
    steps: [`${p.name} hat ${a * 10} ${noun}. ${q.name} hat ${b * 10} ${noun}.`, `${a * 10} + ${b * 10} = ${value}`, answerLine(before, value, `${noun}.`)],
    bugs: bugList(value, [
      ['bild-legende', a + b, LEGEND(noun)],
      ['plus-minus-getauscht', Math.abs(a - b) * 10, BEIDE_REIHEN],
    ]),
    praise: 'Du hast in die Legende geschaut.',
  });
}

/** Stufe 2, AB II: pictures that stand for 10, and something goes away, over a ten. */
function tensAway(rng: Rng): Exercise {
  const { icon, noun } = rng.pick(SCENES);
  const p = pickPerson(rng).name;
  const a = rng.int(2, 9);
  const b = rng.int(3, 9);
  const have = a * 10;
  const value = have - b;
  const context = `${p} gibt ${b} ${noun} ab.`;
  const question = `Wie viele ${noun} hat ${p} dann?`;
  const before = `${p} hat dann`;
  return result(2, 2, `zehner-weg:${icon}:${a}:${b}`, {
    context,
    prompt: question,
    visual: { type: 'pictogram', title: noun, categories: [p], values: [have], iconValue: 10, icon },
    answer: sentenceAnswer(value, before, `${noun}.`, question),
    hints: ['Ein Bild steht für 10. Zähle immer 10 weiter.', `Nimm dann ${b} ${noun} weg.`],
    steps: [`Im Bild sind ${have} ${noun}.`, `${have} − ${b} = ${value}`, answerLine(before, value, `${noun}.`)],
    bugs: bugList(value, [
      ['bild-legende', a - b, LEGEND(noun)],
      ['plus-minus-getauscht', have + b, HINT_RECHENART],
    ]),
    praise: 'Du hast in die Legende geschaut.',
  });
}

/** Stufe 2, AB III: pictures that stand for 10, and a goal. */
function tensGap(rng: Rng): Exercise {
  const { icon, noun } = rng.pick(SCENES);
  const p = pickPerson(rng).name;
  const a = rng.int(2, 7);
  const value = rng.int(12, Math.min(39, 99 - a * 10));
  const have = a * 10;
  const goal = have + value;
  const context = `${p} möchte ${goal} ${noun} haben.`;
  const prompt = `Wie viele ${noun} fehlen ${p} noch?`;
  const before = `${p} fehlen noch`;
  return result(2, 3, `zehner-fehlt:${icon}:${a}:${goal}`, {
    context,
    prompt,
    visual: { type: 'pictogram', title: noun, categories: [p], values: [have], iconValue: 10, icon },
    answer: sentenceAnswer(value, before, `${noun}.`, prompt),
    hints: ['Ein Bild steht für 10. Wie viele sind es im Bild?', `Wie weit ist es von dort bis ${goal}?`],
    steps: [`Im Bild sind ${have} ${noun}.`, `${goal} − ${have} = ${value}`, answerLine(before, value, `${noun}.`)],
    bugs: bugList(value, [
      ['bild-legende', goal - a, LEGEND(noun)],
      ['plus-minus-getauscht', goal + have, 'Die große Zahl ist das Ziel. Wie viele fehlen bis dahin?'],
    ]),
    praise: 'Du hast vom Bild bis zum Ziel gerechnet.',
  });
}

/** Three rows that stand for 10. p and q are asked about, r is not needed. */
function threeRows(rng: Rng, a: number, b: number) {
  const { icon, noun } = rng.pick(SCENES);
  const [p, q, r] = rng.sample(PEOPLE, 3).map((person) => person.name);
  const c = rng.int(2, 9);
  const rows = rng.shuffle([{ name: p, count: a }, { name: q, count: b }, { name: r, count: c }]);
  return {
    icon,
    noun,
    p,
    q,
    r,
    c,
    visual: { type: 'pictogram' as const, title: noun, categories: rows.map((row) => row.name), values: rows.map((row) => row.count * 10), iconValue: 10, icon },
  };
}

/** Stufe 3, AB I: three rows, the question adds two of them. */
function extraRowSum(rng: Rng): Exercise {
  const a = rng.int(2, 6);
  const b = rng.int(2, 10 - a);
  const { icon, noun, p, q, r, c, visual } = threeRows(rng, a, b);
  const value = (a + b) * 10;
  const prompt = `Wie viele ${noun} haben ${p} und ${q} zusammen?`;
  const before = `${p} und ${q} haben zusammen`;
  return result(3, 1, `dritte-reihe:${icon}:${a}:${b}:${c}`, {
    prompt,
    visual,
    answer: sentenceAnswer(value, before, `${noun}.`, prompt),
    hints: ['Nach wem fragt die Aufgabe? Schau nur diese Reihen an.', `Die Reihe von ${r} brauchst du nicht.`],
    steps: [`Du brauchst nur ${p} und ${q}.`, `${a * 10} + ${b * 10} = ${value}`, answerLine(before, value, `${noun}.`)],
    bugs: bugList(value, [
      ['alle-zahlen', (a + b + c) * 10, `Schau nur die Reihen von ${p} und ${q} an.`],
      ['bild-legende', a + b, LEGEND(noun)],
      ['plus-minus-getauscht', Math.abs(a - b) * 10, `Nimm die Reihen von ${p} und ${q} zusammen.`],
    ]),
    praise: 'Du hast nur die passenden Reihen benutzt.',
  });
}

/** Stufe 3, AB II: three rows, something goes away from one of them. */
function extraRowAway(rng: Rng): Exercise {
  const a = rng.int(3, 9);
  const b = rng.int(2, 9);
  const { icon, noun, p, q, c, visual } = threeRows(rng, a, rng.int(2, 9));
  const have = a * 10;
  const value = have - b;
  const context = `${p} gibt ${b} ${noun} ab.`;
  const prompt = `Wie viele ${noun} hat ${p} dann?`;
  const before = `${p} hat dann`;
  return result(3, 2, `dritte-reihe-weg:${icon}:${a}:${b}:${c}`, {
    context,
    prompt,
    visual,
    answer: sentenceAnswer(value, before, `${noun}.`, prompt),
    hints: [`Schau nur die Reihe von ${p} an.`, `Die Reihe von ${q} brauchst du nicht.`],
    steps: [`${p} hat im Bild ${have} ${noun}.`, `${have} − ${b} = ${value}`, answerLine(before, value, `${noun}.`)],
    bugs: bugList(value, [
      ['bild-legende', a - b, LEGEND(noun)],
      ['plus-minus-getauscht', have + b, HINT_RECHENART],
    ]),
    praise: 'Du hast nur die passende Reihe benutzt.',
  });
}

/** Stufe 3, AB III: three rows, what is missing for one of them. */
function extraRowGap(rng: Rng): Exercise {
  const a = rng.int(2, 7);
  const { icon, noun, p, q, c, visual } = threeRows(rng, a, rng.int(2, 9));
  const have = a * 10;
  const value = rng.int(12, Math.min(39, 99 - have));
  const goal = have + value;
  const context = `${p} möchte ${goal} ${noun} haben.`;
  const prompt = `Wie viele ${noun} fehlen ${p} noch?`;
  const before = `${p} fehlen noch`;
  return result(3, 3, `dritte-reihe-fehlt:${icon}:${a}:${goal}:${c}`, {
    context,
    prompt,
    visual,
    answer: sentenceAnswer(value, before, `${noun}.`, prompt),
    hints: [`Schau nur die Reihe von ${p} an.`, `Die Reihe von ${q} brauchst du nicht.`],
    steps: [`${p} hat im Bild ${have} ${noun}.`, `${goal} − ${have} = ${value}`, answerLine(before, value, `${noun}.`)],
    bugs: bugList(value, [
      ['bild-legende', goal - a, LEGEND(noun)],
      ['plus-minus-getauscht', goal + have, 'Die große Zahl ist das Ziel. Wie viele fehlen bis dahin?'],
    ]),
    praise: 'Du hast nur die passende Reihe benutzt.',
  });
}

/** Stufe 3, AB I: three rows, the difference of two of them. */
function extraRowDifference(rng: Rng): Exercise {
  const b = rng.int(2, 6);
  const a = rng.int(b + 2, 9);
  const { icon, noun, p, q, r, c, visual } = threeRows(rng, a, b);
  const value = (a - b) * 10;
  const prompt = `Wie viele ${noun} hat ${p} mehr als ${q}?`;
  const before = `${p} hat`;
  const after = `${noun} mehr.`;
  return result(3, 1, `dritte-reihe-mehr:${icon}:${a}:${b}:${c}`, {
    prompt,
    visual,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Nach wem fragt die Aufgabe? Schau nur diese Reihen an.', `Die Reihe von ${r} brauchst du nicht.`],
    steps: [`Du brauchst nur ${p} und ${q}.`, `${a * 10} − ${b * 10} = ${value}`, answerLine(before, value, after)],
    bugs: bugList(value, [
      ['alle-zahlen', (a + b + c) * 10, `Schau nur die Reihen von ${p} und ${q} an.`],
      ['bild-legende', a - b, LEGEND(noun)],
      ['plus-minus-getauscht', (a + b) * 10, 'Gefragt ist der Unterschied, nicht alle zusammen.'],
    ]),
    praise: 'Du hast nur die passenden Reihen benutzt.',
  });
}

/** Notes and coins for the picture. The coins are not needed. */
function notesAndCoins(rng: Rng) {
  const notes = rng.sample([500, 1000, 1000, 2000, 2000, 5000], rng.int(2, 3));
  const coins = Array.from({ length: rng.int(2, 3) }, () => rng.pick([100, 200]));
  const noteKey = [...notes].sort((a, b) => a - b).join('+');
  const coinKey = [...coins].sort((a, b) => a - b).join('+');
  return { notes, coins, have: sum(notes), total: sum([...notes, ...coins]), pictureKey: `${noteKey}:${coinKey}`, visual: { type: 'money' as const, items: rng.shuffle([...notes, ...coins]) } };
}

/** Stufe 3, AB I: notes and coins in the picture, the question asks for the notes. */
function onlyNotes(rng: Rng): Exercise {
  const { notes, have, total, pictureKey, visual } = notesAndCoins(rng);
  const prompt = 'Wie viel Euro sind nur die Scheine?';
  const before = 'Die Scheine sind zusammen';
  return result(3, 1, `nur:${pictureKey}`, {
    prompt,
    visual,
    answer: sentenceAnswer(have, before, '€.', prompt),
    hints: ['Schau nur die Scheine an.', 'Die Münzen brauchst du nicht.'],
    steps: ['Du brauchst nur die Scheine.', `${notes.map((c) => euro(c / 100)).join(' + ')} = ${euro(have)}`, answerLine(before, have, '€.')],
    bugs: bugList(have, [
      ['alle-zahlen', total, 'Schau nur die Scheine an. Die anderen zählen hier nicht.'],
      ['muenzen-anzahl', notes.length, COUNT_HINT('Scheine')],
    ]),
    praise: 'Du hast nur die passenden Stücke gezählt.',
  });
}

/** Stufe 3, AB II: a purchase with the notes only, the coins stay out. */
function notesPurchase(rng: Rng): Exercise {
  const { have, total, pictureKey, visual } = notesAndCoins(rng);
  const n = pickPerson(rng).name;
  const price = rng.int(3, Math.min(have - 2, 39));
  const thing = rng.pick(THINGS);
  const value = have - price;
  const context = `${n} kauft mit den Scheinen ${thing} für ${euro(price)}.`;
  const prompt = 'Wie viel Euro bleiben von den Scheinen übrig?';
  const before = 'Es bleiben';
  const after = '€ übrig.';
  return result(3, 2, `nur-kauf:${pictureKey}:${price}:${thing}`, {
    context,
    prompt,
    visual,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Wie viel Euro sind nur die Scheine?', 'Die Münzen brauchst du nicht.'],
    steps: [`Die Scheine sind ${euro(have)}.`, `${have} − ${price} = ${value}`, answerLine(before, value, after)],
    bugs: bugList(value, [
      ['alle-zahlen', total - price, 'Schau nur die Scheine an. Die anderen zählen hier nicht.'],
      ['plus-minus-getauscht', have + price, HINT_RECHENART],
    ]),
    praise: 'Du hast nur die passenden Stücke benutzt.',
  });
}

/** Stufe 3, AB III: what the notes lack for a price, the coins stay out. */
function notesGap(rng: Rng): Exercise {
  let picture = notesAndCoins(rng);
  while (picture.total > MAX_PRICE - 10) picture = notesAndCoins(rng);
  const { have, total, pictureKey, visual } = picture;
  // the price is above the notes and the coins together, so the coins cannot be the point of the sum
  const price = rng.int(total + 2, MAX_PRICE);
  const thing = wantedFor(rng, price);
  const value = price - have;
  const context = `${thing} kostet ${euro(price)}.`;
  const prompt = 'Wie viel Euro fehlen zu den Scheinen?';
  const before = 'Es fehlen noch';
  return result(3, 3, `nur-fehlt:${pictureKey}:${price}:${thing}`, {
    context,
    prompt,
    visual,
    answer: sentenceAnswer(value, before, '€.', prompt),
    hints: ['Wie viel Euro sind nur die Scheine?', 'Die Münzen brauchst du nicht.'],
    steps: [`Die Scheine sind ${euro(have)}.`, `${price} − ${have} = ${value}`, answerLine(before, value, '€.')],
    bugs: bugList(value, [
      ['alle-zahlen', price - total, 'Schau nur die Scheine an. Die anderen zählen hier nicht.'],
      ['plus-minus-getauscht', price + have, 'Der Preis ist das Ziel. Wie viel fehlt bis dahin?'],
    ]),
    praise: 'Du hast nur die passenden Stücke benutzt.',
  });
}

export const bildaufgabeSkill: SkillDef = {
  id: 'sachaufgaben.bildaufgabe',
  topicId: 'sachaufgaben',
  title: 'Bildaufgaben',
  description: 'Du schaust das Bild an und beantwortest die Frage.',
  stufen: {
    1: 'Ein Bild und eine Frage, Zahlen bis 20',
    2: 'Ein Satz und ein Bild, Zahlen bis 100',
    3: 'Nicht alles im Bild brauchst du',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return rng.chance(0.5) ? pictureSum(rng, 1) : pictureTakeAway(rng, 1);
      if (ab === 2) {
        const form = rng.pick(['summe', 'weg', 'geld'] as const);
        if (form === 'geld') return moneySmall(rng);
        return form === 'summe' ? pictureSum(rng, 2) : pictureTakeAway(rng, 2);
      }
      const form = rng.pick(['fehlt', 'anfang', 'geld'] as const);
      if (form === 'geld') return moneyGap(rng, 1);
      return form === 'fehlt' ? pictureGap(rng) : pictureStart(rng);
    }
    if (stufe === 2) {
      if (ab === 1) return rng.chance(0.5) ? tensSum(rng) : moneyLarge(rng, 1);
      if (ab === 2) return rng.chance(0.5) ? tensAway(rng) : moneyLarge(rng, 2);
      return rng.chance(0.5) ? tensGap(rng) : moneyGap(rng, 2);
    }
    if (ab === 1) {
      const form = rng.pick(['summe', 'mehr', 'geld'] as const);
      if (form === 'geld') return onlyNotes(rng);
      return form === 'summe' ? extraRowSum(rng) : extraRowDifference(rng);
    }
    if (ab === 2) return rng.chance(0.5) ? extraRowAway(rng) : notesPurchase(rng);
    return rng.chance(0.5) ? extraRowGap(rng) : notesGap(rng);
  },
};
