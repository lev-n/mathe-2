import { describe, expect, it } from 'vitest';
import { TOPICS } from '../topics/registry';
import { TOPIC_IDS } from './mastery';
import {
  dueFacts,
  dueReviews,
  masteryOf,
  practisedStufe,
  practisedTopics,
  skillKey,
  starsOf,
  suggestedStufe,
  topicStars,
  visibleSkills,
  weekProgress,
} from './selectors';
import { emptyState } from './store';
import { entry, skillDef, withFacts, withSkills } from './testkit';
import type { ProgressState } from './types';

const extrasOff = (s: ProgressState): ProgressState => ({ ...s, settings: { ...s.settings, extras: false } });

describe('basic selectors', () => {
  it('skillKey / masteryOf / starsOf', () => {
    const s = withSkills({ 'zahlen.nachbarn#1': entry('sicher'), 'zahlen.nachbarn#2': entry('geuebt'), 'zahlen.nachbarn#3': entry('gemeistert') });
    expect(skillKey('zahlen.nachbarn', 2)).toBe('zahlen.nachbarn#2');
    expect(masteryOf(s, 'zahlen.nachbarn', 1)).toBe('sicher');
    expect(masteryOf(s, 'zahlen.vergleichen', 1)).toBe('neu');
    expect([1, 2, 3].map((n) => starsOf(s, 'zahlen.nachbarn', n as 1 | 2 | 3))).toEqual([2, 1, 3]);
  });

  it('suggestedStufe: Stufe 1 for a new skill, else the first Stufe from the lowest practised one that is not sicher (3 if all are)', () => {
    expect(suggestedStufe(emptyState(), 'zahlen.nachbarn')).toBe(1);
    expect(suggestedStufe(withSkills({ 'zahlen.nachbarn#1': entry('geuebt') }), 'zahlen.nachbarn')).toBe(1);
    expect(suggestedStufe(withSkills({ 'zahlen.nachbarn#1': entry('gemeistert') }), 'zahlen.nachbarn')).toBe(2);
    expect(suggestedStufe(withSkills({ 'zahlen.nachbarn#1': entry('sicher'), 'zahlen.nachbarn#2': entry('geuebt') }), 'zahlen.nachbarn')).toBe(2);
    expect(suggestedStufe(withSkills({ 'zahlen.nachbarn#2': entry('geuebt') }), 'zahlen.nachbarn')).toBe(2);
    // started at Stufe 2 and it is sicher: move up, never back to Stufe 1
    expect(suggestedStufe(withSkills({ 'zahlen.nachbarn#2': entry('sicher') }), 'zahlen.nachbarn')).toBe(3);
    const all = withSkills({ 'zahlen.nachbarn#1': entry('sicher'), 'zahlen.nachbarn#2': entry('sicher'), 'zahlen.nachbarn#3': entry('gemeistert') });
    expect(suggestedStufe(all, 'zahlen.nachbarn')).toBe(3);
  });

  it('practisedStufe = highest Stufe with answers', () => {
    expect(practisedStufe(emptyState(), 'zahlen.nachbarn')).toBeUndefined();
    expect(practisedStufe(withSkills({ 'zahlen.nachbarn#1': entry('sicher'), 'zahlen.nachbarn#2': entry('geuebt') }), 'zahlen.nachbarn')).toBe(2);
    expect(practisedStufe(withSkills({ 'zahlen.nachbarn#3': entry('neu') }), 'zahlen.nachbarn')).toBeUndefined();
  });
});

describe('dueReviews', () => {
  const s = withSkills({
    'zahlen.nachbarn#1': entry('sicher', { box: 2, due: '2026-10-19' }),
    'zahlen.vergleichen#2': entry('sicher', { box: 1, due: '2026-10-10' }),
    'geometrie.flaechen#1': entry('gemeistert', { box: 4, due: '2026-10-15' }),
    'daten.sicher-moeglich#3': entry('sicher', { box: 3, due: '2026-10-20' }),
    'zahlen.zahlwort#1': entry('geuebt', { box: 0 }),
    'zahlen.hundertertafel#1': entry('sicher', { box: 1, due: '2026-10-01', optional: true }),
  });

  it('returns box ≥ 1 items due on or before the day, most overdue first', () => {
    expect(dueReviews(extrasOff(s), '2026-10-19')).toEqual([
      { skillId: 'zahlen.vergleichen', stufe: 2, due: '2026-10-10' },
      { skillId: 'geometrie.flaechen', stufe: 1, due: '2026-10-15' },
      { skillId: 'zahlen.nachbarn', stufe: 1, due: '2026-10-19' },
    ]);
    expect(dueReviews(extrasOff(s), '2026-10-09')).toEqual([]);
    expect(dueReviews(s, '2026-10-19', 1)).toHaveLength(1);
  });

  it('includes optional extras only when the setting is on', () => {
    expect(dueReviews(s, '2026-10-19')[0]).toEqual({ skillId: 'zahlen.hundertertafel', stufe: 1, due: '2026-10-01' });
  });

  it('caps the list at 5 by default with a stable order for equal days', () => {
    const many: Record<string, ReturnType<typeof entry>> = {};
    for (let i = 0; i < 12; i++) many[`zahlen.s${String(i).padStart(2, '0')}#1`] = entry('sicher', { box: 1, due: i < 6 ? '2026-10-18' : '2026-10-17' });
    const due = dueReviews(withSkills(many), '2026-10-19');
    expect(due).toHaveLength(5);
    expect(due.map((d) => d.skillId)).toEqual(['zahlen.s06', 'zahlen.s07', 'zahlen.s08', 'zahlen.s09', 'zahlen.s10']);
  });
});

