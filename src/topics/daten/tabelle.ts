/**
 * Tabellen. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1 einen Wert finden, 3 Zeilen, bis 20. AB I bis 10. AB II bis 20, auch die Zeile zu einer Zahl. AB III stimmt der Satz zur Tabelle?
 * Stufe 2 vergleichen und den Unterschied rechnen, 4–5 Zeilen, bis 50. AB I vergleichen, 4 Zeilen, bis 30. AB II den Unterschied rechnen. AB III die Zeile zum Unterschied; größte minus kleinste Zahl.
 * Stufe 3 welche Frage die Tabelle beantworten kann. AB I welche sie beantworten kann. AB II welche sie nicht beantworten kann. AB III auch: welche Frage zu dieser Antwort passt.
 */
import { fmt } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { build, bugList, makeChoice, pickPerson, targetAb } from '../shared';
import { HINT_DIFF, HINT_MEHR, HINT_PLUS, pickRows, spacedValues, spoken, valuesText, type DataTheme } from './helpers';

const SKILL = { id: 'daten.tabelle', topicId: 'daten' } as const;
const KMK = ['DZ.daten', 'PK.darstellen'];

/** Largest number per Stufe (§6: 20, then 50). */
export const CAP: Record<Stufe, number> = { 1: 20, 2: 50, 3: 50 };

const table = (theme: DataTheme, cats: readonly string[], values: readonly number[]): Visual => ({
  type: 'table',
  caption: theme.title,
  header: [theme.head, theme.numberHead],
  rows: cats.map((c, i) => [c, fmt(values[i])]),
});

/** AB I of Stufe 1 and 2 keeps the numbers smaller. */
const capOf = (stufe: Stufe, ab: Ab) => (ab > 1 || stufe === 3 ? CAP[stufe] : stufe === 1 ? 10 : 30);

