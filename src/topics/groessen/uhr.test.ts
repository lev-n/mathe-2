import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe, Visual } from '../../core/types';
import { STUFEN } from '../../core/types';
import { fmtTime } from '../../core/format';
import { createRng } from '../../core/rng';
import { CTX, samples } from '../test-utils';
import { spoken } from './helpers';
import { uhrSkill } from './uhr';

describeSkill(uhrSkill, { minDistinct: 30 });

const atAb = (stufe: Stufe, ab: Ab, n = 200): Exercise[] =>
  Array.from({ length: n }, (_, i) => uhrSkill.generate(createRng(i * 5101 + 11), stufe, { ...CTX, ab }));
const clockOf = (v?: Visual) => (v?.type === 'clock' ? v : null);

const everyAb = STUFEN.flatMap((s: Stufe) => [1, 2, 3].flatMap((ab) => atAb(s, ab as Ab, 100)));

describe('groessen.uhr specifics', () => {
  it('a time in words: each wrong option gets its own meaning; the nach-vor rule only if it has the other word', () => {
    const tasks = atAb(3, 2, 400).filter((ex) => ex.key.includes(':name:'));
    expect(tasks.length).toBeGreaterThan(30);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const m = Number(ex.key.match(/name:\d+:(\d+)/)![1]);
      for (const o of ex.answer.options) {
        if (!o.whyWrong) continue;
        expect(o.whyWrong, ex.key).toContain(`${o.label} ist `);
        const other = (m < 30 && /^\p{L}+ vor /u.test(o.label)) || (m > 30 && /^\p{L}+ nach /u.test(o.label));
        expect(/sagst du/.test(o.whyWrong), `${ex.key}: ${o.label}`).toBe(other);
      }
    }
  });

  it('the Stufe chooses the content at every AB: Stufe 1 full and half hours, Stufe 2 quarters, Stufe 3 five-minute steps (§2.2, F16)', () => {
    const allowed: Record<Stufe, (m: number) => boolean> = {
      1: (m) => m === 0 || m === 30,
      2: (m) => m === 15 || m === 45,
      3: (m) => m % 5 === 0 && m % 15 !== 0,
    };
    const minuteOf = /(?:lesen|name|waehle|schreiben|stimmt|zeiger|zahl):\d+:(\d+)/;
    for (const ex of everyAb) {
      const inKey = ex.key.match(minuteOf);
      const minutes = [inKey ? Number(inKey[1]) : undefined, clockOf(ex.visual)?.minutes, ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => clockOf(o.visual)?.minutes) : [])];
      for (const m of minutes) if (m !== undefined && inKey) expect(allowed[ex.stufe](m) || !clockOf(ex.visual) || m !== clockOf(ex.visual)!.minutes, `${ex.key}: minute ${m}`).toBe(true);
      if (inKey) expect(allowed[ex.stufe](Number(inKey[1])), ex.key).toBe(true);
    }
    // a wrong clock of Stufe 1 and 2 stays inside the Stufe too
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ex of samples(uhrSkill, stufe, 500)) {
        if (ex.answer.kind === 'choice') for (const o of ex.answer.options) if (clockOf(o.visual)) expect(allowed[stufe](clockOf(o.visual)!.minutes) || stufe === 1, ex.key).toBe(true);
        if (stufe === 1) expect(`${ex.prompt} ${ex.hints.join(' ')}`, ex.key).not.toMatch(/Viertel/);
      }
    }
  });

  it('the AB varies the demand inside the Stufe', () => {
    const forms = (stufe: Stufe, ab: Ab) => new Set(atAb(stufe, ab, 300).map((ex) => ex.key.split(':')[2]));
    expect(forms(1, 1)).toEqual(new Set(['lesen', 'name']));
    expect(forms(1, 2)).toEqual(new Set(['lesen', 'waehle']));
    expect(forms(1, 3)).toEqual(new Set(['schreiben', 'stimmt', 'zeiger']));
    expect(forms(2, 1)).toEqual(new Set(['lesen', 'name']));
    expect(forms(2, 2)).toEqual(new Set(['lesen', 'name', 'waehle']));
    expect(forms(2, 3)).toEqual(new Set(['schreiben', 'stimmt', 'zeiger']));
    expect(forms(3, 1)).toEqual(new Set(['lesen', 'waehle']));
    expect(forms(3, 2)).toEqual(new Set(['lesen', 'name']));
    expect(forms(3, 3)).toEqual(new Set(['waehle', 'zahl', 'minuten', 'stimmt']));
    // reading on Stufe 1 and 2: the easier minute on AB I, the harder on AB II
    const readMinutes = (stufe: Stufe, ab: Ab) => new Set(atAb(stufe, ab, 300).filter((ex) => ex.key.includes(':lesen:')).map((ex) => clockOf(ex.visual)!.minutes));
    expect(readMinutes(1, 1)).toEqual(new Set([0]));
    expect(readMinutes(1, 2)).toEqual(new Set([30]));
    expect(readMinutes(2, 1)).toEqual(new Set([15]));
    expect(readMinutes(2, 2)).toEqual(new Set([45]));
  });

  it('from words to digits: the fields are the time the words mean', () => {
    const tasks = everyAb.filter((ex) => ex.key.includes(':schreiben:'));
    expect(tasks.length).toBeGreaterThan(10);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      const [h, m] = ex.answer.fields.map((f) => f.value);
      expect(ex.prompt.toLowerCase(), ex.key).toContain(spoken(h, m).toLowerCase());
      expect(ex.prompt, ex.key).not.toContain(`${h}:`);
    }
  });

  it('the place of the long hand: the right word, and no hint says it', () => {
    const place: Record<number, string> = { 0: 'oben', 15: 'rechts', 30: 'unten', 45: 'links' };
    const tasks = everyAb.filter((ex) => ex.key.includes(':zeiger:'));
    expect(tasks.length).toBeGreaterThan(10);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const m = Number(ex.key.split(':').pop());
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(place[m]);
      for (const h of ex.hints) expect(h, ex.key).not.toContain(place[m]);
    }
  });

  it('a sentence about a clock: the answer compares the sentence and the hands', () => {
    const tasks = [...atAb(1, 3, 300), ...atAb(2, 3, 300), ...atAb(3, 3, 300)].filter((ex) => ex.key.includes(':stimmt:'));
    expect(tasks.length).toBeGreaterThan(50);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const c = clockOf(ex.visual)!;
      const said = ex.stufe === 3 ? fmtTime(c.hours, c.minutes) : spoken(c.hours, c.minutes);
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(ex.context!.includes(`Es ist ${said}.`) ? 'Stimmt' : 'Stimmt nicht');
    }
  });

  it('the long hand as a number and as minutes: 5 minutes per number', () => {
    const list = atAb(3, 3, 500);
    const numbers = list.filter((ex) => ex.key.includes(':zahl:'));
    expect(numbers.length).toBeGreaterThan(30);
    for (const ex of numbers) {
      const m = Number(ex.key.split(':').pop());
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(m / 5);
      expect(ex.bugs?.find((b) => b.id === 'minuten-zahl')?.match, ex.key).toBe(m);
    }
    const minutes = list.filter((ex) => ex.key.includes(':minuten:'));
    expect(minutes.length).toBeGreaterThan(30);
    for (const ex of minutes) expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(Number(ex.key.split(':').pop()) * 5);
  });

  it('reading: the fields are the time on the clock', () => {
    const tasks = everyAb.filter((ex) => ex.key.includes(':lesen:'));
    expect(tasks.length).toBeGreaterThan(50);
    for (const ex of tasks) {
      const c = clockOf(ex.visual);
      if (ex.answer.kind !== 'multi' || !c) throw new Error(ex.key);
      expect(ex.answer.fields.map((f) => f.value)).toEqual([c.hours, c.minutes]);
      expect(c.showDigital).toBeFalsy();
    }
  });

  it('naming: the right words belong to the clock; full and half hours show the digital time, quarters analog only', () => {
    const tasks = everyAb.filter((ex) => ex.key.includes(':name:'));
    expect(tasks.length).toBeGreaterThan(50);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const [, h, m] = ex.key.match(/name:(\d+):(\d+)/)!.map(Number);
      expect(ex.answer.options[ex.answer.correct].label.toLowerCase()).toBe(spoken(h, m).toLowerCase());
      if (m % 30 === 0) expect(clockOf(ex.visual)?.showDigital).toBe(true);
      if (m % 15 === 0 && m % 30 !== 0 && ex.visual) expect(clockOf(ex.visual)?.showDigital).toBeFalsy();
    }
  });

  it('picking a clock: only the right clock shows the time, and the clocks differ', () => {
    const tasks = everyAb.filter((ex) => ex.key.includes(':waehle:'));
    expect(tasks.length).toBeGreaterThan(50);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const [, h, m] = ex.key.match(/waehle:(\d+):(\d+)/)!.map(Number);
      expect(ex.answer.options.length).toBeGreaterThanOrEqual(3);
      const times = ex.answer.options.map((o) => `${clockOf(o.visual)!.hours}:${clockOf(o.visual)!.minutes}`);
      expect(new Set(times).size).toBe(times.length);
      expect(times[ex.answer.correct]).toBe(`${h}:${m}`);
    }
  });

  it('"halb vier" as 4:30 and swapped hands are bugs', () => {
    const half = atAb(1, 2, 400).filter((ex) => ex.key.includes(':lesen:') && clockOf(ex.visual)?.minutes === 30);
    expect(half.length).toBeGreaterThan(5);
    for (const ex of half) {
      const c = clockOf(ex.visual)!;
      const bug = ex.bugs?.find((b) => b.id === 'halb-uhr');
      expect(bug?.match).toEqual({ h: c.hours === 12 ? 1 : c.hours + 1, min: 30 });
      expect(bug?.hint).toMatch(/^Halb \p{L}+ heißt: noch eine halbe Stunde bis \p{L}+\.$/u);
    }
    const quarters = atAb(2, 2, 400).filter((ex) => ex.key.includes(':lesen:'));
    expect(quarters.some((ex) => ex.bugs?.some((b) => b.id === 'viertel-richtung'))).toBe(true);
    expect(quarters.some((ex) => ex.bugs?.some((b) => b.id === 'zeiger-getauscht'))).toBe(true);
  });

  it('picking a clock: the feedback describes the clock the child picked, not the clock of the task', () => {
    const tasks = everyAb.filter((ex) => ex.key.includes(':waehle:'));
    const said = { oben: 0, unten: 30, rechts: 15, links: 45 } as Record<string, number>;
    let checked = 0;
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const m = Number(ex.key.match(/waehle:\d+:(\d+)/)![1]);
      for (const o of ex.answer.options) {
        if (!o.whyWrong) continue;
        const minutes = clockOf(o.visual)!.minutes;
        const where = o.whyWrong.match(/steht (?:hier )?(oben|unten|rechts|links)/)?.[1];
        const shown = o.whyWrong.match(/zeigt hier (\d+) Minuten/)?.[1];
        if (where) expect(minutes, `${ex.key}: ${o.whyWrong}`).toBe(said[where]);
        if (shown) expect(minutes, `${ex.key}: ${o.whyWrong}`).toBe(Number(shown));
        if (o.whyWrong.includes('passt')) expect(minutes, `${ex.key}: ${o.whyWrong}`).toBe(m);
        checked += where || shown ? 1 : 0;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('the hour 1 reads "ein Uhr", also in the Viertel hints', () => {
    for (const ex of everyAb) {
      const whyWrong = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.whyWrong ?? '') : [];
      for (const t of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...whyWrong]) expect(t, ex.key).not.toMatch(/eins Uhr/);
    }
    const one = everyAb.filter((ex) => ex.key.includes(':lesen:1:') && clockOf(ex.visual)?.minutes === 15);
    expect(one.some((ex) => ex.bugs?.some((b) => b.hint.includes('nach ein Uhr')))).toBe(true);
  });

  it('praise names what the child did: reading 2:30 keeps the current hour', () => {
    for (const ex of everyAb) {
      expect(ex.praise, ex.key).not.toMatch(/nächste Stunde/);
      if (ex.key.includes(':lesen:')) expect(ex.praise, ex.key).not.toMatch(/vor und nach/);
    }
  });

  it('Stufe 3 at every AB: the time of the task is a five-minute step, never a half or quarter hour', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of atAb(3, ab, 300)) {
        const c = clockOf(ex.visual);
        if (c) expect(c.minutes % 15, ex.key).not.toBe(0);
        const m = /:(?:lesen|name|waehle|stimmt|zahl):\d+:(\d+)/.exec(ex.key);
        if (m) expect(Number(m[1]) % 15, ex.key).not.toBe(0);
      }
    }
    // the harder steps stay in: reading 25 and 35 on AB II
    const read = atAb(3, 2, 400).filter((ex) => ex.key.includes(':lesen:')).map((ex) => clockOf(ex.visual)!.minutes);
    expect(read).toContain(25);
    expect(read).toContain(35);
  });

  it('praise about a hand only where a clock is on the screen or the task names the hand', () => {
    const clockShown = (ex: Exercise) => !!ex.visual || (ex.answer.kind === 'choice' && ex.answer.options.some((o) => o.visual));
    const lists = [...everyAb, ...atAb(3, 2, 300)];
    expect(lists.some((ex) => ex.key.includes(':name:') && ex.stufe === 3)).toBe(true);
    for (const ex of lists) {
      if (clockShown(ex) || /Zeiger/.test(`${ex.context} ${ex.prompt}`)) continue;
      expect(ex.praise, ex.key).not.toMatch(/Zeiger/);
    }
  });

  it('srText carries the hands, so the answer field alone is enough for a screen reader', () => {
    for (const ex of everyAb) {
      if (ex.visual) expect(ex.srText, ex.key).toMatch(/kurze Zeiger .*lange Zeiger/);
    }
    const c = everyAb.find((ex) => ex.key.includes(':lesen:') && clockOf(ex.visual)?.minutes === 30)!;
    expect(c.srText).toContain(`zwischen der ${clockOf(c.visual)!.hours}`);
    expect(c.srText).toContain('auf die 6');
  });
});
