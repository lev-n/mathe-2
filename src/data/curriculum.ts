/**
 * Curriculum tags for Klasse 2 (docs/research.md §2). The KMK Bildungsstandards (i. d. F. vom 23.06.2022) describe the end of
 * Jahrgangsstufe 4 and set no Klasse-2 waypoint: they give the Leitideen and the process competences as a frame, while the scope
 * comes from the Länder curricula. Tags are paraphrased content foci in that frame.
 *
 * Every generator references the tag ids and the shared tests check them (isKmkTag): never rename or remove an id.
 */
import type { TopicId } from '../core/types';

export type Leitidee =
  | 'Zahl und Operation'
  | 'Raum und Form'
  | 'Muster, Strukturen und funktionaler Zusammenhang'
  | 'Größen und Messen'
  | 'Daten und Zufall';

export interface KmkTag {
  leitidee: Leitidee | 'Prozessbezogene Kompetenz';
  text: string;
}

export const KMK_TAGS = {
  'ZO.zahlraum': { leitidee: 'Zahl und Operation', text: 'Zahlen bis 100 darstellen, ordnen und vergleichen; im Zahlenraum orientieren (Zahlenstrahl, Hundertertafel, Nachbarzahlen)' },
  'ZO.stellenwert': { leitidee: 'Zahl und Operation', text: 'Bündeln und Stellenwerte nutzen: Zehner und Einer' },
  'ZO.grundaufgaben': { leitidee: 'Zahl und Operation', text: 'Einspluseins bis 20 und seine Umkehrungen automatisiert und flexibel beherrschen, auf analoge Aufgaben übertragen' },
  'ZO.kernaufgaben': { leitidee: 'Zahl und Operation', text: 'Kernaufgaben des Einmaleins gedächtnismäßig beherrschen, weitere Aufgaben daraus ableiten' },
  'ZO.operationen': { leitidee: 'Zahl und Operation', text: 'Operationen verstehen: Malnehmen als gleich große Gruppen, Teilen als Aufteilen und Verteilen; Umkehraufgaben' },
  'ZO.strategien': { leitidee: 'Zahl und Operation', text: 'Plus und Minus bis 100 in Schritten und mit Hilfsaufgaben rechnen, auch über den Zehner; Rechenwege geschickt wählen' },
  'ZO.schaetzen': { leitidee: 'Zahl und Operation', text: 'Größenordnungen von Zahlen und Ergebnissen ungefähr einschätzen' },
  'ZO.kontrolle': { leitidee: 'Zahl und Operation', text: 'Ergebnisse mit der Umkehraufgabe prüfen; Rechenfehler finden und berichtigen' },
  'ZO.sachrechnen': { leitidee: 'Zahl und Operation', text: 'Rechenoperationen in einfachen Sachsituationen anwenden; Ergebnisse auf Plausibilität prüfen' },
  'MS.muster': { leitidee: 'Muster, Strukturen und funktionaler Zusammenhang', text: 'Muster und Strukturen erkennen und fortsetzen (Formen, Zahlenfolgen, Aufgabenfamilien, Gleichheit)' },
  'MS.funktional': { leitidee: 'Muster, Strukturen und funktionaler Zusammenhang', text: 'Einfache Zusammenhänge erkennen und nutzen (Anzahl und Preis, Verdoppeln und Halbieren)' },
  'RF.raum': { leitidee: 'Raum und Form', text: 'Sich im Raum orientieren: Lagebegriffe, Wege, Würfelgebäude, Baupläne und Ansichten' },
  'RF.figuren': { leitidee: 'Raum und Form', text: 'Ebene Figuren erkennen und benennen: Quadrat, Rechteck, Dreieck, Kreis' },
  'RF.koerper': { leitidee: 'Raum und Form', text: 'Körper erkennen und beschreiben: Würfel, Quader, Kugel (Bayern: weitere); Ecken, Kanten, Flächen' },
  'RF.symmetrie': { leitidee: 'Raum und Form', text: 'Achsensymmetrie erkennen; in einigen Ländern Figuren zu symmetrischen ergänzen' },
  'RF.flaeche': { leitidee: 'Raum und Form', text: 'Flächen mit Kästchen auslegen und vergleichen, Umfang am Gitter vergleichen (Bayern)' },
  'GM.vorstellung': { leitidee: 'Größen und Messen', text: 'Größenvorstellungen besitzen: Bezugsgrößen wie 1 cm und 1 m, Plausibilität' },
  'GM.einheiten': { leitidee: 'Größen und Messen', text: 'Einheiten kennen und umwandeln, gemischte Schreibweise nutzen, ohne Komma' },
  'GM.geld': { leitidee: 'Größen und Messen', text: 'Euro und Cent: Münzen und Scheine kennen, ordnen, Beträge bestimmen, wechseln, Rückgeld' },
  'GM.laenge': { leitidee: 'Größen und Messen', text: 'Längen in cm und m messen und vergleichen' },
  'GM.zeit': { leitidee: 'Größen und Messen', text: 'Uhrzeiten lesen, Zeitspannen bestimmen, den Kalender nutzen' },
  'GM.sachsituationen': { leitidee: 'Größen und Messen', text: 'Mit Größen in einfachen Sachsituationen rechnen' },
  'DZ.daten': { leitidee: 'Daten und Zufall', text: 'Daten aus Strichlisten, Tabellen und Diagrammen entnehmen und ergänzen' },
  'DZ.kombinatorik': { leitidee: 'Daten und Zufall', text: 'Anzahl von Möglichkeiten durch Probieren und Sortieren bestimmen' },
  'DZ.zufall': { leitidee: 'Daten und Zufall', text: 'Zufallsereignisse mit sicher, möglich, unmöglich beschreiben; in einigen Ländern Chancen vergleichen' },
  'PK.argumentieren': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematisch argumentieren (Aussagen prüfen, begründen)' },
  'PK.modellieren': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematisch modellieren (Sachsituation und Rechnung verbinden)' },
  'PK.problemloesen': { leitidee: 'Prozessbezogene Kompetenz', text: 'Probleme mathematisch lösen (Knobelaufgaben, systematisches Probieren)' },
  'PK.darstellen': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematische Darstellungen verwenden und wechseln' },
} as const satisfies Record<string, KmkTag>;

