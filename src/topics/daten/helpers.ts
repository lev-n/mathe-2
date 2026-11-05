/**
 * Helpers of the topic "Daten und Zufall": data themes with their sentences, number picks, colours of Kugeln and
 * Glücksräder, the shared hints of §5 and a spoken description of the pictures. Pure, randomness only through the Rng.
 */
import { fmt, speak } from '../../core/format';
import type { ChoiceAnswer, ChoiceOption, ColorName, PictoIcon, Rng, Visual } from '../../core/types';
import { joinDe } from '../shared';

// ─── Themes ──────────────────────────────────────────────────────────────────

export interface DataTheme {
  id: string;
  /** Title of the chart, table or Strichliste. */
  title: string;
  /** Drawn in every row of a Bilddiagramm, so it must fit every row (T14): no apples in the row Bananen. */
  icon: PictoIcon;
  /** Heading of the label column in a table. */
  head: string;
  /** What is counted over all rows: 'Kinder', 'Tiere'. */
  unit: string;
  /** Heading of the number column in a table. */
  numberHead: string;
  /** Plural labels of the rows, at least 5 (one stays outside a table of 4 rows). */
  cats: readonly string[];
  /** Largest row that is believable in this setting: no 28 Schwäne on a pond. */
  maxRow: number;
  /** The unit of the answer for one row: 'Kinder', 'Autos'. */
  unitOf(cat: string): string;
  how(cat: string): string;
  more(a: string, b: string): string;
  says(cat: string, n: number): string;
  most: string;
  least: string;
  /** Questions about this theme that the numbers cannot answer. */
  open(cat: string): string[];
}

/** Every picture stands for one child, whatever the row says. The children of a whole school: a row can reach 50. */
function kinderTheme(id: string, title: string, head: string, verb: string, cats: string[]): DataTheme {
  return {
    id,
    title,
    icon: 'person',
    head,
    unit: 'Kinder',
    numberHead: 'Kinder',
    cats,
    maxRow: 50,
    unitOf: () => 'Kinder',
    how: (c) => `Wie viele Kinder ${verb} ${c}?`,
    more: (a, b) => `Wie viele Kinder mehr ${verb} ${a} als ${b}?`,
    says: (c, n) => `${fmt(n)} Kinder ${verb} ${c}.`,
    most: `Was ${verb} die meisten Kinder?`,
    least: `Was ${verb} die wenigsten Kinder?`,
    open: (c) => ['Wie alt sind die Kinder?', `Wie viele Jungen ${verb} ${c}?`, 'Wie heißen die Kinder?'],
  };
}

function countTheme(id: string, title: string, icon: PictoIcon, head: string, unit: string, maxRow: number, cats: string[]): DataTheme {
  return {
    id,
    title,
    icon,
    head,
    unit,
    numberHead: 'Anzahl',
    cats,
    maxRow,
    unitOf: (c) => c,
    how: (c) => `Wie viele ${c} sind es?`,
    more: (a, b) => `Wie viele ${a} mehr als ${b} sind es?`,
    says: (c, n) => `Es sind ${fmt(n)} ${c}.`,
    most: 'Wovon gibt es am meisten?',
    least: 'Wovon gibt es am wenigsten?',
    open: (c) => [`Welche Farbe haben die ${c}?`, `Wer hat die ${c} gezählt?`, `Wie groß sind die ${c}?`],
  };
}

export const THEMES: readonly DataTheme[] = [
  kinderTheme('tiere', 'Beliebte Tiere an der Schule', 'Tier', 'mögen', ['Hunde', 'Katzen', 'Hasen', 'Pferde', 'Mäuse', 'Fische']),
  kinderTheme('obst', 'Obst in der Pause', 'Obst', 'essen', ['Äpfel', 'Birnen', 'Bananen', 'Trauben', 'Kirschen', 'Pflaumen']),
  kinderTheme('spiele', 'Spiele in der Pause', 'Spiel', 'spielen', ['Fangen', 'Fußball', 'Verstecken', 'Gummitwist', 'Murmeln']),
  kinderTheme('lesen', 'Beliebte Bücher an der Schule', 'Buch', 'lesen', ['Märchen', 'Witze', 'Comics', 'Rätsel', 'Krimis']),
  kinderTheme('trinken', 'Getränke am Fest', 'Getränk', 'trinken', ['Wasser', 'Saft', 'Tee', 'Kakao', 'Milch']),
  countTheme('verkehr', 'Verkehr an der Schule', 'stern', 'Fahrzeug', 'Fahrzeuge', 30, ['Autos', 'Busse', 'Räder', 'Roller', 'Laster']),
  countTheme('baelle', 'Bälle in der Halle', 'ball', 'Ball', 'Bälle', 50, ['Fußbälle', 'Handbälle', 'Softbälle', 'Tennisbälle', 'Wasserbälle']),
  countTheme('korb', 'Obst im Korb', 'stern', 'Obst', 'Früchte', 20, ['Äpfel', 'Birnen', 'Bananen', 'Kirschen', 'Pflaumen']),
  countTheme('teich', 'Tiere am Teich', 'stern', 'Tier', 'Tiere', 12, ['Enten', 'Frösche', 'Fische', 'Libellen', 'Schwäne']),
];

