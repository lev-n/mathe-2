/**
 * Sicher, möglich, unmöglich. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1, a bag with 1 or 2 colours: AB I which word fits; AB II the same with most balls of one colour, which colour; AB III check a claim.
 * Stufe 2, Würfel, Münze, Glücksrad: AB I a coin, one number on a die, a wheel of 4 Felder; AB II bigger or smaller on a die, a wheel of 6 or 8; AB III
 * which event has this word, which wheel fits, check a claim.
 * Stufe 3, the fitting bag: AB I three plain bags; AB II bags with more colours; AB III two clues. With the extras on also wahrscheinlich and
 * unwahrscheinlich (§6: Bayern and NRW name these words only): AB II which word, AB III which bag.
 * "sicher" is also möglich, in plain language. So wherever möglich is one word among the others or is claimed, the wording says "möglich, aber nicht sicher":
 * exactly one option stays right.
 */
import { fmt } from '../../core/format';
import type { Ab, ChoiceAnswer, ColorName, Exercise, GenContext, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, joinDe, makeChoice, pickPerson, targetAb } from '../shared';
import { COLORS, COLOR_ADJ, COLOR_NOUN, COLOR_WORD, arrangeSectors, bagText, pictureChoice, spoken, type Balls } from './helpers';

const SKILL = { id: 'daten.sicher-moeglich', topicId: 'daten' } as const;
const KMK = ['DZ.zufall'];

export type Klasse = 'sicher' | 'möglich' | 'unmöglich';
const WORDS: readonly Klasse[] = ['sicher', 'möglich', 'unmöglich'];

/** Counting the outcomes: none fit → unmöglich, all fit → sicher, otherwise möglich. */
export function klasse(fit: number, total: number): Klasse {
  if (fit === 0) return 'unmöglich';
  return fit === total ? 'sicher' : 'möglich';
}

/** The word as the task says it: a sure thing is also possible, so möglich alone would fit it too. */
const MEANT: Record<Klasse, string> = { sicher: 'sicher', möglich: 'möglich, aber nicht sicher', unmöglich: 'unmöglich' };

const QUESTION = 'Ist das sicher, möglich oder unmöglich?';
/** Names the draw: alone, 'Rot ist sicher.' can read as 'red is safe'. */
const DRAW = 'Du ziehst 1 Kugel.';

/** Feedback per wrong word. One option per row: 'unmöglich' does not fit in a third of a 375 px phone (T17). */
type Why = Partial<Record<Klasse, string>>;

function klasseChoice(rng: Rng, truth: Klasse, why: Why): ChoiceAnswer {
  return makeChoice(
    rng,
    { label: MEANT[truth] },
    WORDS.filter((w) => w !== truth).map((w) => ({ label: MEANT[w], whyWrong: why[w]! })),
    { order: WORDS.map((w) => MEANT[w]) },
  );
}

/** §5 sicher-haeufig: "sicher" because most of them fit. `others` names the rest: 'Kugeln', 'Felder', 'Zahlen'. */
const hintSicher = (others: string) => `Sicher heißt: Es kommt immer so. Gibt es auch andere ${others}?`;

const twoColors = (rng: Rng) => rng.sample(COLORS, 2) as [ColorName, ColorName];

// ─── Stufe 1: Säckchen ───────────────────────────────────────────────────────

/** A bag for a target colour and a truth. On AB II the target of a möglich bag is the larger group: sicher-haeufig is the trap. */
function bagFor(rng: Rng, target: ColorName, other: ColorName, truth: Klasse, trap: boolean): Balls {
  if (truth === 'sicher') return [{ color: target, count: rng.int(3, 8) }];
  if (truth === 'unmöglich') return [{ color: other, count: rng.int(3, 8) }];
  return trap
    ? [{ color: target, count: rng.int(5, 9) }, { color: other, count: rng.int(1, 2) }]
    : [{ color: target, count: rng.int(2, 4) }, { color: other, count: rng.int(2, 4) }];
}

