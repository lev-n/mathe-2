/**
 * Einmaleins fact keys (docs/research.md F5, §7.1). Only a small set is tracked: the 40 Kern facts a · b with a ∈ {1, 2, 5, 10},
 * b ∈ 1–10, and the 6 squares outside them (3 · 3, 4 · 4, 6 · 6, 7 · 7, 8 · 8, 9 · 9; optional, Bayern). Other facts appear only as
 * derivation tasks and carry no factKey.
 *
 * A key is 'axb' with the Kern factor first. The first factor counts groups (3 · 4 = 3-mal die 4), so 2 · 5 and 5 · 2 are two facts.
 * A Tauschaufgabe with one Kern factor shares its key (7 · 2 → '2x7').
 */

const KERN_FACTORS: readonly number[] = [1, 2, 5, 10];
const SQUARE_FACTORS: readonly number[] = [3, 4, 6, 7, 8, 9];
const isFactor = (n: number) => n >= 1 && n <= 10;

const FACT_RE = /^\s*(\d{1,2})\s*[x×·*]\s*(\d{1,2})\s*$/i;

/** Canonical key ('7x2' → '2x7'), or null if the key is not a tracked fact ('3x7', '0x5', '11x2'). */
export function normalizeFactKey(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  const m = FACT_RE.exec(key);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!isFactor(a) || !isFactor(b)) return null;
  if (KERN_FACTORS.includes(a)) return `${a}x${b}`;
  if (KERN_FACTORS.includes(b)) return `${b}x${a}`;
  return a === b ? `${a}x${b}` : null;
}

/** true if `key` is already in canonical form. */
export function isFactKey(key: unknown): key is string {
  return typeof key === 'string' && normalizeFactKey(key) === key;
}

/** Exercise.factKey for a · b, undefined when this fact is not tracked (use it as `factKey: factKeyOf(a, b)`). */
export function factKeyOf(a: number, b: number): string | undefined {
  return normalizeFactKey(`${a}x${b}`) ?? undefined;
}

/** Factors of a canonical key, in key order. */
export function factFactors(key: string): [number, number] {
  const [a, b] = key.split('x').map(Number);
  return [a, b];
}

/** The 40 Kernaufgaben, ordered by factors. */
export const KERN_FACT_KEYS: readonly string[] = KERN_FACTORS.flatMap((a) => Array.from({ length: 10 }, (_, i) => `${a}x${i + 1}`));

/** The 6 optional squares outside the Kernaufgaben. */
export const SQUARE_FACT_KEYS: readonly string[] = SQUARE_FACTORS.map((a) => `${a}x${a}`);

/** Every tracked fact (46 keys), ordered by factors. */
export const ALL_FACT_KEYS: readonly string[] = [...KERN_FACT_KEYS, ...SQUARE_FACT_KEYS].sort((a, b) => compareFactKeys(a, b));

export function isKernFact(key: string): boolean {
  return KERN_FACTORS.includes(factFactors(key)[0]);
}

/**
 * The skill that owns a fact: a review slot for the fact runs this skill with GenContext.factKey set. Kern facts come through the
 * fact trainer, squares through their Extra skill (with extras off they get no review slot, src/state/round.ts).
 */
export function factSkillId(key: string): string {
  return isKernFact(key) ? 'einmaleins.einmaleins' : 'einmaleins.quadrate';
}

/** Numeric ordering of fact keys (1x1, 1x2, …, 2x1, …). */
export function compareFactKeys(a: string, b: string): number {
  const [a1, a2] = factFactors(a);
  const [b1, b2] = factFactors(b);
  return a1 - b1 || a2 - b2;
}
