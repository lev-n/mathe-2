import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { ChoiceOption, ColorName, Stufe, Visual } from '../../core/types';
import { BAG_SIZE, WHEEL_SIZE, chancenSkill } from './chancen';
import { COLOR_ADJ, COLOR_ADJ_N, COLOR_NOUN, COLORS } from './helpers';
import { STUFEN_AB, assertPlainTextEverywhere, atAb, choiceOf, correctLabel, formOf, visualOf } from './test-support';

describeSkill(chancenSkill, { minDistinct: 40 });

const countIn = (v: Visual | undefined, color: ColorName) => {
  if (v?.type === 'bag') return v.balls.find((b) => b.color === color)?.count ?? 0;
  if (v?.type === 'spinner') return v.sectors.filter((s) => s === color).length;
  throw new Error('bag or spinner expected');
};
const totalOf = (v: Visual | undefined) => {
  if (v?.type === 'bag') return v.balls.reduce((a, b) => a + b.count, 0);
  if (v?.type === 'spinner') return v.sectors.length;
  throw new Error('bag or spinner expected');
};
const noun = (prompt: string) => COLORS.find((c) => new RegExp(`\\b${COLOR_NOUN[c]}\\b`).test(prompt))!;

/** The picture options: with more of the colour, or 'Bei beiden gleich' for the same count. */
function expected(options: readonly ChoiceOption[], color: ColorName): string {
  const pics = options.filter((o) => o.visual);
  const [a, b] = pics.map((o) => countIn(o.visual, color));
  if (a === b) return 'Bei beiden gleich';
  return a > b ? pics[0].label : pics[1].label;
}

describe('daten.chancen: the catalogue', () => {
  it('is optional', () => expect(chancenSkill.optional).toBe('extra'));

  it('the Stufe chooses the content, the AB the demand inside it', () => {
    const forms = (stufe: Stufe, ab: 1 | 2 | 3) => new Set(atAb(chancenSkill, stufe, ab).map(formOf));
    expect(forms(1, 1)).toEqual(new Set(['saeckchen']));
    expect(forms(1, 2)).toEqual(new Set(['saeckchen']));
    expect(forms(1, 3)).toEqual(new Set(['saeckchen', 'saeckchen-passt']));
    expect(forms(2, 1)).toEqual(new Set(['raeder']));
    expect(forms(2, 2)).toEqual(new Set(['raeder', 'farbe']));
    expect(forms(2, 3)).toEqual(new Set(['raeder', 'farbe', 'rad-passt']));
    expect(forms(3, 1)).toEqual(new Set(['dazu']));
    expect(forms(3, 2)).toEqual(new Set(['aendern']));
    expect(forms(3, 3)).toEqual(new Set(['wieviele', 'drei', 'nicht-dazu']));
  });

  it('Stufe 1: bags with the same total, within the AB; AB I far apart and never the same; only AB II can be the same', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(chancenSkill, 1, ab).filter((e) => formOf(e) === 'saeckchen')) {
        const pics = choiceOf(ex).options.filter((o) => o.visual);
        expect(pics.map((o) => o.visual!.type)).toEqual(['bag', 'bag']);
        const totals = pics.map((o) => totalOf(o.visual));
        expect(totals[0]).toBe(totals[1]);
        expect(totals[0]).toBeGreaterThanOrEqual(BAG_SIZE[ab][0]);
        expect(totals[0]).toBeLessThanOrEqual(BAG_SIZE[ab][1]);
        if (ab !== 2) expect(correctLabel(ex), ex.key).not.toBe('Bei beiden gleich');
        if (ab === 1) {
          const [a, b] = pics.map((o) => countIn(o.visual, noun(ex.prompt)));
          expect(Math.abs(a - b), ex.key).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('Stufe 2: wheels with the same number of equal sectors, within the AB', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(chancenSkill, 2, ab).filter((e) => formOf(e) === 'raeder')) {
        const totals = choiceOf(ex).options.filter((o) => o.visual).map((o) => totalOf(o.visual));
        expect(totals[0]).toBe(totals[1]);
        expect(WHEEL_SIZE[ab]).toContain(totals[0]);
      }
    }
  });

  it('the pointer does not tell the answer: it rests on each of the three colours about equally', () => {
    const list = atAb(chancenSkill, 2, 2, 1800).filter((e) => formOf(e) === 'farbe');
    expect(list.length).toBeGreaterThan(200);
    const onAnswer = list.filter((e) => COLOR_NOUN[visualOf(e, 'spinner').sectors[0]] === correctLabel(e)).length;
    expect(onAnswer / list.length).toBeGreaterThan(0.2);
    expect(onAnswer / list.length).toBeLessThan(0.47);
  });

  it('turning a wheel keeps its colours apart: the first and last sector count as neighbours on a circle', () => {
    for (const ex of atAb(chancenSkill, 2, 2, 200).filter((e) => formOf(e) === 'farbe')) {
      const { sectors } = visualOf(ex, 'spinner');
      const same = sectors.filter((c, i) => c === sectors[(i + 1) % sectors.length]).length;
      const largest = Math.max(...COLORS.map((c) => sectors.filter((s) => s === c).length));
      expect(same, ex.key).toBeLessThanOrEqual(Math.max(1, 2 * largest - sectors.length));
    }
  });

  it('every sentence with sicher, möglich or unmöglich comes with the action: alone, "Rot ist sicher." can read as "red is safe"', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(chancenSkill, stufe, ab, 120)) {
        const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
        if (/(^|[^\p{L}])(sicher|möglich|unmöglich)([^\p{L}]|$)/iu.test(story)) expect(story, ex.key).toMatch(/\b(ziehst|würfelst|wirfst|drehst)\b/);
      }
    }
  });

  it('text rules that describeSkill does not check (T7, T8)', () => assertPlainTextEverywhere(chancenSkill));
});

