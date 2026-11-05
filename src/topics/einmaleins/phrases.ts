/**
 * Phrases of the misconception families of the topic 'einmaleins':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'einmaleins-mal-als-plus': { phrase: { object: 'Malaufgaben', participle: 'als gleich große Gruppen gerechnet' } },
  'einmaleins-gruppen': { phrase: { object: 'alle Gruppen', participle: 'mitgerechnet' } },
  'einmaleins-bild-lesen': { phrase: { object: 'die Zahlen der Malaufgabe', participle: 'im Bild gefunden' } },
  'einmaleins-tausch': { phrase: { object: 'die Tauschaufgabe', participle: 'richtig ergänzt' } },
  'einmaleins-mal-zehn': { phrase: { object: 'mal 10', participle: 'in Zehnern gerechnet' } },
  'einmaleins-mal-eins': { phrase: { object: 'mal 1', participle: 'richtig gerechnet' } },
  'einmaleins-mal-null': { phrase: { object: 'mal 0', participle: 'richtig gerechnet' } },
  'einmaleins-verdoppeln': { phrase: { object: 'mal 2', participle: 'als Verdoppeln gerechnet' } },
  'einmaleins-doppelte-nutzen': { phrase: { object: 'das Doppelte', participle: 'richtig genutzt' } },
  'einmaleins-haelfte': { phrase: { object: 'die Hälfte von mal 10', participle: 'genutzt' } },
  'einmaleins-nachbar': { phrase: { object: 'die Nachbaraufgabe', participle: 'richtig genutzt' } },
  'einmaleins-luecke': { phrase: { object: 'die Lücke mit einer Malaufgabe', participle: 'gefunden' } },
  'einmaleins-quadrat': { phrase: { object: 'die Zahl mal sich selbst', participle: 'gerechnet' } },
  'einmaleins-zerlegen': { phrase: { object: 'beide Teile der Aufgabe', participle: 'plus gerechnet' } },
  'einmaleins-teilen': { phrase: { object: 'das Teilen', participle: 'als gleich große Gruppen gerechnet' } },
  'einmaleins-umkehren': { phrase: { object: 'die Umkehraufgabe', participle: 'richtig genutzt' } },
  'einmaleins-rest': { phrase: { object: 'den Rest', participle: 'richtig beachtet' } },
  'einmaleins-rest-sache': { phrase: { object: 'den Rest', participle: 'passend zur Geschichte beachtet' } },
};

export default phrases;
