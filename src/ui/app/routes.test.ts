import { describe, expect, it } from 'vitest';
import { PATHS, exitPath, matchRoute, mixPath, planPath, practicePath, topicPath } from './routes';

describe('matchRoute', () => {
  it('matches the static routes', () => {
    expect(matchRoute('/')).toEqual({ name: 'home' });
    expect(matchRoute('/fortschritt')).toEqual({ name: 'progress' });
    expect(matchRoute('/abzeichen')).toEqual({ name: 'badges' });
    expect(matchRoute('/arbeitsblatt')).toEqual({ name: 'worksheet' });
    expect(matchRoute('/erwachsene')).toEqual({ name: 'adults' });
    expect(matchRoute('/datenschutz')).toEqual({ name: 'privacy' });
    expect(matchRoute('/impressum')).toEqual({ name: 'imprint' });
    expect(matchRoute('/wiederholen')).toEqual({ name: 'practice', plan: { mode: 'review' } });
  });

  it('matches parameterised routes', () => {
    expect(matchRoute('/thema/geometrie')).toEqual({ name: 'topic', topicId: 'geometrie' });
    expect(matchRoute('/mix/daten')).toEqual({ name: 'practice', plan: { mode: 'mixed', topicId: 'daten' } });
    expect(matchRoute('/ueben/zahlen.nachbarn/2')).toEqual({ name: 'practice', plan: { mode: 'skill', skillId: 'zahlen.nachbarn', stufe: 2 } });
  });

  it('ignores a trailing slash', () => {
    expect(matchRoute('/fortschritt/')).toEqual({ name: 'progress' });
    expect(matchRoute('/thema/zahlen/')).toEqual({ name: 'topic', topicId: 'zahlen' });
  });

  it('returns notFound for unknown paths and invalid parameters', () => {
    for (const p of [
      '/gibt-es-nicht',
      '/thema/physik',
      '/thema',
      '/mix/xyz',
      '/ueben/zahlen.nachbarn/4',
      '/ueben/zahlen.nachbarn/0',
      '/ueben/zahlen.nachbarn',
      '/ueben/physik.kraft/1',
      '/ueben/runden/1',
      '/fortschritt/extra',
      '/%E0%A4%A',
    ]) {
      expect(matchRoute(p), p).toEqual({ name: 'notFound' });
    }
  });

  it('round-trips the path builders', () => {
    expect(matchRoute(topicPath('einmaleins'))).toEqual({ name: 'topic', topicId: 'einmaleins' });
    expect(matchRoute(practicePath('groessen.geld-betrag', 3))).toEqual({ name: 'practice', plan: { mode: 'skill', skillId: 'groessen.geld-betrag', stufe: 3 } });
    expect(matchRoute(mixPath('sachaufgaben'))).toEqual({ name: 'practice', plan: { mode: 'mixed', topicId: 'sachaufgaben' } });
    for (const plan of [
      { mode: 'review' as const },
      { mode: 'mixed' as const, topicId: 'zahlen' as const },
      { mode: 'skill' as const, skillId: 'zahlen.nachbarn', stufe: 1 as const },
    ]) {
      expect(matchRoute(planPath(plan))).toEqual({ name: 'practice', plan });
    }
  });

  it('exits a round to the topic (skill/mixed) or home', () => {
    expect(exitPath({ mode: 'skill', skillId: 'zahlen.nachbarn', stufe: 1 })).toBe('/thema/zahlen');
    expect(exitPath({ mode: 'mixed', topicId: 'daten' })).toBe('/thema/daten');
    expect(exitPath({ mode: 'review' })).toBe(PATHS.home);
  });
});
