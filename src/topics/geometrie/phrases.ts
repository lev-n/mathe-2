/**
 * Phrases of the misconception families of the topic 'geometrie':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'geometrie-ecken-zusammen': { phrase: { object: 'die Ecken aller Figuren', participle: 'richtig gezählt' } },
  'geometrie-kreis-ohne-ecken': { phrase: { object: 'den Kreis', participle: 'ohne Ecken gezählt' } },
  'geometrie-quadrat-rechteck': { phrase: { object: 'auch das Quadrat als Rechteck', participle: 'mitgezählt' } },
  'geometrie-verdeckte-teile': { phrase: { object: 'auch die verdeckten Teile am Körper', participle: 'mitgezählt' } },
  'geometrie-ecke-kante-flaeche': { phrase: { object: 'Ecken, Kanten und Flächen', participle: 'getrennt gezählt' } },
  'geometrie-nur-verdeckte': { phrase: { object: 'nur die verdeckten Teile', participle: 'gezählt' } },
  'geometrie-verdeckte-wuerfel': { phrase: { object: 'auch die Würfel hinten und unten', participle: 'mitgezählt' } },
  'geometrie-tuerme-und-wuerfel': { phrase: { object: 'Türme, Felder und Würfel', participle: 'getrennt gezählt' } },
  'geometrie-flaeche-und-rand': { phrase: { object: 'Fläche und Rand', participle: 'getrennt gezählt' } },
  'geometrie-alle-seiten': { phrase: { object: 'alle Reihen und Seiten einer Figur', participle: 'beachtet' } },
};

export default phrases;
