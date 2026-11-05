/**
 * Körper. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1, Würfel, Quader, Kugel: AB I name or find, does the name fit, Körper or flat; AB II rolls or tips, everyday things; AB III from the thing to the form, riddles.
 * Stufe 2, Ecken, Kanten, Flächen of Würfel and Quader: AB I how many, the form of a Fläche; AB II two parts together, the Kugel; AB III reversed
 * (12 of what?), riddles with numbers, the rest of the Flächen.
 * Stufe 3, Zylinder, Kegel, Pyramide, Prisma with extras on (the Länder differ, adult page "Körper"): AB I name or find; AB II how many,
 * by a clue; AB III statements, riddles, compare, hidden parts. With extras off, and now and then with extras on: hidden parts and statements on
 * Würfel and Quader, which is harder than counting all parts: AB I how many hidden; AB II two bodies, two kinds of hidden parts; AB III
 * statements, which sentence, how many visible.
 * In the drawing a child sees 9 Kanten, 7 Ecken and 3 Flächen of a Würfel or Quader; the rest is hidden (SolidVisual): the bugs.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import type { Ab, ChoiceOption, Rng, SkillDef, SolidKind, Stufe, Visual } from '../../core/types';
import { bugList, makeChoice, targetAb } from '../shared';
import { cap, finish, pictureChoice, pictureStep, rightPicture, twoWay, type Task, type WrongPicture } from './helpers';

const META = { id: 'geometrie.koerper', topicId: 'geometrie' } as const;

const solid = (s: SolidKind): Visual => ({ type: 'solid', solid: s });
const NAME: Record<SolidKind, string> = { wuerfel: 'Würfel', quader: 'Quader', kugel: 'Kugel', zylinder: 'Zylinder', kegel: 'Kegel', pyramide: 'Pyramide', prisma: 'Prisma' };
const NOM: Record<SolidKind, string> = { wuerfel: 'dieser Würfel', quader: 'dieser Quader', kugel: 'diese Kugel', zylinder: 'dieser Zylinder', kegel: 'dieser Kegel', pyramide: 'diese Pyramide', prisma: 'dieses Prisma' };

const shuffled = (rng: Rng, stufe: Stufe, right: string, wrong: ChoiceOption[]) =>
  makeChoice(rng, { label: right }, rng.shuffle(wrong), { max: MAX_CHOICE_OPTIONS[stufe] });

const FLAT = 'ist flach. Dieser Körper ist nicht flach.';

/** The wrong names offered for a Körper. Quader is no wrong name for a Würfel (a Würfel is also a Quader). */
const WRONG_NAMES: Record<SolidKind, ChoiceOption[]> = {
  wuerfel: [
    { label: 'Kugel', whyWrong: 'Eine Kugel ist rund. Dieser Körper hat Ecken.' },
    { label: 'Quadrat', whyWrong: `Ein Quadrat ${FLAT}` },
    { label: 'Kreis', whyWrong: `Ein Kreis ${FLAT}` },
  ],
  quader: [
    { label: 'Würfel', whyWrong: 'Bei einem Würfel sind alle Kanten gleich lang. Schau auf die Kanten.' },
    { label: 'Kugel', whyWrong: 'Eine Kugel ist rund. Dieser Körper hat Ecken.' },
    { label: 'Rechteck', whyWrong: `Ein Rechteck ${FLAT}` },
  ],
  kugel: [
    { label: 'Kreis', whyWrong: `Ein Kreis ${FLAT}` },
    { label: 'Würfel', whyWrong: 'Ein Würfel hat Ecken. Dieser Körper ist überall rund.' },
    { label: 'Quader', whyWrong: 'Ein Quader hat Ecken. Dieser Körper ist überall rund.' },
  ],
  zylinder: [
    { label: 'Kegel', whyWrong: 'Ein Kegel hat oben eine Spitze.' },
    { label: 'Kugel', whyWrong: 'Eine Kugel hat keine flachen Flächen.' },
    { label: 'Pyramide', whyWrong: 'Eine Pyramide hat Ecken und eine Spitze.' },
    { label: 'Quader', whyWrong: 'Ein Quader hat Ecken.' },
    { label: 'Prisma', whyWrong: 'Ein Prisma hat Ecken.' },
  ],
  kegel: [
    { label: 'Pyramide', whyWrong: 'Eine Pyramide hat unten ein Viereck und Ecken.' },
    { label: 'Zylinder', whyWrong: 'Ein Zylinder hat oben und unten einen Kreis.' },
    { label: 'Kugel', whyWrong: 'Eine Kugel hat keine Spitze.' },
    { label: 'Prisma', whyWrong: 'Ein Prisma hat keine runde Fläche.' },
    { label: 'Würfel', whyWrong: 'Ein Würfel hat keine runde Fläche.' },
  ],
  pyramide: [
    { label: 'Kegel', whyWrong: 'Ein Kegel hat unten einen Kreis.' },
    { label: 'Prisma', whyWrong: 'Ein Prisma hat oben keine Spitze.' },
    { label: 'Quader', whyWrong: 'Ein Quader hat oben keine Spitze.' },
    { label: 'Zylinder', whyWrong: 'Ein Zylinder hat runde Flächen.' },
    { label: 'Kugel', whyWrong: 'Eine Kugel hat keine Ecken.' },
  ],
  prisma: [
    { label: 'Pyramide', whyWrong: 'Eine Pyramide hat oben eine Spitze.' },
    { label: 'Quader', whyWrong: 'Ein Quader hat keine Dreiecke als Flächen.' },
    { label: 'Kegel', whyWrong: 'Ein Kegel hat eine runde Fläche.' },
    { label: 'Zylinder', whyWrong: 'Ein Zylinder hat runde Flächen.' },
    { label: 'Würfel', whyWrong: 'Ein Würfel hat keine Dreiecke als Flächen.' },
  ],
};

const SEES: Record<SolidKind, string> = {
  wuerfel: 'Alle Kanten sind gleich lang. Alle Flächen sind Quadrate.',
  quader: 'Der Körper hat Ecken. Manche Kanten sind länger.',
  kugel: 'Der Körper ist überall rund und hat keine Ecken.',
  zylinder: 'Oben und unten ist ein Kreis. Dazwischen ist eine runde Fläche.',
  kegel: 'Unten ist ein Kreis. Oben ist eine Spitze.',
  pyramide: 'Unten ist ein Viereck. Dreiecke treffen sich oben in einer Spitze.',
  prisma: 'Vorne und hinten ist ein Dreieck. Dazwischen sind Rechtecke.',
};

function nennen(rng: Rng, stufe: Stufe, s: SolidKind, keyPart: string): Task {
  const round = s === 'kugel' || s === 'zylinder' || s === 'kegel';
  return {
    key: `${keyPart}:${s}`,
    prompt: 'Wie heißt dieser Körper?',
    visual: solid(s),
    answer: shuffled(rng, stufe, NAME[s], WRONG_NAMES[s]),
    hints: ['Schau auf die Flächen und auf die Ecken.', 'Ist der Körper rund, oder hat der Körper Spitzen?'],
    steps: [SEES[s], `Der Körper heißt ${NAME[s]}.`],
    praise: rng.pick([round ? 'Du hast die runde Form genau angeschaut.' : 'Du hast die Flächen und Ecken genau angeschaut.', 'Du hast den Körper an der Form erkannt.']),
  };
}

const OTHER_SOLIDS: SolidKind[] = ['zylinder', 'kegel', 'pyramide', 'prisma'];

