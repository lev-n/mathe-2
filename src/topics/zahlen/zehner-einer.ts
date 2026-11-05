/**
 * Zehner und Einer (docs/research.md §6). The Stufe chooses the content: Stufe 1 reads sticks and tables, Stufe 2 takes unordered forms
 * and numbers with a 0 (0 Z 9 E = □ would only repeat the 9, so a number like 7 is split into its 2 places), Stufe 3 bundles (2 Z 14 E) and splits (32 = 30 + 2). The AB level is the demand inside it: AB I the direct
 * form, AB II harder numbers or a less direct form, AB III goes the other way or fills a gap.
 */
import { BOX, fmt } from '../../core/format';
import type { Ab, ChoiceOption, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, multiBugs, plural, speak } from '../shared';
import { DREHER_HINT, dreherOf, fromForms, isPasch, onesOf, pictureChoice, placeValueOf, tensOf, type Form, type Forms } from './helpers';

const ID = 'zahlen.zehner-einer';
const SKILL = { id: ID, topicId: 'zahlen' } as const;
const KMK = ['ZO.stellenwert', 'ZO.zahlraum'];

const LETTERS_HINT = 'Schau auf die Buchstaben: Z sind Zehner, E sind Einer.';
const WORTH_HINT = '1 Zehner ist so viel wie 10 Einer.';
const NEW_TEN_HINT = 'Der neue Zehner zählt mit. Zähle den Zehner zu den anderen dazu.';
const BUNDLE_HINT = '10 Einer sind 1 Zehner. Bündle zuerst.';
const PLACE_HINT = 'Der Zehner steht in der Zahl vorne, der Einer hinten.';

/** 'ist' after a 1, otherwise 'sind': '1 Zehner ist 10.', '3 Zehner sind 30.' */
const verb = (n: number) => (n === 1 ? 'ist' : 'sind');
const zehner = (t: number) => `${t} Zehner ${verb(t)} ${t * 10}.`;
const worthOfTens = (t: number) => `Die ${t} steht für Zehner. Wie viel ${verb(t)} ${t} Zehner?`;

function twoDigit(rng: Rng): number {
  return rng.int(1, 9) * 10 + rng.int(1, 9);
}

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
/** Few sticks and few cubes: seen at a glance. */
const EASY_NUMBERS = digits.flatMap((t) => digits.map((e) => t * 10 + e)).filter((n) => tensOf(n) <= 5 && onesOf(n) <= 5);
const HARD_NUMBERS = digits.flatMap((t) => digits.map((e) => t * 10 + e)).filter((n) => !EASY_NUMBERS.includes(n));

