/**
 * Phrases of the misconception families of the topic 'sachaufgaben':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'sachaufgaben-rechenart': { phrase: { object: 'die passende Rechnung zur Geschichte', participle: 'gefunden' } },
  'sachaufgaben-signalwort': { phrase: { object: 'die ganze Geschichte statt nur ein Wort', participle: 'beachtet' } },
  'sachaufgaben-passende-zahlen': { phrase: { object: 'nur die Zahlen zur Frage', participle: 'benutzt' } },
  'sachaufgaben-unterschied': { phrase: { object: 'den Unterschied zwischen 2 Zahlen', participle: 'richtig gelesen' } },
  'sachaufgaben-zehner': { phrase: { object: 'den Zehner in der Geschichte', participle: 'richtig gerechnet' } },
  'sachaufgaben-bild-wert': { phrase: { object: 'den Wert der Bilder und Münzen', participle: 'richtig gezählt' } },
  'sachaufgaben-gruppen': { phrase: { object: 'die gleich großen Gruppen', participle: 'richtig gerechnet' } },
  'sachaufgaben-rest': { phrase: { object: 'den Rest in der Geschichte', participle: 'richtig gedeutet' } },
  'sachaufgaben-rueckgeld': { phrase: { object: 'das Rückgeld', participle: 'richtig gefunden' } },
  'sachaufgaben-einheiten': { phrase: { object: 'die Einheiten', participle: 'richtig umgerechnet' } },
  'sachaufgaben-zeitspanne': { phrase: { object: 'die Frage nach Wann oder Wie lange', participle: 'richtig beantwortet' } },
  'sachaufgaben-nachmittag': { phrase: { object: 'nach 12 Uhr', participle: 'richtig gezählt' } },
  'sachaufgaben-beide-schritte': { phrase: { object: 'beide Schritte bis zum Ende', participle: 'gerechnet' } },
};

export default phrases;
