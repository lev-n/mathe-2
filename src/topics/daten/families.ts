/**
 * Misconception families of the topic 'daten'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 * The two chance skills have choice answers only: their §5 hint (sicher-haeufig) is a whyWrong text, which has no Bug id.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'daten-strich-buendel': {
    'daten.strichliste': 'strich-buendel-vier strich-buendel-eins strich-buendel-zehn strich-summe',
  },
  'daten-mehr-unterschied': {
    'daten.strichliste': 'mehr-unterschied',
    'daten.tabelle': 'mehr-unterschied',
    'daten.bilddiagramm': 'mehr-unterschied',
    'daten.saeulen': 'mehr-unterschied',
  },
  'daten-rechenart': {
    'daten.strichliste': 'plus-statt-minus',
    'daten.tabelle': 'plus-statt-minus',
    'daten.bilddiagramm': 'plus-statt-minus',
    'daten.saeulen': 'plus-statt-minus',
  },
  'daten-alle-zeilen': {
    'daten.strichliste': 'zeile-vergessen',
    'daten.saeulen': 'saeule-vergessen',
  },
  'daten-wert-finden': {
    'daten.tabelle': 'andere-zeile',
    'daten.bilddiagramm': 'andere-reihe',
    'daten.saeulen': 'andere-saeule',
  },
  'daten-bild-legende': {
    'daten.bilddiagramm': 'bild-legende bild-legende-rueck bild-zahl',
  },
  'daten-achse-schritt': {
    'daten.saeulen': 'achse-schritt',
  },
  'daten-kombi-addiert': {
    'daten.kombinieren': 'kombi-addiert',
  },
  'daten-kombi-reihe': {
    'daten.kombinieren': 'kombi-reihe kombi-rest',
  },
  'daten-kombi-dazu': {
    'daten.kombinieren': 'kombi-dazu',
  },
  'daten-reihenfolge': {
    'daten.kombinieren': 'reihenfolge-kinder reihenfolge-mal reihenfolge-rest',
  },
};

export default families;
