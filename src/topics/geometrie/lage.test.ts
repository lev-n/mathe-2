import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe, Visual } from '../../core/types';
import { CTX, samples } from '../test-utils';
import { lageSkill } from './lage';

describeSkill(lageSkill);

type Grid = Extract<Visual, { type: 'grid' }>;
const grid = (ex: Exercise) => ex.visual as Grid;
const at = (stufe: Stufe, ab: Ab, n = 200) => Array.from({ length: n }, (_, i) => lageSkill.generate(createRng(i * 4177 + 11), stufe, { ...CTX, ab }));
const label = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].label : '');
const posOf = (ex: Exercise, name: string) => grid(ex).labels!.find((l) => l.text === name)!.cell;
const all = (kind: string) => [1, 2, 3].flatMap((s) => samples(lageSkill, s as 1 | 2 | 3)).filter((e) => e.key.includes(`:${kind}:`));

/** Things named in a prompt, in the order they appear. */
const named = (ex: Exercise, text: string) => {
  const names = grid(ex).labels!.map((l) => l.text);
  return names.filter((n) => text.includes(n)).sort((a, b) => text.indexOf(a) - text.indexOf(b));
};

describe('Wo ist was? – independent checks', () => {
  it('the Stufe chooses the content, the AB the demand: the forms of each cell', () => {
    const forms = (stufe: Stufe, ab: Ab) => new Set(at(stufe, ab).map((ex) => ex.key.split(':')[2]));
    expect(forms(1, 1)).toEqual(new Set(['was', 'wo']));
    expect(forms(1, 2)).toEqual(new Set(['was']));
    expect(forms(1, 3)).toEqual(new Set(['wo-ecke', 'leer']));
    expect(forms(2, 1)).toEqual(new Set(['direkt']));
    expect(forms(2, 2)).toEqual(new Set(['direkt', 'zwischen']));
    expect(forms(2, 3)).toEqual(new Set(['zwei', 'wie']));
    expect(forms(3, 1)).toEqual(new Set(['weg']));
    expect(forms(3, 2)).toEqual(new Set(['weg', 'tisch']));
    expect(forms(3, 3)).toEqual(new Set(['tisch', 'paar', 'weg-zurueck']));
  });

  it('Stufe 1, AB III: the corner of a thing, and the empty corner', () => {
    const list = at(1, 3);
    const words: Record<string, [number, number]> = { 'oben links': [0, 0], 'oben rechts': [2, 0], 'unten links': [0, 2], 'unten rechts': [2, 2] };
    for (const ex of list) {
      if (ex.key.includes(':wo-ecke:')) {
        const thing = named(ex, ex.prompt)[0];
        expect(posOf(ex, thing), ex.key).toEqual(words[label(ex)]);
      } else {
        const cell = words[label(ex)];
        expect(grid(ex).labels!.some((l) => l.cell[0] === cell[0] && l.cell[1] === cell[1]), ex.key).toBe(false);
        expect(grid(ex).labels!, ex.key).toHaveLength(8);
      }
    }
  });

  it('Stufe 2, AB I: a sparse grid; AB II and the two clues: more things', () => {
    for (const ex of at(2, 1)) expect(grid(ex).labels!, ex.key).toHaveLength(6);
    for (const ex of at(2, 2)) expect(grid(ex).labels!, ex.key).toHaveLength(9);
  });

  it('Stufe 2, AB III: where one thing lies seen from another', () => {
    const list = at(2, 3).filter((e) => e.key.includes(':wie:'));
    expect(list.length).toBeGreaterThan(30);
    const D: Record<string, [number, number]> = { links: [-1, 0], rechts: [1, 0], über: [0, -1], unter: [0, 1] };
    for (const ex of list) {
      const m = /^(links|rechts|über|unter) (?:vom|von der|dem|der) (\p{L}+)$/u.exec(label(ex))!;
      expect(m, label(ex)).not.toBeNull();
      const [ax, ay] = posOf(ex, m[2]);
      const [x, y] = posOf(ex, named(ex, ex.prompt)[0]);
      expect([x - ax, y - ay], ex.key).toEqual(D[m[1]]);
    }
  });

  it('Stufe 3: a path with single steps on AB I, with a 2-field step on AB II', () => {
    for (const ex of at(3, 1)) expect(ex.prompt, 'single steps').not.toMatch(/\d/);
    for (const ex of at(3, 2).filter((e) => e.key.includes(':weg:'))) expect(ex.prompt, 'a 2-field step').toMatch(/\d/);
  });

  it('Stufe 3, AB III: a path walked backwards ends on the answer, and the table has 4 things', () => {
    const D: Record<string, [number, number]> = { rechts: [1, 0], links: [-1, 0], oben: [0, -1], unten: [0, 1] };
    const list = at(3, 3).filter((e) => e.key.includes(':weg-zurueck:'));
    expect(list.length).toBeGreaterThan(30);
    for (const ex of list) {
      const [, endText, path] = /^Ziel (.+?): (.+)\. Wo startest du\?$/.exec(ex.prompt)!;
      let [x, y] = posOf(ex, label(ex));
      for (const part of path.split(', ')) {
        const m = /^(?:(\d) )?(\w+)$/.exec(part)!;
        const n = Number(m[1] ?? 1);
        x += D[m[2]][0] * n;
        y += D[m[2]][1] * n;
        expect(x >= 0 && x <= 2 && y >= 0 && y <= 2, ex.key).toBe(true);
      }
      expect([x, y], ex.key).toEqual(posOf(ex, named(ex, endText)[0]));
    }
    for (const ex of at(3, 3).filter((e) => e.key.includes(':tisch:'))) expect(grid(ex).width, ex.key).toBe(4);
    for (const ex of at(3, 2).filter((e) => e.key.includes(':tisch:'))) expect(grid(ex).width, ex.key).toBe(3);
  });

  it('"direkt": the answer is the neighbour on the asked side', () => {
    const list = all('direkt');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      const [anchor] = named(ex, ex.prompt);
      const [ax, ay] = posOf(ex, anchor);
      const [x, y] = posOf(ex, label(ex));
      const d = ex.prompt.includes('links') ? [-1, 0] : ex.prompt.includes('rechts') ? [1, 0] : ex.prompt.includes('über') ? [0, -1] : [0, 1];
      expect([x - ax, y - ay], ex.key).toEqual(d);
    }
  });

  it('"zwischen": the answer lies in the middle of the two named things', () => {
    for (const ex of all('zwischen')) {
      const [a, b] = named(ex, ex.prompt).map((n) => posOf(ex, n));
      const m = posOf(ex, label(ex));
      expect(m[0] * 2, ex.key).toBe(a[0] + b[0]);
      expect(m[1] * 2, ex.key).toBe(a[1] + b[1]);
    }
  });

  it('two clues: the answer lies in the row of one thing and the column of the other, and one thing fits however the words are read', () => {
    const list = all('zwei');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      const m = /^Was liegt (links|rechts) (?:vom|von der) (\p{L}+) und (über|unter) (?:dem|der) (\p{L}+)\?$/u.exec(ex.prompt);
      expect(m, ex.prompt).not.toBeNull();
      const [, side, first, level, second] = m!;
      const [fx, fy] = posOf(ex, first);
      const [sx, sy] = posOf(ex, second);
      const sideOk = (x: number) => (side === 'links' ? x < fx : x > fx);
      const levelOk = (y: number) => (level === 'über' ? y < sy : y > sy);
      const others = grid(ex).labels!.filter((l) => l.text !== first && l.text !== second);
      // the same row and column, as seenFrom() uses the words
      expect(others.filter((l) => l.cell[1] === fy && l.cell[0] === sx && sideOk(l.cell[0]) && levelOk(l.cell[1])).map((l) => l.text), ex.key).toEqual([label(ex)]);
      // anywhere further to the side and higher or lower
      expect(others.filter((l) => sideOk(l.cell[0]) && levelOk(l.cell[1])).map((l) => l.text), ex.key).toEqual([label(ex)]);
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      for (const o of ex.answer.options) {
        if (!o.whyWrong) continue;
        expect([first, second], `${ex.key}: a named thing as an option`).not.toContain(o.label);
        const [x, y] = posOf(ex, o.label);
        // the feedback denies a clue the thing really fails, under both readings
        if (o.whyWrong.includes(`nicht ${side} `)) expect(sideOk(x), `${ex.key}: ${o.whyWrong}`).toBe(false);
        else expect(levelOk(y), `${ex.key}: ${o.whyWrong}`).toBe(false);
      }
    }
  });

  it('the picture is described in reading order, so the description does not point at the answer', () => {
    for (const ex of [1, 2, 3].flatMap((s) => samples(lageSkill, s as 1 | 2 | 3))) {
      const cells = grid(ex).labels!.map((l) => l.cell);
      const sorted = [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      expect(cells, ex.key).toEqual(sorted);
    }
  });

  it('other side: the task names the table, and only things that can lie on a table are on it', () => {
    const list = [...all('tisch'), ...all('paar')];
    expect(all('paar').length).toBeGreaterThan(5);
    for (const ex of list) {
      expect(ex.context, ex.key).toContain('der anderen Seite vom Tisch');
      expect(grid(ex).caption, ex.key).toBe('So siehst du den Tisch.');
      for (const l of grid(ex).labels!) expect(['Ball', 'Hut', 'Stift', 'Apfel', 'Uhr', 'Buch'], ex.key).toContain(l.text);
    }
  });

  it('path: walking the words from the start ends on the answer and stays on the grid', () => {
    const list = all('weg');
    expect(list.length).toBeGreaterThan(10);
    const D: Record<string, [number, number]> = { rechts: [1, 0], links: [-1, 0], oben: [0, -1], unten: [0, 1] };
    for (const ex of list) {
      const [, startText, path] = /^Start (.+?): (.+)\. Wo bist du\?$/.exec(ex.prompt)!;
      let [x, y] = posOf(ex, named(ex, startText)[0]);
      for (const part of path.split(', ')) {
        const m = /^(?:(\d) )?(\w+)$/.exec(part)!;
        const n = Number(m[1] ?? 1);
        x += D[m[2]][0] * n;
        y += D[m[2]][1] * n;
        expect(x >= 0 && x <= 2 && y >= 0 && y <= 2, ex.key).toBe(true);
      }
      expect([x, y], ex.key).toEqual(posOf(ex, label(ex)));
    }
  });

  it('the second hint of a path explains a number only if the prompt has one', () => {
    const list = all('weg');
    expect(list.some((e) => /\d/.test(e.prompt))).toBe(true);
    expect(list.some((e) => !/\d/.test(e.prompt))).toBe(true);
    for (const ex of list) {
      if (/\d/.test(ex.prompt)) expect(ex.hints[1], ex.key).toContain('wie die Zahl');
      else expect(ex.hints.join(' '), ex.key).not.toMatch(/Zahl/);
    }
  });

  it('other side: the caption fits the width of the grid, also with the wider school font', () => {
    const list = [...all('tisch'), ...all('paar')];
    expect(all('paar').length).toBeGreaterThan(5);
    for (const ex of list) {
      const g = grid(ex);
      const cell = g.width <= 4 && g.height <= 4 ? 64 : 32;
      // Andika, the widest font of the app, measures 189.8 px for this caption of 23 characters: 8.25 px each
      expect(g.caption!.length * 8.5, ex.key).toBeLessThanOrEqual(g.width * cell + 2 * 14);
    }
  });

  it('other side: left and right are swapped', () => {
    const list = all('tisch');
    expect(list.length).toBeGreaterThan(10);
    for (const ex of list) {
      const xs = grid(ex).labels!.map((l) => l.cell[0]);
      const expected = ex.prompt.includes('links') ? Math.max(...xs) : Math.min(...xs);
      expect(posOf(ex, label(ex))[0], ex.key).toBe(expected);
    }
    const pairs = at(3, 3, 500).filter((e) => e.key.includes(':paar:'));
    expect(pairs.length).toBeGreaterThan(30);
    for (const ex of pairs) {
      const [a, b] = ex.key.split(':').slice(3, 5);
      const mine = posOf(ex, a)[0] < posOf(ex, b)[0] ? 'links' : 'rechts';
      expect(label(ex).startsWith(mine === 'links' ? 'rechts' : 'links'), ex.key).toBe(true);
      // the side has to come from the picture: a sentence with it would leave only its opposite to pick
      expect(`${ex.context} ${ex.prompt}`, ex.key).not.toMatch(/links|rechts/);
    }
    expect(new Set(pairs.map((e) => label(e).split(' ')[0]))).toEqual(new Set(['links', 'rechts']));
  });

  it('Stufe 1, AB I: one word and the thing there; AB II: a corner of the full grid', () => {
    const cross: Record<string, [number, number]> = { oben: [1, 0], unten: [1, 2], links: [0, 1], rechts: [2, 1] };
    for (const ex of at(1, 1).filter((e) => e.key.includes(':was:'))) {
      expect(ex.prompt).toMatch(/^Was liegt (oben|unten|links|rechts)\?$/);
      expect(posOf(ex, label(ex))).toEqual(cross[/^Was liegt (\w+)/.exec(ex.prompt)![1]]);
    }
    const corner: Record<string, [number, number]> = { 'oben links': [0, 0], 'oben rechts': [2, 0], 'unten links': [0, 2], 'unten rechts': [2, 2] };
    for (const ex of at(1, 2)) {
      expect(grid(ex).labels!).toHaveLength(9);
      expect(posOf(ex, label(ex))).toEqual(corner[/^Was liegt (.+)\?$/.exec(ex.prompt)![1]]);
    }
  });
});
