/**
 * Strichlisten. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1 eine Strichliste lesen, mit Fünferbündeln, bis 20. AB I bis 12, 3 Zeilen. AB II bis 20. AB III die Zeile zu einer Zahl; wie viele Striche fehlen bis zum Bündel.
 * Stufe 2 Bilder oder eine Zahl in Striche übersetzen, bis 30. AB I bis 15. AB II ab 16. AB III von den Bündeln zur Zahl, ab 16; wie viele Striche fehlen bis zum nächsten Bündel; Striche kommen zu einer Liste dazu.
 * Stufe 3 Zeilen vergleichen, alles zusammenzählen, eine verzählte Zeile finden, bis 50. AB I bis 30. AB II bis 50. AB III die verzählte Zeile (Fehlerdetektiv), eine Zeile aus der Summe.
 */
import { fmt } from '../../core/format';
import type { Ab, Exercise, MultiField, PictoIcon, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, multiBugs, pickPerson, targetAb } from '../shared';
import { HINT_DIFF, HINT_MEHR, HINT_PLUS, THEMES, parts, picturesBeside, pickRows, pictureChoice, spacedValues, spoken, sum, valuesText, type DataTheme } from './helpers';

const SKILL = { id: 'daten.strichliste', topicId: 'daten' } as const;
const KMK = ['DZ.daten', 'PK.darstellen'];

/** Largest row or total per Stufe (§6: 20, 30, 50). */
export const CAP: Record<Stufe, number> = { 1: 20, 2: 30, 3: 50 };

const HINT_BUNDLE = '4 Striche und der Querstrich sind zusammen 5.';
const HINT_ONE = 'Ein Bündel zählt nicht 1. 4 Striche und der Querstrich sind 5.';
const HINT_READ = 'Zähle zuerst die Bündel in Fünfern. Dann kommen die einzelnen Striche dazu.';
const HINT_BUNDLES_ONLY = 'Zähle die Bündel in Fünfern.';
const HINT_TEN = 'Ein Bündel hat nur 5 Striche, nicht 10.';
const HINT_ALL = 'Das sind alle Striche. Bündle immer 5 Striche zusammen.';

const bundles = (n: number) => Math.floor(n / 5);
/** A child who counts a bundle as 4 (forgets the Querstrich). */
export const asFour = (n: number) => n - bundles(n);
/** A child who counts a bundle as 1. */
export const asOne = (n: number) => bundles(n) + (n % 5);

function bundleWords(n: number): string {
  const b = bundles(n);
  const s = n % 5;
  const single = s === 1 ? '1 einzelner Strich' : `${fmt(s)} einzelne Striche`;
  return s === 0 ? `${fmt(b)} Bündel` : `${fmt(b)} Bündel und ${single}`;
}

/** 'Das sind 2', 'Das ist 1': the verb follows the number of bundles. */
const dasSind = (n: number) => (bundles(n) === 1 ? 'Das ist' : 'Das sind');
/** 'stehen 3 Bündel', 'steht 1 Bündel' */
const stehen = (n: number) => (bundles(n) === 1 ? 'steht' : 'stehen');

/** How to read these rows: a row that is all bundles has no single strokes to speak of. */
const readHint = (...counts: number[]) => (counts.every((v) => v % 5 === 0) ? HINT_BUNDLES_ONLY : HINT_READ);

/** 'Fünfer' sum of one row: 10 + 3 = 13, or the bundles alone. */
function bundleSum(n: number): string {
  const b = bundles(n);
  const s = n % 5;
  if (s === 0) return `${fmt(b)} Bündel ${b === 1 ? 'ist' : 'sind'} ${fmt(n)} Striche.`;
  return `${fmt(b * 5)} + ${fmt(s)} = ${fmt(n)}`;
}

const tally = (theme: DataTheme, cats: readonly string[], values: readonly number[], labels?: readonly string[]): Visual => ({
  type: 'tally',
  title: theme.title,
  rows: cats.map((c, i) => ({ label: labels ? labels[i] : c, count: values[i] })),
});

/** HINT_BUNDLE names 4 and 5: where one of them is the answer, the hint would state it. */
const bundleHintFits = (answer: number) => answer !== 4 && answer !== 5;