/** A theme whose setting allows a row of `largest`, with n rows whose labels pass `fits`. */
export function pickRows(rng: Rng, n: number, largest: number, fits: (cat: string) => boolean = () => true): { theme: DataTheme; cats: string[] } {
  const theme = rng.pick(THEMES.filter((t) => t.maxRow >= largest && t.cats.filter(fits).length >= n));
  return { theme, cats: rng.sample(theme.cats.filter(fits), n) };
}

/**
 * Pictures per row that fit beside these labels on a 375 px phone, where half a picture at the edge would read as a half
 * picture. PictogramVisual draws 38 px per picture, 10 px per letter and 54 px around them, and shrinks to 464 px at most.
 */
export const picturesBeside = (cats: readonly string[]) => Math.floor((464 - 54 - 10 * Math.max(...cats.map((c) => c.length))) / 38);

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** n multiples of `step` in [min, max] with pairwise distance ≥ gap. The range must have room for them. */
export function spacedValues(rng: Rng, n: number, min: number, max: number, gap = 1, step = 1): number[] {
  const pool: number[] = [];
  for (let v = min; v <= max; v += step) pool.push(v);
  for (let tries = 0; tries < 50; tries++) {
    const out: number[] = [];
    for (const v of rng.shuffle(pool)) if (out.every((x) => Math.abs(x - v) >= gap)) out.push(v);
    if (out.length >= n) return out.slice(0, n);
  }
  // A greedy draw can miss a tight fit: evenly spaced, in random order.
  const wide = Math.ceil(gap / step) * step;
  return rng.shuffle(Array.from({ length: n }, (_, i) => min + i * wide));
}

/** Split `total` into n parts, each a multiple of `step` in [min, max] (min, max and total are multiples of step, and it fits). */
export function parts(rng: Rng, total: number, n: number, min: number, max: number, step = 1): number[] {
  const out: number[] = [];
  let rest = total;
  for (let i = 0; i < n; i++) {
    const after = n - 1 - i;
    const low = Math.max(min, rest - after * max);
    const high = Math.min(max, rest - after * min);
    const v = low + step * rng.int(0, Math.floor((high - low) / step));
    out.push(v);
    rest -= v;
  }
  return out;
}

export const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

/** 'Hunde 7, Katzen 3 und Mäuse 5' */
export function valuesText(cats: readonly string[], values: readonly number[]): string {
  return joinDe(cats.map((c, i) => `${c} ${fmt(values[i])}`));
}

// ─── Hints of §5 ─────────────────────────────────────────────────────────────

export const HINT_MEHR = 'Gefragt ist der Unterschied: Wie viele sind es mehr?';
export const HINT_PLUS = 'Schau auf die Frage: Es geht um den Unterschied, nicht um alle.';
export const HINT_DIFF = 'Rechne die größere Zahl minus die kleinere Zahl.';

// ─── Choice with pictures ────────────────────────────────────────────────────

/** A picture option. Without whyWrong it is the correct one. */
export interface PictureOption {
  visual: Visual;
  whyWrong?: string;
}

/**
 * Options with pictures, lettered in the order they are shown ('Säckchen A', 'Säckchen B', …). `tail` is a text option that
 * stays last ('Bei beiden gleich'); it is the correct one when no picture is. labels[i] is the label of pictures[i].
 */
export function pictureChoice(rng: Rng, prefix: string, pictures: readonly PictureOption[], tail?: ChoiceOption): { answer: ChoiceAnswer; labels: string[] } {
  const order = rng.shuffle(pictures.map((_, i) => i));
  const labels = pictures.map(() => '');
  const options: ChoiceOption[] = order.map((i, at) => {
    labels[i] = `${prefix} ${'ABCDEF'[at]}`;
    const { visual, whyWrong } = pictures[i];
    return { label: labels[i], visual, ...(whyWrong ? { whyWrong } : {}) };
  });
  if (tail) options.push(tail);
  const correct = options.findIndex((o) => !o.whyWrong);
  return { answer: { kind: 'choice', options, correct, layout: 'grid' }, labels };
}

// ─── Colours ─────────────────────────────────────────────────────────────────

export const COLORS: readonly ColorName[] = ['rot', 'blau', 'gelb', 'gruen', 'lila', 'orange'];
export const COLOR_NOUN: Record<ColorName, string> = { rot: 'Rot', blau: 'Blau', gelb: 'Gelb', gruen: 'Grün', lila: 'Lila', orange: 'Orange' };
/** Predicative: 'Die Kugel ist grün.' */
export const COLOR_WORD: Record<ColorName, string> = { rot: 'rot', blau: 'blau', gelb: 'gelb', gruen: 'grün', lila: 'lila', orange: 'orange' };
/** Before a plural noun: 'blaue Kugeln'. */
export const COLOR_ADJ: Record<ColorName, string> = { rot: 'rote', blau: 'blaue', gelb: 'gelbe', gruen: 'grüne', lila: 'lila', orange: 'orange' };

