/**
 * Phrases of the misconception families of the topic 'groessen':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'groessen-muenzen-wert': { phrase: { object: 'den Wert von Münzen', participle: 'zusammengezählt' } },
  'groessen-euro-cent-getrennt': { phrase: { object: 'Euro und Cent', participle: 'getrennt gezählt' } },
  'groessen-cent-euro': { phrase: { object: 'Cent und Euro', participle: 'richtig verglichen' } },
  'groessen-wenige-stuecke': { phrase: { object: 'den größten Wert', participle: 'zuerst genommen' } },
  'groessen-rueckgeld': { phrase: { object: 'den Betrag vom Preis bis zum Geld', participle: 'richtig ausgerechnet' } },
  'groessen-rechenart': { phrase: { object: 'beim Einkaufen die Rechenart', participle: 'richtig gewählt' } },
  'groessen-lineal-anfang': { phrase: { object: 'das Lineal ab der 0', participle: 'richtig gelesen' } },
  'groessen-lineal-ende': { phrase: { object: 'den Streifen vom Anfang bis zum Ende', participle: 'gemessen' } },
  'groessen-laenge-unterschied': { phrase: { object: 'den Unterschied von 2 Längen', participle: 'richtig ausgerechnet' } },
  'groessen-meter-zentimeter': { phrase: { object: 'Meter und Zentimeter', participle: 'richtig umgewandelt' } },
  'groessen-halb': { phrase: { object: 'bei „halb“ an die nächste Stunde', participle: 'gedacht' } },
  'groessen-zeiger': { phrase: { object: 'den kurzen und den langen Zeiger', participle: 'richtig gelesen' } },
  'groessen-viertel': { phrase: { object: 'Viertel vor und Viertel nach', participle: 'richtig unterschieden' } },
  'groessen-minuten-zahl': { phrase: { object: 'die Minuten am langen Zeiger', participle: 'richtig gelesen' } },
  'groessen-kurzer-zeiger': { phrase: { object: 'die Stunde am kurzen Zeiger', participle: 'richtig gelesen' } },
  'groessen-sechzig-minuten': { phrase: { object: 'an die 60 Minuten', participle: 'gedacht' } },
  'groessen-zeitspanne': { phrase: { object: 'die Dauer', participle: 'richtig ausgerechnet' } },
  'groessen-zeit-richtung': { phrase: { object: 'die Zeit in die richtige Richtung', participle: 'gerechnet' } },
  'groessen-sieben-tage': { phrase: { object: 'an alle 7 Tage', participle: 'gedacht' } },
  'groessen-tage-rechnen': { phrase: { object: 'die Tage ab morgen', participle: 'richtig gerechnet' } },
};

export default phrases;
