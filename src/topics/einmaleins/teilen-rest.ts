/**
 * Teilen mit Rest (Extra; Bayern and Baden-Württemberg, docs/research.md §2.3). The Stufe chooses the content (§6), the AB the demand inside it:
 *
 *        AB I                     AB II                       AB III
 * S1     dividend ≤ 12, picture   dividend 13–20, picture     □ : 5 = 3 Rest 2 with groups; does it hold, with dots
 * S2     by 2 and 5, no picture   by 5, dividend 35–49        □ : 5 = 7 Rest 3; does it hold; which task leaves a Rest; also by 10
 * S3     story: what stays over   story: one more is needed   story: what does this Rest mean; the Rest is of no use
 *
 * 47 : 10 can be read from the digits, so it never comes as a plain task: it would ask less than Stufe 1.
 * Quotients stay ≤ 9, so hints can name the check, and differ from the divisor (the task would show them). A story is the new demand, so its
 * numbers stay known: Kern divisors, dividend ≤ 30 (F9). A picture shows loose dots and only the solution its groups: frames would show the
 * answer, in the aria-label too; the exception is □ : 5 = 3 Rest 2, whose answer is the sum of all dots and stands in no label.
 * The first factor counts the groups (F5): cars are q · d, shares among d children are d · q.
 * Text around a field reads the same for every value: a singular there ('Voll ist □ Auto.') would give the answer 1 away.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX } from '../../core/format';
import type { Ab, Bug, MultiField, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { build, bugList, makeChoice, multiBugs, plural, targetAb, type ExerciseBody } from '../shared';
import { durch, haufen, mal, sr, stimmtAnswer } from './helpers';

const META = { id: 'einmaleins.teilen-rest', topicId: 'einmaleins' } as const;
const KMK = ['ZO.operationen', 'ZO.sachrechnen'];

/** A number with its noun: '1 Auto', '3 Autos'. */
const anzahl = (n: number, one: string, many: string): string => `${n} ${plural(n, one, many)}`;

const pruefHint = (p: number, groups: number, each: number, r: number): string => `Prüfe: ${mal(groups, each)} sind ${groups * each}. Bis ${p} ${plural(r, 'fehlt', 'fehlen')} noch ${r}.`;

/** The solved picture: count groups of each, and the Rest as a group of its own. Only for r < each: a Rest as big as a group would look like one more group. */
const geloest = (count: number, each: number, r: number): Visual => ({ type: 'dotArray', groups: [...Array.from({ length: count }, () => each), r] });

/** A worked line that brings the solved picture, if the task has a picture. */
const bildZeile = (text: string, visual: Visual, picture: boolean): Step => (picture ? { text, visual } : text);

const restField = (r: number): MultiField => ({ id: 'r', value: r, before: 'Rest', label: 'Rest' });

function restBugs(p: number, d: number, q: number, r: number, fields: MultiField[], pruef: string): Bug[] {
  return multiBugs(
    [
      { id: 'rest-zu-gross', match: { q: q - 1, r: r + d }, hint: `Der Rest muss kleiner als ${d} sein.` },
      { id: 'rest-vergessen', match: { q, r: 0 }, hint: pruef },
      { id: 'teilen-als-minus', match: { q: p - d }, hint: `Teilen heißt: ${p} in gleich große Gruppen legen.` },
    ],
    fields,
  );
}

function restRechnen(p: number, d: number, ab: Ab, picture: boolean): ExerciseBody {
  const q = Math.floor(p / d);
  const r = p % d;
  const prompt = picture ? 'Schreib die vollen Gruppen und den Rest auf.' : 'Rechne und schreib den Rest auf.';
  const fields: MultiField[] = [{ id: 'q', value: q, before: `${durch(p, d)} =`, label: 'Ergebnis' }, restField(r)];
  return {
    key: `${picture ? 'bild' : 'rechnen'}:${p}:${d}`,
    ab,
    prompt,
    ...(picture ? { visual: haufen(p, d) } : {}),
    answer: { kind: 'multi', fields },
    hints: [`Welche Malaufgabe mit ${d} kommt nah an ${p}?`, `Der Rest muss kleiner als ${d} sein.`],
    steps: [bildZeile(`${mal(q, d)} = ${q * d}`, geloest(q, d, r), picture), `${p} − ${q * d} = ${r}`, `${durch(p, d)} = ${q} Rest ${r}`],
    bugs: restBugs(p, d, q, r, fields, pruefHint(p, q, d, r)),
    praise: 'Du hast den Rest geprüft.',
    srText: sr(prompt, `${durch(p, d)} = ${BOX} Rest ${BOX}`),
    kmk: KMK,
  };
}