function kugelEinordnen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [target, other] = twoColors(rng);
  const truth = ab === 2 ? (rng.chance(0.7) ? 'möglich' : rng.pick(WORDS)) : rng.pick(WORDS);
  const balls = bagFor(rng, target, other, truth, ab === 2);
  const visual: Visual = { type: 'bag', balls };
  const context = `${DRAW} Die Kugel ist ${COLOR_WORD[target]}.`;
  const adj = COLOR_ADJ[target];
  const why: Why = {
    sicher: hintSicher('Kugeln'),
    möglich: truth === 'sicher' ? `Alle Kugeln sind ${COLOR_WORD[target]}. Es kommt immer so.` : `Im Säckchen ist keine Kugel ${COLOR_WORD[target]}.`,
    unmöglich: `Im Säckchen sind ${adj} Kugeln. ${COLOR_NOUN[target]} kann also kommen.`,
  };
  if (truth === 'unmöglich') why.sicher = `Im Säckchen ist keine Kugel ${COLOR_WORD[target]}.`;
  const last: Record<Klasse, string> = {
    sicher: `Alle Kugeln sind ${COLOR_WORD[target]}. Das ist sicher.`,
    möglich: `${COLOR_NOUN[target]} kann kommen, muss aber nicht.`,
    unmöglich: `Keine Kugel ist ${COLOR_WORD[target]}. Das ist unmöglich.`,
  };
  const praise: Record<Klasse, string> = {
    sicher: `Du hast geprüft: Alle Kugeln sind ${COLOR_WORD[target]}.`,
    möglich: 'Du hast auf beide Farben geachtet.',
    unmöglich: `Du hast geprüft: Keine Kugel ist ${COLOR_WORD[target]}.`,
  };
  return build(SKILL, stufe, {
    key: `kugel:${target}:${balls.map((b) => `${b.color}${b.count}`).join('-')}`,
    ab,
    context,
    prompt: QUESTION,
    visual,
    answer: klasseChoice(rng, truth, why),
    hints: ['Schau alle Kugeln im Säckchen an.', `Gibt es ${adj} Kugeln? Gibt es auch andere Kugeln?`],
    steps: [`Im Säckchen sind ${bagText(balls)}.`, last[truth]],
    praise: praise[truth],
    srText: spoken(visual, context, QUESTION),
    kmk: KMK,
  });
}

function farbeWaehlen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b, c] = rng.sample(COLORS, 3);
  const one = rng.chance(0.4);
  const balls: Balls = one ? [{ color: a, count: rng.int(3, 8) }] : [{ color: a, count: rng.int(1, 6) }, { color: b, count: rng.int(1, 6) }];
  const visual: Visual = { type: 'bag', balls };
  const context = 'Du ziehst 1 Kugel aus dem Säckchen.';
  const prompt = one ? 'Welche Farbe ist sicher?' : 'Welche Farbe ist unmöglich?';
  const right = one ? a : c;
  const wrong = one
    ? [b, c].map((x) => ({ label: COLOR_NOUN[x], whyWrong: `Im Säckchen ist keine Kugel ${COLOR_WORD[x]}.` }))
    : [a, b].map((x) => ({ label: COLOR_NOUN[x], whyWrong: `Im Säckchen sind ${COLOR_ADJ[x]} Kugeln. ${COLOR_NOUN[x]} kann also kommen.` }));
  return build(SKILL, stufe, {
    key: `farbe:${balls.map((x) => `${x.color}${x.count}`).join('-')}:${right}`,
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: COLOR_NOUN[right] }, wrong),
    hints: ['Schau alle Kugeln im Säckchen an.', one ? 'Sicher heißt: Es kommt immer so.' : 'Unmöglich heißt: Es kann gar nicht kommen.'],
    steps: [`Im Säckchen sind ${bagText(balls)}.`, one ? `Alle Kugeln sind ${COLOR_WORD[a]}. ${COLOR_NOUN[a]} ist sicher.` : `Keine Kugel ist ${COLOR_WORD[c]}. ${COLOR_NOUN[c]} ist unmöglich.`],
    praise: 'Du hast alle Kugeln im Säckchen angeschaut.',
    srText: spoken(visual, context, prompt),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: a claim about a bag with 1 or 2 colours. */
