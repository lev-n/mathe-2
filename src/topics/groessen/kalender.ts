/**
 * Tage, Wochen, Monate. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1, weekday order, 7 days in a week: AB I the neighbour, morgen and gestern, 1 week; AB II a gap, übermorgen and vorgestern, weeks to
 * days; AB III from gestern to morgen, order days, a week and days.
 * Stufe 2, month order, a month sheet: AB I the neighbour, the weekday of a date; AB II the number of a month, a date from a weekday, order
 * months; AB III how many of a weekday, jumps of months, the month of a number, what stands under a date.
 * Stufe 3, spans in days within one month: AB I a short span with a sheet, a later date; AB II a long span, weeks, from weekday to weekday;
 * AB III backwards to today, the weekday after a span, a span in weeks.
 * A date stands at the end of a sentence ('Heute ist der 8.'), so the full stop also ends the sentence (T3).
 * A date as an answer is the number alone: text after a field stands apart from it ('Es ist der 10 .').
 */
import { BOX, MINUS } from '../../core/format';
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, pickPerson, plural, speak, targetAb } from '../shared';
import { labelledOrder } from './helpers';

const SKILL = { id: 'groessen.kalender', topicId: 'groessen' } as const;
const KMK = ['GM.zeit'];

const WEEK = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const WEEKEND = 'Zähle auch Samstag und Sonntag mit.';
const TODAY_NOT = 'Heute zählt noch nicht. Beginne mit morgen.';
// No day and no month by name: any fixed start states the answer when that day or month is the one asked for.
const WEEK_GO = 'Geh die Woche Tag für Tag durch.';
const MONTH_GO = 'Geh die Monate der Reihe nach durch.';

const at = <T,>(list: readonly T[], i: number) => list[((i % list.length) + list.length) % list.length];

/** A date in [min, max] that is not the number the task asks for: 'Heute ist der 8. Das Fest ist am 16.' shows the 8 of the answer. */
function dateOtherThan(rng: Rng, min: number, max: number, answer: number): number {
  return rng.pick(Array.from({ length: max - min + 1 }, (_, i) => min + i).filter((d) => d !== answer));
}

/** Wrong names near the right one, for a choice: next to it first. */
function nearNames(list: readonly string[], index: number, why: string) {
  const near = [index - 1, index + 1, index + 2, index - 2, index + 3].map((i) => at(list, i));
  return near.map((label) => ({ label, whyWrong: why }));
}

