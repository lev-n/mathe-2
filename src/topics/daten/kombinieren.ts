/**
 * Wie viele Möglichkeiten? The Stufe chooses the content (docs/research.md §6: 2 × 2, 2 × 3, 3 × 3 and orders of 3 things), the AB the demand inside it:
 * Stufe 1 up to 2 × 2. AB I with pictures. AB II without pictures. AB III a third choice comes to a small table.
 * Stufe 2 the table of 3 × 2. AB I all pairs, the pairs left after some are chosen. AB II no table; the pair still missing; one choice is dropped. AB III how many new pairs a new choice
 * brings; from the pairs back to the choices.
 * Stufe 3 3 × 3 and orders of 3 things. AB I a table of 3 × 3, the pairs left after some are chosen; the orders still missing, from a long list. AB II no table; how many orders; choices
 * are dropped. AB III how many new pairs the new choices bring; the orders still missing, from a short list; the order that is missing.
 * The table shows one cell per pair, so that the child can see why it is mal and not plus. All pairs of a table of one size are one number, so that form comes with others
 * whose answers vary: the table decides the answer, not memory.
 */
import { BOX, fmt } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, joinDe, makeChoice, pickPerson, targetAb } from '../shared';
import { spoken } from './helpers';

const SKILL = { id: 'daten.kombinieren', topicId: 'daten' } as const;
const KMK = ['DZ.kombinatorik', 'PK.problemloesen'];

interface Dim {
  /** Plural: 'T-Shirts'. */
  title: string;
  /** '1 T-Shirt' after a number. */
  one: string;
  /** 'Jedes T-Shirt'. */
  each: string;
  /** 'zu jeder Hose'. */
  toEach: string;
  /** 'Die neue Hose'. */
  fresh: string;
  opts: readonly string[];
  /** Pictures for the labels in AB I (for the first opts, same order). */
  pics?: readonly string[];
}

interface PairTheme {
  id: string;
  first: Dim;
  second: Dim;
}

const THEMES: readonly PairTheme[] = [
  {
    id: 'brot',
    first: { title: 'Brote', one: 'Brot', each: 'Jedes Brot', toEach: 'zu jedem Brot', fresh: 'Das neue Brot', opts: ['Toast', 'Brezel', 'Bagel', 'Zopf'], pics: ['🍞', '🥨', '🥯'] },
    second: { title: 'Beläge', one: 'Belag', each: 'Jeder Belag', toEach: 'zu jedem Belag', fresh: 'Der neue Belag', opts: ['Käse', 'Gurke', 'Ei'], pics: ['🧀', '🥒', '🥚'] },
  },
  {
    id: 'pause',
    first: { title: 'Früchte', one: 'Frucht', each: 'Jede Frucht', toEach: 'zu jeder Frucht', fresh: 'Die neue Frucht', opts: ['Apfel', 'Birne', 'Kiwi', 'Mango'], pics: ['🍎', '🍐', '🥝'] },
    second: { title: 'Getränke', one: 'Getränk', each: 'Jedes Getränk', toEach: 'zu jedem Getränk', fresh: 'Das neue Getränk', opts: ['Milch', 'Saft', 'Tee'], pics: ['🥛', '🧃', '🍵'] },
  },
  {
    id: 'kleidung',
    first: { title: 'T-Shirts', one: 'T-Shirt', each: 'Jedes T-Shirt', toEach: 'zu jedem T-Shirt', fresh: 'Das neue T-Shirt', opts: ['rot', 'blau', 'gelb', 'grün'] },
    second: { title: 'Hosen', one: 'Hose', each: 'Jede Hose', toEach: 'zu jeder Hose', fresh: 'Die neue Hose', opts: ['Jeans', 'kurze Hose', 'lange Hose'] },
  },
  {
    id: 'eis',
    first: { title: 'Eis', one: 'Eis', each: 'Jedes Eis', toEach: 'zu jedem Eis', fresh: 'Das neue Eis', opts: ['Kiwi', 'Birne', 'Apfel', 'Kokos'] },
    second: { title: 'Soßen', one: 'Soße', each: 'Jede Soße', toEach: 'zu jeder Soße', fresh: 'Die neue Soße', opts: ['Kakao', 'Beere', 'Nuss'] },
  },
];

const PICTURE_THEMES = THEMES.filter((t) => t.first.pics && t.second.pics);

