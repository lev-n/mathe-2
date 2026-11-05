/**
 * Säulendiagramme. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1, read a value, axis step 1, up to 10: AB I 3 bars up to 8; AB II 4 bars up to 10; AB III check a claim, from the number to the bar.
 * Stufe 2, difference, total, highest, axis step 1: AB I difference of 3 bars, total of 2, the number on the highest bar; AB II 4 bars, total of 3
 * up to 20, the highest of bars that stand close; AB III which bar has so many more, how many are missing, a bar from the total.
 * Stufe 3, axis step 2 or 5, up to 50, table to chart: AB I read a value; AB II difference, total, table to chart; AB III table to chart on the
 * longer axis, which bar has so many more, how many are missing, a bar from the total.
 * Step 1 stays on Stufe 1 and 2: the steps of 2 and 5 are what Stufe 3 adds. Bars end on a grid line, so that reading never needs a value between two lines.
 */
import { fmt } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, pickPerson, targetAb } from '../shared';
import { HINT_DIFF, HINT_MEHR, HINT_PLUS, parts, pickRows, pictureChoice, spacedValues, spoken, sum, valuesText, type DataTheme } from './helpers';

const SKILL = { id: 'daten.saeulen', topicId: 'daten' } as const;
const KMK = ['DZ.daten', 'PK.darstellen'];

export interface Axis {
  step: 1 | 2 | 5;
  max: number;
}

/**
 * Axis by Stufe and AB level. Step 1 stays at 12 or below: 20 grid lines would stand too close, so "bis 20" on Stufe 2 is what the totals reach (§6: ≤ 10, ≤ 20, ≤ 50).
 */
export const AXES: Record<Stufe, Record<Ab, readonly Axis[]>> = {
  1: { 1: [{ step: 1, max: 8 }], 2: [{ step: 1, max: 10 }], 3: [{ step: 1, max: 10 }] },
  2: { 1: [{ step: 1, max: 10 }], 2: [{ step: 1, max: 12 }], 3: [{ step: 1, max: 12 }] },
  3: { 1: [{ step: 2, max: 20 }, { step: 5, max: 30 }], 2: [{ step: 2, max: 20 }, { step: 5, max: 30 }], 3: [{ step: 2, max: 20 }, { step: 5, max: 50 }] },
};

/** Largest total per Stufe (§6). */
export const TOTAL_CAP: Record<Stufe, number> = { 1: 10, 2: 20, 3: 50 };

const HINT_AXIS = 'Schau auf die Achse: Wie viel zählt ein Kästchen?';

const chart = (theme: DataTheme, cats: readonly string[], values: readonly number[], axis: Axis): Visual => ({
  type: 'barChart',
  title: theme.title,
  categories: [...cats],
  values: [...values],
  axisMax: axis.max,
  axisStep: axis.step,
  valueLabel: `Anzahl ${theme.unit}`,
});

/** The smallest value of a bar: one step, and 2 on an axis of ones, so that a plural always fits. */
const minOf = (axis: Axis) => Math.max(axis.step, 2);

/** 3 bars fit a 375 px phone with every label, 4 bars only with up to 7 letters per label (BarChartVisual: 10 px per letter). */
export const LONGEST_LABEL_OF_4 = 7;
/** Charts as answer options: an option has 277 px on a 375 px phone, and a chart keeps 0.7 of its drawn width (longer names would make it scroll). */
const LONGEST_LABEL_IN_OPTION = 9;

function barsOf(rng: Rng, axis: Axis, n: number, longest = n > 3 ? LONGEST_LABEL_OF_4 : undefined) {
  const values = spacedValues(rng, n, minOf(axis), axis.max, Math.max(axis.step, 2), axis.step);
  // The axis.max, not the largest value: the wrong diagram of a table may show one step more.
  return { ...pickRows(rng, n, axis.max, longest ? (c) => c.length <= longest : undefined), values };
}

