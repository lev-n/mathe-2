import { describe, expect, it } from 'vitest';
import { formatAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe, VisualOf } from '../../core/types';
import { STUFEN } from '../../core/types';
import { createRng } from '../../core/rng';
import { CTX } from '../test-utils';
import { kalenderSkill } from './kalender';

describeSkill(kalenderSkill, { minDistinct: 30 });

const atAb = (stufe: Stufe, ab: Ab, n = 200): Exercise[] =>
  Array.from({ length: n }, (_, i) => kalenderSkill.generate(createRng(i * 6841 + 9), stufe, { ...CTX, ab }));
const all = STUFEN.flatMap((s: Stufe) => [1, 2, 3].flatMap((ab) => atAb(s, ab as Ab)));
const kind = (k: string) => all.filter((ex) => ex.key.includes(`:${k}:`));
const valueOf = (ex: Exercise) => (ex.answer.kind === 'number' ? ex.answer.value! : NaN);

const WEEK = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const LENGTHS: Record<string, number> = { Januar: 31, Februar: 28, März: 31, April: 30, Mai: 31, Juni: 30, Juli: 31, August: 31, September: 30, Oktober: 31, November: 30, Dezember: 31 };
const MONTHS = Object.keys(LENGTHS);

/** Read the table the way a child does: the column of a day. */
function columnOf(table: VisualOf<'table'>, day: number): number {
  for (const row of table.rows) {
    const c = row.indexOf(String(day));
    if (c >= 0) return c;
  }
  throw new Error(`day ${day} not on the sheet`);
}

