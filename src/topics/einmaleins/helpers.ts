/**
 * Helpers of the topic 'einmaleins': terms, Punktefelder, picture choices and the task forms that several skills share
 * (a fact to recall, a missing number in a fact). A · b always means a-mal die b (docs/research.md §5, F5 in §7.1).
 * Pure functions only.
 */
import { BOX, DIV, TIMES, speak } from '../../core/format';
import type { Ab, Bug, ChoiceAnswer, ChoiceOption, GenContext, Rng, Step, Stufe, Visual } from '../../core/types';
import { factFactors, factKeyOf } from '../../state/facts';
import { bugList, makeChoice, type ExerciseBody } from '../shared';

// ─── Terms and pictures ──────────────────────────────────────────────────────

export const mal = (a: number, b: number): string => `${a} ${TIMES} ${b}`;
export const durch = (p: number, d: number): string => `${p} ${DIV} ${d}`;
/** '4 + 4 + 4' for 3-mal die 4. */
export const plusReihe = (a: number, b: number): string => Array.from({ length: a }, () => String(b)).join(' + ');
/** How often: '3-mal', but 'einmal': read aloud, '1-mal' would be 'eins-mal' (T16). */
export const malWort = (a: number, satzAnfang = false): string => (a === 1 ? (satzAnfang ? 'Einmal' : 'einmal') : `${a}-mal`);
/** The question to 3 · □ = 12, with the groups known. 'Welche Zahl mal 3?' would ask for □ · 3, the other task. */
export const malFrage = (a: number, p: number): string => `${malWort(a, true)} welche Zahl ergibt ${p}?`;

/** Sentence for an array whose sizes only the picture shows, for srText (T16): 'Das Feld hat 3 Reihen mit je 5 Punkten.' Rows and columns are at least 2. */
export const feldSatz = (rows: number, cols: number): string => `Das Feld hat ${rows} Reihen mit je ${cols} Punkten.`;

/** Punktefeld with a gap after 5 rows and columns (Kraft der Fünf). */
export function feld(rows: number, cols: number): Visual {
  const v: Visual = { type: 'dotArray', rows, cols };
  if (rows > 5) v.splitAfterRow = 5;
  if (cols > 5) v.splitAfterCol = 5;
  return v;
}

/** count framed groups of `size` dots. */
export function gruppen(count: number, size: number): Visual {
  return { type: 'dotArray', groups: Array.from({ length: count }, () => size) };
}

/**
 * p loose dots in one frame: a division whose picture leaves the answer open. Rows of d or q would show it, so a row has another length
 * (rows of 5 unless that is d or q). Its groups come with the solution.
 */
export function haufen(p: number, d: number): Visual {
  const perRow = [5, 6, 7].find((n) => n !== d && n !== Math.floor(p / d));
  return { type: 'dotArray', groups: [p], perRow };
}

/** Text for screen readers: the parts of the task with operators and units spelled out. */
export function sr(...parts: (string | undefined)[]): string {
  return speak(parts.filter(Boolean).join(' '));
}

/** Choice between pictures, named 'Bild A', 'Bild B', … after shuffling. The first option is the correct one. */
export function bildChoice(rng: Rng, correct: Visual, wrong: { visual: Visual; whyWrong: string }[]): ChoiceAnswer {
  const pool: ChoiceOption[] = [{ label: '', visual: correct }, ...wrong.map((w) => ({ label: '', visual: w.visual, whyWrong: w.whyWrong }))];
  const shown = rng.shuffle(pool);
  const options = shown.map((o, i) => ({ ...o, label: `Bild ${String.fromCharCode(65 + i)}` }));
  return { kind: 'choice', options, correct: shown.indexOf(pool[0]), layout: 'grid' };
}

/** The right picture of a bildChoice as a worked step, with its name: the worked example shows no options, so 'Bild A' needs its picture here. */
export function bildStep(answer: ChoiceAnswer, text: string): Step {
  const right = answer.options[answer.correct];
  return { text: `${right.label}: ${text}`, visual: right.visual };
}

