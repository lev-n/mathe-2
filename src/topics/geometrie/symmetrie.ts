/**
 * Spiegeln und Falten: figures on a Kästchen grid, symmetric to a line or not. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1, vertical line, do both halves fit? AB I a small figure, yes or no; AB II a larger figure with one Kästchen off, which picture fits; AB III which picture does not
 * fit, how many Kästchen are missing.
 * Stufe 2, where is the line, the horizontal line too: AB I the horizontal line, yes or no, which way the Faltlinie runs; AB II a larger figure with one Kästchen off, which
 * picture has the right line; AB III which figure cannot be folded, how many Faltlinien.
 * Stufe 3, find the mirror image: AB I the left half is given; AB II the other sides; AB III a gap to the line, and from the mirror image back to the half. With extras on
 * also complete it on a 4 × 6 grid (Länder differ: docs/research.md §6, adult page), from AB II on.
 * A figure that is only moved (verschoben), not mirrored, is the typical wrong picture (docs/research.md §5). Its halves look the same
 * but do not fit when folded, so the task asks whether they fit, not whether they are the same.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import type { Ab, Axis, Cell, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { makeChoice, targetAb } from '../shared';
import {
  bounds, cap, cellsId, ck, distinctPictures, finish, growFigure, isSymmetric, mirrored, pictureChoice, pictureStep, rightPicture, shift, sortCells, transpose, twoWay,
  type Line, type Task, type WrongPicture,
} from './helpers';

const META = { id: 'geometrie.symmetrie', topicId: 'geometrie' } as const;

const SIZE = { halfW: 3, width: 6 };

/** Half a figure left of the line, touching the line: columns 0–2 of a grid with the line at 3. */
function halfAtLine(rng: Rng, height: number, n: number): Cell[] {
  return growFigure(rng, SIZE.halfW, height, n, [SIZE.halfW - 1, rng.int(0, height - 1)]);
}

/** The half copied to the other side of the line, not mirrored. */
const moved = (half: readonly Cell[]) => shift(half, SIZE.halfW, 0);
const whole = (half: readonly Cell[]) => sortCells([...half, ...mirrored(half, 'vertical', SIZE.halfW)]);

function grid(cells: readonly Cell[], width: number, height: number, axis?: Axis): Visual {
  return { type: 'grid', width, height, cells: sortCells(cells), showOutline: true, ...(axis ? { axis } : {}) };
}

const verticalAxis: Axis = { orientation: 'vertical', at: SIZE.halfW };

type BrokenKind = 'verschoben' | 'luecke';
type Broken = { kind: 'heil' } | { kind: 'verschoben' } | { kind: 'luecke'; row: number };

interface FoldFigure {
  half: Cell[];
  cells: Cell[];
  state: Broken;
}

/** How large a figure is and what can be wrong with it, by Stufe and AB level. */
interface FoldSize {
  height: number;
  least: number;
  most: number;
  broken: readonly BrokenKind[];
}

const FOLD_SIZES: Record<1 | 2, Record<1 | 2, FoldSize>> = {
  // a moved half is plain to see; one Kästchen off in a larger figure is the harder check
  1: { 1: { height: 4, least: 3, most: 4, broken: ['verschoben'] }, 2: { height: 4, least: 5, most: 6, broken: ['luecke'] } },
  2: { 1: { height: 4, least: 4, most: 5, broken: ['verschoben', 'luecke'] }, 2: { height: 5, least: 5, most: 7, broken: ['luecke'] } },
};

/** A figure with a broken side: moved, or with one Kästchen too many or too few on the right. */
function breakFigure(rng: Rng, half: Cell[], kind: BrokenKind): FoldFigure | null {
  if (kind === 'verschoben') {
    const shifted = sortCells([...half, ...moved(half)]);
    return isSymmetric(shifted, 'vertical', SIZE.halfW) ? null : { half, cells: shifted, state: { kind: 'verschoben' } };
  }
  // take one Kästchen away on the right, or add one: never the only one of its row, so that the halves still look alike
  const right = mirrored(half, 'vertical', SIZE.halfW);
  const on = new Set(right.map(ck));
  const removable = right.filter(([x, y]) => right.some(([a, b]) => b === y && a !== x));
  if (rng.chance(0.5) && removable.length > 0) {
    const gone = rng.pick(removable);
    return { half, cells: sortCells([...half, ...right.filter((c) => c !== gone)]), state: { kind: 'luecke', row: gone[1] } };
  }
  const free: Cell[] = [];
  for (const [x, y] of right) if (x + 1 < SIZE.width && !on.has(ck([x + 1, y]))) free.push([x + 1, y]);
  if (free.length === 0) return null;
  const extra = rng.pick(free);
  return { half, cells: sortCells([...half, ...right, extra]), state: { kind: 'luecke', row: extra[1] } };
}

