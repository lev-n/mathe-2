/**
 * Uhrzeiten lesen. The Stufe chooses the content (docs/research.md §6, §2.2, F16), the AB the demand inside it:
 * Stufe 1, full and half hours, analog beside digital: AB I read a full hour, name a time; AB II read a half hour, pick a clock; AB III
 * write words as digits, check a sentence, where is the long hand.
 * Stufe 2, Viertel nach, Viertel vor, analog only: AB I read and name Viertel nach; AB II read and name Viertel vor, pick a clock; AB III
 * write words as digits, check a sentence, where is the long hand.
 * Stufe 3, five-minute steps, never the half or the quarters of Stufe 1 and 2: AB I read fives with an everyday word, pick a clock for a digital
 * time; AB II read any step, also 25 and 35, say a digital time in words; AB III pick a clock for words, the number of the long hand, the minutes
 * of a number, check a sentence.
 * Hours 1–12: children read the clock face here, the 24-hour count comes with the time spans.
 */
import type { Ab, Bug, Exercise, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, multiBugs, pickPerson, speak, targetAb } from '../shared';
import { describeClock, h12, hourWord, pictureChoice, spoken, timeFields, timeText } from './helpers';

const SKILL = { id: 'groessen.uhr', topicId: 'groessen' } as const;
const KMK = ['GM.zeit'];

const HANDS = 'Der kurze Zeiger zeigt die Stunde, der lange die Minuten.';
const STEP_OF_FIVE = 'Von Zahl zu Zahl sind es 5 Minuten.';
const SHORT_HAND = 'Der kurze Zeiger ist noch nicht bei der nächsten Zahl.';

/** Feedback on a picked clock: what this clock shows, not what the clock of the task would show. */
const HERE_TOP = 'Der lange Zeiger steht hier oben. Das ist eine volle Stunde.';
const HERE_BOTTOM = 'Der lange Zeiger steht hier unten. Das ist keine volle Stunde.';
const HERE_RIGHT = 'Der lange Zeiger steht hier rechts. Das heißt Viertel nach.';
const HERE_LEFT = 'Der lange Zeiger steht hier links. Das heißt Viertel vor.';
const HERE_OTHER_HOUR = 'Der lange Zeiger passt. Der kurze Zeiger zeigt eine andere Stunde.';
const hereMinutes = (m: number) => `Der lange Zeiger zeigt hier ${m} Minuten. Lies die Frage noch einmal.`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function halfHint(h: number): string {
  return `Halb ${hourWord(h + 1)} heißt: noch eine halbe Stunde bis ${hourWord(h + 1)}.`;
}

/** 'Viertel nach drei ist nach drei Uhr. Viertel vor drei ist davor.' */
function quarterHint(h: number, m: number): string {
  const hour = m === 15 ? h : h + 1;
  const w = hourWord(hour);
  return `Viertel nach ${w} ist nach ${spoken(hour, 0)}. Viertel vor ${w} ist davor.`;
}

const NACH_VOR = 'Bis 30 Minuten sagst du nach. Danach sagst du vor.';

/** Feedback on a time in words without a clock: what this option means, and the rule only if the option has the other word. */
function optionMeans(t: { h: number; m: number }, m: number): string {
  const means = `${cap(spoken(t.h, t.m))} ist ${timeText(t.h, t.m)}.`;
  if (t.m === 30 || t.m < 30 === m < 30) return means;
  return `${means} ${m < 30 ? 'Bis 30 Minuten sagst du nach.' : 'Nach 30 Minuten sagst du vor.'}`;
}

/** The long hand in a worked step. */
const minuteStep = (m: number) => (m === 0 ? 'Der lange Zeiger steht oben auf der 12.' : `Der lange Zeiger zeigt ${m} Minuten.`);

const faceOf = (level: Ab): 'quarters' | 'five' => (level === 3 ? 'five' : 'quarters');

function praiseFor(m: number): string {
  if (m === 0) return 'Du hast den langen Zeiger oben gesehen.';
  if (m === 30) return 'Du hast den langen Zeiger unten gesehen.';
  if (m === 15 || m === 45) return 'Du hast vor und nach genau beachtet.';
  return 'Du hast beim langen Zeiger in Fünfern gerechnet.';
}

/** Reading the clock has no 'vor' and no 'nach': the child types the digits. */
const readPraise = (m: number) => (m === 15 || m === 45 ? 'Du hast den langen Zeiger genau gelesen.' : praiseFor(m));

