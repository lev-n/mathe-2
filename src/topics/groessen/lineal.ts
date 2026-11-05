/**
 * Mit dem Lineal messen. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1 the object starts at 0, whole cm up to 15. AB 1 up to 10, AB 2 up to 15, AB 3 how far to a mark.
 * Stufe 2 the object starts at another mark, whole cm up to 20. AB 1 ends by 12, AB 2 ends by 20, AB 3 how far to a mark; someone read the end mark and the length is asked.
 * Stufe 3 compare two measured lengths; a broken ruler. AB 1 both objects start at 0, or a ruler broken above 8, past the marks of Stufe 2 AB 1. AB 2 two objects on different starts,
 * a ruler broken above 12 with an object across the 20, which Stufe 2 never has. AB 3 two objects on a broken ruler; which one is longer, when the end does not tell.
 * Answers are measured by the ruler visual, the object is called "Streifen" as there.
 */
import { MINUS, NBSP } from '../../core/format';
import type { Ab, Exercise, NumberAnswer, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, bugList, makeChoice, pickPerson, speak, targetAb } from '../shared';
import { describeRuler } from './helpers';

const SKILL = { id: 'groessen.lineal', topicId: 'groessen' } as const;
const KMK = ['GM.laenge'];

const cm = (n: number) => `${n}${NBSP}cm`;

const FROM_ZERO = 'Lege den Anfang auf die 0, nicht auf die 1.';
const JUMPS = 'Zähle die Sprünge, nicht die Striche.';

/** A length that is not the start mark: a task that names the start would show the answer. */
function lengthOtherThan(rng: Rng, min: number, max: number, start: number): number {
  const lengths = Array.from({ length: max - min + 1 }, (_, i) => min + i).filter((n) => n !== start);
  return rng.pick(lengths);
}

/** Plain unit after the field, or an Antwortsatz. */
function lengthAnswer(rng: Rng, value: number): NumberAnswer {
  return rng.chance(0.3)
    ? { kind: 'number', value, before: 'Der Streifen ist', after: 'cm lang.', label: 'Länge in Zentimetern' }
    : { kind: 'number', value, unit: 'cm', label: 'Länge in Zentimetern' };
}

function fromZero(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const length = ab === 1 ? rng.int(3, 10) : rng.int(8, 15);
  const maxCm = Math.min(15, length + rng.int(1, 5));
  const prompt = 'Wie lang ist der Streifen?';
  const answer = lengthAnswer(rng, length);
  const visual: VisualOf<'ruler'> = { type: 'ruler', maxCm, startCm: 0, lengthCm: length };
  return build(SKILL, stufe, {
    key: `ab-null:${length}:${maxCm}:${answer.before ? 's' : 'e'}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Der Streifen beginnt bei 0. Lies die Zahl am Ende ab.', JUMPS],
    steps: ['Der Streifen beginnt bei 0.', `Das Ende liegt bei ${length}.`, `Der Streifen ist ${cm(length)} lang.`],
    bugs: bugList(length, [
      ['lineal-anfang', length - 1, FROM_ZERO],
      ['lineal-striche', length + 1, JUMPS],
      ['lineal-rueckwaerts', maxCm - length, 'Lies das Lineal von links. Beginne bei der 0.'],
    ]),
    praise: 'Du hast bei der 0 angefangen.',
    srText: speak(`${prompt} ${describeRuler(visual)}`),
    kmk: KMK,
  });
}

/** How far is it from the end of the object to a mark? */
function untilMark(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const length = rng.int(3, 11);
  const target = length + rng.int(2, 4);
  const prompt = `Wie viele Zentimeter fehlen bis ${target}?`;
  const missing = target - length;
  const visual: VisualOf<'ruler'> = { type: 'ruler', maxCm: 15, startCm: 0, lengthCm: length };
  return build(SKILL, stufe, {
    key: `bis-marke:${length}:${target}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: missing, unit: 'cm', label: 'Länge in Zentimetern' },
    hints: ['Schau auf das Ende vom Streifen.', `Wie weit ist es von dort bis ${target}?`],
    steps: [`Der Streifen endet bei ${length}.`, `${target} ${MINUS} ${length} = ${missing}`, `Es fehlen ${cm(missing)}.`],
    praise: 'Du hast vom Ende bis zur Zahl gerechnet.',
    srText: speak(`${prompt} ${describeRuler(visual)}`),
    kmk: KMK,
  });
}