function brokenFigure(rng: Rng, size: FoldSize): FoldFigure {
  for (;;) {
    const half = halfAtLine(rng, size.height, rng.int(size.least, size.most));
    const f = breakFigure(rng, half, rng.pick(size.broken));
    if (f) return f;
  }
}

/** A figure at the vertical line: symmetric, or broken. */
function foldFigure(rng: Rng, size: FoldSize): FoldFigure {
  if (rng.chance(0.5)) return brokenFigure(rng, size);
  const half = halfAtLine(rng, size.height, rng.int(size.least, size.most));
  return { half, cells: whole(half), state: { kind: 'heil' } };
}

const YES_NO_PROMPT = 'Falte an der Linie. Passen beide Hälften genau aufeinander?';

/** Stufe 1 with the vertical line, Stufe 2 with the horizontal one: do both halves fit when folded? */
function falten(rng: Rng, line: Line, size: FoldSize): Task {
  const f = foldFigure(rng, size);
  const across = line === 'horizontal';
  const cells = across ? transpose(f.cells) : f.cells;
  const axis: Axis = { orientation: line, at: SIZE.halfW };
  const ok = f.state.kind === 'heil';
  const band = across ? 'Spalte' : 'Reihe';
  const row = f.state.kind === 'luecke' ? `In ${band} ${f.state.row + 1}` : '';
  const whyYes = f.state.kind === 'verschoben'
    ? (across ? 'Das Bild klappt um. Das Kästchen oben außen kommt nach unten außen.' : 'Das Bild klappt um. Das Kästchen links außen kommt nach rechts außen.')
    : `${row} passt ein Kästchen nicht. Schau dort genau.`;
  return {
    key: `falten:${line}:${cellsId(cells)}`,
    prompt: YES_NO_PROMPT,
    visual: grid(cells, across ? size.height : SIZE.width, across ? SIZE.width : size.height, axis),
    answer: twoWay('Ja', 'Nein', ok, ok ? `Prüfe jede ${band}: Liegt jedes Kästchen genau gegenüber?` : whyYes),
    hints: [`Prüfe ${band} für ${band}.`, 'Jedes Kästchen braucht einen Partner auf der anderen Seite.'],
    steps: [
      'Falte in Gedanken an der Linie.',
      ok ? `In jeder ${band} liegen die Kästchen genau aufeinander.` : f.state.kind === 'verschoben' ? 'Die zweite Hälfte ist nur verschoben, nicht geklappt.' : `${row} passt ein Kästchen nicht.`,
      ok ? 'Ja, beide Hälften passen genau aufeinander.' : 'Nein, die Hälften passen nicht aufeinander.',
    ],
    praise: rng.pick([`Du hast jede ${band} einzeln geprüft.`, 'Du hast in Gedanken an der Linie gefaltet.']),
  };
}

const LARGE_FOLD = FOLD_SIZES[1][2];

/** Stufe 1, AB II: which picture fits when folded? One figure is whole, the others are broken. */
function passtBild(rng: Rng, stufe: Stufe): Task {
  const half = halfAtLine(rng, LARGE_FOLD.height, rng.int(LARGE_FOLD.least, LARGE_FOLD.most));
  const wrongs = Array.from({ length: 3 }, (): WrongPicture => ({
    visual: grid(brokenFigure(rng, LARGE_FOLD).cells, SIZE.width, LARGE_FOLD.height, verticalAxis),
    whyWrong: 'Hier passen die Hälften nicht genau aufeinander.',
  }));
  const answer = pictureChoice(rng, grid(whole(half), SIZE.width, LARGE_FOLD.height, verticalAxis), wrongs, MAX_CHOICE_OPTIONS[stufe]);
  return {
    key: `passt:${cellsId(half)}`,
    prompt: 'Bei welchem Bild passen beide Hälften genau aufeinander?',
    answer,
    hints: ['Falte jedes Bild in Gedanken an der Linie.', 'Prüfe jedes Bild Reihe für Reihe.'],
    steps: ['Falte jedes Bild in Gedanken an der Linie.', pictureStep(answer, `Nur bei ${rightPicture(answer)} passen die Hälften aufeinander.`)],
    praise: rng.pick(['Du hast jedes Bild an der Linie geprüft.', 'Du hast die Hälften genau verglichen.']),
  };
}

