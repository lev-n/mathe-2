import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { fragePruefenSkill } from './frage-pruefen';
import { atAb, correctLabel, kindOf, numberValue, numbersIn } from './test-helpers';

describeSkill(fragePruefenSkill, { minDistinct: 25 });

/** Independent spot checks, values as in the context of the task. */
const VERDICTS: [RegExp, RegExp][] = [
  [/Ein Eis kostet 40/, /zu teuer/],
  [/Ein Eis kostet 2/, /^Ja/],
  [/Eine Schultasche kostet 2 ct/, /zu billig/],
  [/Eine Tür ist 2 m hoch/, /^Ja/],
  [/Eine Tür ist 2 cm hoch/, /zu niedrig/],
  [/Ein Schulbus ist 90 m lang/, /zu lang/],
  [/Ein Schulbus ist 12 cm lang/, /zu kurz/],
];

const storyOfTask = (ex: Exercise) => [ex.context, ex.prompt].filter(Boolean).join(' ');
const isButton = (ex: Exercise) => ex.answer.kind === 'number' && ex.answer.offerUnsolvable === true;

describe('sachaufgaben.frage-pruefen, Stufe 1: is a price or a length plausible?', () => {
  it('AB I: the verdict on a price or a length is right', () => {
    const exercises = atAb(fragePruefenSkill, 1, 1, 800);
    for (const ex of exercises) expect(kindOf(ex)).toBe('stimmt');
    for (const [statement, verdict] of VERDICTS) {
      const found = exercises.filter((e) => statement.test(e.context!.replace(/ /g, ' ')));
      expect(found.length, String(statement)).toBeGreaterThan(0);
      found.forEach((e) => expect(correctLabel(e), e.context).toMatch(verdict));
    }
  });

  it('AB II: the value or the unit that fits is among the options, and the others carry the plausibility hint', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(fragePruefenSkill, 1, 2, 400)) {
      kinds.add(kindOf(ex));
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      expect(ex.answer.options.length).toBeGreaterThanOrEqual(2);
      expect(ex.answer.options.length).toBeLessThanOrEqual(4);
      ex.answer.options.forEach((o, i) => {
        if (i !== (ex.answer.kind === 'choice' ? ex.answer.correct : -1)) expect(o.whyWrong, ex.key).toMatch(/Kann das stimmen/);
      });
      if (kindOf(ex) === 'einheit') {
        expect(ex.answer.options.length).toBe(2);
        expect(numbersIn(ex.answer.options[0].label)).toEqual(numbersIn(ex.answer.options[1].label));
      }
    }
    expect([...kinds].sort()).toEqual(['einheit', 'wert']);
  });

  it('AB II: no hint names the value that fits', () => {
    const items = atAb(fragePruefenSkill, 1, 2, 1000).filter((e) => kindOf(e) === 'wert');
    for (const ex of items) for (const hint of ex.hints) expect(hint, ex.key).not.toContain(correctLabel(ex));
  });

  it('AB III: three sentences about different things; the one that cannot be true is the answer', () => {
    for (const ex of atAb(fragePruefenSkill, 1, 3, 300)) {
      expect(kindOf(ex)).toBe('welcher-satz');
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      expect(ex.answer.options.length).toBe(3);
      const subjects = ex.answer.options.map((o) => o.label.split(' ').slice(0, 2).join(' '));
      expect(new Set(subjects).size, ex.key).toBe(3);
    }
    const eis = atAb(fragePruefenSkill, 1, 3, 800).filter((e) => correctLabel(e).startsWith('Ein Eis'));
    expect(eis.length).toBeGreaterThan(0);
    for (const ex of eis) expect(correctLabel(ex), ex.key).toMatch(/(40|90) €/);
  });

  it('stays with prices and lengths: no calculation on Stufe 1', () => {
    for (const ab of [1, 2, 3] as const) for (const ex of atAb(fragePruefenSkill, 1, ab, 200)) expect(ex.answer.kind, ex.key).toBe('choice');
  });

  it('a length gets a hint with sizes the child knows, on true statements as well', () => {
    const lengths = atAb(fragePruefenSkill, 1, 1, 400).filter((e) => !/kostet/.test(storyOfTask(e)));
    expect(lengths.some((e) => /Schulbus ist 1\d m/.test(e.context ?? '') && correctLabel(e).startsWith('Ja'))).toBe(true);
    for (const ex of lengths) expect(ex.hints[1], ex.key).toMatch(/Finger.*1 cm.*Schritt.*1 m/);
  });
});

