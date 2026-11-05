// The type and touch rules for 7–8-year-olds in the shared CSS (docs/research.md §7.1, F13, F14).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');
const tokens = read('./tokens.css');
const value = (name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)?.[1] ?? '';

describe('type', () => {
  it('body is 22–24 px, at most 45ch; the task expression at least 2.5rem', () => {
    const body = parseFloat(value('fs-body')) * 16;
    expect(body).toBeGreaterThanOrEqual(22);
    expect(body).toBeLessThanOrEqual(24);
    expect(parseFloat(value('measure'))).toBeLessThanOrEqual(45);
    expect(parseFloat(value('fs-task'))).toBeGreaterThanOrEqual(2.5);
  });

  it('the task text keeps the measure', () => {
    const css = read('../ui/practice/practice.css');
    for (const cls of ['pr-prompt', 'pr-context', 'pr-solution', 'pr-feedback__text']) {
      const rule = new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      expect(rule, cls).toMatch(/max-width:\s*var\(--measure\)/);
    }
  });
});

describe('touch', () => {
  it('keypad and answers are 72 px, everything else 56 px', () => {
    expect(value('tap-lg')).toBe('72px');
    expect(value('tap')).toBe('56px');
    expect(read('../ui/keypad/keypad.css')).toMatch(/\.keypad__key\s*\{[^}]*min-height:\s*var\(--tap-lg\)/);
    expect(read('../ui/answers/ChoiceInput.css')).toMatch(/\.ans-choice__option\s*\{[^}]*min-height:\s*var\(--tap-lg\)/);
    expect(read('../ui/answers/OrderInput.css')).toMatch(/\.ans-order__item\s*\{[^}]*min-height:\s*var\(--tap-lg\)/);
    expect(read('./base.css')).toMatch(/\.btn\s*\{[^}]*min-height:\s*var\(--tap\)/);
  });

  it('hit areas reach into the gaps', () => {
    const gap = 'inset:\\s*calc\\(var\\(--gap-tap\\) / -2\\)';
    expect(read('../ui/keypad/keypad.css')).toMatch(new RegExp(`\\.keypad__key::before[^}]*${gap}`));
    expect(read('./base.css')).toMatch(new RegExp(`\\.btn::before\\s*\\{[^}]*${gap}`));
    expect(read('../ui/answers/ChoiceInput.css')).toMatch(new RegExp(`\\.ans-choice__option::before\\s*\\{[^}]*${gap}`));
    expect(read('../ui/answers/OrderInput.css')).toMatch(new RegExp(`\\.ans-order__item::before\\s*\\{[^}]*${gap}`));
  });

  it('on phones the outer keys reach to the screen edge', () => {
    const css = read('../ui/keypad/keypad.css');
    expect(css).toMatch(/\.keypad__key--d7::before[^}]*left:\s*calc\(-1 \* var\(--space-4\)\)/);
    expect(css).toMatch(/\.keypad__key--back::before[^}]*right:\s*calc\(-1 \* var\(--space-4\)\)/);
  });

  it('nothing clips the hit areas', () => {
    const btn = /\.btn\s*\{([^}]*)\}/.exec(read('./base.css'))?.[1] ?? '';
    expect(btn).not.toMatch(/overflow:\s*hidden/);
    const key = /\.keypad__key\s*\{([^}]*)\}/.exec(read('../ui/keypad/keypad.css'))?.[1] ?? '';
    expect(key).not.toMatch(/overflow:\s*hidden/);
  });
});
