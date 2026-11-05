import { describe, expect, it } from 'vitest';
import { assertAnswerLimits, assertWellFormedExercise, assertWellFormedVisual, revealedAnswers } from './testing';
import type { Exercise, SkillDef, Visual } from './types';

const skill = { id: 'zahlen.test', topicId: 'zahlen', title: 'Test', description: 'Test.', stufen: { 1: 'a', 2: 'b', 3: 'c' }, kmk: ['ZO.zahlraum'] } as unknown as SkillDef;
const ex = (patch: Partial<Exercise> = {}): Exercise => ({
  key: 'zahlen.test:1:x',
  topicId: 'zahlen',
  skillId: 'zahlen.test',
  stufe: 1,
  ab: 1,
  prompt: 'Rechne.',
  expression: '34 + 8 = □',
  answer: { kind: 'number', value: 42 },
  hints: ['Rechne erst bis zum nächsten Zehner.'],
  steps: ['34 + 6 = 40', '40 + 2 = 42'],
  praise: 'Du bist erst zum Zehner gegangen.',
  srText: '34 plus 8',
  kmk: ['ZO.strategien'],
  ...patch,
});
const check = (patch: Partial<Exercise>, stufe: 1 | 2 | 3 = 1) => () => assertWellFormedExercise(skill, stufe, ex({ stufe, key: `zahlen.test:${stufe}:x`, ...patch }));
const option = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `Wort ${i + 1}` }));

describe('assertWellFormedExercise: text rules', () => {
  it('accepts a task that keeps them', () => {
    expect(check({})).not.toThrow();
  });
  it('T1, T2: word limits, the story limits for exercises with context', () => {
    expect(check({ prompt: 'Schau dir dieses Bild ganz genau an und rechne dann die Aufgabe im Kopf aus.' })).toThrow(/T1/);
    expect(check({ context: 'Mia hat 34 Karten.', prompt: 'Tom gibt ihr 8 Karten. Wie viele sind es?' })).not.toThrow();
    expect(check({ context: 'Mia hat heute 34 Karten. Tom gibt ihr noch einmal 8 Karten dazu.', prompt: 'Wie viele Karten hat Mia jetzt dann genau?', expression: undefined })).toThrow(/T2/);
  });
  it('T3, T4, T5', () => {
    expect(check({ context: 'Mia hat 3. Tom hat 2. Ben hat 4.', prompt: 'Wie viele?' })).toThrow(/T3/);
    expect(check({ context: 'Mia und Tom und Ben und Ida und Lea spielen hier.', prompt: 'Wer fehlt?', expression: undefined })).toThrow(/T4/);
    expect(check({ prompt: 'Rechne, weil es Spaß macht.' })).toThrow(/T5/);
  });
  it('T15 and the "count again" hint', () => {
    expect(check({ hints: ['Eins. Zwei. Drei.'] })).toThrow(/T15/);
    expect(check({ praise: 'Du hast wirklich an alle Zehner und auch an alle Einer gedacht.' })).toThrow(/T15/);
    expect(check({ steps: ['a', 'b', 'c', 'd'] })).toThrow(/T15/);
    expect(check({ bugs: [{ id: 'x', match: 41, hint: 'Zähl noch einmal.' }] })).toThrow(/count again/);
  });
  it('hints do not state an answer of 10 or more, unless the task shows that number', () => {
    expect(check({ hints: ['Das Ergebnis ist 42.'] })).toThrow(/reveals answer 42/);
    expect(check({ hints: ['Die Zahl 142 hilft nicht.'] })).not.toThrow();
    expect(revealedAnswers(ex({ expression: '42 − 0 = □', hints: ['Von 42 bleibt alles.'] }))).toEqual([]);
    expect(revealedAnswers(ex({ answer: { kind: 'number', value: 7 }, hints: ['Es sind 7.'] }))).toEqual([]);
    expect(revealedAnswers(ex({ answer: { kind: 'choice', options: [{ label: '42' }, { label: '24', whyWrong: 'Schau auf die Zehner.' }], correct: 0 }, hints: ['Es sind 42.'] }))).toHaveLength(1);
  });
  it('no comma notation', () => {
    expect(check({ context: 'Mia zahlt 3,50 €.', prompt: 'Wie viel?' })).toThrow(/comma/);
  });
  it('factKey must be a tracked fact', () => {
    expect(check({ factKey: '3x7' })).toThrow(/factKey/);
    expect(check({ factKey: '2x7' })).not.toThrow();
  });
});

