/**
 * Kernaufgaben üben: the fact trainer over the 40 Kern facts (docs/research.md §7.1). The 6 optional squares stay with the Extra
 * skill einmaleins.quadrate, which owns them (src/state/facts.ts): this core skill promises mal 1, 2, 5 and 10 and keeps to it.
 * Facts come at random and never row by row (§7.2): due facts first, then new facts in a fixed order, with facts that are
 * still being learned in between. Answering a task with a factKey updates the fact's Leitner box (src/state/mastery.ts).
 *
 * All Stufen train the same 40 facts, and pickFact chooses which. The Stufe chooses how a fact is asked (§6), the AB the demand inside it:
 *
 *        AB I                  AB II                     AB III
 * S1     2 · 7 = □, a new      7 · 2 = □, the other      which of 2 tasks gives more; does this result hold
 *        fact with its field   order, no field           (no factKey: found by comparing)
 * S2     □ · 2 = 14            2 · □ = 14; □ · 7 = 14    14 = □ · 2; the same gap in 2 tasks
 * S3     14 : 2 = □            14 : □ = 7; □ : 2 = 7     20 : 2 = □ · 5; which task has the result of 14 : 2 (no factKey: found by comparing)
 *
 * On Stufe 2 the first factor counts the groups (src/state/facts.ts), so the form of a fact keeps its order: 5 · 2 is another fact than 2 · 5.
 * Only a fact with one Kern factor may turn (7 · 2 and 2 · 7 share '2x7').
 *
 * A review slot (GenContext.factKey) forces its fact: it comes as the AB I form of its Stufe with exactly this factKey. Review rounds always
 * name Stufe 1 (src/state/round.ts), so a review is the plain task 2 · 7 = □; its twin has no factKey in the slot and goes through pickFact.
 * With mal 1 and with n · n the usual gap would show the answer, so there the 1 is asked (□ · 7 = 7, 7 : □ = 7) or both gaps are one (□ · □ = 25).
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX } from '../../core/format';
import type { Ab, GenContext, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { KERN_FACT_KEYS, factFactors, factKeyOf, isKernFact } from '../../state/facts';
import { build, bugList, makeChoice, multiBugs, targetAb, type ExerciseBody } from '../shared';
import { durch, factBugs, factOrder, factTask, feld, mal, malFrage, missingFactorTask, reviewAb, showDots, sr, stimmtAnswer } from './helpers';

const ID = 'einmaleins.einmaleins';
const META = { id: ID, topicId: 'einmaleins' } as const;
const KMK = ['ZO.kernaufgaben'];

/** The partner factors in the order they are introduced: mixed, so that no row is recited. */
const PARTNER_ORDER: readonly number[] = [3, 7, 4, 9, 6, 8, 2, 5, 10, 1];

/** Mal 2 and mal 10 first, then mal 5, then mal 1. */
const FACTOR_ORDER: readonly number[] = [2, 10, 5, 1];

/** The Kern facts in introduction order. */
export const INTRO_ORDER: readonly string[] = [...KERN_FACT_KEYS].sort((x, y) => {
  const [xa, xb] = factFactors(x);
  const [ya, yb] = factFactors(y);
  return FACTOR_ORDER.indexOf(xa) - FACTOR_ORDER.indexOf(ya) || PARTNER_ORDER.indexOf(xb) - PARTNER_ORDER.indexOf(yb);
});

/** Facts in box 0 (new or missed, not yet answered right) that may be open at once before new facts wait. */
export const MAX_LEARNING = 4;

/**
 * The next fact.
 * - Without fact data (worksheets, no consent) every Kern fact is equally likely.
 * - With fact data: facts due by date first, most overdue first. Otherwise the next new facts, mixed with box-0 facts and now and
 *   then a known fact; new facts wait while MAX_LEARNING facts are in box 0.
 */
