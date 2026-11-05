/**
 * Checkable text rules for 7–8-year-olds (docs/research.md §4). Words are whitespace tokens; the symbols + − · : = □ do not count
 * (nor does any other token without a letter or digit). Pure, used by src/core/testing.ts. Each check returns its problems as text.
 */
import { TEXT_LIMITS } from './age';
import type { Exercise, Step, Stufe } from './types';

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

/** Sentences: text up to . ! ? followed by a space or the end. A colon does not end a sentence. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

const SUBORDINATE = /(?<![\p{L}])(weil|wenn|dass|obwohl|nachdem|während|damit|sodass)(?![\p{L}])/iu;

/** Words after a comma that can start a relative clause, with the rest of the clause. */
const RELATIVE = /,\s+(?:(?:in|an|auf|mit|von|zu|bei|für|aus)\s+)?(?:der|die|das|dem|den|denen|deren|dessen|welche[rsmn]?)\s+([^,.;:!?]+)/iu;
/** A clause end that is no verb: 'Der Zehner steht vorne, der Einer hinten.' */
const NO_VERB_END = /^(hinten|vorne|vorn|oben|unten|links|rechts|innen|außen|danach|davor|dabei|dazu)$/i;

/** T5 heuristic: a relative clause ends in a verb, a list has 'und'. It can miss or overreach: then the sentence is too long anyway. */
export function hasRelativeClause(text: string): boolean {
  const m = RELATIVE.exec(text);
  if (!m) return false;
  const clause = m[1].trim();
  if (/\bund\b/.test(clause)) return false;
  const last = clause.split(/\s+/).pop() ?? '';
  if (NO_VERB_END.test(last)) return false;
  return /^\p{Ll}/u.test(last) && /(t|e|en|st|n)$/.test(last);
}

/** Indirect question or free relative after a comma: 'Schau, wo Zehner und Einer gleich sind.' A comma inside a direct question stays fine. */
const INDIRECT = /,\s+(was|wie|wo|wer|wann|warum|ob|woher|wohin|woran)\s+([^,.;:!?]+)(?=[.,;:!]|$)/iu;
/** Free relative at the start of a sentence: 'Was links außen ist, kommt nach rechts außen.' */
const FREE_RELATIVE = /(?:^|:\s+)(was|wer|wo)\s+[^,?]+,[^?]*$/iu;

/** T5 heuristic: such a clause ends in a verb. 'wie ein Blatt Papier' ends in a noun, so a comparison passes. */
function indirectClause(text: string): string | null {
  const m = INDIRECT.exec(text);
  const last = m?.[2].trim().split(/\s+/).pop() ?? '';
  if (m && /^\p{Ll}/u.test(last) && !NO_VERB_END.test(last)) return m[1];
  for (const s of sentences(text)) {
    const free = FREE_RELATIVE.exec(s);
    if (free) return free[1];
  }
  return null;
}

/** T5: a word that opens a subordinate clause, or a relative clause; null if none. */
export function subordinateClause(text: string): string | null {
  const m = SUBORDINATE.exec(text);
  if (m) return m[1];
  if (hasRelativeClause(text)) return 'Relativsatz';
  return indirectClause(text);
}

/** §7.2: a "count again" hint. Telling what to count ('Zähle die Sprünge, nicht die Striche.') is fine. */
const COUNT_AGAIN = [
  /(?<![\p{L}])zähl\p{L}*\s+(?:\p{L}+\s+)?(?:noch\s*(?:ein)?mal|nochmal|erneut|wieder|einfach|genau|nach)(?![\p{L}])/iu,
  /(?<![\p{L}])(?:noch\s*(?:ein)?mal|nochmal|erneut|wieder|einfach|genau)\s+(?:\p{L}+\s+)?(?:nach|ab)?zählen(?![\p{L}])/iu,
  /(?<![\p{L}])nachzähl\p{L}*/iu,
  /(?<![\p{L}])(?:mit\s+den\s+fingern|an\s+den\s+fingern)(?![\p{L}])/iu,
];

export function isCountAgainHint(text: string): boolean {
  return COUNT_AGAIN.some((re) => re.test(text));
}

/** T9: a pronoun for a noun of an earlier sentence, or across a colon. 'es' is not checked: it is mostly impersonal ('Es sind 7.'). */
const BACK_PRONOUN = /(?<![\p{L}])(sie|er|ihn|ihm|ihnen)(?![\p{L}])/iu;

export function pronounProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = t.split(/(?<=[.!?:])\s+/).slice(1).map((part) => BACK_PRONOUN.exec(part)).find(Boolean);
    if (found) out.push(`T9: "${found[1]}" in "${t}"`);
  }
  return out;
}

/** T10: a number word where digits belong. 'ein' and 'eine' stay: they are mostly articles. */
const QUANTITY_WORD = /(?<![\p{L}-])(eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig|hundert)(?![\p{L}-])/iu;

/** T10 exceptions: zahlen.zahlwort teaches number words, and groessen.uhr teaches spoken times ('halb drei'), which are no quantities. */
export const NUMBER_WORD_SKILLS: ReadonlySet<string> = new Set(['zahlen.zahlwort', 'groessen.uhr']);

export function numberWordProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = QUANTITY_WORD.exec(t);
    if (found) out.push(`T10: "${found[1]}" in "${t}"`);
  }
  return out;
}

const stepText = (step: Step) => (typeof step === 'string' ? step : step.text);

/** T8: letters of a word outside the allowlist. */
export const MAX_WORD_LETTERS = 12;

/**
 * T8: the long words children may meet, for reading review with real children (docs/research.md §4): the school's Fachwörter and the
 * names of pictures and skills. Add a word only if a simpler one would change the maths.
 */