const A_SOLID: Partial<Record<SolidKind, string>> = { wuerfel: 'ein Würfel', quader: 'ein Quader', pyramide: 'eine Pyramide', prisma: 'ein Prisma' };
const THE: Record<SolidKind, string> = { wuerfel: 'der Würfel', quader: 'der Quader', kugel: 'die Kugel', zylinder: 'der Zylinder', kegel: 'der Kegel', pyramide: 'die Pyramide', prisma: 'das Prisma' };

const flat = (shape: 'quadrat' | 'rechteck' | 'kreis', why: string): WrongPicture => ({ visual: { type: 'shape', shape }, whyWrong: why });
const body = (s: SolidKind, why: string): WrongPicture => ({ visual: solid(s), whyWrong: why });

/** The wrong pictures for a named Körper. A Würfel is also a Quader: it is no wrong picture when a Quader is asked for. */
const WRONG_PICTURES: Record<SolidKind, WrongPicture[]> = {
  wuerfel: [body('quader', 'Bei diesem Körper sind manche Kanten länger.'), body('kugel', 'Dieser Körper ist überall rund.'), flat('quadrat', 'Diese Figur ist flach.')],
  quader: [body('kugel', 'Dieser Körper ist überall rund.'), flat('rechteck', 'Diese Figur ist flach.'), flat('kreis', 'Diese Figur ist flach und rund.')],
  kugel: [flat('kreis', 'Diese Figur ist flach.'), body('wuerfel', 'Dieser Körper hat Ecken.'), body('quader', 'Dieser Körper hat Ecken.')],
  zylinder: [body('kegel', 'Dieser Körper hat oben eine Spitze.'), body('kugel', 'Dieser Körper hat keine flache Fläche.'), body('quader', 'Dieser Körper hat Ecken.'), body('pyramide', 'Dieser Körper hat oben eine Spitze.')],
  kegel: [body('pyramide', 'Dieser Körper hat unten ein Viereck.'), body('zylinder', 'Dieser Körper hat oben keine Spitze.'), body('kugel', 'Dieser Körper hat keine Spitze.'), body('prisma', 'Dieser Körper hat keine runde Fläche.')],
  pyramide: [body('kegel', 'Dieser Körper hat unten einen Kreis.'), body('prisma', 'Dieser Körper hat oben keine Spitze.'), body('quader', 'Dieser Körper hat oben keine Spitze.'), body('zylinder', 'Dieser Körper hat runde Flächen.')],
  prisma: [body('pyramide', 'Dieser Körper hat oben eine Spitze.'), body('quader', 'Dieser Körper hat keine Dreiecke als Flächen.'), body('zylinder', 'Dieser Körper hat runde Flächen.'), body('kegel', 'Dieser Körper hat eine runde Fläche.')],
};

/** AB I: from the name to the picture. */
function finden(rng: Rng, stufe: Stufe, s: SolidKind, keyPart: string): Task {
  const answer = pictureChoice(rng, solid(s), rng.shuffle(WRONG_PICTURES[s]), MAX_CHOICE_OPTIONS[stufe]);
  return {
    key: `${keyPart}:${s}`,
    prompt: `Wo ist ${THE[s]}?`,
    answer,
    hints: OTHER_SOLIDS.includes(s)
      ? ['Schau bei jedem Körper auf die Flächen.', 'Ist eine Fläche rund? Gibt es oben eine Spitze?']
      : ['Schau jedes Bild an: Ist die Form flach oder ein Körper?', 'Schau dann auf die Ecken und auf die Kanten.'],
    steps: [SEES[s], pictureStep(answer, `Das ist ${rightPicture(answer)}.`)],
    praise: rng.pick(['Du hast jedes Bild genau angeschaut.', 'Du hast den Körper an der Form erkannt.']),
  };
}

const FIRST_SOLIDS: readonly SolidKind[] = ['wuerfel', 'quader', 'kugel'];
const A_FIRST: Record<string, string> = { wuerfel: 'ein Würfel', quader: 'ein Quader', kugel: 'eine Kugel' };

/** Stufe 1, AB I: does the name fit the picture? A Würfel is also a Quader: that name is never claimed for a Würfel. */
function istName(rng: Rng): Task {
  const s = rng.pick(FIRST_SOLIDS);
  const yes = rng.chance(0.5);
  const claim = yes ? s : rng.pick(FIRST_SOLIDS.filter((o) => o !== s && !(s === 'wuerfel' && o === 'quader')));
  return {
    key: `ist:${s}:${claim}`,
    prompt: `Ist das ${A_FIRST[claim]}?`,
    visual: solid(s),
    answer: twoWay('Ja', 'Nein', yes, SEES[s]),
    hints: ['Schau auf die Flächen und auf die Ecken.', 'Ist der Körper rund, oder hat der Körper Ecken?'],
    steps: [SEES[s], `Der Körper heißt ${NAME[s]}.`],
    praise: rng.pick(['Du hast Name und Bild verglichen.', 'Du hast den Körper genau angeschaut.']),
  };
}

const FLAT_OR_BODY: { v: Visual; id: string; isBody: boolean }[] = [
  ...FIRST_SOLIDS.map((s) => ({ v: solid(s), id: s, isBody: true })),
  ...(['quadrat', 'rechteck', 'dreieck', 'kreis'] as const).map((shape) => ({ v: { type: 'shape', shape } as Visual, id: shape, isBody: false })),
];

/** Stufe 1, AB I: a Körper or a flat figure? The Körper of this Stufe beside the figures a child knows. */
function koerperOderFlach(rng: Rng): Task {
  const c = rng.pick(FLAT_OR_BODY);
  const body = 'Ein Körper';
  const flatOne = 'Eine flache Figur';
  return {
    key: `flach:${c.id}`,
    prompt: 'Was zeigt das Bild?',
    visual: c.v,
    answer: makeChoice(rng, { label: c.isBody ? body : flatOne }, [{ label: c.isBody ? flatOne : body, whyWrong: c.isBody ? 'Dieser Körper ist nicht flach. Ein Körper passt in die Hand.' : 'Diese Figur ist flach. Die Figur passt ganz auf ein Blatt.' }], { order: [body, flatOne] }),
    hints: ['Passt das Ding ganz auf ein Blatt Papier?', 'Einen Körper kannst du in die Hand nehmen.'],
    steps: [c.isBody ? 'Das Bild zeigt ein Ding zum Anfassen.' : 'Das Bild zeigt eine Form auf dem Blatt.', c.isBody ? 'Das ist ein Körper.' : 'Das ist eine flache Figur.'],
    praise: rng.pick(['Du hast flach und Körper getrennt.', 'Du hast das Bild genau angeschaut.']),
  };
}