describe('daten.chancen: answers recomputed', () => {
  it('bags: the one with more of the colour, or both the same', () => {
    const list = atAb(chancenSkill, 1, 2, 300);
    for (const ex of list) expect(correctLabel(ex), ex.key).toBe(expected(choiceOf(ex).options, noun(ex.prompt)));
    expect(list.some((e) => correctLabel(e) === 'Bei beiden gleich')).toBe(true);
    expect(list.some((e) => correctLabel(e) !== 'Bei beiden gleich')).toBe(true);
  });

  it('wheels: the one with more sectors of the colour, or both the same', () => {
    for (const ex of atAb(chancenSkill, 2, 2, 300).filter((e) => formOf(e) === 'raeder')) {
      expect(correctLabel(ex), ex.key).toBe(expected(choiceOf(ex).options, noun(ex.prompt)));
    }
  });

  it('one wheel: the colour with one largest group', () => {
    for (const ex of atAb(chancenSkill, 2, 2, 300).filter((e) => formOf(e) === 'farbe')) {
      const { sectors } = visualOf(ex, 'spinner');
      const counts = COLORS.map((c) => sectors.filter((s) => s === c).length);
      const max = Math.max(...counts);
      expect(counts.filter((c) => c === max), ex.key).toHaveLength(1);
      expect(correctLabel(ex)).toBe(COLOR_NOUN[COLORS[counts.indexOf(max)]]);
      expect(choiceOf(ex).options).toHaveLength(3);
      expect(WHEEL_SIZE[2]).toContain(sectors.length);
    }
  });

  it('one wheel on AB III: the colour with one smallest group', () => {
    const list = atAb(chancenSkill, 2, 3, 400).filter((e) => formOf(e) === 'farbe');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const { sectors } = visualOf(ex, 'spinner');
      const counts = COLORS.map((c) => sectors.filter((s) => s === c).length).filter((c) => c > 0);
      expect(counts, ex.key).toHaveLength(3);
      const min = Math.min(...counts);
      expect(counts.filter((c) => c === min), ex.key).toHaveLength(1);
      expect(sectors.filter((s) => COLOR_NOUN[s] === correctLabel(ex)), ex.key).toHaveLength(min);
    }
  });

  it('less often: the bag or wheel with fewer of the colour', () => {
    const lists = [atAb(chancenSkill, 1, 3, 300).filter((e) => formOf(e) === 'saeckchen'), atAb(chancenSkill, 2, 3, 300).filter((e) => formOf(e) === 'raeder')];
    for (const list of lists) {
      expect(list.length).toBeGreaterThan(50);
      for (const ex of list) {
        const pics = choiceOf(ex).options.filter((o) => o.visual);
        const [a, b] = pics.map((o) => countIn(o.visual, noun(ex.prompt)));
        expect(correctLabel(ex), ex.key).toBe(a < b ? pics[0].label : pics[1].label);
      }
    }
  });

  it('a sentence to a bag or wheel: only the right picture fits, and all have the same total', () => {
    const lists = [atAb(chancenSkill, 1, 3, 500).filter((e) => formOf(e) === 'saeckchen-passt'), atAb(chancenSkill, 2, 3, 500).filter((e) => formOf(e) === 'rad-passt')];
    for (const list of lists) {
      expect(list.length).toBeGreaterThan(50);
      for (const ex of list) {
        const [t, u] = ex.key.split(':').slice(3, 5) as ColorName[];
        const opts = choiceOf(ex).options;
        expect(new Set(opts.map((o) => totalOf(o.visual))).size, ex.key).toBe(1);
        const want = ex.context!.includes('gleich oft') ? 0 : ex.context!.includes('seltener') ? -1 : 1;
        const fits = opts.filter((o) => Math.sign(countIn(o.visual, t) - countIn(o.visual, u)) === want);
        expect(fits.map((o) => o.label), ex.key).toEqual([correctLabel(ex)]);
      }
    }
  });

  it('adding balls: only the correct option keeps the colour sicher or unmöglich', () => {
    const list = atAb(chancenSkill, 3, 1, 300).filter((e) => formOf(e) === 'dazu');
    expect(list.length).toBeGreaterThan(0);
    for (const ex of list) {
      const t = COLORS.find((c) => ex.prompt.startsWith(COLOR_NOUN[c]))!;
      const keeps = (label: string) => {
        const named = COLORS.filter((c) => new RegExp(`\\b${COLOR_ADJ[c]} Kugel`).test(label));
        return ex.prompt.includes('sicher') && !ex.prompt.includes('unmöglich') ? named.every((c) => c === t) : !named.includes(t);
      };
      const start = visualOf(ex, 'bag').balls;
      if (ex.prompt.includes('unmöglich')) expect(start.some((b) => b.color === t)).toBe(false);
      else expect(start.every((b) => b.color === t)).toBe(true);
      expect(choiceOf(ex).options.filter((o) => keeps(o.label)).map((o) => o.label)).toEqual([correctLabel(ex)]);
    }
  });

  it('changing a mixed bag: all balls of the other colour (sicher) or of this colour (unmöglich) go', () => {
    const list = atAb(chancenSkill, 3, 2, 300).filter((e) => formOf(e) === 'aendern');
    expect(list.length).toBeGreaterThan(0);
    for (const ex of list) {
      const t = COLORS.find((c) => ex.prompt.startsWith(COLOR_NOUN[c]))!;
      const balls = visualOf(ex, 'bag').balls;
      expect(balls).toHaveLength(2);
      const other = balls.find((b) => b.color !== t)!.color;
      const gone = ex.prompt.includes('unmöglich') ? t : other;
      expect(correctLabel(ex)).toBe(`Alle ${COLOR_ADJ_N[gone]} Kugeln herausnehmen`);
    }
  });

  it('how many come out: all balls of the colour that has to go', () => {
    const list = atAb(chancenSkill, 3, 3, 500).filter((e) => formOf(e) === 'wieviele');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const t = COLORS.find((c) => ex.prompt.startsWith(COLOR_NOUN[c]))!;
      const balls = visualOf(ex, 'bag').balls;
      const n = ex.prompt.includes('unmöglich') ? balls.find((b) => b.color === t)!.count : balls.find((b) => b.color !== t)!.count;
      expect(Number.parseInt(correctLabel(ex), 10), ex.key).toBe(n);
    }
  });

  it('three colours: for sicher both other colours go, for unmöglich only this one', () => {
    const list = atAb(chancenSkill, 3, 3, 500).filter((e) => formOf(e) === 'drei');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const t = COLORS.find((c) => ex.prompt.startsWith(COLOR_NOUN[c]))!;
      const balls = visualOf(ex, 'bag').balls;
      expect(balls, ex.key).toHaveLength(3);
      const others = balls.filter((b) => b.color !== t).map((b) => COLOR_ADJ_N[b.color]);
      if (ex.prompt.includes('unmöglich')) expect(correctLabel(ex), ex.key).toBe(`Alle ${COLOR_ADJ_N[t]} Kugeln herausnehmen`);
      else for (const word of others) expect(correctLabel(ex), ex.key).toContain(word);
    }
  });

  it('may not go in: only the right option breaks the word', () => {
    const list = atAb(chancenSkill, 3, 3, 500).filter((e) => formOf(e) === 'nicht-dazu');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const t = COLORS.find((c) => ex.prompt.startsWith(COLOR_NOUN[c]))!;
      const sure = ex.prompt.includes('soll sicher');
      const breaks = (label: string) => {
        const named = COLORS.filter((c) => new RegExp(`\\b${COLOR_ADJ[c]} Kugel`).test(label));
        return sure ? named.some((c) => c !== t) : named.includes(t);
      };
      expect(choiceOf(ex).options.filter((o) => breaks(o.label)).map((o) => o.label), ex.key).toEqual([correctLabel(ex)]);
    }
  });
});
