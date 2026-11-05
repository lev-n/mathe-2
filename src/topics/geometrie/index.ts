// Topic "Geometrie": skills in teaching order (docs/research.md §6).
import type { TopicModule } from '../../core/types';
import { flaechenSkill } from './flaechen';
import { formenSkill } from './formen';
import { koerperSkill } from './koerper';
import { lageSkill } from './lage';
import { musterSkill } from './muster';
import { symmetrieSkill } from './symmetrie';
import { wuerfelgebaeudeSkill } from './wuerfelgebaeude';

const topic: TopicModule = {
  topicId: 'geometrie',
  skills: [lageSkill, formenSkill, koerperSkill, symmetrieSkill, musterSkill, wuerfelgebaeudeSkill, flaechenSkill],
};
export default topic;
