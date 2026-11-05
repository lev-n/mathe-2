import { describe, expect, it } from 'vitest';
import { checkAnswer, correctResponse, formatAnswer, isEmptyResponse, responseForBug } from './check';
import { childTextProblems } from './textRules';
import type { Answer, Bug } from './types';

describe('checkAnswer: number', () => {
  const answer: Answer = { kind: 'number', value: 47 };
  const bugs: Bug[] = [{ id: 'zahlendreher', match: 74, hint: 'Schau zuerst auf die Zehner.' }];
  it('accepts every notation of the correct value', () => {
    for (const text of ['47', ' 47 ', '4 7', '047']) {
      expect(checkAnswer(answer, { kind: 'number', text }).correct).toBe(true);
    }
  });
  it('returns a targeted hint for a known bug', () => {
    const r = checkAnswer(answer, { kind: 'number', text: '74' }, bugs);
    expect(r).toEqual({ correct: false, bugHint: 'Schau zuerst auf die Zehner.', bugId: 'zahlendreher' });
  });
  it('reports no bug id for a wrong answer that matches no bug', () => {
    const r = checkAnswer(answer, { kind: 'number', text: '48' }, bugs);
    expect(r.correct).toBe(false);
    expect(r.bugId).toBeUndefined();
  });
  it('treats unreadable input as invalid, not wrong', () => {
    const r = checkAnswer(answer, { kind: 'number', text: '4,7' });
    expect(r.correct).toBe(false);
    expect(r.invalid).toBeTruthy();
  });
  it('handles the "Nicht lösbar" option', () => {
    const money: Answer = { kind: 'number', value: 35, unit: '€' };
    expect(checkAnswer(money, { kind: 'number', text: '35' }).correct).toBe(true);
    expect(checkAnswer(money, { kind: 'number', text: '', unsolvable: true }).correct).toBe(false);
    const unsolvable: Answer = { kind: 'number', value: null, offerUnsolvable: true };
    expect(checkAnswer(unsolvable, { kind: 'number', text: '', unsolvable: true }).correct).toBe(true);
    expect(checkAnswer(unsolvable, { kind: 'number', text: '12' }).correct).toBe(false);
  });
});

describe('checkAnswer: choice, multi, order', () => {
  it('choice returns whyWrong', () => {
    const a: Answer = { kind: 'choice', options: [{ label: '<' }, { label: '>', whyWrong: 'Vergleiche zuerst die höchste Stelle.' }, { label: '=' }], correct: 0, layout: 'symbols' };
    expect(checkAnswer(a, { kind: 'choice', index: 0 }).correct).toBe(true);
    expect(checkAnswer(a, { kind: 'choice', index: 1 }).bugHint).toMatch(/höchste Stelle/);
    expect(checkAnswer(a, { kind: 'choice', index: -1 }).invalid).toBeTruthy();
  });
  it('multi reports per-field correctness and bug matches', () => {
    const a: Answer = { kind: 'multi', fields: [{ id: 'e', value: 3, after: '€' }, { id: 'ct', value: 45, after: 'ct' }] };
    const bugs: Bug[] = [{ id: 'swap', match: { e: 45, ct: 3 }, hint: 'Euro kommen vor dem Komma.' }];
    expect(checkAnswer(a, { kind: 'multi', values: { e: '3', ct: '45' } }).correct).toBe(true);
    const r = checkAnswer(a, { kind: 'multi', values: { e: '3', ct: '4' } }, bugs);
    expect(r.fieldCorrect).toEqual({ e: true, ct: false });
    expect(checkAnswer(a, { kind: 'multi', values: { e: '45', ct: '3' } }, bugs).bugHint).toMatch(/Euro/);
    expect(checkAnswer(a, { kind: 'multi', values: { e: '', ct: '45' } }).invalid).toBeTruthy();
  });
  it('order compares the sequence', () => {
    const a: Answer = { kind: 'order', items: ['30', '10', '20'], correct: [1, 2, 0], direction: 'aufsteigend' };
    expect(checkAnswer(a, { kind: 'order', order: [1, 2, 0] }).correct).toBe(true);
    expect(checkAnswer(a, { kind: 'order', order: [2, 1, 0] }).correct).toBe(false);
    expect(checkAnswer(a, { kind: 'order', order: [1] }).invalid).toBeTruthy();
    expect(formatAnswer(a)).toBe('10 < 20 < 30');
  });
  it('order bugs match an exact index order', () => {
    const a: Answer = { kind: 'order', items: ['2 m 5 cm', '250 cm', '2,15 m'], correct: [0, 2, 1], direction: 'aufsteigend' };
    const bugs: Bug[] = [{ id: 'nur-zahlen', match: [0, 2, 1].reverse(), hint: 'Achte auf die Einheiten.' }];
    expect(checkAnswer(a, { kind: 'order', order: [1, 2, 0] }, bugs)).toEqual({ correct: false, bugHint: 'Achte auf die Einheiten.', bugId: 'nur-zahlen' });
    expect(checkAnswer(a, { kind: 'order', order: [2, 0, 1] }, bugs)).toEqual({ correct: false, bugHint: undefined });
    expect(responseForBug(a, bugs[0])).toEqual({ kind: 'order', order: [1, 2, 0] });
    // array matches never apply to other answer kinds
    expect(checkAnswer({ kind: 'number', value: 5 }, { kind: 'number', text: '1' }, [{ id: 'x', match: [1], hint: 'h' }]).bugHint).toBeUndefined();
  });
});

