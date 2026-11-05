/**
 * Passt das? The child checks whether an answer or a question makes sense (F17: the captain problem).
 * The Stufe chooses the content (docs/research.md §6), the AB level the demand inside it:
 * Stufe 1, is a price or a length plausible? AB I: judge one sentence. AB II: choose the value or the unit. AB III: find the one sentence
 * of three that cannot be true.
 * Stufe 2, one number in the story is not needed. AB I: name it. AB II: calculate without it. AB III: it has the same noun as the
 * numbers that count, or choose the calculation without it.
 * Stufe 3, missing information and Kapitänsaufgaben. AB I: choices (what is missing, can it be calculated at all). AB II: number items
 * with the button "Nicht lösbar", and some items can be solved, so the button gives nothing away. AB III: the same, with a second number
 * in the story, so that a story that cannot be solved looks solvable. The button only on Stufe 3 (§7.1).
 */
import { BOX, MINUS, NBSP, TIMES } from '../../core/format';
import type { ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson, pickTwo, plural, targetAb, type MaybeBug } from '../shared';
import { HINT_ALLE_ZAHLEN, HINT_EINKAUF, HINT_RECHENART, answerLine, calcStep, sentenceAnswer, spokenTask } from './helpers';

const KMK = ['ZO.sachrechnen', 'ZO.kontrolle', 'PK.argumentieren'];

/** A thing with values that fit and values that do not. Text as in class, with a no-break space before the unit (T10). */
interface Fact {
  id: string;
  subject: string;
  verb: string;
  /** '' or the adjective after the value ('lang', 'hoch'). */
  tail: string;
  kind: 'preis' | 'laenge';
  thing: string;
  fits: string[];
  tooMuch: string[];
  tooLittle: string[];
}

const q = (text: string) => text.replace(' ', NBSP);

const FACTS: readonly Fact[] = [
  { id: 'eis', subject: 'Ein Eis', verb: 'kostet', tail: '', kind: 'preis', thing: 'ein echtes Eis', fits: ['2 €', '3 €'], tooMuch: ['40 €', '90 €'], tooLittle: [] },
  { id: 'heft', subject: 'Ein Heft', verb: 'kostet', tail: '', kind: 'preis', thing: 'ein echtes Heft', fits: ['2 €', '3 €'], tooMuch: ['50 €', '80 €'], tooLittle: ['1 ct'] },
  { id: 'ball', subject: 'Ein Ball', verb: 'kostet', tail: '', kind: 'preis', thing: 'einen echten Ball', fits: ['10 €', '15 €'], tooMuch: ['100 €'], tooLittle: ['1 ct', '2 ct'] },
  { id: 'tasche', subject: 'Eine Schultasche', verb: 'kostet', tail: '', kind: 'preis', thing: 'eine echte Schultasche', fits: ['40 €', '60 €'], tooMuch: [], tooLittle: ['1 €', '2 ct'] },
  { id: 'bonbon', subject: 'Ein Bonbon', verb: 'kostet', tail: '', kind: 'preis', thing: 'ein echtes Bonbon', fits: ['10 ct', '20 ct'], tooMuch: ['50 €', '90 €'], tooLittle: [] },
  { id: 'buch', subject: 'Ein Buch', verb: 'kostet', tail: '', kind: 'preis', thing: 'ein echtes Buch', fits: ['9 €', '12 €'], tooMuch: ['100 €'], tooLittle: ['1 ct'] },
  { id: 'stift', subject: 'Ein Bleistift', verb: 'ist', tail: 'lang', kind: 'laenge', thing: 'einen echten Bleistift', fits: ['15 cm', '18 cm'], tooMuch: ['15 m', '40 m'], tooLittle: [] },
  { id: 'tuer', subject: 'Eine Tür', verb: 'ist', tail: 'hoch', kind: 'laenge', thing: 'eine echte Tür', fits: ['2 m'], tooMuch: ['20 m', '90 m'], tooLittle: ['2 cm', '5 cm'] },
  { id: 'bus', subject: 'Ein Schulbus', verb: 'ist', tail: 'lang', kind: 'laenge', thing: 'einen echten Schulbus', fits: ['10 m', '12 m'], tooMuch: ['90 m'], tooLittle: ['10 cm', '12 cm'] },
  { id: 'ameise', subject: 'Eine Ameise', verb: 'ist', tail: 'lang', kind: 'laenge', thing: 'eine echte Ameise', fits: ['1 cm'], tooMuch: ['1 m', '5 m'], tooLittle: [] },
  { id: 'lineal', subject: 'Ein Lineal', verb: 'ist', tail: 'lang', kind: 'laenge', thing: 'ein echtes Lineal', fits: ['20 cm', '30 cm'], tooMuch: ['30 m'], tooLittle: ['1 cm'] },
  { id: 'tisch', subject: 'Ein Tisch', verb: 'ist', tail: 'hoch', kind: 'laenge', thing: 'einen echten Tisch', fits: ['70 cm', '80 cm'], tooMuch: ['70 m'], tooLittle: ['7 cm'] },
  { id: 'apfel', subject: 'Ein Apfel', verb: 'kostet', tail: '', kind: 'preis', thing: 'einen echten Apfel', fits: ['30 ct', '50 ct'], tooMuch: ['40 €', '70 €'], tooLittle: [] },
  { id: 'spiel', subject: 'Ein Spiel', verb: 'kostet', tail: '', kind: 'preis', thing: 'ein echtes Spiel', fits: ['15 €', '20 €'], tooMuch: ['100 €'], tooLittle: ['1 ct', '5 ct'] },
  { id: 'haus', subject: 'Ein Haus', verb: 'ist', tail: 'hoch', kind: 'laenge', thing: 'ein echtes Haus', fits: ['10 m', '12 m'], tooMuch: ['90 m'], tooLittle: ['10 cm', '12 cm'] },
  { id: 'heftlang', subject: 'Ein Schulheft', verb: 'ist', tail: 'lang', kind: 'laenge', thing: 'ein echtes Schulheft', fits: ['20 cm', '30 cm'], tooMuch: ['20 m', '30 m'], tooLittle: ['2 cm'] },
];

