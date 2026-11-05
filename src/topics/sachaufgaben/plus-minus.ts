/**
 * Geschichten mit einer Rechnung, plus oder minus. The Stufe chooses the content (docs/research.md §6), the AB level the demand inside it:
 * Stufe 1, result unknown, ≤ 20. AB I: within a ten. AB II: over the ten. AB III: over the ten, the story names the start second.
 * Stufe 2, result unknown, ≤ 100, crossing a ten. AB I: a one-digit number. AB II: two two-digit numbers. AB III: two-digit, the story
 * names the start second.
 * Stufe 3, start or change unknown, ≤ 100, where a word of the story can point to the wrong operation (T13). AB I: the change, one-digit,
 * or the start after something went away. AB II: the change, two-digit, or the start with a one-digit change. AB III: the start, two-digit.
 * On every Stufe no word predicts the operation (T13): 'jetzt' and 'zusammen' come with plus and with minus, and no question asks with 'noch'.
 * The Rechenstrich is part of the worked steps, as it would show the result.
 */
import { MINUS } from '../../core/format';
import type { Ab, Rng, SkillDef, Stufe } from '../../core/types';
import { build, bugList, pickPerson, safeHints, targetAb } from '../shared';
import {
  HINT_RECHENART,
  HINT_ZUSAMMEN,
  answerLine,
  calcStep,
  crossingDifference,
  crossingDifferenceOnes,
  crossingDifferenceTo20,
  crossingSum,
  crossingSumOnes,
  crossingSumTo20,
  hintsWithoutAnswer,
  kleinerVonGroesser,
  plainDifferenceTo20,
  plainSumTo20,
  sentenceAnswer,
  spokenTask,
  zehnerVergessen,
} from './helpers';

interface Text {
  context: string;
  question: string;
  before: string;
  after: string;
  /** For a story where nothing comes or goes: says what is asked, instead of the change. */
  relation?: string;
}

type Maker = (name: string, a: number, b: number) => Text;

/** everyday: losing marbles or eating biscuits, which fits small numbers only (EVERYDAY_START, EVERYDAY_AWAY). */
type Story = readonly [id: string, make: Maker, everyday?: boolean];

const EVERYDAY_START = 50;
const EVERYDAY_AWAY = 19;

const PLUS_STORIES: readonly Story[] = [
  ['sticker', (n, a, b) => ({ context: `${n} hat ${a} Sticker. ${n} bekommt ${b} Sticker dazu.`, question: `Wie viele Sticker hat ${n} jetzt?`, before: `${n} hat jetzt`, after: 'Sticker.' })],
  ['schulhof', (_, a, b) => ({ context: `Auf dem Schulhof spielen ${a} Kinder. Dann kommen ${b} Kinder dazu.`, question: 'Wie viele Kinder spielen jetzt dort?', before: 'Jetzt spielen dort', after: 'Kinder.' })],
  ['huehner', (_, a, b) => ({ context: `Auf dem Hof leben ${a} Hühner. Dann kommen ${b} junge Hühner dazu.`, question: 'Wie viele Hühner leben jetzt dort?', before: 'Jetzt leben dort', after: 'Hühner.' })],
  ['kastanien', (n, a, b) => ({ context: `Die Klasse sammelt ${a} Kastanien. ${n} bringt ${b} Kastanien.`, question: 'Wie viele Kastanien hat die Klasse jetzt?', before: 'Die Klasse hat jetzt', after: 'Kastanien.' })],
  ['buecher', (_, a, b) => ({ context: `Im Regal stehen ${a} Bücher. In der Kiste liegen ${b} Bücher.`, question: 'Wie viele Bücher sind das zusammen?', before: 'Das sind zusammen', after: 'Bücher.', relation: HINT_ZUSAMMEN })],
];

