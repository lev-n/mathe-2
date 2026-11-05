/**
 * Wie viel mehr? Differences between two numbers. The Stufe chooses the content (docs/research.md §6), the AB level the demand inside it:
 * Stufe 1, difference with a picture (at most 10 pictures in a row), ≤ 20. AB I: 'mehr', one picture for one thing.
 * AB II: 'weniger', or pictures that stand for 2. AB III: how many are missing to have as many.
 * Stufe 2, "7 mehr als", ≤ 100, and at every AB also 'Wie viele mehr?', so that "mehr" goes with plus and with minus (T13). AB I: within a ten.
 * AB II: over a ten. AB III: two-digit, the relation comes first, or how many are missing to have as many.
 * Stufe 3, reverse wording: 'Tom hat 12. Das sind 5 mehr als Mia.', where "mehr" means minus (T13, F17). AB I: within a ten.
 * AB II: over a ten. AB III: two-digit, and the person asked about stands behind 'als'.
 */
import type { Ab, Exercise, PictoIcon, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, pickTwo, targetAb } from '../shared';
import {
  HINT_UNTERSCHIED,
  answerLine,
  calcStep,
  crossingDifference,
  crossingDifferenceOnes,
  crossingSum,
  crossingSumOnes,
  hintsWithoutAnswer,
  kleinerVonGroesser,
  plainDifferenceOnes,
  plainSumOnes,
  sentenceAnswer,
  spokenTask,
  zehnerVergessen,
  type BugCandidate,
} from './helpers';

const PICTURES: readonly { icon: PictoIcon; noun: string }[] = [
  { icon: 'apfel', noun: 'Äpfel' },
  { icon: 'ball', noun: 'Bälle' },
  { icon: 'buch', noun: 'Bücher' },
  { icon: 'stern', noun: 'Sterne' },
];

const NOUNS = ['Karten', 'Sticker', 'Murmeln', 'Muscheln', 'Kastanien'];

const KMK = ['ZO.operationen', 'ZO.sachrechnen', 'PK.modellieren'];

const UNTERSCHIED = (word: 'mehr' | 'weniger') => `Gefragt ist der Unterschied: Wie viele sind es ${word}?`;

/** Two rows in a random order, so the longer one is not always on top. iconValue 1 or 2, with the legend of the picture. */
function rowsPicture(rng: Rng, icon: PictoIcon, noun: string, large: { name: string; count: number }, small: { name: string; count: number }, iconValue: number): Visual {
  const rows = rng.shuffle([large, small]);
  return { type: 'pictogram', title: noun, categories: rows.map((r) => r.name), values: rows.map((r) => r.count), iconValue, icon };
}

