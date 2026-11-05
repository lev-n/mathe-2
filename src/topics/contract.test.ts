/**
 * The contract of a topic directory, so that each topic can be replaced on its own: src/topics/<topic>/ has
 * index.ts (default export: the TopicModule), phrases.ts and families.ts, and imports nothing from another topic's
 * directory. Generic helpers live in src/topics/shared.ts, test helpers in src/topics/test-utils.ts and step-check.ts.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import type { Exercise } from '../core/types';
import { TOPICS, loadTopic } from './registry';

const SRC = new URL('../', import.meta.url);
const TOPIC_IDS = TOPICS.map((t) => t.id);
const isCode = (f: string) => /\.tsx?$/.test(f);
const importsOf = (url: URL) => [...readFileSync(url, 'utf8').matchAll(/(?:from\s+|import\(\s*)'([^']+)'/g)].map((m) => m[1]);

describe.each(TOPIC_IDS)('topic directory %s', (id) => {
  const dir = new URL(`topics/${id}/`, SRC);

  it('has index.ts (the module), phrases.ts and families.ts', async () => {
    const files = readdirSync(dir);
    for (const f of ['index.ts', 'phrases.ts', 'families.ts']) expect(files, f).toContain(f);
    const mod = await loadTopic(id);
    expect(mod.topicId).toBe(id);
    expect(mod.skills.length).toBeGreaterThan(0);
    for (const s of mod.skills) {
      expect(s.topicId).toBe(id);
      expect(s.id.startsWith(`${id}.`), s.id).toBe(true);
    }
  });

  it('imports nothing from another topic’s directory', () => {
    for (const f of readdirSync(dir, { recursive: true }).filter(isCode)) {
      for (const spec of importsOf(new URL(f, dir))) {
        for (const other of TOPIC_IDS.filter((t) => t !== id)) {
          expect(spec.includes(`../${other}/`) || spec === `../${other}` || spec.includes(`topics/${other}`), `${id}/${f} imports ${spec}`).toBe(false);
        }
      }
    }
  });
});

describe('code outside the topics', () => {
  it('reaches a topic only through the registry and the merged error tables', () => {
    for (const area of ['core', 'data', 'seo', 'state', 'ui']) {
      const dir = new URL(`${area}/`, SRC);
      for (const f of readdirSync(dir, { recursive: true }).filter(isCode)) {
        for (const spec of importsOf(new URL(f, dir))) {
          for (const t of TOPIC_IDS) expect(spec.includes(`topics/${t}`), `${area}/${f} imports ${spec}`).toBe(false);
        }
      }
    }
  });
});

describe('what a Stufe label promises', () => {
  /** Content that comes only with extras on: a label names it only after 'Mit Extras' (the label stays the same with extras off). */
  const ONLY_WITH_EXTRAS = /Quadrataufgaben|mal 0|Zylinder|Kegel|Pyramide|Prisma|selbst ergänzen|wahrscheinlich|\bRest\b/i;

  it('a core skill names content behind the extras setting only as such', async () => {
    let gated = 0;
    for (const id of TOPIC_IDS) {
      for (const skill of (await loadTopic(id)).skills.filter((s) => !s.optional)) {
        for (const stufe of [1, 2, 3] as const) {
          const label = skill.stufen[stufe];
          const hit = ONLY_WITH_EXTRAS.exec(label);
          if (!hit) continue;
          gated++;
          const marker = label.indexOf('Mit Extras');
          expect(marker, `${skill.id} Stufe ${stufe}: ${label}`).toBeGreaterThanOrEqual(0);
          expect(hit.index, `${skill.id} Stufe ${stufe}: ${label}`).toBeGreaterThan(marker);
        }
      }
    }
    expect(gated).toBeGreaterThanOrEqual(5);
  });

  it('with extras off, what the labels mark never appears in a core skill', async () => {
    const texts = (ex: Exercise) => JSON.stringify([ex.prompt, ex.context, ex.expression, ex.hints, ex.steps, ex.answer]);
    for (const id of TOPIC_IDS) {
      for (const skill of (await loadTopic(id)).skills.filter((s) => !s.optional)) {
        for (const stufe of [1, 2, 3] as const) {
          for (const ab of [1, 2, 3] as const) {
            for (let seed = 1; seed <= 25; seed++) {
              const ex = skill.generate(createRng(seed * 131 + stufe * 7 + ab), stufe, { extras: false, ab });
              const all = texts(ex);
              expect(all, ex.key).not.toMatch(/wahrscheinlich|Zylinder|Kegel|Pyramide|Prisma|Quadrataufgabe/i);
              expect(ex.answer.kind === 'cells' && skill.id === 'geometrie.symmetrie', ex.key).toBe(false);
              expect(ex.expression ?? '', ex.key).not.toMatch(/ · 0\b|\b0 · /);
              if (skill.id === 'einmaleins.umkehren') expect(ex.factKey === undefined || /^(1|2|5|10)x/.test(ex.factKey), ex.key).toBe(true);
              if (skill.id === 'sachaufgaben.mal-teilen') expect(all, ex.key).not.toMatch(/\bRest\b/);
            }
          }
        }
      }
    }
  }, 60_000);
});