function rowsOf(rng: Rng, stufe: Stufe, ab: Ab, n: number, gap = 1) {
  const values = spacedValues(rng, n, 2, capOf(stufe, ab), gap);
  return { ...pickRows(rng, n, Math.max(...values)), values };
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function wertLesen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = rowsOf(rng, stufe, ab, 3);
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const visual = table(theme, cats, values);
  const prompt = theme.how(c);
  return build(SKILL, stufe, {
    key: `lesen:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: v, unit: theme.unitOf(c) },
    hints: [`Suche zuerst die Zeile ${c}.`, 'Geh in dieser Zeile weiter zur Zahl.'],
    steps: [`Suche die Zeile ${c}.`, `Dort steht die Zahl ${fmt(v)}.`, theme.says(c, v)],
    bugs: bugList(
      v,
      values.flatMap((o, i): [string, number, string][] => (i === t ? [] : [['andere-zeile', o, `Das ist eine andere Zeile. Suche die Zeile ${c}.`]])),
    ),
    praise: 'Du hast die richtige Zeile gefunden.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function zeileZurZahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = rowsOf(rng, stufe, ab, 3);
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const visual = table(theme, cats, values);
  const prompt = `In welcher Zeile steht die Zahl ${fmt(v)}?`;
  return build(SKILL, stufe, {
    key: `zeile:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: c },
      cats.flatMap((o, i) => (i === t ? [] : [{ label: o, whyWrong: `In der Zeile ${o} steht ${fmt(values[i])}.` }])),
    ),
    hints: ['Geh die Spalte mit den Zahlen von oben nach unten durch.', 'Lies dann das Wort am Anfang der Zeile.'],
    steps: [`Die Zahl ${fmt(v)} steht in der Spalte ${theme.numberHead}.`, `Am Anfang der Zeile steht ${c}.`],
    praise: 'Du hast die Zahl in der Spalte gefunden.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** A sentence about one row: right, or with the number of another row. */
function stimmtDerSatz(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = rowsOf(rng, stufe, ab, 3);
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const right = rng.chance(0.5);
  const said = right ? v : rng.pick(values.filter((_, i) => i !== t));
  const { name } = pickPerson(rng);
  const visual = table(theme, cats, values);
  const context = `${name} sagt: ${theme.says(c, said)}`;
  const prompt = 'Stimmt das?';
  const check = `Suche die Zeile ${c}. Vergleiche die Zahl.`;
  return build(SKILL, stufe, {
    key: `stimmt:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}:${said}:${name}`,
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: right ? 'Stimmt' : 'Stimmt nicht' }, [{ label: right ? 'Stimmt nicht' : 'Stimmt', whyWrong: check }], { order: ['Stimmt', 'Stimmt nicht'] }),
    hints: [`Suche zuerst die Zeile ${c}.`, 'Vergleiche dann die Zahl in der Zeile.'],
    steps: [`In der Zeile ${c} steht ${fmt(v)}.`, `${name} sagt ${fmt(said)}.`, right ? 'Das stimmt.' : 'Das stimmt nicht.'],
    praise: 'Du hast den Satz mit der Tabelle geprüft.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

function unterschied(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = rng.int(4, 5);
  const { theme, cats, values } = rowsOf(rng, stufe, ab, n, 2);
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const [va, vb] = [values[a], values[b]];
  const d = va - vb;
  const visual = table(theme, cats, values);
  const prompt = theme.more(cats[a], cats[b]);
  return build(SKILL, stufe, {
    key: `unterschied:${theme.id}:${cats.join('-')}:${values.join('-')}:${a}:${b}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: d, unit: theme.unitOf(cats[a]) },
    hints: [`Suche die Zeilen ${cats[a]} und ${cats[b]}.`, HINT_DIFF],
    steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} − ${fmt(vb)} = ${fmt(d)}. Es sind ${fmt(d)} mehr.`],
    bugs: bugList(d, [
      ['mehr-unterschied', va, HINT_MEHR],
      ['plus-statt-minus', va + vb, HINT_PLUS],
    ]),
    praise: 'Du hast den Unterschied ausgerechnet.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function meisteWenigste(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = ab === 1 ? 4 : rng.int(4, 5);
  const { theme, cats, values } = rowsOf(rng, stufe, ab, n);
  const most = rng.chance(0.6);
  const target = most ? Math.max(...values) : Math.min(...values);
  const t = values.indexOf(target);
  const visual = table(theme, cats, values);
  const prompt = most ? theme.most : theme.least;
  const word = most ? 'größte' : 'kleinste';
  return build(SKILL, stufe, {
    key: `extrem:${theme.id}:${cats.join('-')}:${values.join('-')}:${most ? 'max' : 'min'}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: cats[t] },
      rng.shuffle(cats.flatMap((o, i) => (i === t ? [] : [{ label: o, whyWrong: `In der Zeile ${o} steht ${fmt(values[i])}. Suche die ${word} Zahl.` }]))),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Schau nur auf die Spalte mit den Zahlen.', `Suche die ${word} Zahl.`],
    steps: [`${valuesText(cats, values)}.`, `Die ${word} Zahl ist ${fmt(target)}.`, `Die Zahl steht in der Zeile ${cats[t]}.`],
    praise: 'Du hast alle Zahlen verglichen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** Where the two numbers differ: the tens decide only if both numbers have tens and these differ. */
function compareHint(x: number, y: number): string {
  const [tensX, tensY] = [Math.floor(x / 10), Math.floor(y / 10)];
  if (tensX === tensY) return tensX === 0 ? 'Beide Zahlen haben keine Zehner. Schau auf die Einer.' : 'Die Zehner sind gleich. Schau auf die Einer.';
  return tensX === 0 || tensY === 0 ? 'Nur eine der Zahlen hat Zehner.' : 'Schau zuerst auf die Zehner.';
}

function welcheGroesser(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = ab === 1 ? 4 : rng.int(4, 5);
  const { theme, cats, values } = rowsOf(rng, stufe, ab, n);
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const visual = table(theme, cats, values);
  const prompt = `In welcher Zeile steht die größere Zahl: ${cats[i]} oder ${cats[j]}?`;
  return build(SKILL, stufe, {
    key: `groesser:${theme.id}:${cats.join('-')}:${values.join('-')}:${i}:${j}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(rng, { label: cats[a] }, [{ label: cats[b], whyWrong: `In der Zeile ${cats[b]} steht ${fmt(values[b])}. Schau auch auf ${cats[a]}.` }]),
    hints: ['Lies beide Zahlen in der Tabelle ab.', compareHint(values[a], values[b])],
    steps: [`In der Zeile ${cats[a]} steht ${fmt(values[a])}.`, `In der Zeile ${cats[b]} steht ${fmt(values[b])}.`, `${fmt(values[a])} ist größer als ${fmt(values[b])}.`],
    praise: 'Du hast beide Zahlen verglichen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** Backwards: the difference is given, the row is asked. */
function zeileZumUnterschied(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = rng.int(4, 5);
  const { theme, cats, values } = rowsOf(rng, stufe, ab, n, 2);
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const [va, vb] = [values[a], values[b]];
  const d = va - vb;
  const visual = table(theme, cats, values);
  const prompt = `Welche Zeile hat ${fmt(d)} mehr als die Zeile ${cats[b]}?`;
  const add = `Rechne ${fmt(vb)} + ${fmt(d)}.`;
  return build(SKILL, stufe, {
    key: `zum-unterschied:${theme.id}:${cats.join('-')}:${values.join('-')}:${a}:${b}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: cats[a] },
      rng.shuffle(cats.flatMap((o, k) => (k === a || k === b ? [] : [{ label: o, whyWrong: `In der Zeile ${o} steht ${fmt(values[k])}. ${add}` }]))),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: [`Suche zuerst die Zeile ${cats[b]}.`, `Rechne dann ${fmt(d)} dazu.`],
    steps: [theme.says(cats[b], vb), `${fmt(vb)} + ${fmt(d)} = ${fmt(va)}`, `Die Zahl ${fmt(va)} steht in der Zeile ${cats[a]}.`],
    praise: 'Du hast vom Unterschied zur Zeile gerechnet.',
    srText: spoken(visual, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Largest minus smallest: the child has to find both rows first. */
function groessterUnterschied(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = rng.int(4, 5);
  let drawn = rowsOf(rng, stufe, ab, n, 2);
  // The difference is no number of the table: the answer would stand there.
  while (drawn.values.includes(Math.max(...drawn.values) - Math.min(...drawn.values))) drawn = rowsOf(rng, stufe, ab, n, 2);
  const { theme, cats, values } = drawn;
  const [top, low] = [Math.max(...values), Math.min(...values)];
  const d = top - low;
  const visual = table(theme, cats, values);
  const prompt = 'Wie groß ist der Unterschied von größter und kleinster Zahl?';
  return build(SKILL, stufe, {
    key: `spanne:${theme.id}:${cats.join('-')}:${values.join('-')}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: d, label: 'Unterschied' },
    hints: ['Suche die größte und die kleinste Zahl.', HINT_DIFF],
    steps: [`Die größte Zahl ist ${fmt(top)}.`, `Die kleinste Zahl ist ${fmt(low)}.`, `${fmt(top)} − ${fmt(low)} = ${fmt(d)}`],
    bugs: bugList(d, [
      ['mehr-unterschied', top, HINT_MEHR],
      ['plus-statt-minus', top + low, HINT_PLUS],
    ]),
    praise: 'Du hast beide Zahlen gesucht und gerechnet.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

interface Asked {
  q: string;
  /** Why the table does answer it. */
  why: string;
}

/** Questions the table can answer, with where to find the answer. */
function answerable(theme: DataTheme, cats: readonly string[], values: readonly number[], rng: Rng): Asked[] {
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  // "mehr" only from the larger to the smaller row: the other way round the question has no answer.
  const [a, b] = values[i] > values[j] ? [cats[i], cats[j]] : [cats[j], cats[i]];
  return [
    { q: theme.how(cats[i]), why: `Das steht in der Tabelle: Schau in die Zeile ${cats[i]}.` },
    { q: theme.most, why: 'Das kannst du ablesen: Vergleiche die Zahlen.' },
    { q: theme.more(a, b), why: `Das kannst du rechnen: Nimm die Zeilen ${a} und ${b}.` },
    { q: `Wie viele ${theme.unit} sind es insgesamt?`, why: 'Das kannst du rechnen: Nimm alle Zahlen zusammen.' },
  ];
}

/** Questions the table cannot answer: another row, or something it does not count. */
function unanswerable(theme: DataTheme, cats: readonly string[], rng: Rng): string[] {
  const outside = rng.pick(theme.cats.filter((c) => !cats.includes(c)));
  return [theme.how(outside), ...theme.open(rng.pick(cats))];
}

function frageOhneAntwort(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = rng.int(3, 4);
  const { theme, cats, values } = rowsOf(rng, stufe, ab, n);
  const visual = table(theme, cats, values);
  const prompt = 'Welche Frage kann die Tabelle nicht beantworten?';
  const open = rng.pick(unanswerable(theme, cats, rng));
  const others = rng.sample(answerable(theme, cats, values, rng), 3);
  const answer = makeChoice(rng, { label: open }, others.map((o): ChoiceOption => ({ label: o.q, whyWrong: o.why })));
  return build(SKILL, stufe, {
    key: `ohne-antwort:${theme.id}:${cats.join('-')}:${values.join('-')}:${open}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Lies jede Frage. Findest du die Antwort in der Tabelle?', 'Die Tabelle zeigt nur diese Zeilen und ihre Zahlen.'],
    steps: [`Die Tabelle hat die Spalten ${theme.head} und ${theme.numberHead}.`, `Die Tabelle hat nur die Zeilen ${cats.join(', ')}.`, `Offen bleibt: ${open}`],
    praise: 'Du hast jede Frage mit der Tabelle geprüft.',
    srText: spoken(visual, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function frageMitAntwort(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = rng.int(3, 4);
  const { theme, cats, values } = rowsOf(rng, stufe, ab, n);
  const visual = table(theme, cats, values);
  const prompt = 'Welche Frage kann die Tabelle beantworten?';
  const fits = rng.pick(answerable(theme, cats, values, rng));
  const others = rng.sample(unanswerable(theme, cats, rng), 3);
  const answer = makeChoice(rng, { label: fits.q }, others.map((q): ChoiceOption => ({ label: q, whyWrong: 'Dazu steht nichts in der Tabelle.' })));
  return build(SKILL, stufe, {
    key: `mit-antwort:${theme.id}:${cats.join('-')}:${values.join('-')}:${fits.q}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Lies jede Frage. Findest du die Antwort in der Tabelle?', 'Die Tabelle zeigt nur diese Zeilen und ihre Zahlen.'],
    steps: [`Die Tabelle hat die Spalten ${theme.head} und ${theme.numberHead}.`, `Die Tabelle hat nur die Zeilen ${cats.join(', ')}.`, `Die Tabelle beantwortet: ${fits.q}`],
    praise: 'Du hast jede Frage mit der Tabelle geprüft.',
    srText: spoken(visual, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Backwards: the answer is given, the question is asked. Every other question has another answer. */
function frageZurAntwort(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = rowsOf(rng, stufe, ab, 4, 2);
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const asMore = rng.chance(0.4) && !values.includes(values[a] - values[b]);
  const answerNumber = asMore ? values[a] - values[b] : values[i];
  const right = asMore ? theme.more(cats[a], cats[b]) : theme.how(cats[i]);
  const others = cats.flatMap((c, k) => (values[k] !== answerNumber ? [{ label: theme.how(c), whyWrong: `Bei dieser Frage ist die Antwort ${fmt(values[k])}.` }] : []));
  const visual = table(theme, cats, values);
  const prompt = `Die Antwort ist ${fmt(answerNumber)}. Welche Frage passt?`;
  return build(SKILL, stufe, {
    key: `zur-antwort:${theme.id}:${cats.join('-')}:${values.join('-')}:${asMore ? `${a}:${b}` : i}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(rng, { label: right }, rng.shuffle(others)),
    hints: ['Lies jede Frage. Suche die Antwort in der Tabelle.', asMore ? 'Bei einer Frage musst du rechnen.' : 'Vergleiche jede Antwort mit der Zahl.'],
    steps: asMore
      ? [theme.says(cats[a], values[a]), theme.says(cats[b], values[b]), `${fmt(values[a])} − ${fmt(values[b])} = ${fmt(answerNumber)}`, `Passend: ${right}`]
      : [`Die Zahl ${fmt(answerNumber)} steht in der Zeile ${cats[i]}.`, `Passend: ${right}`],
    praise: 'Du hast von der Antwort zur Frage gedacht.',
    srText: spoken(visual, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [wertLesen], 2: [wertLesen, wertLesen, zeileZurZahl], 3: [stimmtDerSatz, zeileZurZahl] },
  2: { 1: [welcheGroesser, meisteWenigste], 2: [unterschied, unterschied, meisteWenigste], 3: [zeileZumUnterschied, groessterUnterschied] },
  3: { 1: [frageMitAntwort], 2: [frageOhneAntwort], 3: [frageOhneAntwort, frageZurAntwort] },
};

export const tabelleSkill: SkillDef = {
  ...SKILL,
  title: 'Tabellen',
  description: 'Du findest Zahlen in einer Tabelle.',
  stufen: {
    1: 'Du findest eine Zahl in der Tabelle, bis 20.',
    2: 'Du vergleichst und rechnest mit Zahlen bis 50.',
    3: 'Du prüfst die Frage zur Tabelle.',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