const MINUS_STORIES: readonly Story[] = [
  ['murmeln', (n, a, b) => ({ context: `${n} hat ${a} Murmeln. ${n} verliert ${b} Murmeln in der Pause.`, question: `Wie viele Murmeln hat ${n} jetzt?`, before: `${n} hat jetzt`, after: 'Murmeln.' }), true],
  ['schulhof', (_, a, b) => ({ context: `Auf dem Schulhof spielen ${a} Kinder. Dann gehen ${b} Kinder in die Klasse.`, question: 'Wie viele Kinder spielen jetzt dort?', before: 'Jetzt spielen dort', after: 'Kinder.' })],
  ['kekse', (_, a, b) => ({ context: `In der Dose sind ${a} Kekse. Die Kinder essen ${b} Kekse.`, question: 'Wie viele Kekse sind jetzt in der Dose?', before: 'In der Dose sind jetzt', after: 'Kekse.' }), true],
  ['perlen', (n, a, b) => ({ context: `Im Glas sind ${a} Perlen. ${n} nimmt ${b} Perlen heraus.`, question: 'Wie viele Perlen sind jetzt im Glas?', before: 'Im Glas sind jetzt', after: 'Perlen.' })],
  ['fest', (_, a, b) => ({ context: `Beim Fest hängen ${a} Luftballons. ${b} Luftballons platzen.`, question: 'Wie viele Luftballons hängen jetzt dort?', before: 'Jetzt hängen dort', after: 'Luftballons.' })],
  ['bus', (_, a, b) => ({ context: `Im Bus sitzen ${a} Kinder. Dann steigen ${b} Kinder aus.`, question: 'Wie viele Kinder fahren zusammen weiter?', before: 'Zusammen fahren', after: 'Kinder weiter.' })],
  ['ausflug', (_, a, b) => ({ context: `Beim Ausflug sind ${a} Kinder dabei. Dann gehen ${b} Kinder heim.`, question: 'Wie viele Kinder laufen zusammen weiter?', before: 'Zusammen laufen', after: 'Kinder weiter.' })],
];

/** AB III on Stufe 1 and 2: the result is asked, and the story names the start second. */
const LATE_PLUS: readonly Story[] = [
  ['sticker-spaeter', (n, a, b) => ({ context: `${n} bekommt ${b} Sticker dazu. Vorher hat ${n} ${a} Sticker.`, question: `Wie viele Sticker hat ${n} jetzt?`, before: `${n} hat jetzt`, after: 'Sticker.' })],
  ['schulhof-spaeter', (_, a, b) => ({ context: `In der Pause kommen ${b} Kinder auf den Hof. Vorher spielen dort ${a} Kinder.`, question: 'Wie viele Kinder spielen jetzt dort?', before: 'Jetzt spielen dort', after: 'Kinder.' })],
  ['huehner-spaeter', (_, a, b) => ({ context: `Auf den Hof kommen ${b} junge Hühner. Vorher leben dort ${a} Hühner.`, question: 'Wie viele Hühner leben jetzt dort?', before: 'Jetzt leben dort', after: 'Hühner.' })],
];

const LATE_MINUS: readonly Story[] = [
  ['murmeln-spaeter', (n, a, b) => ({ context: `${n} verliert ${b} Murmeln. Vorher hat ${n} ${a} Murmeln.`, question: `Wie viele Murmeln hat ${n} jetzt?`, before: `${n} hat jetzt`, after: 'Murmeln.' }), true],
  ['kekse-spaeter', (_, a, b) => ({ context: `Die Kinder essen ${b} Kekse. Vorher sind ${a} Kekse in der Dose.`, question: 'Wie viele Kekse sind jetzt in der Dose?', before: 'In der Dose sind jetzt', after: 'Kekse.' }), true],
  ['perlen-spaeter', (n, a, b) => ({ context: `${n} nimmt ${b} Perlen aus dem Glas. Vorher sind ${a} Perlen im Glas.`, question: 'Wie viele Perlen sind jetzt im Glas?', before: 'Im Glas sind jetzt', after: 'Perlen.' })],
  ['fest-spaeter', (_, a, b) => ({ context: `Beim Fest platzen ${b} Luftballons. Vorher hängen dort ${a} Luftballons.`, question: 'Wie viele Luftballons hängen jetzt dort?', before: 'Jetzt hängen dort', after: 'Luftballons.' })],
];

/** AB III: a story with a hidden start or change. `start` and `delta` are the calculation that finds the answer. */
interface HiddenStory extends Text {
  id: string;
  start: number;
  delta: number;
  /** The result of the operation a word suggests. */
  trap: number;
  situation: string;
  hint: string;
  /**
   * The second hint and the hint for `trap`, without numbers. Each story has its own, as HINT_SIGNALWORT does not work here: the
   * true answer to 'Wird es mehr oder weniger?' points to the operation of `trap`.
   */
  wordHint: string;
}

const HIDDEN_CHANGE = ['dazu-wieviel', 'fehlt-mehr', 'weg-wieviel'];
const HIDDEN_START_UP = ['start-dazu', 'start-hof'];
const HIDDEN_START_DOWN = ['start-weg', 'start-kiste'];
const HIDDEN_START = [...HIDDEN_START_UP, ...HIDDEN_START_DOWN];

