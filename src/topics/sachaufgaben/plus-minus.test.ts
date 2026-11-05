import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { plusMinusSkill } from './plus-minus';
import { atAb, kindOf, numberValue, numbersIn } from './test-helpers';

describeSkill(plusMinusSkill, { minDistinct: 40 });

const op = (key: string) => key.split(':')[4];

/** The key holds the start and the change as `kind:a:±:b`. */
const parts = (ex: Exercise) => {
  const [, , , a, sign, b] = ex.key.split(':');
  return { a: Number(a), plus: sign === '+', b: Number(b) };
};

const crosses = ({ a, plus, b }: { a: number; plus: boolean; b: number }) => (plus ? a % 10 + b % 10 > 10 : a % 10 > 0 && a % 10 < b % 10);

describe('sachaufgaben.plus-minus, Stufe 1: result unknown, ≤ 20', () => {
  it('AB I: within a ten, recomputed', () => {
    for (const ex of atAb(plusMinusSkill, 1, 1, 300)) {
      const [a, b] = numbersIn(ex.context!);
      expect(numberValue(ex), ex.key).toBe(op(ex.key) === '+' ? a + b : a - b);
      expect(numberValue(ex)).toBeLessThanOrEqual(20);
      expect(numberValue(ex)).toBeGreaterThanOrEqual(2);
      expect(crosses(parts(ex)), ex.key).toBe(false);
    }
  });

  it('AB II: over the ten, still up to 20, recomputed', () => {
    for (const ex of atAb(plusMinusSkill, 1, 2, 300)) {
      const [a, b] = numbersIn(ex.context!);
      expect(numberValue(ex), ex.key).toBe(op(ex.key) === '+' ? a + b : a - b);
      expect(Math.max(a, b, numberValue(ex)!), ex.key).toBeLessThanOrEqual(20);
      expect(crosses(parts(ex)), ex.key).toBe(true);
    }
  });

  it('AB III: the story names the start second; recomputed, and no hidden start or change: that is Stufe 3', () => {
    for (const ex of atAb(plusMinusSkill, 1, 3, 300)) {
      expect(kindOf(ex), ex.key).toMatch(/-spaeter$/);
      const [b, a] = numbersIn(ex.context!);
      expect(numberValue(ex), ex.key).toBe(op(ex.key) === '+' ? a + b : a - b);
      expect(Math.max(a, b, numberValue(ex)!), ex.key).toBeLessThanOrEqual(20);
      expect(ex.prompt, ex.key).toMatch(/jetzt/);
    }
  });
});

describe('sachaufgaben.plus-minus, Stufe 2: result unknown, ≤ 100, crossing a ten', () => {
  it('AB I: a one-digit number; AB II and III: two two-digit numbers; every item crosses a ten', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(plusMinusSkill, 2, ab, 300)) {
        const { a, b } = parts(ex);
        const plus = op(ex.key) === '+';
        expect(numberValue(ex), ex.key).toBe(plus ? a + b : a - b);
        expect(numberValue(ex)).toBeLessThanOrEqual(100);
        expect(crosses(parts(ex)), ex.key).toBe(true);
        expect(a, ex.key).toBeGreaterThan(10);
        if (ab === 1) expect(b, ex.key).toBeLessThan(10);
        else expect(b, ex.key).toBeGreaterThan(10);
      }
    }
  });

  it('AB III: the story names the start second', () => {
    for (const ex of atAb(plusMinusSkill, 2, 3, 300)) {
      const { a, b } = parts(ex);
      expect(kindOf(ex), ex.key).toMatch(/-spaeter$/);
      expect(numbersIn(ex.context!), ex.key).toEqual([b, a]);
    }
  });

  it('lost marbles and eaten biscuits stay small enough for an everyday story, and still occur', () => {
    const everyday = [...atAb(plusMinusSkill, 2, 2, 800), ...atAb(plusMinusSkill, 2, 3, 800)].filter((e) => /^(murmeln|kekse)/.test(kindOf(e)));
    expect(everyday.length).toBeGreaterThan(0);
    for (const ex of everyday) {
      const { a, b } = parts(ex);
      expect(a, ex.key).toBeLessThanOrEqual(50);
      expect(b, ex.key).toBeLessThanOrEqual(19);
    }
  });

  it('the forgotten ten and the swapped ones get their hints', () => {
    for (const ex of atAb(plusMinusSkill, 2, 2, 100)) {
      const { a, b } = parts(ex);
      const plus = op(ex.key) === '+';
      const wrong = plus ? a + b - 10 : (Math.floor(a / 10) - Math.floor(b / 10)) * 10 + (b % 10 - a % 10);
      // 39 + 5 = 34 is also the wrong operation; then that hint comes first
      if (wrong === (plus ? a - b : a + b)) continue;
      expect(checkAnswer(ex.answer, { kind: 'number', text: String(wrong) }, ex.bugs).bugId, ex.key).toBe(plus ? 'zehner-vergessen' : 'kleiner-von-groesser');
    }
  });

  it('the Rechenstrich of the worked steps ends at the result', () => {
    for (const ex of atAb(plusMinusSkill, 2, 2, 100)) {
      const step = ex.steps[1];
      if (typeof step === 'string' || step.visual?.type !== 'numberLine') throw new Error(ex.key);
      const last = step.visual.jumps![step.visual.jumps!.length - 1];
      expect(last.to).toBe(numberValue(ex));
    }
  });
});