function aussagePruefen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u] = twoColors(rng);
  const { name } = pickPerson(rng);
  const claim = rng.pick<Klasse>(['sicher', 'sicher', 'unmöglich', 'möglich']);
  const shape = rng.int(0, 2);
  const balls: Balls = shape === 0 ? [{ color: t, count: rng.int(4, 9) }] : shape === 1 ? [{ color: t, count: rng.int(6, 9) }, { color: u, count: rng.int(1, 2) }] : [{ color: u, count: rng.int(4, 9) }];
  const fit = balls.find((b) => b.color === t)?.count ?? 0;
  const truth = klasse(fit, balls.reduce((a, b) => a + b.count, 0));
  const holds = truth === claim;
  const visual: Visual = { type: 'bag', balls };
  const context = `${DRAW} ${name} sagt: ${COLOR_NOUN[t]} ist ${MEANT[claim]}.`;
  const prompt = 'Stimmt das?';
  const means: Record<Klasse, string> = {
    sicher: `Alle Kugeln sind ${COLOR_WORD[t]}. Das ist sicher.`,
    möglich: `${COLOR_NOUN[t]} kann kommen, muss aber nicht.`,
    unmöglich: `Keine Kugel ist ${COLOR_WORD[t]}. Das ist unmöglich.`,
  };
  const yes = 'Ja, das stimmt.';
  const no = 'Nein, das stimmt nicht.';
  return build(SKILL, stufe, {
    key: `aussage:${name}:${t}:${claim}:${balls.map((b) => `${b.color}${b.count}`).join('-')}`,
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: holds ? yes : no }, [{ label: holds ? no : yes, whyWrong: holds ? means[truth] : claim === 'sicher' ? hintSicher('Kugeln') : means[truth] }], { order: [yes, no] }),
    hints: [claim === 'sicher' ? 'Sicher heißt: Es kommt immer so.' : claim === 'unmöglich' ? 'Unmöglich heißt: Es kann gar nicht kommen.' : 'Möglich heißt: Es kann kommen, muss aber nicht.', 'Schau alle Kugeln an. Gibt es auch andere Kugeln?'],
    steps: [`Im Säckchen sind ${bagText(balls)}.`, means[truth], holds ? 'Der Satz stimmt.' : 'Der Satz stimmt nicht.'],
    praise: truth === 'möglich' ? 'Du hast auch die wenigen Kugeln beachtet.' : 'Du hast alle Kugeln geprüft.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 2: Würfel, Münze, Glücksrad ───────────────────────────────────────

interface DiceEvent {
  id: string;
  text: string;
  fits(v: number): boolean;
  /** Says what the word means. An event with this is an optional concept (§6: gerade is opt, NRW does not name it), so extras only. */
  explain?: string;
}

export const DIE = [1, 2, 3, 4, 5, 6];

export const DICE_EVENTS: readonly DiceEvent[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((k) => ({ id: `gleich${k}`, text: `Die Zahl ist ${k}.`, fits: (v: number) => v === k })),
  { id: 'kleiner7', text: 'Die Zahl ist kleiner als 7.', fits: (v) => v < 7 },
  { id: 'groesser0', text: 'Die Zahl ist größer als 0.', fits: (v) => v > 0 },
  { id: 'groesser6', text: 'Die Zahl ist größer als 6.', fits: (v) => v > 6 },
  { id: 'kleiner1', text: 'Die Zahl ist kleiner als 1.', fits: (v) => v < 1 },
  { id: 'groesser3', text: 'Die Zahl ist größer als 3.', fits: (v) => v > 3 },
  { id: 'kleiner4', text: 'Die Zahl ist kleiner als 4.', fits: (v) => v < 4 },
  { id: 'gerade', text: 'Die Zahl ist gerade.', fits: (v) => v % 2 === 0, explain: 'Gerade Zahlen sind 2, 4, 6 und so weiter.' },
];

export const diceKlasse = (e: DiceEvent) => klasse(DIE.filter((v) => e.fits(v)).length, DIE.length);

/** One number on the die: the direct form. */
const isOneNumber = (e: DiceEvent) => e.id.startsWith('gleich');