export type KmkTagId = keyof typeof KMK_TAGS;

export function isKmkTag(id: string): id is KmkTagId {
  return Object.prototype.hasOwnProperty.call(KMK_TAGS, id);
}

/** Where each topic sits in the curricula, for the end of Klasse 2 (shown on the page for parents and teachers). */
export const TOPIC_ALIGNMENT: Record<TopicId, { kmk: Leitidee[]; bayern: string; nrw: string }> = {
  zahlen: {
    kmk: ['Zahl und Operation', 'Muster, Strukturen und funktionaler Zusammenhang'],
    bayern: 'Jgst. 1/2, Lernbereich 1.1: Zahlenraum bis 100, Zehner und Einer, Zahlenstrahl, Hundertertafel',
    nrw: 'Ende der Schuleingangsphase, Zahlverständnis: bis 100 zählen, ordnen, bündeln, Stellenwertschreibweise',
  },
  plusminus: {
    kmk: ['Zahl und Operation'],
    bayern: 'Jgst. 1/2, Lernbereiche 1.1, 1.2: Einspluseins bis 20 automatisiert, Rechnen in Schritten bis 100, Umkehr- und Nachbaraufgaben',
    nrw: 'Ende der Schuleingangsphase, Kopfrechnen und Zahlenrechnen: Einspluseins automatisiert, Plus und Minus bis 100 mündlich oder halbschriftlich',
  },
  einmaleins: {
    kmk: ['Zahl und Operation', 'Muster, Strukturen und funktionaler Zusammenhang'],
    bayern: 'Jgst. 1/2, Lernbereich 1.2: Kernaufgaben mit · 1, · 2, · 5, · 10, Quadrataufgaben und · 0 automatisiert, weitere abgeleitet; Teilen, auch mit Rest',
    nrw: 'Ende der Schuleingangsphase, Operationsverständnis und Kopfrechnen: Kernaufgaben automatisiert, weitere abgeleitet; Aufteilen und Verteilen',
  },
  groessen: {
    kmk: ['Größen und Messen'],
    bayern: 'Jgst. 1/2, Lernbereiche 3.1 bis 3.3: Euro und Cent, Meter und Zentimeter, Uhrzeit und Kalender',
    nrw: 'Ende der Schuleingangsphase, Größen und Messen: ct und €, cm und m, volle, halbe und Viertelstunden, Kalender',
  },
  geometrie: {
    kmk: ['Raum und Form'],
    bayern: 'Jgst. 1/2, Lernbereiche 2.1 bis 2.5: Lage, Figuren, Körper, Achsensymmetrie, Muster, Flächen und Umfang am Gitter',
    nrw: 'Ende der Schuleingangsphase, Raum und Form: Raumorientierung, Rechteck, Quadrat, Dreieck, Kreis, Würfel, Quader, Kugel, Symmetrie erkennen',
  },
  daten: {
    kmk: ['Daten und Zufall'],
    bayern: 'Jgst. 1/2, Lernbereiche 1.3, 4.1, 4.2: Strichlisten, Schaubilder, Tabellen, Möglichkeiten zählen, sicher, möglich, unmöglich',
    nrw: 'Ende der Schuleingangsphase, Daten, Häufigkeiten und Wahrscheinlichkeiten: Diagramme und Tabellen, Anzahl der Möglichkeiten',
  },
  sachaufgaben: {
    kmk: ['Zahl und Operation', 'Größen und Messen'],
    bayern: 'Jgst. 1/2, Lernbereiche 1.3, 3.3: Informationen aus Bildern und einfachen Texten, Rechenoperation und Situation, Plausibilität',
    nrw: 'Ende der Schuleingangsphase, Sachsituationen: Rechengeschichten, Bildsachaufgaben, Skizzen',
  },
};