function fromOtherMark(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const start = ab === 1 ? rng.int(1, 4) : rng.int(3, 8);
  const maxCm = ab === 1 ? 12 : 20;
  const length = lengthOtherThan(rng, ab === 1 ? 3 : 6, maxCm - start, start);
  const end = start + length;
  // Never a shown calculation: it would hand over both readings, and the child would not measure.
  const prompt = 'Wie lang ist der Streifen?';
  const answer = lengthAnswer(rng, length);
  const fromTo = `Der Streifen beginnt bei ${start}. Wie viele Zentimeter bis ${end}?`;
  const visual: VisualOf<'ruler'> = { type: 'ruler', maxCm: Math.max(end, maxCm), startCm: start, lengthCm: length };
  return build(SKILL, stufe, {
    key: `andere-marke:${start}:${length}:${answer.before ? 's' : 'e'}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Schau auf den Anfang und auf das Ende.', 'Rechne: Ende minus Anfang.'],
    steps: [
      `Der Streifen beginnt bei ${start} und endet bei ${end}.`,
      { text: `${end} ${MINUS} ${start} = ${length}`, visual: { type: 'numberLine', min: 0, max: Math.max(end, maxCm), majorStep: 5, minorStep: 1, labelMajor: true, jumps: [{ from: start, to: end, label: `${length}` }] } },
      `Der Streifen ist ${cm(length)} lang.`,
    ],
    bugs: bugList(length, [
      ['lineal-ende', end, fromTo],
      ['lineal-striche', length + 1, JUMPS],
    ]),
    praise: 'Du hast vom Anfang bis zum Ende gemessen.',
    srText: speak(`${prompt} ${describeRuler(visual)}`),
    kmk: KMK,
  });
}

/** Another child read only the end: the number shown is not the length. */
function endMisread(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const start = rng.int(2, 8);
  const length = lengthOtherThan(rng, 4, 20 - start, start);
  const end = start + length;
  const { name } = pickPerson(rng);
  const context = `${name} liest am Ende vom Streifen ${end} ab.`;
  const prompt = 'Wie lang ist der Streifen wirklich?';
  const visual: VisualOf<'ruler'> = { type: 'ruler', maxCm: 20, startCm: start, lengthCm: length };
  return build(SKILL, stufe, {
    key: `ende-gelesen:${start}:${length}:${name}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value: length, unit: 'cm', label: 'Länge in Zentimetern' },
    hints: ['Das Ende allein sagt nicht die Länge. Schau auch auf den Anfang.', 'Rechne: Ende minus Anfang.'],
    steps: [`Der Streifen beginnt bei ${start} und endet bei ${end}.`, `${end} ${MINUS} ${start} = ${length}`, `Der Streifen ist ${cm(length)} lang.`],
    bugs: bugList(length, [
      ['lineal-ende', end, `Der Streifen beginnt bei ${start}. Wie viele Zentimeter bis ${end}?`],
      ['lineal-striche', length + 1, JUMPS],
    ]),
    praise: 'Du hast auch auf den Anfang geschaut.',
    srText: speak(`${context} ${prompt} ${describeRuler(visual)}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** From the end of an object that starts at another mark to a further mark. */
function untilMarkShifted(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const start = rng.int(2, 7);
  const length = rng.int(3, 9);
  const end = start + length;
  const target = end + rng.int(2, Math.min(5, 20 - end));
  const missing = target - end;
  const prompt = `Wie viele Zentimeter fehlen bis ${target}?`;
  const visual: VisualOf<'ruler'> = { type: 'ruler', maxCm: 20, startCm: start, lengthCm: length };
  return build(SKILL, stufe, {
    key: `bis-marke-versetzt:${start}:${length}:${target}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: missing, unit: 'cm', label: 'Länge in Zentimetern' },
    hints: ['Schau auf das Ende vom Streifen, nicht auf den Anfang.', `Wie weit ist es von dort bis ${target}?`],
    steps: [`Der Streifen endet bei ${end}.`, `${target} ${MINUS} ${end} = ${missing}`, `Es fehlen noch: ${cm(missing)}.`],
    bugs: bugList(missing, [['lineal-ende', target - start, 'Das ist der Weg vom Anfang. Schau auf das Ende vom Streifen.']]),
    praise: 'Du hast vom Ende bis zur Zahl gerechnet.',
    srText: speak(`${prompt} ${describeRuler(visual)}`),
    kmk: KMK,
  });
}

