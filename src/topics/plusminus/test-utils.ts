/** Test support for this topic (imported only by *.test.ts): independent recomputation of answers. */
import { expect } from 'vitest';
import { createRng } from '../../core/rng';
import { checkAnswer } from '../../core/check';
import { fmt } from '../../core/format';
import type { Ab, Exercise, SkillDef, Stufe, Visual } from '../../core/types';
import { baseTenLabel } from '../../ui/visuals/BaseTenVisual';
import { dotArrayAriaLabel } from '../../ui/visuals/DotArrayVisual';
import { fieldLabel } from '../../ui/visuals/FieldVisual';
import { NL, layoutLabels, numberLineAriaLabel, xScale } from '../../ui/visuals/NumberLineVisual';
import { numberWallLabel } from '../../ui/visuals/NumberWallVisual';
import { checkStepText, checkWorkedSolution, evalSide } from '../step-check';

/** n exercises of one Stufe and one planned AB level (seeds differ from the shared suite's seeds). */
export function atAb(skill: SkillDef, ab: Ab, stufe: Stufe, n = 250): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 4793 + 11 + ab), stufe, { extras: true, ab }));
}

const value = (text: string) => evalSide(text)?.value ?? null;

/** true if `expression` with v in the gap is a true equation. */
export function trueWith(expression: string, v: number): boolean {
  const sides = expression.replace('□', String(v)).split(' = ').map(value);
  return sides.length === 2 && sides[0] !== null && sides[0] === sides[1];
}

/** The answer solves the gap of the expression, and no other number from 0 to 200 does. */
export function expectGapSolved(ex: Exercise): void {
  if (ex.answer.kind !== 'number' || !ex.expression?.includes('□') || ex.answer.value === null) throw new Error(`${ex.key}: no number answer with a gap`);
  const solutions = Array.from({ length: 201 }, (_, v) => v).filter((v) => trueWith(ex.expression!, v));
  expect(solutions, ex.key).toEqual([ex.answer.value]);
}

/** Each multi field, read with its text before and after, is a true equation (fields without an equation are skipped). */
export function expectFieldsTrue(ex: Exercise): void {
  if (ex.answer.kind !== 'multi') throw new Error(`${ex.key}: no multi answer`);
  for (const f of ex.answer.fields) {
    const line = `${f.before ?? ''} ${f.value} ${f.after ?? ''}`.trim().replace(/=$/, '').trim();
    if (!/ = /.test(line) || /[A-Za-zÄÖÜäöüß]/.test(line)) continue;
    const sides = line.split(' = ').map(value);
    expect(sides[0], `${ex.key}: ${line}`).toBe(sides[1]);
  }
}

/**
 * Worked steps add up and state the result: the last step for a number answer; for a multi answer the last step has the last
 * field and some step has each field. No hint states the answer as "= answer", also below 10.
 */
export function expectSolidTexts(ex: Exercise): void {
  const texts = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
  if (ex.answer.kind === 'multi') {
    texts.forEach((t) => expect(checkStepText(t), `${ex.key}: ${t}`).toBeNull());
    const fields = ex.answer.fields;
    for (const f of fields) expect(texts.some((t) => new RegExp(`(?<!\\d)${f.value}(?!\\d)`).test(t)), `${ex.key}: no step has ${f.id}=${f.value}`).toBe(true);
    expect(texts[texts.length - 1], ex.key).toContain(String(fields[fields.length - 1].value));
  } else {
    expect(checkWorkedSolution(ex)).toEqual([]);
  }
  const answers = ex.answer.kind === 'number' && ex.answer.value !== null ? [ex.answer.value] : ex.answer.kind === 'multi' ? ex.answer.fields.map((f) => f.value) : [];
  const shown = `${ex.prompt} ${ex.expression ?? ''}`;
  for (const a of answers) {
    if (new RegExp(`= ${fmt(a)}(?!\\d)`).test(shown)) continue;
    for (const h of ex.hints) expect(new RegExp(`= ${fmt(a)}(?!\\d)`).test(h), `${ex.key}: hint states the answer: ${h}`).toBe(false);
  }
}

/**
 * Everything the child reads or has to compute stays in 0–100 (docs/research.md §6): every number, and every part of a chain
 * like 47 + 40 − 1 read from left to right. Bug hints are left out: they may quote the child's own answer.
 */
