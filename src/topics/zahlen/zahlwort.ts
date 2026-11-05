/**
 * Zahlen lesen und hören (docs/research.md §6). The only skill with number words in the task text (T10). The Stufe chooses the
 * content: Stufe 1 word to number 21–59 without look-alikes, Stufe 2 word to number up to 99 with swapped digits, Stufe 3 number to
 * word, Paschzahlen and the Zahlendreher. The AB level is the demand inside it: AB I chooses, AB II types or chooses among more
 * look-alikes, AB III reasons about the number behind the word.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { fmt, numberWord } from '../../core/format';
import type { Ab, ChoiceOption, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, makeChoice, multiBugs } from '../shared';
import { dreherOf, fromForms, isPasch, onesOf, placeValueOf, swapDigits, tensOf, type Form, type Forms } from './helpers';

const ID = 'zahlen.zahlwort';
const SKILL = { id: ID, topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum', 'ZO.stellenwert'];

const DREHER_HINT = 'Hör genau hin: Der Zehner steht vorne, der Einer hinten.';
const ZIFFERN_HINT = 'Eine Zahl bis 99 hat nur zwei Ziffern: Zehner, Einer.';
const HEAR_HINT = 'Im Wort hörst du zuerst den Einer, dann den Zehner.';
const WRITE_HINT = 'Du schreibst zuerst den Zehner, dann den Einer.';

/** A two-digit number whose digits differ and whose ones are not 0: it has a Zahlendreher. */
function dreherNumber(rng: Rng, minTens: number, maxTens: number): number {
  const t = rng.int(minTens, maxTens);
  const e = rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== t));
  return t * 10 + e;
}

const wordSteps = (n: number) => [
  `Im Wort ${numberWord(n)} kommt zuerst der Einer: ${onesOf(n)}.`,
  `Dann kommt der Zehner: ${numberWord(tensOf(n) * 10)}.`,
  { text: `Du schreibst den Zehner vorne: ${fmt(n)}.`, visual: placeValueOf(n) },
];

/** Near numbers, inside 13–99 (11 and 12 have no Einer in their word) and never a Pasch or the number itself. */
function nearNumbers(rng: Rng, n: number): number[] {
  const t = tensOf(n);
  const e = onesOf(n);
  const fits = (w: number) => w >= 13 && w <= 99 && w !== n && onesOf(w) !== 0 && !isPasch(w);
  const out = [(t + 1) * 10 + e, (t - 1) * 10 + e, t * 10 + (e + 1), t * 10 + (e - 1), (t + 2) * 10 + e, (t - 2) * 10 + e];
  // Both digits changed: at the edge of the numbers these fill up the list.
  const further = [(t + 1) * 10 + (e + 1), (t - 1) * 10 + (e + 1), (t + 1) * 10 + (e - 1), (t - 1) * 10 + (e - 1)];
  return [...rng.shuffle(out.filter(fits)), ...rng.shuffle(further.filter(fits))];
}

const notThisWord = (w: number): string => `Das ist ${numberWord(w)}. Der Einer kommt im Wort zuerst.`;

// ─── Stufe 1: 21–59, no look-alike ────────────────────────────────────────────

const wordToNumberPlain: Form = (rng, stufe, ab) => {
  const n = dreherNumber(rng, 2, 5);
  const word = numberWord(n);
  const t = tensOf(n);
  const e = onesOf(n);
  // No look-alike: another ten, other ones, and no swapped digits.
  const pool: number[] = [];
  for (let w = 21; w <= 59; w++) {
    if (tensOf(w) !== t && onesOf(w) !== e && onesOf(w) !== 0 && w !== swapDigits(n) && onesOf(w) !== t && tensOf(w) !== e) pool.push(w);
  }
  const wrongs: ChoiceOption[] = rng.sample(pool, Math.min(pool.length, MAX_CHOICE_OPTIONS[stufe] - 1)).map((w) => ({ label: fmt(w), whyWrong: notThisWord(w) }));
  const prompt = `Welche Zahl heißt ${word}?`;
  return build(SKILL, stufe, {
    key: `wort:${n}`,
    ab,
    prompt,
    // Read aloud, the options would say the word to find: the child has to read them.
    answer: { ...makeChoice(rng, { label: fmt(n) }, wrongs, { max: MAX_CHOICE_OPTIONS[stufe] }), silentOptions: true },
    hints: [HEAR_HINT, WRITE_HINT],
    steps: wordSteps(n),
    praise: 'Du hast Zehner und Einer im Wort erkannt.',
    srText: prompt,
    kmk: KMK,
  });
};

