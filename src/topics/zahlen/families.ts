/**
 * Misconception families of the topic 'zahlen'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'zahlen-zehnerwechsel': {
    'zahlen.zaehlen': 'zaehlen-zehner',
    'zahlen.nachbarn': 'zaehlen-zehner',
  },
  'zahlen-zaehlrichtung': {
    'zahlen.zaehlen': 'zaehlen-richtung',
  },
  'zahlen-schrittweite': {
    'zahlen.zaehlen': 'schritt-eins',
  },
  'zahlen-volle-reihen': {
    'zahlen.anzahl-erkennen': 'reihe-vergessen reihen-als-einer',
  },
  'zahlen-zahlendreher': {
    'zahlen.zaehlen': 'zahlendreher',
    'zahlen.anzahl-erkennen': 'zahlendreher',
    'zahlen.zahlwort': 'zahlendreher',
    'zahlen.nachbarn': 'zahlendreher',
    'zahlen.zahlenstrahl': 'zahlendreher',
    'zahlen.hundertertafel': 'zahlendreher',
  },
  'zahlen-feld-teil': {
    'zahlen.anzahl-erkennen': 'gesamt-gezaehlt ueber-der-linie leere-mitgezaehlt nur-ein-teil',
  },
  'zahlen-bis-hundert': {
    'zahlen.anzahl-erkennen': 'gefuellt-genannt bis-hundert-zehner',
  },
  'zahlen-fehlende-punkte': {
    'zahlen.anzahl-erkennen': 'gefuellt-bis-zwanzig erste-reihe gefuellt-bis-reihe',
  },
  'zahlen-ze-reihenfolge': {
    'zahlen.zehner-einer': 'z-e-reihenfolge zerlegen-tausch',
  },
  'zahlen-zehnerwert': {
    'zahlen.zehner-einer': 'stuecke-gezaehlt zerlegen-ziffern',
  },
  'zahlen-null-stelle': {
    'zahlen.zehner-einer': 'null-stelle',
  },
  'zahlen-buendeln': {
    'zahlen.zehner-einer': 'buendeln buendel-vergessen',
  },
  'zahlen-zwei-ziffern': {
    'zahlen.zahlwort': 'zahlwort-ziffern',
  },
  'zahlen-vergleich-einer': {
    'zahlen.vergleichen': 'vergleich-einer',
  },
  'zahlen-vergleich-richtung': {
    'zahlen.vergleichen': 'vergleich-richtung',
  },
  'zahlen-zwischen': {
    'zahlen.vergleichen': 'zwischen-abstand zwischen-grenzen',
  },
  'zahlen-zahlwort-lesen': {
    'zahlen.zahlwort': 'zahlwort-selbst',
  },
  'zahlen-davor-danach': {
    'zahlen.nachbarn': 'davor-danach',
  },
  'zahlen-nachbar-abstand': {
    'zahlen.nachbarn': 'nachbar-abstand nachbarzahl-statt-zehner',
  },
  'zahlen-raetsel': {
    'zahlen.nachbarn': 'raetsel-nachbar raetsel-richtung',
  },
  'zahlen-strahl-null': {
    'zahlen.zahlenstrahl': 'strahl-null',
  },
  'zahlen-strahl-schritt': {
    'zahlen.zahlenstrahl': 'strahl-striche strahl-schritt',
  },
  'zahlen-strahl-abschnitt': {
    'zahlen.zahlenstrahl': 'strahl-einer strahl-von-rechts',
  },
  'zahlen-tafel-nachbar': {
    'zahlen.hundertertafel': 'tafel-nachbar tafel-spalte',
  },
  'zahlen-tafel-zeile': {
    'zahlen.hundertertafel': 'tafel-zeile tafel-richtung',
  },
  'zahlen-tafel-fehler': {
    'zahlen.hundertertafel': 'tafel-tausch',
  },
  'zahlen-paare': {
    'zahlen.gerade-ungerade': 'paare-punkte paare-allein',
  },
};

export default families;