/** AB I: "Was macht dieser Körper?" and the same in a choice between Körper. */
function rollen(rng: Rng): Task {
  if (rng.chance(0.5)) {
    const s = rng.pick<SolidKind>(['wuerfel', 'quader', 'kugel']);
    const rolls = s === 'kugel';
    return {
      key: `stoss:${s}`,
      prompt: 'Du stößt diesen Körper an. Was passiert?',
      visual: solid(s),
      answer: twoWay('Der Körper rollt.', 'Der Körper kippt.', rolls, rolls ? 'Der Körper hat keine Ecke und keine Kante.' : 'Der Körper hat Ecken und Kanten.'),
      hints: ['Hat der Körper flache Flächen oder ist er ganz rund?', 'Nur ein runder Körper rollt immer weiter.'],
      steps: [rolls ? 'Der Körper ist überall rund.' : 'Der Körper hat flache Flächen und Kanten.', rolls ? 'Der Körper rollt.' : 'Der Körper kippt über eine Kante.'],
      praise: rng.pick(['Du hast auf die Form geachtet.', rolls ? 'Du hast an die runde Form gedacht.' : 'Du hast an Flächen und Kanten gedacht.']),
    };
  }
  const box = rng.pick<SolidKind>(['wuerfel', 'quader']);
  const roll = rng.chance(0.5);
  const whyBall = 'Eine Kugel ist überall rund. Eine Kugel rollt weg.';
  const whyBox = `Ein ${NAME[box]} hat Ecken und Kanten. Ein ${NAME[box]} kippt nur.`;
  const answer = makeChoice(
    rng,
    { label: roll ? 'Kugel' : NAME[box], visual: solid(roll ? 'kugel' : box) },
    [{ label: roll ? NAME[box] : 'Kugel', visual: solid(roll ? box : 'kugel'), whyWrong: roll ? whyBox : whyBall }],
    { layout: 'grid' },
  );
  return {
    key: `welcher:${roll ? 'rollt' : 'kippt'}:${box}`,
    prompt: roll ? 'Welcher Körper kann gut rollen?' : 'Welcher Körper kippt nur um?',
    answer,
    hints: ['Schau auf die Flächen: Sind die Flächen flach oder rund?', 'Ein Körper mit Ecken bleibt liegen.'],
    steps: ['Die Kugel ist rund und rollt.', `Der ${NAME[box]} hat Kanten und kippt.`],
    praise: rng.pick(['Du hast auf die Form geachtet.', 'Du hast an Flächen und Kanten gedacht.']),
  };
}

const THINGS: { text: string; acc: string; s: SolidKind }[] = [
  { text: 'ein Ball', acc: 'einen Ball', s: 'kugel' }, { text: 'eine Murmel', acc: 'eine Murmel', s: 'kugel' }, { text: 'eine Orange', acc: 'eine Orange', s: 'kugel' },
  { text: 'ein Spielwürfel', acc: 'einen Spielwürfel', s: 'wuerfel' }, { text: 'ein Schuhkarton', acc: 'einen Schuhkarton', s: 'quader' }, { text: 'ein Ziegelstein', acc: 'einen Ziegelstein', s: 'quader' },
];

/**
 * The wrong names for an everyday thing. The task has no picture: "dieser Körper" would read as the option just named, and
 * "Schau auf die Kanten" would point at nothing. So each reason names the thing, and a Quader is a thing with longer Kanten.
 */
function wrongForThing(t: (typeof THINGS)[number]): ChoiceOption[] {
  const it = cap(t.text);
  const flat = `ist flach. ${it} ist nicht flach.`;
  if (t.s === 'kugel') {
    return [
      { label: 'Kreis', whyWrong: `Ein Kreis ${flat}` },
      { label: 'Würfel', whyWrong: `Ein Würfel hat Ecken. ${it} ist überall rund.` },
      { label: 'Quader', whyWrong: `Ein Quader hat Ecken. ${it} ist überall rund.` },
    ];
  }
  if (t.s === 'wuerfel') {
    return [
      { label: 'Kugel', whyWrong: `Eine Kugel ist rund. ${it} hat Ecken.` },
      { label: 'Quadrat', whyWrong: `Ein Quadrat ${flat}` },
      { label: 'Kreis', whyWrong: `Ein Kreis ${flat}` },
    ];
  }
  return [
    { label: 'Würfel', whyWrong: `Ein Würfel hat gleich lange Kanten. ${it} hat längere Kanten.` },
    { label: 'Kugel', whyWrong: `Eine Kugel ist rund. ${it} hat Ecken.` },
    { label: 'Rechteck', whyWrong: `Ein Rechteck ${flat}` },
  ];
}

/** AB I: an everyday thing and its Körper. */
function alltag(rng: Rng, stufe: Stufe): Task {
  const t = rng.pick(THINGS);
  return {
    key: `alltag:${t.text.replace(' ', '-')}`,
    prompt: `Welcher Körper sieht aus wie ${t.text}?`,
    answer: shuffled(rng, stufe, NAME[t.s], wrongForThing(t)),
    hints: [`Stell dir ${t.acc} genau vor.`, 'Ist das Ding rund? Oder hat das Ding Ecken und Kanten?'],
    steps: [`${cap(t.text)} ist ${t.s === 'kugel' ? 'überall rund' : 'kantig'}.`, `Das passt zu: ${NAME[t.s]}.`],
    praise: rng.pick(['Du hast das Ding mit dem Körper verglichen.', 'Du hast dir die Form genau vorgestellt.']),
  };
}

const ROUND_THINGS = THINGS.filter((t) => t.s === 'kugel');
const BOX_THINGS = THINGS.filter((t) => t.s !== 'kugel');

/** AB III on Stufe 1, the other way round: from rolling or tipping to the thing. */
function dingRollt(rng: Rng): Task {
  const rolls = rng.chance(0.5);
  const right = rng.pick(rolls ? ROUND_THINGS : BOX_THINGS);
  const wrong = rng.sample(rolls ? BOX_THINGS : ROUND_THINGS, 2);
  const why = (t: (typeof THINGS)[number]) => (t.s === 'kugel' ? `${cap(t.text)} ist überall rund. Das Ding rollt weg.` : `${cap(t.text)} hat Ecken und Kanten. Das Ding kippt nur.`);
  return {
    key: `ding:${rolls ? 'rollt' : 'kippt'}:${right.text.replace(' ', '-')}`,
    prompt: rolls ? 'Welches Ding rollt gut?' : 'Welches Ding kippt nur um?',
    answer: makeChoice(rng, { label: cap(right.text) }, wrong.map((t) => ({ label: cap(t.text), whyWrong: why(t) }))),
    hints: ['Stell dir jedes Ding genau vor.', 'Ist das Ding rund? Oder hat das Ding Ecken?'],
    steps: [`${cap(right.text)} ist wie ${right.s === 'kugel' ? 'eine Kugel' : right.s === 'wuerfel' ? 'ein Würfel' : 'ein Quader'}.`, why(right)],
    praise: rng.pick(['Du hast dir jedes Ding genau vorgestellt.', 'Du hast an die Form der Dinge gedacht.']),
  };
}

/** AB III on Stufe 1, the other way round: from the Körper to the thing. A Spielwürfel is also a Quader, so it is no wrong thing for one. */
function dingZuForm(rng: Rng): Task {
  const right = rng.pick(THINGS);
  const others = THINGS.filter((t) => t.s !== right.s && !(right.s === 'quader' && t.s === 'wuerfel'));
  const wrong = rng.sample(others, 2);
  return {
    key: `dingform:${right.text.replace(' ', '-')}`,
    prompt: 'Welches Ding hat diese Form?',
    visual: solid(right.s),
    answer: makeChoice(rng, { label: cap(right.text) }, wrong.map((t) => ({ label: cap(t.text), whyWrong: `${cap(t.text)} sieht aus wie ${t.s === 'kugel' ? 'eine Kugel' : t.s === 'wuerfel' ? 'ein Würfel' : 'ein Quader'}.` }))),
    hints: ['Schau auf den Körper im Bild.', 'Stell dir dann jedes Ding genau vor.'],
    steps: [SEES[right.s], `${cap(right.text)} sieht so aus.`],
    praise: rng.pick(['Du hast Körper und Ding verglichen.', 'Du hast dir die Dinge genau vorgestellt.']),
  };
}

