import { describe, expect, it } from 'vitest';
import topic from './index';

describe('topic plusminus', () => {
  it('lists the skills of the catalogue in teaching order, all of them core', () => {
    expect(topic.skills.map((s) => s.id)).toEqual([
      'plusminus.zehner-voll',
      'plusminus.einspluseins',
      'plusminus.grosse-aufgabe',
      'plusminus.ueber-den-zehner',
      'plusminus.plus-bis-100',
      'plusminus.minus-bis-100',
      'plusminus.geschickt',
      'plusminus.aufgabenfamilie',
      'plusminus.verdoppeln-halbieren',
    ]);
    for (const s of topic.skills) expect(s.optional, s.id).toBeUndefined();
  });
});