export function pickFact(rng: Rng, ctx: GenContext): string {
  const pool = INTRO_ORDER;
  const facts = ctx.facts;
  if (!facts) return rng.pick(pool);
  const started = pool.filter((k) => k in facts);
  const due = started
    .filter((k) => {
      const d = facts[k].due;
      return !d || (ctx.today !== undefined && d <= ctx.today);
    })
    .sort((x, y) => (facts[x].due ?? '').localeCompare(facts[y].due ?? '') || facts[x].box - facts[y].box);
  if (due.length > 0) return rng.pick(due.slice(0, 4));
  const learning = started.filter((k) => facts[k].box === 0);
  const known = started.filter((k) => facts[k].box >= 1);
  const fresh = learning.length < MAX_LEARNING ? pool.filter((k) => !(k in facts)).slice(0, 3) : [];
  const roll = rng.next();
  if (fresh.length > 0) {
    if (learning.length > 0 && roll < 0.4) return rng.pick(learning);
    if (known.length > 0 && roll >= 0.9) return rng.pick(known);
    return rng.pick(fresh);
  }
  if (learning.length > 0 && (known.length === 0 || roll < 0.7)) return rng.pick(learning);
  return known.length > 0 ? rng.pick(known) : rng.pick(pool);
}

/** The easy factor of a fact, and the other one. */
const parts = (key: string): { k: number; n: number; swaps: boolean } => {
  const [k, n] = factFactors(key);
  return { k, n, swaps: factKeyOf(n, k) === key };
};

/** The order that reads most directly: 2 · 7 is 7 + 7, 7 · 10 is 7 Zehner. */
function direkteFolge(key: string): [number, number] {
  const { k, n, swaps } = parts(key);
  return k === 10 && swaps ? [n, k] : [k, n];
}

/** The other order, where the fact allows it: 7 · 2 takes the Tauschaufgabe, 10 · 7 is 10 Siebener. */
function andereFolge(key: string): [number, number] {
  const { k, n, swaps } = parts(key);
  return k !== 10 && swaps ? [n, k] : [k, n];
}

/** A task that asks this fact: the review counts for it, whichever form the numbers take. */
const fuer = (key: string, body: ExerciseBody): ExerciseBody => ({ ...body, factKey: key });

// ─── Stufe 1: Malaufgaben ────────────────────────────────────────────────────

