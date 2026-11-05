/**
 * Zwei Schritte (Knobel, an Extra: one step is core in Klasse 2, docs/research.md §2.2).
 * The Stufe chooses the content (§6), the AB level the demand inside it:
 * Stufe 1, two additions, ≤ 20. AB I: small numbers. AB II: over the ten. AB III: 'mehr als' plus 'zusammen', or the second step is missing.
 * Stufe 2, plus then minus, ≤ 100. AB I: within a ten, with a field for each step. AB II: over a ten, as one number.
 * AB III: the start or the second change is missing.
 * Stufe 3, buy two things, then Rückgeld. AB I: from 20 €, with a field for each step. AB II: from 50 €, as one number.
 * AB III: the second price or the money at the start is missing.
 */
import { MINUS, fmtQty } from '../../core/format';
import type { Exercise, MultiField, Rng, SkillDef } from '../../core/types';
import { PEOPLE, build, bugList, multiBugs, pickPerson, pickTwo, targetAb } from '../shared';
import { HINT_RECHENART, answerLine, crossingSum, euroPieces, sentenceAnswer, spokenTask } from './helpers';

const KMK = ['ZO.sachrechnen', 'PK.problemloesen', 'PK.modellieren'];

const NOCH_NICHT_FERTIG = 'Das ist erst der erste Schritt. Rechne noch weiter.';

const euro = (n: number) => fmtQty(n, '€');