/** AB III on Stufe 1: riddles without the numbers of Stufe 2. */
const WORD_RIDDLES: { clue: string; s: SolidKind }[] = [
  { clue: 'Ich bin überall rund. Ich rolle in jede Richtung.', s: 'kugel' },
  { clue: 'Ich habe keine Ecken. Ich bin nicht flach.', s: 'kugel' },
  { clue: 'Ich kippe nur um. Alle Kanten sind gleich lang.', s: 'wuerfel' },
  { clue: 'Ich sehe aus wie ein Spielwürfel. Ich habe Ecken.', s: 'wuerfel' },
  { clue: 'Ich kippe nur um. Manche Kanten sind länger.', s: 'quader' },
  { clue: 'Ich sehe aus wie ein Schuhkarton. Ich rolle nicht.', s: 'quader' },
];

const WORD_RIDDLE_WRONG: Record<string, ChoiceOption[]> = {
  kugel: [{ label: 'Würfel', whyWrong: 'Ein Würfel hat Ecken und kippt nur.' }, { label: 'Quader', whyWrong: 'Ein Quader hat Ecken und kippt nur.' }, { label: 'Kreis', whyWrong: 'Ein Kreis ist flach. Ein Kreis ist kein Körper.' }],
  wuerfel: [{ label: 'Kugel', whyWrong: 'Eine Kugel ist rund und rollt.' }, { label: 'Quader', whyWrong: 'Bei einem Quader können Kanten länger sein.' }, { label: 'Quadrat', whyWrong: 'Ein Quadrat ist flach. Ein Quadrat ist kein Körper.' }],
  quader: [{ label: 'Kugel', whyWrong: 'Eine Kugel ist rund und rollt.' }, { label: 'Würfel', whyWrong: 'Bei einem Würfel sind alle Kanten gleich lang.' }, { label: 'Rechteck', whyWrong: 'Ein Rechteck ist flach. Ein Rechteck ist kein Körper.' }],
};

function wortRaetsel(rng: Rng, stufe: Stufe): Task {
  const i = rng.int(0, WORD_RIDDLES.length - 1);
  const r = WORD_RIDDLES[i];
  return {
    key: `raetsel:${i}`,
    prompt: `${r.clue} Wer bin ich?`,
    answer: shuffled(rng, stufe, NAME[r.s], WORD_RIDDLE_WRONG[r.s]),
    hints: ['Prüfe jeden Körper mit dem ersten Satz.', 'Prüfe dann mit dem zweiten Satz.'],
    steps: [SEES[r.s], `Der Körper heißt ${NAME[r.s]}.`],
    praise: rng.pick(['Du hast beide Sätze geprüft.', 'Du hast die Sätze mit den Körpern verglichen.']),
  };
}

type Part = 'Ecken' | 'Kanten' | 'Flächen';

/** Whole Körper: total, visible in the drawing, and the steps of a worked solution. */
type PartCounts = Record<Part, { total: number; visible: number; steps: string[] }>;

const BOX: PartCounts = {
  Ecken: { total: 8, visible: 7, steps: ['Oben sind 4 Ecken.', 'Unten sind auch 4 Ecken.', '4 + 4 = 8 Ecken'] },
  Kanten: { total: 12, visible: 9, steps: ['Oben sind 4 Kanten, unten auch 4 Kanten.', 'Dazwischen sind noch 4 Kanten.', '4 + 4 + 4 = 12 Kanten'] },
  Flächen: { total: 6, visible: 3, steps: ['Oben und unten: 2 Flächen.', 'Vorne und hinten: 2 Flächen. Links und rechts: 2 Flächen.', '2 + 2 + 2 = 6 Flächen'] },
};

const COUNTS: Partial<Record<SolidKind, PartCounts>> = {
  wuerfel: BOX,
  quader: BOX,
  pyramide: {
    Ecken: { total: 5, visible: 4, steps: ['Unten sind 4 Ecken.', 'Oben ist die Spitze: 1 Ecke.', '4 + 1 = 5 Ecken'] },
    Kanten: { total: 8, visible: 5, steps: ['Unten sind 4 Kanten.', 'Zur Spitze gehen auch 4 Kanten.', '4 + 4 = 8 Kanten'] },
    Flächen: { total: 5, visible: 2, steps: ['Unten ist 1 Viereck.', 'Rundherum sind 4 Dreiecke.', '1 + 4 = 5 Flächen'] },
  },
  prisma: {
    Ecken: { total: 6, visible: 5, steps: ['Vorne sind 3 Ecken.', 'Hinten sind auch 3 Ecken.', '3 + 3 = 6 Ecken'] },
    Kanten: { total: 9, visible: 6, steps: ['Vorne sind 3 Kanten, hinten auch 3 Kanten.', 'Dazwischen sind noch 3 Kanten.', '3 + 3 + 3 = 9 Kanten'] },
    Flächen: { total: 5, visible: 2, steps: ['Vorne und hinten: 2 Dreiecke.', 'Dazwischen: 3 Rechtecke.', '2 + 3 = 5 Flächen'] },
  },
};

/** Each word for one thing only: the lines of a Körper are Kanten, never Seiten (docs/research.md T11). */
const WHAT_IS: Record<Part, string> = {
  Ecken: 'Ecken sind die Spitzen am Körper.',
  Kanten: 'Kanten sind die Linien am Körper.',
  Flächen: 'Flächen sind die flachen Teile vom Körper.',
};
const BOX_FACES = 'Denk an oben, unten, vorne, hinten, links und rechts.';
/** Where the Flächen of this Körper are: a Pyramide and a Prisma have no Fläche on top. */
const FACES_HINT: Partial<Record<SolidKind, string>> = {
  wuerfel: BOX_FACES,
  quader: BOX_FACES,
  pyramide: 'Denk an die Fläche unten und an die Dreiecke.',
  prisma: 'Denk an die Dreiecke und an die Rechtecke.',
};
const FORGOT: Record<Part, string> = {
  Ecken: 'Denk auch an die verdeckte Ecke hinten.',
  Kanten: 'Denk auch an die verdeckten Kanten: Diese Kanten sind gestrichelt.',
  // all three hidden ones (SolidVisual): the same three on a Würfel, Quader, Pyramide and Prisma
  Flächen: 'Denk auch an die Flächen hinten, unten und links.',
};
const BUG_ID: Record<Part, string> = { Ecken: 'ecken-verdeckt', Kanten: 'kanten-verdeckt', Flächen: 'flaechen-verdeckt' };

/** How many of a part: the bugs are the visible count and the count of another part. */
function anzahl(rng: Rng, s: SolidKind, part: Part): Task {
  const c = COUNTS[s]![part];
  const others = (['Ecken', 'Kanten', 'Flächen'] as Part[]).filter((p) => p !== part);
  return {
    key: `anzahl:${part}:${s}`,
    prompt: `Wie viele ${part} hat ${NOM[s]}?`,
    visual: solid(s),
    answer: { kind: 'number', value: c.total, unit: part },
    bugs: bugList(c.total, [
      [BUG_ID[part], c.visible, FORGOT[part]],
      ...others.map((p): [string, number, string] => ['teil-verwechselt', COUNTS[s]![p].total, `Das sind die ${p}. ${WHAT_IS[part]}`]),
    ]),
    hints: [`${WHAT_IS[part]} Gestrichelte Linien zeigen verdeckte Teile.`, part === 'Flächen' ? (FACES_HINT[s] as string) : 'Geh in Gedanken um den Körper herum.'],
    steps: c.steps,
    praise: rng.pick(['Du hast auch die verdeckten Teile mitgezählt.', `Du hast alle ${part} gefunden.`]),
  };
}