/** AB I: one number; AB II: bigger, smaller, and with the extras on gerade. */
function wuerfel(rng: Rng, stufe: Stufe, ab: Ab, ctx: GenContext): Exercise {
  const pool = DICE_EVENTS.filter((e) => isOneNumber(e) === (ab === 1) && (ctx.extras || !e.explain));
  const truth = rng.pick(WORDS.filter((w) => pool.some((e) => diceKlasse(e) === w)));
  const event = rng.pick(pool.filter((e) => diceKlasse(e) === truth));
  const fit = DIE.filter((v) => event.fits(v));
  const visual: Visual = { type: 'dice', values: DIE };
  const context = `Du würfelst einmal. ${event.text}`;
  const passt =
    fit.length === 0 ? 'Keine Seite des Würfels passt.' : fit.length === 6 ? 'Alle 6 Seiten des Würfels passen.' : `Es passt: ${joinDe(fit.map(String))}. Die anderen Seiten passen nicht.`;
  const why: Why = {
    sicher: truth === 'möglich' ? hintSicher('Zahlen') : 'Keine Seite des Würfels passt dazu.',
    möglich: truth === 'sicher' ? 'Alle Seiten des Würfels passen. Es kommt immer so.' : 'Keine Seite des Würfels passt dazu.',
    unmöglich: 'Schau auf die Seiten des Würfels. Mindestens eine Seite passt.',
  };
  return build(SKILL, stufe, {
    key: `wuerfel:${event.id}`,
    ab,
    context,
    prompt: QUESTION,
    visual,
    answer: klasseChoice(rng, truth, why),
    hints: ['Der Würfel hat die Zahlen 1 bis 6.', event.explain ?? 'Prüfe jede Seite: Passt die Seite?'],
    steps: ['Der Würfel hat die Zahlen 1 bis 6.', passt, `Das ist ${MEANT[truth]}.`],
    praise: 'Du hast jede Seite des Würfels geprüft.',
    srText: spoken(visual, context, QUESTION),
    kmk: KMK,
  });
}

interface CoinEvent {
  id: string;
  text: string;
  truth: Klasse;
}

const COIN_EVENTS: readonly CoinEvent[] = [
  { id: 'kopf', text: 'Die Münze zeigt Kopf.', truth: 'möglich' },
  { id: 'zahl', text: 'Die Münze zeigt Zahl.', truth: 'möglich' },
  { id: 'beides', text: 'Die Münze zeigt Kopf oder Zahl.', truth: 'sicher' },
  { id: 'stern', text: 'Die Münze zeigt einen Stern.', truth: 'unmöglich' },
  { id: 'blume', text: 'Die Münze zeigt eine Blume.', truth: 'unmöglich' },
];

function muenze(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const event = rng.pick(COIN_EVENTS);
  const { truth } = event;
  const context = `Du wirfst eine Münze. ${event.text}`;
  const why: Why = {
    sicher: truth === 'möglich' ? hintSicher('Seiten') : 'Die Münze hat nur Kopf und Zahl.',
    möglich: truth === 'sicher' ? 'Mehr Seiten hat die Münze nicht. Es kommt immer so.' : 'Die Münze hat nur Kopf und Zahl.',
    unmöglich: 'Die Münze hat Kopf und Zahl. Das kann also kommen.',
  };
  return build(SKILL, stufe, {
    key: `muenze:${event.id}`,
    ab,
    context,
    prompt: QUESTION,
    answer: klasseChoice(rng, truth, why),
    hints: ['Die Münze hat 2 Seiten: Kopf und Zahl.', 'Prüfe jede Seite: Passt die Seite?'],
    steps: ['Die Münze hat 2 Seiten: Kopf und Zahl.', `Das ist ${MEANT[truth]}.`],
    praise: 'Du hast an beide Seiten der Münze gedacht.',
    srText: spoken(undefined, context, QUESTION),
    kmk: KMK,
  });
}

