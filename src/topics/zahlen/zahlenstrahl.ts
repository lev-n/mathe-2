/**
 * Zahlenstrahl (docs/research.md §6). The Stufe chooses the line: Stufe 1 0–100 with ticks every 10, Stufe 2 ticks every 5 with labels
 * every 10, Stufe 3 a section such as 30–40, or an empty line to estimate on. The AB level is the demand inside it: AB I the direct
 * form, AB II fewer labels or a second arrow, AB III goes the other way or names the place without its number.
 */
import { fmt } from '../../core/format';
import type { Ab, MultiField, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, bugList, multiBugs, plural } from '../shared';
import { dreherBug, dreherFieldBugs, fromForms, tensOf, type Form, type Forms } from './helpers';

const ID = 'zahlen.zahlenstrahl';
const SKILL = { id: ID, topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum', 'PK.darstellen'];

const READ = 'Auf welche Zahl zeigt der Pfeil?';
const NULL_HINT = 'Der Zahlenstrahl beginnt bei 0. Zähle die Sprünge, nicht die Striche.';
const SECTION_NULL_HINT = 'Der Ausschnitt beginnt links. Zähle die Sprünge, nicht die Striche.';
const LEFT_HINT = 'Der Strahl beginnt links. Nach rechts wird es mehr.';
const TEN_HINT = 'Von Strich zu Strich sind es 10.';
const FIVE_HINT = 'Von Strich zu Strich sind es 5.';
const ONE_HINT = 'Von Strich zu Strich ist es 1.';
const SECTION_SAY = 'Der Zahlenstrahl geht von';
const WHOLE_SAY = 'Der Zahlenstrahl geht von 0 bis 100.';
/** Accepted distance on the empty line, a heuristic: there are no ticks, and a phone gives about 3 px per number. */
const ESTIMATE_TOLERANCE = 7;

interface Axis {
  min: number;
  max: number;
  majorStep: number;
  minorStep: number;
  labelMajor: boolean;
  labels?: number[];
}

const TENS_AXIS: Axis = { min: 0, max: 100, majorStep: 10, minorStep: 10, labelMajor: false, labels: [0, 50, 100] };
/** Without the middle: all that helps is the jump from one tick to the next. */
const TENS_BARE: Axis = { ...TENS_AXIS, labels: [0, 100] };
const FIVES_AXIS: Axis = { min: 0, max: 100, majorStep: 10, minorStep: 5, labelMajor: true };
const EMPTY_AXIS: Axis = { min: 0, max: 100, majorStep: 100, minorStep: 100, labelMajor: true };
const sectionAxis = (t: number): Axis => ({ min: t, max: t + 10, majorStep: 5, minorStep: 1, labelMajor: false, labels: [t, t + 10] });

function marked(axis: Axis, value: number, label: string): VisualOf<'numberLine'> {
  return { type: 'numberLine', ...axis, marks: [{ value, label }] };
}

/** The number line answer for an axis: the marker snaps to `step`. */
function place(axis: Axis, value: number, step: number, tolerance = 0) {
  return { kind: 'numberline', ...axis, step, value, tolerance } as const;
}

const range = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

/** Two arrows at once, on an axis whose ticks every `step`. */
function twoArrows(rng: Rng, stufe: Stufe, ab: Ab, axis: Axis, step: 5 | 10, pool: readonly number[]) {
  const [a, b] = rng.sample(pool, 2).sort((x, y) => x - y);
  const prompt = 'Auf welche Zahlen zeigen die Pfeile A und B?';
  const fields: MultiField[] = [
    { id: 'A', value: a, before: 'A =' },
    { id: 'B', value: b, before: 'B =' },
  ];
  const line = (la: string, lb: string): VisualOf<'numberLine'> => ({ type: 'numberLine', ...axis, marks: [{ value: a, label: la }, { value: b, label: lb }] });
  return build(SKILL, stufe, {
    key: `zwei-pfeile:${step}:${a}:${b}`,
    ab,
    prompt,
    visual: line('A', 'B'),
    answer: { kind: 'multi', fields },
    hints: [step === 10 ? TEN_HINT : FIVE_HINT, 'Beginne bei einer Zahl am Strahl. Rechne von dort weiter.'],
    steps: [step === 10 ? TEN_HINT : FIVE_HINT, `A zeigt auf ${fmt(a)}.`, { text: `B zeigt auf ${fmt(b)}.`, visual: line(fmt(a), fmt(b)) }],
    bugs: multiBugs(
      [
        { id: 'strahl-null', match: { A: a + step, B: b + step }, hint: NULL_HINT },
        { id: 'strahl-striche', match: { A: a / step, B: b / step }, hint: step === 10 ? 'Jeder Sprung sind 10. Rechne in Zehnern.' : 'Jeder Sprung sind 5. Rechne in Fünfern.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast beide Pfeile genau abgelesen.',
    srText: `${prompt} ${WHOLE_SAY}`,
    kmk: KMK,
  });
}

// ─── Stufe 1: ticks every 10 ──────────────────────────────────────────────────

const tensSteps = (v: number, axis: Axis) => {
  const jumps = v / 10;
  return [
    TEN_HINT,
    jumps === 1 ? `Bis ${fmt(v)} ist es 1 Sprung.` : `Bis ${fmt(v)} sind es ${jumps} Sprünge.`,
    { text: `Der Pfeil steht bei ${fmt(v)}.`, visual: marked(axis, v, fmt(v)) },
  ];
};

function readTens(stufe: Stufe, ab: Ab, axis: Axis, v: number) {
  return build(SKILL, stufe, {
    key: `lesen:10:${axis === TENS_AXIS ? 'mitte' : 'ohne'}:${v}`,
    ab,
    prompt: READ,
    visual: marked(axis, v, '?'),
    answer: { kind: 'number', value: v },
    hints: [TEN_HINT, 'Beginne bei 0. Rechne immer 10 dazu.'],
    steps: tensSteps(v, axis),
    bugs: bugList(v, [
      ['strahl-null', v + 10, NULL_HINT],
      ['strahl-striche', v / 10, 'Jeder Sprung sind 10. Rechne in Zehnern.'],
    ]),
    praise: 'Du hast in Zehnern gezählt.',
    srText: `${READ} ${WHOLE_SAY}`,
    kmk: KMK,
  });
}

/** Stufe 1, AB I: the jumps up to the arrow, the first step of reading it. */
const jumpsToArrow: Form = (rng, stufe, ab) => {
  const value = rng.int(1, 9);
  const v = value * 10;
  const prompt = 'Wie viele Sprünge sind es von 0 bis zum Pfeil?';
  return build(SKILL, stufe, {
    key: `spruenge:${v}`,
    ab,
    prompt,
    visual: marked(TENS_AXIS, v, '?'),
    answer: { kind: 'number', value },
    hints: ['Jeder Sprung geht von Strich zu Strich.', 'Beginne bei 0. Zähle die Sprünge, nicht die Striche.'],
    steps: ['Jeder Sprung geht von Strich zu Strich.', value === 1 ? 'Von 0 bis zum Pfeil ist es 1 Sprung.' : `Von 0 bis zum Pfeil sind es ${value} Sprünge.`, { text: `Der Pfeil steht bei ${fmt(v)}.`, visual: marked(TENS_AXIS, v, fmt(v)) }],
    bugs: bugList(value, [
      ['strahl-striche', v, 'Das ist die Zahl am Pfeil. Gefragt sind die Sprünge.'],
      ['strahl-null', value + 1, NULL_HINT],
    ]),
    praise: 'Du hast die Sprünge gezählt.',
    srText: `${prompt} ${WHOLE_SAY}`,
    kmk: KMK,
  });
};

// Reading leaves out 10: the hints name the jump. And a labelled number is nothing to read.
const readTensWithMiddle: Form = (rng, stufe, ab) => readTens(stufe, ab, TENS_AXIS, rng.pick([20, 30, 40, 60, 70, 80, 90]));
const readTensBare: Form = (rng, stufe, ab) => readTens(stufe, ab, TENS_BARE, rng.pick([20, 30, 40, 50, 60, 70, 80, 90]));
const twoArrowsTens: Form = (rng, stufe, ab) => twoArrows(rng, stufe, ab, TENS_BARE, 10, [20, 30, 40, 50, 60, 70, 80, 90]);

/** Stufe 1, AB III: from a named arrow some ticks on. The answer has no label on this line. */
const arrowMoved: Form = (rng, stufe, ab) => {
  const count = rng.int(1, 3);
  const right = rng.chance(0.6);
  // The answer stays inside 20–90: the hints name 10, and 0 and 100 are labelled.
  const value = rng.int(right ? count + 2 : 2, right ? 9 : 9 - count) * 10;
  const v = right ? value - count * 10 : value + count * 10;
  const ticks = plural(count, 'Strich', 'Striche');
  const prompt = `Der Pfeil zeigt auf ${fmt(v)}. Welche Zahl liegt ${count} ${ticks} weiter ${right ? 'rechts' : 'links'}?`;
  return build(SKILL, stufe, {
    key: `weiter:${v}:${right ? 'rechts' : 'links'}:${count}`,
    ab,
    prompt,
    visual: marked(TENS_BARE, v, fmt(v)),
    answer: { kind: 'number', value },
    hints: [TEN_HINT, right ? 'Nach rechts wird es mehr.' : 'Nach links wird es weniger.'],
    steps: [TEN_HINT, `${count} ${ticks} ${plural(count, 'ist', 'sind')} ${count * 10}: ${fmt(v)} ${right ? '+' : '−'} ${count * 10} = ${fmt(value)}`, { text: `Dort liegt ${fmt(value)}.`, visual: marked(TENS_BARE, value, fmt(value)) }],
    bugs: bugList(value, [
      ['strahl-striche', right ? v + count : v - count, 'Jeder Strich sind 10. Rechne in Zehnern.'],
      ['strahl-schritt', right ? v - count * 10 : v + count * 10, right ? 'Nach rechts wird es mehr.' : 'Nach links wird es weniger.'],
    ]),
    praise: 'Du hast in Zehnern gezählt.',
    srText: `${prompt} ${WHOLE_SAY}`,
    kmk: KMK,
  });
};

/** Stufe 1, AB III, the other way round: the arrow goes on a tick. */
const placeTens: Form = (rng, stufe, ab) => {
  const v = rng.pick([20, 30, 40, 60, 70, 80, 90]);
  const prompt = `Setze den Pfeil auf ${fmt(v)}.`;
  return build(SKILL, stufe, {
    key: `setzen:10:${v}`,
    ab,
    prompt,
    answer: place(TENS_AXIS, v, 10),
    hints: [TEN_HINT, 'Bei 50 ist die Mitte. Liegt die Zahl davor oder danach?'],
    steps: tensSteps(v, TENS_AXIS),
    bugs: bugList(v, [['strahl-null', v - 10, NULL_HINT]]),
    praise: 'Du hast in Zehnern gezählt.',
    srText: `${prompt} ${WHOLE_SAY}`,
    kmk: KMK,
  });
};

// ─── Stufe 2: ticks every 5, labels every 10 ──────────────────────────────────

const fiveSteps = (v: number) => {
  const lo = tensOf(v) * 10;
  return v % 10 === 0
    ? ['Die vollen Zehner stehen am Strahl.', `${fmt(v)} steht an einem langen Strich.`, { text: `Der Pfeil steht bei ${fmt(v)}.`, visual: marked(FIVES_AXIS, v, fmt(v)) }]
    : ['Zwischen 2 Zehnern liegt ein kleiner Strich: die 5.', `${fmt(v)} liegt in der Mitte von ${fmt(lo)} und ${fmt(lo + 10)}.`, { text: `Der Pfeil steht bei ${fmt(v)}.`, visual: marked(FIVES_AXIS, v, fmt(v)) }];
};

const placeFives: Form = (rng, stufe, ab) => {
  const v = rng.pick(range(5, 95, 5));
  const lo = tensOf(v) * 10;
  const prompt = `Setze den Pfeil auf ${fmt(v)}.`;
  return build(SKILL, stufe, {
    key: `setzen:5:${v}`,
    ab,
    prompt,
    answer: place(FIVES_AXIS, v, 5),
    hints: [FIVE_HINT, v % 10 === 0 ? 'Die vollen Zehner stehen am Strahl.' : `${fmt(v)} liegt zwischen ${fmt(lo)} und ${fmt(lo + 10)}.`],
    steps: fiveSteps(v),
    bugs: bugList(v, [
      ['strahl-null', v - 5, NULL_HINT],
      ['strahl-schritt', v + 5, v % 10 === 0 ? `${fmt(v)} steht an einem langen Strich.` : `${fmt(v)} liegt noch vor ${fmt(lo + 10)}.`],
    ]),
    praise: 'Du hast die Striche in Fünfern genutzt.',
    srText: `${prompt} ${WHOLE_SAY}`,
    kmk: KMK,
  });
};

const readFives: Form = (rng, stufe, ab) => {
  const v = rng.int(1, 9) * 10 + 5;
  const lo = tensOf(v) * 10;
  return build(SKILL, stufe, {
    key: `lesen:5:${v}`,
    ab,
    prompt: READ,
    visual: marked(FIVES_AXIS, v, '?'),
    answer: { kind: 'number', value: v },
    hints: [FIVE_HINT, 'Schau auf die Zahl links vom Pfeil. Rechne von dort weiter.'],
    steps: fiveSteps(v),
    bugs: bugList(v, [
      ['strahl-null', v + 5, NULL_HINT],
      ['strahl-schritt', lo + 1, 'Ein kleiner Strich ist nicht 1. Der Strich liegt mitten zwischen Zehnern.'],
      ['strahl-striche', v / 5, 'Jeder Sprung sind 5. Rechne in Fünfern.'],
      dreherBug(v),
    ]),
    praise: 'Du hast die Mitte zwischen 2 Zehnern erkannt.',
    srText: `${READ} ${WHOLE_SAY}`,
    kmk: KMK,
  });
};

const twoArrowsFives: Form = (rng, stufe, ab) => twoArrows(rng, stufe, ab, FIVES_AXIS, 5, range(15, 95, 10));

/** Stufe 2, AB III: the place is described: the prompt does not name the number. */
const placeMiddle: Form = (rng, stufe, ab) => {
  const lo = rng.int(0, 9) * 10;
  const hi = lo + 10;
  const v = lo + 5;
  const prompt = `Setze den Pfeil in die Mitte von ${fmt(lo)} und ${fmt(hi)}.`;
  return build(SKILL, stufe, {
    key: `mitte:${lo}`,
    ab,
    prompt,
    answer: place(FIVES_AXIS, v, 5),
    hints: [FIVE_HINT, 'Zwischen 2 Zehnern liegt ein kleiner Strich.'],
    steps: fiveSteps(v),
    bugs: bugList(v, [
      ['strahl-schritt', lo, 'Das ist der Zehner links. Geh zur Mitte.'],
      ['strahl-schritt', hi, 'Das ist der Zehner rechts. Geh zur Mitte.'],
    ]),
    praise: 'Du hast die Mitte zwischen 2 Zehnern gezeigt.',
    srText: `${prompt} ${WHOLE_SAY}`,
    kmk: KMK,
  });
};

/** Stufe 2, AB III: some ticks away from a named number. */
const placeMoved: Form = (rng, stufe, ab) => {
  const count = rng.int(2, 4);
  const right = rng.chance(0.6);
  const from = right ? rng.int(1, 19 - count) * 5 : rng.int(1 + count, 19) * 5;
  const v = right ? from + count * 5 : from - count * 5;
  const prompt = `Setze den Pfeil ${count} Striche ${right ? 'rechts' : 'links'} von ${fmt(from)}.`;
  return build(SKILL, stufe, {
    key: `striche:${from}:${right ? 'rechts' : 'links'}:${count}`,
    ab,
    prompt,
    answer: place(FIVES_AXIS, v, 5),
    hints: [FIVE_HINT, `Beginne bei ${fmt(from)}. Geh dann ${count} Striche weiter.`],
    steps: [FIVE_HINT, `${count} Striche sind ${count * 5}: ${fmt(from)} ${right ? '+' : '−'} ${count * 5} = ${fmt(v)}`, { text: `Der Pfeil steht bei ${fmt(v)}.`, visual: marked(FIVES_AXIS, v, fmt(v)) }],
    bugs: bugList(v, [
      ['strahl-schritt', right ? from + count * 10 : from - count * 10, 'Ein Strich ist nur 5.'],
      ['strahl-schritt', right ? from - count * 5 : from + count * 5, right ? 'Nach rechts wird es mehr.' : 'Nach links wird es weniger.'],
    ]),
    praise: 'Du hast die Striche in Fünfern genutzt.',
    srText: `${prompt} ${WHOLE_SAY}`,
    kmk: KMK,
  });
};

// ─── Stufe 3: a section, the empty line ───────────────────────────────────────

const ONES = [1, 2, 3, 4, 6, 7, 8, 9];

const sectionRead: Form = (rng, stufe, ab) => {
  const t = rng.int(1, 9) * 10;
  const axis = sectionAxis(t);
  const e = rng.pick(ONES);
  const v = t + e;
  return build(SKILL, stufe, {
    key: `abschnitt-lesen:${t}:${v}`,
    ab,
    prompt: READ,
    visual: marked(axis, v, '?'),
    answer: { kind: 'number', value: v },
    hints: [ONE_HINT, 'Beginne bei der Zahl links. Geh dann nach rechts.'],
    steps: [`Der Ausschnitt beginnt bei ${fmt(t)}. Der Ausschnitt endet bei ${fmt(t + 10)}.`, ONE_HINT, { text: `Der Pfeil steht bei ${fmt(v)}.`, visual: marked(axis, v, fmt(v)) }],
    bugs: bugList(v, [
      ['strahl-null', v + 1, SECTION_NULL_HINT],
      ['strahl-einer', e, 'Der Strahl beginnt hier nicht bei 0. Schau auf die erste Zahl.'],
      ['strahl-von-rechts', t + 10 - e, LEFT_HINT],
      dreherBug(v),
    ]),
    praise: 'Du hast im Ausschnitt genau abgelesen.',
    srText: `${READ} ${SECTION_SAY} ${t} bis ${t + 10}.`,
    kmk: KMK,
  });
};

const sectionPlace: Form = (rng, stufe, ab) => {
  const t = rng.int(1, 9) * 10;
  const axis = sectionAxis(t);
  const e = rng.pick(ONES);
  const v = t + e;
  const prompt = `Setze den Pfeil auf ${fmt(v)}.`;
  return build(SKILL, stufe, {
    key: `abschnitt-setzen:${t}:${v}`,
    ab,
    prompt,
    answer: place(axis, v, 1),
    hints: [ONE_HINT, 'Schau auf die Einer der Zahl. Geh so viele Striche von links.'],
    steps: [`Der Ausschnitt beginnt bei ${fmt(t)}. Der Ausschnitt endet bei ${fmt(t + 10)}.`, ONE_HINT, { text: `Der Pfeil steht bei ${fmt(v)}.`, visual: marked(axis, v, fmt(v)) }],
    bugs: bugList(v, [
      ['strahl-null', v - 1, SECTION_NULL_HINT],
      ['strahl-von-rechts', t + 10 - e, LEFT_HINT],
    ]),
    praise: 'Du hast im Ausschnitt genau gezeigt.',
    srText: `${prompt} ${SECTION_SAY} ${t} bis ${t + 10}.`,
    kmk: KMK,
  });
};

/** Stufe 3, AB III: only the right end has a number. The child goes back from it. */
const sectionFromRight: Form = (rng, stufe, ab) => {
  const t = rng.int(1, 9) * 10;
  const end = t + 10;
  const axis: Axis = { ...sectionAxis(t), labels: [end] };
  const e = rng.pick(ONES);
  const v = t + e;
  const back = 10 - e;
  const prompt = `Jeder Strich ist 1. ${READ}`;
  return build(SKILL, stufe, {
    key: `abschnitt-rechts:${t}:${v}`,
    ab,
    prompt,
    visual: marked(axis, v, '?'),
    answer: { kind: 'number', value: v },
    hints: ['Beginne rechts bei der Zahl am Strahl.', 'Nach links wird es weniger.'],
    steps: [`Rechts steht ${fmt(end)}. Der Pfeil steht ${back} ${plural(back, 'Strich', 'Striche')} weiter links.`, `${fmt(end)} − ${back} = ${fmt(v)}`, { text: `Der Pfeil steht bei ${fmt(v)}.`, visual: marked({ ...axis, labels: [t, end] }, v, fmt(v)) }],
    bugs: bugList(v, [
      ['strahl-null', v - 1, 'Beginne rechts. Zähle die Sprünge, nicht die Striche.'],
      ['strahl-einer', back, 'Das ist die Zahl der Sprünge. Rechne von rechts zurück.'],
      ['strahl-von-rechts', end + back, 'Nach links wird es weniger. Rechne minus.'],
      dreherBug(v),
    ]),
    praise: 'Du hast von rechts zurück gerechnet.',
    srText: `${prompt} Der Ausschnitt endet rechts bei ${end}.`,
    kmk: KMK,
  });
};

const estimate =
  (withMiddle: boolean): Form =>
  (rng, stufe, ab) => {
    let v = rng.int(15, 85);
    if (v === 50) v += 1;
    const prompt = `Zeige ungefähr: Wo liegt ${fmt(v)}?`;
    const left = v < 50;
    const axis: Axis = withMiddle ? { ...EMPTY_AXIS, labels: [50] } : EMPTY_AXIS;
    return build(SKILL, stufe, {
      key: `${withMiddle ? 'schaetzen-mitte' : 'schaetzen'}:${v}`,
      ab,
      prompt,
      answer: place(axis, v, 1, ESTIMATE_TOLERANCE),
      hints: [withMiddle ? 'Schau auf die 50. Liegt die Zahl davor oder danach?' : 'In der Mitte liegt 50. Liegt die Zahl davor oder danach?', 'Links ist 0, rechts ist 100.'],
      steps: [
        'In der Mitte liegt 50.',
        `${fmt(v)} ist ${left ? 'kleiner' : 'größer'} als 50: ${left ? 'links' : 'rechts'} von der Mitte.`,
        { text: `Ungefähr hier liegt ${fmt(v)}.`, visual: marked({ ...EMPTY_AXIS, labels: [50] }, v, fmt(v)) },
      ],
      praise: 'Du hast von der Mitte aus geschätzt.',
      srText: `${prompt} Der Zahlenstrahl geht von 0 bis 100 und hat keine Striche dazwischen.${withMiddle ? ' Die 50 steht in der Mitte.' : ''}`,
      kmk: [...KMK, 'ZO.schaetzen'],
    });
  };

const FORMS: Forms = {
  1: { 1: [readTensWithMiddle, jumpsToArrow], 2: [readTensBare, twoArrowsTens], 3: [arrowMoved, placeTens] },
  2: { 1: [placeFives], 2: [readFives, twoArrowsFives], 3: [placeMiddle, placeMoved] },
  3: { 1: [sectionRead], 2: [sectionPlace, estimate(true)], 3: [estimate(false), sectionFromRight] },
};

export const zahlenstrahlSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Zahlenstrahl',
  description: 'Du liest und zeigst Zahlen am Zahlenstrahl.',
  stufen: {
    1: 'Zahlenstrahl bis 100 mit Strichen in Zehnern.',
    2: 'Zahlen zeigen, mit Strichen in Fünfern.',
    3: 'Ausschnitte wie 30 bis 40; schätzen auf dem leeren Strahl.',
  },
  kmk: KMK,
  generate: fromForms(FORMS),
};
