/**
 * Wo sind die Chancen größer? (Extra: only Bayern names it, §6.) The Stufe chooses the content, the AB the demand inside it:
 * Stufe 1, two bags with the same total: AB I far apart; AB II close, also the same; AB III less often, which bag fits a sentence.
 * Stufe 2, wheels with equal sectors, by count: AB I far apart; AB II close, also the same, the colour of one wheel; AB III less often, which
 * wheel fits a sentence.
 * Stufe 3, Kugeln dazulegen oder herausnehmen, so that a colour is sicher or unmöglich: AB I which balls may go in; AB II what to do with a
 * mixed bag; AB III how many come out, three colours, which balls may not go in.
 * Bags and wheels always have the same total: proportions are not Klasse 2.
 */
import { fmt } from '../../core/format';
import type { Ab, ChoiceOption, ColorName, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, makeChoice, targetAb } from '../shared';
import { COLORS, COLOR_ADJ, COLOR_ADJ_N, COLOR_NOUN, COLOR_WORD, arrangeSectors, ballsText, bagText, isBalls, isSectors, parts, pictureChoice, sectorsText, spoken, type Balls } from './helpers';

const SKILL = { id: 'daten.chancen', topicId: 'daten' } as const;
const KMK = ['DZ.zufall', 'PK.argumentieren'];

/** Kugeln in one bag of Stufe 1, per AB. */
export const BAG_SIZE: Record<Ab, readonly [number, number]> = { 1: [6, 8], 2: [8, 10], 3: [10, 14] };
/** Felder on one wheel of Stufe 2, per AB. */
export const WHEEL_SIZE: Record<Ab, readonly number[]> = { 1: [4, 6], 2: [6, 8], 3: [8, 10] };

const SAME = 'Bei beiden gleich';
/** Names the draw that comes after the change: alone, 'Rot soll sicher bleiben.' can read as 'red stays safe'. */
const DRAW = 'Gleich ziehst du 1 Kugel.';

const bag = (balls: Balls): Visual => ({ type: 'bag', balls });

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Two different counts of the target colour with a gap in [minGap, maxGap], or the same one for a 'gleich' task; both groups stay at least 1. */
function twoCounts(rng: Rng, total: number, same: boolean, minGap = 1, maxGap = total): [number, number] {
  if (same) {
    const n = rng.int(2, total - 2);
    return [n, n];
  }
  for (;;) {
    const [a, b] = rng.sample(Array.from({ length: total - 1 }, (_, i) => i + 1), 2);
    if (Math.abs(a - b) >= minGap && Math.abs(a - b) <= maxGap) return [a, b];
  }
}

/** AB I far apart, AB II close and sometimes the same, AB III any, and it asks for the fewer. */
const gaps = (ab: Ab): [number, number] => (ab === 1 ? [3, 9] : ab === 2 ? [1, 2] : [1, 3]);

// ─── Stufe 1: Säckchen vergleichen ───────────────────────────────────────────

