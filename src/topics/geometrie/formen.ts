/**
 * Flächenformen: Quadrat, Rechteck, Dreieck, Kreis. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1, four shapes in usual position: AB I name or find; AB II things of daily life, how many of one shape in a row; AB III does the
 * name fit, what is no flat figure, riddles without counting.
 * Stufe 2, turned or thin figures, Ecken and Seiten: AB I name, count; AB II find a turned figure, Ecken of a row; AB III riddles, which
 * figure is missing, how many figures make these Ecken.
 * Stufe 3, Quadrat is also a Rechteck, odd one out: AB I odd one of 4, is this four-cornered figure a Rechteck or a Quadrat; AB II odd one of 5, statements; AB III count the
 * Rechtecke, which is no Rechteck, which sentence holds.
 * A wrong option is never a wider name for the right figure: an option 'Rechteck' is not offered for a Quadrat.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import type { Ab, ChoiceOption, Rng, ShapeKind, SkillDef, Stufe, Visual } from '../../core/types';
import { bugList, makeChoice, targetAb } from '../shared';
import { cap, finish, pictureChoice, pictureStep, rightPicture, twoWay, type Task } from './helpers';

const META = { id: 'geometrie.formen', topicId: 'geometrie' } as const;

const NAME: Partial<Record<ShapeKind, string>> = { quadrat: 'Quadrat', rechteck: 'Rechteck', dreieck: 'Dreieck', 'gleichseitiges-dreieck': 'Dreieck', kreis: 'Kreis' };
const ECKEN: Partial<Record<ShapeKind, number>> = { quadrat: 4, rechteck: 4, dreieck: 3, 'gleichseitiges-dreieck': 3, kreis: 0 };
const nameOf = (s: ShapeKind) => NAME[s] as string;
const eckenOf = (s: ShapeKind) => ECKEN[s] as number;

/** What the drawn figure has, for a worked step. */
const HAS: Record<string, string> = {
  Quadrat: 'Die Figur hat 4 Ecken und 4 gleich lange Seiten.',
  Rechteck: 'Die Figur hat 4 Ecken. 2 Seiten sind länger.',
  Dreieck: 'Die Figur hat 3 Ecken und 3 Seiten.',
  Kreis: 'Die Figur ist ganz rund und hat keine Ecken.',
};

/**
 * What every figure of this name has, when no one figure is meant. No longer Seiten for a Rechteck: a Quadrat is also one (docs §5 `quadrat-rechteck`).
 * No "rechte Ecken" either: the rechter Winkel is out of scope (docs §2.2), and the Ecken already tell a Rechteck from the other pictures.
 */
const ALWAYS: Record<string, string> = {
  Quadrat: 'Ein Quadrat hat 4 Ecken und 4 gleich lange Seiten.',
  Rechteck: 'Ein Rechteck hat 4 Ecken und 4 Seiten.',
  Dreieck: 'Ein Dreieck hat 3 Ecken und 3 Seiten.',
  Kreis: 'Ein Kreis ist ganz rund und hat keine Ecken.',
};

const CORNERS = 'Schau auf die Ecken im Bild.';

/** The wrong names offered for a figure, with the reason. Rechteck is no wrong name for a Quadrat. */
const WRONG_NAMES: Record<string, ChoiceOption[]> = {
  Quadrat: [
    { label: 'Dreieck', whyWrong: `Ein Dreieck hat 3 Ecken. ${CORNERS}` },
    { label: 'Kreis', whyWrong: 'Ein Kreis ist ganz rund. Diese Figur hat Ecken.' },
    { label: 'Würfel', whyWrong: 'Ein Würfel ist ein Körper. Diese Figur ist flach.' },
  ],
  Rechteck: [
    { label: 'Quadrat', whyWrong: 'Bei einem Quadrat sind alle Seiten gleich lang. Schau auf die Seiten.' },
    { label: 'Dreieck', whyWrong: `Ein Dreieck hat 3 Ecken. ${CORNERS}` },
    { label: 'Kreis', whyWrong: 'Ein Kreis ist ganz rund. Diese Figur hat Ecken.' },
    { label: 'Quader', whyWrong: 'Ein Quader ist ein Körper. Diese Figur ist flach.' },
  ],
  Dreieck: [
    { label: 'Quadrat', whyWrong: `Ein Quadrat hat 4 Ecken. ${CORNERS}` },
    { label: 'Rechteck', whyWrong: `Ein Rechteck hat 4 Ecken. ${CORNERS}` },
    { label: 'Kreis', whyWrong: 'Ein Kreis ist ganz rund. Diese Figur hat Ecken.' },
  ],
  Kreis: [
    { label: 'Kugel', whyWrong: 'Eine Kugel ist ein Körper. Diese Figur ist flach.' },
    { label: 'Quadrat', whyWrong: 'Ein Quadrat hat 4 Ecken. Diese Figur hat keine Ecken.' },
    { label: 'Dreieck', whyWrong: 'Ein Dreieck hat 3 Ecken. Diese Figur hat keine Ecken.' },
    { label: 'Rechteck', whyWrong: 'Ein Rechteck hat 4 Ecken. Diese Figur hat keine Ecken.' },
  ],
};

const shuffled = (rng: Rng, stufe: Stufe, right: string, wrong: ChoiceOption[]) =>
  makeChoice(rng, { label: right }, rng.shuffle(wrong), { max: MAX_CHOICE_OPTIONS[stufe] });

/** AB I: "Wie heißt diese Figur?" */
function nennen(rng: Rng, stufe: Stufe): Task {
  const shape = rng.pick<ShapeKind>(['quadrat', 'rechteck', 'dreieck', 'gleichseitiges-dreieck', 'kreis']);
  const name = nameOf(shape);
  const round = shape === 'kreis';
  return {
    // keyed by the figure only: other wrong options do not make it another question
    key: `name:${shape}`,
    prompt: 'Wie heißt diese Figur?',
    visual: { type: 'shape', shape },
    answer: shuffled(rng, stufe, name, WRONG_NAMES[name]),
    hints: ['Hat die Figur Ecken? Wie viele?', round ? 'Ist der Rand überall rund?' : 'Sind alle Seiten gleich lang?'],
    steps: [HAS[name], `Die Figur heißt ${name}.`],
    praise: rng.pick(round ? ['Du hast auf den runden Rand geachtet.', 'Du hast die runde Form erkannt.'] : ['Du hast auf die Ecken geachtet.', 'Du hast die Figur an den Ecken erkannt.']),
  };
}

