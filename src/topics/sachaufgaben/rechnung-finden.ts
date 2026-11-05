/**
 * Welche Rechnung passt? The child finds the operation, not the result.
 * The Stufe chooses the content (docs/research.md §6), the AB level the demand inside it:
 * Stufe 1, dazu oder weg, ≤ 20, two options. AB I: the word 'dazu' or 'weg' stands in the story. AB II: other verbs (T13).
 * AB III: which story fits a calculation.
 * Stufe 2, Vereinigen and Ergänzen, ≤ 100. AB I: two options. AB II: three options, a varied keyword (T13).
 * AB III: a word that points the wrong way, or the matching gap calculation.
 * Stufe 3, all four operations and which question fits. AB I: direct stories. AB II: nothing comes or goes, the question names the goal.
 * AB III: which question fits a calculation, or what the numbers can answer.
 */
import { BOX, DIV, MINUS, TIMES } from '../../core/format';
import type { ChoiceOption, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, pickPerson, pickTwo, targetAb } from '../shared';
import { HINT_ALLE_ZAHLEN, HINT_GLEICH_GROSS, HINT_RECHENART, HINT_SIGNALWORT, HINT_UNTERSCHIED, spokenTask } from './helpers';

type Op = '+' | '-' | '*' | ':';

const SYMBOL: Record<Op, string> = { '+': '+', '-': MINUS, '*': TIMES, ':': DIV };

const term = (x: number, op: Op, y: number) => `${x} ${SYMBOL[op]} ${y}`;

/** A wrong option a child could read: minus and geteilt with the larger number first. */
const readable = (x: number, op: Op, y: number) => ((op === '-' || op === ':') && x < y ? term(y, op, x) : term(x, op, y));

/** The usual feedback on a wrong operation. A story where the true answer could support the wrong option brings its own text. */
const WHY_WRONG: Record<Op, string> = {
  '+': 'Kommt in der Geschichte wirklich etwas dazu?',
  '-': 'Geht in der Geschichte wirklich etwas weg?',
  '*': HINT_GLEICH_GROSS,
  ':': 'Verteilst du hier wirklich gerecht?',
};

const SITUATION: Record<Op, string> = {
  '+': 'Hier kommt etwas zusammen.',
  '-': 'Hier geht etwas weg oder etwas fehlt.',
  '*': 'Hier sind gleich große Gruppen.',
  ':': 'Hier teilst du in gleich große Gruppen.',
};

const KMK = ['ZO.operationen', 'ZO.sachrechnen', 'PK.modellieren'];

interface Item {
  key: string;
  context?: string;
  prompt: string;
  correct: ChoiceOption;
  wrongs: ChoiceOption[];
  hints: string[];
  steps: string[];
  praise: string;
}

type Told = readonly [id: string, make: (n: string, a: number, b: number) => string];

/** The word 'dazu' or 'weg' stands in the story. */
const PLUS_DIREKT: readonly Told[] = [
  ['bank', (_, a, b) => `Auf der Bank sitzen ${a} Kinder. Dann kommen ${b} Kinder dazu.`],
  ['korb', (_, a, b) => `Im Korb sind ${a} Äpfel. Papa legt ${b} Äpfel dazu.`],
  ['sticker', (n, a, b) => `${n} hat ${a} Sticker. ${n} bekommt ${b} Sticker dazu.`],
];

const MINUS_DIREKT: readonly Told[] = [
  ['bank', (_, a, b) => `Auf der Bank sitzen ${a} Kinder. Dann gehen ${b} Kinder weg.`],
  ['korb', (_, a, b) => `Im Korb sind ${a} Äpfel. Papa nimmt ${b} Äpfel weg.`],
  ['sticker', (n, a, b) => `${n} hat ${a} Sticker. ${n} gibt ${b} Sticker weg.`],
];

