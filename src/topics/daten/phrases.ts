/**
 * Phrases of the misconception families of the topic 'daten':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'daten-strich-buendel': { phrase: { object: 'die Fünferbündel', participle: 'richtig gezählt' } },
  'daten-mehr-unterschied': { phrase: { object: 'den Unterschied', participle: 'richtig gefunden' } },
  'daten-rechenart': { phrase: { object: 'die Frage nach dem Unterschied', participle: 'richtig gelesen' } },
  'daten-alle-zeilen': { phrase: { object: 'jede Zahl', participle: 'mitgerechnet' } },
  'daten-wert-finden': { phrase: { object: 'den passenden Wert', participle: 'abgelesen' } },
  'daten-bild-legende': { phrase: { object: 'die Legende', participle: 'richtig beachtet' } },
  'daten-achse-schritt': { phrase: { object: 'die Schritte an der Achse', participle: 'richtig beachtet' } },
  'daten-kombi-addiert': { phrase: { object: 'alle Paare', participle: 'richtig gefunden' } },
  'daten-kombi-reihe': { phrase: { object: 'jede Reihe mit Paaren', participle: 'mitgezählt' } },
  'daten-kombi-dazu': { phrase: { object: 'die neuen Paare', participle: 'mitgezählt' } },
  'daten-reihenfolge': { phrase: { object: 'die Reihenfolgen', participle: 'richtig gefunden' } },
};

export default phrases;
