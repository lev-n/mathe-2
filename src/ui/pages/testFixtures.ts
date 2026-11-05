/**
 * Test-only fixtures (imported by *.test.tsx files only): small deterministic stand-ins with real skill ids, so page tests
 * stay fast and do not change with the task texts. src/integration.test.tsx runs the pages with the real generators.
 */
import { BOX, fmt } from '../../core/format';
import type { Exercise, SkillDef, Stufe, TopicId, TopicModule } from '../../core/types';
import { emptyState } from '../../state/store';
import type { MasteryState, ProgressState, StufeProgress } from '../../state/types';

export function fakeSkill(id: string, title: string, opts: { optional?: 'extra'; topicId?: TopicId } = {}): SkillDef {
  const topicId = opts.topicId ?? (id.split('.')[0] as TopicId);
  return {
    id,
    topicId,
    title,
    description: `${title} üben.`,
    stufen: { 1: `${title} leicht`, 2: `${title} mittel`, 3: `${title} knifflig` },
    kmk: ['ZO.grundaufgaben'],
    optional: opts.optional,
    generate(rng, stufe: Stufe): Exercise {
      const max = stufe === 1 ? 20 : stufe === 2 ? 40 : 49;
      const a = rng.int(10, max);
      const b = rng.int(10, max);
      const sum = a + b;
      return {
        key: `${id}:${stufe}:${a}+${b}`,
        topicId,
        skillId: id,
        stufe,
        ab: stufe,
        prompt: 'Rechne im Kopf.',
        expression: `${fmt(a)} + ${fmt(b)} = ${BOX}`,
        answer: { kind: 'number', value: sum },
        hints: ['Rechne zuerst die Zehner.'],
        steps: [`${fmt(a)} + ${fmt(b)} = ${fmt(sum)}`],
        praise: 'Du hast die Zehner zuerst gerechnet.',
        srText: `${a} plus ${b}`,
        kmk: stufe === 3 ? ['ZO.grundaufgaben', 'ZO.strategien'] : ['ZO.grundaufgaben'],
      };
    },
  };
}

export const FAKE_SKILLS: Record<TopicId, SkillDef[]> = {
  zahlen: [fakeSkill('zahlen.nachbarn', 'Nachbarzahlen'), fakeSkill('zahlen.zehner-einer', 'Zehner und Einer'), fakeSkill('zahlen.hundertertafel', 'Hundertertafel', { optional: 'extra' })],
  plusminus: [fakeSkill('plusminus.plus-bis-100', 'Plus bis 100')],
  einmaleins: [fakeSkill('einmaleins.einmaleins', 'Einmaleins')],
  groessen: [fakeSkill('groessen.geld-betrag', 'Geld')],
  geometrie: [fakeSkill('geometrie.formen', 'Flächenformen')],
  daten: [fakeSkill('daten.saeulen', 'Säulendiagramme')],
  sachaufgaben: [fakeSkill('sachaufgaben.plus-minus', 'Geschichten: Plus und Minus')],
};

export function fakeModule(topicId: TopicId): TopicModule {
  return { topicId, skills: FAKE_SKILLS[topicId] };
}

export function progress(state: MasteryState, extra: Partial<StufeProgress> = {}): StufeProgress {
  return { attempts: 10, recent: [], practiceDays: 1, state, box: 0, checks: [], last: '2026-10-17', ...extra };
}

/** emptyState() with some skill progress, e.g. { 'zahlen.nachbarn#1': progress('sicher') }. */
export function stateWith(skills: Record<string, StufeProgress> = {}, patch: Partial<ProgressState> = {}): ProgressState {
  const s = emptyState();
  return { ...s, ...patch, skills, settings: { ...s.settings, ...(patch.settings ?? {}) } };
}