/** The verb decides, without the word 'dazu' or 'weg' (T13). */
const PLUS_VERB: readonly Told[] = [
  ['murmeln', (n, a, b) => `${n} hat ${a} Murmeln. ${n} findet ${b} Murmeln.`],
  ['kekse', (n, a, b) => `${n} hat ${a} Kekse. ${n} backt ${b} Kekse.`],
  ['birnen', (n, a, b) => `${n} hat ${a} Birnen. ${n} pflückt ${b} Birnen.`],
  ['bus', (_, a, b) => `Im Bus sitzen ${a} Kinder. ${b} Kinder steigen ein.`],
];

const MINUS_VERB: readonly Told[] = [
  ['murmeln', (n, a, b) => `${n} hat ${a} Murmeln. ${n} verliert ${b} Murmeln.`],
  ['kekse', (n, a, b) => `${n} hat ${a} Kekse. ${n} isst ${b} Kekse.`],
  ['birnen', (n, a, b) => `${n} hat ${a} Birnen. ${n} verschenkt ${b} Birnen.`],
  ['bus', (_, a, b) => `Im Bus sitzen ${a} Kinder. ${b} Kinder steigen aus.`],
];

/** Stufe 1, AB I and II: a story and two calculations. */
function dazuOderWeg(rng: Rng, ab: 1 | 2): Item {
  const plus = rng.chance(0.5);
  let a: number;
  let b: number;
  if (ab === 1) {
    a = rng.int(4, 12);
    b = plus ? rng.int(2, Math.min(a - 1, 8)) : rng.int(2, a - 2);
  } else {
    // over the ten: the numbers no longer show the way. With plus the first number is the larger one, so that the wrong 'a − b' is possible too:
    // 4 − 9 next to 4 + 9 would decide the task without the story.
    a = plus ? rng.int(6, 9) : rng.int(11, 18);
    b = plus ? rng.int(11 - a, a - 1) : rng.int(a - 9, 9);
  }
  const [id, make] = rng.pick(ab === 1 ? (plus ? PLUS_DIREKT : MINUS_DIREKT) : plus ? PLUS_VERB : MINUS_VERB);
  const op: Op = plus ? '+' : '-';
  return {
    key: `${ab === 1 ? 'dazu-weg' : 'verben'}:${id}:${a}:${op}:${b}`,
    context: make(pickPerson(rng).name, a, b),
    prompt: 'Welche Rechnung passt?',
    correct: { label: term(a, op, b) },
    wrongs: [{ label: term(a, plus ? '-' : '+', b), whyWrong: HINT_SIGNALWORT }],
    hints: [HINT_SIGNALWORT, HINT_RECHENART],
    steps: [plus ? 'In der Geschichte kommt etwas dazu.' : 'In der Geschichte geht etwas weg.', `Die Rechnung ist ${term(a, op, b)}.`],
    praise: 'Du hast dir die Geschichte vorgestellt.',
  };
}

/** Stufe 1, AB III: the same start, one story with plus and one with minus. Which one fits the calculation? */
function geschichteZurRechnung(rng: Rng): Item {
  const plus = rng.chance(0.5);
  const a = rng.int(6, 15);
  const b = rng.int(2, plus ? Math.min(a - 1, 20 - a) : a - 2);
  const index = rng.int(0, PLUS_VERB.length - 1);
  const n = pickPerson(rng).name;
  const [id, makePlus] = PLUS_VERB[index];
  const [, makeMinus] = MINUS_VERB[index];
  const calc = term(a, plus ? '+' : '-', b);
  const right = (plus ? makePlus : makeMinus)(n, a, b);
  const other = (plus ? makeMinus : makePlus)(n, a, b);
  return {
    key: `zur-rechnung:${id}:${a}:${plus ? '+' : '-'}:${b}`,
    prompt: `Welche Geschichte passt zu ${calc}?`,
    correct: { label: right },
    wrongs: [{ label: other, whyWrong: plus ? 'Bei dieser Geschichte bleibt weniger übrig. Schau auf das Zeichen.' : 'Bei dieser Geschichte kommt etwas hinzu. Schau auf das Zeichen.' }],
    hints: ['Schau zuerst auf das Rechenzeichen.', 'Stell dir beide Geschichten vor.'],
    steps: [plus ? `${calc}: Hier kommt etwas dazu.` : `${calc}: Hier geht etwas weg.`, `Also passt: ${right}`],
    praise: 'Du hast Rechnung und Geschichte verglichen.',
  };
}

