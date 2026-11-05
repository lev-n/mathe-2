/**
 * Nachbarzahlen (docs/research.md §6). The Stufe chooses the content: Stufe 1 the number before and after within a ten, Stufe 2 across
 * a ten and the Nachbarzehner, Stufe 3 number riddles from two neighbour clues. The AB level is the demand inside it: AB I the direct
 * form, AB II less help or a less direct form, AB III goes the other way or reasons from both clues.
 */
import { BOX, fmt } from '../../core/format';
import type { Ab, Bug, ChoiceOption, MultiField, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, multiBugs, speak, type MaybeBug } from '../shared';
import { dreherFieldBugs, dreherOf, fromForms, tensLine, tensOf, type Form, type Forms } from './helpers';

const ID = 'zahlen.nachbarn';
const SKILL = { id: ID, topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum'];

const NEAR_HINT = 'Nachbarzahlen sind nur 1 entfernt.';
const ORDER_HINT = 'Die kleinere Zahl steht davor, die größere danach.';
const BOTH_PROMPT = 'Welche Zahlen stehen davor und danach?';
const RIDDLE_PROMPT = 'Welche Zahl bin ich?';

function neighbourFields(n: number): MultiField[] {
  return [
    { id: 'davor', value: n - 1, before: 'Die Zahl davor:' },
    { id: 'danach', value: n + 1, before: 'Die Zahl danach:' },
  ];
}

const swappedBug = (n: number) => ({ id: 'davor-danach', match: { davor: n + 1, danach: n - 1 }, hint: ORDER_HINT });
const tenAwayBug = (n: number) => ({ id: 'nachbar-abstand', match: { davor: n - 10, danach: n + 10 }, hint: NEAR_HINT });

const markedLine = (n: number): VisualOf<'numberLine'> => ({ ...tensLine(n - 1, n + 1), marks: [{ value: n, label: fmt(n) }] });
const tenLine = (lo: number, n: number): VisualOf<'numberLine'> => ({ type: 'numberLine', min: lo, max: lo + 10, majorStep: 10, minorStep: 1, labelMajor: true, marks: [{ value: n, label: fmt(n) }] });

// ─── Stufe 1: within a ten ────────────────────────────────────────────────────

/** Ones 2 to 8: both neighbours stay in this ten, and neither is a full ten the line would label. */
const withinTen =
  (withLine: boolean): Form =>
  (rng, stufe, ab) => {
    const n = rng.int(1, 9) * 10 + rng.int(2, 8);
    const fields = neighbourFields(n);
    const expression = `${BOX}, ${fmt(n)}, ${BOX}`;
    return build(SKILL, stufe, {
      key: `${withLine ? 'innen' : 'innen-ohne'}:${n}`,
      ab,
      prompt: BOTH_PROMPT,
      expression,
      ...(withLine ? { visual: markedLine(n) } : {}),
      answer: { kind: 'multi', fields },
      hints: [ORDER_HINT, withLine ? 'Schau auf den Zahlenstrahl: 1 Strich nach links, 1 Strich nach rechts.' : 'Davor ist es 1 weniger. Danach ist es 1 mehr.'],
      steps: [`Davor ist es 1 weniger: ${fmt(n)} − 1 = ${fmt(n - 1)}.`, `Danach ist es 1 mehr: ${fmt(n)} + 1 = ${fmt(n + 1)}.`, `Die Nachbarn sind ${fmt(n - 1)} und ${fmt(n + 1)}.`],
      bugs: multiBugs([swappedBug(n), tenAwayBug(n), ...dreherFieldBugs(fields)], fields),
      praise: 'Du hast beide Nachbarn gefunden.',
      srText: speak(`${BOTH_PROMPT} ${expression}`),
      kmk: KMK,
    });
  };

/** Two gaps beside one number: □, □, 37 or 35, □, □. The neighbour of a neighbour, so one step is not enough. */
function twoGaps(stufe: Stufe, ab: Ab, kind: string, known: number, before: boolean) {
  const values = before ? [known - 2, known - 1] : [known + 1, known + 2];
  const fields: MultiField[] = [
    { id: 'a', value: values[0], before: 'Erste Lücke:' },
    { id: 'b', value: values[1], before: 'Zweite Lücke:' },
  ];
  const expression = before ? `${BOX}, ${BOX}, ${fmt(known)}` : `${fmt(known)}, ${BOX}, ${BOX}`;
  const prompt = 'Welche Zahlen fehlen in der Reihe?';
  const row = before ? values[1] : values[0];
  const crossing = values.findIndex((v, i) => tensOf(v) !== tensOf(i === 0 ? (before ? values[1] : known) : (before ? known : values[0])));
  const tenBug: MaybeBug =
    crossing >= 0 && {
      id: 'zaehlen-zehner',
      match: { [fields[crossing].id]: before ? values[crossing] + 10 : values[crossing] - 10 },
      hint: before ? 'Hier wird der Zehner kleiner. Die Einer sind dann 9.' : 'Nach 9 Einern ist der Zehner voll. Der nächste Zehner beginnt.',
    };
  return build(SKILL, stufe, {
    key: `${kind}:${before ? 'vor' : 'nach'}:${known}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [before ? 'Geh von der Zahl aus zurück. Die Zahlen links sind kleiner.' : 'Geh von der Zahl aus weiter. Die Zahlen rechts sind größer.', NEAR_HINT],
    steps: [
      before ? `Direkt vor ${fmt(known)} steht ${fmt(row)}.` : `Direkt nach ${fmt(known)} steht ${fmt(row)}.`,
      before ? `Direkt vor ${fmt(row)} steht ${fmt(values[0])}.` : `Direkt nach ${fmt(row)} steht ${fmt(values[1])}.`,
      `Die Zahlen heißen ${fmt(values[0])} und ${fmt(values[1])}.`,
    ],
    bugs: multiBugs(
      [
        tenBug,
        { id: 'davor-danach', match: { a: values[1], b: values[0] }, hint: before ? 'Die Zahlen werden nach rechts größer. Die kleinste steht links.' : 'Die Zahlen werden nach rechts größer. Die größte steht rechts.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast beide fehlenden Zahlen gefunden.',
    srText: speak(`${prompt} ${expression}`),
    kmk: KMK,
  });
}

const twoGapsWithin: Form = (rng, stufe, ab) => {
  const before = rng.chance(0.5);
  // All three numbers stay in one ten, without its full ten.
  return twoGaps(stufe, ab, 'zwei', rng.int(1, 9) * 10 + (before ? rng.int(3, 9) : rng.int(1, 7)), before);
};

// ─── Stufe 2: across a ten, Nachbarzehner ─────────────────────────────────────

const acrossTen: Form = (rng, stufe, ab) => {
  const t = rng.int(1, 10) * 10;
  const n = t === 100 || rng.chance(0.5) ? t - 1 : t;
  const endsNine = n === t - 1;
  const onlyCrossing = rng.chance(0.4);
  const expression = onlyCrossing ? (endsNine ? `${fmt(n)}, ${BOX}` : `${BOX}, ${fmt(n)}`) : `${BOX}, ${fmt(n)}, ${BOX}`;
  const prompt = onlyCrossing ? (endsNine ? 'Welche Zahl kommt danach?' : 'Welche Zahl steht davor?') : BOTH_PROMPT;
  const all = neighbourFields(n);
  const fields = onlyCrossing ? all.filter((f) => f.id === (endsNine ? 'danach' : 'davor')) : all;
  const crossingBug: Bug = endsNine
    ? { id: 'zaehlen-zehner', match: { danach: n - 9 }, hint: `Nach ${fmt(n)} ist der Zehner voll. Der nächste Zehner beginnt.` }
    : { id: 'zaehlen-zehner', match: { davor: n + 9 }, hint: `Vor ${fmt(n)} wird der Zehner kleiner. Die Einer sind dann 9.` };
  return build(SKILL, stufe, {
    key: `ueber:${n}:${onlyCrossing ? 'eine' : 'beide'}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [endsNine ? `Nach ${fmt(n)} ist der Zehner voll.` : `${fmt(n)} ist ein voller Zehner. Davor ist der Zehner kleiner.`, onlyCrossing ? NEAR_HINT : ORDER_HINT],
    steps: [
      `Davor: ${fmt(n)} − 1 = ${fmt(n - 1)}.`,
      `Danach: ${fmt(n)} + 1 = ${fmt(n + 1)}.`,
      { text: `Hier wechselt der Zehner. Die Nachbarn sind ${fmt(n - 1)} und ${fmt(n + 1)}.`, visual: markedLine(n) },
    ],
    bugs: multiBugs(onlyCrossing ? [crossingBug, ...dreherFieldBugs(fields)] : [crossingBug, swappedBug(n), tenAwayBug(n), ...dreherFieldBugs(fields)], fields),
    praise: 'Du hast an den neuen Zehner gedacht.',
    srText: speak(`${prompt} ${expression}`),
    kmk: KMK,
  });
};

const neighbourTens: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 9) * 10 + rng.int(1, 9);
  const lo = tensOf(n) * 10;
  const hi = lo + 10;
  const fields: MultiField[] = [
    { id: 'unten', value: lo, before: 'Der Zehner davor:' },
    { id: 'oben', value: hi, before: 'Der Zehner danach:' },
  ];
  const prompt = 'Wie heißen die Nachbarzehner?';
  const expression = `${BOX} < ${fmt(n)} < ${BOX}`;
  return build(SKILL, stufe, {
    key: `zehner:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: ['Nachbarzehner enden mit einer 0.', 'Schau auf den Zehner der Zahl: Welcher volle Zehner kommt davor?'],
    steps: [
      `${fmt(n)} hat ${tensOf(n)} Zehner. Davor kommt der volle Zehner ${fmt(lo)}.`,
      `Danach kommt der nächste volle Zehner: ${fmt(hi)}.`,
      { text: `${fmt(lo)} < ${fmt(n)} < ${fmt(hi)}`, visual: tenLine(lo, n) },
    ],
    bugs: multiBugs(
      [
        { id: 'nachbarzahl-statt-zehner', match: { unten: n - 1, oben: n + 1 }, hint: 'Das sind die Nachbarzahlen. Gesucht sind volle Zehner mit einer 0.' },
        { id: 'nachbar-abstand', match: { unten: n - 10, oben: n + 10 }, hint: 'Such die vollen Zehner. Volle Zehner enden mit einer 0.' },
        { id: 'davor-danach', match: { unten: hi, oben: lo }, hint: ORDER_HINT },
      ],
      fields,
    ),
    praise: 'Du hast die vollen Zehner gefunden.',
    srText: speak(`${prompt} ${expression}`),
    kmk: KMK,
  });
};

const twoGapsAcross: Form = (rng, stufe, ab) => {
  const before = rng.chance(0.5);
  const t = rng.int(2, 9) * 10;
  // A ten change lies between the gaps or just beside them: 39, □, □ and □, □, 41.
  const known = before ? t + rng.int(0, 1) : t - rng.int(1, 2);
  return twoGaps(stufe, ab, 'zwei-ueber', known, before);
};

/** Stufe 2, AB III, the other way round: from the Nachbarzehner to the number. */
const numberOfTens: Form = (rng, stufe, ab) => {
  const t = rng.int(2, 8);
  const lo = t * 10;
  const hi = lo + 10;
  const n = lo + rng.int(1, 9);
  const prompt = `Die Nachbarzehner sind ${fmt(lo)} und ${fmt(hi)}. Welche Zahl passt?`;
  const away = (w: number): ChoiceOption => ({ label: fmt(w), whyWrong: `${fmt(w)} liegt nicht zwischen ${fmt(lo)} und ${fmt(hi)}.` });
  const edge = (w: number): ChoiceOption => ({ label: fmt(w), whyWrong: `${fmt(w)} ist selbst ein Nachbarzehner.` });
  const turned = dreherOf(n);
  const wrongs = [...(turned !== null && (turned < lo || turned > hi) ? [away(turned)] : []), ...rng.shuffle([away(n - 10), away(n + 10), edge(lo), edge(hi)])];
  return build(SKILL, stufe, {
    key: `zehner-wahl:${n}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fmt(n) }, wrongs, { max: 4 }),
    hints: ['Die Zahl liegt zwischen den beiden Nachbarzehnern.', 'Schau auf den Zehner jeder Zahl.'],
    steps: [`Die Zahl liegt zwischen ${fmt(lo)} und ${fmt(hi)}.`, `Die Zahl hat also ${t} Zehner.`, { text: `Es passt ${fmt(n)}.`, visual: tenLine(lo, n) }],
    praise: 'Du hast die Zahl zwischen den Zehnern gefunden.',
    srText: prompt,
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

