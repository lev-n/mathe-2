/**
 * Wo ist was? Things on a 3 × 3 grid, named by short words (the labels of the grid visual).
 * The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1 position words in the grid. AB I a single word on a sparse grid. AB II two words for a corner of the full grid. AB III the corner of a thing, the empty corner.
 * Stufe 2 relative words. AB I direkt links von, über on a sparse grid. AB II the same on a full grid, zwischen. AB III two clues; where one thing lies seen from another.
 * Stufe 3 a 3-step path, the other side of the table. AB I a path with single steps. AB II a path with 2-field steps, the table with 3 things. AB III the table with 4 things, the
 * pair on the table, a path walked backwards.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import type { Ab, Cell, ChoiceOption, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { makeChoice, pickPerson, targetAb } from '../shared';
import { cap, finish, type Task } from './helpers';

const META = { id: 'geometrie.lage', topicId: 'geometrie' } as const;

interface Thing {
  name: string;
  art: 'der' | 'die' | 'das';
}

const THINGS: readonly Thing[] = [
  { name: 'Ball', art: 'der' }, { name: 'Hut', art: 'der' }, { name: 'Hund', art: 'der' }, { name: 'Fisch', art: 'der' },
  { name: 'Stift', art: 'der' }, { name: 'Apfel', art: 'der' }, { name: 'Mond', art: 'der' }, { name: 'Maus', art: 'die' },
  { name: 'Uhr', art: 'die' }, { name: 'Kuh', art: 'die' }, { name: 'Ente', art: 'die' }, { name: 'Katze', art: 'die' },
  { name: 'Buch', art: 'das' }, { name: 'Haus', art: 'das' }, { name: 'Boot', art: 'das' }, { name: 'Auto', art: 'das' },
];

const nom = (t: Thing) => `${t.art} ${t.name}`;
const acc = (t: Thing) => `${t.art === 'der' ? 'den' : t.art} ${t.name}`;
const dem = (t: Thing) => `${t.art === 'die' ? 'der' : 'dem'} ${t.name}`;
const vom = (t: Thing) => (t.art === 'die' ? `von der ${t.name}` : `vom ${t.name}`);
const beim = (t: Thing) => (t.art === 'die' ? `bei der ${t.name}` : `beim ${t.name}`);

interface Placed {
  x: number;
  y: number;
  t: Thing;
}

const ALL_CELLS: readonly Cell[] = [0, 1, 2].flatMap((y) => [0, 1, 2].map((x): Cell => [x, y]));
const CROSS: readonly Cell[] = [[1, 0], [1, 2], [0, 1], [2, 1]];
const CORNERS: readonly Cell[] = [[0, 0], [2, 0], [0, 2], [2, 2]];

/** Things that can lie on a table, for the scene with the other child. */
const ON_TABLE: readonly Thing[] = THINGS.filter((t) => ['Ball', 'Hut', 'Stift', 'Apfel', 'Uhr', 'Buch'].includes(t.name));

/** Random different things on these cells. */
function place(rng: Rng, cells: readonly Cell[], pool: readonly Thing[] = THINGS): Placed[] {
  const things = rng.sample(pool, cells.length);
  return cells.map(([x, y], i) => ({ x, y, t: things[i] }));
}

/** The labels in reading order: a screen reader reads them out, and the order of `placed` would give the answer away. */
function gridOf(placed: readonly Placed[], width = 3, height = 3, caption?: string): Visual {
  return {
    type: 'grid',
    width,
    height,
    cells: [],
    labels: [...placed].sort((p, q) => p.y - q.y || p.x - q.x).map((p) => ({ cell: [p.x, p.y] as Cell, text: p.t.name })),
    ...(caption ? { caption } : {}),
  };
}

const layoutId = (placed: readonly Placed[]) => placed.map((p) => `${p.x}${p.y}${p.t.name}`).join('-');
const ROW_WORD = ['oben', '', 'unten'];
const COL_WORD = ['links', '', 'rechts'];

/** The place in words: 'oben', 'unten rechts', 'in der Mitte'. */
function where(p: { x: number; y: number }): string {
  if (p.x === 1 && p.y === 1) return 'in der Mitte';
  return [ROW_WORD[p.y], COL_WORD[p.x]].filter(Boolean).join(' ');
}