/** Stufe 2: id, the story, what the calculation finds (the numbers are small < large). Nothing comes or goes here, so the texts name the relation. whyPlus: the feedback on adding the two numbers of a '-' story. */
type Story = [id: string, make: (n: string, m: string, small: number, large: number) => { context: string; finds: string; situation: string; whyPlus?: string }, op: '+' | '-'];

const TOGETHER = 'Du nimmst beide Mengen zusammen.';
const GAP = 'Von der kleinen bis zur großen Zahl fehlt ein Stück.';

const STORIES: readonly Story[] = [
  ['halle', (_, __, s, l) => ({ context: `In der Turnhalle sind ${l} Kinder. Auf dem Hof sind ${s} Kinder.`, finds: 'alle Kinder', situation: TOGETHER }), '+'],
  ['regal', (_, __, s, l) => ({ context: `Im Regal stehen ${l} Bücher. Auf dem Tisch liegen ${s} Bücher.`, finds: 'die Zahl der Bücher', situation: TOGETHER }), '+'],
  ['kastanien', (n, m, s, l) => ({ context: `${n} sammelt ${l} Kastanien. ${m} sammelt ${s} Kastanien.`, finds: 'die Kastanien von beiden', situation: TOGETHER }), '+'],
  // 'alle', 'fehlenden' and 'freien' come with both operations (T13).
  ['fehlen-beide', (n, m, s, l) => ({ context: `${n} fehlen ${l} Sticker. ${m} fehlen ${s} Sticker.`, finds: 'alle fehlenden Sticker', situation: TOGETHER }), '+'],
  ['frei-beide', (_, __, s, l) => ({ context: `Im Saal sind ${l} Plätze frei. Im Bus sind ${s} Plätze frei.`, finds: 'alle freien Plätze', situation: TOGETHER }), '+'],
  ['alle-halle', (_, __, s, l) => ({ context: `In der Schule sind ${l} Kinder. ${s} Kinder sind draußen, die anderen in der Halle.`, finds: 'alle Kinder in der Halle', situation: GAP, whyPlus: 'Die Kinder draußen sind schon mitgezählt.' }), '-'],
  ['alle-blau', (n, _, s, l) => ({ context: `${n} hat ${l} Karten. ${s} Karten sind rot, die anderen blau.`, finds: 'alle blauen Karten', situation: GAP, whyPlus: 'Die roten Karten sind schon mitgezählt.' }), '-'],
  ['sticker', (n, _, s, l) => ({ context: `${n} hat ${s} Sticker. ${n} möchte ${l} Sticker haben.`, finds: 'die fehlenden Sticker', situation: GAP, whyPlus: 'Die große Zahl ist das Ziel. Wie viele Sticker fehlen bis dahin?' }), '-'],
  ['plaetze', (_, __, s, l) => ({ context: `Der Saal hat ${l} Plätze. ${s} Kinder sitzen schon.`, finds: 'die freien Plätze', situation: GAP, whyPlus: 'Die Kinder sitzen schon auf den Plätzen im Saal.' }), '-'],
  ['seiten', (n, _, s, l) => ({ context: `Das Buch hat ${l} Seiten. ${n} liest ${s} Seiten.`, finds: 'die restlichen Seiten', situation: GAP, whyPlus: 'Die gelesenen Seiten gehören schon zum Buch.' }), '-'],
];

/** "mehr" in a subtraction story (T13). */
const MEHR: Story = ['mehr', (n, m, s, l) => ({ context: `${n} hat ${s} Murmeln. ${m} hat mehr, nämlich ${l} Murmeln.`, finds: 'den Unterschied', situation: 'Gesucht ist der Unterschied.', whyPlus: HINT_UNTERSCHIED }), '-'];

