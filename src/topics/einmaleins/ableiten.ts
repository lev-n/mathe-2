/**
 * Aufgaben ableiten. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 *
 *        AB I                        AB II                               AB III
 * S1     one more, with a field      one less; both tasks in turn        □ · 4 + 4 = 6 · 4; which easy task helps
 * S2     9 · b, 4 · b, with a field  6 · b and 8 · b from half; no       from one hard task to another; which easy task helps
 *                                    field
 * S3     split shown: 3 fields       the split has a gap; choose a way   from the split to the task; choose a way for 7, 8
 *
 * These tasks show the easy task or are about the way there, so they carry no factKey: other facts appear only as derivation tasks (§7.1).
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX, MINUS } from '../../core/format';
import type { Ab, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, multiBugs, targetAb, type ExerciseBody } from '../shared';
import { mal, malWort, sr } from './helpers';

const META = { id: 'einmaleins.ableiten', topicId: 'einmaleins' } as const;
const KMK = ['ZO.kernaufgaben', 'ZO.strategien'];

/** The second numbers: outside the Kern factors, so the task really needs the route. */
const B_NUMBERS: readonly number[] = [3, 4, 6, 7, 8, 9];

/** Hard task and its easy neighbour: one group more, and one group less. */
const EINE_MEHR: readonly [target: number, easy: number][] = [[3, 2], [6, 5]];
const EINE_WENIGER: readonly [target: number, easy: number][] = [[4, 5]];

const split = (rows: number, after: number, cols: number): Visual => ({ type: 'dotArray', rows, cols, splitAfterRow: after });

function nachbarBugs(target: number, easy: number, b: number) {
  const known = easy * b;
  const plus = target > easy;
  return bugList(target * b, [
    ['nachbar-vergessen', known, `${mal(easy, b)} sind ${known}. Bei ${mal(target, b)} ist es eine ${b} ${plus ? 'mehr' : 'weniger'}.`],
    ['nur-eins', plus ? known + 1 : known - 1, `Es ändert sich nicht nur um 1, sondern um eine ganze ${b}.`],
    ['falsche-zahl', plus ? known + target : known - target, `Es geht um eine ganze ${b}, nicht um die ${target}.`],
  ]);
}