/** Which of 2 tasks gives more? Both have to be recalled; the answer says nothing about one fact, so no factKey. */
function vergleichen(rng: Rng, key: string, ab: Ab, stufe: Stufe): ExerciseBody {
  const [a, b] = direkteFolge(key);
  const p = a * b;
  const others = KERN_FACT_KEYS.filter((k) => {
    const [x, y] = factFactors(k);
    const q = x * y;
    return k !== key && q !== p && Math.abs(q - p) <= 15;
  });
  const [c, d] = direkteFolge(rng.pick(others));
  const q = c * d;
  const [hi, lo] = p > q ? [mal(a, b), mal(c, d)] : [mal(c, d), mal(a, b)];
  const prompt = 'Welche Aufgabe hat das größere Ergebnis?';
  return {
    key: `vergleich:${a}x${b}:${c}x${d}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: hi }, [{ label: lo, whyWrong: `${lo} ergibt weniger. Rechne beide Aufgaben.` }], { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Rechne jede Aufgabe im Kopf.', 'Vergleiche dann beide Ergebnisse.'],
    steps: [`${mal(a, b)} = ${p}`, `${mal(c, d)} = ${q}`, `Das größere Ergebnis hat ${hi}.`],
    praise: 'Du hast beide Ergebnisse verglichen.',
    srText: sr(prompt, `${mal(a, b)} oder ${mal(c, d)}.`),
    kmk: KMK,
  };
}

/** Does this result hold? A wrong result is a typical error of this fact. */
function stimmtFakt(rng: Rng, key: string, ab: Ab): ExerciseBody {
  const [a, b] = direkteFolge(key);
  const p = a * b;
  const wrongs = factBugs(a, b).flatMap((bug) => (typeof bug.match === 'number' && bug.match <= 100 && bug.match > 0 ? [bug] : []));
  const bug = wrongs.length > 0 && rng.chance(0.6) ? rng.pick(wrongs) : null;
  const shown = bug ? (bug.match as number) : p;
  const expression = `${mal(a, b)} = ${shown}`;
  return {
    key: `stimmt:${a}x${b}:${shown}`,
    ab,
    prompt: 'Stimmt das?',
    expression,
    answer: stimmtAnswer(rng, !bug, bug ? bug.hint : `Das stimmt: ${mal(a, b)} = ${p}.`),
    hints: ['Rechne die Aufgabe selbst.', 'Vergleiche dann mit der Zahl rechts.'],
    steps: [`${mal(a, b)} = ${p}`, bug ? 'Das stimmt nicht.' : 'Das stimmt.'],
    praise: 'Du hast das Ergebnis selbst geprüft.',
    srText: sr('Stimmt das?', expression),
    kmk: KMK,
  };
}

// ─── Stufe 2: a missing factor ───────────────────────────────────────────────

/** □ · □ = 25: for n · n a single gap would show its answer next to it. */
function gleicheLuecken(n: number, ab: Ab): ExerciseBody {
  const p = n * n;
  const prompt = 'Welche Zahl gehört in beide Lücken?';
  const expression = `${BOX} · ${BOX} = ${p}`;
  return {
    key: `gleich:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: n, label: 'Zahl in den Lücken' },
    hints: ['Beide Zahlen sind gleich.', 'Probiere eine Zahl und rechne sie mal sich selbst.'],
    steps: [`Frage: Welche Zahl mal sich selbst ergibt ${p}?`, `${mal(n, n)} = ${p}`, `In die Lücken gehört ${n}.`],
    bugs: bugList(n, [['minus-statt-mal', p - n, `Minus passt hier nicht. Welche Zahl mal sich selbst ergibt ${p}?`]]),
    praise: 'Du hast die passende Malaufgabe gefunden.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

/** The form of a missing factor at this level of the Stufe. All keep the fact; none shows its answer, except 1 · 1, which has no other form. */
function lueckeFuer(rng: Rng, key: string, ab: Ab, level: 'direkt' | 'anders' | 'gedreht'): ExerciseBody {
  const { k, n, swaps } = parts(key);
  if (k === 1 && n === 1) return fuer(key, factTask(1, 1, ab, KMK));
  if (k === n) return fuer(key, gleicheLuecken(k, ab));
  const gedreht = level === 'gedreht';
  // The 1 is the gap: □ · 7 = 7, 7 · □ = 7. 2 · □ = 2 would be the fact 2 · 1, so '1x2' keeps the gap in front.
  if (k === 1) return fuer(key, missingFactorTask(1, n, ab, KMK, level !== 'anders' || !swaps, gedreht));
  if (n === 1) return fuer(key, missingFactorTask(1, k, ab, KMK, false, gedreht));
  if (level === 'direkt') return fuer(key, swaps ? missingFactorTask(n, k, ab, KMK, true) : missingFactorTask(k, n, ab, KMK, true));
  if (level === 'anders') {
    const form = rng.pick(['k-vorn', 'n-bekannt'] as const);
    return fuer(key, form === 'k-vorn' ? missingFactorTask(n, k, ab, KMK, false) : missingFactorTask(k, n, ab, KMK, true));
  }
  if (swaps) return fuer(key, missingFactorTask(n, k, ab, KMK, rng.chance(0.5), true));
  // Two Kern factors: 10 = □ · 2 would be the fact 5 · 2, not 2 · 5.
  return fuer(key, rng.chance(0.5) ? missingFactorTask(n, k, ab, KMK, false, true) : missingFactorTask(k, n, ab, KMK, true, true));
}

/** □ · 2 = 14 and □ · 5 = 35: the same number is missing in 2 Kern facts. The answer counts for the fact that was asked. */
function zweiLuecken(rng: Rng, key: string, ab: Ab): ExerciseBody {
  const { k, n, swaps } = parts(key);
  // The gap comes first, so it counts the groups: □ · 2 = 14 is 7 · 2, which shares '2x7'. Of two Kern factors the first one is asked: '2x5' is □ · 5 = 10.
  const [gap, known] = swaps ? [n, k] : [k, n];
  const m = rng.pick([2, 5, 10].filter((x) => x !== k && x !== n));
  const fields: MultiField[] = [
    { id: 'eins', value: gap, after: `· ${known} = ${gap * known}`, label: 'Erste Lücke' },
    { id: 'zwei', value: gap, after: `· ${m} = ${gap * m}`, label: 'Zweite Lücke' },
  ];
  const prompt = 'In beiden Lücken fehlt die gleiche Zahl. Welche Zahl?';
  return {
    key: `zwei-luecken:${gap}:${known}:${m}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [`Wie oft passt die ${known} in ${gap * known}?`, 'Prüfe die Zahl auch in der zweiten Aufgabe.'],
    steps: [`${mal(gap, known)} = ${gap * known}`, `${mal(gap, m)} = ${gap * m}`, `In beide Lücken gehört ${gap}.`],
    bugs: multiBugs([{ id: 'minus-statt-mal', match: { eins: gap * known - known }, hint: `Minus passt hier nicht. Wie oft passt die ${known} in ${gap * known}?` }], fields),
    praise: 'Du hast die Zahl in 2 Aufgaben geprüft.',
    srText: sr(prompt, `${BOX} · ${known} = ${gap * known}.`, `${BOX} · ${m} = ${gap * m}.`),
    kmk: KMK,
    factKey: key,
  };
}

// ─── Stufe 3: Geteiltaufgaben ────────────────────────────────────────────────

function teilenBugs(q: number, p: number, d: number) {
  return bugList(q, [
    ['teilen-als-minus', p - d, `Teilen heißt: ${p} in gleich große Gruppen legen.`],
    ['ergebnis-nochmal-mal', p * d, `Beim Teilen wird es weniger. Wie oft passt die ${d} in ${p}?`],
  ]);
}

/** The result and the divisor of the Geteiltaufgabe of a fact. With a factor 1 the divisor is the other factor: 7 : 1 would show its answer. */
function teilung(key: string): { q: number; d: number } {
  const { k, n } = parts(key);
  if (k === 1) return { q: 1, d: n };
  if (n === 1) return { q: 1, d: k };
  return { q: n, d: k };
}

/** p : d = □. */
function teilenTask(key: string, ab: Ab): ExerciseBody {
  const { k, n } = parts(key);
  if (k === n && k > 1) return teilenGleich(key, k, ab);
  const { q, d } = teilung(key);
  const p = q * d;
  const expression = `${durch(p, d)} = ${BOX}`;
  return fuer(key, {
    key: `teilen:${q}x${d}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: { kind: 'number', value: q, label: 'Ergebnis' },
    hints: [`Denk an die Malaufgabe: ${BOX} · ${d} = ${p}.`, `Wie oft passt die ${d} in ${p}?`],
    steps: [`Malaufgabe: ${BOX} · ${d} = ${p}`, `${mal(q, d)} = ${p}`, `Also: ${durch(p, d)} = ${q}`],
    bugs: teilenBugs(q, p, d),
    praise: 'Du hast die Malaufgabe zum Teilen genutzt.',
    srText: sr('Rechne.', expression),
    kmk: KMK,
  });
}