function typeNumber(stufe: Stufe, ab: Ab, n: number) {
  const prompt = `Schreibe als Zahl: ${numberWord(n)}.`;
  const t = tensOf(n);
  const e = onesOf(n);
  return build(SKILL, stufe, {
    key: `tippen:${n}`,
    ab,
    prompt,
    answer: { kind: 'number', value: n },
    hints: [HEAR_HINT, 'Eine Zahl bis 99 hat zwei Ziffern.'],
    steps: wordSteps(n),
    bugs: bugList(n, [
      ['zahlendreher', swapDigits(n), DREHER_HINT],
      ['zahlwort-ziffern-1', t * 100 + e, ZIFFERN_HINT],
      ['zahlwort-ziffern-2', e * 100 + t * 10, ZIFFERN_HINT],
    ]),
    praise: 'Du hast die Zahl mit zwei Ziffern geschrieben.',
    srText: prompt,
    kmk: KMK,
  });
}

const typeUpTo59: Form = (rng, stufe, ab) => typeNumber(stufe, ab, dreherNumber(rng, 2, 5));

/** Stufe 1, AB III: the places behind the word. */
const wordToPlaces: Form = (rng, stufe, ab) => {
  const n = dreherNumber(rng, 2, 5);
  const t = tensOf(n);
  const e = onesOf(n);
  const prompt = `Wie viele Zehner und Einer hat ${numberWord(n)}?`;
  const fields: MultiField[] = [
    { id: 'z', value: t, after: 'Zehner' },
    { id: 'e', value: e, after: 'Einer' },
  ];
  return build(SKILL, stufe, {
    key: `stellen:${n}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [HEAR_HINT, 'Der Zehner steht im Wort hinten.'],
    steps: wordSteps(n),
    bugs: multiBugs(
      [
        { id: 'zahlendreher', match: { z: e, e: t }, hint: HEAR_HINT },
        { id: 'zahlwort-ziffern-3', match: { z: t * 10 }, hint: 'Gefragt ist die Anzahl der Zehner.' },
      ],
      fields,
    ),
    praise: 'Du hast Zehner und Einer im Wort getrennt.',
    srText: prompt,
    kmk: KMK,
  });
};

/** Stufe 1, AB III: the number after the word: first read it, then go on. */
const numberAfterWord: Form = (rng, stufe, ab) => {
  let n = dreherNumber(rng, 2, 5);
  // The answer stays inside 21–59.
  if (n === 59) n = 58;
  const value = n + 1;
  const word = numberWord(n);
  const prompt = `Welche Zahl kommt nach ${word}?`;
  return build(SKILL, stufe, {
    key: `danach:${n}`,
    ab,
    prompt,
    answer: { kind: 'number', value },
    hints: [HEAR_HINT, 'Die Zahl danach ist 1 größer.'],
    steps: [`Das Wort ${word} steht für ${fmt(n)}.`, `${fmt(n)} + 1 = ${fmt(value)}`, `Nach ${word} kommt ${fmt(value)}.`],
    bugs: bugList(value, [
      ['zahlwort-selbst', n, 'Das ist die Zahl im Wort. Gesucht ist die Zahl danach.'],
      ['zahlendreher', dreherOf(value), DREHER_HINT],
      ['zahlendreher', swapDigits(n), DREHER_HINT],
    ]),
    praise: 'Du hast das Wort gelesen und 1 dazugezählt.',
    srText: prompt,
    kmk: KMK,
  });
};

// ─── Stufe 2: up to 99, swapped digits ────────────────────────────────────────

const wordToNumberSwapped: Form = (rng, stufe, ab) => {
  const n = dreherNumber(rng, 2, 9);
  const prompt = `Welche Zahl heißt ${numberWord(n)}?`;
  const near = nearNumbers(rng, n).filter((w) => w !== swapDigits(n));
  const wrongs: ChoiceOption[] = [{ label: fmt(swapDigits(n)), whyWrong: DREHER_HINT }, ...near.map((w) => ({ label: fmt(w), whyWrong: notThisWord(w) }))];
  return build(SKILL, stufe, {
    key: `dreher-wahl:${n}`,
    ab,
    prompt,
    // Read aloud, the options would say the word to find: the child has to read them.
    answer: { ...makeChoice(rng, { label: fmt(n) }, wrongs, { max: MAX_CHOICE_OPTIONS[stufe] }), silentOptions: true },
    hints: [HEAR_HINT, WRITE_HINT],
    steps: wordSteps(n),
    praise: 'Du hast die Zahl ohne Dreher gefunden.',
    srText: prompt,
    kmk: KMK,
  });
};

/** The tens from 60 on, and the teens: the words a child mixes up most. Not 11 and 12, which have no Einer in their word. */
const typeHard: Form = (rng, stufe, ab) => typeNumber(stufe, ab, rng.chance(0.2) ? rng.int(13, 19) : dreherNumber(rng, 6, 9));

/** Stufe 2, AB III: read the word, then turn the digits. */
const swapTheWord: Form = (rng, stufe, ab) => {
  const n = dreherNumber(rng, 2, 9);
  const value = swapDigits(n);
  const word = numberWord(n);
  const prompt = `Tausche Zehner und Einer von ${word}. Welche Zahl entsteht?`;
  return build(SKILL, stufe, {
    key: `tauschen:${n}`,
    ab,
    prompt,
    answer: { kind: 'number', value },
    hints: [HEAR_HINT, 'Stell dir die Zahl vor. Tausche dann die Ziffern.'],
    steps: [`Das Wort ${word} steht für ${fmt(n)}.`, `Getauscht: ${onesOf(n)} Zehner und ${tensOf(n)} Einer.`, `Die neue Zahl heißt ${fmt(value)}.`],
    bugs: bugList(value, [
      ['zahlendreher', n, 'Das ist die Zahl im Wort. Tausche noch die beiden Ziffern.'],
      ['zahlwort-ziffern-1', onesOf(n) * 100 + tensOf(n), ZIFFERN_HINT],
    ]),
    praise: 'Du hast die Ziffern getauscht.',
    srText: prompt,
    kmk: [...KMK, 'MS.muster'],
  });
};

/** Stufe 2, AB III: two words with swapped digits. The options are words: digits would show the larger number at a glance. */
const largerWord: Form = (rng, stufe, ab) => {
  let n = dreherNumber(rng, 2, 9);
  while (onesOf(n) < 2) n = dreherNumber(rng, 2, 9);
  const other = swapDigits(n);
  const big = Math.max(n, other);
  const small = Math.min(n, other);
  const prompt = 'Welches Wort nennt die größere Zahl?';
  return build(SKILL, stufe, {
    key: `groesser:${small}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: numberWord(big) }, [{ label: numberWord(small), whyWrong: `Das Wort steht für ${fmt(small)}. Die andere Zahl hat mehr Zehner.` }]),
    hints: ['Stell dir beide Wörter als Zahl vor.', 'Schau dann zuerst auf die Zehner.'],
    steps: [`Das eine Wort steht für ${fmt(big)}, das andere für ${fmt(small)}.`, `${tensOf(big)} Zehner sind mehr als ${tensOf(small)} Zehner.`, `Das Wort ${numberWord(big)} nennt die größere Zahl.`],
    praise: 'Du hast beide Wörter als Zahl gelesen.',
    srText: prompt,
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

// ─── Stufe 3: number to word, Paschzahlen, the Zahlendreher ───────────────────

const numberToWord =
  (options: number): Form =>
  (rng, stufe, ab) => {
    const n = dreherNumber(rng, 2, 9);
    const prompt = 'Welches Wort passt zur Zahl?';
    const near = nearNumbers(rng, n).filter((w) => w !== swapDigits(n));
    const wrongs: ChoiceOption[] = [
      { label: numberWord(swapDigits(n)), whyWrong: `Das Wort gehört zu ${fmt(swapDigits(n))}. Die Ziffern sind vertauscht.` },
      ...near.map((w) => ({ label: numberWord(w), whyWrong: `Das Wort gehört zu ${fmt(w)}. Schau noch einmal auf die Ziffern.` })),
    ];
    return build(SKILL, stufe, {
      key: `zahl-zu-wort:${n}:${options}`,
      ab,
      prompt,
      // Only the table shows the number: an expression or a numeral in srText would be read aloud as the word to find (T16).
      visual: placeValueOf(n),
      answer: makeChoice(rng, { label: numberWord(n) }, wrongs, { max: options }),
      hints: ['Im Wort kommt zuerst der Einer, dann der Zehner.', 'In der Tafel steht der Einer rechts.'],
      steps: [
        `${fmt(n)} hat ${tensOf(n)} Zehner und ${onesOf(n)} Einer.`,
        'Im Wort kommt zuerst der Einer, dann der Zehner.',
        `Das Wort heißt ${numberWord(n)}.`,
      ],
      praise: 'Du hast das Wort zu den Ziffern gefunden.',
      srText: prompt,
      kmk: KMK,
    });
  };

/** The Paschzahl among words: the options are words, so the two equal digits have to be read out of them. */
const paschWord: Form = (rng, stufe, ab) => {
  const digit = rng.int(1, 9);
  const p = digit * 11;
  const prompt = 'Tausche Zehner und Einer. Bei welchem Wort bleibt die Zahl gleich?';
  const near = [p + 1, p - 1, p + 10, p - 10, p + 2, p - 2].filter((w) => w >= 12 && w <= 98 && onesOf(w) !== 0 && !isPasch(w));
  const wrongs: ChoiceOption[] = rng.shuffle(near).map((w) => ({ label: numberWord(w), whyWrong: `Das Wort steht für ${fmt(w)}. Getauscht heißt die Zahl ${fmt(swapDigits(w))}.` }));
  return build(SKILL, stufe, {
    key: `pasch:${p}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: numberWord(p) }, wrongs, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Stell dir jedes Wort als Zahl vor.', 'Such die Zahl mit gleichen Zehnern und Einern.'],
    steps: [`Das Wort ${numberWord(p)} steht für ${fmt(p)}.`, `Bei ${fmt(p)} sind Zehner und Einer gleich: ${digit} und ${digit}.`, `Getauscht bleibt die Zahl ${fmt(p)}.`],
    praise: 'Du hast die zwei gleichen Ziffern gefunden.',
    srText: prompt,
    kmk: [...KMK, 'MS.muster'],
  });
};

const spotDreher: Form = (rng, stufe, ab) => {
  const count = MAX_CHOICE_OPTIONS[stufe];
  const numbers = new Set<number>();
  while (numbers.size < count) {
    const n = dreherNumber(rng, 2, 9);
    if (![...numbers].some((m) => swapDigits(m) === n)) numbers.add(n);
  }
  const [dreher, ...fine] = [...numbers];
  const prompt = 'Wo sind Zehner und Einer vertauscht?';
  const label = (word: number, digits: number) => `${numberWord(word)} = ${fmt(digits)}`;
  const wrongs: ChoiceOption[] = fine.map((n) => ({ label: label(n, n), whyWrong: `Das passt: ${tensOf(n)} Zehner und ${onesOf(n)} Einer.` }));
  return build(SKILL, stufe, {
    key: `dreher-finden:${dreher}:${fine.join('-')}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: label(dreher, swapDigits(dreher)) }, wrongs, { max: count }),
    hints: [HEAR_HINT, 'Prüfe bei jeder Zeile: Steht der Zehner vorne?'],
    steps: [
      `${numberWord(dreher)} hat ${tensOf(dreher)} Zehner und ${onesOf(dreher)} Einer.`,
      `Die Zahl ${fmt(swapDigits(dreher))} hat ${tensOf(swapDigits(dreher))} Zehner und ${onesOf(swapDigits(dreher))} Einer.`,
      `Hier ist der Dreher. Richtig ist ${fmt(dreher)}.`,
    ],
    praise: 'Du hast den Zahlendreher gefunden.',
    srText: prompt,
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

const FORMS: Forms = {
  1: { 1: [wordToNumberPlain], 2: [typeUpTo59], 3: [wordToPlaces, numberAfterWord] },
  2: { 1: [wordToNumberSwapped], 2: [typeHard], 3: [swapTheWord, largerWord] },
  3: { 1: [numberToWord(4)], 2: [numberToWord(MAX_CHOICE_OPTIONS[3]), paschWord], 3: [spotDreher] },
};

export const zahlwortSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Zahlen lesen und hören',
  description: 'Du hörst oder liest ein Zahlwort und findest die Zahl.',
  stufen: {
    1: 'Zahlwörter bis 59 und die passende Zahl.',
    2: 'Zahlwörter bis 99, auch mit getauschten Ziffern.',
    3: 'Von der Zahl zum Wort; Paschzahlen; Zahlendreher finden.',
  },
  kmk: KMK,
  generate: fromForms(FORMS),
};
