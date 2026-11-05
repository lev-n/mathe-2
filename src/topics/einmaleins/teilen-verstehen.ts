/**
 * Teilen verstehen. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 *
 *        AB I                        AB II                         AB III
 * S1     dots, dividend ≤ 12, with   dividend 12–20, only the      □ : d = q with groups; p : □ = q with dots
 *        the Geteiltaufgabe          question and the dots
 * S2     by 2, 5, 10 up to 50:       stories, both meanings        □ : 5 = 7; 35 : □ = 7; a story back to all
 *        plain, both meanings
 * S3     story to Rechnung; which    write the Rechnung of a       Rechnung to story; picture to Rechnung
 *        picture (some unequal)      story; which picture (equal)
 *
 * The first factor counts the groups (F5): Aufteilen is q · d, Verteilen d · q. q = d is left out: 16 : 4 = □ would show its answer.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX, MINUS } from '../../core/format';
import type { Ab, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, multiBugs, pickPerson, targetAb, type ExerciseBody } from '../shared';
import { bildChoice, bildStep, durch, gruppen, haufen, mal, malFrage, sr } from './helpers';

const META = { id: 'einmaleins.teilen-verstehen', topicId: 'einmaleins' } as const;
const KMK = ['ZO.operationen', 'PK.modellieren'];

function teilenBugs(q: number, p: number, d: number, ask = `Wie oft passt die ${d} in ${p}?`) {
  return bugList(q, [
    ['teilen-als-minus', p - d, `Teilen heißt: ${p} in gleich große Gruppen legen.`],
    ['teilen-als-mal', p * d, `Beim Teilen wird es weniger. ${ask}`],
    ['teilen-als-plus', p + d, `Beim Teilen wird es weniger. ${ask}`],
  ]);
}

// ─── Stufe 1: with a picture ─────────────────────────────────────────────────
// Frames of q or d groups would show the answer, in the aria-label too; so the loose dots come with the task, the frames with the solution.

/** Aufteilen: groups of d, how many groups? Without `term` only the question and the dots are given. */
function aufteilenBild(p: number, d: number, ab: Ab, term = true): ExerciseBody {
  const q = p / d;
  const prompt = `Immer ${d} Punkte sind eine Gruppe. Wie viele Gruppen?`;
  const expression = `${durch(p, d)} = ${BOX}`;
  return {
    key: `aufteilen-bild:${p}:${d}`,
    ab,
    prompt,
    ...(term ? { expression } : {}),
    visual: haufen(p, d),
    answer: { kind: 'number', value: q, unit: 'Gruppen', label: 'Anzahl der Gruppen' },
    hints: [`Immer ${d} Punkte sind eine Gruppe.`, `Wie oft passt die ${d} in ${p}?`],
    steps: [`${p} Punkte, immer ${d} in einer Gruppe.`, { text: `${mal(q, d)} = ${p}`, visual: gruppen(q, d) }, `Also: ${durch(p, d)} = ${q}`],
    bugs: teilenBugs(q, p, d),
    praise: 'Du hast die Punkte in Gruppen aufgeteilt.',
    srText: term ? sr(prompt, expression) : sr(`${p} Punkte.`, prompt),
    kmk: KMK,
  };
}

/** Verteilen: d groups, how many in each? */
function verteilenBild(p: number, d: number, ab: Ab, term = true): ExerciseBody {
  const q = p / d;
  const prompt = `Verteile auf ${d} Gruppen. Wie viele Punkte hat jede Gruppe?`;
  const expression = `${durch(p, d)} = ${BOX}`;
  return {
    key: `verteilen-bild:${p}:${d}`,
    ab,
    prompt,
    ...(term ? { expression } : {}),
    visual: haufen(p, d),
    answer: { kind: 'number', value: q, unit: 'Punkte', label: 'Punkte in jeder Gruppe' },
    hints: ['Alle Gruppen sind gleich groß.', malFrage(d, p)],
    steps: [`${p} Punkte, gerecht auf ${d} Gruppen.`, { text: `${mal(d, q)} = ${p}`, visual: gruppen(d, q) }, `Also: ${durch(p, d)} = ${q}`],
    bugs: teilenBugs(q, p, d, malFrage(d, p)),
    praise: 'Du hast die Punkte gerecht verteilt.',
    srText: term ? sr(prompt, expression) : sr(`${p} Punkte.`, prompt),
    kmk: KMK,
  };
}