const ARTICLE: Record<string, string> = { Quadrat: 'ein Quadrat', Rechteck: 'ein Rechteck', Dreieck: 'ein Dreieck', Kreis: 'ein Kreis' };
const FIND_SHAPES: Record<string, ShapeKind> = { Quadrat: 'quadrat', Rechteck: 'rechteck', Dreieck: 'dreieck', Kreis: 'kreis' };

/** The second hint of finding a figure. Quadrat and Rechteck have the same Ecken: the Seiten tell them apart. */
const FIND_HINT: Record<string, string> = {
  Quadrat: 'Bei einem Quadrat sind alle Seiten gleich lang.',
  Rechteck: 'Überlege: Wie viele Ecken hat ein Rechteck?',
  Dreieck: 'Überlege: Wie viele Ecken hat ein Dreieck?',
  Kreis: 'Ein Kreis ist ganz rund.',
};

/** AB I: "Wo ist das Dreieck?" with pictures. */
function finden(rng: Rng, stufe: Stufe): Task {
  const name = rng.pick(['Quadrat', 'Rechteck', 'Dreieck', 'Kreis']);
  const article = name === 'Kreis' ? 'der' : 'das';
  // a Quadrat is also a Rechteck: it is no wrong picture when a Rechteck is asked for
  const others = Object.keys(FIND_SHAPES).filter((n) => n !== name && !(name === 'Rechteck' && n === 'Quadrat'));
  const answer = pictureChoice(
    rng,
    { type: 'shape', shape: FIND_SHAPES[name] },
    others.map((n) => ({ visual: { type: 'shape', shape: FIND_SHAPES[n] }, whyWrong: `Diese Figur ist ${ARTICLE[n]}.` })),
    MAX_CHOICE_OPTIONS[stufe],
  );
  return {
    key: `finde:${name}`,
    prompt: `Wo ist ${article} ${name}?`,
    answer,
    hints: ['Schau jede Figur an: Wie viele Ecken hat diese Figur?', FIND_HINT[name]],
    steps: [ALWAYS[name], pictureStep(answer, `Das ist ${rightPicture(answer)}.`)],
    praise: rng.pick(['Du hast jede Figur genau angeschaut.', 'Du hast die Figur an der Form erkannt.']),
  };
}

interface Turn {
  shape: ShapeKind;
  rotate?: number;
  thin?: boolean;
}

const TURNS: Turn[] = [
  ...[20, 30, 45, 60].map((rotate) => ({ shape: 'quadrat' as ShapeKind, rotate })),
  ...[30, 45, 90, 135].map((rotate) => ({ shape: 'rechteck' as ShapeKind, rotate })),
  ...[0, 30, 90].map((rotate) => ({ shape: 'rechteck' as ShapeKind, rotate, thin: true })),
  ...[30, 90, 180].map((rotate) => ({ shape: 'dreieck' as ShapeKind, rotate })),
  ...[0, 90, 180].map((rotate) => ({ shape: 'dreieck' as ShapeKind, rotate, thin: true })),
  ...[30, 90, 180].map((rotate) => ({ shape: 'gleichseitiges-dreieck' as ShapeKind, rotate })),
];

function drawn(t: Turn, named?: boolean): Visual {
  return { type: 'shape', shape: t.shape, ...(t.rotate ? { rotate: t.rotate } : {}), ...(t.thin ? { thin: true } : {}), ...(named ? { named } : {}) };
}

/** Docs §5 `lage-der-figur`: why it stays the same figure after turning. */
const STILL: Record<string, string> = {
  Quadrat: 'Dreh das Bild im Kopf: Alle Seiten sind gleich lang.',
  Rechteck: 'Dreh das Bild im Kopf: Die Figur hat 4 Ecken.',
  Dreieck: 'Dreh das Bild im Kopf: Die Figur hat 3 Ecken.',
};

/** AB II: a turned or thin figure keeps its name. A thin figure in usual position is not turned: its texts do not speak of turning. */
function gedreht(rng: Rng): Task {
  const t = rng.pick(TURNS);
  const name = nameOf(t.shape);
  const turned = !!t.rotate;
  const why = turned ? STILL[name] : `Schau auf die Ecken: Die Figur hat ${eckenOf(t.shape)} Ecken.`;
  const wrong = [...WRONG_NAMES[name].filter((o) => o.label !== 'Kreis' && o.label !== 'Quader' && o.label !== 'Würfel'), { label: 'Keine von diesen', whyWrong: why }];
  return {
    key: `gedreht:${t.shape}:${t.thin ? 'd' : ''}${t.rotate ?? 0}`,
    prompt: 'Wie heißt diese Figur?',
    visual: drawn(t),
    answer: makeChoice(rng, { label: name }, wrong, { order: ['Quadrat', 'Rechteck', 'Dreieck', 'Keine von diesen'] }),
    hints: turned ? ['Dreh das Bild im Kopf.', 'Die Lage ändert die Figur nicht. Schau auf Ecken und Seiten.'] : ['Schau auf die Ecken und auf die Seiten.', 'Auch eine schmale Figur behält ihren Namen.'],
    steps: [turned ? 'Dreh die Figur im Kopf gerade.' : 'Diese Figur ist schmal.', HAS[name], `Die Figur heißt ${name}.`],
    praise: rng.pick([turned ? 'Du hast die Figur auch gedreht erkannt.' : 'Du hast die Figur auch schmal erkannt.', 'Du hast auf Ecken und Seiten geachtet.']),
  };
}