const statement = (f: Fact, value: string) => [f.subject, f.verb, value, f.tail].filter(Boolean).join(' ') + '.';

/** Second hint for all values: sizes the child knows. Metres cannot be shown with the hands, and a true statement must not seem impossible. */
const secondHint = (f: Fact) => (f.kind === 'preis' ? 'Denk an einen echten Einkauf.' : `Dein Finger: etwa 1${NBSP}cm breit. Ein großer Schritt: etwa 1${NBSP}m.`);

const whyWrongFor = (f: Fact) => (f.kind === 'preis' ? HINT_EINKAUF : `Kann das stimmen? Denk an ${f.thing}.`);

/** 'Ein Eis kostet 40 €. Kann das stimmen?' */
function plausible(rng: Rng, f: Fact): Exercise {
  const stufe: Stufe = 1;
  const verdicts = (['fits', 'tooMuch', 'tooLittle'] as const).filter((v) => f[v].length > 0);
  const verdict = rng.pick(verdicts);
  const value = q(rng.pick(f[verdict]));
  const context = statement(f, value);
  const prompt = 'Kann das stimmen?';
  const much = f.kind === 'preis' ? 'Nein, das ist viel zu teuer.' : `Nein, das ist viel zu ${f.tail}.`;
  const little = f.kind === 'preis' ? 'Nein, das ist viel zu billig.' : `Nein, das ist viel zu ${f.tail === 'hoch' ? 'niedrig' : 'kurz'}.`;
  const yes = 'Ja, das kann stimmen.';
  const labels = { fits: yes, tooMuch: much, tooLittle: little };
  const correct = labels[verdict];
  const wrongs = (Object.keys(labels) as (keyof typeof labels)[]).filter((v) => v !== verdict).map((v) => ({ label: labels[v], whyWrong: whyWrongFor(f) }));
  return build(fragePruefenSkill, stufe, {
    key: `stimmt:${f.id}:${value}`,
    ab: 1,
    context,
    prompt,
    answer: makeChoice(rng, { label: correct }, wrongs, { order: [yes, much, little] }),
    hints: [`Stell dir ${f.thing} vor.`, secondHint(f)],
    steps: [`Du stellst dir ${f.thing} vor.`, `${context} ${correct.replace(/^(Ja|Nein), d/, 'D')}`],
    praise: 'Du hast an etwas Echtes gedacht.',
    srText: spokenTask(context, prompt),
    kmk: KMK,
  });
}

/** 'Ein Eis kostet □. Was passt?' */
function pickValue(rng: Rng, f: Fact): Exercise {
  const stufe: Stufe = 1;
  const right = q(rng.pick(f.fits));
  const wrongValues = rng.shuffle([...f.tooMuch, ...f.tooLittle]).slice(0, 3).map(q);
  const prompt = `${statement(f, BOX)} Was passt?`;
  return build(fragePruefenSkill, stufe, {
    key: `wert:${f.id}:${right}`,
    ab: 2,
    prompt,
    answer: makeChoice(rng, { label: right }, wrongValues.map((label) => ({ label, whyWrong: whyWrongFor(f) }))),
    // 'Dein Finger: etwa 1 cm' would name the answer of the ant.
    hints: [`Stell dir ${f.thing} vor.`, secondHint(f).includes(right) ? 'Denk an etwas Echtes in dieser Größe.' : secondHint(f)],
    steps: [`Du stellst dir ${f.thing} vor.`, statement(f, right)],
    praise: 'Du hast an etwas Echtes gedacht.',
    srText: spokenTask(undefined, prompt),
    kmk: KMK,
  });
}