function bildLuecke(p: number, d: number, ab: Ab): ExerciseBody {
  const q = p / d;
  const prompt = 'Welche Zahl fehlt in der Geteiltaufgabe?';
  const expression = `${BOX} : ${d} = ${q}`;
  return {
    key: `bild-luecke:${p}:${d}`,
    ab,
    prompt,
    expression,
    visual: gruppen(d, q),
    answer: { kind: 'number', value: p, label: 'Zahl in der Lücke' },
    hints: ['Wie viele Punkte sind es zusammen?', `Rechne ${mal(d, q)}.`],
    steps: [`${d} Gruppen mit je ${q} Punkten.`, `${mal(d, q)} = ${p}`, `In die Lücke gehört ${p}.`],
    bugs: bugList(p, [['umkehr-plus', d + q, `${d} Gruppen mit je ${q} Punkten: Rechne ${mal(d, q)}.`]]),
    praise: 'Du hast alle Punkte im Bild gefunden.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

/** p : □ = q with loose dots: the divisor is asked. */
function teilerBild(p: number, d: number, ab: Ab): ExerciseBody {
  const q = p / d;
  const prompt = 'Welche Zahl fehlt in der Geteiltaufgabe?';
  const expression = `${p} : ${BOX} = ${q}`;
  return {
    key: `teiler-bild:${p}:${d}`,
    ab,
    prompt,
    expression,
    visual: haufen(p, d),
    answer: { kind: 'number', value: d, label: 'Zahl in der Lücke' },
    hints: [`Denk an die Malaufgabe: ${q} · ${BOX} = ${p}.`, malFrage(q, p)],
    steps: [{ text: `${mal(q, d)} = ${p}`, visual: gruppen(q, d) }, `Also: ${durch(p, d)} = ${q}`, `In die Lücke gehört ${d}.`],
    bugs: bugList(d, [['teilen-als-minus', p - q, `Minus passt hier nicht. ${malFrage(q, p)}`]]),
    praise: 'Du hast die passende Malaufgabe gefunden.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

// ─── Stufe 2: both meanings, by 2, 5, 10 ─────────────────────────────────────

/** Aufteilen: how many groups of d? Verteilen: how many in each of d groups? The question and its Antwortsatz fit the things. */
interface TeilenStory {
  /** Text of the story. */
  context: (p: number, d: number, name: string) => string;
  question: string;
  /** Antwortsatz around the number field. */
  before: string;
  after: string;
  kind: 'aufteilen' | 'verteilen';
  /** Most things in one group, and most things in all, where more would not fit the place. */
  maxEach?: number;
  maxTotal?: number;
}

const STORIES: readonly TeilenStory[] = [
  {
    kind: 'aufteilen',
    context: (p, d, name) => `${name} hat ${p} Äpfel. In jede Tüte kommen ${d} Äpfel.`,
    question: 'Wie viele Tüten sind es?',
    before: 'Es sind',
    after: 'Tüten.',
  },
  {
    kind: 'aufteilen',
    context: (p, d) => `In der Pause spielen ${p} Kinder. In jeder Gruppe sind ${d} Kinder.`,
    question: 'Wie viele Gruppen sind es?',
    before: 'Es sind',
    after: 'Gruppen.',
  },
  {
    kind: 'aufteilen',
    context: (p, d) => `Auf dem Tisch liegen ${p} Kekse. Auf jeden Teller kommen ${d} Kekse.`,
    question: 'Wie viele Teller sind es?',
    before: 'Es sind',
    after: 'Teller.',
  },
  {
    kind: 'verteilen',
    context: (p, d, name) => `${name} verteilt ${p} Kekse gerecht an ${d} Kinder.`,
    question: 'Wie viele Kekse bekommt jedes Kind?',
    before: 'Jedes Kind bekommt',
    after: 'Kekse.',
  },
  {
    kind: 'verteilen',
    context: (p, d) => `${p} Kinder sitzen an ${d} Tischen. An jedem Tisch sitzen gleich viele Kinder.`,
    question: 'Wie viele Kinder sitzen an einem Tisch?',
    before: 'An einem Tisch sitzen',
    after: 'Kinder.',
    maxEach: 6,
    maxTotal: 30,
  },
  {
    kind: 'verteilen',
    context: (p, d) => `${p} Stifte kommen in ${d} Dosen. In jeder Dose sind gleich viele Stifte.`,
    question: 'Wie viele Stifte sind in einer Dose?',
    before: 'In einer Dose sind',
    after: 'Stifte.',
  },
];

/** p things in d equal groups fit the place of the story. */
const storyFits = (s: TeilenStory, p: number, d: number): boolean => p / d <= (s.maxEach ?? 10) && p <= (s.maxTotal ?? 100);

function geschichteRechnen(rng: Rng, p: number, d: number, ab: Ab, kind: TeilenStory['kind']): ExerciseBody {
  const q = p / d;
  const story = rng.pick(STORIES.filter((s) => s.kind === kind && storyFits(s, p, d)));
  const name = pickPerson(rng).name;
  const context = story.context(p, d, name);
  const prompt = story.question;
  return {
    key: `geschichte:${kind}:${p}:${d}:${story.after}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: q, before: story.before, after: story.after, label: 'Anzahl' },
    hints:
      kind === 'aufteilen'
        ? [`Immer ${d} gehören zusammen.`, `Wie oft passt die ${d} in ${p}?`]
        : ['Überall sind es gleich viele.', malFrage(d, p)],
    steps: [`Die Rechnung ist ${durch(p, d)}.`, `${kind === 'aufteilen' ? mal(q, d) : mal(d, q)} = ${p}`, `Also: ${durch(p, d)} = ${q}`],
    bugs: kind === 'aufteilen' ? teilenBugs(q, p, d) : teilenBugs(q, p, d, malFrage(d, p)),
    praise: kind === 'aufteilen' ? 'Du hast in gleich große Gruppen aufgeteilt.' : 'Du hast gerecht verteilt.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
}

/** Both meanings in words only, no picture. */
function bedeutungText(p: number, d: number, ab: Ab, kind: TeilenStory['kind']): ExerciseBody {
  const q = p / d;
  const prompt = kind === 'aufteilen' ? `Immer ${d} sind eine Gruppe. Wie viele Gruppen?` : `Verteile auf ${d} Gruppen. Wie viele hat jede Gruppe?`;
  const expression = `${durch(p, d)} = ${BOX}`;
  return {
    key: `${kind}-text:${p}:${d}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: q, label: kind === 'aufteilen' ? 'Anzahl der Gruppen' : 'In jeder Gruppe' },
    hints: kind === 'aufteilen' ? [`Wie oft passt die ${d} in ${p}?`, `Welche Zahl mal ${d} ergibt ${p}?`] : ['Alle Gruppen sind gleich groß.', malFrage(d, p)],
    steps: [`${p}, immer gleich viele in einer Gruppe.`, `${kind === 'aufteilen' ? mal(q, d) : mal(d, q)} = ${p}`, `Also: ${durch(p, d)} = ${q}`],
    bugs: kind === 'aufteilen' ? teilenBugs(q, p, d) : teilenBugs(q, p, d, malFrage(d, p)),
    praise: kind === 'aufteilen' ? 'Du hast in gleich große Gruppen aufgeteilt.' : 'Du hast gerecht verteilt.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

function teilenPlain(p: number, d: number, ab: Ab): ExerciseBody {
  const q = p / d;
  const expression = `${durch(p, d)} = ${BOX}`;
  return {
    key: `rechnen:${p}:${d}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: { kind: 'number', value: q, label: 'Ergebnis' },
    hints: [`Wie oft passt die ${d} in ${p}?`, `Welche Zahl mal ${d} ergibt ${p}?`],
    steps: [`Frage: Welche Zahl mal ${d} ergibt ${p}?`, `${mal(q, d)} = ${p}`, `Also: ${durch(p, d)} = ${q}`],
    bugs: teilenBugs(q, p, d),
    praise: 'Du hast die passende Malaufgabe gesucht.',
    srText: sr('Rechne.', expression),
    kmk: KMK,
  };
}

/** □ : d = q: reversed, the dividend is asked. */
function dividendLuecke(p: number, d: number, ab: Ab): ExerciseBody {
  const q = p / d;
  const expression = `${BOX} : ${d} = ${q}`;
  return {
    key: `dividend:${p}:${d}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: p, label: 'Zahl in der Lücke' },
    hints: ['Rechne rückwärts mit der Malaufgabe.', `Rechne ${mal(q, d)}.`],
    steps: [`Rückwärts rechnen: ${mal(q, d)} = ${BOX}`, `${mal(q, d)} = ${p}`, `In die Lücke gehört ${p}.`],
    bugs: bugList(p, [
      ['umkehr-plus', d + q, `Plus passt hier nicht. Rechne die Malaufgabe: ${mal(q, d)}.`],
      ['teilen-als-minus', Math.abs(q - d), `Minus passt hier nicht. Rechne die Malaufgabe: ${mal(q, d)}.`],
    ]),
    praise: 'Du hast mit der Malaufgabe rückwärts gerechnet.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk: KMK,
  };
}

/** p : □ = q: the divisor is asked, without a picture. */
function teilerLuecke(p: number, d: number, ab: Ab): ExerciseBody {
  const q = p / d;
  const expression = `${p} : ${BOX} = ${q}`;
  return {
    key: `teiler:${p}:${d}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: d, label: 'Zahl in der Lücke' },
    hints: [`Denk an die Malaufgabe: ${q} · ${BOX} = ${p}.`, malFrage(q, p)],
    steps: [`Malaufgabe: ${q} · ${BOX} = ${p}`, `${mal(q, d)} = ${p}`, `In die Lücke gehört ${d}.`],
    bugs: bugList(d, [['teilen-als-minus', p - q, `Minus passt hier nicht. ${malFrage(q, p)}`]]),
    praise: 'Du hast die passende Malaufgabe gefunden.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk: KMK,
  };
}

/** A story told backwards: the share and the children are known, all the things are asked. */
function geschichteZurueck(rng: Rng, p: number, d: number, ab: Ab): ExerciseBody {
  const q = p / d;
  const name = pickPerson(rng).name;
  const context = `${name} verteilt Kekse gerecht an ${d} Kinder. Jedes Kind bekommt ${q} Kekse.`;
  const prompt = 'Wie viele Kekse sind es zusammen?';
  return {
    key: `zurueck:${p}:${d}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: p, before: 'Es sind', after: 'Kekse.', label: 'Anzahl' },
    hints: ['Alle Kinder bekommen gleich viele Kekse.', `Rechne ${mal(d, q)}.`],
    steps: [`${d} Kinder mit je ${q} Keksen.`, `${mal(d, q)} = ${p}`, `Es sind ${p} Kekse.`],
    bugs: bugList(p, [['umkehr-plus', d + q, `${d} Kinder mit je ${q} Keksen: Rechne ${mal(d, q)}.`]]),
    praise: 'Du hast die Geschichte rückwärts gerechnet.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function rechnungWaehlen(rng: Rng, p: number, d: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const q = p / d;
  const story = rng.pick(STORIES.filter((s) => storyFits(s, p, d)));
  const name = pickPerson(rng).name;
  const context = story.context(p, d, name);
  const prompt = 'Welche Rechnung passt zur Geschichte?';
  return {
    key: `rechnung:${p}:${d}:${story.after}`,
    ab,
    context,
    prompt,
    answer: makeChoice(
      rng,
      { label: durch(p, d) },
      rng.shuffle([
        { label: `${p} ${MINUS} ${d}`, whyWrong: 'Hier geht nichts weg. Alles kommt in gleich große Gruppen.' },
        { label: `${p} + ${d}`, whyWrong: 'Hier kommt nichts dazu. Alles kommt in gleich große Gruppen.' },
        { label: mal(p, d), whyWrong: `Es bleibt bei ${p}. Diese ${p} kommen in gleich große Gruppen.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Stell dir die Geschichte vor.', 'Alles kommt in gleich große Gruppen.'],
    steps: [`${p} kommen in gleich große Gruppen.`, `Die Rechnung ist ${durch(p, d)}.`, `${durch(p, d)} = ${q}`],
    praise: 'Du hast in der Geschichte das Teilen erkannt.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
}

/** The Rechnung of a story, written by the child. */
function rechnungSchreiben(rng: Rng, p: number, d: number, ab: Ab): ExerciseBody {
  const q = p / d;
  const story = rng.pick(STORIES.filter((s) => storyFits(s, p, d)));
  const name = pickPerson(rng).name;
  const context = story.context(p, d, name);
  const prompt = 'Schreib die Geteiltaufgabe und rechne.';
  const fields: MultiField[] = [
    { id: 'alle', value: p, label: 'Zahl vor dem Geteilt' },
    { id: 'teiler', value: d, before: ':', label: 'Zahl nach dem Geteilt' },
    { id: 'ergebnis', value: q, before: '=', label: 'Ergebnis' },
  ];
  return {
    key: `schreiben:${p}:${d}:${story.after}`,
    ab,
    context,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Wie viele sind es zusammen?', 'Diese Zahl steht vorne.'],
    steps: [`${p} kommen in gleich große Gruppen.`, `Die Rechnung ist ${durch(p, d)}.`, `${durch(p, d)} = ${q}`],
    bugs: multiBugs(
      [
        { id: 'teilen-als-minus', match: { alle: p, teiler: d, ergebnis: p - d }, hint: `Teilen heißt: ${p} in gleich große Gruppen legen.` },
        { id: 'teilen-als-mal', match: { alle: d, teiler: p }, hint: 'Die größere Zahl steht vorne: Alle kommen in Gruppen.' },
      ],
      fields,
    ),
    praise: 'Du hast die Geteiltaufgabe gefunden und gerechnet.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
}

/** Which story fits the Rechnung? Each wrong story is another operation. */
function geschichteWaehlen(rng: Rng, p: number, d: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const q = p / d;
  const thing = rng.pick([
    { many: 'Kekse', dativ: 'Keksen', place: 'Teller', into: 'auf' },
    { many: 'Äpfel', dativ: 'Äpfeln', place: 'Tüten', into: 'in' },
    { many: 'Stifte', dativ: 'Stiften', place: 'Dosen', into: 'in' },
  ]);
  const prompt = `Welche Geschichte passt zu ${durch(p, d)}?`;
  const richtig = `${p} ${thing.many} kommen ${thing.into} ${d} ${thing.place}, überall gleich viele.`;
  return {
    key: `geschichte-waehlen:${p}:${d}:${thing.many}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: richtig },
      rng.shuffle([
        { label: `${p} ${thing.many} liegen da. ${d} ${thing.many} gehen weg.`, whyWrong: 'Das ist minus. Beim Teilen kommt alles in gleich große Gruppen.' },
        { label: `${p} ${thing.many} liegen da. ${d} ${thing.many} kommen dazu.`, whyWrong: 'Das ist plus. Beim Teilen kommt alles in gleich große Gruppen.' },
        { label: `${d} ${thing.place} mit je ${p} ${thing.dativ}.`, whyWrong: `Das ist mal. Hier sind es ${p} zusammen.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Stell dir jede Geschichte vor.', 'Beim Teilen kommt alles in gleich große Gruppen.'],
    steps: [`${durch(p, d)}: ${p} kommen in ${d} gleich große Gruppen.`, `Das passt: ${richtig}`, `${durch(p, d)} = ${q}`],
    praise: 'Du hast zur Rechnung die Geschichte gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Which Rechnung shows this picture? p : q fits as well (the other meaning), so it is no option. */
function bildZuRechnung(rng: Rng, p: number, d: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const q = p / d;
  const prompt = 'Welche Geteiltaufgabe zeigt das Bild?';
  const satz = `Das Bild hat ${d} Gruppen mit je ${q} Punkten.`;
  return {
    key: `bild-zu-rechnung:${p}:${d}`,
    ab,
    prompt,
    visual: gruppen(d, q),
    answer: makeChoice(
      rng,
      { label: durch(p, d) },
      rng.shuffle([
        { label: durch(p + d, d), whyWrong: `Das Bild hat nicht ${p + d} Punkte.` },
        { label: `${p} ${MINUS} ${d}`, whyWrong: 'Hier geht nichts weg. Die Punkte liegen in gleich großen Gruppen.' },
        { label: durch(p - d, d), whyWrong: `Das Bild hat mehr als ${p - d} Punkte.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Wie viele Punkte sind es zusammen?', 'Wie viele Gruppen siehst du?'],
    steps: [satz, `${mal(d, q)} = ${p}`, `Das ist ${durch(p, d)} = ${q}.`],
    praise: 'Du hast die Geteiltaufgabe im Bild erkannt.',
    srText: sr(satz, prompt),
    kmk: KMK,
  };
}

/** `equal`: every wrong picture has equal groups too, only its number of dots differs. */
function bildWaehlen(rng: Rng, p: number, d: number, ab: Ab, equal = false): ExerciseBody {
  const q = p / d;
  const prompt = `Welches Bild passt zu ${durch(p, d)}?`;
  // Both meanings fit p : d, so a wrong picture has unequal groups or another number of dots, and is never q groups of d.
  // All pictures have d groups and one width of a group, as no group is shorter than a row: side by side the dots keep one size on a phone.
  const perRow = Math.min(5, q - 1);
  const bild = (groups: number[]): Visual => ({ type: 'dotArray', groups, perRow });
  const alle = (size: number) => Array.from({ length: d }, () => size);
  const unequal = [q + 1, q - 1, ...Array.from({ length: d - 2 }, () => q)];
  const weniger = { visual: bild(alle(q - 1)), whyWrong: `Das sind weniger als ${p} Punkte.` };
  const answer = bildChoice(rng, bild(alle(q)), [
    equal ? weniger : { visual: bild(unequal), whyWrong: 'Die Gruppen sind nicht gleich groß.' },
    { visual: bild(alle(q + 1)), whyWrong: `Das sind mehr als ${p} Punkte.` },
    equal ? { visual: bild(alle(q + 2)), whyWrong: `Das sind mehr als ${p} Punkte.` } : weniger,
  ]);
  return {
    key: `bild${equal ? '-gleich' : ''}:${p}:${d}`,
    ab,
    prompt,
    answer,
    hints: [`Das Bild hat zusammen ${p} Punkte.`, 'Alle Gruppen sind gleich groß.'],
    steps: [bildStep(answer, `${p} Punkte in ${d} gleich großen Gruppen.`), `${mal(d, q)} = ${p}`, `Also: ${durch(p, d)} = ${q}`],
    praise: 'Du hast Punkte und Gruppen geprüft.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** p = d · q with d from 2 to 5, q ≠ d and p from `min` to `max`. */
function kleineTeilung(rng: Rng, min: number, max: number): [number, number] {
  const pairs: [number, number][] = [];
  for (const d of [2, 3, 4, 5]) for (let q = 2; q * d <= max; q++) if (q !== d && q * d >= min) pairs.push([q * d, d]);
  return rng.pick(pairs);
}

/** p = d · q ≤ 50 with d from 2, 5, 10; q from 2 to 10, q ≠ d; no dividend below 10, the range of Stufe 1. */
function kernTeilung(rng: Rng): [number, number] {
  const pairs: [number, number][] = [];
  for (const d of [2, 5, 10]) for (let q = 2; q <= 10 && q * d <= 50; q++) if (q !== d && q * d >= 10) pairs.push([q * d, d]);
  return rng.pick(pairs);
}

export const teilenVerstehenSkill: SkillDef = {
  ...META,
  title: 'Teilen verstehen',
  description: 'Du teilst gerecht auf und verteilst an Gruppen.',
  stufen: {
    1: 'Teilen bis 20 mit Bild, es bleibt nichts übrig',
    2: 'Teilen bis 50 durch 2, 5 und 10',
    3: 'Geschichten als Geteiltaufgabe; welches Bild passt?',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const body = ((): ExerciseBody => {
      if (stufe === 1) {
        if (ab === 1) {
          const [p, d] = kleineTeilung(rng, 4, 12);
          return rng.chance(0.5) ? aufteilenBild(p, d, ab) : verteilenBild(p, d, ab);
        }
        if (ab === 2) {
          const [p, d] = kleineTeilung(rng, 12, 20);
          return rng.chance(0.5) ? aufteilenBild(p, d, ab, false) : verteilenBild(p, d, ab, false);
        }
        const [p, d] = kleineTeilung(rng, 4, 20);
        return rng.chance(0.5) ? bildLuecke(p, d, ab) : teilerBild(p, d, ab);
      }
      const [p, d] = kernTeilung(rng);
      if (stufe === 2) {
        if (ab === 1) {
          const kind = rng.pick(['rechnen', 'aufteilen', 'verteilen'] as const);
          return kind === 'rechnen' ? teilenPlain(p, d, ab) : bedeutungText(p, d, ab, kind);
        }
        if (ab === 2) return geschichteRechnen(rng, p, d, ab, rng.chance(0.5) ? 'aufteilen' : 'verteilen');
        const kind = rng.pick(['dividend', 'teiler', 'zurueck'] as const);
        if (kind === 'dividend') return dividendLuecke(p, d, ab);
        return kind === 'teiler' ? teilerLuecke(p, d, ab) : geschichteZurueck(rng, p, d, ab);
      }
      if (ab === 1) return rng.chance(0.5) ? rechnungWaehlen(rng, p, d, ab, stufe) : bildWaehlen(rng, p, d, ab);
      if (ab === 2) return rng.chance(0.5) ? rechnungSchreiben(rng, p, d, ab) : bildWaehlen(rng, p, d, ab, true);
      return rng.chance(0.5) ? geschichteWaehlen(rng, p, d, ab, stufe) : bildZuRechnung(rng, p, d, ab, stufe);
    })();
    return build(META, stufe, body);
  },
};
