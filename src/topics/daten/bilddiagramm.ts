/**
 * Bilddiagramme. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1, 1 Bild = 1, values up to 10: AB I read a row, up to 6; AB II read one of 4 rows, find the row with a number; AB III check a claim,
 * pictures added, two rows together.
 * Stufe 2, most, fewest, difference, values up to 10: AB I most or fewest of 3 rows; AB II of 4 rows, the difference; AB III which row has so
 * many more, how many to add.
 * Stufe 3 (Knobel), 1 Bild = 2, values up to 20: AB I read whole pictures; AB II read half pictures too, the difference; AB III think
 * backwards: how many pictures; the legend is hidden, one row gives its number and another row is asked for.
 */
import { fmt } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, pickPerson, targetAb } from '../shared';
import { HINT_DIFF, HINT_MEHR, HINT_PLUS, picturesBeside, pickRows, spacedValues, spoken, valuesText, type DataTheme } from './helpers';

const SKILL = { id: 'daten.bilddiagramm', topicId: 'daten' } as const;
const KMK = ['DZ.daten', 'PK.darstellen'];

/** Largest value with 1 picture = 2 (§6: the Knobel on Stufe 3, up to 20). */
export const CAP_TWO = 20;

const chart = (theme: DataTheme, cats: readonly string[], values: readonly number[], iconValue: 1 | 2, showKey = true): Visual => ({
  type: 'pictogram',
  title: theme.title,
  categories: [...cats],
  values: [...values],
  iconValue,
  icon: theme.icon,
  ...(showKey ? {} : { showKey: false }),
});

const pictures = (n: number) => (n === 1 ? '1 Bild' : `${fmt(n)} Bilder`);
/** 'sind 3 Bilder', 'ist 1 Bild' */
const arePictures = (n: number) => `${n === 1 ? 'ist' : 'sind'} ${pictures(n)}`;
const hintLegend = (unit: string) => `Schau in die Legende: Ein Bild steht für 2 ${unit}.`;

/** Labels and values that fit a phone together: a long label leaves room for fewer pictures, never below the room n rows need. */
function rows(rng: Rng, n: number, gap = 1, max = 10) {
  const need = 2 + (n - 1) * gap;
  const { theme, cats } = pickRows(rng, n, max, (c) => picturesBeside([c]) >= need);
  return { theme, cats, values: spacedValues(rng, n, 2, Math.min(max, picturesBeside(cats)), gap) };
}

const YES = 'Ja, das stimmt.';
const NO = 'Nein, das stimmt nicht.';

// ─── Stufe 1: 1 Bild = 1 ─────────────────────────────────────────────────────

/** AB I: 3 rows up to 6; AB II: 4 rows up to 10. */
function ablesen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = ab === 1 ? 3 : 4;
  const { theme, cats, values } = rows(rng, n, 1, ab === 1 ? 6 : 10);
  const t = rng.int(0, n - 1);
  const [c, v] = [cats[t], values[t]];
  const visual = chart(theme, cats, values, 1);
  const prompt = theme.how(c);
  return build(SKILL, stufe, {
    key: `lesen:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: v, unit: theme.unitOf(c) },
    hints: [`Schau nur in die Reihe ${c}.`, 'Ein Bild steht für 1. Wie viele Bilder sind es?'],
    steps: [`In der Reihe ${c} ${arePictures(v)}.`, 'Ein Bild steht für 1.', theme.says(c, v)],
    bugs: bugList(
      v,
      values.flatMap((o, i): [string, number, string][] => (i === t ? [] : [['andere-reihe', o, `Das ist eine andere Reihe. Schau in die Reihe ${c}.`]])),
    ),
    praise: 'Du hast die Bilder in der Reihe gezählt.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function reiheFinden(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = rows(rng, 3);
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const visual = chart(theme, cats, values, 1);
  const prompt = `In welcher Reihe ${arePictures(v)}?`;
  return build(SKILL, stufe, {
    key: `reihe:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: c },
      cats.flatMap((o, i) => (i === t ? [] : [{ label: o, whyWrong: `In der Reihe ${o} ${arePictures(values[i])}.` }])),
    ),
    hints: ['Gehe die Reihen von oben nach unten durch.', 'Prüfe in jeder Reihe die Zahl der Bilder.'],
    steps: [`${valuesText(cats, values)}.`, `In der Reihe ${c} ${arePictures(v)}.`],
    praise: 'Du hast jede Reihe geprüft.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** AB III: a claim about one row. The other number is another row's, or one more or fewer. */
