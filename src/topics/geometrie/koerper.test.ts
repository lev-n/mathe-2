import { describe, expect, it } from 'vitest';
import { formatAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Exercise, GenContext, SolidKind, Stufe, Visual } from '../../core/types';
import { solidAriaLabel } from '../../ui/visuals/SolidVisual';
import { samples } from '../test-utils';
import { koerperSkill } from './koerper';

describeSkill(koerperSkill, { minDistinct: { 1: 20, 2: 20, 3: 30 } });

const OTHER: SolidKind[] = ['zylinder', 'kegel', 'pyramide', 'prisma'];
const NAMES: Record<string, string> = { wuerfel: 'Würfel', quader: 'Quader', kugel: 'Kugel', zylinder: 'Zylinder', kegel: 'Kegel', pyramide: 'Pyramide', prisma: 'Prisma' };
const solidOf = (ex: Exercise) => (ex.visual as Extract<Visual, { type: 'solid' }>).solid;

/** Corners, edges and faces by Euler: V − E + F = 2 for the polyhedra of this skill. */
const TRUE: Record<string, Record<string, number>> = {
  wuerfel: { Ecken: 8, Kanten: 12, Flächen: 6 },
  quader: { Ecken: 8, Kanten: 12, Flächen: 6 },
  pyramide: { Ecken: 5, Kanten: 8, Flächen: 5 },
  prisma: { Ecken: 6, Kanten: 9, Flächen: 5 },
  kugel: { Ecken: 0, Kanten: 0 },
};

const generated = (stufe: Stufe, ctx: GenContext, n = 600) => Array.from({ length: n }, (_, i) => koerperSkill.generate(createRng(i * 311 + stufe), stufe, ctx));