describe('checkAnswer: cells and numberline', () => {
  it('cells compares sets, ignoring given cells', () => {
    const a: Answer = { kind: 'cells', width: 4, height: 2, given: [[0, 0]], solution: [[3, 0], [2, 1]] };
    expect(checkAnswer(a, { kind: 'cells', cells: [[2, 1], [3, 0]] }).correct).toBe(true);
    expect(checkAnswer(a, { kind: 'cells', cells: [[0, 0], [2, 1], [3, 0]] }).correct).toBe(true);
    const r = checkAnswer(a, { kind: 'cells', cells: [[3, 0], [1, 1]] });
    expect(r.correct).toBe(false);
    expect(r.extraCells).toEqual([[1, 1]]);
    expect(r.missingCells).toEqual([[2, 1]]);
    expect(checkAnswer(a, { kind: 'cells', cells: [] }).invalid).toBeTruthy();
  });
  it('numberline respects tolerance', () => {
    const a: Answer = { kind: 'numberline', min: 0, max: 10000, majorStep: 1000, minorStep: 100, step: 100, value: 3400, tolerance: 100, labelMajor: true };
    expect(checkAnswer(a, { kind: 'numberline', value: 3500 }).correct).toBe(true);
    expect(checkAnswer(a, { kind: 'numberline', value: 3600 }).correct).toBe(false);
  });
});

describe('helpers', () => {
  const answers: Answer[] = [
    { kind: 'number', value: 100 },
    { kind: 'number', value: null, offerUnsolvable: true },
    { kind: 'choice', options: [{ label: 'a' }, { label: 'b' }], correct: 1 },
    { kind: 'multi', fields: [{ id: 'm', value: 2 }, { id: 'cm', value: 50 }] },
    { kind: 'cells', width: 3, height: 3, given: [], solution: [[1, 1]] },
    { kind: 'numberline', min: 0, max: 100, majorStep: 10, minorStep: 1, step: 1, value: 37, tolerance: 0, labelMajor: true },
    { kind: 'order', items: ['b', 'a'], correct: [1, 0], direction: 'aufsteigend' },
  ];
  it.each(answers.map((a) => [a.kind, a] as const))('correctResponse is accepted (%s)', (_, a) => {
    expect(checkAnswer(a, correctResponse(a)).correct).toBe(true);
    expect(isEmptyResponse(correctResponse(a))).toBe(false);
    expect(formatAnswer(a).length).toBeGreaterThan(0);
  });
  it('responseForBug builds parseable wrong answers', () => {
    const a: Answer = { kind: 'number', value: 53 };
    const r = responseForBug(a, { id: 'x', match: 35, hint: 'h' });
    expect(r).toEqual({ kind: 'number', text: '35' });
    expect(isEmptyResponse(null)).toBe(true);
    expect(isEmptyResponse({ kind: 'number', text: '  ' })).toBe(true);
  });
});