/** Stufe 1, AB III, the other way round: which picture does not fit? */
function passtNichtBild(rng: Rng, stufe: Stufe): Task {
  const f = brokenFigure(rng, LARGE_FOLD);
  const wrongs = Array.from({ length: 3 }, (): WrongPicture => ({
    visual: grid(whole(halfAtLine(rng, LARGE_FOLD.height, rng.int(LARGE_FOLD.least, LARGE_FOLD.most))), SIZE.width, LARGE_FOLD.height, verticalAxis),
    whyWrong: 'Hier passt jedes Kästchen genau auf ein anderes.',
  }));
  const answer = pictureChoice(rng, grid(f.cells, SIZE.width, LARGE_FOLD.height, verticalAxis), wrongs, MAX_CHOICE_OPTIONS[stufe]);
  return {
    key: `passt-nicht:${cellsId(f.cells)}`,
    prompt: 'Bei welchem Bild passen die Hälften nicht aufeinander?',
    answer,
    hints: ['Falte jedes Bild in Gedanken an der Linie.', 'Prüfe jedes Bild Reihe für Reihe.'],
    steps: ['Falte jedes Bild in Gedanken an der Linie.', pictureStep(answer, `Nur bei ${rightPicture(answer)} passen die Hälften nicht.`)],
    praise: rng.pick(['Du hast jedes Bild an der Linie geprüft.', 'Du hast die Hälften genau verglichen.']),
  };
}

/** Stufe 1, AB III: Kästchen are missing on the right: how many, so that both halves fit? */
function kaestchenFehlen(rng: Rng): Task {
  const height = 4;
  const half = halfAtLine(rng, height, rng.int(4, 6));
  const right = mirrored(half, 'vertical', SIZE.halfW);
  const missing = rng.int(1, 3);
  const gone = new Set(rng.sample(right, missing).map(ck));
  const rest = right.filter((c) => !gone.has(ck(c)));
  return {
    key: `fehlt:${cellsId(half)}:${cellsId(rest)}`,
    prompt: 'Beide Hälften sollen aufeinander passen. Wie viele Kästchen fehlen?',
    visual: grid([...half, ...rest], SIZE.width, height, verticalAxis),
    answer: { kind: 'number', value: missing, unit: 'Kästchen' },
    hints: ['Vergleiche beide Seiten, Reihe für Reihe.', 'Jedes Kästchen braucht einen Partner auf der anderen Seite.'],
    steps: [`Links sind ${half.length} Kästchen.`, `Rechts sind ${rest.length} Kästchen.`, `${half.length} − ${rest.length} = ${missing}`],
    praise: rng.pick(['Du hast beide Seiten verglichen.', 'Du hast für jedes Kästchen einen Partner gesucht.']),
  };
}

/** Which of the folds a figure has: lines through the middle of its box, the two diagonals of a square box, and a half turn (no fold, but it looks like one). */
function foldsOf(cells: readonly Cell[]) {
  const { minX, minY, w, h } = bounds(cells);
  const on = new Set(cells.map(ck));
  const has = (move: (x: number, y: number) => Cell) => cells.every(([x, y]) => on.has(ck(move(x - minX, y - minY))));
  const at = (x: number, y: number): Cell => [x + minX, y + minY];
  return {
    down: has((x, y) => at(w - 1 - x, y)),
    across: has((x, y) => at(x, h - 1 - y)),
    diagonal: w === h && (has((x, y) => at(y, x)) || has((x, y) => at(h - 1 - y, w - 1 - x))),
    turned: has((x, y) => at(w - 1 - x, h - 1 - y)),
  };
}

/** A figure symmetric to the vertical line in the middle, and to no horizontal line, also none through a row of Kästchen. */
function oneWayFigure(rng: Rng, size: FoldSize): Cell[] {
  for (;;) {
    const cells = whole(halfAtLine(rng, size.height, rng.int(size.least, size.most)));
    if (!foldsOf(cells).across) return cells;
  }
}