describe('Körper – independent checks', () => {
  it('the picture of a task on the form of a face does not state the form to a screen reader', () => {
    const list = samples(koerperSkill, 2, 400).filter((ex) => ex.key.includes(':form:'));
    expect(list.length).toBeGreaterThan(3);
    for (const ex of list) {
      if (ex.visual?.type !== 'solid') throw new Error(ex.key);
      const label = solidAriaLabel(ex.visual.solid, ex.visual.named);
      expect(label, ex.key).not.toMatch(/Quadrat|Rechteck/);
    }
  });

  it('the table fits Euler’s formula', () => {
    for (const s of ['wuerfel', 'quader', 'pyramide', 'prisma']) expect(TRUE[s].Ecken - TRUE[s].Kanten + TRUE[s].Flächen, s).toBe(2);
  });

  it('counts are the true numbers; the visible-only bug is below the total', () => {
    const list = [1, 2, 3].flatMap((s) => samples(koerperSkill, s as Stufe)).filter((e) => e.key.includes(':anzahl:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const part = /:anzahl:(\p{L}+):/u.exec(ex.key)![1];
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(TRUE[solidOf(ex)][part]);
      for (const b of ex.bugs ?? []) if (/-verdeckt$/.test(b.id)) expect(b.match as number, ex.key).toBeLessThan(TRUE[solidOf(ex)][part]);
    }
  });

  it('the bug of §5: 9 Kanten, 7 Ecken and 3 Flächen visible on a Würfel or Quader', () => {
    const list = [2, 3].flatMap((s) => samples(koerperSkill, s as Stufe)).filter((e) => /:anzahl:\p{L}+:(wuerfel|quader)$/u.test(e.key));
    const seen = new Map<string, unknown>();
    for (const ex of list) for (const b of ex.bugs ?? []) if (/-verdeckt$/.test(b.id)) seen.set(b.id, b.match);
    expect(Object.fromEntries(seen)).toEqual({ 'kanten-verdeckt': 9, 'ecken-verdeckt': 7, 'flaechen-verdeckt': 3 });
  });

  it('the hint on hidden Flächen names all of them: visible and named add up to the total', () => {
    const list = [...[2, 3].flatMap((s) => samples(koerperSkill, s as Stufe)), ...generated(3, { extras: true, ab: 3 }, 1200)].filter((e) => e.key.includes(':anzahl:Flächen:'));
    expect(new Set(list.map((e) => solidOf(e))).size).toBe(4);
    for (const ex of list) {
      const bug = ex.bugs!.find((b) => b.id === 'flaechen-verdeckt')!;
      const named = bug.hint.match(/\b(oben|unten|vorne|hinten|links|rechts)\b/g) ?? [];
      expect((bug.match as number) + named.length, `${ex.key}: ${bug.hint}`).toBe(TRUE[solidOf(ex)].Flächen);
    }
  });

  it('a task without a picture does not point at one, and "dieser Körper" never means an option just named', () => {
    const list = [...[1, 2, 3].flatMap((s) => samples(koerperSkill, s as Stufe)), ...generated(3, { extras: true, ab: 3 }, 1200)].filter((e) => !e.visual && e.answer.kind === 'choice' && !e.answer.options.some((o) => o.visual));
    expect(list.some((e) => e.key.includes(':alltag:'))).toBe(true);
    expect(list.some((e) => e.key.includes(':stimmt:'))).toBe(true);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      for (const t of [...ex.hints, ...ex.answer.options.map((o) => o.whyWrong ?? '')]) expect(t, ex.key).not.toMatch(/[Dd]ieser Körper|Schau\b|im Bild/);
    }
  });

  it('everyday things: each reason names the thing, and no thing can also be the wrong option (a Schachtel can be a Würfel)', () => {
    const list = [1, 2, 3].flatMap((s) => samples(koerperSkill, s as Stufe)).filter((e) => e.key.includes(':alltag:'));
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      expect(ex.prompt, ex.key).not.toContain('Schachtel');
      const thing = /wie (?:ein|eine) (\p{L}+)\?$/u.exec(ex.prompt)![1];
      for (const o of ex.answer.options) if (o.whyWrong) expect(o.whyWrong, ex.key).toContain(thing);
    }
  });

  it('riddles: the hints send the child through two clue sentences, and each riddle has them', () => {
    const list = [1, 2, 3].flatMap((s) => samples(koerperSkill, s as Stufe)).filter((e) => e.key.includes(':wer:'));
    expect(list.length).toBeGreaterThan(5);
    for (const ex of list) expect(ex.prompt.match(/[.?]/g)?.length, ex.prompt).toBe(3);
  });

  it('hidden parts: total minus visible', () => {
    const list = [1, 2, 3].flatMap((s) => samples(koerperSkill, s as Stufe)).filter((e) => e.key.includes(':verdeckt:'));
    expect(list.length).toBeGreaterThan(5);
    for (const ex of list) {
      const part = /:verdeckt:(\p{L}+):/u.exec(ex.key)![1];
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe({ Ecken: 1, Kanten: 3, Flächen: 3 }[part]);
    }
  });

  it('hidden parts: no unit, so never "1 Ecken" and no singular beside the empty field; the words say what the picture shows', () => {
    const list = [1, 2, 3].flatMap((s) => samples(koerperSkill, s as Stufe)).filter((e) => e.key.includes(':verdeckt:'));
    for (const ex of list) {
      expect(formatAnswer(ex.answer), ex.key).toMatch(/^\d+$/);
      const part = /:verdeckt:(\p{L}+):/u.exec(ex.key)![1];
      const visible = { Ecken: 7, Kanten: 9, Flächen: 3 }[part];
      expect(ex.srText, ex.key).toContain(`Du siehst ${visible} ${part}.`);
      expect(ex.srText, ex.key).toContain(NAMES[solidOf(ex)]);
    }
  });

  it('the Flächen hint fits the Körper: a Pyramide and a Prisma have no Fläche on top', () => {
    const list = generated(3, { extras: true, ab: 2 }, 1200).filter((e) => /:anzahl:Flächen:(pyramide|prisma)$/.test(e.key));
    expect(new Set(list.map((e) => solidOf(e))).size).toBe(2);
    for (const ex of list) expect(ex.hints.join(' '), ex.key).not.toMatch(/\boben\b/);
  });

  it('one word for one thing: lines are Kanten, and the word Seite does not appear', () => {
    const list = [1, 2, 3].flatMap((s) => samples(koerperSkill, s as Stufe));
    for (const ex of [...list, ...generated(3, { extras: true, ab: 3 }, 1200)]) {
      const whyWrong = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.whyWrong ?? '') : [];
      const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
      for (const t of [...ex.hints, ...steps, ...whyWrong, ...(ex.bugs ?? []).map((b) => b.hint), ex.praise]) expect(t, ex.key).not.toMatch(/seite/i);
    }
  });

  it('statements: no claim the steps cannot show, and the last step says which sentence is meant', () => {
    const list = generated(3, { extras: false, ab: 3 }).filter((e) => e.key.includes(':stimmt:'));
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      expect(ex.prompt, ex.key).not.toContain('Jeder Würfel');
      expect(ex.steps[ex.steps.length - 1], ex.key).toMatch(/^Der Satz in der Aufgabe stimmt( nicht)?\.$/);
    }
  });

  it('the praise of a round Körper does not speak of its Ecken', () => {
    const list = [1, 2, 3].flatMap((s) => samples(koerperSkill, s as Stufe)).filter((e) => /:(name|stoss):kugel$/.test(e.key));
    expect(list.length).toBeGreaterThan(5);
    for (const ex of list) expect(ex.praise, ex.key).not.toMatch(/Ecken|Kanten/);
  });

  it('naming: the right option is the drawn Körper; Quader is no wrong option for a Würfel', () => {
    const list = [1, 2, 3].flatMap((s) => samples(koerperSkill, s as Stufe)).filter((e) => e.prompt === 'Wie heißt dieser Körper?');
    expect(list.length).toBeGreaterThan(20);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(NAMES[solidOf(ex)]);
      if (solidOf(ex) === 'wuerfel') expect(ex.answer.options.map((o) => o.label)).not.toContain('Quader');
    }
  });

  it('the label of Stufe 3 keeps its promise with extras off: the other solids stand only behind "Mit Extras"', () => {
    const [always, extra] = koerperSkill.stufen[3].split('Mit Extras');
    for (const name of ['Zylinder', 'Kegel', 'Pyramide', 'Prisma']) {
      expect(always).not.toContain(name);
      expect(extra).toContain(name);
    }
    const keys = (ab: 1 | 3) => generated(3, { extras: false, ab }).map((e) => e.key);
    expect(always).toMatch(/Sätze prüfen/);
    expect(keys(3).some((k) => k.includes(':stimmt:'))).toBe(true);
    expect(always).toMatch(/verdeckte Teile/);
    expect(keys(1).some((k) => k.includes(':verdeckt:'))).toBe(true);
    for (const stufe of [1, 2] as Stufe[]) expect(koerperSkill.stufen[stufe]).not.toMatch(/Zylinder|Kegel|Pyramide|Prisma/);
  });

  it('other solids only on Stufe 3 with extras on (docs/research.md §6, adult page)', () => {
    const uses = (ex: Exercise) => {
      const text = JSON.stringify(ex);
      return OTHER.some((s) => text.includes(`"${s}"`)) || ['Zylinder', 'Kegel', 'Pyramide', 'Prisma'].some((n) => ex.prompt.includes(n));
    };
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ab of [1, 2, 3] as const) expect(generated(stufe, { extras: true, ab }).filter(uses), `Stufe ${stufe} AB ${ab}`).toEqual([]);
    }
    for (const ab of [1, 2, 3] as const) expect(generated(3, { extras: false, ab }).filter(uses), `AB ${ab}, extras off`).toEqual([]);
    for (const ab of [1, 2, 3] as const) expect(generated(3, { extras: true, ab }).filter(uses).length, `AB ${ab}`).toBeGreaterThan(200);
  });

  const formOf = (ex: Exercise) => ex.key.split(':')[2];
  const formsAt = (stufe: Stufe, ab: 1 | 2 | 3, extras = true) => new Set(generated(stufe, { extras, ab }, 400).map(formOf));

  it('the Stufe chooses the content, the AB the demand inside it', () => {
    expect(formsAt(1, 1)).toEqual(new Set(['name', 'finde', 'ist', 'flach']));
    expect(formsAt(1, 2)).toEqual(new Set(['stoss', 'welcher', 'alltag']));
    expect(formsAt(1, 3)).toEqual(new Set(['ding', 'dingform', 'raetsel']));
    expect(formsAt(2, 1)).toEqual(new Set(['anzahl', 'form']));
    expect(formsAt(2, 2)).toEqual(new Set(['zwei-teile', 'anzahl']));
    expect(formsAt(2, 3)).toEqual(new Set(['welcher-teil', 'wer', 'flaechen-rest']));
    expect(formsAt(3, 1, false)).toEqual(new Set(['verdeckt']));
    expect(formsAt(3, 2, false)).toEqual(new Set(['verdeckt-zwei', 'zwei-koerper']));
    expect(formsAt(3, 3, false)).toEqual(new Set(['stimmt', 'satz', 'sichtbar']));
  });

  it('Stufe 1, AB I has variety: 5 of 8 places in a round come from it, so a handful of fixed items repeats within one round', () => {
    const keys = new Set(generated(1, { extras: true, ab: 1 }, 800).map((e) => e.key));
    expect(keys.size).toBeGreaterThanOrEqual(16);
  });

  it('does the name fit: by the drawn Körper, and a Würfel is never claimed to be no Quader', () => {
    const list = generated(1, { extras: true, ab: 1 }, 500).filter((e) => e.key.includes(':ist:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const [drawn, claim] = ex.key.split(':').slice(3);
      expect(solidOf(ex), ex.key).toBe(drawn);
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(drawn === claim ? 'Ja' : 'Nein');
      if (drawn === 'wuerfel') expect(claim, ex.key).not.toBe('quader');
    }
  });

  it('Körper or flat: the type of the picture decides', () => {
    const list = generated(1, { extras: true, ab: 1 }, 500).filter((e) => e.key.includes(':flach:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(ex.visual?.type === 'solid' ? 'Ein Körper' : 'Eine flache Figur');
    }
  });

  it('Stufe 1 stays with Würfel, Quader and Kugel, without the numbers of Stufe 2', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of generated(1, { extras: true, ab }, 300)) {
        expect(ex.answer.kind, ex.key).toBe('choice');
        expect(ex.prompt, ex.key).not.toMatch(/\d/);
      }
    }
  });

  it('Stufe 2 at AB II: two parts together, recomputed', () => {
    const list = generated(2, { extras: true, ab: 2 }, 400).filter((e) => e.key.includes(':zwei-teile:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const [a, b, s] = ex.key.split(':').slice(3);
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(TRUE[s][a] + TRUE[s][b]);
    }
  });

  it('Stufe 2 at AB III: the part of a number, and the Flächen left free, recomputed', () => {
    const list = generated(2, { extras: true, ab: 3 }, 400);
    const parts = list.filter((e) => e.key.includes(':welcher-teil:'));
    expect(parts.length).toBeGreaterThan(50);
    for (const ex of parts) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const [part, s] = ex.key.split(':').slice(3);
      expect(ex.prompt, ex.key).toContain(String(TRUE[s][part]));
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(part);
    }
    const rest = list.filter((e) => e.key.includes(':flaechen-rest:'));
    expect(rest.length).toBeGreaterThan(50);
    for (const ex of rest) expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(6 - Number(ex.key.split(':').pop()));
  });

  it('Stufe 3 without extras: two bodies, two kinds of hidden parts and the visible parts, recomputed', () => {
    const hidden: Record<string, number> = { Ecken: 1, Kanten: 3, Flächen: 3 };
    for (const ex of generated(3, { extras: false, ab: 2 }, 400)) {
      const parts = ex.key.split(':').slice(3);
      const value = ex.answer.kind === 'number' && ex.answer.value;
      if (ex.key.includes(':verdeckt-zwei:')) expect(value, ex.key).toBe(hidden[parts[0]] + hidden[parts[1]]);
      else expect(value, ex.key).toBe(TRUE[parts[1]][parts[0]] + TRUE[parts[2]][parts[0]]);
    }
    for (const ex of generated(3, { extras: false, ab: 3 }, 400).filter((e) => e.key.includes(':sichtbar:'))) {
      const [part, s] = ex.key.split(':').slice(3);
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(TRUE[s][part] - hidden[part]);
    }
  });

  it('which sentence: exactly the one asked for holds or does not hold', () => {
    const list = generated(3, { extras: false, ab: 3 }, 600).filter((e) => e.key.includes(':satz:'));
    expect(list.length).toBeGreaterThan(50);
    const known: Record<string, boolean> = {
      'Würfel und Quader haben gleich viele Ecken.': true, 'Ein Würfel hat mehr Kanten als ein Quader.': false, 'Jeder Quader ist auch ein Würfel.': false,
      'Eine Kugel hat eine Ecke.': false, 'Alle Flächen von einem Würfel sind gleich groß.': true, 'Ein Quader hat 6 Flächen.': true,
    };
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const asked = ex.prompt === 'Welcher Satz stimmt?';
      expect(ex.answer.options.filter((o) => known[o.label] === asked).map((o) => o.label), ex.key).toEqual([ex.answer.options[ex.answer.correct].label]);
    }
  });

  it('hidden parts of the other solids: total minus visible, and the words say what the picture shows', () => {
    const list = generated(3, { extras: true, ab: 3 }, 800).filter((e) => e.key.includes(':verdeckt-weitere:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const part = ex.key.split(':')[3];
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe({ Ecken: 1, Kanten: 3, Flächen: 3 }[part]);
      expect(ex.srText, ex.key).toContain(NAMES[solidOf(ex)]);
    }
  });

  it('comparing the other solids: the answer comes from the counts', () => {
    const list = generated(3, { extras: true, ab: 3 }, 800).filter((e) => e.key.includes(':mehr-teile:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const [part, a, b] = ex.key.split(':').slice(3);
      const want = TRUE[a][part] === TRUE[b][part] ? 'Beide gleich viele' : TRUE[a][part] > TRUE[b][part] ? NAMES[a] : NAMES[b];
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(want);
    }
  });

  it('finding a Körper: the right picture is the named one, and a Würfel is no wrong picture for a Quader', () => {
    const list = [...generated(1, { extras: true, ab: 1 }, 300), ...generated(3, { extras: true, ab: 1 }, 400)].filter((e) => e.prompt.startsWith('Wo ist'));
    expect(list.length).toBeGreaterThan(100);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const right = ex.answer.options[ex.answer.correct].visual as Extract<Visual, { type: 'solid' }>;
      expect(ex.prompt, ex.key).toContain(NAMES[right.solid]);
      if (right.solid === 'quader') for (const o of ex.answer.options) expect((o.visual as { solid?: string }).solid, ex.key).not.toBe('wuerfel');
    }
  });
});
