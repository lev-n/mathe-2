/** Test support of the topic (imported only by *.test.ts). */
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';

/** n exercises of one Stufe and planned AB level. */
export function atAb(skill: SkillDef, stufe: Stufe, ab: Ab, n = 200, extras = true): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 5413 + 29 + stufe * 7 + ab), stufe, { extras, ab }));
}

/** The whole numbers of a text, in order. */
export const numbersIn = (text: string) => [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));

/** The kind of task: the first part of the key after '<skill>:<stufe>:'. */
export const kindOf = (ex: Exercise) => ex.key.split(':')[2];

export const numberValue = (ex: Exercise) => {
  if (ex.answer.kind !== 'number') throw new Error(`${ex.key}: not a number answer`);
  return ex.answer.value;
};

export const correctLabel = (ex: Exercise) => {
  if (ex.answer.kind !== 'choice') throw new Error(`${ex.key}: not a choice answer`);
  return ex.answer.options[ex.answer.correct].label;
};

/** Evaluates a label such as '12 − 5', '4 · 5' or '20 : 5'. */
export function evalTerm(label: string): number {
  const m = /^(\d+) ([+−·:]) (\d+)$/.exec(label);
  if (!m) throw new Error(`no term: ${label}`);
  const [x, y] = [Number(m[1]), Number(m[3])];
  return m[2] === '+' ? x + y : m[2] === '−' ? x - y : m[2] === '·' ? x * y : x / y;
}
