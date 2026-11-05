/**
 * Malaufgaben verstehen. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 *
 *        AB I                          AB II                                AB III
 * S1     dots in groups: 3 · 4 = □     plus and mal: which sum, how often   □ + □ + □ = 12; does 3 · 4 = 4 + 4 hold?
 * S2     field to Malaufgabe           the same with near options; 7 · 5    Malaufgabe to field; rows and all dots to one row
 *        (a turned field or task is never a wrong option: the same field shows both, einmaleins.tausch)
 * S3     story to Rechnung; unequal    story with the groups last; story    Malaufgabe to story; picture with wrong numbers
 *        picture does not fit          to compute; picture that fits
 *
 * Factors are at most 5 on Stufe 1; on Stufe 2 one of them is at least 6.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX } from '../../core/format';
import type { Ab, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, makeChoice, plural, targetAb, type ExerciseBody } from '../shared';
import { bildChoice, bildStep, feld, feldSatz, gruppen, mal, malAlsPlusHint, malFrage, malWort, pickMalStory, plusReihe, sr, stimmtAnswer } from './helpers';

const META = { id: 'einmaleins.mal-verstehen', topicId: 'einmaleins' } as const;
const KMK = ['ZO.operationen', 'PK.darstellen'];

/** Bugs of "a groups with b things": mal-als-plus and one group or row forgotten. */
function gruppenBugs(a: number, b: number, what = 'Gruppen') {
  return bugList(a * b, [
    ['mal-als-plus', a + b, malAlsPlusHint(a, b)],
    ['gruppe-vergessen', (a - 1) * b, `Das sind nur ${malWort(a - 1)} die ${b}. Nimm alle ${a} ${what}.`],
  ]);
}

// ─── Stufe 1: equal groups, factors ≤ 5 ──────────────────────────────────────

function gruppenRechnen(a: number, b: number, ab: Ab): ExerciseBody {
  const expression = `${mal(a, b)} = ${BOX}`;
  return {
    key: `gruppen:${a}x${b}`,
    ab,
    prompt: 'Wie viele Punkte sind es?',
    expression,
    visual: gruppen(a, b),
    answer: { kind: 'number', value: a * b, label: 'Anzahl der Punkte' },
    hints: [`Das sind ${a} Gruppen mit je ${b} Punkten.`, `Rechne ${plusReihe(a, b)}.`],
    steps: [`${a} Gruppen mit je ${b} Punkten.`, `${mal(a, b)} = ${plusReihe(a, b)}`, `${plusReihe(a, b)} = ${a * b}`],
    bugs: gruppenBugs(a, b),
    praise: 'Du hast gleich große Gruppen plus gerechnet.',
    srText: sr('Wie viele Punkte sind es?', expression),
    kmk: KMK,
  };
}