const BOXES: SolidKind[] = ['wuerfel', 'quader'];
const PARTS: Part[] = ['Ecken', 'Kanten', 'Flächen'];
const pickBox = (rng: Rng) => rng.pick(BOXES);
const pickPart = (rng: Rng) => rng.pick(PARTS);

/** AB II on Stufe 2: no Ecke and no Kante on a Kugel, by thinking about what a corner is. */
function kugelTeile(rng: Rng): Task {
  const part = rng.pick<Part>(['Ecken', 'Kanten']);
  return {
    key: `anzahl:${part}:kugel`,
    prompt: `Wie viele ${part} hat diese Kugel?`,
    visual: solid('kugel'),
    answer: { kind: 'number', value: 0, unit: part },
    hints: ['Eine Kugel ist überall rund.', `${WHAT_IS[part]} Gibt es so etwas hier?`],
    steps: ['Eine Kugel ist überall rund.', `Eine Kugel hat 0 ${part}.`],
    praise: 'Du hast an die runde Form gedacht.',
  };
}

/** AB II on Stufe 2: two kinds of parts of one Körper together. */
function zweiTeile(rng: Rng): Task {
  const s = pickBox(rng);
  const [a, b] = rng.sample(PARTS, 2);
  const [na, nb] = [COUNTS[s]![a].total, COUNTS[s]![b].total];
  const value = na + nb;
  const name = s === 'wuerfel' ? 'dieser Würfel' : 'dieser Quader';
  return {
    key: `zwei-teile:${a}:${b}:${s}`,
    prompt: `Wie viele ${a} und ${b} hat ${name} zusammen?`,
    visual: solid(s),
    answer: { kind: 'number', value },
    bugs: bugList(value, [
      ['teil-verwechselt', na, `Das sind nur die ${a}. Rechne auch die ${b} dazu.`],
      ['teil-verwechselt', nb, `Das sind nur die ${b}. Rechne auch die ${a} dazu.`],
      [BUG_ID[a], COUNTS[s]![a].visible + COUNTS[s]![b].visible, 'Denk auch an die verdeckten Teile.'],
    ]),
    hints: [`Überlege zuerst: Wie viele ${a} sind es?`, `Überlege dann: Wie viele ${b} sind es?`],
    steps: [`Der Körper hat ${na} ${a}.`, `Der Körper hat ${nb} ${b}.`, `${na} + ${nb} = ${value}`],
    praise: rng.pick(['Du hast beide Teile zusammen gerechnet.', `Du hast ${a} und ${b} getrennt gerechnet.`]),
  };
}

/** AB III on Stufe 2, the other way round: from the number to the part. */
function welcherTeil(rng: Rng): Task {
  const s = pickBox(rng);
  const part = pickPart(rng);
  const c = COUNTS[s]!;
  const n = c[part].total;
  const a = s === 'wuerfel' ? 'Ein Würfel' : 'Ein Quader';
  return {
    key: `welcher-teil:${part}:${s}`,
    prompt: `${a} hat ${n} davon. Was ist das?`,
    answer: makeChoice(rng, { label: part }, PARTS.filter((p) => p !== part).map((p) => ({ label: p, whyWrong: `${a} hat ${c[p].total} ${p}.` })), { order: PARTS }),
    hints: ['Geh in Gedanken um den Körper herum.', 'Denk an die Spitzen, an die Linien und an die flachen Teile.'],
    steps: [`${a} hat ${c.Ecken.total} Ecken und ${c.Kanten.total} Kanten.`, `${a} hat ${c.Flächen.total} Flächen.`, `${n} passt zu: ${part}.`],
    praise: rng.pick(['Du hast von der Zahl zum Teil gedacht.', 'Du kennst die Teile vom Körper genau.']),
  };
}

/** AB III on Stufe 2: some Flächen are painted, how many are left? */
function flaechenRest(rng: Rng): Task {
  const s = pickBox(rng);
  const k = rng.int(1, 5);
  const value = 6 - k;
  const paint = k === 1 ? '1 Fläche' : `${k} Flächen`;
  return {
    key: `flaechen-rest:${s}:${k}`,
    prompt: `Du malst ${paint} rot an. Wie viele Flächen bleiben frei?`,
    visual: solid(s),
    answer: { kind: 'number', value },
    bugs: bugList(value, [
      ['alle-statt-verdeckt', 6, 'Das sind alle Flächen. Gefragt sind nur die freien Flächen.'],
      ['sichtbar-statt-verdeckt', k, 'Das sind die roten Flächen. Gefragt sind die freien Flächen.'],
    ]),
    hints: ['Wie viele Flächen hat der Körper insgesamt?', 'Nimm die roten Flächen weg.'],
    steps: ['Der Körper hat 6 Flächen.', `6 − ${k} = ${value}`, `Es ${value === 1 ? 'bleibt 1 Fläche' : `bleiben ${value} Flächen`} frei.`],
    praise: rng.pick(['Du hast an alle Flächen gedacht.', 'Du hast von allen Flächen aus gerechnet.']),
  };
}

/** AB II: the form of a Fläche. A Quadrat is also a Rechteck, so the other one is no wrong option. */
function flaechenForm(rng: Rng): Task {
  const s = rng.pick<SolidKind>(['wuerfel', 'quader']);
  const right = s === 'wuerfel' ? 'Quadrat' : 'Rechteck';
  const answer = makeChoice(rng, { label: right }, [
    { label: 'Kreis', whyWrong: 'Ein Kreis ist rund. Diese Flächen haben Ecken.' },
    { label: 'Dreieck', whyWrong: 'Ein Dreieck hat 3 Ecken. Schau auf die Ecken einer Fläche.' },
  ]);
  return {
    key: `form:${s}`,
    prompt: `Welche Form hat eine Fläche von ${s === 'wuerfel' ? 'diesem Würfel' : 'diesem Quader'}?`,
    // Named: the description of the drawing says which form the faces have.
    visual: { type: 'solid', solid: s, named: true },
    answer,
    hints: ['Schau nur auf die vordere Fläche.', 'Wie viele Ecken hat diese Fläche? Wie lang sind die Kanten?'],
    steps: ['Schau auf die vordere Fläche.', s === 'wuerfel' ? 'Alle 4 Kanten sind gleich lang: ein Quadrat.' : '2 Kanten sind länger: ein Rechteck.'],
    praise: rng.pick(['Du hast eine Fläche allein angeschaut.', 'Du hast Körper und Fläche verbunden.']),
  };
}

/**
 * AB III: statements on Würfel, Quader, Kugel. "Der Satz in der Aufgabe": right after a fact, "Der Satz" alone reads as that fact.
 * "Jeder Würfel ist auch ein Quader" is left out: the catalogue does not ask for it, and equal counts of Ecken and Flächen do not show it.
 */