function options(rng: Rng, stufe: Stufe, right: Thing, wrong: ChoiceOption[]) {
  return makeChoice(rng, { label: right.name }, rng.shuffle(wrong), { max: MAX_CHOICE_OPTIONS[stufe] });
}

const PLACE_HINT: Record<string, string> = {
  oben: 'Oben ist die obere Reihe im Bild.',
  unten: 'Unten ist die untere Reihe im Bild.',
  links: 'Links ist die linke Seite vom Bild.',
  rechts: 'Rechts ist die rechte Seite vom Bild.',
};

/** Stufe 1: "Was liegt oben?" AB I a single word, AB II a corner of the full grid. */
function wasLiegt(rng: Rng, stufe: Stufe, ab: Ab): Task {
  const corner = ab > 1;
  const cells = corner ? ALL_CELLS : rng.chance(0.5) ? [...CROSS, [1, 1] as Cell] : CROSS;
  const placed = place(rng, cells);
  const target = rng.pick(placed.filter((p) => (corner ? CORNERS : CROSS).some(([x, y]) => x === p.x && y === p.y)));
  const word = where(target);
  return {
    key: `was:${word.replace(' ', '-')}:${layoutId(placed)}`,
    prompt: `Was liegt ${word}?`,
    visual: gridOf(placed),
    answer: options(rng, stufe, target.t, placed.filter((p) => p !== target).map((p) => ({
      label: p.t.name,
      whyWrong: `${cap(nom(p.t))} liegt ${where(p)}. Gesucht ist ${word}.`,
    }))),
    hints: corner ? ['Such zuerst die Reihe. Such dann die Seite.', `Das Wort sagt dir beides: ${word}.`] : [PLACE_HINT[word], `Schau im Bild nur nach ${word}.`],
    steps: [`Schau im Bild nach ${word}.`, `Dort liegt ${nom(target.t)}.`],
    praise: rng.pick(['Du hast genau auf das Wort geachtet.', 'Du hast die Stelle im Bild gefunden.']),
  };
}

const CORNER_WORDS = CORNERS.map(([x, y]) => where({ x, y }));

/** Stufe 1, AB III: "Wo liegt der Ball?" A thing in a corner of the full grid, named with two words. */
function woEcke(rng: Rng): Task {
  const placed = place(rng, ALL_CELLS);
  const target = rng.pick(placed.filter((p) => CORNERS.some(([x, y]) => x === p.x && y === p.y)));
  const word = where(target);
  return {
    key: `wo-ecke:${layoutId(placed)}:${target.t.name}`,
    prompt: `Wo liegt ${nom(target.t)}?`,
    visual: gridOf(placed),
    answer: makeChoice(rng, { label: word }, CORNER_WORDS.filter((w) => w !== word).map((w) => ({ label: w, whyWrong: `Dort liegt ${nom(target.t)} nicht. Such zuerst die Reihe.` })), { order: CORNER_WORDS }),
    hints: [`Such ${acc(target.t)} im Bild.`, 'Sag zuerst die Reihe: oben oder unten. Sag dann die Seite.'],
    steps: [`Such ${acc(target.t)} im Bild.`, `${cap(nom(target.t))} liegt ${word}.`],
    praise: rng.pick(['Du hast Reihe und Seite zusammen benannt.', 'Du hast beide Wörter richtig gewählt.']),
  };
}

/** Stufe 1, AB III: one corner of the grid is empty. Which? The child looks for what is not there. */
function leereEcke(rng: Rng): Task {
  const empty = rng.pick(CORNERS);
  const placed = place(rng, ALL_CELLS.filter(([x, y]) => x !== empty[0] || y !== empty[1]));
  const word = where({ x: empty[0], y: empty[1] });
  return {
    key: `leer:${word.replace(' ', '-')}:${layoutId(placed)}`,
    prompt: 'Wo ist das leere Feld?',
    visual: gridOf(placed),
    answer: makeChoice(rng, { label: word }, CORNER_WORDS.filter((w) => w !== word).map((w) => ({ label: w, whyWrong: 'Dort liegt etwas. Schau noch einmal auf die Ecken.' })), { order: CORNER_WORDS }),
    hints: ['Schau auf alle 4 Ecken vom Bild.', 'Sag zuerst die Reihe: oben oder unten. Sag dann die Seite.'],
    steps: ['In 3 Ecken liegt etwas.', `Das leere Feld ist ${word}.`],
    praise: rng.pick(['Du hast die leere Ecke gefunden.', 'Du hast Reihe und Seite zusammen benannt.']),
  };
}

