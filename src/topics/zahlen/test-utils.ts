/** Test support of the topic 'zahlen' (imported only by *.test.ts). */
import { checkAnswer, correctResponse } from '../../core/check';
import { createRng } from '../../core/rng';
import { STUFEN, type Ab, type Exercise, type SkillDef, type Stufe } from '../../core/types';

/** Worked out apart from helpers.ts on purpose: the check must not share a mistake with the code it checks. */
const turned = (n: number): number | null => {
  const t = Math.floor(n / 10);
  const e = n % 10;
  return n >= 12 && n <= 98 && e !== 0 && e !== t ? e * 10 + t : null;
};

/** The typed values whose Zahlendreher gets no bug in this exercise (docs/research.md F3). */
export function undetectedDreher(ex: Exercise): string[] {
  const a = ex.answer;
  const out: string[] = [];
  if (a.kind === 'number' && a.value !== null) {
    const swapped = turned(a.value);
    if (swapped !== null && !checkAnswer(a, { kind: 'number', text: String(swapped) }, ex.bugs).bugId) out.push(`${ex.key}: ${a.value} typed as ${swapped}`);
  }
  if (a.kind === 'multi') {
    const right = correctResponse(a);
    if (right.kind !== 'multi') throw new Error('multi');
    for (const f of a.fields) {
      const swapped = turned(f.value);
      if (swapped === null) continue;
      const res = checkAnswer(a, { kind: 'multi', values: { ...right.values, [f.id]: String(swapped) } }, ex.bugs);
      if (!res.bugId) out.push(`${ex.key}: ${f.id} = ${f.value} typed as ${swapped}`);
    }
  }
  return out;
}

/** The misses of undetectedDreher over a sweep of every Stufe and AB level: each cell has its own forms. */
export function dreherSweep(skill: SkillDef, n = 300): string[] {
  const out = new Set<string>();
  for (const stufe of STUFEN) {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (let i = 0; i < n; i++) undetectedDreher(skill.generate(createRng(i * 53 + 17), stufe, { extras: true, ab })).forEach((m) => out.add(m));
    }
  }
  return [...out];
}

/** Items of one cell of the table Stufe × AB. */
export const cell = (skill: SkillDef, stufe: Stufe, ab: Ab, n = 300, salt = 11): Exercise[] =>
  Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 97 + salt), stufe, { extras: true, ab }));

/** The form of an item: the key part after the skill and the Stufe. */
export const kindOf = (ex: Exercise): string => ex.key.split(':')[2];

/** The kinds of a cell, sorted. */
export const kindsOf = (items: readonly Exercise[]): string[] => [...new Set(items.map(kindOf))].sort();
