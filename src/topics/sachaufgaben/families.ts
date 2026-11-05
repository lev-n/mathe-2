/**
 * Misconception families of the topic 'sachaufgaben'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 * Choice items give their feedback through whyWrong, without a Bug id, so sachaufgaben.rechnung-finden has no entry.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'sachaufgaben-rechenart': {
    'sachaufgaben.bildaufgabe': 'plus-minus-getauscht',
    'sachaufgaben.plus-minus': 'plus-minus-getauscht',
    'sachaufgaben.mit-groessen': 'plus-minus-getauscht',
    'sachaufgaben.frage-pruefen': 'plus-minus-getauscht',
    'sachaufgaben.zwei-schritte': 'plus-minus-getauscht',
    'sachaufgaben.vergleichen': 'plus-minus-getauscht',
    'sachaufgaben.mal-teilen': 'plus-minus-getauscht',
  },
  'sachaufgaben-signalwort': {
    'sachaufgaben.plus-minus': 'signalwort',
    'sachaufgaben.vergleichen': 'signalwort',
  },
  'sachaufgaben-passende-zahlen': {
    'sachaufgaben.bildaufgabe': 'alle-zahlen',
    'sachaufgaben.frage-pruefen': 'alle-zahlen',
  },
  'sachaufgaben-unterschied': {
    'sachaufgaben.vergleichen': 'mehr-unterschied',
    'sachaufgaben.mit-groessen': 'mehr-unterschied',
  },
  'sachaufgaben-zehner': {
    'sachaufgaben.plus-minus': 'zehner-vergessen kleiner-von-groesser',
    'sachaufgaben.vergleichen': 'zehner-vergessen kleiner-von-groesser',
  },
  'sachaufgaben-bild-wert': {
    'sachaufgaben.bildaufgabe': 'muenzen-anzahl bild-legende',
    'sachaufgaben.vergleichen': 'bild-legende',
  },
  'sachaufgaben-gruppen': {
    'sachaufgaben.mal-teilen': 'mal-als-plus teilen-als-minus gruppe-vergessen',
  },
  'sachaufgaben-rest': {
    'sachaufgaben.mal-teilen': 'rest-sache',
  },
  'sachaufgaben-rueckgeld': {
    'sachaufgaben.mit-groessen': 'rueckgeld-preis',
    'sachaufgaben.zwei-schritte': 'rueckgeld-preis',
  },
  'sachaufgaben-einheiten': {
    'sachaufgaben.mit-groessen': 'einheiten-gemischt stunde-100',
  },
  'sachaufgaben-zeitspanne': {
    'sachaufgaben.mit-groessen': 'zeitpunkt-spanne',
  },
  'sachaufgaben-nachmittag': {
    'sachaufgaben.mit-groessen': 'stunden-zwoelf',
  },
  'sachaufgaben-beide-schritte': {
    'sachaufgaben.zwei-schritte': 'erster-schritt start-vergessen',
  },
};

export default families;
