/**
 * Mal und Geteilt. The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 *
 *        AB I                        AB II                         AB III
 * S1     2 · 7 = 14, so 14 : 2 = □,  14 : 7 = □ from 2 · 7, no     which Geteiltaufgabe, which Malaufgabe belongs
 *        with a field                field
 * S2     p : d = □, d from 2, 5, 10  p : □ = q, also with d = 1;   □ : d = q; which Malaufgabe checks it
 *                                    larger plain tasks
 * S3     family from a Malaufgabe    family from a Geteiltaufgabe; family with gaps only; which task does not belong;
 *                                    2 gaps                        mit Extras 49 : □ = □
 *
 * On Stufe 1 the answer stands in the fact shown (the catalogue's form): the demand is to place the numbers. On Stufe 3 no line is given
 * complete at AB I and II, so a family is worked out, not copied. Everywhere else no task shows its answer, so p : 1, p : p = 1 as a gap and q = d are left out. A plain Geteiltaufgabe recalls a fact, so it carries
 * its factKey; a task that shows the fact does not, and neither does the divisor from a square: this core skill must not start the
 * Extra's facts (src/state/facts.ts).
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import { BOX, MINUS } from '../../core/format';
import type { Ab, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { factKeyOf } from '../../state/facts';
import { build, bugList, makeChoice, multiBugs, targetAb, type ExerciseBody } from '../shared';
import { durch, feld, mal, malFrage, sr } from './helpers';

const META = { id: 'einmaleins.umkehren', topicId: 'einmaleins' } as const;
const KMK = ['ZO.operationen', 'ZO.kontrolle'];

function teilenBugs(q: number, p: number, d: number) {
  return bugList(q, [
    ['teilen-als-minus', p - d, `Teilen heißt: ${p} in gleich große Gruppen legen.`],
    ['ergebnis-nochmal-mal', p * d, `Beim Teilen wird es weniger. Wie oft passt die ${d} in ${p}?`],
  ]);
}

// ─── Stufe 1: the Malaufgabe is shown ────────────────────────────────────────

function malZuGeteilt(a: number, b: number, ab: Ab, divideByFirst: boolean, picture: boolean): ExerciseBody {
  const p = a * b;
  const [d, q] = divideByFirst ? [a, b] : [b, a];
  const prompt = `Du weißt: ${mal(a, b)} = ${p}.`;
  const expression = `${durch(p, d)} = ${BOX}`;
  return {
    key: `mal-zu-geteilt:${a}x${b}:${d}`,
    ab,
    prompt,
    expression,
    ...(picture ? { visual: feld(a, b) } : {}),
    answer: { kind: 'number', value: q, label: 'Ergebnis' },
    hints: ['Schau auf die Malaufgabe.', `Welche Zahl gehört zur ${d}?`],
    steps: [`Malaufgabe: ${mal(a, b)} = ${p}`, `Umkehraufgabe: ${durch(p, d)} = ${q}`],
    bugs: teilenBugs(q, p, d),
    praise: 'Du hast die Malaufgabe umgekehrt.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

/** Which Geteiltaufgabe belongs to this Malaufgabe? The wrong lines have the numbers in the wrong places. */
function geteiltWaehlen(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const p = a * b;
  const prompt = `Welche Geteiltaufgabe gehört zu ${mal(a, b)} = ${p}?`;
  const right = `${durch(p, a)} = ${b}`;
  return {
    key: `geteilt-waehlen:${a}x${b}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: right },
      rng.shuffle([
        { label: `${durch(p, a)} = ${a}`, whyWrong: `Prüfe: ${mal(a, a)} ist nicht ${p}.` },
        { label: `${durch(a, b)} = ${p}`, whyWrong: `Die größte Zahl steht vorne: ${p}.` },
        { label: `${durch(p, b)} = ${b}`, whyWrong: `Prüfe: ${mal(b, b)} ist nicht ${p}.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Das Ergebnis der Malaufgabe steht bei Geteilt vorne.', 'Prüfe jede Aufgabe mit mal.'],
    steps: [`Malaufgabe: ${mal(a, b)} = ${p}`, `Umkehraufgabe: ${right}`],
    praise: 'Du hast die Umkehraufgabe erkannt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** Which Malaufgabe helps with this Geteiltaufgabe? */
function malWaehlen(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const p = a * b;
  const prompt = `Welche Malaufgabe hilft bei ${durch(p, b)}?`;
  const neighbour = a < 10 ? a + 1 : a - 1;
  return {
    key: `mal-waehlen:${a}x${b}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: mal(a, b) },
      rng.shuffle([
        { label: mal(b, b), whyWrong: `${mal(b, b)} ergibt ${b * b}.` },
        { label: mal(neighbour, b), whyWrong: `${mal(neighbour, b)} ergibt ${neighbour * b}.` },
        { label: `${a} + ${b}`, whyWrong: `Plus passt hier nicht. Du suchst eine Malaufgabe mit dem Ergebnis ${p}.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: [`Das Ergebnis der Malaufgabe ist ${p}.`, `Die ${b} steht in der Malaufgabe hinten.`],
    steps: [`Die Malaufgabe hat das Ergebnis ${p}.`, `${mal(a, b)} = ${p}`, `Also: ${durch(p, b)} = ${a}`],
    praise: 'Du hast die passende Malaufgabe gefunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

// ─── Stufe 2: divisors 1, 2, 5, 10 ───────────────────────────────────────────

function teilenFakt(q: number, d: number, ab: Ab): ExerciseBody {
  const p = q * d;
  const expression = `${durch(p, d)} = ${BOX}`;
  const body: ExerciseBody = {
    key: `fakt:${p}:${d}`,
    ab,
    prompt: 'Rechne mit der Umkehraufgabe.',
    expression,
    answer: { kind: 'number', value: q, label: 'Ergebnis' },
    hints: [`Denk an die Malaufgabe: ${BOX} · ${d} = ${p}.`, `Wie oft passt die ${d} in ${p}?`],
    steps: [`Umkehraufgabe: ${BOX} · ${d} = ${p}`, `${mal(q, d)} = ${p}`, `Also: ${durch(p, d)} = ${q}`],
    bugs: teilenBugs(q, p, d),
    praise: 'Du hast die Umkehraufgabe genutzt.',
    srText: sr('Rechne mit der Umkehraufgabe.', expression),
    kmk: KMK,
  };
  const factKey = factKeyOf(q, d);
  if (factKey) body.factKey = factKey;
  return body;
}

function teilerLuecke(q: number, d: number, ab: Ab): ExerciseBody {
  const p = q * d;
  const expression = `${p} : ${BOX} = ${q}`;
  return {
    key: `teiler:${p}:${q}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: d, label: 'Zahl in der Lücke' },
    hints: [`Denk an die Malaufgabe: ${q} · ${BOX} = ${p}.`, malFrage(q, p)],
    steps: [`Umkehraufgabe: ${q} · ${BOX} = ${p}`, `${mal(q, d)} = ${p}`, `In die Lücke gehört ${d}.`],
    bugs: bugList(d, [
      ['teilen-als-minus', p - q, `Minus passt hier nicht. ${malFrage(q, p)}`],
      ['gleiche-zahl', q, `Die ${q} steht schon da. Welche Zahl fehlt noch?`],
    ]),
    praise: 'Du hast die passende Malaufgabe gefunden.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk: KMK,
  };
}

function dividendLuecke(q: number, d: number, ab: Ab): ExerciseBody {
  const p = q * d;
  const expression = `${BOX} : ${d} = ${q}`;
  return {
    key: `dividend:${q}:${d}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: p, label: 'Zahl in der Lücke' },
    hints: ['Rechne rückwärts mit der Malaufgabe.', `Rechne ${mal(q, d)}.`],
    steps: [`Umkehraufgabe: ${mal(q, d)} = ${BOX}`, `${mal(q, d)} = ${p}`, `In die Lücke gehört ${p}.`],
    bugs: bugList(p, [
      ['umkehr-plus', q + d, `Plus passt hier nicht. Rechne die Malaufgabe: ${mal(q, d)}.`],
      ['umkehr-minus', q === d ? null : Math.abs(q - d), `Minus passt hier nicht. Rechne die Malaufgabe: ${mal(q, d)}.`],
    ]),
    praise: 'Du hast mit der Malaufgabe rückwärts gerechnet.',
    srText: sr('Welche Zahl gehört in die Lücke?', expression),
    kmk: KMK,
  };
}

/** Which Malaufgabe checks this Geteiltaufgabe? */
function pruefWahl(rng: Rng, q: number, d: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const p = q * d;
  const line = `${durch(p, d)} = ${q}`;
  const prompt = `Welche Rechnung prüft ${line}?`;
  const right = `${mal(q, d)} = ${p}`;
  return {
    key: `pruefen:${q}:${d}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: right },
      rng.shuffle([
        { label: `${q} + ${d} = ${p}`, whyWrong: `Plus passt hier nicht. ${q} + ${d} ist nicht ${p}.` },
        { label: `${p} ${MINUS} ${d} = ${q}`, whyWrong: 'Minus prüft das Teilen nicht. Nimm die Malaufgabe.' },
        { label: `${mal(d, d)} = ${p}`, whyWrong: `${mal(d, d)} ergibt ${d * d}.` },
      ]),
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Mal und Geteilt gehören zusammen.', 'Nimm das Ergebnis mal die Zahl nach dem Geteilt.'],
    steps: ['Teilen prüfst du mit mal.', `${mal(q, d)} = ${p}`, `Also stimmt ${line}.`],
    praise: 'Du hast das Teilen mit mal geprüft.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** The result is not given: it is worked out, and then a Geteiltaufgabe of the family is written with it. □ : □ = 7 has its numbers in the Malaufgabe. */
function familie(a: number, b: number, ab: Ab): ExerciseBody {
  const p = a * b;
  const prompt = 'Rechne. Schreib dann die Geteiltaufgabe mit den gleichen Zahlen.';
  const fields: MultiField[] = [
    { id: 'p', value: p, before: `${mal(a, b)} =`, label: 'Ergebnis der Malaufgabe' },
    { id: 'dividend', value: p, label: 'Zahl vor dem Geteilt' },
    { id: 'teiler', value: a, before: ':', after: `= ${b}`, label: 'Zahl nach dem Geteilt' },
  ];
  return {
    key: `familie:${a}x${b}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Rechne zuerst die Malaufgabe.', 'Bei Geteilt steht dein Ergebnis vorne.'],
    steps: [`${mal(a, b)} = ${p}`, 'Bei Geteilt steht die größte Zahl vorne.', `${durch(p, a)} = ${b}`],
    bugs: multiBugs(
      [
        { id: 'familie-vertauscht', match: { p, dividend: p, teiler: b }, hint: `Es soll ${b} herauskommen. Prüfe das mit mal.` },
        { id: 'teilen-als-minus', match: { dividend: a, teiler: p }, hint: 'Die größte Zahl steht bei Geteilt vorne.' },
      ],
      fields,
    ),
    praise: 'Du hast die Geteiltaufgabe selbst geschrieben.',
    srText: sr(prompt, `${mal(a, b)} = ${BOX}.`, `${BOX} : ${BOX} = ${b}.`),
    kmk: KMK,
  };
}

/** The result of the Geteiltaufgabe is not given either: once it is worked out, it fills the other lines of the family. */
function familieAusGeteilt(a: number, b: number, ab: Ab): ExerciseBody {
  const p = a * b;
  const prompt = 'Rechne die erste Aufgabe. Fülle dann die anderen Lücken.';
  const fields: MultiField[] = [
    { id: 'u', value: a, before: `${durch(p, b)} =`, label: 'Erste Geteiltaufgabe' },
    { id: 'mal', value: a, after: `· ${b} = ${p}`, label: 'Malaufgabe' },
    { id: 'teiler', value: a, before: `${p} :`, after: `= ${b}`, label: 'Zweite Geteiltaufgabe' },
  ];
  return {
    key: `familie-geteilt:${a}x${b}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Denk an die Malaufgabe mit diesen Zahlen.', 'Alle Aufgaben haben die gleichen Zahlen.'],
    steps: [`${mal(a, b)} = ${p}`, `${durch(p, b)} = ${a}`, `${durch(p, a)} = ${b}`],
    bugs: multiBugs([{ id: 'teilen-als-minus', match: { u: p - b }, hint: `Teilen heißt: ${p} in gleich große Gruppen legen.` }], fields),
    praise: 'Du hast die ganze Aufgabenfamilie gefunden.',
    srText: sr(prompt, `${durch(p, b)} = ${BOX}.`, `${BOX} · ${b} = ${p}.`, `${p} : ${BOX} = ${b}.`),
    kmk: KMK,
  };
}

/** Three gaps of one family, and no line is complete: each gap comes from the other two numbers. */
function familieLuecken(a: number, b: number, ab: Ab): ExerciseBody {
  const p = a * b;
  const fields: MultiField[] = [
    { id: 'a', value: a, after: `· ${b} = ${p}`, label: 'Lücke in der Malaufgabe' },
    { id: 'b', value: b, before: `${p} :`, after: `= ${a}`, label: 'Lücke in der ersten Geteiltaufgabe' },
    { id: 'p', value: p, after: `: ${a} = ${b}`, label: 'Lücke in der zweiten Geteiltaufgabe' },
  ];
  return {
    key: `familie-luecken:${a}x${b}`,
    ab,
    prompt: 'Fülle alle Lücken der Aufgabenfamilie.',
    answer: { kind: 'multi', fields },
    hints: ['Alle Aufgaben haben die gleichen Zahlen.', 'Die größte Zahl steht bei Geteilt vorne.'],
    steps: [`${mal(a, b)} = ${p}`, `${durch(p, b)} = ${a} und ${durch(p, a)} = ${b}`, `Die Zahlen sind ${a}, ${b} und ${p}.`],
    bugs: multiBugs([{ id: 'familie-vertauscht', match: { a: b, b: a }, hint: 'Prüfe mit mal: Die 2 Zahlen gehören an andere Plätze.' }], fields),
    praise: 'Du hast die Aufgabenfamilie selbst gefüllt.',
    srText: sr('Fülle alle Lücken der Aufgabenfamilie.', `${BOX} · ${b} = ${p}.`, `${p} : ${BOX} = ${a}.`, `${BOX} : ${a} = ${b}.`),
    kmk: KMK,
  };
}

/** Which task does not belong? The answer has the numbers of the family with minus or in the wrong places. */
function gehoertNicht(rng: Rng, a: number, b: number, ab: Ab, stufe: Stufe): ExerciseBody {
  const p = a * b;
  const prompt = `Welche Aufgabe gehört nicht zur Familie von ${mal(a, b)}?`;
  const [form, falsch] = rng.pick([['klein-vorn', `${durch(a, p)} = ${b}`], ['minus', `${p} ${MINUS} ${a} = ${b}`], ['gleich', `${durch(p, b)} = ${b}`]] as const);
  const why = 'Diese Aufgabe gehört zur Familie. Prüfe mit mal.';
  return {
    key: `gehoert-nicht:${form}:${a}x${b}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      { label: falsch },
      [
        { label: `${mal(b, a)} = ${p}`, whyWrong: why },
        { label: `${durch(p, a)} = ${b}`, whyWrong: why },
        { label: `${durch(p, b)} = ${a}`, whyWrong: why },
      ],
      { max: MAX_CHOICE_OPTIONS[stufe] },
    ),
    hints: ['Eine Familie hat 2 Malaufgaben und 2 Geteiltaufgaben.', `Bei Geteilt steht die ${p} vorne.`],
    steps: [`Die Familie: ${mal(a, b)} = ${p} und ${mal(b, a)} = ${p}`, `Dazu: ${durch(p, a)} = ${b} und ${durch(p, b)} = ${a}`, `Gehört ${falsch} dazu? Nein.`],
    praise: 'Du hast die fremde Aufgabe erkannt.',
    srText: sr(prompt),
    kmk: KMK,
  };
}

/** The largest number is asked twice, □ : d = q and □ : q = d: no fact is given, so it comes from the Malaufgabe. */
function zweiLuecken(q: number, d: number, ab: Ab): ExerciseBody {
  const p = q * d;
  const prompt = 'Fülle beide Lücken.';
  const fields: MultiField[] = [
    { id: 'eins', value: p, after: `: ${d} = ${q}`, label: 'Erste Lücke' },
    { id: 'zwei', value: p, after: `: ${q} = ${d}`, label: 'Zweite Lücke' },
  ];
  return {
    key: `zwei:${q}:${d}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Rechne rückwärts mit der Malaufgabe.', 'Bei Geteilt steht die größte Zahl vorne.'],
    steps: [`Die Malaufgabe: ${mal(q, d)} = ${p}`, `${durch(p, d)} = ${q}`, `${durch(p, q)} = ${d}`],
    bugs: multiBugs([{ id: 'umkehr-plus', match: { eins: q + d }, hint: `Plus passt hier nicht. Rechne die Malaufgabe: ${mal(q, d)}.` }], fields),
    praise: 'Du hast mit der Malaufgabe rückwärts gerechnet.',
    srText: sr(prompt, `${BOX} : ${d} = ${q}.`, `${BOX} : ${q} = ${d}.`),
    kmk: KMK,
  };
}

/** 49 : □ = □ from the square 7 · 7 (Bayern, an extra): the divisor is asked, and it is the result as well. */
function quadratTeilen(n: number, ab: Ab): ExerciseBody {
  const p = n * n;
  const prompt = 'Denk an die Quadrataufgabe. Welche Zahl gehört in beide Lücken?';
  const expression = `${p} : ${BOX} = ${BOX}`;
  return {
    key: `quadrat:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: n, label: 'Zahl in den Lücken' },
    hints: [`Welche Zahl mal sich selbst ergibt ${p}?`, 'Probiere eine Zahl und rechne sie mal sich selbst.'],
    steps: [`Frage: Welche Zahl mal sich selbst ergibt ${p}?`, `Quadrataufgabe: ${mal(n, n)} = ${p}`, `Also: ${durch(p, n)} = ${n}`],
    bugs: bugList(n, [
      ['teilen-als-minus', p - n, `Teilen heißt: ${p} in gleich große Gruppen legen.`],
      ['ergebnis-nochmal-mal', p * n, `Beim Teilen wird es weniger. Welche Zahl mal sich selbst ergibt ${p}?`],
    ]),
    praise: 'Du hast die Quadrataufgabe umgekehrt.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
}

/** a from 2, 5, 10 and b from 2–10, b ≠ a. */
function kernFakt(rng: Rng): [number, number] {
  const a = rng.pick([2, 5, 10]);
  const pool = [2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => x !== a);
  return [a, rng.pick(pool)];
}

/** A fact with a divisor from `divisors` and a result from 2 to 10, the two different: a task never shows its own answer. */
function teilung(rng: Rng, divisors: readonly number[]): [q: number, d: number] {
  const d = rng.pick(divisors);
  const pool = [2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => x !== d);
  return [rng.pick(pool), d];
}

export const umkehrenSkill: SkillDef = {
  ...META,
  title: 'Mal und Geteilt',
  description: 'Du findest zur Malaufgabe die Geteiltaufgabe.',
  stufen: {
    1: '2 · 7 = 14, also 14 : 2 = □',
    2: 'Teilen durch 1, 2, 5 und 10, Zahlen bis 100',
    3: 'Aufgabenfamilien mit 4 Aufgaben. Mit Extras: Teilen mit Quadrataufgaben',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const body = ((): ExerciseBody => {
      if (stufe === 1) {
        const [k, n] = kernFakt(rng);
        const [a, b] = rng.chance(0.5) ? [k, n] : [n, k];
        const kernFirst = a === k;
        if (ab === 1) return malZuGeteilt(a, b, ab, kernFirst, true);
        if (ab === 2) return malZuGeteilt(a, b, ab, !kernFirst, false);
        return rng.chance(0.5) ? geteiltWaehlen(rng, a, b, ab, stufe) : malWaehlen(rng, a, b, ab, stufe);
      }
      if (stufe === 2) {
        if (ab === 1) {
          const [q, d] = rng.chance(0.15) ? [1, rng.pick([2, 5, 10])] : teilung(rng, [2, 5, 10]);
          return teilenFakt(q, d, ab);
        }
        if (ab === 2) {
          if (rng.chance(0.4)) {
            const q = rng.int(6, 10);
            const d = rng.pick([5, 10]);
            return teilenFakt(q === d ? 9 : q, d, ab);
          }
          const [q, d] = teilung(rng, [1, 2, 5, 10]);
          return teilerLuecke(q, d, ab);
        }
        const [q, d] = teilung(rng, [2, 5, 10]);
        return rng.chance(0.6) ? dividendLuecke(q, d, ab) : pruefWahl(rng, q, d, ab, stufe);
      }
      const [a, b] = kernFakt(rng);
      if (ab === 1) return familie(a, b, ab);
      if (ab === 2) return rng.chance(0.5) ? familieAusGeteilt(a, b, ab) : zweiLuecken(a, b, ab);
      const kinds = ctx.extras ? (['luecken', 'nicht', 'quadrat'] as const) : (['luecken', 'nicht'] as const);
      const kind = rng.pick<(typeof kinds)[number]>(kinds);
      if (kind === 'quadrat') return quadratTeilen(rng.int(3, 9), ab);
      return kind === 'luecken' ? familieLuecken(a, b, ab) : gehoertNicht(rng, a, b, ab, stufe);
    })();
    return build(META, stufe, body);
  },
};