// ─── Stufe 3: riddles from two clues ──────────────────────────────────────────

/** Both neighbours named, at a change of the ten: Vor mir kommt 39. Nach mir kommt 41. Inside a ten it would be easier than Stufe 2. */
const riddleBoth: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 9) * 10 + rng.pick([0, 9]);
  const fields: MultiField[] = [{ id: 'zahl', value: n, before: 'Ich bin' }];
  const context = `Vor mir kommt ${fmt(n - 1)}. Nach mir kommt ${fmt(n + 1)}.`;
  return build(SKILL, stufe, {
    key: `raetsel:0:${n}`,
    ab,
    context,
    prompt: RIDDLE_PROMPT,
    answer: { kind: 'multi', fields },
    hints: ['Die Zahl steht genau zwischen den beiden Nachbarn.', 'Geh von der kleineren Zahl 1 weiter.'],
    steps: [`Die Zahl steht zwischen ${fmt(n - 1)} und ${fmt(n + 1)}.`, `${fmt(n - 1)} + 1 = ${fmt(n)}`, `Die Zahl ist ${fmt(n)}.`],
    bugs: multiBugs(
      [
        { id: 'raetsel-nachbar', match: { zahl: n - 1 }, hint: 'Das ist schon ein Nachbar. Gesucht ist die Zahl dazwischen.' },
        { id: 'raetsel-nachbar', match: { zahl: n + 1 }, hint: 'Das ist schon ein Nachbar. Gesucht ist die Zahl dazwischen.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast beide Hinweise im Rätsel genutzt.',
    srText: `${context} ${RIDDLE_PROMPT}`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** The Nachbarzehner and one neighbour inside the same ten. */
const riddleTens: Form = (rng, stufe, ab) => {
  const form = rng.int(1, 2);
  const lo = rng.int(1, 9) * 10;
  const hi = lo + 10;
  const after = form === 1;
  const n = after ? lo + rng.int(1, 8) : lo + rng.int(2, 9);
  const clue = after ? n + 1 : n - 1;
  const context = `Meine Nachbarzehner sind ${fmt(lo)} und ${fmt(hi)}. ${after ? 'Nach' : 'Vor'} mir kommt ${fmt(clue)}.`;
  const fields: MultiField[] = [{ id: 'zahl', value: n, before: 'Ich bin' }];
  return build(SKILL, stufe, {
    key: `raetsel:${form}:${n}`,
    ab,
    context,
    prompt: RIDDLE_PROMPT,
    answer: { kind: 'multi', fields },
    hints: [`Lies den zweiten Satz genau: ${after ? 'Danach' : 'Davor'} kommt ${fmt(clue)}.`, 'Prüfe zum Schluss: Liegt deine Zahl zwischen den Nachbarzehnern?'],
    steps: [
      after ? `Nach der Zahl kommt ${fmt(clue)}. Geh 1 zurück.` : `Vor der Zahl kommt ${fmt(clue)}. Geh 1 weiter.`,
      after ? `${fmt(clue)} − 1 = ${fmt(n)}` : `${fmt(clue)} + 1 = ${fmt(n)}`,
      { text: `Die Zahl ist ${fmt(n)}. Die ${fmt(n)} liegt zwischen ${fmt(lo)} und ${fmt(hi)}.`, visual: tenLine(lo, n) },
    ],
    bugs: multiBugs(
      [
        { id: 'raetsel-nachbar', match: { zahl: clue }, hint: 'Das ist der Nachbar aus dem Rätsel. Gesucht ist die Zahl daneben.' },
        { id: 'raetsel-richtung', match: { zahl: after ? clue + 1 : clue - 1 }, hint: after ? 'Die Zahl steht vor dem Nachbarn. Geh 1 zurück.' : 'Die Zahl steht nach dem Nachbarn. Geh 1 weiter.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast beide Hinweise im Rätsel genutzt.',
    srText: `${context} ${RIDDLE_PROMPT}`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Two clues on the same side: the second clue names the neighbour of the neighbour. */
const riddleTwoSteps: Form = (rng, stufe, ab) => {
  const after = rng.chance(0.5);
  const n = rng.int(12, 96);
  const near = after ? n + 1 : n - 1;
  const far = after ? n + 2 : n - 2;
  const context = after ? `Nach mir kommt ${fmt(near)}. Danach kommt ${fmt(far)}.` : `Vor mir kommt ${fmt(near)}. Davor kommt ${fmt(far)}.`;
  const fields: MultiField[] = [{ id: 'zahl', value: n, before: 'Ich bin' }];
  return build(SKILL, stufe, {
    key: `raetsel:3:${after ? 'nach' : 'vor'}:${n}`,
    ab,
    context,
    prompt: RIDDLE_PROMPT,
    answer: { kind: 'multi', fields },
    hints: after ? ['Beide Zahlen im Rätsel kommen nach der gesuchten Zahl.', 'Geh von der kleineren Zahl 1 zurück.'] : ['Beide Zahlen im Rätsel kommen vor der gesuchten Zahl.', 'Geh von der größeren Zahl 1 weiter.'],
    steps: [after ? `Die Zahlen ${fmt(near)} und ${fmt(far)} stehen rechts von der Zahl.` : `Die Zahlen ${fmt(far)} und ${fmt(near)} stehen links von der Zahl.`, after ? `${fmt(near)} − 1 = ${fmt(n)}` : `${fmt(near)} + 1 = ${fmt(n)}`, `Die Zahl ist ${fmt(n)}.`],
    bugs: multiBugs(
      [
        { id: 'raetsel-nachbar', match: { zahl: near }, hint: 'Das ist der Nachbar aus dem Rätsel. Gesucht ist die Zahl daneben.' },
        { id: 'raetsel-nachbar', match: { zahl: far }, hint: 'Das ist eine Zahl aus dem Rätsel. Gesucht ist eine andere Zahl.' },
        { id: 'raetsel-richtung', match: { zahl: after ? far + 1 : far - 1 }, hint: after ? 'Die Zahl steht vor beiden Zahlen. Geh zurück.' : 'Die Zahl steht nach beiden Zahlen. Geh weiter.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast beide Hinweise im Rätsel genutzt.',
    srText: `${context} ${RIDDLE_PROMPT}`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** No neighbour is named as a number: a full ten beside me, and one Nachbarzehner. Both clues are needed. */
const riddleFullTen: Form = (rng, stufe, ab) => {
  const beforeTen = rng.chance(0.5);
  const lo = rng.int(1, 9) * 10;
  const hi = lo + 10;
  const n = beforeTen ? hi - 1 : lo + 1;
  const full = beforeTen ? hi : lo;
  const context = beforeTen ? `Nach mir kommt ein voller Zehner. Mein Nachbarzehner davor ist ${fmt(lo)}.` : `Vor mir kommt ein voller Zehner. Mein Nachbarzehner danach ist ${fmt(hi)}.`;
  const fields: MultiField[] = [{ id: 'zahl', value: n, before: 'Ich bin' }];
  return build(SKILL, stufe, {
    key: `raetsel:4:${beforeTen ? 'vor' : 'nach'}:${n}`,
    ab,
    context,
    prompt: RIDDLE_PROMPT,
    answer: { kind: 'multi', fields },
    hints: [beforeTen ? 'Welche Zahl steht direkt vor einem vollen Zehner?' : 'Welche Zahl steht direkt nach einem vollen Zehner?', 'Der Nachbarzehner sagt dir den Zehner der Zahl.'],
    steps: [
      beforeTen ? `Der nächste volle Zehner nach ${fmt(lo)} ist ${fmt(hi)}.` : `Der volle Zehner vor ${fmt(hi)} ist ${fmt(lo)}.`,
      beforeTen ? `Direkt vor ${fmt(hi)} steht ${fmt(n)}.` : `Direkt nach ${fmt(lo)} steht ${fmt(n)}.`,
      { text: `Die Zahl ist ${fmt(n)}.`, visual: tenLine(lo, n) },
    ],
    bugs: multiBugs(
      [
        { id: 'raetsel-nachbar', match: { zahl: full }, hint: 'Das ist der volle Zehner. Gesucht ist die Zahl daneben.' },
        { id: 'raetsel-richtung', match: { zahl: beforeTen ? lo + 1 : hi - 1 }, hint: beforeTen ? 'Der volle Zehner kommt nach der Zahl.' : 'Der volle Zehner kommt vor der Zahl.' },
        ...dreherFieldBugs(fields),
      ],
      fields,
    ),
    praise: 'Du hast beide Hinweise im Rätsel genutzt.',
    srText: `${context} ${RIDDLE_PROMPT}`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

const FORMS: Forms = {
  1: { 1: [withinTen(true)], 2: [withinTen(false)], 3: [twoGapsWithin] },
  2: { 1: [acrossTen], 2: [neighbourTens], 3: [twoGapsAcross, numberOfTens] },
  3: { 1: [riddleBoth], 2: [riddleTens], 3: [riddleTwoSteps, riddleFullTen] },
};

export const nachbarnSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Nachbarzahlen',
  description: 'Du findest die Zahl davor und danach und die Nachbarzehner.',
  stufen: {
    1: 'Die Zahl davor und danach, im selben Zehner.',
    2: 'Über den Zehner, wie bei 39 und 40; Nachbarzehner.',
    3: 'Zahlenrätsel mit 2 Hinweisen lösen.',
  },
  kmk: KMK,
  generate: fromForms(FORMS),
};