/** Two objects on one ruler. AB 1 both start at 0. From AB 2 the shorter one can reach further to the right. AB 3 on a broken ruler. */
function compareTwo(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const maxCm = ab === 1 ? 15 : 20;
  const minCm = ab === 3 ? rng.int(2, 5) : 0;
  const lengths = rng.sample([3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 2).sort((a, b) => b - a);
  const [long, short] = lengths;
  const longStart = ab === 1 ? 0 : minCm + rng.int(ab === 3 ? 0 : 1, 3);
  const shortStart = ab === 1 ? 0 : rng.int(longStart, maxCm - short);
  const longOnTop = rng.chance(0.5);
  const top = longOnTop ? { startCm: longStart, lengthCm: long } : { startCm: shortStart, lengthCm: short };
  const bottom = longOnTop ? { startCm: shortStart, lengthCm: short } : { startCm: longStart, lengthCm: long };
  const diff = long - short;
  const place = longOnTop ? 'obere' : 'untere';
  const prompt = ab === 3 ? `Das Lineal ist abgebrochen. Wie viel länger ist der ${place} Streifen?` : `Wie viel länger ist der ${place} Streifen?`;
  const endGap = Math.abs(longStart + long - shortStart - short);
  const visual: VisualOf<'ruler'> = { type: 'ruler', maxCm, ...(minCm ? { minCm } : {}), startCm: bottom.startCm, lengthCm: bottom.lengthCm, second: top };
  return build(SKILL, stufe, {
    key: `vergleich:${minCm}:${top.startCm}-${top.lengthCm}:${bottom.startCm}-${bottom.lengthCm}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: diff, unit: 'cm', label: 'Unterschied in Zentimetern' },
    hints: ['Miss zuerst beide Streifen.', 'Rechne dann den Unterschied aus.'],
    steps: [
      `Oben: ${top.startCm + top.lengthCm} ${MINUS} ${top.startCm} = ${top.lengthCm}`,
      `Unten: ${bottom.startCm + bottom.lengthCm} ${MINUS} ${bottom.startCm} = ${bottom.lengthCm}`,
      `${cm(long)} ${MINUS} ${cm(short)} = ${cm(diff)}`,
    ],
    bugs: bugList(diff, [
      ['mehr-unterschied', long, 'Gefragt ist der Unterschied: Wie viele Zentimeter sind es mehr?'],
      ['lineal-ende', endGap, 'Vergleiche die Längen, nicht nur die Enden. Beginne jeweils am Anfang.'],
    ]),
    praise: 'Du hast beide Streifen gemessen und verglichen.',
    srText: speak(`${prompt} ${describeRuler(visual)}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Which object is longer, when the object that reaches further is not the longer one? Sometimes both have the same length. */
function whichLonger(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const equal = rng.chance(0.25);
  const short = rng.int(3, 9);
  const long = equal ? short : short + rng.int(1, 4);
  const longStart = rng.int(0, 2);
  // Mostly the shorter object ends further right; sometimes the longer one does, so that no look at the ends decides.
  const shortStart = equal || rng.chance(0.6) ? longStart + long - short + rng.int(1, 4) : longStart + rng.int(0, long - short - 1);
  const longOnTop = rng.chance(0.5);
  const first = { startCm: longStart, lengthCm: long };
  const second = { startCm: shortStart, lengthCm: short };
  const top = longOnTop ? first : second;
  const bottom = longOnTop ? second : first;
  const prompt = 'Welcher Streifen ist länger?';
  const visual: VisualOf<'ruler'> = { type: 'ruler', maxCm: Math.max(shortStart + short, 15), startCm: bottom.startCm, lengthCm: bottom.lengthCm, second: top };
  const rightLabel = equal ? 'Beide gleich lang' : longOnTop ? 'Der obere Streifen' : 'Der untere Streifen';
  const ends = 'Das Ende allein sagt nicht die Länge. Miss beide Streifen.';
  const labels = ['Der obere Streifen', 'Der untere Streifen', 'Beide gleich lang'];
  return build(SKILL, stufe, {
    key: `laenger:${top.startCm}-${top.lengthCm}:${bottom.startCm}-${bottom.lengthCm}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(rng, { label: rightLabel }, labels.filter((l) => l !== rightLabel).map((l) => ({ label: l, whyWrong: ends })), { order: labels }),
    hints: ['Das Ende allein sagt nicht die Länge.', 'Rechne bei jedem Streifen: Ende minus Anfang.'],
    steps: [
      `Oben: ${top.startCm + top.lengthCm} ${MINUS} ${top.startCm} = ${top.lengthCm}`,
      `Unten: ${bottom.startCm + bottom.lengthCm} ${MINUS} ${bottom.startCm} = ${bottom.lengthCm}`,
      equal ? 'Beide Streifen sind gleich lang.' : `${rightLabel} ist länger.`,
    ],
    praise: 'Du hast die Längen verglichen, nicht die Enden.',
    srText: speak(`${prompt} ${describeRuler(visual)}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/**
 * A broken ruler: the numbers do not start at 0, and they lie above the marks of the same AB on Stufe 2, as end minus start alone would be
 * the content of Stufe 2. AB 1 from 8 on, AB 2 from 12 on and across the 20.
 */
function brokenRuler(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const minCm = ab === 1 ? rng.int(8, 11) : rng.int(12, 16);
  const span = 12;
  const start = minCm + rng.int(1, 3);
  const shortest = ab === 1 ? 4 : Math.max(5, 21 - start);
  const length = lengthOtherThan(rng, shortest, span - (start - minCm), start);
  const end = start + length;
  const prompt = 'Das Lineal ist abgebrochen. Wie lang ist der Streifen?';
  const visual: VisualOf<'ruler'> = { type: 'ruler', maxCm: minCm + span, minCm, startCm: start, lengthCm: length };
  return build(SKILL, stufe, {
    key: `abgebrochen:${minCm}:${start}:${length}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: length, unit: 'cm', label: 'Länge in Zentimetern' },
    hints: ['Das Lineal beginnt nicht bei 0. Rechne: Ende minus Anfang.', `Der Streifen beginnt bei ${start}.`],
    steps: [`Der Streifen beginnt bei ${start} und endet bei ${end}.`, `${end} ${MINUS} ${start} = ${length}`, `Der Streifen ist ${cm(length)} lang.`],
    bugs: bugList(length, [
      ['lineal-ende', end, `Der Streifen beginnt bei ${start}. Wie viele Zentimeter bis ${end}?`],
      ['lineal-striche', length + 1, JUMPS],
    ]),
    praise: 'Du hast auch ohne die 0 richtig gemessen.',
    srText: speak(`${prompt} ${describeRuler(visual)}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [fromZero], 2: [fromZero], 3: [untilMark] },
  2: { 1: [fromOtherMark], 2: [fromOtherMark], 3: [endMisread, untilMarkShifted] },
  3: { 1: [compareTwo, brokenRuler], 2: [compareTwo, brokenRuler], 3: [compareTwo, whichLonger] },
};

export const linealSkill: SkillDef = {
  ...SKILL,
  title: 'Mit dem Lineal messen',
  description: 'Du misst Längen in Zentimetern.',
  stufen: {
    1: 'Der Streifen beginnt bei 0, bis 15 cm',
    2: 'Der Streifen beginnt an einer anderen Stelle',
    3: '2 Längen vergleichen, Lineal ohne Anfang',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