/** AB II: count Ecken or Seiten of one figure. */
function zaehlen(rng: Rng): Task {
  const circle = rng.chance(0.15);
  const t: Turn = circle ? { shape: 'kreis' } : rng.pick(TURNS);
  const part = circle || rng.chance(0.5) ? 'Ecken' : 'Seiten';
  const n = eckenOf(t.shape);
  return {
    key: `zaehlen:${part}:${t.shape}:${t.thin ? 'd' : ''}${t.rotate ?? 0}`,
    prompt: `Wie viele ${part} hat diese Figur?`,
    // Named: the description of the drawing says how many corners it has.
    visual: drawn(t, true),
    answer: { kind: 'number', value: n, unit: part },
    bugs: bugList(n, [['kreis-ecke', circle ? 1 : null, 'Ein Kreis ist ganz rund: Ein Kreis hat keine Ecke.']]),
    hints: circle ? ['Ist die Figur überall rund?', 'Eine Ecke ist eine Spitze am Rand.'] : [`Fahr mit dem Finger um die Figur und zeig jede ${part === 'Ecken' ? 'Ecke' : 'Seite'}.`, t.rotate ? 'Die Lage ändert die Zahl nicht.' : 'Auch bei einer schmalen Figur bleibt die Zahl gleich.'],
    steps: circle
      ? ['Die Figur ist ganz rund.', 'Der Kreis hat 0 Ecken.']
      : ['Fahr einmal um die Figur.', `Die Figur hat ${n} ${part}.`],
    praise: circle ? 'Du hast an den runden Rand gedacht.' : rng.pick(['Du hast die Figur genau angeschaut.', `Du hast jede ${part === 'Ecken' ? 'Ecke' : 'Seite'} einmal gezählt.`]),
  };
}

/** AB II on Stufe 2: Ecken of a row of figures together. */
function eckenZusammen(rng: Rng): Task {
  const count = rng.int(2, 3);
  const pool: ShapeKind[] = ['quadrat', 'dreieck', 'rechteck', 'kreis', 'gleichseitiges-dreieck'];
  const shapes = rng.sample(pool, count);
  const ecken = shapes.map(eckenOf);
  const sum = ecken.reduce((a, b) => a + b, 0);
  const hasCircle = shapes.includes('kreis');
  const parts = shapes.map((s) => `${nameOf(s)}: ${eckenOf(s)} Ecken.`).join(' ');
  return {
    key: `zusammen:${[...shapes].sort().join('+')}`,
    prompt: 'Wie viele Ecken haben diese Figuren zusammen?',
    visual: { type: 'shapeRow', items: shapes.map((shape) => ({ shape })) },
    answer: { kind: 'number', value: sum, unit: 'Ecken' },
    bugs: bugList(sum, [
      ...ecken.map((e): [string, number, string] => ['nur-eine-figur', e, 'Rechne die Ecken aller Figuren zusammen.']),
      ['figuren-gezaehlt', count, 'Gefragt sind die Ecken, nicht die Figuren.'],
      ['kreis-ecke', hasCircle ? sum + 1 : null, 'Ein Kreis ist ganz rund: Ein Kreis hat keine Ecke.'],
    ]),
    hints: ['Schau jede Figur einzeln an.', 'Rechne dann alle Ecken zusammen.'],
    steps: [parts, `${ecken.join(' + ')} = ${sum} Ecken`],
    praise: rng.pick(['Du hast alle Figuren mitgerechnet.', 'Du hast Figur für Figur gerechnet.']),
  };
}

/** Things of daily life with one clear form. No window: a window can be a Quadrat or a Rechteck. */
const THINGS: { text: string; name: string }[] = [
  { text: 'eine Münze', name: 'Kreis' }, { text: 'ein Teller', name: 'Kreis' }, { text: 'ein Knopf', name: 'Kreis' },
  { text: 'eine Postkarte', name: 'Rechteck' }, { text: 'eine Tafel', name: 'Rechteck' }, { text: 'ein Schulheft', name: 'Rechteck' },
  { text: 'ein Kästchen im Heft', name: 'Quadrat' }, { text: 'ein Feld beim Schach', name: 'Quadrat' },
  { text: 'ein Stück Pizza', name: 'Dreieck' }, { text: 'ein Zelt von vorne', name: 'Dreieck' },
];

/** AB II on Stufe 1: the form of a thing. A Quadrat is also a Rechteck, so Rechteck is no wrong option for a Quadrat. */
function alltag(rng: Rng, stufe: Stufe): Task {
  const i = rng.int(0, THINGS.length - 1);
  const t = THINGS[i];
  const others = ['Quadrat', 'Rechteck', 'Dreieck', 'Kreis'].filter((n) => n !== t.name && !(t.name === 'Quadrat' && n === 'Rechteck'));
  return {
    key: `alltag:${i}`,
    prompt: `Welche Form hat ${t.text}?`,
    answer: shuffled(rng, stufe, t.name, others.map((label) => ({ label, whyWrong: label === 'Quadrat' ? 'Bei einem Quadrat sind alle Seiten gleich lang.' : ALWAYS[label] }))),
    hints: ['Stell dir das Ding genau vor.', 'Ist das Ding rund? Oder hat das Ding Ecken?'],
    steps: [ALWAYS[t.name], `Das passt: ${t.name}.`],
    praise: rng.pick(['Du hast dir die Form genau vorgestellt.', 'Du hast Ding und Form verglichen.']),
  };
}

const PLURAL: Record<string, string> = { Quadrat: 'Quadrate', Rechteck: 'Rechtecke', Dreieck: 'Dreiecke', Kreis: 'Kreise' };

/** A row with n of the wanted figures, shuffled: the rest comes from `others`. */
function rowWith(rng: Rng, wanted: ShapeKind, n: number, others: readonly ShapeKind[], size: number): ShapeKind[] {
  return rng.shuffle([...Array<ShapeKind>(n).fill(wanted), ...Array.from({ length: size - n }, () => rng.pick(others))]);
}

/** AB II on Stufe 1: how many of one shape? Not Rechtecke: a Quadrat is also one, and that is Stufe 3. */
function wieviele(rng: Rng): Task {
  const name = rng.pick(['Kreis', 'Dreieck', 'Quadrat']);
  const wanted = FIND_SHAPES[name];
  const n = rng.int(1, 3);
  const size = rng.int(4, 5);
  const row = rowWith(rng, wanted, n, (['quadrat', 'rechteck', 'dreieck', 'kreis'] as ShapeKind[]).filter((s) => s !== wanted), size);
  const pl = PLURAL[name];
  return {
    key: `wieviele:${name}:${row.join('-')}`,
    prompt: `Wie viele ${pl} siehst du?`,
    visual: { type: 'shapeRow', items: row.map((shape) => ({ shape })) },
    answer: { kind: 'number', value: n },
    bugs: bugList(n, [['figuren-gezaehlt', size, `Das sind alle Figuren. Gefragt sind nur die ${pl}.`]]),
    hints: [`Schau jede Figur an: Ist das ${ARTICLE[name]}?`, FIND_HINT[name]],
    steps: [ALWAYS[name], `Es ${n === 1 ? `ist 1 ${name}` : `sind ${n} ${pl}`}.`],
    praise: rng.pick(['Du hast jede Figur einzeln angeschaut.', `Du hast nur auf die ${pl} geachtet.`]),
  };
}