interface Pairing {
  theme: PairTheme;
  rows: string[];
  cols: string[];
  /** Row and column headings with their pictures. */
  rowLabels: string[];
  colLabels: string[];
  /** 3 columns of pairs: only pictures fit a 375 px phone, and the corner stays empty. */
  wide: boolean;
}

function pairing(rng: Rng, a: number, b: number, withPictures: boolean): Pairing {
  const wide = b > 2;
  const pictured = withPictures || wide;
  const theme = rng.pick(pictured ? PICTURE_THEMES : THEMES);
  const usable = (d: Dim) => (pictured && d.pics ? d.pics : d.opts).map((_, i) => i);
  const rowAt = rng.sample(usable(theme.first), a);
  const colAt = rng.sample(usable(theme.second), b);
  const label = (d: Dim, i: number) => (!pictured || !d.pics ? d.opts[i] : wide ? d.pics[i] : `${d.pics[i]} ${d.opts[i]}`);
  return {
    theme,
    rows: rowAt.map((i) => theme.first.opts[i]),
    cols: colAt.map((i) => theme.second.opts[i]),
    rowLabels: rowAt.map((i) => label(theme.first, i)),
    colLabels: colAt.map((i) => label(theme.second, i)),
    wide,
  };
}

const pairTable = (p: Pairing, cell: (row: number, col: number) => string): Visual => ({
  type: 'table',
  caption: `${p.theme.first.title} und ${p.theme.second.title}`,
  header: [p.wide ? '' : p.theme.first.one, ...p.colLabels],
  rows: p.rowLabels.map((label, r) => [label, ...p.colLabels.map((_, c) => cell(r, c))]),
});

/**
 * Solved table: the pairs are numbered row by row, so that the last number is the count. One cell for all pairs of a
 * row: inside the steps, a column per pair is wider than a 375 px phone.
 */
const numbered = (p: Pairing): Visual => ({
  type: 'table',
  caption: `${p.theme.first.title} und ${p.theme.second.title}`,
  header: [p.theme.first.one, 'Nummer'],
  rows: p.rows.map((row, r) => {
    const [first, last] = [r * p.cols.length + 1, (r + 1) * p.cols.length];
    return [row, first === last ? fmt(last) : `${fmt(first)} bis ${fmt(last)}`];
  }),
});

const repeatedSum = (a: number, b: number) => `${Array.from({ length: a }, () => fmt(b)).join(' + ')} = ${fmt(a * b)}`;

const addHint = (t: PairTheme) => `${t.first.each} passt ${t.second.toEach}. Geh alle Paare durch.`;
/** Without rows on screen too: the task may have no table. No number: with 1 column it would be the answer. */
const rowHint = (t: PairTheme) => `Das ist nur 1 ${t.first.one}. Schau auch auf die anderen ${t.first.title}.`;
/** '3 Brote', '1 Belag' */
const amount = (d: Dim, n: number) => `${fmt(n)} ${n === 1 ? d.one : d.title}`;
/** Says what one pair is: not one fruit with one drink each, and not a "Paar Hosen". */
const whatIsAPair = (t: PairTheme) => `Ein Paar ist 1 ${t.first.one} und 1 ${t.second.one}.`;

// ─── Paare zählen ────────────────────────────────────────────────────────────

function paareZaehlen(rng: Rng, stufe: Stufe, ab: Ab, a: number, b: number, opts: { pictures?: boolean; table?: boolean } = {}): Exercise {
  const p = pairing(rng, a, b, opts.pictures ?? false);
  const { theme } = p;
  const showTable = opts.table ?? true;
  const { name } = pickPerson(rng);
  const n = a * b;
  const context = showTable ? whatIsAPair(theme) : `${name} hat ${amount(theme.first, a)} und ${amount(theme.second, b)}. ${whatIsAPair(theme)}`;
  const prompt = `Wie viele Paare kann ${name} wählen?`;
  const visual = showTable ? pairTable(p, () => BOX) : undefined;
  return build(SKILL, stufe, {
    key: `paare:${theme.id}:${a}x${b}:${showTable ? 'tabelle' : 'text'}:${p.rows.join('-')}:${p.cols.join('-')}:${name}`,
    ab,
    context,
    prompt,
    ...(visual ? { visual } : {}),
    answer: { kind: 'number', value: n, unit: 'Paare' },
    hints: [addHint(theme), showTable ? 'Jedes leere Kästchen ist 1 Paar.' : 'Zeichne eine kleine Tabelle auf Papier.'],
    steps: [{ text: `Jede Zeile zeigt die Paare mit 1 ${theme.first.one}.`, visual: numbered(p) }, repeatedSum(a, b), `Es gibt ${fmt(n)} Paare.`],
    bugs: bugList(n, [
      ['kombi-addiert', a + b, addHint(theme)],
      ['kombi-reihe', b, rowHint(theme)],
    ]),
    praise: 'Du hast alle Paare durchgedacht.',
    srText: spoken(undefined, showTable ? `Tabelle: ${amount(theme.first, a)} und ${amount(theme.second, b)}.` : undefined, context, prompt),
    kmk: KMK,
  });
}

