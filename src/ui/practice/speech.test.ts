// What the voice (T16) and the live region say, over the output of all real generators.
import { beforeAll, describe, expect, it } from 'vitest';
import { UNSOLVABLE_TEXT } from '../../core/check';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { TOPICS, loadTopic } from '../../topics/registry';
import { announceCorrect, announceHint, announceRetry, announceSolution } from './phrases';
import { taskSpeech } from './readAloud';

const RAW_SIGN = /[·□−<>=+]|(^|\s):(\s|$)/;
const items: Exercise[] = [];

beforeAll(async () => {
  for (const topic of TOPICS) {
    const { skills } = await loadTopic(topic.id);
    for (const skill of skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        for (const ab of [1, 2, 3] as Ab[]) {
          for (const extras of [false, true]) {
            for (let seed = 1; seed <= 8; seed++) items.push(skill.generate(createRng(seed * 7919 + stufe * 101 + ab), stufe, { extras, ab, today: '2026-10-19' }));
          }
        }
      }
    }
  }
}, 60_000);

/** Everything a child can be told about a task. */
function feedbackTexts(ex: Exercise): string[] {
  const whyWrong = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.whyWrong ? [o.whyWrong] : [])) : [];
  return [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...whyWrong];
}

describe('read-aloud over all skills', () => {
  it('says signs as words: no raw sign reaches the voice', () => {
    for (const ex of items) expect(taskSpeech(ex, ex.hints), ex.key).not.toMatch(RAW_SIGN);
  });

  it('reads a clock-time answer as a time, never as a division', () => {
    const clocks = items.filter((ex) => ex.answer.kind === 'multi' && ex.answer.fields.some((f) => f.after === ':'));
    expect(clocks.length).toBeGreaterThan(50);
    for (const ex of clocks) {
      const said = taskSpeech(ex);
      expect(said, ex.key).toContain('Lücke Uhr Lücke');
      expect(said, ex.key).not.toContain('geteilt durch');
    }
  });

  it('reads the button of a task that may not be solvable: it can be the answer', () => {
    const open = items.filter((ex) => ex.answer.kind === 'number' && ex.answer.offerUnsolvable);
    expect(open.length).toBeGreaterThan(5);
    for (const ex of open) expect(taskSpeech(ex), ex.key).toContain(UNSOLVABLE_TEXT);
  });

  it('never says a hyphenated 1-mal or a date as a cardinal', () => {
    for (const ex of items) {
      expect(taskSpeech(ex, ex.hints), ex.key).not.toMatch(/\b(1|eins)-mal\b/);
      if (ex.skillId === 'groessen.kalender') expect(taskSpeech(ex), ex.key).not.toMatch(/\b(der|am) (eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\b(?!\p{L})/u);
    }
  });
});

describe('live region over all skills', () => {
  it('announces hints, targeted feedback and praise with the signs as words', () => {
    for (const ex of items) {
      for (const text of feedbackTexts(ex)) {
        expect(announceRetry(text), `${ex.key}: ${text}`).not.toMatch(RAW_SIGN);
        expect(announceHint(0, text), `${ex.key}: ${text}`).not.toMatch(RAW_SIGN);
      }
      expect(announceCorrect(ex, ex.praise), ex.key).not.toMatch(RAW_SIGN);
      expect(announceSolution(ex), ex.key).not.toMatch(RAW_SIGN);
    }
  });

  it('counts the hint from 1', () => {
    expect(announceHint(1, '3 · 4 = □')).toBe('Tipp 2: 3 mal 4 gleich Lücke.');
  });
});