/** Stufe 2, AB III: the word points the other way: "weniger" with plus, "mehr" with minus (T13). */
const FALLEN: readonly Story[] = [
  ['weniger-alle', (n, m, s, l) => ({ context: `${n} hat ${l} Karten. ${m} hat weniger, nämlich ${s} Karten.`, finds: 'alle Karten', situation: TOGETHER }), '+'],
  ['mehr-fehlt', (n, _, s, l) => ({ context: `${n} hat ${s} Murmeln. ${n} braucht mehr, nämlich ${l} Murmeln.`, finds: 'die fehlenden Murmeln', situation: GAP, whyPlus: 'Die große Zahl ist das Ziel. Wie viele Murmeln fehlen bis dahin?' }), '-'],
  ['mehr-unterschied', (n, m, s, l) => ({ context: `${n} hat ${s} Sticker. ${m} hat mehr, nämlich ${l} Sticker.`, finds: 'den Unterschied', situation: 'Gesucht ist der Unterschied.', whyPlus: HINT_UNTERSCHIED }), '-'],
];

function storyNumbers(rng: Rng, op: '+' | '-') {
  const small = rng.int(12, 46);
  return { small, large: rng.int(small + 8, op === '+' ? Math.min(small + 40, 100 - small) : 100) };
}

/** Stufe 2, AB I: tens plus ones, so that the numbers are easy to read, and two options. AB II: any numbers, three options. */
function vereinigenOderErgaenzen(rng: Rng, ab: 1 | 2): Item {
  const [id, make, op] = rng.pick(ab === 1 ? STORIES : [...STORIES, MEHR]);
  const [p, q] = pickTwo(rng);
  let small: number;
  let large: number;
  if (ab === 1) {
    small = rng.int(1, 4) * 10;
    large = rng.int(small / 10 + 1, op === '+' ? Math.min(9 - small / 10, 8) : 9) * 10;
  } else {
    ({ small, large } = storyNumbers(rng, op));
  }
  const st = make(p.name, q.name, small, large);
  const plusFirst = op === '+' ? term(large, '+', small) : term(small, '+', large);
  const correctLabel = op === '+' ? plusFirst : term(large, '-', small);
  const wrongPlus = { label: plusFirst, whyWrong: st.whyPlus ?? WHY_WRONG['+'] };
  const wrongMinus = { label: term(large, '-', small), whyWrong: WHY_WRONG['-'] };
  const wrongMal = { label: term(small, '*', large), whyWrong: WHY_WRONG['*'] };
  const rightKind = op === '+' ? wrongMinus : wrongPlus;
  return {
    key: `${ab === 1 ? 'ab2-direkt' : 'ab2'}:${id}:${small}:${large}`,
    context: st.context,
    prompt: `Welche Rechnung findet ${st.finds}?`,
    correct: { label: correctLabel },
    wrongs: ab === 1 ? [rightKind] : [rightKind, wrongMal],
    hints: ['Lies die Frage genau: Was sollst du finden?', op === '+' ? '2 Mengen kommen zusammen. Welche Rechnung passt dazu?' : 'Wie weit ist es von der kleinen zur großen Zahl?'],
    steps: [st.situation, `Die Rechnung ist ${correctLabel}.`],
    praise: 'Du hast auf die ganze Geschichte geachtet.',
  };
}