function highlightOf(m: number): Partial<Extract<Visual, { type: 'clock' }>> {
  if (m === 15) return { highlight: 'quarter' };
  if (m === 30) return { highlight: 'half' };
  if (m === 45) return { highlight: 'three-quarters' };
  return {};
}

function readSteps(h: number, m: number, level: Ab): (string | { text: string; visual: Visual })[] {
  const where = m === 0 ? `Der kurze Zeiger zeigt auf die ${h}.` : `Der kurze Zeiger steht nach der ${h}.`;
  const minute = minuteStep(m);
  const form = m === 0 || m === 15 || m === 30 || m === 45 ? `, also ${spoken(h, m)}` : '';
  return [where, { text: minute, visual: { type: 'clock', hours: h, minutes: m, face: faceOf(level), ...highlightOf(m) } }, `Es ist ${timeText(h, m)}${form}.`];
}

/** Typical misreadings of a clock showing h:m. */
function readBugs(h: number, m: number): Bug[] {
  const next = h12(h + 1);
  const prev = h12(h - 1);
  const fields = timeFields(h, m);
  return multiBugs(
    [
      m === 30 && { id: 'halb-uhr', match: { h: next, min: 30 }, hint: halfHint(h) },
      m === 15 && { id: 'viertel-richtung', match: { h: prev, min: 45 }, hint: quarterHint(h, m) },
      m === 45 && { id: 'viertel-richtung', match: { h: next, min: 15 }, hint: quarterHint(h, m) },
      { id: 'zeiger-getauscht', match: { h: m === 0 ? 12 : m / 5, min: (h % 12) * 5 }, hint: HANDS },
      m > 0 && { id: 'minuten-zahl', match: { h, min: m / 5 }, hint: STEP_OF_FIVE },
      m > 30 && { id: 'stunde-zu-frueh', match: { h: next, min: m }, hint: SHORT_HAND },
    ],
    fields,
  );
}

function readClock(rng: Rng, stufe: Stufe, ab: Ab, minutes: readonly number[]): Exercise {
  const level = stufe;
  const h = rng.int(1, 12);
  const m = rng.pick(minutes);
  const fields: MultiField[] = timeFields(h, m);
  const prompt = 'Wie spät ist es?';
  return build(SKILL, stufe, {
    key: `lesen:${h}:${m}`,
    ab,
    prompt,
    visual: { type: 'clock', hours: h, minutes: m, face: faceOf(level) },
    answer: { kind: 'multi', fields },
    hints: ['Schau zuerst auf den kurzen Zeiger.', level === 1 ? 'Oben heißt volle Stunde. Unten heißt halbe Stunde.' : STEP_OF_FIVE],
    steps: readSteps(h, m, level),
    bugs: readBugs(h, m),
    praise: readPraise(m),
    srText: speak(`${prompt} ${describeClock(h, m)}`),
    kmk: KMK,
  });
}

/** Wrong times for a word or a picture task. `why` speaks about the clock of the task (words), `onClock` about the wrong clock itself (pictures). */
function wrongTimes(h: number, m: number, level: Ab, rng: Rng): { h: number; m: number; why: string; onClock: string }[] {
  const next = h12(h + 1);
  const prev = h12(h - 1);
  if (level === 1) {
    const half = halfHint(h);
    const notFull = 'Der lange Zeiger steht unten. Das ist keine volle Stunde.';
    const full = 'Der lange Zeiger steht oben. Das ist eine volle Stunde.';
    return m === 30
      ? [{ h: next, m: 30, why: half, onClock: half }, { h, m: 0, why: notFull, onClock: HERE_TOP }, { h: next, m: 0, why: notFull, onClock: HERE_TOP }]
      : [{ h, m: 30, why: full, onClock: HERE_BOTTOM }, { h: prev, m: 30, why: full, onClock: HERE_BOTTOM }, { h: next, m: 0, why: 'Der kurze Zeiger zeigt die Stunde. Schau genau hin.', onClock: HERE_OTHER_HOUR }];
  }
  if (level === 2) {
    const quarter = quarterHint(h, m);
    return m === 15
      ? [{ h: prev, m: 45, why: quarter, onClock: quarter }, { h, m: 45, why: 'Der lange Zeiger steht rechts. Das heißt Viertel nach.', onClock: HERE_LEFT }, { h: next, m: 15, why: SHORT_HAND, onClock: HERE_OTHER_HOUR }]
      : [{ h: next, m: 15, why: quarter, onClock: quarter }, { h, m: 15, why: 'Der lange Zeiger steht links. Das heißt Viertel vor.', onClock: HERE_RIGHT }, { h: next, m: 45, why: SHORT_HAND, onClock: HERE_OTHER_HOUR }];
  }
  const swapH = m / 5;
  const swapM = (h % 12) * 5;
  const out = [
    { h: swapH, m: swapM, why: HANDS, onClock: HANDS },
    { h: next, m, why: SHORT_HAND, onClock: HERE_OTHER_HOUR },
    { h, m: 60 - m, why: 'Schau genau auf den langen Zeiger.', onClock: hereMinutes(60 - m) },
    { h, m: m + (m < 55 ? 5 : -5), why: STEP_OF_FIVE, onClock: hereMinutes(m + (m < 55 ? 5 : -5)) },
    { h, m: m > 5 ? m - 5 : m + 10, why: STEP_OF_FIVE, onClock: hereMinutes(m > 5 ? m - 5 : m + 10) },
  ];
  const seen = new Set([`${h}:${m}`]);
  return rng.shuffle(out).filter((t) => {
    const key = `${t.h}:${t.m}`;
    if (seen.has(key) || t.m === 0) return false;
    seen.add(key);
    return true;
  });
}