/** Stufe 1, AB I: "Wo liegt der Ball?" */
function woLiegt(rng: Rng): Task {
  const placed = place(rng, CROSS);
  const target = rng.pick(placed);
  const word = where(target);
  const WORDS = ['oben', 'unten', 'links', 'rechts'];
  const wrong = WORDS.filter((w) => w !== word).map((w) => ({
    label: w,
    whyWrong: `${PLACE_HINT[w].replace(' im Bild', '').replace(' vom Bild', '')} Dort liegt ${nom(target.t)} nicht.`,
  }));
  return {
    key: `wo:${layoutId(placed)}:${target.t.name}`,
    prompt: `Wo liegt ${nom(target.t)}?`,
    visual: gridOf(placed),
    answer: makeChoice(rng, { label: word }, wrong, { order: WORDS }),
    hints: [`Such ${acc(target.t)} im Bild.`, `Liegt ${nom(target.t)} am Rand oben oder unten? Oder an der Seite?`],
    steps: [`Such ${acc(target.t)} im Bild.`, `${cap(nom(target.t))} liegt ${word}.`],
    praise: rng.pick(['Du hast die Lage genau benannt.', 'Du hast das passende Wort gefunden.']),
  };
}

const NEAR = [
  { dx: -1, dy: 0, word: 'links', go: 'nach links', asked: (a: Thing) => `direkt links ${vom(a)}` },
  { dx: 1, dy: 0, word: 'rechts', go: 'nach rechts', asked: (a: Thing) => `direkt rechts ${vom(a)}` },
  { dx: 0, dy: -1, word: 'darüber', go: 'nach oben', asked: (a: Thing) => `direkt über ${dem(a)}` },
  { dx: 0, dy: 1, word: 'darunter', go: 'nach unten', asked: (a: Thing) => `direkt unter ${dem(a)}` },
];

/** Where a thing lies seen from another one. */
function seenFrom(p: Placed, a: Placed): string {
  if (p.y === a.y) return `${p.x < a.x ? 'links' : 'rechts'} ${vom(a.t)}`;
  if (p.x === a.x) return `${p.y < a.y ? 'über' : 'unter'} ${dem(a.t)}`;
  return `schräg neben ${dem(a.t)}`;
}

/** Stufe 2: "Was liegt direkt links vom Ball?" AB I on a sparse grid. */
function direkt(rng: Rng, stufe: Stufe, ab: Ab): Task {
  const dir = rng.pick(NEAR);
  const from = rng.pick(ALL_CELLS.filter(([x, y]) => x + dir.dx >= 0 && x + dir.dx <= 2 && y + dir.dy >= 0 && y + dir.dy <= 2));
  const to: Cell = [from[0] + dir.dx, from[1] + dir.dy];
  const isPair = ([x, y]: Cell) => (x === from[0] && y === from[1]) || (x === to[0] && y === to[1]);
  const rest = ALL_CELLS.filter((c) => !isPair(c));
  const placed = place(rng, [from, to, ...(ab === 1 ? rng.sample(rest, 4) : rest)]);
  const [anchor, target] = placed;
  return {
    key: `direkt:${dir.word}:${layoutId(placed)}`,
    prompt: `Was liegt ${dir.asked(anchor.t)}?`,
    visual: gridOf(placed),
    answer: options(rng, stufe, target.t, placed.slice(2).map((p) => ({
      label: p.t.name,
      whyWrong: `${cap(nom(p.t))} liegt ${seenFrom(p, anchor)}. Gesucht ist: direkt ${dir.word}.`,
    }))),
    hints: [`Such zuerst ${acc(anchor.t)}.`, `Geh von dort 1 Feld ${dir.go}.`],
    steps: [`Such ${acc(anchor.t)} im Bild.`, `Geh 1 Feld ${dir.go}.`, `Dort liegt ${nom(target.t)}.`],
    praise: rng.pick([`Du bist von ${dem(anchor.t)} aus gegangen.`, 'Du hast zuerst den Startplatz gesucht.']),
  };
}

