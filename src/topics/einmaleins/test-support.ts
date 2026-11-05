/** Test support of the topic 'einmaleins' (imported only by *.test.ts): items of one AB level and an independent solver for the task text. */
import { abSequence } from '../../core/age';
import { generateUnique } from '../../core/generate';
import { createRng } from '../../core/rng';
import type { Ab, ChoiceAnswer, Exercise, GenContext, SkillDef, Stufe } from '../../core/types';

/** n items of one Stufe with a planned AB level. */
export function atAb(skill: SkillDef, stufe: Stufe, ab: Ab, ctx: Partial<GenContext> = {}, n = 300): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 3571 + 7 + stufe * 11 + ab), stufe, { extras: true, ...ctx, ab }));
}

/** The kinds of task at one Stufe and AB level (the part of the key after the skill and the Stufe). */
export function kindsAt(skill: SkillDef, stufe: Stufe, ab: Ab, ctx: Partial<GenContext> = {}, n = 400): Set<string> {
  return new Set(atAb(skill, stufe, ab, ctx, n).map((ex) => ex.key.split(':')[2]));
}

/** All items of a skill over every Stufe and AB level. */
export function allItems(skill: SkillDef, ctx: Partial<GenContext> = {}, n = 150): Exercise[] {
  return ([1, 2, 3] as Stufe[]).flatMap((stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) => atAb(skill, stufe, ab, ctx, n)));
}

/** The items of one planned practice round, as src/ui/practice/Round.tsx draws them: the AB levels of the Stufe, each key new in the round. */
export function plannedRound(skill: SkillDef, stufe: Stufe, seed: number): Exercise[] {
  const seen = new Set<string>();
  return abSequence(stufe).map((ab, i) => {
    const ex = generateUnique(skill, stufe, seed * 7193 + i, { extras: true, ab }, seen);
    seen.add(ex.key);
    return ex;
  });
}

/** The worked step that shows the right picture of a choice between pictures, under its name: the worked example renders no options. */
export function rightPictureStep(ex: Exercise) {
  const answer = ex.answer as ChoiceAnswer;
  const right = answer.options[answer.correct];
  return ex.steps.find((s) => typeof s !== 'string' && s.text.startsWith(`${right.label}:`) && JSON.stringify(s.visual) === JSON.stringify(right.visual));
}

const value = (side: string): number | null => {
  const s = side.trim();
  if (/^\d+$/.test(s)) return Number(s);
  let m = /^(\d+) · (\d+)$/.exec(s);
  if (m) return Number(m[1]) * Number(m[2]);
  m = /^(\d+) : (\d+)$/.exec(s);
  if (m) return Number(m[1]) / Number(m[2]);
  if (/^\d+( \+ \d+)+$/.test(s)) return s.split(' + ').reduce((sum, x) => sum + Number(x), 0);
  m = /^(\d+) · (\d+) ([+−]) (\d+)$/.exec(s);
  if (m) return Number(m[1]) * Number(m[2]) + (m[3] === '+' ? 1 : -1) * Number(m[4]);
  m = /^(\d+) · (\d+) ([+−]) (\d+) · (\d+)$/.exec(s);
  if (m) return Number(m[1]) * Number(m[2]) + (m[3] === '+' ? 1 : -1) * Number(m[4]) * Number(m[5]);
  return null;
};

/** Solves 'side = side' for one □ by trying every whole number; every side is computed here, not taken from the generator. */
export function solve(expression: string): number[] {
  const out: number[] = [];
  const parts = expression.split(' = ');
  for (let x = 0; x <= 200; x++) {
    const sides = parts.map((p) => {
      const filled = p.replace('□', String(x));
      return filled === p ? value(p) : value(filled);
    });
    if (sides.every((v) => v !== null) && sides.every((v) => v === sides[0])) out.push(x);
  }
  return out;
}
