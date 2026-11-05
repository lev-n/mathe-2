/**
 * Stufe and AB are two separate things in this topic: the Stufe decides the content (docs/research.md §6), the AB the demand inside it. A
 * generator that picks its forms by AB alone gives the same item on every Stufe, and this suite fails. Also pins the defects that came
 * with such a mapping: a task that shows its own answer, and a hint that names it.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import { factFactors } from '../../state/facts';
import topic from './index';
import { allItems } from './test-support';

/** A key without its skill and Stufe: the same task on two Stufen has the same rest. */
const task = (ex: Exercise) => ex.key.split(':').slice(2).join(':');

const SAMPLES = 300;

function differing(skill: SkillDef, ab: Ab, low: Stufe, high: Stufe): number {
  let count = 0;
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const ctx = { extras: true, ab } as const;
    if (task(skill.generate(createRng(seed), low, ctx)) !== task(skill.generate(createRng(seed), high, ctx))) count++;
  }
  return count / SAMPLES;
}

const mentions = (text: string, n: number) => new RegExp(`(?<!\\d)${n}(?!\\d)`).test(text);
const factorsOf = (ex: Exercise) => (/^(\d+) · (\d+) = □$/.exec(ex.expression ?? '') ?? []).slice(1).map(Number);

/**
 * Forms whose answer stands in the task by the catalogue (docs/research.md §6): □ · 4 = 4 · 7 and 2 · 7 = 14, also 14 : 2 = □, where the demand is to
 * see the swap or the reversal; mal 1 and mal 0, whose result is the number itself; 1 · 1, which has no other form.
 */
function catalogueShowsAnswer(ex: Exercise): boolean {
  const kind = task(ex).split(':')[0];
  if (ex.skillId === 'einmaleins.tausch' && kind === 'luecke') return true;
  if (ex.skillId === 'einmaleins.umkehren' && kind === 'mal-zu-geteilt') return true;
  if (kind === 'null') return true;
  if (ex.factKey && factFactors(ex.factKey).every((n) => n === 1)) return true;
  return kind === 'fakt' && factorsOf(ex).includes(1);
}

describe.each(topic.skills.map((s) => [s.id, s] as const))('%s', (_id, skill) => {
  it.each([1, 2, 3] as Ab[])('AB %i: the same seed gives another task on Stufe 1 and Stufe 3', (ab) => {
    expect(differing(skill, ab, 1, 3)).toBeGreaterThanOrEqual(0.5);
  });

  it.each([1, 2, 3] as Ab[])('AB %i: and on the Stufen next to each other', (ab) => {
    expect(differing(skill, ab, 1, 2)).toBeGreaterThanOrEqual(0.5);
    expect(differing(skill, ab, 2, 3)).toBeGreaterThanOrEqual(0.5);
  });

  it('keeps the planned AB on every Stufe', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (let seed = 1; seed <= 40; seed++) expect(skill.generate(createRng(seed), stufe, { extras: true, ab }).ab).toBe(ab);
      }
    }
  });

  it('no task shows its own answer, and no strategy hint names it, outside the forms of the catalogue', () => {
    for (const ex of allItems(skill, { extras: true }, 150)) {
      if (ex.answer.kind !== 'number' || ex.answer.value === null) continue;
      const value = ex.answer.value;
      const shown = [ex.context, ex.prompt, ex.expression].filter(Boolean).join(' ');
      // Also where the task has to show its answer, a hint on mal 1 does not say it again: '1 · 6 heißt einmal die 6.'
      const malEins = task(ex).startsWith('fakt:') && factorsOf(ex).includes(1) && value !== 1;
      if (catalogueShowsAnswer(ex) && !malEins) continue;
      if (!catalogueShowsAnswer(ex)) expect(mentions(shown, value), `${ex.key}: "${shown}" shows ${value}`).toBe(false);
      for (const hint of ex.hints) expect(mentions(hint, value), `${ex.key}: "${hint}" names ${value}`).toBe(false);
    }
  });

  it('after 1 comes the singular, in every text of a task', () => {
    const plural = /(?<![\d,])1[ \u00A0](Punkte|Reihen|Gruppen|Kekse|Äpfel|Stifte|Kinder|Bücher|Kisten|Autos|Tüten|Dosen)(?!\p{L})|\b(sind|bleiben|fehlen) (nur )?1 \p{Lu}/u;
    for (const ex of allItems(skill, { extras: true }, 200)) {
      const options = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : [];
      const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
      for (const text of [ex.context ?? '', ex.prompt, ...ex.hints, ...steps, ...(ex.bugs ?? []).map((b) => b.hint), ...options]) expect(text, ex.key).not.toMatch(plural);
    }
  });

  it('praise does not claim that a child wrote or placed something it only tapped', () => {
    for (const ex of allItems(skill, { extras: true }, 60)) {
      if (ex.answer.kind === 'choice') expect(ex.praise, ex.key).not.toMatch(/schr(ie|ei)b|gezeichnet|gelegt|gesetzt|eingetragen/i);
    }
  });

  it('keys stay apart: a planned task of Stufe 2 or 3 is no copy of Stufe 1 at the same AB', () => {
    const on = (stufe: Stufe, ab: Ab) => new Set(Array.from({ length: 150 }, (_, i) => task(skill.generate(createRng(i + 1), stufe, { extras: true, ab }))));
    for (const ab of [1, 2, 3] as Ab[]) {
      const low = on(1, ab);
      const high = on(3, ab);
      const shared = [...high].filter((k) => low.has(k));
      expect(shared.length / high.size, `AB ${ab}: ${shared.slice(0, 3).join(', ')}`).toBeLessThanOrEqual(0.5);
    }
  });
});
