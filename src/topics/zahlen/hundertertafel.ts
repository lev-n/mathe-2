/**
 * Hundertertafel, optional (docs/research.md §6, status opt). The Stufe chooses the content: Stufe 1 finding a number and its left and
 * right neighbours, Stufe 2 one row up or down and filling gaps, Stufe 3 cut-out pieces and the wrong number in a piece. The AB level
 * is the demand inside it: AB I the direct form, AB II two gaps or a longer way, AB III a gap with less around it, or a way of two
 * moves. No hint names a 10 that is an answer: every generator keeps 10 out of the answers.
 */
import { fmt } from '../../core/format';
import type { MultiField, Rng, SkillDef } from '../../core/types';
import { build, bugList, joinDe, multiBugs, type MaybeBug } from '../shared';
import { dreherBug, dreherFieldBugs, fromForms, onesOf, swapDigits, type Form, type Forms } from './helpers';

const ID = 'zahlen.hundertertafel';
const SKILL = { id: ID, topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum', 'MS.muster'];

const LETTERS = ['A', 'B', 'C'];
const RIGHT_HINT = 'Nach rechts wird es 1 mehr.';
const DOWN_HINT = 'Eine Zeile tiefer sind es 10 mehr.';
const UP_HINT = 'Eine Zeile höher sind es 10 weniger.';
const LEFT_HINT = 'Nach links wird es 1 weniger.';
const PIECE_HINT = 'Nach rechts wird es 1 mehr. Nach unten 10 mehr.';
/** For screen readers: the row-by-row label of a plus-shaped piece does not say which column its top and bottom cell are in. */
const PLUS_SHAPE = 'Reihe 1 und Reihe 3 haben nur ein Feld, über und unter der Mitte von Reihe 2.';

/** Fields for lettered gaps, in the order of the masked cells. */
const letterFields = (cells: number[]): MultiField[] => cells.map((value, i) => ({ id: LETTERS[i], value, before: `${LETTERS[i]} =` }));

const findCell: Form = (rng, stufe, ab) => {
  // 12–99, not at the left edge: the number on the left helps.
  let n = rng.int(12, 99);
  if (onesOf(n) === 1) n += 1;
  const prompt = 'Welche Zahl gehört in das leere Feld?';
  return build(SKILL, stufe, {
    key: `finden:${n}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', masked: [n] },
    answer: { kind: 'number', value: n },
    hints: ['Schau auf die Zahl links neben dem Feld.', RIGHT_HINT],
    steps: [`Links neben dem Feld steht ${fmt(n - 1)}.`, RIGHT_HINT, { text: `${fmt(n - 1)} + 1 = ${fmt(n)}`, visual: { type: 'hundredChart', marked: [n] } }],
    bugs: bugList(n, [
      ['tafel-nachbar', n - 1, 'Das steht links neben dem Feld. Nach rechts wird es 1 mehr.'],
      // A full ten is the last cell of its row: n + 1 starts the next row.
      ['tafel-nachbar-2', n + 1, onesOf(n) === 0 ? 'Das steht in der nächsten Zeile. Schau links neben das Feld.' : 'Das steht rechts neben dem Feld. Nach links wird es 1 weniger.'],
      dreherBug(n),
    ]),
    praise: 'Du hast die Nachbarn in der Tafel genutzt.',
    srText: `${prompt} Das Bild zeigt die Hundertertafel mit einem leeren Feld.`,
    kmk: KMK,
  });
};

const leftAndRight: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 9) * 10 + rng.int(2, 9);
  const fields = letterFields([n - 1, n + 1]);
  const prompt = `Was steht links und rechts von ${fmt(n)}?`;
  return build(SKILL, stufe, {
    key: `links-rechts:${n}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', marked: [n], masked: [n - 1, n + 1] },
    answer: { kind: 'multi', fields },
    hints: ['Links steht die kleinere Zahl.', RIGHT_HINT],
    steps: [`Links steht ${fmt(n)} − 1 = ${fmt(n - 1)}.`, `Rechts steht ${fmt(n)} + 1 = ${fmt(n + 1)}.`, `A = ${fmt(n - 1)} und B = ${fmt(n + 1)}`],
    bugs: multiBugs(
      [
        { id: 'tafel-nachbar', match: { A: n + 1, B: n - 1 }, hint: 'Links steht die kleinere Zahl.' },
        // Not 'only the ones change': from 39 to 40 the Zehner changes as well.
        { id: 'tafel-spalte', match: { A: n - 10, B: n + 10 }, hint: 'Links ist es 1 weniger. Rechts ist es 1 mehr.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast die Nachbarn in der Zeile gefunden.',
    srText: `${prompt} Das Bild zeigt die Hundertertafel.`,
    kmk: KMK,
  });
};

/** Stufe 1, AB III: three gaps side by side in a row. No number sits between them, so the row has to be read on from outside. */
const rowOfGaps: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 9) * 10 + rng.int(2, 9);
  const cells = [n - 1, n, n + 1];
  const fields = letterFields(cells);
  const prompt = 'Welche Zahlen fehlen in der Reihe?';
  return build(SKILL, stufe, {
    key: `reihe:${n}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', masked: cells },
    answer: { kind: 'multi', fields },
    hints: ['Such die Zahl neben A oder C.', RIGHT_HINT],
    steps: [
      // At the left edge there is no number beside A, and then C has one.
      onesOf(n - 1) === 1 ? `Rechts neben C steht ${fmt(n + 2)}. Also ist C = ${fmt(n + 1)}.` : `Links neben A steht ${fmt(n - 2)}. Also ist A = ${fmt(n - 1)}.`,
      RIGHT_HINT,
      `A = ${fmt(n - 1)}, B = ${fmt(n)}, C = ${fmt(n + 1)}`,
    ],
    bugs: multiBugs(
      [
        { id: 'tafel-nachbar', match: { A: n + 1, C: n - 1 }, hint: 'Links steht die kleinere Zahl.' },
        { id: 'tafel-spalte', match: { A: n - 11, B: n - 10, C: n - 9 }, hint: 'Das ist die Zeile darüber. Schau in die Zeile der Lücken.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast die Reihe von außen ergänzt.',
    srText: `${prompt} Das Bild zeigt die Hundertertafel mit drei Feldern: A, B und C.`,
    kmk: KMK,
  });
};

/** Stufe 1, AB III: an empty field at the left edge: there is no number on the left, so the child reads from the right. */
const edgeCell: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 9) * 10 + 1;
  const prompt = 'Welche Zahl gehört in das leere Feld?';
  return build(SKILL, stufe, {
    key: `rand:${n}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', masked: [n] },
    answer: { kind: 'number', value: n },
    hints: ['Links neben dem Feld steht keine Zahl. Schau nach rechts.', LEFT_HINT],
    steps: [`Rechts neben dem Feld steht ${fmt(n + 1)}.`, LEFT_HINT, { text: `${fmt(n + 1)} − 1 = ${fmt(n)}`, visual: { type: 'hundredChart', marked: [n] } }],
    bugs: bugList(n, [
      ['tafel-nachbar', n + 1, `Das steht rechts neben dem Feld. ${LEFT_HINT}`],
      ['tafel-nachbar-2', n - 1, 'Das steht am Ende der Zeile darüber. Schau rechts neben das Feld.'],
      dreherBug(n),
    ]),
    praise: 'Du hast die Zahl von rechts her gefunden.',
    srText: `${prompt} Das Bild zeigt die Hundertertafel mit einem leeren Feld.`,
    kmk: KMK,
  });
};

const rowUpOrDown: Form = (rng, stufe, ab) => {
  const down = rng.chance(0.5);
  // The hints name a 10, so the answer is never 10: going up starts at 21 or later (n − 10 ≥ 11).
  const n = down ? rng.int(11, 90) : rng.int(21, 100);
  const value = down ? n + 10 : n - 10;
  const prompt = `Welche Zahl steht direkt ${down ? 'unter' : 'über'} ${fmt(n)}?`;
  return build(SKILL, stufe, {
    key: `zeile:${down ? 'unten' : 'oben'}:${n}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', marked: [n], masked: [value] },
    answer: { kind: 'number', value },
    hints: [down ? DOWN_HINT : UP_HINT, 'Der Einer bleibt gleich. Nur der Zehner ändert sich.'],
    steps: [down ? DOWN_HINT : UP_HINT, `${fmt(n)} ${down ? '+' : '−'} 10 = ${fmt(value)}`, `${down ? 'Unter' : 'Über'} ${fmt(n)} steht ${fmt(value)}.`],
    bugs: bugList(value, [
      ['tafel-zeile', down ? n + 1 : n - 1, down ? DOWN_HINT : UP_HINT],
      ['tafel-richtung', down ? n - 10 : n + 10, down ? 'Nach unten werden die Zahlen größer.' : 'Nach oben werden die Zahlen kleiner.'],
      dreherBug(value),
    ]),
    praise: 'Du hast für die Zeile an 10 gedacht.',
    srText: `${prompt} Das Bild zeigt die Hundertertafel.`,
    kmk: KMK,
  });
};

/** Stufe 2, AB II: two rows at once. */
const twoRows: Form = (rng, stufe, ab) => {
  const down = rng.chance(0.5);
  const n = down ? rng.int(11, 80) : rng.int(31, 100);
  const value = down ? n + 20 : n - 20;
  const oneRow = down ? n + 10 : n - 10;
  const prompt = `Welche Zahl steht 2 Zeilen ${down ? 'unter' : 'über'} ${fmt(n)}?`;
  return build(SKILL, stufe, {
    key: `zwei-zeilen:${down ? 'unten' : 'oben'}:${n}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', marked: [n], masked: [value] },
    answer: { kind: 'number', value },
    hints: [down ? DOWN_HINT : UP_HINT, 'Geh Zeile für Zeile. Der Einer bleibt gleich.'],
    steps: [`Eine Zeile: ${fmt(n)} ${down ? '+' : '−'} 10 = ${fmt(oneRow)}`, `Noch eine Zeile: ${fmt(oneRow)} ${down ? '+' : '−'} 10 = ${fmt(value)}`, `${down ? 'Unter' : 'Über'} ${fmt(n)} steht dort ${fmt(value)}.`],
    bugs: bugList(value, [
      ['tafel-zeile', oneRow, 'Das ist erst 1 Zeile. Geh noch eine Zeile weiter.'],
      ['tafel-zeile', down ? n + 2 : n - 2, down ? DOWN_HINT : UP_HINT],
      ['tafel-richtung', down ? n - 20 : n + 20, down ? 'Nach unten werden die Zahlen größer.' : 'Nach oben werden die Zahlen kleiner.'],
      dreherBug(value),
    ]),
    praise: 'Du hast für jede Zeile an 10 gedacht.',
    srText: `${prompt} Das Bild zeigt die Hundertertafel.`,
    kmk: KMK,
  });
};

const fillGaps: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 8) * 10 + rng.int(2, 9);
  const cells = [n, n + 1, n + 10];
  const fields = letterFields(cells);
  const prompt = 'Welche Zahlen fehlen?';
  return build(SKILL, stufe, {
    key: `luecken:${n}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', masked: cells },
    answer: { kind: 'multi', fields },
    hints: ['Schau auf die Zahl links neben A.', 'Unter A steht C. Eine Zeile tiefer sind es 10 mehr.'],
    steps: [`Links neben A steht ${fmt(n - 1)}. Also ist A = ${fmt(n)}.`, `B steht rechts neben A: B = ${fmt(n + 1)}.`, `C steht unter A: C = ${fmt(n + 10)}.`],
    bugs: multiBugs(
      [
        { id: 'tafel-zeile', match: { C: n + 1 }, hint: DOWN_HINT },
        { id: 'tafel-zeile', match: { B: n + 10, C: n + 1 }, hint: 'B steht rechts neben A. C steht unter A.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast Zeilen und Spalten der Tafel genutzt.',
    srText: `${prompt} Das Bild zeigt die Hundertertafel mit drei Feldern: A, B und C.`,
    kmk: KMK,
  });
};

/** Stufe 2, AB III: a way of two moves, one row and one step. */
const twoMoves: Form = (rng, stufe, ab) => {
  const down = rng.chance(0.5);
  const right = rng.chance(0.5);
  // Ones 2–9: the step stays in the row. Up from 22 at the least: the answer is never 10, which the hints name.
  const n = (down ? rng.int(1, 8) : rng.int(2, 9)) * 10 + rng.int(2, 9);
  const mid = down ? n + 10 : n - 10;
  const value = right ? mid + 1 : mid - 1;
  const prompt = `Von ${fmt(n)} eine Zeile ${down ? 'tiefer' : 'höher'}, dann 1 nach ${right ? 'rechts' : 'links'}. Wo bist du?`;
  return build(SKILL, stufe, {
    key: `weg:${down ? 'unten' : 'oben'}:${right ? 'rechts' : 'links'}:${n}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', marked: [n], masked: [value] },
    answer: { kind: 'number', value },
    hints: [down ? DOWN_HINT : UP_HINT, right ? RIGHT_HINT : LEFT_HINT],
    steps: [`${fmt(n)} ${down ? '+' : '−'} 10 = ${fmt(mid)}`, `${fmt(mid)} ${right ? '+' : '−'} 1 = ${fmt(value)}`, `Du bist bei ${fmt(value)}.`],
    bugs: bugList(value, [
      ['tafel-zeile', mid, `Du bist erst eine Zeile gegangen. Geh noch 1 nach ${right ? 'rechts' : 'links'}.`],
      ['tafel-zeile', right ? n + 1 : n - 1, down ? DOWN_HINT : UP_HINT],
      ['tafel-richtung', (down ? n - 10 : n + 10) + (right ? 1 : -1), down ? 'Nach unten werden die Zahlen größer.' : 'Nach oben werden die Zahlen kleiner.'],
      dreherBug(value),
    ]),
    praise: 'Du hast Zeile und Spalte nacheinander genutzt.',
    srText: `${prompt} Das Bild zeigt die Hundertertafel.`,
    kmk: KMK,
  });
};