const STATEMENTS: { text: string; isTrue: boolean; whyWrong: string; steps: string[] }[] = [
  {
    text: 'Würfel und Quader haben gleich viele Ecken.', isTrue: true, whyWrong: 'Rechne bei beiden Körpern: oben und unten. Vergleiche dann.',
    steps: ['Ein Würfel hat 8 Ecken.', 'Ein Quader hat auch 8 Ecken.', 'Der Satz in der Aufgabe stimmt.'],
  },
  {
    text: 'Ein Würfel hat mehr Kanten als ein Quader.', isTrue: false, whyWrong: 'Rechne bei beiden Körpern: oben, unten, dazwischen. Vergleiche dann.',
    steps: ['Ein Würfel hat 12 Kanten.', 'Ein Quader hat auch 12 Kanten.', 'Der Satz in der Aufgabe stimmt nicht.'],
  },
  {
    text: 'Jeder Quader ist auch ein Würfel.', isTrue: false, whyWrong: 'Bei einem Würfel sind alle Kanten gleich lang. Bei jedem Quader auch?',
    steps: ['Bei einem Würfel sind alle Kanten gleich lang.', 'Ein Quader kann längere Kanten haben.', 'Der Satz in der Aufgabe stimmt nicht.'],
  },
  {
    text: 'Eine Kugel hat eine Ecke.', isTrue: false, whyWrong: 'Eine Kugel ist überall rund. Gibt es eine Spitze?',
    steps: ['Eine Kugel ist überall rund.', 'Eine Kugel hat keine Spitze.', 'Der Satz in der Aufgabe stimmt nicht.'],
  },
  {
    text: 'Alle Flächen von einem Würfel sind gleich groß.', isTrue: true, whyWrong: 'Alle Kanten vom Würfel sind gleich lang. Denk an die Flächen.',
    steps: ['Alle Kanten vom Würfel sind gleich lang.', 'Alle Flächen sind gleich große Quadrate.', 'Der Satz in der Aufgabe stimmt.'],
  },
  {
    text: 'Ein Quader hat 6 Flächen.', isTrue: true, whyWrong: 'Denk an oben, unten, vorne, hinten, links und rechts.',
    steps: ['Oben und unten: 2 Flächen.', 'Vorne und hinten: 2 Flächen. Links und rechts: 2 Flächen.', 'Der Satz in der Aufgabe stimmt.'],
  },
];

/** AB III on Stufe 3, with the extras on: statements on the other solids. */
const OTHER_STATEMENTS: typeof STATEMENTS = [
  {
    text: 'Eine Pyramide hat 5 Ecken.', isTrue: true, whyWrong: 'Denk an die Ecken unten und an die Spitze.',
    steps: ['Unten sind 4 Ecken.', 'Oben ist die Spitze: 1 Ecke.', 'Der Satz in der Aufgabe stimmt.'],
  },
  {
    text: 'Ein Zylinder kann rollen.', isTrue: true, whyWrong: 'Ein Zylinder hat eine runde Fläche. Denk an eine Dose.',
    steps: ['Ein Zylinder hat eine runde Fläche.', 'Auf der runden Fläche rollt der Körper.', 'Der Satz in der Aufgabe stimmt.'],
  },
  {
    text: 'Ein Kegel hat 2 Spitzen.', isTrue: false, whyWrong: 'Ein Kegel hat unten einen Kreis. Wo ist die Spitze?',
    steps: ['Unten ist ein Kreis.', 'Oben ist 1 Spitze.', 'Der Satz in der Aufgabe stimmt nicht.'],
  },
  {
    text: 'Ein Prisma hat mehr Flächen als eine Pyramide.', isTrue: false, whyWrong: 'Rechne bei beiden Körpern die Flächen aus. Vergleiche dann.',
    steps: ['Ein Prisma hat 5 Flächen.', 'Eine Pyramide hat auch 5 Flächen.', 'Der Satz in der Aufgabe stimmt nicht.'],
  },
  {
    text: 'Eine Pyramide hat eine runde Fläche.', isTrue: false, whyWrong: 'Denk an die Fläche unten und an die Dreiecke.',
    steps: ['Unten ist ein Viereck.', 'Rundherum sind 4 Dreiecke.', 'Der Satz in der Aufgabe stimmt nicht.'],
  },
  {
    text: 'Zylinder und Kegel haben beide einen Kreis.', isTrue: true, whyWrong: 'Denk bei beiden Körpern an die Fläche unten.',
    steps: ['Ein Zylinder hat unten einen Kreis.', 'Ein Kegel hat unten auch einen Kreis.', 'Der Satz in der Aufgabe stimmt.'],
  },
];

function stimmt(rng: Rng): Task {
  return statementTask(rng, STATEMENTS, 'stimmt');
}

function statementTask(rng: Rng, list: typeof STATEMENTS, keyPart: string): Task {
  const i = rng.int(0, list.length - 1);
  const s = list[i];
  return {
    key: `${keyPart}:${i}`,
    prompt: `${s.text} Stimmt das?`,
    answer: twoWay('Stimmt', 'Stimmt nicht', s.isTrue, s.whyWrong),
    hints: ['Stell dir den Körper genau vor.', 'Denk an Ecken, Kanten und Flächen.'],
    steps: s.steps,
    praise: rng.pick(['Du hast den Satz genau geprüft.', 'Du hast den Körper im Kopf geprüft.']),
  };
}

const RIDDLES: { clue: string; s: SolidKind; wrong: ChoiceOption[] }[] = [
  {
    clue: 'Ich habe 6 Flächen. Alle Kanten sind gleich lang.', s: 'wuerfel',
    wrong: [{ label: 'Kugel', whyWrong: 'Eine Kugel hat keine Kanten.' }, { label: 'Quadrat', whyWrong: 'Ein Quadrat ist flach. Ein Quadrat hat keine 6 Flächen.' }, { label: 'Kreis', whyWrong: 'Ein Kreis ist flach und hat keine Kanten.' }],
  },
  {
    clue: 'Ich habe 8 Ecken. Manche Kanten sind länger.', s: 'quader',
    wrong: [{ label: 'Würfel', whyWrong: 'Bei einem Würfel sind alle Kanten gleich lang.' }, { label: 'Kugel', whyWrong: 'Eine Kugel hat keine Ecken.' }, { label: 'Rechteck', whyWrong: 'Ein Rechteck hat 4 Ecken.' }],
  },
  {
    clue: 'Ich habe keine Ecken. Ich rolle in jede Richtung.', s: 'kugel',
    wrong: [{ label: 'Würfel', whyWrong: 'Ein Würfel hat 8 Ecken.' }, { label: 'Quader', whyWrong: 'Ein Quader hat 8 Ecken.' }, { label: 'Kreis', whyWrong: 'Ein Kreis ist flach. Ein Kreis ist kein Körper.' }],
  },
];

function wer(rng: Rng, stufe: Stufe): Task {
  const i = rng.int(0, RIDDLES.length - 1);
  const r = RIDDLES[i];
  return {
    key: `wer:${i}`,
    prompt: `${r.clue} Wer bin ich?`,
    answer: shuffled(rng, stufe, NAME[r.s], r.wrong),
    hints: ['Prüfe jeden Körper mit dem ersten Satz.', 'Prüfe dann mit dem zweiten Satz.'],
    steps: [SEES[r.s], `Der Körper heißt ${NAME[r.s]}.`],
    praise: rng.pick(['Du hast alle Hinweise geprüft.', 'Du hast die Hinweise mit den Körpern verglichen.']),
  };
}

/** Stufe 3: how many are hidden in the drawing. AB I of a Würfel or Quader; AB III, with the extras on, of a Pyramide or Prisma. */
function verdeckt(rng: Rng): Task {
  return hiddenParts(rng, pickBox(rng), 'verdeckt');
}

