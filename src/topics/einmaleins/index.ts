/**
 * Topic "Einmaleins: Malnehmen und Teilen" (docs/research.md §6). Skills in teaching order; the fact trainer comes right after mal 5,
 * where all Kern facts have been met.
 */
import type { TopicModule } from '../../core/types';
import { ableitenSkill } from './ableiten';
import { einmaleinsSkill } from './einmaleins';
import { mal1210Skill } from './mal-1-2-10';
import { mal5Skill } from './mal-5';
import { malVerstehenSkill } from './mal-verstehen';
import { quadrateSkill } from './quadrate';
import { tauschSkill } from './tausch';
import { teilenRestSkill } from './teilen-rest';
import { teilenVerstehenSkill } from './teilen-verstehen';
import { umkehrenSkill } from './umkehren';

const topic: TopicModule = {
  topicId: 'einmaleins',
  skills: [
    malVerstehenSkill,
    tauschSkill,
    mal1210Skill,
    mal5Skill,
    einmaleinsSkill,
    quadrateSkill,
    ableitenSkill,
    teilenVerstehenSkill,
    umkehrenSkill,
    teilenRestSkill,
  ],
};
export default topic;
