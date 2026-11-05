/**
 * Größer oder kleiner (docs/research.md §6). The Stufe chooses the content: Stufe 1 two numbers with different tens, Stufe 2 same tens
 * and swapped pairs, Stufe 3 ordering 4–5 numbers and the number in between. The AB level is the demand inside it: AB I the direct
 * form, AB II numbers that mislead or sit close, AB III a gap or a claim to check.
 */
import { MAX_CHOICE_OPTIONS, MAX_ORDER_ITEMS } from '../../core/age';
import { BOX, fmt } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, makeChoice, orderAnswer, speak } from '../shared';
import { NO, YES, fromForms, isPasch, onesOf, placeValueOf, swapDigits, tensOf, type Form, type Forms } from './helpers';

const ID = 'zahlen.vergleichen';
const SKILL = { id: ID, topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum'];

const TENS_HINT = 'Schau zuerst auf die Zehner.';
const SIGN_HINT = 'Die offene Seite zeigt zur größeren Zahl.';
const SAME_TENS_HINT = 'Die Zehner sind gleich. Schau auf die Einer.';
/** Equal numbers: no number is larger, so the hint asks instead of pointing to one. */
const EQUAL_HINT = 'Vergleiche auch die Einer. Ist eine Zahl größer?';
const SIGNS = ['<', '>', '='];
const GAP_PROMPT = 'Welche Zahl passt in die Lücke?';

const signOf = (a: number, b: number) => (a < b ? '<' : a > b ? '>' : '=');

/** Feedback for one wrong sign: the ones-first mistake when it would give this sign, otherwise the mix-up of < and >. */
function whyWrongSign(a: number, b: number, sign: string): string {
  if (a === b) return 'Schau genau: Beide Zahlen sind gleich.';
  if (sign === '=') return tensOf(a) === tensOf(b) ? 'Die Zehner sind gleich. Die Einer sind verschieden.' : 'Die Zehner sind verschieden.';
  if (tensOf(a) === tensOf(b)) return 'Die Zehner sind gleich. Schau jetzt auf die Einer.';
  return signOf(onesOf(a), onesOf(b)) === sign ? TENS_HINT : SIGN_HINT;
}

function compareSteps(a: number, b: number) {
  const ta = tensOf(a);
  const tb = tensOf(b);
  const sign = signOf(a, b);
  const final = `Also: ${fmt(a)} ${sign} ${fmt(b)}`;
  if (a === b) return [`Beide Zahlen haben ${ta} Zehner.`, `Beide haben auch ${onesOf(a)} Einer.`, final];
  const first = { text: `Schau zuerst auf die Zehner: ${ta} und ${tb}.`, visual: placeValueOf(a, b) };
  if (ta !== tb) return [first, `${Math.max(ta, tb)} Zehner sind mehr als ${Math.min(ta, tb)} Zehner.`, final];
  return [first, `Die Zehner sind gleich. Die Einer entscheiden: ${onesOf(a)} und ${onesOf(b)}.`, final];
}

function signTask(rng: Rng, stufe: Stufe, ab: Ab, a: number, b: number, kind: string, withTable: boolean) {
  const correct = signOf(a, b);
  const expression = `${fmt(a)} ${BOX} ${fmt(b)}`;
  const prompt = 'Welches Zeichen passt?';
  const sameTens = a !== b && tensOf(a) === tensOf(b);
  return build(SKILL, stufe, {
    key: `${kind}:${a}:${b}`,
    ab,
    prompt,
    expression,
    ...(withTable ? { visual: placeValueOf(a, b) } : {}),
    answer: makeChoice(
      rng,
      { label: correct },
      SIGNS.filter((s) => s !== correct).map((s) => ({ label: s, whyWrong: whyWrongSign(a, b, s) })),
      { layout: 'symbols', order: SIGNS },
    ),
    hints: [sameTens ? SAME_TENS_HINT : TENS_HINT, a === b ? EQUAL_HINT : SIGN_HINT],
    steps: compareSteps(a, b),
    praise: sameTens ? 'Du hast die Einer verglichen.' : 'Du hast die Zehner zuerst angeschaut.',
    srText: `Welches Zeichen passt zwischen ${a} und ${b}?`,
    kmk: KMK,
  });
}

/** A yes-or-no answer on a shown comparison. */
function yesNo(rng: Rng, right: boolean, whyWrong: string) {
  return makeChoice(rng, { label: right ? YES : NO }, [{ label: right ? NO : YES, whyWrong }], { order: [YES, NO] });
}

// ─── Stufe 1: two numbers with different tens ─────────────────────────────────

/** The larger tens also has the larger ones: nothing misleads. */
function clearPair(rng: Rng): [number, number] {
  const [ta, tb] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
  const [ea, eb] = [rng.int(0, 9), rng.int(0, 9)];
  const [low, high] = [Math.min(ea, eb), Math.max(ea, eb)];
  return ta > tb ? [ta * 10 + high, tb * 10 + low] : [ta * 10 + low, tb * 10 + high];
}

const pickLarger: Form = (rng, stufe, ab) => {
  const [a, b] = clearPair(rng);
  const larger = rng.chance(0.5);
  const right = larger ? Math.max(a, b) : Math.min(a, b);
  const other = right === a ? b : a;
  const prompt = larger ? 'Welche Zahl ist größer?' : 'Welche Zahl ist kleiner?';
  return build(SKILL, stufe, {
    key: `${larger ? 'groesser' : 'kleiner'}:${a}:${b}`,
    ab,
    prompt,
    visual: placeValueOf(a, b),
    answer: makeChoice(rng, { label: fmt(right) }, [{ label: fmt(other), whyWrong: larger ? 'Schau zuerst auf die Zehner. Mehr Zehner sind mehr.' : 'Schau zuerst auf die Zehner. Weniger Zehner sind weniger.' }]),
    hints: [TENS_HINT, larger ? 'Die Zahl mit mehr Zehnern ist größer.' : 'Die Zahl mit weniger Zehnern ist kleiner.'],
    steps: [`Die Zehner sind ${tensOf(a)} und ${tensOf(b)}.`, `Die Zahl mit ${larger ? 'mehr' : 'weniger'} Zehnern ist ${larger ? 'größer' : 'kleiner'}.`, `${larger ? 'Größer' : 'Kleiner'} ist ${fmt(right)}.`],
    praise: 'Du hast die Zehner zuerst angeschaut.',
    srText: `${prompt} ${a} oder ${b}?`,
    kmk: KMK,
  });
};

const signClear: Form = (rng, stufe, ab) => {
  const [a, b] = clearPair(rng);
  // Sometimes both are equal, so that the = sign keeps a meaning.
  return signTask(rng, stufe, ab, a, rng.chance(0.1) ? a : b, 'zeichen', true);
};

/** Tens next to each other, and the larger ones at the smaller tens: 29 and 31. */
const signMisleading: Form = (rng, stufe, ab) => {
  const t = rng.int(1, 8);
  const low = rng.int(0, 7);
  const high = rng.int(low + 1, 9);
  const pair: [number, number] = [t * 10 + high, (t + 1) * 10 + low];
  const [a, b] = rng.chance(0.5) ? pair : [pair[1], pair[0]];
  return signTask(rng, stufe, ab, a, b, 'einer-taeuschen', false);
};

/** Stufe 1, AB III: which number fits □ > 47. The tens decide every option. */
const gapOtherTens: Form = (rng, stufe, ab) => {
  const t = rng.int(2, 7);
  const n = t * 10 + rng.int(0, 9);
  const sign = rng.pick(['<', '>'] as const);
  const number = (ten: number) => ten * 10 + rng.int(0, 9);
  const above = rng.shuffle([...Array(9 - t).keys()].map((i) => number(t + 1 + i)));
  const below = rng.shuffle([...Array(t - 1).keys()].map((i) => number(t - 1 - i)));
  const [fits, others] = sign === '>' ? [above, below] : [below, above];
  const x = fits[0];
  // More wrong numbers from the same side, when there are few tens on that side.
  const wrong = [...new Set([...others, ...others.map((w) => tensOf(w) * 10 + ((onesOf(w) + 3) % 10)), ...others.map((w) => tensOf(w) * 10 + ((onesOf(w) + 6) % 10))])];
  const expression = `${BOX} ${sign} ${fmt(n)}`;
  const options: ChoiceOption[] = wrong.map((w) => ({ label: fmt(w), whyWrong: `${fmt(w)} hat ${sign === '>' ? 'weniger' : 'mehr'} Zehner als ${fmt(n)}.` }));
  return build(SKILL, stufe, {
    key: `luecke:${sign}:${n}:${x}`,
    ab,
    prompt: GAP_PROMPT,
    expression,
    answer: makeChoice(rng, { label: fmt(x) }, options, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: [SIGN_HINT, sign === '>' ? 'Die Zahl in der Lücke hat mehr Zehner.' : 'Die Zahl in der Lücke hat weniger Zehner.'],
    steps: [`${fmt(n)} hat ${t} Zehner.`, `Gesucht ist eine Zahl mit ${sign === '>' ? 'mehr' : 'weniger'} Zehnern.`, `Es passt ${fmt(x)}: ${fmt(x)} ${sign} ${fmt(n)}`],
    praise: 'Du hast die Zehner zuerst angeschaut.',
    srText: speak(`${GAP_PROMPT} ${expression}`),
    kmk: KMK,
  });
};

/** Stufe 1, AB III: is the shown sign right. */
const claimOtherTens: Form = (rng, stufe, ab) => {
  const t = rng.int(1, 8);
  const [ta, tb] = rng.shuffle([t, rng.int(t + 1, 9)]);
  const a = ta * 10 + rng.int(0, 9);
  const b = tb * 10 + rng.int(0, 9);
  const right = rng.chance(0.5);
  const sign = right ? signOf(a, b) : signOf(b, a);
  const expression = `${fmt(a)} ${sign} ${fmt(b)}`;
  const prompt = 'Stimmt das Zeichen?';
  return build(SKILL, stufe, {
    key: `stimmt:${a}:${sign}:${b}`,
    ab,
    prompt,
    expression,
    answer: yesNo(rng, right, right ? `Das Zeichen passt: ${ta} und ${tb} Zehner.` : `Schau auf die Zehner: ${ta} und ${tb}.`),
    hints: [TENS_HINT, SIGN_HINT],
    steps: [`Schau zuerst auf die Zehner: ${ta} und ${tb}.`, `${Math.max(ta, tb)} Zehner sind mehr als ${Math.min(ta, tb)} Zehner.`, `Richtig ist: ${fmt(a)} ${signOf(a, b)} ${fmt(b)}`],
    praise: 'Du hast das Zeichen geprüft.',
    srText: speak(`${prompt} ${expression}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

// ─── Stufe 2: same tens, swapped pairs ────────────────────────────────────────

function sameTens(rng: Rng) {
  const t = rng.int(1, 9);
  const [ea, eb] = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
  return [t * 10 + ea, t * 10 + eb];
}

function swappedPair(rng: Rng) {
  let n = rng.int(12, 98);
  while (isPasch(n) || onesOf(n) === 0) n = rng.int(12, 98);
  return [n, swapDigits(n)];
}

const signSameTens: Form = (rng, stufe, ab) => {
  const [a, b] = sameTens(rng);
  return signTask(rng, stufe, ab, a, b, 'gleiche-zehner', true);
};

const signSwapped: Form = (rng, stufe, ab) => {
  const [a, b] = swappedPair(rng);
  return signTask(rng, stufe, ab, a, b, 'getauscht', false);
};

/** Stufe 2, AB III: which number fits □ > 47. All options have the same tens, and 47 itself is one of them. */
const gapSameTens: Form = (rng, stufe, ab) => {
  const t = rng.int(1, 9);
  const e = rng.int(2, 7);
  const n = t * 10 + e;
  const sign = rng.pick(['<', '>'] as const);
  const ones = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const fits = ones.filter((x) => (sign === '>' ? x > e : x < e));
  const others = rng.shuffle(ones.filter((x) => x !== e && (sign === '>' ? x < e : x > e)));
  const x = t * 10 + rng.pick(fits);
  const expression = `${BOX} ${sign} ${fmt(n)}`;
  const options: ChoiceOption[] = [
    { label: fmt(n), whyWrong: `Das ist dieselbe Zahl. Gesucht ist eine ${sign === '>' ? 'größere' : 'kleinere'} Zahl.` },
    ...others.map((o) => ({ label: fmt(t * 10 + o), whyWrong: `${fmt(t * 10 + o)} ist ${sign === '>' ? 'kleiner' : 'größer'} als ${fmt(n)}.` })),
  ];
  return build(SKILL, stufe, {
    key: `luecke-zehner:${sign}:${n}:${x}`,
    ab,
    prompt: GAP_PROMPT,
    expression,
    answer: makeChoice(rng, { label: fmt(x) }, options, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: [SAME_TENS_HINT, SIGN_HINT],
    steps: [`Alle Zahlen haben ${t} Zehner.`, `Gesucht sind ${sign === '>' ? 'mehr' : 'weniger'} Einer als ${e}.`, `Es passt ${fmt(x)}: ${fmt(x)} ${sign} ${fmt(n)}`],
    praise: 'Du hast die Einer verglichen.',
    srText: speak(`${GAP_PROMPT} ${expression}`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III: turn the digits in your head, then compare with the number. */
const swapAndCompare: Form = (rng, stufe, ab) => {
  const [n, swapped] = swappedPair(rng);
  const word = swapped > n ? 'größer' : 'kleiner';
  const prompt = `Tausche die Ziffern von ${fmt(n)}. Ist die neue Zahl größer oder kleiner?`;
  return build(SKILL, stufe, {
    key: `tausch:${n}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: word }, [{ label: swapped > n ? 'kleiner' : 'größer', whyWrong: `Die neue Zahl ist ${fmt(swapped)}. Schau zuerst auf die Zehner.` }], { order: ['größer', 'kleiner'] }),
    hints: ['Schreibe die neue Zahl in Gedanken auf.', TENS_HINT],
    steps: [`Die neue Zahl ist ${fmt(swapped)}.`, `${tensOf(swapped)} Zehner und ${tensOf(n)} Zehner: Die Zehner entscheiden.`, `Also: ${fmt(swapped)} ${signOf(swapped, n)} ${fmt(n)}`],
    praise: 'Du hast die getauschte Zahl verglichen.',
    srText: prompt,
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

// ─── Stufe 3: ordering, the number in between ─────────────────────────────────

/** Four numbers, and only two of them share their tens. */
function spreadValues(rng: Rng): number[] {
  const [t1, t2, t3] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  const [e1, e2] = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
  return [t1 * 10 + e1, t1 * 10 + e2, t2 * 10 + rng.int(0, 9), t3 * 10 + rng.int(0, 9)];
}

/** 4–5 distinct numbers that sit close: a swapped pair and a number with the same tens among them. */
function closeValues(rng: Rng): number[] {
  const count = rng.int(4, MAX_ORDER_ITEMS);
  const [a, swapped] = swappedPair(rng);
  const values = new Set([a, swapped]);
  values.add(tensOf(a) * 10 + ((onesOf(a) + rng.int(1, 8)) % 10));
  while (values.size < count) values.add(rng.int(11, 99));
  return [...values];
}

function orderTask(rng: Rng, stufe: Stufe, ab: Ab, kind: string, values: number[], direction: 'aufsteigend' | 'absteigend') {
  const up = direction === 'aufsteigend';
  const answer = orderAnswer(rng, values, direction);
  const shown = answer.items.map(Number);
  const sorted = answer.correct.map((i) => shown[i]);
  const byOnes = shown.map((_, i) => i).sort((i, j) => (up ? onesOf(shown[i]) - onesOf(shown[j]) : onesOf(shown[j]) - onesOf(shown[i])));
  const reversed = [...answer.correct].reverse();
  const candidates: Bug[] = [
    { id: 'vergleich-einer', match: byOnes, hint: 'Schau zuerst auf die Zehner. Dann auf die Einer.' },
    { id: 'vergleich-richtung', match: reversed, hint: up ? 'Beginne mit der kleinsten Zahl.' : 'Beginne mit der größten Zahl.' },
  ];
  const same = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);
  const bugs = candidates.filter((b, i) => !same(b.match as number[], answer.correct) && !candidates.slice(0, i).some((c) => same(c.match as number[], b.match as number[])));
  const prompt = `Ordne die Zahlen. Beginne mit der ${up ? 'kleinsten' : 'größten'} Zahl.`;
  return build(SKILL, stufe, {
    key: `${kind}:${direction}:${[...values].sort((a, b) => a - b).join('-')}`,
    ab,
    prompt,
    answer,
    hints: ['Schau zuerst auf die Zehner. Bei gleichen Zehnern entscheiden die Einer.', `Such zuerst die ${up ? 'kleinste' : 'größte'} Zahl. Dann die nächste.`],
    steps: [
      'Schau zuerst auf die Zehner, dann auf die Einer.',
      `Die ${up ? 'kleinste' : 'größte'} Zahl ist ${fmt(sorted[0])}.`,
      `${sorted.map((n) => fmt(n)).join(up ? ' < ' : ' > ')}`,
    ],
    bugs,
    praise: 'Du hast zuerst die Zehner verglichen.',
    srText: `${prompt} Die Zahlen sind ${shown.join(', ')}.`,
    kmk: KMK,
  });
}

const orderSpread: Form = (rng, stufe, ab) => orderTask(rng, stufe, ab, 'ordnen-weit', spreadValues(rng), 'aufsteigend');
const orderClose: Form = (rng, stufe, ab) => orderTask(rng, stufe, ab, 'ordnen', closeValues(rng), rng.chance(0.5) ? 'aufsteigend' : 'absteigend');

/** The options outside lo..hi, with the feedback of each. */
function outsideOptions(w: number, lo: number, hi: number): ChoiceOption {
  if (w < lo) return { label: fmt(w), whyWrong: `${fmt(w)} ist kleiner als ${fmt(lo)}.` };
  if (w > hi) return { label: fmt(w), whyWrong: `${fmt(w)} ist größer als ${fmt(hi)}.` };
  return { label: fmt(w), whyWrong: `${fmt(w)} ist eine der beiden Zahlen. Gesucht ist eine Zahl dazwischen.` };
}

const isOutside = (w: number, lo: number, hi: number) => (w <= lo || w >= hi) && w >= 1 && w <= 100;

function betweenTask(rng: Rng, stufe: Stufe, ab: Ab, kind: string, lo: number, hi: number, candidates: number[], max: number, limits: boolean) {
  const x = rng.int(lo + 1, hi - 1);
  const look = swapDigits(x);
  // A swapped x can land on a limit, which only the narrow form offers on purpose.
  const pool = [...(isOutside(look, lo, hi) && onesOf(x) !== 0 && look !== x ? [look] : []), ...rng.shuffle(candidates).filter((w) => isOutside(w, lo, hi))].filter((w) => limits || (w !== lo && w !== hi));
  const prompt = `Welche Zahl liegt zwischen ${fmt(lo)} und ${fmt(hi)}?`;
  return build(SKILL, stufe, {
    key: `${kind}:${lo}:${hi}:${x}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fmt(x) }, pool.map((w) => outsideOptions(w, lo, hi)), { max }),
    hints: [`Die Zahl ist größer als ${fmt(lo)}.`, `Die Zahl ist auch kleiner als ${fmt(hi)}.`],
    steps: [`Die Zahl muss größer als ${fmt(lo)} sein.`, `Die Zahl muss auch kleiner als ${fmt(hi)} sein.`, `Das passt bei ${fmt(x)}: ${fmt(lo)} < ${fmt(x)} < ${fmt(hi)}`],
    praise: 'Du hast beide Grenzen geprüft.',
    srText: prompt,
    kmk: KMK,
  });
}

/** Far apart, with wrong numbers far outside: both limits are easy to check. */
const betweenWide: Form = (rng, stufe, ab) => {
  const lo = rng.int(15, 70);
  const hi = lo + rng.int(10, 20);
  return betweenTask(rng, stufe, ab, 'zwischen-weit', lo, hi, [lo - rng.int(5, 9), lo - rng.int(10, 14), hi + rng.int(5, 9), hi + rng.int(10, 14)], 4, false);
};

/** Close together, with the two limits and near numbers among the options. */
const betweenClose: Form = (rng, stufe, ab) => {
  const lo = rng.int(12, 85);
  const hi = lo + rng.int(3, 9);
  return betweenTask(rng, stufe, ab, 'zwischen', lo, hi, [lo, hi, lo - rng.int(1, 4), hi + rng.int(1, 4), lo - rng.int(5, 9), hi + rng.int(5, 9)], MAX_CHOICE_OPTIONS[stufe], true);
};

/** Stufe 3, AB III: how many numbers lie between: the limits do not count. */
const countBetween: Form = (rng, stufe, ab) => {
  const lo = rng.int(12, 85);
  const hi = lo + rng.int(3, 10);
  const value = hi - lo - 1;
  const prompt = `Wie viele Zahlen liegen zwischen ${fmt(lo)} und ${fmt(hi)}?`;
  return build(SKILL, stufe, {
    key: `wie-viele:${lo}:${hi}`,
    ab,
    prompt,
    answer: { kind: 'number', value },
    hints: ['Die beiden Zahlen selbst zählen nicht mit.', 'Such die erste und die letzte Zahl dazwischen.'],
    steps: [`Die erste Zahl dazwischen ist ${fmt(lo + 1)}.`, `Die letzte Zahl dazwischen ist ${fmt(hi - 1)}.`, `Von ${fmt(lo + 1)} bis ${fmt(hi - 1)} sind es ${value} Zahlen.`],
    bugs: bugList(value, [
      ['zwischen-abstand', hi - lo, 'Das ist der Abstand. Nur die Zahlen dazwischen zählen.'],
      ['zwischen-grenzen', hi - lo + 1, 'Die beiden Zahlen selbst zählen nicht mit.'],
    ]),
    praise: 'Du hast nur die Zahlen dazwischen gezählt.',
    srText: prompt,
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Stufe 3, AB III: a chain of signs with a gap: only the two numbers around the gap decide. */
const chainGap: Form = (rng, stufe, ab) => {
  const a = rng.int(12, 50);
  const lo = a + rng.int(2, 20);
  const hi = lo + rng.int(3, 9);
  const x = rng.int(lo + 1, hi - 1);
  const look = swapDigits(x);
  const pool = [...(isOutside(look, lo, hi) && onesOf(x) !== 0 && look !== x ? [look] : []), ...rng.shuffle([a, lo, hi, hi + rng.int(1, 5), lo - 1])].filter((w) => isOutside(w, lo, hi));
  const expression = `${fmt(a)} < ${fmt(lo)} < ${BOX} < ${fmt(hi)}`;
  return build(SKILL, stufe, {
    key: `kette:${a}:${lo}:${hi}:${x}`,
    ab,
    prompt: GAP_PROMPT,
    expression,
    answer: makeChoice(rng, { label: fmt(x) }, pool.map((w) => outsideOptions(w, lo, hi)), { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Schau auf die beiden Zahlen direkt neben der Lücke.', `Die Zahl ist größer als ${fmt(lo)} und kleiner als ${fmt(hi)}.`],
    steps: [`Direkt vor der Lücke steht ${fmt(lo)}, direkt danach ${fmt(hi)}.`, 'Die Zahl muss zwischen diesen beiden liegen.', `Es passt ${fmt(x)}: ${fmt(lo)} < ${fmt(x)} < ${fmt(hi)}`],
    praise: 'Du hast die Zahl richtig einsortiert.',
    srText: speak(`${GAP_PROMPT} ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

const FORMS: Forms = {
  1: { 1: [pickLarger, signClear], 2: [signMisleading], 3: [gapOtherTens, claimOtherTens] },
  2: { 1: [signSameTens], 2: [signSwapped], 3: [gapSameTens, swapAndCompare] },
  3: { 1: [orderSpread, betweenWide], 2: [orderClose, betweenClose], 3: [countBetween, chainGap] },
};

export const vergleichenSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Größer oder kleiner',
  description: 'Du vergleichst Zahlen mit <, > und =.',
  stufen: {
    1: '2 Zahlen mit anderen Zehnern vergleichen.',
    2: 'Gleiche Zehner und getauschte Ziffern wie 34 und 43.',
    3: 'Zahlen ordnen; die Zahl dazwischen finden.',
  },
  kmk: KMK,
  generate: fromForms(FORMS),
};