export const LONG_WORD_ALLOWLIST: ReadonlySet<string> = new Set([
  'Aufgabenfamilie',
  'Aufgabenfamilien',
  'Bilddiagramme',
  'Durcheinander',
  'Einerschritten',
  'Fehlerdetektiv',
  'Flächenformen',
  'Geteiltaufgabe',
  'Geteiltaufgaben',
  'Hunderterfeld',
  'Hundertertafel',
  'Möglichkeiten',
  'Nachbaraufgaben',
  'Nachbarzahlen',
  'Nachbarzehner',
  'Nachbarzehnern',
  'Quadrataufgabe',
  'Quadrataufgaben',
  'Rechenzeichen',
  'Säulendiagramme',
  'Tauschaufgabe',
  'Tauschaufgaben',
  'Umkehraufgabe',
  'Viertelstunde',
  'Viertelstunden',
  'Zwanzigerfeld',
  'hintereinander',
  'unwahrscheinlich',
  'wahrscheinlich',
]);

/** Number words ('vierunddreißig'): zahlen.zahlwort teaches them. */
const NUMBER_WORD = /^(ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)und(zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)$/iu;

/** T8: words of more than MAX_WORD_LETTERS letters outside the allowlist; a hyphen joins two words. */
export function longWords(text: string): string[] {
  const words = text.match(/\p{L}+/gu) ?? [];
  return words.filter((w) => [...w].length > MAX_WORD_LETTERS && !LONG_WORD_ALLOWLIST.has(w) && !NUMBER_WORD.test(w));
}

/** T8 on every text the child reads. */
export function longWordProblems(texts: readonly string[]): string[] {
  return texts.flatMap((t) => longWords(t).map((w) => `T8: "${w}" in "${t}"`));
}

/** T1–T4: the task text. An exercise with `context` counts as a Sachaufgabe (T2). */
export function taskTextProblems(ex: Pick<Exercise, 'prompt' | 'context' | 'expression'>, stufe: Stufe): string[] {
  const out: string[] = [];
  const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
  const all = [story, ex.expression].filter(Boolean).join(' ');
  const words = wordCount(all);
  if (ex.context) {
    if (words > TEXT_LIMITS.storyWords[stufe]) out.push(`T2: ${words} words on Stufe ${stufe} (at most ${TEXT_LIMITS.storyWords[stufe]}): "${all}"`);
  } else if (words > TEXT_LIMITS.taskWords) {
    out.push(`T1: ${words} words (at most ${TEXT_LIMITS.taskWords}): "${all}"`);
  }
  const parts = sentences(story);
  if (parts.length > TEXT_LIMITS.sentences) out.push(`T3: ${parts.length} sentences (at most ${TEXT_LIMITS.sentences}): "${story}"`);
  for (const s of parts) {
    if (wordCount(s) > TEXT_LIMITS.sentenceWords[stufe]) out.push(`T4: ${wordCount(s)} words in a sentence on Stufe ${stufe} (at most ${TEXT_LIMITS.sentenceWords[stufe]}): "${s}"`);
  }
  return out;
}

/** T15: one hint (strategy hint, bug hint or whyWrong). */
export function hintProblems(hint: string): string[] {
  const out: string[] = [];
  if (wordCount(hint) > TEXT_LIMITS.hintWords) out.push(`T15: ${wordCount(hint)} words in a hint (at most ${TEXT_LIMITS.hintWords}): "${hint}"`);
  if (sentences(hint).length > TEXT_LIMITS.hintSentences) out.push(`T15: ${sentences(hint).length} sentences in a hint (at most ${TEXT_LIMITS.hintSentences}): "${hint}"`);
  if (isCountAgainHint(hint)) out.push(`§7.2: a "count again" hint: "${hint}"`);
  return out;
}

/** T15: praise and worked steps. */
export function praiseAndStepProblems(ex: Pick<Exercise, 'praise' | 'steps'>, stufe: Stufe): string[] {
  const out: string[] = [];
  if (wordCount(ex.praise) > TEXT_LIMITS.praiseWords) out.push(`T15: ${wordCount(ex.praise)} words of praise (at most ${TEXT_LIMITS.praiseWords}): "${ex.praise}"`);
  if (stufe === 1 && ex.steps.length > TEXT_LIMITS.stepsStufe1) out.push(`T15: ${ex.steps.length} worked steps on Stufe 1 (at most ${TEXT_LIMITS.stepsStufe1})`);
  for (const step of ex.steps) {
    const text = stepText(step);
    if (/\n/.test(text)) out.push(`T15: a worked step with a line break: "${text}"`);
    if (wordCount(text) > TEXT_LIMITS.stepWords) out.push(`T15: ${wordCount(text)} words in a worked step (at most ${TEXT_LIMITS.stepWords}): "${text}"`);
  }
  return out;
}

/** T6: passive and subjunctive forms. */
const PASSIVE = /(?<![\p{L}])(wird|werden|wurde|wurden|würde|hätte|wäre)(?![\p{L}])/iu;

/** T4, T5, T6, T8, T9 and T10 on a text outside the generators (badges, phrases, privacy text). */
export function childTextProblems(text: string): string[] {
  const out = [...clauseProblems([text]), ...longWordProblems([text]), ...pronounProblems([text]), ...numberWordProblems([text])];
  for (const s of sentences(text)) {
    if (wordCount(s) > TEXT_LIMITS.sentenceWords[1]) out.push(`T4: ${wordCount(s)} words in a sentence: "${s}"`);
    const passive = PASSIVE.exec(s);
    if (passive) out.push(`T6: "${passive[1]}" in "${s}"`);
  }
  return out;
}

/** T5 on every text the child reads. */
export function clauseProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = subordinateClause(t);
    if (found) out.push(`T5: "${found}" in "${t}"`);
  }
  return out;
}
