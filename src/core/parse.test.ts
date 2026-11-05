import { describe, expect, it } from 'vitest';
import { parseNumber } from './parse';

const ok = (raw: string) => {
  const r = parseNumber(raw);
  if (!r.ok) throw new Error(`expected ok for "${raw}": ${r.reason}`);
  return r.value;
};
const bad = (raw: string) => {
  const r = parseNumber(raw);
  if (r.ok) throw new Error(`expected reason for "${raw}", got ${r.value}`);
  return r.reason;
};

describe('parseNumber', () => {
  it('accepts whole numbers, also with stray spaces', () => {
    expect(ok(' 42 ')).toBe(42);
    expect(ok('1 00')).toBe(100);
    expect(ok('007')).toBe(7);
  });
  it('gives friendly reasons instead of judging unreadable input', () => {
    expect(bad('')).toMatch(/Zahl ein/);
    expect(bad('abc')).toMatch(/Ziffern/);
    expect(bad('3,5')).toMatch(/ganze Zahl/);
    expect(bad('3.5')).toMatch(/ganze Zahl/);
  });
  it('accepts the minus sign', () => {
    expect(ok('−5')).toBe(-5);
    expect(ok('-5')).toBe(-5);
  });
});
