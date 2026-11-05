/**
 * Core contracts shared by every part of the app.
 *
 * Generators (src/topics/**) are pure functions: (rng, stufe, ctx) → Exercise.
 * Exercises are plain data (no functions) so they can be tested, de-duplicated,
 * printed on worksheets and rendered by generic UI components.
 *
 * See docs/research.md for the reasoning behind the fields (hints, steps, bugs, praise …).
 */

// ─── Basics ──────────────────────────────────────────────────────────────────

/** Difficulty level shown to children as "Stufe 1/2/3" (≈ KMK Anforderungsbereich I/II/III). */
export type Stufe = 1 | 2 | 3;
export const STUFEN: readonly Stufe[] = [1, 2, 3];

/** KMK Anforderungsbereich of one item. A round of any Stufe mixes all three (src/core/age.ts AB_MIX). */
export type Ab = 1 | 2 | 3;

export type TopicId =
  | 'zahlen'
  | 'plusminus'
  | 'einmaleins'
  | 'groessen'
  | 'geometrie'
  | 'daten'
  | 'sachaufgaben';

/** Seeded pseudo-random generator. Never use Math.random() in generators. */
export interface Rng {
  /** The seed this generator was created with (shown on worksheets). */
  readonly seed: number;
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] (both inclusive). */
  int(min: number, max: number): number;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** New shuffled copy of an array (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** true with probability p. */
  chance(p: number): boolean;
  /** n distinct elements of an array, in random order. */
  sample<T>(items: readonly T[], n: number): T[];
}

/** Grid cell coordinate: x = column (0 = left), y = row (0 = top). */
export type Cell = readonly [x: number, y: number];

export type ColorName = 'rot' | 'blau' | 'gelb' | 'gruen' | 'lila' | 'orange';

// ─── Visuals (declarative; rendered by src/ui/visuals/*) ──────────────────────

export type PlaceColumn = 'Z' | 'E';

export type SolidKind =
  | 'wuerfel'
  | 'quader'
  | 'kugel'
  | 'zylinder'
  | 'kegel'
  | 'pyramide'
  | 'prisma';

export type ShapeKind = 'quadrat' | 'rechteck' | 'dreieck' | 'gleichseitiges-dreieck' | 'kreis';

export type PictoIcon = 'person' | 'stern' | 'ball' | 'buch' | 'apfel' | 'herz';

/** Symmetry axis on a grid. `at` = position in cell units from the left (vertical) or top (horizontal). */
export interface Axis {
  orientation: 'vertical' | 'horizontal';
  /** Line position in cell units (e.g. 4 = line between column 3 and 4). */
  at: number;
}

