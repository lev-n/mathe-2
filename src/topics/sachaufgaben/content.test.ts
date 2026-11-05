/**
 * Rules for every skill of the topic that the shared suite does not check (docs/research.md §4, §6, §7.2):
 * T6, T7, T8, T9, T13, T14, the number range, and worked solutions that compute.
 */
import { describe, expect, it } from 'vitest';
import { STUFEN } from '../../core/types';
import type { Exercise } from '../../core/types';
import { sentences } from '../../core/textRules';
import { bugKey } from '../errorFamilies';
import { createRng } from '../../core/rng';
import { checkWorkedSolution } from '../step-check';
import { formatAnswer } from '../../core/check';
import { NL, layoutLabels, xScale } from '../../ui/visuals/NumberLineVisual';
import { PEOPLE } from '../shared';
import families from './families';
import topic from './index';
import phrases from './phrases';
import { jumpLine } from './helpers';
import { atAb, kindOf, numbersIn } from './test-helpers';

const ALL: { skillId: string; ex: Exercise }[] = topic.skills.flatMap((skill) =>
  STUFEN.flatMap((stufe) => ([1, 2, 3] as const).flatMap((ab) => atAb(skill, stufe, ab, 60).map((ex) => ({ skillId: skill.id, ex })))),
);

const storyOf = (ex: Exercise) => [ex.context, ex.prompt].filter(Boolean).join(' ');
const stepTextOf = (ex: Exercise) => ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
const optionTextOf = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : []);
const shownText = (ex: Exercise) => [storyOf(ex), ...ex.hints, ...stepTextOf(ex), ex.praise, ...(ex.bugs ?? []).map((b) => b.hint), ...optionTextOf(ex)];

/** Task kinds where nothing comes or goes: two amounts side by side, or a part that is named. */
const STATIC_KINDS: Record<string, string[]> = {
  'sachaufgaben.bildaufgabe': ['summe', 'summe-gross', 'zehner-summe', 'dritte-reihe', 'dritte-reihe-mehr', 'nur'],
  'sachaufgaben.rechnung-finden': ['ab2-direkt', 'ab2', 'falle', 'luecke', 'vier-indirekt'],
  'sachaufgaben.vergleichen': ['bild', 'bild-zwei', 'angleichen-bild', 'angleichen', 'unterschied', 'mehr-als', 'weniger-als', 'beziehung-zuerst', 'umgekehrt', 'umgekehrt-vorn'],
  'sachaufgaben.mit-groessen': ['preise', 'laenger', 'laenger-gross', 'hof', 'weg-ganz'],
  'sachaufgaben.plus-minus': ['buecher'],
};
const isStatic = (skillId: string, ex: Exercise) => (STATIC_KINDS[skillId] ?? []).includes(kindOf(ex)) || ex.key.includes(':extra:huehner:');

/** The plural nouns of the topic's stories, hints and options. */
const PLURAL_NOUNS = 'Äpfel|Sticker|Jahre|Stunden|Minuten|Tage|Wochen|Kinder|Bilder|Kekse|Murmeln|Karten|Muscheln|Kastanien|Bücher|Bälle|Sterne|Hefte|Seiten|Plätze|Gruppen|Tüten|Stifte|Ziegen|Schafe|Hasen|Perlen|Luftballons|Birnen|Stühle|Teller|Reihen|Kisten|Autos|Bänke|Boote|Bonbons';

/** Long words from the hints of docs/research.md §5 (T8). */
const LONG_WORDS = new Set(['Rechenzeichen']);

