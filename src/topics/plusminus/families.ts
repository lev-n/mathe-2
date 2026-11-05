/**
 * Misconception families of the topic 'plusminus' (docs/research.md §5). Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'plusminus-eins-daneben': {
    'plusminus.zehner-voll': 'zaehlen-eins-daneben',
    'plusminus.einspluseins': 'zaehlen-eins-daneben',
    'plusminus.grosse-aufgabe': 'zaehlen-eins-daneben',
    'plusminus.ueber-den-zehner': 'zaehlen-eins-daneben',
    'plusminus.plus-bis-100': 'zaehlen-eins-daneben',
    'plusminus.minus-bis-100': 'zaehlen-eins-daneben',
    'plusminus.verdoppeln-halbieren': 'zaehlen-eins-daneben',
  },
  'plusminus-zehner-vergessen': {
    'plusminus.einspluseins': 'zehner-vergessen',
    'plusminus.ueber-den-zehner': 'zehner-vergessen',
    'plusminus.plus-bis-100': 'zehner-vergessen',
    'plusminus.minus-bis-100': 'zehner-vergessen',
    'plusminus.verdoppeln-halbieren': 'zehner-vergessen',
  },
  'plusminus-buendeln': {
    'plusminus.plus-bis-100': 'ziffern-reihung',
    'plusminus.verdoppeln-halbieren': 'ziffern-reihung',
  },
  'plusminus-kleiner-von-groesser': {
    'plusminus.einspluseins': 'kleiner-von-groesser',
    'plusminus.ueber-den-zehner': 'kleiner-von-groesser',
    'plusminus.plus-bis-100': 'kleiner-von-groesser',
    'plusminus.minus-bis-100': 'kleiner-von-groesser',
  },
  'plusminus-ausgleich': {
    'plusminus.geschickt': 'hilfsaufgabe-richtung hilfsaufgabe-vergessen',
  },
  'plusminus-stellen': {
    'plusminus.grosse-aufgabe': 'stelle-verwechselt',
  },
  'plusminus-grosse-aufgabe': {
    'plusminus.grosse-aufgabe': 'kleine-aufgabe-genannt nur-zehner-gezaehlt',
  },
  'plusminus-muster': {
    'plusminus.grosse-aufgabe': 'muster-letzte muster-schritt',
  },
  'plusminus-rechenart': {
    'plusminus.einspluseins': 'plus-minus-getauscht',
    'plusminus.grosse-aufgabe': 'plus-minus-getauscht',
    'plusminus.ueber-den-zehner': 'plus-minus-getauscht',
    'plusminus.plus-bis-100': 'plus-minus-getauscht',
    'plusminus.minus-bis-100': 'plus-minus-getauscht',
    'plusminus.geschickt': 'plus-minus-getauscht',
    'plusminus.aufgabenfamilie': 'plus-minus-getauscht',
  },
  'plusminus-luecke': {
    'plusminus.zehner-voll': 'platzhalter-summe',
    'plusminus.einspluseins': 'platzhalter-summe',
    'plusminus.grosse-aufgabe': 'platzhalter-summe',
    'plusminus.ueber-den-zehner': 'platzhalter-summe',
    'plusminus.plus-bis-100': 'platzhalter-summe',
    'plusminus.minus-bis-100': 'platzhalter-summe',
  },
  'plusminus-bis-zehner': {
    'plusminus.zehner-voll': 'einer-genannt ziel-genannt',
    'plusminus.ueber-den-zehner': 'einer-genannt',
  },
  'plusminus-bis-hundert': {
    'plusminus.zehner-voll': 'zehner-zu-viel einer-vergessen',
  },
  'plusminus-zehner-richtung': {
    'plusminus.ueber-den-zehner': 'zehner-richtung',
  },
  'plusminus-zerlegen': {
    'plusminus.ueber-den-zehner': 'rest-ganz',
    'plusminus.plus-bis-100': 'ziffern-einzeln einer-vergessen zehner-nicht-gerechnet',
    'plusminus.minus-bis-100': 'ziffern-einzeln einer-vergessen zehner-nicht-gerechnet',
  },
  'plusminus-mauer': {
    'plusminus.plus-bis-100': 'mauer-unten',
  },
  'plusminus-gleichheit': {
    'plusminus.aufgabenfamilie': 'gleichheit',
    'plusminus.einspluseins': 'gleichheit',
    'plusminus.geschickt': 'gleichheit',
    'plusminus.plus-bis-100': 'gleichheit',
    'plusminus.ueber-den-zehner': 'gleichheit',
  },
  'plusminus-familie': {
    'plusminus.aufgabenfamilie': 'aufgabe-gespiegelt',
  },
  'plusminus-doppelt-haelfte': {
    'plusminus.verdoppeln-halbieren': 'halbiert verdoppelt plus-zwei minus-zwei',
  },
  'plusminus-halbieren-zehner': {
    'plusminus.verdoppeln-halbieren': 'halbieren-zehner',
  },
  'plusminus-fast-doppelt': {
    'plusminus.verdoppeln-halbieren': 'doppelt-ohne-eins doppelt-grosse',
  },
};

export default families;
