/**
 * Gerade und ungerade, optional (docs/research.md §6, status opt). The Stufe chooses the content: Stufe 1 numbers up to 20 as dot
 * pairs, Stufe 2 numbers up to 100 by their ones, Stufe 3 checks claims about the sum of two odd numbers up to 20. The AB level is the
 * demand inside it: AB I the direct form, AB II without the picture or among more numbers, AB III a gap or a claim that needs a reason.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX, fmt } from '../../core/format';
import type { Ab, ChoiceOption, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, makeChoice, multiBugs, speak } from '../shared';
import { NO, YES, fromForms, onesOf, tensOf, type Form, type Forms } from './helpers';

const ID = 'zahlen.gerade-ungerade';
const SKILL = { id: ID, topicId: 'zahlen' } as const;
const KMK = ['MS.muster', 'ZO.zahlraum'];

const WORDS = ['gerade', 'ungerade'];
const ONES_HINT = 'Schau nur auf die Einer.';
const EVEN_ONES = 'Gerade Einer sind 0, 2, 4, 6 und 8.';
const PAIR_HINT = 'Immer 2 Punkte bilden ein Paar.';
const ALONE_HINT = 'Bleibt ein Punkt allein? Dann ist die Zahl ungerade.';

const isEven = (n: number) => n % 2 === 0;
const wordOf = (n: number) => (isEven(n) ? 'gerade' : 'ungerade');
const pairs = (...groups: number[]): Visual => ({ type: 'dotArray', groups, perRow: 2 });
const pairWord = (k: number) => (k === 1 ? 'Paar' : 'Paare');

/** A yes-or-no answer on a claim. */
function yesNo(rng: Rng, right: boolean, whyWrong: string) {
  return makeChoice(rng, { label: right ? YES : NO }, [{ label: right ? NO : YES, whyWrong }], { order: [YES, NO] });
}

// ─── Stufe 1: up to 20, as dot pairs ──────────────────────────────────────────

const pairsAnswer: Form = (rng, stufe, ab) => {
  const n = rng.int(2, 20);
  const prompt = 'Ist die Zahl gerade oder ungerade?';
  const expression = fmt(n);
  const even = isEven(n);
  return build(SKILL, stufe, {
    key: `paare:${n}`,
    ab,
    prompt,
    expression,
    visual: pairs(n),
    answer: makeChoice(
      rng,
      { label: wordOf(n) },
      [{ label: even ? 'ungerade' : 'gerade', whyWrong: even ? 'Schau auf die Paare: Jeder Punkt hat einen Partner.' : 'Schau auf die Paare: Ein Punkt bleibt allein.' }],
      { order: WORDS },
    ),
    hints: [PAIR_HINT, ALONE_HINT],
    steps: [
      { text: `${fmt(n)} Punkte bilden ${Math.floor(n / 2)} ${pairWord(Math.floor(n / 2))}.`, visual: pairs(n) },
      even ? 'Kein Punkt bleibt allein.' : 'Ein Punkt bleibt allein.',
      `${fmt(n)} ist ${wordOf(n)}.`,
    ],
    praise: 'Du hast die Punkte in Paaren gesehen.',
    srText: speak(`${prompt} ${expression}`),
    kmk: KMK,
  });
};