/** Stufe 2, AB III: a word that points the wrong way. */
function falle(rng: Rng): Item {
  const [id, make, op] = rng.pick(FALLEN);
  const [p, q] = pickTwo(rng);
  const { small, large } = storyNumbers(rng, op);
  const st = make(p.name, q.name, small, large);
  const correctLabel = op === '+' ? term(large, '+', small) : term(large, '-', small);
  const wrong = op === '+'
    ? { label: term(large, '-', small), whyWrong: 'Lies die Frage genau: Gesucht sind beide Mengen zusammen.' }
    : { label: term(small, '+', large), whyWrong: st.whyPlus ?? WHY_WRONG['+'] };
  return {
    key: `falle:${id}:${small}:${large}`,
    context: st.context,
    prompt: `Welche Rechnung findet ${st.finds}?`,
    correct: { label: correctLabel },
    wrongs: [wrong, { label: term(small, '*', large), whyWrong: WHY_WRONG['*'] }],
    hints: ['Achte nicht nur auf ein Wort. Stell dir die ganze Geschichte vor.', 'Was sollst du finden?'],
    steps: [st.situation, `Die Rechnung ist ${correctLabel}.`],
    praise: 'Du hast auf die ganze Geschichte geachtet.',
  };
}

/** Stufe 2, AB III: the same story as an equation with a gap. */
function luecke(rng: Rng): Item {
  const [id, make, op] = rng.pick(STORIES);
  const [p, q] = pickTwo(rng);
  const { small, large } = storyNumbers(rng, op);
  const st = make(p.name, q.name, small, large);
  const sum = op === '+' ? `${large} + ${small} = ${BOX}` : `${small} + ${BOX} = ${large}`;
  const wrongs = op === '+'
    ? [
        { label: `${small} + ${BOX} = ${large}`, whyWrong: 'Die große Zahl ist nicht das Ziel. Beide Mengen kommen zusammen.' },
        { label: `${large} ${MINUS} ${small} = ${BOX}`, whyWrong: 'Hier geht nichts weg. Beide Mengen kommen zusammen.' },
      ]
    : [
        { label: `${small} + ${large} = ${BOX}`, whyWrong: st.whyPlus ?? WHY_WRONG['+'] },
        { label: `${large} + ${BOX} = ${small}`, whyWrong: 'Von der kleinen Zahl aus geht es zur großen Zahl.' },
      ];
  return {
    key: `luecke:${id}:${small}:${large}`,
    context: st.context,
    prompt: `Welche Aufgabe findet ${st.finds}?`,
    correct: { label: sum },
    wrongs,
    hints: ['Was ist schon bekannt? Was suchst du?', 'Das Kästchen steht für deine Antwort.'],
    steps: [st.situation, `Die Aufgabe ist ${sum}.`],
    praise: 'Du hast die passende Aufgabe gefunden.',
  };
}

interface FourStory {
  id: string;
  op: Op;
  context: string;
  x: number;
  y: number;
  /** Default: 'Welche Rechnung passt?' */
  prompt?: string;
  /** For a story where nothing comes or goes: instead of SITUATION and of HINT_RECHENART. */
  situation?: string;
  hint?: string;
  whyWrong?: Partial<Record<Op, string>>;
}

const FOUR_OPS: Op[] = ['+', '-', '*', ':'];

function fourOptions(st: FourStory, praise: string, kind: string): Item {
  return {
    key: `${kind}:${st.id}:${st.x}:${st.y}`,
    context: st.context,
    prompt: st.prompt ?? 'Welche Rechnung passt?',
    correct: { label: term(st.x, st.op, st.y) },
    wrongs: FOUR_OPS.filter((o) => o !== st.op).map((o) => ({ label: readable(st.x, o, st.y), whyWrong: st.whyWrong?.[o] ?? WHY_WRONG[o] })),
    hints: ['Stell dir die Geschichte wie einen kleinen Film vor.', st.hint ?? (st.op === '*' ? 'Schau: Gibt es gleich große Gruppen?' : st.op === ':' ? 'Schau: Sind schon alle da? Dann teilst du nur ein.' : HINT_RECHENART)],
    steps: [st.situation ?? SITUATION[st.op], `Die Rechnung ist ${term(st.x, st.op, st.y)}.`],
    praise,
  };
}

/** Numbers of the group stories. From 3 groups on: 2 · 2 and 2 + 2 are both right. */
function groupNumbers(rng: Rng) {
  const groups = rng.int(3, 9);
  const size = rng.pick([2, 5, 10]);
  return { groups, size, total: groups * size };
}