/** Stufe 1, AB I and II: the difference of two rows. */
function withPicture(rng: Rng, ab: 1 | 2): Exercise {
  const { icon, noun } = rng.pick(PICTURES);
  const [p, q] = pickTwo(rng);
  // AB II: half of the items have pictures that stand for 2, up to 20
  const iconValue = ab === 2 && rng.chance(0.5) ? 2 : 1;
  const smallRow = rng.int(2, 8);
  const largeRow = rng.int(smallRow + 2, 10);
  const small = smallRow * iconValue;
  const large = largeRow * iconValue;
  const asksMore = ab === 1 || (iconValue === 2 && rng.chance(0.5));
  const value = large - small;
  const word = asksMore ? 'mehr' : 'weniger';
  const prompt = asksMore ? `Wie viele ${noun} hat ${p.name} mehr als ${q.name}?` : `Wie viele ${noun} hat ${q.name} weniger als ${p.name}?`;
  const before = `${asksMore ? p.name : q.name} hat`;
  const after = `${noun} ${word}.`;
  const visual = rowsPicture(rng, icon, noun, { name: p.name, count: large }, { name: q.name, count: small }, iconValue);
  const bugs: BugCandidate[] = [
    ['mehr-unterschied', asksMore ? large : small, UNTERSCHIED(word)],
    ['signalwort', large + small, HINT_UNTERSCHIED],
  ];
  if (iconValue === 2) bugs.push(['bild-legende', largeRow - smallRow, `Schau in die Legende: Ein Bild steht für 2 ${noun}.`]);
  return build(vergleichenSkill, 1, {
    key: `${iconValue === 2 ? 'bild-zwei' : 'bild'}:${icon}:${large}:${small}:${word}`,
    ab,
    prompt,
    visual,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: iconValue === 2 ? ['Vergleiche die beiden Reihen Bild für Bild.', 'Ein Bild steht hier für 2.'] : ['Vergleiche die beiden Reihen Bild für Bild.', `Welche Bilder von ${p.name} haben keinen Partner?`],
    steps: [`${p.name} hat ${large} ${noun}. ${q.name} hat ${small} ${noun}.`, calcStep(large, -small), answerLine(before, value, after)],
    bugs: bugList(value, bugs),
    praise: 'Du hast die Reihen Bild für Bild verglichen.',
    srText: spokenTask(undefined, prompt, visual),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: q wants as many as p. Nothing comes yet: the two rows show what is missing. */
function equalize(rng: Rng): Exercise {
  const { icon, noun } = rng.pick(PICTURES);
  const [p, q] = pickTwo(rng);
  const iconValue = rng.chance(0.5) ? 2 : 1;
  const smallRow = rng.int(2, 8);
  const largeRow = rng.int(smallRow + 2, 10);
  const small = smallRow * iconValue;
  const large = largeRow * iconValue;
  const value = large - small;
  const context = `${q.name} möchte so viele ${noun} wie ${p.name} haben.`;
  const prompt = `Wie viele ${noun} fehlen ${q.name} noch?`;
  const before = `${q.name} fehlen noch`;
  const after = `${noun}.`;
  const visual = rowsPicture(rng, icon, noun, { name: p.name, count: large }, { name: q.name, count: small }, iconValue);
  const bugs: BugCandidate[] = [
    ['mehr-unterschied', large, `${p.name} hat schon so viele. Wie viele fehlen ${q.name}?`],
    ['signalwort', large + small, HINT_UNTERSCHIED],
  ];
  if (iconValue === 2) bugs.push(['bild-legende', largeRow - smallRow, `Schau in die Legende: Ein Bild steht für 2 ${noun}.`]);
  return build(vergleichenSkill, 1, {
    key: `angleichen-bild:${icon}:${large}:${small}`,
    ab: 3,
    context,
    prompt,
    visual,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Vergleiche die beiden Reihen Bild für Bild.', `Welche Bilder von ${p.name} haben keinen Partner?`],
    steps: [`${p.name} hat ${large} ${noun}. ${q.name} hat ${small} ${noun}.`, calcStep(large, -small), answerLine(before, value, after)],
    bugs: bugList(value, bugs),
    praise: 'Du hast die fehlenden Bilder gefunden.',
    srText: spokenTask(context, prompt, visual),
    kmk: KMK,
  });
}

/** Stufe 2: 'q hat d mehr als p'. AB I within a ten, AB II over a ten; AB III the relation comes first. */
function moreThanStory(rng: Rng, ab: Ab): Exercise {
  const noun = rng.pick(NOUNS);
  const [p, q] = pickTwo(rng);
  const plus = rng.chance(0.5);
  const crossing = ab !== 1;
  let a: number;
  let d: number;
  if (ab === 1) [a, d] = plus ? plainSumOnes(rng) : plainDifferenceOnes(rng);
  else if (ab === 2) [a, d] = plus ? crossingSum(rng) : crossingDifference(rng);
  else [a, d] = plus ? crossingSumOnes(rng) : crossingDifferenceOnes(rng);
  const value = plus ? a + d : a - d;
  const word = plus ? 'mehr' : 'weniger';
  const first = ab === 3;
  const context = first ? `${q.name} hat ${d} ${noun} ${word} als ${p.name}. ${p.name} hat ${a} ${noun}.` : `${p.name} hat ${a} ${noun}. ${q.name} hat ${d} ${noun} ${word} als ${p.name}.`;
  const question = `Wie viele ${noun} hat ${q.name}?`;
  const before = `${q.name} hat`;
  const after = `${noun}.`;
  const direction = `Hat ${q.name} mehr oder weniger als ${p.name}?`;
  const howToCount = crossing ? 'Rechne erst bis zum nächsten Zehner, dann weiter.' : `Rechne von ${a} aus ${d} ${plus ? 'weiter' : 'zurück'}.`;
  return build(vergleichenSkill, 2, {
    key: `${first ? 'beziehung-zuerst' : plus ? 'mehr-als' : 'weniger-als'}:${noun}:${a}:${plus ? '+' : '-'}:${d}`,
    ab,
    context,
    prompt: question,
    answer: sentenceAnswer(value, before, after, question),
    hints: hintsWithoutAnswer([direction, howToCount], value, direction),
    steps: [`${q.name} hat ${word} als ${p.name}.`, calcStep(a, plus ? d : -d), answerLine(before, value, after)],
    bugs: bugList(value, [
      ['plus-minus-getauscht', plus ? a - d : a + d, direction],
      ['mehr-unterschied', d, `Gefragt ist nicht der Unterschied. Wie viele ${noun} hat ${q.name}?`],
      ...(crossing ? [plus ? zehnerVergessen(a, d) : kleinerVonGroesser(a, d)] : []),
    ]),
    praise: first ? 'Du hast die Geschichte genau gelesen.' : crossing ? 'Du hast an den Zehner gedacht.' : 'Du hast den Vergleich richtig gelesen.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

/** Two two-digit numbers whose difference stays within a ten: 47 − 23. */
function plainDifference(rng: Rng): [number, number] {
  const ob = rng.int(1, 7);
  const tb = rng.int(1, 7);
  return [rng.int(tb + 1, 9) * 10 + rng.int(ob + 1, 9), tb * 10 + ob];
}

/** Stufe 2: the difference of two numbers, without a picture. "mehr" stands in the question, and it means minus (T13). */
function differenceStory(rng: Rng, ab: Ab): Exercise {
  const noun = rng.pick(NOUNS);
  const [p, q] = pickTwo(rng);
  const [large, small] = ab === 1 ? plainDifference(rng) : ab === 2 ? crossingDifference(rng) : crossingDifference(rng, 1);
  const value = large - small;
  const context = `${p.name} hat ${small} ${noun}. ${q.name} hat ${large} ${noun}.`;
  const question = `Wie viele ${noun} hat ${q.name} mehr?`;
  const before = `${q.name} hat`;
  const after = `${noun} mehr.`;
  return build(vergleichenSkill, 2, {
    key: `unterschied:${noun}:${large}:${small}`,
    ab,
    context,
    prompt: question,
    answer: sentenceAnswer(value, before, after, question),
    hints: hintsWithoutAnswer(['Gefragt ist der Unterschied.', `Wie weit ist es von ${small} bis ${large}?`], value, 'Gefragt ist der Unterschied.'),
    steps: [`${q.name} hat mehr. Gesucht ist der Unterschied.`, calcStep(large, -small), answerLine(before, value, after)],
    bugs: bugList(value, [
      ['mehr-unterschied', large, UNTERSCHIED('mehr')],
      ['signalwort', large + small, HINT_UNTERSCHIED],
      kleinerVonGroesser(large, small),
    ]),
    praise: 'Du hast den Unterschied gefunden.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: q wants as many as p. */
function equalizeStory(rng: Rng): Exercise {
  const noun = rng.pick(NOUNS);
  const [p, q] = pickTwo(rng);
  const [large, small] = crossingDifference(rng, 1);
  const value = large - small;
  const context = `${p.name} hat ${large} ${noun}, ${q.name} hat ${small} ${noun}. ${q.name} möchte so viele ${noun} wie ${p.name} haben.`;
  const question = `Wie viele ${noun} fehlen ${q.name} noch?`;
  const before = `${q.name} fehlen noch`;
  const after = `${noun}.`;
  return build(vergleichenSkill, 2, {
    key: `angleichen:${noun}:${large}:${small}`,
    ab: 3,
    context,
    prompt: question,
    answer: sentenceAnswer(value, before, after, question),
    hints: hintsWithoutAnswer([`Die Zahl von ${p.name} ist das Ziel.`, `Wie weit ist es von ${small} bis ${large}?`], value, `Die Zahl von ${p.name} ist das Ziel.`),
    steps: [`${q.name} hat weniger. Gesucht ist die Lücke.`, calcStep(large, -small), answerLine(before, value, after)],
    bugs: bugList(value, [
      ['mehr-unterschied', large, `${p.name} hat schon so viele. Wie viele fehlen ${q.name}?`],
      ['signalwort', large + small, HINT_UNTERSCHIED],
      kleinerVonGroesser(large, small),
    ]),
    praise: 'Du hast den Unterschied gefunden.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

/** Stufe 3: 'p hat a. Das sind d mehr als q.' AB I within a ten, AB II and III over a ten. */
function reverseStory(rng: Rng, ab: Ab, vorn: boolean): Exercise {
  const noun = rng.pick(NOUNS);
  const [p, q] = pickTwo(rng);
  const more = rng.chance(0.6);
  let a: number;
  let d: number;
  if (ab === 1) [a, d] = more ? plainDifferenceOnes(rng) : plainSumOnes(rng);
  else if (ab === 2) [a, d] = more ? crossingDifferenceOnes(rng) : crossingSumOnes(rng);
  else [a, d] = more ? crossingDifference(rng, 1) : crossingSum(rng, 1);
  const value = more ? a - d : a + d;
  const word = more ? 'mehr' : 'weniger';
  const opposite = more ? 'weniger' : 'mehr';
  const context = vorn ? `${p.name} hat ${d} ${noun} ${word} als ${q.name}. ${p.name} hat ${a} ${noun}.` : `${p.name} hat ${a} ${noun}. Das sind ${d} ${noun} ${word} als ${q.name}.`;
  const question = `Wie viele ${noun} hat ${q.name}?`;
  const before = `${q.name} hat`;
  const after = `${noun}.`;
  // nothing changes here and the story says the opposite word, so HINT_SIGNALWORT has no use: the hint names who has what
  const direction = `${p.name} hat ${word}. Also hat ${q.name} ${opposite}.`;
  return build(vergleichenSkill, 3, {
    key: `${vorn ? 'umgekehrt-vorn' : 'umgekehrt'}:${noun}:${a}:${word}:${d}`,
    ab,
    context,
    prompt: question,
    answer: sentenceAnswer(value, before, after, question),
    hints: hintsWithoutAnswer([`Wer hat mehr: ${p.name} oder ${q.name}?`, direction], value, direction),
    steps: [`${p.name} hat ${d} ${noun} ${word}. Also hat ${q.name} ${d} ${noun} ${opposite}.`, calcStep(a, more ? -d : d), answerLine(before, value, after)],
    bugs: bugList(value, [
      ['signalwort', more ? a + d : a - d, direction],
      ['mehr-unterschied', d, `Gefragt ist nicht der Unterschied. Wie viele ${noun} hat ${q.name}?`],
      ...(ab === 1 ? [] : [more ? kleinerVonGroesser(a, d) : zehnerVergessen(a, d)]),
    ]),
    praise: 'Du hast die Geschichte genau gelesen.',
    srText: spokenTask(context, question),
    kmk: KMK,
  });
}

export const vergleichenSkill: SkillDef = {
  id: 'sachaufgaben.vergleichen',
  topicId: 'sachaufgaben',
  title: 'Wie viel mehr?',
  description: 'Du findest den Unterschied zwischen zwei Zahlen.',
  stufen: {
    1: 'Unterschied im Bild ablesen, Zahlen bis 20',
    2: 'Sätze wie „7 mehr als“, Zahlen bis 100',
    3: 'Umgekehrt: Tom hat 12. Das sind 5 mehr als Mia.',
  },
  kmk: KMK,
  generate(rng, stufe: Stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 3 ? equalize(rng) : withPicture(rng, ab);
    if (stufe === 2) {
      if (ab === 1 || ab === 2) return rng.chance(0.6) ? moreThanStory(rng, ab) : differenceStory(rng, ab);
      const form = rng.pick(['beziehung', 'angleichen', 'unterschied'] as const);
      if (form === 'beziehung') return moreThanStory(rng, 3);
      return form === 'angleichen' ? equalizeStory(rng) : differenceStory(rng, 3);
    }
    return reverseStory(rng, ab, ab === 3 && rng.chance(0.5));
  },
};
