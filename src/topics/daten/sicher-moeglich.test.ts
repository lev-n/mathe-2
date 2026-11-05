import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { ColorName, Exercise } from '../../core/types';
import { COLOR_NOUN, COLOR_WORD, COLORS } from './helpers';
import { DICE_EVENTS, DIE, diceKlasse, klasse, sicherMoeglichSkill } from './sicher-moeglich';
import { STUFEN_AB, assertPlainTextEverywhere, atAb, choiceOf, correctLabel, formOf, visualOf } from './test-support';

describeSkill(sicherMoeglichSkill, { minDistinct: 30 });

/** The option of a Klasse, as the task shows it: möglich alone would also fit a sure thing. */
const shown = (k: string) => (k === 'möglich' ? 'möglich, aber nicht sicher' : k);

const colorIn = (text: string) => COLORS.find((c) => new RegExp(`\\b${COLOR_WORD[c]}\\.`).test(text)) as ColorName;

describe('daten.sicher-moeglich: the catalogue', () => {
  it('the Stufe chooses the content, the AB the demand inside it', () => {
    const forms = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3, extras = true) => new Set(Array.from({ length: 300 }, (_, i) => sicherMoeglichSkill.generate(createRng(i * 31 + 1), stufe, { extras, ab })).map(formOf));
    expect(forms(1, 1)).toEqual(new Set(['kugel']));
    expect(forms(1, 2)).toEqual(new Set(['kugel', 'farbe']));
    expect(forms(1, 3)).toEqual(new Set(['aussage']));
    expect(forms(2, 1)).toEqual(new Set(['muenze', 'wuerfel', 'rad']));
    expect(forms(2, 2)).toEqual(new Set(['wuerfel', 'rad']));
    expect(forms(2, 3)).toEqual(new Set(['wuerfel-wahl', 'rad-wahl', 'wuerfel-aussage']));
    expect(forms(3, 1)).toEqual(new Set(['saeckchen']));
    expect(forms(3, 2, false)).toEqual(new Set(['saeckchen']));
    expect(forms(3, 2)).toEqual(new Set(['saeckchen', 'wahrscheinlich']));
    expect(forms(3, 3, false)).toEqual(new Set(['hinweise']));
    expect(forms(3, 3)).toEqual(new Set(['hinweise', 'wahrscheinlich-wahl']));
  });

  it('Stufe 1 stays with one bag of 1 or 2 colours at every AB', () => {
    for (const ab of [1, 2, 3] as const) for (const ex of atAb(sicherMoeglichSkill, 1, ab)) expect(visualOf(ex, 'bag').balls.length, ex.key).toBeLessThanOrEqual(2);
  });

  it('Stufe 2, AB I: the die asks for one number; AB II for bigger, smaller or gerade', () => {
    for (const ex of atAb(sicherMoeglichSkill, 2, 1).filter((e) => formOf(e) === 'wuerfel')) expect(ex.key.split(':')[3], ex.key).toMatch(/^gleich/);
    for (const ex of atAb(sicherMoeglichSkill, 2, 2).filter((e) => formOf(e) === 'wuerfel')) expect(ex.key.split(':')[3], ex.key).not.toMatch(/^gleich/);
  });

  it('wahrscheinlich comes only on Stufe 3 and with the extras on (§6: BY, NRW)', () => {
    const forms = (stufe: 1 | 2 | 3, extras: boolean) =>
      new Set(([1, 2, 3] as const).flatMap((ab) => Array.from({ length: 200 }, (_, i) => sicherMoeglichSkill.generate(createRng(i + 1), stufe, { extras, ab })).map(formOf)));
    expect(forms(3, true).has('wahrscheinlich')).toBe(true);
    expect(forms(3, true).has('wahrscheinlich-wahl')).toBe(true);
    for (const form of ['wahrscheinlich', 'wahrscheinlich-wahl']) {
      expect(forms(3, false).has(form), form).toBe(false);
      expect(forms(2, true).has(form), form).toBe(false);
      expect(forms(1, true).has(form), form).toBe(false);
    }
  });

  it('"gerade" comes only with the extras on, and then its hint says what the word means (§6: opt)', () => {
    const ofDice = (stufe: 1 | 2 | 3, extras: boolean) =>
      Array.from({ length: 300 }, (_, i) => sicherMoeglichSkill.generate(createRng(i + 1), stufe, { extras, ab: 2 })).filter((e) => e.key.split(':')[3] === 'gerade');
    for (const stufe of [1, 2, 3] as const) expect(ofDice(stufe, false)).toEqual([]);
    const shown = ofDice(2, true);
    expect(shown.length).toBeGreaterThan(0);
    for (const ex of shown) expect(ex.hints.join(' ')).toContain('Gerade Zahlen sind');
  });

  it('the three words stay in their fixed order, one per row: side by side a phone breaks them inside the word (T17)', () => {
    for (const ex of [...atAb(sicherMoeglichSkill, 2, 1), ...atAb(sicherMoeglichSkill, 2, 2)]) {
      expect(choiceOf(ex).options.map((o) => o.label)).toEqual(['sicher', 'möglich, aber nicht sicher', 'unmöglich']);
      expect(choiceOf(ex).layout).toBeUndefined();
    }
  });

  it('the pointer does not point at the named colour: it rests on each colour of a möglich wheel about equally', () => {
    const list = atAb(sicherMoeglichSkill, 2, 2, 1500).filter((e) => formOf(e) === 'rad' && correctLabel(e) === shown('möglich'));
    expect(list.length).toBeGreaterThan(50);
    const named = list.filter((e) => e.key.split(':')[3] === visualOf(e, 'spinner').sectors[0]).length;
    expect(named / list.length).toBeGreaterThan(0.35);
    expect(named / list.length).toBeLessThan(0.65);
  });

  it('every sentence with sicher, möglich or unmöglich comes with the action: alone, "Rot ist sicher." can read as "red is safe"', () => {
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(sicherMoeglichSkill, stufe, ab, 120)) {
        const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
        if (/(^|[^\p{L}])(sicher|möglich|unmöglich)([^\p{L}]|$)/iu.test(story)) expect(story, ex.key).toMatch(/\b(ziehst|würfelst|wirfst|drehst)\b/);
      }
    }
  });

  it('möglich is never left open: a sure thing is also possible, so every task says "möglich, aber nicht sicher"', () => {
    const generic = 'Ist das sicher, möglich oder unmöglich?';
    for (const [stufe, ab] of STUFEN_AB) {
      for (const ex of atAb(sicherMoeglichSkill, stufe, ab, 300)) {
        const story = [ex.context, ex.prompt.replace(generic, '')].filter(Boolean).join(' ');
        expect(story.replace(/möglich, aber nicht sicher/g, ''), ex.key).not.toMatch(/(^|[^\p{L}])möglich/iu);
        for (const o of choiceOf(ex).options) expect(o.label, ex.key).not.toMatch(/^möglich$/);
        for (const s of ex.steps.map((x) => (typeof x === 'string' ? x : x.text))) expect(s.replace(/möglich, aber nicht sicher/g, ''), ex.key).not.toMatch(/Das ist möglich/);
      }
    }
  });

  it('Stufe 2, AB I has variety: a coin, a die and wheels', () => {
    const keys = new Set(atAb(sicherMoeglichSkill, 2, 1, 600).map((e) => e.key));
    expect(keys.size).toBeGreaterThan(60);
    for (const ex of atAb(sicherMoeglichSkill, 2, 1).filter((e) => formOf(e) === 'rad')) expect(visualOf(ex, 'spinner').sectors, ex.key).toHaveLength(4);
    for (const ex of atAb(sicherMoeglichSkill, 2, 2).filter((e) => formOf(e) === 'rad')) expect(visualOf(ex, 'spinner').sectors.length, ex.key).toBeGreaterThan(4);
  });

  it('text rules that describeSkill does not check (T7, T8)', () => assertPlainTextEverywhere(sicherMoeglichSkill));
});

