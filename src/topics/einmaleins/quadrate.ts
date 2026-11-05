/**
 * Quadrataufgaben (Extra; required only in Bayern, docs/research.md §2.3). The Stufe chooses the content (§6), the AB the demand inside it:
 *
 *        AB I                    AB II                       AB III
 * S1     2–5: n · n, n + n + …   how many dots in n rows;    □ · □ = 16; which square gives 16
 *                                which task is the square
 * S2     6–10: n · n             the same with 6–10          the same with 6–10
 * S3     6 · 7 from 6 · 6, one   a neighbour either way, no  6 · 6 from 6 · 7; both neighbours; which way from the square
 *        more, with a field      picture; 6 · 6 from 6 · 7
 *
 * On Stufe 3 the task itself is never a Kern fact (6 · 5, 9 · 10) and the square is above 5 · 5: both would ask less than Stufe 2.
 *
 * Stufe 1 has only 4 squares but 5 AB I items in a round, so n + n + … is a form of AB I too. Owns the 6 squares outside the Kern facts
 * (src/state/facts.ts): a review slot returns exactly its fact, as a plain task on every Stufe. 2 · 2, 5 · 5 and 10 · 10 are Kern facts: they are
 * asked here but carry no factKey, so an Extra never moves a Kern fact towards a badge.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX, MINUS } from '../../core/format';
import type { Ab, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { factFactors, factSkillId } from '../../state/facts';
import { build, bugList, makeChoice, multiBugs, targetAb, type ExerciseBody } from '../shared';
import { factBugs, factHints, factSteps, factTask, feld, feldSatz, mal, malAlsPlusHint, plusReihe, reviewAb, showDots, sr } from './helpers';

const ID = 'einmaleins.quadrate';
const META = { id: ID, topicId: 'einmaleins' } as const;
const KMK = ['ZO.kernaufgaben', 'MS.muster'];

/** The same calculation as the fact n · n, so it shares its key: a sheet or a twin does not ask it twice. */
function punkteZaehlen(n: number, ab: Ab): ExerciseBody {
  const expression = `${mal(n, n)} = ${BOX}`;
  return {
    key: `fakt:${n}x${n}`,
    ab,
    prompt: 'Wie viele Punkte hat das Quadrat?',
    expression,
    visual: feld(n, n),
    answer: { kind: 'number', value: n * n, label: 'Anzahl der Punkte' },
    hints: factHints(n, n),
    steps: factSteps(n, n),
    bugs: factBugs(n, n),
    praise: 'Du hast das Quadrat aus Punkten gerechnet.',
    srText: sr('Wie viele Punkte hat das Quadrat?', expression),
    kmk: KMK,
  };
}