/** 25 : □ = □: for n · n a plain division would show its answer. */
function teilenGleich(key: string, n: number, ab: Ab): ExerciseBody {
  const p = n * n;
  const prompt = 'Welche Zahl gehört in beide Lücken?';
  const expression = `${p} : ${BOX} = ${BOX}`;
  return fuer(key, {
    key: `teilen-gleich:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: n, label: 'Zahl in den Lücken' },
    hints: [`Welche Zahl mal sich selbst ergibt ${p}?`, 'Probiere eine Zahl aus.'],
    steps: [`Frage: Welche Zahl mal sich selbst ergibt ${p}?`, `${mal(n, n)} = ${p}`, `Also: ${durch(p, n)} = ${n}`],
    bugs: bugList(n, [['teilen-als-minus', p - n, `Teilen heißt: ${p} in gleich große Gruppen legen.`]]),
    praise: 'Du hast die Malaufgabe zum Teilen genutzt.',
    srText: sr(prompt, expression),
    kmk: KMK,
  });
}

/** A gap in the Geteiltaufgabe: the divisor (14 : □ = 7) or the dividend (□ : 2 = 7). With a factor 1 only the divisor keeps the answer out of the task; with n · n only the dividend. */
function teilenLuecke(rng: Rng, key: string, ab: Ab): ExerciseBody {
  const { k, n } = parts(key);
  const { q, d } = teilung(key);
  const p = q * d;
  const eins = k === 1 || n === 1;
  // 7 : □ = 7 is 7 : 1 = 7; q = 1 and d = 7 of teilung() stand the other way round here.
  const [result, divisor] = eins ? [p, 1] : [q, d];
  const askDivisor = eins || (k !== n && rng.chance(0.5));
  if (askDivisor) {
    const expression = `${p} : ${BOX} = ${result}`;
    return fuer(key, {
      key: `teiler:${p}:${result}`,
      ab,
      prompt: 'Welche Zahl gehört in die Lücke?',
      expression,
      answer: { kind: 'number', value: divisor, label: 'Zahl in der Lücke' },
      hints: [`Denk an die Malaufgabe: ${result} · ${BOX} = ${p}.`, malFrage(result, p)],
      steps: [`Malaufgabe: ${result} · ${BOX} = ${p}`, `${mal(result, divisor)} = ${p}`, `In die Lücke gehört ${divisor}.`],
      bugs: bugList(divisor, [['teilen-als-minus', p - result, `Minus passt hier nicht. ${malFrage(result, p)}`]]),
      praise: 'Du hast die passende Malaufgabe gefunden.',
      srText: sr('Welche Zahl gehört in die Lücke?', expression),
      kmk: KMK,
    });
  }
  const expression = `${BOX} : ${d} = ${q}`;
  return fuer(key, {
    key: `dividend:${q}:${d}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: p, label: 'Zahl in der Lücke' },
    hints: ['Rechne rückwärts mit der Malaufgabe.', `Rechne ${mal(q, d)}.`],
    steps: [`Rückwärts: ${mal(q, d)} = ${BOX}`, `${mal(q, d)} = ${p}`, `In die Lücke gehört ${p}.`],
    bugs: bugList(p, [['umkehr-plus', q + d, `Plus passt hier nicht. Rechne die Malaufgabe: ${mal(q, d)}.`]]),
    praise: 'Du hast mit der Malaufgabe rückwärts gerechnet.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk: KMK,
  });
}