function readNumber(rng: Rng, stufe: Stufe, ab: Ab, n: number) {
  const form = rng.pick(['stangen', 'tafel'] as const);
  const t = tensOf(n);
  const e = onesOf(n);
  const prompt = form === 'stangen' ? 'Welche Zahl zeigen die Stangen und Würfel?' : 'Welche Zahl steht in der Tafel?';
  const visual = form === 'stangen' ? ({ type: 'baseTen', tens: t, ones: e } as const) : placeValueOf(n);
  return build(SKILL, stufe, {
    key: `${form}:${n}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: n },
    hints: [form === 'stangen' ? 'Eine Stange hat 10 Würfel. Rechne zuerst die Stangen.' : LETTERS_HINT, PLACE_HINT],
    steps: [zehner(t), e === 1 ? 'Dazu kommt 1 Einer.' : `Dazu kommen ${e} Einer.`, `${t * 10} + ${e} = ${n}`],
    bugs: bugList(n, [
      ['z-e-reihenfolge', t !== e ? e * 10 + t : null, form === 'stangen' ? 'Die Stangen sind Zehner, die Würfel sind Einer.' : LETTERS_HINT],
      ['stuecke-gezaehlt', t + e, form === 'stangen' ? 'Eine Stange zählt 10, nicht 1.' : WORTH_HINT],
    ]),
    praise: form === 'stangen' ? 'Du hast die Stangen als Zehner gezählt.' : 'Du hast Zehner und Einer gelesen.',
    srText: `${prompt} Das Bild zeigt ${form === 'stangen' ? 'Zehnerstangen und Einerwürfel' : 'eine Stellenwerttafel'}.`,
    kmk: KMK,
  });
}

const readEasy: Form = (rng, stufe, ab) => readNumber(rng, stufe, ab, rng.pick(EASY_NUMBERS));
const readHard: Form = (rng, stufe, ab) => readNumber(rng, stufe, ab, rng.pick(HARD_NUMBERS));

/** Stufe 1, AB III, the other way round: from the number to the picture of its sticks and cubes. */
const whichPicture: Form = (rng, stufe, ab) => {
  // At most 6 sticks and 6 cubes: 4 pictures have to fit a phone.
  const t = rng.int(1, 6);
  const e = rng.int(1, 6);
  const n = t * 10 + e;
  const picture = (tens: number, ones: number): Visual => ({ type: 'baseTen', tens, ones });
  const other = (tens: number, ones: number) => ({ visual: picture(tens, ones), whyWrong: `Dieses Bild zeigt ${fmt(tens * 10 + ones)}. Die Stangen sind Zehner.` });
  const swapped = t !== e ? [{ visual: picture(e, t), whyWrong: `Dieses Bild zeigt ${fmt(e * 10 + t)}. Stangen und Würfel sind vertauscht.` }] : [];
  const near = [t > 1 ? other(t - 1, e) : other(t + 2, e), other(t + 1, e), e > 1 ? other(t, e - 1) : other(t, e + 2), other(t, e + 1)];
  const prompt = 'Welches Bild zeigt die Zahl?';
  const stange = (k: number) => `${k} ${plural(k, 'Stange', 'Stangen')}`;
  const wuerfel = (k: number) => `${k} ${plural(k, 'Würfel', 'Würfeln')}`;
  return build(SKILL, stufe, {
    key: `bild:${n}`,
    ab,
    prompt,
    expression: fmt(n),
    answer: pictureChoice(rng, picture(t, e), [...swapped, ...rng.shuffle(near)].slice(0, 3)),
    hints: ['Die Zehner sind die Stangen. Die Einer sind die Würfel.', PLACE_HINT],
    steps: [zehner(t), e === 1 ? 'Dazu kommt 1 Einer.' : `Dazu kommen ${e} Einer.`, { text: `Das Bild mit ${stange(t)} und ${wuerfel(e)} passt.`, visual: picture(t, e) }],
    praise: 'Du hast die Stangen als Zehner erkannt.',
    srText: speak(`${prompt} ${fmt(n)}`),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

const splitIntoPlaces: Form = (rng, stufe, ab) => {
  const n = twoDigit(rng);
  const t = tensOf(n);
  const e = onesOf(n);
  const prompt = 'Wie viele Zehner und Einer hat die Zahl?';
  const fields: MultiField[] = [
    { id: 'z', value: t, after: 'Zehner' },
    { id: 'e', value: e, after: 'Einer' },
  ];
  return build(SKILL, stufe, {
    key: `stellen:${n}`,
    ab,
    prompt,
    expression: fmt(n),
    answer: { kind: 'multi', fields },
    hints: ['Die erste Ziffer sind die Zehner.', 'Die zweite Ziffer sind die Einer.'],
    steps: [
      { text: `In ${fmt(n)} steht vorne die ${t}: ${t} Zehner.`, visual: placeValueOf(n) },
      `Hinten steht die ${e}: ${e} Einer.`,
      `${fmt(n)} hat ${t} Zehner und ${e} Einer.`,
    ],
    bugs: multiBugs([t !== e && { id: 'z-e-reihenfolge', match: { z: e, e: t }, hint: 'Die erste Ziffer sind die Zehner, die zweite die Einer.' }], fields),
    praise: 'Du hast Zehner und Einer getrennt.',
    srText: speak(`${prompt} ${fmt(n)}`),
    kmk: KMK,
  });
};

const unordered: Form = (rng, stufe, ab) => {
  const n = twoDigit(rng);
  const t = tensOf(n);
  const e = onesOf(n);
  const prompt = 'Welche Zahl ist das?';
  const expression = `${e} E ${t} Z = ${BOX}`;
  return build(SKILL, stufe, {
    key: `ungeordnet:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: n },
    hints: [LETTERS_HINT, 'Schreibe die Zehner vorne und die Einer hinten.'],
    steps: [`${t} Z ${verb(t)} ${t} Zehner.`, `${e} E ${verb(e)} ${e} Einer.`, { text: `Die Zehner stehen vorne: ${fmt(n)}.`, visual: placeValueOf(n) }],
    bugs: bugList(n, [
      ['z-e-reihenfolge', t !== e ? e * 10 + t : null, LETTERS_HINT],
      ['stuecke-gezaehlt', t + e, WORTH_HINT],
    ]),
    praise: 'Du hast auf die Buchstaben geschaut.',
    srText: speak(`${prompt} ${expression}`),
    kmk: KMK,
  });
};