// ─── Stories with equal groups ───────────────────────────────────────────────

/** A story of a groups with b things each. Short sentences, one number each, everyday places (T7, T12). */
export interface MalStory {
  text: (a: number, b: number) => string;
  /** The things that are counted, in the plural. */
  what: string;
  /** Most things in one group, and most things in all, where more would not fit the place. */
  maxEach?: number;
  maxTotal?: number;
}

export const MAL_STORIES: readonly MalStory[] = [
  { text: (a, b) => `Auf dem Tisch stehen ${a} Teller. Auf jedem Teller liegen ${b} Kekse.`, what: 'Kekse' },
  { text: (a, b) => `In der Klasse stehen ${a} Tische. An jedem Tisch sitzen ${b} Kinder.`, what: 'Kinder', maxEach: 6, maxTotal: 30 },
  { text: (a, b) => `Auf dem Spielplatz stehen ${a} Bänke. Auf jeder Bank sitzen ${b} Kinder.`, what: 'Kinder', maxEach: 5 },
  { text: (a, b) => `Im Laden liegen ${a} Tüten. In jeder Tüte sind ${b} Äpfel.`, what: 'Äpfel' },
  { text: (a, b) => `In der Pause spielen ${a} Gruppen. In jeder Gruppe sind ${b} Kinder.`, what: 'Kinder', maxEach: 6 },
  { text: (a, b) => `Im Regal stehen ${a} Dosen. In jeder Dose sind ${b} Stifte.`, what: 'Stifte' },
];

/** A story in which a groups of b make sense. The stories without limits fit all factors up to 10. */
export function pickMalStory(rng: Rng, a: number, b: number): MalStory {
  return rng.pick(MAL_STORIES.filter((s) => b <= (s.maxEach ?? 10) && a * b <= (s.maxTotal ?? 100)));
}

// ─── Facts: which rule helps, hints, steps, typical errors ───────────────────

/** The easy factor that helps with a · b, in the order of the strategies; 'quadrat' for the squares outside the Kern facts. */
type FactRule = 1 | 10 | 2 | 5 | 'quadrat' | 'anders';

function factRule(a: number, b: number): FactRule {
  for (const k of [1, 10, 2, 5] as const) if (a === k || b === k) return k;
  return a === b ? 'quadrat' : 'anders';
}

/** The other factor of a fact with the easy factor k. */
const partner = (a: number, b: number, k: number) => (a === k ? b : a);

/** The task of mal 10 that mal 5 is half of, with the same first factor: 3 · 5 is half of 3 · 10, 5 · 3 half of 10 · 3 (F5). */
export const zehnAufgabe = (a: number, b: number): string => (a === 5 ? mal(10, b) : mal(a, 10));

/** What 10 · b is called, as it reads: 10 Achter (F5). */
const GRUPPE: Readonly<Record<number, string>> = { 2: 'Zweier', 3: 'Dreier', 4: 'Vierer', 5: 'Fünfer', 6: 'Sechser', 7: 'Siebener', 8: 'Achter', 9: 'Neuner' };

/** n · 10 is n Zehner. 10 · b is 10-mal die b, so its Zehner come from the Tauschaufgabe, and the text says so. */
const zehnerSatz = (a: number, b: number): string => (a === 10 && b !== 10 ? `Tausche: ${mal(b, 10)} sind ${b} Zehner.` : `${mal(a, b)} sind ${a} Zehner.`);

