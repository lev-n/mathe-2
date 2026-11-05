import { describe, expect, it } from 'vitest';
import { fmt, fmtDuration, fmtLength, fmtMoney, fmtQty, fmtTime, numberWord, ordinalWord, speak, spokenWords, toSpeech } from './format';

const N = ' ';

describe('fmt', () => {
  it('writes whole numbers without grouping and uses the minus sign U+2212', () => {
    expect(fmt(7)).toBe('7');
    expect(fmt(2500)).toBe('2500');
    expect(fmt(-3)).toBe('−3');
  });
  it('rejects non-finite numbers', () => {
    expect(() => fmt(NaN)).toThrow();
  });
});

describe('quantities', () => {
  it('formats money, quantities, clock times and durations', () => {
    expect(fmtMoney(340)).toBe(`3${N}€ 40${N}ct`);
    expect(fmtMoney(300)).toBe(`3${N}€`);
    expect(fmtMoney(5)).toBe(`5${N}ct`);
    expect(fmtMoney(0)).toBe(`0${N}ct`);
    expect(fmtLength(215)).toBe(`2${N}m 15${N}cm`);
    expect(fmtLength(200)).toBe(`2${N}m`);
    expect(fmtLength(15)).toBe(`15${N}cm`);
    expect(fmtQty(5, 'cm')).toBe(`5${N}cm`);
    expect(fmtTime(14, 5)).toBe(`14:05${N}Uhr`);
    expect(fmtTime(8, 30, false)).toBe('8:30');
    expect(fmtDuration(85)).toBe(`1${N}h 25${N}min`);
    expect(fmtDuration(60)).toBe(`1${N}h`);
    expect(fmtDuration(45)).toBe(`45${N}min`);
  });
});

describe('numberWord', () => {
  it.each([
    [0, 'null'],
    [1, 'eins'],
    [11, 'elf'],
    [16, 'sechzehn'],
    [17, 'siebzehn'],
    [21, 'einundzwanzig'],
    [30, 'dreißig'],
    [99, 'neunundneunzig'],
    [100, 'einhundert'],
    [101, 'einhunderteins'],
    [215, 'zweihundertfünfzehn'],
  ])('%i → %s', (n, word) => {
    expect(numberWord(n)).toBe(word);
  });
  it('rejects out-of-range input', () => {
    expect(() => numberWord(1000)).toThrow();
    expect(() => numberWord(2.5)).toThrow();
  });
});

describe('toSpeech', () => {
  it('spells out operators', () => {
    expect(toSpeech('7 · 8 = □')).toBe('7 mal 8 gleich Lücke');
    expect(toSpeech('56 : 7 = 8')).toBe('56 geteilt durch 7 gleich 8');
    expect(toSpeech('900 − 1')).toBe('900 minus 1');
    expect(toSpeech('14:30 Uhr')).toBe('14:30 Uhr');
  });
  it('never reads a clock time as a division', () => {
    expect(toSpeech('21 : 0 Uhr')).toBe('21:00 Uhr');
    expect(toSpeech('Die Lösung ist 11 : 15\u00A0Uhr.')).toBe('Die Lösung ist 11:15 Uhr.');
    expect(toSpeech('21:00\u00A0Uhr')).toBe('21:00 Uhr');
    expect(toSpeech('48 : 6 = 8')).toBe('48 geteilt durch 6 gleich 8');
  });
  it('leaves no space before punctuation', () => {
    expect(toSpeech('Das sind etwa 1 □.')).toBe('Das sind etwa 1 Lücke.');
    expect(toSpeech('□, □ und □ .')).toBe('Lücke, Lücke und Lücke.');
    expect(toSpeech('3 · 4 = □ ?')).toBe('3 mal 4 gleich Lücke?');
  });
});

describe('speak', () => {
  it('names the units of Klasse 2', () => {
    expect(speak(`3${N}€ 40${N}ct`)).toBe('3 Euro 40 Cent');
    expect(speak(`1${N}h 25${N}min`)).toBe('1 Stunde 25 Minuten');
    expect(speak(`2${N}m 15${N}cm`)).toBe('2 Meter 15 Zentimeter');
  });
});

describe('spokenWords: what the read-aloud voice gets', () => {
  it('turns numbers into words', () => {
    expect(spokenWords('34 + 8 = □')).toBe('vierunddreißig plus acht gleich Lücke');
    expect(spokenWords('3 · 4 = □')).toBe('drei mal vier gleich Lücke');
    expect(spokenWords('3 · 1 = □')).toBe('drei mal eins gleich Lücke');
    expect(spokenWords('1 · 5 = □')).toBe('eins mal fünf gleich Lücke');
    expect(spokenWords('56 : 7 = 8')).toBe('sechsundfünfzig geteilt durch sieben gleich acht');
    expect(spokenWords('Wie viel ist 100 − 1?')).toBe('Wie viel ist einhundert minus eins?');
  });
  it('reads units, place values and clock times as spoken', () => {
    expect(spokenWords(`3${N}€ 40${N}ct`)).toBe('drei Euro vierzig Cent');
    expect(spokenWords('2 Z 14 E')).toBe('zwei Zehner vierzehn Einer');
    expect(spokenWords(`8:30${N}Uhr`)).toBe('acht Uhr dreißig');
    expect(spokenWords(`9:00${N}Uhr`)).toBe('neun Uhr');
    expect(spokenWords('Die Uhr zeigt 14:15.')).toBe('Die Uhr zeigt vierzehn Uhr fünfzehn.');
  });
  it('reads dates as ordinals and 1-mal as einmal (T16)', () => {
    expect(spokenWords('Heute ist der 8. In 6 Tagen ist das Fest.')).toBe('Heute ist der achte. In sechs Tagen ist das Fest.');
    expect(spokenWords('Das Fest ist am 26.')).toBe('Das Fest ist am sechsundzwanzigsten.');
    expect(spokenWords('Welcher Wochentag ist der 19.?')).toBe('Welcher Wochentag ist der neunzehnte?');
    expect(spokenWords('Heute ist der 1.')).toBe('Heute ist der erste.');
    expect(spokenWords('1 · 9 heißt 1-mal die 9.')).toBe('eins mal neun heißt einmal die neun.');
    expect(ordinalWord(3, 'en')).toBe('dritten');
    expect(ordinalWord(7, 'e')).toBe('siebte');
    expect(ordinalWord(31, 'en')).toBe('einunddreißigsten');
  });
  it('leaves a 1 before a word to the voice, and words as they are', () => {
    expect(spokenWords('1 Münze und 2 Scheine')).toBe('1 Münze und zwei Scheine');
    expect(spokenWords(`1${N}€`)).toBe('1 Euro');
    expect(spokenWords('vierunddreißig')).toBe('vierunddreißig');
  });
});
