/**
 * Muster fortsetzen: rows of shapes (shapeRow) and growing figures on Kästchen.
 * The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1 repeat AB or ABC with shapes. AB I the gap at the end. AB II a gap inside a longer row. AB III two gaps at the end, or which part repeats.
 * Stufe 2 form and colour change on their own, never in step: a child who follows one of them alone cannot know the other. AB I one rule of 2 and one with each part twice.
 * AB II rules of 2 and 3. AB III a gap inside the row, two gaps at the end.
 * Stufe 3 find the wrong piece; a pattern that grows. AB I a wrong piece in AB or ABC, the next part of a row that grows, small figures to paint. AB II all rows with a wrong
 * piece, the row that grows further on, larger figures. AB III the middle of a group in a growing row, wrong piece in a harder rule, the largest figures.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import type { Ab, Cell, ChoiceOption, ColorName, Rng, ShapeKind, SkillDef, Stufe, Visual } from '../../core/types';
import { makeChoice, targetAb } from '../shared';
import { cap, finish, pictureChoice, rectCells, sortCells, type Task } from './helpers';

const META = { id: 'geometrie.muster', topicId: 'geometrie' } as const;

const SHAPES: readonly ShapeKind[] = ['kreis', 'quadrat', 'dreieck', 'rechteck'];
const WORD: Partial<Record<ShapeKind, string>> = { kreis: 'Kreis', quadrat: 'Quadrat', dreieck: 'Dreieck', rechteck: 'Rechteck' };
const word = (s: ShapeKind) => WORD[s] as string;
const ein = (s: ShapeKind) => `ein ${word(s)}`;
const dem = (s: ShapeKind) => `dem ${word(s)}`;
const COLORS: readonly ColorName[] = ['rot', 'blau', 'gelb', 'gruen', 'lila', 'orange'];
const COLOR_WORD: Record<ColorName, string> = { rot: 'rot', blau: 'blau', gelb: 'gelb', gruen: 'grün', lila: 'lila', orange: 'orange' };

const picture = (shape: ShapeKind, color?: ColorName): Visual => ({ type: 'shapeRow', items: [{ shape, ...(color ? { color } : {}) }] });

/** The repeating part: AB or ABC. */
function simpleUnit(rng: Rng): ShapeKind[] {
  const [a, b, c] = rng.sample(SHAPES, 3);
  return rng.pick([[a, b], [a, b, c]]);
}

/** The repeating part of a row with a wrong piece: AB I AB or ABC, AB II also AAB and ABB, AB III never AB. */
function wrongPieceUnit(rng: Rng, ab: Ab): ShapeKind[] {
  const [a, b, c] = rng.sample(SHAPES, 3);
  if (ab === 1) return rng.pick([[a, b], [a, b, c]]);
  return rng.pick(ab === 2 ? [[a, b], [a, b, c], [a, a, b], [a, b, b]] : [[a, b, c], [a, a, b], [a, b, b]]);
}

const row = (unit: readonly ShapeKind[], n: number) => Array.from({ length: n }, (_, i) => unit[i % unit.length]);
const names = (unit: readonly ShapeKind[]) => unit.map(word).join(', ');

