/**
 * Phrases of the misconception families of the topic 'plusminus':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'plusminus-eins-daneben': { phrase: { object: 'das Ergebnis', participle: 'genau getroffen' } },
  'plusminus-zehner-vergessen': { phrase: { object: 'den Zehner beim Rechnen', participle: 'mitgedacht' } },
  'plusminus-buendeln': { phrase: { object: '10 Einer', participle: 'zu einem Zehner gebündelt' } },
  'plusminus-kleiner-von-groesser': { phrase: { object: 'die Einer', participle: 'richtig abgezogen' } },
  'plusminus-ausgleich': { phrase: { object: 'die Hilfsaufgabe', participle: 'richtig ausgeglichen' } },
  'plusminus-stellen': { phrase: { object: 'Zehner und Einer', participle: 'auseinandergehalten' } },
  'plusminus-grosse-aufgabe': { phrase: { object: 'die große Aufgabe', participle: 'zu Ende gerechnet' } },
  'plusminus-muster': { phrase: { object: 'das Muster', participle: 'richtig fortgesetzt' } },
  'plusminus-rechenart': { phrase: { object: 'das Rechenzeichen', participle: 'richtig beachtet' } },
  'plusminus-luecke': { phrase: { object: 'die Lücke in der Aufgabe', participle: 'richtig gefüllt' } },
  'plusminus-bis-zehner': { phrase: { object: 'den Weg bis zum Zehner', participle: 'richtig ergänzt' } },
  'plusminus-bis-hundert': { phrase: { object: 'den Weg bis 100', participle: 'richtig ergänzt' } },
  'plusminus-zehner-richtung': { phrase: { object: 'den nächsten Zehner', participle: 'richtig gefunden' } },
  'plusminus-zerlegen': { phrase: { object: 'die zweite Zahl', participle: 'richtig zerlegt' } },
  'plusminus-mauer': { phrase: { object: 'die Steine direkt darunter', participle: 'plus gerechnet' } },
  'plusminus-gleichheit': { phrase: { object: 'beide Seiten', participle: 'gleich groß gemacht' } },
  'plusminus-familie': { phrase: { object: 'die Aufgaben in der Familie', participle: 'richtig zugeordnet' } },
  'plusminus-doppelt-haelfte': { phrase: { object: 'Doppeltes und Hälfte', participle: 'auseinandergehalten' } },
  'plusminus-halbieren-zehner': { phrase: { object: 'ungerade Zehner', participle: 'richtig halbiert' } },
  'plusminus-fast-doppelt': { phrase: { object: 'die Nachbarzahlen', participle: 'richtig verdoppelt' } },
};

export default phrases;
