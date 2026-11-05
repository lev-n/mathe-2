import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Exercise, ShapeKind, Visual } from '../../core/types';
import { shapeAriaLabel } from '../../ui/visuals/ShapeVisual';
import { samples } from '../test-utils';
import { formenSkill } from './formen';

describeSkill(formenSkill);

const CORNERS: Record<string, number> = { quadrat: 4, rechteck: 4, dreieck: 3, 'gleichseitiges-dreieck': 3, kreis: 0 };
const NAMES: Record<string, string> = { quadrat: 'Quadrat', rechteck: 'Rechteck', dreieck: 'Dreieck', 'gleichseitiges-dreieck': 'Dreieck', kreis: 'Kreis' };
const shapeOf = (v: Visual | undefined) => (v as Extract<Visual, { type: 'shape' }>).shape;
const right = (ex: Exercise) => {
  if (ex.answer.kind !== 'choice') throw new Error('choice expected');
  return ex.answer.options[ex.answer.correct];
};
const all = (kind: string) => [1, 2, 3].flatMap((s) => samples(formenSkill, s as 1 | 2 | 3)).filter((e) => e.key.includes(`:${kind}:`));

describe('Flächenformen – independent checks', () => {
  it('the picture of a counting task does not state the count to a screen reader', () => {
    const list = samples(formenSkill, 2, 300).filter((ex) => ex.key.includes(':zaehlen:'));
    expect(list.length).toBeGreaterThan(5);
    for (const ex of list) {
      if (ex.visual?.type !== 'shape') throw new Error(ex.key);
      expect(ex.visual.named, ex.key).toBe(true);
      expect(shapeAriaLabel(ex.visual.shape, ex.visual.rotate, ex.visual.named), ex.key).not.toMatch(/Ecken|Seiten/);
    }
  });

  it('naming: the answer is the name of the drawn figure, and a Quadrat is never asked to be told from a Rechteck', () => {
    for (const ex of [...all('name'), ...all('gedreht')]) {
      expect(right(ex).label, ex.key).toBe(NAMES[shapeOf(ex.visual)]);
      if (shapeOf(ex.visual) === 'quadrat' && ex.answer.kind === 'choice') expect(ex.answer.options.map((o) => o.label), ex.key).not.toContain('Rechteck');
    }
    expect(all('gedreht').length).toBeGreaterThan(10);
  });

  it('finding: the right picture shows the named figure, and no Quadrat is a wrong picture for a Rechteck', () => {
    for (const ex of all('finde')) {
      const name = /Wo ist (?:das|der) (\w+)\?/.exec(ex.prompt)![1];
      expect(NAMES[shapeOf(right(ex).visual)], ex.key).toBe(name);
      if (name === 'Rechteck' && ex.answer.kind === 'choice') expect(ex.answer.options.map((o) => shapeOf(o.visual)), ex.key).not.toContain('quadrat');
    }
  });

  it('counting: Ecken and Seiten equal the corners of the drawn figure', () => {
    const list = all('zaehlen');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(CORNERS[shapeOf(ex.visual)]);
  });

  it('Ecken together: the answer is the sum over the shape row; bugs compute from the pattern', () => {
    const list = all('zusammen');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      const v = ex.visual as Extract<Visual, { type: 'shapeRow' }>;
      const shapes = v.items.map((i) => i.shape as ShapeKind);
      const sum = shapes.reduce((a, s) => a + CORNERS[s], 0);
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(sum);
      for (const b of ex.bugs ?? []) {
        if (b.id === 'figuren-gezaehlt') expect(b.match).toBe(shapes.length);
        if (b.id === 'kreis-ecke') expect(b.match).toBe(sum + 1);
        if (b.id === 'nur-eine-figur') expect(shapes.map((s) => CORNERS[s])).toContain(b.match);
      }
    }
  });

  it('odd one out: exactly one picture has another number of corners', () => {
    const list = all('passt');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const corners = ex.answer.options.map((o) => CORNERS[shapeOf(o.visual)]);
      const odd = corners[ex.answer.correct];
      expect(corners.filter((c) => c === odd).length, ex.key).toBe(1);
      expect(new Set(corners).size, ex.key).toBe(2);
    }
  });

  it('statements: a Quadrat is a Rechteck; the converse does not hold', () => {
    const find = (text: string) => all('stimmt').find((e) => e.prompt.startsWith(text))!;
    expect(right(find('Ein Quadrat ist auch ein Rechteck')).label).toBe('Stimmt');
    expect(right(find('Jedes Rechteck')).label).toBe('Stimmt nicht');
    expect(right(find('Ein gedrehtes Quadrat')).label).toBe('Stimmt');
  });

  it('no statement says "kein" before "Stimmt das?": that is a double negative (T9)', () => {
    const list = atAb(3, 2, 600).filter((e) => e.key.includes(':stimmt:'));
    expect(new Set(list.map((e) => e.key)).size).toBeGreaterThanOrEqual(6);
    for (const ex of list) expect(ex.prompt, ex.key).not.toMatch(/\bkein/i);
  });

  it('no step of a false statement reads as if a true fact did not hold', () => {
    const list = all('stimmt').filter((e) => right(e).label === 'Stimmt nicht');
    expect(new Set(list.map((e) => e.key)).size).toBeGreaterThanOrEqual(4);
    for (const ex of list) {
      expect(ex.steps[ex.steps.length - 1], ex.key).toBe('Der Satz in der Aufgabe stimmt nicht.');
      for (const s of ex.steps) expect(s as string, ex.key).not.toMatch(/: Der Satz/);
    }
  });

  it('a step about all Rechtecke does not claim two longer Seiten: a Quadrat is also a Rechteck', () => {
    const list = all('finde').filter((e) => e.key.endsWith(':Rechteck'));
    expect(list.length).toBeGreaterThan(5);
    for (const ex of list) expect(ex.steps[0], ex.key).toBe('Ein Rechteck hat 4 Ecken und 4 Seiten.');
    const texts = [1, 2, 3].flatMap((s) => samples(formenSkill, s as 1 | 2 | 3)).flatMap((e) => e.steps.map((s) => (typeof s === 'string' ? s : s.text)));
    for (const t of texts) expect(t).not.toMatch(/^(Ein|Jedes) Rechteck hat .*länger/);
  });

  /** Every text of a task the child can read. */
  const texts = (ex: Exercise) => [
    ex.prompt, ex.praise, ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)),
    ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.whyWrong ?? '') : []), ...(ex.bugs ?? []).map((b) => b.hint),
  ];

  it('a figure in usual position is not told to turn: only a turned figure speaks of turning', () => {
    const list = [...all('gedreht'), ...all('zaehlen')].filter((e) => e.visual && shapeOf(e.visual) !== 'kreis');
    const usual = list.filter((e) => !(e.visual as Extract<Visual, { type: 'shape' }>).rotate);
    expect(new Set(usual.map((e) => e.key.split(':').slice(2).join(':'))).size).toBeGreaterThanOrEqual(4);
    for (const ex of usual) for (const t of texts(ex)) expect(t, ex.key).not.toMatch(/[Dd]reh|gedreht|Lage/);
    expect(all('gedreht').some((e) => (e.visual as Extract<Visual, { type: 'shape' }>).rotate && e.hints.includes('Dreh das Bild im Kopf.'))).toBe(true);
  });

  it('"rechte Ecken" only for the bug of docs §5, and said with an example', () => {
    const list = [1, 2, 3].flatMap((s) => samples(formenSkill, s as 1 | 2 | 3));
    const used = list.filter((e) => texts(e).some((t) => /rechte\s+(Ecke|Winkel)|rechter Winkel/.test(t)));
    expect(used.length).toBeGreaterThan(0);
    for (const ex of used) {
      expect(ex.stufe, ex.key).toBe(3);
      expect(ex.prompt, ex.key).toMatch(/^Ein Quadrat ist auch ein Rechteck\./);
      expect(ex.steps[0], ex.key).toContain('wie ein Blatt Papier');
    }
  });

  it('riddles: the hints send the child through two clue sentences, and each riddle has them', () => {
    const list = all('wer');
    expect(new Set(list.map((e) => e.key.split(':').pop())).size).toBe(4);
    for (const ex of list) {
      expect(ex.hints.join(' '), ex.key).toContain('zweiten Satz');
      expect(ex.prompt.match(/[.?]/g)?.length, ex.prompt).toBe(3);
    }
  });

  it('a task without a picture does not point at one', () => {
    const list = [1, 2, 3].flatMap((s) => samples(formenSkill, s as 1 | 2 | 3)).filter((e) => !e.visual && e.answer.kind === 'choice' && !e.answer.options.some((o) => o.visual));
    expect(list.length).toBeGreaterThan(5);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      for (const t of [...ex.hints, ...ex.answer.options.map((o) => o.whyWrong ?? '')]) expect(t, ex.key).not.toMatch(/Schau\b|im Bild|Diese Figur/);
    }
  });

  it('finding: the hints can tell a Quadrat from the Rechteck among the pictures', () => {
    const list = all('finde').filter((e) => e.key.endsWith(':Quadrat'));
    expect(list.length).toBeGreaterThan(5);
    for (const ex of list) expect(ex.hints.join(' '), ex.key).toMatch(/Seiten/);
  });

  it('naming a Kreis: praise and hints speak of the round border, not of Ecken and Seiten it does not have', () => {
    const list = all('name').filter((e) => e.key.endsWith(':kreis'));
    expect(list.length).toBeGreaterThan(5);
    for (const ex of list) {
      expect(ex.praise, ex.key).not.toMatch(/Ecken/);
      expect(ex.hints.join(' '), ex.key).not.toMatch(/Seiten/);
    }
  });

  it('a step that names a picture also draws it: \'So geht\'s\' shows no options', () => {
    for (const ex of [...all('finde'), ...all('passt')]) {
      const last = ex.steps[ex.steps.length - 1];
      expect(typeof last === 'object' && last.visual, ex.key).toEqual(right(ex).visual);
    }
  });

  const atAb = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3, n = 300) => Array.from({ length: n }, (_, i) => formenSkill.generate(createRng(i * 613 + 5), stufe, { extras: true, ab }));
  const formsAt = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3) => new Set(atAb(stufe, ab).map((e) => e.key.split(':')[2]));

  it('the Stufe chooses the content, the AB the demand inside it', () => {
    expect(formsAt(1, 1)).toEqual(new Set(['name', 'finde']));
    expect(formsAt(1, 2)).toEqual(new Set(['alltag', 'wieviele']));
    expect(formsAt(1, 3)).toEqual(new Set(['heisst', 'keine', 'raetsel']));
    expect(formsAt(2, 1)).toEqual(new Set(['gedreht', 'zaehlen']));
    expect(formsAt(2, 2)).toEqual(new Set(['dreh-finde', 'zusammen']));
    expect(formsAt(2, 3)).toEqual(new Set(['wer', 'fehlt', 'figuren-anzahl']));
    expect(formsAt(3, 1)).toEqual(new Set(['passt', 'ist-rechteck']));
    expect(formsAt(3, 2)).toEqual(new Set(['passt', 'stimmt']));
    expect(formsAt(3, 3)).toEqual(new Set(['rechtecke', 'kein-rechteck', 'satz']));
  });

  it('Stufe 1 keeps every figure in usual position and asks for no count of Ecken', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(1, ab)) {
        const visuals = [ex.visual, ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.visual) : [])].filter(Boolean) as Visual[];
        for (const v of visuals) if (v.type === 'shape') expect(!v.rotate && !v.thin, ex.key).toBe(true);
        expect(ex.prompt, ex.key).not.toMatch(/Wie viele (Ecken|Seiten)/);
      }
    }
  });

  it('the odd one out has four pictures on AB I and five on AB II', () => {
    for (const [ab, size] of [[1, 4], [2, 5]] as const) {
      const list = atAb(3, ab).filter((e) => e.key.includes(':passt:'));
      expect(list.length).toBeGreaterThan(50);
      for (const ex of list) expect(ex.answer.kind === 'choice' && ex.answer.options.length, ex.key).toBe(size);
    }
  });

  it('how many of a shape: recomputed from the row, and never Rechtecke on Stufe 1', () => {
    const list = atAb(1, 2).filter((e) => e.key.includes(':wieviele:'));
    expect(list.length).toBeGreaterThan(50);
    const pl: Record<string, ShapeKind> = { Kreise: 'kreis', Dreiecke: 'dreieck', Quadrate: 'quadrat' };
    for (const ex of list) {
      const v = ex.visual as Extract<Visual, { type: 'shapeRow' }>;
      const word = /Wie viele (\p{L}+) siehst/u.exec(ex.prompt)![1];
      expect(Object.keys(pl), ex.key).toContain(word);
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(v.items.filter((i) => i.shape === pl[word]).length);
    }
  });

  it('does the name fit: a Quadrat is never claimed to be no Rechteck, and the answer compares name and figure', () => {
    const list = atAb(1, 3, 600).filter((e) => e.key.includes(':heisst:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const claim = /heißt (\p{L}+)\./u.exec(ex.prompt)![1];
      const shape = shapeOf(ex.visual);
      if (shape === 'quadrat') expect(claim, ex.key).not.toBe('Rechteck');
      expect(right(ex).label, ex.key).toBe(NAMES[shape] === claim ? 'Stimmt' : 'Stimmt nicht');
    }
  });

  it('the other figure: exactly one option gives the Ecken of the task', () => {
    const list = atAb(2, 3, 600).filter((e) => e.key.includes(':fehlt:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const total = Number(/(\d+) Ecken/.exec(ex.context!)![1]);
      const known = CORNERS[ex.key.split(':')[3].toLowerCase()];
      const each: Record<string, number> = { Quadrat: 4, Dreieck: 3, Kreis: 0 };
      expect(ex.answer.options.filter((o) => known + each[o.label] === total).map((o) => o.label), ex.key).toEqual([right(ex).label]);
    }
  });

  it('how many figures: the Ecken divided by the Ecken of one figure', () => {
    const list = atAb(2, 3, 600).filter((e) => e.key.includes(':figuren-anzahl:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const total = Number(/(\d+) Ecken/.exec(ex.context!)![1]);
      const per = ex.key.includes(':Dreieck:') ? 3 : 4;
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(total / per);
    }
  });

  it('how many Rechtecke: the Quadrate count too, and forgetting them is the bug', () => {
    const list = atAb(3, 3, 600).filter((e) => e.key.includes(':rechtecke:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const v = ex.visual as Extract<Visual, { type: 'shapeRow' }>;
      const rects = v.items.filter((i) => i.shape === 'rechteck').length;
      const squares = v.items.filter((i) => i.shape === 'quadrat').length;
      expect(squares, ex.key).toBeGreaterThan(0);
      expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).toBe(rects + squares);
      expect(ex.bugs?.find((b) => b.id === 'quadrat-vergessen')?.match, ex.key).toBe(rects);
    }
  });

  it('no Rechteck: only the right picture has another number of corners than 4, and a Quadrat is always there', () => {
    const list = atAb(3, 3, 600).filter((e) => e.key.includes(':kein-rechteck:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const corners = ex.answer.options.map((o) => CORNERS[shapeOf(o.visual)]);
      expect(corners.filter((c) => c !== 4), ex.key).toHaveLength(1);
      expect(corners[ex.answer.correct], ex.key).not.toBe(4);
      expect(ex.answer.options.some((o) => shapeOf(o.visual) === 'quadrat'), ex.key).toBe(true);
      const last = ex.steps[ex.steps.length - 1];
      expect(typeof last === 'object' && last.visual, ex.key).toEqual(right(ex).visual);
    }
  });

  it('is this a Rechteck or a Quadrat: yes for a Rechteck on every figure with 4 Ecken, for a Quadrat only with equal Seiten', () => {
    const list = atAb(3, 1, 600).filter((e) => e.key.includes(':ist-rechteck:'));
    expect(list.length).toBeGreaterThan(50);
    expect(new Set(list.map((e) => right(e).label))).toEqual(new Set(['Ja', 'Nein']));
    for (const ex of list) {
      const asked = /ein (\p{L}+)\?/u.exec(ex.prompt)![1];
      expect(CORNERS[shapeOf(ex.visual)], `${ex.key}: a figure of another kind is easier than Stufe 1`).toBe(4);
      expect(right(ex).label, ex.key).toBe(asked === 'Rechteck' || shapeOf(ex.visual) === 'quadrat' ? 'Ja' : 'Nein');
    }
    expect(list.some((e) => e.prompt.includes('Rechteck') && shapeOf(e.visual) === 'quadrat')).toBe(true);
  });

  it('finding a turned figure: the right picture has the name, and no Quadrat is a wrong picture for a Rechteck', () => {
    const list = atAb(2, 2, 600).filter((e) => e.key.includes(':dreh-finde:'));
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const name = /Wo ist das (\p{L}+)\?/u.exec(ex.prompt)![1];
      expect(NAMES[shapeOf(right(ex).visual)], ex.key).toBe(name);
      if (name === 'Rechteck') expect(ex.answer.options.map((o) => shapeOf(o.visual)), ex.key).not.toContain('quadrat');
      expect((right(ex).visual as Extract<Visual, { type: 'shape' }>).rotate, ex.key).toBeTruthy();
    }
  });
});