/** □ : d = q Rest r: reversed, the dividend is asked. On Stufe 1 with the groups and the Rest: their sum is the answer. */
function dividendLuecke(p: number, d: number, ab: Ab, picture: boolean): ExerciseBody {
  const q = Math.floor(p / d);
  const r = p % d;
  const expression = `${BOX} : ${d} = ${q} Rest ${r}`;
  const prompt = 'Welche Zahl gehört in die Lücke?';
  return {
    key: `dividend:${p}:${d}`,
    ab,
    prompt,
    expression,
    ...(picture ? { visual: geloest(q, d, r) } : {}),
    answer: { kind: 'number', value: p, label: 'Zahl in der Lücke' },
    hints: [`Rechne zuerst ${mal(q, d)}.`, 'Rechne dann den Rest dazu.'],
    steps: [`${mal(q, d)} = ${q * d}`, `${q * d} + ${r} = ${p}`, `In die Lücke gehört ${p}.`],
    bugs: bugList(p, [['rest-vergessen', q * d, `${mal(q, d)} sind ${q * d}. Der Rest fehlt noch.`]]),
    praise: 'Du hast den Rest dazu gerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

/** Does this line hold? Wrong lines have a Rest that is too big, or a Rest that does not fit. */
function restStimmt(rng: Rng, p: number, d: number, ab: Ab, picture: boolean): ExerciseBody {
  const q = Math.floor(p / d);
  const r = p % d;
  const variants = [
    { q, r, why: `Prüfe: ${mal(q, d)} sind ${q * d}. Der Rest stimmt auch.` },
    { q, r, why: `Prüfe: ${mal(q, d)} sind ${q * d}. Der Rest stimmt auch.` },
    ...(q >= 2 ? [{ q: q - 1, r: r + d, why: `Der Rest muss kleiner als ${d} sein.` }] : []),
    { q, r: r === 1 ? 2 : r - 1, why: `Prüfe: ${mal(q, d)} sind ${q * d}. Wie viel fehlt bis ${p}?` },
  ];
  const v = rng.pick(variants);
  const isTrue = v.q === q && v.r === r;
  const expression = `${durch(p, d)} = ${v.q} Rest ${v.r}`;
  return {
    key: `stimmt:${p}:${d}:${v.q}:${v.r}`,
    ab,
    prompt: 'Stimmt das?',
    expression,
    ...(picture ? { visual: haufen(p, d) } : {}),
    answer: stimmtAnswer(rng, isTrue, v.why),
    hints: [`Welche Malaufgabe mit ${d} kommt nah an ${p}?`, `Der Rest muss kleiner als ${d} sein.`],
    steps: [bildZeile(`${mal(q, d)} = ${q * d}`, geloest(q, d, r), picture), `${p} − ${q * d} = ${r}`, `${durch(p, d)} = ${q} Rest ${r}`],
    praise: 'Du hast die Teilung genau geprüft.',
    srText: sr('Stimmt das?', expression),
    kmk: KMK,
  };
}

/** Which task leaves a Rest? The others are exact. */
function welcheMitRest(rng: Rng, p: number, d: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const q = Math.floor(p / d);
  const r = p % d;
  const prompt = 'Bei welcher Aufgabe bleibt ein Rest?';
  const exact = [q * d, (q + 1) * d, (q + 2) * d].filter((x) => x <= 50 && x % d === 0);
  return {
    key: `welche:${p}:${d}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: durch(p, d) },
      exact.map((x) => ({ label: durch(x, d), whyWrong: `${durch(x, d)} geht genau auf.` })),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: [`Geht die ${d} genau in die Zahl?`, 'Prüfe jede Aufgabe mit mal.'],
    steps: [`${mal(q, d)} = ${q * d}`, `${p} − ${q * d} = ${r}`, `${durch(p, d)} = ${q} Rest ${r}`],
    praise: 'Du hast den Rest schon vorher erkannt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** What the Rest means: leftovers stay over. */
function restLeftover(rng: Rng, p: number, d: number, ab: Ab): ExerciseBody {
  const q = Math.floor(p / d);
  const r = p % d;
  const story = rng.pick([
    { context: `${p} Kekse kommen auf ${d} Teller. Auf jedem Teller liegen gleich viele Kekse.`, thing: 'Kekse', per: 'Kekse auf jedem Teller', left: 'Übrige Kekse' },
    { context: `${d} Kinder teilen ${p} Äpfel gerecht. Jedes Kind bekommt gleich viele Äpfel.`, thing: 'Äpfel', per: 'Äpfel für jedes Kind', left: 'Übrige Äpfel' },
  ]);
  const prompt = 'Schreib beide Zahlen auf.';
  const fields: MultiField[] = [
    { id: 'q', value: q, before: `${story.per}:`, label: story.per },
    { id: 'r', value: r, before: `${story.left}:`, label: story.left },
  ];
  return {
    key: `uebrig:${p}:${d}:${story.thing}`,
    ab,
    context: story.context,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [`Welche Malaufgabe mit ${d} kommt nah an ${p}?`, `Der Rest bleibt übrig. Der Rest ist kleiner als ${d}.`],
    steps: [`${mal(d, q)} = ${q * d}`, `${p} − ${q * d} = ${r}`, `${durch(p, d)} = ${q} Rest ${r}`],
    bugs: restBugs(p, d, q, r, fields, pruefHint(p, d, q, r)),
    praise: 'Du hast den Rest in der Geschichte gefunden.',
    srText: sr(story.context, prompt),
    kmk: KMK,
  };
}

function restAufrunden(rng: Rng, p: number, d: number, ab: Ab): ExerciseBody {
  const q = Math.floor(p / d);
  const r = p % d;
  const stories = [
    { context: `${p} Bücher kommen in Kisten. In eine Kiste passen ${d} Bücher.`, who: 'Du brauchst', unit: 'Kisten', unitOne: 'Kiste', rest: 'Bücher', restOne: 'Buch', left: 'Übrige Bücher', question: 'Wie viele Kisten brauchst du?' },
    // A car holds at most 5 children.
    ...(d <= 5 ? [{ context: `${p} Kinder fahren zum Zoo. In ein Auto passen ${d} Kinder.`, who: 'Die Kinder brauchen', unit: 'Autos', unitOne: 'Auto', rest: 'Kinder', restOne: 'Kind', left: 'Übrige Kinder', question: 'Wie viele Autos brauchen die Kinder?' }] : []),
  ];
  const story = rng.pick(stories);
  const units = (n: number) => anzahl(n, story.unitOne, story.unit);
  const fields: MultiField[] = [
    { id: 'q', value: q, before: `Volle ${story.unit}:`, label: `Volle ${story.unit}` },
    { id: 'r', value: r, before: `${story.left}:`, label: story.left },
    // q + 1 is at least 2, so this Antwortsatz is always plural.
    { id: 'alle', value: q + 1, before: story.who, after: `${story.unit}.`, label: `Alle ${story.unit}` },
  ];
  return {
    key: `aufrunden:${p}:${d}:${story.unit}`,
    ab,
    context: story.context,
    prompt: story.question,
    answer: { kind: 'multi', fields },
    hints: [`Welche Malaufgabe mit ${d} kommt nah an ${p}?`, `Auch die ${story.rest} vom Rest müssen mit.`],
    steps: [`${durch(p, d)} = ${q} Rest ${r}`, `Für den Rest kommt noch 1 ${story.unitOne} dazu.`, `${units(q)} voll, ${anzahl(r, story.restOne, story.rest)} übrig: ${units(q + 1)}.`],
    bugs: multiBugs(
      [
        { id: 'rest-sache', match: { alle: q }, hint: `Alle ${story.rest} sollen mit. ${plural(q, 'Reicht', 'Reichen')} ${units(q)}?` },
        { id: 'rest-zu-gross', match: { q: q - 1, r: r + d }, hint: `Der Rest muss kleiner als ${d} sein.` },
        { id: 'rest-vergessen', match: { r: 0 }, hint: pruefHint(p, q, d, r) },
      ],
      fields,
    ),
    praise: 'Du hast an den Rest gedacht.',
    srText: sr(story.context, story.question),
    kmk: [...KMK, 'PK.modellieren'],
  };
}

/** The Rest named in a story: the child reads what it is. The right line is about the things left over. */
function restBedeutung(rng: Rng, p: number, d: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const q = Math.floor(p / d);
  const r = p % d;
  const stories = [
    {
      id: 'kisten',
      context: `${p} Bücher kommen in Kisten. In eine Kiste passen ${d} Bücher.`,
      right: `${anzahl(r, 'Buch', 'Bücher')} ${plural(r, 'bleibt', 'bleiben')} übrig.`,
      leer: `${anzahl(r, 'Kiste', 'Kisten')} ${plural(r, 'bleibt', 'bleiben')} leer.`,
      je: `In jeder Kiste ${plural(r, 'liegt', 'liegen')} ${anzahl(r, 'Buch', 'Bücher')}.`,
      voll: `${anzahl(r, 'Kiste ist', 'Kisten sind')} voll.`,
    },
    // A car holds at most 5 children.
    ...(d <= 5
      ? [
          {
            id: 'autos',
            context: `${p} Kinder fahren zum Zoo. In ein Auto passen ${d} Kinder.`,
            right: `${anzahl(r, 'Kind', 'Kinder')} ${plural(r, 'hat', 'haben')} noch keinen Platz.`,
            leer: `${anzahl(r, 'Auto', 'Autos')} ${plural(r, 'bleibt', 'bleiben')} leer.`,
            je: `In jedem Auto ${plural(r, 'sitzt', 'sitzen')} ${anzahl(r, 'Kind', 'Kinder')}.`,
            voll: `${anzahl(r, 'Auto ist', 'Autos sind')} voll.`,
          },
        ]
      : []),
  ];
  const story = rng.pick(stories);
  const expression = `${durch(p, d)} = ${q} Rest ${r}`;
  const prompt = `Was bedeutet der Rest ${r}?`;
  const why = 'Der Rest ist nach den vollen Gruppen noch da.';
  const voll = `${q} ${plural(q, 'ist', 'sind')} voll.`;
  return {
    key: `bedeutung:${p}:${d}:${story.id}`,
    ab,
    context: story.context,
    prompt,
    expression,
    answer: makeChoice(
      rng,
      { label: story.right },
      rng.shuffle([
        { label: story.leer, whyWrong: why },
        { label: story.je, whyWrong: why },
        // With as many full as left over, this line would be true.
        ...(q !== r ? [{ label: story.voll, whyWrong: `${voll} Der Rest kommt danach.` }] : []),
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: [`${voll} Was ist danach noch da?`, 'Der Rest passt nicht mehr in eine volle Gruppe.'],
    steps: [expression, `${voll} Dann kommt der Rest.`, `Das heißt: ${story.right}`],
    praise: 'Du hast den Rest in der Geschichte gedeutet.',
    srText: sr(story.context, prompt, expression),
    kmk: [...KMK, 'PK.modellieren'],
  };
}

/** Here the Rest is of no use: what is left is too little for one more. One more would be the wrong answer. */
function restAbrunden(rng: Rng, p: number, d: number, ab: Ab): ExerciseBody {
  const q = Math.floor(p / d);
  const r = p % d;
  const story = rng.pick([
    {
      id: 'kuchen',
      context: `Im Korb liegen ${p} Eier. Für einen Kuchen brauchst du ${d} Eier.`,
      question: 'Wie viele Kuchen kannst du backen?',
      before: 'Du kannst',
      after: 'Kuchen backen.',
      noMore: 'Der Rest reicht nicht für noch einen Kuchen.',
      enough: 'Reicht der Rest noch für einen Kuchen?',
      last: `Du kannst ${q} Kuchen backen.`,
      why: `Für einen Kuchen brauchst du ${d} Eier. Reicht der Rest dafür?`,
    },
    {
      id: 'packungen',
      context: `Lea hat ${p} Stifte. In eine volle Packung kommen ${d} Stifte.`,
      question: 'Wie viele volle Packungen sind es?',
      before: 'Es sind',
      after: 'volle Packungen.',
      noMore: 'Der Rest füllt keine Packung mehr.',
      enough: 'Reicht der Rest noch für eine volle Packung?',
      last: `Das sind ${q} volle Packungen.`,
      why: `Eine volle Packung hat ${d} Stifte. Reicht der Rest dafür?`,
    },
  ]);
  return {
    key: `abrunden:${p}:${d}:${story.id}`,
    ab,
    context: story.context,
    prompt: story.question,
    answer: { kind: 'number', value: q, before: story.before, after: story.after, label: 'Anzahl' },
    hints: [`Welche Malaufgabe mit ${d} kommt nah an ${p}?`, story.enough],
    steps: [`${durch(p, d)} = ${q} Rest ${r}`, story.noMore, story.last],
    bugs: bugList(q, [['rest-sache', q + 1, story.why], ['teilen-als-minus', p - d, `Teilen heißt: ${p} in gleich große Gruppen legen.`]]),
    praise: 'Du hast an die Geschichte gedacht.',
    srText: sr(story.context, story.question),
    kmk: [...KMK, 'PK.modellieren'],
  };
}

/** A division with Rest: dividend from `min` to `max`, quotient from 1 to 9 and not the divisor. */
function teilungMitRest(rng: Rng, divisors: readonly number[], min: number, max: number): [number, number] {
  const pairs: [number, number][] = [];
  for (const d of divisors) {
    for (let q = 1; q <= 9; q++) {
      for (let r = 1; r < d; r++) if (q !== d && q * d + r >= min && q * d + r <= max) pairs.push([q * d + r, d]);
    }
  }
  return rng.pick(pairs);
}

export const teilenRestSkill: SkillDef = {
  ...META,
  title: 'Teilen mit Rest',
  description: 'Du teilst und schaust, was übrig bleibt.',
  stufen: {
    1: 'Teilen bis 20 durch 2 bis 5 mit Bild',
    2: 'Teilen bis 50 durch 2, 5 und 10',
    3: 'Geschichten: Was bedeutet der Rest?',
  },
  kmk: KMK,
  optional: 'extra',
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const body = ((): ExerciseBody => {
      if (stufe === 1) {
        if (ab !== 3) {
          const [p, d] = ab === 1 ? teilungMitRest(rng, [2, 3, 4, 5], 5, 12) : teilungMitRest(rng, [3, 4, 5], 13, 20);
          return restRechnen(p, d, ab, true);
        }
        const [p, d] = teilungMitRest(rng, [2, 3, 4, 5], 7, 20);
        return rng.chance(0.5) ? dividendLuecke(p, d, ab, true) : restStimmt(rng, p, d, ab, true);
      }
      if (stufe === 2) {
        if (ab === 1) {
          const [p, d] = rng.chance(0.5) ? teilungMitRest(rng, [2], 11, 19) : teilungMitRest(rng, [5], 21, 34);
          return restRechnen(p, d, ab, false);
        }
        if (ab === 2) {
          const [p, d] = teilungMitRest(rng, [5], 35, 49);
          return restRechnen(p, d, ab, false);
        }
        const [p, d] = teilungMitRest(rng, [2, 5, 10], 11, 49);
        const kind = rng.pick(['dividend', 'stimmt', 'welche'] as const);
        if (kind === 'dividend') return dividendLuecke(p, d, ab, false);
        return kind === 'stimmt' ? restStimmt(rng, p, d, ab, false) : welcheMitRest(rng, p, d, ab, stufe);
      }
      const [p, d] = teilungMitRest(rng, [2, 5, 10], 7, 30);
      if (ab === 1) return restLeftover(rng, p, d, ab);
      if (ab === 2) return restAufrunden(rng, p, d, ab);
      // '1 volle Packungen' would not read, and with a quotient of 1 there is little to decide.
      return p < 2 * d || rng.chance(0.5) ? restBedeutung(rng, p, d, ab, stufe) : restAbrunden(rng, p, d, ab);
    })();
    return build(META, stufe, body);
  },
};
