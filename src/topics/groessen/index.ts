// Topic "Geld, Längen, Zeit": skills in teaching order (docs/research.md §6).
import type { TopicModule } from '../../core/types';
import { einkaufenSkill } from './einkaufen';
import { geldBetragSkill } from './geld-betrag';
import { geldKennenSkill } from './geld-kennen';
import { geldWechselnSkill } from './geld-wechseln';
import { kalenderSkill } from './kalender';
import { linealSkill } from './lineal';
import { meterZentimeterSkill } from './meter-zentimeter';
import { uhrSkill } from './uhr';
import { zeitspannenSkill } from './zeitspannen';

const topic: TopicModule = {
  topicId: 'groessen',
  skills: [
    geldKennenSkill,
    geldBetragSkill,
    geldWechselnSkill,
    einkaufenSkill,
    linealSkill,
    meterZentimeterSkill,
    uhrSkill,
    zeitspannenSkill,
    kalenderSkill,
  ],
};
export default topic;