function paarFehlt(rng: Rng, stufe: Stufe, ab: Ab, a: number, b: number, pictures: boolean): Exercise {
  const p = pairing(rng, a, b, pictures);
  const { theme } = p;
  const missing = [rng.int(0, a - 1), rng.int(0, b - 1)] as const;
  const pairName = (r: number, c: number) => `${p.rows[r]} und ${p.cols[c]}`;
  const visual = pairTable(p, (r, c) => (r === missing[0] && c === missing[1] ? BOX : '✓'));
  const { name } = pickPerson(rng);
  const context = `${whatIsAPair(theme)} ${name} hakt jedes Paar ab.`;
  const prompt = 'Welches Paar fehlt noch?';
  const correct = pairName(missing[0], missing[1]);
  // What the table shows, cell by cell: without it a child who hears the task cannot find the gap.
  const spokenRows = p.rows.map((row, r) => `Zeile ${row}: ${p.cols.map((col, c) => `${col} ${r === missing[0] && c === missing[1] ? 'leer' : 'Haken'}`).join(', ')}.`).join(' ');
  const others = rng.shuffle(p.rows.flatMap((_, r) => p.cols.flatMap((_c, c) => (r === missing[0] && c === missing[1] ? [] : [pairName(r, c)]))));
  return build(SKILL, stufe, {
    key: `fehlt:${theme.id}:${a}x${b}:${p.rows.join('-')}:${p.cols.join('-')}:${missing.join('-')}:${name}`,
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: correct }, others.map((o) => ({ label: o, whyWrong: 'Dieses Paar hat schon einen Haken.' }))),
    hints: ['Suche das leere Kästchen.', 'Lies dann vorne die Zeile und oben die Spalte.'],
    steps: [`Das leere Kästchen steht in der Zeile ${p.rows[missing[0]]}.`, `Oben in der Spalte steht ${p.cols[missing[1]]}.`, `Es fehlt das Paar ${correct}.`],
    praise: 'Du hast Zeile und Spalte zusammen gelesen.',
    srText: spoken(undefined, `Tabelle mit den Paaren. ${spokenRows}`, context, prompt),
    kmk: KMK,
  });
}

/** One more choice: every earlier choice gets one new pair. */
function einsDazu(rng: Rng, stufe: Stufe, ab: Ab, a: number, b: number): Exercise {
  const p = pairing(rng, a, b, false);
  const { theme } = p;
  const { name } = pickPerson(rng);
  const n = a * (b + 1);
  const context = `${whatIsAPair(theme)} ${name} bekommt noch 1 ${theme.second.one}.`;
  const prompt = `Wie viele Paare kann ${name} jetzt wählen?`;
  return build(SKILL, stufe, {
    key: `dazu:${theme.id}:${a}x${b}:${p.rows.join('-')}:${p.cols.join('-')}:${name}`,
    ab,
    context,
    prompt,
    visual: pairTable(p, () => BOX),
    answer: { kind: 'number', value: n, unit: 'Paare' },
    hints: [`${theme.second.each} passt ${theme.first.toEach}.`, 'Wie viele neue Paare gibt es mit dem neuen Stück?'],
    steps: [`Vorher: ${fmt(a)} · ${fmt(b)} = ${fmt(a * b)} Paare.`, `${theme.second.fresh} gibt ${a === 1 ? '1 neues Paar' : `${fmt(a)} neue Paare`}.`, `${fmt(a * b)} + ${fmt(a)} = ${fmt(n)}`],
    bugs: bugList(n, [
      ['kombi-dazu', a * b + 1, `${theme.second.fresh} passt ${theme.first.toEach}. Das gibt neue Paare.`],
      ['kombi-dazu', a * b, `Das sind die Paare von vorher. ${theme.second.fresh} gibt neue Paare.`],
      ['kombi-addiert', a + b + 1, addHint(theme)],
    ]),
    praise: 'Du hast an alle neuen Paare gedacht.',
    srText: spoken(undefined, `Tabelle: ${amount(theme.first, a)} und ${amount(theme.second, b)}.`, context, prompt),
    kmk: KMK,
  });
}