/**
 * 20 : 2 = □ · 5: both sides have to be worked out, so it asks more than a gap in one fact. It counts for the fact of the Geteiltaufgabe.
 * The result of the Geteiltaufgabe has to split into 2 different factors, and the gap must not be a number of the task. Otherwise null.
 */
function kette(rng: Rng, key: string, ab: Ab): ExerciseBody | null {
  const { q, d } = teilung(key);
  const p = q * d;
  const splits = [2, 3, 4, 5].filter((a) => q % a === 0 && q / a >= 2 && q / a !== a && a !== d && factKeyOf(a, q / a) !== undefined);
  if (splits.length === 0) return null;
  const a = rng.pick(splits);
  const m = q / a;
  const expression = `${durch(p, d)} = ${BOX} · ${m}`;
  const prompt = 'Welche Zahl gehört in die Lücke?';
  return fuer(key, {
    key: `kette:${p}:${d}:${m}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: a, label: 'Zahl in der Lücke' },
    hints: [`Rechne zuerst ${durch(p, d)}.`, `Wie oft passt die ${m} in dein Ergebnis?`],
    steps: [`${durch(p, d)} = ${q}`, `${mal(a, m)} = ${q}`, `In die Lücke gehört ${a}.`],
    bugs: bugList(a, [['ergebnis-nochmal-mal', q, `Das ist das Ergebnis links. Wie oft passt die ${m} hinein?`]]),
    praise: 'Du hast Geteilt und Mal verbunden.',
    srText: sr(prompt, expression),
    kmk: KMK,
  });
}

/**
 * Which task has the same result as 14 : 2? First one task, then the others have to be worked out, so no result is given.
 * Found by comparing, so no factKey. All divide by an easy factor and come out whole.
 */
function geteiltWaehlen(rng: Rng, q: number, d: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = `Welche Aufgabe hat das gleiche Ergebnis wie ${durch(q * d, d)}?`;
  const andere = [2, 5, 10].filter((x) => x !== d);
  const rechts = rng.pick(andere);
  const near = [q + 1, q - 1, q + 2, q - 2].filter((x) => x >= 1 && x <= 10).map((x) => [x * rng.pick(andere), x]);
  const right = durch(q * rechts, rechts);
  return {
    key: `geteilt-waehlen:${q}:${d}:${rechts}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: right },
      rng.shuffle(near).map(([x, r]) => ({ label: durch(x, x / r), whyWrong: `${durch(x, x / r)} ergibt ${r}.` })),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Rechne zuerst die Aufgabe in der Frage.', 'Rechne dann jede Aufgabe zum Antippen.'],
    steps: [`${durch(q * d, d)} = ${q}`, `${right} = ${q}`, `Die Aufgabe ist ${right}.`],
    praise: 'Du hast die Aufgaben miteinander verglichen.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/**
 * Which Malaufgabe has the result of this Geteiltaufgabe? Found by comparing, so it is no recall and carries no factKey.
 * Every option is a Kern fact: other facts appear only as derivation tasks (docs/research.md §7.1). Only for a result up to 10: above it no Geteiltaufgabe by 2, 5 or 10 stays in the Kern facts.
 */
function ergebnisWaehlen(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const r = a * b;
  const d = rng.pick([2, 5, 10].filter((x) => x !== r));
  const prompt = `Welche Malaufgabe hat das gleiche Ergebnis wie ${durch(r * d, d)}?`;
  const near = [
    [a + 1, b],
    [a - 1, b],
    [a, b + 1],
    [a, b - 1],
    [a + 2, b],
  ].filter(([x, y]) => {
    const fact = factKeyOf(x, y);
    return fact !== undefined && isKernFact(fact) && x * y !== r;
  });
  return {
    key: `waehlen:${a}x${b}:${d}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: mal(a, b) },
      rng.shuffle(near).map(([x, y]) => ({ label: mal(x, y), whyWrong: `${mal(x, y)} ergibt ${x * y}.` })),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Rechne zuerst die Aufgabe in der Frage.', 'Rechne dann jede Malaufgabe im Kopf.'],
    steps: [`${durch(r * d, d)} = ${r}`, `${mal(a, b)} = ${r}`, `Die Aufgabe ist ${mal(a, b)}.`],
    praise: 'Du hast die Aufgaben miteinander verglichen.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** A review slot: the fact is forced, the form is the AB I form of the Stufe. */
function factSlot(rng: Rng, stufe: Stufe, key: string, ab: Ab): ExerciseBody {
  if (stufe === 1) {
    const [a, b] = factOrder(rng, key);
    return fuer(key, factTask(a, b, ab, KMK));
  }
  return stufe === 2 ? lueckeFuer(rng, key, ab, 'direkt') : teilenTask(key, ab);
}

function stufe1(rng: Rng, key: string, ab: Ab, ctx: GenContext): ExerciseBody {
  if (ab === 1) {
    const [a, b] = direkteFolge(key);
    return factTask(a, b, ab, KMK, showDots(rng, 1, key, ctx) ? feld(a, b) : undefined);
  }
  if (ab === 2) {
    const [a, b] = andereFolge(key);
    return factTask(a, b, ab, KMK);
  }
  return rng.chance(0.5) ? vergleichen(rng, key, ab, 1) : stimmtFakt(rng, key, ab);
}

function stufe2(rng: Rng, key: string, ab: Ab): ExerciseBody {
  if (ab === 1) return lueckeFuer(rng, key, ab, 'direkt');
  if (ab === 2) return lueckeFuer(rng, key, ab, 'anders');
  const { k, n } = parts(key);
  const canPair = k !== 1 && n !== 1 && k !== n && [2, 5, 10].some((x) => x !== k && x !== n);
  return canPair && rng.chance(0.5) ? zweiLuecken(rng, key, ab) : lueckeFuer(rng, key, ab, 'gedreht');
}

function stufe3(rng: Rng, key: string, ab: Ab): ExerciseBody {
  if (ab === 1) return teilenTask(key, ab);
  if (ab === 2) return teilenLuecke(rng, key, ab);
  const chain = kette(rng, key, ab);
  if (chain && rng.chance(0.5)) return chain;
  const { q, d } = teilung(key);
  const [a, b] = factOrder(rng, key);
  // A result above 10 has no Geteiltaufgabe by 2, 5 or 10 in the Kern facts; a fact of mal 1 has no other task with the result 1.
  if (q >= 2 && (a * b > 10 || rng.chance(0.5))) return geteiltWaehlen(rng, q, d, ab, 3);
  return ergebnisWaehlen(rng, a, b, ab, 3);
}

export const einmaleinsSkill: SkillDef = {
  ...META,
  title: 'Kernaufgaben üben',
  description: 'Du übst die Aufgaben mit 1, 2, 5 und 10.',
  stufen: {
    1: 'Malaufgaben mit 1, 2, 5 und 10',
    2: 'Lücken in den Malaufgaben',
    3: 'Geteilt-Aufgaben und das passende Ergebnis',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    if (ctx.factKey) return build(META, stufe, factSlot(rng, stufe, ctx.factKey, reviewAb(ctx)));
    const ab = targetAb(rng, stufe, ctx);
    const key = pickFact(rng, ctx);
    const body = stufe === 1 ? stufe1(rng, key, ab, ctx) : stufe === 2 ? stufe2(rng, key, ab) : stufe3(rng, key, ab);
    return build(META, stufe, body);
  },
};