/** One number of the wanted kind among others. */
function pickOne(rng: Rng, stufe: Stufe, ab: Ab, max: 20 | 100) {
  const wantEven = rng.chance(0.5);
  const word = wantEven ? 'gerade' : 'ungerade';
  const small = max === 20;
  const min = small ? 2 : 21;
  const pool: number[] = [];
  for (let n = min; n <= max; n++) pool.push(n);
  const fits = pool.filter((n) => isEven(n) === wantEven);
  const others = pool.filter((n) => isEven(n) !== wantEven);
  // Up to 100: the tens of the wrong numbers look like the wanted kind, so only the ones decide.
  const tricky = small ? others : others.filter((n) => isEven(tensOf(n)) === wantEven);
  const x = rng.pick(fits);
  const wrong = rng.sample(tricky, MAX_CHOICE_OPTIONS[stufe] - 1);
  const why = (w: number): ChoiceOption => ({
    label: fmt(w),
    whyWrong: small ? (wantEven ? `Bei ${fmt(w)} bleibt ein Punkt allein.` : `Bei ${fmt(w)} hat jeder Punkt einen Partner.`) : `${fmt(w)} hat ${onesOf(w)} Einer. Die Einer entscheiden.`,
  });
  const prompt = `Welche Zahl ist ${word}?`;
  return build(SKILL, stufe, {
    key: `waehlen:${max}:${word}:${x}:${[...wrong].sort((a, b) => a - b).join('-')}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fmt(x) }, wrong.map(why), { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: small ? ['Stell dir die Zahlen als Punkte in Paaren vor.', ALONE_HINT] : [ONES_HINT, EVEN_ONES],
    steps: [
      small ? { text: `${fmt(x)} Punkte in Paaren.`, visual: pairs(x) } : `Schau auf die Einer von ${fmt(x)}: ${onesOf(x)}.`,
      small ? (wantEven ? 'Kein Punkt bleibt allein.' : 'Ein Punkt bleibt allein.') : `${onesOf(x)} ist ${word}.`,
      `Also ist ${fmt(x)} ${word}.`,
    ],
    praise: small ? 'Du hast an die Paare gedacht.' : 'Du hast auf die Einer geschaut.',
    srText: `${prompt} Die Zahlen stehen zur Auswahl.`,
    kmk: KMK,
  });
}

/** Stufe 1, AB III: the pairs in numbers, without a picture. */
const countPairs: Form = (rng, stufe, ab) => {
  const n = rng.int(7, 20);
  const count = Math.floor(n / 2);
  const alone = n % 2;
  const prompt = `${fmt(n)} Punkte bilden Paare. Trage beide Zahlen ein.`;
  const fields: MultiField[] = [
    { id: 'paare', value: count, before: 'Paare:' },
    { id: 'allein', value: alone, before: 'Punkte allein:' },
  ];
  return build(SKILL, stufe, {
    key: `paare-zaehlen:${n}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [PAIR_HINT, 'Wie oft passt die 2 in die Zahl?'],
    steps: [
      { text: `${fmt(n)} Punkte in Paaren.`, visual: pairs(n) },
      `Das sind ${count} ${pairWord(count)}.`,
      alone ? 'Ein Punkt bleibt allein.' : 'Kein Punkt bleibt allein.',
    ],
    bugs: multiBugs(
      [
        { id: 'paare-punkte', match: { paare: n }, hint: 'Das sind alle Punkte. Ein Paar hat 2 Punkte.' },
        { id: 'paare-allein', match: { allein: 1 - alone }, hint: 'Prüfe: Geht die Zahl in Paaren auf?' },
      ],
      fields,
    ),
    praise: 'Du hast die Paare ausgerechnet.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** Stufe 1, AB III: a claim about the pairs of a number, without a picture. */
const pairClaim: Form = (rng, stufe, ab) => {
  const n = rng.int(5, 20);
  const claimAll = rng.chance(0.5);
  const right = claimAll === isEven(n);
  const prompt = `${fmt(n)} Punkte: ${claimAll ? 'Jeder Punkt hat einen Partner.' : 'Ein Punkt bleibt allein.'} Stimmt das?`;
  return build(SKILL, stufe, {
    key: `paare-stimmt:${n}:${claimAll ? 'alle' : 'allein'}`,
    ab,
    prompt,
    answer: yesNo(rng, right, isEven(n) ? 'Stell dir die Paare vor: Jeder Punkt hat einen Partner.' : 'Stell dir die Paare vor: Ein Punkt bleibt allein.'),
    hints: ['Stell dir die Punkte in Paaren vor.', PAIR_HINT],
    steps: [
      { text: `${fmt(n)} Punkte in Paaren.`, visual: pairs(n) },
      isEven(n) ? 'Kein Punkt bleibt allein.' : 'Ein Punkt bleibt allein.',
      right ? 'Der Satz stimmt.' : 'Der Satz stimmt nicht.',
    ],
    praise: 'Du hast die Aussage geprüft.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

// ─── Stufe 2: up to 100, by the ones ──────────────────────────────────────────

const byOnes: Form = (rng, stufe, ab) => {
  const n = rng.int(21, 100);
  const prompt = 'Ist die Zahl gerade oder ungerade?';
  const expression = fmt(n);
  const tensMislead = n < 100 && isEven(tensOf(n)) !== isEven(n);
  return build(SKILL, stufe, {
    key: `einer:${n}`,
    ab,
    prompt,
    expression,
    answer: makeChoice(
      rng,
      { label: wordOf(n) },
      [{ label: isEven(n) ? 'ungerade' : 'gerade', whyWrong: tensMislead ? 'Schau nicht auf die Zehner. Schau nur auf die Einer.' : EVEN_ONES }],
      { order: WORDS },
    ),
    hints: [ONES_HINT, EVEN_ONES],
    steps: [`Die Einer von ${fmt(n)} sind ${onesOf(n)}.`, `${onesOf(n)} ist ${wordOf(onesOf(n))}.`, `Also ist ${fmt(n)} ${wordOf(n)}.`],
    praise: 'Du hast nur auf die Einer geschaut.',
    srText: speak(`${prompt} ${expression}`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III, the other way round: which ones make this kind of number. */
const onesGap: Form = (rng, stufe, ab) => {
  const t = rng.int(2, 9);
  const wantEven = rng.chance(0.5);
  const word = wantEven ? 'gerade' : 'ungerade';
  const other = wantEven ? 'ungerade' : 'gerade';
  const fit = rng.pick(wantEven ? [2, 4, 6, 8] : [1, 3, 5, 7, 9]);
  const wrong = rng.sample(wantEven ? [1, 3, 5, 7, 9] : [2, 4, 6, 8], MAX_CHOICE_OPTIONS[stufe] - 1);
  const expression = `${t}${BOX}`;
  const prompt = `Die Zahl soll ${word} sein. Welcher Einer passt?`;
  return build(SKILL, stufe, {
    key: `einer-luecke:${t}:${word}:${fit}:${[...wrong].sort((a, b) => a - b).join('-')}`,
    ab,
    prompt,
    expression,
    answer: makeChoice(rng, { label: String(fit) }, wrong.map((w) => ({ label: String(w), whyWrong: `Mit der ${w} ist die Zahl ${other}.` })), { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: [ONES_HINT, EVEN_ONES],
    steps: ['Die Zehner entscheiden nicht. Die Einer entscheiden.', `${fit} ist ${word}.`, `Also ist ${t * 10 + fit} ${word}.`],
    praise: 'Du hast den passenden Einer gefunden.',
    srText: speak(`${prompt} ${expression}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

/** Stufe 2, AB III: a claim about the next number: the ones change, so the kind changes. */
const nextClaim: Form = (rng, stufe, ab) => {
  const n = rng.int(21, 98);
  const next = n + 1;
  const claimEven = rng.chance(0.5);
  const right = claimEven === isEven(next);
  const prompt = `Nach ${fmt(n)} kommt eine ${claimEven ? 'gerade' : 'ungerade'} Zahl. Stimmt das?`;
  return build(SKILL, stufe, {
    key: `nach:${n}:${claimEven ? 'gerade' : 'ungerade'}`,
    ab,
    prompt,
    answer: yesNo(rng, right, `Nach ${fmt(n)} kommt ${fmt(next)}. Schau auf die Einer.`),
    hints: ['Welche Zahl kommt danach?', ONES_HINT],
    steps: [`Nach ${fmt(n)} kommt ${fmt(next)}.`, `${fmt(next)} hat ${onesOf(next)} Einer. Also ist ${fmt(next)} ${wordOf(next)}.`, right ? 'Der Satz stimmt.' : 'Der Satz stimmt nicht.'],
    praise: 'Du hast die Aussage geprüft.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

// ─── Stufe 3: sums of two odd numbers up to 20 ────────────────────────────────

const SUM_WHY = 'Jede Zahl hat einen Punkt allein. Beide bilden zusammen ein Paar.';

/** Two odd numbers with a sum in this range. */
function oddPair(rng: Rng, minSum: number, maxSum: number): [number, number] {
  for (;;) {
    const a = rng.int(0, 9) * 2 + 1;
    const b = rng.int(0, 9) * 2 + 1;
    if (a + b >= minSum && a + b <= maxSum) return [a, b];
  }
}

const sumClaim =
  (withDots: boolean): Form =>
  (rng, stufe, ab) => {
    const [a, b] = withDots ? oddPair(rng, 4, 12) : oddPair(rng, 12, 20);
    const sum = a + b;
    const claimEven = rng.chance(0.5);
    const expression = `${a} + ${b}`;
    const prompt = `${expression} ergibt eine ${claimEven ? 'gerade' : 'ungerade'} Zahl. Stimmt das?`;
    return build(SKILL, stufe, {
      key: `${withDots ? 'summe' : 'summe-ohne'}:${a}:${b}:${claimEven ? 'gerade' : 'ungerade'}`,
      ab,
      prompt,
      ...(withDots ? { visual: pairs(a, b) } : {}),
      answer: yesNo(rng, claimEven, SUM_WHY),
      hints: ['Beide Zahlen sind ungerade. Bei jeder bleibt ein Punkt allein.', 'Rechne aus und schau auf die Einer.'],
      steps: [
        { text: `${expression} = ${sum}`, visual: pairs(a, b) },
        `${sum} hat ${onesOf(sum)} Einer. Also ist ${sum} gerade.`,
        claimEven ? 'Der Satz stimmt.' : 'Der Satz stimmt nicht.',
      ],
      praise: 'Du hast die Aussage geprüft.',
      srText: speak(prompt),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  };

/** Stufe 3, AB III: can this result be right? An odd result cannot, and that shows without working out the sum. */
const checkResult: Form = (rng, stufe, ab) => {
  const [a, b] = oddPair(rng, 6, 20);
  const sum = a + b;
  const right = rng.chance(0.5);
  const shown = right ? sum : sum - 1;
  const expression = `${a} + ${b} = ${shown}`;
  const prompt = 'Kann das Ergebnis stimmen?';
  return build(SKILL, stufe, {
    key: `pruefen:${a}:${b}:${shown}`,
    ab,
    prompt,
    expression,
    answer: yesNo(rng, right, right ? 'Das Ergebnis ist gerade. Rechne nach.' : '2 ungerade Zahlen ergeben eine gerade Zahl.'),
    hints: ['Beide Zahlen sind ungerade. Bei jeder bleibt ein Punkt allein.', 'Ist das Ergebnis gerade oder ungerade?'],
    steps: [
      { text: `${a} und ${b} sind ungerade.`, visual: pairs(a, b) },
      'Die beiden einzelnen Punkte bilden zusammen ein Paar. Das Ergebnis ist gerade.',
      right ? `${shown} ist gerade. Das passt: ${a} + ${b} = ${sum}.` : `${shown} ist ungerade. Das passt nicht: ${a} + ${b} = ${sum}.`,
    ],
    praise: 'Du hast das Ergebnis geprüft.',
    srText: speak(`${prompt} ${expression}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

/** Stufe 3, AB III: the second number is not named. Only the rule can answer. */
const ruleClaim: Form = (rng, stufe, ab) => {
  const a = rng.int(1, 8) * 2 + 1;
  const claimEven = rng.chance(0.5);
  const prompt = `Zu ${a} kommt eine ungerade Zahl. Das Ergebnis ist ${claimEven ? 'gerade' : 'ungerade'}. Stimmt das?`;
  return build(SKILL, stufe, {
    key: `regel:${a}:${claimEven ? 'gerade' : 'ungerade'}`,
    ab,
    prompt,
    answer: yesNo(rng, claimEven, SUM_WHY),
    hints: [`Bei ${a} bleibt ein Punkt allein.`, 'Bei der anderen Zahl bleibt auch ein Punkt allein.'],
    steps: [`Bei ${a} bleibt ein Punkt allein. Bei der anderen Zahl auch.`, 'Die beiden Punkte bilden ein Paar. Das Ergebnis ist gerade.', claimEven ? 'Der Satz stimmt.' : 'Der Satz stimmt nicht.'],
    praise: 'Du hast mit der Regel gedacht.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

const FORMS: Forms = {
  1: { 1: [pairsAnswer], 2: [(rng, stufe, ab) => pickOne(rng, stufe, ab, 20)], 3: [countPairs, pairClaim] },
  2: { 1: [byOnes], 2: [(rng, stufe, ab) => pickOne(rng, stufe, ab, 100)], 3: [onesGap, nextClaim] },
  3: { 1: [sumClaim(true)], 2: [sumClaim(false)], 3: [checkResult, ruleClaim] },
};

export const geradeUngeradeSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Gerade und ungerade',
  description: 'Du erkennst gerade und ungerade Zahlen.',
  optional: 'extra',
  stufen: {
    1: 'Zahlen bis 20 als Punktepaare.',
    2: 'Zahlen bis 100: Schau auf die Einer.',
    3: '2 ungerade Zahlen zusammen: Stimmt das?',
  },
  kmk: KMK,
  generate: fromForms(FORMS),
};
