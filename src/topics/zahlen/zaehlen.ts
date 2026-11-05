/**
 * Zählen: vorwärts und rückwärts, auch in Schritten (docs/research.md §6). The Stufe chooses the content: Stufe 1 counts ±1 across
 * a ten, Stufe 2 in steps of 2, 5, 10 from a multiple, Stufe 3 in such steps from any start, or finds the step. The AB level is the
 * demand inside it: AB I forwards, AB II backwards (and without the line on Stufe 1), AB III gaps or the rule itself.
 */
import { BOX, fmt } from '../../core/format';
import type { Bug, MultiField, Rng, SkillDef, VisualOf } from '../../core/types';
import { build, joinDe, multiBugs, speak } from '../shared';
import { dreherFieldBugs, fromForms, tensLine, tensOf, type Form, type Forms } from './helpers';

const ID = 'zahlen.zaehlen';
const SKILL = { id: ID, topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum', 'MS.muster'];

type Dir = 'vor' | 'zurueck';
type Step = 2 | 5 | 10;
const DIRS: readonly Dir[] = ['vor', 'zurueck'];
const STEPS: readonly Step[] = [2, 5, 10];
const FIELD_IDS = ['a', 'b', 'c'];
const STEP_HINT: Record<Step, string> = {
  2: 'Bei 2er-Schritten überspringst du immer eine Zahl.',
  5: 'Bei 5er-Schritten wechseln sich 2 Einer immer ab.',
  10: 'Bei 10er-Schritten bleibt der Einer gleich.',
};
/** Which of five numbers are gaps. Two numbers stay, so the row shows its direction. */
const GAP_PATTERNS: readonly (readonly number[])[] = [[0, 2, 4], [1, 2, 4], [0, 2, 3], [1, 2, 3]];

const sign = (dir: Dir) => (dir === 'vor' ? 1 : -1);
const op = (dir: Dir) => (dir === 'vor' ? '+' : '−');
const field = (i: number) => FIELD_IDS[i];

function gapFields(values: number[]): MultiField[] {
  return values.map((value, i) => ({ id: FIELD_IDS[i], value, label: `${i + 1}. Zahl` }));
}

/** The numbers after `last`. */
function follow(last: number, step: number, dir: Dir, count: number): number[] {
  return Array.from({ length: count }, (_, i) => last + sign(dir) * step * (i + 1));
}

const ZEHNER_HINT: Record<Dir, string> = {
  vor: 'Bei 9 Einern ist der Zehner voll. Der nächste Zehner beginnt.',
  zurueck: 'Der Zehner wird 1 kleiner. Die Einer beginnen bei 9.',
};
const ZEHNER_HINT_STEPS: Record<Dir, string> = {
  vor: 'Hier ist der Zehner voll. Der nächste Zehner beginnt.',
  zurueck: 'Hier beginnt ein kleinerer Zehner. Der Zehner wird 1 kleiner.',
};
const DIR_HINT: Record<Dir, string> = {
  vor: 'Die Zahlen werden größer. Geh vorwärts.',
  zurueck: 'Die Zahlen werden kleiner. Geh rückwärts.',
};

/** §5: the ten stays when the ones wrap (39, 30 or 40, 49); only the first crossing. */
function wrongTenAtCrossing(last: number, values: number[], step: number, dir: Dir, fieldOf: (i: number) => string): Bug | null {
  if (step === 10) return null;
  const i = values.findIndex((v, k) => tensOf(v) !== tensOf(k === 0 ? last : values[k - 1]));
  if (i < 0) return null;
  return { id: 'zaehlen-zehner', match: { [fieldOf(i)]: values[i] - sign(dir) * 10 }, hint: step === 1 ? ZEHNER_HINT[dir] : ZEHNER_HINT_STEPS[dir] };
}

/** All fields as if the direction were the other one. */
function wrongDirection(last: number, step: number, dir: Dir, count: number, fieldOf: (i: number) => string): Bug {
  const other: Dir = dir === 'vor' ? 'zurueck' : 'vor';
  const match = Object.fromEntries(follow(last, step, other, count).map((v, i) => [fieldOf(i), v]));
  return { id: 'zaehlen-richtung', match, hint: DIR_HINT[dir] };
}

/** A line with one jump for each step of the sequence (worked solution). */
function jumpLine(seq: number[], step: number, dir: Dir): VisualOf<'numberLine'> {
  const jumps = seq.slice(1).map((to, i) => ({ from: seq[i], to, label: `${op(dir)} ${step}` }));
  return { ...tensLine(seq[0], seq[seq.length - 1]), jumps };
}

// ─── Stufe 1: ±1 across a ten ─────────────────────────────────────────────────

/** Forward, or backward without the line: the numbers after the two shown ones, across a ten. */
const countByOne =
  (dir: Dir, withLine: boolean): Form =>
  (rng, stufe, ab) => {
    const t = rng.int(2, dir === 'vor' ? 9 : 8) * 10;
    const at = rng.int(0, 2);
    // Forward: t is the field at position `at`. Backward: t − 1 is. The first number shown is ≤ 89 in both directions.
    const last = dir === 'vor' ? t - 1 - at : t + at;
    const before = last - sign(dir);
    const values = follow(last, 1, dir, 3);
    const expression = `${fmt(before)}, ${fmt(last)}, ${BOX}, ${BOX}, ${BOX}`;
    const prompt = dir === 'vor' ? 'Zähle vorwärts weiter.' : 'Zähle rückwärts weiter.';
    const answerFields = gapFields(values);
    // Labels only at the ends: a label at the ten would show a number the child has to write. The long tick marks the ten.
    const line: VisualOf<'numberLine'> = { type: 'numberLine', min: t - 10, max: t + 10, majorStep: 10, minorStep: 1, labelMajor: false, labels: [t - 10, t + 10], marks: [{ value: last, label: fmt(last) }] };
    return build(SKILL, stufe, {
      key: `eins:${dir}:${last}`,
      ab,
      prompt,
      expression,
      ...(withLine ? { visual: line } : {}),
      answer: { kind: 'multi', fields: answerFields },
      hints: [
        dir === 'vor' ? 'Bei 9 Einern ist der Zehner voll. Dann kommt der nächste Zehner.' : 'Vor einem vollen Zehner kommt eine Zahl mit 9 Einern.',
        withLine ? 'Schau auf den Zahlenstrahl: Jeder Strich ist 1 weiter.' : ZEHNER_HINT[dir],
      ],
      steps: [
        dir === 'vor' ? `Nach ${fmt(last)} kommt ${fmt(values[0])}.` : `Vor ${fmt(last)} kommt ${fmt(values[0])}.`,
        dir === 'vor' ? `Bei ${fmt(t)} beginnt ein neuer Zehner.` : last === t ? 'Hier wird der Zehner kleiner.' : `Vor ${fmt(t)} kommt ${fmt(t - 1)}. Der Zehner wird kleiner.`,
        `Die Zahlen heißen ${joinDe(values.map((v) => fmt(v)))}.`,
      ],
      bugs: multiBugs([wrongTenAtCrossing(last, values, 1, dir, field), wrongDirection(last, 1, dir, 3, field), ...dreherFieldBugs(answerFields)], answerFields),
      praise: 'Du hast über den Zehner gezählt.',
      srText: speak(`${prompt} ${expression}`),
      kmk: KMK,
    });
  };

/** The row with its gaps, the fields of the gaps, and the wrong answers all gap tasks share. */
function gapRow(seq: readonly number[], hidden: readonly number[], step: number, dir: Dir) {
  const values = hidden.map((i) => seq[i]);
  const answerFields = gapFields(values);
  const crossing = hidden.findIndex((i) => i > 0 && tensOf(seq[i]) !== tensOf(seq[i - 1]));
  const tenBug: Bug | false = step !== 10 && crossing >= 0 && { id: 'zaehlen-zehner', match: { [field(crossing)]: values[crossing] - sign(dir) * 10 }, hint: step === 1 ? ZEHNER_HINT[dir] : ZEHNER_HINT_STEPS[dir] };
  // The row read from the other end.
  const mirrored: Bug = { id: 'zaehlen-richtung', match: Object.fromEntries(hidden.map((i, k) => [field(k), seq[seq.length - 1 - i]])), hint: DIR_HINT[dir] };
  return {
    expression: seq.map((n, i) => (hidden.includes(i) ? BOX : fmt(n))).join(', '),
    values,
    answerFields,
    shared: [tenBug, mirrored, ...dreherFieldBugs(answerFields)],
  };
}

const byOneGaps: Form = (rng, stufe, ab) => {
  const dir = rng.pick(DIRS);
  const t = rng.int(2, dir === 'vor' ? 9 : 8) * 10;
  // The middle gap is the first number of the next ten, and the first number stays ≤ 89.
  const seq = dir === 'vor' ? [t - 2, t - 1, t, t + 1, t + 2] : [t + 1, t, t - 1, t - 2, t - 3];
  const hidden = rng.pick(GAP_PATTERNS);
  const { expression, values, answerFields, shared } = gapRow(seq, hidden, 1, dir);
  const prompt = 'Welche Zahlen fehlen?';
  return build(SKILL, stufe, {
    key: `eins-luecke:${dir}:${t}:${hidden.join('')}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields: answerFields },
    hints: ['Die Zahlen neben den Lücken zeigen die Richtung.', ZEHNER_HINT[dir]],
    steps: [
      `Die Zahlen werden ${dir === 'vor' ? 'größer' : 'kleiner'}. Der Schritt ist immer 1.`,
      dir === 'vor' ? `Bei ${fmt(t)} beginnt ein neuer Zehner.` : `Vor ${fmt(t)} kommt ${fmt(t - 1)}. Der Zehner wird kleiner.`,
      `Die Zahlen heißen ${joinDe(values.map((v) => fmt(v)))}.`,
    ],
    bugs: multiBugs(shared, answerFields),
    praise: 'Du hast die Lücken über den Zehner gefüllt.',
    srText: speak(`${prompt} ${expression}`),
    kmk: KMK,
  });
};

// ─── Stufe 2 and 3: steps of 2, 5, 10 ─────────────────────────────────────────

/** Five numbers with a fixed step: from a multiple on Stufe 2, from any other number on Stufe 3. */
function firstNumber(rng: Rng, step: number, dir: Dir, multiple: boolean): number {
  const span = 4 * step;
  if (multiple) {
    const k = dir === 'vor' ? rng.int(1, (100 - span) / step) : rng.int(1 + span / step, 100 / step);
    return k * step;
  }
  const n = dir === 'vor' ? rng.int(1, 100 - span) : rng.int(1 + span, 99);
  return n % step === 0 ? n - 1 : n;
}

const word = (dir: Dir) => (dir === 'vor' ? 'plus' : 'minus');

const countInSteps =
  (dir: Dir, multiple: boolean): Form =>
  (rng, stufe, ab) => {
    const step = rng.pick(STEPS);
    const first = firstNumber(rng, step, dir, multiple);
    const shown = [first, first + sign(dir) * step, first + sign(dir) * 2 * step];
    const last = shown[2];
    const values = follow(last, step, dir, 2);
    const expression = `${shown.map((n) => fmt(n)).join(', ')}, ${BOX}, ${BOX}`;
    const prompt = dir === 'vor' ? `Zähle in ${step}er-Schritten weiter.` : `Zähle in ${step}er-Schritten rückwärts.`;
    const answerFields = gapFields(values);
    const byOne: Bug = {
      id: 'schritt-eins',
      match: Object.fromEntries(follow(last, 1, dir, 2).map((v, i) => [field(i), v])),
      hint: `Die Zahlen springen immer um ${step}. Rechne ${word(dir)} ${step}.`,
    };
    return build(SKILL, stufe, {
      key: `${multiple ? 'schritt' : 'beliebig'}:${step}:${dir}:${first}`,
      ab,
      prompt,
      expression,
      answer: { kind: 'multi', fields: answerFields },
      hints: [`Rechne immer ${word(dir)} ${step}.`, STEP_HINT[step]],
      steps: [
        `Der Schritt ist ${step}. Du rechnest immer ${word(dir)} ${step}.`,
        `${fmt(last)} ${op(dir)} ${step} = ${fmt(values[0])}`,
        { text: `${fmt(values[0])} ${op(dir)} ${step} = ${fmt(values[1])}. Die Zahlen heißen ${fmt(values[0])} und ${fmt(values[1])}.`, visual: jumpLine([...shown, ...values], step, dir) },
      ],
      bugs: multiBugs([byOne, wrongDirection(last, step, dir, 2, field), wrongTenAtCrossing(last, values, step, dir, field), ...dreherFieldBugs(answerFields)], answerFields),
      praise: `Du hast in ${step}er-Schritten ${dir === 'vor' ? 'vorwärts' : 'rückwärts'} gezählt.`,
      srText: speak(`${prompt} ${expression}`),
      kmk: KMK,
    });
  };

/** Stufe 2, AB III: gaps in a row of multiples. The prompt names the step: finding it is Stufe 3. */
const stepGaps: Form = (rng, stufe, ab) => {
  const step = rng.pick(STEPS);
  const dir = rng.pick(DIRS);
  const first = firstNumber(rng, step, dir, true);
  const seq = [0, 1, 2, 3, 4].map((i) => first + sign(dir) * i * step);
  const hidden = rng.pick(GAP_PATTERNS);
  const { expression, values, answerFields, shared } = gapRow(seq, hidden, step, dir);
  const prompt = `Zähle in ${step}er-Schritten. Welche Zahlen fehlen?`;
  // One step of 1 from a shown number instead of a step of `step`.
  const byOne: Bug[] = hidden.flatMap((i, k) => {
    const from = !hidden.includes(i - 1) && i > 0 ? seq[i - 1] + sign(dir) : !hidden.includes(i + 1) && i < 4 ? seq[i + 1] - sign(dir) : null;
    return from === null ? [] : [{ id: 'schritt-eins', match: { [field(k)]: from }, hint: `Die Zahlen springen immer um ${step}. Rechne ${word(dir)} ${step}.` }];
  });
  return build(SKILL, stufe, {
    key: `schritt-luecke:${step}:${dir}:${first}:${hidden.join('')}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields: answerFields },
    hints: [`Rechne immer ${word(dir)} ${step}.`, STEP_HINT[step]],
    steps: [
      `Der Schritt ist ${step}. Die Zahlen werden ${dir === 'vor' ? 'größer' : 'kleiner'}.`,
      `Die ganze Reihe: ${seq.map((n) => fmt(n)).join(', ')}.`,
      { text: `Die Zahlen heißen ${joinDe(values.map((v) => fmt(v)))}.`, visual: jumpLine(seq, step, dir) },
    ],
    bugs: multiBugs([...byOne, ...shared], answerFields),
    praise: `Du hast die Lücken in ${step}er-Schritten gefüllt.`,
    srText: speak(`${prompt} ${expression}`),
    kmk: KMK,
  });
};