/** How to reach a square outside the Kern facts from easy tasks (first the task, then what follows). */
const SQUARE_ROUTE: Readonly<Record<number, { hint: string; steps: string[] }>> = {
  3: { hint: 'Rechne 2 · 3. Dann kommt noch eine 3 dazu.', steps: ['2 · 3 = 6', '3 · 3 = 6 + 3 = 9'] },
  4: { hint: 'Rechne 2 · 4. Verdopple dann das Ergebnis.', steps: ['2 · 4 = 8', '4 · 4 = 8 + 8 = 16'] },
  6: { hint: 'Rechne 5 · 6. Dann kommt noch eine 6 dazu.', steps: ['5 · 6 = 30', '6 · 6 = 30 + 6 = 36'] },
  7: { hint: 'Rechne 5 · 7 und 2 · 7. Rechne beides zusammen.', steps: ['5 · 7 = 35', '2 · 7 = 14', '7 · 7 = 35 + 14 = 49'] },
  8: { hint: 'Rechne 10 · 8. Nimm dann 2 · 8 weg.', steps: ['10 · 8 = 80', '2 · 8 = 16', '8 · 8 = 80 − 16 = 64'] },
  9: { hint: 'Rechne 10 · 9. Nimm dann eine 9 weg.', steps: ['10 · 9 = 90', '9 · 9 = 90 − 9 = 81'] },
};

export function factHints(a: number, b: number): string[] {
  const rule = factRule(a, b);
  switch (rule) {
    case 1:
      // The result is a number of the task, so a hint names neither of them: '1 · 6 heißt einmal die 6' would state the answer.
      return a === 1 ? ['Mal 1 ändert die Zahl nicht.', 'Du nimmst die Zahl genau einmal.'] : ['Du nimmst immer nur die 1.', 'Mal 1 ändert die Zahl nicht.'];
    case 10:
      return a === 10 && b !== 10 ? [`${mal(a, b)} sind 10 ${GRUPPE[b]}.`, zehnerSatz(a, b)] : ['Bei mal 10 denkst du an Zehner.', `Das sind ${a} Zehner.`];
    case 2:
      // 2 · n is n + n as it stands. n · 2 is n-mal die 2: doubling n takes the Tauschaufgabe, and the text says so.
      return a === 2 ? ['Bei mal 2 verdoppelst du.', `Rechne ${b} + ${b}.`] : [`${mal(a, b)} heißt ${a}-mal die 2.`, `Tausche und verdopple: ${mal(2, a)} heißt ${a} + ${a}.`];
    case 5:
      return [`Rechne zuerst ${zehnAufgabe(a, b)}.`, `${mal(a, b)} ist die Hälfte davon.`];
    case 'quadrat':
      return [`Das ist ${a}-mal die ${a}.`, SQUARE_ROUTE[a].hint];
    default:
      return [`${mal(a, b)} heißt ${a}-mal die ${b}.`];
  }
}

export function factSteps(a: number, b: number): string[] {
  const p = a * b;
  const rule = factRule(a, b);
  switch (rule) {
    case 1:
      return [a === 1 ? `${malWort(1, true)} die ${b} bleibt ${b}.` : `${a}-mal die 1 sind ${a}.`, `${mal(a, b)} = ${p}`];
    case 10:
      return [...(a === 10 && b !== 10 ? [`${mal(a, b)} sind 10 ${GRUPPE[b]}.`] : []), zehnerSatz(a, b), `${mal(a, b)} = ${p}`];
    case 2:
      return [...(a === 2 ? [`Mal 2 heißt verdoppeln: ${b} + ${b}.`] : [`${mal(a, b)} heißt ${a}-mal die 2.`, `Tausche und verdopple: ${mal(2, a)} = ${a} + ${a}`]), `${mal(a, b)} = ${p}`];
    case 5:
      return [`${zehnAufgabe(a, b)} = ${2 * p}`, `Die Hälfte von ${2 * p} ist ${p}.`, `${mal(a, b)} = ${p}`];
    case 'quadrat':
      return [...SQUARE_ROUTE[a].steps];
    default:
      return [`${mal(a, b)} = ${p}`];
  }
}