describe('facts', () => {
  const s = withFacts({
    '2x7': { box: 2, due: '2026-10-19', seen: 3, correct: 3 },
    '5x8': { box: 0, due: '2026-10-18', seen: 2, correct: 0 },
    '2x5': { box: 4, due: '2026-11-01', seen: 6, correct: 6 },
    '10x10': { box: 5, due: '2026-10-10', seen: 9, correct: 9 },
    '4x4': { box: 1, due: '2026-10-25', seen: 1, correct: 1 },
  });

  it('dueFacts: due on or before the day (also box 0 from an earlier day), most overdue first', () => {
    expect(dueFacts(s, '2026-10-19')).toEqual(['10x10', '5x8', '2x7']);
    expect(dueFacts(emptyState(), '2026-10-19')).toEqual([]);
  });
});

describe('weekProgress (Mon–Sun)', () => {
  const s = { ...emptyState(), days: ['2026-10-11', '2026-10-12', '2026-10-14', '2026-10-18', '2026-10-19'] };

  it('counts distinct practice days of the current week only', () => {
    // week of 12.–18.10.2026
    expect(weekProgress(s, '2026-10-18')).toEqual({ days: 3, goal: 3, reached: true });
    expect(weekProgress(s, '2026-10-12')).toEqual({ days: 3, goal: 3, reached: true });
    // Monday 19.10. starts a new week quietly
    expect(weekProgress(s, '2026-10-19')).toEqual({ days: 1, goal: 3, reached: false });
    expect(weekProgress(s, '2026-10-25')).toEqual({ days: 1, goal: 3, reached: false });
  });

  it('uses the weekly goal (1–5) from the settings', () => {
    const g5 = { ...s, settings: { ...s.settings, weeklyGoal: 5 } };
    expect(weekProgress(g5, '2026-10-18')).toEqual({ days: 3, goal: 5, reached: false });
    const g1 = { ...s, settings: { ...s.settings, weeklyGoal: 1 } };
    expect(weekProgress(g1, '2026-10-19').reached).toBe(true);
  });

  it('works for weeks across the year boundary', () => {
    const y = { ...emptyState(), days: ['2026-12-27', '2026-12-28', '2026-12-31', '2027-01-03', '2027-01-04'] };
    expect(weekProgress(y, '2027-01-01').days).toBe(3);
  });
});

describe('topicStars / practisedTopics', () => {
  const skills = [skillDef('zahlen.nachbarn'), skillDef('zahlen.vergleichen'), skillDef('zahlen.hundertertafel', true)];
  const s = withSkills({
    'zahlen.nachbarn#1': entry('gemeistert'),
    'zahlen.nachbarn#2': entry('sicher'),
    'zahlen.nachbarn#3': entry('geuebt'),
    'zahlen.vergleichen#1': entry('geuebt'),
    'zahlen.hundertertafel#1': entry('sicher', { optional: true }),
    'geometrie.flaechen#1': entry('neu'),
  });

  it('sums stars and sicher Stufen over the core skills: extras never count, shown or not', () => {
    expect(topicStars(s, skills)).toEqual({ stars: 3 + 2 + 1 + 1, max: 18, sicher: 2, total: 6 });
    expect(topicStars(extrasOff(s), skills)).toEqual(topicStars(s, skills));
    expect(topicStars(emptyState(), [])).toEqual({ stars: 0, max: 0, sicher: 0, total: 0 });
    expect(visibleSkills(s, skills).map((x) => x.id)).toEqual(['zahlen.nachbarn', 'zahlen.vergleichen', 'zahlen.hundertertafel']);
    expect(visibleSkills(extrasOff(s), skills).map((x) => x.id)).toEqual(['zahlen.nachbarn', 'zahlen.vergleichen']);
  });

  it('lists topics with at least one practised skill, in topic order', () => {
    const t = withSkills({ 'daten.sicher-moeglich#1': entry('geuebt'), 'einmaleins.einmaleins#1': entry('sicher') }, s);
    expect(practisedTopics(t)).toEqual(['zahlen', 'einmaleins', 'daten']);
    expect(practisedTopics(extrasOff(withSkills({ 'zahlen.hundertertafel#1': entry('geuebt', { optional: true }) })))).toEqual([]);
    expect(practisedTopics(withSkills({ 'zahlen.hundertertafel#1': entry('geuebt', { optional: true }) }))).toEqual(['zahlen']);
    expect(practisedTopics(emptyState())).toEqual([]);
  });

  it('TOPIC_IDS follow the registry order', () => {
    expect(TOPIC_IDS).toEqual(TOPICS.map((t) => t.id));
  });
});