export type Visual =
  /** Stellenwerttafel with digits. values[i] belongs to columns[i]; null = empty cell. */
  | { type: 'placeValue'; columns: PlaceColumn[]; rows: { values: (number | null)[] }[] }
  /**
   * Zahlenstrahl. Ticks every minorStep, longer ticks every majorStep. Labels at every major tick if labelMajor, plus explicit `labels`.
   * Marks are arrows with a letter/text. Jumps are arcs with an arrowhead (Rechenstrich-style steps, for hints and worked solutions),
   * e.g. { from: 35, to: 40, label: '+ 5' }. For an empty Rechenstrich: majorStep = minorStep = max − min, labels at the jump ends.
   */
  | { type: 'numberLine'; min: number; max: number; majorStep: number; minorStep: number; labelMajor: boolean; labels?: number[]; marks?: { value: number; label: string }[]; jumps?: { from: number; to: number; label?: string }[] }
  /**
   * Zwanzigerfeld (size 20: 2 rows of 10) or Hunderterfeld (size 100: 10 rows of 10) with 5/10 structure: a wider gap after
   * every 5th dot and row. Dots fill row by row: `filled` solid, then `second` ringed (for "8 + 5"). split draws a line after a
   * column and/or a row, as when part of the field is covered. rotated turns the field by a quarter turn (rows become columns).
   */
  | { type: 'field'; size: 20 | 100; filled: number; second?: number; split?: { afterCol?: number; afterRow?: number }; rotated?: boolean }
  /**
   * Zehnerstangen and Einerwürfel. ones may exceed 9 (Bündeln: 2 Z 14 E), and are drawn in fives. second adds material in the
   * second look ('dazu': drawn after the first; 'weg': the last pieces of the first are crossed out).
   */
  | { type: 'baseTen'; tens: number; ones: number; second?: { tens?: number; ones?: number; mode: 'dazu' | 'weg' } }
  /**
   * Hundertertafel 1–100 (10 numbers per row). masked: cells without their number, shown as □ (one cell) or as A, B, … (several,
   * in the array's order).
   * marked: cells with a ring.
   * piece: draw only these cells, as a cut-out piece in its original arrangement. replaced: a cell shows another number
   * (Fehlerdetektiv: "find the wrong number in a piece").
   */
  | { type: 'hundredChart'; masked?: number[]; marked?: number[]; piece?: number[]; replaced?: { cell: number; shows: number }[] }
  /**
   * Punktefeld for the Einmaleins (rows × cols dots). splitAfterRow/splitAfterCol leave a gap (Kraft der Fünf, a split for derivation).
   */
  | { type: 'dotArray'; rows: number; cols: number; splitAfterRow?: number; splitAfterCol?: number }
  /**
   * Dots in repeated groups, each with a frame (3 groups of 4: groups [4, 4, 4]; unequal groups, or a Rest: [5, 5, 5, 2]).
   * perRow: dots in a row inside a group (default 5; 2 draws dot pairs for gerade/ungerade).
   */
  | { type: 'dotArray'; groups: number[]; perRow?: number }
  /** Square grid with filled cells (area/perimeter/symmetry figures). */
  | { type: 'grid'; width: number; height: number; cells: Cell[]; axis?: Axis; showOutline?: boolean; caption?: string; labels?: { cell: Cell; text: string }[] }
  /** Körper drawing. The aria-label describes it without its name; named: the name instead (a task asks for what the description would state). */
  | { type: 'solid'; solid: SolidKind; named?: boolean }
  /** rotate: degrees clockwise (a turned square). thin: a long, narrow form of rechteck or dreieck. named: as for 'solid'. */
  | { type: 'shape'; shape: ShapeKind; rotate?: number; thin?: boolean; named?: boolean }
  /** Musterreihe: shapes side by side. color is named in the aria-label; an entry without shape is the empty place to fill. */
  | { type: 'shapeRow'; items: ({ shape: ShapeKind; color?: ColorName } | { shape?: undefined })[] }
  /** Zahlenmauer: rows of stones from the top row to the bottom row, each stone with a number or a letter. A stone sits on the two stones below it. */
  | { type: 'numberWall'; rows: string[][] }
  /** Würfelgebäude. heights[row][col] = number of stacked cubes; row 0 = back. view 'plan' = Bauplan (top view with numbers). */
  | { type: 'cubeBuilding'; heights: number[][]; view: 'iso' | 'plan' | 'front' | 'side' }
  /** Säulendiagramm. The value axis starts at 0. */
  | { type: 'barChart'; title: string; categories: string[]; values: number[]; axisMax: number; axisStep: number; valueLabel?: string }
  /** Bilddiagramm. showKey false hides the legend (tasks that ask what one picture means). */
  | { type: 'pictogram'; title: string; categories: string[]; values: number[]; iconValue: number; icon: PictoIcon; showKey?: boolean }
  | { type: 'tally'; title?: string; rows: { label: string; count: number }[] }
  | { type: 'table'; caption?: string; header: string[]; rows: string[][] }
  /** Glücksrad with equal sectors in the given order. */
  | { type: 'spinner'; sectors: ColorName[] }
  /** Säckchen with Kugeln. */
  | { type: 'bag'; balls: { color: ColorName; count: number }[] }
  | { type: 'dice'; values: number[] }
  /**
   * Analog clock (+ optional digital display). hours 0–23. Without face it draws all 60 minute ticks, 'five' only the
   * 5-minute ticks, 'quarters' only 12, 3, 6 and 9 as long ticks (full, half and quarter hours). highlight tints the part
   * of the face the minute hand has swept from the 12 ('half' = 30 min, 'quarter' = 15 min, 'three-quarters' = 45 min).
   */
  | { type: 'clock'; hours: number; minutes: number; showDigital?: boolean; face?: 'five' | 'quarters'; highlight?: 'quarter' | 'half' | 'three-quarters' }
  /** Coins and notes, values in Cent: 1, 2, 5, 10, 20, 50, 100, 200 (coins), 500, 1000, 2000, 5000, 10000 (notes). */
  | { type: 'money'; items: number[] }
  /**
   * Lineal in whole cm (no mm, out of scope in Klasse 2); an object (bar) from startCm to startCm + lengthCm is drawn above it.
   * minCm > 0 draws a broken ruler that starts at this number. second is another object above the first (compare two lengths).
   */
  | { type: 'ruler'; maxCm: number; startCm: number; lengthCm: number; minCm?: number; second?: { startCm: number; lengthCm: number } };