/** Stufe 2, AB II: "Was liegt zwischen dem Ball und der Maus?" */
function zwischen(rng: Rng, stufe: Stufe): Task {
  const across = rng.chance(0.5);
  const line = rng.int(0, 2);
  const cells: Cell[] = across ? [[0, line], [1, line], [2, line]] : [[line, 0], [line, 1], [line, 2]];
  const isLine = ([x, y]: Cell) => (across ? y === line : x === line);
  const placed = place(rng, [...cells, ...ALL_CELLS.filter((c) => !isLine(c))]);
  const [a, target, b] = placed;
  return {
    key: `zwischen:${layoutId(placed)}`,
    prompt: `Was liegt zwischen ${dem(a.t)} und ${dem(b.t)}?`,
    visual: gridOf(placed),
    answer: options(rng, stufe, target.t, placed.slice(3).map((p) => ({
      label: p.t.name,
      whyWrong: `${cap(nom(p.t))} liegt nicht zwischen den beiden. Such beide im Bild.`,
    }))),
    hints: [`Such ${acc(a.t)} und ${acc(b.t)} im Bild.`, 'Schau auf das Feld genau in der Mitte der beiden.'],
    steps: [`${cap(nom(a.t))} und ${nom(b.t)} liegen ${across ? 'in einer Reihe' : 'übereinander'}.`, `Dazwischen liegt ${nom(target.t)}.`],
    praise: rng.pick(['Du hast beide Dinge gesucht und verglichen.', 'Du hast genau in die Mitte geschaut.']),
  };
}