describe('formatAnswer: clock times', () => {
  const time = (h: number, min: number): Answer => ({
    kind: 'multi',
    fields: [
      { id: 'h', value: h, after: ':', label: 'Stunden' },
      { id: 'min', value: min, after: 'Uhr', label: 'Minuten' },
    ],
  });
  it('writes h:mm Uhr with zero-padded minutes, never "21 : 0 Uhr"', () => {
    expect(formatAnswer(time(21, 0))).toBe('21:00\u00A0Uhr');
    expect(formatAnswer(time(9, 5))).toBe('9:05\u00A0Uhr');
    expect(formatAnswer(time(11, 15))).toBe('11:15\u00A0Uhr');
    expect(formatAnswer(time(0, 30))).toBe('0:30\u00A0Uhr');
  });
  it('keeps other multi answers unchanged', () => {
    const money: Answer = { kind: 'multi', fields: [{ id: 'e', value: 3, before: '3,45 € =', after: '€' }, { id: 'c', value: 45, after: 'ct' }] };
    expect(formatAnswer(money)).toBe('3,45 € = 3 € 45 ct');
    const span: Answer = { kind: 'multi', fields: [{ id: 'h', value: 1, after: 'h' }, { id: 'min', value: 5, after: 'min' }] };
    expect(formatAnswer(span)).toBe('1 h 5 min');
  });
});

describe('checkAnswer: bug ids (error-library tags for the improvement tracking)', () => {
  it('reports the id of the matched bug for every answer kind that has bugs', () => {
    const multi: Answer = { kind: 'multi', fields: [{ id: 'e', value: 3 }, { id: 'c', value: 45 }] };
    expect(checkAnswer(multi, { kind: 'multi', values: { e: '3', c: '4' } }, [{ id: 'null-hinten', match: { c: 4 }, hint: 'h' }]).bugId).toBe('null-hinten');
    const line: Answer = { kind: 'numberline', min: 0, max: 100, majorStep: 10, minorStep: 1, step: 1, value: 40, tolerance: 0, labelMajor: true };
    expect(checkAnswer(line, { kind: 'numberline', value: 50 }, [{ id: 'nachbar', match: 50, hint: 'h' }]).bugId).toBe('nachbar');
    const unsolvable: Answer = { kind: 'number', value: null, offerUnsolvable: true };
    expect(checkAnswer(unsolvable, { kind: 'number', text: '12' }, [{ id: 'fehlt-0', match: 12, hint: 'h' }]).bugId).toBe('fehlt-0');
    expect(checkAnswer(unsolvable, { kind: 'number', text: '13' }, [{ id: 'fehlt-0', match: 12, hint: 'h' }]).bugId).toBeUndefined();
  });
  it('never reports a bug id for a correct answer or a wrong choice option', () => {
    const answer: Answer = { kind: 'number', value: 85 };
    expect(checkAnswer(answer, { kind: 'number', text: '85' }, [{ id: 'x', match: 85, hint: 'h' }]).bugId).toBeUndefined();
    const choice: Answer = { kind: 'choice', options: [{ label: 'a' }, { label: 'b', whyWrong: 'w' }], correct: 0 };
    expect(checkAnswer(choice, { kind: 'choice', index: 1 }).bugId).toBeUndefined();
  });
});

describe('checkAnswer: the feedback of the "Nicht lösbar" button keeps the text rules', () => {
  it('T4, T5: short sentences, no subordinate clause', () => {
    const solvable: Answer = { kind: 'number', value: 3, offerUnsolvable: true };
    const open: Answer = { kind: 'number', value: null, offerUnsolvable: true };
    const texts = [checkAnswer(solvable, { kind: 'number', text: '', unsolvable: true }).bugHint!, checkAnswer(open, { kind: 'number', text: '5' }).bugHint!];
    for (const text of texts) expect(childTextProblems(text), text).toEqual([]);
  });
});

describe('order tasks without quantities (months, weekdays)', () => {
  const months: Answer = { kind: 'order', items: ['November', 'Oktober'], correct: [1, 0], direction: 'aufsteigend', instruction: 'Tippe die Monate der Reihe nach an.' };

  it('the solution has no sign that claims one is smaller', () => {
    expect(formatAnswer(months)).toBe('Oktober → November');
  });

  it('an unfinished order does not speak of numbers', () => {
    expect(checkAnswer(months, { kind: 'order', order: [1] }, []).invalid).toBe('Tippe alle der Reihe nach an.');
  });
});