export function expectNumbersInRange(ex: Exercise): void {
  const options = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : [];
  const texts = [ex.prompt, ex.expression ?? '', ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)), ...options];
  for (const t of texts) {
    for (const [n] of t.matchAll(/\d+/g)) expect(Number(n), `${ex.key}: ${t}`).toBeLessThanOrEqual(100);
    for (const [chain] of t.matchAll(/\d+(?: [+−] \d+)+/g)) {
      const [first, ...rest] = chain.split(' ');
      let sum = Number(first);
      for (let i = 0; i < rest.length; i += 2) {
        sum += (rest[i] === '+' ? 1 : -1) * Number(rest[i + 1]);
        expect(sum, `${ex.key}: ${t}`).toBeGreaterThanOrEqual(0);
        expect(sum, `${ex.key}: ${t}`).toBeLessThanOrEqual(100);
      }
    }
  }
}

/** Estimated from the drawing constants of NumberLineVisual: labels on one row and the labels of the jumps do not overlap. */
export function expectLinesReadable(ex: Exercise): void {
  const visuals: (Visual | undefined)[] = [ex.visual, ...ex.steps.map((s) => (typeof s === 'string' ? undefined : s.visual))];
  for (const v of visuals) {
    if (v?.type !== 'numberLine' || !v.jumps?.length) continue;
    const rows: [number, number][][] = [[], []];
    for (const l of layoutLabels(v)) {
      const half = (String(l.value).length * NL.FONT * 0.58 + 6) / 2;
      rows[l.row].push([l.x - half, l.x + half]);
    }
    const xOf = xScale(v.min, v.max);
    const jumps = v.jumps.map((j) => {
      const mx = (xOf(j.from) + xOf(j.to)) / 2;
      const half = ((j.label ?? '').length * 16 * 0.58 + 6) / 2;
      return [mx - half, mx + half] as [number, number];
    });
    for (const spans of [...rows, jumps]) {
      const sorted = [...spans].sort((p, q) => p[0] - q[0]);
      sorted.slice(1).forEach((s, i) => expect(s[0], `${ex.key}: ${JSON.stringify(v)}`).toBeGreaterThanOrEqual(sorted[i][1]));
    }
  }
}

/** What the child sees of a task. */
const visibleTask = (ex: Exercise): string => {
  const parts = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label).sort() : ex.answer.kind === 'multi' ? ex.answer.fields.map((f) => `${f.before ?? ''}|${f.after ?? ''}`) : [];
  // The name in 'Bei Mia steckt ein Fehler' changes nothing about the task.
  return JSON.stringify([ex.prompt.replace(/^Bei \S+ steckt/, 'Bei X steckt'), ex.expression, ex.visual, parts]);
};

/** A shown calculation that does not hold: a planted error. Text without a calculation, or with a gap, does not count. */
const plantedError = (text: string): boolean => {
  const sides = text.split(' = ').map(value);
  return sides.length === 2 && sides[0] !== null && sides[1] !== null && sides[0] !== sides[1];
};

/** What the research ties to a Stufe (docs/research.md F6, §7.1): other places of the □ from Stufe 2, the rest on Stufe 3. */
export function expectFormFitsStufe(ex: Exercise): void {
  const expression = ex.expression ?? '';
  if (ex.stufe === 1) expect(expression, ex.key).not.toMatch(/^□|= \d+ [+−] □/);
  if (ex.stufe === 3) return;
  const sides = expression.split(' = ');
  expect(sides.length === 2 && sides.every((s) => /[+−]/.test(s)), `${ex.key}: two-sided: ${expression}`).toBe(false);
  const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [];
  for (const shown of [expression, ...options]) expect(plantedError(shown), `${ex.key}: planted error: ${shown}`).toBe(false);
}

/**
 * Fields wrap one by one (phone, paper): a field's text must not lean on the next field, and no field is a bare box. The label
 * and the voice say the field itself as 'Lücke', so its text must not also name the gap: 'Die Lücke ist Lücke'.
 */
export function expectFieldsStandAlone(ex: Exercise): void {
  if (ex.answer.kind !== 'multi') return;
  for (const f of ex.answer.fields) {
    expect(f.before || f.after, `${ex.key}: bare field ${f.id}`).toBeTruthy();
    expect(f.after ?? '', `${ex.key}: ${f.id} ends in '='`).not.toMatch(/=$/);
    expect(`${f.before ?? ''} ${f.after ?? ''}`, `${ex.key}: ${f.id} names the gap`).not.toMatch(/Lücke|□/);
  }
}