/** Some pairs are chosen already, and the table does not mark them: all pairs minus those. The answer varies inside one size of table. */
function paareRest(rng: Rng, stufe: Stufe, ab: Ab, a: number, b: number): Exercise {
  const p = pairing(rng, a, b, false);
  const { theme } = p;
  const n = a * b;
  const chosen = rng.int(Math.ceil(n / 3), n - 2);
  const { name } = pickPerson(rng);
  const context = `${whatIsAPair(theme)} ${name} wählt ${fmt(chosen)} Paare.`;
  const prompt = `Wie viele Paare kann ${name} noch wählen?`;
  const rest = n - chosen;
  return build(SKILL, stufe, {
    key: `rest:${theme.id}:${a}x${b}:${p.rows.join('-')}:${p.cols.join('-')}:${chosen}:${name}`,
    ab,
    context,
    prompt,
    visual: pairTable(p, () => BOX),
    answer: { kind: 'number', value: rest, unit: 'Paare' },
    hints: ['Jedes leere Kästchen ist 1 Paar.', 'Rechne dann alle Paare minus die gewählten Paare.'],
    steps: [`Es gibt ${fmt(a)} · ${fmt(b)} = ${fmt(n)} Paare.`, `${name} wählt ${fmt(chosen)} Paare.`, `${fmt(n)} − ${fmt(chosen)} = ${fmt(rest)}`],
    bugs: bugList(rest, [
      ['kombi-rest', chosen, 'Das sind die gewählten Paare. Gefragt sind die anderen.'],
      ['kombi-rest', n, 'Das sind alle Paare. Einige sind schon gewählt.'],
    ]),
    praise: 'Du hast von allen Paaren aus gerechnet.',
    srText: spoken(undefined, `Tabelle: ${amount(theme.first, a)} und ${amount(theme.second, b)}.`, context, prompt),
    kmk: KMK,
  });
}

/** What is dropped: rows and columns of the table. Stufe 2 one of them; Stufe 3 also two, or one of each. */
const DROPS: Readonly<Record<2 | 3, readonly (readonly [rows: number, cols: number])[]>> = {
  2: [[1, 0], [0, 1]],
  3: [[1, 0], [0, 1], [2, 0], [0, 2], [1, 1]],
};

/** One or more choices are dropped: the rest of the table counts. */
function paareOhne(rng: Rng, stufe: 2 | 3, ab: Ab, a: number, b: number): Exercise {
  const p = pairing(rng, a, b, false);
  const { theme } = p;
  const [rows, cols] = rng.pick(DROPS[stufe]);
  const n = (a - rows) * (b - cols);
  const all = a * b;
  const { name } = pickPerson(rng);
  const dropped = joinDe([...(rows ? [amount(theme.first, rows)] : []), ...(cols ? [amount(theme.second, cols)] : [])]);
  const context = `${whatIsAPair(theme)} ${dropped} mag ${name} nicht.`;
  const prompt = `Wie viele Paare kann ${name} wählen?`;
  return build(SKILL, stufe, {
    key: `ohne:${theme.id}:${a}x${b}:${rows}x${cols}:${p.rows.join('-')}:${p.cols.join('-')}:${name}`,
    ab,
    context,
    prompt,
    visual: pairTable(p, () => BOX),
    answer: { kind: 'number', value: n, unit: 'Paare' },
    hints: ['Streiche diese Stücke in Gedanken aus der Tabelle.', 'Wie viele Zeilen und Spalten bleiben dann?'],
    steps: [`Übrig sind: ${fmt(a - rows)} ${a - rows === 1 ? 'Zeile' : 'Zeilen'} und ${fmt(b - cols)} ${b - cols === 1 ? 'Spalte' : 'Spalten'}.`, `${fmt(a - rows)} · ${fmt(b - cols)} = ${fmt(n)}`, `Es gibt ${fmt(n)} Paare.`],
    bugs: bugList(n, [
      ['kombi-rest', all, 'Das sind alle Paare. Einige passen nicht mehr.'],
      ['kombi-rest', all - rows - cols, 'Es fallen mehr Paare weg. Jedes Stück steckt in mehreren Paaren.'],
    ]),
    praise: 'Du hast die Tabelle in Gedanken gekürzt.',
    srText: spoken(undefined, `Tabelle: ${amount(theme.first, a)} und ${amount(theme.second, b)}.`, context, prompt),
    kmk: KMK,
  });
}