/** Stufe 3, AB I: direct stories for each of the four operations. */
function vierDirekt(rng: Rng): Item {
  const n = pickPerson(rng).name;
  const { groups, size, total } = groupNumbers(rng);
  const a = rng.int(12, 40);
  const b = rng.int(3, 11);
  const stories: FourStory[] = [
    { id: 'dazu', op: '+', context: `${n} hat ${a} Sticker. ${n} bekommt ${b} Sticker dazu.`, x: a, y: b },
    { id: 'weg', op: '-', context: `Im Bus sitzen ${a} Kinder. ${b} Kinder steigen aus.`, x: a, y: b },
    { id: 'gruppen', op: '*', context: `${n} hat ${groups} Tüten. In jeder Tüte sind ${size} Äpfel.`, x: groups, y: size },
    { id: 'verteilen', op: ':', context: `${n} verteilt ${total} Kekse an ${size} Kinder. Jedes Kind bekommt gleich viele Kekse.`, x: total, y: size, whyWrong: { '*': 'Die Kekse sind schon alle da. Du verteilst die Kekse nur.', '+': 'Hier kommt nichts dazu. Du verteilst die Kekse.', '-': 'Die Kekse sind alle noch da. Jedes Kind bekommt gleich viele Kekse.' } },
  ];
  return fourOptions(rng.pick(stories), 'Du hast die Rechenart zur Geschichte gefunden.', 'vier');
}

/** Stufe 3, AB II: the operation is not in the verb: nothing comes or goes, and the question names the goal. */
function vierIndirekt(rng: Rng): Item {
  const [p, q] = pickTwo(rng);
  const { groups, size, total } = groupNumbers(rng);
  const large = rng.int(30, 60);
  const small = rng.int(12, 28);
  const noChange = 'Lies die Frage: Was sollst du finden?';
  const stories: FourStory[] = [
    { id: 'alle', op: '+', context: `In der Turnhalle sind ${large} Kinder. Auf dem Hof sind ${small} Kinder.`, prompt: 'Welche Rechnung findet alle Kinder?', x: large, y: small, situation: TOGETHER, hint: noChange },
    { id: 'frei', op: '-', context: `Der Saal hat ${large} Plätze. ${small} Kinder sitzen schon.`, prompt: 'Welche Rechnung findet die freien Plätze?', x: large, y: small, situation: GAP, hint: noChange },
    { id: 'mehr', op: '-', context: `${p.name} hat ${small} Murmeln. ${q.name} hat mehr, nämlich ${large} Murmeln.`, prompt: 'Welche Rechnung findet den Unterschied?', x: large, y: small, situation: 'Gesucht ist der Unterschied.', hint: noChange, whyWrong: { '+': HINT_UNTERSCHIED } },
    { id: 'reihen', op: '*', context: `Im Saal sind ${groups} Reihen. In jeder Reihe stehen ${size} Stühle.`, prompt: 'Welche Rechnung findet alle Stühle?', x: groups, y: size },
    { id: 'kinder', op: '*', context: `${groups} Kinder spielen. Jedes Kind hat ${size} Karten.`, prompt: 'Welche Rechnung findet alle Karten?', x: groups, y: size },
    { id: 'aufteilen', op: ':', context: `${total} Kinder bilden Gruppen. In jede Gruppe kommen ${size} Kinder.`, prompt: 'Welche Rechnung findet die Gruppen?', x: total, y: size, whyWrong: { '*': 'Die Kinder sind schon alle da. Du teilst die Kinder nur ein.', '+': 'Hier kommt niemand dazu. Du teilst die Kinder ein.' } },
    { id: 'teller', op: ':', context: `${total} Kekse liegen auf ${size} Tellern. Auf jedem Teller liegen gleich viele Kekse.`, prompt: 'Welche Rechnung findet die Kekse auf einem Teller?', x: total, y: size, whyWrong: { '*': 'Die Kekse sind schon alle da. Du teilst die Kekse nur ein.', '+': 'Hier kommt nichts dazu. Du teilst die Kekse ein.', '-': 'Die Kekse sind alle noch da. Du teilst die Kekse ein.' } },
  ];
  return fourOptions(rng.pick(stories), 'Du hast die Rechenart zur Geschichte gefunden.', 'vier-indirekt');
}

