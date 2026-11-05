/**
 * Meter und Zentimeter. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1, cm or m for known objects: AB I which unit, what do you measure in it; AB II which thing has this length, how long is 1 cm or 1 m;
 * AB III check a sentence, what do you not measure in this unit.
 * Stufe 2, 1 m = 100 cm, 2 m 15 cm = 215 cm: AB I round centimetres, also in a sentence, whole metres; AB II any centimetres, how much to 1 m; AB III the other
 * way round: 215 cm = □ m □ cm, a gap, how much to 2 m.
 * Stufe 3, order mixed lengths, plausible sizes: AB I order 3, plausible size, also in centimetres; AB II order 4, compare; AB III order 5, which length lies
 * between, which sentence cannot hold.
 * Lengths stay at 2 m 50 cm or below: the numbers of Klasse 2 end at 100, and 2 m 15 cm is the catalogue's one exception.
 */
import { BOX, fmtLength, MINUS, NBSP } from '../../core/format';
import type { Ab, Bug, ChoiceAnswer, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, makeChoice, multiBugs, pickPerson, safeHints, speak, targetAb } from '../shared';
import { labelledOrder } from './helpers';

const SKILL = { id: 'groessen.meter-zentimeter', topicId: 'groessen' } as const;
const KMK = ['GM.einheiten', 'GM.vorstellung'];

const cm = (n: number) => `${n}${NBSP}cm`;
const m = (n: number) => `${n}${NBSP}m`;

const MAX_METERS = 2;

const HUNDRED = '1 m sind 100 cm.';
const THINK_CM = 'Stell dir das vor: 1 cm ist so breit wie ein Finger.';
const THINK_M = 'Stell dir das vor: 1 m ist ein großer Schritt.';

interface Thing {
  /** 'Ein Bleistift' */
  text: string;
  name: string;
  /** Typical size, with its unit. */
  size: number;
  unit: 'cm' | 'm';
  word: 'lang' | 'hoch';
}

const THINGS: readonly Thing[] = [
  { text: 'Ein Bleistift', name: 'Bleistift', size: 17, unit: 'cm', word: 'lang' },
  { text: 'Ein Radiergummi', name: 'Radiergummi', size: 5, unit: 'cm', word: 'lang' },
  { text: 'Ein Schulheft', name: 'Schulheft', size: 30, unit: 'cm', word: 'lang' },
  { text: 'Ein Löffel', name: 'Löffel', size: 15, unit: 'cm', word: 'lang' },
  { text: 'Eine Schere', name: 'Schere', size: 15, unit: 'cm', word: 'lang' },
  { text: 'Eine Tür', name: 'Tür', size: 2, unit: 'm', word: 'hoch' },
  { text: 'Ein Schulbus', name: 'Schulbus', size: 12, unit: 'm', word: 'lang' },
  { text: 'Ein Auto', name: 'Auto', size: 4, unit: 'm', word: 'lang' },
  { text: 'Eine Turnhalle', name: 'Turnhalle', size: 30, unit: 'm', word: 'lang' },
  { text: 'Ein Klassenraum', name: 'Klassenraum', size: 8, unit: 'm', word: 'lang' },
];
const IN_CM = THINGS.filter((t) => t.unit === 'cm');
const IN_M = THINGS.filter((t) => t.unit === 'm');
const sized = (t: Thing) => (t.unit === 'cm' ? cm(t.size) : m(t.size));

