/**
 * Flächen vergleichen (Extra: docs/research.md §6; Bayern in Klasse 1/2, NRW in Klasse 4).
 * The Stufe chooses the content, the AB the demand inside it:
 * Stufe 1, Kästchen of a rectangle, up to 12: AB I how many, up to 9; AB II how many, 10 to 12, a rectangle laid out only at its edge;
 * AB III how many are missing, how many rows.
 * Stufe 2, which figure is larger, up to 20: AB I two rectangles, far apart; AB II close or free figures, Kästchen of a free figure;
 * AB III how many more, how many to add, which figure is just as large.
 * Stufe 3, the border on the grid, in steps of one Kästchen side: AB I the border of a rectangle; AB II of a free figure, compare two
 * rectangles; AB III compare free figures, same Kästchen with another border, the border after adding a Kästchen.
 * Free figures have no hole: hints and steps go once around the figure, which never reaches the sides of a hole.
 */
import type { Ab, Cell, ChoiceOption, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { bugList, makeChoice, targetAb } from '../shared';
import { bounds, cellsId, finish, growFigure, hasHole, perimeter, pictureChoice, pictureStep, rectCells, rightPicture, shift, sortCells, type Task, type WrongPicture } from './helpers';

const META = { id: 'geometrie.flaechen', topicId: 'geometrie' } as const;

const UNIT = 'Kästchen';

/** Moved to the top left. */
function normal(cells: readonly Cell[]): Cell[] {
  const b = bounds(cells);
  return sortCells(shift(cells, -b.minX, -b.minY));
}

function single(cells: readonly Cell[], width = 7, height = 5): Visual {
  return { type: 'grid', width, height, cells: sortCells(cells), showOutline: true };
}

/** Two figures, A on the left, B on the right, each with its letter in its first cell. */
function pair(a: readonly Cell[], b: readonly Cell[]): Visual {
  const wa = bounds(a).w;
  const right = shift(b, wa + 1, 0);
  return {
    type: 'grid',
    width: wa + 1 + bounds(b).w,
    height: Math.max(bounds(a).h, bounds(b).h),
    cells: sortCells([...a, ...right]),
    showOutline: true,
    labels: [{ cell: sortCells(a)[0], text: 'A' }, { cell: sortCells(right)[0], text: 'B' }],
  };
}

/** A free figure of n Kästchen in a w × h box, moved to the top left, without a hole. */
function freeFigure(rng: Rng, w: number, h: number, n: number): Cell[] {
  for (;;) {
    const cells = normal(growFigure(rng, w, h, n, [rng.int(0, w - 1), rng.int(0, h - 1)]));
    if (!hasHole(cells)) return cells;
  }
}

/** A rectangle (long ones too), or a free figure. */
function figure(rng: Rng, maxArea: number, free: boolean): Cell[] {
  if (free) return freeFigure(rng, 4, 4, rng.int(6, Math.min(maxArea, 13)));
  const sizes = [[7, 1], [6, 1], [5, 1], [6, 2], [5, 2], [4, 2], [3, 2], [3, 3], [4, 3], [5, 3], [4, 4], [5, 4]].filter(([w, h]) => w * h <= maxArea);
  const [w, h] = rng.pick(sizes);
  return rectCells(0, 0, w, h);
}

/**
 * Columns of a pair on a 375 px phone. The picture has 311 px there; a wider one shrinks, and with it the letters A and B, which are drawn at 18 px and must stay at 16 px:
 * 311 × 18 / 16 = 349 px, and 10 columns of 32 px with 2 × 14 px around them are 348 px.
 */
export const MOST_PAIR_COLUMNS = 10;

/** Two figures that fit a phone, with a gap in Kästchen inside [minGap, maxGap]. */
function closePair(rng: Rng, maxArea: number, free: boolean, minGap = 0, maxGap = 3): [Cell[], Cell[]] {
  for (;;) {
    const a = figure(rng, maxArea, free && rng.chance(0.5));
    const b = figure(rng, maxArea, free && rng.chance(0.5));
    if (bounds(a).w + 1 + bounds(b).w > MOST_PAIR_COLUMNS) continue;
    if (cellsId(a) === cellsId(b)) continue;
    const gap = Math.abs(a.length - b.length);
    if (gap < minGap || gap > maxGap) continue;
    return [a, b];
  }
}

/** Reihe by Reihe: the Kästchen of each row from the top. */
function rowCounts(cells: readonly Cell[]): number[] {
  const out = new Map<number, number>();
  for (const [, y] of cells) out.set(y, (out.get(y) ?? 0) + 1);
  return [...out.entries()].sort((p, q) => p[0] - q[0]).map(([, n]) => n);
}

/** The rectangles of Stufe 1: long ones in one row too. Grid of 7 × 5. */
const FEW_SIZES = [[3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [2, 2], [3, 2], [4, 2], [2, 3], [3, 3], [2, 4]];
const MORE_SIZES = [[5, 2], [6, 2], [4, 3], [3, 4], [2, 5], [2, 6]].filter(([, h]) => h <= 5);

/** Stufe 1, AB I and AB II: the Kästchen of a rectangle. */
function rechteck(rng: Rng, sizes: number[][]): Task {
  const [w, h] = rng.pick(sizes);
  const n = w * h;
  const x0 = rng.int(0, 7 - w);
  const y0 = rng.int(0, 5 - h);
  const border = 2 * (w + h);
  const onEdge = n - Math.max(0, w - 2) * Math.max(0, h - 2);
  return {
    // keyed by the size only: the same rectangle elsewhere on the grid is the same question
    key: `rechteck:${w}x${h}`,
    prompt: `Wie viele ${UNIT} hat dieses Rechteck?`,
    visual: single(rectCells(x0, y0, w, h)),
    answer: { kind: 'number', value: n, unit: UNIT },
    bugs: bugList(n, [
      ['breite-plus-hoehe', w + h, 'Du hast nur 2 Seiten angeschaut. Jede Reihe gehört dazu.'],
      ['rand-statt-flaeche', border, 'Das ist die Länge vom Rand. Gefragt sind alle Kästchen.'],
      ['randkaestchen', onEdge, 'Auch die Kästchen in der Mitte gehören dazu.'],
    ]),
    hints: ['Schau Reihe für Reihe.', 'Wie viele Reihen sind es? Wie viele Kästchen hat jede Reihe?'],
    steps: [h === 1 ? `Das ist 1 Reihe mit ${w} ${UNIT}.` : `Das sind ${h} Reihen mit je ${w} ${UNIT}.`, h === 1 ? `Es sind ${n} ${UNIT}.` : `${Array.from({ length: h }, () => w).join(' + ')} = ${n} ${UNIT}`],
    praise: rng.pick(h === 1 ? ['Du hast die ganze Reihe genommen.', 'Du hast kein Kästchen ausgelassen.'] : ['Du hast Reihe für Reihe gerechnet.', 'Du hast gleich lange Reihen genutzt.']),
  };
}

const WIDE_SIZES = [[3, 2], [4, 2], [5, 2], [6, 2], [3, 3], [4, 3], [3, 4]];

/** Stufe 1, AB II: only the top row and the left column are laid out. */
function ausgelegt(rng: Rng): Task {
  const [w, h] = rng.pick(WIDE_SIZES);
  const n = w * h;
  const cells: Cell[] = rectCells(0, 0, w, h).filter(([x, y]) => x === 0 || y === 0);
  return {
    key: `ausgelegt:${w}x${h}`,
    context: 'Das Rechteck ist erst oben und links ausgelegt.',
    prompt: `Wie viele ${UNIT} hat das ganze Rechteck?`,
    visual: single(shift(cells, 1, 0)),
    answer: { kind: 'number', value: n, unit: UNIT },
    bugs: bugList(n, [
      ['randkaestchen', cells.length, 'Das sind die Kästchen im Bild. Die Mitte fehlt noch.'],
      ['breite-plus-hoehe', w + h, 'Du hast nur 2 Seiten angeschaut. Jede Reihe gehört dazu.'],
    ]),
    hints: ['Oben siehst du eine ganze Reihe.', 'Links siehst du die Zahl der Reihen.'],
    steps: [`Das sind ${h} Reihen mit je ${w} ${UNIT}.`, `${Array.from({ length: h }, () => w).join(' + ')} = ${n} ${UNIT}`],
    praise: rng.pick(['Du hast das Rechteck im Kopf fertig gelegt.', 'Du hast von den Reihen aus gerechnet.']),
  };
}

/** Stufe 1, AB III: a rectangle with a gap in its last row. */
function fehlendeKaestchen(rng: Rng): Task {
  const [w, h] = rng.pick(WIDE_SIZES);
  const n = w * h;
  const missing = rng.int(1, w - 1);
  const drawn = rectCells(0, 0, w, h).filter(([x, y]) => y < h - 1 || x < w - missing);
  return {
    key: `fehlend:${w}x${h}:${missing}`,
    prompt: `Das soll ein Rechteck werden. Wie viele ${UNIT} fehlen?`,
    visual: single(shift(drawn, 1, 0)),
    answer: { kind: 'number', value: missing, unit: UNIT },
    bugs: bugList(missing, [
      ['alle-kaestchen', drawn.length, 'Das sind die Kästchen im Bild. Gefragt sind nur die fehlenden.'],
      ['alle-kaestchen', n, 'Das sind alle Kästchen am Ende. Gefragt sind nur die fehlenden.'],
    ]),
    hints: ['Schau auf die oberste Reihe.', 'Jede Reihe muss gleich lang sein.'],
    steps: [`Jede Reihe hat ${w} ${UNIT}.`, `In der letzten Reihe ${w - missing === 1 ? 'ist 1' : `sind ${w - missing}`} ${UNIT}.`, `${w} − ${w - missing} = ${missing} ${UNIT}`],
    praise: rng.pick(['Du hast die Reihen miteinander verglichen.', 'Du hast an gleich lange Reihen gedacht.']),
  };
}

const ROW_SIZES = [[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [2, 5]];

/** Stufe 1, AB III, the other way round: from the Kästchen and one row to the number of rows. */
function reihenGesucht(rng: Rng): Task {
  const [w, h] = rng.pick(ROW_SIZES);
  const n = w * h;
  return {
    key: `reihen:${w}x${h}`,
    context: `Das Rechteck hat ${n} ${UNIT}. Du siehst 1 Reihe.`,
    prompt: 'Wie viele Reihen hat das Rechteck?',
    visual: single(rectCells(1, 1, w, 1)),
    answer: { kind: 'number', value: h, unit: 'Reihen' },
    bugs: bugList(h, [
      ['alle-kaestchen', n, 'Das sind alle Kästchen. Gefragt sind die Reihen.'],
      ['alle-kaestchen', w, 'Das sind die Kästchen in 1 Reihe. Wie oft passt diese Reihe?'],
    ]),
    hints: ['Wie viele Kästchen hat eine Reihe?', `Rechne Reihe für Reihe, bis du bei ${n} bist.`],
    steps: [`Eine Reihe hat ${w} ${UNIT}.`, `${Array.from({ length: h }, () => w).join(' + ')} = ${n}`, `Es sind ${h} Reihen.`],
    praise: rng.pick(['Du hast von den Kästchen her gedacht.', 'Du hast die Reihe immer wieder gerechnet.']),
  };
}

/** Stufe 2, AB II: the Kästchen of a free figure. */
function freieFigur(rng: Rng): Task {
  const n = rng.int(6, 16);
  const cells = freeFigure(rng, 6, 5, n);
  const counts = rowCounts(cells);
  return {
    key: `figur:${cellsId(cells)}`,
    prompt: `Wie viele ${UNIT} hat diese Figur?`,
    visual: single(cells, 6, 5),
    answer: { kind: 'number', value: cells.length, unit: UNIT },
    bugs: bugList(cells.length, [['rand-statt-flaeche', perimeter(cells), 'Das ist die Länge vom Rand. Gefragt sind alle Kästchen.']]),
    hints: ['Geh Reihe für Reihe vor.', 'Rechne die Kästchen aller Reihen zusammen.'],
    steps: [`Von oben nach unten: ${counts.join(', ')} ${UNIT}.`, `${counts.join(' + ')} = ${cells.length} ${UNIT}`],
    praise: rng.pick(['Du hast Reihe für Reihe gerechnet.', 'Du hast kein Kästchen ausgelassen.']),
  };
}

/** Stufe 2: which figure is larger? A long figure can have fewer Kästchen than a short one. AB I: rectangles, far apart. AB II: free figures, close. */
function groesser(rng: Rng, ab: Ab): Task {
  const [a, b] = ab === 1 ? closePair(rng, 12, false, 2, 6) : closePair(rng, 20, true);
  const same = a.length === b.length;
  const right = same ? 'Beide sind gleich groß' : a.length > b.length ? 'Figur A' : 'Figur B';
  const small = a.length < b.length ? 'Figur A' : 'Figur B';
  const smallFig = a.length < b.length ? a : b;
  const bigFig = a.length < b.length ? b : a;
  const longer = bounds(smallFig).w > bounds(bigFig).w;
  const why = longer ? 'Lang heißt nicht groß. Schau auf die Kästchen in beiden Figuren.' : 'Rechne die Kästchen in beiden Figuren aus. Vergleiche dann.';
  const wrong: ChoiceOption[] = same
    ? [{ label: 'Figur A', whyWrong: 'Rechne die Kästchen von Figur A und von Figur B aus.' }, { label: 'Figur B', whyWrong: 'Rechne die Kästchen von Figur A und von Figur B aus.' }]
    : [{ label: small, whyWrong: why }, { label: 'Beide sind gleich groß', whyWrong: 'Haben beide Figuren gleich viele Kästchen? Prüfe jede Reihe.' }];
  return {
    key: `groesser:${cellsId(a)}:${cellsId(b)}`,
    prompt: 'Welche Figur ist größer?',
    visual: pair(a, b),
    answer: makeChoice(rng, { label: right }, wrong, { order: ['Figur A', 'Figur B', 'Beide sind gleich groß'] }),
    hints: ['Größer heißt hier: mehr Kästchen.', 'Rechne die Kästchen in beiden Figuren aus.'],
    steps: [
      `Figur A hat ${a.length} ${UNIT}.`,
      `Figur B hat ${b.length} ${UNIT}.`,
      same ? `Beide Figuren haben ${a.length} ${UNIT}: Die Figuren sind gleich groß.` : `${Math.max(a.length, b.length)} ist mehr als ${Math.min(a.length, b.length)}: ${right} ist größer.`,
    ],
    praise: rng.pick(['Du hast die Kästchen verglichen, nicht die Länge.', 'Du hast beide Figuren genau geprüft.']),
  };
}

/** A pair with different sizes: the larger one is figure `big`. */
function pairWithGap(rng: Rng): { a: Cell[]; b: Cell[]; hi: number; lo: number } {
  const [a, b] = closePair(rng, 20, true, 1, 5);
  return { a, b, hi: Math.max(a.length, b.length), lo: Math.min(a.length, b.length) };
}

/** Stufe 2, AB III: how many Kästchen more has the larger figure? */
function wieVielMehr(rng: Rng): Task {
  const { a, b, hi, lo } = pairWithGap(rng);
  const d = hi - lo;
  return {
    key: `mehr:${cellsId(a)}:${cellsId(b)}`,
    prompt: `Wie viele ${UNIT} hat die größere Figur mehr?`,
    visual: pair(a, b),
    answer: { kind: 'number', value: d, unit: UNIT },
    bugs: bugList(d, [
      ['alle-kaestchen', hi, 'Das sind alle Kästchen dieser Figur. Gefragt ist der Unterschied.'],
      ['alle-kaestchen', a.length + b.length, 'Das sind beide Figuren zusammen. Gefragt ist der Unterschied.'],
    ]),
    hints: ['Rechne die Kästchen in beiden Figuren aus.', 'Wie groß ist der Unterschied?'],
    steps: [`Figur A hat ${a.length} ${UNIT}.`, `Figur B hat ${b.length} ${UNIT}.`, `${hi} − ${lo} = ${d} ${UNIT}`],
    praise: rng.pick(['Du hast beide Figuren genau verglichen.', 'Du hast den Unterschied gefunden.']),
  };
}

/** Stufe 2, AB III: how many Kästchen make the smaller figure as large as the other one? */
function gleichMachen(rng: Rng): Task {
  const { a, b, hi, lo } = pairWithGap(rng);
  const [small, big] = a.length < b.length ? ['Figur A', 'Figur B'] : ['Figur B', 'Figur A'];
  const d = hi - lo;
  return {
    key: `gleich:${cellsId(a)}:${cellsId(b)}`,
    context: `${small} soll so groß werden wie ${big}.`,
    prompt: `Wie viele ${UNIT} fehlen ${small}?`,
    visual: pair(a, b),
    answer: { kind: 'number', value: d, unit: UNIT },
    bugs: bugList(d, [['alle-kaestchen', hi, `Das sind alle Kästchen von ${big}. Gefragt sind die fehlenden.`]]),
    hints: ['Rechne die Kästchen in beiden Figuren aus.', `Wie viele fehlen ${small} noch?`],
    steps: [`${small} hat ${lo} ${UNIT}.`, `${big} hat ${hi} ${UNIT}.`, `${hi} − ${lo} = ${d} ${UNIT}`],
    praise: rng.pick(['Du hast den Unterschied zwischen den Figuren gefunden.', 'Du hast von der kleineren Figur aus gedacht.']),
  };
}

/**
 * An option of "genauso groß": 5 × 5, not 4 × 4. GridVisual draws grids up to 4 × 4 at twice the size and an option shrinks them to 12rem, so a Kästchen would be 43 px there and
 * 32 px in the figure of the task, though the two are compared Kästchen by Kästchen. 5 × 5 is 188 px: it stays at 32 px.
 */
const gridOf = (cells: readonly Cell[]): Visual => single(normal(cells), 5, 5);

/** Stufe 2, AB III, the other way round: a figure of the same size in another form. */
function genauSoGross(rng: Rng): Task {
  const n = rng.int(7, 13);
  const shown = freeFigure(rng, 4, 4, n);
  for (;;) {
    const right = freeFigure(rng, 4, 4, n);
    if (cellsId(right) === cellsId(shown)) continue;
    const others = rng.sample([n - 2, n - 1, n + 1, n + 2], 3);
    const wrongs: WrongPicture[] = others.map((m) => ({ visual: gridOf(freeFigure(rng, 4, 4, m)), whyWrong: `Diese Figur hat ${m} ${UNIT}.` }));
    const answer = pictureChoice(rng, gridOf(right), wrongs, 4);
    return {
      key: `genauso:${cellsId(shown)}:${cellsId(right)}`,
      prompt: 'Welche Figur ist genauso groß wie diese Figur?',
      visual: single(shown, 6, 5),
      answer,
      hints: ['Rechne die Kästchen der Figur oben aus.', 'Die Form darf anders sein.'],
      steps: [`Die Figur oben hat ${n} ${UNIT}.`, pictureStep(answer, `${rightPicture(answer)} hat auch ${n} ${UNIT}.`)],
      praise: rng.pick(['Du hast die Kästchen verglichen, nicht die Form.', 'Du hast jede Figur genau geprüft.']),
    };
  }
}

const BORDER_SIZES = [2, 3, 4, 5].flatMap((w) => [1, 2, 3, 4].map((h) => [w, h]));

const BORDER_HINTS = ['Fahr mit dem Finger einmal um die Figur.', 'Jede Seite am Rand ist 1 Schritt.'];

/** Stufe 3: the length of the border, in steps of one Kästchen side. AB I of a rectangle, AB II of a free figure. */
function randLaenge(rng: Rng, ab: Ab): Task {
  const free = ab > 1;
  const prompt = 'Eine Seite ist 1 Schritt. Wie viele Schritte hat der Rand?';
  if (free) {
    const cells = freeFigure(rng, 4, 4, rng.int(5, 9));
    const p = perimeter(cells);
    return {
      key: `rand:${cellsId(cells)}`,
      prompt,
      visual: single(cells, 6, 5),
      answer: { kind: 'number', value: p, unit: 'Schritte' },
      bugs: bugList(p, [['flaeche-statt-rand', cells.length, 'Das sind die Kästchen. Gefragt ist nur der Rand.']]),
      hints: BORDER_HINTS,
      steps: ['Fahr einmal um die Figur.', 'Jede Seite am Rand ist 1 Schritt.', `Der Rand hat ${p} Schritte.`],
      praise: rng.pick(['Du bist einmal um die Figur gegangen.', 'Du hast nur den Rand gezählt.']),
    };
  }
  const [w, h] = rng.pick(BORDER_SIZES);
  const p = 2 * (w + h);
  return {
    key: `rand:${w}x${h}`,
    prompt,
    visual: single(rectCells(1, 0, w, h), 7, 5),
    answer: { kind: 'number', value: p, unit: 'Schritte' },
    bugs: bugList(p, [
      ['flaeche-statt-rand', w * h, 'Das sind die Kästchen. Gefragt ist nur der Rand.'],
      ['breite-plus-hoehe', w + h, 'Das sind erst 2 Seiten. Der Rand hat 4 Seiten.'],
    ]),
    hints: BORDER_HINTS,
    steps: [`Oben und unten: ${w} + ${w} = ${2 * w} Schritte.`, `Links und rechts: ${h} + ${h} = ${2 * h} Schritte.`, `${2 * w} + ${2 * h} = ${p} Schritte`],
    praise: rng.pick(['Du bist einmal um die Figur gegangen.', 'Du hast alle 4 Seiten gerechnet.']),
  };
}

/** Stufe 3: which figure has the longer border? More Kästchen does not mean a longer border. AB II rectangles, AB III free figures. */
function randVergleich(rng: Rng, ab: Ab): Task {
  const [a, b] = closePair(rng, 16, ab === 3);
  const pa = perimeter(a);
  const pb = perimeter(b);
  const same = pa === pb;
  const right = same ? 'Beide sind gleich lang' : pa > pb ? 'Figur A' : 'Figur B';
  const short = pa < pb ? 'Figur A' : 'Figur B';
  const shortArea = pa < pb ? a.length : b.length;
  const longArea = pa < pb ? b.length : a.length;
  const why = shortArea > longArea ? `${short} hat mehr Kästchen. Gefragt ist der Rand.` : 'Fahr bei beiden Figuren einmal um den Rand.';
  const wrong: ChoiceOption[] = same
    ? [{ label: 'Figur A', whyWrong: 'Fahr bei beiden Figuren einmal um den Rand.' }, { label: 'Figur B', whyWrong: 'Fahr bei beiden Figuren einmal um den Rand.' }]
    : [{ label: short, whyWrong: why }, { label: 'Beide sind gleich lang', whyWrong: 'Rechne bei beiden Figuren den Rand aus. Vergleiche dann.' }];
  return {
    key: `randvergleich:${cellsId(a)}:${cellsId(b)}`,
    prompt: 'Welche Figur hat den längeren Rand?',
    visual: pair(a, b),
    answer: makeChoice(rng, { label: right }, wrong, { order: ['Figur A', 'Figur B', 'Beide sind gleich lang'] }),
    hints: BORDER_HINTS,
    steps: [
      `Der Rand von Figur A hat ${pa} Schritte.`,
      `Der Rand von Figur B hat ${pb} Schritte.`,
      same ? `Beide Ränder haben ${pa} Schritte: Die Ränder sind gleich lang.` : `${Math.max(pa, pb)} ist mehr als ${Math.min(pa, pb)}: ${right} hat den längeren Rand.`,
    ],
    praise: rng.pick(['Du hast die Ränder verglichen, nicht die Kästchen.', 'Du bist um beide Figuren gegangen.']),
  };
}

/** Stufe 3, AB III: the same Kästchen, and still another border. */
function gleicheKaestchen(rng: Rng): Task {
  for (;;) {
    const [w, h] = rng.pick([[3, 2], [4, 2], [5, 2], [3, 3], [6, 2], [4, 3]]);
    const rect = rectCells(0, 0, w, h);
    const free = freeFigure(rng, 4, 4, w * h);
    const swap = rng.chance(0.5);
    const [a, b] = swap ? [free, rect] : [rect, free];
    const [pa, pb] = [perimeter(a), perimeter(b)];
    if (pa === pb || bounds(a).w + 1 + bounds(b).w > MOST_PAIR_COLUMNS) continue;
    const right = pa > pb ? 'Figur A' : 'Figur B';
    const short = pa > pb ? 'Figur B' : 'Figur A';
    return {
      key: `gleich-kaestchen:${cellsId(a)}:${cellsId(b)}`,
      context: `Beide Figuren haben ${a.length} ${UNIT}.`,
      prompt: 'Welche Figur hat den längeren Rand?',
      visual: pair(a, b),
      answer: makeChoice(rng, { label: right }, [{ label: short, whyWrong: 'Fahr bei beiden Figuren einmal um den Rand.' }, { label: 'Beide sind gleich lang', whyWrong: 'Gleich viele Kästchen heißt nicht: gleich langer Rand.' }], { order: ['Figur A', 'Figur B', 'Beide sind gleich lang'] }),
      hints: BORDER_HINTS,
      steps: [`Der Rand von Figur A hat ${pa} Schritte.`, `Der Rand von Figur B hat ${pb} Schritte.`, `${Math.max(pa, pb)} ist mehr als ${Math.min(pa, pb)}: ${right} hat den längeren Rand.`],
      praise: rng.pick(['Du hast den Rand verglichen, nicht die Kästchen.', 'Du bist um beide Figuren gegangen.']),
    };
  }
}

/** Stufe 3, AB III: a Kästchen is added at the corner: one side goes, three come. */
function anbau(rng: Rng): Task {
  const [w, h] = rng.pick(BORDER_SIZES.filter(([x, y]) => y >= 2 && x * y < 20));
  const p = 2 * (w + h);
  const value = p + 2;
  return {
    key: `anbau:${w}x${h}`,
    context: `Eine Seite ist 1 Schritt. Du legst rechts oben 1 Kästchen an.`,
    prompt: 'Wie viele Schritte hat der Rand dann?',
    visual: single(rectCells(1, 0, w, h), 7, 5),
    answer: { kind: 'number', value, unit: 'Schritte' },
    bugs: bugList(value, [
      ['rand-alt', p, 'Das ist der Rand ohne das neue Kästchen. Der Rand ändert sich.'],
      ['rand-alt', p + 4, 'Eine Seite vom neuen Kästchen liegt innen.'],
      ['flaeche-statt-rand', w * h + 1, 'Das sind die Kästchen. Gefragt ist nur der Rand.'],
    ]),
    hints: BORDER_HINTS,
    steps: [`Vorher hat der Rand ${p} Schritte.`, '1 Seite fällt weg, 3 Seiten kommen dazu.', `${p} − 1 + 3 = ${value} Schritte`],
    praise: rng.pick(['Du hast an die Seite innen gedacht.', 'Du hast den neuen Rand genau gerechnet.']),
  };
}

const FORMS: Record<Stufe, Record<Ab, ((rng: Rng, ab: Ab) => Task)[]>> = {
  1: { 1: [(rng) => rechteck(rng, FEW_SIZES)], 2: [(rng) => rechteck(rng, MORE_SIZES), ausgelegt], 3: [fehlendeKaestchen, reihenGesucht] },
  2: { 1: [groesser], 2: [groesser, groesser, freieFigur], 3: [wieVielMehr, gleichMachen, genauSoGross] },
  3: { 1: [randLaenge], 2: [randLaenge, randVergleich], 3: [randVergleich, gleicheKaestchen, anbau] },
};

export const flaechenSkill: SkillDef = {
  ...META,
  title: 'Flächen vergleichen',
  description: 'Du legst mit Kästchen aus und vergleichst.',
  stufen: { 1: 'Kästchen in einem Rechteck zählen.', 2: 'Welche Figur ist größer?', 3: 'Wie lang ist der Rand? Welcher Rand ist länger?' },
  kmk: ['RF.flaeche'],
  optional: 'extra',
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(META, stufe, ab, ['RF.flaeche'], rng.pick(FORMS[stufe][ab])(rng, ab));
  },
};
