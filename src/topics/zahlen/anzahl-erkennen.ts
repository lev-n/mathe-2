/**
 * Anzahlen erkennen: amounts seen in the 5/10 structure of a field (docs/research.md §6). The Stufe chooses the field: Stufe 1 the
 * Zwanzigerfeld, Stufe 2 the Hunderterfeld with the full rows first, Stufe 3 a turned or split field and the dots up to 100.
 * The AB level is the demand inside it: AB I reads, AB II takes harder numbers or a second kind of dot, AB III asks what is missing.
 */
import type { Ab, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, multiBugs, plural } from '../shared';
import { dreherBug, dreherFieldBugs, fromForms, onesOf, tensOf, type Form, type Forms } from './helpers';

const ID = 'zahlen.anzahl-erkennen';
const SKILL = { id: ID, topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum', 'PK.darstellen'];

const HOW_MANY = 'Wie viele Punkte sind ausgefüllt?';
const TOGETHER = 'Wie viele Punkte sind es mit den Ringen zusammen?';
const ROW_HINT = 'Eine volle Reihe hat 10 Punkte.';
const FIVE_HINT = 'Nach 5 Punkten ist eine Lücke. Das hilft beim Sehen.';

/** '1 Punkt', '3 Punkte'. */
const dots = (n: number) => `${n} ${plural(n, 'Punkt', 'Punkte')}`;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Wrong answers of a count in full rows: rows ignored, rows taken as ones, digits swapped. */
function rowBugs(n: number, line: 'Reihen' | 'Spalten') {
  const rows = tensOf(n);
  const rest = onesOf(n);
  return bugList(n, [
    ['reihe-vergessen', rest > 0 ? rest : null, `Die vollen ${line} zählen auch mit.`],
    ['reihen-als-einer', rest > 0 ? rows + rest : null, `Eine volle ${line === 'Reihen' ? 'Reihe' : 'Spalte'} hat 10 Punkte, nicht 1.`],
    dreherBug(n),
  ]);
}

// ─── Stufe 1: at most 20 dots on the Zwanzigerfeld ────────────────────────────

const twentyField: Form = (rng, stufe, ab) => {
  // 10 is left out: the hints name the size of a row.
  const n = rng.pick([6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  const rest = n - 10;
  return build(SKILL, stufe, {
    key: `zwanzig:${n}`,
    ab,
    prompt: HOW_MANY,
    visual: { type: 'field', size: 20, filled: n },
    answer: { kind: 'number', value: n },
    hints: n > 10 ? [ROW_HINT, FIVE_HINT] : [FIVE_HINT, 'Vor der Lücke sind 5 Punkte. Wie viele kommen dazu?'],
    steps:
      n === 20
        ? ['Beide Reihen sind voll.', 'Jede Reihe hat 10 Punkte.', '10 + 10 = 20']
        : n > 10
          ? ['Oben ist eine volle Reihe: 10 Punkte.', `Unten: ${dots(rest)}.`, `10 + ${rest} = ${n}`]
          : ['Die ersten 5 Punkte siehst du auf einen Blick.', `Dazu: ${dots(n - 5)}.`, `5 + ${n - 5} = ${n}`],
    bugs: n > 10 ? rowBugs(n, 'Reihen') : [],
    praise: n > 10 ? 'Du hast die volle Reihe als 10 erkannt.' : 'Du hast die 5 auf einen Blick gesehen.',
    srText: `${HOW_MANY} Das Bild zeigt ein Zwanzigerfeld.`,
    kmk: KMK,
  });
};

/** Filled dots and dots with a ring: the total is seen in the rows, across both kinds. */
function twoKinds(stufe: Stufe, ab: Ab, size: 20 | 100, a: number, b: number) {
  const n = a + b;
  const rows = tensOf(n);
  const rest = onesOf(n);
  return build(SKILL, stufe, {
    key: `zwei-teile:${size}:${a}:${b}`,
    ab,
    prompt: TOGETHER,
    visual: { type: 'field', size, filled: a, second: b },
    answer: { kind: 'number', value: n },
    hints: ['Schau auf die vollen Reihen. Die Ringe zählen mit.', ROW_HINT],
    steps: [
      rows === 1 ? 'Oben ist eine volle Reihe: 10 Punkte.' : `${rows} volle Reihen sind ${rows * 10} Punkte.`,
      rest > 0 ? `In der nächsten Reihe: ${dots(rest)}.` : 'Danach kommt kein Punkt mehr.',
      rest > 0 ? `${rows * 10} + ${rest} = ${n}` : `Also sind es ${n} Punkte.`,
    ],
    bugs: bugList(n, [
      ['nur-ein-teil', a, 'Das sind nur die ausgefüllten Punkte. Die Ringe zählen mit.'],
      ['nur-ein-teil', b, 'Das sind nur die Ringe. Die ausgefüllten Punkte zählen mit.'],
      ...rowBugs(n, 'Reihen').map((x): [string, number, string] => [x.id, x.match as number, x.hint]),
    ]),
    praise: 'Du hast beide Sorten Punkte zusammen gesehen.',
    srText: `${TOGETHER} Das Bild zeigt ein ${size === 20 ? 'Zwanzigerfeld' : 'Hunderterfeld'}.`,
    kmk: KMK,
  });
}

const twoKindsTwenty: Form = (rng, stufe, ab) => {
  const n = rng.int(12, 19);
  const a = rng.int(3, n - 3);
  return twoKinds(stufe, ab, 20, a, n - a);
};

const twoKindsHundred: Form = (rng, stufe, ab) => {
  const n = rng.int(35, 99);
  const a = rng.int(12, n - 12);
  return twoKinds(stufe, ab, 100, a, n - a);
};

const untilTwenty: Form = (rng, stufe, ab) => {
  // Not 10: the hint names the size of a row.
  const n = rng.pick([...range(3, 9), ...range(11, 17)]);
  const value = 20 - n;
  const prompt = 'Wie viele Punkte fehlen bis 20?';
  return build(SKILL, stufe, {
    key: `bis-zwanzig:${n}`,
    ab,
    prompt,
    visual: { type: 'field', size: 20, filled: n },
    answer: { kind: 'number', value },
    hints: ['Schau auf die leeren Punkte.', 'Eine ganz leere Reihe hat 10 Punkte.'],
    steps:
      n > 10
        ? ['Die erste Reihe ist voll.', `In der zweiten Reihe ${plural(value, 'fehlt', 'fehlen')} ${dots(value)}.`, `Also ${plural(value, 'fehlt', 'fehlen')} ${dots(value)}.`]
        : ['Die zweite Reihe ist ganz leer: 10 Punkte.', `In der ersten Reihe ${plural(10 - n, 'fehlt', 'fehlen')} ${dots(10 - n)}.`, `10 + ${10 - n} = ${value}`],
    bugs: bugList(value, [
      ['gefuellt-bis-zwanzig', n, 'Das sind die vollen Punkte. Gefragt sind die leeren.'],
      ['erste-reihe', n < 10 ? 10 - n : null, 'Die zweite Reihe fehlt auch noch.'],
      dreherBug(value),
    ]),
    praise: 'Du hast die leeren Punkte bis 20 gefunden.',
    srText: `${prompt} Das Bild zeigt ein Zwanzigerfeld.`,
    kmk: [...KMK, 'ZO.strategien'],
  });
};

// ─── Stufe 2 and 3: the Hunderterfeld ─────────────────────────────────────────

/** Full rows, or full columns on a turned field. */
function hundredField(stufe: Stufe, ab: Ab, n: number, rotated: boolean) {
  const rows = tensOf(n);
  const rest = onesOf(n);
  const line = rotated ? 'Spalten' : 'Reihen';
  const lineOne = rotated ? 'Spalte' : 'Reihe';
  return build(SKILL, stufe, {
    key: `${rotated ? 'gedreht' : 'hundert'}:${n}`,
    ab,
    prompt: HOW_MANY,
    visual: { type: 'field', size: 100, filled: n, ...(rotated ? { rotated } : {}) },
    answer: { kind: 'number', value: n },
    hints: [
      rotated ? 'Das Feld ist gedreht. Eine volle Spalte hat 10 Punkte.' : 'Zähle zuerst die vollen Reihen. Jede hat 10 Punkte.',
      `Nach 5 ${line} ist eine große Lücke. Das hilft beim Sehen.`,
    ],
    steps: [
      `${rows} volle ${line} sind ${rows * 10} Punkte.`,
      rest > 0 ? `In der nächsten ${lineOne}: ${dots(rest)}.` : 'Danach ist kein Punkt mehr ausgefüllt.',
      rest > 0 ? `${rows * 10} + ${rest} = ${n}` : `Also sind es ${n} Punkte.`,
    ],
    bugs: rowBugs(n, line),
    praise: `Du hast die vollen ${line} als Zehner gesehen.`,
    srText: `${HOW_MANY} Das Bild zeigt ein Hunderterfeld${rotated ? ', gedreht' : ''}.`,
    kmk: KMK,
  });
}

/** Up to 5 full rows with few dots after them: seen at a glance. */
const EASY_HUNDRED = range(21, 55).filter((n) => onesOf(n) <= 5);
/** Many rows, or many dots after the last full row. */
const HARD_HUNDRED = range(21, 100).filter((n) => !EASY_HUNDRED.includes(n));

const easyHundred: Form = (rng, stufe, ab) => hundredField(stufe, ab, rng.pick(EASY_HUNDRED), false);
const hardHundred: Form = (rng, stufe, ab) => hundredField(stufe, ab, rng.pick(HARD_HUNDRED), false);
const turnedField: Form = (rng, stufe, ab) => hundredField(stufe, ab, rng.int(21, 99), true);

/** How many dots up to the next full row, and how many dots then: the row structure, without anything up to 100. */
const toFullRow: Form = (rng, stufe, ab) => {
  const rows = rng.int(2, 8);
  const rest = rng.int(1, 9);
  const n = rows * 10 + rest;
  const fields: MultiField[] = [
    { id: 'fehlen', value: 10 - rest, before: 'Bis zur vollen Reihe fehlen:' },
    { id: 'dann', value: (rows + 1) * 10, before: 'Dann sind es zusammen:' },
  ];
  const prompt = 'Stell dir die angefangene Reihe voll vor. Trage beide Zahlen ein.';
  return build(SKILL, stufe, {
    key: `volle-reihe:${n}`,
    ab,
    prompt,
    visual: { type: 'field', size: 100, filled: n },
    answer: { kind: 'multi', fields },
    hints: ['Schau auf die Reihe mit vollen und leeren Punkten.', ROW_HINT],
    steps: [
      `${rows} Reihen sind voll. In der nächsten Reihe: ${dots(rest)}.`,
      `10 − ${rest} = ${10 - rest}`,
      `Dann sind ${rows + 1} Reihen voll: ${(rows + 1) * 10} Punkte.`,
    ],
    bugs: multiBugs(
      [
        { id: 'gefuellt-bis-reihe', match: { fehlen: rest }, hint: 'Das sind die vollen Punkte in der Reihe. Gefragt sind die leeren.' },
        { id: 'reihe-vergessen', match: { dann: rows * 10 }, hint: 'Die angefangene Reihe zählt mit. Diese Reihe ist dann auch voll.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast die Reihe in Gedanken gefüllt.',
    srText: `${prompt} Das Bild zeigt ein Hunderterfeld.`,
    kmk: [...KMK, 'ZO.strategien'],
  });
};

const splitField: Form = (rng, stufe, ab) => {
  // At least one dot past the full rows: the hints name the size of a row, and the answer is never exactly 10.
  const rows = rng.int(3, 9);
  const n = rows * 10 + rng.int(1, 9);
  const after = rng.int(1, rows - 1);
  const above = after * 10;
  const below = n - above;
  // 'ausgefüllte': the empty dots are drawn too, so 'Punkte' alone also fits all dots below the line.
  const prompt = 'Wie viele ausgefüllte Punkte liegen unter der Linie?';
  return build(SKILL, stufe, {
    key: `linie:${n}:${after}`,
    ab,
    prompt,
    visual: { type: 'field', size: 100, filled: n, split: { afterRow: after } },
    answer: { kind: 'number', value: below },
    hints: ['Schau nur auf die ausgefüllten Punkte unter der Linie.', 'Eine volle Reihe hat 10 Punkte. Nimm dann die übrigen Punkte dazu.'],
    steps: [
      `Über der Linie sind ${above} ausgefüllte Punkte. Die zählen hier nicht.`,
      `Unter der Linie sind ${below - onesOf(n)} Punkte in vollen Reihen.`,
      `${below - onesOf(n)} + ${onesOf(n)} = ${below}`,
    ],
    bugs: bugList(below, [
      ['gesamt-gezaehlt', n, 'Das sind alle ausgefüllten Punkte. Gefragt ist nur der untere Teil.'],
      ['ueber-der-linie', above, 'Das ist der Teil über der Linie. Gefragt ist der untere Teil.'],
      ['leere-mitgezaehlt', (10 - after) * 10, 'Das sind auch die leeren Punkte. Zähle nur die ausgefüllten.'],
      dreherBug(below),
    ]),
    praise: 'Du hast nur den unteren Teil gezählt.',
    srText: `${prompt} Das Bild zeigt ein Hunderterfeld mit einer Linie.`,
    kmk: KMK,
  });
};

function untilHundred(rng: Rng, stufe: Stufe, ab: Ab, rotated: boolean) {
  // At most 79 dots: at least two empty rows when a row is only partly filled.
  const n = rng.int(21, 79);
  const value = 100 - n;
  const e = onesOf(n);
  const emptyRows = tensOf(value);
  const line = rotated ? 'Spalten' : 'Reihen';
  const lineOne = rotated ? 'Spalte' : 'Reihe';
  const prompt = 'Wie viele Punkte fehlen bis 100?';
  return build(SKILL, stufe, {
    key: `${rotated ? 'bis-hundert-gedreht' : 'bis-hundert'}:${n}`,
    ab,
    prompt,
    visual: { type: 'field', size: 100, filled: n, ...(rotated ? { rotated } : {}) },
    answer: { kind: 'number', value },
    hints: ['Schau auf die leeren Punkte.', `Jede ganz leere ${lineOne} hat 10 Punkte.`],
    steps:
      e > 0
        ? [`Ganz leer sind ${emptyRows} ${line}: ${emptyRows * 10} Punkte.`, `In der nächsten ${lineOne} ${plural(10 - e, 'fehlt', 'fehlen')} noch: ${dots(10 - e)}.`, `${emptyRows * 10} + ${10 - e} = ${value}`]
        : [`Ganz leer sind ${emptyRows} ${line}.`, `Jede ${lineOne} hat 10 Punkte.`, `Also fehlen ${value} Punkte.`],
    bugs: bugList(value, [
      ['gefuellt-genannt', n, 'Das sind die vollen Punkte. Gefragt sind die leeren.'],
      ['bis-hundert-zehner', e > 0 ? (10 - tensOf(n)) * 10 + (10 - e) : null, `Eine ${lineOne} ist nur zum Teil leer. Schau diese ${lineOne} extra an.`],
      dreherBug(value),
    ]),
    praise: 'Du hast die leeren Punkte bis 100 gefunden.',
    srText: `${prompt} Das Bild zeigt ein Hunderterfeld${rotated ? ', gedreht' : ''}.`,
    kmk: [...KMK, 'ZO.strategien'],
  });
}

const FORMS: Forms = {
  1: { 1: [twentyField], 2: [twoKindsTwenty], 3: [untilTwenty] },
  2: { 1: [easyHundred], 2: [hardHundred, twoKindsHundred], 3: [toFullRow] },
  3: {
    1: [turnedField],
    2: [splitField],
    3: [(rng, stufe, ab) => untilHundred(rng, stufe, ab, false), (rng, stufe, ab) => untilHundred(rng, stufe, ab, true)],
  },
};

export const anzahlErkennenSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Anzahlen erkennen',
  description: 'Du siehst Fünfer und Zehner und weißt, wie viele es sind.',
  stufen: {
    1: 'Punkte im Zwanzigerfeld erkennen.',
    2: 'Punkte im Hunderterfeld erkennen, volle Reihen zuerst.',
    3: 'Gedrehte und geteilte Felder; wie viele fehlen bis 100?',
  },
  kmk: KMK,
  generate: fromForms(FORMS),
};