function aussagePruefen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = rows(rng, 3);
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const holds = rng.chance(0.5);
  // 2 or more: "1 Kinder" is no German, and a row never has 1 either
  const claim = holds ? v : rng.pick([...values.filter((_, i) => i !== t), v + 1, ...(v > 2 ? [v - 1] : [])]);
  const visual = chart(theme, cats, values, 1);
  const { name } = pickPerson(rng);
  const context = `${name} sagt: ${theme.says(c, claim)}`;
  const prompt = 'Stimmt das?';
  return build(SKILL, stufe, {
    key: `aussage:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}:${claim}`,
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: holds ? YES : NO }, [{ label: holds ? NO : YES, whyWrong: holds ? `In der Reihe ${c} ${arePictures(v)}. Das passt.` : `In der Reihe ${c} ${arePictures(v)}. Das passt nicht.` }], { order: [YES, NO] }),
    hints: [`Schau nur in die Reihe ${c}.`, 'Vergleiche die Zahl der Bilder mit dem Satz.'],
    steps: [`In der Reihe ${c} ${arePictures(v)}.`, 'Ein Bild steht für 1.', holds ? 'Der Satz stimmt.' : 'Der Satz stimmt nicht.'],
    praise: 'Du hast den Satz am Bild geprüft.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** AB III: pictures are added to a row. */