/** Stufe 2, AB I: which way does the Faltlinie run? */
function richtung(rng: Rng): Task {
  const size = FOLD_SIZES[2][1];
  const cells = oneWayFigure(rng, size);
  const across = rng.chance(0.5);
  const drawn = across ? transpose(cells) : cells;
  const right = across ? 'von links nach rechts' : 'von oben nach unten';
  const wrong = across ? 'von oben nach unten' : 'von links nach rechts';
  return {
    key: `richtung:${across ? 'h' : 'v'}:${cellsId(drawn)}`,
    prompt: 'Diese Figur lässt sich falten. Wie läuft die Faltlinie?',
    visual: grid(drawn, across ? size.height : SIZE.width, across ? SIZE.width : size.height),
    answer: makeChoice(rng, { label: right }, [{ label: wrong, whyWrong: 'Falte in Gedanken an so einer Linie: Die Hälften passen nicht aufeinander.' }], { order: ['von oben nach unten', 'von links nach rechts'] }),
    hints: ['Stell dir beide Linien vor. Falte an jeder in Gedanken.', 'Nach dem Falten liegt jedes Kästchen auf einem anderen.'],
    // the fold goes across the line: for a line from top to bottom, left onto right
    steps: [`Klappe in Gedanken die ${across ? 'obere Hälfte auf die untere' : 'linke Hälfte auf die rechte'}.`, 'Beide Hälften liegen genau aufeinander.', `Die Faltlinie läuft ${right}.`],
    praise: rng.pick(['Du hast beide Linien in Gedanken geprüft.', 'Du hast die Faltlinie in der Mitte gefunden.']),
  };
}

/** Stufe 2, AB II: the same figure with different lines, upright or lying. */
function welcheLinie(rng: Rng, stufe: Stufe): Task {
  const size = FOLD_SIZES[2][2];
  const across = rng.chance(0.5);
  const draw = (cells: readonly Cell[], axis: Axis) =>
    across ? grid(transpose(cells), size.height, SIZE.width, { orientation: axis.orientation === 'vertical' ? 'horizontal' : 'vertical', at: axis.at }) : grid(cells, SIZE.width, size.height, axis);
  for (;;) {
    const cells = oneWayFigure(rng, size);
    const candidates: Axis[] = [
      { orientation: 'vertical', at: SIZE.halfW - 1 },
      { orientation: 'vertical', at: SIZE.halfW + 1 },
      { orientation: 'horizontal', at: Math.floor(size.height / 2) },
    ];
    const wrongs = candidates
      .filter((a) => !isSymmetric(cells, a.orientation as Line, a.at))
      .map((axis): WrongPicture => ({ visual: draw(cells, axis), whyWrong: 'Falte an dieser Linie: Die Hälften passen nicht aufeinander.' }));
    const correct = draw(cells, verticalAxis);
    if (distinctPictures(correct, wrongs) < 3) continue;
    const answer = pictureChoice(rng, correct, wrongs, MAX_CHOICE_OPTIONS[stufe]);
    return {
      key: `linie:${across ? 'h' : 'v'}:${cellsId(cells)}`,
      prompt: 'Welches Bild zeigt die richtige Faltlinie?',
      answer,
      hints: ['Falte jedes Bild in Gedanken an der Linie.', 'Beide Seiten der Linie müssen genau aufeinander passen.'],
      steps: ['Falte jedes Bild in Gedanken an der Linie.', pictureStep(answer, `Nur bei ${rightPicture(answer)} passen die Hälften aufeinander.`)],
      praise: rng.pick(['Du hast jede Linie in Gedanken geprüft.', 'Du hast die Hälften genau verglichen.']),
    };
  }
}

/** A figure with no fold at all, not even along a diagonal, and without a half turn: it does not look as if it folded. */
function noFoldFigure(rng: Rng, least: number, most: number): Cell[] {
  for (;;) {
    const cells = growFigure(rng, 5, 4, rng.int(least, most), [rng.int(0, 4), rng.int(0, 3)]);
    const f = foldsOf(cells);
    if (!f.down && !f.across && !f.diagonal && !f.turned) return cells;
  }
}