function chooseUnit(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const t = rng.pick(THINGS);
  const prompt = `${t.text} ist etwa ${t.size} ${BOX} ${t.word}. Welche Einheit passt?`;
  const isCm = t.unit === 'cm';
  const answer: ChoiceAnswer = makeChoice(
    rng,
    { label: t.unit },
    [{ label: isCm ? 'm' : 'cm', whyWrong: isCm ? THINK_M : THINK_CM }],
    { order: ['cm', 'm'], layout: 'symbols' },
  );
  return build(SKILL, stufe, {
    key: `einheit:${t.name}`,
    ab,
    prompt,
    answer,
    hints: [THINK_CM, THINK_M],
    steps: [isCm ? `${t.text} passt gut in die Hand.` : `${t.text} ist viel größer als du.`, `${t.text} ist etwa ${t.size} ${t.unit} ${t.word}.`],
    praise: 'Du hast dir die Größe gut vorgestellt.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** Which thing has about this length? */
function matchThing(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const t = rng.pick(THINGS.filter((x) => x.word === 'lang'));
  const size = t.unit === 'cm' ? cm(t.size) : m(t.size);
  const prompt = `Was ist etwa ${size} lang?`;
  // Known objects of the other unit only: telling 4 m from 8 m is an estimate, not the choice between cm and m.
  const others = rng.sample(t.unit === 'cm' ? IN_M : IN_CM, 3);
  return build(SKILL, stufe, {
    key: `was-ist:${t.name}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: t.name }, others.map((o) => ({ label: o.name, whyWrong: `${o.text} ist etwa ${o.unit === 'cm' ? cm(o.size) : m(o.size)} ${o.word}.` }))),
    hints: [t.unit === 'cm' ? THINK_CM : THINK_M, t.unit === 'cm' ? 'Such etwas Kleines. Das Ding passt gut in die Hand.' : 'Such etwas Großes. Das Ding ist viel größer als du.'],
    steps: [`${t.text} ist etwa ${size} lang.`],
    praise: 'Du hast dir die Länge gut vorgestellt.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

function whatInUnit(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const inCm = rng.chance(0.5);
  const t = rng.pick(inCm ? IN_CM : IN_M);
  const prompt = inCm ? 'Was misst du in Zentimetern?' : 'Was misst du in Metern?';
  const wrongs = rng.sample(inCm ? IN_M : IN_CM, 3).map((o) => ({ label: o.name, whyWrong: `${o.text} ist etwa ${o.unit === 'cm' ? cm(o.size) : m(o.size)} ${o.word}.` }));
  return build(SKILL, stufe, {
    key: `messen:${inCm ? 'cm' : 'm'}:${t.name}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: t.name }, wrongs),
    hints: [inCm ? 'Kleine Dinge misst du in Zentimetern.' : 'Große Dinge misst du in Metern.', inCm ? THINK_CM : THINK_M],
    steps: [`${t.text} ist etwa ${t.unit === 'cm' ? cm(t.size) : m(t.size)} ${t.word}.`],
    praise: 'Du hast die passende Einheit gefunden.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: a sentence with the right or the wrong unit. */
function checkUnit(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const t = rng.pick(THINGS);
  const holds = rng.chance(0.5);
  const shownUnit = holds ? t.unit : t.unit === 'cm' ? 'm' : 'cm';
  const { name } = pickPerson(rng);
  const context = `${name} sagt: ${t.text} ist etwa ${t.size}${NBSP}${shownUnit} ${t.word}.`;
  const prompt = 'Stimmt das?';
  const big = t.unit === 'm';
  return build(SKILL, stufe, {
    key: `stimmt:${t.name}:${shownUnit}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: holds ? 'Stimmt' : 'Stimmt nicht' }, [{ label: holds ? 'Stimmt nicht' : 'Stimmt', whyWrong: big ? `${t.text} ist viel größer als du.` : `${t.text} passt gut in die Hand.` }], { order: ['Stimmt', 'Stimmt nicht'] }),
    hints: [THINK_CM, THINK_M],
    steps: [big ? `${t.text} ist viel größer als du.` : `${t.text} passt gut in die Hand.`, `${t.text} ist etwa ${sized(t)} ${t.word}.`, holds ? 'Der Satz stimmt.' : 'Der Satz stimmt nicht.'],
    praise: 'Du hast an die echte Größe gedacht.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 1, AB III, the other way round: what do you not measure in this unit? */
function notInUnit(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const inCm = rng.chance(0.5);
  const t = rng.pick(inCm ? IN_M : IN_CM);
  const prompt = inCm ? 'Was misst du nicht in Zentimetern?' : 'Was misst du nicht in Metern?';
  const wrongs = rng.sample(inCm ? IN_CM : IN_M, 3).map((o) => ({ label: o.name, whyWrong: `${o.text} ist etwa ${sized(o)} ${o.word}. Das passt.` }));
  return build(SKILL, stufe, {
    key: `nicht-messen:${inCm ? 'cm' : 'm'}:${t.name}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: t.name }, wrongs),
    hints: [inCm ? 'Kleine Dinge misst du in Zentimetern.' : 'Große Dinge misst du in Metern.', 'Stell dir jedes Ding genau vor.'],
    steps: [`${t.text} ist etwa ${sized(t)} ${t.word}.`, `${t.name} misst du in ${t.unit === 'cm' ? 'Zentimetern' : 'Metern'}.`],
    praise: 'Du hast jedes Ding mit der Einheit verglichen.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** Bezugsgrößen: what is about 1 cm wide, what is about 1 m long? */
function referenceSize(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const oneCm = rng.chance(0.5);
  const context = oneCm ? 'Der Streifen ist 1 cm lang.' : undefined;
  const prompt = oneCm ? 'Was ist auch etwa 1 cm breit?' : 'Was ist etwa 1 m lang?';
  const right = oneCm ? 'ein Finger' : 'ein großer Schritt';
  const wrongs = oneCm
    ? [{ label: 'ein Schulheft', whyWrong: 'Ein Schulheft ist viel breiter.' }, { label: 'eine Tür', whyWrong: 'Eine Tür ist viel breiter.' }, { label: 'ein Tisch', whyWrong: 'Ein Tisch ist viel breiter.' }]
    : [{ label: 'ein Finger', whyWrong: 'Ein Finger ist viel kürzer.' }, { label: 'ein Bleistift', whyWrong: 'Ein Bleistift ist viel kürzer.' }, { label: 'ein Schulbus', whyWrong: 'Ein Schulbus ist viel länger.' }];
  return build(SKILL, stufe, {
    key: `bezug:${oneCm ? 'cm' : 'm'}`,
    ab,
    ...(context ? { context } : {}),
    prompt,
    ...(oneCm ? { visual: { type: 'ruler' as const, maxCm: 5, startCm: 0, lengthCm: 1 } } : {}),
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: [oneCm ? 'Vergleiche jede Antwort mit dem Streifen.' : '100 cm sind 1 m. Das ist ziemlich lang.', 'Stell dir jede Antwort vor.'],
    steps: [oneCm ? 'Ein Finger ist etwa 1 cm breit.' : 'Ein großer Schritt ist etwa 1 m lang.'],
    praise: 'Du hast eine gute Größe zum Vergleich gefunden.',
    srText: speak([context, prompt].filter(Boolean).join(' ')),
    kmk: KMK,
  });
}

/** 1 m = 100 cm */
function metersToCm(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const meters = rng.int(1, MAX_METERS);
  const value = meters * 100;
  const expression = `${m(meters)} = ${BOX} cm`;
  return build(SKILL, stufe, {
    key: `m-zu-cm:${meters}`,
    ab,
    prompt: 'Wandle um.',
    expression,
    answer: { kind: 'number', value, unit: 'cm', label: 'Länge in Zentimetern' },
    hints: safeHints([HUNDRED, 'Rechne für jeden Meter 100 cm.'], value, 'Ein Stück von 10 cm passt 10-mal in 1 m.'),
    steps: [HUNDRED, `${m(meters)} = ${cm(value)}`],
    bugs: bugList(value, [['m-cm', meters * 10, value === 100 ? 'Ein Meter hat mehr als 10 cm. Stell dir das Lineal vor.' : HUNDRED]]),
    praise: 'Du hast an die 100 cm gedacht.',
    srText: speak(`Wandle um. ${expression}`),
    kmk: KMK,
  });
}

/** A length in metres and centimetres, at most 2 m 50 cm. AB I round centimetres, from AB II on any. */
function mixedLength(rng: Rng, ab: Ab): { meters: number; rest: number; value: number } {
  const meters = rng.int(1, MAX_METERS);
  const most = meters === 1 ? 99 : 50;
  const rest = ab === 1 ? rng.int(1, Math.floor(most / 10)) * 10 : rng.chance(0.3) ? rng.int(1, 9) : rng.int(11, most);
  return { meters, rest, value: meters * 100 + rest };
}

/** What a mixed length needs, in a bare calculation and in a sentence alike. */
function mixedParts(meters: number, rest: number, value: number) {
  const split = `${m(meters)} sind ${cm(meters * 100)}. Dazu kommen ${cm(rest)}.`;
  return {
    hints: [HUNDRED, split],
    steps: [`${m(meters)} = ${cm(meters * 100)}`, `${cm(meters * 100)} + ${cm(rest)} = ${cm(value)}`],
    bugs: bugList(value, [
      ['m-cm', meters * 10 + rest, split],
      ['m-cm-2', meters + rest, split],
    ]),
    praise: 'Du hast die Meter zuerst in Zentimeter umgewandelt.',
  };
}

/** 2 m 15 cm = 215 cm. */
function mixedToCm(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { meters, rest, value } = mixedLength(rng, ab);
  const expression = `${fmtLength(value)} = ${BOX} cm`;
  return build(SKILL, stufe, {
    key: `gemischt:${value}`,
    ab,
    prompt: 'Wandle um.',
    expression,
    answer: { kind: 'number', value, unit: 'cm', label: 'Länge in Zentimetern' },
    ...mixedParts(meters, rest, value),
    srText: speak(`Wandle um. ${expression}`),
    kmk: KMK,
  });
}

const LONG_THINGS = ['Das Band', 'Das Seil', 'Die Schnur', 'Das Brett', 'Das Regal', 'Die Bank'];

/** The same in a sentence: Das Seil ist 1 m 40 cm lang. */
function lengthInCm(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { meters, rest, value } = mixedLength(rng, ab);
  const thing = rng.pick(LONG_THINGS);
  const context = `${thing} ist ${fmtLength(value)} lang.`;
  const prompt = 'Wie viele Zentimeter sind das?';
  return build(SKILL, stufe, {
    key: `satz:${thing}:${value}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: 'cm', label: 'Länge in Zentimetern' },
    ...mixedParts(meters, rest, value),
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** 300 cm = 3 m */
function cmToMeters(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const meters = rng.int(1, MAX_METERS);
  const expression = `${cm(meters * 100)} = ${BOX} m`;
  // '100 cm sind 1 m.' states the answer of 100 cm = □ m.
  const one = meters === 1;
  return build(SKILL, stufe, {
    key: `cm-zu-m:${meters}`,
    ab,
    prompt: 'Wandle um.',
    expression,
    answer: { kind: 'number', value: meters, unit: 'm', label: 'Länge in Metern' },
    hints: one ? ['Stell dir einen großen Schritt vor.', 'Wie viele große Schritte sind 100 cm?'] : ['100 cm sind 1 m.', 'Wie oft passen 100 cm hinein?'],
    steps: ['100 cm sind 1 m.', `${cm(meters * 100)} = ${m(meters)}`],
    bugs: bugList(meters, [['m-cm', meters * 10, one ? 'Das sind nicht 10 m. Denk an einen großen Schritt.' : '100 cm sind 1 m, nicht 10 m.']]),
    praise: 'Du hast die 100 cm zu Metern gebündelt.',
    srText: speak(`Wandle um. ${expression}`),
    kmk: KMK,
  });
}

/** 20, 25, 30 … 95: a length with a round way to 1 m. */
const FIVES_TO_METER = Array.from({ length: 16 }, (_, i) => 20 + i * 5);

/** How much is missing to 1 m? */
function toOneMeter(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // Not 50 cm: the 50 of the answer would stand in the task.
  const length = rng.pick(FIVES_TO_METER.filter((n) => n !== 50));
  const missing = 100 - length;
  const context = `Das Band ist ${cm(length)} lang.`;
  const prompt = 'Wie viele Zentimeter fehlen bis 1 m?';
  return build(SKILL, stufe, {
    key: `bis-meter:${length}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: missing, unit: 'cm', label: 'Länge in Zentimetern' },
    hints: [HUNDRED, `Wie viel fehlt von ${length} bis 100?`],
    steps: [HUNDRED, `100 cm ${MINUS} ${cm(length)} = ${cm(missing)}`, `Es fehlen ${cm(missing)}.`],
    bugs: bugList(missing, [['m-cm', 10 - Math.floor(length / 10), `1 m sind 100 cm. Wie viel fehlt von ${length} bis 100?`]]),
    praise: 'Du hast bis 100 cm gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III, the other way round: 215 cm = □ m □ cm. */
function cmToMixed(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const meters = rng.int(1, MAX_METERS);
  const rest = rng.chance(0.3) ? rng.int(1, 9) : rng.int(11, 50);
  const value = meters * 100 + rest;
  const expression = `${cm(value)} = ${BOX} m ${BOX} cm`;
  const fields: MultiField[] = [
    { id: 'm', value: meters, after: 'm', label: 'Meter' },
    { id: 'cm', value: rest, after: 'cm', label: 'Zentimeter' },
  ];
  return build(SKILL, stufe, {
    key: `zerlegen:${value}`,
    ab,
    prompt: 'Wandle um.',
    expression,
    answer: { kind: 'multi', fields },
    hints: ['Wie oft passen 100 cm hinein?', 'Der Rest sind die Zentimeter.'],
    steps: [`${cm(meters * 100)} = ${m(meters)}`, `${cm(value)} = ${fmtLength(value)}`],
    bugs: multiBugs([{ id: 'm-cm', match: { m: Math.floor(value / 10), cm: value % 10 }, hint: 'Wie oft passen 100 cm hinein? Nicht 10 cm.' }], fields),
    praise: 'Du hast immer 100 cm gebündelt.',
    srText: speak(`Wandle um. ${expression}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III, a gap: 1 m □ cm = 140 cm. */
function gapInMixed(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const meters = rng.int(1, MAX_METERS);
  // Not 2 m 2 cm: the 2 of the answer would stand in the task.
  const rest = rng.chance(0.3) ? rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== meters)) : rng.int(11, 50);
  const value = meters * 100 + rest;
  const expression = `${m(meters)} ${BOX} cm = ${cm(value)}`;
  return build(SKILL, stufe, {
    key: `luecke:${value}`,
    ab,
    prompt: 'Welche Zahl fehlt?',
    expression,
    answer: { kind: 'number', value: rest, unit: 'cm', label: 'Länge in Zentimetern' },
    hints: ['Wandle zuerst die Meter um.', 'Wie viele Zentimeter fehlen dann noch?'],
    steps: [`${m(meters)} = ${cm(meters * 100)}`, `${cm(value)} ${MINUS} ${cm(meters * 100)} = ${cm(rest)}`],
    bugs: bugList(rest, [['m-cm', value - meters * 10, HUNDRED]]),
    praise: 'Du hast von den Metern aus weiter gerechnet.',
    srText: speak(`Welche Zahl fehlt? ${expression}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: how much is missing to 2 m? */
function toTwoMeters(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // Not 1 m 50 cm: the 50 of the answer would stand in the task.
  const length = 100 + rng.pick(FIVES_TO_METER.filter((n) => n !== 50).concat(10, 15));
  const missing = 200 - length;
  const context = `Das Band ist ${fmtLength(length)} lang.`;
  const prompt = `Wie viele Zentimeter fehlen bis ${m(2)}?`;
  return build(SKILL, stufe, {
    key: `bis-zwei:${length}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: missing, unit: 'cm', label: 'Länge in Zentimetern' },
    hints: ['Wandle zuerst beide Längen in Zentimeter um.', 'Wie viel fehlt dann noch?'],
    steps: [`${m(2)} = ${cm(200)}`, `${cm(200)} ${MINUS} ${cm(length)} = ${cm(missing)}`, `Es fehlen ${cm(missing)}.`],
    bugs: bugList(missing, [['m-cm', 100 - (length - 100), 'Das Band ist schon länger als 1 m. Wandle zuerst um.'], ['m-cm', 20 - Math.floor(length / 10), HUNDRED]]),
    praise: 'Du hast beide Längen in Zentimetern gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Lengths to order, each written as in class: mixed, or only in cm. */
const LENGTHS: readonly [value: number, label: string][] = [
  [20, cm(20)], [45, cm(45)], [60, cm(60)], [90, cm(90)], [100, m(1)], [105, fmtLength(105)], [120, cm(120)],
  [150, cm(150)], [200, m(2)], [215, fmtLength(215)], [250, cm(250)],
];

const WITH_METERS = LENGTHS.filter(([, label]) => label.includes(`${NBSP}m`));
const ONLY_CM = LENGTHS.filter(([, label]) => !label.includes(`${NBSP}m`));

/** What a child gets who compares only the first printed number: 90 cm after 2 m. */
function printedOrderBug(items: string[], correct: number[], direction: 'aufsteigend' | 'absteigend'): Bug[] {
  const printed = items.map((label) => parseInt(label, 10));
  if (new Set(printed).size < printed.length) return [];
  const sign = direction === 'aufsteigend' ? 1 : -1;
  const match = items.map((_, i) => i).sort((a, b) => sign * (printed[a] - printed[b]));
  return match.every((v, i) => v === correct[i]) ? [] : [{ id: 'm-cm', match, hint: 'Wandle zuerst alles in Zentimeter um. 1 m sind 100 cm.' }];
}

function orderLengths(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // at least one length of each form, so that converting is needed
  const pair = [rng.pick(WITH_METERS), rng.pick(ONLY_CM)];
  // AB I 3, AB II 4, AB III 5 lengths
  const chosen = [...pair, ...rng.sample(LENGTHS.filter((l) => !pair.includes(l)), ab)];
  const labels = new Map(chosen);
  const direction = rng.chance(0.7) ? 'aufsteigend' as const : 'absteigend' as const;
  const { answer, shown } = labelledOrder(rng, chosen.map(([value]) => value), (v) => labels.get(v)!, direction);
  const sorted = answer.correct.map((i) => shown[i]);
  const start = direction === 'aufsteigend' ? 'kürzesten' : 'längsten';
  const prompt = `Ordne die Längen. Beginne mit der ${start} Länge.`;
  return build(SKILL, stufe, {
    key: `ordnen:${direction}:${shown.join('-')}`,
    ab,
    prompt,
    answer,
    hints: [HUNDRED, 'Wandle zuerst alles in Zentimeter um.'],
    steps: [`In Zentimetern: ${sorted.map(cm).join(direction === 'aufsteigend' ? ' < ' : ' > ')}`],
    bugs: printedOrderBug(answer.items, answer.correct, direction),
    praise: 'Du hast alle Längen in Zentimetern verglichen.',
    srText: speak(`${prompt} ${answer.items.join(', ')}`),
    kmk: KMK,
  });
}

/**
 * Plausible sizes: the right one and impossible ones. A size above 1 m has two right forms, so that the child also has to convert,
 * which is what sets this apart from the choice between cm and m on Stufe 1.
 */
const PLAUSIBLE: readonly { q: string; size: number; wrongs: readonly string[]; real: string }[] = [
  { q: 'Wie hoch ist eine Tür?', size: 200, wrongs: [cm(2), m(20), cm(20), m(10)], real: 'eine echte Tür' },
  { q: 'Wie lang ist ein Bett?', size: 200, wrongs: [cm(2), m(20), cm(20), cm(50)], real: 'ein echtes Bett' },
  { q: 'Wie groß ist ein Kind in Klasse 2?', size: 125, wrongs: [cm(25), m(12), m(5), cm(12)], real: 'ein echtes Kind' },
  { q: 'Wie groß ist eine Lehrerin?', size: 170, wrongs: [cm(17), cm(70), m(17), m(7)], real: 'eine echte Lehrerin' },
  { q: 'Wie hoch ist ein Schultisch?', size: 70, wrongs: [cm(7), m(7), m(70), cm(17)], real: 'einen echten Tisch' },
  { q: 'Wie hoch ist ein Stuhl?', size: 80, wrongs: [cm(8), m(8), m(80), cm(18)], real: 'einen echten Stuhl' },
  { q: 'Wie lang ist ein Bleistift?', size: 17, wrongs: [m(17), cm(1), m(2), cm(170)], real: 'einen echten Bleistift' },
  { q: 'Wie lang ist ein Schulheft?', size: 30, wrongs: [cm(3), m(30), m(3), cm(130)], real: 'ein echtes Schulheft' },
  { q: 'Wie lang ist ein Löffel?', size: 15, wrongs: [m(15), cm(1), cm(150), m(5)], real: 'einen echten Löffel' },
  { q: 'Wie lang ist ein Radiergummi?', size: 5, wrongs: [m(5), cm(50), m(50), m(1)], real: 'einen echten Radiergummi' },
  // Metres only: 1200 cm is above the numbers of Klasse 2.
  { q: 'Wie lang ist ein Schulbus?', size: 1200, wrongs: [cm(12), m(100), m(1), cm(120)], real: 'einen echten Bus' },
  { q: 'Wie lang ist ein Auto?', size: 400, wrongs: [cm(4), m(40), cm(40), m(100)], real: 'ein echtes Auto' },
  { q: 'Wie hoch ist ein Haus?', size: 1000, wrongs: [cm(10), m(1), cm(100), cm(50)], real: 'ein echtes Haus' },
  { q: 'Wie lang ist eine Turnhalle?', size: 3000, wrongs: [cm(30), cm(3), m(2), m(1)], real: 'eine echte Turnhalle' },
  { q: 'Wie lang ist ein Klassenraum?', size: 800, wrongs: [cm(8), cm(80), m(80), m(1)], real: 'einen echten Klassenraum' },
];

/** Above 1 m, up to 2 m 50 cm, a size has two forms; below 1 m it is in cm; a larger size stays in metres. */
function sizeForms(value: number): string[] {
  if (value > 250) return [m(value / 100)];
  return value > 100 ? [fmtLength(value), cm(value)] : [cm(value)];
}

function plausible(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const t = rng.pick(PLAUSIBLE);
  const forms = sizeForms(t.size);
  const form = rng.int(0, forms.length - 1);
  const right = forms[form];
  const why = `Kann das stimmen? Denk an ${t.real}.`;
  return build(SKILL, stufe, {
    key: `sinnvoll:${t.q}:${form}`,
    ab,
    prompt: t.q,
    answer: makeChoice(rng, { label: right }, rng.sample(t.wrongs, 3).map((label) => ({ label, whyWrong: why }))),
    hints: [`Denk an ${t.real}.`, t.size < 100 ? THINK_CM : THINK_M],
    steps: [`Denk an ${t.real}.`, ...(forms.length > 1 ? [`${forms[0]} = ${forms[1]}`] : []), `${right} passt am besten.`],
    praise: 'Du hast an die echte Größe gedacht.',
    srText: speak(t.q),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function compareLengths(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const a = rng.pick([105, 120, 150, 180, 205, 210]);
  const b = rng.pick([a, a + rng.int(1, 4) * 10, a - rng.int(1, 4) * 10]);
  const sign = a < b ? '<' : a > b ? '>' : '=';
  const expression = `${fmtLength(a)} ${BOX} ${cm(b)}`;
  const why = `Wandle zuerst um: ${fmtLength(a)} sind ${cm(a)}.`;
  return build(SKILL, stufe, {
    key: `vergleich:${a}:${b}`,
    ab,
    prompt: 'Welches Zeichen passt?',
    expression,
    answer: makeChoice(rng, { label: sign }, ['<', '>', '='].filter((s) => s !== sign).map((label) => ({ label, whyWrong: why })), { order: ['<', '>', '='], layout: 'symbols' }),
    hints: [HUNDRED, 'Wandle zuerst alles in Zentimeter um.'],
    steps: [`${fmtLength(a)} = ${cm(a)}`, `${cm(a)} ${sign} ${cm(b)}`],
    praise: 'Du hast zuerst alles in Zentimeter umgewandelt.',
    srText: speak(`Welches Zeichen passt? ${expression}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: which length lies between two others? */
function between(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  for (;;) {
    const [a, b] = rng.sample(LENGTHS, 2).sort((x, y) => x[0] - y[0]);
    const inside = LENGTHS.filter(([v]) => v > a[0] && v < b[0]);
    const outside = LENGTHS.filter(([v]) => v < a[0] || v > b[0]);
    if (inside.length === 0 || outside.length < 3) continue;
    const right = rng.pick(inside);
    const prompt = `Welche Länge liegt zwischen ${a[1]} und ${b[1]}?`;
    return build(SKILL, stufe, {
      key: `dazwischen:${a[0]}:${b[0]}:${right[0]}`,
      ab,
      prompt,
      answer: makeChoice(rng, { label: right[1] }, rng.sample(outside, 3).map(([v, label]) => ({ label, whyWrong: `In Zentimetern sind das ${cm(v)}. Das liegt außerhalb.` }))),
      hints: [HUNDRED, 'Wandle zuerst alles in Zentimeter um.'],
      steps: [`In Zentimetern: ${cm(a[0])} < ${cm(right[0])} < ${cm(b[0])}`, `${right[1]} liegt dazwischen.`],
      praise: 'Du hast alle Längen in Zentimetern verglichen.',
      srText: speak(prompt),
      kmk: KMK,
    });
  }
}

/** Stufe 3, AB III: which sentence cannot hold? */
function impossible(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, ...fine] = rng.sample(THINGS, 4);
  const wrongUnit = t.unit === 'cm' ? 'm' : 'cm';
  const sentence = (x: Thing, text: string) => `${x.text} ist ${text} ${x.word}.`;
  const right = sentence(t, `${t.size}${NBSP}${wrongUnit}`);
  const prompt = 'Welcher Satz kann nicht stimmen?';
  return build(SKILL, stufe, {
    key: `unsinn:${t.name}:${fine.map((o) => o.name).sort().join('-')}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: right }, fine.map((o) => ({ label: sentence(o, sized(o)), whyWrong: `Das kann stimmen. Denk an: ${o.name}.` }))),
    hints: ['Stell dir jedes Ding in echt vor.', THINK_M],
    steps: [`${t.text} ist etwa ${sized(t)} ${t.word}.`, `${t.size}${NBSP}${wrongUnit} kann nicht stimmen.`],
    praise: 'Du hast an die echten Größen gedacht.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, Form[]>> = {
  1: { 1: [chooseUnit, whatInUnit], 2: [matchThing, matchThing, matchThing, referenceSize], 3: [checkUnit, notInUnit] },
  // The whole metres are just 4 facts: seldom, so that they do not repeat in every round.
  2: { 1: [mixedToCm, mixedToCm, mixedToCm, lengthInCm, lengthInCm, lengthInCm, metersToCm, cmToMeters], 2: [mixedToCm, toOneMeter], 3: [cmToMixed, gapInMixed, toTwoMeters] },
  3: { 1: [orderLengths, orderLengths, plausible], 2: [orderLengths, compareLengths], 3: [orderLengths, between, impossible] },
};

export const meterZentimeterSkill: SkillDef = {
  ...SKILL,
  title: 'Meter und Zentimeter',
  description: 'Du weißt, wie lang 1 cm und 1 m sind.',
  stufen: {
    1: 'Zentimeter oder Meter? Du wählst.',
    2: '1 m = 100 cm; 2 m 15 cm umwandeln',
    3: 'Längen ordnen; welche Größe passt?',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