/** Where the Länder differ at this level, and what the app does about it (docs/research.md §2.3; for the page for adults). */
export const LAENDER_DIFFERENCES: readonly { topic: string; text: string }[] = [
  { topic: 'Quadrataufgaben und mal 0', text: 'Bayern verlangt sie. Die anderen drei gelesenen Pläne nennen sie auf dieser Stufe nicht. Deshalb sind die Quadrataufgaben ein Extra, und mal 0 kommt nur bei eingeschalteten Extras vor.' },
  { topic: 'Teilen mit Rest', text: 'Steht in den Plänen von Bayern und Baden-Württemberg. Deshalb ist es ein Extra.' },
  { topic: 'Körper', text: 'Bayern nennt sieben Körper, NRW und Berlin-Brandenburg drei, Baden-Württemberg zwei. Würfel, Quader und Kugel sind für alle da; die übrigen Körper kommen nur auf Stufe 3 und bei eingeschalteten Extras vor.' },
  { topic: 'Flächen und Umfang', text: 'Bayern schon in Klasse 1/2, NRW erst in Klasse 4. Baden-Württemberg nennt sie in Klasse 1/2 nicht, Berlin-Brandenburg den Umfang erst später. Deshalb sind sie ein Extra.' },
  { topic: 'Spiegelbilder ergänzen', text: 'Bayern und Berlin-Brandenburg auf dieser Stufe, NRW erst in Klasse 4. Das Erkennen von Symmetrie gilt überall; das Ergänzen kommt nur auf Stufe 3 und bei eingeschalteten Extras vor.' },
  { topic: 'Wahrscheinlich und Chancen', text: '„Sicher, möglich, unmöglich“ gilt überall. „Wahrscheinlich“ nennen Bayern und NRW, das Vergleichen von Chancen nur Bayern. Deshalb ist das Vergleichen ein Extra, und „wahrscheinlich“ kommt nur auf Stufe 3 und bei eingeschalteten Extras vor.' },
  { topic: 'Hundertertafel', text: 'Der bayerische Plan nennt sie, der NRW-Plan nicht, auch wenn sie dort im Unterricht verbreitet ist. Deshalb ist sie ein Extra.' },
  { topic: 'Gerade und ungerade', text: 'Steht in Bayern, Baden-Württemberg und Berlin-Brandenburg, nicht im NRW-Plan. Deshalb ist es ein Extra.' },
  { topic: 'Sachaufgaben in zwei Schritten', text: 'Die Pläne verlangen einfache Sachaufgaben. Zwei Schritte gehen darüber hinaus, Baden-Württemberg nennt Knobelaufgaben. Deshalb ist es ein Extra.' },
  { topic: 'Verdoppeln und Halbieren', text: 'NRW, Baden-Württemberg und Berlin-Brandenburg nennen es, der bayerische Plan nicht. Es hilft beim Rechnen überall und gehört deshalb zum festen Teil.' },
];