/** Stufe 1, AB I and II. */
function twoAdditions(rng: Rng, ab: 1 | 2): Exercise {
  const [n, giver1, giver2] = rng.sample(PEOPLE, 3).map((person) => person.name);
  // AB I stays up to 10. AB II goes over the ten in the first or in the second step, and never stops on the ten.
  const a = ab === 1 ? rng.int(2, 5) : rng.int(6, 9);
  let b = ab === 1 ? rng.int(2, 3) : rng.int(3, 5);
  if (ab === 2 && a + b === 10) b += 1;
  const first = a + b;
  const c = ab === 1 ? rng.int(2, Math.max(2, 10 - first)) : rng.int(Math.max(3, 11 - first), Math.min(8, 20 - first));
  const value = first + c;
  const stories = [
    { id: 'murmeln', context: `${n} hat ${a} Murmeln. ${n} bekommt ${b} Murmeln von ${giver1} und ${c} von ${giver2}.`, question: `Wie viele Murmeln hat ${n} jetzt?`, before: `${n} hat jetzt`, after: 'Murmeln.' },
    { id: 'spielplatz', context: `Auf dem Spielplatz sind ${a} Kinder. Erst kommen ${b} Kinder, dann ${c} Kinder.`, question: 'Wie viele Kinder sind jetzt dort?', before: 'Jetzt sind dort', after: 'Kinder.' },
    { id: 'korb', context: `Im Korb sind ${a} Äpfel. Papa legt ${b} Äpfel dazu, dann noch ${c} Äpfel.`, question: 'Wie viele Äpfel sind jetzt dort?', before: 'Im Korb sind jetzt', after: 'Äpfel.' },
  ];
  const st = rng.pick(stories);
  return build(zweiSchritteSkill, 1, {
    key: `plus-plus:${st.id}:${a}:${b}:${c}`,
    ab,
    knobel: true,
    context: st.context,
    prompt: st.question,
    answer: sentenceAnswer(value, st.before, st.after, st.question),
    hints: ['Rechne zuerst den ersten Schritt.', 'Rechne dann mit deinem Ergebnis weiter.'],
    steps: [`Erst: ${a} + ${b} = ${first}`, `Dann: ${first} + ${c} = ${value}`, answerLine(st.before, value, st.after)],
    bugs: bugList(value, [
      ['erster-schritt', first, NOCH_NICHT_FERTIG],
      ['start-vergessen', b + c, `Am Anfang sind es schon ${a}. Die gehören auch dazu.`],
    ]),
    praise: 'Du hast beide Schritte nacheinander gerechnet.',
    srText: spokenTask(st.context, st.question),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: 'q hat b mehr', then both together: a + b, then a + that. */
function moreThenTogether(rng: Rng): Exercise {
  const [p, q] = pickTwo(rng);
  const noun = rng.pick(['Murmeln', 'Sticker', 'Karten']);
  const a = rng.int(3, 8);
  const b = rng.int(2, Math.min(6, 20 - 2 * a));
  const second = a + b;
  const value = a + second;
  const context = `${p.name} hat ${a} ${noun}. ${q.name} hat ${b} ${noun} mehr.`;
  const question = `Wie viele ${noun} haben beide zusammen?`;
  const before = 'Beide haben zusammen';
  const after = `${noun}.`;
  return build(zweiSchritteSkill, 1, {
    key: `mehr-zusammen:${noun}:${a}:${b}`,
    ab: 3,
    knobel: true,
    context,
    prompt: question,
    answer: sentenceAnswer(value, before, after, question),
    hints: [`Wie viele ${noun} hat ${q.name}? Rechne das zuerst.`, 'Nimm dann beide Kinder zusammen.'],
    steps: [`Erst: ${a} + ${b} = ${second}`, `Dann: ${a} + ${second} = ${value}`, answerLine(before, value, after)],
    bugs: bugList(value, [
      ['erster-schritt', second, `Das hat ${q.name}. Rechne noch weiter.`],
      ['start-vergessen', a + b + b, `${p.name} hat ${a}. Rechne mit dem Ergebnis von ${q.name} weiter.`],
    ]),
    praise: 'Du hast zuerst die fehlende Zahl gesucht.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: the second addition is what is asked. */
function secondMissing(rng: Rng): Exercise {
  const n = pickPerson(rng).name;
  const noun = rng.pick(['Murmeln', 'Sticker', 'Karten']);
  const a = rng.int(3, 8);
  const b = rng.int(2, 5);
  const first = a + b;
  // never one of the numbers of the story
  let value = rng.int(2, Math.min(7, 20 - first));
  while (value === a || value === b) value = rng.int(2, Math.min(7, 20 - first));
  const end = first + value;
  const context = `${n} hat ${a} ${noun} und bekommt ${b} ${noun}. Am Ende hat ${n} ${end} ${noun}.`;
  const question = `Wie viele ${noun} bekommt ${n} danach?`;
  const before = `${n} bekommt danach`;
  const after = `${noun}.`;
  return build(zweiSchritteSkill, 1, {
    key: `zweite-fehlt:${noun}:${a}:${b}:${end}`,
    ab: 3,
    knobel: true,
    context,
    prompt: question,
    answer: sentenceAnswer(value, before, after, question),
    hints: ['Wie viele sind es nach dem ersten Schritt?', 'Wie weit ist es von dort bis zum Ende?'],
    steps: [`Erst: ${a} + ${b} = ${first}`, `Dann: ${end} ${MINUS} ${first} = ${value}`, answerLine(before, value, after)],
    bugs: bugList(value, [
      ['erster-schritt', first, NOCH_NICHT_FERTIG],
      ['start-vergessen', end - b, `Am Anfang sind es schon ${a}. Die gehören auch dazu.`],
    ]),
    praise: 'Du hast den ersten Schritt mitgerechnet.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

const PLUS_MINUS_STORIES = (n: string, a: number, b: number, c: number) => [
  { id: 'schulhof', noun: 'Kinder', context: `Auf dem Schulhof sind ${a} Kinder. Erst kommen ${b} Kinder, dann gehen ${c} Kinder.`, question: 'Wie viele Kinder sind jetzt dort?', before: 'Jetzt sind dort' },
  { id: 'sticker', noun: 'Sticker', context: `${n} hat ${a} Sticker. ${n} bekommt ${b} Sticker und verschenkt ${c} Sticker.`, question: `Wie viele Sticker hat ${n} jetzt?`, before: `${n} hat jetzt` },
  { id: 'huehner', noun: 'Hühner', context: `Im Stall sind ${a} Hühner. Erst kommen ${b} Hühner, dann laufen ${c} Hühner weg.`, question: 'Wie viele Hühner sind jetzt dort?', before: 'Jetzt sind dort' },
  { id: 'kekse', noun: 'Kekse', context: `${n} backt ${a} Kekse. ${n} backt noch ${b} Kekse und verschenkt ${c} Kekse.`, question: `Wie viele Kekse hat ${n} jetzt?`, before: `${n} hat jetzt` },
];

/** Stufe 2, AB I: within a ten, with a field for each step. */
function plusThenMinusFields(rng: Rng): Exercise {
  const n = pickPerson(rng).name;
  const oa = rng.int(1, 4);
  const ob = rng.int(1, 4);
  const a = rng.int(1, 5) * 10 + oa;
  const b = rng.int(1, 3) * 10 + ob;
  const first = a + b;
  const c = rng.int(2, Math.max(2, oa + ob));
  const value = first - c;
  const st = rng.pick(PLUS_MINUS_STORIES(n, a, b, c));
  const fields: MultiField[] = [
    { id: 'erst', value: first, before: 'Nach dem ersten Schritt:', after: st.noun, label: 'Ergebnis nach dem ersten Schritt' },
    { id: 'ende', value, before: 'Am Ende:', after: `${st.noun}.`, label: 'Ergebnis am Ende' },
  ];
  return build(zweiSchritteSkill, 2, {
    key: `plus-minus:${st.id}:${a}:${b}:${c}`,
    ab: 1,
    knobel: true,
    context: st.context,
    prompt: st.question,
    answer: { kind: 'multi', fields },
    hints: ['Was passiert zuerst? Rechne das zuerst.', 'Was passiert danach? Rechne mit deinem Ergebnis weiter.'],
    steps: [`Erst: ${a} + ${b} = ${first}`, `Dann: ${first} ${MINUS} ${c} = ${value}`, `Nach dem ersten Schritt sind es ${first} ${st.noun}, am Ende ${value} ${st.noun}.`],
    bugs: multiBugs(
      [
        { id: 'erster-schritt', match: { erst: first, ende: first }, hint: NOCH_NICHT_FERTIG },
        { id: 'plus-minus-getauscht', match: { erst: first, ende: first + c }, hint: HINT_RECHENART },
      ],
      fields,
    ),
    praise: 'Du hast beide Schritte nacheinander gerechnet.',
    srText: spokenTask(st.context, st.question),
    kmk: KMK,
  });
}

/** Stufe 2, AB II: over a ten, the child keeps the first step in mind. */
function plusThenMinusNumber(rng: Rng): Exercise {
  const n = pickPerson(rng).name;
  const [a, b] = crossingSum(rng, 1);
  const first = a + b;
  const ones = first % 10;
  // the second step crosses a ten as well, where the ones allow it
  const c = rng.int(Math.max(3, Math.min(ones + 1, 9)), 9);
  const value = first - c;
  const st = rng.pick(PLUS_MINUS_STORIES(n, a, b, c));
  const after = `${st.noun}.`;
  return build(zweiSchritteSkill, 2, {
    key: `plus-minus-zahl:${st.id}:${a}:${b}:${c}`,
    ab: 2,
    knobel: true,
    context: st.context,
    prompt: st.question,
    answer: sentenceAnswer(value, st.before, after, st.question),
    hints: ['Was passiert zuerst? Rechne das zuerst.', 'Was passiert danach? Rechne mit deinem Ergebnis weiter.'],
    steps: [`Erst: ${a} + ${b} = ${first}`, `Dann: ${first} ${MINUS} ${c} = ${value}`, answerLine(st.before, value, after)],
    bugs: bugList(value, [
      ['erster-schritt', first, NOCH_NICHT_FERTIG],
      ['plus-minus-getauscht', first + c, HINT_RECHENART],
    ]),
    praise: 'Du hast beide Schritte nacheinander gerechnet.',
    srText: spokenTask(st.context, st.question),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: the start is missing. Backwards: the end plus what went away, minus what came. */
function startMissing(rng: Rng): Exercise {
  const noun = rng.pick(['Kinder', 'Hühner']);
  const place = noun === 'Kinder' ? 'Schulhof' : 'Hof';
  const start = rng.int(14, 50);
  const b = rng.int(6, 29);
  const c = rng.int(4, Math.min(19, start + b - 5));
  const end = start + b - c;
  const beforeLast = end + c;
  const context = `Erst kommen ${b} ${noun}, dann gehen ${c} ${noun}. Jetzt sind ${end} ${noun} auf dem ${place}.`;
  const question = `Wie viele ${noun} sind am Anfang dort?`;
  const before = 'Am Anfang sind dort';
  const after = `${noun}.`;
  return build(zweiSchritteSkill, 2, {
    key: `anfang-fehlt:${noun}:${b}:${c}:${end}`,
    ab: 3,
    knobel: true,
    context,
    prompt: question,
    answer: sentenceAnswer(start, before, after, question),
    hints: ['Fang am Ende an. Geh die Geschichte rückwärts.', 'Rückwärts kommt erst das Weggegangene wieder dazu.'],
    steps: [`Rückwärts: ${end} + ${c} = ${beforeLast}`, `Dann: ${beforeLast} ${MINUS} ${b} = ${start}`, answerLine(before, start, after)],
    bugs: bugList(start, [
      ['erster-schritt', beforeLast, NOCH_NICHT_FERTIG],
      ['plus-minus-getauscht', end + b - c, 'Rückwärts geht alles anders herum.'],
    ]),
    praise: 'Du hast die Geschichte rückwärts gedacht.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: how many went away is asked. */
function changeMissing(rng: Rng): Exercise {
  const n = pickPerson(rng).name;
  const noun = rng.pick(['Sticker', 'Kekse', 'Karten']);
  const a = rng.int(14, 50);
  const b = rng.int(6, 30);
  const first = a + b;
  const value = rng.int(4, Math.min(29, first - 2));
  const end = first - value;
  const context = `${n} hat ${a} ${noun} und bekommt ${b} ${noun}. ${n} verschenkt einige ${noun} und hat dann ${end} ${noun}.`;
  const prompt = `Wie viele ${noun} verschenkt ${n}?`;
  const before = `${n} verschenkt`;
  const after = `${noun}.`;
  return build(zweiSchritteSkill, 2, {
    key: `zweite-fehlt-minus:${noun}:${a}:${b}:${end}`,
    ab: 3,
    knobel: true,
    context,
    prompt,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Wie viele sind es nach dem ersten Schritt?', 'Wie weit ist es von dort bis zum Ende?'],
    steps: [`Erst: ${a} + ${b} = ${first}`, `Dann: ${first} ${MINUS} ${end} = ${value}`, answerLine(before, value, after)],
    bugs: bugList(value, [
      ['erster-schritt', first, NOCH_NICHT_FERTIG],
      ['plus-minus-getauscht', a + b + end, 'Am Ende sind es weniger. Wie viele fehlen?'],
    ]),
    praise: 'Du hast den ersten Schritt mitgerechnet.',
    srText: spokenTask(context, prompt),
    kmk: KMK,
  });
}

const GOODS = [
  { name: 'Ball', accusative: 'einen Ball', nominative: 'der Ball' },
  { name: 'Buch', accusative: 'ein Buch', nominative: 'das Buch' },
  { name: 'Spiel', accusative: 'ein Spiel', nominative: 'das Spiel' },
  { name: 'Puzzle', accusative: 'ein Puzzle', nominative: 'das Puzzle' },
];

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Stufe 3, AB I and II: two prices, then the Rückgeld. AB I from 20 € with a field for each step, AB II from 50 € with one number. */
function buyAndChange(rng: Rng, ab: 1 | 2): Exercise {
  const n = pickPerson(rng).name;
  const [x, y] = rng.sample(GOODS, 2);
  // over the ten, with a field for each step: not less to do than plus then minus on Stufe 2
  const paid = ab === 1 ? 20 : 50;
  let p: number;
  let q: number;
  // the Rückgeld is never one of the prices: its number would stand in the story
  do {
    p = ab === 1 ? rng.int(4, 9) : rng.int(11, 19);
    q = ab === 1 ? rng.int(Math.max(3, 11 - p), 8) : rng.int(6, 18);
  } while (paid - p - q === p || paid - p - q === q);
  const total = p + q;
  const value = paid - total;
  const context = `Ein ${x.name} kostet ${euro(p)}, ein ${y.name} ${euro(q)}. ${n} kauft beides und bezahlt mit ${euro(paid)}.`;
  const question = `Wie viel Euro bekommt ${n} zurück?`;
  const before = `${n} bekommt`;
  const after = '€ zurück.';
  const key = `kaufen:${x.name}:${y.name}:${paid}:${p}:${q}`;
  const hints = ['Rechne zuerst die Preise zusammen.', `Wie viel fehlt dann noch bis ${euro(paid)}?`];
  const steps = [`Erst: ${euro(p)} + ${euro(q)} = ${euro(total)}`, `Dann: ${euro(paid)} ${MINUS} ${euro(total)} = ${euro(value)}`];
  const base = {
    knobel: true,
    context,
    prompt: question,
    visual: { type: 'money' as const, items: euroPieces(paid) },
    hints,
    praise: 'Du hast zuerst beide Preise gerechnet.',
    srText: spokenTask(context, question),
    kmk: KMK,
  };
  if (ab === 2) {
    return build(zweiSchritteSkill, 3, {
      ...base,
      ab,
      key,
      answer: sentenceAnswer(value, before, after, question),
      steps: [...steps, `${before} ${euro(value)} zurück.`],
      bugs: bugList(value, [
        ['rueckgeld-preis', total, `Wie viel fehlt von ${euro(total)} bis ${euro(paid)}?`],
        ['erster-schritt', paid - p, 'Es sind beide Preise. Zieh beide ab.'],
        ['plus-minus-getauscht', paid + total, HINT_RECHENART],
      ]),
    });
  }
  const fields: MultiField[] = [
    { id: 'kosten', value: total, before: 'Beides kostet', after: '€', label: 'Beide Preise zusammen' },
    { id: 'zurueck', value, before: `${n} bekommt`, after: '€ zurück.', label: 'Rückgeld' },
  ];
  return build(zweiSchritteSkill, 3, {
    ...base,
    ab,
    key: `${key}:felder`,
    answer: { kind: 'multi', fields },
    steps: [...steps, `Beides kostet ${euro(total)}. Zurück kommen ${euro(value)}.`],
    bugs: multiBugs(
      [
        { id: 'rueckgeld-preis', match: { kosten: total, zurueck: total }, hint: `Wie viel fehlt vom Preis bis ${euro(paid)}?` },
        { id: 'erster-schritt', match: { kosten: p, zurueck: paid - p }, hint: 'Es sind beide Preise. Zieh beide ab.' },
        { id: 'plus-minus-getauscht', match: { kosten: total, zurueck: paid + total }, hint: HINT_RECHENART },
      ],
      fields,
    ),
  });
}

/** Stufe 3, AB III: the Rückgeld is known, the second price is asked. */
function secondPriceMissing(rng: Rng): Exercise {
  const n = pickPerson(rng).name;
  const [x, y] = rng.sample(GOODS, 2);
  const paid = rng.pick([20, 50]);
  const p = rng.int(3, paid === 20 ? 9 : 19);
  const back = rng.int(2, paid === 20 ? 6 : 15);
  const total = paid - back;
  const value = total - p;
  const context = `${n} kauft ${x.accusative} für ${euro(p)} und ${y.accusative}. ${n} bezahlt mit ${euro(paid)} und bekommt ${euro(back)} zurück.`;
  const question = `Wie viel Euro kostet ${y.nominative}?`;
  const before = `${capital(y.nominative)} kostet`;
  return build(zweiSchritteSkill, 3, {
    key: `preis-fehlt:${x.name}:${y.name}:${paid}:${p}:${back}`,
    ab: 3,
    knobel: true,
    context,
    prompt: question,
    visual: { type: 'money', items: euroPieces(paid) },
    answer: sentenceAnswer(value, before, '€.', question),
    hints: ['Wie viel kostet beides zusammen?', 'Nimm dann den bekannten Preis weg.'],
    steps: [`Erst: ${euro(paid)} ${MINUS} ${euro(back)} = ${euro(total)}`, `Dann: ${euro(total)} ${MINUS} ${euro(p)} = ${euro(value)}`, answerLine(before, value, '€.')],
    bugs: bugList(value, [
      ['erster-schritt', total, 'Das kostet beides zusammen. Rechne noch weiter.'],
      ['rueckgeld-preis', paid - p, 'Das Rückgeld kommt wieder zurück. Rechne es auch ab.'],
    ]),
    praise: 'Du hast vom Rückgeld auf den Preis geschlossen.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

/**
 * Stufe 3, AB III: the money at the start is asked. Not the money paid at the till: nobody pays with 37 €, and only 20 or 50 € as an answer would
 * be no task.
 */
function startMoneyMissing(rng: Rng): Exercise {
  const n = pickPerson(rng).name;
  const [x, y] = rng.sample(GOODS, 2);
  const p = rng.int(3, 19);
  const q = rng.int(3, 18);
  const back = rng.int(2, 15);
  const total = p + q;
  const value = total + back;
  const context = `Ein ${x.name} kostet ${euro(p)}, ein ${y.name} ${euro(q)}. ${n} kauft beides und hat dann ${euro(back)} übrig.`;
  const question = `Wie viel Euro hat ${n} am Anfang?`;
  const before = `${n} hat am Anfang`;
  const after = '€.';
  return build(zweiSchritteSkill, 3, {
    key: `anfang-fehlt:${x.name}:${y.name}:${p}:${q}:${back}`,
    ab: 3,
    knobel: true,
    context,
    prompt: question,
    answer: sentenceAnswer(value, before, after, question),
    hints: ['Wie viel kostet beides zusammen?', 'Das übrige Geld gehört auch zum Geld am Anfang.'],
    steps: [`Erst: ${euro(p)} + ${euro(q)} = ${euro(total)}`, `Dann: ${euro(total)} + ${euro(back)} = ${euro(value)}`, answerLine(before, value, after)],
    bugs: bugList(value, [
      ['erster-schritt', total, 'Das kostet beides zusammen. Rechne noch weiter.'],
      ['plus-minus-getauscht', Math.abs(total - back), 'Das übrige Geld gehört auch zum Geld am Anfang.'],
    ]),
    praise: 'Du hast vom Rest auf den Anfang geschlossen.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

export const zweiSchritteSkill: SkillDef = {
  id: 'sachaufgaben.zwei-schritte',
  topicId: 'sachaufgaben',
  title: 'Zwei Schritte',
  description: 'Du rechnest zwei Schritte nacheinander.',
  stufen: {
    1: 'Zweimal plus, Zahlen bis 20',
    2: 'Erst plus, dann minus, Zahlen bis 100',
    3: '2 Sachen kaufen, dann das Rückgeld',
  },
  kmk: KMK,
  optional: 'extra',
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab !== 3) return twoAdditions(rng, ab);
      return rng.chance(0.5) ? moreThenTogether(rng) : secondMissing(rng);
    }
    if (stufe === 2) {
      if (ab === 1) return plusThenMinusFields(rng);
      if (ab === 2) return plusThenMinusNumber(rng);
      return rng.chance(0.5) ? startMissing(rng) : changeMissing(rng);
    }
    if (ab !== 3) return buyAndChange(rng, ab);
    return rng.chance(0.5) ? secondPriceMissing(rng) : startMoneyMissing(rng);
  },
};
