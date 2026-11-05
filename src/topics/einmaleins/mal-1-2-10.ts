/**
 * Mal 1, 2 und 10. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 *
 *        AB I                  AB II                         AB III
 * S1     n · 10, 1 · n         10 · n, n · 1; 10 + 10 = □ · 10   70 = □ Zehner; which task gives 70; does it hold
 * S2     2 · n; Verdopple n    n · 2; which sum; n + n bare  double twice; does it hold
 * S3     □ · 2 = 14            2 · □ = 14                    two gaps; a gap in a story; mit Extras · 0
 *
 * A gap never comes with mal 1 or with n · n: □ · 1 = 7 and 2 · □ = 4 show their answer. Plain tasks carry Kern facts with these
 * factors; their review slots run the fact trainer (einmaleins.einmaleins, src/state/facts.ts).
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX } from '../../core/format';
import type { Ab, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { factKeyOf } from '../../state/facts';
import { build, bugList, makeChoice, multiBugs, targetAb, type ExerciseBody } from '../shared';
import { factTask, feld, gruppen, mal, malWort, missingFactorTask, plusReihe, showDots, sr, stimmtAnswer } from './helpers';

const ID = 'einmaleins.mal-1-2-10';
const META = { id: ID, topicId: 'einmaleins' } as const;
const KMK = ['ZO.kernaufgaben'];

/** 70 = □ Zehner: from the number back to its Zehner. No picture and no task 7 · 10: they would show the answer. */
function zehnerZaehlen(n: number, ab: Ab): ExerciseBody {
  const expression = `${n * 10} = ${BOX} Zehner`;
  return {
    key: `zehner:${n}`,
    ab,
    prompt: 'Wie viele Zehner sind das?',
    expression,
    answer: { kind: 'number', value: n, label: 'Anzahl der Zehner' },
    hints: ['Ein Zehner hat 10 Einer.', `Wie oft passt die 10 in ${n * 10}?`],
    steps: [{ text: 'Jede Reihe ist 1 Zehner.', visual: feld(n, 10) }, `Es sind ${n} Reihen.`, `${n * 10} = ${n} Zehner`],
    bugs: bugList(n, [['alle-punkte', n * 10, 'Das ist die ganze Zahl. Gefragt sind die Zehner.']]),
    praise: 'Du hast in Zehnern gedacht.',
    srText: sr('Wie viele Zehner sind das?', expression),
    kmk: KMK,
  };
}