/** One group more or less: the hint names the task the child reached (docs/research.md §5 nachbar-vergessen). */
export function nachbarCandidates(a: number, b: number): [string, number | null, string][] {
  return [
    ['nachbar-vergessen', a > 1 ? (a - 1) * b : null, `${mal(a - 1, b)} sind ${(a - 1) * b}. Bei ${mal(a, b)} kommt noch eine ${b}.`],
    ['nachbar-zu-viel', a < 10 ? (a + 1) * b : null, `${mal(a + 1, b)} sind ${(a + 1) * b}. Bei ${mal(a, b)} ist es eine ${b} weniger.`],
  ];
}

/** 3 · 4 heißt 3-mal die 4: 4 + 4 + 4 (the sum only while it is short). */
export function malAlsPlusHint(a: number, b: number): string {
  // With a factor 1 the sentence would state the result.
  if (a === 1 || b === 1) return 'Mal 1 ändert die Zahl nicht.';
  return a <= 4 && a > 1 ? `${mal(a, b)} heißt ${a}-mal die ${b}: ${plusReihe(a, b)}.` : `${mal(a, b)} heißt ${malWort(a)} die ${b}.`;
}

export function factBugs(a: number, b: number): Bug[] {
  const p = a * b;
  const rule = factRule(a, b);
  const candidates: [string, number | null, string][] = [];
  if (rule === 1) {
    candidates.push(['mal-eins', 1, a === 1 ? 'Du nimmst die Zahl genau einmal.' : 'Mal 1 ändert die Zahl nicht.']);
  }
  if (rule === 10) {
    const zehner = zehnerSatz(a, b);
    candidates.push(['mal-zehn', a + b, zehner], ['mal-zehn', Number(`${a}${b}`), zehner]);
  }
  if (rule === 2) {
    const other = partner(a, b, 2);
    candidates.push(['halbiert-statt-verdoppelt', other % 2 === 0 ? other / 2 : null, 'Mal 2 heißt verdoppeln, nicht halbieren.']);
  }
  if (rule === 5) {
    candidates.push(['haelfte-vergessen', 2 * p, `Das ist ${zehnAufgabe(a, b)}. Du brauchst die Hälfte davon.`]);
  }
  candidates.push(['mal-als-plus', a + b, malAlsPlusHint(a, b)], ...nachbarCandidates(a, b));
  return bugList(p, candidates);
}

/** Specific praise for a recalled fact: names the strategy (M15). */
export function factPraise(a: number, b: number): string {
  switch (factRule(a, b)) {
    case 1:
      return 'Du hast mal 1 sicher gerechnet.';
    case 10:
      return 'Du hast an die Zehner gedacht.';
    case 2:
      return 'Du hast die Zahl verdoppelt.';
    case 5:
      return 'Du hast die Hälfte von mal 10 genutzt.';
    case 'quadrat':
      return 'Du hast die Quadrataufgabe gerechnet.';
    default:
      return 'Du hast die Malaufgabe gerechnet.';
  }
}

// ─── Shared task forms ───────────────────────────────────────────────────────

/**
 * a · b = □, tracked as a fact when it is one. Facts are always asked at random, never row by row (§7.2).
 * The key names the calculation only: with or without a picture it is the same task, so a sheet or a twin does not repeat it.
 * The picture shows a · b, so it stands by the last step, which names a · b: earlier steps may name an easier task (3 · 10 for 3 · 5).
 */