function hiddenStory(rng: Rng, n: string, ab: Ab): HiddenStory {
  // AB II: some items keep the two-digit change, the others hide the start behind a one-digit change
  const startForm = ab === 2 && rng.chance(0.6);
  const [low, change] = ab === 1 || startForm ? crossingSumOnes(rng) : crossingSum(rng, 1);
  // A hidden change is always found by minus, a start after something went away by plus: every AB has both, so the Stufe does not give the operation away.
  const ids = ab === 3 || startForm ? HIDDEN_START : ab === 1 ? [...HIDDEN_CHANGE, ...HIDDEN_START_DOWN] : HIDDEN_CHANGE;
  const high = low + change;
  const stories: HiddenStory[] = [
    {
      id: 'dazu-wieviel', context: `${n} hat ${low} Sticker. Am Abend hat ${n} ${high} Sticker.`, question: 'Wie viele Sticker kommen dazu?',
      before: 'Es kommen', after: 'Sticker dazu.', start: high, delta: -low, trap: low + high,
      situation: `Von ${low} bis ${high} Stickern fehlt ein Stück.`, hint: `Wie weit ist es von ${low} bis ${high}?`,
      wordHint: 'Am Abend sind die neuen Sticker schon dabei. Wie viele sind neu?',
    },
    {
      id: 'fehlt-mehr', context: `${n} hat ${low} Sticker. ${n} möchte ${high} Sticker haben.`, question: `Wie viele Sticker braucht ${n} noch mehr?`,
      before: `${n} braucht noch`, after: 'Sticker mehr.', start: high, delta: -low, trap: low + high,
      situation: `Von ${low} bis ${high} Stickern fehlt ein Stück.`, hint: `Wie weit ist es von ${low} bis ${high}?`,
      wordHint: 'Die große Zahl ist das Ziel. Wie weit ist es bis dahin?',
    },
    {
      id: 'weg-wieviel', context: `Auf dem Schulhof spielen ${high} Kinder. Am Ende der Pause spielen dort ${low} Kinder.`, question: 'Wie viele Kinder gehen weg?',
      before: 'Es gehen', after: 'Kinder weg.', start: high, delta: -low, trap: low + high,
      situation: `Von ${high} Kindern bleiben ${low} Kinder dort.`, hint: 'Auf dem Hof sind es jetzt weniger. Wie viele Kinder fehlen?',
      wordHint: 'Wie weit ist es von der kleinen bis zur großen Zahl?',
    },
    {
      id: 'start-dazu', context: `${n} bekommt ${change} Sticker dazu. Jetzt hat ${n} ${high} Sticker.`, question: `Wie viele Sticker hat ${n} am Anfang?`,
      before: 'Am Anfang sind es', after: 'Sticker.', start: high, delta: -change, trap: high + change,
      situation: 'Am Anfang sind es weniger Sticker als jetzt.', hint: 'Am Anfang sind es weniger. Nimm die neuen Sticker wieder weg.',
      wordHint: 'Jetzt sind die neuen Sticker schon dabei. Am Anfang noch nicht.',
    },
    {
      id: 'start-hof', context: `Auf den Schulhof kommen ${change} Kinder. Jetzt spielen dort ${high} Kinder.`, question: 'Wie viele Kinder spielen am Anfang dort?',
      before: 'Am Anfang spielen dort', after: 'Kinder.', start: high, delta: -change, trap: high + change,
      situation: 'Am Anfang spielen weniger Kinder dort als jetzt.', hint: 'Am Anfang sind es weniger. Nimm die neuen Kinder wieder weg.',
      wordHint: 'Jetzt sind die neuen Kinder schon dabei. Am Anfang noch nicht.',
    },
    {
      id: 'start-weg', context: `${n} verschenkt ${change} Murmeln. Jetzt hat ${n} noch ${low} Murmeln.`, question: `Wie viele Murmeln hat ${n} am Anfang?`,
      before: 'Am Anfang sind es', after: 'Murmeln.', start: low, delta: change, trap: Math.abs(low - change),
      situation: 'Am Anfang sind es mehr Murmeln als jetzt.', hint: 'Am Anfang sind es mehr. Lege die Murmeln wieder dazu.',
      wordHint: 'Jetzt sind die verschenkten Murmeln schon weg. Am Anfang noch nicht.',
    },
    {
      id: 'start-kiste', context: `Die Kinder nehmen ${change} Äpfel. Jetzt sind noch ${low} Äpfel in der Kiste.`, question: 'Wie viele Äpfel sind am Anfang dort?',
      before: 'Am Anfang sind es', after: 'Äpfel.', start: low, delta: change, trap: Math.abs(low - change),
      situation: 'Am Anfang sind es mehr Äpfel als jetzt.', hint: 'Am Anfang sind es mehr. Lege die Äpfel wieder dazu.',
      wordHint: 'Jetzt sind die Äpfel der Kinder schon weg. Am Anfang noch nicht.',
    },
  ];
  return rng.pick(stories.filter((st) => ids.includes(st.id)));
}