describe('sachaufgaben.plus-minus, Stufe 3: start or change unknown, ≤ 100', () => {
  const EXPECTED: Record<string, (x: number, y: number) => number> = {
    'dazu-wieviel': (x, y) => y - x,
    'fehlt-mehr': (x, y) => y - x,
    'weg-wieviel': (x, y) => x - y,
    'start-dazu': (x, y) => y - x,
    'start-hof': (x, y) => y - x,
    'start-weg': (x, y) => x + y,
    'start-kiste': (x, y) => x + y,
  };

  const kindsAt = (ab: 1 | 2 | 3) => {
    const seen = new Set<string>();
    for (const ex of atAb(plusMinusSkill, 3, ab, 500)) {
      const [x, y] = numbersIn(ex.context!);
      seen.add(kindOf(ex));
      expect(numberValue(ex), ex.key).toBe(EXPECTED[kindOf(ex)](x, y));
      expect(numberValue(ex)).toBeLessThanOrEqual(100);
    }
    return [...seen].sort();
  };

  it('AB I: the change, one-digit, or the start after something went away', () => {
    expect(kindsAt(1)).toEqual(['dazu-wieviel', 'fehlt-mehr', 'start-kiste', 'start-weg', 'weg-wieviel']);
    for (const ex of atAb(plusMinusSkill, 3, 1, 300)) {
      if (kindOf(ex).startsWith('start-')) expect(numberValue(ex), ex.key).toBeGreaterThan(10);
      else expect(numberValue(ex), ex.key).toBeLessThan(10);
    }
  });

  it('at every AB both operations come up, so the Stufe does not give minus away: at least a quarter of each', () => {
    for (const ab of [1, 2, 3] as const) {
      const items = atAb(plusMinusSkill, 3, ab, 800);
      const plus = items.filter((ex) => /^start-(weg|kiste)$/.test(kindOf(ex))).length / items.length;
      expect(plus, `AB ${ab}`).toBeGreaterThanOrEqual(0.25);
      expect(plus, `AB ${ab}`).toBeLessThanOrEqual(0.75);
    }
  });

  it('AB II: the change, two-digit, or the start with a one-digit change', () => {
    expect(kindsAt(2)).toEqual(['dazu-wieviel', 'fehlt-mehr', 'start-dazu', 'start-hof', 'start-kiste', 'start-weg', 'weg-wieviel']);
    for (const ex of atAb(plusMinusSkill, 3, 2, 300)) if (!kindOf(ex).startsWith('start-')) expect(numberValue(ex), ex.key).toBeGreaterThan(10);
  });

  it('AB III: the start, two-digit', () => {
    expect(kindsAt(3)).toEqual(['start-dazu', 'start-hof', 'start-kiste', 'start-weg']);
    for (const ex of atAb(plusMinusSkill, 3, 3, 300)) expect(numbersIn(ex.context!)[0], ex.key).toBeGreaterThan(10);
  });

  it('nobody eats dozens of apples', () => {
    for (const ab of [1, 2, 3] as const) for (const ex of atAb(plusMinusSkill, 3, ab, 200)) expect(ex.context, ex.key).not.toMatch(/essen/);
  });

  it('"mehr" and "dazu" stories that are solved by minus keep the signalwort hint (T13)', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(plusMinusSkill, 3, ab, 200)) {
        const kind = kindOf(ex);
        if (kind !== 'fehlt-mehr' && kind !== 'start-dazu' && kind !== 'dazu-wieviel') continue;
        const [x, y] = numbersIn(ex.context!);
        expect(checkAnswer(ex.answer, { kind: 'number', text: String(x + y) }, ex.bugs).bugId, ex.key).toBe('signalwort');
      }
    }
  });

  it('no text asks "Wird es mehr oder weniger?", as its true answer would support the wrong operation here', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(plusMinusSkill, 3, ab, 200)) {
        expect(ex.hints.length, ex.key).toBeGreaterThan(0);
        for (const hint of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(hint, ex.key).not.toMatch(/mehr oder weniger/);
      }
    }
  });

  it('the hint for the keyword answer belongs to the story and shows no number', () => {
    const expected: Record<string, RegExp> = {
      'dazu-wieviel': /Sticker schon dabei/,
      'fehlt-mehr': /Ziel/,
      'weg-wieviel': /kleinen bis zur großen/,
      'start-dazu': /Sticker schon dabei/,
      'start-hof': /Kinder schon dabei/,
      'start-weg': /Murmeln schon weg/,
      'start-kiste': /Äpfel der Kinder schon weg/,
    };
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(plusMinusSkill, 3, ab, 200)) {
        const bug = ex.bugs?.find((b) => b.id === 'signalwort');
        if (!bug) continue;
        expect(bug.hint, ex.key).toMatch(expected[kindOf(ex)]);
        expect(numbersIn(bug.hint), ex.key).toEqual([]);
      }
    }
  });

  it('a hint with the answer in it gives way to the hint without numbers', () => {
    const revealing = atAb(plusMinusSkill, 3, 2, 3000).filter((e) => kindOf(e) === 'dazu-wieviel' && numberValue(e) === numbersIn(e.context!)[0]);
    expect(revealing.length).toBeGreaterThan(0);
    for (const ex of revealing) expect(ex.hints, ex.key).toEqual(['Am Abend sind die neuen Sticker schon dabei. Wie viele sind neu?']);
  });
});