function nachbarRechnen(target: number, easy: number, b: number, ab: Ab): ExerciseBody {
  const known = easy * b;
  const plus = target > easy;
  const v = target * b;
  const prompt = `Du weißt: ${mal(easy, b)} = ${known}. Wie viel ist ${mal(target, b)}?`;
  const sign = plus ? '+' : MINUS;
  return {
    key: `nachbar:${easy}-${target}x${b}`,
    ab,
    prompt,
    visual: split(Math.max(target, easy), Math.min(target, easy), b),
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`${mal(target, b)} ist eine ${b} ${plus ? 'mehr' : 'weniger'} als ${mal(easy, b)}.`, `Rechne von ${known} aus ${plus ? 'weiter' : 'zurück'}.`],
    steps: [`${mal(easy, b)} = ${known}`, `${plus ? `Dazu kommt eine ${b}` : `Eine ${b} geht weg`}.`, `${mal(target, b)} = ${known} ${sign} ${b} = ${v}`],
    bugs: nachbarBugs(target, easy, b),
    praise: `Du hast ${mal(easy, b)} als Hilfe genutzt.`,
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** 6 · 4 = □ · 4 + 4: which easy task is it? A gap in the '+ 4' would stand in the task already. */
function nachbarLuecke(target: number, easy: number, b: number, ab: Ab): ExerciseBody {
  const plus = target > easy;
  const sign = plus ? '+' : MINUS;
  const expression = `${mal(target, b)} = ${BOX} · ${b} ${sign} ${b}`;
  return {
    key: `luecke:${easy}-${target}x${b}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: easy, label: 'Zahl in der Lücke' },
    hints: [`Rechts kommt noch eine ${b} ${plus ? 'dazu' : 'weg'}.`, `Am Ende sind es ${target} Reihen. Wie viele sind es am Anfang?`],
    steps: [`${mal(target, b)} hat eine Reihe ${plus ? 'mehr' : 'weniger'} als ${mal(easy, b)}.`, { text: `${mal(target, b)} = ${mal(easy, b)} ${sign} ${b}`, visual: split(Math.max(target, easy), Math.min(target, easy), b) }, `In die Lücke gehört ${easy}.`],
    bugs: bugList(easy, [
      ['falsche-zahl', target, `Die ${target} steht links. Rechts kommt noch eine ${b} ${plus ? 'dazu' : 'weg'}.`],
      ['falsche-zahl', b, `Die ${b} steht schon rechts. Gesucht ist die Zahl der Reihen.`],
    ]),
    praise: 'Du hast die leichte Aufgabe gefunden.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk: KMK,
  };
}

/** Which easy task helps? */
function hilfeWaehlen(rng: Rng, target: number, easy: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = `Welche leichte Aufgabe hilft bei ${mal(target, b)}?`;
  // 2 · b would help with 4 · b too, by doubling: it is no wrong option.
  const far = [1, 2, 5, 10].filter((x) => x !== easy && Math.abs(x - target) > Math.abs(easy - target) && !(target === 4 && x === 2));
  return {
    key: `hilfe:${easy}-${target}x${b}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: mal(easy, b) },
      [
        ...rng.shuffle(far).map((x) => ({ label: mal(x, b), whyWrong: `${mal(x, b)} liegt weiter weg von ${mal(target, b)}.` })),
        { label: `${target} + ${b}`, whyWrong: `${mal(target, b)} heißt ${target}-mal die ${b}.` },
      ].slice(0, 3),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Eine leichte Aufgabe hat 2, 5 oder 10.', `Welche liegt am nächsten an ${target}?`],
    steps: [`${target} liegt nah an ${easy}.`, `Die leichte Aufgabe ist ${mal(easy, b)}.`],
    praise: 'Du hast die passende leichte Aufgabe gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Both tasks to fill in: first the easy one, then the hard one. */
function nachbarZweiFelder(target: number, easy: number, b: number, ab: Ab): ExerciseBody {
  const known = easy * b;
  const v = target * b;
  const plus = target > easy;
  const fields: MultiField[] = [
    { id: 'leicht', value: known, before: `${mal(easy, b)} =`, label: 'Leichte Aufgabe' },
    { id: 'schwer', value: v, before: `${mal(target, b)} =`, label: 'Schwere Aufgabe' },
  ];
  const sign = plus ? '+' : MINUS;
  return {
    key: `zwei:${easy}-${target}x${b}`,
    ab,
    prompt: 'Rechne zuerst die leichte Aufgabe, dann die schwere.',
    answer: { kind: 'multi', fields },
    hints: [`Die leichte Aufgabe ist ${mal(easy, b)}.`, `Bei ${mal(target, b)} ist es eine ${b} ${plus ? 'mehr' : 'weniger'}.`],
    steps: [`${mal(easy, b)} = ${known}`, `${plus ? `Dazu kommt eine ${b}` : `Eine ${b} geht weg`}.`, `${mal(target, b)} = ${known} ${sign} ${b} = ${v}`],
    bugs: multiBugs(
      [
        { id: 'nachbar-vergessen', match: { leicht: known, schwer: known }, hint: `Bei ${mal(target, b)} ist es eine ${b} ${plus ? 'mehr' : 'weniger'}.` },
        { id: 'nur-eins', match: { leicht: known, schwer: plus ? known + 1 : known - 1 }, hint: `Es ändert sich nicht nur um 1, sondern um eine ganze ${b}.` },
      ],
      fields,
    ),
    praise: 'Du hast die leichte Aufgabe als Hilfe genutzt.',
    srText: sr('Rechne zuerst die leichte Aufgabe, dann die schwere.', `${mal(easy, b)} = ${BOX}.`, `${mal(target, b)} = ${BOX}.`),
    kmk: KMK,
  };
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

function vonZehn(b: number, ab: Ab, picture: boolean): ExerciseBody {
  const known = 10 * b;
  const v = 9 * b;
  const prompt = `Du weißt: ${mal(10, b)} = ${known}. Wie viel ist ${mal(9, b)}?`;
  return {
    key: `von-zehn:${b}`,
    ab,
    prompt,
    ...(picture ? { visual: { type: 'dotArray', rows: 10, cols: b, splitAfterRow: 9 } as const } : {}),
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`${mal(9, b)} ist eine ${b} weniger als ${mal(10, b)}.`, `Nimm eine ${b} von ${known} weg.`],
    steps: [`${mal(10, b)} = ${known}`, `Eine ${b} geht weg.`, `${mal(9, b)} = ${known} ${MINUS} ${b} = ${v}`],
    bugs: bugList(v, [
      ['nachbar-vergessen', known, `${mal(10, b)} sind ${known}. Bei ${mal(9, b)} ist es eine ${b} weniger.`],
      ['nur-eins', known - 1, `Es ändert sich nicht nur um 1, sondern um eine ganze ${b}.`],
      ['falsche-zahl', known - 9, `Es geht um eine ganze ${b}, nicht um die 9.`],
    ]),
    praise: 'Du hast von mal 10 aus gerechnet.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

function verdoppelnTask(h: number, b: number, ab: Ab, picture: boolean): ExerciseBody {
  const known = h * b;
  const v = 2 * known;
  const target = 2 * h;
  const prompt = `Du weißt: ${mal(h, b)} = ${known}. Wie viel ist ${mal(target, b)}?`;
  return {
    key: `verdoppeln:${h}x${b}`,
    ab,
    prompt,
    ...(picture ? { visual: split(target, h, b) } : {}),
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`${target} ist das Doppelte von ${h}.`, `Verdopple ${known}.`],
    steps: [`${mal(h, b)} = ${known}`, `${mal(target, b)} ist doppelt so viel.`, `${known} + ${known} = ${v}`],
    bugs: bugList(v, [
      ['verdoppeln-vergessen', known, `${mal(target, b)} ist das Doppelte von ${mal(h, b)}.`],
      ['plus-zwei', known + 2, 'Verdoppeln heißt: noch einmal so viel, nicht plus 2.'],
      ['nachbar-vergessen', known + b, `Das ist erst ${mal(h + 1, b)}. Verdopple ${known}.`],
    ]),
    praise: 'Du hast die leichte Aufgabe verdoppelt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/**
 * From a hard task to another hard one: from 9 · b to 8 · b, from 8 · b to 4 · b. Never to an easy task: nobody needs 9 · 8 for 10 · 8,
 * which would be easier than AB I.
 */
function rueckwaerts(form: 'neun' | 'halb', h: number, b: number, ab: Ab): ExerciseBody {
  const [from, to] = form === 'neun' ? [9, 8] : [2 * h, h];
  const known = from * b;
  const v = to * b;
  const prompt = `Du weißt: ${mal(from, b)} = ${known}. Wie viel ist ${mal(to, b)}?`;
  const halb = form === 'halb';
  return {
    key: `rueck:${from}-${to}x${b}`,
    ab,
    prompt,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: halb ? [`${h} ist die Hälfte von ${2 * h}.`, `Rechne die Hälfte von ${known}.`] : [`${mal(8, b)} ist eine ${b} weniger als ${mal(9, b)}.`, `Rechne von ${known} aus zurück.`],
    steps: halb
      ? [`${mal(from, b)} = ${known}`, `${mal(to, b)} ist die Hälfte davon.`, `Die Hälfte von ${known} ist ${v}.`]
      : [`${mal(from, b)} = ${known}`, `Eine ${b} geht weg.`, `${mal(to, b)} = ${known} ${MINUS} ${b} = ${v}`],
    bugs: bugList(v, [
      ['nachbar-vergessen', known, `${mal(from, b)} sind ${known}. Bei ${mal(to, b)} ändert sich das Ergebnis.`],
      ['nur-eins', halb ? null : known - 1, `Es ändert sich nicht nur um 1, sondern um eine ganze ${b}.`],
      ['verdoppeln-vergessen', halb ? known * 2 : null, 'Hier kommt weniger heraus. Rechne die Hälfte.'],
    ]),
    praise: 'Du hast von der schweren Aufgabe aus gerechnet.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** 7 · 6 = 5 · 6 + 2 · 6: three fields. */
function zerlegen(first: number, second: number, b: number, ab: Ab): ExerciseBody {
  const a = first + second;
  const fp = first * b;
  const sp = second * b;
  const v = a * b;
  const expression = `${mal(a, b)} = ${mal(first, b)} + ${mal(second, b)}`;
  const fields: MultiField[] = [
    { id: 'eins', value: fp, before: `${mal(first, b)} =`, label: 'Erste leichte Aufgabe' },
    { id: 'zwei', value: sp, before: `${mal(second, b)} =`, label: 'Zweite leichte Aufgabe' },
    { id: 'ganz', value: v, before: `${mal(a, b)} =`, label: 'Ganze Aufgabe' },
  ];
  return {
    key: `zerlegen:${first}+${second}x${b}`,
    ab,
    prompt: 'Rechne erst die leichten Aufgaben.',
    expression,
    visual: { type: 'dotArray', rows: a, cols: b, splitAfterRow: first },
    answer: { kind: 'multi', fields },
    hints: ['Rechne zuerst die 2 leichten Aufgaben.', 'Rechne dann beide Ergebnisse zusammen.'],
    steps: [`${mal(first, b)} = ${fp}`, `${mal(second, b)} = ${sp}`, `${mal(a, b)} = ${fp} + ${sp} = ${v}`],
    bugs: multiBugs(
      [
        { id: 'nur-ein-teil', match: { eins: fp, zwei: sp, ganz: fp }, hint: 'Hier fehlt der zweite Teil. Rechne beide zusammen.' },
        { id: 'zweiter-teil-plus', match: { zwei: second + b }, hint: `${mal(second, b)} heißt ${malWort(second)} die ${b}.` },
      ],
      fields,
    ),
    praise: 'Du hast die Aufgabe in leichte Teile zerlegt.',
    srText: sr('Rechne erst die leichten Aufgaben.', expression),
    kmk: KMK,
  };
}

/** 7 · 6 = 5 · 6 + □ · 6: the second part of the split is a gap, the result is asked too. */
function zerlegenLuecke(first: number, second: number, b: number, ab: Ab): ExerciseBody {
  const a = first + second;
  const fp = first * b;
  const sp = second * b;
  const v = a * b;
  const fields: MultiField[] = [
    { id: 'teil', value: second, before: `${mal(a, b)} = ${mal(first, b)} +`, after: `· ${b}`, label: 'Zahl in der Lücke' },
    { id: 'ganz', value: v, before: `${mal(a, b)} =`, label: 'Ergebnis' },
  ];
  return {
    key: `zerlegen-luecke:${first}+${second}x${b}`,
    ab,
    prompt: 'Zerlege die Aufgabe und rechne.',
    answer: { kind: 'multi', fields },
    hints: [`Wie weit ist es von ${first} bis ${a}?`, `Rechne ${mal(first, b)} und den zweiten Teil zusammen.`],
    steps: [`${a} = ${first} + ${second}`, `${mal(first, b)} = ${fp} und ${mal(second, b)} = ${sp}`, `${mal(a, b)} = ${fp} + ${sp} = ${v}. Die Lücke ist ${second}.`],
    bugs: multiBugs(
      [
        { id: 'nur-ein-teil', match: { teil: second, ganz: fp }, hint: 'Hier fehlt der zweite Teil. Rechne beide zusammen.' },
        { id: 'zweiter-teil-plus', match: { teil: second, ganz: fp + second }, hint: `${mal(second, b)} heißt ${malWort(second)} die ${b}.` },
      ],
      fields,
    ),
    praise: 'Du hast die Aufgabe selbst in Teile zerlegt.',
    srText: sr('Zerlege die Aufgabe und rechne.', `${mal(a, b)} = ${mal(first, b)} + ${BOX} · ${b}.`, `${mal(a, b)} = ${BOX}.`),
    kmk: KMK,
  };
}

/** From the split back to the task: 5 · 6 + 2 · 6 = □ · 6. */
function zerlegenRueck(first: number, second: number, b: number, ab: Ab): ExerciseBody {
  const a = first + second;
  const expression = `${mal(first, b)} + ${mal(second, b)} = ${BOX} · ${b}`;
  return {
    key: `zerlegen-rueck:${first}+${second}x${b}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: a, label: 'Zahl in der Lücke' },
    hints: [`Links stehen 2 Teile mit der ${b}.`, 'Wie viele Reihen sind es zusammen?'],
    steps: [`${first}-mal die ${b} und ${second}-mal die ${b}.`, `${first} + ${second} = ${a}`, `In die Lücke gehört ${a}.`],
    bugs: bugList(a, [
      ['nur-ein-teil', first, 'Hier fehlt der zweite Teil. Rechne beide zusammen.'],
      ['zweiter-teil-plus', first * b + second * b, 'Das ist das Ergebnis. Gesucht ist die erste Zahl der Malaufgabe.'],
    ]),
    praise: 'Du hast aus 2 Teilen die Aufgabe gefunden.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk: KMK,
  };
}

/** The easy route to a · b, with routes that give another task. */
const ROUTES: Readonly<Record<number, { right: (b: number) => string; wrong: (b: number) => { label: string; whyWrong: string }[] }>> = {
  4: {
    right: (b) => `${mal(5, b)} ${MINUS} ${b}`,
    wrong: (b) => [
      { label: `${mal(5, b)} + ${b}`, whyWrong: `Das ist ${mal(6, b)}, nicht ${mal(4, b)}.` },
      { label: `${mal(2, b)} + ${b}`, whyWrong: `Das ist ${mal(3, b)}, nicht ${mal(4, b)}.` },
      { label: `${mal(10, b)} ${MINUS} ${b}`, whyWrong: `Das ist ${mal(9, b)}, nicht ${mal(4, b)}.` },
    ],
  },
  6: {
    right: (b) => `${mal(5, b)} + ${b}`,
    wrong: (b) => [
      { label: `${mal(5, b)} ${MINUS} ${b}`, whyWrong: `Das ist ${mal(4, b)}, nicht ${mal(6, b)}.` },
      { label: `${mal(10, b)} ${MINUS} ${b}`, whyWrong: `Das ist ${mal(9, b)}, nicht ${mal(6, b)}.` },
      { label: `${mal(2, b)} + ${b}`, whyWrong: `Das ist ${mal(3, b)}, nicht ${mal(6, b)}.` },
    ],
  },
  7: {
    right: (b) => `${mal(5, b)} + ${mal(2, b)}`,
    wrong: (b) => [
      { label: `${mal(5, b)} + ${b}`, whyWrong: `Das ist ${mal(6, b)}, nicht ${mal(7, b)}.` },
      { label: `${mal(10, b)} ${MINUS} ${b}`, whyWrong: `Das ist ${mal(9, b)}, nicht ${mal(7, b)}.` },
      { label: `${mal(5, b)} ${MINUS} ${mal(2, b)}`, whyWrong: `Das ist ${mal(3, b)}, nicht ${mal(7, b)}.` },
    ],
  },
  8: {
    right: (b) => `${mal(10, b)} ${MINUS} ${mal(2, b)}`,
    wrong: (b) => [
      { label: `${mal(10, b)} ${MINUS} ${b}`, whyWrong: `Das ist ${mal(9, b)}, nicht ${mal(8, b)}.` },
      { label: `${mal(5, b)} + ${mal(2, b)}`, whyWrong: `Das ist ${mal(7, b)}, nicht ${mal(8, b)}.` },
      { label: `${mal(5, b)} + ${b}`, whyWrong: `Das ist ${mal(6, b)}, nicht ${mal(8, b)}.` },
    ],
  },
  9: {
    right: (b) => `${mal(10, b)} ${MINUS} ${b}`,
    wrong: (b) => [
      { label: `${mal(10, b)} ${MINUS} ${mal(2, b)}`, whyWrong: `Das ist ${mal(8, b)}, nicht ${mal(9, b)}.` },
      { label: `${mal(5, b)} + ${b}`, whyWrong: `Das ist ${mal(6, b)}, nicht ${mal(9, b)}.` },
      { label: `${mal(5, b)} + ${mal(2, b)}`, whyWrong: `Das ist ${mal(7, b)}, nicht ${mal(9, b)}.` },
    ],
  },
};

function wegWaehlen(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const route = ROUTES[a];
  const prompt = `Welcher Weg passt zu ${mal(a, b)}?`;
  return {
    key: `weg:${a}x${b}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: route.right(b) }, rng.shuffle(route.wrong(b)), { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Welche leichte Aufgabe mit 2, 5 oder 10 liegt nah?', `Wie viele ${b}er fehlen oder sind zu viel?`],
    steps: [`${a} liegt nah an einer leichten Zahl.`, `Der Weg ist ${route.right(b)}.`, `${mal(a, b)} = ${a * b}`],
    praise: 'Du hast den passenden Rechenweg gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

export const ableitenSkill: SkillDef = {
  ...META,
  title: 'Aufgaben ableiten',
  description: 'Du nutzt eine leichte Aufgabe für eine schwere.',
  stufen: {
    1: 'Eine Gruppe mehr oder weniger: 6 · 4 aus 5 · 4',
    2: 'Von mal 10: 9 · 8. Verdoppeln: 4 · 7 aus 2 · 7',
    3: 'Zerlegen: 7 · 6 = 5 · 6 + 2 · 6; den Weg wählen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const b = rng.pick(B_NUMBERS);
    const body = ((): ExerciseBody => {
      if (stufe === 1) {
        if (ab === 1) {
          const [target, easy] = rng.pick(EINE_MEHR);
          return nachbarRechnen(target, easy, b, ab);
        }
        if (ab === 2) {
          if (rng.chance(0.5)) {
            const [target, easy] = rng.pick(EINE_WENIGER);
            return nachbarRechnen(target, easy, b, ab);
          }
          const [target, easy] = rng.pick([...EINE_MEHR, ...EINE_WENIGER]);
          return nachbarZweiFelder(target, easy, b, ab);
        }
        const [target, easy] = rng.pick([...EINE_MEHR, ...EINE_WENIGER]);
        return rng.chance(0.5) ? nachbarLuecke(target, easy, b, ab) : hilfeWaehlen(rng, target, easy, b, ab, stufe);
      }
      if (stufe === 2) {
        if (ab === 1) return rng.chance(0.5) ? vonZehn(b, ab, true) : verdoppelnTask(2, b, ab, true);
        if (ab === 2) {
          const kind = rng.pick(['zehn', 'drei', 'vier'] as const);
          if (kind === 'zehn') return vonZehn(b, ab, false);
          return verdoppelnTask(kind === 'drei' ? 3 : 4, b, ab, false);
        }
        const kind = rng.pick(['neun', 'halb', 'hilfe'] as const);
        if (kind === 'neun') return rueckwaerts('neun', 4, b, ab);
        if (kind === 'halb') return rueckwaerts('halb', rng.pick([3, 4]), b, ab);
        const [target, easy] = rng.pick([[9, 10], [8, 10], [4, 2]] as const);
        return hilfeWaehlen(rng, target, easy, b, ab, stufe);
      }
      if (ab === 1) {
        const [first, second] = rng.pick([[5, 2], [5, 1], [2, 2]] as const);
        return zerlegen(first, second, b, ab);
      }
      if (ab === 2) {
        if (rng.chance(0.5)) {
          // The gap must not be a number of the task: not 2 · 6 + □ · 6, not 5 · 3 + □ · 3.
          const [first, second] = rng.pick(b === 3 ? ([[5, 2], [5, 1]] as const) : ([[5, 2], [5, 1], [5, 3]] as const));
          return zerlegenLuecke(first, second, b, ab);
        }
        return wegWaehlen(rng, rng.pick([4, 6, 9]), b, ab, stufe);
      }
      if (rng.chance(0.5)) {
        const [first, second] = rng.pick([[5, 2], [5, 3], [5, 4], [2, 2]] as const);
        // With □ · 7 for 5 · 7 + 2 · 7 the answer would stand in the task.
        return zerlegenRueck(first, second, rng.pick(B_NUMBERS.filter((x) => x !== first + second)), ab);
      }
      return wegWaehlen(rng, rng.pick([7, 8]), b, ab, stufe);
    })();
    return build(META, stufe, body);
  },
};