function saeckchenVergleichen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u] = rng.sample(COLORS, 2);
  const total = rng.int(...BAG_SIZE[ab]);
  const same = ab === 2 && rng.chance(0.25);
  const [a, b] = twoCounts(rng, total, same, ...gaps(ab));
  const fewer = ab === 3;
  const bagA: Balls = [{ color: t, count: a }, { color: u, count: total - a }];
  const bagB: Balls = [{ color: t, count: b }, { color: u, count: total - b }];
  const prompt = fewer ? `Aus welchem Säckchen ziehst du seltener ${COLOR_NOUN[t]}?` : `Aus welchem Säckchen ziehst du eher ${COLOR_NOUN[t]}?`;
  const adj = COLOR_ADJ_N[t];
  const whySame = `Zähle die ${adj} Kugeln im anderen Säckchen. Es sind gleich viele.`;
  const wrongA = same || (fewer ? a > b : a < b);
  const wrongB = same || (fewer ? b > a : b < a);
  const whyPick = (n: number) => `In diesem Säckchen ${isBalls(t, n)}. Im anderen sind es ${fewer ? 'weniger' : 'mehr'}.`;
  const { answer, labels } = pictureChoice(
    rng,
    'Säckchen',
    [
      { visual: bag(bagA), ...(wrongA ? { whyWrong: same ? whySame : whyPick(a) } : {}) },
      { visual: bag(bagB), ...(wrongB ? { whyWrong: same ? whySame : whyPick(b) } : {}) },
    ],
    same ? { label: SAME } : { label: SAME, whyWrong: `Die Zahlen sind nicht gleich: ${fmt(a)} und ${fmt(b)}.` },
  );
  const rows = [`${labels[0]}: ${ballsText(t, a)}.`, `${labels[1]}: ${ballsText(t, b)}.`].sort();
  const winner = (fewer ? a < b : a > b) ? labels[0] : labels[1];
  return build(SKILL, stufe, {
    key: `saeckchen:${t}:${u}:${total}:${a}:${b}${fewer ? ':seltener' : ''}`,
    ab,
    prompt,
    answer,
    hints: [`Zähle die ${adj} Kugeln in beiden Säckchen.`, 'Beide Säckchen haben gleich viele Kugeln.'],
    steps: [...rows, same ? 'Es sind gleich viele. Die Chancen sind gleich.' : `Bei ${winner} sind es ${fewer ? 'weniger' : 'mehr'}. Dort ziehst du ${fewer ? 'seltener' : 'eher'} ${COLOR_NOUN[t]}.`],
    praise: `Du hast die ${adj} Kugeln verglichen.`,
    srText: spoken(undefined, ...[`${labels[0]} hat ${bagText(bagA)}.`, `${labels[1]} hat ${bagText(bagB)}.`].sort(), prompt),
    kmk: KMK,
  });
}

/** AB III on Stufe 1, the other way round: from the sentence to the bag. All bags have the same total. */
function saeckchenPassend(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u] = rng.sample(COLORS, 2);
  const half = rng.int(4, 6);
  const total = 2 * half;
  const d = rng.int(1, 3);
  const noun = COLOR_NOUN[t];
  const other = COLOR_NOUN[u];
  const more: Balls = [{ color: t, count: half + d }, { color: u, count: half - d }];
  const fewer: Balls = [{ color: t, count: half - d }, { color: u, count: half + d }];
  const equal: Balls = [{ color: t, count: half }, { color: u, count: half }];
  const want = rng.pick(['eher', 'seltener', 'gleich'] as const);
  const right = want === 'eher' ? more : want === 'seltener' ? fewer : equal;
  const whyOf = (balls: Balls) => (balls === equal ? `Hier sind gleich viele ${COLOR_ADJ[t]} und ${COLOR_ADJ[u]} Kugeln.` : balls === more ? `Hier sind mehr ${COLOR_ADJ[t]} Kugeln.` : `Hier sind mehr ${COLOR_ADJ[u]} Kugeln.`);
  const context = `Du ziehst 1 Kugel. ${want === 'gleich' ? `${noun} und ${other} kommen gleich oft.` : `${noun} kommt ${want} als ${other}.`}`;
  const prompt = 'Welches Säckchen passt?';
  const { answer, labels } = pictureChoice(rng, 'Säckchen', [right, ...[more, fewer, equal].filter((b) => b !== right)].map((balls, i) => ({ visual: bag(balls), ...(i === 0 ? {} : { whyWrong: whyOf(balls) }) })));
  return build(SKILL, stufe, {
    key: `saeckchen-passt:${t}:${u}:${total}:${d}:${want}`,
    ab,
    context,
    prompt,
    answer,
    hints: ['Zähle in jedem Säckchen beide Farben.', 'Die Farbe mit mehr Kugeln kommt eher.'],
    steps: [`${labels[0]} hat ${bagText(right)}.`, `${labels[0]} passt.`],
    praise: 'Du hast beide Farben in jedem Säckchen verglichen.',
    srText: spoken(undefined, context, prompt),
    kmk: KMK,
  });
}

