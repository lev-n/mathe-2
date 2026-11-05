// The notes for adults must match the code: what they call an Extra is marked optional, and what they gate is gated.
import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import type { Exercise, SkillDef, Stufe } from '../core/types';
import { TOPICS, loadTopic } from '../topics/registry';
import { LAENDER_DIFFERENCES, isKmkTag, KMK_TAGS } from './curriculum';

/** The note on the adult page for each optional skill. */
const NOTE_OF_EXTRA: Record<string, string> = {
  'zahlen.hundertertafel': 'Hundertertafel',
  'zahlen.gerade-ungerade': 'Gerade und ungerade',
  'einmaleins.quadrate': 'Quadrataufgaben und mal 0',
  'einmaleins.teilen-rest': 'Teilen mit Rest',
  'geometrie.flaechen': 'Flächen und Umfang',
  'daten.chancen': 'Wahrscheinlich und Chancen',
  'sachaufgaben.zwei-schritte': 'Sachaufgaben in zwei Schritten',
};

async function allSkills(): Promise<SkillDef[]> {
  return (await Promise.all(TOPICS.map((t) => loadTopic(t.id)))).flatMap((m) => m.skills);
}

function sample(skill: SkillDef, extras: boolean, stufe: Stufe, n = 150): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 613 + stufe), stufe, { extras, ab: 3 }));
}

describe('Länder notes on the adult page', () => {
  it('every note that says Extra belongs to an optional skill, and every optional skill has its note', async () => {
    const skills = await allSkills();
    const optional = skills.filter((s) => s.optional).map((s) => s.id).sort();
    expect(optional).toEqual(Object.keys(NOTE_OF_EXTRA).sort());
    const saysExtra = LAENDER_DIFFERENCES.filter((d) => /ein Extra\b/.test(d.text)).map((d) => d.topic).sort();
    expect(saysExtra).toEqual(Object.values(NOTE_OF_EXTRA).sort());
    expect(skills.find((s) => s.id === 'plusminus.verdoppeln-halbieren')?.optional).toBeUndefined();
  });

  it('what a note gates to Stufe 3 and extras appears there, and only there', async () => {
    const skills = await allSkills();
    const skill = (id: string) => skills.find((s) => s.id === id)!;
    const has = (list: Exercise[], test: (ex: Exercise) => boolean) => list.some(test);
    const gates: [string, string, (ex: Exercise) => boolean][] = [
      ['Körper', 'geometrie.koerper', (ex) => ex.visual?.type === 'solid' && !['wuerfel', 'quader', 'kugel'].includes(ex.visual.solid)],
      ['Spiegelbilder ergänzen', 'geometrie.symmetrie', (ex) => ex.answer.kind === 'cells'],
      ['Wahrscheinlich und Chancen', 'daten.sicher-moeglich', (ex) => /wahrscheinlich/i.test(JSON.stringify(ex.answer) + ex.prompt)],
      ['Quadrataufgaben und mal 0', 'einmaleins.mal-1-2-10', (ex) => / · 0\b|\b0 · /.test(ex.expression ?? '')],
    ];
    for (const [topic, id, test] of gates) {
      const text = LAENDER_DIFFERENCES.find((d) => d.topic === topic)!.text;
      expect(text, topic).toMatch(/eingeschalteten Extras/);
      expect(has(sample(skill(id), true, 3), test), `${topic}: extras on, Stufe 3`).toBe(true);
      expect(has(sample(skill(id), false, 3), test), `${topic}: extras off`).toBe(false);
      expect(has(sample(skill(id), true, 2), test), `${topic}: Stufe 2`).toBe(false);
    }
  });
});

describe('KMK tags', () => {
  it('every tag is used by a skill, and a skill uses only known tags', async () => {
    const used = new Set((await allSkills()).flatMap((s) => s.kmk));
    for (const tag of used) expect(isKmkTag(tag), tag).toBe(true);
    const items = (await allSkills()).flatMap((s) => [1, 2, 3].flatMap((stufe) => sample(s, true, stufe as Stufe, 40)));
    const emitted = new Set([...used, ...items.flatMap((ex) => ex.kmk)]);
    for (const tag of Object.keys(KMK_TAGS)) expect(emitted.has(tag), tag).toBe(true);
  }, 60_000);
});