function dazumalen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = rows(rng, 3, 1, 7);
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const room = Math.min(10, picturesBeside(cats)) - v;
  const k = rng.int(1, Math.max(1, Math.min(3, room)));
  const value = v + k;
  const visual = chart(theme, cats, values, 1);
  const { name } = pickPerson(rng);
  const context = `${name} malt ${pictures(k)} in der Reihe ${c} dazu.`;
  const prompt = `Wie viele Bilder hat die Reihe ${c} dann?`;
  return build(SKILL, stufe, {
    key: `dazu:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}:${k}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value, unit: 'Bilder' },
    hints: [`Wie viele Bilder hat die Reihe ${c} jetzt?`, 'Rechne die neuen Bilder dazu.'],
    steps: [`In der Reihe ${c} ${arePictures(v)}.`, `${fmt(v)} + ${fmt(k)} = ${fmt(value)}`, `Die Reihe hat dann ${pictures(value)}.`],
    bugs: bugList(value, [['andere-reihe', v, 'Das sind die Bilder jetzt. Rechne die neuen Bilder dazu.']]),
    praise: 'Du hast die neuen Bilder mitgerechnet.',
    srText: spoken(visual, context, prompt),
    kmk: KMK,
  });
}

/** AB III: two rows together. The difference is Stufe 2. */
function zusammen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = rows(rng, 3, 1, 7);
  const [i, j] = rng.sample([0, 1, 2], 2);
  const value = values[i] + values[j];
  const visual = chart(theme, cats, values, 1);
  // 'die Reihen Fische und Schwäne': a row name after a preposition would need its Dativ ('bei Fischen'), and the names are not all regular.
  const prompt = `Wie viele Bilder haben die Reihen ${cats[i]} und ${cats[j]} zusammen?`;
  return build(SKILL, stufe, {
    key: `zusammen:${theme.id}:${cats.join('-')}:${values.join('-')}:${i}:${j}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value, unit: 'Bilder' },
    hints: ['Schau nur in diese 2 Reihen.', 'Rechne die Bilder beider Reihen zusammen.'],
    steps: [`${cats[i]} ${fmt(values[i])}, ${cats[j]} ${fmt(values[j])}.`, `${fmt(values[i])} + ${fmt(values[j])} = ${fmt(value)}`, `Zusammen sind es ${pictures(value)}.`],
    bugs: bugList(value, [
      ['andere-reihe', values[i], 'Das ist erst 1 Reihe. Rechne beide Reihen zusammen.'],
      ['andere-reihe', values[j], 'Das ist erst 1 Reihe. Rechne beide Reihen zusammen.'],
    ]),
    praise: 'Du hast beide Reihen zusammen gerechnet.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

// ─── Stufe 2: vergleichen ────────────────────────────────────────────────────

/** AB I: 3 rows; AB II: 4 rows. */
function meisteWenigste(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = ab === 1 ? 3 : 4;
  const { theme, cats, values } = rows(rng, n);
  const most = rng.chance(0.5);
  const target = most ? Math.max(...values) : Math.min(...values);
  const t = values.indexOf(target);
  const visual = chart(theme, cats, values, 1);
  const prompt = most ? theme.most : theme.least;
  const word = most ? 'längste' : 'kürzeste';
  return build(SKILL, stufe, {
    key: `extrem:${theme.id}:${cats.join('-')}:${values.join('-')}:${most ? 'max' : 'min'}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: cats[t] },
      cats.flatMap((o, i) => (i === t ? [] : [{ label: o, whyWrong: `In der Reihe ${o} ${arePictures(values[i])}. Suche die ${word} Reihe.` }])),
    ),
    hints: [`Suche die ${word} Reihe.`, 'Die Bilder sind gleich groß. Du kannst die Reihen direkt vergleichen.'],
    steps: [`${valuesText(cats, values)}.`, `Die ${word} Reihe hat ${pictures(target)}.`, `Das ist die Reihe ${cats[t]}.`],
    praise: `Du hast die ${word} Reihe gefunden.`,
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function unterschied(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = rng.int(3, 4);
  const { theme, cats, values } = rows(rng, n, 2);
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const [va, vb] = [values[a], values[b]];
  const d = va - vb;
  const visual = chart(theme, cats, values, 1);
  const prompt = theme.more(cats[a], cats[b]);
  return build(SKILL, stufe, {
    key: `unterschied:${theme.id}:${cats.join('-')}:${values.join('-')}:${a}:${b}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: d, unit: theme.unitOf(cats[a]) },
    hints: ['Vergleiche beide Reihen Bild für Bild.', 'Wie viele Bilder hat die längere Reihe mehr?'],
    steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} − ${fmt(vb)} = ${fmt(d)}. Es sind ${fmt(d)} mehr.`],
    bugs: bugList(d, [
      ['mehr-unterschied', va, HINT_MEHR],
      ['plus-statt-minus', va + vb, HINT_PLUS],
    ]),
    praise: 'Du hast die 2 Reihen verglichen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** AB III, the other way round: which row has so many pictures more? */
function welcheMehr(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = rows(rng, 3, 2);
  const [i, j] = rng.sample([0, 1, 2], 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const d = values[a] - values[b];
  const visual = chart(theme, cats, values, 1);
  const prompt = `Welche Reihe hat ${pictures(d)} mehr als ${cats[b]}?`;
  return build(SKILL, stufe, {
    key: `welche-mehr:${theme.id}:${cats.join('-')}:${values.join('-')}:${a}:${b}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(
      rng,
      { label: cats[a] },
      cats.flatMap((o, i2) => (i2 === a || i2 === b ? [] : [{ label: o, whyWrong: `In der Reihe ${o} ${arePictures(values[i2])}. Vergleiche mit der Reihe ${cats[b]}.` }])).concat([{ label: cats[b], whyWrong: 'Das ist die Reihe aus der Frage.' }]),
    ),
    hints: [`Schau zuerst in die Reihe ${cats[b]}.`, 'Rechne die Bilder aus der Frage dazu.'],
    steps: [`In der Reihe ${cats[b]} ${arePictures(values[b])}.`, `${fmt(values[b])} + ${fmt(d)} = ${fmt(values[a])}`, `Das ist die Reihe ${cats[a]}.`],
    praise: 'Du hast vom Unterschied zur Reihe gedacht.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** AB III: a row is to become as long as another one. */
function angleichen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = rows(rng, 3, 2);
  const [i, j] = rng.sample([0, 1, 2], 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const d = values[a] - values[b];
  const visual = chart(theme, cats, values, 1);
  const context = `Die Reihe ${cats[b]} soll so lang sein wie ${cats[a]}.`;
  const prompt = 'Wie viele Bilder fehlen?';
  return build(SKILL, stufe, {
    key: `angleichen:${theme.id}:${cats.join('-')}:${values.join('-')}:${a}:${b}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value: d, unit: 'Bilder' },
    hints: ['Vergleiche beide Reihen Bild für Bild.', HINT_DIFF],
    steps: [`${cats[a]} ${fmt(values[a])}, ${cats[b]} ${fmt(values[b])}.`, `${fmt(values[a])} − ${fmt(values[b])} = ${fmt(d)}`, `Es fehlen ${pictures(d)}.`],
    bugs: bugList(d, [
      ['mehr-unterschied', values[a], HINT_MEHR],
      ['plus-statt-minus', values[a] + values[b], HINT_PLUS],
    ]),
    praise: 'Du hast den Unterschied der Reihen gefunden.',
    srText: spoken(visual, context, prompt),
    kmk: KMK,
  });
}

// ─── Stufe 3: 1 Bild = 2 ─────────────────────────────────────────────────────

const capTwo = (cats: readonly string[]) => Math.min(CAP_TWO, 2 * picturesBeside(cats));

/** Values for 1 picture = 2: even, or odd ones too (half a picture). */
function twoRows(rng: Rng, n: number, evenOnly = false) {
  const { theme, cats } = pickRows(rng, n, CAP_TWO);
  return { theme, cats, values: spacedValues(rng, n, 2, capTwo(cats), 2, evenOnly ? 2 : 1) };
}

/** AB I: whole pictures only; AB II: half pictures too. */
function zweierLesen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = twoRows(rng, 3, ab === 1);
  const t = rng.int(0, 2);
  const [c, v] = [cats[t], values[t]];
  const full = Math.floor(v / 2);
  const half = v % 2 === 1;
  const visual = chart(theme, cats, values, 2);
  const prompt = theme.how(c);
  const unit = theme.unit;
  return build(SKILL, stufe, {
    key: `zweier:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}`,
    ab,
    knobel: true,
    prompt,
    visual,
    answer: { kind: 'number', value: v, unit: theme.unitOf(c) },
    hints: [hintLegend(unit), half ? 'Ein halbes Bild steht für 1.' : 'Jedes Bild zählt 2.'],
    steps: half
      ? [`In der Reihe ${c} ${arePictures(full)} und ein halbes Bild.`, `${fmt(full)}-mal die 2 ist ${fmt(full * 2)}. Dazu kommt 1.`, theme.says(c, v)]
      : [`In der Reihe ${c} ${arePictures(full)}.`, 'Ein Bild steht für 2.', theme.says(c, v)],
    bugs: bugList(v, [
      ['bild-legende', full, hintLegend(unit)],
      ['bild-legende', half ? full + 1 : null, hintLegend(unit)],
    ]),
    praise: 'Du hast an die Legende gedacht.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

function zweierUnterschied(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = twoRows(rng, 3, true);
  const [i, j] = rng.sample([0, 1, 2], 2);
  const [a, b] = values[i] > values[j] ? [i, j] : [j, i];
  const [va, vb] = [values[a], values[b]];
  const d = va - vb;
  const visual = chart(theme, cats, values, 2);
  const prompt = theme.more(cats[a], cats[b]);
  return build(SKILL, stufe, {
    key: `zweier-unterschied:${theme.id}:${cats.join('-')}:${values.join('-')}:${a}:${b}`,
    ab,
    knobel: true,
    prompt,
    visual,
    answer: { kind: 'number', value: d, unit: theme.unitOf(cats[a]) },
    hints: [hintLegend(theme.unit), HINT_DIFF],
    steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} − ${fmt(vb)} = ${fmt(d)}. Es sind ${fmt(d)} mehr.`],
    bugs: bugList(d, [
      ['bild-legende', d / 2, hintLegend(theme.unit)],
      ['mehr-unterschied', va, HINT_MEHR],
      ['plus-statt-minus', va + vb, HINT_PLUS],
    ]),
    praise: 'Du hast erst die Legende gelesen.',
    srText: spoken(visual, prompt),
    kmk: KMK,
  });
}