/** Stufe 3, AB III: which question fits the calculation. */
function frageZurRechnung(rng: Rng): Item {
  const [p, q] = pickTwo(rng);
  const large = rng.int(12, 40);
  const small = rng.int(3, large - 3);
  const noun = rng.pick(['Bonbons', 'Karten', 'Muscheln', 'Sticker']);
  const plus = rng.chance(0.5);
  const calc = plus ? term(large, '+', small) : term(large, '-', small);
  const together = `Wie viele ${noun} haben beide zusammen?`;
  const difference = `Wie viele ${noun} hat ${p.name} mehr?`;
  const right = plus ? together : difference;
  const wrongs: ChoiceOption[] = [
    { label: plus ? difference : together, whyWrong: 'Schau auf das Rechenzeichen: Passt das Zeichen zu dieser Frage?' },
    { label: `Wie viele ${noun} hat ${q.name}?`, whyWrong: 'Das steht schon im Text. Dafür brauchst du keine Rechnung.' },
    { label: `Wie alt ist ${p.name}?`, whyWrong: HINT_ALLE_ZAHLEN },
  ];
  return {
    key: `frage:${noun}:${large}:${plus ? '+' : '-'}:${small}`,
    context: `${p.name} hat ${large} ${noun}. ${q.name} hat ${small} ${noun}.`,
    prompt: `Welche Frage passt zur Rechnung ${calc}?`,
    correct: { label: right },
    wrongs,
    hints: ['Schau zuerst auf das Rechenzeichen.', plus ? 'Plus nimmt beide Mengen zusammen.' : 'Minus findet hier den Unterschied.'],
    steps: [plus ? `${calc} nimmt beide Mengen zusammen.` : `${calc} findet den Unterschied.`, `Also passt: ${right}`],
    praise: 'Du hast Frage und Rechnung genau verglichen.',
  };
}

/** Stufe 3, AB III: which question fits a calculation with mal or geteilt. */
function frageZuGruppen(rng: Rng): Item {
  const n = pickPerson(rng).name;
  const { groups, size, total } = groupNumbers(rng);
  const mal = rng.chance(0.5);
  const calc = mal ? term(groups, '*', size) : term(total, ':', size);
  const right = mal ? `Wie viele Äpfel hat ${n}?` : 'Wie viele Kekse bekommt jedes Kind?';
  const wrongs: ChoiceOption[] = mal
    ? [
        { label: `Wie viele Tüten hat ${n}?`, whyWrong: 'Das steht schon im Text. Dafür brauchst du keine Rechnung.' },
        { label: 'Wie viele Äpfel sind in einer Tüte?', whyWrong: 'Das steht schon im Text. Dafür brauchst du keine Rechnung.' },
        { label: `Wie alt ist ${n}?`, whyWrong: HINT_ALLE_ZAHLEN },
      ]
    : [
        { label: 'Wie viele Kinder bekommen Kekse?', whyWrong: 'Das steht schon im Text. Dafür brauchst du keine Rechnung.' },
        { label: `Wie viele Kekse verteilt ${n}?`, whyWrong: 'Das steht schon im Text. Dafür brauchst du keine Rechnung.' },
        { label: `Wie alt ist ${n}?`, whyWrong: HINT_ALLE_ZAHLEN },
      ];
  return {
    key: `frage-gruppen:${mal ? 'mal' : 'teilen'}:${groups}:${size}`,
    context: mal ? `${n} hat ${groups} Tüten. In jeder Tüte sind ${size} Äpfel.` : `${n} verteilt ${total} Kekse an ${size} Kinder.`,
    prompt: `Welche Frage passt zur Rechnung ${calc}?`,
    correct: { label: right },
    wrongs,
    hints: ['Schau zuerst auf das Rechenzeichen.', 'Was steht schon im Text? Was fehlt noch?'],
    steps: [mal ? `${calc} nimmt alle Tüten zusammen.` : `${calc} teilt die Kekse gerecht.`, `Also passt: ${right}`],
    praise: 'Du hast Frage und Rechnung genau verglichen.',
  };
}

