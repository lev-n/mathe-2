/**
 * Phrases of the misconception families of the topic 'zahlen':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'zahlen-zehnerwechsel': { phrase: { object: 'den Wechsel zum nächsten Zehner', participle: 'richtig geschafft' } },
  'zahlen-zaehlrichtung': { phrase: { object: 'die Zählrichtung', participle: 'richtig beachtet' } },
  'zahlen-schrittweite': { phrase: { object: 'die Größe der Schritte', participle: 'richtig beachtet' } },
  'zahlen-volle-reihen': { phrase: { object: 'volle Reihen als Zehner', participle: 'richtig gezählt' } },
  'zahlen-zahlendreher': { phrase: { object: 'den Zehner vorne und den Einer hinten', participle: 'richtig geschrieben' } },
  'zahlen-feld-teil': { phrase: { object: 'den gefragten Teil des Feldes', participle: 'richtig gefunden' } },
  'zahlen-bis-hundert': { phrase: { object: 'die fehlenden Punkte bis 100', participle: 'richtig gefunden' } },
  'zahlen-fehlende-punkte': { phrase: { object: 'die fehlenden Punkte', participle: 'richtig gefunden' } },
  'zahlen-ze-reihenfolge': { phrase: { object: 'Zehner und Einer', participle: 'an die richtige Stelle geschrieben' } },
  'zahlen-zehnerwert': { phrase: { object: 'einen Zehner als 10', participle: 'richtig gezählt' } },
  'zahlen-null-stelle': { phrase: { object: 'die leere Stelle in einer Zahl', participle: 'richtig beachtet' } },
  'zahlen-buendeln': { phrase: { object: '10 Einer zu einem Zehner', participle: 'richtig gebündelt' } },
  'zahlen-zwei-ziffern': { phrase: { object: 'Zahlwörter mit 2 Ziffern', participle: 'richtig geschrieben' } },
  'zahlen-vergleich-einer': { phrase: { object: 'die Zehner als Erstes', participle: 'verglichen' } },
  'zahlen-vergleich-richtung': { phrase: { object: 'die Reihenfolge beim Ordnen', participle: 'richtig beachtet' } },
  'zahlen-zwischen': { phrase: { object: 'die Zahlen dazwischen', participle: 'richtig gezählt' } },
  'zahlen-zahlwort-lesen': { phrase: { object: 'das Zahlwort', participle: 'richtig gelesen' } },
  'zahlen-davor-danach': { phrase: { object: 'die Zahl davor und danach', participle: 'richtig zugeordnet' } },
  'zahlen-nachbar-abstand': { phrase: { object: 'die passenden Nachbarn einer Zahl', participle: 'richtig gefunden' } },
  'zahlen-raetsel': { phrase: { object: 'die Hinweise im Zahlenrätsel', participle: 'richtig genutzt' } },
  'zahlen-strahl-null': { phrase: { object: 'die Sprünge auf dem Zahlenstrahl', participle: 'richtig gezählt' } },
  'zahlen-strahl-schritt': { phrase: { object: 'die Größe der Sprünge auf dem Zahlenstrahl', participle: 'richtig beachtet' } },
  'zahlen-strahl-abschnitt': { phrase: { object: 'den Anfang des Ausschnitts', participle: 'richtig beachtet' } },
  'zahlen-tafel-nachbar': { phrase: { object: 'die Nachbarn links und rechts', participle: 'richtig gefunden' } },
  'zahlen-tafel-zeile': { phrase: { object: 'die Zeilen der Hundertertafel', participle: 'richtig genutzt' } },
  'zahlen-tafel-fehler': { phrase: { object: 'die passende Zahl im Ausschnitt', participle: 'richtig gefunden' } },
  'zahlen-paare': { phrase: { object: 'die Punkte in Paaren', participle: 'richtig gezählt' } },
};

export default phrases;