describe('answer limits', () => {
  it('choice: 4 options on Stufe 1 and 2, 6 on Stufe 3', () => {
    const choice = (n: number) => ({ kind: 'choice', options: option(n), correct: 0 }) as const;
    expect(() => assertAnswerLimits(choice(4), 2)).not.toThrow();
    expect(() => assertAnswerLimits(choice(5), 2)).toThrow();
    expect(() => assertAnswerLimits(choice(6), 3)).not.toThrow();
    expect(() => assertAnswerLimits(choice(7), 3)).toThrow();
  });
  it('order: 5 items, multi: 3 fields, "Nicht lösbar" on Stufe 3', () => {
    expect(() => assertAnswerLimits({ kind: 'order', items: ['1', '2', '3', '4', '5', '6'], correct: [0, 1, 2, 3, 4, 5], direction: 'aufsteigend' }, 3)).toThrow();
    const field = (id: string) => ({ id, value: 1 });
    expect(() => assertAnswerLimits({ kind: 'multi', fields: ['a', 'b', 'c'].map(field) }, 3)).not.toThrow();
    expect(() => assertAnswerLimits({ kind: 'multi', fields: ['a', 'b', 'c', 'd'].map(field) }, 3)).toThrow();
    expect(() => assertAnswerLimits({ kind: 'number', value: null, offerUnsolvable: true }, 2)).toThrow();
    expect(() => assertAnswerLimits({ kind: 'number', value: null, offerUnsolvable: true }, 3)).not.toThrow();
  });
});

describe('assertWellFormedVisual: Klasse 2', () => {
  const ok: Visual[] = [
    { type: 'field', size: 20, filled: 8, second: 5, split: { afterCol: 5 } },
    { type: 'baseTen', tens: 2, ones: 14 },
    { type: 'hundredChart', piece: [24, 34, 35], masked: [35] },
    { type: 'numberLine', min: 30, max: 50, majorStep: 5, minorStep: 1, labelMajor: true, jumps: [{ from: 35, to: 40 }] },
    { type: 'dotArray', groups: [4, 4, 4] },
    { type: 'dotArray', rows: 3, cols: 5, splitAfterCol: 2 },
    { type: 'ruler', maxCm: 15, startCm: 3, lengthCm: 6, minCm: 2 },
    { type: 'clock', hours: 8, minutes: 30 },
    { type: 'money', items: [10000, 200, 1] },
    { type: 'placeValue', columns: ['Z', 'E'], rows: [{ values: [2, 14] }] },
    { type: 'shape', shape: 'quadrat', rotate: 45 },
    { type: 'shapeRow', items: [{ shape: 'kreis', color: 'rot' }, {}] },
  ];
  it.each(ok.map((v) => [v.type, v] as const))('%s: accepts a fitting one', (_n, v) => {
    expect(() => assertWellFormedVisual(v)).not.toThrow();
  });
  const bad: [string, Visual][] = [
    ['field overfull', { type: 'field', size: 20, filled: 15, second: 6 }],
    ['field split', { type: 'field', size: 20, filled: 1, split: { afterRow: 2 } }],
    ['baseTen above 100', { type: 'baseTen', tens: 9, ones: 5, second: { tens: 1, mode: 'dazu' } }],
    ['baseTen crossed', { type: 'baseTen', tens: 1, ones: 1, second: { ones: 2, mode: 'weg' } }],
    ['chart cell', { type: 'hundredChart', masked: [101] }],
    ['chart piece apart', { type: 'hundredChart', piece: [11, 13] }],
    ['chart mask outside piece', { type: 'hundredChart', piece: [11, 12], masked: [20] }],
    ['number line above 100', { type: 'numberLine', min: 0, max: 1000, majorStep: 100, minorStep: 100, labelMajor: true }],
    ['jump outside', { type: 'numberLine', min: 0, max: 10, majorStep: 1, minorStep: 1, labelMajor: true, jumps: [{ from: 5, to: 12 }] }],
    ['dots', { type: 'dotArray', rows: 11, cols: 2 }],
    ['ruler object', { type: 'ruler', maxCm: 10, startCm: 8, lengthCm: 5 }],
    ['ruler before its start', { type: 'ruler', maxCm: 10, minCm: 3, startCm: 1, lengthCm: 2 }],
    ['clock minute', { type: 'clock', hours: 8, minutes: 7 }],
    ['200 € note', { type: 'money', items: [20000] }],
  ];
  it.each(bad)('%s: rejects it', (_n, v) => {
    expect(() => assertWellFormedVisual(v)).toThrow();
  });
  it('the clock shows halves at level 1, quarters at level 2, five minutes at level 3', () => {
    const clock = (minutes: number): Visual => ({ type: 'clock', hours: 3, minutes });
    expect(() => assertWellFormedVisual(clock(30), 1)).not.toThrow();
    expect(() => assertWellFormedVisual(clock(15), 1)).toThrow();
    expect(() => assertWellFormedVisual(clock(15), 2)).not.toThrow();
    expect(() => assertWellFormedVisual(clock(25), 2)).toThrow();
    expect(() => assertWellFormedVisual(clock(25), 3)).not.toThrow();
  });
});