/** n + n + … as a sum: the plainest form of a small square. */
function quadratPlus(n: number, ab: Ab): ExerciseBody {
  const sum = plusReihe(n, n);
  const expression = `${sum} = ${BOX}`;
  return {
    key: `plus:${n}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: { kind: 'number', value: n * n, label: 'Ergebnis' },
    hints: [`Das ist ${n}-mal die ${n}.`, 'Rechne der Reihe nach zusammen.'],
    steps: [`${sum} = ${mal(n, n)}`, `${mal(n, n)} = ${n * n}`],
    bugs: bugList(n * n, [['mal-als-plus', n + n, malAlsPlusHint(n, n)]]),
    praise: 'Du hast die gleichen Zahlen plus gerechnet.',
    srText: sr('Rechne.', expression),
    kmk: KMK,
  };
}

/** The rows are named, the columns are the same: no picture, the child has to know what a square is. */
function quadratReihen(n: number, ab: Ab): ExerciseBody {
  const prompt = `Ein Quadrat aus Punkten hat ${n} Reihen. Wie viele Punkte hat es?`;
  return {
    key: `reihen:${n}`,
    ab,
    prompt,
    answer: { kind: 'number', value: n * n, unit: 'Punkte', label: 'Anzahl der Punkte' },
    hints: ['Beim Quadrat sind Reihen und Spalten gleich viele.', `Jede Reihe hat auch ${n} Punkte.`],
    steps: [`${n} Reihen mit je ${n} Punkten.`, { text: `${mal(n, n)} = ${n * n}`, visual: feld(n, n) }],
    bugs: bugList(n * n, [
      ['mal-als-plus', n + n, `${n} Reihen mit je ${n} Punkten sind ${mal(n, n)}.`],
      ['falsche-zahl', n, 'Das ist nur eine Reihe. Rechne alle Reihen.'],
    ]),
    praise: 'Du hast an gleich lange Reihen gedacht.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Which task is a square, and it fits the field? */
function quadratWahl(rng: Rng, n: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = 'Welche Malaufgabe passt zum Quadrat?';
  const other = n === 2 ? 3 : n - 1;
  return {
    key: `wahl:${n}`,
    ab,
    prompt,
    visual: feld(n, n),
    answer: makeChoice(
      rng,
      { label: mal(n, n) },
      rng.shuffle([
        { label: `${n} + ${n}`, whyWrong: 'Plus passt hier nicht. Alle Reihen sind gleich lang.' },
        { label: mal(other, n), whyWrong: `Es sind nicht ${other} Reihen. Reihen und Spalten sind gleich viele.` },
        { label: mal(n, 10), whyWrong: 'Eine Reihe hat nicht 10 Punkte. Zähle Reihen und Spalten.' },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Wie viele Reihen siehst du?', 'Reihen und Spalten sind gleich viele.'],
    steps: [{ text: feldSatz(n, n), visual: feld(n, n) }, `Das ist ${mal(n, n)}.`],
    praise: 'Du hast das Quadrat im Feld erkannt.',
    srText: sr(feldSatz(n, n), prompt),
    kmk: KMK,
  };
}

/** Which square has this result? Found by comparing, so it carries no factKey. */
function ergebnisWaehlen(rng: Rng, n: number, pool: readonly number[], ab: Ab, stufe: Stufe): ExerciseBody {
  const p = n * n;
  const prompt = `Welche Quadrataufgabe hat das Ergebnis ${p}?`;
  const others = rng.shuffle(pool.filter((x) => x !== n)).slice(0, 3);
  return {
    key: `ergebnis:${n}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: mal(n, n) },
      others.map((x) => ({ label: mal(x, x), whyWrong: `${mal(x, x)} ergibt ${x * x}.` })),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Rechne jede Aufgabe im Kopf.', `Welche Aufgabe kommt genau auf ${p}?`],
    steps: [`${mal(n, n)} = ${p}`, `Die Aufgabe ist ${mal(n, n)}.`],
    praise: 'Du hast die Quadrataufgaben verglichen.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** □ · □ = p: the same number twice. */
function zweimalGleich(n: number, ab: Ab): ExerciseBody {
  const p = n * n;
  const prompt = 'Welche Zahl gehört in beide Lücken?';
  const expression = `${BOX} · ${BOX} = ${p}`;
  return {
    key: `zweimal:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: n, label: 'Zahl in den Lücken' },
    hints: ['Probiere eine Zahl: Rechne die Zahl mal sich selbst.', n > 5 ? 'Die Zahl ist größer als 5.' : 'Probiere kleine Zahlen.'],
    steps: [`Frage: Welche Zahl mal sich selbst ergibt ${p}?`, `${mal(n, n)} = ${p}`, `In die Lücken gehört ${n}.`],
    bugs: bugList(n, [
      ['halbiert-statt-quadrat', p % 2 === 0 ? p / 2 : null, `Das ist die Hälfte von ${p}. Gesucht ist: Zahl mal Zahl.`],
    ]),
    praise: 'Du hast die Zahl mit mal geprüft.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

const nachbarFeld = (n: number, other: number, squareFirst: boolean): Visual =>
  squareFirst ? { type: 'dotArray', rows: n, cols: other, splitAfterCol: Math.min(n, other) } : { type: 'dotArray', rows: other, cols: n, splitAfterRow: Math.min(n, other) };

/** From a square to its neighbour: the known task is shown, so this is a derivation without factKey. */
function nachbarVomQuadrat(n: number, other: number, ab: Ab, squareFirst: boolean, picture: boolean): ExerciseBody {
  const [a, b] = squareFirst ? [n, other] : [other, n];
  const square = n * n;
  const plus = other > n;
  const v = a * b;
  const prompt = `Du weißt: ${mal(n, n)} = ${square}. Wie viel ist ${mal(a, b)}?`;
  const sign = plus ? '+' : '−';
  return {
    key: `nachbar:${a}x${b}`,
    ab,
    prompt,
    ...(picture ? { visual: nachbarFeld(n, other, squareFirst) } : {}),
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`${mal(a, b)} ist eine ${n} ${plus ? 'mehr' : 'weniger'} als ${mal(n, n)}.`, `Rechne von ${square} aus ${plus ? 'weiter' : 'zurück'}.`],
    steps: [`${mal(n, n)} = ${square}`, `${plus ? `Dazu kommt eine ${n}` : `Eine ${n} geht weg`}.`, `${mal(a, b)} = ${square} ${sign} ${n} = ${v}`],
    bugs: bugList(v, [
      ['nachbar-vergessen', square, `${mal(n, n)} sind ${square}. Bei ${mal(a, b)} ist es eine ${n} ${plus ? 'mehr' : 'weniger'}.`],
      ['nur-eins', plus ? square + 1 : square - 1, `Es ändert sich nicht nur um 1, sondern um eine ganze ${n}.`],
      ['falsche-zahl', plus ? square + other : square - other, `Du brauchst eine ${n}, nicht eine ${other}.`],
    ]),
    praise: 'Du hast die Quadrataufgabe als Hilfe genutzt.',
    srText: sr(prompt),
    kmk: [...KMK, 'ZO.strategien'],
  };
}

/** The way back: from the neighbour to the square. */
function zumQuadrat(n: number, other: number, ab: Ab, squareFirst: boolean): ExerciseBody {
  const [a, b] = squareFirst ? [n, other] : [other, n];
  const known = a * b;
  const square = n * n;
  const plus = other < n;
  const sign = plus ? '+' : MINUS;
  const prompt = `Du weißt: ${mal(a, b)} = ${known}. Wie viel ist ${mal(n, n)}?`;
  return {
    key: `zum-quadrat:${a}x${b}:${n}`,
    ab,
    prompt,
    answer: { kind: 'number', value: square, label: 'Ergebnis' },
    hints: [`${mal(n, n)} ist eine ${n} ${plus ? 'mehr' : 'weniger'} als ${mal(a, b)}.`, `Rechne von ${known} aus ${plus ? 'weiter' : 'zurück'}.`],
    steps: [`${mal(a, b)} = ${known}`, `${plus ? `Dazu kommt eine ${n}` : `Eine ${n} geht weg`}.`, `${mal(n, n)} = ${known} ${sign} ${n} = ${square}`],
    bugs: bugList(square, [
      ['nachbar-vergessen', known, `${mal(a, b)} sind ${known}. Bei ${mal(n, n)} ist es eine ${n} ${plus ? 'mehr' : 'weniger'}.`],
      ['nur-eins', plus ? known + 1 : known - 1, `Es ändert sich nicht nur um 1, sondern um eine ganze ${n}.`],
    ]),
    praise: 'Du hast vom Nachbarn aus gerechnet.',
    srText: sr(prompt),
    kmk: [...KMK, 'ZO.strategien'],
  };
}

/** Both neighbours of one square. */
function beideNachbarn(n: number, ab: Ab): ExerciseBody {
  const square = n * n;
  const fields: MultiField[] = [
    { id: 'weniger', value: n * (n - 1), before: `${mal(n, n - 1)} =`, label: 'Eine weniger' },
    { id: 'mehr', value: n * (n + 1), before: `${mal(n, n + 1)} =`, label: 'Eine mehr' },
  ];
  const prompt = `Du weißt: ${mal(n, n)} = ${square}. Rechne beide Aufgaben.`;
  return {
    key: `beide:${n}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [`Eine Aufgabe ist eine ${n} weniger als ${mal(n, n)}.`, `Die andere ist eine ${n} mehr.`],
    steps: [`${mal(n, n - 1)} = ${square} ${MINUS} ${n} = ${n * (n - 1)}`, `${mal(n, n + 1)} = ${square} + ${n} = ${n * (n + 1)}`, `Die Zahlen sind ${n * (n - 1)} und ${n * (n + 1)}.`],
    bugs: multiBugs(
      [
        { id: 'nur-eins', match: { weniger: square - 1, mehr: square + 1 }, hint: `Es ändert sich nicht nur um 1, sondern um eine ganze ${n}.` },
        { id: 'nachbar-vergessen', match: { weniger: square, mehr: square }, hint: `Bei beiden Aufgaben ändert sich das Ergebnis um eine ${n}.` },
      ],
      fields,
    ),
    praise: 'Du hast beide Nachbaraufgaben genutzt.',
    srText: sr(prompt, `${mal(n, n - 1)} = ${BOX}.`, `${mal(n, n + 1)} = ${BOX}.`),
    kmk: [...KMK, 'ZO.strategien'],
  };
}

/**
 * Which way leads from the square to its neighbour? Every option starts at the square: 'which square helps' would be decided by the one
 * square with a number of the task.
 */
function wegWaehlen(rng: Rng, n: number, other: number, ab: Ab, stufe: Stufe, squareFirst: boolean): ExerciseBody {
  const [a, b] = squareFirst ? [n, other] : [other, n];
  const square = n * n;
  const plus = other > n;
  const sign = plus ? '+' : MINUS;
  const prompt = `Du weißt: ${mal(n, n)} = ${square}. Welcher Weg führt zu ${mal(a, b)}?`;
  return {
    key: `weg:${a}x${b}:${n}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: `${square} ${sign} ${n}` },
      rng.shuffle([
        { label: `${square} ${plus ? MINUS : '+'} ${n}`, whyWrong: `Schau genau: Ist ${mal(a, b)} mehr oder weniger als ${mal(n, n)}?` },
        { label: `${square} ${sign} ${other}`, whyWrong: `Es geht um eine ganze ${n}, nicht um die ${other}.` },
        { label: `${square} ${sign} 1`, whyWrong: 'Es ändert sich nicht nur um 1, sondern um eine ganze Reihe.' },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: [`Ist ${mal(a, b)} mehr oder weniger als ${mal(n, n)}?`, 'Es ändert sich um eine ganze Reihe, nicht nur um 1.'],
    steps: [`${mal(n, n)} = ${square}`, `${plus ? `Dazu kommt eine ${n}` : `Eine ${n} geht weg`}.`, `${mal(a, b)} = ${square} ${sign} ${n} = ${a * b}`],
    praise: 'Du hast den passenden Weg gefunden.',
    srText: sr(prompt),
    kmk: [...KMK, 'ZO.strategien'],
  };
}

/** Squares above 5 · 5 with a neighbour that is no Kern fact: 6 · 7 but not 6 · 5, 9 · 8 but not 9 · 10. */
const NACHBARN: readonly (readonly [n: number, other: number])[] = [[6, 7], [7, 6], [7, 8], [8, 7], [8, 9], [9, 8]];

export const quadrateSkill: SkillDef = {
  ...META,
  title: 'Quadrataufgaben',
  description: 'Du merkst dir Aufgaben mit zwei gleichen Zahlen.',
  stufen: {
    1: 'Quadrataufgaben bis 5 · 5',
    2: 'Quadrataufgaben bis 10 · 10',
    3: 'Nachbaraufgaben: 6 · 7 aus 6 · 6',
  },
  kmk: KMK,
  optional: 'extra',
  generate(rng, stufe, ctx) {
    if (ctx.factKey && factSkillId(ctx.factKey) === ID) {
      const [a, b] = factFactors(ctx.factKey);
      return build(META, stufe, factTask(a, b, reviewAb(ctx), KMK));
    }
    const ab = targetAb(rng, stufe, ctx);
    const body = ((): ExerciseBody => {
      if (stufe === 3) {
        const squareFirst = rng.chance(0.5);
        // Squares above 5 · 5 for the direct forms: 4 · 3 from 3 · 3 would be easier than 9 · 9 on Stufe 2.
        if (ab === 1) {
          const m = rng.pick([6, 7, 8]);
          return nachbarVomQuadrat(m, m + 1, ab, squareFirst, true);
        }
        const [n, other] = rng.pick(NACHBARN);
        // With only 6 calculations here, the way back keeps a round of 6 such items free of a repeat.
        if (ab === 2) return rng.chance(0.5) ? nachbarVomQuadrat(n, other, ab, squareFirst, false) : zumQuadrat(n, other, ab, squareFirst);
        const kind = rng.pick(['zurueck', 'beide', 'weg'] as const);
        if (kind === 'zurueck') return zumQuadrat(n, other, ab, squareFirst);
        return kind === 'beide' ? beideNachbarn(n, ab) : wegWaehlen(rng, n, other, ab, stufe, squareFirst);
      }
      const pool = stufe === 1 ? [2, 3, 4, 5] : [6, 7, 8, 9, 10];
      const n = rng.pick(pool);
      if (ab === 1) {
        const kind = rng.pick(['fakt', 'fakt', 'feld', 'plus'] as const);
        if (kind === 'feld') return punkteZaehlen(n, ab);
        if (kind === 'plus' && stufe === 1) return quadratPlus(n, ab);
        const task = factTask(n, n, ab, KMK, showDots(rng, stufe, `${n}x${n}`, ctx) ? feld(n, n) : undefined);
        if (task.factKey && factSkillId(task.factKey) !== ID) delete task.factKey;
        return task;
      }
      if (ab === 2) return rng.chance(0.5) ? quadratReihen(n, ab) : quadratWahl(rng, n, ab, stufe);
      return rng.chance(0.5) ? zweimalGleich(n, ab) : ergebnisWaehlen(rng, n, pool, ab, stufe);
    })();
    return build(META, stufe, body);
  },
};