/** The same number with the other unit: '18 cm' and '18 m'. Every value in `fits` becomes untrue with the other unit. */
const otherUnit = (value: string) => {
  const [n, unit] = value.split(' ');
  return `${n} ${{ cm: 'm', m: 'cm', '€': 'ct', ct: '€' }[unit]}`;
};

/** 'Ein Bleistift ist □ lang. Was passt?' with '18 cm' and '18 m': the number does not help, the unit decides. */
function pickUnit(rng: Rng, f: Fact): Exercise {
  const stufe: Stufe = 1;
  const value = rng.pick(f.fits);
  const right = q(value);
  const wrong = q(otherUnit(value));
  const prompt = `${statement(f, BOX)} Was passt?`;
  return build(fragePruefenSkill, stufe, {
    key: `einheit:${f.id}:${right}`,
    ab: 2,
    prompt,
    answer: makeChoice(rng, { label: right }, [{ label: wrong, whyWrong: whyWrongFor(f) }]),
    hints: [`Stell dir ${f.thing} vor.`, 'Die Zahl ist gleich. Schau auf das Zeichen danach.'],
    steps: [`Du stellst dir ${f.thing} vor.`, statement(f, right)],
    praise: 'Du hast auf die Einheit geachtet.',
    srText: spokenTask(undefined, prompt),
    kmk: KMK,
  });
}

/** 'Welcher Satz kann nicht stimmen?': three things, one of them with a value that cannot be true. */
function whichCannotBeTrue(rng: Rng): Exercise {
  const stufe: Stufe = 1;
  const [bad, good1, good2] = rng.sample(FACTS.filter((f) => f.tooMuch.length + f.tooLittle.length > 0), 3);
  const wrongValue = q(rng.pick([...bad.tooMuch, ...bad.tooLittle]));
  const right = statement(bad, wrongValue);
  const trueOnes = [good1, good2].map((f) => statement(f, q(rng.pick(f.fits))));
  const prompt = 'Welcher Satz kann nicht stimmen?';
  const why = 'Dieser Satz kann stimmen. Schau die anderen Sätze an.';
  return build(fragePruefenSkill, stufe, {
    key: `welcher-satz:${bad.id}:${wrongValue}:${good1.id}:${good2.id}`,
    ab: 3,
    prompt,
    answer: makeChoice(rng, { label: right }, trueOnes.map((label) => ({ label, whyWrong: why }))),
    hints: ['Stell dir jede Sache einzeln vor.', 'Denk an echte Dinge. Was ist viel zu groß oder zu klein?'],
    steps: [`Du stellst dir ${bad.thing} vor.`, `Das kann nicht stimmen: ${right}`],
    praise: 'Du hast jeden Satz genau geprüft.',
    srText: spokenTask(undefined, prompt),
    kmk: KMK,
  });
}

/** Stories with a number that is not needed: a and c belong to the question, x does not. */
interface ExtraStory {
  id: string;
  op: '+' | '-';
  /** For a story where nothing comes or goes: the hint for the wrong operation, instead of HINT_RECHENART. */
  opHint?: string;
  make: (n: string, a: number, x: number, c: number) => { context: string; question: string; goal: string; before: string; after: string };
}

const EXTRA_STORIES: readonly ExtraStory[] = [
  { id: 'sticker', op: '-', make: (n, a, x, c) => ({ context: `${n} hat ${a} Sticker und ${x} Murmeln. ${n} verschenkt ${c} Sticker.`, question: `Wie viele Sticker hat ${n} jetzt?`, goal: 'die Sticker am Ende', before: `${n} hat jetzt`, after: 'Sticker.' }) },
  { id: 'huehner', op: '-', opHint: 'Die schlafenden Hühner sind nicht wach.', make: (_, a, x, c) => ({ context: `Auf dem Hof leben ${a} Hühner und ${x} Ziegen. ${c} Hühner schlafen.`, question: 'Wie viele Hühner sind wach?', goal: 'die wachen Hühner', before: 'Wach sind', after: 'Hühner.' }) },
  { id: 'schulhof', op: '-', make: (_, a, x, c) => ({ context: `Auf dem Hof sind ${a} Kinder und ${x} Bälle. ${c} Kinder gehen weg.`, question: 'Wie viele Kinder sind jetzt dort?', goal: 'die Kinder am Ende', before: 'Dort sind jetzt', after: 'Kinder.' }) },
  { id: 'aepfel', op: '+', make: (n, a, x, c) => ({ context: `${n} hat ${a} Äpfel und ${x} Birnen. ${n} pflückt ${c} Äpfel.`, question: `Wie viele Äpfel hat ${n} jetzt?`, goal: 'die Äpfel am Ende', before: `${n} hat jetzt`, after: 'Äpfel.' }) },
  { id: 'buecher', op: '+', make: (n, a, x, c) => ({ context: `${n} hat ${a} Bücher und ${x} Hefte. ${n} bekommt ${c} Bücher.`, question: `Wie viele Bücher hat ${n} jetzt?`, goal: 'die Bücher am Ende', before: `${n} hat jetzt`, after: 'Bücher.' }) },
];