/** The numbers of a story with the result unknown. */
function resultNumbers(rng: Rng, stufe: Stufe, ab: Ab, plus: boolean): [number, number] {
  if (stufe === 1) {
    if (ab === 1) return plus ? plainSumTo20(rng) : plainDifferenceTo20(rng);
    return plus ? crossingSumTo20(rng) : crossingDifferenceTo20(rng);
  }
  if (ab === 1) return plus ? crossingSumOnes(rng) : crossingDifferenceOnes(rng);
  return plus ? crossingSum(rng, 1) : crossingDifference(rng, 1);
}

const KMK = ['ZO.sachrechnen', 'ZO.operationen', 'PK.modellieren'];

export const plusMinusSkill: SkillDef = {
  id: 'sachaufgaben.plus-minus',
  topicId: 'sachaufgaben',
  title: 'Geschichten: Plus und Minus',
  description: 'Du löst Geschichten mit einer Rechnung.',
  stufen: {
    1: 'Geschichten mit Zahlen bis 20',
    2: 'Geschichten bis 100, auch über den Zehner',
    3: 'Der Anfang oder die Änderung fehlt',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const n = pickPerson(rng).name;

    if (stufe === 3) {
      const st = hiddenStory(rng, n, ab);
      const value = st.start + st.delta;
      return build(plusMinusSkill, stufe, {
        key: `${st.id}:${st.start}:${st.delta}`,
        ab,
        context: st.context,
        prompt: st.question,
        answer: sentenceAnswer(value, st.before, st.after, st.question),
        hints: safeHints([st.hint, st.wordHint], value, st.wordHint),
        steps: [st.situation, calcStep(st.start, st.delta), answerLine(st.before, value, st.after)],
        bugs: bugList(value, [['signalwort', st.trap, st.wordHint]]),
        praise: 'Du hast dir die Geschichte genau vorgestellt.',
        srText: spokenTask(st.context, st.question),
        kmk: KMK,
      });
    }

    const plus = rng.chance(0.5);
    const [a, b] = resultNumbers(rng, stufe, ab, plus);
    const value = plus ? a + b : a - b;
    const late = ab === 3;
    const stories = late ? (plus ? LATE_PLUS : LATE_MINUS) : plus ? PLUS_STORIES : MINUS_STORIES;
    const [id, make] = rng.pick(stories.filter(([, , everyday]) => !everyday || (a <= EVERYDAY_START && b <= EVERYDAY_AWAY)));
    const st = make(n, a, b);
    const operationHint = st.relation ?? HINT_RECHENART;
    const crossing = plus ? a % 10 + b % 10 > 10 : a % 10 > 0 && a % 10 < b % 10;
    const howToCount = crossing ? 'Rechne erst bis zum nächsten Zehner, dann weiter.' : `Rechne von ${a} aus ${b} ${plus ? 'weiter' : 'zurück'}.`;
    return build(plusMinusSkill, stufe, {
      key: `${id}:${a}:${plus ? '+' : MINUS}:${b}`,
      ab,
      context: st.context,
      prompt: st.question,
      answer: sentenceAnswer(value, st.before, st.after, st.question),
      hints: hintsWithoutAnswer([late ? 'Was passiert zuerst? Beginne mit dieser Zahl.' : operationHint, howToCount], value, operationHint),
      steps: [st.relation ?? (plus ? 'In der Geschichte kommt etwas dazu.' : 'In der Geschichte geht etwas weg.'), calcStep(a, plus ? b : -b), answerLine(st.before, value, st.after)],
      bugs: bugList(value, [
        ['plus-minus-getauscht', plus ? a - b : a + b, operationHint],
        ...(crossing ? [plus ? zehnerVergessen(a, b) : kleinerVonGroesser(a, b)] : []),
      ]),
      praise: late ? 'Du hast zuerst den Anfang gesucht.' : crossing ? 'Du hast an den Zehner gedacht.' : 'Du hast die passende Rechnung gefunden.',
      srText: spokenTask(st.context, st.question),
      kmk: KMK,
    });
  },
};
