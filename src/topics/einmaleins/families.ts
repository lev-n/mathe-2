/**
 * Misconception families of the topic 'einmaleins'. Family id → skill id → space-separated bug keys (src/topics/errorFamilies.ts).
 * Family ids are unique across all topics and are stored in the progress: never rename one once released. Each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'einmaleins-mal-als-plus': {
    'einmaleins.mal-verstehen': 'mal-als-plus',
    'einmaleins.tausch': 'mal-als-plus',
    'einmaleins.mal-1-2-10': 'mal-als-plus',
    'einmaleins.mal-5': 'mal-als-plus',
    'einmaleins.einmaleins': 'mal-als-plus',
    'einmaleins.quadrate': 'mal-als-plus',
  },
  'einmaleins-gruppen': {
    'einmaleins.mal-verstehen': 'gruppe-vergessen',
  },
  'einmaleins-bild-lesen': {
    'einmaleins.mal-verstehen': 'ergebnis-statt-anzahl gleiche-zahl',
  },
  'einmaleins-tausch': {
    'einmaleins.tausch': 'gleiche-zahl ergebnis-statt-zahl',
  },
  'einmaleins-mal-zehn': {
    'einmaleins.mal-1-2-10': 'mal-zehn alle-punkte',
    'einmaleins.mal-5': 'mal-zehn',
    'einmaleins.einmaleins': 'mal-zehn',
    'einmaleins.quadrate': 'mal-zehn',
  },
  'einmaleins-mal-eins': {
    'einmaleins.mal-1-2-10': 'mal-eins',
    'einmaleins.mal-5': 'mal-eins',
    'einmaleins.einmaleins': 'mal-eins',
  },
  'einmaleins-mal-null': {
    'einmaleins.mal-1-2-10': 'mal-null',
  },
  'einmaleins-verdoppeln': {
    'einmaleins.mal-1-2-10': 'halbiert-statt-verdoppelt ergebnis-statt-zahl',
    'einmaleins.einmaleins': 'halbiert-statt-verdoppelt',
    'einmaleins.quadrate': 'halbiert-statt-verdoppelt',
  },
  'einmaleins-doppelte-nutzen': {
    'einmaleins.ableiten': 'verdoppeln-vergessen plus-zwei',
  },
  'einmaleins-haelfte': {
    'einmaleins.mal-5': 'haelfte-vergessen',
    'einmaleins.einmaleins': 'haelfte-vergessen',
    'einmaleins.quadrate': 'haelfte-vergessen',
  },
  'einmaleins-nachbar': {
    'einmaleins.mal-1-2-10': 'nachbar-vergessen nachbar-zu-viel',
    'einmaleins.mal-5': 'nachbar-vergessen nachbar-zu-viel',
    'einmaleins.einmaleins': 'nachbar-vergessen nachbar-zu-viel',
    'einmaleins.quadrate': 'nachbar-vergessen nachbar-zu-viel nur-eins falsche-zahl',
    'einmaleins.ableiten': 'nachbar-vergessen nur-eins falsche-zahl',
  },
  'einmaleins-luecke': {
    'einmaleins.mal-1-2-10': 'minus-statt-mal ergebnis-nochmal-mal',
    'einmaleins.mal-5': 'minus-statt-mal ergebnis-nochmal-mal',
    'einmaleins.einmaleins': 'minus-statt-mal ergebnis-nochmal-mal',
  },
  'einmaleins-quadrat': {
    'einmaleins.quadrate': 'halbiert-statt-quadrat',
  },
  'einmaleins-zerlegen': {
    'einmaleins.ableiten': 'nur-ein-teil zweiter-teil-plus',
  },
  'einmaleins-teilen': {
    'einmaleins.einmaleins': 'teilen-als-minus',
    'einmaleins.teilen-verstehen': 'teilen-als-minus teilen-als-mal teilen-als-plus',
    'einmaleins.umkehren': 'teilen-als-minus ergebnis-nochmal-mal',
    'einmaleins.teilen-rest': 'teilen-als-minus',
  },
  'einmaleins-umkehren': {
    'einmaleins.einmaleins': 'umkehr-plus',
    'einmaleins.teilen-verstehen': 'umkehr-plus',
    'einmaleins.umkehren': 'umkehr-plus umkehr-minus gleiche-zahl familie-vertauscht',
  },
  'einmaleins-rest': {
    'einmaleins.teilen-rest': 'rest-zu-gross rest-vergessen',
  },
  'einmaleins-rest-sache': {
    'einmaleins.teilen-rest': 'rest-sache',
  },
};

export default families;
