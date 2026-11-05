/**
 * Mal 5. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 *
 *        AB I                      AB II                       AB III
 * S1     1–5 · 5, sums, hands      recall bare; which task     how many hands; which task gives 15; does it hold
 * S2     half of a given · 10      recall bare; both steps     back to · 10; which way fits
 * S3     □ · 5 = 35; 35 = □ · 5    5 · □ = 35; hands           □ · 5 = 4 · 10; two gaps; does it hold
 *
 * Plain tasks carry the Kern facts with a factor 5; their review slots run the fact trainer (einmaleins.einmaleins, src/state/facts.ts).
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX } from '../../core/format';
import type { Ab, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { factKeyOf } from '../../state/facts';
import { build, bugList, makeChoice, multiBugs, targetAb, type ExerciseBody } from '../shared';
import { factTask, feld, feldSatz, gruppen, mal, malAlsPlusHint, missingFactorTask, plusReihe, showDots, sr, stimmtAnswer, zehnAufgabe } from './helpers';

const ID = 'einmaleins.mal-5';
const META = { id: ID, topicId: 'einmaleins' } as const;
const KMK = ['ZO.kernaufgaben'];

const ordered = (rng: Rng, n: number): [number, number] => (rng.chance(0.5) ? [5, n] : [n, 5]);

function fuenferPlus(n: number, ab: Ab): ExerciseBody {
  const expression = `${plusReihe(n, 5)} = ${BOX}`;
  return {
    key: `fuenfer:${n}`,
    ab,
    prompt: 'Rechne die Fünfer zusammen.',
    expression,
    visual: gruppen(n, 5),
    answer: { kind: 'number', value: n * 5, label: 'Ergebnis' },
    hints: [`Das sind ${n}-mal die 5.`, n > 2 ? 'Je 2 Fünfer sind zusammen eine 10.' : 'Rechne 5 + 5.'],
    steps: [`${plusReihe(n, 5)} = ${mal(n, 5)}`, `${mal(n, 5)} = ${n * 5}`],
    bugs: bugList(n * 5, [
      ['mal-als-plus', n + 5, malAlsPlusHint(n, 5)],
      ['nachbar-vergessen', (n - 1) * 5, `Hier stehen ${n} Fünfer. Nimm alle ${n}.`],
    ]),
    praise: 'Du hast die Fünfer plus gerechnet.',
    srText: sr('Rechne die Fünfer zusammen.', expression),
    kmk: KMK,
  };
}

function haende(n: number, ab: Ab): ExerciseBody {
  const prompt = `Jede Hand hat 5 Finger. Wie viele Finger haben ${n} Hände?`;
  return {
    key: `haende:${n}`,
    ab,
    prompt,
    visual: gruppen(n, 5),
    answer: { kind: 'number', value: n * 5, unit: 'Finger', label: 'Anzahl der Finger' },
    hints: [`Das sind ${n}-mal die 5.`, n > 2 ? 'Je 2 Hände haben zusammen 10 Finger.' : 'Rechne 5 + 5.'],
    steps: [`${n} Hände mit je 5 Fingern.`, `${mal(n, 5)} = ${n * 5}`],
    bugs: bugList(n * 5, [['mal-als-plus', n + 5, `${n} Hände sind ${n}-mal die 5.`]]),
    praise: 'Du hast die Finger in Fünfern gerechnet.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

function haelfteBekannt(n: number, ab: Ab, fiveFirst: boolean): ExerciseBody {
  const [a, b] = fiveFirst ? [5, n] : [n, 5];
  const zehn = 10 * n;
  const zehnTask = zehnAufgabe(a, b);
  const prompt = `Du weißt: ${zehnTask} = ${zehn}. Wie viel ist ${mal(a, b)}?`;
  return {
    key: `haelfte:${a}x${b}`,
    ab,
    prompt,
    answer: { kind: 'number', value: 5 * n, label: 'Ergebnis' },
    hints: ['5 ist die Hälfte von 10.', `Rechne die Hälfte von ${zehn}.`],
    steps: [`${zehnTask} = ${zehn}`, `Die Hälfte von ${zehn} ist ${5 * n}.`, `${mal(a, b)} = ${5 * n}`],
    bugs: bugList(5 * n, [
      ['haelfte-vergessen', zehn, `Das ist ${zehnTask}. Du brauchst die Hälfte davon.`],
      ['mal-als-plus', a + b, malAlsPlusHint(a, b)],
    ]),
    praise: 'Du hast die Hälfte von mal 10 genutzt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

function feldHaelfte(n: number, ab: Ab): ExerciseBody {
  const context = feldSatz(10, n);
  const prompt = 'Wie viele Punkte sind in 5 Reihen?';
  return {
    key: `feld-haelfte:${n}`,
    ab,
    context,
    prompt,
    visual: { type: 'dotArray', rows: 10, cols: n, splitAfterRow: 5 },
    answer: { kind: 'number', value: 5 * n, unit: 'Punkte', label: 'Anzahl der Punkte' },
    hints: [`Alle 10 Reihen sind ${mal(10, n)}.`, '5 Reihen sind die Hälfte davon.'],
    steps: [`${mal(10, n)} = ${10 * n}`, `Die Hälfte von ${10 * n} ist ${5 * n}.`, `${mal(5, n)} = ${5 * n}`],
    bugs: bugList(5 * n, [['haelfte-vergessen', 10 * n, 'Das sind alle 10 Reihen. Du brauchst nur die Hälfte.']]),
    praise: 'Du hast das Feld in der Mitte geteilt.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
}

/** The picture comes only with the solution: its frames would show the number of hands. */
function haendeLuecke(n: number, ab: Ab): ExerciseBody {
  const fingers = n * 5;
  const prompt = `Alle Hände zusammen haben ${fingers} Finger. Wie viele Hände sind es?`;
  return {
    key: `haende-luecke:${n}`,
    ab,
    prompt,
    answer: { kind: 'number', value: n, unit: 'Hände', label: 'Anzahl der Hände' },
    hints: ['Jede Hand hat 5 Finger.', `Wie oft passt die 5 in ${fingers}?`],
    steps: [`Frage: Welche Zahl mal 5 ergibt ${fingers}?`, { text: `${mal(n, 5)} = ${fingers}`, visual: gruppen(n, 5) }, `Es sind ${n} Hände.`],
    bugs: bugList(n, [['minus-statt-mal', fingers - 5, `Minus passt hier nicht. Wie oft passt die 5 in ${fingers}?`]]),
    praise: 'Du hast die Finger in Fünfer geteilt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Which task is this sum? */
function plusWahl(rng: Rng, n: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const sum = plusReihe(n, 5);
  const prompt = `Welche Malaufgabe passt zu ${sum}?`;
  return {
    key: `plus-wahl:${n}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: mal(n, 5) },
      rng.shuffle([
        { label: mal(n + 1, 5), whyWrong: `Das sind ${n + 1} Fünfer.` },
        { label: mal(n - 1, 5), whyWrong: n === 2 ? 'Das ist nur 1 Fünfer.' : `Das sind nur ${n - 1} Fünfer.` },
        { label: `${n} + 5`, whyWrong: `Die 5 steht ${n}-mal da.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Wie oft steht die 5 da?', 'Das ist die erste Zahl der Malaufgabe.'],
    steps: [`Die 5 steht ${n}-mal da.`, `${sum} = ${mal(n, 5)}`],
    praise: 'Du hast die Fünfer als Malaufgabe erkannt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Which task has this result? Found by comparing, so it carries no factKey. */
function ergebnisWaehlen(rng: Rng, n: number, ab: Ab, stufe: Stufe, fiveFirst: boolean): ExerciseBody {
  const p = n * 5;
  const term = (x: number) => (fiveFirst ? mal(5, x) : mal(x, 5));
  const prompt = `Welche Aufgabe hat das Ergebnis ${p}?`;
  const near = [n + 1, n - 1, n + 2].filter((x) => x >= 1 && x <= 10);
  return {
    key: `ergebnis:${fiveFirst ? `5x${n}` : `${n}x5`}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: term(n) },
      rng.shuffle([
        ...near.slice(0, 2).map((x) => ({ label: term(x), whyWrong: `${term(x)} ergibt ${x * 5}.` })),
        { label: `${n} + 5`, whyWrong: `${n} + 5 ergibt ${n + 5}.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Rechne jede Aufgabe im Kopf.', 'Mal 5 heißt: immer Fünfer.'],
    steps: [`${term(n)} = ${p}`, `Die Aufgabe ist ${term(n)}.`],
    praise: 'Du hast die Aufgaben verglichen.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** n · 10 first, then n · 5: both steps of the way without the first result. */
function zweiSchritte(n: number, ab: Ab): ExerciseBody {
  const zehn = 10 * n;
  const fuenf = 5 * n;
  const fields: MultiField[] = [
    { id: 'zehn', value: zehn, before: `${mal(n, 10)} =`, label: 'Mal 10' },
    { id: 'fuenf', value: fuenf, before: `${mal(n, 5)} =`, label: 'Mal 5' },
  ];
  const prompt = 'Rechne zuerst mal 10, dann die Hälfte.';
  return {
    key: `zwei-schritte:${n}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Mal 10 heißt: Zehner.', '5 ist die Hälfte von 10.'],
    steps: [`${mal(n, 10)} = ${zehn}`, `${mal(n, 5)} ist die Hälfte davon.`, `Die Hälfte von ${zehn} ist ${fuenf}.`],
    bugs: multiBugs([{ id: 'haelfte-vergessen', match: { zehn, fuenf: zehn }, hint: 'Das ist noch mal 10. Du brauchst die Hälfte davon.' }], fields),
    praise: 'Du hast mal 5 aus mal 10 gerechnet.',
    srText: sr(prompt, `${mal(n, 10)} = ${BOX}.`, `${mal(n, 5)} = ${BOX}.`),
    kmk: KMK,
  };
}

/** The way back: from n · 5 to n · 10. */
function zurueckZuZehn(n: number, ab: Ab): ExerciseBody {
  const fuenf = 5 * n;
  const zehn = 10 * n;
  const prompt = `Du weißt: ${mal(n, 5)} = ${fuenf}. Wie viel ist ${mal(n, 10)}?`;
  return {
    key: `zurueck:${n}`,
    ab,
    prompt,
    answer: { kind: 'number', value: zehn, label: 'Ergebnis' },
    hints: ['10 ist das Doppelte von 5.', `Verdopple ${fuenf}.`],
    steps: [`${mal(n, 5)} = ${fuenf}`, `${mal(n, 10)} ist doppelt so viel.`, `${fuenf} + ${fuenf} = ${zehn}`],
    bugs: bugList(zehn, [
      ['haelfte-vergessen', fuenf, `Das ist ${mal(n, 5)}. Bei ${mal(n, 10)} ist es doppelt so viel.`],
      ['mal-als-plus', fuenf + 5, `Es kommt nicht nur eine 5 dazu. Verdopple ${fuenf}.`],
    ]),
    praise: 'Du hast mal 10 aus mal 5 gerechnet.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Which way leads to n · 5? */
function wegWaehlen(rng: Rng, n: number, ab: Ab, stufe: Stufe, fiveFirst: boolean): ExerciseBody {
  const [a, b] = fiveFirst ? [5, n] : [n, 5];
  const zehn = 10 * n;
  const prompt = `Welcher Weg passt zu ${mal(a, b)}?`;
  return {
    key: `weg:${a}x${b}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: `Die Hälfte von ${zehn}` },
      rng.shuffle([
        { label: `Das Doppelte von ${zehn}`, whyWrong: '5 ist weniger als 10. Das Ergebnis wird kleiner.' },
        { label: `${zehn} − 5`, whyWrong: 'Da geht nur eine 5 weg. Es ist viel weniger.' },
        { label: `${a} + ${b}`, whyWrong: `${mal(a, b)} heißt ${a}-mal die ${b}.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Denk an die Aufgabe mit mal 10.', '5 ist die Hälfte von 10.'],
    steps: [`${zehnAufgabe(a, b)} = ${zehn}`, `Die Hälfte von ${zehn} ist ${5 * n}.`, `${mal(a, b)} = ${5 * n}`],
    praise: 'Du hast den Weg über mal 10 erkannt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** □ · 5 = 4 · 10: the right side has to be worked out first. m ≤ 4: with 5 · 10 the answer 10 would stand in the task. */
function gleichZehn(m: number, ab: Ab, unknownFirst: boolean): ExerciseBody {
  const p = m * 10;
  const q = 2 * m;
  const left = unknownFirst ? `${BOX} · 5` : `5 · ${BOX}`;
  const expression = `${left} = ${mal(m, 10)}`;
  return {
    key: `gleich-zehn:${unknownFirst ? 'vorn' : 'hinten'}:${m}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: q, label: 'Zahl in der Lücke' },
    hints: [`Rechne zuerst ${mal(m, 10)}.`, unknownFirst ? 'Wie oft passt die 5 in dein Ergebnis?' : '5-mal welche Zahl ergibt dein Ergebnis?'],
    steps: [`${mal(m, 10)} = ${p}`, unknownFirst ? `${mal(q, 5)} = ${p}` : `${mal(5, q)} = ${p}`, `In die Lücke gehört ${q}.`],
    bugs: bugList(q, [['minus-statt-mal', p - 5, `Minus passt hier nicht. Rechne zuerst ${mal(m, 10)}.`]]),
    praise: 'Du hast mal 5 und mal 10 verglichen.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk: KMK,
  };
}

/** □ · 5 = p and □ · 10 = p: the same result needs twice as many Fünfer as Zehner. */
function zweiLuecken(p: number, ab: Ab): ExerciseBody {
  const q5 = p / 5;
  const q10 = p / 10;
  const fields: MultiField[] = [
    { id: 'fuenf', value: q5, after: `· 5 = ${p}`, label: 'Lücke bei mal 5' },
    { id: 'zehn', value: q10, after: `· 10 = ${p}`, label: 'Lücke bei mal 10' },
  ];
  const prompt = 'Fülle beide Lücken.';
  return {
    key: `zwei-luecken:${p}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [`Wie oft passt die 10 in ${p}?`, 'Bei mal 5 brauchst du doppelt so viele.'],
    steps: [`${mal(q10, 10)} = ${p}`, `${mal(q5, 5)} = ${p}`, `Die Zahlen sind ${q5} und ${q10}.`],
    bugs: multiBugs([{ id: 'haelfte-vergessen', match: { fuenf: q10, zehn: q10 }, hint: 'Bei mal 5 brauchst du doppelt so viele wie bei mal 10.' }], fields),
    praise: 'Du hast mal 5 und mal 10 verglichen.',
    srText: sr(prompt, `${BOX} · 5 = ${p}.`, `${BOX} · 10 = ${p}.`),
    kmk: KMK,
  };
}

/** Does this result hold? Wrong results are one Fünfer off. Up to 5 · 5 (Stufe 1) by adding Fünfer: the half of mal 10 comes with Stufe 2. */
function stimmtFuenf(rng: Rng, n: number, ab: Ab): ExerciseBody {
  const p = n * 5;
  const klein = n <= 5;
  const isTrue = rng.chance(0.4);
  const shown = isTrue ? p : n === 10 || rng.chance(0.5) ? p - 5 : p + 5;
  const expression = `${mal(n, 5)} = ${shown}`;
  return {
    key: `stimmt:${n}:${shown}`,
    ab,
    prompt: 'Stimmt das?',
    expression,
    answer: stimmtAnswer(rng, isTrue, klein ? 'Rechne die Fünfer zusammen und vergleiche.' : isTrue ? 'Das stimmt: Prüfe mit der Hälfte von mal 10.' : 'Prüfe mit mal 10: Das Ergebnis ist die Hälfte davon.'),
    hints: klein ? [`Rechne ${plusReihe(n, 5)}.`, 'Vergleiche dann mit der Zahl rechts.'] : [`Rechne zuerst ${mal(n, 10)}.`, 'Mal 5 ist die Hälfte davon.'],
    steps: klein ? [`${plusReihe(n, 5)} = ${p}`, `${mal(n, 5)} = ${p}`, isTrue ? 'Das stimmt.' : 'Das stimmt nicht.'] : [`${mal(n, 10)} = ${10 * n}`, `Die Hälfte von ${10 * n} ist ${p}.`, isTrue ? 'Das stimmt.' : 'Das stimmt nicht.'],
    praise: klein ? 'Du hast das Ergebnis selbst geprüft.' : 'Du hast das Ergebnis mit mal 10 geprüft.',
    srText: sr('Stimmt das?', expression),
    kmk: KMK,
  };
}

export const mal5Skill: SkillDef = {
  ...META,
  title: 'Mal 5',
  description: 'Du rechnest mal 5 als Hälfte von mal 10.',
  stufen: {
    1: 'Mal 5 mit Zahlen von 1 bis 5',
    2: 'Mal 5 von 6 bis 10: die Hälfte von mal 10',
    3: 'Lücken: □ · 5 = 35',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const body = ((): ExerciseBody => {
      if (stufe === 1) {
        if (ab === 1) {
          const n = rng.int(1, 5);
          const kind = rng.pick(['fakt', 'fakt', 'plus', 'haende'] as const);
          if (kind === 'fakt' || n === 1) {
            const [a, b] = ordered(rng, n);
            return factTask(a, b, ab, KMK, showDots(rng, stufe, factKeyOf(a, b), ctx) ? feld(a, b) : undefined);
          }
          return kind === 'plus' ? fuenferPlus(n, ab) : haende(n, ab);
        }
        const n = rng.int(2, 5);
        if (ab === 2) {
          if (rng.chance(0.5)) return plusWahl(rng, n, ab, stufe);
          const [a, b] = ordered(rng, n);
          return factTask(a, b, ab, KMK);
        }
        // 5 hands: the answer would stand in the hint 'Jede Hand hat 5 Finger'.
        const kind = rng.pick(['haende', 'ergebnis', 'stimmt'] as const);
        if (kind === 'haende') return haendeLuecke(rng.int(2, 4), ab);
        return kind === 'ergebnis' ? ergebnisWaehlen(rng, n, ab, stufe, rng.chance(0.5)) : stimmtFuenf(rng, n, ab);
      }
      if (stufe === 2) {
        const n = rng.int(6, 10);
        if (ab === 1) return rng.chance(0.6) ? haelfteBekannt(n, ab, rng.chance(0.5)) : feldHaelfte(n, ab);
        if (ab === 2) {
          if (rng.chance(0.4)) return zweiSchritte(n, ab);
          const [a, b] = ordered(rng, n);
          return factTask(a, b, ab, KMK);
        }
        return rng.chance(0.5) ? zurueckZuZehn(n, ab) : wegWaehlen(rng, n, ab, stufe, rng.chance(0.5));
      }
      // n = 5 would show its answer (□ · 5 = 25).
      const n = rng.pick([3, 4, 6, 7, 8, 9, 10]);
      if (ab === 1) return missingFactorTask(n, 5, ab, KMK, true, rng.chance(0.5));
      if (ab === 2) return rng.chance(0.7) ? missingFactorTask(n, 5, ab, KMK, false) : haendeLuecke(rng.int(6, 10), ab);
      const kind = rng.pick(['gleich', 'zwei', 'stimmt'] as const);
      if (kind === 'gleich') return gleichZehn(rng.int(1, 4), ab, rng.chance(0.5));
      return kind === 'zwei' ? zweiLuecken(rng.pick([10, 20, 30, 40]), ab) : stimmtFuenf(rng, rng.int(6, 10), ab);
    })();
    return build(META, stufe, body);
  },
};