describe('sachaufgaben.frage-pruefen, Stufe 2: one number in the story is not needed', () => {
  it('every item has three numbers in its story, and no button at any AB', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(fragePruefenSkill, 2, ab, 200)) {
        expect(numbersIn(ex.context!).length, ex.key).toBe(3);
        expect(isButton(ex), ex.key).toBe(false);
      }
    }
  });

  it('AB I: "Welche Zahl brauchst du nicht?" names the number that belongs to something else', () => {
    for (const ex of atAb(fragePruefenSkill, 2, 1, 300)) {
      expect(kindOf(ex)).toBe('welche-zahl');
      expect(Number(correctLabel(ex)), ex.key).toBe(numbersIn(ex.context!)[1]);
    }
  });

  it('AB II: the extra number is not used, and using all numbers gets the hint from §5', () => {
    for (const ex of atAb(fragePruefenSkill, 2, 2, 300)) {
      expect(kindOf(ex)).toBe('extra');
      const [a, x, c] = numbersIn(ex.context!);
      const plus = /pflückt|bekommt/.test(ex.context!);
      expect(numberValue(ex), ex.key).toBe(plus ? a + c : a - c);
      const all = plus ? a + x + c : a + x - c;
      expect(checkAnswer(ex.answer, { kind: 'number', text: String(all) }, ex.bugs).bugId, ex.key).toBe('alle-zahlen');
    }
  });

  it('AB III: the extra number has the same noun; recomputed, and the calculation leaves the extra number out', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(fragePruefenSkill, 2, 3, 400)) {
      const kind = kindOf(ex);
      kinds.add(kind);
      const [a, x, c] = numbersIn(ex.context!);
      const plus = /bekommt/.test(ex.context!);
      const noun = ex.key.split(':')[3];
      expect(ex.context, ex.key).toContain(`${a} ${noun}`);
      expect(ex.context, ex.key).toContain(`${x} ${noun}`);
      if (kind === 'gleiche-sache') expect(numberValue(ex), ex.key).toBe(plus ? a + c : a - c);
      else expect(correctLabel(ex), ex.key).toBe(`${a} ${plus ? '+' : '−'} ${c}`);
    }
    expect([...kinds].sort()).toEqual(['gleiche-sache', 'welche-rechnung']);
  });
});