// ─── Stufe 2: Glücksräder ────────────────────────────────────────────────────

function raederVergleichen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u] = rng.sample(COLORS, 2);
  const size = rng.pick(WHEEL_SIZE[ab]);
  const same = ab === 2 && rng.chance(0.25);
  const fewer = ab === 3;
  const [a, b] = twoCounts(rng, size, same, ...(ab === 1 ? [2, 5] as [number, number] : gaps(ab)));
  const wheel = (n: number): Visual => ({ type: 'spinner', sectors: arrangeSectors(rng, [{ color: t, count: n }, { color: u, count: size - n }]) });
  const [wheelA, wheelB] = [wheel(a), wheel(b)];
  const noun = COLOR_NOUN[t];
  const word = fewer ? 'seltener' : 'eher';
  const prompt = `Bei welchem Rad kommt ${noun} ${word}?`;
  const whyPick = (n: number) => `Hier ${isSectors(t, n)}. Beim anderen Rad sind es ${fewer ? 'weniger' : 'mehr'}.`;
  const whySame = 'Zähle die Felder beim anderen Rad. Es sind gleich viele.';
  const wrongA = same || (fewer ? a > b : a < b);
  const wrongB = same || (fewer ? b > a : b < a);
  const { answer, labels } = pictureChoice(
    rng,
    'Rad',
    [
      { visual: wheelA, ...(wrongA ? { whyWrong: same ? whySame : whyPick(a) } : {}) },
      { visual: wheelB, ...(wrongB ? { whyWrong: same ? whySame : whyPick(b) } : {}) },
    ],
    same ? { label: SAME } : { label: SAME, whyWrong: `Die Zahlen sind nicht gleich: ${fmt(a)} und ${fmt(b)}.` },
  );
  const winner = (fewer ? a < b : a > b) ? labels[0] : labels[1];
  return build(SKILL, stufe, {
    key: `raeder:${t}:${u}:${size}:${a}:${b}${fewer ? ':seltener' : ''}`,
    ab,
    prompt,
    answer,
    hints: [`Zähle die Felder mit ${noun} bei beiden Rädern.`, 'Alle Felder sind gleich groß.'],
    steps: [...[`${labels[0]}: ${sectorsText(t, a)}.`, `${labels[1]}: ${sectorsText(t, b)}.`].sort(), same ? 'Es sind gleich viele. Die Chancen sind gleich.' : `Bei ${winner} sind es ${fewer ? 'weniger' : 'mehr'}. Dort kommt ${noun} ${word}.`],
    praise: 'Du hast die Felder beider Räder verglichen.',
    srText: spoken(undefined, ...[`${labels[0]} hat ${fmt(size)} Felder: ${sectorsText(t, a)}.`, `${labels[1]} hat ${fmt(size)} Felder: ${sectorsText(t, b)}.`].sort(), prompt),
    kmk: KMK,
  });
}

