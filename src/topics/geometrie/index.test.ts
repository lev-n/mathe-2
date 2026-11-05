import { describe, expect, it } from 'vitest';
import topic from './index';

describe('topic geometrie', () => {
  it('has the skills of the catalogue in teaching order', () => {
    expect(topic.skills.map((s) => s.id)).toEqual([
      'geometrie.lage', 'geometrie.formen', 'geometrie.koerper', 'geometrie.symmetrie', 'geometrie.muster', 'geometrie.wuerfelgebaeude', 'geometrie.flaechen',
    ]);
  });

  it('marks only the optional skill of the catalogue as Extra', () => {
    expect(topic.skills.filter((s) => s.optional === 'extra').map((s) => s.id)).toEqual(['geometrie.flaechen']);
  });
});
