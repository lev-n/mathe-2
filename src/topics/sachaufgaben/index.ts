// Topic "Sachaufgaben": skills in teaching order (docs/research.md §6).
import type { TopicModule } from '../../core/types';
import { bildaufgabeSkill } from './bildaufgabe';
import { fragePruefenSkill } from './frage-pruefen';
import { malTeilenSkill } from './mal-teilen';
import { mitGroessenSkill } from './mit-groessen';
import { plusMinusSkill } from './plus-minus';
import { rechnungFindenSkill } from './rechnung-finden';
import { vergleichenSkill } from './vergleichen';
import { zweiSchritteSkill } from './zwei-schritte';

const topic: TopicModule = {
  topicId: 'sachaufgaben',
  skills: [bildaufgabeSkill, rechnungFindenSkill, plusMinusSkill, vergleichenSkill, malTeilenSkill, mitGroessenSkill, fragePruefenSkill, zweiSchritteSkill],
};
export default topic;