export type VisualType = Visual['type'];
export type VisualOf<T extends VisualType> = Extract<Visual, { type: T }>;

// ─── Answers ─────────────────────────────────────────────────────────────────

export interface NumberAnswer {
  kind: 'number';
  /** Correct value. null = the task is not solvable and "Nicht lösbar" is correct (requires offerUnsolvable). */
  value: number | null;
  /** Unit shown after the input field (the child does not type it), e.g. '€', 'cm', 'Kästchen'. */
  unit?: string;
  /** Text directly before/after the input, e.g. an Antwortsatz: before 'Lena bezahlt', after '€.' */
  before?: string;
  after?: string;
  /** Show a "Nicht lösbar – es fehlt eine Angabe" button. */
  offerUnsolvable?: boolean;
  /** Visible label for screen readers if before/after is not descriptive. */
  label?: string;
}

export interface ChoiceOption {
  label: string;
  visual?: Visual;
  /** Targeted feedback when this (wrong) option is chosen. */
  whyWrong?: string;
}

export interface ChoiceAnswer {
  kind: 'choice';
  options: ChoiceOption[];
  correct: number;
  /** 'symbols' = short labels like <, >, =; 'grid' = options with visuals. Default: a list. */
  layout?: 'symbols' | 'grid';
  /** The child has to read these options: read-aloud leaves them out (an option spoken as a number word gives a Zahlwort task away). */
  silentOptions?: boolean;
}

export interface MultiField {
  id: string;
  value: number;
  /** Text before/after this field, e.g. '[3] €' '[40] ct'. */
  before?: string;
  after?: string;
  label?: string;
}

export interface MultiAnswer {
  kind: 'multi';
  fields: MultiField[];
}

export interface CellsAnswer {
  kind: 'cells';
  width: number;
  height: number;
  /** Pre-filled cells that the child cannot toggle. */
  given: Cell[];
  /** Cells the child must switch on (in addition to `given`). */
  solution: Cell[];
  axis?: Axis;
}

export interface NumberLineAnswer {
  kind: 'numberline';
  min: number;
  max: number;
  majorStep: number;
  minorStep: number;
  /** Snapping step of the marker (usually minorStep). */
  step: number;
  value: number;
  /** Accepted absolute deviation (0 = exact). */
  tolerance: number;
  labelMajor: boolean;
  /** Explicitly labelled values (in addition to major labels if labelMajor). Default: both ends when !labelMajor. */
  labels?: number[];
}

export interface OrderAnswer {
  kind: 'order';
  /** Items in display order. */
  items: string[];
  /** Indices of `items` in the correct order. */
  correct: number[];
  direction: 'aufsteigend' | 'absteigend';
  /** Replaces 'zuerst das Kleinste' and the signs < and > where the items are no quantities (months, weekdays). */
  instruction?: string;
}

export type Answer =
  | NumberAnswer
  | ChoiceAnswer
  | MultiAnswer
  | CellsAnswer
  | NumberLineAnswer
  | OrderAnswer;

export type AnswerKind = Answer['kind'];
export type AnswerOf<K extends AnswerKind> = Extract<Answer, { kind: K }>;

/** What the child entered. Raw text is parsed by src/core/parse.ts. */
export type Response =
  | { kind: 'number'; text: string; unsolvable?: boolean }
  | { kind: 'choice'; index: number }
  | { kind: 'multi'; values: Record<string, string> }
  | { kind: 'cells'; cells: Cell[] }
  | { kind: 'numberline'; value: number }
  | { kind: 'order'; order: number[] };

/**
 * A typical wrong answer (misconception / "bug") with a targeted hint.
 * match: number for number/numberline answers,
 *        Record<fieldId, number> for multi answers,
 *        number[] for order answers (an index order like OrderAnswer.correct).
 * (Choice answers use ChoiceOption.whyWrong instead.)
 * Bug ids are internal (never shown to children).
 */
export interface Bug {
  id: string;
  match: number | Record<string, number> | number[];
  hint: string;
}

/** A step of a worked solution. A plain string or text with an optional visual. */
export type Step = string | { text: string; visual?: Visual };

// ─── Exercise ────────────────────────────────────────────────────────────────