/** Stufe 2, AB III: every picture but one has a Faltlinie; the one without changes from task to task. */
function nichtFaltbar(rng: Rng, stufe: Stufe): Task {
  const side = SIZE.width;
  const size = FOLD_SIZES[2][1];
  const right = noFoldFigure(rng, 5, 7);
  const wrongs = Array.from({ length: MAX_CHOICE_OPTIONS[stufe] - 1 }, (): WrongPicture => {
    const cells = oneWayFigure(rng, size);
    return { visual: grid(rng.chance(0.5) ? transpose(cells) : cells, side, side), whyWrong: 'Diese Figur kannst du genau in der Mitte falten.' };
  });
  const answer = pictureChoice(rng, grid(right, side, side), wrongs, MAX_CHOICE_OPTIONS[stufe]);
  return {
    key: `form:${cellsId(right)}`,
    prompt: 'Welche Figur kannst du nicht in gleiche Hälften falten?',
    answer,
    hints: ['Falte jede Figur in Gedanken in der Mitte.', 'Passen die Kästchen nach dem Falten aufeinander?'],
    steps: ['Falte jede Figur in Gedanken in der Mitte.', pictureStep(answer, `Nur ${rightPicture(answer)} hat keine Faltlinie.`)],
    praise: rng.pick(['Du hast jede Figur in Gedanken gefaltet.', 'Du hast die Faltlinien geprüft.']),
  };
}

/** Stufe 2, AB III: how many Faltlinien? 0, 1 or 2, never a diagonal one: Klasse 2 folds across the Kästchen. */
function linienZahl(rng: Rng): Task {
  const want = rng.int(0, 2);
  const size = FOLD_SIZES[2][1];
  for (;;) {
    let cells: Cell[];
    if (want === 2) {
      // a quarter that touches both lines, mirrored twice
      const quarter = growFigure(rng, SIZE.halfW, 2, rng.int(2, 4), [SIZE.halfW - 1, 1]);
      const half = [...quarter, ...mirrored(quarter, 'horizontal', 2)];
      cells = [...half, ...mirrored(half, 'vertical', SIZE.halfW)];
    } else if (want === 1) {
      cells = oneWayFigure(rng, size);
    } else {
      cells = noFoldFigure(rng, 5, 6);
    }
    const f = foldsOf(cells);
    if (f.diagonal || Number(f.down) + Number(f.across) !== want) continue;
    const lying = want === 1 && rng.chance(0.5);
    const drawn = lying ? transpose(cells) : cells;
    return {
      key: `linien:${lying ? 'h' : 'v'}:${cellsId(drawn)}`,
      prompt: 'Wie viele Faltlinien hat diese Figur?',
      visual: grid(drawn, lying ? size.height : SIZE.width, lying ? SIZE.width : size.height),
      answer: { kind: 'number', value: want },
      hints: ['Prüfe eine Linie von oben nach unten.', 'Prüfe dann eine Linie von links nach rechts.'],
      steps: ['Falte in Gedanken von oben nach unten.', 'Falte in Gedanken von links nach rechts.', want === 1 ? 'Die Figur hat 1 Faltlinie.' : `Die Figur hat ${want} Faltlinien.`],
      praise: rng.pick(['Du hast beide Linien in Gedanken geprüft.', 'Du hast in beide Richtungen gefaltet.']),
    };
  }
}

type Side = 'links' | 'rechts' | 'oben' | 'unten';

/**
 * Stufe 3: choose the mirror image. The half is given, the wrong pictures are moved, upside down, one Kästchen off.
 * AB I the left half; AB II the other sides, larger; AB III any side, with a gap to the line. Lying figures have 2 rows on each side: on a phone a picture with 6 rows
 * shrinks in its option, and the half in the task and the pictures below are compared Kästchen by Kästchen.
 */
