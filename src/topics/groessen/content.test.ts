/** Text rules for all skills of the topic that the shared suite does not check (docs/research.md §4: T6, T7, T8, T10, T11). */
import { describe, expect, it } from 'vitest';
import { formatAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { sentences } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { CTX, samples } from '../test-utils';
import { checkWorkedSolution } from '../step-check';
import topic from './index';

/** Class words above 12 letters (T8). */
const LONG_WORDS = new Set(['Viertelstunde']);

const childTexts = (ex: Exercise) => {
  const answer = ex.answer;
  const labels = answer.kind === 'choice' ? answer.options.flatMap((o) => [o.label, ...(o.whyWrong ? [o.whyWrong] : [])]) : answer.kind === 'order' ? answer.items : [];
  return [
    ex.context, ex.prompt, ex.praise, ...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...labels,
    ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)),
  ].filter((t): t is string => !!t);
};

describe.each(topic.skills.map((s) => [s.id, s] as const))('%s: text rules beyond the shared suite', (_id, skill) => {
  const all = STUFEN.flatMap((stufe: Stufe) => samples(skill, stufe, 200));

  it('T6: present tense, active voice', () => {
    for (const ex of all) {
      for (const t of childTexts(ex)) expect(t, ex.key).not.toMatch(/(?<![\p{L}])(wird|werden|wurde|würde|hätte|wäre|wären)(?![\p{L}])/iu);
    }
  });

  it('T7: one question, always last; at most two amounts in a sentence of the task', () => {
    for (const ex of all) {
      const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
      expect(story.split('?').length - 1, story).toBeLessThanOrEqual(1);
      if (story.includes('?')) expect(story.trim().endsWith('?'), story).toBe(true);
      for (const s of sentences(story)) {
        // '3 € 40 ct' and '2 m 15 cm' are one amount
        const amounts = s.replace(/(\d)\s*(€|m)\s+(\d)/g, '$1$3').match(/\d+(?::\d+)?/g) ?? [];
        expect(amounts.length, s).toBeLessThanOrEqual(2);
      }
    }
  });

  it('T8: words of at most 12 letters, apart from class words', () => {
    for (const ex of all) {
      for (const t of childTexts(ex)) {
        for (const w of t.match(/\p{L}+/gu) ?? []) {
          if (w.length > 12) expect(LONG_WORDS.has(w), `"${w}" in "${t}"`).toBe(true);
        }
      }
    }
  });

  it('T10: units as in class, no comma; T11: no Fachwörter of later grades', () => {
    for (const ex of all) {
      for (const t of childTexts(ex)) {
        expect(t, t).not.toMatch(/\d,\d/);
        expect(t, t).not.toMatch(/\b(Summand|Differenz|Produkt|Quotient)\b/);
      }
    }
  });

  it('no hint states a number answer together with its unit', () => {
    for (const ex of all) {
      const a = ex.answer;
      if (a.kind !== 'number' || a.value === null || !a.unit) continue;
      // 50 ct − 50 ct: a hint can repeat a number of the task
      if ([ex.context, ex.prompt, ex.expression].some((t) => t?.match(new RegExp(`(?<!\\d)${a.value}[\\s\\u00A0]*${a.unit}`)))) continue;
      const stated = new RegExp(`(?<!\\d)${a.value}[\\s\\u00A0]*${a.unit}(?![\\p{L}])`, 'u');
      for (const h of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(h, ex.key).not.toMatch(stated);
    }
  });

  it('a singular unit at a field does not give away that the answer is 1', () => {
    const singular = /^(Stunde|Woche|Tag|Minute|Münze|Schein|Weg)\.?$/;
    const every = STUFEN.flatMap((stufe: Stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) => Array.from({ length: 200 }, (_, i) => skill.generate(createRng(i * 7919 + 13), stufe, { ...CTX, ab }))));
    for (const ex of every) {
      const a = ex.answer;
      const units = a.kind === 'number' ? [a.unit, a.after] : a.kind === 'multi' ? a.fields.flatMap((f) => f.after) : [];
      for (const u of units) if (u) expect(u, ex.key).not.toMatch(singular);
    }
  });

  it('the number of the answer does not stand in the task as a number of its own', () => {
    const every = STUFEN.flatMap((stufe: Stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) => Array.from({ length: 300 }, (_, i) => skill.generate(createRng(i * 7919 + 13), stufe, { ...CTX, ab }))));
    for (const ex of every) {
      const a = ex.answer;
      if (a.kind !== 'number' || a.value === null || a.value < 2) continue;
      const task = [ex.context, ex.prompt, ex.expression].filter(Boolean).join(' ');
      expect(task, `${ex.key} → ${a.value}`).not.toMatch(new RegExp(`(?<!\\d)${a.value}(?![\\d:])`));
    }
  });

  it('grammar with the number 1: no "sind es 1 Stunde", "Das sind 1 Stück", "Es fehlen 1 €"', () => {
    for (const ex of all) {
      for (const t of childTexts(ex)) expect(t, ex.key).not.toMatch(/(sind es|Das sind|Es fehlen) 1[\s\u00A0]/);
    }
  });

  it('the worked steps are right and the last step states the result', () => {
    for (const ex of all) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });
});

describe.each(topic.skills.map((s) => [s.id, s] as const))('%s: below Stufe 3 at every AB level', (_id, skill) => {
  const below = ([1, 2] as Stufe[]).flatMap((stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) =>
    Array.from({ length: 200 }, (_, i) => skill.generate(createRng(i * 4799 + 17), stufe, { ...CTX, ab }))));

  it('F15: no text with Euro and Cent in one amount', () => {
    const mixed = /\d[\s\u00A0]*€\s+\d+[\s\u00A0]*ct/;
    for (const ex of below) {
      for (const t of [...childTexts(ex), ex.srText]) expect(t, ex.key).not.toMatch(mixed);
    }
  });

  it('the shown solution has no space before punctuation', () => {
    for (const ex of below) expect(formatAnswer(ex.answer), ex.key).not.toMatch(/\s[.,!?]/);
  });
});

describe('topic groessen', () => {
  it('has the skills of the catalogue in teaching order, all of them core', () => {
    expect(topic.skills.map((s) => s.id)).toEqual([
      'groessen.geld-kennen', 'groessen.geld-betrag', 'groessen.geld-wechseln', 'groessen.einkaufen',
      'groessen.lineal', 'groessen.meter-zentimeter', 'groessen.uhr', 'groessen.zeitspannen', 'groessen.kalender',
    ]);
    for (const s of topic.skills) expect(s.optional).toBeUndefined();
  });
});