/** Backwards: how many pictures for a number, with the rows of the other categories as a model. */
function bilderMalen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, values } = twoRows(rng, 3, true);
  // The largest value: never 1 picture, and the two rows left show the legend at work.
  const t = values.indexOf(Math.max(...values));
  const [v, c] = [values[t], cats[t]];
  const shown = cats.filter((_, i) => i !== t);
  const shownValues = values.filter((_, i) => i !== t);
  const visual = chart(theme, shown, shownValues, 2);
  const { name } = pickPerson(rng);
  const context = `${name} malt noch eine Reihe für ${c}. Es sind ${fmt(v)} ${theme.unitOf(c)}.`;
  const prompt = `Wie viele Bilder malt ${name}?`;
  const answer = v / 2;
  return build(SKILL, stufe, {
    key: `malen:${theme.id}:${cats.join('-')}:${values.join('-')}:${name}`,
    ab,
    knobel: true,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value: answer, unit: 'Bilder' },
    hints: ['Schau in die Legende: Für wie viele steht ein Bild?', 'Mach immer 2 zusammen.'],
    steps: ['Ein Bild steht für 2.', `${fmt(answer)}-mal die 2 ist ${fmt(v)}.`, `${name} malt ${pictures(answer)}.`],
    bugs: bugList(answer, [['bild-legende-rueck', v, 'Ein Bild steht für 2. Du brauchst weniger Bilder.']]),
    praise: 'Du hast von der Zahl zum Bild gedacht.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/**
 * The legend is hidden. One row gives its number, another row is asked for: the child finds what a picture stands for on the way.
 * Asking only for the legend would have 2 as its answer every time, and the label of this Stufe says that already.
 */
function legendeFinden(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats } = pickRows(rng, 3, CAP_TWO);
  const values = spacedValues(rng, 3, 4, capTwo(cats), 2, 2);
  const [t, q] = rng.sample([0, 1, 2], 2);
  const [c, v] = [cats[t], values[t]];
  const [d, w] = [cats[q], values[q]];
  const visual = chart(theme, cats, values, 2, false);
  const context = theme.says(c, v);
  const prompt = theme.how(d);
  const pics = v / 2;
  const asked = w / 2;
  return build(SKILL, stufe, {
    key: `legende:${theme.id}:${cats.join('-')}:${values.join('-')}:${t}:${q}`,
    ab,
    knobel: true,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value: w, unit: theme.unitOf(d) },
    hints: [`Zähle die Bilder in der Reihe ${c}.`, 'Für wie viele steht dann 1 Bild?'],
    steps: [`In der Reihe ${c} ${arePictures(pics)}.`, `${fmt(pics)}-mal die 2 ist ${fmt(v)}: Ein Bild steht für 2.`, `In der Reihe ${d} ${arePictures(asked)}.`, theme.says(d, w)],
    bugs: bugList(w, [
      ['bild-zahl', asked, 'Das ist die Zahl der Bilder. Für wie viele steht ein Bild?'],
      ['bild-zahl', v, `Das ist die Reihe ${c}. Gefragt ist die Reihe ${d}.`],
    ]),
    praise: 'Du hast aus einer Reihe die Legende gefunden.',
    srText: spoken(visual, context, prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

const FORMS: Record<Stufe, Record<Ab, Form[]>> = {
  1: { 1: [ablesen], 2: [ablesen, reiheFinden], 3: [aussagePruefen, dazumalen, zusammen] },
  2: { 1: [meisteWenigste], 2: [meisteWenigste, unterschied], 3: [welcheMehr, angleichen] },
  3: { 1: [zweierLesen], 2: [zweierLesen, zweierUnterschied], 3: [bilderMalen, legendeFinden] },
};

export const bilddiagrammSkill: SkillDef = {
  ...SKILL,
  title: 'Bilddiagramme',
  description: 'Du liest ab, was die Bilder zeigen.',
  stufen: {
    1: 'Ein Bild steht für 1. Zahlen bis 10.',
    2: 'Am meisten, am wenigsten und der Unterschied.',
    3: 'Ein Bild steht für 2. Zahlen bis 20.',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
  },
};
