// Topic "Daten und Zufall", skills in teaching order (docs/research.md §6).
import type { TopicModule } from '../../core/types';
import { bilddiagrammSkill } from './bilddiagramm';
import { chancenSkill } from './chancen';
import { kombinierenSkill } from './kombinieren';
import { saeulenSkill } from './saeulen';
import { sicherMoeglichSkill } from './sicher-moeglich';
import { strichlisteSkill } from './strichliste';
import { tabelleSkill } from './tabelle';

const topic: TopicModule = {
  topicId: 'daten',
  skills: [strichlisteSkill, tabelleSkill, bilddiagrammSkill, saeulenSkill, kombinierenSkill, sicherMoeglichSkill, chancenSkill],
};
export default topic;