const readBugs = (v: number) =>
  bugList(v, [
    ['strich-buendel-vier', asFour(v), HINT_BUNDLE],
    ['strich-buendel-eins', asOne(v), HINT_ONE],
  ]);

// ─── Stufe 1: lesen ──────────────────────────────────────────────────────────

/** Rows for reading: at least one row with a bundle and some singles or a second bundle. AB I small and 3 rows. */
function readRows(rng: Rng, ab: Ab): { theme: DataTheme; cats: string[]; values: number[] } {
  const n = ab === 1 ? 3 : rng.int(3, 4);
  const values = spacedValues(rng, n, 3, ab === 1 ? 12 : CAP[1]);
  if (Math.max(...values) < 6) values[0] += 5;
  return { ...pickRows(rng, n, Math.max(...values)), values };
}

function lesen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = readRows(rng, ab);
  const t = rng.pick(values.flatMap((v, i) => (v >= 6 ? [i] : [])));
  const [c, v] = [cats[t], values[t]];
  const visual = tally(theme, cats, values);
  const prompt = theme.how(c);
  return build(SKILL, stufe, {
    key: `lesen:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: v, unit: theme.unitOf(c) },
    hints: [`Schau nur in die Zeile ${c}.`, readHint(v)],
    steps: [`Zeile ${c}: ${bundleWords(v)}.`, bundleSum(v), theme.says(c, v)],
    bugs: readBugs(v),
    praise: 'Du hast die Bündel in Fünfern gezählt.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function zeileFinden(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = readRows(rng, ab);
  const t = rng.pick(values.flatMap((v, i) => (v >= 6 ? [i] : [])));
  const [c, v] = [cats[t], values[t]];
  const visual = tally(theme, cats, values);
  const prompt = `Welche Zeile zeigt ${fmt(v)} Striche?`;
  return build(SKILL, stufe, {
    key: `zeile:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: c },
      cats.flatMap((o, i) => (i === t ? [] : [{ label: o, whyWrong: `In dieser Zeile sind es ${fmt(values[i])} Striche.` }])),
    ),
    hints: [readHint(...values), 'Prüfe jede Zeile. Lass keine aus.'],
    steps: [`Zeile ${c}: ${bundleWords(v)}.`, bundleSum(v), `Die Zeile ${c} zeigt ${fmt(v)} Striche.`],
    praise: 'Du hast jede Zeile in Fünfern gezählt.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** How many strokes are missing in this row up to the next full bundle? The row has to be read first. */