/** One wheel with three colours: AB II the colour that comes most often, AB III the one that comes least often. */
function farbeAmRad(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const colors = rng.sample(COLORS, 3);
  const size = rng.pick(WHEEL_SIZE[ab]);
  const least = ab === 3;
  // Three counts with one largest (or one smallest) group: that group is the answer.
  const counts = parts(rng, size, 3, 1, size - 2).sort((x, y) => y - x);
  if (!least && counts[0] === counts[1]) {
    counts[0]++;
    counts[1]--;
  }
  if (least && counts[1] === counts[2]) {
    if (counts[2] > 1) {
      counts[2]--;
      counts[1]++;
    } else {
      counts[0]--;
      counts[1]++;
    }
  }
  const groups = colors.map((color, i) => ({ color, count: counts[i] }));
  const sectors = arrangeSectors(rng, groups);
  const visual: Visual = { type: 'spinner', sectors };
  const prompt = least ? 'Auf welcher Farbe bleibt das Rad am seltensten stehen?' : 'Auf welcher Farbe bleibt das Rad eher stehen?';
  const best = groups.reduce((a, g) => ((least ? g.count < a.count : g.count > a.count) ? g : a));
  const wrongs: ChoiceOption[] = groups
    .filter((g) => g !== best)
    .map((g) => ({ label: COLOR_NOUN[g.color], whyWrong: `${sectorsText(g.color, g.count)}. Eine andere Farbe hat ${least ? 'weniger' : 'mehr'} Felder.` }));
  return build(SKILL, stufe, {
    key: `farbe:${least ? 'selten:' : ''}${sectors.join('-')}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(rng, { label: COLOR_NOUN[best.color] }, wrongs),
    hints: ['Zähle die Felder jeder Farbe.', 'Alle Felder sind gleich groß.'],
    steps: [`${groups.map((g) => sectorsText(g.color, g.count)).join(', ')}.`, `${COLOR_NOUN[best.color]} hat die ${least ? 'wenigsten' : 'meisten'} Felder.`],
    praise: 'Du hast die Felder jeder Farbe gezählt.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** AB III on Stufe 2, the other way round: from the sentence to the wheel. */
function radPassend(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u] = rng.sample(COLORS, 2);
  const size = rng.pick([6, 8, 10]);
  const half = size / 2;
  const d = rng.int(1, half - 1);
  const noun = COLOR_NOUN[t];
  const other = COLOR_NOUN[u];
  const wheel = (n: number): Visual => ({ type: 'spinner', sectors: arrangeSectors(rng, [{ color: t, count: n }, { color: u, count: size - n }]) });
  const more = wheel(half + d);
  const fewer = wheel(half - d);
  const equal = wheel(half);
  const want = rng.pick(['eher', 'seltener', 'gleich'] as const);
  const right = want === 'eher' ? more : want === 'seltener' ? fewer : equal;
  const whyOf = (w: Visual) => (w === equal ? `Hier sind gleich viele Felder ${COLOR_WORD[t]} und ${COLOR_WORD[u]}.` : w === more ? `Hier sind mehr Felder ${COLOR_WORD[t]}.` : `Hier sind mehr Felder ${COLOR_WORD[u]}.`);
  const context = `Du drehst das Rad einmal. ${want === 'gleich' ? `${noun} und ${other} kommen gleich oft.` : `${noun} kommt ${want} als ${other}.`}`;
  const prompt = 'Welches Rad passt?';
  const { answer, labels } = pictureChoice(rng, 'Rad', [right, ...[more, fewer, equal].filter((w) => w !== right)].map((visual, i) => ({ visual, ...(i === 0 ? {} : { whyWrong: whyOf(visual) }) })));
  const n = want === 'eher' ? half + d : want === 'seltener' ? half - d : half;
  return build(SKILL, stufe, {
    key: `rad-passt:${t}:${u}:${size}:${d}:${want}`,
    ab,
    context,
    prompt,
    answer,
    hints: ['Zähle bei jedem Rad beide Farben.', 'Alle Felder sind gleich groß.'],
    steps: [`${labels[0]}: ${sectorsText(t, n)}.`, `${labels[0]} passt.`],
    praise: 'Du hast beide Farben bei jedem Rad verglichen.',
    srText: spoken(undefined, context, prompt),
    kmk: KMK,
  });
}

// ─── Stufe 3: Kugeln dazulegen oder herausnehmen ─────────────────────────────

function dazulegen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u, w] = rng.sample(COLORS, 3);
  const goalSicher = rng.chance(0.5);
  const k = rng.int(2, 4);
  const start: Balls = goalSicher ? [{ color: t, count: rng.int(2, 5) }] : [{ color: u, count: rng.int(2, 5) }];
  const noun = COLOR_NOUN[t];
  const goal = goalSicher ? 'sicher' : 'unmöglich';
  const visual = bag(start);
  const prompt = `${noun} soll ${goal} bleiben. Welche Kugeln darfst du dazulegen?`;
  const whySicher = (x: ColorName) => `Dann kann auch ${COLOR_NOUN[x]} kommen. ${noun} ist nicht mehr sicher.`;
  const whyNot = `Dann kann ${noun} kommen. ${noun} ist nicht mehr unmöglich.`;
  const mixed = `1 ${COLOR_ADJ[t]} Kugel und 1 ${COLOR_ADJ[u]} Kugel`;
  const right = goalSicher ? ballsText(t, k) : ballsText(u, k);
  const wrongs: ChoiceOption[] = goalSicher
    ? [
        { label: ballsText(u, k), whyWrong: whySicher(u) },
        { label: ballsText(w, k), whyWrong: whySicher(w) },
        { label: mixed, whyWrong: whySicher(u) },
      ]
    : [
        { label: ballsText(t, k), whyWrong: whyNot },
        { label: mixed, whyWrong: whyNot },
        { label: `1 ${COLOR_ADJ[t]} Kugel und 1 ${COLOR_ADJ[w]} Kugel`, whyWrong: whyNot },
      ];
  return build(SKILL, stufe, {
    key: `dazu:${t}:${u}:${w}:${goal}:${k}:${start[0].count}`,
    ab,
    context: DRAW,
    prompt,
    visual,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: [goalSicher ? 'Sicher heißt: Es kommt immer so.' : 'Unmöglich heißt: Es kann gar nicht kommen.', 'Welche Kugeln ändern das nicht?'],
    steps: [`Im Säckchen ${isBalls(start[0].color, start[0].count)}.`, goalSicher ? `Es dürfen nur ${COLOR_ADJ[t]} Kugeln dazu.` : `Es darf keine ${COLOR_ADJ[t]} Kugel dazu.`, `Du legst ${right} dazu.`],
    praise: 'Du hast das Säckchen genau geprüft.',
    srText: spoken(visual, DRAW, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function aendern(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u] = rng.sample(COLORS, 2);
  const goalSicher = rng.chance(0.5);
  const start: Balls = [{ color: t, count: rng.int(2, 5) }, { color: u, count: rng.int(2, 5) }];
  const noun = COLOR_NOUN[t];
  const goal = goalSicher ? 'sicher' : 'unmöglich';
  const visual = bag(start);
  const prompt = `${noun} soll ${goal} werden. Was machst du?`;
  const allOf = (c: ColorName) => `Alle ${COLOR_ADJ_N[c]} Kugeln herausnehmen`;
  const right = goalSicher ? allOf(u) : allOf(t);
  const wrongs: ChoiceOption[] = goalSicher
    ? [
        { label: `${ballsText(t, 2)} dazulegen`, whyWrong: `Sicher heißt: Es kommt immer so. ${COLOR_NOUN[u]} ist noch im Säckchen.` },
        { label: `1 ${COLOR_ADJ[u]} Kugel herausnehmen`, whyWrong: `Sicher heißt: Es kommt immer so. ${COLOR_NOUN[u]} ist noch im Säckchen.` },
        { label: allOf(t), whyWrong: `Dann ist ${noun} unmöglich.` },
      ]
    : [
        { label: `${ballsText(u, 2)} dazulegen`, whyWrong: `${noun} ist noch im Säckchen. ${noun} kann also kommen.` },
        { label: `1 ${COLOR_ADJ[t]} Kugel herausnehmen`, whyWrong: `${noun} ist noch im Säckchen. ${noun} kann also kommen.` },
        { label: allOf(u), whyWrong: `Dann ist ${noun} sicher.` },
      ];
  return build(SKILL, stufe, {
    key: `aendern:${t}:${u}:${goal}:${start[0].count}:${start[1].count}`,
    ab,
    context: DRAW,
    prompt,
    visual,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: [goalSicher ? 'Sicher heißt: Es kommt immer so.' : 'Unmöglich heißt: Es kann gar nicht kommen.', 'Welche Kugeln stören?'],
    steps: [`Im Säckchen sind ${bagText(start)}.`, goalSicher ? `Es dürfen nur ${COLOR_ADJ[t]} Kugeln bleiben.` : `Es darf keine ${COLOR_ADJ[t]} Kugel bleiben.`, `Du nimmst alle ${COLOR_ADJ_N[goalSicher ? u : t]} Kugeln heraus.`],
    praise: 'Du hast die störenden Kugeln erkannt.',
    srText: spoken(visual, DRAW, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** AB III: how many balls have to come out? */
function wieViele(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u] = rng.sample(COLORS, 2);
  const goalSicher = rng.chance(0.5);
  const [a, b] = rng.sample([2, 3, 4, 5, 6], 2);
  const start: Balls = [{ color: t, count: a }, { color: u, count: b }];
  const noun = COLOR_NOUN[t];
  const goal = goalSicher ? 'sicher' : 'unmöglich';
  const visual = bag(start);
  const prompt = `${noun} soll ${goal} werden. Wie viele Kugeln nimmst du heraus?`;
  const out = goalSicher ? u : t;
  const n = goalSicher ? b : a;
  const kugeln = (x: number) => `${fmt(x)} ${x === 1 ? 'Kugel' : 'Kugeln'}`;
  const why = `Alle ${COLOR_ADJ_N[out]} Kugeln müssen heraus. Wie viele sind das?`;
  return build(SKILL, stufe, {
    key: `wieviele:${t}:${u}:${goal}:${a}:${b}`,
    ab,
    context: DRAW,
    prompt,
    visual,
    answer: makeChoice(rng, { label: kugeln(n) }, [goalSicher ? a : b, a + b, n + 1].map((x) => ({ label: kugeln(x), whyWrong: why }))),
    hints: [goalSicher ? 'Sicher heißt: Es kommt immer so.' : 'Unmöglich heißt: Es kann gar nicht kommen.', 'Welche Kugeln stören? Wie viele sind das?'],
    steps: [`Im Säckchen sind ${bagText(start)}.`, `Alle ${COLOR_ADJ_N[out]} Kugeln müssen heraus.`, `Du nimmst ${kugeln(n)} heraus.`],
    praise: 'Du hast die störenden Kugeln gezählt.',
    srText: spoken(visual, DRAW, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** AB III: a bag of three colours: for sicher, two colours have to go. */
function dreiFarben(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u, w] = rng.sample(COLORS, 3);
  const goalSicher = rng.chance(0.5);
  const start: Balls = [{ color: t, count: rng.int(2, 4) }, { color: u, count: rng.int(2, 4) }, { color: w, count: rng.int(2, 4) }];
  const noun = COLOR_NOUN[t];
  const goal = goalSicher ? 'sicher' : 'unmöglich';
  const visual = bag(start);
  const prompt = `${noun} soll ${goal} werden. Was machst du?`;
  const allOf = (c: ColorName) => `Alle ${COLOR_ADJ_N[c]} Kugeln herausnehmen`;
  const others = `Alle ${COLOR_ADJ_N[u]} und alle ${COLOR_ADJ_N[w]} Kugeln herausnehmen`;
  const right = goalSicher ? others : allOf(t);
  const stays = `${noun} ist noch im Säckchen. ${noun} kann also kommen.`;
  const wrongs: ChoiceOption[] = goalSicher
    ? [
        { label: allOf(u), whyWrong: `${COLOR_NOUN[w]} ist noch im Säckchen. ${COLOR_NOUN[w]} kann auch kommen.` },
        { label: allOf(t), whyWrong: `Dann ist ${noun} unmöglich.` },
        { label: `${ballsText(t, 2)} dazulegen`, whyWrong: 'Sicher heißt: Es kommt immer so. Andere Kugeln sind noch im Säckchen.' },
      ]
    : [
        { label: others, whyWrong: `Dann ist ${noun} sicher.` },
        { label: `1 ${COLOR_ADJ[t]} Kugel herausnehmen`, whyWrong: stays },
        { label: `${ballsText(u, 2)} dazulegen`, whyWrong: stays },
      ];
  return build(SKILL, stufe, {
    key: `drei:${t}:${u}:${w}:${goal}:${start.map((b) => b.count).join('-')}`,
    ab,
    context: DRAW,
    prompt,
    visual,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: [goalSicher ? 'Sicher heißt: Es kommt immer so.' : 'Unmöglich heißt: Es kann gar nicht kommen.', 'Welche Kugeln stören?'],
    steps: ['Im Säckchen sind 3 Farben.', goalSicher ? `Es dürfen nur ${COLOR_ADJ[t]} Kugeln bleiben.` : `Es darf keine ${COLOR_ADJ[t]} Kugel bleiben.`, goalSicher ? `Du nimmst alle ${COLOR_ADJ_N[u]} und alle ${COLOR_ADJ_N[w]} Kugeln heraus.` : `Du nimmst alle ${COLOR_ADJ_N[t]} Kugeln heraus.`],
    praise: 'Du hast an alle 3 Farben gedacht.',
    srText: spoken(visual, DRAW, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** AB III, the other way round: which balls may not go in? */
function nichtDazu(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u, w] = rng.sample(COLORS, 3);
  const goalSicher = rng.chance(0.5);
  const k = rng.int(2, 4);
  const start: Balls = goalSicher ? [{ color: t, count: rng.int(2, 5) }] : [{ color: u, count: rng.int(2, 5) }];
  const noun = COLOR_NOUN[t];
  const goal = goalSicher ? 'sicher' : 'unmöglich';
  const visual = bag(start);
  const prompt = `${noun} soll ${goal} bleiben. Welche Kugeln darfst du nicht dazulegen?`;
  const fine = `${noun} bleibt ${goal}: Diese Kugeln stören nicht.`;
  const right = goalSicher ? ballsText(u, k) : ballsText(t, k);
  const wrongs: ChoiceOption[] = (goalSicher ? [ballsText(t, k), ballsText(t, k + 1), ballsText(t, 1)] : [ballsText(u, k), ballsText(w, k), `1 ${COLOR_ADJ[u]} Kugel und 1 ${COLOR_ADJ[w]} Kugel`]).map((label) => ({ label, whyWrong: fine }));
  return build(SKILL, stufe, {
    key: `nicht-dazu:${t}:${u}:${w}:${goal}:${k}:${start[0].count}`,
    ab,
    context: DRAW,
    prompt,
    visual,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: [goalSicher ? 'Sicher heißt: Es kommt immer so.' : 'Unmöglich heißt: Es kann gar nicht kommen.', 'Welche Kugeln ändern das?'],
    steps: [`Im Säckchen ${isBalls(start[0].color, start[0].count)}.`, goalSicher ? `Es dürfen nur ${COLOR_ADJ[t]} Kugeln dazu.` : `Es darf keine ${COLOR_ADJ[t]} Kugel dazu.`, `${cap(right)} darfst du nicht dazulegen.`],
    praise: 'Du hast das Säckchen genau geprüft.',
    srText: spoken(visual, DRAW, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, Form[]>> = {
  1: { 1: [saeckchenVergleichen], 2: [saeckchenVergleichen], 3: [saeckchenVergleichen, saeckchenPassend] },
  2: { 1: [raederVergleichen], 2: [raederVergleichen, farbeAmRad], 3: [raederVergleichen, farbeAmRad, radPassend] },
  3: { 1: [dazulegen], 2: [aendern], 3: [wieViele, dreiFarben, nichtDazu] },
};

export const chancenSkill: SkillDef = {
  ...SKILL,
  title: 'Wo sind die Chancen größer?',
  description: 'Du vergleichst zwei Säckchen oder Glücksräder.',
  stufen: {
    1: 'Du vergleichst 2 Säckchen mit gleich vielen Kugeln.',
    2: 'Du vergleichst Glücksräder und zählst die Felder.',
    3: 'Du legst Kugeln dazu oder nimmst sie heraus.',
  },
  kmk: KMK,
  optional: 'extra',
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