/** A grid hatches its filled cells in print: text on such a cell is hard to read on paper. */
export function expectLabelsOffHatch(ex: Exercise): void {
  const visuals: (Visual | undefined)[] = [ex.visual, ...ex.steps.map((s) => (typeof s === 'string' ? undefined : s.visual))];
  for (const v of visuals) {
    if (v?.type !== 'grid') continue;
    const filled = new Set(v.cells.map((c) => c.join()));
    for (const l of v.labels ?? []) expect(filled.has(l.cell.join()), `${ex.key}: ${l.text} on a filled cell`).toBe(false);
  }
}

const answerNumbers = (ex: Exercise): number[] => (ex.answer.kind === 'number' && ex.answer.value !== null ? [ex.answer.value] : ex.answer.kind === 'multi' ? ex.answer.fields.map((f) => f.value) : []);
const whole = (n: number) => new RegExp(`(?<!\\d)${n}(?!\\d)`);

/**
 * The answer is not on view: not in the prompt, the expression or the accessible text of the task's picture. Three forms stay out by
 * design: a − b = □ with a − b = b (14 − 7) has to be computed all the same, 5 + □ = 10 is a number pair like the others, and a
 * family shows its 3 numbers (the catalogue's 5 + 3 = 8, 8 − 3 = □ asks which of them belongs where).
 */
export function expectAnswerHidden(ex: Exercise): void {
  if (ex.key.includes(':schreiben:') || /^\d+ − \d+ = □$/.test(ex.expression ?? '') || /:(vorne|frage):5:10$/.test(ex.key)) return;
  const v = ex.visual;
  const label = v?.type === 'field' ? fieldLabel(v) : v?.type === 'dotArray' ? dotArrayAriaLabel(v) : v?.type === 'baseTen' ? baseTenLabel(v) : v?.type === 'numberLine' ? numberLineAriaLabel(v) : v?.type === 'numberWall' ? numberWallLabel(v) : '';
  const shown = `${ex.prompt} ${ex.expression ?? ''} ${v?.type === 'table' ? JSON.stringify(v.rows) : ''}`;
  for (const a of ex.answer.kind === 'number' ? answerNumbers(ex) : []) {
    expect(whole(a).test(shown), `${ex.key}: answer ${a} in "${shown}"`).toBe(false);
    // The labels also count rows and ticks (up to 10), and a number line names its tens whatever the task.
    if (a > 10 && !(v?.type === 'numberLine' && a % 10 === 0)) expect(whole(a).test(label), `${ex.key}: answer ${a} in "${label}"`).toBe(false);
  }
}

/**
 * Hints name a number of the answer only when the task itself shows it, below 10 too: 'Dann nimm noch 5 weg' for 11 − 6 is the
 * answer for these digits. The shared suite checks this from 10 on.
 */
export function expectHintsKeepAnswer(ex: Exercise): void {
  const shown = `${ex.prompt} ${ex.expression ?? ''}`;
  // A bug hint of a multi answer speaks about the field the child got wrong; the others it may quote.
  const bugHints = ex.answer.kind === 'multi' ? [] : (ex.bugs ?? []).map((b) => b.hint);
  for (const a of answerNumbers(ex)) {
    // 1 and 2 stand in general words: 'noch 1', 'in 2 gleiche Teile'.
    if (a <= 2 || whole(a).test(shown)) continue;
    for (const h of [...ex.hints, ...bugHints]) expect(whole(a).test(h), `${ex.key}: hint names the answer ${a}: ${h}`).toBe(false);
  }
}

/**
 * The rules every skill of this topic keeps, on all Stufen and AB levels: numbers in range, readable lines, forms that fit the Stufe,
 * the answer out of view, one key per visible task and one visible task per key.
 */
export function expectTopicRules(skill: SkillDef): void {
  for (const stufe of [1, 2, 3] as const) {
    const keyOf = new Map<string, string>();
    const taskOf = new Map<string, string>();
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(skill, ab, stufe, 1000)) {
        expectNumbersInRange(ex);
        expectLinesReadable(ex);
        expectFormFitsStufe(ex);
        expectFieldsStandAlone(ex);
        expectLabelsOffHatch(ex);
        expectAnswerHidden(ex);
        expectHintsKeepAnswer(ex);
        const task = visibleTask(ex);
        expect(ex.key, task).toBe(keyOf.get(task) ?? ex.key);
        keyOf.set(task, ex.key);
        expect(task, ex.key).toBe(taskOf.get(ex.key) ?? task);
        taskOf.set(ex.key, task);
      }
    }
  }
}

/** The response with this number is matched as this bug. */
export function bugIdFor(ex: Exercise, n: number): string | undefined {
  if (ex.answer.kind !== 'number') throw new Error('number answer expected');
  return checkAnswer(ex.answer, { kind: 'number', text: String(n) }, ex.bugs).bugId;
}
