/**
 * Lenient parsing of what children type. Never says "falsch" for input it cannot read:
 * returns a friendly German reason instead (counted as "invalid", not as an attempt).
 * Klasse 2 has whole numbers only (docs/research.md §2.4: no comma notation).
 */

export type ParseResult = { ok: true; value: number } | { ok: false; reason: string };

export function parseNumber(raw: string): ParseResult {
  const text = raw.replace(/\s/g, '').replace(/−/g, '-');
  if (text === '') return { ok: false, reason: 'Gib zuerst eine Zahl ein.' };
  if (/[.,]/.test(text) && /^-?[\d.,]+$/.test(text)) return { ok: false, reason: 'Hier ist eine ganze Zahl gesucht – ohne Komma.' };
  if (!/^-?\d+$/.test(text)) return { ok: false, reason: 'Schreibe nur Ziffern.' };
  return { ok: true, value: Number(text) };
}