/** Minutes that have an everyday word (Klasse 2 does not use 'fünf vor halb'). */
const WORD_MINUTES = [5, 10, 15, 20, 40, 45, 50, 55];

/** Clock → the words for it. */
function nameTime(rng: Rng, stufe: Stufe, ab: Ab, minutes: readonly number[]): Exercise {
  const level = stufe;
  const h = rng.int(1, 12);
  const m = rng.pick(minutes);
  const digital = level === 1;
  const prompt = level === 3 ? `Wie sagst du ${timeText(h, m)}?` : 'Wie heißt diese Uhrzeit?';
  const right = spoken(h, m);
  const wrongs = wrongTimes(h, m, level, rng)
    .filter((t) => WORD_MINUTES.includes(t.m) || t.m === 0 || t.m === 30)
    .map((t) => ({ label: cap(spoken(t.h, t.m)), whyWrong: level === 3 ? optionMeans(t, m) : t.why }));
  return build(SKILL, stufe, {
    key: `name:${h}:${m}`,
    ab,
    prompt,
    ...(level === 3 ? {} : { visual: { type: 'clock' as const, hours: h, minutes: m, showDigital: digital, face: faceOf(level) } }),
    answer: makeChoice(rng, { label: cap(right) }, wrongs),
    hints: level === 3 ? [NACH_VOR, 'Nach 30 Minuten rechnest du bis zur vollen Stunde.'] : ['Schau zuerst auf den langen Zeiger.', 'Schau dann auf den kurzen Zeiger.'],
    steps: [level === 3 ? (m < 30 ? `Es sind ${m} Minuten nach ${hourWord(h)}.` : `Bis ${hourWord(h + 1)} fehlen ${60 - m} Minuten.`) : minuteStep(m), `Das heißt: ${right}.`],
    // Stufe 3 shows no clock here: the child did nothing with a hand.
    praise: level === 3 ? 'Du hast vor und nach genau beachtet.' : praiseFor(m),
    srText: speak(level === 3 ? prompt : `${prompt} ${describeClock(h, m)}${digital ? ` Die Digitalanzeige zeigt ${timeText(h, m)}.` : ''}`),
    kmk: KMK,
  });
}