function hiddenParts(rng: Rng, s: SolidKind, keyPart: string): Task {
  const part = rng.pick<Part>(['Ecken', 'Kanten', 'Flächen']);
  const c = COUNTS[s]![part];
  const hidden = c.total - c.visible;
  const box = s === 'wuerfel' || s === 'quader';
  return {
    key: `${keyPart}:${part}:${s}`,
    prompt: `Wie viele ${part} sind in diesem Bild verdeckt?`,
    // the answer depends on the picture: the words have to say what it shows
    srText: `Im Bild ist ${A_SOLID[s]}. Du siehst ${c.visible} ${part}. Wie viele ${part} sind in diesem Bild verdeckt?`,
    visual: solid(s),
    // no unit, the task names it: "1 Ecken" would be wrong, and a unit "Ecke" next to the empty field would give away the 1
    answer: { kind: 'number', value: hidden },
    bugs: bugList(hidden, [
      ['alle-statt-verdeckt', c.total, `Das sind alle ${part}. Gefragt sind nur die verdeckten.`],
      ['sichtbar-statt-verdeckt', c.visible, `Das sind die ${part} im Bild. Gefragt sind die verdeckten.`],
    ]),
    hints: [part === 'Flächen' && box ? 'Vorne, oben und rechts siehst du. Was fehlt?' : 'Verdeckte Teile sind gestrichelt.', `Denk an alle ${part}. Wie viele davon siehst du?`],
    steps: [`Der Körper hat ${c.total} ${part}.`, `Du siehst ${c.visible} ${part}.`, `${c.total} − ${c.visible} = ${hidden} ${hidden === 1 ? 'Ecke' : part}`],
    praise: rng.pick(['Du hast an die Teile hinten gedacht.', 'Du hast den Körper in Gedanken gedreht.']),
  };
}

/** AB II on Stufe 3: two kinds of hidden parts together. */
function verdecktZwei(rng: Rng): Task {
  const s = pickBox(rng);
  const [a, b] = rng.sample(PARTS, 2);
  const [ca, cb] = [COUNTS[s]![a], COUNTS[s]![b]];
  const [ha, hb] = [ca.total - ca.visible, cb.total - cb.visible];
  const value = ha + hb;
  const name = (p: Part, n: number) => (n === 1 ? 'Ecke' : p);
  return {
    key: `verdeckt-zwei:${a}:${b}:${s}`,
    prompt: `Wie viele ${a} und ${b} sind zusammen verdeckt?`,
    srText: `Im Bild ist ${s === 'wuerfel' ? 'ein Würfel' : 'ein Quader'}. Du siehst ${ca.visible} ${a} und ${cb.visible} ${b}. Wie viele ${a} und ${b} sind zusammen verdeckt?`,
    visual: solid(s),
    answer: { kind: 'number', value },
    bugs: bugList(value, [
      ['alle-statt-verdeckt', ca.total + cb.total, 'Das sind alle Teile. Gefragt sind nur die verdeckten.'],
      ['sichtbar-statt-verdeckt', ca.visible + cb.visible, 'Das sind die Teile im Bild. Gefragt sind die verdeckten.'],
    ]),
    hints: [`Überlege zuerst: Wie viele ${a} sind verdeckt?`, `Überlege dann: Wie viele ${b} sind verdeckt?`],
    steps: [`Verdeckt: ${ha} ${name(a, ha)}.`, `Verdeckt: ${hb} ${name(b, hb)}.`, `${ha} + ${hb} = ${value}`],
    praise: rng.pick(['Du hast beide Teile hinten mitgedacht.', 'Du hast den Körper in Gedanken gedreht.']),
  };
}

/** AB II on Stufe 3: the parts of two bodies. */
function zweiKoerper(rng: Rng): Task {
  const part = pickPart(rng);
  const [a, b] = rng.pick<[SolidKind, SolidKind]>([['wuerfel', 'wuerfel'], ['quader', 'quader'], ['wuerfel', 'quader']]);
  const n = COUNTS[a]![part].total;
  const value = n + COUNTS[b]![part].total;
  const who = a === b ? `2 ${NAME[a]}` : '1 Würfel und 1 Quader';
  return {
    key: `zwei-koerper:${part}:${a}:${b}`,
    prompt: `Wie viele ${part} haben ${who} zusammen?`,
    answer: { kind: 'number', value },
    bugs: bugList(value, [
      ['nur-ein-koerper', n, 'Das ist erst 1 Körper. Rechne beide Körper zusammen.'],
      ['teil-verwechselt', COUNTS[a]![part === 'Ecken' ? 'Kanten' : 'Ecken'].total * 2, `Das sind andere Teile. ${WHAT_IS[part]}`],
    ]),
    hints: [`Wie viele ${part} hat ein Körper?`, 'Rechne dann beide Körper zusammen.'],
    steps: [`Jeder Körper hat ${n} ${part}.`, `${n} + ${n} = ${value}`, `Zusammen sind es ${value} ${part}.`],
    praise: rng.pick(['Du hast beide Körper mitgerechnet.', 'Du hast von einem Körper auf beide geschlossen.']),
  };
}

/** AB III on Stufe 3: from the hidden parts back to the visible ones. */
function sichtbar(rng: Rng): Task {
  const s = pickBox(rng);
  const part = pickPart(rng);
  const c = COUNTS[s]![part];
  const hidden = c.total - c.visible;
  const name = s === 'wuerfel' ? 'diesem Würfel' : 'diesem Quader';
  return {
    key: `sichtbar:${part}:${s}`,
    prompt: `Bei ${name} ${hidden === 1 ? 'ist 1 Ecke' : `sind ${hidden} ${part}`} verdeckt. Wie viele ${part} siehst du?`,
    visual: solid(s),
    answer: { kind: 'number', value: c.visible },
    bugs: bugList(c.visible, [
      ['alle-statt-verdeckt', c.total, `Das sind alle ${part}. Nimm die verdeckten weg.`],
      ['sichtbar-statt-verdeckt', hidden, `Das sind die verdeckten ${part}. Gefragt sind die anderen.`],
    ]),
    hints: [`Wie viele ${part} hat der Körper insgesamt?`, 'Nimm die verdeckten Teile weg.'],
    steps: [`Der Körper hat ${c.total} ${part}.`, `${c.total} − ${hidden} = ${c.visible}`, `Du siehst ${c.visible} ${part}.`],
    praise: rng.pick(['Du hast von allen Teilen aus gerechnet.', 'Du hast an die Teile hinten gedacht.']),
  };
}

/** AB III on Stufe 3: which of three sentences holds, or which one does not. */
function welcherSatz(rng: Rng): Task {
  const asksTrue = rng.chance(0.5);
  const rightOnes = STATEMENTS.filter((s) => s.isTrue === asksTrue);
  const wrongOnes = STATEMENTS.filter((s) => s.isTrue !== asksTrue);
  const right = rng.pick(rightOnes);
  const wrong = rng.sample(wrongOnes, 2);
  return {
    key: `satz:${asksTrue ? 'ja' : 'nein'}:${STATEMENTS.indexOf(right)}:${wrong.map((s) => STATEMENTS.indexOf(s)).sort().join('')}`,
    prompt: asksTrue ? 'Welcher Satz stimmt?' : 'Welcher Satz stimmt nicht?',
    answer: makeChoice(rng, { label: right.text }, wrong.map((s) => ({ label: s.text, whyWrong: s.whyWrong }))),
    hints: ['Prüfe jeden Satz einzeln.', 'Stell dir die Körper genau vor.'],
    steps: right.steps,
    praise: rng.pick(['Du hast jeden Satz genau geprüft.', 'Du hast die Sätze miteinander verglichen.']),
  };
}