/** Stufe 1: "Welche Form kommt auf den leeren Platz?" AB I at the end, AB II inside a longer row. */
function fortsetzen(rng: Rng, stufe: Stufe, ab: Ab): Task {
  const unit = simpleUnit(rng);
  const p = unit.length;
  const n = Math.min(ab === 1 ? 2 * p + rng.int(1, p) + 1 : 3 * p + rng.int(1, p), 10);
  const shapes = row(unit, n);
  const hole = ab === 1 ? n - 1 : rng.int(p, n - 2);
  const right = shapes[hole];
  const inUnit = SHAPES.filter((s) => s !== right && unit.includes(s));
  const outside = SHAPES.filter((s) => !unit.includes(s));
  const wrong: ChoiceOption[] = [
    ...inUnit.map((s) => ({ label: word(s), visual: picture(s), whyWrong: `Immer wieder kommt: ${names(unit)}. Such den leeren Platz darin.` })),
    ...rng.shuffle(outside).map((s) => ({ label: word(s), visual: picture(s), whyWrong: `${cap(ein(s))} kommt in dieser Reihe nicht vor.` })),
  ];
  return {
    key: `reihe:${unit.join('.')}:${n}:${hole}`,
    prompt: 'Welche Form kommt auf den leeren Platz?',
    visual: { type: 'shapeRow', items: shapes.map((shape, i) => (i === hole ? {} : { shape })) },
    answer: makeChoice(rng, { label: word(right), visual: picture(right) }, wrong, { layout: 'grid', max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Welcher Teil kommt immer wieder?', 'Sag die Reihe leise vor dich hin.'],
    steps: [`Immer wieder kommt: ${names(unit)}.`, `Auf den leeren Platz kommt: ${word(right)}.`],
    praise: rng.pick(['Du hast die Regel der Reihe gefunden.', 'Du hast das Muster genau angeschaut.']),
  };
}

/** Stufe 1, AB III: two gaps at the end. The child goes on past the first one. */
function zweiLuecken(rng: Rng, stufe: Stufe): Task {
  const unit = simpleUnit(rng);
  const p = unit.length;
  const n = 2 * p + rng.int(1, p);
  const shapes = row(unit, n + 2);
  const right = shapes[n + 1];
  const nearest = shapes[n];
  const wrong: ChoiceOption[] = SHAPES.filter((s) => s !== right).map((s) => ({
    label: word(s),
    visual: picture(s),
    whyWrong: s === nearest ? `${cap(ein(s))} kommt auf den ersten leeren Platz. Gefragt ist der letzte.` : unit.includes(s) ? `Immer wieder kommt: ${names(unit)}. Geh Platz für Platz weiter.` : `${cap(ein(s))} kommt in dieser Reihe nicht vor.`,
  }));
  return {
    key: `zwei-luecken:${unit.join('.')}:${n}`,
    prompt: 'Welche Form kommt auf den letzten leeren Platz?',
    visual: { type: 'shapeRow', items: [...shapes.slice(0, n).map((shape) => ({ shape })), {}, {}] },
    answer: makeChoice(rng, { label: word(right), visual: picture(right) }, wrong, { layout: 'grid', max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Welcher Teil kommt immer wieder?', 'Geh Platz für Platz weiter, auch über den ersten leeren Platz.'],
    steps: [`Immer wieder kommt: ${names(unit)}.`, `Auf den ersten leeren Platz kommt: ${word(nearest)}.`, `Auf den letzten leeren Platz kommt: ${word(right)}.`],
    praise: rng.pick(['Du bist in der Reihe weiter gegangen.', 'Du hast die Regel 2-mal benutzt.']),
  };
}

/** Stufe 1, AB III: which part repeats? The rule itself is the answer, shown as small rows. */
function welcherTeil(rng: Rng, stufe: Stufe): Task {
  const unit = simpleUnit(rng);
  const p = unit.length;
  const n = 3 * p;
  const stripOf = (list: readonly ShapeKind[]): Visual => ({ type: 'shapeRow', items: list.map((shape) => ({ shape })) });
  const [a, b, c] = [unit[0], unit[1], unit[2]];
  const other = rng.pick(SHAPES.filter((s) => !unit.includes(s)));
  // Only parts that are nowhere in the row: 'B A' and 'A B' of A B C would come again and again, too.
  const wrongs = (p === 2 ? [[a, a], [b, b], [a, other]] : [[a, c, b], [a, a], [c, b]]).map((list) => ({
    visual: stripOf(list),
    whyWrong: `Die Reihe beginnt so: ${names(unit)}. Vergleiche Teil für Teil.`,
  }));
  const answer = pictureChoice(rng, stripOf(unit), wrongs, MAX_CHOICE_OPTIONS[stufe]);
  return {
    key: `teil:${unit.join('.')}`,
    prompt: 'Welcher Teil kommt in der Reihe immer wieder?',
    visual: stripOf(row(unit, n)),
    answer,
    hints: ['Lies die Reihe von links.', 'Wann fängt die Reihe wieder gleich an?'],
    steps: [`Die Reihe beginnt mit: ${names(unit)}.`, 'Danach kommt das Gleiche noch einmal.'],
    praise: rng.pick(['Du hast die Regel der Reihe gefunden.', 'Du hast den Teil genau verglichen.']),
  };
}

/** a a b b: this rule moves at half the speed of a rule of 2 parts, so that the pair of them stays apart for 4 places. */
const doubled = <T,>(list: readonly T[]) => list.flatMap((x) => [x, x]);

/**
 * Stufe 2: form and colour change, each with its own rule. Rules of the same length would move in step (a square is always red), and two features would be one.
 * AB I a rule of 2 and one with each part twice. AB II rules of 2 and 3. AB III the same, a gap inside or two at the end.
 */
function zweiMerkmale(rng: Rng, stufe: Stufe, ab: Ab): Task {
  const twice = ab === 1 || (ab === 3 && rng.chance(0.3));
  const shapesFirst = rng.chance(0.5);
  const [baseP, baseQ] = twice ? [2, 2] : shapesFirst ? [2, 3] : [3, 2];
  const pickedShapes = rng.sample(SHAPES, baseP);
  const pickedColors = rng.sample(COLORS, baseQ);
  const shapes = twice && !shapesFirst ? doubled(pickedShapes) : pickedShapes;
  const colors = twice && shapesFirst ? doubled(pickedColors) : pickedColors;
  const [p, q] = [shapes.length, colors.length];
  const n = 2 * Math.max(p, q) + rng.int(1, 2);
  const label = (s: ShapeKind, c: ColorName) => `${word(s)} ${COLOR_WORD[c]}`;
  // AB III: a gap inside the row, or a second gap: the task asks for the last one.
  const form = ab < 3 ? 'ende' : rng.pick(['innen', 'zwei'] as const);
  const asked = form === 'innen' ? rng.int(Math.max(p, q), n - 1) : form === 'zwei' ? n + 1 : n;
  const rightShape = shapes[asked % p];
  const rightColor = colors[asked % q];
  const wrong: ChoiceOption[] = [];
  for (const s of pickedShapes) {
    for (const c of pickedColors) {
      if (s === rightShape && c === rightColor) continue;
      const why = s === rightShape ? 'Die Form passt. Schau noch einmal auf die Farben.' : c === rightColor ? 'Die Farbe passt. Schau noch einmal auf die Formen.' : 'Schau zuerst auf die Formen. Schau dann auf die Farben.';
      wrong.push({ label: label(s, c), visual: picture(s, c), whyWrong: why });
    }
  }
  return {
    key: `merkmale:${form}:${shapes.join('.')}:${colors.join('.')}:${n}:${asked}`,
    prompt: form === 'zwei' ? 'Was kommt auf den letzten leeren Platz?' : 'Was kommt auf den leeren Platz?',
    visual: {
      type: 'shapeRow',
      items: [
        ...Array.from({ length: form === 'innen' ? n + 1 : n }, (_, i) => (i === asked ? {} : { shape: shapes[i % p], color: colors[i % q] })),
        ...(form === 'ende' ? [{}] : form === 'zwei' ? [{}, {}] : []),
      ],
    },
    answer: makeChoice(rng, { label: label(rightShape, rightColor), visual: picture(rightShape, rightColor) }, rng.shuffle(wrong), { layout: 'grid', max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Schau zuerst nur auf die Formen.', 'Schau dann nur auf die Farben.'],
    steps: [`Die Formen: ${names(shapes)}, immer wieder.`, `Die Farben: ${colors.map((c) => COLOR_WORD[c]).join(', ')}, immer wieder.`, `Auf den ${form === 'zwei' ? 'letzten ' : ''}leeren Platz kommt: ${label(rightShape, rightColor)}.`],
    praise: rng.pick(['Du hast Formen und Farben einzeln geprüft.', 'Du hast 2 Regeln zusammen beachtet.']),
  };
}

/**
 * Stufe 3: one piece breaks the rule (Fehlerdetektiv). Never the first part, so the rule can be read.
 * The child names the form that belongs there, not its place: the row wraps and shows no numbers, so a place would test counting across lines.
 */
function falschesTeil(rng: Rng, stufe: Stufe, ab: Ab): Task {
  const unit = wrongPieceUnit(rng, ab);
  const p = unit.length;
  const n = Math.min(3 * p, 9) + 1;
  const shapes = row(unit, n);
  const at = rng.int(p, n - 2);
  const expected = shapes[at];
  const instead = rng.pick(SHAPES.filter((s) => s !== expected));
  shapes[at] = instead;
  const rest = SHAPES.filter((s) => s !== expected && s !== instead);
  const wrong: ChoiceOption[] = [
    { label: word(instead), visual: picture(instead), whyWrong: `${cap(ein(instead))} steht dort schon. Such die Form nach der Regel.` },
    ...rest.map((s) => ({ label: word(s), visual: picture(s), whyWrong: unit.includes(s) ? `Immer wieder kommt: ${names(unit)}. Such die Stelle darin.` : `${cap(ein(s))} kommt in dieser Reihe nicht vor.` })),
  ];
  return {
    key: `fehler:${unit.join('.')}:${n}:${at}:${instead}`,
    prompt: 'Eine Form passt nicht zur Regel. Welche Form gehört dorthin?',
    visual: { type: 'shapeRow', items: shapes.map((shape) => ({ shape })) },
    answer: makeChoice(rng, { label: word(expected), visual: picture(expected) }, wrong, { layout: 'grid', max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Lies die Reihe von links nach rechts.', 'Welcher Teil kommt immer wieder? Wo stimmt die Regel nicht?'],
    steps: [
      `Immer wieder kommt: ${names(unit)}.`,
      `An einer Stelle steht ${ein(instead)}. Dort gehört ${ein(expected)} hin.`,
      { text: 'So sieht die Reihe richtig aus.', visual: { type: 'shapeRow', items: row(unit, n).map((shape) => ({ shape })) } },
    ],
    praise: rng.pick(['Du hast die Reihe mit der Regel verglichen.', 'Du hast jede Form genau geprüft.']),
  };
}

/**
 * Stufe 3: a row that grows, A B, A B B, A B B B, then the next piece. AB I the group is full or starts: the next piece is the first form or the second.
 * AB II the groups can start with 2. AB III the row stops in the middle of a group.
 */
function wachsendeReihe(rng: Rng, _stufe: Stufe, ab: Ab): Task {
  const [a, b, c] = rng.sample(SHAPES, 3);
  const first = ab === 1 ? 1 : rng.int(1, 2);
  const sizes = [first, first + 1, first + 2];
  const groups = sizes.flatMap((k) => [a, ...Array.from({ length: k }, () => b)]);
  const place = ab === 3 ? 'mitte' : rng.pick(['neu', 'danach'] as const);
  // 'neu': the last group is full, 'danach': a new group has started, 'mitte': a group stops one piece before it is full.
  const shown = place === 'danach' ? [...groups, a] : place === 'mitte' ? groups.slice(0, -2) : groups;
  const right = place === 'neu' ? a : b;
  const other = place === 'neu' ? b : a;
  const size = sizes[2];
  return {
    key: `waechst:${a}:${b}:${first}:${place}`,
    prompt: 'Das Muster wächst. Welche Form kommt auf den leeren Platz?',
    visual: { type: 'shapeRow', items: [...shown.map((shape) => ({ shape })), {}] },
    answer: makeChoice(rng, { label: word(right), visual: picture(right) }, [
      { label: word(other), visual: picture(other), whyWrong: place === 'danach' ? `Nach ${dem(a)} folgt hier immer die andere Form.` : place === 'mitte' ? 'Die Gruppe ist noch nicht fertig. Vergleiche mit den Gruppen davor.' : 'Die Gruppe ist fertig. Danach kommt wieder die andere Form.' },
      { label: word(c), visual: picture(c), whyWrong: `${cap(ein(c))} kommt in dieser Reihe nicht vor.` },
    ], { layout: 'grid' }),
    // no shape by name: the next piece is one of the two shapes of the row
    hints: ['Schau auf die erste Form: Was kommt jedes Mal danach?', 'Wie viele andere Formen stehen jedes Mal dazwischen?'],
    steps: [
      `Nach ${dem(a)} kommen ${sizes[0]}, dann ${sizes[1]}, dann ${sizes[2]} andere Formen.`,
      place === 'danach' ? `Jetzt beginnt die neue Gruppe nach ${dem(a)}.` : place === 'mitte' ? `Die letzte Gruppe hat ${size - 2} statt ${size} andere Formen.` : `Die Gruppe mit ${size} Formen ist fertig.`,
      `Auf den leeren Platz kommt: ${word(right)}.`,
    ],
    praise: rng.pick(['Du hast die wachsende Reihe erkannt.', 'Du hast jede Gruppe genau verglichen.']),
  };
}

/** Growing figures with the origin at the bottom left; each one contains the one before. */
const winkel = (n: number) => [...rectCells(0, 0, 1, n), ...rectCells(1, 0, n - 1, 1)];
const treppe = (n: number) => Array.from({ length: n }, (_, x) => rectCells(x, 0, 1, x + 1)).flat();
const GROWING: Record<string, (n: number) => Cell[]> = {
  doppel: (n) => rectCells(0, 0, 2, n),
  band: (n) => rectCells(0, 0, n, 2),
  winkel,
  haken: winkel,
  treppe,
  gegentreppe: treppe,
  quadrat: (n) => rectCells(0, 0, n, n),
};
/** Drawn from the bottom right: figure 3 still lies inside figure 4 on the grid. */
const MIRRORED: ReadonlySet<string> = new Set(['haken', 'gegentreppe']);
const mirrorIn = (cells: readonly Cell[], width: number): Cell[] => cells.map(([x, y]): Cell => [width - 1 - x, y]);
const widthOf = (cells: readonly Cell[]) => Math.max(...cells.map((c) => c[0])) + 1;

const CELLS_SIDE = 5;
/** Grid position of a figure drawn from the bottom left. */
const onGrid = (cells: readonly Cell[], height: number, dx = 0): Cell[] => sortCells(cells.map(([x, y]): Cell => [x + dx, height - 1 - y]));

/** Stufe 3: Figure 1, 2, 3 are shown; figure 3 is given on a 5 × 5 grid and the child paints it into figure 4. AB I adds 2 Kästchen, AB II 2 from the right or 4, AB III 4 from the right or 7. */
function wachsendeFigur(rng: Rng, _stufe: Stufe, ab: Ab): Task {
  const name = rng.pick(ab === 1 ? ['doppel', 'band', 'winkel'] : ab === 2 ? ['haken', 'treppe'] : ['gegentreppe', 'quadrat']);
  const fig = GROWING[name];
  let dx = 0;
  const shown: Cell[] = [];
  for (const n of [1, 2, 3]) {
    const width = widthOf(fig(n));
    shown.push(...onGrid(MIRRORED.has(name) ? mirrorIn(fig(n), width) : fig(n), 3, dx));
    dx += width + 1;
  }
  const placed = (n: number) => (MIRRORED.has(name) ? mirrorIn(fig(n), CELLS_SIDE) : fig(n));
  const three = placed(3);
  const four = placed(4);
  const inThree = new Set(three.map((c) => c.join()));
  const added = four.filter((c) => !inThree.has(c.join()));
  const counts = [1, 2, 3].map((n) => fig(n).length);
  return {
    key: `figur:${name}`,
    prompt: 'Die Figur wächst. Male Figur 4 fertig.',
    visual: { type: 'grid', width: dx - 1, height: 3, cells: sortCells(shown), showOutline: true, caption: 'Figur 1, 2 und 3' },
    answer: { kind: 'cells', width: CELLS_SIDE, height: CELLS_SIDE, given: onGrid(three, CELLS_SIDE), solution: onGrid(added, CELLS_SIDE) },
    hints: ['Vergleiche Figur 2 und Figur 3: Was kommt dazu?', 'Figur 3 ist schon da. Male nur dazu.'],
    steps: [
      `Die Figuren haben ${counts.join(', dann ')} Kästchen.`,
      `Für Figur 4 kommen ${added.length} Kästchen dazu.`,
      { text: `Figur 4 hat ${four.length} Kästchen.`, visual: { type: 'grid', width: CELLS_SIDE, height: CELLS_SIDE, cells: onGrid(four, CELLS_SIDE), showOutline: true } },
    ],
    praise: rng.pick(['Du hast jedes Mal den neuen Teil gesehen.', 'Du hast die Figuren genau verglichen.']),
  };
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Task;

// The Fehlerdetektiv waits for Stufe 3 (docs/research.md §7.1).
const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [fortsetzen], 2: [fortsetzen], 3: [zweiLuecken, welcherTeil] },
  2: { 1: [zweiMerkmale], 2: [zweiMerkmale], 3: [zweiMerkmale] },
  3: { 1: [falschesTeil, wachsendeReihe, wachsendeFigur], 2: [falschesTeil, wachsendeReihe, wachsendeFigur], 3: [falschesTeil, wachsendeReihe, wachsendeFigur] },
};

export const musterSkill: SkillDef = {
  ...META,
  title: 'Muster fortsetzen',
  description: 'Du findest die Regel und setzt das Muster fort.',
  stufen: { 1: 'Formen in einer Reihe fortsetzen.', 2: 'Form und Farbe ändern sich.', 3: 'Welches Teil passt nicht? Wachsende Muster fortsetzen.' },
  kmk: ['MS.muster'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(META, stufe, ab, ['MS.muster'], rng.pick(FORMS[stufe][ab])(rng, stufe, ab));
  },
};
