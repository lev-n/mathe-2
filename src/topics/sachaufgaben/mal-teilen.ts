/**
 * Geschichten mit gleich großen Gruppen. The Stufe chooses the content (docs/research.md §6), the AB level the demand inside it:
 * Stufe 1, equal groups with Kernaufgaben, ≤ 50, with a picture. AB I: up to 5 groups. AB II: more groups. AB III: one group comes or goes.
 * Stufe 2, Aufteilen and Verteilen, Kern divisors 2, 5, 10, ≤ 100. AB I: up to 5 parts, direct words. AB II: up to 10 parts, also
 * 'teilen sich'. AB III: the verb of the other way, or what is given out in total.
 * Stufe 3, which operation fits (also unequal groups, where mal does not fit). AB I: choose the calculation. AB II: choose it and
 * calculate. AB III: which story fits a calculation; with extras on also what a Rest means in the story.
 */
import { DIV, TIMES } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, makeChoice, pickPerson, pickTwo, targetAb } from '../shared';
import { HINT_GLEICH_GROSS, answerLine, hintsWithoutAnswer, sentenceAnswer, spokenTask, type BugCandidate } from './helpers';

const KMK = ['ZO.operationen', 'ZO.sachrechnen', 'PK.modellieren'];

const KERN_SIZES = [2, 5, 10];

const repeat = (count: number, size: number) => Array.from({ length: count }, () => size);

/** How many parts: not as many as the divisor, as 25 : 5 = 5 has its answer in the story. */
function partsFor(rng: Rng, k: number, lo: number, hi: number): number {
  let q = rng.int(lo, hi);
  while (q === k) q = rng.int(lo, hi);
  return q;
}

/** Groups, what is in them, and the same group as a thing that comes or goes. */
const ONE_MORE: readonly { id: string; group: string; groups: string; things: string; dative: string }[] = [
  { id: 'tueten', group: 'Tüte', groups: 'Tüten', things: 'Äpfel', dative: 'Äpfeln' },
  { id: 'kisten', group: 'Kiste', groups: 'Kisten', things: 'Bälle', dative: 'Bällen' },
  { id: 'dosen', group: 'Dose', groups: 'Dosen', things: 'Kekse', dative: 'Keksen' },
  { id: 'taschen', group: 'Tasche', groups: 'Taschen', things: 'Bücher', dative: 'Büchern' },
];

/** Groups and what is in them, with a story sentence in present tense. */
const GROUP_STORIES: readonly { id: string; things: string; dative: string; make: (n: string, groups: number, size: number) => string; question: (n: string) => string; before: (n: string) => string }[] = [
  {
    id: 'tueten', things: 'Äpfel', dative: 'Äpfeln',
    make: (n, g, s) => `${n} hat ${g} Tüten. In jeder Tüte sind ${s} Äpfel.`,
    question: (n) => `Wie viele Äpfel hat ${n}?`, before: (n) => `${n} hat`,
  },
  {
    id: 'teller', things: 'Kekse', dative: 'Keksen',
    make: (_, g, s) => `Auf dem Tisch stehen ${g} Teller. Auf jedem Teller liegen ${s} Kekse.`,
    question: () => 'Wie viele Kekse sind das zusammen?', before: () => 'Das sind zusammen',
  },
  {
    id: 'reihen', things: 'Stühle', dative: 'Stühlen',
    make: (_, g, s) => `Im Saal sind ${g} Reihen. In jeder Reihe stehen ${s} Stühle.`,
    question: () => 'Wie viele Stühle stehen im Saal?', before: () => 'Im Saal stehen',
  },
  {
    id: 'kisten', things: 'Bälle', dative: 'Bällen',
    make: (_, g, s) => `Die Klasse hat ${g} Kisten. In jeder Kiste sind ${s} Bälle.`,
    question: () => 'Wie viele Bälle hat die Klasse?', before: () => 'Die Klasse hat',
  },
];