describe('sachaufgaben.frage-pruefen, Stufe 3: missing information and Kapitänsaufgaben', () => {
  it('AB I: choices: what is missing, and whether the question fits; the sentence "nicht ausrechnen" is not always right', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(fragePruefenSkill, 3, 1, 500)) {
      kinds.add(kindOf(ex));
      expect(ex.answer.kind, ex.key).toBe('choice');
      if (kindOf(ex) === 'kapitaen-wahl') expect(correctLabel(ex), ex.key).toMatch(/nicht ausrechnen/);
      else if (kindOf(ex) === 'passt-wahl') {
        const [a, b] = numbersIn(ex.context!);
        expect(numbersIn(correctLabel(ex))[0], ex.key).toBe(a + b);
      } else expect(correctLabel(ex), ex.key).toMatch(/^Wie viele? /);
    }
    expect([...kinds].sort()).toEqual(['fehlt-wahl', 'kapitaen-wahl', 'passt-wahl']);
  });

  it('AB I: the age options say "1 Jahr" and "2 Jahre"', () => {
    const labels = atAb(fragePruefenSkill, 3, 1, 800).flatMap((e) => (kindOf(e) === 'kapitaen-wahl' && e.answer.kind === 'choice' ? e.answer.options.map((o) => o.label) : []));
    expect(labels).toContain('1 Jahr');
    for (const label of labels) if (/Jahre?$/.test(label)) expect(label, label).toMatch(label.startsWith('1 ') ? /^1 Jahr$/ : /^\d+ Jahre$/);
  });

  it('AB II and III: the button is always there, some items can be solved, some cannot', () => {
    for (const ab of [2, 3] as const) {
      const exercises = atAb(fragePruefenSkill, 3, ab, 400);
      const solvable = exercises.filter((e) => e.answer.kind === 'number' && e.answer.value !== null);
      const notSolvable = exercises.filter((e) => e.answer.kind === 'number' && e.answer.value === null);
      expect(solvable.length).toBeGreaterThan(0);
      expect(notSolvable.length).toBeGreaterThan(0);
      for (const ex of exercises) expect(isButton(ex), ex.key).toBe(true);
    }
  });

  it('AB II: Kapitänsaufgaben, a missing number, and the same story solved, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(fragePruefenSkill, 3, 2, 500)) {
      const kind = kindOf(ex);
      kinds.add(kind);
      const n = numbersIn(ex.context!);
      if (kind === 'kapitaen') {
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(n[0] + n[1]) }, ex.bugs).bugId, ex.key).toBe('alle-zahlen');
      } else if (kind === 'fehlt') {
        expect(n.length, 'a number is missing').toBe(1);
      } else {
        const id = ex.key.split(':')[3];
        expect(numberValue(ex), ex.key).toBe(id === 'sticker' ? n[0] + n[1] : id === 'hefte' ? n[0] * n[1] : n[0] - n[1]);
      }
    }
    expect([...kinds].sort()).toEqual(['fehlt', 'kapitaen', 'loesbar']);
  });

  it('AB III: a story that cannot be solved has a second number too; an extra number does not stop a solvable one', () => {
    const kinds = new Set<string>();
    for (const ex of atAb(fragePruefenSkill, 3, 3, 400)) {
      const kind = kindOf(ex);
      kinds.add(kind);
      const n = numbersIn(ex.context!);
      if (kind === 'fehlt-zweite') {
        expect(n.length, ex.key).toBe(2);
        expect(numberValue(ex), ex.key).toBeNull();
      } else {
        expect(n.length, ex.key).toBe(3);
        const plus = /pflückt|bekommt/.test(ex.context!);
        expect(numberValue(ex), ex.key).toBe(plus ? n[0] + n[2] : n[0] - n[2]);
      }
    }
    expect([...kinds].sort()).toEqual(['extra', 'fehlt-zweite']);
  });

  it('AB I: the task says what is being calculated when it asks what is missing', () => {
    const missing = atAb(fragePruefenSkill, 3, 1, 600).filter((e) => kindOf(e) === 'fehlt-wahl');
    expect(missing.length).toBeGreaterThan(0);
    for (const ex of missing) expect(ex.prompt, ex.key).toMatch(/^Was musst du für .+ noch wissen\?$/);
  });

  it('a solved story always leaves at least 2: "1 Kinder" would not read', () => {
    const solved = atAb(fragePruefenSkill, 3, 2, 4000).filter((e) => kindOf(e) === 'loesbar');
    expect(solved.length).toBeGreaterThan(100);
    for (const ex of solved) expect(numberValue(ex), ex.key).toBeGreaterThanOrEqual(2);
  });

  it('T13: stories with an extra number ask the same way with plus and with minus', () => {
    for (const [stufe, ab] of [[2, 2], [2, 3], [3, 3]] as const) {
      for (const ex of atAb(fragePruefenSkill, stufe, ab, 400)) expect(ex.prompt, ex.key).not.toMatch(/\bnoch\b/);
    }
  });

  it('no calculation to choose from is impossible: the wrong minus has the larger number first', () => {
    for (const ex of atAb(fragePruefenSkill, 2, 3, 800).filter((e) => kindOf(e) === 'welche-rechnung')) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      for (const o of ex.answer.options) {
        const [x, sign, y] = o.label.split(' ');
        if (sign === '−') expect(Number(x), `${ex.key}: ${o.label}`).toBeGreaterThanOrEqual(Number(y));
      }
    }
  });

  it('the button belongs to Stufe 3 only', () => {
    for (const stufe of [1, 2] as const) for (const ab of [1, 2, 3] as const) for (const ex of atAb(fragePruefenSkill, stufe, ab, 100)) expect(isButton(ex), ex.key).toBe(false);
  });
});
