// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NumberWallVisual from './NumberWallVisual';

describe('NumberWallVisual', () => {
  it('draws staggered stones, says what is where and fits a phone', () => {
    const { container } = render(<NumberWallVisual visual={{ type: 'numberWall', rows: [['C'], ['A', 'B'], ['3', '4', '5']] }} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('aria-label')).toBe('Zahlenmauer. Oben: C. Darunter: A und B. Unten: 3, 4 und 5.');
    expect(container.querySelectorAll('[data-stone]')).toHaveLength(6);
    expect(Number(img.getAttribute('width'))).toBeLessThanOrEqual(311);
    const x = (s: string) => Number(container.querySelector(`[data-stone="${s}"] rect`)!.getAttribute('x'));
    expect(x('A') - x('3')).toBe(44); // half a stone in, so A sits on 3 and 4
  });
});
