/**
 * Topic metadata (always loaded) and lazy loaders for the topic modules (one chunk per topic).
 */
import type { TopicId, TopicMeta, TopicModule } from '../core/types';

export const TOPICS: readonly TopicMeta[] = [
  { id: 'zahlen', title: 'Zahlen bis 100', shortTitle: 'Zahlen', description: 'Zählen, Zehner und Einer, der Zahlenstrahl', color: 'zahlen' },
  { id: 'plusminus', title: 'Plus und Minus', shortTitle: 'Plus und Minus', description: 'Dazurechnen und Abziehen bis 100', color: 'plusminus' },
  { id: 'einmaleins', title: 'Einmaleins', shortTitle: 'Einmaleins', description: 'Malnehmen und Teilen', color: 'einmaleins' },
  { id: 'groessen', title: 'Größen', shortTitle: 'Größen', description: 'Geld, Längen und Zeit', color: 'groessen' },
  { id: 'geometrie', title: 'Geometrie', shortTitle: 'Geometrie', description: 'Formen, Körper und Muster', color: 'geometrie' },
  { id: 'daten', title: 'Daten und Zufall', shortTitle: 'Daten', description: 'Strichlisten, Bilder lesen, Glück und Zufall', color: 'daten' },
  { id: 'sachaufgaben', title: 'Sachaufgaben', shortTitle: 'Sachaufgaben', description: 'Rechengeschichten aus dem Alltag lösen', color: 'sachaufgaben' },
];

const LOADERS: Record<TopicId, () => Promise<{ default: TopicModule }>> = {
  zahlen: () => import('./zahlen'),
  plusminus: () => import('./plusminus'),
  einmaleins: () => import('./einmaleins'),
  groessen: () => import('./groessen'),
  geometrie: () => import('./geometrie'),
  daten: () => import('./daten'),
  sachaufgaben: () => import('./sachaufgaben'),
};

const cache = new Map<TopicId, Promise<TopicModule>>();
const loaded = new Map<TopicId, TopicModule>();

export function isTopicId(id: string): id is TopicId {
  return Object.prototype.hasOwnProperty.call(LOADERS, id);
}

export function getTopicMeta(id: TopicId): TopicMeta {
  const meta = TOPICS.find((t) => t.id === id);
  if (!meta) throw new Error(`Unknown topic ${id}`);
  return meta;
}

export function loadTopic(id: TopicId): Promise<TopicModule> {
  let p = cache.get(id);
  if (!p) {
    p = LOADERS[id]().then((m) => {
      loaded.set(id, m.default);
      return m.default;
    });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

/** The module if loadTopic() has already delivered it, else undefined (no loading starts). */
export function loadedTopic(id: TopicId): TopicModule | undefined {
  return loaded.get(id);
}

export function loadAllTopics(): Promise<TopicModule[]> {
  return Promise.all(TOPICS.map((t) => loadTopic(t.id)));
}

/** Skill ids are `${topicId}.${slug}`. */
export function topicOfSkill(skillId: string): TopicId {
  const id = skillId.split('.')[0];
  if (!isTopicId(id)) throw new Error(`Skill id without valid topic prefix: ${skillId}`);
  return id;
}

