// Topic "Zahlen bis 100" (docs/research.md §6): the skills in teaching order.
import type { TopicModule } from '../../core/types';
import { anzahlErkennenSkill } from './anzahl-erkennen';
import { geradeUngeradeSkill } from './gerade-ungerade';
import { hundertertafelSkill } from './hundertertafel';
import { nachbarnSkill } from './nachbarn';
import { vergleichenSkill } from './vergleichen';
import { zaehlenSkill } from './zaehlen';
import { zahlenstrahlSkill } from './zahlenstrahl';
import { zahlwortSkill } from './zahlwort';
import { zehnerEinerSkill } from './zehner-einer';

const topic: TopicModule = {
  topicId: 'zahlen',
  skills: [
    zaehlenSkill,
    anzahlErkennenSkill,
    zehnerEinerSkill,
    zahlwortSkill,
    vergleichenSkill,
    nachbarnSkill,
    zahlenstrahlSkill,
    hundertertafelSkill,
    geradeUngeradeSkill,
  ],
};
export default topic;