describe('daten.sicher-moeglich: answers recomputed', () => {
  it('klasse counts outcomes', () => {
    expect(klasse(0, 6)).toBe('unmöglich');
    expect(klasse(6, 6)).toBe('sicher');
    expect(klasse(2, 6)).toBe('möglich');
    expect(diceKlasse(DICE_EVENTS.find((e) => e.id === 'kleiner7')!)).toBe('sicher');
    expect(DIE).toHaveLength(6);
  });

  it('a Kugel: by counting the balls of that colour', () => {
    for (const ex of atAb(sicherMoeglichSkill, 1, 1, 400).filter((e) => formOf(e) === 'kugel')) {
      const color = colorIn(ex.context!);
      const { balls } = visualOf(ex, 'bag');
      const fit = balls.find((b) => b.color === color)?.count ?? 0;
      const total = balls.reduce((a, b) => a + b.count, 0);
      expect(correctLabel(ex), ex.key).toBe(shown(klasse(fit, total)));
    }
  });

  it('most balls of one colour stay möglich, and "sicher" gets the §5 hint', () => {
    const skewed = atAb(sicherMoeglichSkill, 1, 2, 400).filter((e) => {
      if (formOf(e) !== 'kugel' || correctLabel(e) !== shown('möglich')) return false;
      const balls = visualOf(e, 'bag').balls;
      const color = colorIn(e.context!);
      return balls.find((b) => b.color === color)!.count > balls.find((b) => b.color !== color)!.count;
    });
    expect(skewed.length).toBeGreaterThan(0);
    for (const ex of skewed) {
      const sicher = choiceOf(ex).options.find((o) => o.label === 'sicher')!;
      expect(sicher.whyWrong).toBe('Sicher heißt: Es kommt immer so. Gibt es auch andere Kugeln?');
    }
  });

  it('a colour to choose: exactly one option is right', () => {
    for (const ex of atAb(sicherMoeglichSkill, 1, 2, 400).filter((e) => formOf(e) === 'farbe')) {
      const { balls } = visualOf(ex, 'bag');
      const inBag = (label: string) => balls.some((b) => COLOR_NOUN[b.color] === label);
      const fits = choiceOf(ex).options.filter((o) => (ex.prompt.includes('sicher') ? balls.length === 1 && inBag(o.label) : !inBag(o.label)));
      expect(fits.map((o) => o.label)).toEqual([correctLabel(ex)]);
    }
  });

  it('dice: every event by trying all faces', () => {
    for (const ex of [...atAb(sicherMoeglichSkill, 2, 1, 400), ...atAb(sicherMoeglichSkill, 2, 2, 400)].filter((e) => formOf(e) === 'wuerfel')) {
      const id = ex.key.split(':')[3];
      const event = DICE_EVENTS.find((e) => e.id === id)!;
      expect(ex.context).toContain(event.text);
      expect(correctLabel(ex)).toBe(shown(klasse(DIE.filter((v) => event.fits(v)).length, 6)));
    }
  });

  it('coin: Kopf and Zahl are the only sides', () => {
    for (const ex of atAb(sicherMoeglichSkill, 2, 1, 400).filter((e) => formOf(e) === 'muenze')) {
      const c = ex.context!;
      const expected = c.includes('Kopf oder Zahl') ? 'sicher' : /zeigt (Kopf|Zahl)\./.test(c) ? shown('möglich') : 'unmöglich';
      expect(correctLabel(ex)).toBe(expected);
    }
  });

  it('wheel: by counting the sectors that fit', () => {
    for (const ex of atAb(sicherMoeglichSkill, 2, 2, 400).filter((e) => formOf(e) === 'rad')) {
      const { sectors } = visualOf(ex, 'spinner');
      const named = COLORS.filter((c) => new RegExp(`auf .*${COLOR_NOUN[c]}|oder ${COLOR_NOUN[c]}`).test(ex.context!));
      expect(correctLabel(ex), ex.key).toBe(shown(klasse(sectors.filter((s) => named.includes(s)).length, sectors.length)));
    }
  });

  it('the fitting bag: exactly one bag has that word for the colour', () => {
    const list: Exercise[] = [...atAb(sicherMoeglichSkill, 3, 1, 300), ...atAb(sicherMoeglichSkill, 3, 2, 300)].filter((e) => formOf(e) === 'saeckchen');
    expect(list.length).toBeGreaterThan(0);
    for (const ex of list) {
      const color = COLORS.find((c) => ex.prompt.startsWith(COLOR_NOUN[c]))!;
      const want = /nicht sicher/.test(ex.prompt) ? 'möglich' : /ist (sicher|unmöglich)\./.exec(ex.prompt)![1];
      const fits = choiceOf(ex).options.filter((o) => {
        if (o.visual?.type !== 'bag') throw new Error('bag expected');
        const fit = o.visual.balls.find((b) => b.color === color)?.count ?? 0;
        return klasse(fit, o.visual.balls.reduce((a, b) => a + b.count, 0)) === want;
      });
      expect(fits.map((o) => o.label)).toEqual([correctLabel(ex)]);
    }
  });

  it('a claim about a bag holds by counting the balls of that colour', () => {
    const list = atAb(sicherMoeglichSkill, 1, 3, 400);
    expect(list.length).toBeGreaterThan(100);
    for (const ex of list) {
      const [word, nounText] = [/ist (sicher|möglich|unmöglich)[.,]/.exec(ex.context!)![1], /sagt: (\p{L}+) ist/u.exec(ex.context!)![1]];
      const color = COLORS.find((c) => COLOR_NOUN[c] === nounText)!;
      const { balls } = visualOf(ex, 'bag');
      const fit = balls.find((b) => b.color === color)?.count ?? 0;
      const total = balls.reduce((a, b) => a + b.count, 0);
      expect(correctLabel(ex).startsWith('Ja'), ex.key).toBe(klasse(fit, total) === word);
    }
  });

  it('a die: the option with the word asked for, by trying all faces', () => {
    const list = atAb(sicherMoeglichSkill, 2, 3, 500).filter((e) => formOf(e) === 'wuerfel-wahl');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const word = /Was ist (\p{L}+)/u.exec(ex.prompt)![1];
      const fits = choiceOf(ex).options.filter((o) => {
        const event = DICE_EVENTS.find((e) => e.text === o.label)!;
        return klasse(DIE.filter((v) => event.fits(v)).length, 6) === word;
      });
      expect(fits.map((o) => o.label), ex.key).toEqual([correctLabel(ex)]);
    }
  });

  it('a wheel for a word: exactly one wheel has that word for the colour', () => {
    const list = atAb(sicherMoeglichSkill, 2, 3, 500).filter((e) => formOf(e) === 'rad-wahl');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const color = COLORS.find((c) => new RegExp(`einmal\\. ${COLOR_NOUN[c]} ist`).test(ex.context!))!;
      const word = /ist (sicher|möglich|unmöglich)/.exec(ex.context!)![1];
      const fits = choiceOf(ex).options.filter((o) => {
        if (o.visual?.type !== 'spinner') throw new Error('spinner expected');
        return klasse(o.visual.sectors.filter((s) => s === color).length, o.visual.sectors.length) === word;
      });
      expect(fits.map((o) => o.label), ex.key).toEqual([correctLabel(ex)]);
    }
  });

  it('a claim about a die: by trying all faces', () => {
    const list = atAb(sicherMoeglichSkill, 2, 3, 500).filter((e) => formOf(e) === 'wuerfel-aussage');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const event = DICE_EVENTS.find((e) => e.id === ex.key.split(':')[3])!;
      const word = ex.key.split(':')[4];
      expect(correctLabel(ex).startsWith('Ja'), ex.key).toBe(klasse(DIE.filter((v) => event.fits(v)).length, 6) === word);
    }
  });

  it('two clues: only one bag has the first colour with others and none of the second', () => {
    const list = atAb(sicherMoeglichSkill, 3, 3, 300).filter((e) => formOf(e) === 'hinweise');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const m = /(\p{L}+) ist möglich, aber nicht sicher\. (\p{L}+) ist unmöglich/u.exec(ex.context!)!;
      const [yes, no] = [COLORS.find((c) => COLOR_NOUN[c] === m[1])!, COLORS.find((c) => COLOR_NOUN[c] === m[2])!];
      const fits = choiceOf(ex).options.filter((o) => {
        if (o.visual?.type !== 'bag') throw new Error('bag expected');
        const total = o.visual.balls.reduce((a, b) => a + b.count, 0);
        const count = (c: ColorName) => o.visual!.type === 'bag' ? o.visual!.balls.find((b) => b.color === c)?.count ?? 0 : 0;
        return klasse(count(yes), total) === 'möglich' && count(no) === 0;
      });
      expect(fits.map((o) => o.label), ex.key).toEqual([correctLabel(ex)]);
    }
  });

  it('the bag for wahrscheinlich: the colour is the larger group, or the smaller one for unwahrscheinlich', () => {
    const list = atAb(sicherMoeglichSkill, 3, 3, 600).filter((e) => formOf(e) === 'wahrscheinlich-wahl');
    expect(list.length).toBeGreaterThan(50);
    for (const ex of list) {
      const color = COLORS.find((c) => ex.prompt.startsWith(`${COLOR_NOUN[c]} ist`))!;
      const many = !ex.prompt.includes('unwahrscheinlich');
      const right = choiceOf(ex).options[choiceOf(ex).correct].visual;
      if (right?.type !== 'bag') throw new Error('bag expected');
      const mine = right.balls.find((b) => b.color === color)!.count;
      const other = right.balls.find((b) => b.color !== color)!.count;
      expect(mine > other, ex.key).toBe(many);
    }
  });

  it('wahrscheinlich follows the larger group', () => {
    for (const ex of atAb(sicherMoeglichSkill, 3, 2, 300).filter((e) => formOf(e) === 'wahrscheinlich')) {
      const color = colorIn(ex.context!);
      const { balls } = visualOf(ex, 'bag');
      const mine = balls.find((b) => b.color === color)!.count;
      const other = balls.find((b) => b.color !== color)!.count;
      expect(correctLabel(ex)).toBe(mine > other ? 'wahrscheinlich' : 'unwahrscheinlich');
    }
  });
});
