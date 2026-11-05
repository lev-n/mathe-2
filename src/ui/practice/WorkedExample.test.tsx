// @vitest-environment jsdom
import { cleanup, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, Visual } from '../../core/types';
import WorkedExample, { showsSolvedInput } from './WorkedExample';

afterEach(cleanup);

const LINE: Exercise = {
  key: 'zahlen.test:450',
  topicId: 'zahlen',
  skillId: 'zahlen.test',
  stufe: 1,
  ab: 1,
  prompt: 'Wo liegt 450? Tippe die Stelle an.',
  answer: { kind: 'numberline', min: 0, max: 1000, majorStep: 100, minorStep: 10, step: 10, value: 450, tolerance: 0, labelMajor: true },
  hints: ['Zähle in Hunderterschritten.'],
  steps: ['450 liegt zwischen 400 und 500.'],
  praise: 'Du hast genau gezählt.',
  srText: 'Wo liegt 450 auf dem Zahlenstrahl?',
  kmk: ['ZO.zahlenstrahl'],
};

describe('WorkedExample', () => {
  it('draws the option the solution names: the options themselves are not on screen', () => {
    const coin: Visual = { type: 'money', items: [200] };
    const choice: Exercise = {
      ...LINE,
      answer: { kind: 'choice', layout: 'grid', correct: 1, options: [{ label: 'A', visual: { type: 'money', items: [5] } }, { label: 'B', visual: coin }] },
    };
    const { container } = render(<WorkedExample id="ex" exercise={choice} doneLabel="Schließen" onDone={vi.fn()} />);
    expect(container.querySelector('.pr-solution')!.textContent).toContain('B');
    expect(container.querySelector('svg.visual-money')!.getAttribute('aria-label')).toBe('Geld: 1 Münze zu 2 Euro.');
    expect(container.querySelectorAll('svg.visual-money')).toHaveLength(1);
    cleanup();
    // A step already draws it: not twice.
    const drawn = render(<WorkedExample id="ex" exercise={{ ...choice, steps: [{ text: 'Das ist Bild B.', visual: coin }] }} doneLabel="Schließen" onDone={vi.fn()} />);
    expect(drawn.container.querySelectorAll('svg.visual-money')).toHaveLength(1);
  });

  it('shows the solved input only as a fallback when no step has a picture', () => {
    expect(showsSolvedInput(LINE)).toBe(true);
    const withPicture: Exercise = {
      ...LINE,
      steps: [...LINE.steps, { text: 'Der Pfeil gehört an diese Stelle: 450.', visual: { type: 'numberLine', min: 0, max: 1000, majorStep: 100, minorStep: 10, labelMajor: true, marks: [{ value: 450, label: '450' }] } }],
    };
    expect(showsSolvedInput(withPicture)).toBe(false);
    const { container } = render(<WorkedExample id="ex" exercise={withPicture} doneLabel="Schließen" onDone={vi.fn()} />);
    expect(container.querySelector('.pr-example__solved')).toBeNull();
    expect(container.querySelectorAll('.nl-input')).toHaveLength(0);
  });

  it('the solved input is a static picture: no tab stops, hidden from assistive technology', () => {
    const { container, getByRole } = render(<WorkedExample id="ex" exercise={LINE} doneLabel="Schließen" onDone={vi.fn()} />);
    const solved = container.querySelector('.pr-example__solved')!;
    expect(solved.hasAttribute('inert')).toBe(true);
    expect(solved.getAttribute('aria-hidden')).toBe('true');
    // The only control of the example is its own button.
    const section = getByRole('region', { name: "So geht's" });
    expect(within(section).getAllByRole('button').map((b) => b.textContent)).toEqual(['Schließen']);
    expect(section.querySelector('.pr-solution')!.textContent).toBe('Die Lösung: 450');
  });
});