function extraNumbers(rng: Rng, op: '+' | '-'): { a: number; x: number; c: number } {
  const a = rng.int(14, 50);
  const c = op === '-' ? rng.int(3, a - 4) : rng.int(3, 30);
  // x is no number the calculation uses or gives, so 'Die x brauchst du nicht.' stays true in the worked steps
  let x = rng.int(5, 40);
  while ([a, c, a - c, a + c].includes(x)) x += 1;
  return { a, x, c };
}

function extraBugs(st: ExtraStory, a: number, x: number, c: number): MaybeBug[] {
  const plus = st.op === '+';
  return [
    { id: 'alle-zahlen', match: plus ? a + x + c : a + x - c, hint: HINT_ALLE_ZAHLEN },
    { id: 'alle-zahlen', match: plus ? x + c : x - c, hint: HINT_ALLE_ZAHLEN },
    { id: 'plus-minus-getauscht', match: plus ? a - c : a + c, hint: st.opHint ?? HINT_RECHENART },
  ];
}

/** A story with an extra number, solved as a number item. The button only on Stufe 3. */
function extraNumberTask(rng: Rng, stufe: 2 | 3, ab: 2 | 3, offerUnsolvable: boolean): Exercise {
  const st = rng.pick(EXTRA_STORIES);
  const { a, x, c } = extraNumbers(rng, st.op);
  const n = pickPerson(rng).name;
  const t = st.make(n, a, x, c);
  const plus = st.op === '+';
  const value = plus ? a + c : a - c;
  return build(fragePruefenSkill, stufe, {
    key: `extra:${st.id}:${a}:${x}:${c}`,
    ab,
    context: t.context,
    prompt: t.question,
    answer: sentenceAnswer(value, t.before, t.after, t.question, offerUnsolvable ? { offerUnsolvable: true } : {}),
    hints: ['Welche Zahlen passen zur Frage?', `Die ${x} brauchst du nicht.`],
    steps: [`Die ${x} brauchst du nicht.`, calcStep(a, plus ? c : -c), answerLine(t.before, value, t.after)],
    bugs: numberBugs(extraBugs(st, a, x, c), value),
    praise: 'Du hast nur die passenden Zahlen benutzt.',
    srText: spokenTask(t.context, t.question),
    kmk: KMK,
  });
}