function weekdayNeighbour(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const i = rng.int(0, 6);
  const after = rng.chance(0.6);
  const right = at(WEEK, after ? i + 1 : i - 1);
  const prompt = `Welcher Tag kommt ${after ? 'nach' : 'vor'} ${WEEK[i]}?`;
  return build(SKILL, stufe, {
    key: `tag:${after ? 'nach' : 'vor'}:${i}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: right }, nearNames(WEEK, after ? i + 1 : i - 1, WEEK_GO).filter((o) => o.label !== WEEK[i]).concat([{ label: WEEK[i], whyWrong: 'Das ist der Tag aus der Frage.' }])),
    hints: [WEEK_GO, `Suche den ${WEEK[i]}. Geh dann einen Tag ${after ? 'weiter' : 'zurück'}.`],
    steps: [`${after ? 'Nach' : 'Vor'} ${WEEK[i]} kommt ${right}.`],
    praise: 'Du kennst die Reihenfolge der Wochentage.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** AB I morgen and gestern, AB II übermorgen and vorgestern. */
function todayTomorrow(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const i = rng.int(0, 6);
  const forms: [string, number][] = ab === 1 ? [['morgen', 1], ['gestern', -1]] : [['übermorgen', 2], ['vorgestern', -2]];
  const [word, delta] = rng.pick(forms);
  const right = at(WEEK, i + delta);
  const context = `Heute ist ${WEEK[i]}.`;
  // Exception to T6 (present tense): 'gestern' needs the past, 'Welcher Tag ist gestern?' is wrong German.
  const verb = delta < 0 ? 'war' : 'ist';
  const prompt = `Welcher Tag ${verb} ${word}?`;
  const what = delta > 0 ? 'Geh in der Woche weiter.' : 'Geh in der Woche zurück.';
  return build(SKILL, stufe, {
    key: `heute:${i}:${word}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, nearNames(WEEK, i + delta, what)),
    hints: [what, Math.abs(delta) === 2 ? 'Es sind 2 Tage.' : 'Es ist 1 Tag.'],
    steps: [`Heute ist ${WEEK[i]}.`, `${word.charAt(0).toUpperCase()}${word.slice(1)} ${verb} ${right}.`],
    praise: 'Du hast vom heutigen Tag aus gedacht.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

function missingDay(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const i = rng.int(0, 6);
  const right = at(WEEK, i + 1);
  const prompt = `Welcher Tag fehlt: ${WEEK[i]}, ${BOX}, ${at(WEEK, i + 2)}?`;
  return build(SKILL, stufe, {
    key: `fehlt:${i}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: right }, nearNames(WEEK, i + 1, WEEK_GO).filter((o) => o.label !== WEEK[i] && o.label !== at(WEEK, i + 2)).concat([{ label: at(WEEK, i + 4), whyWrong: WEEK_GO }])),
    hints: [WEEK_GO, `Welcher Tag kommt nach ${WEEK[i]}?`],
    steps: [`Nach ${WEEK[i]} kommt ${right}.`],
    praise: 'Du kennst die Reihenfolge der Wochentage.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: from one day that is not today to another one. */
function acrossToday(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const i = rng.int(0, 6);
  const forward = rng.chance(0.5);
  const today = at(WEEK, forward ? i + 1 : i - 1);
  const right = at(WEEK, forward ? i + 2 : i - 2);
  const context = forward ? `Gestern war ${WEEK[i]}.` : `Morgen ist ${WEEK[i]}.`;
  const prompt = forward ? 'Welcher Tag ist morgen?' : 'Welcher Tag war gestern?';
  const go = 'Überlege zuerst: Welcher Tag ist heute?';
  return build(SKILL, stufe, {
    key: `ueber-heute:${forward ? 'vor' : 'zurueck'}:${i}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, nearNames(WEEK, WEEK.indexOf(right), go)),
    hints: [go, forward ? 'Geh von heute 1 Tag weiter.' : 'Geh von heute 1 Tag zurück.'],
    steps: [`Heute ist ${today}.`, `${forward ? 'Morgen ist' : 'Gestern war'} ${right}.`],
    praise: 'Du hast zuerst an den heutigen Tag gedacht.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: four days in a row, beginning with a named one. */
function orderDays(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const i = rng.int(0, 6);
  const { answer, shown } = labelledOrder(rng, [0, 1, 2, 3], (v) => at(WEEK, i + v), 'aufsteigend', 'Tippe die Tage der Reihe nach an.');
  const prompt = `Ordne die Tage. Beginne mit ${WEEK[i]}.`;
  return build(SKILL, stufe, {
    key: `ordne-tage:${i}:${shown.join('')}`,
    ab,
    prompt,
    answer,
    hints: [WEEK_GO, `Welcher Tag kommt nach ${WEEK[i]}?`],
    steps: [`Die Reihenfolge: ${[0, 1, 2, 3].map((v) => at(WEEK, i + v)).join(', ')}.`],
    praise: 'Du kennst die Reihenfolge der Wochentage.',
    srText: speak(`${prompt} ${answer.items.join(', ')}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: a week and some days. */
function weekAndDays(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const weeks = rng.int(1, 2);
  const days = rng.int(1, 6);
  const value = weeks * 7 + days;
  const expression = `${weeks} ${plural(weeks, 'Woche', 'Wochen')} und ${days} ${plural(days, 'Tag', 'Tage')} = ${BOX} Tage`;
  return build(SKILL, stufe, {
    key: `woche-tage:${weeks}:${days}`,
    ab,
    prompt: 'Wandle um.',
    expression,
    answer: { kind: 'number', value, unit: 'Tage', label: 'Anzahl der Tage' },
    hints: ['Eine Woche hat 7 Tage.', 'Rechne die Tage dann dazu.'],
    steps: ['Eine Woche hat 7 Tage.', `${weeks} · 7 + ${days} = ${value}`, `Es sind ${value} Tage.`],
    bugs: bugList(value, [['woche-fuenf', weeks * 5 + days, WEEKEND]]),
    praise: 'Du hast zuerst die Wochen umgewandelt.',
    srText: speak(`Wandle um. ${expression}`),
    kmk: KMK,
  });
}

/** Stufe 1: AB I the one week, AB II 2 to 4 weeks. */
function daysOfWeeks(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const weeks = ab === 1 ? 1 : rng.int(2, 4);
  const value = weeks * 7;
  const single = weeks === 1;
  const prompt = single ? 'Wie viele Tage hat eine Woche?' : 'Wandle um.';
  const expression = single ? undefined : `${weeks} Wochen = ${BOX} Tage`;
  return build(SKILL, stufe, {
    key: `wochen:${weeks}`,
    ab,
    prompt,
    ...(expression ? { expression } : {}),
    answer: { kind: 'number', value, unit: 'Tage', label: 'Anzahl der Tage' },
    hints: single ? ['Geh die Woche durch: Montag, Dienstag und so weiter.', WEEKEND] : ['Eine Woche hat 7 Tage.', `Rechne ${weeks}-mal 7.`],
    steps: single ? ['Montag bis Sonntag sind 7 Tage.'] : ['Eine Woche hat 7 Tage.', `${weeks} · 7 = ${value}`, `${weeks} Wochen sind ${value} Tage.`],
    bugs: bugList(value, [['woche-fuenf', weeks * 5, WEEKEND]]),
    praise: 'Du hast an alle 7 Tage gedacht.',
    srText: speak([prompt, expression].filter(Boolean).join(' ')),
    kmk: KMK,
  });
}

function monthNeighbour(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const i = rng.int(0, 11);
  const after = rng.chance(0.6);
  const right = at(MONTHS, after ? i + 1 : i - 1);
  const prompt = `Welcher Monat kommt ${after ? 'nach' : 'vor'} ${MONTHS[i]}?`;
  return build(SKILL, stufe, {
    key: `monat:${after ? 'nach' : 'vor'}:${i}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: right }, nearNames(MONTHS, after ? i + 1 : i - 1, MONTH_GO).filter((o) => o.label !== MONTHS[i]).concat([{ label: MONTHS[i], whyWrong: 'Das ist der Monat aus der Frage.' }])),
    hints: [MONTH_GO, `Suche den ${MONTHS[i]}. Geh dann einen Monat ${after ? 'weiter' : 'zurück'}.`],
    steps: [`${after ? 'Nach' : 'Vor'} ${MONTHS[i]} kommt ${right}.`],
    praise: 'Du kennst die Reihenfolge der Monate.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** Stufe 2, AB II: four months in a row. */
function orderMonths(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const i = rng.int(0, 11);
  const { answer, shown } = labelledOrder(rng, [0, 1, 2, 3], (v) => at(MONTHS, i + v), 'aufsteigend', 'Tippe die Monate der Reihe nach an.');
  const prompt = `Ordne die Monate. Beginne mit ${MONTHS[i]}.`;
  return build(SKILL, stufe, {
    key: `ordne-monate:${i}:${shown.join('')}`,
    ab,
    prompt,
    answer,
    hints: [MONTH_GO, `Welcher Monat kommt nach ${MONTHS[i]}?`],
    steps: [`Die Reihenfolge: ${[0, 1, 2, 3].map((v) => at(MONTHS, i + v)).join(', ')}.`],
    praise: 'Du kennst die Reihenfolge der Monate.',
    srText: speak(`${prompt} ${answer.items.join(', ')}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: a jump of 2 to 4 months, also across the end of the year. */
function monthJump(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const i = rng.int(0, 11);
  const n = rng.int(2, 4);
  const after = rng.chance(0.6);
  const target = after ? i + n : i - n;
  const right = at(MONTHS, target);
  const prompt = `Welcher Monat kommt ${n} Monate ${after ? 'nach' : 'vor'} ${MONTHS[i]}?`;
  return build(SKILL, stufe, {
    key: `monat-sprung:${after ? 'nach' : 'vor'}:${n}:${i}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: right }, nearNames(MONTHS, ((target % 12) + 12) % 12, MONTH_GO).filter((o) => o.label !== MONTHS[i]).concat([{ label: MONTHS[i], whyWrong: 'Das ist der Monat aus der Frage.' }])),
    hints: [MONTH_GO, `Suche den ${MONTHS[i]}. Geh dann ${n} Monate ${after ? 'weiter' : 'zurück'}.`],
    steps: [`${after ? 'Nach' : 'Vor'} ${MONTHS[i]}: ${Array.from({ length: n }, (_, k) => at(MONTHS, after ? i + k + 1 : i - k - 1)).join(', ')}.`, `Es ist der Monat ${right}.`],
    praise: 'Du bist der Reihe nach vorgegangen.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** Stufe 2, AB III, the other way round: from the number to the month. */
function monthOfNumber(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const i = rng.int(1, 11);
  const right = MONTHS[i];
  const prompt = `Welcher Monat ist Monat ${i + 1}?`;
  return build(SKILL, stufe, {
    key: `zahl-monat:${i}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: right }, nearNames(MONTHS, i, MONTH_GO)),
    hints: [MONTH_GO, 'Zähle bei jedem Monat 1 weiter.'],
    steps: [`Die Monate der Reihe nach: Monat ${i + 1} ist ${right}.`],
    praise: 'Du bist der Reihe nach vorgegangen.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

function monthNumber(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const i = rng.int(1, 11);
  const prompt = `Der wievielte Monat ist der ${MONTHS[i]}?`;
  return build(SKILL, stufe, {
    key: `monat-zahl:${i}`,
    ab,
    prompt,
    answer: { kind: 'number', value: i + 1, before: 'Es ist Monat', label: 'Nummer des Monats' },
    hints: ['Der Januar ist Monat 1.', 'Geh die Monate von Januar an durch.'],
    steps: ['Der Januar ist Monat 1.', `Der ${MONTHS[i]} ist Monat ${i + 1}.`],
    praise: 'Du kennst die Reihenfolge der Monate.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

interface Sheet {
  name: string;
  length: number;
  /** Weekday index (0 = Monday) of the 1st. */
  first: number;
  table: Visual;
}

/** Month sheet: a table with a column per weekday. The year is left open, so the 1st can fall on any weekday. */
function monthSheet(rng: Rng): Sheet {
  const m = rng.int(0, 11);
  const first = rng.int(0, 6);
  const length = MONTH_DAYS[m];
  const cells = [...Array.from({ length: first }, () => ''), ...Array.from({ length }, (_, i) => String(i + 1))];
  while (cells.length % 7 !== 0) cells.push('');
  const rows: string[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return { name: MONTHS[m], length, first, table: { type: 'table', caption: MONTHS[m], header: SHORT, rows } };
}

const weekdayOf = (sheet: Sheet, day: number) => at(WEEK, sheet.first + day - 1);

/** The data of a sheet for screen readers; the table itself is not in the focus order of the answer field. */
const sheetText = (sheet: Sheet) => `Monatsblatt ${sheet.name}. Der 1. ist ein ${at(WEEK, sheet.first)}. Der Monat hat ${sheet.length} Tage.`;

function sheetWeekday(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const sheet = monthSheet(rng);
  const day = rng.int(2, sheet.length);
  const right = weekdayOf(sheet, day);
  const prompt = `Welcher Wochentag ist der ${day}.?`;
  const go = 'Geh von der Zahl in der Spalte nach oben.';
  return build(SKILL, stufe, {
    key: `blatt-tag:${sheet.name}:${sheet.first}:${day}`,
    ab,
    prompt,
    visual: sheet.table,
    answer: makeChoice(rng, { label: right }, nearNames(WEEK, WEEK.indexOf(right), go), { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: [`Suche die ${day} auf dem Blatt.`, go],
    steps: [`Die ${day} steht in der Spalte ${SHORT[WEEK.indexOf(right)]}.`, `Der ${day}. ist ein ${right}.`],
    praise: 'Du hast die Spalte richtig gelesen.',
    srText: speak(`${prompt} ${sheetText(sheet)}`),
    kmk: [...KMK, 'DZ.daten'],
  });
}

function sheetDate(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const sheet = monthSheet(rng);
  const weekday = rng.int(0, 6);
  const nth = rng.int(1, 3);
  const firstDay = ((weekday - sheet.first + 7) % 7) + 1;
  const value = firstDay + (nth - 1) * 7;
  const word = ['erste', 'zweite', 'dritte'][nth - 1];
  const prompt = `Welches Datum hat der ${word} ${WEEK[weekday]}?`;
  return build(SKILL, stufe, {
    key: `blatt-datum:${sheet.name}:${sheet.first}:${weekday}:${nth}`,
    ab,
    prompt,
    visual: sheet.table,
    answer: { kind: 'number', value, label: 'Datum' },
    hints: [`Suche die Spalte ${SHORT[weekday]}.`, `Geh in der Spalte von oben nach unten.`],
    steps: [...(nth > 1 ? [`Der erste ${WEEK[weekday]} ist der ${firstDay}.`, `${firstDay} + ${(nth - 1) * 7} = ${value}`] : [`In der Spalte ${SHORT[weekday]} steht oben die ${value}.`]), `Der ${word} ${WEEK[weekday]} ist der ${value}.`],
    praise: 'Du hast den Tag in der Spalte gefunden.',
    srText: speak(`${prompt} ${sheetText(sheet)}`),
    kmk: [...KMK, 'DZ.daten'],
  });
}

function sheetCount(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const sheet = monthSheet(rng);
  const weekday = rng.int(0, 6);
  const firstDay = ((weekday - sheet.first + 7) % 7) + 1;
  const count = Math.floor((sheet.length - firstDay) / 7) + 1;
  const prompt = `Wie viele ${WEEK[weekday]}e hat dieser Monat?`;
  return build(SKILL, stufe, {
    key: `blatt-anzahl:${sheet.name}:${sheet.first}:${weekday}`,
    ab,
    prompt,
    visual: sheet.table,
    answer: { kind: 'number', value: count, unit: `${WEEK[weekday]}e`, label: 'Anzahl' },
    hints: [`Suche die Spalte ${SHORT[weekday]}.`, 'In der Spalte zählt jede Zahl als ein Tag.'],
    steps: [`In der Spalte ${SHORT[weekday]} stehen ${count} Zahlen.`, `Das sind ${count} ${WEEK[weekday]}e.`],
    praise: 'Du hast die ganze Spalte gelesen.',
    srText: speak(`${prompt} ${sheetText(sheet)}`),
    kmk: [...KMK, 'DZ.daten'],
  });
}

/** Stufe 2, AB III: what stands under a date? One row down is one week later. */
function sheetUnder(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const sheet = monthSheet(rng);
  const day = rng.int(1, sheet.length - 7);
  const value = day + 7;
  const prompt = `Such die ${day} auf dem Blatt. Welche Zahl steht direkt darunter?`;
  return build(SKILL, stufe, {
    key: `blatt-unter:${sheet.name}:${sheet.first}:${day}`,
    ab,
    prompt,
    visual: sheet.table,
    answer: { kind: 'number', value, label: 'Zahl auf dem Blatt' },
    hints: [`Suche die ${day} auf dem Blatt.`, 'Geh dann in der Spalte eine Zeile nach unten.'],
    steps: ['Eine Zeile tiefer ist eine Woche später.', `${day} + 7 = ${value}`, `Unter der Zahl ${day} steht ${value}.`],
    bugs: bugList(value, [['woche-fuenf', day + 5, 'Eine Woche hat 7 Tage. Denk an Samstag und Sonntag.']]),
    praise: 'Du hast die Spalte richtig gelesen.',
    srText: speak(`${prompt} ${sheetText(sheet)}`),
    kmk: [...KMK, 'DZ.daten'],
  });
}

/** In how many days is the party? AB I up to 7 days with a sheet, AB II up to 14 days, with a sheet or without. */
function spanInDays(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const sheet = monthSheet(rng);
  const span = ab === 1 ? rng.int(2, 7) : rng.int(8, 14);
  const today = dateOtherThan(rng, 2, sheet.length - span, span);
  const party = today + span;
  const context = `Heute ist der ${today}. Das Fest ist am ${party}.`;
  const prompt = 'In wie vielen Tagen ist das Fest?';
  const showSheet = ab === 1 || rng.chance(0.5);
  return build(SKILL, stufe, {
    key: `spanne:${sheet.name}:${sheet.first}:${today}:${party}:${showSheet ? 'b' : 'o'}`,
    ab,
    context,
    prompt,
    ...(showSheet ? { visual: sheet.table } : {}),
    answer: { kind: 'number', value: span, unit: plural(span, 'Tag', 'Tagen'), label: 'Anzahl der Tage' },
    hints: [TODAY_NOT, `Rechne ${party} ${MINUS} ${today}.`],
    steps: [`${party} ${MINUS} ${today} = ${span}`, `Das Fest ist in ${span} ${plural(span, 'Tag', 'Tagen')}.`],
    bugs: bugList(span, [
      ['zeitpunkt-spanne', party, 'Gefragt ist: In wie vielen Tagen? Nicht: Wann?'],
      ['tage-zaun', span + 1, TODAY_NOT],
    ]),
    praise: 'Du hast die Tage bis zum Fest gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Which date is it then? AB I in days, AB II also in weeks. */
function dateLater(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const today = rng.int(1, 12);
  const inWeeks = ab > 1 && rng.chance(0.5);
  const weeks = rng.int(1, 2);
  const span = inWeeks ? weeks * 7 : rng.int(3, 9);
  const value = today + span;
  const later = inWeeks ? `${weeks} ${plural(weeks, 'Woche', 'Wochen')}` : `${span} Tagen`;
  const context = `Heute ist der ${today}. In ${later} ist das Fest.`;
  const prompt = 'Welches Datum hat das Fest?';
  const weekDays = `In ${weeks}\u00A0${plural(weeks, 'Woche', 'Wochen')} sind es ${weeks * 7}\u00A0Tage.`;
  return build(SKILL, stufe, {
    key: `datum:${today}:${inWeeks ? `w${weeks}` : `t${span}`}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, label: 'Datum' },
    hints: inWeeks ? ['Eine Woche hat 7 Tage.', 'Rechne die Tage zum Datum dazu.'] : ['Rechne die Tage zum Datum dazu.', `Rechne ${today} + ${span}.`],
    steps: [...(inWeeks ? [weekDays] : []), `${today} + ${span} = ${value}`, `Das Fest ist am ${value}.`],
    bugs: inWeeks ? bugList(value, [['woche-fuenf', today + weeks * 5, 'Eine Woche hat 7 Tage. Denk an Samstag und Sonntag.']]) : [],
    praise: 'Du hast vom heutigen Datum aus gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** From one weekday to another, also over the weekend. */
function spanWeekdays(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const a = rng.int(0, 6);
  const span = rng.int(2, 6);
  const b = at(WEEK, a + span);
  const person = pickPerson(rng);
  const context = `Heute ist ${WEEK[a]}. ${person.name} hat am ${b} Geburtstag.`;
  const prompt = `In wie vielen Tagen hat ${person.name} Geburtstag?`;
  return build(SKILL, stufe, {
    key: `wochentage:${a}:${span}:${person.name}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: span, unit: 'Tagen', label: 'Anzahl der Tage' },
    hints: [TODAY_NOT, 'Geh die Woche weiter bis zum Geburtstag.'],
    steps: [`Von ${WEEK[a]} bis ${b} sind es ${span} Tage.`, `${person.name} hat in ${span} Tagen Geburtstag.`],
    bugs: bugList(span, [['tage-zaun', span + 1, TODAY_NOT]]),
    praise: 'Du hast die Tage richtig gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III, the other way round: from the party back to today. */
function dateBack(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const span = rng.int(3, 12);
  const today = dateOtherThan(rng, 1, 16, span);
  const party = today + span;
  const context = `Das Fest ist am ${party}. Das ist in ${span} Tagen.`;
  const prompt = 'Welches Datum ist heute?';
  return build(SKILL, stufe, {
    key: `zurueck:${party}:${span}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: today, label: 'Datum' },
    hints: ['Geh vom Fest aus zurück.', 'Rechne das Datum minus die Tage.'],
    steps: [`${party} ${MINUS} ${span} = ${today}`, `Heute ist der ${today}.`],
    bugs: bugList(today, [
      ['zeitpunkt-spanne', party + span, 'Das Fest kommt erst noch. Heute ist früher.'],
      ['tage-zaun', today + 1, TODAY_NOT],
    ]),
    praise: 'Du hast vom Fest aus zurück gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: which weekday is it after a span? First the date, then the sheet. */
function weekdayAfterSpan(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const sheet = monthSheet(rng);
  const span = rng.int(3, 14);
  const today = rng.int(1, sheet.length - span);
  const day = today + span;
  const right = weekdayOf(sheet, day);
  const context = `Heute ist der ${today}. In ${span} Tagen ist das Fest.`;
  const prompt = 'Welcher Wochentag ist dann?';
  const go = 'Rechne zuerst das Datum aus.';
  return build(SKILL, stufe, {
    key: `fest-tag:${sheet.name}:${sheet.first}:${today}:${span}`,
    ab,
    context,
    prompt,
    visual: sheet.table,
    answer: makeChoice(rng, { label: right }, nearNames(WEEK, WEEK.indexOf(right), go), { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: [go, 'Suche das Datum dann auf dem Blatt.'],
    steps: [`${today} + ${span} = ${day}`, `Der ${day}. ist ein ${right}.`],
    praise: 'Du hast erst gerechnet und dann gelesen.',
    srText: speak(`${context} ${prompt} ${sheetText(sheet)}`),
    kmk: [...KMK, 'DZ.daten'],
  });
}

/** Stufe 3, AB III: a span of whole weeks. */
function spanInWeeks(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const weeks = rng.int(1, 3);
  const span = weeks * 7;
  const today = dateOtherThan(rng, 1, 28 - span, weeks);
  const party = today + span;
  const context = `Heute ist der ${today}. Das Fest ist am ${party}.`;
  const prompt = 'In wie vielen Wochen ist das Fest?';
  const unit = plural(weeks, 'Woche', 'Wochen');
  return build(SKILL, stufe, {
    key: `wochen-spanne:${today}:${weeks}`,
    ab,
    context,
    prompt,
    // The unit stands in the question: 'Woche' after the field would show that the answer is 1.
    answer: { kind: 'number', value: weeks, label: 'Anzahl der Wochen' },
    hints: ['Rechne zuerst die Tage aus.', 'Eine Woche hat 7 Tage.'],
    steps: [`${party} ${MINUS} ${today} = ${span}`, `${span} : 7 = ${weeks}`, `Das Fest ist in ${weeks} ${unit}.`],
    bugs: bugList(weeks, [
      ['zeitpunkt-spanne', span, 'Das sind die Tage. Gefragt sind die Wochen.'],
      ['zeitpunkt-spanne', party, 'Gefragt ist: In wie vielen Wochen? Nicht: Wann?'],
    ]),
    praise: 'Du hast die Tage in Wochen umgerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, Form[]>> = {
  1: {
    // 'Wie viele Tage hat eine Woche?' is one fact: seldom, so that it does not repeat in every round.
    1: [weekdayNeighbour, weekdayNeighbour, weekdayNeighbour, todayTomorrow, todayTomorrow, todayTomorrow, daysOfWeeks],
    2: [missingDay, missingDay, todayTomorrow, todayTomorrow, daysOfWeeks],
    3: [acrossToday, orderDays, weekAndDays],
  },
  2: {
    1: [monthNeighbour, sheetWeekday],
    2: [monthNumber, sheetDate, orderMonths],
    3: [sheetCount, monthJump, monthOfNumber, sheetUnder],
  },
  3: {
    1: [spanInDays, dateLater],
    2: [spanInDays, dateLater, spanWeekdays],
    3: [dateBack, weekdayAfterSpan, spanInWeeks],
  },
};

export const kalenderSkill: SkillDef = {
  ...SKILL,
  title: 'Tage, Wochen, Monate',
  description: 'Du kennst den Kalender und findest Tage darin.',
  stufen: {
    1: 'Wochentage in der richtigen Reihenfolge',
    2: 'Monate ordnen und ein Monatsblatt lesen',
    3: 'Tage in einem Monat ausrechnen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
