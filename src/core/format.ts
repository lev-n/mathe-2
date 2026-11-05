/**
 * German school notation (docs/research.md T10):
 * - no comma notation in Klasse 2: money '3 € 40 ct', lengths '2 m 15 cm'; quantities 'number + space + unit'
 * - operators + − · : and the placeholder □
 */

/** No-break space between number and unit. */
export const NBSP = '\u00A0';

export const MINUS = '\u2212';
export const TIMES = '\u00B7';
export const DIV = ':';
export const BOX = '\u25A1';

/** A number as it is written: fmt(2500) → '2500', fmt(-3) → '−3'. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) throw new RangeError(`fmt: not a finite number: ${n}`);
  return (n < 0 ? MINUS : '') + String(Math.abs(n)).replace('.', ',');
}

/** Money from Cent in mixed notation (T10): fmtMoney(340) → '3 € 40 ct', fmtMoney(300) → '3 €', fmtMoney(40) → '40 ct' */
export function fmtMoney(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new RangeError(`fmtMoney: cents must be a whole number ≥ 0: ${cents}`);
  const euro = Math.floor(cents / 100);
  const ct = cents % 100;
  if (euro === 0) return `${ct}${NBSP}ct`;
  return ct === 0 ? `${euro}${NBSP}€` : `${euro}${NBSP}€ ${ct}${NBSP}ct`;
}

/** Length from cm in mixed notation (T10): fmtLength(215) → '2 m 15 cm', fmtLength(200) → '2 m', fmtLength(15) → '15 cm' */
export function fmtLength(cm: number): string {
  if (!Number.isInteger(cm) || cm < 0) throw new RangeError(`fmtLength: cm must be a whole number ≥ 0: ${cm}`);
  const m = Math.floor(cm / 100);
  const rest = cm % 100;
  if (m === 0) return `${rest}${NBSP}cm`;
  return rest === 0 ? `${m}${NBSP}m` : `${m}${NBSP}m ${rest}${NBSP}cm`;
}

/** Quantity with unit: fmtQty(5, 'cm') → '5 cm' */
export function fmtQty(n: number, unit: string): string {
  return `${fmt(n)}${NBSP}${unit}`;
}

/** Clock time: fmtTime(14, 5) → '14:05 Uhr' */
export function fmtTime(hours: number, minutes: number, withUhr = true): string {
  const t = `${hours}:${String(minutes).padStart(2, '0')}`;
  return withUhr ? `${t}${NBSP}Uhr` : t;
}

