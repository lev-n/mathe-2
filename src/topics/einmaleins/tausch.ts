/**
 * Tauschaufgaben. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 *
 *        AB I                     AB II                              AB III
 * S1     same result, with field  gap with field; the turned field   two tasks of one field; why it stays the same
 * S2     gap on the right         gap on the left; which swap        which line holds; which line does not
 * S3     2 sides and a result     a changed number; holds or not     why minus does not swap; which of 4 may swap
 *        hold? both results;
 *        which minus works
 *
 * Factors are at most 5 on Stufe 1 (no task without a field), on Stufe 2 one of them is at least 6.
 * A gap in a swap always shows its answer on the other side (□ · 4 = 4 · 7, the catalogue's form): the demand is to see the swap.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX, MINUS } from '../../core/format';
import type { Ab, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, makeChoice, multiBugs, targetAb, type ExerciseBody } from '../shared';
import { bildChoice, bildStep, feld, mal, sr, stimmtAnswer } from './helpers';

const META = { id: 'einmaleins.tausch', topicId: 'einmaleins' } as const;
const KMK = ['ZO.operationen', 'PK.argumentieren'];

const TAUSCH_HINT = 'Die Zahlen tauschen nur den Platz.';

/** Two different factors from min to max. */
function pair(rng: Rng, min: number, max: number): [number, number] {
  const a = rng.int(min, max);
  let b = rng.int(min, max - 1);
  if (b >= a) b += 1;
  return [a, b];
}

/** Two different factors up to 10, one of them at least 6: beyond the range of Stufe 1. */
function pairGross(rng: Rng): [number, number] {
  const big = rng.int(6, 10);
  let other = rng.int(2, 9);
  if (other >= big) other += 1;
  return rng.chance(0.5) ? [big, other] : [other, big];
}

const RECHTS = ['rechts-hinten', 'rechts-vorn'] as const;
const LINKS = ['links-hinten', 'links-vorn'] as const;
const ALLE_PLAETZE = [...RECHTS, ...LINKS] as const;