describe('sachaufgaben.plus-minus, all Stufen', () => {
  it('T13: a word of the question does not predict the operation; "jetzt" and "zusammen" go with both, and no question has "noch"', () => {
    for (const stufe of [1, 2] as const) {
      const items = [...atAb(plusMinusSkill, stufe, 1, 800), ...atAb(plusMinusSkill, stufe, 2, 800)];
      for (const word of ['jetzt', 'zusammen']) {
        const asked = items.filter((ex) => new RegExp(`\\b${word}\\b`).test(ex.prompt));
        const plus = asked.filter((ex) => op(ex.key) === '+').length / asked.length;
        expect(plus, `Stufe ${stufe}: ${word}`).toBeGreaterThanOrEqual(0.25);
        expect(plus, `Stufe ${stufe}: ${word}`).toBeLessThanOrEqual(0.75);
      }
      for (const ex of items) expect(ex.prompt, ex.key).not.toMatch(/\bnoch\b/);
    }
  });


  it('a story without a change names what is asked, not a change', () => {
    const books = [...atAb(plusMinusSkill, 1, 1, 400), ...atAb(plusMinusSkill, 2, 2, 400)].filter((e) => kindOf(e) === 'buecher');
    expect(books.length).toBeGreaterThan(0);
    for (const ex of books) {
      expect(ex.hints[0], ex.key).toBe('Gefragt sind beide Mengen zusammen.');
      expect(ex.steps[0], ex.key).toBe('Gefragt sind beide Mengen zusammen.');
    }
  });
});
