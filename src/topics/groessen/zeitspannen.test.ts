import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { createRng } from '../../core/rng';
import { CTX, times } from '../test-utils';
import { zeitspannenSkill } from './zeitspannen';

describeSkill(zeitspannenSkill, { minDistinct: 30 });

const atAb = (stufe: Stufe, ab: Ab, n = 200): Exercise[] =>
  Array.from({ length: n }, (_, i) => zeitspannenSkill.generate(createRng(i * 6011 + 5), stufe, { ...CTX, ab }));
const all = STUFEN.flatMap((s: Stufe) => [1, 2, 3].flatMap((ab) => atAb(s, ab as Ab)));
const kind = (k: string) => all.filter((ex) => ex.key.includes(`:${k}:`));
const fields = (ex: Exercise) => (ex.answer.kind === 'multi' ? ex.answer.fields.map((f) => f.value) : []);
const asMinutes = (ex: Exercise) => fields(ex)[0] * 60 + fields(ex)[1];
const valueOf = (ex: Exercise) => (ex.answer.kind === 'number' ? ex.answer.value! : NaN);

describe('groessen.zeitspannen specifics', () => {
  const clockOf = (ex: Exercise) => (ex.visual?.type === 'clock' ? ex.visual : null);

  it('the Stufe chooses the content, the AB the demand: the forms of each cell', () => {
    const forms = (stufe: Stufe, ab: Ab) => new Set(atAb(stufe, ab).map((ex) => ex.key.split(':')[2]));
    expect(forms(1, 1)).toEqual(new Set(['spaeter', 'spanne']));
    expect(forms(1, 2)).toEqual(new Set(['spaeter', 'spanne']));
    expect(forms(1, 3)).toEqual(new Set(['stunden-zurueck']));
    expect(forms(2, 1)).toEqual(new Set(['umrechnen', 'kurz']));
    expect(forms(2, 2)).toEqual(new Set(['umrechnen', 'in-viertel', 'laenger']));
    expect(forms(2, 3)).toEqual(new Set(['stunde-luecke', 'bis-voll', 'dauert-laenger']));
    expect(forms(3, 1)).toEqual(new Set(['ueber-stunde', 'in-minuten']));
    expect(forms(3, 2)).toEqual(new Set(['ueber-stunde', 'in-minuten']));
    expect(forms(3, 3)).toEqual(new Set(['rueckwaerts', 'in-minuten']));
  });

  it('whole hours on Stufe 1, quarters on Stufe 2, five-minute times only on Stufe 3 (§2.2)', () => {
    const textOf = (ex: Exercise) => [ex.context, ex.prompt, ...ex.hints, ...ex.steps.map(String), ex.srText].join(' ');
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(1, ab, 200)) expect(textOf(ex), ex.key).not.toMatch(/\d:\d\d/);
      for (const ex of atAb(2, ab, 200)) {
        for (const t of times(textOf(ex))) expect(t % 15, `${ex.key}: ${textOf(ex)}`).toBe(0);
        const clock = clockOf(ex);
        if (clock) expect(clock.minutes % 15, ex.key).toBe(0);
        if (ex.answer.kind === 'multi' && ex.answer.fields[0].after === ':') expect(asMinutes(ex) % 15, ex.key).toBe(0);
      }
    }
    expect(atAb(3, 2, 200).some((ex) => clockOf(ex) && clockOf(ex)!.minutes % 15 !== 0)).toBe(true);
  });

  it('whole hours: AB 1 has 1 or 2 hours, AB 2 has 3 or 4', () => {
    const hoursOf = (ex: Exercise) => (ex.key.includes(':spaeter:') ? valueOf(ex) - Number(ex.context!.match(/(\d+) Uhr/)![1]) : valueOf(ex));
    for (const ex of atAb(1, 1)) expect([1, 2], ex.key).toContain(hoursOf(ex));
    for (const ex of atAb(1, 2)) expect([3, 4], ex.key).toContain(hoursOf(ex));
  });

  it('whole hours backwards: the end minus the hours; the hours in the task are never the answer', () => {
    for (const ex of atAb(1, 3)) {
      const end = Number(ex.context!.match(/um (\d+) Uhr/)![1]);
      const d = Number(ex.context!.match(/dauert (\d+)/)![1]);
      expect(valueOf(ex), ex.key).toBe(end - d);
      expect(valueOf(ex), ex.key).not.toBe(d);
    }
    for (const ex of [...atAb(1, 1), ...atAb(1, 2)].filter((e) => e.key.includes(':spanne:'))) {
      const start = Number(ex.context!.match(/um (\d+) Uhr/)![1]);
      expect(valueOf(ex), ex.key).not.toBe(start);
    }
  });

  it('Stufe 2 stays inside the hour: the end of a time is the full hour at most', () => {
    for (const ex of atAb(2, 2).filter((e) => e.key.includes(':in-viertel:'))) {
      const [start] = times(ex.context!);
      expect(Math.floor((start + (ex.prompt.includes('halben') ? 30 : 15)) / 60) * 60, ex.key).toBeGreaterThanOrEqual(start - (start % 60));
      expect((start % 60) + (ex.prompt.includes('halben') ? 30 : 15), ex.key).toBeLessThanOrEqual(60);
    }
  });

  it('a short span never starts at the full hour: the minutes of the answer do not stand in the task', () => {
    for (const ex of atAb(2, 1).filter((e) => e.key.includes(':kurz:'))) {
      const [a, b] = times(ex.context!);
      expect(valueOf(ex), ex.key).toBe(b - a);
      expect(ex.context!, ex.key).not.toMatch(new RegExp(`:${valueOf(ex)}\\u00A0Uhr`));
    }
  });

  it('the gaps of Stufe 2 are recomputed', () => {
    const table: Record<string, number> = {
      '45\u00A0min + □ min = 1\u00A0h': 15, '15\u00A0min + □ min = 1\u00A0h': 45, 'eine halbe Stunde + □ min = 1\u00A0h': 30, 'eine Viertelstunde + □ min = 1\u00A0h': 45, '1\u00A0h = □ Viertelstunden': 4, '1\u00A0h = □ halbe Stunden': 2,
    };
    const gaps = atAb(2, 3).filter((e) => e.key.includes(':stunde-luecke:'));
    expect(gaps.length).toBeGreaterThan(30);
    for (const ex of gaps) expect(valueOf(ex), ex.key).toBe(table[ex.expression!]);
    const until = atAb(2, 3).filter((e) => e.key.includes(':bis-voll:'));
    for (const ex of until) {
      const [start] = times(ex.context!);
      expect(valueOf(ex), ex.key).toBe(60 - (start % 60));
      expect(start % 60, ex.key).not.toBe(30);
    }
  });

  it('which duration is longer: the right option has the most minutes, or both are the same', () => {
    const minutes: Record<string, number> = { 'eine Viertelstunde': 15, 'eine halbe Stunde': 30, '1\u00A0h': 60, '15\u00A0min': 15, '30\u00A0min': 30, '45\u00A0min': 45, '60\u00A0min': 60 };
    const list = atAb(2, 3).filter((e) => e.key.includes(':dauert-laenger:'));
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const [a, b] = ex.answer.options.slice(0, 2).map((o) => minutes[o.label]);
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(a === b ? 'Beide gleich lang' : ex.answer.options[a > b ? 0 : 1].label);
    }
  });

  it('Stufe 3 starts close to the full hour on AB 1, further away on AB 2', () => {
    for (const ex of atAb(3, 1).filter((e) => e.key.includes(':ueber-stunde:'))) {
      const [a, b] = times(ex.context!);
      expect(b - a, ex.key).toBeLessThanOrEqual(30);
    }
    expect(atAb(3, 2).filter((e) => e.key.includes(':ueber-stunde:')).some((ex) => times(ex.context!)[1] - times(ex.context!)[0] > 30)).toBe(true);
  });

  it('a clock and the text name the same hour: no 14 Uhr on the face, also not at the end of the task', () => {
    const clocked = all.filter((ex) => clockOf(ex));
    expect(clocked.length).toBeGreaterThan(200);
    for (const ex of clocked) {
      expect(clockOf(ex)!.hours, ex.key).toBeLessThanOrEqual(12);
      if (ex.answer.kind === 'multi') expect(fields(ex)[0], ex.key).toBeLessThanOrEqual(12);
      if (ex.key.includes(':spaeter:')) expect(valueOf(ex), ex.key).toBeLessThanOrEqual(12);
    }
  });

  it('a task with a clock starts and ends on the face: every time in its story is 12:xx at most', () => {
    const named = (ex: Exercise) => [...ex.context!.matchAll(/(\d{1,2})(?::\d\d)?\sUhr/g)].map((m) => Number(m[1]));
    for (const ex of all.filter((x) => clockOf(x))) for (const hour of named(ex)) expect(hour, `${ex.key}: ${ex.context}`).toBeLessThanOrEqual(12);
    // Every whole span of Stufe 1 fits the face and has its clock.
    for (const ex of kind('spanne')) expect(clockOf(ex) !== null, ex.key).toBe(true);
  });

  it('whole hours later: never over 12 Uhr, with a clock', () => {
    const later = kind('spaeter');
    expect(later.length).toBeGreaterThan(20);
    for (const ex of later) {
      expect(valueOf(ex), ex.key).toBeLessThanOrEqual(12);
      expect(clockOf(ex), ex.key).not.toBeNull();
    }
  });

  it('every hour stays 1 to 12, as on the clock of groessen.uhr: in the task, the answer, the steps, the bugs', () => {
    const every = STUFEN.flatMap((s: Stufe) => [1, 2, 3].flatMap((ab) => atAb(s, ab as Ab, 400)));
    for (const ex of every) {
      const texts = [ex.context, ex.prompt, ex.expression, ex.srText, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)), ...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)];
      for (const t of texts.filter((x): x is string => !!x)) {
        for (const m of t.matchAll(/(?<![\d:])(\d{1,2})(?::\d\d)?[\s ]Uhr/g)) {
          expect(Number(m[1]), `${ex.key}: ${t}`).toBeGreaterThanOrEqual(1);
          expect(Number(m[1]), `${ex.key}: ${t}`).toBeLessThanOrEqual(12);
        }
      }
      if (ex.answer.kind === 'multi' && ex.answer.fields[0].after === ':') {
        expect(fields(ex)[0], ex.key).toBeGreaterThanOrEqual(1);
        expect(fields(ex)[0], ex.key).toBeLessThanOrEqual(12);
      }
      expect(ex.bugs?.some((b) => b.id === 'stunden-zwoelf'), ex.key).toBeFalsy();
    }
  });

  it('a whole span: the unit stands in the question, the field looks the same for 1 hour and for more', () => {
    const tasks = [...atAb(1, 1), ...atAb(1, 2)].filter((e) => e.key.includes(':spanne:'));
    expect(new Set(tasks.map(valueOf))).toEqual(new Set([1, 2, 3, 4]));
    for (const ex of tasks) {
      if (ex.answer.kind !== 'number') throw new Error(ex.key);
      expect(ex.answer.unit, ex.key).toBeUndefined();
      expect(ex.prompt, ex.key).toContain('Wie viele Stunden');
    }
  });

  it('no hint points at a clock that is not on the screen', () => {
    for (const ex of all) {
      if (clockOf(ex)) continue;
      for (const t of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(t, ex.key).not.toMatch(/Schau auf die Uhr/);
    }
  });

  it('converting: no handful of facts fills the cell', () => {
    for (const ex of [...atAb(2, 1, 400), ...atAb(2, 2, 400)].filter((e) => /:umrechnen:.*(Viertelstunden|halbe Stunden| und )/.test(e.key))) expect(ex.praise, ex.key).not.toMatch(/60 Minuten/);
    const one = atAb(2, 1, 400);
    expect(new Set(one.filter((e) => e.key.includes(':umrechnen:')).map((e) => e.key)).size).toBeGreaterThanOrEqual(8);
    expect(one.filter((e) => e.key.includes(':umrechnen:')).length / 400).toBeLessThan(0.3);
    expect(new Set(atAb(2, 2, 600).filter((e) => e.key.includes(':umrechnen:')).map((e) => e.key)).size).toBeGreaterThanOrEqual(7);
  });

  it('whole hours: later is start plus hours; a span is end minus start; the end time is the bug', () => {
    for (const ex of kind('spaeter')) {
      const start = Number(ex.context!.match(/(\d+) Uhr/)![1]);
      const d = Number((ex.prompt + ex.context).match(/(\d+) Stunde/)![1]);
      expect(valueOf(ex)).toBe(start + d);
    }
    const spans = kind('spanne');
    expect(spans.length).toBeGreaterThan(20);
    for (const ex of spans) {
      const [a, b] = [...ex.context!.matchAll(/(\d+) Uhr/g)].map((m) => Number(m[1]));
      expect(valueOf(ex)).toBe(b - a);
      expect(ex.bugs?.find((x) => x.id === 'zeitpunkt-spanne')?.match).toBe(b);
    }
  });

  it('1 h = 60 min: recomputed, and 100 per hour is the bug', () => {
    const tasks = kind('umrechnen');
    expect(tasks.length).toBeGreaterThan(20);
    const table: Record<string, number> = { '1 h': 60, 'eine halbe Stunde': 30, 'eine Viertelstunde': 15, '60 min': 1, '1 h 30 min': 90, '1 h 15 min': 75, '2 Viertelstunden': 30, '3 Viertelstunden': 45, '2 halbe Stunden': 60, 'eine halbe Stunde und eine Viertelstunde': 45, '1 h und eine halbe Stunde': 90, '1 h und eine Viertelstunde': 75, '3 halbe Stunden': 90, '5 Viertelstunden': 75, '6 Viertelstunden': 90 };
    for (const ex of tasks) {
      const left = ex.key.split('umrechnen:')[1];
      expect(valueOf(ex), left).toBe(table[left]);
    }
    expect(tasks.some((ex) => ex.bugs?.some((b) => b.id === 'stunde-100' && b.match === 100))).toBe(true);
  });

  it('across the full hour: end minus start in real minutes, at most 60; hhmm subtraction is the bug', () => {
    const tasks = kind('ueber-stunde');
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      const [a, b] = times(ex.context!);
      expect(valueOf(ex)).toBe(b - a);
      expect(b - a).toBeLessThanOrEqual(60);
      expect(Math.floor(a / 60)).not.toBe(Math.floor(b / 60));
      const hhmm = (t: number) => Math.floor(t / 60) * 100 + (t % 60);
      expect(ex.bugs?.find((x) => x.id === 'stunde-100')?.match).toBe(hhmm(b) - hhmm(a));
    }
  });

  it('backwards: the start plus the duration is the end', () => {
    const tasks = kind('rueckwaerts');
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      const [end] = times(ex.context!);
      const d = Number(ex.context!.match(/dauert (\d+)/)![1]);
      expect(asMinutes(ex) + d).toBe(end);
      expect(d).toBeLessThanOrEqual(60);
    }
  });

  it('forward over the hour and in a quarter or half hour: start plus minutes', () => {
    for (const ex of kind('in-minuten')) {
      const [start] = times(ex.context!);
      expect(asMinutes(ex)).toBe(start + Number(ex.prompt.match(/in (\d+) Minuten/)![1]));
    }
    const quarter = kind('in-viertel');
    expect(quarter.length).toBeGreaterThan(10);
    for (const ex of quarter) {
      const [start] = times(ex.context!);
      expect(asMinutes(ex)).toBe(start + (ex.prompt.includes('halben') ? 30 : 15));
    }
  });

  it('span of more than an hour: the fields add up to end minus start', () => {
    const tasks = kind('laenger');
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      const [start, end] = times(ex.context!);
      expect(asMinutes(ex)).toBe(end - start);
      // never from a full hour: the minutes of the answer would stand in the task
      expect(start % 60, ex.key).not.toBe(0);
      expect(fields(ex)[1], ex.key).not.toBe(end % 60);
    }
  });

  it('Stufe 1 stays in the morning', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(1, ab, 100)) {
        for (const t of times(ex.context ?? '')) expect(t, ex.key).toBeLessThanOrEqual(13 * 60);
      }
    }
  });

  it('converting stays at 100 or below: no 2 h = 120 min, no 3 h = 180 min', () => {
    for (const ex of kind('umrechnen')) {
      expect(valueOf(ex), ex.key).toBeLessThanOrEqual(100);
      expect((ex.expression!.match(/\d+/g) ?? []).every((n) => Number(n) <= 100), ex.key).toBe(true);
    }
  });

  it('60 min = □ h: no hint states the answer', () => {
    const tasks = kind('umrechnen').filter((ex) => ex.key.endsWith(':60 min'));
    expect(tasks.length).toBeGreaterThan(3);
    for (const ex of tasks) {
      for (const h of ex.hints) expect(h, ex.key).not.toMatch(/(?<!\d)1[\s\u00A0]*h\b|eine Stunde/i);
    }
  });

  it('words in the expression can wrap on a phone; a number stays with its unit', () => {
    for (const ex of kind('umrechnen')) {
      if (ex.key.includes(':eine ')) expect(ex.expression, ex.key).toMatch(/^eine \S/);
      else expect(ex.expression, ex.key).not.toMatch(/^\d+ /);
    }
  });

  it('durations fit the event: no Ausflug of 15 minutes, no Training of 4 hours', () => {
    const fits: Record<string, [number, number]> = {
      'Die Pause': [5, 30], 'Das Spiel': [10, 120], 'Das Training': [30, 120], 'Das Fest': [60, 240], 'Das Turnier': [60, 240], 'Der Ausflug': [120, 240],
    };
    const spans = [...kind('spanne'), ...kind('kurz'), ...kind('ueber-stunde'), ...kind('laenger')];
    expect(spans.length).toBeGreaterThan(50);
    for (const ex of spans) {
      const event = Object.keys(fits).find((e) => ex.context!.startsWith(e))!;
      expect(event, ex.key).toBeDefined();
      const a = ex.answer;
      const minutes = a.kind === 'multi' ? asMinutes(ex) : a.kind === 'number' && a.unit === 'min' ? a.value! : valueOf(ex) * 60;
      expect(minutes, ex.key).toBeGreaterThanOrEqual(fits[event][0]);
      expect(minutes, ex.key).toBeLessThanOrEqual(fits[event][1]);
    }
  });

  it('a span of one hour: "ist es 1 Stunde"', () => {
    const one = kind('spanne').filter((ex) => valueOf(ex) === 1);
    expect(one.length).toBeGreaterThan(3);
    for (const ex of one) expect(String(ex.steps[1])).toContain('ist es 1');
  });
});