/** AB III on Stufe 3, with the extras on: riddles on the other solids. */
const OTHER_RIDDLES: { clue: string; s: SolidKind }[] = [
  { clue: 'Oben und unten ist ein Kreis. Ich kann rollen.', s: 'zylinder' },
  { clue: 'Unten ist ein Kreis. Oben ist eine Spitze.', s: 'kegel' },
  { clue: 'Unten ist ein Viereck. Oben ist eine Spitze.', s: 'pyramide' },
  { clue: 'Ich habe 2 Dreiecke. Dazwischen habe ich 3 Rechtecke.', s: 'prisma' },
];

function werWeitere(rng: Rng, stufe: Stufe): Task {
  const i = rng.int(0, OTHER_RIDDLES.length - 1);
  const r = OTHER_RIDDLES[i];
  return {
    key: `wer-weitere:${r.s}`,
    prompt: `${r.clue} Wer bin ich?`,
    answer: shuffled(rng, stufe, NAME[r.s], WRONG_NAMES[r.s]),
    hints: ['Prüfe jeden Körper mit dem ersten Satz.', 'Prüfe dann mit dem zweiten Satz.'],
    steps: [SEES[r.s], `Der Körper heißt ${NAME[r.s]}.`],
    praise: rng.pick(['Du hast beide Sätze geprüft.', 'Du hast dir die Körper genau vorgestellt.']),
  };
}

const COMPARED: [SolidKind, SolidKind][] = [['pyramide', 'prisma'], ['wuerfel', 'pyramide'], ['wuerfel', 'prisma']];
const BOTH_SAME = 'Beide gleich viele';

/** AB III on Stufe 3, with the extras on: which Körper has more of a part? */
function mehrTeile(rng: Rng): Task {
  const part = pickPart(rng);
  const [a, b] = rng.pick(COMPARED);
  const [na, nb] = [COUNTS[a]![part].total, COUNTS[b]![part].total];
  const right = na === nb ? BOTH_SAME : na > nb ? NAME[a] : NAME[b];
  const why = `Rechne bei beiden Körpern die ${part} aus. Vergleiche dann.`;
  const labels = [NAME[a], NAME[b], BOTH_SAME];
  return {
    key: `mehr-teile:${part}:${a}:${b}`,
    prompt: `Wer hat mehr ${part}: ${NAME[a]} oder ${NAME[b]}?`,
    answer: makeChoice(rng, { label: right }, labels.filter((l) => l !== right).map((label) => ({ label, whyWrong: why })), { order: labels }),
    hints: [`Wie viele ${part} hat der erste Körper?`, `Wie viele ${part} hat der zweite Körper?`],
    steps: [`${NAME[a]}: ${na} ${part}.`, `${NAME[b]}: ${nb} ${part}.`, na === nb ? 'Beide haben gleich viele.' : `${Math.max(na, nb)} ist mehr als ${Math.min(na, nb)}: ${right}.`],
    praise: rng.pick(['Du hast beide Körper verglichen.', `Du hast die ${part} von beiden gerechnet.`]),
  };
}

const BY_CLUE: { clue: string; s: SolidKind }[] = [
  { clue: 'Welcher Körper hat eine Spitze und unten einen Kreis?', s: 'kegel' },
  { clue: 'Welcher Körper hat oben und unten einen Kreis?', s: 'zylinder' },
  { clue: 'Welcher Körper hat eine Spitze und unten ein Viereck?', s: 'pyramide' },
  { clue: 'Welcher Körper hat 2 Dreiecke und 3 Rechtecke?', s: 'prisma' },
];

/** By a clue: from what a Körper has to its name. */
function merkmal(rng: Rng, stufe: Stufe): Task {
  const c = rng.pick(BY_CLUE);
  return {
    key: `merkmal:${c.s}`,
    prompt: c.clue,
    answer: shuffled(rng, stufe, NAME[c.s], WRONG_NAMES[c.s]),
    hints: ['Stell dir jeden Körper vor.', 'Prüfe jeden Hinweis einzeln.'],
    steps: [SEES[c.s], `Der Körper heißt ${NAME[c.s]}.`],
    praise: rng.pick(['Du hast alle Hinweise geprüft.', 'Du hast dir die Körper genau vorgestellt.']),
  };
}

type Form = (rng: Rng, stufe: Stufe) => Task;

const FORMS: Record<1 | 2, Record<Ab, Form[]>> = {
  1: {
    1: [(rng, stufe) => nennen(rng, stufe, rng.pick<SolidKind>(['wuerfel', 'quader', 'kugel']), 'name'), (rng, stufe) => finden(rng, stufe, rng.pick<SolidKind>(['wuerfel', 'quader', 'kugel']), 'finde'), istName, istName, koerperOderFlach],
    2: [rollen, alltag],
    3: [dingRollt, dingZuForm, wortRaetsel],
  },
  2: {
    1: [(rng) => anzahl(rng, pickBox(rng), pickPart(rng)), (rng) => anzahl(rng, pickBox(rng), pickPart(rng)), flaechenForm],
    2: [zweiTeile, zweiTeile, kugelTeile],
    3: [welcherTeil, wer, flaechenRest],
  },
};

/** Stufe 3 with the extras off, and now and then with them on (the page shows one label for both). */
const BOX_FORMS: Record<Ab, Form[]> = {
  1: [verdeckt],
  2: [verdecktZwei, zweiKoerper],
  3: [stimmt, welcherSatz, sichtbar],
};

/** Stufe 3 with the extras on. */
const OTHER_FORMS: Record<Ab, Form[]> = {
  1: [(rng, stufe) => nennen(rng, stufe, rng.pick(OTHER_SOLIDS), 'weitere'), (rng, stufe) => finden(rng, stufe, rng.pick(OTHER_SOLIDS), 'finde-weitere')],
  2: [(rng) => anzahl(rng, rng.pick<SolidKind>(['pyramide', 'prisma']), pickPart(rng)), merkmal],
  3: [(rng) => statementTask(rng, OTHER_STATEMENTS, 'stimmt-weitere'), werWeitere, mehrTeile, (rng) => hiddenParts(rng, rng.pick<SolidKind>(['pyramide', 'prisma']), 'verdeckt-weitere')],
};

export const koerperSkill: SkillDef = {
  ...META,
  title: 'Körper',
  description: 'Du erkennst Würfel, Quader und Kugel.',
  // the page shows this label with extras on and off: what depends on them stays behind "Mit Extras"
  stufen: { 1: 'Würfel, Quader und Kugel. Was rollt, was kippt?', 2: 'Ecken, Kanten und Flächen zählen.', 3: 'Sätze prüfen, verdeckte Teile zählen. Mit Extras: Zylinder, Kegel, Pyramide, Prisma.' },
  kmk: ['RF.koerper'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const pool = stufe < 3 ? FORMS[stufe as 1 | 2][ab] : ctx.extras && rng.chance(0.75) ? OTHER_FORMS[ab] : BOX_FORMS[ab];
    return finish(META, stufe, ab, ab === 3 ? ['RF.koerper', 'PK.argumentieren'] : ['RF.koerper'], rng.pick(pool)(rng, stufe));
  },
};