const USUAL: ShapeKind[] = ['quadrat', 'rechteck', 'dreieck', 'gleichseitiges-dreieck', 'kreis'];

/** AB III on Stufe 1: does the name fit the picture? A Quadrat is also a Rechteck: that name is never claimed for a Quadrat. */
function heisst(rng: Rng): Task {
  const shape = rng.pick(USUAL);
  const name = nameOf(shape);
  const isTrue = rng.chance(0.5);
  const others = ['Quadrat', 'Rechteck', 'Dreieck', 'Kreis'].filter((n) => n !== name && !(name === 'Quadrat' && n === 'Rechteck'));
  const claim = isTrue ? name : rng.pick(others);
  return {
    key: `heisst:${shape}:${claim}`,
    prompt: `Diese Figur heißt ${claim}. Stimmt das?`,
    visual: { type: 'shape', shape },
    answer: twoWay('Stimmt', 'Stimmt nicht', isTrue, isTrue ? HAS[name] : ALWAYS[claim]),
    hints: ['Schau auf die Figur: Ist der Rand rund, oder gibt es Ecken?', `Überlege: Wie sieht ${ARTICLE[claim]} aus?`],
    steps: [HAS[name], `Die Figur heißt ${name}.`, isTrue ? 'Das stimmt.' : FALSE_STATEMENT],
    praise: rng.pick(['Du hast Name und Bild verglichen.', 'Du hast den Namen an der Figur geprüft.']),
  };
}

const NO_FIGURE: { label: string; why: string }[] = [
  { label: 'Würfel', why: 'Ein Würfel ist ein Körper, wie ein Spielwürfel.' },
  { label: 'Kugel', why: 'Eine Kugel ist ein Körper, wie ein Ball.' },
  { label: 'Quader', why: 'Ein Quader ist ein Körper, wie ein Schuhkarton.' },
];

/** AB III on Stufe 1: what is not a flat figure? */
function keineFigur(rng: Rng, stufe: Stufe): Task {
  const right = rng.pick(NO_FIGURE);
  const names = rng.sample(['Quadrat', 'Rechteck', 'Dreieck', 'Kreis'], 3);
  return {
    key: `keine:${right.label}:${[...names].sort().join('-')}`,
    prompt: 'Was ist keine flache Figur?',
    answer: shuffled(rng, stufe, right.label, names.map((label) => ({ label, whyWrong: `${cap(ARTICLE[label])} ist eine flache Figur.` }))),
    hints: ['Stell dir jedes Wort als Bild vor.', 'Eine flache Figur passt ganz auf ein Blatt.'],
    steps: [`${names.join(', ')}: Das sind flache Figuren.`, right.why],
    praise: rng.pick(['Du hast flache Figuren und Körper getrennt.', 'Du hast jedes Wort genau geprüft.']),
  };
}