/** The table so far and what comes: the pairs at the end stay inside the Stufe (3 × 2, 3 × 3), and the new pairs differ. */
const NEW_CHOICES: Readonly<Record<2 | 3, readonly (readonly [a: number, b: number, rows: number, cols: number])[]>> = {
  2: [[2, 2, 1, 0], [2, 2, 0, 1], [3, 1, 0, 1], [2, 1, 1, 1]],
  3: [[3, 2, 0, 1], [3, 1, 0, 2], [2, 2, 1, 1]],
};

/** Stufe 2 and 3, AB III: all pairs at the end are the same number on a Stufe, so the task asks how many are new. */
function neuePaare(rng: Rng, stufe: 2 | 3, ab: Ab): Exercise {
  const [a, b, rows, cols] = rng.pick(NEW_CHOICES[stufe]);
  const p = pairing(rng, a, b, false);
  const { theme } = p;
  const { name } = pickPerson(rng);
  const before = a * b;
  const after = (a + rows) * (b + cols);
  const n = after - before;
  const comes = joinDe([...(rows ? [amount(theme.first, rows)] : []), ...(cols ? [amount(theme.second, cols)] : [])]);
  const context = `${whatIsAPair(theme)} ${name} bekommt noch ${comes}.`;
  const prompt = 'Wie viele neue Paare kommen dazu?';
  return build(SKILL, stufe, {
    key: `dazu:${theme.id}:${a}x${b}:${rows}x${cols}:${p.rows.join('-')}:${p.cols.join('-')}:${name}`,
    ab,
    context,
    prompt,
    visual: pairTable(p, () => BOX),
    answer: { kind: 'number', value: n, unit: 'Paare' },
    hints: [`${theme.second.each} passt ${theme.first.toEach}.`, 'Zähle nur die Paare mit den neuen Stücken.'],
    steps: [`Vorher: ${fmt(a)} · ${fmt(b)} = ${fmt(before)} Paare.`, `Nachher: ${fmt(a + rows)} · ${fmt(b + cols)} = ${fmt(after)} Paare.`, `${fmt(after)} − ${fmt(before)} = ${fmt(n)}`],
    bugs: bugList(n, [
      ['kombi-dazu', 1, 'Ein neues Stück passt zu mehreren anderen. Das gibt mehr Paare.'],
      ['kombi-dazu', before, 'Das sind die Paare von vorher. Gefragt sind die neuen.'],
      ['kombi-dazu', after, 'Das sind alle Paare. Gefragt sind nur die neuen.'],
    ]),
    praise: 'Du hast an alle neuen Paare gedacht.',
    srText: spoken(undefined, `Tabelle: ${amount(theme.first, a)} und ${amount(theme.second, b)}.`, context, prompt),
    kmk: KMK,
  });
}

// ─── Reihenfolgen von 3 Dingen ───────────────────────────────────────────────

/** All orders of three things. */
export function orders3<T>(items: readonly [T, T, T]): T[][] {
  const [a, b, c] = items;
  return [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];
}

/** Short headings: 3 columns of '1. Platz' are wider than a phone. The caption says what they count. */
const PLACES = ['1.', '2.', '3.'];

function orderTable(rows: readonly string[][]): Visual {
  return { type: 'table', caption: 'Reihenfolgen: 1., 2. und 3. Platz', header: PLACES, rows: rows.map((r) => [...r]) };
}

const orderText = (o: readonly string[]) => o.join(', ');

/** All orders inside the steps: one column, since a column per place is wider than a 375 px phone there. */
function allOrders(names: readonly [string, string, string]): Visual {
  return { type: 'table', caption: 'Alle Reihenfolgen', header: ['1., 2., 3. Platz'], rows: orders3(names).map((o) => [orderText(o)]) };
}

const spokenOrders = (rows: readonly (readonly string[])[]) => `Tabelle mit diesen Reihenfolgen: ${rows.map(orderText).join('; ')}.`;

function threeNames(rng: Rng): [string, string, string] {
  const names = new Set<string>();
  while (names.size < 3) names.add(pickPerson(rng).name);
  return [...names] as [string, string, string];
}