function spiegelbild(rng: Rng, stufe: Stufe, ab: Ab): Task {
  const side = rng.pick<Side>(ab === 1 ? ['links'] : ab === 2 ? ['rechts', 'oben', 'unten'] : ['links', 'rechts', 'oben', 'unten']);
  const across = side === 'oben' || side === 'unten';
  const flip = side === 'rechts' || side === 'unten';
  const halfW = across ? 2 : SIZE.halfW;
  const height = across ? 6 : ab === 1 ? 4 : 5;
  const axis: Axis = { orientation: across ? 'horizontal' : 'vertical', at: halfW };
  const band = across ? 'Spalte' : 'Reihe';
  const place = (cells: readonly Cell[]) => {
    const turned = flip ? mirrored(cells, 'vertical', halfW) : [...cells];
    return across ? transpose(turned) : turned;
  };
  const draw = (cells: readonly Cell[]) => grid(place(cells), across ? height : 2 * halfW, across ? 2 * halfW : height, axis);
  for (;;) {
    const n = ab === 1 ? rng.int(4, 5) : rng.int(5, 6);
    const gap = ab === 3 && !across && rng.chance(0.6);
    const half = gap ? growFigure(rng, 2, height, Math.min(n, 5), [rng.int(0, 1), rng.int(0, height - 1)]) : growFigure(rng, halfW, height, n, [halfW - 1, rng.int(0, height - 1)]);
    const right = mirrored(half, 'vertical', halfW);
    const on = new Set(right.map(ck));
    const outer = right.filter(([x, y]) => !right.some(([a, b]) => b === y && a > x));
    const tip = rng.pick(outer);
    const more: Cell | null = tip[0] + 1 < 2 * halfW && !on.has(ck([tip[0] + 1, tip[1]])) ? [tip[0] + 1, tip[1]] : null;
    const candidates: { cells: Cell[]; whyWrong: string }[] = [
      { cells: [...half, ...shift(half, halfW, 0)], whyWrong: 'Hier ist die Hälfte nur verschoben. Das Bild klappt um.' },
      { cells: [...half, ...right.map(([x, y]): Cell => [x, height - 1 - y])], whyWrong: `Hier steht die Hälfte verkehrt. Jedes Kästchen bleibt in seiner ${band}.` },
      ...(more ? [{ cells: [...half, ...right, more], whyWrong: 'Hier ist auf der anderen Seite ein Kästchen zu viel.' }] : []),
      ...(right.length > 1 ? [{ cells: [...half, ...right.filter((c) => c !== tip)], whyWrong: 'Hier fehlt auf der anderen Seite ein Kästchen.' }] : []),
    ];
    const wrongs = candidates.filter((w) => !isSymmetric(w.cells, 'vertical', halfW)).map((w): WrongPicture => ({ visual: draw(w.cells), whyWrong: w.whyWrong }));
    const correct = draw([...half, ...right]);
    if (distinctPictures(correct, wrongs) < 3) continue;
    const answer = pictureChoice(rng, correct, wrongs, MAX_CHOICE_OPTIONS[stufe]);
    return {
      key: `spiegelbild:${side}:${cellsId(half)}`,
      prompt: `${cap(side)} ist die Hälfte fertig. Welches Bild ist richtig gespiegelt?`,
      visual: draw(half),
      answer,
      hints: ['Beim Spiegeln klappt das Bild an der Linie um.', gap ? 'Jedes Kästchen bleibt gleich weit weg von der Linie.' : 'Ein Kästchen an der Linie bleibt an der Linie.'],
      steps: [`Klappe jede ${band} an der Linie um.`, 'Jedes Kästchen bleibt gleich weit weg von der Linie.', pictureStep(answer, `Das ist ${rightPicture(answer)}.`)],
      praise: rng.pick(['Du hast das Bild an der Linie umgeklappt.', 'Du hast den Abstand zur Linie beachtet.']),
    };
  }
}

/** Stufe 3, AB III, the other way round: from the mirror image back to the half. */
function urbild(rng: Rng, stufe: Stufe): Task {
  const height = 5;
  const draw = (cells: readonly Cell[]) => grid(cells, SIZE.width, height, verticalAxis);
  for (;;) {
    const half = halfAtLine(rng, height, rng.int(5, 6));
    const right = mirrored(half, 'vertical', SIZE.halfW);
    const inner = half.filter(([x, y]) => half.some(([a, b]) => b === y && a > x));
    const wrongs: WrongPicture[] = [
      { visual: draw(shift(right, -SIZE.halfW, 0)), whyWrong: 'Hier ist das Spiegelbild nur verschoben. Das Bild klappt um.' },
      { visual: draw(half.map(([x, y]): Cell => [x, height - 1 - y])), whyWrong: 'Hier steht das Bild verkehrt. Jedes Kästchen bleibt in seiner Reihe.' },
      ...(inner.length > 0 ? [{ visual: draw(half.filter((c) => c !== inner[0])), whyWrong: 'Hier fehlt ein Kästchen.' }] : []),
    ];
    const correct = draw(half);
    if (distinctPictures(correct, wrongs) < 3) continue;
    const answer = pictureChoice(rng, correct, wrongs, MAX_CHOICE_OPTIONS[stufe]);
    return {
      key: `urbild:${cellsId(half)}`,
      prompt: 'Rechts ist das Spiegelbild. Welches Bild zeigt die linke Hälfte?',
      visual: draw(right),
      answer,
      hints: ['Klappe das Bild in Gedanken an der Linie um.', 'Jedes Kästchen bleibt gleich weit weg von der Linie.'],
      steps: ['Klappe jede Reihe an der Linie um.', 'Jedes Kästchen bleibt gleich weit weg von der Linie.', pictureStep(answer, `Das ist ${rightPicture(answer)}.`)],
      praise: rng.pick(['Du hast vom Spiegelbild zurück gedacht.', 'Du hast das Bild an der Linie umgeklappt.']),
    };
  }
}