/** 'Welche Zahl brauchst du für alle Äpfel nicht?' */
function whichNumberNotNeeded(rng: Rng): Exercise {
  const stufe: Stufe = 2;
  const st = rng.pick(EXTRA_STORIES);
  const { a, x, c } = extraNumbers(rng, st.op);
  const n = pickPerson(rng).name;
  const t = st.make(n, a, x, c);
  const prompt = `Welche Zahl brauchst du für ${t.goal} nicht?`;
  const why = `Diese Zahl brauchst du für ${t.goal}.`;
  return build(fragePruefenSkill, stufe, {
    key: `welche-zahl:${st.id}:${a}:${x}:${c}`,
    ab: 1,
    context: t.context,
    prompt,
    answer: makeChoice(rng, { label: String(x) }, [{ label: String(a), whyWrong: why }, { label: String(c), whyWrong: why }]),
    hints: ['Welche Zahlen passen zur Frage?', 'Eine Zahl gehört zu etwas anderem.'],
    steps: [`Du suchst ${t.goal}.`, `Die ${x} gehört zu etwas anderem.`],
    praise: 'Du hast die Zahlen genau geprüft.',
    srText: spokenTask(t.context, prompt),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: the number that is not needed has the same noun as the numbers that count. */
const SAME_NOUN = ['Sticker', 'Murmeln', 'Karten', 'Muscheln'];

function sameNounStory(rng: Rng) {
  const [p, other] = pickTwo(rng);
  const noun = rng.pick(SAME_NOUN);
  const plus = rng.chance(0.5);
  const { a, x, c } = extraNumbers(rng, plus ? '+' : '-');
  return {
    id: noun,
    plus,
    a,
    x,
    c,
    context: `${p.name} hat ${a} ${noun}, ${other.name} hat ${x} ${noun}. ${p.name} ${plus ? 'bekommt' : 'verschenkt'} ${c} ${noun}.`,
    // One question for both: 'noch' only with minus and 'jetzt' only with plus would give the operation away (T13).
    question: `Wie viele ${noun} hat ${p.name} jetzt?`,
    before: `${p.name} hat jetzt`,
    after: `${noun}.`,
    other: other.name,
  };
}

function sameNounNumber(rng: Rng): Exercise {
  const st = sameNounStory(rng);
  const value = st.plus ? st.a + st.c : st.a - st.c;
  const story: ExtraStory = { id: st.id, op: st.plus ? '+' : '-', make: () => ({ context: st.context, question: st.question, goal: '', before: st.before, after: st.after }) };
  return build(fragePruefenSkill, 2, {
    key: `gleiche-sache:${st.id}:${st.a}:${st.x}:${st.c}:${st.plus ? '+' : '-'}`,
    ab: 3,
    context: st.context,
    prompt: st.question,
    answer: sentenceAnswer(value, st.before, st.after, st.question),
    hints: ['Nach wem fragt die Aufgabe?', `Die Zahl von ${st.other} brauchst du nicht.`],
    steps: [`Die Zahl von ${st.other} brauchst du nicht.`, calcStep(st.a, st.plus ? st.c : -st.c), answerLine(st.before, value, st.after)],
    bugs: numberBugs(extraBugs(story, st.a, st.x, st.c), value),
    praise: 'Du hast nur die passenden Zahlen benutzt.',
    srText: spokenTask(st.context, st.question),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: choose the calculation without the number that is not needed. */
function calculationWithoutExtra(rng: Rng): Exercise {
  const st = sameNounStory(rng);
  const sign = st.plus ? '+' : MINUS;
  const prompt = 'Welche Rechnung passt zur Frage?';
  const right = `${st.a} ${sign} ${st.c}`;
  const why = `Die Zahl von ${st.other} brauchst du hier nicht.`;
  const [big, little] = st.x > st.c ? [st.x, st.c] : [st.c, st.x];
  return build(fragePruefenSkill, 2, {
    key: `welche-rechnung:${st.id}:${st.a}:${st.x}:${st.c}:${st.plus ? '+' : '-'}`,
    ab: 3,
    context: st.context,
    prompt,
    answer: makeChoice(rng, { label: right }, [
      { label: `${st.a} + ${st.x}`, whyWrong: why },
      { label: `${big} ${sign} ${little}`, whyWrong: why },
      // The larger number first: 14 − 30 could be struck out without reading the story.
      { label: st.plus ? `${Math.max(st.a, st.c)} ${MINUS} ${Math.min(st.a, st.c)}` : `${st.a} + ${st.c}`, whyWrong: HINT_RECHENART },
    ]),
    hints: ['Nach wem fragt die Aufgabe?', 'Welche Zahlen gehören zu diesem Kind?'],
    steps: [`Die Zahl von ${st.other} brauchst du nicht.`, `Die Rechnung ist ${right}.`],
    praise: 'Du hast nur die passenden Zahlen benutzt.',
    srText: spokenTask(st.context, prompt),
    kmk: KMK,
  });
}

/** Kapitänsaufgaben: the numbers have nothing to do with the question. */
const CAPTAIN: readonly { id: string; make: (a: number, b: number) => string; question: string; before: string; solvable: string; solvableBefore: string; solvableNoun: string }[] = [
  { id: 'stall', make: (a, b) => `Im Stall leben ${a} Hasen und ${b} Ziegen.`, question: 'Wie alt ist der Bauer?', before: 'Der Bauer ist', solvable: 'Wie viele Tiere leben im Stall?', solvableBefore: 'Im Stall leben', solvableNoun: 'Tiere' },
  { id: 'bus', make: (a, b) => `Im Bus sitzen ${a} Kinder und ${b} Erwachsene.`, question: 'Wie alt ist die Busfahrerin?', before: 'Die Busfahrerin ist', solvable: 'Wie viele Menschen sitzen im Bus?', solvableBefore: 'Im Bus sitzen', solvableNoun: 'Menschen' },
  { id: 'schiff', make: (a, b) => `Auf dem Schiff sind ${a} Schafe und ${b} Ziegen.`, question: 'Wie alt ist der Kapitän?', before: 'Der Kapitän ist', solvable: 'Wie viele Tiere sind auf dem Schiff?', solvableBefore: 'Auf dem Schiff sind', solvableNoun: 'Tiere' },
  { id: 'klasse', make: (a, b) => `In der Klasse sind ${a} Mädchen und ${b} Jungen.`, question: 'Wie alt ist die Lehrerin?', before: 'Die Lehrerin ist', solvable: 'Wie viele Kinder sind in der Klasse?', solvableBefore: 'In der Klasse sind', solvableNoun: 'Kinder' },
];

/**
 * Stories with a missing number. `withSecond` adds a number that does not help, `solved` is the same story with the number given.
 * `y` is what the solved story adds, `op` how the two numbers go together.
 */
interface MissingStory {
  id: string;
  context: string;
  withSecond: string;
  solved: string;
  question: string;
  before: string;
  after: string;
  a: number;
  second: number;
  y: number;
  op: '+' | '-' | '*';
  needed: string;
  /** What is being calculated, for a task that does not ask the question of the story. */
  goal: string;
  others: string[];
  missing: string;
}

function missingStories(rng: Rng): MissingStory[] {
  const [p, q2] = pickTwo(rng);
  const a = rng.int(12, 40);
  const second = rng.int(5, 11);
  // At least 2 stay: 'Im Bus sitzen noch 1 Kinder' would not read, and the Antwortsatz has no singular.
  const y = rng.int(3, Math.min(11, a - 2));
  // as in the plausibility facts of this skill: a Heft for 9 € would contradict them. Not 1 €: 1 · 3 has its answer in the story.
  const price = rng.int(2, 3);
  const pencil = rng.int(1, 2);
  const heftCount = rng.int(2, 5);
  return [
    { id: 'bus', a, second, y, op: '-', context: `Im Bus sitzen ${a} Kinder. An der Schule steigen Kinder aus.`, withSecond: `Im Bus sitzen ${a} Kinder und ${second} Erwachsene. An der Schule steigen Kinder aus.`, solved: `Im Bus sitzen ${a} Kinder. An der Schule steigen ${y} Kinder aus.`, question: 'Wie viele Kinder sitzen jetzt im Bus?', before: 'Im Bus sitzen jetzt', after: 'Kinder.', goal: 'die Kinder im Bus am Ende', needed: 'Wie viele Kinder steigen aus?', others: ['Welche Farbe hat der Bus?', 'Wie heißt die Schule?'], missing: 'Es fehlt: Wie viele Kinder steigen aus?' },
    { id: 'hefte', a: price, second: pencil, y: heftCount, op: '*', context: `Ein Heft kostet ${price}${NBSP}€. ${p.name} kauft Hefte.`, withSecond: `Ein Heft kostet ${price}${NBSP}€, ein Stift ${pencil}${NBSP}€. ${p.name} kauft Hefte.`, solved: `Ein Heft kostet ${price}${NBSP}€. ${p.name} kauft ${heftCount} Hefte.`, question: `Wie viel Euro bezahlt ${p.name}?`, before: `${p.name} bezahlt`, after: '€.', goal: 'den ganzen Preis', needed: `Wie viele Hefte kauft ${p.name}?`, others: ['Welche Farbe haben die Hefte?', `Wie alt ist ${p.name}?`], missing: `Es fehlt: Wie viele Hefte kauft ${p.name}?` },
    { id: 'sticker', a, second, y, op: '+', context: `${p.name} hat ${a} Sticker. ${q2.name} hat mehr Sticker.`, withSecond: `${p.name} hat ${a} Sticker und ${second} Murmeln. ${q2.name} hat mehr Sticker.`, solved: `${p.name} hat ${a} Sticker. ${q2.name} hat ${y} Sticker mehr.`, question: `Wie viele Sticker hat ${q2.name}?`, before: `${q2.name} hat`, after: 'Sticker.', goal: `die Sticker von ${q2.name}`, needed: `Wie viele Sticker hat ${q2.name} mehr?`, others: [`Wie alt ist ${q2.name}?`, `Wo wohnt ${q2.name}?`], missing: `Es fehlt: Wie viele Sticker hat ${q2.name} mehr?` },
    { id: 'kekse', a, second, y, op: '-', context: `Auf dem Teller liegen ${a} Kekse. Die Kinder essen ein paar Kekse.`, withSecond: `Auf dem Teller liegen ${a} Kekse und ${second} Äpfel. Die Kinder essen ein paar Kekse.`, solved: `Auf dem Teller liegen ${a} Kekse. Die Kinder essen ${y} Kekse.`, question: 'Wie viele Kekse liegen jetzt dort?', before: 'Dort liegen jetzt', after: 'Kekse.', goal: 'die Kekse am Ende', needed: 'Wie viele Kekse essen die Kinder?', others: ['Welche Farbe hat der Teller?', 'Wie alt sind die Kinder?'], missing: 'Es fehlt: Wie viele Kekse essen die Kinder?' },
  ];
}

const CAPTAIN_NUMBERS = (rng: Rng): [number, number] => {
  const a = rng.int(6, 15);
  let b = rng.int(6, 15);
  if (b === a) b += 1;
  return [a, b];
};

/** Stufe 3: Kapitänsaufgabe as a number item with the button. */
function captainNumber(rng: Rng): Exercise {
  const stufe: Stufe = 3;
  const st = rng.pick(CAPTAIN);
  const [a, b] = CAPTAIN_NUMBERS(rng);
  const context = st.make(a, b);
  const bugs: MaybeBug[] = [
    { id: 'alle-zahlen', match: a + b, hint: HINT_ALLE_ZAHLEN },
    { id: 'alle-zahlen', match: Math.abs(a - b), hint: HINT_ALLE_ZAHLEN },
    { id: 'alle-zahlen', match: a, hint: HINT_ALLE_ZAHLEN },
    { id: 'alle-zahlen', match: b, hint: HINT_ALLE_ZAHLEN },
  ];
  return build(fragePruefenSkill, stufe, {
    key: `kapitaen:${st.id}:${a}:${b}`,
    ab: 2,
    context,
    prompt: st.question,
    answer: sentenceAnswer(null, st.before, 'Jahre alt.', st.question, { offerUnsolvable: true }),
    hints: ['Passt die Frage zu den Zahlen?', 'Steht das Alter in der Geschichte?'],
    steps: ['Die Zahlen sagen nichts über das Alter.', 'Die Frage passt nicht zu den Zahlen.', 'Die Aufgabe ist nicht lösbar.'],
    bugs: numberBugs(bugs, null),
    praise: 'Du hast die Frage genau geprüft.',
    srText: spokenTask(context, st.question),
    kmk: KMK,
  });
}

/** Stufe 3, AB II and III: a number is missing, number item with the button. AB III has a second number that does not help. */
function missingNumber(rng: Rng, ab: 2 | 3): Exercise {
  const st = rng.pick(missingStories(rng));
  const context = ab === 3 ? st.withSecond : st.context;
  const bugs: MaybeBug[] = [
    { id: 'alle-zahlen', match: st.a, hint: 'Diese Zahl steht schon da. Welche Zahl fehlt noch?' },
    ...(ab === 3
      ? [
          { id: 'alle-zahlen', match: st.a + st.second, hint: HINT_ALLE_ZAHLEN },
          { id: 'alle-zahlen', match: Math.abs(st.a - st.second), hint: HINT_ALLE_ZAHLEN },
          { id: 'alle-zahlen', match: st.second, hint: 'Diese Zahl gehört zu etwas anderem. Welche Zahl fehlt noch?' },
        ]
      : []),
  ];
  return build(fragePruefenSkill, 3, {
    key: `${ab === 3 ? 'fehlt-zweite' : 'fehlt'}:${st.id}:${st.a}${ab === 3 ? `:${st.second}` : ''}`,
    ab,
    context,
    prompt: st.question,
    answer: sentenceAnswer(null, st.before, st.after, st.question, { offerUnsolvable: true }),
    hints: ['Welche Zahl brauchst du zum Rechnen?', 'Steht diese Zahl in der Geschichte?'],
    steps: [st.missing, 'Ohne diese Zahl kannst du nicht rechnen.', 'Die Aufgabe ist nicht lösbar.'],
    bugs: numberBugs(bugs, null),
    praise: 'Du hast die fehlende Angabe bemerkt.',
    srText: spokenTask(context, st.question),
    kmk: KMK,
  });
}

/** Stufe 3, AB II: the story of a missing number with the number given: solvable, and the button stays. */
function solvableStory(rng: Rng): Exercise {
  const st = rng.pick(missingStories(rng));
  const value = st.op === '+' ? st.a + st.y : st.op === '-' ? st.a - st.y : st.a * st.y;
  const sign = st.op === '+' ? '+' : st.op === '-' ? MINUS : TIMES;
  const swapped = st.op === '+' ? st.a - st.y : st.a + st.y;
  const swapHint = st.op === '*' ? 'Jedes Heft kostet gleich viel. Rechne mal.' : HINT_RECHENART;
  return build(fragePruefenSkill, 3, {
    key: `loesbar:${st.id}:${st.a}:${st.y}`,
    ab: 2,
    context: st.solved,
    prompt: st.question,
    answer: sentenceAnswer(value, st.before, st.after, st.question, { offerUnsolvable: true }),
    hints: ['Welche Zahl brauchst du zum Rechnen?', 'Steht diese Zahl in der Geschichte?'],
    steps: ['Alle Zahlen stehen in der Geschichte.', `${st.a} ${sign} ${st.y} = ${value}`, answerLine(st.before, value, st.after)],
    bugs: numberBugs([{ id: 'plus-minus-getauscht', match: swapped, hint: swapHint }], value),
    praise: 'Du hast geprüft: Alle Zahlen stehen da.',
    srText: spokenTask(st.solved, st.question),
    kmk: KMK,
  });
}

/** Stufe 3, AB I: the Kapitänsaufgabe as a choice: does the question fit the numbers? Half of the items can be calculated. */
function captainChoice(rng: Rng): Exercise {
  const st = rng.pick(CAPTAIN);
  const [a, b] = CAPTAIN_NUMBERS(rng);
  const context = st.make(a, b);
  const notPossible = 'Das kannst du hier nicht ausrechnen.';
  if (rng.chance(0.5)) {
    const wrongs: ChoiceOption[] = [a + b, Math.abs(a - b), a].map((n) => ({ label: `${n} ${plural(n, 'Jahr', 'Jahre')}`, whyWrong: HINT_ALLE_ZAHLEN }));
    return build(fragePruefenSkill, 3, {
      key: `kapitaen-wahl:${st.id}:${a}:${b}`,
      ab: 1,
      context,
      prompt: st.question,
      answer: makeChoice(rng, { label: notPossible }, wrongs),
      hints: ['Passt die Frage zu den Zahlen?', 'Steht das Alter in der Geschichte?'],
      steps: ['Die Zahlen sagen nichts über das Alter.', notPossible],
      praise: 'Du hast die Frage genau geprüft.',
      srText: spokenTask(context, st.question),
      kmk: KMK,
    });
  }
  const noun = st.solvableNoun;
  const value = a + b;
  const wrongs: ChoiceOption[] = [
    { label: notPossible, whyWrong: 'Die Frage passt zu den Zahlen. Du kannst hier rechnen.' },
    // the difference can be 1, and '1 Kinder' is no German
    { label: `${Math.abs(a - b) >= 2 ? Math.abs(a - b) : b} ${noun}`, whyWrong: 'Gefragt sind beide Mengen zusammen.' },
    { label: `${a} ${noun}`, whyWrong: 'Gefragt sind beide Mengen zusammen.' },
  ];
  return build(fragePruefenSkill, 3, {
    key: `passt-wahl:${st.id}:${a}:${b}`,
    ab: 1,
    context,
    prompt: st.solvable,
    answer: makeChoice(rng, { label: `${value} ${noun}` }, wrongs),
    hints: ['Passt die Frage zu den Zahlen?', 'Nach welchen Dingen fragt die Aufgabe?'],
    steps: ['Die Frage passt zu den Zahlen.', `${a} + ${b} = ${value}`, `${st.solvableBefore} ${value} ${noun}.`],
    praise: 'Du hast die Frage genau geprüft.',
    srText: spokenTask(context, st.solvable),
    kmk: KMK,
  });
}

/** Stufe 3, AB I: which question has to be answered first. */
function missingChoice(rng: Rng): Exercise {
  const st = rng.pick(missingStories(rng));
  const prompt = `Was musst du für ${st.goal} noch wissen?`;
  const why = 'Das hilft dir beim Rechnen nicht.';
  return build(fragePruefenSkill, 3, {
    key: `fehlt-wahl:${st.id}:${st.a}`,
    ab: 1,
    context: st.context,
    prompt,
    answer: makeChoice(rng, { label: st.needed }, st.others.map((label) => ({ label, whyWrong: why }))),
    hints: ['Welche Zahl brauchst du zum Rechnen?', 'Steht diese Zahl in der Geschichte?'],
    steps: ['Eine Zahl steht nicht in der Geschichte.', st.missing],
    praise: 'Du hast die fehlende Angabe bemerkt.',
    srText: spokenTask(st.context, prompt),
    kmk: KMK,
  });
}

export const fragePruefenSkill: SkillDef = {
  id: 'sachaufgaben.frage-pruefen',
  topicId: 'sachaufgaben',
  title: 'Passt das?',
  description: 'Du prüfst, ob die Antwort oder die Frage Sinn ergibt.',
  stufen: {
    1: 'Kann der Preis oder die Länge stimmen?',
    2: 'Eine Zahl brauchst du nicht',
    3: 'Es fehlt etwas, oder die Frage passt nicht',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      const f = rng.pick(FACTS);
      if (ab === 1) return plausible(rng, f);
      if (ab === 2) return rng.chance(0.6) ? pickValue(rng, f) : pickUnit(rng, f);
      return whichCannotBeTrue(rng);
    }
    if (stufe === 2) {
      if (ab === 1) return whichNumberNotNeeded(rng);
      if (ab === 2) return extraNumberTask(rng, 2, 2, false);
      return rng.chance(0.5) ? sameNounNumber(rng) : calculationWithoutExtra(rng);
    }
    if (ab === 1) return rng.chance(0.5) ? captainChoice(rng) : missingChoice(rng);
    if (ab === 2) {
      const form = rng.pick(['kapitaen', 'fehlt', 'loesbar'] as const);
      if (form === 'kapitaen') return captainNumber(rng);
      return form === 'fehlt' ? missingNumber(rng, 2) : solvableStory(rng);
    }
    return rng.chance(0.5) ? missingNumber(rng, 3) : extraNumberTask(rng, 3, 3, true);
  },
};