function reihenfolgenZaehlen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const names = threeNames(rng);
  const [a, b, c] = names;
  const context = `${a}, ${b} und ${c} stellen sich in eine Reihe.`;
  const prompt = 'Wie viele Reihenfolgen gibt es?';
  const visual = orderTable([[a, b, c]]);
  return build(SKILL, stufe, {
    key: `reihen:${names.join('-')}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value: 6, unit: 'Reihenfolgen' },
    hints: [`Stell ${a} nach vorne. Wie können die anderen 2 Kinder stehen?`, 'Mach das Gleiche mit den anderen Kindern vorne.'],
    steps: [`Mit ${a} vorne gibt es 2 Reihenfolgen.`, 'Für jedes der 3 Kinder vorne gibt es 2.', { text: '2 + 2 + 2 = 6', visual: allOrders(names) }],
    bugs: bugList(6, [
      ['reihenfolge-kinder', 3, 'Das sind die Kinder. Jedes Kind vorne gibt mehrere Reihenfolgen.'],
      ['reihenfolge-mal', 9, 'Jedes Kind steht nur an einem Platz. Geh der Reihe nach durch.'],
    ]),
    praise: 'Du hast die Reihenfolgen geordnet gesucht.',
    srText: spoken(undefined, context, prompt),
    kmk: KMK,
  });
}

/** The total of 6 can come from memory; how many are still missing has to come from the table. AB I the list is long, AB III short. */
function reihenfolgenRest(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const names = threeNames(rng);
  const [a, b, c] = names;
  const shown = ab === 1 ? rng.int(3, 4) : rng.int(1, 2);
  const rows = rng.sample(orders3(names), shown);
  const rest = 6 - shown;
  const context = `${a}, ${b} und ${c} stellen sich in eine Reihe.`;
  const prompt = 'Wie viele Reihenfolgen fehlen noch in der Tabelle?';
  return build(SKILL, stufe, {
    key: `reihen-rest:${names.join('-')}:${rows.map((o) => o.map((x) => names.indexOf(x)).join('')).join('-')}`,
    ab,
    context,
    prompt,
    visual: orderTable(rows),
    answer: { kind: 'number', value: rest, unit: 'Reihenfolgen' },
    hints: [`Stell ${a} nach vorne. Wie können die anderen Kinder stehen?`, 'Rechne alle Reihenfolgen minus die Reihen in der Tabelle.'],
    steps: ['Für jedes der 3 Kinder vorne gibt es 2.', { text: '2 + 2 + 2 = 6', visual: allOrders(names) }, `6 − ${fmt(shown)} = ${fmt(rest)}`],
    bugs: bugList(rest, [
      ['reihenfolge-rest', shown, 'Das sind die Reihen in der Tabelle. Wie viele fehlen noch?'],
      ['reihenfolge-rest', 6, 'Das sind alle Reihenfolgen. Einige stehen schon in der Tabelle.'],
    ]),
    praise: 'Du hast die Reihenfolgen geordnet gesucht.',
    srText: spoken(undefined, spokenOrders(rows), context, prompt),
    kmk: KMK,
  });
}

function reihenfolgeFehlt(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const names = threeNames(rng);
  const all = orders3(names);
  const missing = rng.int(0, 5);
  const shown = all.filter((_, i) => i !== missing);
  const visual = orderTable(shown);
  const prompt = 'Welche Reihenfolge fehlt in der Tabelle?';
  const correct = orderText(all[missing]);
  return build(SKILL, stufe, {
    key: `reihe-fehlt:${names.join('-')}:${missing}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(rng, { label: correct }, rng.shuffle(shown).map((o) => ({ label: orderText(o), whyWrong: 'Diese Reihenfolge steht schon in der Tabelle.' }))),
    hints: ['Jedes Kind steht 2-mal vorne. Wer steht dort nur 1-mal?', 'Schau dann auf die anderen Plätze.'],
    steps: [`${all[missing][0]} steht nur 1-mal vorne.`, `In der Tabelle steht ${all[missing][0]}, ${all[missing][2]}, ${all[missing][1]}.`, `Es fehlt ${correct}.`],
    praise: 'Du hast die Plätze geordnet geprüft.',
    srText: spoken(undefined, spokenOrders(shown), prompt),
    kmk: KMK,
  });
}

// ─── Forms by Stufe and AB ───────────────────────────────────────────────────

