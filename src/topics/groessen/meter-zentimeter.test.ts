import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { CTX, samples } from '../test-utils';
import { meterZentimeterSkill } from './meter-zentimeter';

describeSkill(meterZentimeterSkill, { minDistinct: 30 });

const all = STUFEN.flatMap((s: Stufe) => samples(meterZentimeterSkill, s));
const kind = (k: string) => all.filter((ex) => ex.key.includes(`:${k}:`));

/** Length in cm of '2 m 15 cm', '150 cm', '3 m'. */
function lengthCm(text: string): number {
  const meters = /(\d+)[\s ]*m(?![\p{L}])/u.exec(text);
  const centi = /(\d+)[\s ]*cm/.exec(text);
  return (meters ? Number(meters[1]) * 100 : 0) + (centi ? Number(centi[1]) : 0);
}

describe('groessen.meter-zentimeter specifics', () => {
  it('which thing has this length: the other options have the other unit, no estimate between metre-sized things (§6, Stützpunkte)', () => {
    const IN_M = ['Tür', 'Schulbus', 'Auto', 'Turnhalle', 'Klassenraum'];
    const tasks = kind('was-ist');
    expect(tasks.length).toBeGreaterThan(20);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const inMeters = /\d[\s\u00A0]m\b/.test(ex.prompt);
      const { options, correct } = ex.answer;
      options.forEach((o, i) => expect(IN_M.includes(o.label), `${ex.key}: ${o.label}`).toBe(i === correct ? inMeters : !inMeters));
      expect(ex.hints.join(' '), ex.key).not.toMatch(/Stell dir \d/);
    }
  });

  it('lengthCm helper', () => {
    expect(lengthCm('2 m 15 cm')).toBe(215);
    expect(lengthCm('150 cm')).toBe(150);
    expect(lengthCm('3 m')).toBe(300);
  });

  it('conversions: recomputed from the left side', () => {
    const tasks = [...kind('m-zu-cm'), ...kind('gemischt'), ...kind('cm-zu-m')] as Exercise[];
    expect(tasks.length).toBeGreaterThan(30);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'number') continue;
      const left = lengthCm(ex.expression!.split(' = ')[0]);
      expect(ex.answer.unit === 'm' ? ex.answer.value! * 100 : ex.answer.value).toBe(left);
    }
  });

  it('2 m = 20 cm and 2 m 5 cm = 25 cm are the bug "m-cm"', () => {
    const meters = kind('m-zu-cm');
    for (const ex of meters) {
      if (ex.answer.kind === 'number') expect(ex.bugs?.[0]?.match).toBe(ex.answer.value! / 10);
    }
    const twoFive = kind('gemischt').filter((ex) => ex.answer.kind === 'number' && ex.answer.value! % 100 < 10);
    expect(twoFive.length).toBeGreaterThan(0);
    for (const ex of twoFive) {
      if (ex.answer.kind !== 'number') continue;
      const m = Math.floor(ex.answer.value! / 100);
      const rest = ex.answer.value! % 100;
      expect(ex.bugs?.some((b) => b.match === m * 10 + rest)).toBe(true);
    }
  });

  it('order: the correct order is sorted by the real length', () => {
    const orders = all.filter((ex) => ex.answer.kind === 'order');
    expect(orders.length).toBeGreaterThan(20);
    for (const ex of orders) {
      if (ex.answer.kind !== 'order') continue;
      const { items, correct, direction } = ex.answer;
      const values = correct.map((i) => lengthCm(items[i]));
      expect(values).toEqual([...values].sort((a, b) => (direction === 'aufsteigend' ? a - b : b - a)));
      expect(ex.stufe, ex.key).toBe(3);
      expect(items.length).toBe(ex.ab + 2);
      for (const b of ex.bugs ?? []) expect(b.id).toBe('m-cm');
    }
  });

  it('order: always mixed, at least one length with metres and one only in cm, so that converting is needed', () => {
    const orders = all.filter((ex) => ex.answer.kind === 'order');
    expect(orders.length).toBeGreaterThan(20);
    for (const ex of orders) {
      if (ex.answer.kind !== 'order') continue;
      const withMeters = ex.answer.items.filter((label) => /\d\s*m(?![\p{L}])/u.test(label));
      expect(withMeters.length, ex.key).toBeGreaterThan(0);
      expect(withMeters.length, ex.key).toBeLessThan(ex.answer.items.length);
    }
  });

  it('a choice between things: no hint names the right thing, unless the task does', () => {
    const tasks = all.filter((ex) => ex.answer.kind === 'choice');
    expect(tasks.some((ex) => ex.key.endsWith(':bezug:cm'))).toBe(true);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const thing = ex.answer.options[ex.answer.correct].label.split(' ').pop()!;
      if (!/^\p{L}{3,}$/u.test(thing) || `${ex.context} ${ex.prompt}`.includes(thing)) continue;
      for (const h of ex.hints) expect(h, ex.key).not.toContain(thing);
    }
  });

  it('compare: the sign fits the lengths', () => {
    const tasks = kind('vergleich');
    expect(tasks.length).toBeGreaterThan(10);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') continue;
      const [left, right] = ex.expression!.split(' □ ').map(lengthCm);
      const sign = left < right ? '<' : left > right ? '>' : '=';
      expect(ex.answer.options[ex.answer.correct].label).toBe(sign);
    }
  });

  it('missing to 1 m: 100 minus the length', () => {
    for (const ex of kind('bis-meter')) {
      if (ex.answer.kind === 'number') expect(ex.answer.value).toBe(100 - lengthCm(ex.context!));
    }
  });

  it('lengths stay at 2 m 50 cm or below, as the number range ends at 100 and 2 m 15 cm is the one exception', () => {
    for (const ex of ['m-zu-cm', 'gemischt', 'cm-zu-m', 'ordnen', 'vergleich'].flatMap(kind)) {
      const texts = [ex.expression ?? '', ...(ex.answer.kind === 'order' ? ex.answer.items : []), ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))];
      for (const t of texts) {
        for (const part of t.split(/[=<>+−]|In Zentimetern:/)) expect(lengthCm(part), `${ex.key}: ${t}`).toBeLessThanOrEqual(250);
      }
      if (ex.answer.kind === 'number' && ex.answer.unit === 'cm') expect(ex.answer.value, ex.key).toBeLessThanOrEqual(250);
    }
  });

  const atAb = (stufe: Stufe, ab: Ab, n = 300) => Array.from({ length: n }, (_, i) => meterZentimeterSkill.generate(createRng(i * 577 + 3), stufe, { ...CTX, ab }));

  it('the Stufe chooses the content, the AB the demand inside it', () => {
    const forms = (stufe: Stufe, ab: Ab) => new Set(atAb(stufe, ab).map((ex) => ex.key.split(':')[2]));
    expect(forms(1, 1)).toEqual(new Set(['einheit', 'messen']));
    expect(forms(1, 2)).toEqual(new Set(['was-ist', 'bezug']));
    expect(forms(1, 3)).toEqual(new Set(['stimmt', 'nicht-messen']));
    expect(forms(2, 1)).toEqual(new Set(['gemischt', 'satz', 'm-zu-cm', 'cm-zu-m']));
    expect(forms(2, 2)).toEqual(new Set(['gemischt', 'bis-meter']));
    expect(forms(2, 3)).toEqual(new Set(['zerlegen', 'luecke', 'bis-zwei']));
    expect(forms(3, 1)).toEqual(new Set(['sinnvoll', 'ordnen']));
    expect(forms(3, 2)).toEqual(new Set(['ordnen', 'vergleich']));
    expect(forms(3, 3)).toEqual(new Set(['ordnen', 'dazwischen', 'unsinn']));
  });

  it('Stufe 2: AB I has round centimetres only, AB II any', () => {
    const valueOf = (e: Exercise) => (e.answer.kind === 'number' ? (e.answer.value as number) : NaN);
    for (const ex of atAb(2, 1).filter((e) => e.key.includes(':gemischt:'))) expect(valueOf(ex) % 10, ex.key).toBe(0);
    expect(atAb(2, 2).some((e) => e.key.includes(':gemischt:') && valueOf(e) % 10 !== 0)).toBe(true);
  });

  it('a sentence with a unit: it holds only with the unit of the thing', () => {
    const IN_M = ['Tür', 'Schulbus', 'Auto', 'Turnhalle', 'Klassenraum'];
    const tasks = atAb(1, 3).filter((e) => e.key.includes(':stimmt:'));
    expect(tasks.length).toBeGreaterThan(50);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const [thing, unit] = ex.key.split(':').slice(3);
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe((unit === 'm') === IN_M.includes(thing) ? 'Stimmt' : 'Stimmt nicht');
    }
  });

  it('not in this unit: the right thing has the other unit, the wrong ones this unit', () => {
    const IN_M = ['Tür', 'Schulbus', 'Auto', 'Turnhalle', 'Klassenraum'];
    const tasks = atAb(1, 3).filter((e) => e.key.includes(':nicht-messen:'));
    expect(tasks.length).toBeGreaterThan(50);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const inCm = ex.key.includes(':nicht-messen:cm:');
      ex.answer.options.forEach((o, i) => expect(IN_M.includes(o.label) === inCm, `${ex.key}: ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  it('the other way round: 215 cm = □ m □ cm, a gap, and how much to 2 m, recomputed', () => {
    const list = atAb(2, 3, 500);
    const parts = list.filter((e) => e.key.includes(':zerlegen:'));
    expect(parts.length).toBeGreaterThan(50);
    for (const ex of parts) {
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      const [meters, rest] = ex.answer.fields.map((f) => f.value);
      expect(meters * 100 + rest, ex.key).toBe(Number(ex.key.split(':').pop()));
      expect(rest, ex.key).toBeLessThan(100);
    }
    const gaps = list.filter((e) => e.key.includes(':luecke:'));
    expect(gaps.length).toBeGreaterThan(50);
    for (const ex of gaps) expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(Number(ex.key.split(':').pop()) % 100);
    const toTwo = list.filter((e) => e.key.includes(':bis-zwei:'));
    expect(toTwo.length).toBeGreaterThan(50);
    for (const ex of toTwo) expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(200 - lengthCm(ex.context!));
  });

  it('between: only the right length lies between the two, in centimetres', () => {
    const tasks = atAb(3, 3, 500).filter((e) => e.key.includes(':dazwischen:'));
    expect(tasks.length).toBeGreaterThan(50);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const [low, high] = ex.key.split(':').slice(3, 5).map(Number);
      ex.answer.options.forEach((o, i) => {
        const v = lengthCm(o.label);
        expect(v > low && v < high, `${ex.key}: ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct);
      });
    }
  });

  it('which sentence cannot hold: the right one has the other unit of the thing', () => {
    const tasks = atAb(3, 3, 500).filter((e) => e.key.includes(':unsinn:'));
    expect(tasks.length).toBeGreaterThan(50);
    for (const ex of tasks) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const thing = ex.key.split(':')[3];
      const label = ex.answer.options[ex.answer.correct].label;
      expect(label, ex.key).toContain(thing);
      expect(/[\s\u00A0]m /.test(label), ex.key).toBe(!['Tür', 'Schulbus', 'Auto', 'Turnhalle', 'Klassenraum'].includes(thing));
    }
  });

  it('Stufe 2, AB I: no handful of facts fills the cell, the length in a sentence is the same conversion', () => {
    const list = atAb(2, 1, 400);
    expect(new Set(list.map((e) => e.key)).size).toBeGreaterThan(40);
    expect(list.filter((e) => /:(m-zu-cm|cm-zu-m):/.test(e.key)).length / list.length).toBeLessThan(0.3);
    for (const ex of list.filter((e) => e.key.includes(':satz:'))) {
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(lengthCm(ex.context!));
      expect((ex.answer as { value: number }).value % 10, ex.key).toBe(0);
    }
  });

  it('plausible sizes on Stufe 3: many things, also in the other form; the right size is written either way', () => {
    const list = Array.from({ length: 1500 }, (_, i) => meterZentimeterSkill.generate(createRng(i * 577 + 3), 3, { ...CTX, ab: 1 })).filter((e) => e.key.includes(':sinnvoll:'));
    expect(new Set(list.map((e) => e.prompt)).size).toBeGreaterThanOrEqual(12);
    expect(new Set(list.map((e) => e.key)).size).toBeGreaterThanOrEqual(16);
    expect(list.length / 1500).toBeLessThan(0.45);
    const door = new Set(list.filter((e) => e.prompt.includes('Tür') && e.answer.kind === 'choice').map((e) => (e.answer.kind === 'choice' ? e.answer.options[e.answer.correct].label : '')));
    expect(door).toEqual(new Set(['2 m', '200 cm']));
    for (const ex of list) {
      const answer = ex.answer;
      if (answer.kind !== 'choice') throw new Error(ex.key);
      expect(answer.options.length, ex.key).toBe(4);
      const right = lengthCm(answer.options[answer.correct].label);
      answer.options.forEach((o, i) => { if (i !== answer.correct) expect(lengthCm(o.label), `${ex.key}: ${o.label}`).not.toBe(right); });
    }
  });

  it('no text speaks of strips that are not on the screen', () => {
    for (const ex of all) {
      if (ex.visual?.type === 'ruler') continue;
      for (const t of [...ex.hints, ...ex.steps.map(String), ...(ex.bugs ?? []).map((b) => b.hint)]) expect(t, ex.key).not.toMatch(/Streifen/);
    }
  });

  it('100 cm = □ m: no hint and no bug hint states the answer', () => {
    const one = kind('cm-zu-m').filter((ex) => ex.key.endsWith(':cm-zu-m:1'));
    expect(one.length).toBeGreaterThan(5);
    for (const ex of one) {
      for (const h of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(h, ex.key).not.toMatch(/(?<!\d)1[\s\u00A0]*m(?![\p{L}])|ein(en)? Meter/iu);
    }
  });
});
