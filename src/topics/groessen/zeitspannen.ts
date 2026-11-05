/**
 * Wie lange dauert das? The Stufe chooses the content (docs/research.md §6, §2.2), the AB the demand inside it:
 * Stufe 1 whole hours, in the morning. AB 1 1 or 2 hours, AB 2 3 or 4 hours, AB 3 the end and the hours are given: when does it begin?
 * Stufe 2 half and quarter hours inside one hour; 1 h = 60 min. AB 1 a short span, 1 h = 60 min. AB 2 what time is it then, 1 h 15 min. AB 3 a gap up to the full hour.
 * Stufe 3 span across a full hour, up to 60 min, in five-minute steps; backwards. AB 1 close to the full hour, AB 2 from further away, AB 3 backwards.
 * All hours stay 1 to 12, as on the clock of groessen.uhr (the catalogue has no 24-hour count), so that the hands, the text and the answer agree.
 */
import { BOX, fmtDuration, MINUS, NBSP } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, makeChoice, multiBugs, pickPerson, plural, safeHints, speak, targetAb } from '../shared';
import { addMinutes, timeFields, timeText } from './helpers';

const SKILL = { id: 'groessen.zeitspannen', topicId: 'groessen' } as const;
const KMK = ['GM.zeit'];

const WHEN_NOT_HOW_LONG = 'Gefragt ist: Wie lange? Nicht: Wann?';
const LATER = 'Später heißt: Die Uhr geht weiter.';
const EARLIER = 'Der Film beginnt vor dem Ende. Rechne zurück.';
const ROUND_HOUR = 'Eine Stunde hat 60 Minuten, nicht 100.';
/** The same point when 60 is the answer itself (a hint never states the answer). */
const ROUND_HOUR_NO_60 = 'Eine Stunde hat weniger als 100 Minuten. Stell dir die Uhr vor.';

/** What happens, with the durations in minutes that fit it: no Ausflug of 15 minutes, no Training of 4 hours. */
const EVENTS: readonly { name: string; min: number; max: number }[] = [
  { name: 'Die Pause', min: 5, max: 30 },
  { name: 'Das Spiel', min: 10, max: 120 },
  { name: 'Das Training', min: 30, max: 120 },
  { name: 'Das Fest', min: 60, max: 240 },
  { name: 'Das Turnier', min: 60, max: 240 },
  { name: 'Der Ausflug', min: 120, max: 240 },
];
const eventFor = (rng: Rng, minutes: number) => rng.pick(EVENTS.filter((e) => minutes >= e.min && minutes <= e.max)).name;
/** 'Das Fest' inside a sentence: 'das Fest'. */
const inSentence = (event: string) => event.charAt(0).toLowerCase() + event.slice(1);

/** A morning start on Stufe 1 that is not the number of hours: '3 Uhr bis 6 Uhr' would show the 3 in the task. */
const morningOtherThan = (rng: Rng, d: number) => rng.pick([1, 2, 3, 4, 5, 6, 7, 8].filter((h) => h !== d));
/** Start hour of a task with minutes on a clock (Stufe 2 and 3): less than an hour later it is 12:xx at most. */
const faceHour = (rng: Rng) => rng.int(7, 11);
/** AB 1 has 1 or 2 hours, from AB 2 on 3 or 4. */
const wholeHours = (rng: Rng, ab: Ab) => (ab === 1 ? rng.int(1, 2) : rng.int(3, 4));
const hours = (n: number) => `${n}${NBSP}${plural(n, 'Stunde', 'Stunden')}`;