type Size = readonly [rows: number, columns: number];

// More rows than columns: a row costs no width on a phone, a column does (§7). Stufe 1 has several sizes, so that no answer is fixed; on Stufe 2 and 3 the size of the cell is the content.
const SIZES: Readonly<Record<Stufe, readonly Size[]>> = { 1: [[2, 2], [2, 1], [3, 1]], 2: [[3, 2]], 3: [[3, 3]] };
// The table of Stufe 1 before the new choice: with it, the pairs stay within 2 × 2.
const DAZU_SIZES: readonly Size[] = [[2, 1], [1, 2]];
// Without a table the sides can swap: no column to fit on a phone.
const TEXT_SIZES: readonly Size[] = [[3, 2], [2, 3]];

/** Backwards: the number of pairs and of the first choices are given, the number of the second choices is asked. Never 2 × 2: the 2 of the answer would stand in the task. */
function paareRueck(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = rng.pick<Size>([[3, 2], [2, 3]]);
  const p = pairing(rng, a, b, false);
  const { theme } = p;
  const { name } = pickPerson(rng);
  const n = a * b;
  const context = `${whatIsAPair(theme)} ${name} hat ${amount(theme.first, a)} und kann ${fmt(n)} Paare wählen.`;
  const prompt = `Wie viele ${theme.second.title} hat ${name}?`;
  return build(SKILL, stufe, {
    key: `paare-rueck:${theme.id}:${a}x${b}:${name}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: b, unit: theme.second.title },
    hints: [`${theme.first.each} passt ${theme.second.toEach}.`, `Wie viele Paare gibt es mit 1 ${theme.first.one}?`],
    steps: [repeatedSum(a, b), `Mit 1 ${theme.first.one} gibt es ${fmt(b)} Paare.`, `${name} hat ${amount(theme.second, b)}.`],
    bugs: bugList(b, [['kombi-addiert', n - a, addHint(theme)]]),
    praise: 'Du hast von den Paaren zurück gedacht.',
    srText: spoken(undefined, context, prompt),
    kmk: KMK,
  });
}

function formOf(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = rng.pick(SIZES[stufe]);
  if (stufe === 1) {
    if (ab === 3) {
      const [da, db] = rng.pick(DAZU_SIZES);
      return einsDazu(rng, stufe, ab, da, db);
    }
    const pictures = ab === 1;
    return rng.chance(0.3) ? paarFehlt(rng, stufe, ab, a, b, pictures) : paareZaehlen(rng, stufe, ab, a, b, { pictures });
  }
  if (stufe === 2) {
    if (ab === 1) return rng.chance(1 / 3) ? paareZaehlen(rng, stufe, ab, a, b) : paareRest(rng, stufe, ab, a, b);
    if (ab === 2) {
      const [ta, tb] = rng.pick(TEXT_SIZES);
      return rng.pick<() => Exercise>([() => paarFehlt(rng, stufe, ab, a, b, false), () => paareZaehlen(rng, stufe, ab, ta, tb, { table: false }), () => paareOhne(rng, 2, ab, a, b)])();
    }
    return rng.chance(0.5) ? neuePaare(rng, 2, ab) : paareRueck(rng, stufe, ab);
  }
  if (ab === 1) return rng.pick<() => Exercise>([() => paareZaehlen(rng, stufe, ab, a, b), () => paareRest(rng, stufe, ab, a, b), () => reihenfolgenRest(rng, stufe, ab)])();
  if (ab === 2) return rng.pick<() => Exercise>([() => reihenfolgenZaehlen(rng, stufe, ab), () => paareZaehlen(rng, stufe, ab, a, b, { table: false }), () => paareOhne(rng, 3, ab, a, b), () => paareOhne(rng, 3, ab, a, b)])();
  return rng.pick<() => Exercise>([() => neuePaare(rng, 3, ab), () => reihenfolgenRest(rng, stufe, ab), () => reihenfolgeFehlt(rng, stufe, ab)])();
}

export const kombinierenSkill: SkillDef = {
  ...SKILL,
  title: 'Wie viele Möglichkeiten?',
  description: 'Du findest alle Möglichkeiten und zählst sie.',
  stufen: {
    1: 'Du findest Paare in einer kleinen Tabelle.',
    2: 'Du findest mehr Paare, bis 6.',
    3: 'Du findest mehr Paare und alle Reihenfolgen.',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return formOf(rng, stufe, ab);
  },
};