/** Numbers like 40: the ones place holds nothing. */
const withZero: Form = (rng, stufe, ab) => {
  const t = rng.int(1, 9);
  const e = 0;
  const n = t * 10;
  const prompt = 'Welche Zahl ist das?';
  const parts = rng.chance(0.5) ? `${t} Z ${e} E` : `${e} E ${t} Z`;
  const expression = `${parts} = ${BOX}`;
  return build(SKILL, stufe, {
    key: `null:${parts.replace(/ /g, '')}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: n },
    hints: [LETTERS_HINT, 'Es gibt keine Einer. Die 0 hält ihren Platz frei.'],
    steps: [`Hier ${verb(t)} ${t} Zehner.`, 'Es gibt keine Einer. Hinten steht eine 0.', { text: `Die Zahl heißt ${n}.`, visual: { type: 'baseTen', tens: t, ones: 0 } }],
    bugs: bugList(n, [['null-stelle', t, 'Hier sind es Zehner. Die 0 hält den Platz der Einer frei.']]),
    praise: 'Du hast an die 0 gedacht.',
    srText: speak(`${prompt} ${expression}`),
    kmk: KMK,
  });
};

/** Numbers like 7: from the number to its 2 places, where the tens place holds nothing. The ones come first in half of the items. */
const zeroTens: Form = (rng, stufe, ab) => {
  const e = rng.int(1, 9);
  const onesFirst = rng.chance(0.5);
  const prompt = 'Wie viele Zehner und Einer hat die Zahl?';
  const z: MultiField = { id: 'z', value: 0, after: 'Zehner' };
  const einer: MultiField = { id: 'e', value: e, after: 'Einer' };
  const fields = onesFirst ? [einer, z] : [z, einer];
  return build(SKILL, stufe, {
    key: `null-zehner:${e}:${onesFirst ? 'ez' : 'ze'}`,
    ab,
    prompt,
    expression: fmt(e),
    answer: { kind: 'multi', fields },
    hints: ['Wie viele Ziffern hat die Zahl?', 'Bei einer Ziffer gibt es keine Zehner.'],
    steps: ['Die Zahl hat nur eine Ziffer.', 'Es gibt keine Zehner. Für die Zehner schreibst du 0.', { text: `${fmt(e)} hat 0 Zehner und ${e} Einer.`, visual: { type: 'baseTen', tens: 0, ones: e } }],
    bugs: multiBugs([{ id: 'null-stelle', match: { z: e, e: 0 }, hint: 'Die Ziffer zählt als Einer. Es gibt keine Zehner.' }], fields),
    praise: 'Du hast an die 0 gedacht.',
    srText: speak(`${prompt} ${fmt(e)}`),
    kmk: KMK,
  });
};

/** A number for Stufe 2, AB III: with a 0 at the ones or without one. No Pasch: its turned form is the same number. */
function unorderedTarget(rng: Rng): number {
  for (;;) {
    const n = rng.chance(0.3) ? rng.int(1, 9) * 10 : twoDigit(rng);
    if (!isPasch(n)) return n;
  }
}

/** Stufe 2, AB III, the other way round: from the number to the parts, with the ones first. */
const placesOnesFirst: Form = (rng, stufe, ab) => {
  const n = unorderedTarget(rng);
  const t = tensOf(n);
  const e = onesOf(n);
  const prompt = 'Schreibe die Zahl mit den Einern zuerst.';
  const fields: MultiField[] = [
    { id: 'e', value: e, after: 'Einer' },
    { id: 'z', value: t, after: 'Zehner' },
  ];
  return build(SKILL, stufe, {
    key: `umgekehrt:${n}`,
    ab,
    prompt,
    expression: fmt(n),
    answer: { kind: 'multi', fields },
    hints: ['Lies die Wörter neben den Feldern. Die Einer kommen zuerst.', PLACE_HINT],
    steps: [`In ${fmt(n)} steht vorne die ${t}: ${t} Zehner.`, `Hinten steht die ${e}: ${e} Einer.`, { text: `${fmt(n)} hat ${e} Einer und ${t} Zehner.`, visual: placeValueOf(n) }],
    bugs: multiBugs(
      [
        { id: 'z-e-reihenfolge', match: { e: t, z: e }, hint: 'Das erste Feld sind die Einer. Einer stehen in der Zahl hinten.' },
        e === 0 && { id: 'null-stelle', match: { e: t * 10 }, hint: 'Die 0 steht bei den Einern. Es gibt keine Einer.' },
        { id: 'stuecke-gezaehlt', match: { z: t * 10 }, hint: 'Gefragt ist die Anzahl der Zehner.' },
      ],
      fields,
    ),
    praise: e === 0 ? 'Du hast an die 0 gedacht.' : 'Du hast Einer und Zehner richtig zugeordnet.',
    srText: speak(`${prompt} ${fmt(n)}`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III, reasoning: which unordered form is this number. */
const whichNotation: Form = (rng, stufe, ab) => {
  const n = unorderedTarget(rng);
  const t = tensOf(n);
  const e = onesOf(n);
  const onesFirst = rng.chance(0.6);
  const label = (z: number, ones: number, first: boolean) => (first ? `${ones} E ${z} Z` : `${z} Z ${ones} E`);
  const option = (z: number, ones: number, first: boolean): ChoiceOption => ({ label: label(z, ones, first), whyWrong: `Das ergibt ${fmt(z * 10 + ones)}. Schau auf die Buchstaben.` });
  const right = label(t, e, onesFirst);
  const wrongs = [option(e, t, onesFirst), option(e, t, !onesFirst), option(t === 9 ? t - 1 : t + 1, e, !onesFirst)];
  const prompt = 'Welche Schreibweise passt zur Zahl?';
  return build(SKILL, stufe, {
    key: `schreibweise:${n}:${onesFirst ? 'ez' : 'ze'}`,
    ab,
    prompt,
    expression: fmt(n),
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: [LETTERS_HINT, PLACE_HINT],
    steps: [`${fmt(n)} hat ${t} Zehner und ${e} Einer.`, 'Die Buchstaben zeigen Zehner und Einer.', { text: `Es passt: ${right}.`, visual: placeValueOf(n) }],
    praise: 'Du hast auf die Buchstaben geschaut.',
    srText: speak(`${prompt} ${fmt(n)}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

function bundleNumbers(rng: Rng) {
  const t = rng.int(1, 8);
  const ones = rng.int(11, 19);
  return { t, ones, n: (t + 1) * 10 + (ones - 10) };
}

const bundleSteps = (t: number, ones: number, n: number) => [
  `${ones} Einer sind 1 Zehner und ${ones - 10} Einer.`,
  `Aus ${t} ${t === 1 ? 'Zehner' : 'Zehnern'} werden ${t + 1} Zehner.`,
  { text: `${t + 1} Zehner und ${ones - 10} Einer sind ${n}.`, visual: { type: 'baseTen', tens: t + 1, ones: ones - 10 } as const },
];

const bundleToNumber =
  (withPicture: boolean): Form =>
  (rng, stufe, ab) => {
    const { t, ones, n } = bundleNumbers(rng);
    const prompt = 'Bündle zuerst. Welche Zahl ist das?';
    const expression = `${t} Z ${ones} E = ${BOX}`;
    return build(SKILL, stufe, {
      key: `${withPicture ? 'buendeln' : 'buendeln-ohne'}:${t}:${ones}`,
      ab,
      prompt,
      expression,
      ...(withPicture ? { visual: { type: 'baseTen', tens: t, ones } as const } : {}),
      answer: { kind: 'number', value: n },
      hints: [BUNDLE_HINT, `Aus ${ones} Einern wird ein Zehner. Wie viele Einer bleiben?`],
      steps: bundleSteps(t, ones, n),
      bugs: bugList(n, [
        ['buendeln', t * 100 + ones, BUNDLE_HINT],
        ['buendel-vergessen', t * 10 + (ones - 10), NEW_TEN_HINT],
        ['stuecke-gezaehlt', t + ones, WORTH_HINT],
        ['z-e-reihenfolge', dreherOf(n), DREHER_HINT],
      ]),
      praise: 'Du hast 10 Einer zu einem Zehner gebündelt.',
      srText: speak(`${prompt} ${expression}`),
      kmk: [...KMK, 'PK.darstellen'],
    });
  };

const bundleToPlaces: Form = (rng, stufe, ab) => {
  const { t, ones, n } = bundleNumbers(rng);
  const prompt = 'Bündle. Schreibe dann Zehner und Einer.';
  const expression = `${t} Z ${ones} E`;
  const fields: MultiField[] = [
    { id: 'z', value: t + 1, after: 'Zehner' },
    { id: 'e', value: ones - 10, after: 'Einer' },
  ];
  return build(SKILL, stufe, {
    key: `buendeln-stellen:${t}:${ones}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [BUNDLE_HINT, `Aus ${ones} Einern wird ein Zehner. Wie viele Einer bleiben?`],
    steps: bundleSteps(t, ones, n),
    bugs: multiBugs(
      [
        { id: 'buendeln', match: { z: t, e: ones }, hint: BUNDLE_HINT },
        { id: 'buendel-vergessen', match: { z: t, e: ones - 10 }, hint: NEW_TEN_HINT },
        { id: 'z-e-reihenfolge', match: { z: ones - 10, e: t + 1 }, hint: LETTERS_HINT },
      ],
      fields,
    ),
    praise: 'Du hast 10 Einer zu einem Zehner gebündelt.',
    srText: speak(`${prompt} ${expression}`),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

const decompose: Form = (rng, stufe, ab) => {
  const n = twoDigit(rng);
  const t = tensOf(n);
  const e = onesOf(n);
  const prompt = 'Zerlege die Zahl. Schreibe zuerst die vollen Zehner.';
  // The fields are the equation itself. A label 'Zehner:' before 30 would say 30 Zehner, and splitIntoPlaces wants 3 at that word.
  const fields: MultiField[] = [
    { id: 'z', value: t * 10, before: `${fmt(n)} =`, label: 'Erste Lücke: die vollen Zehner' },
    { id: 'e', value: e, before: '+', label: 'Zweite Lücke: die Einer' },
  ];
  return build(SKILL, stufe, {
    key: `zerlegen:${n}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [worthOfTens(t), `Die ${e} steht für Einer.`],
    steps: [zehner(t), `${e} Einer ${verb(e)} ${e}.`, { text: `${fmt(n)} = ${t * 10} + ${e}`, visual: placeValueOf(n) }],
    bugs: multiBugs(
      [
        // First: at 33 the swapped parts begin with the same 3 as the bug below.
        { id: 'zerlegen-tausch', match: { z: e, e: t * 10 }, hint: 'Beide Teile passen. Schreibe zuerst die vollen Zehner, dann die Einer.' },
        { id: 'zerlegen-ziffern', match: { z: t }, hint: worthOfTens(t) },
      ],
      fields,
    ),
    praise: 'Du hast Zehner und Einer getrennt.',
    srText: speak(`${prompt} ${fmt(n)} = ${BOX} + ${BOX}`),
    kmk: KMK,
  });
};

/** Stufe 3, AB III: a gap in a bundling. 3 Z □ E = 47 has more than 9 ones, □ Z 15 E = 45 has one ten less than 45 shows. */
const bundleGap: Form = (rng, stufe, ab) => {
  const { t, ones, n } = bundleNumbers(rng);
  const gapAtOnes = rng.chance(0.5);
  // Written out: read aloud, a letter after the gap would stay a letter (only '3 Z' after a number becomes Zehner).
  const expression = gapAtOnes ? `${t} Zehner ${BOX} Einer = ${fmt(n)}` : `${BOX} Zehner ${ones} Einer = ${fmt(n)}`;
  const prompt = 'Welche Zahl gehört in die Lücke?';
  const value = gapAtOnes ? ones : t;
  return build(SKILL, stufe, {
    key: `buendel-luecke:${gapAtOnes ? 'e' : 'z'}:${t}:${ones}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value },
    hints: gapAtOnes
      ? [`Wie viel ${verb(t)} ${t} Zehner? Wie viel fehlt dann bis ${fmt(n)}?`, BUNDLE_HINT]
      : [`In ${ones} Einern steckt schon ein Zehner.`, `Wie viele Zehner fehlen dann noch bis ${fmt(n)}?`],
    steps: gapAtOnes
      ? [zehner(t), `${fmt(n)} − ${t * 10} = ${ones}`, `Also: ${t} Z ${ones} E = ${fmt(n)}.`]
      : [`${ones} Einer sind 1 Zehner und ${ones - 10} Einer.`, `${fmt(n)} hat ${t + 1} Zehner. 1 Zehner steckt schon in den Einern.`, `Also: ${t} Z ${ones} E = ${fmt(n)}.`],
    bugs: bugList(
      value,
      gapAtOnes
        ? [
            ['buendel-vergessen', ones - 10, 'Hier sind es mehr als 9 Einer. 1 Zehner steckt darin.'],
            ['stuecke-gezaehlt', n - t, WORTH_HINT],
            ['z-e-reihenfolge', dreherOf(ones), DREHER_HINT],
          ]
        : [
            ['buendel-vergessen', t + 1, 'Ein Zehner steckt schon in den Einern.'],
            ['stuecke-gezaehlt', n - ones, 'Gefragt ist die Anzahl der Zehner.'],
          ],
    ),
    praise: 'Du hast das Bündeln rückwärts gedacht.',
    srText: speak(`${prompt} ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Stufe 3, AB III: another split of the number, with one ten less: 47 = 30 + □. */
const otherSplit: Form = (rng, stufe, ab) => {
  const t = rng.int(2, 9);
  const e = rng.int(1, 9);
  const n = t * 10 + e;
  const tens = (t - 1) * 10;
  const rest = n - tens;
  const gapAtRest = rng.chance(0.6);
  const expression = gapAtRest ? `${fmt(n)} = ${tens} + ${BOX}` : `${fmt(n)} = ${BOX} + ${rest}`;
  const value = gapAtRest ? rest : tens;
  const shown = gapAtRest ? tens : rest;
  const prompt = 'Welche Zahl gehört in die Lücke?';
  return build(SKILL, stufe, {
    key: `anders-zerlegen:${gapAtRest ? 'rest' : 'zehner'}:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value },
    hints: [`Bis ${fmt(n)} fehlt noch ein Teil.`, `Rechne ${fmt(n)} − ${shown}.`],
    steps: [`${tens} ist 1 Zehner weniger als ${t * 10}.`, 'Bei den Einern ist dieser Zehner dazugekommen.', `${fmt(n)} = ${tens} + ${rest}`],
    bugs: bugList(value, [
      ['zerlegen-ziffern', gapAtRest ? e : t * 10, 'Hier passt die gewohnte Zerlegung nicht. Schau auf die andere Zahl.'],
      ['z-e-reihenfolge', dreherOf(value), DREHER_HINT],
    ]),
    praise: 'Du hast die Zahl anders zerlegt.',
    srText: speak(`${prompt} ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

const FORMS: Forms = {
  1: { 1: [readEasy], 2: [readHard, splitIntoPlaces], 3: [whichPicture] },
  2: { 1: [unordered], 2: [withZero, zeroTens], 3: [placesOnesFirst, whichNotation] },
  3: { 1: [bundleToNumber(true)], 2: [bundleToNumber(false), bundleToPlaces, decompose], 3: [bundleGap, otherSplit] },
};

export const zehnerEinerSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Zehner und Einer',
  description: 'Du bündelst zu Zehnern und schreibst die Zahl.',
  stufen: {
    1: 'Zahlen aus Stangen und Tafeln lesen; Zehner und Einer nennen.',
    2: 'Durcheinander: 7 E 3 Z. Zahlen wie 40 und 7.',
    3: 'Bündeln: 2 Z 14 E. Zerlegen: 32 = 30 + 2.',
  },
  kmk: KMK,
  generate: fromForms(FORMS),
};