/** AB I has 3 bars. On Stufe 1 and 2 AB II has 4: that is its harder reading. */
const barCount = (rng: Rng, stufe: Stufe, ab: Ab) => (ab === 1 ? 3 : ab === 2 && stufe < 3 ? 4 : rng.int(3, 4));

const axisHints = (axis: Axis): string => (axis.step === 1 ? 'Jedes Kästchen an der Achse zählt 1.' : `Jedes Kästchen an der Achse zählt ${fmt(axis.step)}.`);

/** A child who counts the boxes and forgets the step. */
const axisBug = (axis: Axis, wrong: number): [string, number | null, string] => ['achse-schritt', axis.step > 1 ? wrong / axis.step : null, HINT_AXIS];

function ablesen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  const n = barCount(rng, stufe, ab);
  const { theme, cats, values } = barsOf(rng, axis, n);
  const t = rng.int(0, n - 1);
  const [c, v] = [cats[t], values[t]];
  const visual = chart(theme, cats, values, axis);
  const prompt = theme.how(c);
  return build(SKILL, stufe, {
    key: `lesen:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: v, unit: theme.unitOf(c) },
    hints: [`Geh vom oberen Ende der Säule ${c} zur Achse.`, axisHints(axis)],
    steps: [`Die Säule ${c} endet an der Linie ${fmt(v)}.`, axisHints(axis), theme.says(c, v)],
    bugs: bugList(v, [
      axisBug(axis, v),
      ...values.flatMap((o, i): [string, number, string][] => (i === t ? [] : [['andere-saeule', o, `Das ist eine andere Säule. Suche die Säule ${c}.`]])),
    ]),
    praise: 'Du hast an der Achse genau abgelesen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function saeuleFinden(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  const { theme, cats, values } = barsOf(rng, axis, 3);
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const visual = chart(theme, cats, values, axis);
  const prompt = `Welche Säule zeigt die Zahl ${fmt(v)}?`;
  return build(SKILL, stufe, {
    key: `saeule:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: c },
      cats.flatMap((o, i) => (i === t ? [] : [{ label: o, whyWrong: `Die Säule ${o} zeigt ${fmt(values[i])}.` }])),
    ),
    hints: [`Suche an der Achse die Zahl ${fmt(v)}.`, 'Geh von dort nach rechts zur Säule.'],
    steps: [`Suche an der Achse die Zahl ${fmt(v)}.`, `Die Säule ${c} endet genau dort.`],
    praise: 'Du bist von der Achse zur Säule gegangen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function unterschied(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  const n = barCount(rng, stufe, ab);
  const { theme, cats, values } = barsOf(rng, axis, n);
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const [va, vb] = [values[a], values[b]];
  const d = va - vb;
  const visual = chart(theme, cats, values, axis);
  const prompt = theme.more(cats[a], cats[b]);
  return build(SKILL, stufe, {
    key: `unterschied:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}:${a}:${b}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: d, unit: theme.unitOf(cats[a]) },
    hints: [axisHints(axis), HINT_DIFF],
    steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} − ${fmt(vb)} = ${fmt(d)}. Es sind ${fmt(d)} mehr.`],
    bugs: bugList(d, [
      axisBug(axis, d),
      ['mehr-unterschied', va, HINT_MEHR],
      ['plus-statt-minus', va + vb, HINT_PLUS],
    ]),
    praise: 'Du hast beide Säulen abgelesen und gerechnet.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** Stufe 2, AB I: the total of 2 bars stays small. */
const SMALL_TOTAL = 12;

function zusammen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  const n = stufe === 2 && ab === 1 ? 2 : 3;
  const { theme, cats } = pickRows(rng, n, axis.max);
  const low = minOf(axis);
  const cap = stufe === 2 && ab === 1 ? SMALL_TOTAL : Math.min(TOTAL_CAP[stufe], n * axis.max);
  const total = low * n + axis.step * rng.int(n === 3 ? 1 : 0, Math.floor((cap - n * low) / axis.step));
  const values = parts(rng, total, n, low, axis.max, axis.step);
  const visual = chart(theme, cats, values, axis);
  const prompt = `Wie viele ${theme.unit} sind es insgesamt?`;
  return build(SKILL, stufe, {
    key: `gesamt:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: total, unit: theme.unit },
    hints: [axisHints(axis), 'Rechne die Zahlen aller Säulen zusammen.'],
    steps: [`${valuesText(cats, values)}.`, `${values.map((v) => fmt(v)).join(' + ')} = ${fmt(total)}`, `Insgesamt sind es ${fmt(total)} ${theme.unit}.`],
    bugs: bugList(total, [
      axisBug(axis, total),
      ...values.map((v): [string, number, string] => ['saeule-vergessen', total - v, 'Hast du jede Säule mitgerechnet? Prüfe jede Säule.']),
    ]),
    praise: 'Du hast keine Säule ausgelassen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** Stufe 2, AB I: find the highest or lowest bar, then read it: two steps, one more than reading a named bar. */
function hoechsterWert(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  const n = barCount(rng, stufe, ab);
  const { theme, cats, values } = barsOf(rng, axis, n);
  const most = rng.chance(0.6);
  const v = most ? Math.max(...values) : Math.min(...values);
  const c = cats[values.indexOf(v)];
  const word = most ? 'höchste' : 'niedrigste';
  const visual = chart(theme, cats, values, axis);
  const prompt = `Welche Zahl zeigt die ${word} Säule?`;
  return build(SKILL, stufe, {
    key: `hoechste-wert:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}:${most ? 'max' : 'min'}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: v },
    hints: [`Suche zuerst die ${word} Säule.`, 'Geh dann vom oberen Ende zur Achse.'],
    steps: [`${valuesText(cats, values)}.`, `Die ${word} Säule ist ${c}.`, `Die Säule zeigt ${fmt(v)}.`],
    bugs: bugList(v, values.map((o): [string, number, string] => ['andere-saeule', o, `Das ist eine andere Säule. Suche die ${word} Säule.`])),
    praise: 'Du hast die Säule gesucht und abgelesen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** Stufe 2, AB II: which bar is highest or lowest? Two bars stand one step apart, so that the eye alone is not enough. */
function hoechste(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  const n = barCount(rng, stufe, ab);
  const drawn = barsOf(rng, axis, n);
  const { theme, cats } = drawn;
  const most = rng.chance(0.6);
  const target = most ? Math.max(...drawn.values) : Math.min(...drawn.values);
  const t = drawn.values.indexOf(target);
  const near = target + (most ? -axis.step : axis.step);
  const values = drawn.values.includes(near) ? drawn.values : drawn.values.map((v, i) => (i === (t + 1) % n ? near : v));
  const visual = chart(theme, cats, values, axis);
  const prompt = most ? 'Welche Säule ist am höchsten?' : 'Welche Säule ist am niedrigsten?';
  const word = most ? 'höher' : 'niedriger';
  return build(SKILL, stufe, {
    key: `hoechste:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}:${most ? 'max' : 'min'}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: cats[t] },
      cats.flatMap((o, i) => (i === t ? [] : [{ label: o, whyWrong: `Die Säule ${o} zeigt ${fmt(values[i])}. Eine andere Säule ist ${word}.` }])),
    ),
    hints: ['Vergleiche die oberen Enden der Säulen.', axisHints(axis)],
    steps: [`${valuesText(cats, values)}.`, `Die Säule ${cats[t]} zeigt ${fmt(target)}.`, `Die Säule ${cats[t]} ist am ${most ? 'höchsten' : 'niedrigsten'}.`],
    praise: 'Du hast alle Säulen verglichen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: a claim about one bar. The other number is another bar's, or one step more or fewer. */
function aussage(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  const { theme, cats, values } = barsOf(rng, axis, 3);
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const holds = rng.chance(0.5);
  const others = [...values.filter((_, i) => i !== t), v + axis.step, ...(v - axis.step >= minOf(axis) ? [v - axis.step] : [])];
  const claim = holds ? v : rng.pick(others);
  const visual = chart(theme, cats, values, axis);
  const { name } = pickPerson(rng);
  const context = `${name} sagt: ${theme.says(c, claim)}`;
  const prompt = 'Stimmt das?';
  const yes = 'Ja, das stimmt.';
  const no = 'Nein, das stimmt nicht.';
  return build(SKILL, stufe, {
    key: `aussage:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}:${t}:${claim}`,
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: holds ? yes : no }, [{ label: holds ? no : yes, whyWrong: `Die Säule ${c} zeigt ${fmt(v)}. ${holds ? 'Das passt.' : 'Das passt nicht.'}` }], { order: [yes, no] }),
    hints: [`Schau nur auf die Säule ${c}.`, 'Vergleiche die Zahl an der Achse mit dem Satz.'],
    steps: [`Die Säule ${c} zeigt ${fmt(v)}.`, axisHints(axis), holds ? 'Der Satz stimmt.' : 'Der Satz stimmt nicht.'],
    praise: 'Du hast den Satz am Diagramm geprüft.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** AB III, the other way round: which bar has so many more than the bar named? */
function welcheMehr(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  const { theme, cats, values } = barsOf(rng, axis, 3);
  const [i, j] = rng.sample([0, 1, 2], 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const d = values[a] - values[b];
  const visual = chart(theme, cats, values, axis);
  const prompt = `Welche Säule zeigt ${fmt(d)} mehr als ${cats[b]}?`;
  const others = cats.flatMap((o, k) => (k === a || k === b ? [] : [{ label: o, whyWrong: `Die Säule ${o} zeigt ${fmt(values[k])}.` }]));
  return build(SKILL, stufe, {
    key: `welche-mehr:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}:${a}:${b}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(rng, { label: cats[a] }, [...others, { label: cats[b], whyWrong: 'Das ist die Säule aus der Frage.' }]),
    hints: [`Lies zuerst die Säule ${cats[b]} ab.`, 'Rechne die Zahl aus der Frage dazu.'],
    steps: [`Die Säule ${cats[b]} zeigt ${fmt(values[b])}.`, `${fmt(values[b])} + ${fmt(d)} = ${fmt(values[a])}`, `Die Säule ${cats[a]} zeigt ${fmt(values[a])}.`],
    praise: 'Du hast vom Unterschied zur Säule gedacht.',
    srText: spoken(visual, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** AB III: a bar is to become as high as another one. */
function angleichen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  const { theme, cats, values } = barsOf(rng, axis, 3);
  const [i, j] = rng.sample([0, 1, 2], 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const d = values[a] - values[b];
  const visual = chart(theme, cats, values, axis);
  const context = `Die Säule ${cats[b]} soll so hoch sein wie ${cats[a]}.`;
  const prompt = `Wie viele ${theme.unit} fehlen noch?`;
  return build(SKILL, stufe, {
    key: `angleichen:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}:${a}:${b}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value: d, unit: theme.unit },
    hints: [axisHints(axis), HINT_DIFF],
    steps: [theme.says(cats[a], values[a]), theme.says(cats[b], values[b]), `${fmt(values[a])} − ${fmt(values[b])} = ${fmt(d)}`],
    bugs: bugList(d, [
      axisBug(axis, d),
      ['mehr-unterschied', values[a], HINT_MEHR],
      ['plus-statt-minus', values[a] + values[b], HINT_PLUS],
    ]),
    praise: 'Du hast den Unterschied der Säulen gefunden.',
    srText: spoken(visual, context, prompt),
    kmk: KMK,
  });
}

/** AB III: the total and 2 bars are given, the third bar is missing from the chart. */
function ausSumme(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  let values = spacedValues(rng, 3, minOf(axis), axis.max, Math.max(axis.step, 2), axis.step);
  while (sum(values) > TOTAL_CAP[stufe]) values = spacedValues(rng, 3, minOf(axis), axis.max, Math.max(axis.step, 2), axis.step);
  const { theme, cats } = pickRows(rng, 3, axis.max);
  const total = sum(values);
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const shownCats = cats.filter((_, i) => i !== t);
  const shownValues = values.filter((_, i) => i !== t);
  const known = sum(shownValues);
  const visual = chart(theme, shownCats, shownValues, axis);
  const context = `Insgesamt sind es ${fmt(total)} ${theme.unit}. Die Säule ${c} fehlt.`;
  const prompt = theme.how(c);
  return build(SKILL, stufe, {
    key: `aus-summe:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value: v, unit: theme.unitOf(c) },
    hints: ['Lies zuerst die 2 Säulen ab.', 'Rechne dann: alle minus die 2 Säulen.'],
    steps: [`${valuesText(shownCats, shownValues)}.`, `${shownValues.map((x) => fmt(x)).join(' + ')} = ${fmt(known)}`, `${fmt(total)} − ${fmt(known)} = ${fmt(v)}`],
    bugs: bugList(v, [
      axisBug(axis, v),
      ['saeule-vergessen', known, 'Das sind nur die 2 Säulen. Wie viele fehlen bis zu allen?'],
      ['plus-statt-minus', total + known, 'Die Säule ist nur ein Teil von allen. Rechne minus.'],
    ]),
    praise: 'Du hast von allen zurück gerechnet.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function tabelleZuDiagramm(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const axis = rng.pick(AXES[stufe][ab]);
  const { theme, cats, values } = barsOf(rng, axis, 3, LONGEST_LABEL_IN_OPTION);
  const visual: Visual = {
    type: 'table',
    caption: theme.title,
    header: [theme.head, theme.numberHead],
    rows: cats.map((c, i) => [c, fmt(values[i])]),
  };
  const [x, y] = rng.sample([0, 1, 2], 2);
  const swapped = values.map((v, i) => (i === x ? values[y] : i === y ? values[x] : v));
  // One bar off by a step.
  const off = rng.int(0, 2);
  const changed = values[off] + axis.step <= axis.max ? values[off] + axis.step : values[off] - axis.step;
  const shifted = values.map((v, i) => (i === off ? changed : v));
  const prompt = 'Welches Diagramm passt zur Tabelle?';
  const { answer, labels } = pictureChoice(rng, 'Diagramm', [
    { visual: chart(theme, cats, values, axis) },
    { visual: chart(theme, cats, swapped, axis), whyWrong: `Schau in die Zeile ${cats[x]}: Dort steht ${fmt(values[x])}.` },
    { visual: chart(theme, cats, shifted, axis), whyWrong: `Schau in die Zeile ${cats[off]}: Dort steht ${fmt(values[off])}.` },
  ]);
  return build(SKILL, stufe, {
    key: `tabelle:${theme.id}:${axis.step}:${axis.max}:${cats.join('-')}:${values.join('-')}:${x}:${y}:${off}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Nimm eine Zeile der Tabelle. Prüfe die passende Säule.', axisHints(axis)],
    steps: [`Die Tabelle zeigt: ${valuesText(cats, values)}.`, 'Prüfe jede Säule an der Achse.', `${labels[0]} passt.`],
    praise: 'Du hast jede Säule mit der Tabelle geprüft.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [ablesen], 2: [ablesen], 3: [aussage, saeuleFinden] },
  2: { 1: [unterschied, zusammen, hoechsterWert], 2: [unterschied, zusammen, hoechste], 3: [welcheMehr, angleichen, ausSumme] },
  3: { 1: [ablesen, ablesen, saeuleFinden], 2: [unterschied, zusammen, tabelleZuDiagramm], 3: [tabelleZuDiagramm, welcheMehr, angleichen, ausSumme] },
};

export const saeulenSkill: SkillDef = {
  ...SKILL,
  title: 'Säulendiagramme',
  description: 'Du liest Säulen ab und vergleichst sie.',
  stufen: {
    1: 'Du liest Säulen ab, Zahlen bis 10.',
    2: 'Unterschied, zusammen und die höchste Säule, bis 20.',
    3: 'Achse mit Schritten von 2 oder 5, bis 50.',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
