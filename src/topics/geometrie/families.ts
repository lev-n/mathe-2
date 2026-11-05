/**
 * Misconception families of the topic 'geometrie'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 * Choice answers have no Bug ids: `lage-der-figur` and `verschoben-statt-gespiegelt` (docs/research.md §5) are whyWrong texts of
 * their options, so they have no family here. `quadrat-rechteck` is one too, except where a number is typed (geometrie-quadrat-rechteck).
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'geometrie-ecken-zusammen': {
    'geometrie.formen': 'nur-eine-figur figuren-gezaehlt',
  },
  'geometrie-kreis-ohne-ecken': {
    'geometrie.formen': 'kreis-ecke',
  },
  'geometrie-quadrat-rechteck': {
    'geometrie.formen': 'quadrat-vergessen',
  },
  'geometrie-verdeckte-teile': {
    'geometrie.koerper': 'kanten-verdeckt ecken-verdeckt flaechen-verdeckt',
  },
  'geometrie-ecke-kante-flaeche': {
    'geometrie.koerper': 'teil-verwechselt nur-ein-koerper',
  },
  'geometrie-nur-verdeckte': {
    'geometrie.koerper': 'alle-statt-verdeckt sichtbar-statt-verdeckt',
  },
  'geometrie-verdeckte-wuerfel': {
    'geometrie.wuerfelgebaeude': 'wuerfel-verdeckt nur-vordere-reihe',
  },
  'geometrie-tuerme-und-wuerfel': {
    'geometrie.wuerfelgebaeude': 'nur-tuerme felder-gezaehlt alle-gezaehlt',
  },
  'geometrie-flaeche-und-rand': {
    'geometrie.flaechen': 'rand-statt-flaeche flaeche-statt-rand',
  },
  'geometrie-alle-seiten': {
    'geometrie.flaechen': 'breite-plus-hoehe randkaestchen alle-kaestchen rand-alt',
  },
};

export default families;