/** a · b = b · a with one gap: four places for the gap. */
function lueckeTask(rng: Rng, a: number, b: number, ab: Ab, withPicture: boolean, forms: readonly (typeof ALLE_PLAETZE)[number][]): ExerciseBody {
  const form = rng.pick(forms);
  const value = form === 'rechts-hinten' || form === 'links-vorn' ? a : b;
  const shownNext = value === a ? b : a;
  const expression = {
    'rechts-hinten': `${mal(a, b)} = ${b} · ${BOX}`,
    'rechts-vorn': `${mal(a, b)} = ${BOX} · ${a}`,
    'links-hinten': `${a} · ${BOX} = ${mal(b, a)}`,
    'links-vorn': `${BOX} · ${b} = ${mal(b, a)}`,
  }[form];
  const prompt = withPicture ? 'Dreh das Feld im Kopf. Welche Zahl fehlt?' : 'Welche Zahl gehört in die Lücke?';
  return {
    key: `luecke:${form}:${a}x${b}`,
    ab,
    prompt,
    expression,
    ...(withPicture ? { visual: feld(a, b) } : {}),
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: ['Beide Aufgaben haben die gleichen Zahlen.', 'Welche Zahl fehlt noch auf dieser Seite?'],
    steps: [
      { text: `Gedreht sind es ${b} Reihen mit je ${a} Punkten.`, visual: feld(b, a) },
      `Also: ${mal(a, b)} = ${mal(b, a)}`,
      `In die Lücke gehört ${value}.`,
    ],
    bugs: bugList(value, [
      ['gleiche-zahl', shownNext, TAUSCH_HINT],
      ['ergebnis-statt-zahl', a * b, 'In die Lücke kommt eine Zahl der Aufgabe, nicht das Ergebnis.'],
      ['mal-als-plus', a + b, 'Mal bleibt mal. Die Zahlen tauschen nur den Platz.'],
    ]),
    praise: 'Du hast die Zahlen richtig getauscht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

function gleichesErgebnis(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = `Welche Aufgabe hat das gleiche Ergebnis wie ${mal(a, b)}?`;
  return {
    key: `gleiches-ergebnis:${a}x${b}`,
    ab,
    prompt,
    visual: feld(a, b),
    answer: makeChoice(
      rng,
      { label: mal(b, a) },
      rng.shuffle([
        { label: `${a} + ${b}`, whyWrong: 'Das ist Plus. Du suchst eine Malaufgabe.' },
        { label: mal(b, b), whyWrong: `Hier steht zweimal die ${b}. Du brauchst auch die ${a}.` },
        { label: mal(a, a), whyWrong: `Hier steht zweimal die ${a}. Du brauchst auch die ${b}.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Dreh das Punktefeld im Kopf.', TAUSCH_HINT],
    steps: [`${mal(a, b)}: ${a} Reihen mit je ${b} Punkten.`, { text: `${mal(b, a)}: ${b} Reihen mit je ${a} Punkten.`, visual: feld(b, a) }, `Also: ${mal(a, b)} = ${mal(b, a)}`],
    praise: 'Du hast die Tauschaufgabe gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** The turned field among fields with other numbers. */
function gedrehtesFeld(rng: Rng, a: number, b: number, ab: Ab): ExerciseBody {
  const prompt = 'Welches Bild zeigt das Feld gedreht?';
  const answer = bildChoice(rng, feld(b, a), [
    { visual: feld(a, b), whyWrong: 'Dieses Feld ist noch nicht gedreht.' },
    { visual: feld(b + 1, a), whyWrong: 'Hier ist eine Reihe zu viel. Beim Drehen bleiben alle Punkte.' },
  ]);
  return {
    key: `gedreht:${a}x${b}`,
    ab,
    prompt,
    visual: feld(a, b),
    answer,
    hints: ['Dreh das Punktefeld im Kopf.', 'Aus Reihen werden Spalten.'],
    steps: [`Das Feld hat ${a} Reihen mit je ${b} Punkten.`, bildStep(answer, `${b} Reihen mit je ${a} Punkten.`)],
    praise: 'Du hast das Feld im Kopf gedreht.',
    srText: sr(`Das Feld hat ${a} Reihen mit je ${b} Punkten.`, prompt),
    kmk: KMK,
  };
}

/** One field, two tasks. */
function zweiAufgaben(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = 'Welche 2 Aufgaben zeigt das Feld?';
  const right = `${mal(a, b)} und ${mal(b, a)}`;
  return {
    key: `zwei-aufgaben:${a}x${b}`,
    ab,
    prompt,
    visual: feld(a, b),
    answer: makeChoice(
      rng,
      { label: right },
      rng.shuffle([
        { label: `${mal(a, b)} und ${a} + ${b}`, whyWrong: 'Plus passt hier nicht. Alle Reihen sind gleich lang.' },
        { label: `${mal(a, a)} und ${mal(b, b)}`, whyWrong: 'Beide Aufgaben haben die gleichen 2 Zahlen.' },
        { label: `${mal(a + 1, b)} und ${mal(b, a + 1)}`, whyWrong: `Schau auf die Reihen. Es sind nicht ${a + 1} Reihen.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Schau auf die Reihen, dann auf die Spalten.', TAUSCH_HINT],
    steps: [`${mal(a, b)}: ${a} Reihen mit je ${b} Punkten.`, { text: `${mal(b, a)}: gedreht ${b} Reihen mit je ${a} Punkten.`, visual: feld(b, a) }, `Das Feld zeigt ${right}.`],
    praise: 'Du hast im Feld beide Aufgaben gesehen.',
    srText: sr(`Das Feld hat ${a} Reihen mit je ${b} Punkten.`, prompt),
    kmk: KMK,
  };
}

function tauschWaehlen(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = `Welche Tauschaufgabe gehört zu ${mal(a, b)}?`;
  // Really a new number: neither factor of the task, and still up to 10.
  const neu = [b + 1, b - 1, b + 2, b - 2].find((n) => n !== a && n >= 2 && n <= 10)!;
  return {
    key: `waehlen:${a}x${b}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: mal(b, a) },
      rng.shuffle([
        { label: `${b} + ${a}`, whyWrong: 'Das ist Plus. Bei der Tauschaufgabe bleibt mal.' },
        { label: mal(a, neu), whyWrong: 'Hier steht eine neue Zahl. Beim Tauschen bleiben die Zahlen gleich.' },
        { label: mal(b, b), whyWrong: `Hier steht zweimal die ${b}. Du brauchst auch die ${a}.` },
        { label: mal(a, a), whyWrong: `Hier steht zweimal die ${a}. Du brauchst auch die ${b}.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: [TAUSCH_HINT, 'Welche Aufgabe hat die gleichen Zahlen?'],
    steps: [`Die ${a} und die ${b} tauschen den Platz.`, `Tauschaufgabe: ${mal(b, a)}`],
    praise: 'Du hast die Zahlen getauscht.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Which of these lines holds? No picture: the swap has to be seen in the numbers. */
function zeileStimmt(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = 'Welche Aufgabe stimmt?';
  return {
    key: `zeile-stimmt:${a}x${b}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: `${mal(a, b)} = ${mal(b, a)}` },
      rng.shuffle([
        { label: `${mal(a, b)} = ${mal(a, a)}`, whyWrong: `Hier fehlt die ${b}. Beim Tauschen bleiben die Zahlen gleich.` },
        { label: `${mal(a, b)} = ${mal(b, b)}`, whyWrong: `Hier fehlt die ${a}. Beim Tauschen bleiben die Zahlen gleich.` },
        { label: `${mal(a, b)} = ${b} + ${a}`, whyWrong: 'Das ist Plus. Bei der Tauschaufgabe bleibt mal.' },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: [TAUSCH_HINT, 'Welche Seite hat die gleichen Zahlen und das gleiche Zeichen?'],
    steps: [`Die ${a} und die ${b} tauschen den Platz.`, `Es stimmt: ${mal(a, b)} = ${mal(b, a)}`],
    praise: 'Du hast die richtige Tauschaufgabe erkannt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Three swaps hold, one has a new number: this one is asked. */
function zeileNeu(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = 'Welche Aufgabe stimmt nicht?';
  const neu = [b + 1, b - 1, b + 2, b - 2].find((n) => n !== a && n >= 2 && n <= 10)!;
  const line = `${mal(a, b)} = ${mal(neu, a)}`;
  const c = a === 2 ? 3 : a - 1;
  const d = b === 10 ? 9 : b + 1;
  const e = a === 10 ? 9 : a + 1;
  const f = b === 2 ? 3 : b - 1;
  const others = [[c, d], [e, f], [c, f], [e, d]].filter(([x, y]) => x !== y);
  const why = 'Diese Aufgabe stimmt. Die Zahlen tauschen nur den Platz.';
  return {
    key: `zeile-neu:${a}x${b}:${neu}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: line },
      rng.shuffle(others).map(([x, y]) => ({ label: `${mal(x, y)} = ${mal(y, x)}`, whyWrong: why })),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Schau bei jeder Aufgabe: Stehen links und rechts die gleichen Zahlen?', TAUSCH_HINT],
    steps: [`Links stehen die ${a} und die ${b}.`, `Rechts stehen die ${neu} und die ${a}.`, `Das stimmt nicht: ${mal(a, b)} ist nicht ${mal(neu, a)}.`],
    praise: 'Du hast die neue Zahl gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Two different factors of a Kern fact, as a task can ask for its result. */
function kernPair(rng: Rng): [number, number] {
  const kern = rng.pick([2, 5, 10]);
  const other = rng.pick([3, 4, 6, 7, 8, 9]);
  return rng.chance(0.5) ? [kern, other] : [other, kern];
}

/** Both sides and a result, without a field: the swap alone does not decide, as the result can be one group off. */
function stimmtMal(rng: Rng, a: number, b: number, ab: Ab): ExerciseBody {
  const p = a * b;
  const isTrue = rng.chance(0.5);
  const shown = isTrue ? p : rng.chance(0.5) ? p + b : p - b;
  const expression = `${mal(a, b)} = ${mal(b, a)} = ${shown}`;
  return {
    key: `stimmt-mal:${a}x${b}:${shown}`,
    ab,
    prompt: 'Stimmt das?',
    expression,
    answer: stimmtAnswer(rng, isTrue, isTrue ? 'Beide Seiten sind gleich, und auch das Ergebnis passt.' : 'Das Tauschen passt. Prüfe das Ergebnis.'),
    hints: ['Beide Aufgaben haben das gleiche Ergebnis.', 'Rechne die leichtere Aufgabe und vergleiche.'],
    steps: [`${mal(a, b)} = ${p}`, `${mal(b, a)} = ${p}`, isTrue ? 'Das stimmt.' : `Das stimmt nicht: Es sind ${p}.`],
    praise: 'Du hast den Tausch und das Ergebnis geprüft.',
    srText: sr('Stimmt das?', expression),
    kmk: KMK,
  };
}

/** Both orders, both typed: the swap shows in the two results. */
function beideRechnen(a: number, b: number, ab: Ab): ExerciseBody {
  const p = a * b;
  const prompt = 'Rechne beide Aufgaben.';
  const fields: MultiField[] = [
    { id: 'eins', value: p, before: `${mal(a, b)} =`, label: 'Erste Aufgabe' },
    { id: 'zwei', value: p, before: `${mal(b, a)} =`, label: 'Tauschaufgabe' },
  ];
  return {
    key: `beide-rechnen:${a}x${b}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Beide Aufgaben haben das gleiche Ergebnis.', 'Rechne die leichtere Aufgabe zuerst.'],
    steps: [`${mal(a, b)} = ${p}`, `${mal(b, a)} = ${p}`, `Beide Aufgaben ergeben ${p}.`],
    bugs: multiBugs([{ id: 'mal-als-plus', match: { eins: a + b, zwei: a + b }, hint: 'Mal bleibt mal. Die Zahlen tauschen nur den Platz.' }], fields),
    praise: 'Du hast beide Aufgaben gerechnet.',
    srText: sr(prompt, `${mal(a, b)} = ${BOX}.`, `${mal(b, a)} = ${BOX}.`),
    kmk: KMK,
  };
}

/** With minus only one order works, and it has to be found and worked out. */
function minusRechnen(rng: Rng, ab: Ab): ExerciseBody {
  const lo = rng.int(2, 9);
  const value = rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== lo));
  const hi = lo + value;
  const lines = rng.shuffle([`${lo} ${MINUS} ${hi}`, `${hi} ${MINUS} ${lo}`]);
  const expression = `${lines[0]} oder ${lines[1]}`;
  const prompt = 'Nur eine Aufgabe geht. Rechne diese Aufgabe.';
  return {
    key: `minus-rechnen:${hi}-${lo}:${lines[0] === `${hi} ${MINUS} ${lo}` ? 'vorn' : 'hinten'}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, label: 'Ergebnis' },
    hints: ['Bei minus darfst du nicht tauschen.', 'Von welcher Zahl kannst du die andere wegnehmen?'],
    steps: [`${lo} ${MINUS} ${hi} geht nicht: ${lo} ist kleiner als ${hi}.`, `${hi} ${MINUS} ${lo} = ${value}`],
    bugs: bugList(value, [['gleiche-zahl', hi, 'Das ist die größere Zahl. Nimm die kleinere Zahl davon weg.']]),
    praise: 'Du hast die passende Aufgabe gerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

/** With mal, a swap can be wrong too: one number is new, in about half of the items. Without a picture, so 'mal' alone does not decide. */
function stimmtMalNeu(rng: Rng, a: number, b: number, ab: Ab): ExerciseBody {
  const isTrue = rng.chance(0.4);
  const neu = isTrue ? b : [b + 1, b - 1, b + 2, b - 2].find((n) => n !== a && n >= 2 && n <= 10)!;
  const expression = `${mal(a, b)} = ${mal(neu, a)}`;
  return {
    key: `stimmt-neu:${a}x${b}:${neu}`,
    ab,
    prompt: 'Stimmt das?',
    expression,
    answer: stimmtAnswer(rng, isTrue, isTrue ? 'Die Zahlen tauschen nur den Platz. Das stimmt.' : `Hier steht die ${neu}. Beim Tauschen bleiben die Zahlen gleich.`),
    hints: ['Vergleiche die Zahlen links und rechts.', TAUSCH_HINT],
    steps: [`Links stehen die ${a} und die ${b}.`, `Rechts stehen die ${neu} und die ${a}.`, isTrue ? 'Die Zahlen tauschen nur den Platz. Das stimmt.' : `Die Tauschaufgabe heißt ${mal(b, a)}. Das stimmt nicht.`],
    praise: 'Du hast die neue Zahl entdeckt.',
    srText: sr('Stimmt das?', expression),
    kmk: KMK,
  };
}

function stimmtMinus(rng: Rng, a: number, b: number, ab: Ab): ExerciseBody {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  const expression = `${hi} ${MINUS} ${lo} = ${lo} ${MINUS} ${hi}`;
  return {
    key: `stimmt-minus:${hi}-${lo}`,
    ab,
    prompt: 'Stimmt das?',
    expression,
    answer: stimmtAnswer(rng, false, 'Bei minus darfst du nicht tauschen. Nur bei mal und plus.'),
    hints: [`Nimm ${lo} von ${hi} weg. Was bleibt?`, `Kannst du ${hi} von ${lo} wegnehmen?`],
    steps: [`${hi} ${MINUS} ${lo} = ${hi - lo}`, `${lo} ${MINUS} ${hi} geht nicht: ${lo} ist kleiner als ${hi}.`, 'Bei minus darfst du nicht tauschen. Das stimmt nicht.'],
    praise: 'Du hast das Tauschen bei minus geprüft.',
    srText: sr('Stimmt das?', expression),
    kmk: KMK,
  };
}

/** Which line holds? Mal and minus side by side, and the mal line with a new number: the sign alone does not decide. */
function welcheVonVier(rng: Rng, x: number, y: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const [a, b] = [Math.max(x, y), Math.min(x, y)];
  const neu = [b + 1, b - 1, b + 2, b - 2].find((n) => n !== a && n >= 2 && n <= 10)!;
  const prompt = 'Welche Aufgabe stimmt?';
  const why = 'Bei minus darfst du nicht tauschen.';
  return {
    key: `welche-vier:${a}-${b}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: `${mal(a, b)} = ${mal(b, a)}` },
      rng.shuffle([
        { label: `${a} ${MINUS} ${b} = ${b} ${MINUS} ${a}`, whyWrong: why },
        { label: `${a + 1} ${MINUS} ${b} = ${b} ${MINUS} ${a + 1}`, whyWrong: why },
        { label: `${mal(a, b)} = ${mal(neu, a)}`, whyWrong: `Hier steht die ${neu}. Beim Tauschen bleiben die Zahlen gleich.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Schau auf die Rechenzeichen und auf die Zahlen.', 'Bei welchem Zeichen darfst du die Zahlen drehen?'],
    steps: [`${mal(a, b)} = ${mal(b, a)}`, `${b} ${MINUS} ${a} geht nicht: ${b} ist kleiner als ${a}.`, `Es stimmt: ${mal(a, b)} = ${mal(b, a)}`],
    praise: 'Du hast mal und minus verglichen.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** The reason against a swap with minus. */
function warumMinus(rng: Rng, x: number, y: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const [hi, lo] = [Math.max(x, y), Math.min(x, y)];
  const prompt = `Warum darfst du bei ${hi} ${MINUS} ${lo} nicht tauschen?`;
  const why = `Prüfe: ${lo} ${MINUS} ${hi}. Geht das?`;
  return {
    key: `warum-minus:${hi}-${lo}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: `${lo} ${MINUS} ${hi} geht nicht: ${lo} ist kleiner.` },
      [
        { label: 'Bei minus kommt immer mehr heraus.', whyWrong: why },
        { label: `Die ${hi} steht schon vorne.`, whyWrong: why },
        { label: 'Minus und mal sind das Gleiche.', whyWrong: why },
      ],
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: [`Nimm ${lo} von ${hi} weg. Was bleibt?`, `Kannst du ${hi} von ${lo} wegnehmen?`],
    steps: [`${hi} ${MINUS} ${lo} = ${hi - lo}`, `${lo} ${MINUS} ${hi} geht nicht: ${lo} ist kleiner als ${hi}.`, 'Bei minus darfst du nicht tauschen.'],
    praise: 'Du hast den Grund bei minus gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

function warumGleich(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = `Warum ist ${mal(a, b)} so viel wie ${mal(b, a)}?`;
  const why = 'Schau auf das Feld und dreh es im Kopf.';
  return {
    key: `warum:${a}x${b}`,
    ab,
    prompt,
    visual: feld(a, b),
    answer: makeChoice(
      rng,
      { label: 'Das Feld ist nur gedreht.' },
      [
        { label: `Die ${Math.max(a, b)} ist die größere Zahl.`, whyWrong: why },
        { label: 'Mal ist immer mehr als plus.', whyWrong: why },
        { label: 'Beide Aufgaben haben das Zeichen plus.', whyWrong: 'Beide Aufgaben haben das Zeichen mal.' },
      ],
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Dreh das Punktefeld im Kopf.', 'Kommen dabei Punkte dazu oder weg?'],
    steps: [`${mal(a, b)}: ${a} Reihen mit je ${b} Punkten.`, { text: `Gedreht: ${b} Reihen mit je ${a} Punkten.`, visual: feld(b, a) }, 'Das Feld ist nur gedreht.'],
    praise: 'Du hast den Grund im Punktefeld gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

export const tauschSkill: SkillDef = {
  ...META,
  title: 'Tauschaufgaben',
  description: 'Du tauschst die Zahlen und das Ergebnis bleibt gleich.',
  stufen: {
    1: 'Gedrehte Punktefelder: 3 · 5 = 5 · 3, Zahlen bis 5',
    2: 'Lücken: □ · 4 = 4 · 7, Zahlen bis 10',
    3: 'Stimmt das? Tauschen bei mal und bei minus',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const body = ((): ExerciseBody => {
      if (stufe === 1) {
        const [a, b] = pair(rng, 2, 5);
        if (ab === 1) return gleichesErgebnis(rng, a, b, ab, stufe);
        if (ab === 2) return rng.chance(0.5) ? lueckeTask(rng, a, b, ab, true, ALLE_PLAETZE) : gedrehtesFeld(rng, a, b, ab);
        return rng.chance(0.5) ? zweiAufgaben(rng, a, b, ab, stufe) : warumGleich(rng, a, b, ab, stufe);
      }
      if (stufe === 2) {
        const [a, b] = pairGross(rng);
        if (ab === 1) return lueckeTask(rng, a, b, ab, false, RECHTS);
        if (ab === 2) return rng.chance(0.6) ? lueckeTask(rng, a, b, ab, false, LINKS) : tauschWaehlen(rng, a, b, ab, stufe);
        return rng.chance(0.5) ? zeileStimmt(rng, a, b, ab, stufe) : zeileNeu(rng, a, b, ab, stufe);
      }
      const [a, b] = pair(rng, 2, 10);
      if (ab === 1) {
        const kind = rng.pick(['mal', 'beide', 'minus'] as const);
        if (kind === 'minus') return minusRechnen(rng, ab);
        const [x, y] = kernPair(rng);
        return kind === 'mal' ? stimmtMal(rng, x, y, ab) : beideRechnen(x, y, ab);
      }
      if (ab === 2) return rng.chance(0.5) ? stimmtMalNeu(rng, a, b, ab) : stimmtMinus(rng, a + 10, b, ab);
      return rng.chance(0.5) ? warumMinus(rng, a, b, ab, stufe) : welcheVonVier(rng, a, b, ab, stufe);
    })();
    return build(META, stufe, body);
  },
};
