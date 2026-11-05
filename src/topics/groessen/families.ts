/**
 * Misconception families of the topic 'groessen'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'groessen-muenzen-wert': {
    'groessen.geld-betrag': 'muenzen-anzahl',
  },
  'groessen-euro-cent-getrennt': {
    'groessen.geld-betrag': 'einheiten-gemischt',
  },
  'groessen-cent-euro': {
    'groessen.geld-kennen': 'cent-euro-vergleich',
    'groessen.geld-betrag': 'cent-euro-vergleich',
  },
  'groessen-wenige-stuecke': {
    'groessen.geld-wechseln': 'nicht-wenigste',
  },
  'groessen-rueckgeld': {
    'groessen.einkaufen': 'rueckgeld-preis',
  },
  'groessen-rechenart': {
    'groessen.einkaufen': 'plus-minus-getauscht',
  },
  'groessen-lineal-anfang': {
    'groessen.lineal': 'lineal-anfang lineal-striche lineal-rueckwaerts',
  },
  'groessen-lineal-ende': {
    'groessen.lineal': 'lineal-ende',
  },
  'groessen-laenge-unterschied': {
    'groessen.lineal': 'mehr-unterschied',
  },
  'groessen-meter-zentimeter': {
    'groessen.meter-zentimeter': 'm-cm',
  },
  'groessen-halb': {
    'groessen.uhr': 'halb-uhr',
  },
  'groessen-zeiger': {
    'groessen.uhr': 'zeiger-getauscht',
  },
  'groessen-viertel': {
    'groessen.uhr': 'viertel-richtung',
  },
  'groessen-minuten-zahl': {
    'groessen.uhr': 'minuten-zahl',
  },
  'groessen-kurzer-zeiger': {
    'groessen.uhr': 'stunde-zu-frueh',
  },
  'groessen-sechzig-minuten': {
    'groessen.zeitspannen': 'stunde-100',
  },
  'groessen-zeitspanne': {
    'groessen.zeitspannen': 'zeitpunkt-spanne',
    'groessen.kalender': 'zeitpunkt-spanne',
  },
  'groessen-zeit-richtung': {
    'groessen.zeitspannen': 'richtung-zeit',
  },
  'groessen-sieben-tage': {
    'groessen.kalender': 'woche-fuenf',
  },
  'groessen-tage-rechnen': {
    'groessen.kalender': 'tage-zaun',
  },
};

export default families;