export interface Exercise {
  /** Canonical identity (skill + parameters) used to avoid repeats, e.g. 'zahlen.zehner-einer:2:47'. */
  key: string;
  topicId: TopicId;
  skillId: string;
  stufe: Stufe;
  /** KMK Anforderungsbereich of this item: GenContext.ab when set. Use targetAb() from src/topics/shared.ts. */
  ab: Ab;
  /** Short German instruction, du-form. Text limits: src/core/age.ts, checked by describeSkill (T1–T5). */
  prompt: string;
  /** Story text. An exercise with context counts as a Sachaufgabe (T2): context + prompt ≤ 20/25/30 words on Stufe 1/2/3. */
  context?: string;
  /** Optional large maths expression, e.g. '7 · 8 = □' or '45 + 8 = □'. */
  expression?: string;
  visual?: Visual;
  answer: Answer;
  /** Strategy hints, shown one at a time (≥ 1). Never contain the answer. */
  hints: string[];
  /** Worked solution with the child's numbers (≥ 1). The last step states the result. */
  steps: Step[];
  /** Typical wrong answers with targeted hints. */
  bugs?: Bug[];
  /** Specific process praise, completing "Richtig! …", e.g. 'Du bist erst zum Zehner gegangen.' */
  praise: string;
  /** Plain-text version for screen readers (operators spelled out, e.g. '7 mal 8'). */
  srText: string;
  /** KMK tags from src/data/curriculum.ts. */
  kmk: string[];
  /** Knobelaufgabe (harder thinking task). */
  knobel?: boolean;
  /** Einmaleins fact key for per-fact spaced repetition: factKeyOf(a, b) from src/state/facts.ts (the 40 Kern facts, 6 squares). */
  factKey?: string;
}

// ─── Skills & topics ─────────────────────────────────────────────────────────

export interface FactBox {
  box: number;
  due?: string;
}

/** Read-only context passed to generators. */
export interface GenContext {
  /** Include optional extra skills (topics that are not compulsory in every Bundesland). */
  extras: boolean;
  /** Per-fact Leitner boxes (keys from src/state/facts.ts, such as '2x7'). */
  facts?: Readonly<Record<string, FactBox>>;
  /** ISO date 'YYYY-MM-DD' (for due facts). */
  today?: string;
  /** The AB level the round plans for this item: the generator returns an item with exactly this `ab`. */
  ab?: Ab;
  /** A review slot wants this fact: the fact's skill (src/state/facts.ts factSkillId) returns exactly this task as its `factKey`. */
  factKey?: string;
}

export interface SkillDef {
  /** Globally unique, `${topicId}.${slug}`, e.g. 'zahlen.nachbarn'. Never change once released (stored in progress). */
  id: string;
  topicId: TopicId;
  /** Short German title, e.g. 'Nachbarzahlen'. */
  title: string;
  /** One child-friendly German sentence. */
  description: string;
  /** What each Stufe contains (child-friendly German, ≤ 12 words each). */
  stufen: Record<Stufe, string>;
  kmk: string[];
  /** 'extra' = optional skill, labelled 'Extra'; never counts toward topic progress or badges (docs/research.md §7.1). */
  optional?: 'extra';
  /** Pure: same rng seed + stufe + ctx ⇒ same exercise. */
  generate(rng: Rng, stufe: Stufe, ctx: GenContext): Exercise;
}

export interface TopicModule {
  topicId: TopicId;
  skills: SkillDef[];
}

export interface TopicMeta {
  id: TopicId;
  title: string;
  shortTitle: string;
  description: string;
  /** CSS custom property suffix, e.g. 'zahlen' → var(--topic-zahlen) / var(--topic-zahlen-bg). */
  color: TopicId;
}

// ─── Checking ────────────────────────────────────────────────────────────────

export interface CheckResult {
  correct: boolean;
  /** Input could not be interpreted (e.g. empty, '3,5'). Not counted as an attempt; show this message. */
  invalid?: string;
  /** Targeted hint from a matched Bug or a wrong ChoiceOption. */
  bugHint?: string;
  /** Id of the matched Bug (internal, never shown): the error-library tag of this mistake (src/state/growth.ts). */
  bugId?: string;
  /** multi: correctness per field id. */
  fieldCorrect?: Record<string, boolean>;
  /** cells: cells that are on but should be off, and missing cells. */
  extraCells?: Cell[];
  missingCells?: Cell[];
}