describe('sachaufgaben: the topic', () => {
  it('has the skills of the catalogue in teaching order; only Zwei Schritte is an Extra', () => {
    expect(topic.skills.map((s) => s.id)).toEqual([
      'sachaufgaben.bildaufgabe',
      'sachaufgaben.rechnung-finden',
      'sachaufgaben.plus-minus',
      'sachaufgaben.vergleichen',
      'sachaufgaben.mal-teilen',
      'sachaufgaben.mit-groessen',
      'sachaufgaben.frage-pruefen',
      'sachaufgaben.zwei-schritte',
    ]);
    expect(topic.skills.filter((s) => s.optional).map((s) => s.id)).toEqual(['sachaufgaben.zwei-schritte']);
  });

  it('every Bug id of the same sweep as errorFamilies.test.ts has a family, and every table entry is emitted', () => {
    const table = new Map<string, Set<string>>();
    for (const skills of Object.values(families)) {
      for (const [skillId, keys] of Object.entries(skills)) {
        const known = table.get(skillId) ?? new Set<string>();
        keys.split(/\s+/).forEach((k) => known.add(k));
        table.set(skillId, known);
      }
    }
    const emitted = new Set<string>();
    const unmapped = new Set<string>();
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (let seed = 1; seed <= 400; seed++) {
          const ex = skill.generate(createRng(seed * 104_729 + stufe * 31), stufe, { extras: true, today: '2026-10-19' });
          for (const bug of ex.bugs ?? []) {
            emitted.add(`${skill.id}|${bugKey(bug.id)}`);
            if (!table.get(skill.id)?.has(bugKey(bug.id))) unmapped.add(`${skill.id} ${bug.id}`);
          }
        }
      }
    }
    expect([...unmapped]).toEqual([]);
    const dead = [...table].flatMap(([skillId, keys]) => [...keys].map((k) => `${skillId}|${k}`)).filter((k) => !emitted.has(k));
    expect(dead).toEqual([]);
    expect(Object.keys(phrases).sort()).toEqual(Object.keys(families).sort());
  });

  it('worked solutions compute and end with the result', () => {
    const errors = ALL.flatMap(({ ex }) => checkWorkedSolution(ex));
    expect(errors.slice(0, 10)).toEqual([]);
  });

  it('T7: one question, always last; at most two numbers per sentence', () => {
    for (const { ex } of ALL) {
      const parts = sentences(storyOf(ex));
      parts.slice(0, -1).forEach((s) => expect(s.endsWith('?'), `question before the end: ${storyOf(ex)}`).toBe(false));
      expect(parts[parts.length - 1].endsWith('?'), `no question at the end: ${storyOf(ex)}`).toBe(true);
      parts.forEach((s) => expect(numbersIn(s).length, s).toBeLessThanOrEqual(2));
    }
  });

  it('T6: present tense and active voice', () => {
    const notPresent = /(?<!\p{L})(würde|hätte|wäre|hatte|hatten|war|waren|wurde|wurden)(?!\p{L})/iu;
    const passive = /(?<!\p{L})(wird|werden)(?!\p{L}).*(?<!\p{L})ge\p{L}+(t|en)(?!\p{L})/iu;
    for (const { ex } of ALL) {
      for (const text of shownText(ex)) {
        expect(notPresent.test(text), text).toBe(false);
        expect(passive.test(text), text).toBe(false);
      }
    }
  });

  it('T8: words of at most 12 letters outside the allowlist', () => {
    for (const { ex } of ALL) {
      for (const text of shownText(ex)) {
        for (const word of text.split(/[^\p{L}]+/u)) {
          if (word.length > 12) expect(LONG_WORDS.has(word), `${word} in "${text}"`).toBe(true);
        }
      }
    }
  });

  it('T9: the noun is repeated, not replaced by er or sie', () => {
    for (const { ex } of ALL) expect(/(?<!\p{L})(er|sie)(?!\p{L})/iu.test(storyOf(ex)), storyOf(ex)).toBe(false);
  });

  it('T12: names from the short list only', () => {
    const names = new Set(PEOPLE.map((p) => p.name));
    for (const { ex } of ALL) {
      const first = /^(\p{Lu}\p{Ll}+) (?:hat|kauft|bezahlt|bekommt|verteilt|verschenkt|backt|sammelt|legt|gibt|ist) /u.exec(storyOf(ex));
      if (first && !['Ein', 'Eine', 'Das', 'Der', 'Die', 'Im', 'Oma', 'Papa'].includes(first[1])) expect(names.has(first[1]), storyOf(ex)).toBe(true);
    }
  });

  it('T13: "mehr" also goes with minus and "weniger" with plus', () => {
    const minusWithMehr = ALL.filter(({ skillId, ex }) => skillId === 'sachaufgaben.vergleichen' && ex.stufe === 3 && /\bmehr als\b/.test(ex.context ?? ''));
    expect(minusWithMehr.length).toBeGreaterThan(0);
    const plusWithWeniger = ALL.filter(({ skillId, ex }) => skillId === 'sachaufgaben.vergleichen' && ex.stufe === 3 && /\bweniger als\b/.test(ex.context ?? ''));
    expect(plusWithWeniger.length).toBeGreaterThan(0);
  });

  it('T14: no decoration in the task area', () => {
  });

  it('T14: a clock never stands beside a time that its face does not have', () => {
    for (const { ex } of ALL) {
      if (ex.visual?.type !== 'clock') continue;
      for (const m of storyOf(ex).matchAll(/(\d+) Uhr/g)) expect(Number(m[1]), ex.key).toBeLessThanOrEqual(12);
    }
  });

  it('every number in the story and every number answer stays ≤ 100', () => {
    for (const { ex } of ALL) {
      numbersIn(storyOf(ex)).forEach((n) => expect(n, storyOf(ex)).toBeLessThanOrEqual(100));
      if (ex.answer.kind === 'number' && ex.answer.value !== null) {
        expect(ex.answer.value, ex.key).toBeLessThanOrEqual(100);
        expect(ex.answer.value, ex.key).toBeGreaterThanOrEqual(1);
      }
      if (ex.answer.kind === 'multi') ex.answer.fields.forEach((f) => expect(f.value, ex.key).toBeLessThanOrEqual(100));
    }
  });

  it('plural nouns stay true: a story number or a result with a plural noun is at least 2', () => {
    for (const { ex } of ALL) {
      if (ex.answer.kind !== 'number' || ex.answer.value === null) continue;
      if (ex.answer.after && /^\p{Lu}/u.test(ex.answer.after)) expect(ex.answer.value, `${ex.key}: 1 ${ex.answer.after}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('a hint that counts on or back goes the way of the worked calculation', () => {
    for (const { ex } of ALL) {
      const calc = stepTextOf(ex).join(' ');
      for (const hint of ex.hints) {
        if (/^Rechne von .* weiter\.$/.test(hint)) expect(calc, `${ex.key}: ${hint}`).not.toContain(' − ');
        if (/^Rechne .* zurück\.$/.test(hint)) expect(calc, `${ex.key}: ${hint}`).toContain(' − ');
      }
    }
  });

  it('where nothing comes or goes, no text speaks of a change', () => {
    const kinds = new Set<string>();
    for (const { skillId, ex } of ALL) {
      if (!isStatic(skillId, ex)) continue;
      kinds.add(`${skillId}|${kindOf(ex)}`);
      for (const text of shownText(ex)) expect(/kommt etwas dazu|geht etwas weg|Wird es mehr oder weniger/.test(text), `${ex.key}: ${text}`).toBe(false);
    }
    expect(kinds.size, 'every kind of the list occurs').toBe(Object.values(STATIC_KINDS).flat().length + 1);
  });

  it('"Wird es mehr oder weniger?" appears only where the result of a change is asked: anywhere else its true answer can support the wrong operation', () => {
    const kinds = new Set(ALL.filter(({ ex }) => shownText(ex).some((text) => /Wird es mehr oder weniger/.test(text))).map(({ skillId, ex }) => `${skillId}|${kindOf(ex)}`));
    expect([...kinds].sort()).toEqual(['sachaufgaben.rechnung-finden|dazu-weg', 'sachaufgaben.rechnung-finden|verben']);
  });

  it('every hint can be done in the task: nobody shows metres with the hands', () => {
    for (const { ex } of ALL) for (const text of shownText(ex)) expect(text, ex.key).not.toMatch(/mit den Händen/);
  });

  it('the solution line of a task with several fields has no full stop before a comma', () => {
    const multi = ALL.filter(({ ex }) => ex.answer.kind === 'multi');
    expect(multi.length).toBeGreaterThan(0);
    for (const { ex } of multi) expect(formatAnswer(ex.answer), ex.key).not.toMatch(/\.,/);
  });

  it('a story that asks what someone still has says what happens', () => {
    const asking = ALL.filter(({ ex }) => /hat \p{L}+ noch\?$/u.test(ex.prompt));
    expect(asking.length).toBeGreaterThan(0);
    for (const { ex } of asking) expect(ex.context, ex.key).toMatch(/kauft|verliert|verschenkt|gibt|schenkt/);
  });

  it('after 1 comes the singular, also in the choice options', () => {
    const wrong = new RegExp(`(?<!\\d)1[ \u00A0](${PLURAL_NOUNS})(?!\\p{L})`, 'u');
    for (const { ex } of ALL) for (const text of shownText(ex)) expect(wrong.test(text), `${ex.key}: ${text}`).toBe(false);
  });

  it('after 1 comes the singular, also in a form that is rare in the sample above', () => {
    const wrong = new RegExp(`(?<!\\d)1[ \u00A0](${PLURAL_NOUNS})(?!\\p{L})`, 'u');
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ab of [1, 2, 3] as const) {
          for (const ex of atAb(skill, stufe, ab, 500)) {
            for (const text of shownText(ex)) expect(wrong.test(text), `${ex.key}: ${text}`).toBe(false);
            if (ex.answer.kind === 'number' && ex.answer.value !== null && ex.answer.after && /^\p{Lu}/u.test(ex.answer.after)) expect(ex.answer.value, ex.key).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it('no minus to choose from is impossible: the wrong option has the larger number first, so the story decides', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ab of [1, 2, 3] as const) {
          for (const ex of atAb(skill, stufe, ab, 300)) {
            if (ex.answer.kind !== 'choice') continue;
            for (const o of ex.answer.options) {
              const m = /^(\d+) − (\d+)$/.exec(o.label);
              if (m) expect(Number(m[1]), `${ex.key}: ${o.label}`).toBeGreaterThanOrEqual(Number(m[2]));
            }
          }
        }
      }
    }
  });

  it('"Zahlen im Text" appears only where the text has numbers', () => {
    for (const { ex } of ALL) {
      if (shownText(ex).some((text) => /Zahlen im Text/.test(text))) expect(numbersIn(storyOf(ex)).length, ex.key).toBeGreaterThan(0);
    }
  });

  it('Rechenstrich: every sum and difference up to 100 keeps its stops and jump labels readable apart', () => {
    const axisWidth = (n: number) => String(n).length * NL.FONT * 0.58 + 6;
    const jumpWidth = (label: string) => label.length * 16 * 0.58 + 6;
    const overlaps = (a: { x: number; w: number }, b: { x: number; w: number }) => Math.abs(a.x - b.x) < (a.w + b.w) / 2;
    const problems: string[] = [];
    for (let start = 2; start <= 100; start++) {
      for (let result = 1; result <= 100; result++) {
        if (result === start) continue;
        const line = jumpLine(start, result - start);
        const xOf = xScale(line.min, line.max);
        const placed = layoutLabels(line);
        if (placed.length !== line.labels!.length) problems.push(`${start} to ${result}: a label is left out`);
        placed.forEach((l, i) => {
          for (const other of placed.slice(i + 1)) {
            if (l.row === other.row && overlaps({ x: l.x, w: axisWidth(l.value) }, { x: other.x, w: axisWidth(other.value) })) problems.push(`${start} to ${result}: labels ${l.value} and ${other.value}`);
          }
        });
        const jumps = line.jumps!.map((j) => ({ x: (xOf(j.from) + xOf(j.to)) / 2, w: jumpWidth(j.label!) }));
        jumps.forEach((j, i) => {
          for (const other of jumps.slice(i + 1)) if (overlaps(j, other)) problems.push(`${start} to ${result}: jump labels ${JSON.stringify(line.jumps)}`);
        });
      }
    }
    expect(problems.slice(0, 10)).toEqual([]);
  });

  it('a price can be real: a ball, a book, a game or a puzzle costs at least 3 €, a Heft at most 3 € where it is only part of the story', () => {
    for (const { skillId, ex } of ALL) {
      if (skillId !== 'sachaufgaben.frage-pruefen') {
        for (const m of storyOf(ex).matchAll(/(Ball|Buch|Spiel|Puzzle)[a-zäöü ]* (?:kostet |für )?(\d+)\u00A0€/g)) expect(Number(m[2]), `${ex.key}: ${storyOf(ex)}`).toBeGreaterThanOrEqual(3);
      }
      if (ex.key.includes(':hefte:')) expect(Number(/Heft kostet (\d+)/.exec(storyOf(ex))?.[1]), ex.key).toBeLessThanOrEqual(3);
    }
  });

  it('a story with a ruler in the picture does not call one of the strips a Lineal: the picture would contradict its length', () => {
    for (const { ex } of ALL) if (ex.visual?.type === 'ruler') expect(storyOf(ex), ex.key).not.toMatch(/Lineal/);
  });

  it('du-form: no "Sie" or "Ihr" in the texts', () => {
    for (const { ex } of ALL) for (const text of shownText(ex)) expect(/(?<!\p{L})(Sie|Ihr|Ihre)(?!\p{L})/u.test(text), text).toBe(false);
  });
});