/** AB III on Stufe 1: riddles without the counting of Stufe 2. Each clue has two sentences for the two hints. */
const WORD_RIDDLES: { clue: string; right: string; wrong: ChoiceOption[] }[] = [
  {
    clue: 'Ich bin flach. Ich bin ganz rund.', right: 'Kreis',
    wrong: [{ label: 'Kugel', whyWrong: 'Eine Kugel ist rund, aber nicht flach.' }, { label: 'Dreieck', whyWrong: 'Ein Dreieck hat Ecken.' }, { label: 'Quadrat', whyWrong: 'Ein Quadrat hat Ecken.' }],
  },
  {
    clue: 'Ich habe Ecken. Alle Seiten sind gleich lang.', right: 'Quadrat',
    wrong: [{ label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken.' }, { label: 'Würfel', whyWrong: 'Ein Würfel ist keine flache Figur.' }],
  },
  {
    clue: 'Ich habe Ecken. Manche Seiten sind länger.', right: 'Rechteck',
    wrong: [{ label: 'Quadrat', whyWrong: 'Bei einem Quadrat sind alle Seiten gleich lang.' }, { label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken.' }],
  },
  {
    clue: 'Ich habe Spitzen. Ich habe weniger Ecken als Quadrate.', right: 'Dreieck',
    wrong: [{ label: 'Rechteck', whyWrong: 'Ein Rechteck hat genauso viele Ecken wie ein Quadrat.' }, { label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken.' }],
  },
];

function wortRaetsel(rng: Rng, stufe: Stufe): Task {
  const i = rng.int(0, WORD_RIDDLES.length - 1);
  const r = WORD_RIDDLES[i];
  return {
    key: `raetsel:${i}`,
    prompt: `${r.clue} Wer bin ich?`,
    answer: shuffled(rng, stufe, r.right, r.wrong),
    hints: ['Prüfe jede Figur mit dem ersten Satz.', 'Prüfe dann mit dem zweiten Satz.'],
    steps: [ALWAYS[r.right], `Die Figur heißt ${r.right}.`],
    praise: rng.pick(['Du hast beide Sätze geprüft.', 'Du hast die Sätze mit den Figuren verglichen.']),
  };
}

/** AB II on Stufe 2: find a named figure among turned and thin ones. */
function gedrehtFinden(rng: Rng): Task {
  const name = rng.pick(['Quadrat', 'Rechteck', 'Dreieck']);
  const ofName = (n: string) => TURNS.filter((t) => t.rotate && nameOf(t.shape) === n);
  const right = rng.pick(ofName(name));
  const wrong = (name === 'Quadrat' ? ['Rechteck', 'Dreieck'] : name === 'Rechteck' ? ['Dreieck'] : ['Quadrat', 'Rechteck']).flatMap((n) => rng.sample(ofName(n), n === 'Dreieck' && name === 'Rechteck' ? 2 : 1));
  const answer = pictureChoice(
    rng,
    drawn(right),
    [...wrong.map((t) => ({ visual: drawn(t), whyWrong: `Diese Figur hat ${eckenOf(t.shape)} Ecken.${nameOf(t.shape) === 'Rechteck' && name === 'Quadrat' ? ' 2 Seiten sind länger.' : ''}` })), { visual: { type: 'shape', shape: 'kreis' } as Visual, whyWrong: 'Diese Figur ist ganz rund.' }],
    MAX_CHOICE_OPTIONS[2],
  );
  return {
    key: `dreh-finde:${name}:${right.shape}:${right.thin ? 'd' : ''}${right.rotate}:${wrong.map((t) => `${t.shape}${t.rotate}`).sort().join('-')}`,
    prompt: `Wo ist das ${name}?`,
    answer,
    hints: ['Dreh jedes Bild im Kopf.', 'Die Lage ändert die Figur nicht. Schau auf Ecken und Seiten.'],
    steps: [ALWAYS[name], pictureStep(answer, `Das ist ${rightPicture(answer)}.`)],
    praise: rng.pick(['Du hast die Figur auch gedreht erkannt.', 'Du hast jedes Bild im Kopf gedreht.']),
  };
}

const CORNER_OPTIONS: { label: string; n: number }[] = [{ label: 'Quadrat', n: 4 }, { label: 'Dreieck', n: 3 }, { label: 'Kreis', n: 0 }];

/** AB III on Stufe 2, the other way round: from the Ecken to the figure. Each option has its own number of Ecken: a Rechteck would also fit a Quadrat. */
function figurFehlt(rng: Rng): Task {
  const known = rng.pick(['Quadrat', 'Rechteck', 'Dreieck']);
  const k = known === 'Dreieck' ? 3 : 4;
  // never the figure of the task: the answer would stand in the sentence
  const other = rng.pick(CORNER_OPTIONS.filter((o) => o.label !== known));
  const total = k + other.n;
  return {
    key: `fehlt:${known}:${other.label}`,
    context: `${cap(ARTICLE[known])} und noch eine Figur haben zusammen ${total} Ecken.`,
    prompt: 'Wie heißt die andere Figur?',
    answer: makeChoice(rng, { label: other.label }, CORNER_OPTIONS.filter((o) => o !== other).map((o) => ({ label: o.label, whyWrong: `Dann sind es zusammen ${k + o.n} Ecken.` })), { order: CORNER_OPTIONS.map((o) => o.label) }),
    hints: [`Wie viele Ecken hat ${ARTICLE[known]}?`, 'Wie viele Ecken fehlen dann noch?'],
    steps: [`${cap(ARTICLE[known])} hat ${k} Ecken.`, `${k} + ${other.n} = ${total}`, `Die andere Figur hat ${other.n === 0 ? 'keine' : other.n} Ecken: ${other.label}.`],
    praise: rng.pick(['Du hast von den Ecken zur Figur gedacht.', 'Du hast die fehlenden Ecken gefunden.']),
  };
}

/** AB III on Stufe 2, the other way round: from the Ecken to the number of figures. */
function figurenAnzahl(rng: Rng): Task {
  const name = rng.pick(['Dreieck', 'Quadrat', 'Rechteck']);
  const k = name === 'Dreieck' ? 3 : 4;
  const n = rng.int(2, 5);
  const total = n * k;
  const pl = PLURAL[name];
  return {
    key: `figuren-anzahl:${name}:${n}`,
    context: `Alle Figuren sind ${pl}. Zusammen haben die Figuren ${total} Ecken.`,
    prompt: `Wie viele ${pl} sind es?`,
    answer: { kind: 'number', value: n },
    bugs: bugList(n, [['figuren-gezaehlt', total, 'Das sind die Ecken. Gefragt sind die Figuren.'], ['nur-eine-figur', k, 'Das sind die Ecken von 1 Figur. Wie viele Figuren sind es?']]),
    hints: [`Wie viele Ecken hat ${ARTICLE[name]}?`, 'Rechne immer weiter, bis alle Ecken da sind.'],
    steps: [`${cap(ARTICLE[name])} hat ${k} Ecken.`, `${Array<number>(n).fill(k).join(' + ')} = ${total}`, `Es sind ${n} ${pl}.`],
    praise: rng.pick(['Du hast von den Ecken her gedacht.', 'Du hast die Ecken in Gruppen eingeteilt.']),
  };
}

const QUADRAT: Visual = { type: 'shape', shape: 'quadrat' };

/** Says which sentence: right after a true fact, "Der Satz stimmt nicht" alone reads as if that fact did not hold. */
const FALSE_STATEMENT = 'Der Satz in der Aufgabe stimmt nicht.';

/** "Rechte Ecken" only for the bug of docs §5 `quadrat-rechteck`, and said with an example: elsewhere "rechts" means the right-hand side. */
const RIGHT_CORNERS = 'Ein Rechteck hat 4 rechte Ecken, wie ein Blatt Papier.';

/**
 * AB III: statements. Docs §5 `quadrat-rechteck`, `lage-der-figur`. No sentence with "kein" or "keine": "Stimmt das?" on it makes a double negative (T9).
 */
const STATEMENTS: { text: string; isTrue: boolean; whyWrong: string; steps: string[]; visual?: Visual }[] = [
  {
    text: 'Ein Quadrat ist auch ein Rechteck.', isTrue: true, visual: QUADRAT,
    whyWrong: 'Ein Quadrat hat auch 4 rechte Ecken. Das reicht für ein Rechteck.',
    steps: [RIGHT_CORNERS, 'Ein Quadrat hat auch 4 rechte Ecken.', 'Ein Quadrat ist auch ein Rechteck: Das stimmt.'],
  },
  {
    text: 'Jedes Rechteck ist ein Quadrat.', isTrue: false, visual: { type: 'shape', shape: 'rechteck' },
    whyWrong: 'Schau auf das Bild: Sind alle Seiten gleich lang?',
    steps: ['Bei einem Quadrat sind alle Seiten gleich lang.', 'Ein Rechteck kann 2 längere Seiten haben.', FALSE_STATEMENT],
  },
  {
    text: 'Ein gedrehtes Quadrat bleibt ein Quadrat.', isTrue: true, visual: { type: 'shape', shape: 'quadrat', rotate: 45 },
    whyWrong: 'Dreh das Bild im Kopf: Alle Seiten sind gleich lang.',
    steps: ['Dreh die Figur im Kopf gerade.', 'Alle Seiten sind gleich lang.', 'Das stimmt.'],
  },
  {
    text: 'Quadrat und Rechteck haben gleich viele Ecken.', isTrue: true,
    whyWrong: 'Denk bei beiden Figuren an die Ecken. Vergleiche dann.',
    steps: ['Ein Quadrat hat 4 Ecken.', 'Ein Rechteck hat auch 4 Ecken.', 'Das stimmt.'],
  },
  {
    text: 'Ein Kreis hat 1 Ecke.', isTrue: false, visual: { type: 'shape', shape: 'kreis' },
    whyWrong: 'Schau auf das Bild: Gibt es eine Spitze am Rand?',
    steps: ['Ein Kreis ist überall rund.', 'Ein Kreis hat keine Spitze.', FALSE_STATEMENT],
  },
  {
    text: 'Ein gedrehtes Rechteck hat mehr Ecken.', isTrue: false, visual: { type: 'shape', shape: 'rechteck', rotate: 30 },
    whyWrong: 'Dreh das Bild im Kopf: Die Figur hat 4 Ecken.',
    steps: ['Dreh die Figur im Kopf gerade.', 'Die Figur hat immer noch 4 Ecken.', FALSE_STATEMENT],
  },
  {
    text: 'Ein Dreieck hat immer gleich lange Seiten.', isTrue: false, visual: { type: 'shape', shape: 'dreieck' },
    whyWrong: 'Schau auf das Bild: Sind alle Seiten gleich lang?',
    steps: ['Dieses Dreieck hat 3 Seiten.', 'Die Seiten sind verschieden lang.', FALSE_STATEMENT],
  },
];

function stimmt(rng: Rng): Task {
  const i = rng.int(0, STATEMENTS.length - 1);
  const s = STATEMENTS[i];
  return {
    key: `stimmt:${i}`,
    prompt: `${s.text} Stimmt das?`,
    ...(s.visual ? { visual: s.visual } : {}),
    answer: twoWay('Stimmt', 'Stimmt nicht', s.isTrue, s.whyWrong),
    hints: ['Denk an die Ecken und an die Seiten.', 'Prüfe den Satz an einem Bild im Kopf.'],
    steps: s.steps,
    praise: rng.pick(['Du hast den Satz genau geprüft.', 'Du hast den Satz an einer Figur geprüft.']),
  };
}

/** Each clue has two sentences: the hints of wer() send the child through the first and then the second. */
const RIDDLES: { clue: string; right: string; wrong: ChoiceOption[]; steps: string }[] = [
  {
    clue: 'Ich habe 4 Ecken. Alle Seiten sind gleich lang.', right: 'Quadrat', steps: 'Bei einem Quadrat sind alle 4 Seiten gleich lang.',
    wrong: [{ label: 'Dreieck', whyWrong: 'Ein Dreieck hat 3 Ecken.' }, { label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken.' }, { label: 'Würfel', whyWrong: 'Ein Würfel ist ein Körper. Hier geht es um Figuren.' }],
  },
  {
    clue: 'Ich habe 4 Ecken. 2 Seiten sind länger.', right: 'Rechteck', steps: 'Bei diesem Rechteck sind 2 Seiten länger.',
    wrong: [{ label: 'Quadrat', whyWrong: 'Bei einem Quadrat sind alle Seiten gleich lang.' }, { label: 'Dreieck', whyWrong: 'Ein Dreieck hat 3 Ecken.' }, { label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken.' }],
  },
  {
    clue: 'Ich habe keine Ecken. Ich bin flach und rund.', right: 'Kreis', steps: 'Ein Kreis ist flach, rund und ohne Ecken.',
    wrong: [{ label: 'Kugel', whyWrong: 'Eine Kugel ist rund, aber nicht flach.' }, { label: 'Dreieck', whyWrong: 'Ein Dreieck hat 3 Ecken.' }, { label: 'Quadrat', whyWrong: 'Ein Quadrat hat 4 Ecken.' }],
  },
  {
    clue: 'Ich habe 3 Ecken. Ich habe 3 Seiten.', right: 'Dreieck', steps: 'Ein Dreieck hat 3 Ecken und 3 Seiten.',
    wrong: [{ label: 'Quadrat', whyWrong: 'Ein Quadrat hat 4 Ecken.' }, { label: 'Rechteck', whyWrong: 'Ein Rechteck hat 4 Ecken.' }, { label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken.' }],
  },
];

function wer(rng: Rng, stufe: Stufe): Task {
  const i = rng.int(0, RIDDLES.length - 1);
  const r = RIDDLES[i];
  return {
    key: `wer:${i}`,
    prompt: `${r.clue} Wer bin ich?`,
    answer: shuffled(rng, stufe, r.right, r.wrong),
    hints: ['Prüfe jede Figur mit dem ersten Satz.', 'Prüfe dann mit dem zweiten Satz.'],
    steps: [r.steps, `Die Figur heißt ${r.right}.`],
    praise: rng.pick(['Du hast alle Hinweise geprüft.', 'Du hast die Hinweise mit den Figuren verglichen.']),
  };
}

/** AB I and AB II on Stufe 3: odd one out, of four pictures in usual position or turned, of five with the turned ones always possible. */
function passtNicht(rng: Rng, size: 4 | 5): Task {
  const VIERECKE: Visual[] = [
    { type: 'shape', shape: 'quadrat' }, { type: 'shape', shape: 'rechteck' }, { type: 'shape', shape: 'rechteck', thin: true },
    { type: 'shape', shape: 'quadrat', rotate: 45 }, { type: 'shape', shape: 'rechteck', rotate: 30 },
  ];
  const DREIECKE: Visual[] = [
    { type: 'shape', shape: 'dreieck' }, { type: 'shape', shape: 'gleichseitiges-dreieck' }, { type: 'shape', shape: 'dreieck', thin: true },
    { type: 'shape', shape: 'gleichseitiges-dreieck', rotate: 180 }, { type: 'shape', shape: 'dreieck', rotate: 90 },
  ];
  const sets = [
    { same: VIERECKE, n: 4, odd: { type: 'shape', shape: 'dreieck' } as Visual, oddText: 'hat 3 Ecken', id: 'vier-drei' },
    { same: VIERECKE, n: 4, odd: { type: 'shape', shape: 'kreis' } as Visual, oddText: 'hat keine Ecken', id: 'vier-kreis' },
    { same: DREIECKE, n: 3, odd: { type: 'shape', shape: 'quadrat' } as Visual, oddText: 'hat 4 Ecken', id: 'drei-vier' },
    { same: DREIECKE, n: 3, odd: { type: 'shape', shape: 'rechteck', rotate: 45 } as Visual, oddText: 'hat 4 Ecken', id: 'drei-gedreht' },
    { same: DREIECKE, n: 3, odd: { type: 'shape', shape: 'kreis' } as Visual, oddText: 'hat keine Ecken', id: 'drei-kreis' },
  ];
  const set = rng.pick(sets);
  const picked = rng.sample(size === 4 ? [0, 1, 2, 3] : [0, 1, 2, 3, 4], size - 1).sort();
  const same = picked.map((i) => set.same[i]);
  const answer = pictureChoice(rng, set.odd, same.map((visual) => ({ visual, whyWrong: `Diese Figur hat ${set.n} Ecken. Das haben noch mehr Figuren.` })), size);
  return {
    key: `passt:${set.id}:${picked.join('')}`,
    prompt: 'Welche Figur passt nicht zu den anderen?',
    answer,
    hints: ['Schau bei jeder Figur auf die Ecken.', 'Drehen oder Strecken ändert die Zahl der Ecken nicht.'],
    steps: [`${size - 1} Figuren haben ${set.n} Ecken.`, `${rightPicture(answer)} ${set.oddText}.`, pictureStep(answer, `${rightPicture(answer)} passt nicht.`)],
    praise: rng.pick(['Du hast die Ecken aller Figuren verglichen.', 'Du hast nach der gleichen Regel geprüft.']),
  };
}

const RECHTECK_FIGURES: { v: Visual; square: boolean; id: string }[] = [
  { v: { type: 'shape', shape: 'quadrat' }, square: true, id: 'quadrat' },
  { v: { type: 'shape', shape: 'quadrat', rotate: 45 }, square: true, id: 'quadrat45' },
  { v: { type: 'shape', shape: 'rechteck' }, square: false, id: 'rechteck' },
  { v: { type: 'shape', shape: 'rechteck', thin: true }, square: false, id: 'schmal' },
  { v: { type: 'shape', shape: 'rechteck', rotate: 30 }, square: false, id: 'rechteck30' },
];

/**
 * AB I on Stufe 3: is this four-cornered figure a Rechteck, or a Quadrat? A Quadrat is a Rechteck, also when turned; a Rechteck with longer Seiten is no Quadrat.
 * No Kreis or Dreieck here: two options and a figure plainly of another kind would be easier than Stufe 1.
 */
function istRechteck(rng: Rng): Task {
  const c = rng.pick(RECHTECK_FIGURES);
  // the catch of this Stufe: a Quadrat asked as a Rechteck, more often than the plain cases
  const asked = c.square && rng.chance(0.7) ? 'Rechteck' : rng.pick(['Rechteck', 'Quadrat']);
  const yes = asked === 'Rechteck' || c.square;
  const why = !yes
    ? 'Bei einem Quadrat sind alle Seiten gleich lang.'
    : c.square && asked === 'Rechteck'
      ? 'Ein Quadrat ist auch ein Rechteck. Denk an die Ecken.'
      : asked === 'Quadrat'
        ? 'Bei dieser Figur sind alle Seiten gleich lang.'
        : 'Diese Figur hat 4 Ecken wie ein Blatt Papier.';
  return {
    key: `ist-rechteck:${asked}:${c.id}`,
    prompt: `Ist diese Figur ein ${asked}?`,
    visual: c.v,
    answer: twoWay('Ja', 'Nein', yes, why),
    hints: asked === 'Rechteck' ? ['Sieh dir die Ecken an.', 'Passt ein Blatt Papier genau in jede Ecke?'] : ['Sieh dir die Seiten an.', 'Sind alle 4 Seiten gleich lang?'],
    steps: asked === 'Rechteck'
      ? ['Die Figur hat 4 Ecken wie ein Blatt Papier.', 'Ja, die Figur ist ein Rechteck.']
      : [c.square ? 'Alle 4 Seiten sind gleich lang.' : '2 Seiten sind länger.', yes ? 'Ja, die Figur ist ein Quadrat.' : 'Nein, die Figur ist kein Quadrat.'],
    praise: rng.pick([asked === 'Rechteck' ? 'Du hast auf die Ecken geachtet.' : 'Du hast auf die Seiten geachtet.', 'Du hast die Figur genau geprüft.']),
  };
}

/** AB III on Stufe 3: how many Rechtecke? The Quadrate count too. */
function rechteckeZaehlen(rng: Rng): Task {
  const squares = rng.int(1, 2);
  const rects = rng.int(1, 2);
  const others = rng.int(1, 2);
  const row = rng.shuffle<ShapeKind>([...Array<ShapeKind>(squares).fill('quadrat'), ...Array<ShapeKind>(rects).fill('rechteck'), ...Array.from({ length: others }, () => rng.pick<ShapeKind>(['dreieck', 'kreis']))]);
  const n = squares + rects;
  return {
    key: `rechtecke:${row.join('-')}`,
    prompt: 'Wie viele Rechtecke siehst du?',
    visual: { type: 'shapeRow', items: row.map((shape) => ({ shape })) },
    answer: { kind: 'number', value: n },
    bugs: bugList(n, [
      ['quadrat-vergessen', rects, 'Ein Quadrat ist auch ein Rechteck. Zähle auch die Quadrate.'],
      ['figuren-gezaehlt', row.length, 'Das sind alle Figuren. Gefragt sind nur die Rechtecke.'],
    ]),
    hints: ['Ein Rechteck hat 4 Ecken wie ein Blatt Papier.', 'Prüfe jede Figur mit 4 Ecken.'],
    steps: [`Figuren mit längeren Seiten: ${rects}. Quadrate: ${squares}.`, `${rects} + ${squares} = ${n}`, `Es sind ${n} Rechtecke.`],
    praise: rng.pick(['Du hast auch die Quadrate mitgezählt.', 'Du weißt: Auch ein Quadrat ist ein Rechteck.']),
  };
}

/** AB III on Stufe 3: which is no Rechteck? There is always a Quadrat among the pictures: that is the catch. */
function keinRechteck(rng: Rng): Task {
  const more: Visual[] = [
    { type: 'shape', shape: 'rechteck' }, { type: 'shape', shape: 'rechteck', thin: true }, { type: 'shape', shape: 'rechteck', rotate: 30 },
    { type: 'shape', shape: 'rechteck', rotate: 90 }, { type: 'shape', shape: 'quadrat', rotate: 45 },
  ];
  const odd = rng.pick<Visual>([{ type: 'shape', shape: 'dreieck' }, { type: 'shape', shape: 'kreis' }, { type: 'shape', shape: 'gleichseitiges-dreieck', rotate: 180 }, { type: 'shape', shape: 'dreieck', thin: true }]);
  const picked = rng.sample([0, 1, 2, 3, 4], 3).sort();
  const answer = pictureChoice(
    rng,
    odd,
    [{ visual: QUADRAT, whyWrong: 'Ein Quadrat ist auch ein Rechteck.' }, ...picked.map((i) => ({ visual: more[i], whyWrong: i === 4 ? 'Ein Quadrat ist auch ein Rechteck.' : 'Diese Figur hat 4 Ecken wie ein Blatt Papier.' }))],
    5,
  );
  const oddShape = (odd as Extract<Visual, { type: 'shape' }>).shape;
  return {
    key: `kein-rechteck:${oddShape}:${picked.join('')}`,
    prompt: 'Welche Figur ist kein Rechteck?',
    answer,
    hints: ['Ein Quadrat ist auch ein Rechteck.', 'Schau bei jeder Figur auf die Ecken.'],
    steps: ['Ein Rechteck hat 4 Ecken wie ein Blatt Papier.', `${rightPicture(answer)} hat ${eckenOf(oddShape) === 0 ? 'keine' : eckenOf(oddShape)} Ecken.`, pictureStep(answer, `${rightPicture(answer)} ist kein Rechteck.`)],
    praise: rng.pick(['Du hast dich vom Quadrat nicht täuschen lassen.', 'Du hast jede Figur genau geprüft.']),
  };
}

const NOT_SQUARE = 'Ein Rechteck kann 2 längere Seiten haben.';
const SQUARE_TOO = 'Ein Quadrat hat 4 Ecken wie ein Blatt Papier.';

const SENTENCES: { right: string; why: string; wrong: ChoiceOption[] }[] = [
  {
    right: 'Jedes Quadrat ist ein Rechteck.', why: SQUARE_TOO,
    wrong: [{ label: 'Jedes Rechteck ist ein Quadrat.', whyWrong: NOT_SQUARE }, { label: 'Ein Quadrat hat 3 Ecken.', whyWrong: ALWAYS.Quadrat }, { label: 'Ein Rechteck hat keine Ecken.', whyWrong: ALWAYS.Rechteck }],
  },
  {
    right: 'Ein gedrehtes Quadrat bleibt ein Quadrat.', why: 'Die Lage ändert die Figur nicht.',
    wrong: [{ label: 'Ein gedrehtes Quadrat ist kein Quadrat mehr.', whyWrong: 'Die Lage ändert die Figur nicht.' }, { label: 'Jedes Dreieck hat gleich lange Seiten.', whyWrong: 'Ein Dreieck kann verschieden lange Seiten haben.' }, { label: 'Ein Kreis hat 1 Ecke.', whyWrong: ALWAYS.Kreis }],
  },
  {
    right: 'Ein Rechteck kann längere Seiten haben.', why: 'Denk an ein Blatt Papier: 2 Seiten sind länger.',
    wrong: [{ label: 'Bei jedem Rechteck sind alle Seiten gleich lang.', whyWrong: NOT_SQUARE }, { label: 'Ein Quadrat ist kein Rechteck.', whyWrong: SQUARE_TOO }, { label: 'Ein Dreieck hat 4 Seiten.', whyWrong: ALWAYS.Dreieck }],
  },
  {
    right: 'Quadrat und Rechteck haben gleich viele Ecken.', why: 'Quadrat und Rechteck haben beide 4 Ecken.',
    wrong: [{ label: 'Ein Quadrat hat mehr Ecken als ein Rechteck.', whyWrong: 'Rechne bei beiden Figuren die Ecken aus.' }, { label: 'Ein Dreieck hat mehr Ecken als ein Quadrat.', whyWrong: 'Rechne bei beiden Figuren die Ecken aus.' }, { label: 'Ein Kreis hat mehr Ecken als ein Dreieck.', whyWrong: ALWAYS.Kreis }],
  },
];

/** AB III on Stufe 3: which sentence holds? */
function welcherSatz(rng: Rng, stufe: Stufe): Task {
  const i = rng.int(0, SENTENCES.length - 1);
  const s = SENTENCES[i];
  return {
    key: `satz:${i}`,
    prompt: 'Welcher Satz stimmt?',
    answer: shuffled(rng, stufe, s.right, s.wrong),
    hints: ['Prüfe jeden Satz einzeln.', 'Stell dir bei jedem Satz die Figur vor.'],
    steps: [s.why, `Dieser Satz stimmt: ${s.right}`],
    praise: rng.pick(['Du hast jeden Satz genau geprüft.', 'Du hast die Sätze an Figuren geprüft.']),
  };
}

type Form = (rng: Rng, stufe: Stufe) => Task;

const FORMS: Record<Stufe, Record<Ab, Form[]>> = {
  1: { 1: [nennen, finden], 2: [alltag, wieviele], 3: [heisst, heisst, keineFigur, wortRaetsel] },
  2: { 1: [gedreht, zaehlen], 2: [gedrehtFinden, eckenZusammen], 3: [wer, figurFehlt, figurenAnzahl] },
  3: { 1: [(rng) => passtNicht(rng, 4), istRechteck], 2: [(rng) => passtNicht(rng, 5), stimmt], 3: [rechteckeZaehlen, keinRechteck, welcherSatz] },
};

export const formenSkill: SkillDef = {
  ...META,
  title: 'Flächenformen',
  description: 'Du erkennst Quadrat, Rechteck, Dreieck und Kreis.',
  stufen: { 1: '4 Formen erkennen und benennen.', 2: 'Gedrehte und schmale Formen. Ecken und Seiten.', 3: 'Ein Quadrat ist auch ein Rechteck. Was passt nicht?' },
  kmk: ['RF.figuren'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(META, stufe, ab, ab === 3 ? ['RF.figuren', 'PK.argumentieren'] : ['RF.figuren'], rng.pick(FORMS[stufe][ab])(rng, stufe));
  },
};