const FIND_HINTS = (dir: Dir) => ['Wie weit ist es von einer Zahl zur nächsten?', dir === 'vor' ? 'Die Zahlen werden größer. Rechne den Schritt dazu.' : 'Die Zahlen werden kleiner. Nimm den Schritt weg.'];

const findStep: Form = (rng, stufe, ab) => {
  const step = rng.pick(STEPS);
  const dir = rng.pick(DIRS);
  const first = firstNumber(rng, step, dir, false);
  const shown = [0, 1, 2, 3].map((i) => first + sign(dir) * i * step);
  const last = shown[3];
  const next = last + sign(dir) * step;
  const expression = `${shown.map((n) => fmt(n)).join(', ')}, ${BOX}`;
  const prompt = 'Finde den Schritt und die nächste Zahl.';
  const answerFields: MultiField[] = [
    { id: 'schritt', value: step, before: 'Der Schritt ist' },
    { id: 'zahl', value: next, before: 'Die nächste Zahl ist' },
  ];
  return build(SKILL, stufe, {
    key: `finden:${step}:${dir}:${first}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields: answerFields },
    hints: FIND_HINTS(dir),
    steps: [
      `Von ${fmt(shown[0])} bis ${fmt(shown[1])} sind es ${step}.`,
      `Die Zahlen werden ${dir === 'vor' ? 'größer' : 'kleiner'}: ${fmt(last)} ${op(dir)} ${step} = ${fmt(next)}.`,
      { text: `Der Schritt ist ${step}. Die nächste Zahl ist ${fmt(next)}.`, visual: jumpLine([...shown, next], step, dir) },
    ],
    bugs: multiBugs(
      [
        { id: 'schritt-eins', match: { zahl: last + sign(dir) }, hint: 'Der Schritt bleibt immer gleich. Nimm denselben Schritt wie vorher.' },
        wrongDirection(last, step, dir, 1, () => 'zahl'),
        wrongTenAtCrossing(last, [next], step, dir, () => 'zahl'),
        ...dreherFieldBugs(answerFields),
      ],
      answerFields,
    ),
    praise: 'Du hast die Regel der Zahlenreihe gefunden.',
    srText: speak(`${prompt} ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** The step is hidden in a row with gaps: the two numbers side by side show it. */
const findStepInGaps: Form = (rng, stufe, ab) => {
  const step = rng.pick(STEPS);
  const dir = rng.pick(DIRS);
  const first = firstNumber(rng, step, dir, false);
  const seq = [0, 1, 2, 3, 4].map((i) => first + sign(dir) * i * step);
  const expression = `${fmt(seq[0])}, ${BOX}, ${fmt(seq[2])}, ${fmt(seq[3])}, ${BOX}`;
  const prompt = 'Finde den Schritt und die Zahlen in den Lücken.';
  const answerFields: MultiField[] = [
    { id: 'schritt', value: step, before: 'Der Schritt ist' },
    { id: 'a', value: seq[1], before: 'Erste Lücke:' },
    { id: 'b', value: seq[4], before: 'Zweite Lücke:' },
  ];
  return build(SKILL, stufe, {
    key: `finden-luecke:${step}:${dir}:${first}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields: answerFields },
    hints: ['Schau auf die 2 Zahlen direkt hintereinander.', ...FIND_HINTS(dir).slice(1)],
    steps: [
      `Von ${fmt(seq[2])} bis ${fmt(seq[3])} sind es ${step}.`,
      `${fmt(seq[0])} ${op(dir)} ${step} = ${fmt(seq[1])} und ${fmt(seq[3])} ${op(dir)} ${step} = ${fmt(seq[4])}`,
      { text: `Der Schritt ist ${step}. Die Lücken sind ${fmt(seq[1])} und ${fmt(seq[4])}.`, visual: jumpLine(seq, step, dir) },
    ],
    bugs: multiBugs(
      [
        { id: 'schritt-eins', match: { a: seq[0] + sign(dir) }, hint: 'Der Schritt bleibt immer gleich. Nimm denselben Schritt wie vorher.' },
        { id: 'zaehlen-richtung', match: { a: seq[0] - sign(dir) * step, b: seq[3] - sign(dir) * step }, hint: DIR_HINT[dir] },
        wrongTenAtCrossing(seq[3], [seq[4]], step, dir, () => 'b'),
        ...dreherFieldBugs(answerFields),
      ],
      answerFields,
    ),
    praise: 'Du hast die Regel der Zahlenreihe gefunden.',
    srText: speak(`${prompt} ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

const FORMS: Forms = {
  1: { 1: [countByOne('vor', true)], 2: [countByOne('zurueck', false)], 3: [byOneGaps] },
  2: { 1: [countInSteps('vor', true)], 2: [countInSteps('zurueck', true)], 3: [stepGaps] },
  3: { 1: [countInSteps('vor', false)], 2: [countInSteps('zurueck', false)], 3: [findStep, findStepInGaps] },
};

export const zaehlenSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Zählen',
  description: 'Du zählst vorwärts und rückwärts, auch in Schritten.',
  stufen: {
    1: 'In Einerschritten über den Zehner zählen.',
    2: 'In 2er-, 5er- und 10er-Schritten zählen.',
    3: 'Von jeder Zahl aus in Schritten zählen und den Schritt finden.',
  },
  kmk: KMK,
  generate: fromForms(FORMS),
};