/** After 'die' or 'alle': 'die roten Kugeln'. */
export const COLOR_ADJ_N: Record<ColorName, string> = { rot: 'roten', blau: 'blauen', gelb: 'gelben', gruen: 'grünen', lila: 'lila', orange: 'orangen' };

/** '3 rote Kugeln', '1 rote Kugel' */
export function ballsText(color: ColorName, n: number): string {
  return `${fmt(n)} ${COLOR_ADJ[color]} ${n === 1 ? 'Kugel' : 'Kugeln'}`;
}

export type Balls = { color: ColorName; count: number }[];

/** '3 rote Kugeln und 2 blaue Kugeln' */
export const bagText = (balls: Balls) => joinDe(balls.map((b) => ballsText(b.color, b.count)));

/** 'sind 3 rote Kugeln', 'ist 1 rote Kugel' */
export const isBalls = (color: ColorName, n: number) => `${n === 1 ? 'ist' : 'sind'} ${ballsText(color, n)}`;

/** '2 Felder sind rot', '1 Feld ist rot' */
export const sectorsText = (color: ColorName, n: number) => `${fmt(n)} ${n === 1 ? 'Feld ist' : 'Felder sind'} ${COLOR_WORD[color]}`;

/** 'sind 2 Felder rot', 'ist 1 Feld rot' */
export const isSectors = (color: ColorName, n: number) => `${n === 1 ? 'ist 1 Feld' : `sind ${fmt(n)} Felder`} ${COLOR_WORD[color]}`;

/**
 * Sectors with the same colours apart, as far as they can be: red, blue, red, blue instead of red, red, blue, blue.
 * The fixed pointer rests on the first sector, so that one starts on a colour drawn evenly: the pointer must not tell the answer.
 */
export function arrangeSectors(rng: Rng, groups: readonly { color: ColorName; count: number }[]): ColorName[] {
  const left = rng.shuffle(groups).map((g) => ({ ...g }));
  const out: ColorName[] = [];
  while (left.some((g) => g.count > 0)) {
    const open = left.filter((g) => g.count > 0 && g.color !== out[out.length - 1]);
    const from = open.length ? open : left.filter((g) => g.count > 0);
    const next = from.reduce((a, b) => (b.count > a.count ? b : a));
    out.push(next.color);
    next.count--;
  }
  const first = rng.pick(groups.filter((g) => g.count > 0)).color;
  const start = rng.pick(out.flatMap((c, i) => (c === first ? [i] : [])));
  return [...out.slice(start), ...out.slice(0, start)];
}

// ─── Spoken text ─────────────────────────────────────────────────────────────

function tallyRowText(label: string, count: number): string {
  const b = Math.floor(count / 5);
  const s = count % 5;
  const single = s === 1 ? '1 Strich' : `${fmt(s)} Striche`;
  if (b === 0) return `${label}: ${single}`;
  return s === 0 ? `${label}: ${fmt(b)} Fünferbündel` : `${label}: ${fmt(b)} Fünferbündel und ${single}`;
}

/** The picture in words, with what the child sees: bundles, pictures and bars, so that counting stays the task. */
export function describeVisual(v: Visual): string {
  switch (v.type) {
    case 'tally':
      return `Strichliste. ${v.rows.map((r) => tallyRowText(r.label, r.count)).join('. ')}.`;
    case 'table':
      return `Tabelle. ${v.header.join(' und ')}. ${v.rows.map((r) => r.join(' ')).join('. ')}.`;
    case 'pictogram': {
      const rows = v.categories.map((c, i) => {
        const pics = v.values[i] / v.iconValue;
        const full = Math.floor(pics);
        const half = pics > full ? ' und ein halbes Bild' : '';
        return `${c}: ${fmt(full)} ${full === 1 ? 'Bild' : 'Bilder'}${half}`;
      });
      const key = v.showKey === false ? '' : ` Ein Bild steht für ${fmt(v.iconValue)}.`;
      return `Bilddiagramm.${key} ${rows.join('. ')}.`;
    }
    case 'barChart':
      return `Säulendiagramm. ${valuesText(v.categories, v.values)}.`;
    case 'bag':
      return `Im Säckchen sind ${bagText(v.balls)}.`;
    case 'spinner': {
      const colors = COLORS.filter((c) => v.sectors.includes(c));
      return `Glücksrad mit ${fmt(v.sectors.length)} gleich großen Feldern. ${joinDe(colors.map((c) => sectorsText(c, v.sectors.filter((x) => x === c).length)))}.`;
    }
    case 'dice':
      return 'Würfel mit den Zahlen 1 bis 6.';
    default:
      return '';
  }
}

/** Exercise.srText: the picture in words, then the task. */
export function spoken(visual: Visual | undefined, ...texts: (string | undefined)[]): string {
  return speak([visual ? describeVisual(visual) : '', ...texts].filter(Boolean).join(' '));
}