/** Stufe 2, AB III: "Wo liegt der Hut?" The relation itself is what the child names: from the first thing to the second. */
function wieLiegt(rng: Rng, stufe: Stufe): Task {
  const dir = rng.pick(NEAR);
  const from = rng.pick(ALL_CELLS.filter(([x, y]) => x + dir.dx >= 0 && x + dir.dx <= 2 && y + dir.dy >= 0 && y + dir.dy <= 2));
  const to: Cell = [from[0] + dir.dx, from[1] + dir.dy];
  const rest = ALL_CELLS.filter(([x, y]) => !(x === from[0] && y === from[1]) && !(x === to[0] && y === to[1]));
  const placed = place(rng, [from, to, ...rng.sample(rest, 4)]);
  const [anchor, target] = placed;
  const right = dir.asked(anchor.t).replace('direkt ', '');
  const others = NEAR.filter((n) => n !== dir).map((n) => n.asked(anchor.t).replace('direkt ', ''));
  return {
    key: `wie:${dir.word}:${layoutId(placed)}`,
    prompt: `Wo liegt ${nom(target.t)}?`,
    visual: gridOf(placed),
    answer: makeChoice(rng, { label: right }, others.map((o) => ({ label: o, whyWrong: `Such zuerst ${acc(anchor.t)}. Schau von dort auf ${acc(target.t)}.` })), { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: [`Such zuerst ${acc(anchor.t)}.`, `Schau dann von dort auf ${acc(target.t)}.`],
    steps: [`Such ${acc(anchor.t)} im Bild.`, `${cap(nom(target.t))} liegt ${right}.`],
    praise: rng.pick(['Du hast von einem Ding aus geschaut.', 'Du hast die Lage von 2 Dingen benannt.']),
  };
}

/**
 * Stufe 2, AB III: two clues, "Was liegt rechts vom Ball und über der Maus?": in the row of one thing and the column of another.
 * Exactly one thing fits, whether "rechts von" means the same row or anywhere further right, and "über" the same column or anywhere higher.
 */
function zweiHinweise(rng: Rng, stufe: Stufe): Task {
  for (;;) {
    const placed = place(rng, rng.sample(ALL_CELLS, rng.int(5, 7)));
    const target = rng.pick(placed);
    const inRow = placed.filter((p) => p.y === target.y && p.x !== target.x);
    const inColumn = placed.filter((p) => p.x === target.x && p.y !== target.y);
    if (inRow.length === 0 || inColumn.length === 0) continue;
    const first = rng.pick(inRow);
    const second = rng.pick(inColumn);
    const side = first.x < target.x ? 'rechts' : 'links';
    const above = second.y > target.y;
    const onSide = (p: Placed) => (side === 'links' ? p.x < first.x : p.x > first.x);
    const onLevel = (p: Placed) => (above ? p.y < second.y : p.y > second.y);
    const rest = placed.filter((p) => p !== target && p !== first && p !== second);
    if (rest.length < 2 || rest.some((p) => onSide(p) && onLevel(p))) continue;
    const sideText = `${side} ${vom(first.t)}`;
    const levelText = `${above ? 'über' : 'unter'} ${dem(second.t)}`;
    return {
      key: `zwei:${side}:${above ? 'ueber' : 'unter'}:${first.t.name}:${second.t.name}:${layoutId(placed)}`,
      prompt: `Was liegt ${sideText} und ${levelText}?`,
      visual: gridOf(placed),
      answer: options(rng, stufe, target.t, rest.map((p) => ({
        label: p.t.name,
        // true under both readings: a thing that fails a clue when read widely also fails it when read narrowly
        whyWrong: `${cap(nom(p.t))} liegt nicht ${onSide(p) ? levelText : sideText}.`,
      }))),
      hints: [`Such zuerst ${acc(first.t)}. Schau dann nach ${side}.`, `Such dann ${acc(second.t)}. Schau nach ${above ? 'oben' : 'unten'}.`],
      steps: [`Such ${acc(first.t)} und schau nach ${side}.`, `Such ${acc(second.t)} und schau nach ${above ? 'oben' : 'unten'}.`, `Beide Hinweise passen nur auf ${acc(target.t)}.`],
      praise: rng.pick(['Du hast beide Hinweise nacheinander geprüft.', 'Du hast beide Hinweise zusammen beachtet.']),
    };
  }
}

type Dir = 'rechts' | 'links' | 'oben' | 'unten';
const STEP: Record<Dir, [number, number]> = { rechts: [1, 0], links: [-1, 0], oben: [0, -1], unten: [0, 1] };
const OPPOSITE: Record<Dir, Dir> = { rechts: 'links', links: 'rechts', oben: 'unten', unten: 'oben' };
const GO: Record<Dir, string> = { rechts: 'nach rechts', links: 'nach links', oben: 'nach oben', unten: 'nach unten' };

interface Move {
  dir: Dir;
  n: number;
}

/** The cells after each move; null if the path leaves the grid. */
function walk(start: Cell, moves: readonly Move[]): Cell[] | null {
  const out: Cell[] = [];
  let [x, y] = start;
  for (const m of moves) {
    x += STEP[m.dir][0] * m.n;
    y += STEP[m.dir][1] * m.n;
    if (x < 0 || y < 0 || x > 2 || y > 2) return null;
    out.push([x, y]);
  }
  return out;
}

/** A path of 3 moves that stays on the grid and does not end at its start. AB I has single steps, from AB II on 2-field steps as well. */
function drawPath(rng: Rng, ab: Ab): { start: Cell; moves: Move[]; path: Cell[] } {
  for (;;) {
    const start = rng.pick(ALL_CELLS);
    const moves: Move[] = [];
    for (let i = 0; i < 3; i++) {
      const last = moves[moves.length - 1];
      const dir = rng.pick((Object.keys(STEP) as Dir[]).filter((d) => !last || (d !== last.dir && d !== OPPOSITE[last.dir])));
      moves.push({ dir, n: ab > 1 && rng.chance(0.5) ? 2 : 1 });
    }
    const path = walk(start, moves);
    if (!path || moves.filter((m) => m.n === 2).length > 2) continue;
    if (ab > 1 && !moves.some((m) => m.n === 2)) continue;
    const end = path[2];
    if (end[0] === start[0] && end[1] === start[1]) continue;
    return { start, moves, path };
  }
}

/** Stufe 3: "Start beim Ball: 2 rechts, oben, links. Wo bist du?" AB I with single steps. */
function weg(rng: Rng, stufe: Stufe, ab: Ab): Task {
  const placed = place(rng, ALL_CELLS);
  const at = (c: Cell) => placed.find((p) => p.x === c[0] && p.y === c[1])!;
  const { start, moves, path } = drawPath(rng, ab);
  const end = path[2];
  const swapped = (a: Dir, b: Dir) => moves.map((m) => ({ ...m, dir: m.dir === a ? b : m.dir === b ? a : m.dir }));
  const swapLR = walk(start, swapped('links', 'rechts'));
  const swapOU = walk(start, swapped('oben', 'unten'));
  const first = at(start);
  const target = at(end);
  const wrong: ChoiceOption[] = [
    ...(swapLR ? [{ label: at(swapLR[2]).t.name, whyWrong: 'Hier sind links und rechts vertauscht. Schau auf die Wörter.' }] : []),
    ...(swapOU ? [{ label: at(swapOU[2]).t.name, whyWrong: 'Hier sind oben und unten vertauscht. Schau auf die Wörter.' }] : []),
    { label: at(path[1]).t.name, whyWrong: 'Hier fehlt noch der letzte Schritt.' },
    { label: first.t.name, whyWrong: 'Hier beginnt der Weg. Geh von hier los.' },
    ...rng.shuffle(placed).map((p) => ({ label: p.t.name, whyWrong: 'Geh den Weg Schritt für Schritt von vorne.' })),
  ];
  const words = moves.map((m) => (m.n === 2 ? `2 ${m.dir}` : m.dir));
  const go = (m: Move) => `${m.n === 2 ? '2 ' : ''}${GO[m.dir]}`;
  const stops = [at(path[0]), at(path[1])];
  return {
    key: `weg:${first.t.name}:${words.join('.')}:${layoutId(placed)}`,
    prompt: `Start ${beim(first.t)}: ${words.join(', ')}. Wo bist du?`,
    visual: gridOf(placed),
    answer: makeChoice(rng, { label: target.t.name }, wrong, { max: MAX_CHOICE_OPTIONS[stufe] }),
    // only a task with a number explains the number: AB I never has one
    hints: ['Geh Schritt für Schritt mit dem Finger.', moves.some((m) => m.n === 2) ? 'Geh so viele Felder wie die Zahl. Ohne Zahl: 1 Feld.' : 'Geh bei jedem Wort 1 Feld.'],
    steps: [
      `${cap(go(moves[0]))}: ${stops[0].t.name}.`,
      `Dann ${go(moves[1])}: ${stops[1].t.name}.`,
      `Dann ${go(moves[2])}: Du bist ${beim(target.t)}.`,
    ],
    praise: rng.pick(['Du bist den Weg Schritt für Schritt gegangen.', 'Du hast jede Richtung genau beachtet.']),
  };
}

/** Stufe 3, AB III: the end and the moves are given. The child walks the path from its end, each move the other way. */
function wegZurueck(rng: Rng, stufe: Stufe): Task {
  const placed = place(rng, ALL_CELLS);
  const at = (c: Cell) => placed.find((p) => p.x === c[0] && p.y === c[1])!;
  const { start, moves, path } = drawPath(rng, 3);
  const first = at(start);
  const target = at(path[2]);
  const words = moves.map((m) => (m.n === 2 ? `2 ${m.dir}` : m.dir));
  const go = (m: Move) => `${m.n === 2 ? '2 ' : ''}${GO[OPPOSITE[m.dir]]}`;
  const back = [...moves].reverse();
  const stops = [at(path[1]), at(path[0])];
  const wrong: ChoiceOption[] = [
    { label: at(path[1]).t.name, whyWrong: 'Hier fehlen noch 2 Schritte zurück.' },
    { label: at(path[0]).t.name, whyWrong: 'Hier fehlt noch der letzte Schritt zurück.' },
    { label: target.t.name, whyWrong: 'Hier endet der Weg. Geh von hier zurück.' },
    ...rng.shuffle(placed).map((p) => ({ label: p.t.name, whyWrong: 'Geh den Weg vom Ende her zurück.' })),
  ];
  return {
    key: `weg-zurueck:${target.t.name}:${words.join('.')}:${layoutId(placed)}`,
    prompt: `Ziel ${beim(target.t)}: ${words.join(', ')}. Wo startest du?`,
    visual: gridOf(placed),
    answer: makeChoice(rng, { label: first.t.name }, wrong, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: ['Fang am Ziel an. Geh den Weg rückwärts.', 'Beginne mit dem letzten Wort. Geh jedes Mal anders herum.'],
    steps: [
      `${cap(go(back[0]))}: ${stops[0].t.name}.`,
      `Dann ${go(back[1])}: ${stops[1].t.name}.`,
      `Dann ${go(back[2])}: Du bist ${beim(first.t)}.`,
    ],
    praise: rng.pick(['Du bist den Weg rückwärts gegangen.', 'Du hast jede Richtung umgedreht.']),
  };
}

const TABLE = 'So siehst du den Tisch.';

/** Three things in a row: GridVisual is only as wide as the grid, and 2 cells are narrower than the caption. */
const PAIR_CELLS: readonly Cell[] = [[0, 0], [1, 0], [2, 0]];

/** Stufe 3: another child stands on the other side of the table: left and right swap. AB II 3 things in a row; AB III 4 things, or the pair. */
function andereSeite(rng: Rng, stufe: Stufe, ab: Ab): Task {
  const who = pickPerson(rng).name;
  if (ab === 3 && rng.chance(0.4)) {
    // The picture says where a thing lies: a sentence with the side would leave only its opposite to pick.
    const placed = place(rng, PAIR_CELLS, ON_TABLE);
    const [a, b] = rng.sample(placed, 2);
    const mine = a.x < b.x ? 'links' : 'rechts';
    const theirs = a.x < b.x ? 'rechts' : 'links';
    const labels = [`links ${vom(b.t)}`, `rechts ${vom(b.t)}`];
    return {
      key: `paar:${a.t.name}:${b.t.name}:${layoutId(placed)}`,
      context: `${who} steht auf der anderen Seite vom Tisch.`,
      prompt: `Wo liegt ${nom(a.t)} für ${who}?`,
      visual: gridOf(placed, 3, 1, TABLE),
      answer: makeChoice(rng, { label: `${theirs} ${vom(b.t)}` }, [{ label: `${mine} ${vom(b.t)}`, whyWrong: `So siehst du den Tisch. ${who} schaut von der anderen Seite.` }], { order: labels }),
      hints: [`Such ${acc(a.t)} und ${acc(b.t)} im Bild.`, `Für ${who} sind links und rechts anders herum.`],
      steps: [`Für dich liegt ${nom(a.t)} ${mine} ${vom(b.t)}.`, `Dein ${cap(mine)} ist für ${who} ${theirs}.`, `${cap(nom(a.t))} liegt für ${who} ${theirs} ${vom(b.t)}.`],
      praise: rng.pick(['Du hast die andere Seite mitgedacht.', 'Du hast vom anderen Platz aus geschaut.']),
    };
  }
  const n = ab === 3 ? 4 : 3;
  const placed = place(rng, Array.from({ length: n }, (_, x): Cell => [x, 0]), ON_TABLE);
  const side = rng.pick(['links', 'rechts'] as const);
  // on the other side of the table, the thing farthest on the child's right is on the left
  const target = side === 'links' ? placed[n - 1] : placed[0];
  const same = side === 'links' ? placed[0] : placed[n - 1];
  const wrong: ChoiceOption[] = [
    { label: same.t.name, whyWrong: `So siehst du den Tisch. ${who} schaut von der anderen Seite.` },
    ...placed.slice(1, n - 1).map((p) => ({ label: p.t.name, whyWrong: `${cap(nom(p.t))} liegt nicht am Rand vom Tisch.` })),
  ];
  const mine = side === 'links' ? 'rechts' : 'links';
  return {
    key: `tisch:${side}:${layoutId(placed)}`,
    context: `${who} steht auf der anderen Seite vom Tisch.`,
    prompt: `Was ist für ${who} ganz ${side}?`,
    visual: gridOf(placed, n, 1, TABLE),
    answer: makeChoice(rng, { label: target.t.name }, wrong, { max: MAX_CHOICE_OPTIONS[stufe] }),
    hints: [`Stell dich in Gedanken neben ${who}.`, `Für ${who} sind links und rechts anders herum.`],
    steps: [`${who} schaut von der anderen Seite auf den Tisch.`, `Dein ${cap(mine)} ist für ${who} ${side}.`, `Für ${who} ist ganz ${side}: ${nom(target.t)}.`],
    praise: rng.pick(['Du hast die andere Seite mitgedacht.', 'Du hast vom anderen Platz aus geschaut.']),
  };
}

type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Task;

const FORMS: Record<Stufe, Record<Ab, readonly Form[]>> = {
  1: { 1: [wasLiegt, wasLiegt, woLiegt], 2: [wasLiegt], 3: [woEcke, leereEcke] },
  2: { 1: [direkt], 2: [direkt, zwischen], 3: [zweiHinweise, wieLiegt] },
  3: { 1: [weg], 2: [weg, andereSeite], 3: [andereSeite, wegZurueck] },
};

export const lageSkill: SkillDef = {
  ...META,
  title: 'Wo ist was?',
  description: 'Du sagst, was links, rechts, oben oder unten ist.',
  stufen: { 1: 'Oben, unten, links und rechts im Feld.', 2: 'Links von, zwischen und 2 Hinweise.', 3: 'Einem Weg folgen. Von der anderen Seite schauen.' },
  kmk: ['RF.raum'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(META, stufe, ab, ['RF.raum'], rng.pick(FORMS[stufe][ab])(rng, stufe, ab));
  },
};