function hoursLater(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const d = wholeHours(rng, ab);
  const start = rng.int(1, 8);
  const end = start + d;
  const person = pickPerson(rng);
  const story = rng.chance(0.4);
  const context = story ? `${person.name} spielt um ${start} Uhr los. ${person.name} spielt ${hours(d)} lang.` : `Es ist ${start} Uhr.`;
  const prompt = story ? `Wann ist ${person.name} fertig?` : `Wie spät ist es ${hours(d)} später?`;
  return build(SKILL, stufe, {
    key: `spaeter:${start}:${d}:${story ? person.name : ''}`,
    ab,
    context,
    prompt,
    visual: { type: 'clock' as const, hours: start, minutes: 0, face: 'quarters' as const },
    answer: { kind: 'number', value: end, before: story ? 'Um' : 'Es ist', after: 'Uhr.', label: 'Stunde' },
    hints: ['Rechne von der ersten Uhrzeit weiter.', `Der kurze Zeiger geht ${hours(d)} weiter.`],
    steps: [`${start} + ${d} = ${end}`, `Es ist dann ${end} Uhr.`],
    bugs: bugList(end, [['richtung-zeit', start - d > 0 ? start - d : null, LATER]]),
    praise: 'Du hast die Stunden richtig gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Whole hours backwards: the end and the hours are given. Inside the morning, so that the clock can show the end. */
function hoursBack(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const d = rng.int(2, 4);
  const start = morningOtherThan(rng, d);
  const end = start + d;
  const event = eventFor(rng, d * 60);
  const context = `${event} endet um ${end} Uhr. ${event} dauert ${hours(d)}.`;
  const prompt = `Wann beginnt ${inSentence(event)}?`;
  return build(SKILL, stufe, {
    key: `stunden-zurueck:${event}:${end}:${d}`,
    ab,
    context,
    prompt,
    visual: { type: 'clock', hours: end, minutes: 0, face: 'quarters' },
    answer: { kind: 'number', value: start, before: 'Um', after: 'Uhr.', label: 'Stunde' },
    hints: ['Rechne von der letzten Uhrzeit zurück.', `Der kurze Zeiger geht ${hours(d)} zurück.`],
    steps: [`${end} ${MINUS} ${d} = ${start}`, `${event} beginnt um ${start} Uhr.`],
    bugs: bugList(start, [['richtung-zeit', end + d <= 12 ? end + d : null, 'Der Beginn liegt vor dem Ende. Rechne zurück.']]),
    praise: 'Du hast vom Ende zurück gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function wholeSpan(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const d = wholeHours(rng, ab);
  const start = morningOtherThan(rng, d);
  const end = start + d;
  const event = eventFor(rng, d * 60);
  const context = `${event} beginnt um ${start} Uhr. ${event} endet um ${end} Uhr.`;
  const prompt = `Wie viele Stunden dauert ${inSentence(event)}?`;
  return build(SKILL, stufe, {
    key: `spanne:${event}:${start}:${end}`,
    ab,
    context,
    prompt,
    visual: { type: 'clock', hours: start, minutes: 0, face: 'quarters' },
    // The unit stands in the question: 'Stunde' after the field would show that the answer is 1.
    answer: { kind: 'number', value: d, label: 'Dauer in Stunden' },
    hints: ['Rechne von der ersten Uhrzeit bis zur zweiten.', `Rechne ${end} ${MINUS} ${start}.`],
    steps: [`${end} ${MINUS} ${start} = ${d}`, `Von ${start} Uhr bis ${end} Uhr ${plural(d, 'ist', 'sind')} es ${hours(d)}.`],
    bugs: bugList(d, [['zeitpunkt-spanne', end, WHEN_NOT_HOW_LONG]]),
    praise: 'Du hast die Dauer gefunden, nicht die Uhrzeit.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

const HALF = 'Eine halbe Stunde hat 30 min.';
const QUARTER = 'Eine Viertelstunde hat 15 min.';

interface Conversion {
  left: string;
  value: number;
  unit: 'min' | 'h';
  wrong?: number;
  hint?: string;
  /** Parts of an hour: their own hints and the calculation, instead of 1 h = 60 min. */
  parts?: { hints: string[]; line: string };
}

/** n parts of an hour of `size` minutes: 3 Viertelstunden, 2 halbe Stunden. */
function partsOfHour(left: string, n: number, size: 15 | 30): Conversion {
  const value = n * size;
  return {
    left,
    value,
    unit: 'min',
    wrong: n * (size === 15 ? 25 : 50),
    hint: value === 60 ? ROUND_HOUR_NO_60 : ROUND_HOUR,
    parts: { hints: [size === 15 ? QUARTER : HALF, `Rechne ${n}-mal ${size} min.`], line: `${n} · ${size}${NBSP}min = ${value}${NBSP}min` },
  };
}

/** 1 h = 60 min, half and quarter hour. */
function convert(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // AB 1 one hour and its parts, AB 2 more than an hour.
  const items: Conversion[] = ab === 1 ? [
    { left: '1 h', value: 60, unit: 'min', wrong: 100, hint: ROUND_HOUR_NO_60 },
    { left: 'eine halbe Stunde', value: 30, unit: 'min', wrong: 50, hint: 'Eine halbe Stunde: Der lange Zeiger geht von oben nach unten.' },
    { left: 'eine Viertelstunde', value: 15, unit: 'min', wrong: 25, hint: 'Der lange Zeiger geht von oben bis zur 3.' },
    { left: '60 min', value: 1, unit: 'h' },
    partsOfHour('2 Viertelstunden', 2, 15),
    partsOfHour('3 Viertelstunden', 3, 15),
    partsOfHour('2 halbe Stunden', 2, 30),
    { left: 'eine halbe Stunde und eine Viertelstunde', value: 45, unit: 'min', wrong: 75, hint: ROUND_HOUR, parts: { hints: [HALF, QUARTER], line: `30${NBSP}min + 15${NBSP}min = 45${NBSP}min` } },
  ] : [
    { left: fmtDuration(90), value: 90, unit: 'min', wrong: 130, hint: ROUND_HOUR },
    { left: fmtDuration(75), value: 75, unit: 'min', wrong: 115, hint: ROUND_HOUR },
    { left: '1 h und eine halbe Stunde', value: 90, unit: 'min', wrong: 150, hint: ROUND_HOUR, parts: { hints: ['1 h hat 60 min.', HALF], line: `60${NBSP}min + 30${NBSP}min = 90${NBSP}min` } },
    { left: '1 h und eine Viertelstunde', value: 75, unit: 'min', wrong: 125, hint: ROUND_HOUR, parts: { hints: ['1 h hat 60 min.', QUARTER], line: `60${NBSP}min + 15${NBSP}min = 75${NBSP}min` } },
    partsOfHour('3 halbe Stunden', 3, 30),
    partsOfHour('5 Viertelstunden', 5, 15),
    partsOfHour('6 Viertelstunden', 6, 15),
  ];
  const item = rng.pick(items);
  // Only a number and its unit stay together: 'eine Viertelstunde' must wrap on a phone.
  const left = item.left.replace(/(\d) /g, `$1${NBSP}`).replace(/h (\d)/, `h${NBSP}$1`);
  const expression = `${left} = ${BOX} ${item.unit}`;
  return build(SKILL, stufe, {
    key: `umrechnen:${item.left}`,
    ab,
    prompt: 'Wandle um.',
    expression,
    answer: { kind: 'number', value: item.value, unit: item.unit, label: item.unit === 'min' ? 'Dauer in Minuten' : 'Dauer in Stunden' },
    // Each sentence with '1 h' states the answer of 60 min = □ h.
    hints: item.parts?.hints ?? (item.unit === 'h'
      ? ['Der lange Zeiger geht in 60 min einmal ganz herum.', 'Der kurze Zeiger geht dann zur nächsten Zahl.']
      : safeHints(['1 h hat 60 min.', 'Der lange Zeiger geht in 1 h einmal ganz herum.'], item.value, 'Der lange Zeiger geht in 1 h einmal ganz herum.')),
    steps: item.parts ? [item.parts.line] : ['1 h = 60 min', `${left} = ${item.value}${NBSP}${item.unit}`],
    bugs: item.wrong ? bugList(item.value, [['stunde-100', item.wrong, item.hint!]]) : [],
    praise: item.parts ? 'Du hast die Teile der Stunde gerechnet.' : 'Du hast an die 60 Minuten gedacht.',
    srText: speak(`Wandle um. ${expression}`),
    kmk: [...KMK, 'GM.einheiten'],
  });
}

/** What fills one hour up: a gap in the rule, not the rule itself. */
function hourGap(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const items: { expression: string; value: number; unit: string; line: string }[] = [
    { expression: `45${NBSP}min + ${BOX} min = 1${NBSP}h`, value: 15, unit: 'min', line: `60${NBSP}min ${MINUS} 45${NBSP}min = 15${NBSP}min` },
    { expression: `15${NBSP}min + ${BOX} min = 1${NBSP}h`, value: 45, unit: 'min', line: `60${NBSP}min ${MINUS} 15${NBSP}min = 45${NBSP}min` },
    { expression: `eine halbe Stunde + ${BOX} min = 1${NBSP}h`, value: 30, unit: 'min', line: `60${NBSP}min ${MINUS} 30${NBSP}min = 30${NBSP}min` },
    { expression: `eine Viertelstunde + ${BOX} min = 1${NBSP}h`, value: 45, unit: 'min', line: `60${NBSP}min ${MINUS} 15${NBSP}min = 45${NBSP}min` },
    { expression: `1${NBSP}h = ${BOX} Viertelstunden`, value: 4, unit: 'Viertelstunden', line: `15${NBSP}min + 15${NBSP}min + 15${NBSP}min + 15${NBSP}min = 60${NBSP}min` },
    { expression: `1${NBSP}h = ${BOX} halbe Stunden`, value: 2, unit: 'halbe Stunden', line: `30${NBSP}min + 30${NBSP}min = 60${NBSP}min` },
  ];
  const item = rng.pick(items);
  return build(SKILL, stufe, {
    key: `stunde-luecke:${item.expression}`,
    ab,
    prompt: 'Was fehlt im Kästchen?',
    expression: item.expression,
    answer: { kind: 'number', value: item.value, unit: item.unit, label: item.unit === 'min' ? 'Dauer in Minuten' : 'Anzahl' },
    hints: ['1 h hat 60 min.', 'Der lange Zeiger geht in 1 h einmal ganz herum.'],
    steps: ['1 h = 60 min', item.line, `Im Kästchen steht: ${item.value}.`],
    bugs: item.unit === 'min' ? bugList(item.value, [['stunde-100', 100 - (60 - item.value), ROUND_HOUR]]) : [],
    praise: 'Du hast die Stunde richtig aufgeteilt.',
    srText: speak(`Was fehlt im Kästchen? ${item.expression}`),
    kmk: [...KMK, 'GM.einheiten', 'PK.problemloesen'],
  });
}

/** How long until the full hour? On the face, from a quarter or half hour. */
function untilFullHour(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = faceHour(rng);
  // Not 8:30 Uhr: the 30 of the answer would stand in the task.
  const m = rng.pick([15, 45]);
  const d = 60 - m;
  const context = `Es ist ${timeText(h, m)}.`;
  const prompt = `Wie viele Minuten sind es bis ${h + 1} Uhr?`;
  return build(SKILL, stufe, {
    key: `bis-voll:${h}:${m}`,
    ab,
    context,
    prompt,
    visual: { type: 'clock', hours: h, minutes: m, face: 'quarters' },
    answer: { kind: 'number', value: d, unit: 'min', label: 'Dauer in Minuten' },
    hints: ['Wie weit geht der lange Zeiger noch bis ganz oben?', 'Von Zahl zu Zahl sind es 5 Minuten.'],
    steps: [`60 ${MINUS} ${m} = ${d}`, `Es sind ${d}${NBSP}min bis ${h + 1} Uhr.`],
    bugs: bugList(d, [['zeitpunkt-spanne', m, 'Das ist die Minute auf der Uhr. Wie viele fehlen noch?'], ['stunde-100', 100 - m, ROUND_HOUR]]),
    praise: 'Du hast bis zur vollen Stunde gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

const DURATIONS: readonly { text: string; minutes: number }[] = [
  { text: 'eine Viertelstunde', minutes: 15 },
  { text: 'eine halbe Stunde', minutes: 30 },
  { text: `1${NBSP}h`, minutes: 60 },
  { text: `15${NBSP}min`, minutes: 15 },
  { text: `30${NBSP}min`, minutes: 30 },
  { text: `45${NBSP}min`, minutes: 45 },
  { text: `60${NBSP}min`, minutes: 60 },
];

/** Which of two durations is longer? A reason to think both in minutes: the larger number can be the shorter time (1 h and 45 min). */
function longerOf(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = rng.sample(DURATIONS, 2);
  const same = 'Beide gleich lang';
  const prompt = 'Was dauert länger?';
  const right = a.minutes === b.minutes ? same : a.minutes > b.minutes ? a.text : b.text;
  const think = 'Denk beides in Minuten. Vergleiche dann.';
  const labels = [a.text, b.text, same];
  return build(SKILL, stufe, {
    key: `dauert-laenger:${a.text}:${b.text}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: right }, labels.filter((l) => l !== right).map((l) => ({ label: l, whyWrong: think })), { order: labels }),
    hints: [think, '1 h hat 60 min.'],
    steps: [`${a.text}: ${a.minutes}${NBSP}min`, `${b.text}: ${b.minutes}${NBSP}min`, right === same ? 'Beide dauern gleich lang.' : `Länger dauert: ${right}.`],
    praise: 'Du hast beides in Minuten verglichen.',
    srText: speak(`${prompt} ${a.text} oder ${b.text}?`),
    kmk: [...KMK, 'GM.einheiten', 'PK.argumentieren'],
  });
}

/**
 * A span of a half or quarter hour, up to the full hour at most. It never starts at the full hour: from 8 Uhr to 8:15 Uhr the 15 of the
 * answer would stand in the task.
 */
function shortSpan(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = faceHour(rng);
  const [from, to] = rng.pick<[number, number]>([[15, 45], [30, 45], [45, 60], [15, 60]]);
  const d = to - from;
  const event = eventFor(rng, d);
  const end = to === 60 ? timeText(h + 1, 0) : timeText(h, to);
  const context = `${event} beginnt um ${timeText(h, from)}. ${event} endet um ${end}.`;
  const prompt = `Wie viele Minuten dauert ${inSentence(event)}?`;
  return build(SKILL, stufe, {
    key: `kurz:${event}:${h}:${from}:${to}`,
    ab,
    context,
    prompt,
    visual: { type: 'clock', hours: h, minutes: from, face: 'quarters' },
    answer: { kind: 'number', value: d, unit: 'min', label: 'Dauer in Minuten' },
    hints: ['Wie weit geht der lange Zeiger?', 'Von Zahl zu Zahl sind es 5 Minuten.'],
    steps: [`${to} ${MINUS} ${from} = ${d}`, `Es dauert ${d}${NBSP}min.`],
    bugs: bugList(d, [['zeitpunkt-spanne', to, WHEN_NOT_HOW_LONG]]),
    praise: 'Du hast den Weg vom langen Zeiger gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** In a half or quarter hour: what time is it then? */
function laterQuarter(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = faceHour(rng);
  // Inside the hour, the end can be the full hour: over it is the content of Stufe 3.
  const [m, d] = rng.pick<[number, number]>([[0, 15], [0, 30], [15, 15], [15, 30], [30, 15], [30, 30], [45, 15]]);
  const half = d === 30;
  const [eh, em] = addMinutes(h, m, d);
  const fields: MultiField[] = timeFields(eh, em);
  const context = `Es ist ${timeText(h, m)}.`;
  const prompt = `Wie spät ist es in einer ${half ? 'halben Stunde' : 'Viertelstunde'}?`;
  const crosses = eh !== h;
  return build(SKILL, stufe, {
    key: `in-viertel:${h}:${m}:${d}`,
    ab,
    context,
    prompt,
    visual: { type: 'clock', hours: h, minutes: m, face: 'quarters' },
    answer: { kind: 'multi', fields },
    hints: [half ? 'Der lange Zeiger geht einmal halb herum.' : 'Der lange Zeiger geht ein Viertel herum.', crosses ? 'Nach 60 Minuten beginnt die nächste Stunde.' : 'Rechne die Minuten dazu.'],
    steps: [`${timeText(h, m)} + ${d}${NBSP}min`, `Es ist dann ${timeText(eh, em)}.`],
    bugs: multiBugs(
      [
        crosses && { id: 'stunde-100', match: { h, min: m + d }, hint: 'Eine Stunde hat nur 60 Minuten. Dann beginnt die nächste Stunde.' },
        m >= d && { id: 'richtung-zeit', match: { h, min: m - d }, hint: LATER },
      ],
      fields,
    ),
    praise: crosses ? 'Du hast an die volle Stunde gedacht.' : 'Du hast die Minuten richtig gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Duration of more than an hour: 1 h 30 min. */
function longerSpan(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // Never from a full hour: from 9 Uhr to 10:45 Uhr the 45 of the answer would stand in the task.
  const [m, dh, dm] = rng.pick<[number, number, number]>([[15, 1, 30], [15, 2, 30], [30, 1, 15], [30, 2, 15], [45, 1, 15], [45, 2, 15], [15, 1, 45]]);
  // It ends at 12:xx at the latest.
  const h = rng.int(1, 12 - dh - Math.floor((m + dm) / 60));
  const event = eventFor(rng, dh * 60 + dm);
  const [eh, em] = addMinutes(h, m, dh * 60 + dm);
  const context = `${event} beginnt um ${timeText(h, m)}. ${event} endet um ${timeText(eh, em)}.`;
  const prompt = `Wie lange dauert ${inSentence(event)}?`;
  const fields: MultiField[] = [
    { id: 'h', value: dh, after: 'h', label: 'Stunden' },
    { id: 'min', value: dm, after: 'min', label: 'Minuten' },
  ];
  return build(SKILL, stufe, {
    key: `laenger:${event}:${h}:${m}:${dh}:${dm}`,
    ab,
    context,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Rechne zuerst die vollen Stunden.', 'Rechne dann die Minuten dazu.'],
    steps: [`${timeText(h, m)} + ${dh}${NBSP}h = ${timeText(h + dh, m)}`, `${timeText(h + dh, m)} + ${dm}${NBSP}min = ${timeText(eh, em)}`, `Es dauert ${dh}${NBSP}h ${dm}${NBSP}min.`],
    bugs: multiBugs([{ id: 'zeitpunkt-spanne', match: { h: eh, min: em }, hint: WHEN_NOT_HOW_LONG }], fields),
    praise: 'Du hast erst die Stunden gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Over a full hour: hh:50 to hh+1:05. */
function acrossHour(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 11);
  const m = rng.int(ab === 1 ? 9 : 7, 11) * 5;
  const toFull = 60 - m;
  // Not 8:35 Uhr to 9:10 Uhr, and not 9:55 Uhr to 10:05 Uhr: the number of the answer would stand in the task.
  const afters = Array.from({ length: ab === 1 ? 3 : m / 5 }, (_, i) => (i + 1) * 5).filter((a) => ![m, h, h + 1].includes(toFull + a));
  const after = rng.pick(afters);
  const d = toFull + after;
  const event = eventFor(rng, d);
  const context = `${event} beginnt um ${timeText(h, m)}. ${event} endet um ${timeText(h + 1, after)}.`;
  const prompt = `Wie viele Minuten dauert ${inSentence(event)}?`;
  return build(SKILL, stufe, {
    key: `ueber-stunde:${event}:${h}:${m}:${after}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: d, unit: 'min', label: 'Dauer in Minuten' },
    hints: ['Rechne zuerst bis zur vollen Stunde.', 'Rechne dann weiter bis zum Ende.'],
    steps: [
      `${timeText(h, m)} + ${toFull}${NBSP}min = ${timeText(h + 1, 0)}`,
      `${timeText(h + 1, 0)} + ${after}${NBSP}min = ${timeText(h + 1, after)}`,
      `${toFull}${NBSP}min + ${after}${NBSP}min = ${d}${NBSP}min`,
    ],
    bugs: bugList(d, [
      ['stunde-100', 100 - m + after, d === 60 ? ROUND_HOUR_NO_60 : ROUND_HOUR],
      ['zeitpunkt-spanne', after, WHEN_NOT_HOW_LONG],
    ]),
    praise: 'Du hast über die volle Stunde gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Backwards: when did it begin? */
function backwards(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(2, 12);
  const em = rng.int(1, 5) * 5;
  // Not 9:20 Uhr and 40 min: the start at 8:40 Uhr would show the 40 in the task.
  const d = rng.pick(Array.from({ length: 12 - em / 5 }, (_, i) => (em / 5 + 1 + i) * 5).filter((x) => 60 + em - x !== x));
  const [sh, sm] = addMinutes(h, em, -d);
  const fields: MultiField[] = timeFields(sh, sm);
  const context = `Der Film endet um ${timeText(h, em)}. Der Film dauert ${d}${NBSP}min.`;
  const prompt = 'Wann beginnt der Film?';
  return build(SKILL, stufe, {
    key: `rueckwaerts:${h}:${em}:${d}`,
    ab,
    context,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Rechne zuerst zurück bis zur vollen Stunde.', 'Rechne dann noch die übrigen Minuten zurück.'],
    steps: [
      `${timeText(h, em)} ${MINUS} ${em}${NBSP}min = ${timeText(h, 0)}`,
      `${timeText(h, 0)} ${MINUS} ${d - em}${NBSP}min = ${timeText(sh, sm)}`,
      `Der Film beginnt um ${timeText(sh, sm)}.`,
    ],
    bugs: multiBugs(
      [
        { id: 'stunde-100', match: { h: h - 1, min: 100 + em - d }, hint: ROUND_HOUR },
        em + d < 60 && { id: 'richtung-zeit', match: { h, min: em + d }, hint: EARLIER },
      ],
      fields,
    ),
    praise: 'Du hast über die volle Stunde zurück gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** In 35 minutes: what time is it then? */
function laterAcross(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = faceHour(rng);
  const m = rng.int(ab === 1 ? 9 : 7, 11) * 5;
  const toFull = 60 - m;
  // Below 60: 9:50 Uhr in 60 Minuten keeps the 50 of the answer in the task.
  const d = toFull + rng.int(1, ab === 1 ? 3 : (55 - toFull) / 5) * 5;
  const [eh, em] = addMinutes(h, m, d);
  const fields: MultiField[] = timeFields(eh, em);
  const context = `Es ist ${timeText(h, m)}.`;
  const prompt = `Wie spät ist es in ${d} Minuten?`;
  return build(SKILL, stufe, {
    key: `in-minuten:${h}:${m}:${d}`,
    ab,
    context,
    prompt,
    visual: { type: 'clock', hours: h, minutes: m, face: 'five' },
    answer: { kind: 'multi', fields },
    hints: ['Rechne zuerst bis zur vollen Stunde.', 'Rechne dann die übrigen Minuten dazu.'],
    steps: [`${timeText(h, m)} + ${toFull}${NBSP}min = ${timeText(eh, 0)}`, `${timeText(eh, 0)} + ${em}${NBSP}min = ${timeText(eh, em)}`, `Es ist dann ${timeText(eh, em)}.`],
    bugs: multiBugs(
      [
        { id: 'stunde-100', match: { h, min: m + d }, hint: 'Eine Stunde hat nur 60 Minuten. Dann beginnt die nächste Stunde.' },
        m >= d && { id: 'richtung-zeit', match: { h, min: m - d }, hint: LATER },
      ],
      fields,
    ),
    praise: 'Du hast über die volle Stunde gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [hoursLater, wholeSpan], 2: [hoursLater, wholeSpan], 3: [hoursBack] },
  2: { 1: [convert, shortSpan, shortSpan, shortSpan], 2: [convert, laterQuarter, laterQuarter, longerSpan, longerSpan], 3: [hourGap, untilFullHour, longerOf] },
  3: { 1: [acrossHour, laterAcross], 2: [acrossHour, laterAcross], 3: [backwards, backwards, laterAcross] },
};

export const zeitspannenSkill: SkillDef = {
  ...SKILL,
  title: 'Wie lange dauert das?',
  description: 'Du rechnest aus, wie viel Zeit vergeht.',
  stufen: {
    1: 'Volle Stunden: später und früher',
    2: 'Halbe und Viertelstunden; 1 h = 60 min',
    3: 'Über die volle Stunde; auch rückwärts',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