/** AB I a wheel of 4 Felder, AB II of 6 or 8. */
function rad(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const truth = rng.pick(WORDS);
  const [t, u, w] = rng.sample(COLORS, 3);
  const size = ab === 1 ? 4 : rng.pick([6, 8]);
  // sicher: only the colours named. möglich: the target beside other colours. unmöglich: the target is missing.
  const both = truth === 'sicher' && rng.chance(0.5);
  const groups =
    truth === 'unmöglich'
      ? [{ color: u, count: size / 2 }, { color: w, count: size / 2 }]
      : truth === 'sicher'
        ? both
          ? [{ color: t, count: size / 2 }, { color: u, count: size / 2 }]
          : [{ color: t, count: size }]
        : [{ color: t, count: size - 1 - (size > 4 ? 1 : 0) }, { color: u, count: 1 + (size > 4 ? 1 : 0) }];
  const sectors = arrangeSectors(rng, groups);
  const visual: Visual = { type: 'spinner', sectors };
  const event = both ? `Das Rad bleibt auf ${COLOR_NOUN[t]} oder ${COLOR_NOUN[u]} stehen.` : `Das Rad bleibt auf ${COLOR_NOUN[t]} stehen.`;
  const context = `Du drehst das Rad einmal. ${event}`;
  const why: Why = {
    sicher: truth === 'möglich' ? hintSicher('Felder') : `Auf dem Rad ist kein Feld ${COLOR_WORD[t]}.`,
    möglich: truth === 'sicher' ? 'Jedes Feld passt dazu. Es kommt immer so.' : `Auf dem Rad ist kein Feld ${COLOR_WORD[t]}.`,
    unmöglich: `Auf dem Rad sind Felder ${COLOR_WORD[t]}. Das kann also kommen.`,
  };
  const last: Record<Klasse, string> = {
    sicher: 'Jedes Feld passt. Das ist sicher.',
    möglich: 'Einige Felder passen, andere nicht. Es kann kommen, muss aber nicht.',
    unmöglich: 'Kein Feld passt. Das ist unmöglich.',
  };
  return build(SKILL, stufe, {
    key: `rad:${t}:${both ? u : ''}:${sectors.join('-')}`,
    ab,
    context,
    prompt: QUESTION,
    visual,
    answer: klasseChoice(rng, truth, why),
    hints: ['Schau alle Felder auf dem Rad an.', 'Prüfe jedes Feld: Passt das Feld?'],
    steps: [`Das Rad hat ${fmt(size)} gleich große Felder.`, last[truth]],
    praise: 'Du hast jedes Feld auf dem Rad geprüft.',
    srText: spoken(visual, context, QUESTION),
    kmk: KMK,
  });
}

/** Stufe 2, AB III, the other way round: from the word to the event. */
function wuerfelWahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const want = rng.pick(WORDS);
  const plain = DICE_EVENTS.filter((e) => !e.explain);
  const pick = (w: Klasse) => rng.pick(plain.filter((e) => diceKlasse(e) === w));
  const right = pick(want);
  const others = WORDS.filter((w) => w !== want).map((w) => ({ word: w, event: pick(w) }));
  const visual: Visual = { type: 'dice', values: DIE };
  const context = 'Du würfelst einmal.';
  const prompt = `Was ist ${MEANT[want]}?`;
  return build(SKILL, stufe, {
    key: `wuerfel-wahl:${want}:${right.id}:${others.map((o) => o.event.id).join('-')}`,
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: right.text }, others.map((o) => ({ label: o.event.text, whyWrong: `Das ist ${o.word}. Gefragt ist: ${MEANT[want]}.` }))),
    hints: ['Der Würfel hat die Zahlen 1 bis 6.', 'Prüfe jeden Satz mit allen Zahlen.'],
    steps: ['Der Würfel hat die Zahlen 1 bis 6.', `${right.text} Das ist ${MEANT[want]}.`],
    praise: 'Du hast jeden Satz mit allen Zahlen geprüft.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 2, AB III, the other way round: from the word to the wheel. */
function radWahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u, w] = rng.sample(COLORS, 3);
  const want = rng.pick(WORDS);
  const size = rng.pick([4, 6, 8]);
  const noun = COLOR_NOUN[t];
  const wheels: Record<Klasse, ColorName[]> = {
    sicher: arrangeSectors(rng, [{ color: t, count: size }]),
    möglich: arrangeSectors(rng, [{ color: t, count: size - 2 }, { color: u, count: 2 }]),
    unmöglich: arrangeSectors(rng, [{ color: u, count: size / 2 }, { color: w, count: size / 2 }]),
  };
  const context = `Du drehst das Rad einmal. ${noun} ist ${MEANT[want]}.`;
  const prompt = 'Welches Rad passt?';
  const why: Record<Klasse, string> = {
    sicher: `Hier kommt immer ${noun}. Das ist sicher.`,
    möglich: `Hier sind auch andere Felder. ${noun} kommt nicht immer.`,
    unmöglich: `Hier ist kein Feld ${COLOR_WORD[t]}. Das ist unmöglich.`,
  };
  const { answer, labels } = pictureChoice(
    rng,
    'Rad',
    WORDS.map((k) => ({ visual: { type: 'spinner', sectors: wheels[k] } as Visual, ...(k === want ? {} : { whyWrong: why[k] }) })),
  );
  const meaning: Record<Klasse, string> = {
    sicher: `Sicher heißt: Alle Felder sind ${COLOR_WORD[t]}.`,
    möglich: `Möglich heißt: Einige Felder sind ${COLOR_WORD[t]}, andere nicht.`,
    unmöglich: `Unmöglich heißt: Kein Feld ist ${COLOR_WORD[t]}.`,
  };
  return build(SKILL, stufe, {
    key: `rad-wahl:${t}:${want}:${WORDS.map((k) => wheels[k].join('-')).join(':')}`,
    ab,
    context,
    prompt,
    answer,
    hints: ['Schau jedes Rad an.', `Sind alle, einige oder keine Felder ${COLOR_WORD[t]}?`],
    steps: [meaning[want], `${labels[WORDS.indexOf(want)]} passt.`],
    praise: 'Du hast jedes Rad genau geprüft.',
    srText: spoken(undefined, context, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 2, AB III: a claim about a roll of the die. */
function wuerfelAussage(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const event = rng.pick(DICE_EVENTS.filter((e) => !e.explain));
  const truth = diceKlasse(event);
  const claim = rng.chance(0.5) ? truth : rng.pick(WORDS.filter((w) => w !== truth));
  const holds = truth === claim;
  const { name } = pickPerson(rng);
  const visual: Visual = { type: 'dice', values: DIE };
  const context = `Du würfelst einmal: ${event.text} ${name} sagt: Das ist ${MEANT[claim]}.`;
  const prompt = 'Stimmt das?';
  const yes = 'Ja, das stimmt.';
  const no = 'Nein, das stimmt nicht.';
  const fit = DIE.filter((v) => event.fits(v));
  const passt = fit.length === 0 ? 'Keine Seite des Würfels passt.' : fit.length === 6 ? 'Alle 6 Seiten des Würfels passen.' : `Es passt: ${joinDe(fit.map(String))}. Die anderen Seiten passen nicht.`;
  return build(SKILL, stufe, {
    key: `wuerfel-aussage:${event.id}:${claim}`,
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: holds ? yes : no }, [{ label: holds ? no : yes, whyWrong: `Das ist ${MEANT[truth]}. Prüfe jede Seite des Würfels.` }], { order: [yes, no] }),
    hints: ['Der Würfel hat die Zahlen 1 bis 6.', 'Prüfe jede Seite: Passt die Seite?'],
    steps: ['Der Würfel hat die Zahlen 1 bis 6.', passt, holds ? 'Der Satz stimmt.' : 'Der Satz stimmt nicht.'],
    praise: 'Du hast jede Seite des Würfels geprüft.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** Three bags for a colour: all of it, some of it, none of it. On AB II and above the other balls may have two colours. */
function threeBags(rng: Rng, mixed: boolean, t: ColorName): Record<Klasse, Balls> {
  const [u, w] = rng.sample(COLORS.filter((c) => c !== t), 2);
  const rest = (count: number): Balls =>
    mixed && count >= 2 ? [{ color: u, count: count - 1 }, { color: w, count: 1 }] : [{ color: u, count }];
  return {
    sicher: [{ color: t, count: rng.int(3, 6) }],
    möglich: [{ color: t, count: rng.int(2, 6) }, ...rest(rng.int(1, 3))],
    unmöglich: rest(rng.int(3, 6)),
  };
}

function saeckchenWaehlen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const t = rng.pick(COLORS);
  const want = rng.pick(WORDS);
  const bags = threeBags(rng, ab > 1, t);
  const noun = COLOR_NOUN[t];
  const word = COLOR_WORD[t];
  const prompt = `${noun} ist ${MEANT[want]}. Welches Säckchen passt?`;
  const whyBag: Record<Klasse, string> = {
    sicher: `Hier kommt immer ${noun}. Das ist sicher.`,
    möglich: want === 'sicher' ? `Hier sind auch andere Kugeln. ${noun} kommt nicht immer.` : `Hier ist auch ${noun} dabei. ${noun} kann also kommen.`,
    unmöglich: `Hier ist keine Kugel ${word}. Das ist unmöglich.`,
  };
  const { answer, labels } = pictureChoice(
    rng,
    'Säckchen',
    WORDS.map((k) => ({ visual: { type: 'bag', balls: bags[k] } as Visual, ...(k === want ? {} : { whyWrong: whyBag[k] }) })),
  );
  const steps: Record<Klasse, string> = {
    sicher: `Sicher heißt: Alle Kugeln sind ${word}.`,
    möglich: `Möglich heißt: Einige Kugeln sind ${word}, andere nicht.`,
    unmöglich: `Unmöglich heißt: Keine Kugel ist ${word}.`,
  };
  return build(SKILL, stufe, {
    key: `saeckchen:${t}:${want}:${WORDS.map((k) => bags[k].map((b) => `${b.color}${b.count}`).join('+')).join('-')}`,
    ab,
    context: DRAW,
    prompt,
    answer,
    hints: ['Schau in jedes Säckchen.', `Sind alle, einige oder keine Kugeln ${word}?`],
    steps: [steps[want], `${labels[WORDS.indexOf(want)]}: ${bagText(bags[want])}.`, `${labels[WORDS.indexOf(want)]} passt.`],
    praise: 'Du hast in jedes Säckchen geschaut.',
    srText: spoken(undefined, DRAW, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** AB III: two clues about two colours. */
function zweiHinweise(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u, w] = rng.sample(COLORS, 3);
  const [ta, ua, wa] = [rng.int(2, 5), rng.int(2, 5), rng.int(2, 5)];
  const noun = COLOR_NOUN[t];
  const not = COLOR_NOUN[u];
  const bags: { balls: Balls; why?: string }[] = [
    { balls: [{ color: t, count: ta }, { color: w, count: wa }] },
    { balls: [{ color: t, count: ta }, { color: u, count: ua }], why: `Hier kann auch ${not} kommen. ${not} soll unmöglich sein.` },
    { balls: [{ color: u, count: ua }, { color: w, count: wa }], why: `Hier ist keine Kugel ${COLOR_WORD[t]}. ${noun} soll möglich sein.` },
    { balls: [{ color: t, count: ta + wa }], why: `Hier kommt immer ${noun}. Das ist sicher.` },
  ];
  const context = `Du ziehst 1 Kugel: ${noun} ist ${MEANT.möglich}. ${not} ist unmöglich.`;
  const prompt = 'Welches Säckchen passt?';
  const { answer, labels } = pictureChoice(rng, 'Säckchen', bags.map((b) => ({ visual: { type: 'bag', balls: b.balls } as Visual, ...(b.why ? { whyWrong: b.why } : {}) })));
  return build(SKILL, stufe, {
    key: `hinweise:${t}:${u}:${w}:${ta}:${ua}:${wa}`,
    ab,
    context,
    prompt,
    answer,
    hints: ['Prüfe jedes Säckchen mit der ersten Farbe.', 'Prüfe dann mit der zweiten Farbe.'],
    steps: [`Es muss ${COLOR_ADJ[t]} Kugeln geben, und auch andere.`, `Es darf keine ${COLOR_ADJ[u]} Kugel geben.`, `${labels[0]} passt: ${bagText(bags[0].balls)}.`],
    praise: 'Du hast beide Hinweise geprüft.',
    srText: spoken(undefined, context, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** BY and NRW only (§6), so with the extras on and on Stufe 3. Both colours stay possible: the larger group decides. */
function wahrscheinlich(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u] = twoColors(rng);
  const many = rng.chance(0.5);
  const [big, small] = [rng.int(7, 9), rng.int(1, 2)];
  const balls: Balls = [{ color: t, count: many ? big : small }, { color: u, count: many ? small : big }];
  const visual: Visual = { type: 'bag', balls };
  const context = `${DRAW} Die Kugel ist ${COLOR_WORD[t]}.`;
  const prompt = 'Ist das wahrscheinlich oder unwahrscheinlich?';
  const options = ['wahrscheinlich', 'unwahrscheinlich'];
  const right = many ? 'wahrscheinlich' : 'unwahrscheinlich';
  const mine = many ? big : small;
  const theirs = many ? small : big;
  return build(SKILL, stufe, {
    key: `wahrscheinlich:${t}:${u}:${big}:${small}:${many}`,
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: right },
      [{ label: many ? 'unwahrscheinlich' : 'wahrscheinlich', whyWrong: many ? `Die meisten Kugeln sind ${COLOR_WORD[t]}.` : `Nur wenige Kugeln sind ${COLOR_WORD[t]}.` }],
      { order: options },
    ),
    hints: ['Von welcher Farbe gibt es mehr Kugeln?', 'Die Farbe mit mehr Kugeln kommt eher.'],
    steps: [`Im Säckchen sind ${bagText(balls)}.`, `${mine} ist ${many ? 'mehr' : 'weniger'} als ${theirs}.`, `${COLOR_NOUN[t]} ist ${right}.`],
    praise: 'Du hast die Kugeln beider Farben verglichen.',
    srText: spoken(visual, context, prompt),
    kmk: KMK,
  });
}

/** BY and NRW only (§6), AB III: from the word to the bag. */
function wahrscheinlichWahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, u] = twoColors(rng);
  const many = rng.chance(0.5);
  const [big, small] = [rng.int(7, 9), rng.int(1, 2)];
  const word = many ? 'wahrscheinlich' : 'unwahrscheinlich';
  const noun = COLOR_NOUN[t];
  const withMany: Balls = [{ color: t, count: big }, { color: u, count: small }];
  const withFew: Balls = [{ color: t, count: small }, { color: u, count: big }];
  const none: Balls = [{ color: u, count: big }];
  const bags: { balls: Balls; why?: string }[] = [
    { balls: many ? withMany : withFew },
    { balls: many ? withFew : withMany, why: many ? `Hier sind nur wenige Kugeln ${COLOR_WORD[t]}.` : `Hier sind die meisten Kugeln ${COLOR_WORD[t]}.` },
    { balls: none, why: `Hier ist keine Kugel ${COLOR_WORD[t]}. Das ist unmöglich.` },
  ];
  const prompt = `${noun} ist ${word}. Welches Säckchen passt?`;
  const { answer, labels } = pictureChoice(rng, 'Säckchen', bags.map((b) => ({ visual: { type: 'bag', balls: b.balls } as Visual, ...(b.why ? { whyWrong: b.why } : {}) })));
  return build(SKILL, stufe, {
    key: `wahrscheinlich-wahl:${t}:${u}:${big}:${small}:${many}`,
    ab,
    context: DRAW,
    prompt,
    answer,
    hints: ['Von welcher Farbe gibt es mehr Kugeln?', 'Die Farbe mit mehr Kugeln kommt eher.'],
    steps: [`${many ? 'Die meisten' : 'Nur wenige'} Kugeln müssen ${COLOR_WORD[t]} sein.`, `${labels[0]} passt: ${bagText(bags[0].balls)}.`],
    praise: 'Du hast die Kugeln beider Farben verglichen.',
    srText: spoken(undefined, DRAW, prompt),
    kmk: KMK,
  });
}

function stufe3(rng: Rng, stufe: Stufe, ab: Ab, ctx: GenContext): Exercise {
  const plain = ab === 3 ? zweiHinweise : saeckchenWaehlen;
  const extra = ab === 3 ? wahrscheinlichWahl : wahrscheinlich;
  return (ctx.extras && ab > 1 && rng.chance(0.35) ? extra : plain)(rng, stufe, ab);
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab, ctx: GenContext) => Exercise;

const FORMS: Record<1 | 2, Record<Ab, Form[]>> = {
  1: { 1: [kugelEinordnen], 2: [kugelEinordnen, kugelEinordnen, farbeWaehlen], 3: [aussagePruefen] },
  2: { 1: [muenze, wuerfel, rad], 2: [wuerfel, rad], 3: [wuerfelWahl, radWahl, wuerfelAussage] },
};

export const sicherMoeglichSkill: SkillDef = {
  ...SKILL,
  title: 'Sicher, möglich, unmöglich',
  description: 'Du sagst, ob etwas sicher, möglich oder unmöglich ist.',
  stufen: {
    1: 'Du ziehst aus einem Säckchen mit 1 oder 2 Farben.',
    2: 'Du würfelst, wirfst eine Münze oder drehst ein Rad.',
    3: 'Du wählst das passende Säckchen. Mit Extras: wahrscheinlich und unwahrscheinlich.',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return stufe === 3 ? stufe3(rng, stufe, ab, ctx) : rng.pick(FORMS[stufe as 1 | 2][ab])(rng, stufe, ab, ctx);
  },
};