/** Stufe 2, AB III: three gaps in one column. */
const columnOfGaps: Form = (rng, stufe, ab) => {
  const n = rng.int(21, 90);
  const cells = [n - 10, n, n + 10];
  const fields = letterFields(cells);
  const prompt = 'Welche Zahlen fehlen in der Spalte?';
  return build(SKILL, stufe, {
    key: `spalte:${n}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', masked: cells },
    answer: { kind: 'multi', fields },
    hints: ['Schau neben die Felder. Dort stehen die Nachbarn.', DOWN_HINT],
    steps: [`A = ${fmt(n - 10)}`, `Eine Zeile tiefer: B = ${fmt(n)}.`, `Noch eine Zeile tiefer: C = ${fmt(n + 10)}.`],
    bugs: multiBugs(
      [
        { id: 'tafel-spalte', match: { A: n - 1, B: n, C: n + 1 }, hint: 'Das ist eine Zeile. Die Felder stehen in einer Spalte.' },
        { id: 'tafel-richtung', match: { A: n + 10, C: n - 10 }, hint: 'Nach unten werden die Zahlen größer.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast die Spalte in Zehnern ergänzt.',
    srText: `${prompt} Das Bild zeigt die Hundertertafel mit drei Feldern: A, B und C.`,
    kmk: KMK,
  });
};

/** A plus-shaped piece around n, or a block of 2 × 3 starting at n. */
function pieceOf(n: number, form: 'plus' | 'block'): number[] {
  return form === 'plus' ? [n - 10, n - 1, n, n + 1, n + 10] : [n, n + 1, n + 2, n + 10, n + 11, n + 12];
}

function pieceStart(rng: Rng, form: 'plus' | 'block'): number {
  return form === 'plus' ? rng.int(1, 8) * 10 + rng.int(2, 9) : rng.int(1, 8) * 10 + rng.int(1, 8);
}

const cutOut =
  (form: 'plus' | 'block', count: number): Form =>
  (rng, stufe, ab) => {
    const n = pieceStart(rng, form);
    const piece = pieceOf(n, form);
    // At least two numbers stay visible, so the piece can be placed in the chart.
    const masked = rng.sample(piece, count).sort((a, b) => a - b);
    const fields = letterFields(masked);
    const prompt = 'Welche Zahlen fehlen im Ausschnitt?';
    const bugs: MaybeBug[] = masked.flatMap((cell, i) => {
      const above = piece.includes(cell - 10);
      const below = piece.includes(cell + 10);
      if (above && !masked.includes(cell - 10)) return [{ id: 'tafel-zeile', match: { [LETTERS[i]]: cell - 10 + 1 }, hint: DOWN_HINT }];
      if (below && !masked.includes(cell + 10)) return [{ id: 'tafel-zeile', match: { [LETTERS[i]]: cell + 10 - 1 }, hint: UP_HINT }];
      return [];
    });
    return build(SKILL, stufe, {
      key: `ausschnitt:${form}:${n}:${masked.join('-')}`,
      ab,
      prompt,
      visual: { type: 'hundredChart', piece, masked },
      answer: { kind: 'multi', fields },
      hints: [PIECE_HINT, 'Schau auf die Zahlen im Bild. Beginne bei einer davon.'],
      steps: [
        PIECE_HINT,
        `Du siehst ${joinDe(piece.filter((c) => !masked.includes(c)).map((c) => fmt(c)))}.`,
        { text: masked.map((c, i) => `${LETTERS[i]} = ${fmt(c)}`).join(', '), visual: { type: 'hundredChart', piece } },
      ],
      bugs: multiBugs([...bugs, ...dreherFieldBugs(fields)], fields),
      praise: 'Du hast den Ausschnitt ergänzt.',
      srText: `${prompt} Felder mit Buchstaben stehen für die fehlenden Zahlen.${form === 'plus' ? ` ${PLUS_SHAPE}` : ''}`,
      kmk: KMK,
    });
  };

/** Wrong numbers for a cell of the piece: digits turned, one row off, one place off. Never another number of the piece. */
function wrongShown(rng: Rng, cell: number, piece: number[]): number {
  const options = rng.shuffle([swapDigits(cell), cell + 10, cell - 10, cell + 2, cell - 2]);
  return options.find((w) => w !== cell && w !== 10 && w >= 1 && w <= 100 && !piece.includes(w)) ?? cell + 3;
}

/** The Fehlerdetektiv waits for Stufe 3 (docs/research.md §7.1), and there for its hardest level. */
const findWrong: Form = (rng, stufe, ab) => {
  const n = pieceStart(rng, 'plus');
  const piece = pieceOf(n, 'plus');
  const cell = rng.pick(piece.filter((c) => c !== n));
  const shows = wrongShown(rng, cell, piece);
  const prompt = 'Eine Zahl im Ausschnitt passt nicht. Wie muss die Zahl heißen?';
  const fields: MultiField[] = [
    { id: 'steht', value: shows, before: 'Diese Zahl passt nicht:' },
    { id: 'soll', value: cell, before: 'Hier gehört hin:' },
  ];
  return build(SKILL, stufe, {
    key: `fehler:${n}:${cell}:${shows}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', piece, replaced: [{ cell, shows }] },
    answer: { kind: 'multi', fields },
    hints: [PIECE_HINT, 'Schau auf die Zahl in der Mitte. Prüfe von dort aus.'],
    steps: [
      `In der Mitte steht ${fmt(n)}.`,
      `An dieser Stelle muss ${fmt(cell)} stehen, nicht ${fmt(shows)}.`,
      { text: `Die Zahl ${fmt(shows)} passt nicht. Hier gehört ${fmt(cell)} hin.`, visual: { type: 'hundredChart', piece } },
    ],
    bugs: multiBugs([{ id: 'tafel-tausch', match: { steht: cell, soll: shows }, hint: 'Schreibe zuerst die Zahl aus dem Bild, dann die passende.' }, ...dreherFieldBugs(fields)], fields),
    praise: 'Du hast die unpassende Zahl gefunden.',
    srText: `${prompt} Das Bild zeigt einen Ausschnitt der Hundertertafel. ${PLUS_SHAPE}`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

const FORMS: Forms = {
  1: { 1: [findCell], 2: [leftAndRight], 3: [rowOfGaps, edgeCell] },
  2: { 1: [rowUpOrDown], 2: [fillGaps, twoRows], 3: [twoMoves, columnOfGaps] },
  3: { 1: [cutOut('plus', 2)], 2: [cutOut('block', 3), cutOut('plus', 3)], 3: [findWrong] },
};

export const hundertertafelSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Hundertertafel',
  description: 'Du findest dich auf der Hundertertafel zurecht.',
  optional: 'extra',
  stufen: {
    1: 'Zahlen finden; Nachbarn links und rechts.',
    2: 'Eine Zeile höher oder tiefer; Lücken füllen.',
    3: 'Ausschnitte ergänzen; die unpassende Zahl finden.',
  },
  kmk: KMK,
  generate: fromForms(FORMS),
};