/** No picture with the task: its frames and its aria-label would give the number of Zehner. */
function zehnerPlus(n: number, ab: Ab): ExerciseBody {
  const expression = `${plusReihe(n, 10)} = ${BOX} · 10`;
  return {
    key: `zehner-plus:${n}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: n, label: 'Zahl in der Lücke' },
    hints: ['Wie oft steht die 10 da?', 'Das ist die erste Zahl der Malaufgabe.'],
    steps: [{ text: `Die 10 steht ${n}-mal da.`, visual: gruppen(n, 10) }, `${plusReihe(n, 10)} = ${mal(n, 10)}`, `In die Lücke gehört ${n}.`],
    bugs: bugList(n, [['alle-punkte', n * 10, 'Das ist das Ergebnis. Wie oft steht die 10 da?']]),
    praise: 'Du hast die Zehner als Malaufgabe erkannt.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk: KMK,
  };
}

/** Which task has this result? With mal 10 or with mal 1. Found by comparing, so it carries no factKey. */
function ergebnisWaehlen(rng: Rng, n: number, k: 10 | 1, ab: Ab, stufe: Stufe): ExerciseBody {
  const p = n * k;
  const prompt = `Welche Aufgabe hat das Ergebnis ${p}?`;
  const other = k === 10 ? 1 : 10;
  return {
    key: `ergebnis:${n}x${k}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: mal(n, k) },
      rng.shuffle([
        { label: mal(n, other), whyWrong: `${mal(n, other)} ergibt ${n * other}.` },
        { label: mal(n + 1, k), whyWrong: `${mal(n + 1, k)} ergibt ${(n + 1) * k}.` },
        { label: mal(n - 1, k), whyWrong: `${mal(n - 1, k)} ergibt ${(n - 1) * k}.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Rechne jede Aufgabe im Kopf.', k === 10 ? 'Denk an die Zehner.' : 'Mal 1 ändert die Zahl nicht.'],
    steps: [`${mal(n, k)} = ${p}`, `Die Aufgabe ist ${mal(n, k)}.`],
    praise: 'Du hast die Aufgaben verglichen.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Does this result hold? The wrong results are the typical ones: 7 · 10 = 17, 8 · 1 = 1. */
function stimmtZehnEins(rng: Rng, n: number, k: 10 | 1, ab: Ab): ExerciseBody {
  const p = n * k;
  const wrong = k === 10 ? n + 10 : 1;
  const isTrue = rng.chance(0.4);
  const shown = isTrue ? p : wrong;
  const expression = `${mal(n, k)} = ${shown}`;
  const why = k === 10 ? `${mal(n, 10)} sind ${n} Zehner.` : 'Mal 1 ändert die Zahl nicht.';
  return {
    key: `stimmt:${n}x${k}:${shown}`,
    ab,
    prompt: 'Stimmt das?',
    expression,
    answer: stimmtAnswer(rng, isTrue, why),
    hints: [k === 10 ? 'Denk an die Zehner.' : `${mal(n, 1)} heißt ${n}-mal die 1.`, 'Rechne die Aufgabe selbst.'],
    steps: [why, `${mal(n, k)} = ${p}`, isTrue ? 'Das stimmt.' : 'Das stimmt nicht.'],
    praise: 'Du hast das Ergebnis geprüft.',
    srText: sr('Stimmt das?', expression),
    kmk: KMK,
  };
}

function verdoppeln(n: number, ab: Ab, picture: boolean): ExerciseBody {
  const expression = `${n} + ${n} = 2 · ${n} = ${BOX}`;
  return {
    key: `verdoppeln:${n}`,
    ab,
    prompt: `Verdopple ${n}.`,
    expression,
    ...(picture ? { visual: feld(2, n) } : {}),
    answer: { kind: 'number', value: 2 * n, label: 'Ergebnis' },
    hints: ['Verdoppeln heißt: noch einmal so viel.', `Rechne ${n} + ${n}.`],
    steps: [`Verdoppeln heißt: ${n} + ${n}.`, `${mal(2, n)} = ${2 * n}`],
    bugs: bugList(2 * n, [
      ['mal-als-plus', n + 2, `${mal(2, n)} heißt 2-mal die ${n}: ${n} + ${n}.`],
      ['halbiert-statt-verdoppelt', n % 2 === 0 ? n / 2 : null, 'Mal 2 heißt verdoppeln, nicht halbieren.'],
    ]),
    praise: 'Du hast die Zahl verdoppelt.',
    srText: sr(`Verdopple ${n}.`, expression),
    kmk: KMK,
  };
}

/** Which sum is 2 · n? */
function doppelWahl(rng: Rng, n: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = `Welche Plusaufgabe passt zu ${mal(2, n)}?`;
  return {
    key: `doppel-wahl:${n}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: `${n} + ${n}` },
      rng.shuffle([
        { label: `2 + ${n}`, whyWrong: `${mal(2, n)} heißt 2-mal die ${n}.` },
        { label: `${n} + ${n} + ${n}`, whyWrong: `Hier ist eine ${n} zu viel.` },
        { label: '2 + 2', whyWrong: `${mal(2, n)} heißt 2-mal die ${n}, nicht ${n}-mal die 2.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: [`${mal(2, n)} heißt 2-mal die ${n}.`, 'Mal 2 heißt verdoppeln.'],
    steps: ['Mal 2 heißt verdoppeln.', `${mal(2, n)} = ${n} + ${n}`],
    praise: 'Du hast das Verdoppeln als mal 2 erkannt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Double, then double the result: a form with more steps inside mal 2. */
function doppelKette(n: number, ab: Ab): ExerciseBody {
  const once = 2 * n;
  const twice = 4 * n;
  const fields: MultiField[] = [
    { id: 'einmal', value: once, before: 'Zuerst:', label: 'Das Doppelte' },
    { id: 'zweimal', value: twice, before: 'Danach:', label: 'Noch einmal das Doppelte' },
  ];
  const prompt = `Verdopple ${n}. Verdopple das Ergebnis noch einmal.`;
  return {
    key: `doppel-kette:${n}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [`Rechne zuerst ${n} + ${n}.`, 'Rechne dann dein Ergebnis plus dein Ergebnis.'],
    steps: [`${n} + ${n} = ${once}`, `${once} + ${once} = ${twice}`, `Die Zahlen sind ${once} und ${twice}.`],
    bugs: multiBugs(
      [
        { id: 'ergebnis-statt-zahl', match: { einmal: once, zweimal: once }, hint: 'Verdopple dein Ergebnis noch einmal.' },
        { id: 'halbiert-statt-verdoppelt', match: { einmal: once, zweimal: n }, hint: 'Mal 2 heißt verdoppeln, nicht halbieren.' },
      ],
      fields,
    ),
    praise: 'Du hast zweimal nacheinander verdoppelt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Does this line hold? The wrong forms are 2 · 8 = 10 and 8 + 2 = 2 · 8: plus instead of doubling. */
function stimmtDoppel(rng: Rng, n: number, ab: Ab): ExerciseBody {
  const form = rng.pick(['ja', 'plus-ergebnis', 'plus-aufgabe'] as const);
  const expression = { ja: `${n} + ${n} = ${mal(2, n)}`, 'plus-ergebnis': `${mal(2, n)} = ${n + 2}`, 'plus-aufgabe': `${n} + 2 = ${mal(2, n)}` }[form];
  const isTrue = form === 'ja';
  return {
    key: `stimmt-doppel:${form}:${n}`,
    ab,
    prompt: 'Stimmt das?',
    expression,
    answer: stimmtAnswer(rng, isTrue, isTrue ? `2-mal die ${n} heißt ${n} + ${n}.` : `${mal(2, n)} heißt ${n} + ${n}, nicht ${n} + 2.`),
    hints: [`${mal(2, n)} heißt 2-mal die ${n}.`, 'Mal 2 heißt verdoppeln.'],
    steps: [`${mal(2, n)} heißt ${n} + ${n}.`, `${mal(2, n)} = ${2 * n}`, isTrue ? 'Das stimmt.' : 'Das stimmt nicht.'],
    praise: 'Du hast das Verdoppeln geprüft.',
    srText: sr('Stimmt das?', expression),
    kmk: KMK,
  };
}

/** Two gaps of mal 2 and mal 10 side by side. */
function lueckenPaar(q2: number, q10: number, ab: Ab): ExerciseBody {
  const fields: MultiField[] = [
    { id: 'zwei', value: q2, after: `· 2 = ${q2 * 2}`, label: 'Erste Lücke' },
    { id: 'zehn', value: q10, after: `· 10 = ${q10 * 10}`, label: 'Zweite Lücke' },
  ];
  const prompt = 'Fülle beide Lücken.';
  return {
    key: `paar:${q2}:${q10}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [`Wie oft passt die 2 in ${q2 * 2}?`, `Wie oft passt die 10 in ${q10 * 10}?`],
    steps: [`${mal(q2, 2)} = ${q2 * 2}`, `${mal(q10, 10)} = ${q10 * 10}`, `Die Zahlen sind ${q2} und ${q10}.`],
    bugs: multiBugs(
      [
        { id: 'ergebnis-nochmal-mal', match: { zwei: q2 * 4, zehn: q10 * 100 }, hint: 'Das Ergebnis steht schon da. Gesucht ist die erste Zahl.' },
        { id: 'minus-statt-mal', match: { zwei: q2 * 2 - 2 }, hint: `Minus passt hier nicht. Wie oft passt die 2 in ${q2 * 2}?` },
      ],
      fields,
    ),
    praise: 'Du hast beide Lücken mit mal gefunden.',
    srText: sr(prompt, `${BOX} · 2 = ${q2 * 2}.`, `${BOX} · 10 = ${q10 * 10}.`),
    kmk: KMK,
  };
}

/** The missing factor in a story: socks in pairs, pens in packs. */
function lueckeGeschichte(rng: Rng, n: number, k: 2 | 10, ab: Ab): ExerciseBody {
  const p = n * k;
  const name = rng.pick(['Lea', 'Tom', 'Mia', 'Ben']);
  const story = k === 2
    ? { context: `Ein Paar sind 2 Socken. ${name} hat ${p} Socken.`, prompt: 'Wie viele Paare sind es?', unit: 'Paare' }
    : { context: `In einer Packung sind 10 Stifte. ${name} hat ${p} Stifte.`, prompt: 'Wie viele Packungen sind es?', unit: 'Packungen' };
  return {
    key: `geschichte:${k}:${n}`,
    ab,
    context: story.context,
    prompt: story.prompt,
    answer: { kind: 'number', value: n, before: 'Es sind', after: `${story.unit}.`, label: 'Anzahl' },
    hints: [`Wie oft passt die ${k} in ${p}?`, k === 10 ? 'Bei mal 10 denkst du an Zehner.' : 'Verdopple und prüfe.'],
    steps: [`Frage: Welche Zahl mal ${k} ergibt ${p}?`, `${mal(n, k)} = ${p}`, `Es sind ${n} ${story.unit}.`],
    bugs: bugList(n, [['minus-statt-mal', p - k, `Minus passt hier nicht. Wie oft passt die ${k} in ${p}?`]]),
    praise: 'Du hast die Lücke in der Geschichte gefunden.',
    srText: sr(story.context, story.prompt),
    kmk: KMK,
  };
}

function malNull(n: number, ab: Ab, nullFirst: boolean): ExerciseBody {
  const [a, b] = nullFirst ? [0, n] : [n, 0];
  const expression = `${mal(a, b)} = ${BOX}`;
  const why = nullFirst ? `0-mal die ${n}: Du nimmst die ${n} gar nicht.` : `${malWort(n, true)} gar nichts bleibt nichts.`;
  const ask = nullFirst ? `0-mal die ${n}: Wie viele sind das?` : `${malWort(n, true)} gar nichts: Wie viel ist das?`;
  return {
    key: `null:${a}x${b}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: { kind: 'number', value: 0, label: 'Ergebnis' },
    hints: [ask],
    steps: [why, `${mal(a, b)} = 0`],
    bugs: bugList(0, [['mal-null', n, why]]),
    praise: 'Du hast an die Null gedacht.',
    srText: sr('Rechne.', expression),
    kmk: KMK,
  };
}

export const mal1210Skill: SkillDef = {
  ...META,
  title: 'Mal 1, 2 und 10',
  description: 'Du merkst dir die Aufgaben mit 1, 2 und 10.',
  stufen: {
    1: 'Mal 10 und mal 1, Zahlen von 1 bis 10',
    2: 'Mal 2 als Verdoppeln, Zahlen von 1 bis 10',
    3: 'Lücken: □ · 2 = 14. Mit Extras: mal 0',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const n = rng.int(1, 10);
    // The Punktefeld of a new fact helps with the most direct form only.
    const recall = (a: number, b: number) => factTask(a, b, ab, KMK, ab === 1 && showDots(rng, stufe, factKeyOf(a, b), ctx) ? feld(a, b) : undefined);
    const body = ((): ExerciseBody => {
      if (stufe === 1) {
        if (ab === 1) return rng.pick(['zehn', 'zehn', 'eins'] as const) === 'zehn' ? recall(n, 10) : recall(1, n);
        if (ab === 2) {
          const kind = rng.pick(['zehn', 'zehn', 'eins', 'plus'] as const);
          if (kind === 'plus') return zehnerPlus(rng.int(2, 5), ab);
          return kind === 'zehn' ? recall(10, n) : recall(n, 1);
        }
        const kind = rng.pick(['zehner', 'wahl', 'stimmt'] as const);
        if (kind === 'zehner') return zehnerZaehlen(rng.int(2, 9), ab);
        const m = rng.int(2, 9);
        const k = rng.chance(0.6) ? 10 : 1;
        return kind === 'wahl' ? ergebnisWaehlen(rng, m, k, ab, stufe) : stimmtZehnEins(rng, m, k, ab);
      }
      if (stufe === 2) {
        if (ab === 1) return rng.chance(0.5) ? recall(2, n) : verdoppeln(rng.int(2, 10), ab, true);
        if (ab === 2) {
          const kind = rng.pick(['fakt', 'fakt', 'wahl', 'bloss'] as const);
          if (kind === 'fakt') return recall(n, 2);
          return kind === 'wahl' ? doppelWahl(rng, rng.int(3, 10), ab, stufe) : verdoppeln(rng.int(6, 10), ab, false);
        }
        return rng.chance(0.5) ? doppelKette(rng.int(2, 10), ab) : stimmtDoppel(rng, rng.int(3, 10), ab);
      }
      // A gap with mal 2 or mal 10. n = k would show its answer (□ · 2 = 4).
      const k = rng.pick([2, 2, 10] as const);
      const q = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => x !== k));
      if (ab === 1) return missingFactorTask(q, k, ab, KMK, true);
      if (ab === 2) return missingFactorTask(q, k, ab, KMK, false);
      if (ctx.extras && rng.chance(0.25)) return malNull(rng.int(1, 10), ab, rng.chance(0.5));
      return rng.chance(0.5) ? lueckeGeschichte(rng, q, k, ab) : lueckenPaar(rng.int(3, 9), rng.int(2, 9), ab);
    })();
    return build(META, stufe, body);
  },
};