/** A time → pick the clock. Stufe 3: a digital time on AB I, words on AB III. */
function pickClock(rng: Rng, stufe: Stufe, ab: Ab, minutes: readonly number[]): Exercise {
  const level = stufe;
  const h = rng.int(1, 12);
  const m = rng.pick(minutes);
  const inWords = level < 3 || ab === 3;
  const text = inWords ? spoken(h, m) : timeText(h, m);
  const prompt = `Welche Uhr zeigt ${text}?`;
  const clock = (hours: number, minutes: number): Visual => ({ type: 'clock', hours, minutes, face: faceOf(level), ...(level === 1 ? { showDigital: true } : {}) });
  const wrongs = wrongTimes(h, m, level, rng).slice(0, 3).map((t) => ({ visual: clock(t.h, t.m), whyWrong: t.onClock }));
  const { answer, rightLabel } = pictureChoice(rng, clock(h, m), wrongs);
  return build(SKILL, stufe, {
    key: `waehle:${h}:${m}`,
    ab,
    prompt,
    answer,
    hints: ['Schau zuerst auf den langen Zeiger.', 'Der kurze Zeiger zeigt die Stunde.'],
    steps: [...(inWords ? [`${cap(text)} ist ${timeText(h, m)}.`] : []), minuteStep(m), `Uhr ${rightLabel} zeigt das.`],
    praise: praiseFor(m),
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** AB III, the other way round: from the words to the digits. */
function writeTime(rng: Rng, stufe: Stufe, ab: Ab, minutes: readonly number[]): Exercise {
  const h = rng.int(1, 12);
  const m = rng.pick(minutes);
  const said = spoken(h, m);
  const fields: MultiField[] = timeFields(h, m);
  const prompt = `Wie schreibst du ${said} mit Zahlen?`;
  return build(SKILL, stufe, {
    key: `schreiben:${h}:${m}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [m === 30 ? halfHint(h) : 'Stell dir die Uhr vor: Wo steht der lange Zeiger?', 'Schreibe zuerst die Stunde, dann die Minuten.'],
    steps: [`${cap(said)} ist ${timeText(h, m)}.`],
    bugs: readBugs(h, m),
    praise: 'Du hast die Uhrzeit aus den Worten erkannt.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

const HAND_PLACE: Record<number, string> = { 0: 'oben', 15: 'rechts', 30: 'unten', 45: 'links' };
const PLACE_MEANS: Record<string, string> = {
  oben: 'Oben heißt volle Stunde.',
  unten: 'Unten heißt halbe Stunde.',
  rechts: 'Rechts heißt Viertel nach.',
  links: 'Links heißt Viertel vor.',
};

/** AB III on Stufe 1 and 2: from the words to the place of the long hand. */
function wherePointer(rng: Rng, stufe: Stufe, ab: Ab, minutes: readonly number[]): Exercise {
  const h = rng.int(1, 12);
  const m = rng.pick(minutes);
  const said = spoken(h, m);
  const right = HAND_PLACE[m];
  const context = `Es ist ${said}.`;
  const prompt = 'Wo steht der lange Zeiger?';
  const places = stufe === 1 ? ['oben', 'unten'] : ['oben', 'rechts', 'unten', 'links'];
  return build(SKILL, stufe, {
    key: `zeiger:${h}:${m}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, places.filter((p) => p !== right).map((p) => ({ label: p, whyWrong: PLACE_MEANS[p] })), { order: places }),
    hints: ['Stell dir die Uhr vor.', 'Der lange Zeiger zeigt die Minuten.'],
    steps: [`${cap(said)} ist ${timeText(h, m)}.`, { text: `Der lange Zeiger steht ${right}.`, visual: { type: 'clock', hours: h, minutes: m, face: 'quarters', ...highlightOf(m) } }],
    praise: 'Du hast dir den langen Zeiger vorgestellt.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** AB III: a sentence about a clock. On Stufe 3 the sentence has a digital time, below it has words. */
function checkClaim(rng: Rng, stufe: Stufe, ab: Ab, minutes: readonly number[]): Exercise {
  const level = stufe;
  const h = rng.int(1, 12);
  const m = rng.pick(minutes);
  const { name } = pickPerson(rng);
  const wrong = wrongTimes(h, m, level, rng).filter((t) => (level === 3 ? t.m % 5 === 0 : true));
  const holds = rng.chance(0.5) || wrong.length === 0;
  const other = holds ? null : rng.pick(wrong);
  const word = (hh: number, mm: number) => (level === 3 ? timeText(hh, mm) : spoken(hh, mm));
  const said = other ? word(other.h, other.m) : word(h, m);
  const context = `${name} sagt: Es ist ${said}.`;
  const prompt = 'Stimmt das?';
  const digital = level === 1;
  const right = word(h, m);
  return build(SKILL, stufe, {
    key: `stimmt:${h}:${m}:${other ? `${other.h}:${other.m}` : 'ja'}`,
    ab,
    context,
    prompt,
    visual: { type: 'clock', hours: h, minutes: m, showDigital: digital, face: faceOf(level) },
    answer: makeChoice(rng, { label: holds ? 'Stimmt' : 'Stimmt nicht' }, [{ label: holds ? 'Stimmt nicht' : 'Stimmt', whyWrong: other ? other.why : 'Schau auf beide Zeiger: Beide passen dazu.' }], { order: ['Stimmt', 'Stimmt nicht'] }),
    hints: ['Schau zuerst auf den langen Zeiger.', 'Schau dann auf den kurzen Zeiger.'],
    steps: [minuteStep(m), `Die Uhr zeigt ${right}.`, holds ? 'Der Satz stimmt.' : 'Der Satz stimmt nicht.'],
    praise: 'Du hast den Satz an der Uhr geprüft.',
    srText: speak(`${describeClock(h, m)}${digital ? ` Die Digitalanzeige zeigt ${timeText(h, m)}.` : ''} ${context} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB III, the other way round: from the time to the number under the long hand. */
function handNumber(rng: Rng, stufe: Stufe, ab: Ab, minutes: readonly number[]): Exercise {
  const h = rng.int(1, 12);
  const m = rng.pick(minutes);
  const value = m / 5;
  const context = `Es ist ${timeText(h, m)}.`;
  const prompt = 'Auf welche Zahl zeigt der lange Zeiger?';
  return build(SKILL, stufe, {
    key: `zahl:${h}:${m}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, label: 'Zahl auf der Uhr' },
    hints: [STEP_OF_FIVE, 'Geh in Fünfern von der 12 aus weiter.'],
    steps: [STEP_OF_FIVE, `${value} · 5 = ${m}`, `Der lange Zeiger zeigt auf die ${value}.`],
    bugs: bugList(value, [['minuten-zahl', m, 'Das sind die Minuten. Gefragt ist die Zahl auf der Uhr.']]),
    praise: 'Du hast von den Minuten zur Zahl gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: from the number under the long hand to the minutes. */
function handMinutes(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // not the 1: the hint on five minutes from number to number would state its answer
  const n = rng.int(2, 11);
  const value = n * 5;
  const context = `Der lange Zeiger zeigt auf die ${n}.`;
  const prompt = 'Wie viele Minuten sind das?';
  return build(SKILL, stufe, {
    key: `minuten:${n}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: 'Minuten', label: 'Anzahl der Minuten' },
    hints: [STEP_OF_FIVE, 'Geh in Fünfern von der 12 aus weiter.'],
    steps: [STEP_OF_FIVE, `${n} · 5 = ${value}`, `Das sind ${value} Minuten.`],
    bugs: bugList(value, [['minuten-zahl', n, STEP_OF_FIVE]]),
    praise: 'Du hast beim langen Zeiger in Fünfern gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Five-minute steps with an everyday word, without the quarters of Stufe 2. */
const FIVES_EASY = [5, 10, 20, 40, 50, 55];
/** All five-minute steps on the clock that are not the half and the quarters of Stufe 1 and 2. */
const FIVES_ALL = [5, 10, 20, 25, 35, 40, 50, 55];

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;
const on = (f: (rng: Rng, stufe: Stufe, ab: Ab, minutes: readonly number[]) => Exercise, minutes: readonly number[]): Form => (rng, stufe, ab) => f(rng, stufe, ab, minutes);

const FORMS: Record<Stufe, Record<Ab, Form[]>> = {
  1: {
    1: [on(readClock, [0]), on(nameTime, [0, 30])],
    2: [on(readClock, [30]), on(pickClock, [0, 30])],
    3: [on(writeTime, [0, 30]), on(checkClaim, [0, 30]), on(wherePointer, [0, 30])],
  },
  2: {
    1: [on(readClock, [15]), on(nameTime, [15])],
    2: [on(readClock, [45]), on(nameTime, [45]), on(pickClock, [15, 45])],
    3: [on(writeTime, [15, 45]), on(checkClaim, [15, 45]), on(wherePointer, [15, 45])],
  },
  3: {
    1: [on(readClock, FIVES_EASY), on(pickClock, FIVES_EASY)],
    2: [on(readClock, FIVES_ALL), on(nameTime, FIVES_EASY)],
    3: [on(pickClock, FIVES_EASY), on(handNumber, FIVES_ALL), handMinutes, on(checkClaim, FIVES_ALL)],
  },
};

export const uhrSkill: SkillDef = {
  ...SKILL,
  title: 'Uhrzeiten lesen',
  description: 'Du liest die Uhr bei vollen und halben Stunden.',
  stufen: {
    1: 'Volle und halbe Stunden',
    2: 'Viertel nach und Viertel vor',
    3: 'Fünf-Minuten-Schritte; die passende Uhr finden',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