/** Stufe 1, AB I and II: equal groups with a picture of the story. */
function equalGroups(rng: Rng, ab: 1 | 2): Exercise {
  const st = rng.pick(GROUP_STORIES);
  const size = rng.pick(KERN_SIZES);
  // up to 50: 5 tens, 9 fives, 10 twos
  const groups = ab === 1 ? rng.int(2, 5) : size === 10 ? rng.int(4, 5) : rng.int(6, size === 5 ? 9 : 10);
  const value = groups * size;
  const n = pickPerson(rng).name;
  const context = st.make(n, groups, size);
  const question = st.question(n);
  const before = st.before(n);
  const after = `${st.things}.`;
  const sum = groups <= 4 ? `${repeat(groups, size).join(' + ')} = ${value}` : `${groups} ${TIMES} ${size} = ${value}`;
  return build(malTeilenSkill, 1, {
    key: `gruppen:${st.id}:${groups}:${size}`,
    ab,
    context,
    prompt: question,
    visual: { type: 'dotArray', groups: repeat(groups, size) },
    answer: sentenceAnswer(value, before, after, question),
    hints: hintsWithoutAnswer([`Du hast ${groups} gleich große Gruppen. In jeder Gruppe sind ${size}.`, `Rechne ${groups}-mal die ${size}.`], value, 'Schau auf die gleich großen Gruppen.'),
    steps: [`Das sind ${groups} Gruppen mit je ${size} ${st.dative}.`, sum, answerLine(before, value, after)],
    bugs: bugList(value, [['mal-als-plus', groups + size, `${groups} ${TIMES} ${size} heißt ${groups}-mal die ${size}.`]]),
    praise: 'Du hast die gleich großen Gruppen erkannt.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: the picture shows the groups, and one group comes or goes: 'Tom bekommt noch 1 Tüte.' */
function oneGroupMoreOrLess(rng: Rng): Exercise {
  const st = rng.pick(ONE_MORE);
  const size = rng.pick(KERN_SIZES);
  const more = rng.chance(0.5);
  const shown = more ? rng.int(2, size === 10 ? 4 : 8) : rng.int(3, size === 10 ? 5 : 9);
  const now = more ? shown + 1 : shown - 1;
  const value = now * size;
  const n = pickPerson(rng).name;
  const context = `${n} hat ${shown} ${st.groups} mit je ${size} ${st.dative}. ${n} ${more ? 'bekommt noch' : 'verschenkt'} 1 ${st.group}.`;
  const question = `Wie viele ${st.things} hat ${n} dann?`;
  const before = `${n} hat dann`;
  const after = `${st.things}.`;
  return build(malTeilenSkill, 1, {
    key: `eine-${more ? 'mehr' : 'weniger'}:${st.id}:${shown}:${size}`,
    ab: 3,
    context,
    prompt: question,
    visual: { type: 'dotArray', groups: repeat(shown, size) },
    answer: sentenceAnswer(value, before, after, question),
    hints: [`Wie viele ${st.groups} sind es dann?`, `In jeder ${st.group} sind ${size} ${st.things}.`],
    steps: [`Dann sind es ${now} ${st.groups}.`, `${now} ${TIMES} ${size} = ${value}`, answerLine(before, value, after)],
    bugs: bugList(value, [
      ['gruppe-vergessen', shown * size, `Das sind die ${st.groups} im Bild. Was ändert sich dann?`],
      ['mal-als-plus', more ? shown * size + 1 : shown * size - 1, `Die ganze ${st.group} ${more ? 'kommt dazu' : 'geht weg'}, nicht nur 1 Punkt.`],
    ]),
    praise: 'Du hast die ganze Gruppe mitgerechnet.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

/** Stufe 2, AB I and II: Aufteilen and Verteilen. AB I up to 5 parts, AB II up to 10, also 'teilen sich'. */
function sharing(rng: Rng, ab: 1 | 2): Exercise {
  const k = rng.pick(KERN_SIZES);
  const q = ab === 1 ? partsFor(rng, k, 2, 5) : partsFor(rng, k, 6, 10);
  const total = k * q;
  const n = pickPerson(rng).name;
  const stories = [
    { id: 'aufteilen', context: `${total} Kinder bilden Gruppen. In jede Gruppe kommen ${k} Kinder.`, question: 'Wie viele Gruppen gibt es?', before: 'Es gibt', after: 'Gruppen.', groups: repeat(q, k), line: `Immer ${k} Kinder sind eine Gruppe.` },
    { id: 'tueten', context: `${total} Kekse kommen in Tüten. In jede Tüte kommen ${k} Kekse.`, question: 'Wie viele Tüten sind das?', before: 'Das sind', after: 'Tüten.', groups: repeat(q, k), line: `Immer ${k} Kekse sind eine Tüte.` },
    { id: 'verteilen', context: `${n} verteilt ${total} Kekse an ${k} Kinder. Jedes Kind bekommt gleich viele Kekse.`, question: 'Wie viele Kekse bekommt jedes Kind?', before: 'Jedes Kind bekommt', after: 'Kekse.', groups: repeat(k, q), line: `${total} Kekse gehen gerecht an ${k} Kinder.` },
    { id: 'stifte', context: `${total} Stifte gehen gerecht an ${k} Tische.`, question: 'Wie viele Stifte liegen auf jedem Tisch?', before: 'Auf jedem Tisch liegen', after: 'Stifte.', groups: repeat(k, q), line: `${total} Stifte gehen gerecht an ${k} Tische.` },
    ...(ab === 2 ? [{ id: 'teilen-sich', context: `${k} Kinder teilen sich ${total} Karten gerecht.`, question: 'Wie viele Karten hat jedes Kind dann?', before: 'Jedes Kind hat dann', after: 'Karten.', groups: repeat(k, q), line: `${total} Karten gehen gerecht an ${k} Kinder.` }] : []),
  ];
  const st = rng.pick(stories);
  return build(malTeilenSkill, 2, {
    key: `${st.id}:${total}:${k}`,
    ab,
    context: st.context,
    prompt: st.question,
    answer: sentenceAnswer(q, st.before, st.after, st.question),
    hints: hintsWithoutAnswer(['Teile in gleich große Gruppen.', `Wie oft passt die ${k} in die ${total}?`], q, 'Teile in gleich große Gruppen.'),
    steps: [st.line, { text: `${total} ${DIV} ${k} = ${q}`, visual: { type: 'dotArray', groups: st.groups } }, answerLine(st.before, q, st.after)],
    bugs: bugList(q, [['teilen-als-minus', total - k, `Teilen heißt: ${total} in gleich große Gruppen legen.`]]),
    praise: 'Du hast gerecht aufgeteilt.',
    srText: spokenTask(st.context, st.question),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: the words of the other way: 'verteilt' with the share given, or how many were given out in total. */
function sharingReversed(rng: Rng): Exercise {
  const k = rng.pick(KERN_SIZES);
  const q = partsFor(rng, k, 3, 10);
  const total = k * q;
  const n = pickPerson(rng).name;
  const kind = rng.pick(['kinder-gesucht', 'tueten-gleich', 'alle-gesucht'] as const);
  if (kind === 'alle-gesucht') {
    const context = `${n} verteilt Kekse an ${q} Kinder. Jedes Kind bekommt ${k} Kekse.`;
    const question = `Wie viele Kekse verteilt ${n}?`;
    const before = `${n} verteilt`;
    return build(malTeilenSkill, 2, {
      key: `${kind}:${q}:${k}`,
      ab: 3,
      context,
      prompt: question,
      answer: sentenceAnswer(total, before, 'Kekse.', question),
      hints: ['Hier fehlt die Zahl am Anfang: alle Kekse.', `Jedes Kind bekommt ${k}. Es sind ${q} Kinder.`],
      steps: ['Gesucht sind alle Kekse.', { text: `${q} ${TIMES} ${k} = ${total}`, visual: { type: 'dotArray', groups: repeat(q, k) } }, answerLine(before, total, 'Kekse.')],
      bugs: bugList(total, [['mal-als-plus', q + k, `${q} ${TIMES} ${k} heißt ${q}-mal die ${k}.`]]),
      praise: 'Du hast vom Teil auf das Ganze geschlossen.',
      srText: spokenTask(context, question),
      kmk: KMK,
    });
  }
  const st =
    kind === 'kinder-gesucht'
      ? { context: `${n} verteilt ${total} Kekse gerecht. Jedes Kind bekommt ${k} Kekse.`, question: 'Wie viele Kinder bekommen Kekse?', before: 'Es bekommen', after: 'Kinder Kekse.', groups: repeat(q, k), line: `Immer ${k} Kekse gehen an ein Kind.` }
      : { context: `${n} legt ${total} Kekse in ${k} Tüten. In jeder Tüte sind gleich viele Kekse.`, question: 'Wie viele Kekse sind in jeder Tüte?', before: 'In jeder Tüte sind', after: 'Kekse.', groups: repeat(k, q), line: `${total} Kekse gehen gerecht an ${k} Tüten.` };
  return build(malTeilenSkill, 2, {
    key: `${kind}:${total}:${k}`,
    ab: 3,
    context: st.context,
    prompt: st.question,
    answer: sentenceAnswer(q, st.before, st.after, st.question),
    hints: hintsWithoutAnswer(['Was weißt du schon? Was fehlt noch?', `Wie oft passt die ${k} in die ${total}?`], q, 'Was weißt du schon? Was fehlt noch?'),
    steps: [st.line, { text: `${total} ${DIV} ${k} = ${q}`, visual: { type: 'dotArray', groups: st.groups } }, answerLine(st.before, q, st.after)],
    bugs: bugList(q, [['teilen-als-minus', total - k, `Teilen heißt: ${total} in gleich große Gruppen legen.`]]),
    praise: 'Du hast auf die Frage geachtet.',
    srText: spokenTask(st.context, st.question),
    kmk: KMK,
  });
}

/** Stufe 3, AB I: choose the calculation. */
function whichOperation(rng: Rng): Exercise {
  const [p, q] = pickTwo(rng);
  // from 3 groups on: 2 · 2 and 2 + 2 are both right
  const groups = rng.int(3, 9);
  const size = rng.pick(KERN_SIZES);
  const total = groups * size;
  const kind = rng.pick(['mal', 'teilen', 'ungleich'] as const);
  // really unequal: 5 and 5 could be 2 · 5
  const [a, b] = rng.sample([3, 4, 5, 6, 7, 8, 9], 2).sort((x, y) => x - y);
  const stories = {
    mal: {
      prompt: 'Welche Rechnung passt?',
      context: `${p.name} hat ${groups} Tüten. In jeder Tüte sind ${size} Äpfel.`,
      correct: `${groups} ${TIMES} ${size}`,
      wrongs: [
        { label: `${groups} + ${size}`, whyWrong: `Das sind ${groups} gleich große Gruppen. Rechne ${groups}-mal die ${size}.` },
        { label: groups > size ? `${groups} ${DIV} ${size}` : `${size} ${DIV} ${groups}`, whyWrong: 'Du verteilst hier nichts. Alle Tüten kommen zusammen.' },
        { label: groups > size ? `${groups} − ${size}` : `${size} − ${groups}`, whyWrong: 'Hier geht nichts weg. Alle Tüten kommen zusammen.' },
      ],
      line: 'Hier sind gleich große Gruppen.',
    },
    teilen: {
      prompt: 'Welche Rechnung passt?',
      context: `${total} Kinder bilden Gruppen. In jede Gruppe kommen ${size} Kinder.`,
      correct: `${total} ${DIV} ${size}`,
      wrongs: [
        { label: `${total} − ${size}`, whyWrong: `Teilen heißt: ${total} in gleich große Gruppen legen.` },
        { label: `${total} ${TIMES} ${size}`, whyWrong: 'Die Kinder sind schon alle da. Du teilst die Kinder nur ein.' },
        { label: `${total} + ${size}`, whyWrong: 'Hier kommt niemand dazu. Du teilst die Kinder ein.' },
      ],
      line: 'Hier teilst du in gleich große Gruppen.',
    },
    ungleich: {
      prompt: 'Welche Rechnung findet alle Äpfel?',
      context: `${p.name} hat ${a} Äpfel. ${q.name} hat ${b} Äpfel.`,
      correct: `${a} + ${b}`,
      wrongs: [
        { label: `${a} ${TIMES} ${b}`, whyWrong: HINT_GLEICH_GROSS },
        { label: `${b} ${DIV} ${a}`, whyWrong: 'Hier verteilst du nichts. Beide Mengen kommen zusammen.' },
      ],
      line: 'Die Gruppen sind nicht gleich groß. Beide Mengen kommen zusammen.',
    },
  }[kind];
  return build(malTeilenSkill, 3, {
    key: `welche:${kind}:${kind === 'ungleich' ? `${a}:${b}` : `${groups}:${size}`}`,
    ab: 1,
    context: stories.context,
    prompt: stories.prompt,
    answer: makeChoice(rng, { label: stories.correct }, stories.wrongs),
    hints: ['Schau: Gibt es gleich große Gruppen?', 'Kommen alle zusammen, oder teilst du ein?'],
    steps: [stories.line, `Die Rechnung ist ${stories.correct}.`],
    praise: 'Du hast die Rechenart zur Geschichte gefunden.',
    srText: spokenTask(stories.context, stories.prompt),
    kmk: KMK,
  });
}

/** Stufe 3, AB II: mixed stories without a hint in the task: the child finds the operation and calculates. */
function operationAndResult(rng: Rng): Exercise {
  const [p, q] = pickTwo(rng);
  const size = rng.pick(KERN_SIZES);
  const groups = partsFor(rng, size, 3, 10);
  const total = groups * size;
  const [a, b] = rng.sample([12, 14, 15, 16, 18, 21, 23, 24, 27, 32, 35, 36], 2).sort((x, y) => x - y);
  const kind = rng.pick(['mal', 'teilen', 'verteilen', 'ungleich'] as const);
  const stories = {
    mal: { context: `Im Saal sind ${groups} Reihen. In jeder Reihe stehen ${size} Stühle.`, question: 'Wie viele Stühle stehen im Saal?', before: 'Im Saal stehen', after: 'Stühle.', value: total, calc: `${groups} ${TIMES} ${size} = ${total}`, line: 'Hier sind gleich große Gruppen.', bugs: [['mal-als-plus', groups + size, `Das sind ${groups} gleich große Gruppen. Rechne ${groups}-mal die ${size}.`]] as BugCandidate[], key: `${groups}:${size}` },
    teilen: { context: `${total} Kinder bilden Gruppen. In jede Gruppe kommen ${size} Kinder.`, question: 'Wie viele Gruppen gibt es?', before: 'Es gibt', after: 'Gruppen.', value: groups, calc: `${total} ${DIV} ${size} = ${groups}`, line: 'Hier teilst du in gleich große Gruppen.', bugs: [['teilen-als-minus', total - size, `Teilen heißt: ${total} in gleich große Gruppen legen.`]] as BugCandidate[], key: `${total}:${size}` },
    verteilen: { context: `${total} Stifte gehen gerecht an ${size} Tische.`, question: 'Wie viele Stifte liegen auf jedem Tisch?', before: 'Auf jedem Tisch liegen', after: 'Stifte.', value: groups, calc: `${total} ${DIV} ${size} = ${groups}`, line: 'Hier teilst du gerecht.', bugs: [['teilen-als-minus', total - size, `Teilen heißt: ${total} in gleich große Gruppen legen.`]] as BugCandidate[], key: `${total}:${size}` },
    ungleich: { context: `${p.name} hat ${a} Murmeln. ${q.name} hat ${b} Murmeln.`, question: 'Wie viele Murmeln sind das zusammen?', before: 'Das sind zusammen', after: 'Murmeln.', value: a + b, calc: `${a} + ${b} = ${a + b}`, line: 'Die Gruppen sind nicht gleich groß. Beide Mengen kommen zusammen.', bugs: [['plus-minus-getauscht', b - a, 'Gefragt sind beide Mengen zusammen.']] as BugCandidate[], key: `${a}:${b}` },
  }[kind];
  return build(malTeilenSkill, 3, {
    key: `rechne:${kind}:${stories.key}`,
    ab: 2,
    context: stories.context,
    prompt: stories.question,
    answer: sentenceAnswer(stories.value, stories.before, stories.after, stories.question),
    hints: ['Schau: Gibt es gleich große Gruppen?', 'Kommen alle zusammen, oder teilst du ein?'],
    steps: [stories.line, stories.calc, answerLine(stories.before, stories.value, stories.after)],
    bugs: bugList(stories.value, stories.bugs),
    praise: 'Du hast die Rechenart zur Geschichte gefunden.',
    srText: spokenTask(stories.context, stories.question),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: from the calculation back to the story. */
function storyForCalculation(rng: Rng): Exercise {
  const n = pickPerson(rng).name;
  const mal = rng.chance(0.5);
  const groups = rng.int(3, 9);
  const size = rng.pick(KERN_SIZES);
  const total = groups * size;
  const x = mal ? groups : total;
  const y = size;
  const calc = mal ? `${x} ${TIMES} ${y}` : `${x} ${DIV} ${y}`;
  const [big, little] = x > y ? [x, y] : [y, x];
  const right = mal ? `${n} hat ${x} Tüten. In jeder Tüte sind ${y} Äpfel.` : `${x} Kinder bilden Gruppen. In jede Gruppe kommen ${y} Kinder.`;
  const wrongs = [
    { label: `${n} hat ${big} Äpfel. ${n} bekommt ${little} Äpfel dazu.`, whyWrong: 'Hier kommt etwas dazu. Schau auf das Rechenzeichen.' },
    { label: `${n} hat ${big} Äpfel. ${n} verschenkt ${little} Äpfel.`, whyWrong: 'Hier geht etwas weg. Schau auf das Rechenzeichen.' },
    mal
      ? { label: `${big} Kinder bilden Gruppen. In jede Gruppe kommen ${little} Kinder.`, whyWrong: 'Hier teilst du die Kinder ein. Schau auf das Rechenzeichen.' }
      : { label: `${n} hat ${x} Tüten. In jeder Tüte sind ${y} Äpfel.`, whyWrong: 'Hier kommen gleich große Gruppen zusammen. Schau auf das Rechenzeichen.' },
  ];
  const prompt = `Welche Geschichte passt zu ${calc}?`;
  return build(malTeilenSkill, 3, {
    key: `geschichte:${mal ? 'mal' : 'teilen'}:${x}:${y}`,
    ab: 3,
    prompt,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: ['Schau zuerst auf das Rechenzeichen.', mal ? 'Mal: gleich große Gruppen kommen zusammen.' : 'Geteilt: Alles ist da, du teilst nur ein.'],
    steps: [mal ? `${calc}: ${x}-mal die ${y}.` : `${calc}: ${x} in Gruppen von ${y} einteilen.`, `Also passt: ${right}`],
    praise: 'Du hast Rechnung und Geschichte verglichen.',
    srText: spokenTask(undefined, prompt),
    kmk: KMK,
  });
}

const SEATS = [
  { size: 5, noun: 'Autos', each: 'In jedes Auto', doing: 'fahren mit', goal: 'mitfahren' },
  { size: 2, noun: 'Bänke', each: 'Auf jede Bank', doing: 'wollen sitzen', goal: 'sitzen' },
  { size: 10, noun: 'Boote', each: 'In jedes Boot', doing: 'fahren mit', goal: 'mitfahren' },
];

/** Only with extras on: Teilen mit Rest is an extra (docs/research.md §6). */
function restMeaning(rng: Rng): Exercise {
  const stufe: Stufe = 3;
  const kind = rng.pick(['braucht', 'voll', 'rest'] as const);
  if (kind === 'braucht') {
    const { size, noun, each, doing, goal } = rng.pick(SEATS);
    // q + 1 is the answer, and it must not be the number of the story
    const q = rng.int(2, size === 5 ? 3 : 4);
    const r = rng.int(1, size - 1);
    const total = q * size + r;
    const value = q + 1;
    const context = `${total} Kinder ${doing}. ${each} passen ${size} Kinder.`;
    const question = `Wie viele ${noun} braucht die Klasse?`;
    const before = 'Die Klasse braucht';
    const after = `${noun}.`;
    return build(malTeilenSkill, stufe, {
      key: `rest-braucht:${noun}:${total}`,
      ab: 3,
      context,
      prompt: question,
      answer: sentenceAnswer(value, before, after, question),
      hints: hintsWithoutAnswer([`Rechne ${total} ${DIV} ${size}. Was bleibt übrig?`, `Alle Kinder sollen ${goal}.`], value, `Alle Kinder sollen ${goal}.`),
      steps: [`${total} ${DIV} ${size} = ${q} Rest ${r}`, `${r} ${r === 1 ? 'Kind braucht' : 'Kinder brauchen'} auch noch einen Platz.`, answerLine(before, value, after)],
      bugs: bugList(value, [['rest-sache', q, `Alle Kinder sollen ${goal}. Reichen ${q} ${noun}?`]]),
      praise: 'Du hast an den Rest gedacht.',
      srText: spokenTask(context, question),
      kmk: KMK,
    });
  }
  const size = rng.pick([5, 10]);
  const q = partsFor(rng, size, 2, 5);
  const r = rng.int(2, size - 1);
  const total = q * size + r;
  const context = `${total} Kekse kommen in Tüten. In jede Tüte kommen ${size} Kekse.`;
  const rest = kind === 'rest';
  const value = rest ? r : q;
  const question = rest ? 'Wie viele Kekse bleiben übrig?' : 'Wie viele volle Tüten gibt es?';
  const before = rest ? 'Es bleiben' : 'Es gibt';
  const after = rest ? 'Kekse übrig.' : 'volle Tüten.';
  return build(malTeilenSkill, stufe, {
    key: `rest-${kind}:${total}:${size}`,
    ab: 3,
    context,
    prompt: question,
    answer: sentenceAnswer(value, before, after, question),
    hints: hintsWithoutAnswer([`Rechne ${total} ${DIV} ${size}.`, rest ? 'Gefragt ist der Rest.' : 'Nur volle Tüten zählen.'], value, rest ? 'Gefragt ist der Rest.' : 'Nur volle Tüten zählen.'),
    steps: [`${total} ${DIV} ${size} = ${q} Rest ${r}`, answerLine(before, value, after)],
    bugs: bugList(value, [rest ? ['rest-sache', q, 'Gefragt sind die Kekse, nicht die Tüten.'] : ['rest-sache', q + 1, 'Nur volle Tüten zählen. Der Rest füllt keine Tüte.']]),
    praise: 'Du hast den Rest richtig gedeutet.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

export const malTeilenSkill: SkillDef = {
  id: 'sachaufgaben.mal-teilen',
  topicId: 'sachaufgaben',
  title: 'Geschichten: Mal und Geteilt',
  description: 'Du löst Geschichten mit gleich großen Gruppen.',
  stufen: {
    1: 'Gleich große Gruppen im Bild, Zahlen bis 50',
    2: 'Aufteilen und gerecht verteilen, Zahlen bis 100',
    3: 'Welche Rechenart passt? Mit Extras auch: Was heißt der Rest?',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 3 ? oneGroupMoreOrLess(rng) : equalGroups(rng, ab);
    if (stufe === 2) return ab === 3 ? sharingReversed(rng) : sharing(rng, ab);
    if (ab === 1) return whichOperation(rng);
    if (ab === 2) return operationAndResult(rng);
    return ctx.extras && rng.chance(0.5) ? restMeaning(rng) : storyForCalculation(rng);
  },
};