/** Stufe 3 with the extras on: complete the mirror image on a 4 × 6 grid. AB II the left half at an upright line; AB III either side, with or without a gap to the line. */
function ergaenzen(rng: Rng, ab: Ab): Task {
  const across = ab === 3 && rng.chance(0.4);
  const touching = ab === 2 || rng.chance(0.6);
  const n = ab === 2 ? rng.int(3, 5) : rng.int(4, 7);
  // the half lies in 3 columns × 4 rows; without touching, it keeps 1 column away from the line
  const half = touching ? growFigure(rng, 3, 4, n, [2, rng.int(0, 3)]) : growFigure(rng, 2, 4, Math.min(n, 5), [rng.int(0, 1), rng.int(0, 3)]);
  const other = mirrored(half, 'vertical', 3);
  const flip = ab === 3 && rng.chance(0.4);
  const given = flip ? other : half;
  const solution = flip ? half : other;
  const line: Line = across ? 'horizontal' : 'vertical';
  const place = (cells: readonly Cell[]) => sortCells(across ? transpose(cells) : cells);
  const shown = place(given);
  const width = across ? 4 : 6;
  const height = across ? 6 : 4;
  const band = across ? 'Spalte' : 'Reihe';
  const axis: Axis = { orientation: line, at: 3 };
  return {
    key: `ergaenzen:${line}:${cellsId(shown)}`,
    prompt: 'Male das Spiegelbild auf der anderen Seite der Linie.',
    answer: { kind: 'cells', width, height, given: shown, solution: place(solution), axis },
    hints: [`Geh ${band} für ${band} vor.`, 'Bleib gleich weit weg von der Linie.'],
    steps: [
      `Das Bild hat ${given.length} Kästchen.`,
      'Jedes Kästchen bekommt einen Partner: gleich weit weg von der Linie.',
      { text: 'So sieht das ganze Bild aus.', visual: grid(place([...given, ...solution]), width, height, axis) },
    ],
    praise: rng.pick(['Du hast jedes Kästchen genau umgeklappt.', 'Du hast den Abstand zur Linie beachtet.']),
  };
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Task;

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: {
    1: [(rng) => falten(rng, 'vertical', FOLD_SIZES[1][1])],
    2: [(rng) => falten(rng, 'vertical', FOLD_SIZES[1][2]), passtBild],
    3: [passtNichtBild, kaestchenFehlen],
  },
  2: {
    1: [(rng) => falten(rng, 'horizontal', FOLD_SIZES[2][1]), richtung],
    2: [(rng) => falten(rng, 'horizontal', FOLD_SIZES[2][2]), welcheLinie],
    3: [nichtFaltbar, linienZahl],
  },
  3: { 1: [spiegelbild], 2: [spiegelbild], 3: [spiegelbild, urbild] },
};

/** With the extras on, how often Stufe 3 asks to complete the picture instead of choosing one. */
const COMPLETE: Record<Ab, number> = { 1: 0, 2: 0.4, 3: 0.6 };

export const symmetrieSkill: SkillDef = {
  ...META,
  title: 'Spiegeln und Falten',
  description: 'Du prüfst, ob beide Hälften beim Falten gleich sind.',
  // the page shows this label with extras on and off: what depends on them stays behind "Mit Extras"
  stufen: { 1: 'Falten an einer Linie: Passen beide Hälften aufeinander?', 2: 'Wo ist die Faltlinie? Auch waagerecht.', 3: 'Ein Spiegelbild finden. Mit Extras: Spiegelbild selbst ergänzen.' },
  kmk: ['RF.symmetrie'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const task = stufe === 3 && ctx.extras && rng.chance(COMPLETE[ab]) ? ergaenzen(rng, ab) : rng.pick(FORMS[stufe][ab])(rng, stufe, ab);
    return finish(META, stufe, ab, ['RF.symmetrie'], task);
  },
};