export function factTask(a: number, b: number, ab: Ab, kmk: string[], visual?: Visual): ExerciseBody {
  const expression = `${mal(a, b)} = ${BOX}`;
  const lines = factSteps(a, b);
  const steps: Step[] = lines.map((text, i) => (visual && i === lines.length - 1 ? { text, visual } : text));
  const body: ExerciseBody = {
    key: `fakt:${a}x${b}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: { kind: 'number', value: a * b, label: 'Ergebnis' },
    hints: factHints(a, b),
    steps,
    bugs: factBugs(a, b),
    praise: factPraise(a, b),
    srText: sr('Rechne.', expression),
    kmk,
  };
  if (visual) body.visual = visual;
  const factKey = factKeyOf(a, b);
  if (factKey) body.factKey = factKey;
  return body;
}

/**
 * □ · known = p or known · □ = p: a missing number in a fact, found with a Malaufgabe. `resultFirst` turns the equation round (35 = □ · 5).
 * Callers leave out q = known and known = 1: the task would show its own answer.
 */
export function missingFactorTask(q: number, known: number, ab: Ab, kmk: string[], unknownFirst: boolean, resultFirst = false): ExerciseBody {
  const p = q * known;
  const task = (x: number | string) => (unknownFirst ? `${x} ${TIMES} ${known}` : `${known} ${TIMES} ${x}`);
  const expression = resultFirst ? `${p} = ${task(BOX)}` : `${task(BOX)} = ${p}`;
  // A try that is not the answer and starts from an easy task; mal 10 needs no try, and a gap of 1 is seen in the result.
  const trial = q === 5 ? 2 : 5;
  const ask = unknownFirst ? `Wie oft passt die ${known} in ${p}?` : malFrage(known, p);
  const second = q === 1 ? `Das Ergebnis ist genau die ${known}.` : known === 10 ? 'Bei mal 10 denkst du an Zehner.' : `Probiere ${task(trial)}. Ist das zu wenig oder zu viel?`;
  const body: ExerciseBody = {
    key: `luecke:${unknownFirst ? 'vorn' : 'hinten'}${resultFirst ? '-gedreht' : ''}:${q}x${known}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: q, label: 'Zahl in der Lücke' },
    hints: [ask, second],
    steps: [`Frage: ${unknownFirst ? `Welche Zahl mal ${known} ergibt ${p}?` : ask}`, `${task(q)} = ${p}`, `In die Lücke gehört ${q}.`],
    bugs: bugList(q, [
      ['minus-statt-mal', p - known, `Minus passt hier nicht. ${ask}`],
      ['ergebnis-nochmal-mal', p * known, `${p} ist schon das Ergebnis. ${ask}`],
    ]),
    praise: 'Du hast die passende Malaufgabe gefunden.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk,
  };
  const factKey = unknownFirst ? factKeyOf(q, known) : factKeyOf(known, q);
  if (factKey) body.factKey = factKey;
  return body;
}

const YES = 'Ja, das stimmt.';
const NO = 'Nein, das stimmt nicht.';

/** The answer to 'Stimmt das?', always in the order Ja, Nein. `why` explains the other option. */
export function stimmtAnswer(rng: Rng, isTrue: boolean, why: string): ChoiceAnswer {
  return makeChoice(rng, { label: isTrue ? YES : NO }, [{ label: isTrue ? NO : YES, whyWrong: why }], { order: [YES, NO] });
}

// ─── Review slots ────────────────────────────────────────────────────────────

/** The factors of a fact key in a random allowed order: 7 · 2 and 2 · 7 share '2x7', while 2 · 5 and 5 · 2 are two facts. */
export function factOrder(rng: Rng, key: string): [number, number] {
  const [a, b] = factFactors(key);
  return factKeyOf(b, a) === key && rng.chance(0.5) ? [b, a] : [a, b];
}

/** A plain fact is an easy item: a review slot, which plans no AB level, counts it as AB I. */
export const reviewAb = (ctx: Pick<GenContext, 'ab'>): Ab => ctx.ab ?? 1;

/** A new fact gets its Punktefeld on Stufe 1; a known one is recalled without picture. Without data: sometimes. */
export function showDots(rng: Rng, stufe: Stufe, key: string | undefined, ctx: GenContext): boolean {
  if (stufe !== 1) return false;
  if (!ctx.facts || !key) return rng.chance(0.25);
  const fact = ctx.facts[key];
  return !fact || fact.box === 0;
}