/** Time span in mixed notation: fmtDuration(85) → '1 h 25 min', fmtDuration(60) → '1 h', fmtDuration(45) → '45 min' */
export function fmtDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}${NBSP}min`;
  if (m === 0) return `${h}${NBSP}h`;
  return `${h}${NBSP}h ${m}${NBSP}min`;
}

// ─── Zahlwörter ──────────────────────────────────────────────────────────────

const ONES = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const TEENS = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

/**
 * German number word for 0 ≤ n < 1000.
 * numberWord(34) → 'vierunddreißig', numberWord(1) → 'eins', numberWord(215) → 'zweihundertfünfzehn'
 */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1000) throw new RangeError(`numberWord: out of range: ${n}`);
  if (n === 0) return 'null';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = h > 0 ? ONES[h] + 'hundert' : '';
  if (rest === 1) return out + 'eins';
  if (rest < 10) return out + ONES[rest];
  if (rest < 20) return out + TEENS[rest - 10];
  const o = rest % 10;
  return out + (o > 0 ? ONES[o] + 'und' : '') + TENS[Math.floor(rest / 10)];
}

/** Ordinal of a date ('der neunzehnte', 'am sechsundzwanzigsten'), 1 ≤ n ≤ 31; `ending` is 'e' or 'en'. */
export function ordinalWord(n: number, ending: 'e' | 'en'): string {
  const stem = n === 1 ? 'erst' : n === 3 ? 'dritt' : n === 7 ? 'siebt' : n === 8 ? 'acht' : `${numberWord(n)}${n < 20 ? 't' : 'st'}`;
  return stem + ending;
}

// ─── Screen-reader text ──────────────────────────────────────────────────────

/**
 * Turn displayed maths into speakable German text:
 * '7 · 8 = □' → '7 mal 8 gleich Lücke'.
 * A clock time stays a clock time: '14:30 Uhr' as is, and a spaced '21 : 0 Uhr' becomes '21:00 Uhr'
 * (never 'geteilt durch').
 */
export function toSpeech(text: string): string {
  return text
    .replace(/\b(\d{1,2})\s+:\s+(\d{1,2})(?=[\s\u00A0]+Uhr\b)/g, (_all, h: string, m: string) => `${h}:${m.padStart(2, '0')}`)
    .replace(/\u00B7/g, ' mal ')
    .replace(/\s:\s/g, ' geteilt durch ')
    .replace(/\u2212/g, ' minus ')
    .replace(/\s\+\s/g, ' plus ')
    .replace(/\u25A1/g, ' Lücke ')
    .replace(/\s=\s/g, ' gleich ')
    .replace(/\s<\s/g, ' ist kleiner als ')
    .replace(/\s>\s/g, ' ist größer als ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    // No space before punctuation ('… etwa 1 Lücke .' → '… etwa 1 Lücke.').
    .replace(/\s+([.,;!?])(?=\s|$)/g, '$1')
    .trim();
}

/** The signs of a comparison as words, e.g. on an answer button. */
export const SYMBOL_WORDS: Readonly<Record<string, string>> = { '<': 'kleiner als', '>': 'größer als', '=': 'gleich' };

const UNIT_WORDS: Record<string, [singular: string, plural: string]> = {
  cm: ['Zentimeter', 'Zentimeter'],
  m: ['Meter', 'Meter'],
  ct: ['Cent', 'Cent'],
  '€': ['Euro', 'Euro'],
  h: ['Stunde', 'Stunden'],
  min: ['Minute', 'Minuten'],
};

/** toSpeech() plus spoken unit names: '3 € 40 ct' → '3 Euro 40 Cent', '1 h 25 min' → '1 Stunde 25 Minuten'. */
export function speak(text: string): string {
  return toSpeech(text)
    .replace(/(^|\s)(\S+) (cm|ct|min|m|h|€)(?=$|[\s.,;:!?)])/g, (_all, pre: string, num: string, unit: string) => {
      const [sg, pl] = UNIT_WORDS[unit];
      return `${pre}${num} ${num === '1' || num === 'ein' ? sg : pl}`;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Text for the speech voice (docs/research.md T16): speak() with numbers as words, so '34' sounds as 'vierunddreißig' in every
 * voice, clock times as spoken ('8:30 Uhr' → 'acht Uhr dreißig'), dates as ordinals ('der 19.' → 'der neunzehnte', 'am 6.' →
 * 'am sechsten'), '1-mal' as 'einmal' and 'Z' and 'E' after a number as 'Zehner' and 'Einer'.
 * A 1 before a word (not a sign word: '1 mal 5' is 'eins mal fünf') stays a digit, as the voice knows the right ending ('1 Münze' → 'eine Münze').
 */
export function spokenWords(text: string): string {
  return speak(text)
    .replace(/\b(\d{1,2}):(\d{2})(?: Uhr)?/g, (_all, h: string, m: string) => (Number(m) === 0 ? `${h} Uhr` : `${h} Uhr ${m}`))
    .replace(/\b(\d+) Z\b/g, '$1 Zehner')
    .replace(/\b(\d+) E\b/g, '$1 Einer')
    .replace(/\b(der|am|vom|zum|den) (\d{1,2})\.(\?)?/g, (_all, article: string, n: string, question: string | undefined) =>
      `${article} ${ordinalWord(Number(n), article === 'der' ? 'e' : 'en')}${question ?? '.'}`)
    .replace(/\b1-mal\b/g, 'einmal')
    .replace(/\d+/g, (digits: string, at: number, all: string) => {
      const n = Number(digits);
      if (n >= 1000) return digits;
      if (n === 1 && /^ (?!mal\b|gleich\b|plus\b|minus\b|geteilt\b)\p{L}/u.test(all.slice(at + digits.length))) return digits;
      return numberWord(n);
    });
}