/** Stufe 3, AB III: which question can be answered with the numbers of the story. */
function frageZurGeschichte(rng: Rng): Item {
  const [p, q] = pickTwo(rng);
  const large = rng.int(12, 40);
  const small = rng.int(3, large - 3);
  const noun = rng.pick(['Bonbons', 'Karten', 'Muscheln', 'Sticker']);
  const right = rng.chance(0.5) ? `Wie viele ${noun} haben beide zusammen?` : `Wie viele ${noun} hat ${p.name} mehr als ${q.name}?`;
  const other = noun === 'Karten' ? 'Stifte' : 'Karten';
  return {
    key: `frage-geschichte:${noun}:${large}:${small}:${right.includes('zusammen') ? 'plus' : 'mehr'}`,
    context: `${p.name} hat ${large} ${noun}. ${q.name} hat ${small} ${noun}.`,
    prompt: 'Welche Frage kannst du mit diesen Zahlen ausrechnen?',
    correct: { label: right },
    wrongs: [
      { label: `Wie viele ${noun} hat ${q.name}?`, whyWrong: 'Das steht schon im Text. Dafür brauchst du keine Rechnung.' },
      { label: `Wie alt ist ${p.name}?`, whyWrong: HINT_ALLE_ZAHLEN },
      { label: `Wie viele ${other} hat ${p.name}?`, whyWrong: HINT_ALLE_ZAHLEN },
    ],
    hints: ['Welche Zahlen stehen im Text? Wozu gehören die Zahlen?', 'Was steht schon im Text? Das musst du nicht rechnen.'],
    steps: [`Die Zahlen gehören zu den ${noun}.`, `Also passt: ${right}`],
    praise: 'Du hast Frage und Zahlen genau verglichen.',
  };
}

function itemFor(rng: Rng, stufe: Stufe, ab: 1 | 2 | 3): Item {
  if (stufe === 1) return ab === 3 ? geschichteZurRechnung(rng) : dazuOderWeg(rng, ab);
  if (stufe === 2) {
    if (ab === 3) return rng.chance(0.5) ? falle(rng) : luecke(rng);
    return vereinigenOderErgaenzen(rng, ab);
  }
  if (ab === 1) return vierDirekt(rng);
  if (ab === 2) return vierIndirekt(rng);
  const form = rng.pick(['rechnung', 'gruppen', 'geschichte'] as const);
  if (form === 'rechnung') return frageZurRechnung(rng);
  return form === 'gruppen' ? frageZuGruppen(rng) : frageZurGeschichte(rng);
}

export const rechnungFindenSkill: SkillDef = {
  id: 'sachaufgaben.rechnung-finden',
  topicId: 'sachaufgaben',
  title: 'Welche Rechnung passt?',
  description: 'Du findest die Rechnung oder die Frage zur Geschichte.',
  stufen: {
    1: 'Kommt etwas dazu oder geht etwas weg?',
    2: 'Zusammen oder fehlt noch, Zahlen bis 100',
    3: 'Alle 4 Rechenarten und die passende Frage',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const item = itemFor(rng, stufe, ab);
    return build(rechnungFindenSkill, stufe, {
      key: item.key,
      ab,
      ...(item.context ? { context: item.context } : {}),
      prompt: item.prompt,
      answer: makeChoice(rng, item.correct, item.wrongs),
      hints: item.hints,
      steps: item.steps,
      praise: item.praise,
      srText: spokenTask(item.context, item.prompt),
      kmk: KMK,
    });
  },
};