/** No picture with the task: its frames and its aria-label would give the number of groups. */
function plusZuMal(a: number, b: number, ab: Ab): ExerciseBody {
  const expression = `${plusReihe(a, b)} = ${BOX} · ${b}`;
  return {
    key: `plus-zu-mal:${a}x${b}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: a, label: 'Zahl in der Lücke' },
    hints: [`Wie oft steht die ${b} da?`, 'Das ist die erste Zahl der Malaufgabe.'],
    steps: [{ text: `Die ${b} steht ${a}-mal da.`, visual: gruppen(a, b) }, `${plusReihe(a, b)} = ${mal(a, b)}`, `In die Lücke gehört ${a}.`],
    bugs: bugList(a, [
      ['ergebnis-statt-anzahl', a * b, `Das ist das Ergebnis. Wie oft steht die ${b} da?`],
      ['gleiche-zahl', b, `Die ${b} steht schon da. Wie oft steht die ${b} da?`],
    ]),
    praise: 'Du hast die Plusaufgabe als Malaufgabe erkannt.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk: KMK,
  };
}

function malZuPlus(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const prompt = `Welche Plusaufgabe passt zu ${mal(a, b)}?`;
  const wrongs = rng.shuffle([
    { label: `${a} + ${b}`, whyWrong: `${mal(a, b)} heißt ${a}-mal die ${b}.` },
    ...(a >= 3 ? [{ label: plusReihe(a - 1, b), whyWrong: `Hier fehlt noch eine ${b}.` }] : []),
    { label: plusReihe(a + 1, b), whyWrong: `Hier ist eine ${b} zu viel.` },
    { label: plusReihe(a, b + 1), whyWrong: `Hier steht die ${b + 1}. Du brauchst die ${b}.` },
  ]);
  return {
    key: `mal-zu-plus:${a}x${b}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: plusReihe(a, b) }, wrongs, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: [`${mal(a, b)} heißt ${a}-mal die ${b}.`, `Wie oft muss die ${b} dastehen?`],
    steps: [`${mal(a, b)} heißt ${a}-mal die ${b}.`, `${mal(a, b)} = ${plusReihe(a, b)}`],
    praise: 'Du hast mal als gleiche Plusaufgaben erkannt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** □ + □ + □ = 12: the sum read backwards. */
function summeRueckwaerts(a: number, b: number, ab: Ab): ExerciseBody {
  const p = a * b;
  const prompt = 'In allen Lücken steht die gleiche Zahl. Welche Zahl?';
  const expression = `${Array.from({ length: a }, () => BOX).join(' + ')} = ${p}`;
  return {
    key: `summe-rueck:${a}x${b}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: b, label: 'Zahl in den Lücken' },
    hints: [malFrage(a, p), 'Probiere eine Zahl aus.'],
    steps: [`Frage: ${malFrage(a, p)}`, `${mal(a, b)} = ${p}`, `In die Lücken gehört ${b}.`],
    bugs: bugList(b, [
      ['gleiche-zahl', a, `${a} Lücken sind es. Welche Zahl steht in jeder Lücke?`],
      ['ergebnis-statt-anzahl', p, 'Das ist das Ergebnis. Gesucht ist die Zahl in einer Lücke.'],
    ]),
    praise: 'Du hast die Plusaufgabe rückwärts gelöst.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

/** Does 3 · 4 = 4 + 4 hold? The sum is right, or one number too short, or a plus of the two numbers. */
function stimmtPlus(rng: Rng, a: number, b: number, ab: Ab): ExerciseBody {
  const variants = [
    { id: 'ja', sum: plusReihe(a, b), why: `Das stimmt: Die ${b} steht ${a}-mal da.` },
    { id: 'ja', sum: plusReihe(a, b), why: `Das stimmt: Die ${b} steht ${a}-mal da.` },
    ...(a >= 3 ? [{ id: 'kurz', sum: plusReihe(a - 1, b), why: `Hier fehlt noch eine ${b}.` }] : []),
    { id: 'zu-lang', sum: plusReihe(a + 1, b), why: `Hier ist eine ${b} zu viel.` },
    ...(a + b !== a * b ? [{ id: 'plus', sum: `${a} + ${b}`, why: `${mal(a, b)} heißt ${a}-mal die ${b}.` }] : []),
  ];
  const v = rng.pick(variants);
  const isTrue = v.id === 'ja';
  const expression = `${mal(a, b)} = ${v.sum}`;
  return {
    key: `stimmt:${v.id}:${a}x${b}`,
    ab,
    prompt: 'Stimmt das?',
    expression,
    answer: stimmtAnswer(rng, isTrue, v.why),
    hints: [`${mal(a, b)} heißt ${a}-mal die ${b}.`, `Wie oft muss die ${b} dastehen?`],
    steps: [`${mal(a, b)} heißt ${a}-mal die ${b}.`, `${mal(a, b)} = ${plusReihe(a, b)}`, isTrue ? 'Das stimmt.' : 'Das stimmt nicht.'],
    praise: 'Du hast die Aufgabe genau geprüft.',
    srText: sr('Stimmt das?', expression),
    kmk: KMK,
  };
}

// ─── Stufe 2: dot arrays, factors ≤ 10 ───────────────────────────────────────

/** `near`: the options are one row or one dot off; otherwise they are far from the field. Never b · a: the same field shows it too. */
function feldZuMal(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe, near: boolean): ExerciseBody {
  const wrongs = near
    ? rng.shuffle([
        ...(a < 10 ? [{ label: mal(a + 1, b), whyWrong: 'Schau auf die Reihen. Das ist eine Reihe zu viel.' }] : []),
        ...(a > 2 ? [{ label: mal(a - 1, b), whyWrong: 'Schau auf die Reihen. Hier fehlt eine Reihe.' }] : []),
        ...(b < 10 ? [{ label: mal(a, b + 1), whyWrong: 'Schau in eine Reihe. Das ist ein Punkt zu viel.' }] : []),
        ...(b > 2 ? [{ label: mal(a, b - 1), whyWrong: 'Schau in eine Reihe. Hier fehlt ein Punkt.' }] : []),
      ])
    : rng.shuffle([
        { label: `${a} + ${b}`, whyWrong: 'Plus passt hier nicht. Alle Reihen sind gleich lang.' },
        { label: mal(a, a), whyWrong: `Schau in eine Reihe. Dort sind nicht ${a} Punkte.` },
        { label: mal(b, b), whyWrong: `Schau auf die Reihen. Es sind nicht ${b} Reihen.` },
      ]);
  return {
    key: `feld-zu-mal:${a}x${b}`,
    ab,
    prompt: 'Welche Malaufgabe passt zum Punktefeld?',
    visual: feld(a, b),
    answer: makeChoice(rng, { label: mal(a, b) }, wrongs, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Wie viele Reihen siehst du?', 'Wie viele Punkte sind in einer Reihe?'],
    steps: [`Das Feld hat ${a} Reihen.`, `In jeder Reihe sind ${b} Punkte.`, `Das ist ${mal(a, b)}.`],
    praise: 'Du hast Reihen und Punkte genau angeschaut.',
    srText: sr(feldSatz(a, b), 'Welche Malaufgabe passt zum Punktefeld?'),
    kmk: KMK,
  };
}

function feldRechnen(a: number, b: number, ab: Ab): ExerciseBody {
  const expression = `${mal(a, b)} = ${BOX}`;
  // feld() puts a gap only into a side longer than 5; a field without gaps has at most 5 rows, so the sum stays short.
  const gaps = (a > 5 ? 1 : 0) + (b > 5 ? 1 : 0);
  return {
    key: `feld-rechnen:${a}x${b}`,
    ab,
    prompt: 'Wie viele Punkte sind es?',
    expression,
    visual: feld(a, b),
    answer: { kind: 'number', value: a * b, label: 'Anzahl der Punkte' },
    hints: [`Das sind ${a} Reihen mit je ${b} Punkten.`, gaps > 0 ? `Nutze die ${plural(gaps, 'Lücke', 'Lücken')} im Feld.` : `Rechne ${plusReihe(a, b)}.`],
    steps: [`${a} Reihen mit je ${b} Punkten.`, `${mal(a, b)} = ${a * b}`],
    bugs: gruppenBugs(a, b, 'Reihen'),
    praise: 'Du hast die Reihen plus gerechnet.',
    srText: sr('Wie viele Punkte sind es?', expression),
    kmk: KMK,
  };
}

/** The other way round: from the Malaufgabe to its field. Never the turned field: it shows the same number of dots and the Tauschaufgabe. */
function feldWaehlen(rng: Rng, a: number, b: number, ab: Ab): ExerciseBody {
  const prompt = `Welches Punktefeld passt zu ${mal(a, b)}?`;
  const rows = (r: number) => ({ visual: feld(r, b), whyWrong: `Das sind ${r} Reihen.` });
  const cols = (c: number) => ({ visual: feld(a, c), whyWrong: `Hier hat jede Reihe ${c} Punkte.` });
  // grossePaar: with a = 2 the other factor is at least 6, so b - 1 stays a real row.
  const answer = bildChoice(rng, feld(a, b), [
    a < 10 ? rows(a + 1) : rows(a - 1),
    b < 10 ? cols(b + 1) : cols(b - 1),
    a === 10 ? rows(a - 2) : a > 2 ? rows(a - 1) : cols(b - 1),
  ]);
  return {
    key: `feld-waehlen:${a}x${b}`,
    ab,
    prompt,
    answer,
    hints: ['Die erste Zahl zählt die Reihen.', 'Die zweite Zahl zählt die Punkte in einer Reihe.'],
    steps: [`${mal(a, b)} heißt ${a}-mal die ${b}.`, bildStep(answer, `${a} Reihen mit je ${b} Punkten.`)],
    praise: 'Du hast das passende Punktefeld gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Rows and all dots are known, one row is asked. The field comes with the solution: it would show the answer. */
function feldRueckwaerts(a: number, b: number, ab: Ab): ExerciseBody {
  const p = a * b;
  const context = `Ein Punktefeld hat ${a} Reihen und ${p} Punkte.`;
  const prompt = 'Wie viele Punkte hat jede Reihe?';
  return {
    key: `feld-rueck:${a}x${b}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: b, unit: 'Punkte', label: 'Punkte in jeder Reihe' },
    hints: [malFrage(a, p), 'Alle Reihen sind gleich lang.'],
    steps: [`Frage: ${malFrage(a, p)}`, { text: `${mal(a, b)} = ${p}`, visual: feld(a, b) }, `Jede Reihe hat ${b} Punkte.`],
    bugs: bugList(b, [
      ['gleiche-zahl', a, `${a} ist die Zahl der Reihen. Wie lang ist eine Reihe?`],
      ['ergebnis-statt-anzahl', p, 'Das sind alle Punkte. Gesucht ist nur eine Reihe.'],
    ]),
    praise: 'Du hast vom Ergebnis auf die Reihe geschlossen.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
}

// ─── Stufe 3: which picture, stories ─────────────────────────────────────────

function bildPasstNicht(rng: Rng, a: number, b: number, ab: Ab): ExerciseBody {
  const prompt = `Welches Bild passt nicht zu ${mal(a, b)}?`;
  const ungleich = Array.from({ length: a }, (_, i) => b + (i === 0 ? 1 : i === a - 1 ? -1 : 0));
  const answer = bildChoice(rng, { type: 'dotArray', groups: ungleich }, [
    { visual: gruppen(a, b), whyWrong: `Dieses Bild passt: ${a} Gruppen mit je ${b} Punkten.` },
    { visual: feld(a, b), whyWrong: `Dieses Bild passt: ${a} Reihen mit je ${b} Punkten.` },
  ]);
  return {
    key: `passt-nicht:${a}x${b}`,
    ab,
    prompt,
    answer,
    hints: ['Mal geht nur bei gleich großen Gruppen.', 'Suche Gruppen mit verschieden vielen Punkten.'],
    steps: ['Mal geht nur bei gleich großen Gruppen.', bildStep(answer, 'Die Gruppen sind nicht gleich groß.'), `Dieses Bild passt nicht zu ${mal(a, b)}.`],
    praise: 'Du hast die ungleichen Gruppen gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Harder: all groups are equal, the picture that does not fit has one group or one dot too many. */
function bildFalscheZahl(rng: Rng, a: number, b: number, ab: Ab): ExerciseBody {
  const prompt = `Welches Bild passt nicht zu ${mal(a, b)}?`;
  const moreGroups = rng.chance(0.5);
  const falsch = moreGroups ? gruppen(a + 1, b) : gruppen(a, b + 1);
  const answer = bildChoice(rng, falsch, [
    { visual: gruppen(a, b), whyWrong: `Dieses Bild passt: ${a} Gruppen mit je ${b} Punkten.` },
    { visual: feld(a, b), whyWrong: `Dieses Bild passt: ${a} Reihen mit je ${b} Punkten.` },
  ]);
  return {
    key: `passt-nicht-zahl:${moreGroups ? 'gruppe' : 'punkt'}:${a}x${b}`,
    ab,
    prompt,
    answer,
    hints: [`${mal(a, b)} heißt ${a}-mal die ${b}.`, 'Prüfe in jedem Bild die Gruppen und die Punkte.'],
    steps: [`Gesucht: ${a} Gruppen mit je ${b} Punkten.`, bildStep(answer, moreGroups ? `Das sind ${a + 1} Gruppen.` : `Hier hat jede Gruppe ${b + 1} Punkte.`), `Dieses Bild passt nicht zu ${mal(a, b)}.`],
    praise: 'Du hast Gruppen und Punkte genau geprüft.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

function bildMitMal(rng: Rng, a: number, b: number, ab: Ab): ExerciseBody {
  const prompt = 'Zu welchem Bild passt eine Malaufgabe?';
  const ungleich = (first: number) => Array.from({ length: a }, (_, i) => b + (i === 0 ? first : i === a - 1 ? -first : 0));
  const why = 'Mal geht nur bei gleich großen Gruppen.';
  const answer = bildChoice(rng, gruppen(a, b), [
    { visual: { type: 'dotArray', groups: ungleich(1) }, whyWrong: why },
    { visual: { type: 'dotArray', groups: [...ungleich(-1), b + 2] }, whyWrong: why },
  ]);
  return {
    key: `bild-mit-mal:${a}x${b}`,
    ab,
    prompt,
    answer,
    hints: [why, 'Schau: Sind in jeder Gruppe gleich viele Punkte?'],
    steps: [why, bildStep(answer, `${a} Gruppen mit je ${b} Punkten.`), `Das ist ${mal(a, b)}.`],
    praise: 'Du hast die gleich großen Gruppen gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** `groupsLast`: 'Auf jedem Teller liegen 4 Kekse. Auf dem Tisch stehen 3 Teller.' The first number is no longer the first factor. */
function storyText(text: string, groupsLast: boolean): string {
  if (!groupsLast) return text;
  const [first, second] = text.split('. ');
  return `${second.replace(/\.$/, '')}. ${first}.`;
}

function geschichteWaehlen(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe, groupsLast: boolean): ExerciseBody {
  const story = pickMalStory(rng, a, b);
  const context = storyText(story.text(a, b), groupsLast);
  const prompt = 'Welche Rechnung passt zur Geschichte?';
  const wrongs = rng.shuffle([
    { label: `${a} + ${b}`, whyWrong: `Plus passt nicht. Es sind ${a} gleich große Gruppen.` },
    ...(a > b ? [{ label: `${a} − ${b}`, whyWrong: 'Hier geht nichts weg. Es sind gleich große Gruppen.' }] : []),
    ...(a !== 2 && a !== b ? [{ label: `${b} + ${b}`, whyWrong: `Das sind nur 2 Gruppen. In der Geschichte sind es ${a}.` }] : []),
    ...(a !== b ? [{ label: mal(a, a), whyWrong: `In jeder Gruppe sind ${b}, nicht ${a}.` }] : []),
  ]);
  return {
    key: `geschichte-waehlen${groupsLast ? '-spaet' : ''}:${a}x${b}:${story.what}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: mal(a, b) }, wrongs, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Wie viele gleich große Gruppen gibt es?', 'Wie viele sind in jeder Gruppe?'],
    steps: [`${a} Gruppen mit je ${b}.`, `Das ist ${mal(a, b)}.`],
    praise: 'Du hast in der Geschichte die Gruppen erkannt.',
    srText: sr(context, prompt),
    kmk: [...KMK, 'PK.modellieren'],
  };
}

function geschichteRechnen(rng: Rng, a: number, b: number, ab: Ab): ExerciseBody {
  const story = pickMalStory(rng, a, b);
  const context = story.text(a, b);
  const prompt = `Wie viele ${story.what} sind es?`;
  return {
    key: `geschichte-rechnen:${a}x${b}:${story.what}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: a * b, before: 'Es sind', after: `${story.what}.`, label: 'Anzahl' },
    hints: [`Das sind ${a} gleich große Gruppen.`, `Rechne ${mal(a, b)}.`],
    steps: [`${a} Gruppen mit je ${b}.`, `${mal(a, b)} = ${a * b}`, `Es sind ${a * b} ${story.what}.`],
    bugs: gruppenBugs(a, b),
    praise: 'Du hast die Geschichte als Malaufgabe gerechnet.',
    srText: sr(context, prompt),
    kmk: [...KMK, 'PK.modellieren'],
  };
}

/** The things of a story from the Malaufgabe: groups, and what is in them in the dative plural. */
const DINGE: readonly { group: string; each: string; eachDativ: string }[] = [
  { group: 'Teller', each: 'Kekse', eachDativ: 'Keksen' },
  { group: 'Tüten', each: 'Äpfel', eachDativ: 'Äpfeln' },
  { group: 'Dosen', each: 'Stifte', eachDativ: 'Stiften' },
];

/** Reversed: the Malaufgabe is given, the story is asked. No option turns the factors: the result of b · a would be right too. */
function geschichteZuMal(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const d = rng.pick(DINGE);
  const prompt = `Welche Geschichte passt zu ${mal(a, b)}?`;
  const richtig = `${a} ${d.group} mit je ${b} ${d.eachDativ}.`;
  return {
    key: `geschichte-zu-mal:${a}x${b}:${d.each}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: richtig },
      rng.shuffle([
        { label: `${a} ${d.each} und noch ${b} ${d.each}.`, whyWrong: `Das ist plus. ${mal(a, b)} heißt ${a}-mal die ${b}.` },
        { label: `${a} ${d.group} mit je ${a} ${d.eachDativ}.`, whyWrong: `In jeder Gruppe sind ${b}, nicht ${a}.` },
        { label: `${b} ${d.group} mit je ${b} ${d.eachDativ}.`, whyWrong: `Es sind ${a} Gruppen, nicht ${b}.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Die erste Zahl zählt die Gruppen.', 'Die zweite Zahl sagt: So viele sind in jeder Gruppe.'],
    steps: [`${mal(a, b)} heißt ${a}-mal die ${b}.`, `Das passt: ${richtig}`],
    praise: 'Du hast zur Malaufgabe die Geschichte gefunden.',
    srText: sr(prompt),
    kmk: [...KMK, 'PK.modellieren'],
  };
}

/** Two factors from 2–10 with an easy partner (2, 5 or 10), so the product comes from the Kern facts. */
function kernPaar(rng: Rng): [number, number] {
  const kern = rng.pick([2, 5, 10]);
  const other = rng.int(2, 9);
  return rng.chance(0.5) ? [kern, other] : [other, kern];
}

/** A Kern pair with one factor of at least 6 and two different factors: the factor asked for is not the one shown. */
function kernPaarGross(rng: Rng): [number, number] {
  const [kern, other] = rng.pick([
    [2, rng.int(6, 9)],
    [5, rng.int(6, 9)],
    [10, rng.int(2, 9)],
  ]);
  return rng.chance(0.5) ? [kern, other] : [other, kern];
}

/** Two different factors up to 10, one of them at least 6: beyond the range of Stufe 1. */
function grossePaar(rng: Rng): [number, number] {
  const big = rng.int(6, 10);
  let other = rng.int(2, 9);
  if (other >= big) other += 1;
  return rng.chance(0.5) ? [big, other] : [other, big];
}

function differentFactors(rng: Rng, min: number, max: number): [number, number] {
  const a = rng.int(min, max);
  let b = rng.int(min, max - 1);
  if (b >= a) b += 1;
  return [a, b];
}

function stufe1(rng: Rng, ab: Ab, stufe: Stufe): ExerciseBody {
  const a = rng.int(2, 5);
  const b = rng.int(2, 5);
  if (ab === 1) return gruppenRechnen(a, b, ab);
  // Two equal numbers would show the answer: 3 + 3 + 3 = □ · 3, and 3-mal welche Zahl for □ + □ + □ = 9.
  const [x, y] = differentFactors(rng, 2, 5);
  if (ab === 2) return rng.chance(0.5) ? plusZuMal(x, y, ab) : malZuPlus(rng, a, b, ab, stufe);
  if (rng.chance(0.5)) return stimmtPlus(rng, a, b, ab);
  const boxes = rng.int(2, 4);
  return summeRueckwaerts(boxes, rng.pick([2, 3, 4, 5].filter((v) => v !== boxes)), ab);
}

function stufe2(rng: Rng, ab: Ab, stufe: Stufe): ExerciseBody {
  if (ab === 1) {
    const [a, b] = grossePaar(rng);
    return feldZuMal(rng, a, b, ab, stufe, false);
  }
  if (ab === 2) {
    if (rng.chance(0.5)) {
      const [a, b] = kernPaarGross(rng);
      return feldRechnen(a, b, ab);
    }
    const [a, b] = grossePaar(rng);
    return feldZuMal(rng, a, b, ab, stufe, true);
  }
  if (rng.chance(0.5)) {
    const [a, b] = kernPaarGross(rng);
    return feldRueckwaerts(a, b, ab);
  }
  const [a, b] = grossePaar(rng);
  return feldWaehlen(rng, a, b, ab);
}

function stufe3(rng: Rng, ab: Ab, stufe: Stufe): ExerciseBody {
  const [a, b] = differentFactors(rng, 2, 10);
  if (ab === 1) return rng.chance(0.5) ? bildPasstNicht(rng, rng.int(3, 5), rng.int(4, 8), ab) : geschichteWaehlen(rng, a, b, ab, stufe, false);
  if (ab === 2) {
    const kind = rng.pick(['bild', 'waehlen', 'rechnen'] as const);
    if (kind === 'bild') return bildMitMal(rng, rng.int(3, 5), rng.int(4, 8), ab);
    if (kind === 'waehlen') return geschichteWaehlen(rng, a, b, ab, stufe, true);
    const [x, y] = kernPaar(rng);
    return geschichteRechnen(rng, x, y, ab);
  }
  return rng.chance(0.5) ? bildFalscheZahl(rng, rng.int(3, 5), rng.int(4, 8), ab) : geschichteZuMal(rng, a, b, ab, stufe);
}

export const malVerstehenSkill: SkillDef = {
  ...META,
  title: 'Malaufgaben verstehen',
  description: 'Du siehst gleich große Gruppen und schreibst eine Malaufgabe.',
  stufen: {
    1: 'Gleich große Gruppen: 3 · 4 = 4 + 4 + 4',
    2: 'Punktefelder als Malaufgabe, Zahlen bis 10',
    3: 'Welches Bild passt nicht? Geschichten als Malaufgabe',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const forms = stufe === 1 ? stufe1 : stufe === 2 ? stufe2 : stufe3;
    return build(META, stufe, forms(rng, ab, stufe));
  },
};