describe('groessen.kalender specifics', () => {
  it('a date as an answer: the shown solution has no space before a full stop', () => {
    const tasks = [...kind('blatt-datum'), ...kind('datum')];
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) expect(formatAnswer(ex.answer), ex.key).toBe(String(valueOf(ex)));
    for (const ex of all) expect(formatAnswer(ex.answer), ex.key).not.toMatch(/\s[.,!?]/);
  });

  it('weekdays: the right neighbour, also across the end of the week', () => {
    const tasks = kind('tag');
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const day = WEEK.find((d) => ex.prompt.endsWith(`${d}?`))!;
      const step = ex.prompt.includes(' nach ') ? 1 : 6;
      expect(ex.answer.options[ex.answer.correct].label).toBe(WEEK[(WEEK.indexOf(day) + step) % 7]);
    }
  });

  it('today and tomorrow: right day', () => {
    const delta: Record<string, number> = { morgen: 1, gestern: 6, übermorgen: 2, vorgestern: 5 };
    const tasks = kind('heute');
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const today = WEEK.find((d) => ex.context!.includes(d))!;
      const word = ex.prompt.match(/(?:ist|war) (\S+)\?/)![1];
      expect(ex.answer.options[ex.answer.correct].label).toBe(WEEK[(WEEK.indexOf(today) + delta[word]) % 7]);
    }
  });

  it('today and tomorrow: the past takes "war", also in the worked step', () => {
    for (const ex of kind('heute')) {
      const past = /gestern/.test(ex.key);
      const verb = past ? 'war' : 'ist';
      expect(ex.prompt, ex.key).toContain(`Welcher Tag ${verb} `);
      expect(String(ex.steps[1]), ex.key).toMatch(new RegExp(`^\\p{L}+ ${verb} `, 'u'));
    }
  });

  it('a choice: no hint and no reply to a wrong option names the right option', () => {
    const tasks = all.filter((ex) => ex.answer.kind === 'choice');
    expect(tasks.length).toBeGreaterThan(200);
    expect(tasks.some((ex) => ex.answer.kind === 'choice' && ex.answer.options[ex.answer.correct].label === 'Montag')).toBe(true);
    expect(tasks.some((ex) => ex.answer.kind === 'choice' && ex.answer.options[ex.answer.correct].label === 'Januar')).toBe(true);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const right = ex.answer.options[ex.answer.correct].label;
      for (const text of [...ex.hints, ...ex.answer.options.flatMap((o) => o.whyWrong ?? [])]) expect(text, ex.key).not.toContain(right);
    }
  });

  it('weeks in days: 7 per week, 5 per week is the bug', () => {
    for (const ex of kind('wochen')) {
      const weeks = Number(ex.key.match(/wochen:(\d)/)![1]);
      expect(valueOf(ex)).toBe(weeks * 7);
      expect(ex.bugs?.find((b) => b.id === 'woche-fuenf')?.match).toBe(weeks * 5);
    }
  });

  it('months: neighbour and number', () => {
    for (const ex of kind('monat')) {
      if (ex.answer.kind !== 'choice') continue;
      const m = MONTHS.find((x) => ex.prompt.endsWith(`${x}?`))!;
      const step = ex.prompt.includes(' nach ') ? 1 : 11;
      expect(ex.answer.options[ex.answer.correct].label).toBe(MONTHS[(MONTHS.indexOf(m) + step) % 12]);
    }
    for (const ex of kind('monat-zahl')) {
      const m = MONTHS.find((x) => ex.prompt.endsWith(`${x}?`))!;
      expect(valueOf(ex)).toBe(MONTHS.indexOf(m) + 1);
    }
  });

  it('month sheet: a real month, days in order, weeks of 7 columns', () => {
    const sheets = all.flatMap((ex) => (ex.visual?.type === 'table' ? [ex.visual] : []));
    expect(sheets.length).toBeGreaterThan(50);
    for (const table of sheets) {
      expect(table.header.length).toBe(7);
      const days = table.rows.flat().filter(Boolean).map(Number);
      expect(days).toEqual(Array.from({ length: LENGTHS[table.caption!] }, (_, i) => i + 1));
      table.rows.forEach((r) => expect(r.length).toBe(7));
    }
  });

  it('month sheet: answers recomputed from the table', () => {
    for (const ex of kind('blatt-tag')) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'table') continue;
      const day = Number(ex.prompt.match(/der (\d+)\./)![1]);
      expect(ex.answer.options[ex.answer.correct].label).toBe(WEEK[columnOf(ex.visual, day)]);
    }
    for (const ex of kind('blatt-datum')) {
      if (ex.visual?.type !== 'table') continue;
      const name = WEEK.find((d) => ex.prompt.includes(d))!;
      const col = WEEK.indexOf(name);
      const nth = ['erste', 'zweite', 'dritte'].findIndex((w) => ex.prompt.includes(` ${w} `));
      const inColumn = ex.visual.rows.map((r) => r[col]).filter(Boolean).map(Number);
      expect(valueOf(ex)).toBe(inColumn[nth]);
    }
    for (const ex of kind('blatt-anzahl')) {
      if (ex.visual?.type !== 'table') continue;
      const name = WEEK.find((d) => ex.prompt.includes(d))!;
      expect(valueOf(ex)).toBe(ex.visual.rows.map((r) => r[WEEK.indexOf(name)]).filter(Boolean).length);
    }
  });

  it('spans: in one month, the difference of the dates; the date and one day more are bugs', () => {
    const tasks = kind('spanne');
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      const [today, party] = [...ex.context!.matchAll(/(\d+)\./g)].map((m) => Number(m[1]));
      expect(valueOf(ex)).toBe(party - today);
      if (ex.visual?.type === 'table') expect(party).toBeLessThanOrEqual(LENGTHS[ex.visual.caption!]);
      expect(ex.bugs?.find((b) => b.id === 'zeitpunkt-spanne')?.match).toBe(party);
      expect(ex.bugs?.find((b) => b.id === 'tage-zaun')?.match).toBe(party - today + 1);
    }
  });

  it('later date: today plus the days; weeks count 7', () => {
    const tasks = kind('datum');
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      const today = Number(ex.context!.match(/der (\d+)\./)![1]);
      const week = ex.context!.match(/In (\d+) Woche/);
      const day = ex.context!.match(/In (\d+) Tagen/);
      expect(valueOf(ex)).toBe(today + (week ? Number(week[1]) * 7 : Number(day![1])));
      expect(valueOf(ex)).toBeLessThanOrEqual(28);
    }
  });

  it('the Stufe chooses the content, the AB the demand inside it', () => {
    const forms = (stufe: Stufe, ab: Ab) => new Set(atAb(stufe, ab, 300).map((ex) => ex.key.split(':')[2]));
    expect(forms(1, 1)).toEqual(new Set(['tag', 'heute', 'wochen']));
    expect(forms(1, 2)).toEqual(new Set(['fehlt', 'heute', 'wochen']));
    expect(forms(1, 3)).toEqual(new Set(['ueber-heute', 'ordne-tage', 'woche-tage']));
    expect(forms(2, 1)).toEqual(new Set(['monat', 'blatt-tag']));
    expect(forms(2, 2)).toEqual(new Set(['monat-zahl', 'blatt-datum', 'ordne-monate']));
    expect(forms(2, 3)).toEqual(new Set(['blatt-anzahl', 'monat-sprung', 'zahl-monat', 'blatt-unter']));
    expect(forms(3, 1)).toEqual(new Set(['spanne', 'datum']));
    expect(forms(3, 2)).toEqual(new Set(['spanne', 'datum', 'wochentage']));
    expect(forms(3, 3)).toEqual(new Set(['zurueck', 'fest-tag', 'wochen-spanne']));
  });

  it('Stufe 1 names no month and has no month sheet; AB I morgen and gestern, AB II übermorgen and vorgestern, one week on AB I', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(1, ab)) {
        expect(ex.visual, ex.key).toBeUndefined();
        expect(`${ex.prompt} ${ex.context ?? ''}`, ex.key).not.toMatch(new RegExp(MONTHS.join('|')));
      }
    }
    for (const ex of atAb(1, 1).filter((e) => e.key.includes(':heute:'))) expect(ex.key, ex.key).toMatch(/:(morgen|gestern)$/);
    for (const ex of atAb(1, 2).filter((e) => e.key.includes(':heute:'))) expect(ex.key, ex.key).toMatch(/:(übermorgen|vorgestern)$/);
    for (const ex of atAb(1, 1).filter((e) => e.key.includes(':wochen:'))) expect(ex.key, ex.key).toMatch(/:wochen:1$/);
  });

  it('Stufe 3: AB I shows a sheet and a span up to 7; AB II spans of 8 to 14', () => {
    for (const ex of atAb(3, 1).filter((e) => e.key.includes(':spanne:'))) {
      expect(ex.visual?.type, ex.key).toBe('table');
      expect(valueOf(ex), ex.key).toBeLessThanOrEqual(7);
    }
    for (const ex of atAb(3, 2).filter((e) => e.key.includes(':spanne:'))) expect(valueOf(ex), ex.key).toBeGreaterThanOrEqual(8);
  });

  it('from gestern to morgen: 2 days apart', () => {
    const tasks = atAb(1, 3).filter((e) => e.key.includes(':ueber-heute:'));
    expect(tasks.length).toBeGreaterThan(50);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const named = WEEK.indexOf(WEEK.find((d) => ex.context!.includes(d))!);
      const step = ex.prompt.includes('morgen') ? 2 : 5;
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(WEEK[(named + step) % 7]);
    }
  });

  it('order: days and months in the order of the year', () => {
    for (const [tasks, list] of [[atAb(1, 3).filter((e) => e.key.includes(':ordne-tage:')), WEEK], [atAb(2, 2).filter((e) => e.key.includes(':ordne-monate:')), MONTHS]] as const) {
      expect(tasks.length).toBeGreaterThan(50);
      for (const ex of tasks) {
        if (ex.answer.kind !== 'order') throw new Error(ex.key);
        const { items, correct } = ex.answer;
        const inOrder = correct.map((i) => items[i]);
        const start = list.indexOf(inOrder[0]);
        expect(ex.prompt, ex.key).toContain(inOrder[0]);
        inOrder.forEach((label, k) => expect(label, ex.key).toBe(list[(start + k) % list.length]));
        expect(items, ex.key).not.toEqual(inOrder);
      }
    }
  });

  it('order: days and months have their own instruction, as they have no smallest and no largest', () => {
    for (const [tasks, text] of [[atAb(1, 3).filter((e) => e.key.includes(':ordne-tage:')), 'Tippe die Tage der Reihe nach an.'], [atAb(2, 2).filter((e) => e.key.includes(':ordne-monate:')), 'Tippe die Monate der Reihe nach an.']] as const) {
      expect(tasks.length).toBeGreaterThan(50);
      for (const ex of tasks) expect(ex.answer.kind === 'order' && ex.answer.instruction, ex.key).toBe(text);
    }
  });

  it('a span in weeks: the unit stands in the question, the field looks the same for 1, 2 and 3 weeks', () => {
    const tasks = atAb(3, 3, 600).filter((e) => e.key.includes(':wochen-spanne:'));
    expect(new Set(tasks.map(valueOf))).toEqual(new Set([1, 2, 3]));
    for (const ex of tasks) {
      if (ex.answer.kind !== 'number') throw new Error(ex.key);
      expect(ex.answer.unit, ex.key).toBeUndefined();
      expect(ex.answer.after, ex.key).toBeUndefined();
      expect(ex.prompt, ex.key).toContain('Wochen');
    }
  });

  it('a fact that hardly varies stays rare: the week as days', () => {
    expect(atAb(1, 1, 400).filter((e) => e.key.includes(':wochen:')).length / 400).toBeLessThan(0.2);
    expect(new Set(atAb(1, 2, 400).filter((e) => e.key.includes(':wochen:')).map(valueOf))).toEqual(new Set([14, 21, 28]));
  });

  it('a week and days: 7 per week plus the days; 5 per week is the bug', () => {
    const tasks = atAb(1, 3).filter((e) => e.key.includes(':woche-tage:'));
    expect(tasks.length).toBeGreaterThan(50);
    for (const ex of tasks) {
      const [w, d] = ex.key.split(':').slice(3).map(Number);
      expect(valueOf(ex), ex.key).toBe(w * 7 + d);
      expect(ex.bugs?.find((b) => b.id === 'woche-fuenf')?.match, ex.key).toBe(w * 5 + d);
    }
  });

  it('a jump of months and the month of a number: also across the end of the year', () => {
    const list = atAb(2, 3, 500);
    const jumps = list.filter((e) => e.key.includes(':monat-sprung:'));
    expect(jumps.length).toBeGreaterThan(30);
    for (const ex of jumps) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const m = /kommt (\d) Monate (nach|vor) (\p{L}+)\?/u.exec(ex.prompt)!;
      const i = MONTHS.indexOf(m[3]) + (m[2] === 'nach' ? 1 : -1) * Number(m[1]);
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(MONTHS[(i + 12) % 12]);
    }
    const numbers = list.filter((e) => e.key.includes(':zahl-monat:'));
    expect(numbers.length).toBeGreaterThan(30);
    for (const ex of numbers) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(MONTHS[Number(/Monat (\d+)\?/.exec(ex.prompt)![1]) - 1]);
    }
  });

  it('under a date: read from the table', () => {
    const tasks = atAb(2, 3, 500).filter((e) => e.key.includes(':blatt-unter:'));
    expect(tasks.length).toBeGreaterThan(30);
    for (const ex of tasks) {
      if (ex.visual?.type !== 'table') throw new Error(ex.key);
      const day = Number(/Such die (\d+)/.exec(ex.prompt)![1]);
      const r = ex.visual.rows.findIndex((row) => row.includes(String(day)));
      expect(valueOf(ex), ex.key).toBe(Number(ex.visual.rows[r + 1][columnOf(ex.visual, day)]));
    }
  });

  it('backwards to today, the weekday after a span, a span in weeks: recomputed', () => {
    const list = atAb(3, 3, 500);
    for (const ex of list.filter((e) => e.key.includes(':zurueck:'))) {
      const [party, span] = ex.key.split(':').slice(3).map(Number);
      expect(ex.context, ex.key).toContain(`am ${party}.`);
      expect(valueOf(ex), ex.key).toBe(party - span);
      expect(valueOf(ex), ex.key).toBeGreaterThanOrEqual(1);
    }
    const weekdays = list.filter((e) => e.key.includes(':fest-tag:'));
    expect(weekdays.length).toBeGreaterThan(30);
    for (const ex of weekdays) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'table') throw new Error(ex.key);
      const [today, span] = [...ex.context!.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(WEEK[columnOf(ex.visual, today + span)]);
    }
    const weeks = list.filter((e) => e.key.includes(':wochen-spanne:'));
    expect(weeks.length).toBeGreaterThan(30);
    for (const ex of weeks) {
      const [today, party] = [...ex.context!.matchAll(/(\d+)\./g)].map((m) => Number(m[1]));
      expect(valueOf(ex) * 7, ex.key).toBe(party - today);
    }
  });

  it('from weekday to weekday: forward through the week', () => {
    for (const ex of kind('wochentage')) {
      const a = WEEK.find((d) => ex.context!.startsWith(`Heute ist ${d}`))!;
      const b = WEEK.find((d) => ex.context!.includes(`am ${d}`))!;
      expect(valueOf(ex)).toBe((WEEK.indexOf(b) - WEEK.indexOf(a) + 7) % 7);
    }
  });

  it('month sheet: srText holds the first weekday and the length of the month', () => {
    const tasks = [...kind('blatt-tag'), ...kind('blatt-datum'), ...kind('blatt-anzahl')];
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      if (ex.visual?.type !== 'table') continue;
      const first = ex.visual.rows[0].indexOf('1');
      expect(ex.srText, ex.key).toContain(`Der 1. ist ein ${WEEK[first]}.`);
      expect(ex.srText, ex.key).toContain(`Der Monat hat ${LENGTHS[ex.visual.caption!]} Tage.`);
    }
  });
});