function zeileBisBuendel(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  let drawn = readRows(rng, ab);
  while (!drawn.values.some((v) => v >= 6 && v < CAP[1])) drawn = readRows(rng, ab);
  const { theme, cats, values } = drawn;
  const t = rng.pick(values.flatMap((v, i) => (v >= 6 && v < CAP[1] ? [i] : [])));
  const [c, v] = [cats[t], values[t]];
  const goal = (bundles(v) + 1) * 5;
  const d = goal - v;
  const visual = tally(theme, cats, values);
  const context = `In der Zeile ${c} sollen ${fmt(goal)} Striche stehen.`;
  const prompt = 'Wie viele Striche fehlen noch?';
  return build(SKILL, stufe, {
    key: `zeile-fehlt:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value: d, label: 'Anzahl der Striche' },
    hints: [`Schau nur in die Zeile ${c}.`, readHint(v)],
    steps: [`Zeile ${c}: ${bundleWords(v)}.`, bundleSum(v), `${fmt(goal)} − ${fmt(v)} = ${fmt(d)}`],
    bugs: bugList(d, [['strich-buendel-vier', bundleHintFits(d) ? goal - asFour(v) : null, HINT_BUNDLE]]),
    praise: 'Du hast von der Zeile aus weiter gerechnet.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

// ─── Stufe 2: selbst Striche machen ──────────────────────────────────────────

/** AB I up to 15 strokes, from AB II on up to 30. */
const toTally = (rng: Rng, ab: Ab) => (ab === 1 ? rng.int(7, 15) : rng.int(16, CAP[2]));

const PICTURE_NOUN: Partial<Record<PictoIcon, string>> = { stern: 'Sterne', ball: 'Bälle', apfel: 'Äpfel', buch: 'Bücher', herz: 'Herzen' };

/** Pictures per row beside the label 'Reihe 1': every picture stays whole on a phone, since all of them are to be counted. */
export const PICTURES_PER_ROW = picturesBeside(['Reihe 1']);

/** A picture to count: 2 to 4 rows, no bundles visible. */
function picture(rng: Rng, n: number): { icon: PictoIcon; noun: string; visual: Visual } {
  const icon = rng.pick(['stern', 'ball', 'apfel', 'buch', 'herz'] as const);
  const noun = PICTURE_NOUN[icon]!;
  const rows = n > 3 * PICTURES_PER_ROW ? 4 : n > 2 * PICTURES_PER_ROW ? 3 : rng.int(2, 3);
  const values = parts(rng, n, rows, 1, PICTURES_PER_ROW);
  return {
    icon,
    noun,
    visual: { type: 'pictogram', title: `${noun} zählen`, categories: values.map((_, i) => `Reihe ${i + 1}`), values, iconValue: 1, icon, showKey: false },
  };
}

const rowsKey = (v: Visual) => (v.type === 'pictogram' ? v.values.join('-') : '');

function bundleFields(n: number): MultiField[] {
  return [
    { id: 'b', value: bundles(n), after: 'Bündel', label: 'Anzahl der Bündel' },
    { id: 's', value: n % 5, after: 'einzeln', label: 'Anzahl der einzelnen Striche' },
  ];
}

function bundleBugs(n: number, fields: MultiField[]) {
  return multiBugs(
    [
      { id: 'strich-buendel-vier', match: { b: Math.floor(n / 4), s: n % 4 }, hint: HINT_BUNDLE },
      // Below 10 this pattern is 0 bundles and all strokes: a child who did not bundle, with no idea of a bundle of 10.
      n >= 10 && { id: 'strich-buendel-zehn', match: { b: Math.floor(n / 10), s: n % 10 }, hint: HINT_TEN },
      { id: 'strich-summe', match: { b: n, s: 0 }, hint: HINT_ALL },
      { id: 'strich-summe', match: { b: 0, s: n }, hint: HINT_ALL },
    ],
    fields,
  );
}

/** Longest row of the solved Strichliste: TallyVisual keeps room for 4 positions, up to 3 bundles and the single strokes. */
const SOLVED_ROW_MAX = 19;

/**
 * The solved Strichliste inside the steps. A step has 223 px on a 375 px phone and TallyVisual keeps 0.67 of its drawn
 * width, so from 20 strokes on the row goes on below: every bundle that the step names stays in sight.
 */
export function solvedTally(n: number): Visual {
  if (n <= SOLVED_ROW_MAX) return { type: 'tally', rows: [{ label: 'Alle', count: n }] };
  const counts: number[] = [];
  let rest = n;
  for (; rest > SOLVED_ROW_MAX; rest -= 15) counts.push(15);
  counts.push(rest);
  return { type: 'tally', rows: counts.map((count, i) => ({ label: `Reihe ${i + 1}`, count })) };
}

const bundleSplit = (n: number) => (n % 5 === 0 ? `${fmt(n)} ist ${fmt(bundles(n))}-mal die 5.` : `${fmt(n)} ist ${fmt(bundles(n))}-mal die 5 und noch ${fmt(n % 5)}.`);

function bildZuBuendeln(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = toTally(rng, ab);
  const { noun, visual } = picture(rng, n);
  const prompt = 'Zähle alle Bilder. Wie viele Bündel und einzelne Striche sind es?';
  const fields = bundleFields(n);
  return build(SKILL, stufe, {
    key: `bild-buendel:${noun}:${n}:${rowsKey(visual)}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'multi', fields },
    hints: ['Immer 5 Bilder sind ein Bündel.', 'Der Rest sind einzelne Striche.'],
    steps: [
      `Es sind ${fmt(n)} ${noun}.`,
      bundleSplit(n),
      { text: `${dasSind(n)} ${fmt(bundles(n))} Bündel und ${fmt(n % 5)} einzeln.`, visual: solvedTally(n) },
    ],
    bugs: bundleBugs(n, fields),
    praise: 'Du hast die Bilder zu Bündeln gemacht.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function bildZuListe(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = toTally(rng, ab);
  const { noun, visual } = picture(rng, n);
  const prompt = 'Zähle die Bilder. Welche Strichliste passt?';
  const row = (count: number): Visual => ({ type: 'tally', rows: [{ label: noun, count }] });
  const others = rng.sample([n - 1, n + 1, n - 5, n + 5, asFour(n)].filter((w, i, all) => w !== n && w >= 2 && w <= 50 && all.indexOf(w) === i), 2);
  const { answer, labels } = pictureChoice(rng, 'Liste', [
    { visual: row(n) },
    ...others.map((w) => ({ visual: row(w), whyWrong: `Diese Liste zeigt ${fmt(w)} Striche. Zähle zuerst die Bilder.` })),
  ]);
  return build(SKILL, stufe, {
    key: `bild-liste:${noun}:${n}:${others.join('-')}:${rowsKey(visual)}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Zähle zuerst alle Bilder.', 'Mach dann aus je 5 Bildern 1 Bündel.'],
    steps: [`Es sind ${fmt(n)} ${noun}.`, `${dasSind(n)} ${bundleWords(n)}.`, `${labels[0]} passt.`],
    praise: 'Du hast gezählt und die Bündel geprüft.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function zahlZuBuendeln(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = toTally(rng, ab);
  const theme = rng.pick(THEMES.filter((t) => t.unit !== 'Kinder' && t.maxRow >= n));
  const c = rng.pick(theme.cats);
  const { name } = pickPerson(rng);
  const context = `${name} zählt ${fmt(n)} ${c}.`;
  const prompt = `Wie viele Bündel und einzelne Striche macht ${name}?`;
  const fields = bundleFields(n);
  return build(SKILL, stufe, {
    key: `zahl-buendel:${name}:${c}:${n}`,
    ab,
    context,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Immer 5 Striche sind ein Bündel.', 'Zähle in Fünfern, so weit es geht.'],
    steps: [bundleSplit(n), { text: `${dasSind(n)} ${fmt(bundles(n))} Bündel und ${fmt(n % 5)} einzeln.`, visual: solvedTally(n) }],
    bugs: bundleBugs(n, fields),
    praise: 'Du hast immer 5 Striche gebündelt.',
    srText: spoken(undefined, context, prompt),
    kmk: KMK,
  });
}

/** AB III works with the numbers of AB II, and a number with single strokes: the whole bundles would give no rest to think about. Never above the 30 of the Stufe. */
const backwardsNumber = (rng: Rng) => rng.pick(Array.from({ length: CAP[2] - 16 + 1 }, (_, i) => 16 + i).filter((n) => n % 5 !== 0));

/** Backwards: from the bundles to the number, without a picture to count. */
function buendelZuZahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = backwardsNumber(rng);
  const context = `Auf der Liste ${stehen(n)} ${bundleWords(n)}.`;
  const prompt = 'Wie viele Striche sind es zusammen?';
  return build(SKILL, stufe, {
    key: `buendel-zahl:${n}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: n, unit: 'Striche' },
    hints: ['Zähle die Bündel in Fünfern.', 'Die einzelnen Striche kommen dann dazu.'],
    steps: [bundleSplit(n), bundleSum(n), `Es sind ${fmt(n)} Striche.`],
    bugs: readBugs(n),
    praise: 'Du hast von den Bündeln zur Zahl gerechnet.',
    srText: spoken(undefined, context, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** How far to the next bundle? The rest of the division by 5 from the other side. */
function bisBuendel(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = backwardsNumber(rng);
  const theme = rng.pick(THEMES.filter((t) => t.unit !== 'Kinder' && t.maxRow >= n));
  const c = rng.pick(theme.cats);
  const { name } = pickPerson(rng);
  const rest = n % 5;
  const d = 5 - rest;
  const context = `${name} zählt ${fmt(n)} ${c}.`;
  const prompt = 'Wie viele Striche fehlen bis zum nächsten Bündel?';
  return build(SKILL, stufe, {
    key: `bis-buendel:${name}:${c}:${n}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: d, label: 'Anzahl der Striche' },
    hints: ['Immer 5 Striche sind ein Bündel.', 'Wie viele einzelne Striche bleiben übrig?'],
    steps: [bundleSplit(n), `5 − ${fmt(rest)} = ${fmt(d)}`, `Bis zum Bündel fehlen noch: ${fmt(d)}.`],
    bugs: bugList(d, [['strich-summe', rest, 'Das sind die einzelnen Striche. Wie viele fehlen noch bis 5?']]),
    praise: 'Du hast an das volle Bündel gedacht.',
    srText: spoken(undefined, context, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** A list is there, strokes come: the bundles change with them. The sum stays within the 30 of the Stufe. */
function strichDazu(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const start = rng.int(11, 23);
  const k = rng.int(2, 7);
  const n = start + k;
  const { theme, cats } = pickRows(rng, 1, n);
  const c = cats[0];
  const visual = tally(theme, cats, [start]);
  const { name } = pickPerson(rng);
  const context = `${name} macht noch ${fmt(k)} Striche in dieser Zeile.`;
  const prompt = 'Wie viele Bündel und einzelne Striche sind es dann?';
  const fields = bundleFields(n);
  return build(SKILL, stufe, {
    key: `strich-dazu:${theme.id}:${c}:${start}:${k}:${name}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'multi', fields },
    hints: ['Wie viele Striche zeigt die Zeile jetzt?', 'Rechne die neuen Striche dazu. Bündle dann immer 5 Striche.'],
    steps: [`Die Zeile zeigt ${fmt(start)} Striche.`, `${fmt(start)} + ${fmt(k)} = ${fmt(n)}`, { text: `${dasSind(n)} ${fmt(bundles(n))} Bündel und ${fmt(n % 5)} einzeln.`, visual: solvedTally(n) }],
    bugs: multiBugs([{ id: 'strich-summe', match: { b: bundles(start), s: start % 5 }, hint: 'Das ist die Zeile jetzt. Rechne die neuen Striche dazu.' }, ...bundleBugs(n, fields)], fields),
    praise: 'Du hast die neuen Striche mitgerechnet.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

// ─── Stufe 3: vergleichen, zusammenzählen, Fehler finden ─────────────────────

function vergleichen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const values = spacedValues(rng, 3, 3, ab === 1 ? 30 : CAP[stufe], 2);
  const { theme, cats } = pickRows(rng, 3, Math.max(...values));
  const [i, j] = rng.sample([0, 1, 2], 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const [va, vb] = [values[a], values[b]];
  const d = va - vb;
  const visual = tally(theme, cats, values);
  const prompt = theme.more(cats[a], cats[b]);
  return build(SKILL, stufe, {
    key: `vergleich:${theme.id}:${cats.join('-')}:${values.join('-')}:${a}:${b}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: d, unit: theme.unitOf(cats[a]) },
    hints: ['Lies zuerst beide Zeilen ab.', HINT_DIFF],
    steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} − ${fmt(vb)} = ${fmt(d)}. Es sind ${fmt(d)} mehr.`],
    bugs: bugList(d, [
      ['mehr-unterschied', va, HINT_MEHR],
      ['plus-statt-minus', va + vb, HINT_PLUS],
      ['strich-buendel-vier', bundleHintFits(d) ? asFour(va) - asFour(vb) : null, HINT_BUNDLE],
    ]),
    praise: 'Du hast die Zeilen genau verglichen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function zusammen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = ab === 1 ? 3 : rng.int(3, 4);
  const total = ab === 1 ? rng.int(18, 30) : rng.int(31, CAP[stufe]);
  const values = parts(rng, total, n, 2, CAP[stufe]);
  const { theme, cats } = pickRows(rng, n, Math.max(...values));
  const visual = tally(theme, cats, values);
  const prompt = `Wie viele ${theme.unit} sind es insgesamt?`;
  return build(SKILL, stufe, {
    key: `gesamt:${theme.id}:${cats.join('-')}:${values.join('-')}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: total, unit: theme.unit },
    hints: ['Lies zuerst jede Zeile ab.', 'Rechne dann alle Zahlen zusammen.'],
    steps: [`${valuesText(cats, values)}.`, `${values.map((v) => fmt(v)).join(' + ')} = ${fmt(total)}`, `Insgesamt sind es ${fmt(total)} ${theme.unit}.`],
    bugs: bugList(total, [
      ...values.map((v): [string, number, string] => ['zeile-vergessen', total - v, 'Hast du jede Zeile mitgerechnet? Prüfe Zeile für Zeile.']),
      ['strich-buendel-vier', sum(values.map(asFour)), HINT_BUNDLE],
    ]),
    praise: 'Du hast keine Zeile ausgelassen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** Fehlerdetektiv (§7.1): the number written in one row does not fit its strokes, as after a slip with a bundle. */
function fehlerFinden(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = rng.int(3, 4);
  const values = spacedValues(rng, n, 6, CAP[stufe]);
  const { theme, cats } = pickRows(rng, n, Math.max(...values));
  const t = rng.int(0, n - 1);
  const v = values[t];
  const written = rng.pick([asFour(v), v + 1, v - 1]);
  const labels = cats.map((c, i) => `${c}: ${fmt(i === t ? written : values[i])}`);
  const { name } = pickPerson(rng);
  const prompt = `${name} schreibt zu jeder Zeile eine Zahl. Welche Zahl passt nicht?`;
  const visual = tally(theme, cats, values, labels);
  return build(SKILL, stufe, {
    key: `fehler:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}:${written}:${name}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: labels[t] },
      labels.flatMap((l, i) => (i === t ? [] : [{ label: l, whyWrong: 'Bei dieser Zeile passt die Zahl zu den Strichen.' }])),
    ),
    hints: [readHint(...values), 'Vergleiche dann deine Zahl mit der Zahl in der Zeile.'],
    steps: [`Zeile ${cats[t]}: ${bundleWords(v)}.`, bundleSum(v), `Es sind ${fmt(v)} Striche, nicht ${fmt(written)}.`],
    praise: 'Du hast jede Zahl mit den Strichen verglichen.',
    srText: spoken(visual, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** The sum and 2 rows are given: the third row comes from the sum. */
function zeileAusSumme(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  let values = parts(rng, rng.int(24, CAP[stufe]), 3, 4, CAP[stufe]);
  while (new Set(values).size < 3) values = parts(rng, rng.int(24, CAP[stufe]), 3, 4, CAP[stufe]);
  const total = sum(values);
  const { theme, cats } = pickRows(rng, 3, Math.max(...values));
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const shownCats = cats.filter((_, i) => i !== t);
  const shownValues = values.filter((_, i) => i !== t);
  const known = sum(shownValues);
  const visual = tally(theme, shownCats, shownValues);
  const context = `Insgesamt sind es ${fmt(total)} ${theme.unit}. Die Zeile ${c} fehlt.`;
  const prompt = theme.how(c);
  return build(SKILL, stufe, {
    key: `aus-summe:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value: v, unit: theme.unitOf(c) },
    hints: ['Lies zuerst die 2 Zeilen ab.', 'Rechne dann: alle minus die 2 Zeilen.'],
    steps: [`${valuesText(shownCats, shownValues)}.`, `${shownValues.map((x) => fmt(x)).join(' + ')} = ${fmt(known)}`, `${fmt(total)} − ${fmt(known)} = ${fmt(v)}`, theme.says(c, v)],
    bugs: bugList(v, [
      ['zeile-vergessen', known, 'Das sind nur die 2 Zeilen. Wie viele fehlen bis zu allen?'],
      ['plus-statt-minus', total + known, 'Die Zeile ist nur ein Teil von allen. Rechne minus.'],
      ['strich-buendel-vier', bundleHintFits(v) ? total - sum(shownValues.map(asFour)) : null, HINT_BUNDLE],
    ]),
    praise: 'Du hast von allen zurück gerechnet.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

// The Fehlerdetektiv waits for Stufe 3 (docs/research.md §7.1).
const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [lesen], 2: [lesen], 3: [zeileFinden, zeileBisBuendel] },
  2: { 1: [zahlZuBuendeln, bildZuListe], 2: [bildZuBuendeln, bildZuListe, zahlZuBuendeln], 3: [buendelZuZahl, bisBuendel, strichDazu] },
  3: { 1: [vergleichen, zusammen], 2: [vergleichen, zusammen], 3: [fehlerFinden, zeileAusSumme] },
};

export const strichlisteSkill: SkillDef = {
  ...SKILL,
  title: 'Strichlisten',
  description: 'Du liest Strichlisten und machst selbst Striche.',
  stufen: {
    1: 'Du liest Strichlisten mit Bündeln, bis 20.',
    2: 'Du zählst Bilder und machst Striche, bis 30.',
    3: 'Du vergleichst Zeilen und findest Fehler, bis 50.',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
