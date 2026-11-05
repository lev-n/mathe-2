/**
 * Topic "Plus und Minus": from number pairs to 10 up to addition and subtraction to 100, strategies and task families
 * (docs/research.md §6). Skills are listed in teaching order; ids are stable forever.
 */
import type { TopicModule } from '../../core/types';
import { aufgabenfamilieSkill } from './aufgabenfamilie';
import { einspluseinsSkill } from './einspluseins';
import { geschicktSkill } from './geschickt';
import { grosseAufgabeSkill } from './grosse-aufgabe';
import { minusBis100Skill } from './minus-bis-100';
import { plusBis100Skill } from './plus-bis-100';
import { ueberDenZehnerSkill } from './ueber-den-zehner';
import { verdoppelnHalbierenSkill } from './verdoppeln-halbieren';
import { zehnerVollSkill } from './zehner-voll';

const topic: TopicModule = {
  topicId: 'plusminus',
  skills: [
    zehnerVollSkill,
    einspluseinsSkill,
    grosseAufgabeSkill,
    ueberDenZehnerSkill,
    plusBis100Skill,
    minusBis100Skill,
    geschicktSkill,
    aufgabenfamilieSkill,
    verdoppelnHalbierenSkill,
  ],
};
export default topic;
