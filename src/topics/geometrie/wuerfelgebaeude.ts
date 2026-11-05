/**
 * Würfel bauen. heights[row][col] = cubes on a field; row 0 = hinten, last row = vorne.
 * The Stufe chooses the content (docs/research.md §6), the AB the demand inside it:
 * Stufe 1, up to 6 cubes, none hidden: AB I how many; AB II the highest tower, how many more; AB III how many are missing, which picture has n.
 * Stufe 2, up to 10 cubes with hidden ones, Bauplan: AB I how many (up to 8), Bauplan to cubes; AB II how many (up to 10), which Bauplan;
 * AB III how many are hidden, what is left over, which number stands in the Bauplan.
 * Stufe 3, the view from the front or the right: AB I from the front, of a small building; AB II from the front or the right; AB III from
 * a Bauplan, from the view back to the building, how many cubes the view shows.
 * Generated buildings with several rows never get higher towards the front or towards the right, so every tower top can be
 * seen from front-right-above and the count is unambiguous ("Kein Würfel schwebt").
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import type { Ab, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { bugList, targetAb } from '../shared';
import { distinctPictures, finish, pictureChoice, pictureStep, rightPicture, type Task, type WrongPicture } from './helpers';

const META = { id: 'geometrie.wuerfelgebaeude', topicId: 'geometrie' } as const;

type Heights = number[][];

const iso = (heights: Heights): Visual => ({ type: 'cubeBuilding', heights, view: 'iso' });
const plan = (heights: Heights): Visual => ({ type: 'cubeBuilding', heights, view: 'plan' });
const hid = (h: Heights) => h.map((r) => r.join('')).join('-');
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
export const total = (h: Heights): number => sum(h.flat());
const towers = (h: Heights) => h.flat().filter((v) => v > 0).length;
/** The most cubes of a Stufe 1 task (docs/research.md §6). */
const FEW = 6;
/** The most cubes of a Stufe 2 task: AB I stays smaller. */
const cubeLimit = (ab: Ab) => (ab === 1 ? 8 : 10);

/** Cubes no one can see from front-right-above: a cube in front, one on the right and one on top. */
export function hiddenCubes(h: Heights): number {
  let n = 0;
  h.forEach((row, r) => row.forEach((t, c) => {
    for (let z = 0; z < t - 1; z++) if ((h[r + 1]?.[c] ?? 0) > z && (row[c + 1] ?? 0) > z) n++;
  }));
  return n;
}

export const frontView = (h: Heights): number[] => h[0].map((_, c) => Math.max(...h.map((row) => row[c])));
/** The front row appears on the left. */
export const sideView = (h: Heights): number[] => h.map((row) => Math.max(...row)).reverse();

/** Never higher towards the front or the right; the first and the last row and column are used. */
function monotone(rng: Rng, R: number, C: number, maxH: number): Heights {
  for (;;) {
    const h: Heights = [];
    for (let r = 0; r < R; r++) {
      h.push([]);
      for (let c = 0; c < C; c++) {
        const ub = Math.min(r > 0 ? h[r - 1][c] : maxH, c > 0 ? h[r][c - 1] : maxH);
        const lb = r === 0 && c === 0 ? 1 : 0;
        h[r].push(ub < lb ? 0 : rng.int(lb, ub));
      }
    }
    if (h[R - 1][0] > 0 && h[0][C - 1] > 0) return h;
  }
}

function monotoneWhere(rng: Rng, R: number, C: number, maxH: number, ok: (h: Heights) => boolean): Heights {
  for (;;) {
    const h = monotone(rng, R, C, maxH);
    if (ok(h)) return h;
  }
}

const rowWord = (R: number, r: number) => (R === 1 ? '' : r === 0 ? 'Hinten' : r === R - 1 ? 'Vorne' : 'In der Mitte');

/** Worked steps: one line per row of the building, then the total. */
function rowSteps(h: Heights): Step[] {
  const rows = h.map((row, r) => ({ word: rowWord(h.length, r), towers: row.filter((v) => v > 0) })).filter((x) => x.towers.length > 0);
  const lines = rows.map(({ word, towers: t }) => `${word}: ${t.length > 1 ? `${t.join(' + ')} = ` : ''}${sum(t)} Würfel`);
  return [...lines, `${rows.map((x) => sum(x.towers)).join(' + ')} = ${total(h)} Würfel`];
}

/** AB I: count up to 6 cubes, none hidden: one row of towers, or a flat building of two rows. */
function zaehlen(rng: Rng): Task {
  if (rng.chance(0.3)) {
    const C = rng.int(2, 3);
    const h: Heights = [Array.from({ length: C }, () => 1), Array.from({ length: C }, () => 1)];
    return {
      key: `flach:${C}`,
      prompt: 'Wie viele Würfel sind es?',
      visual: iso(h),
      answer: { kind: 'number', value: 2 * C, unit: 'Würfel' },
      bugs: bugList(2 * C, [['nur-vordere-reihe', C, 'Hinten stehen auch Würfel. Schau auf beide Reihen.']]),
      hints: ['Schau auf die vordere und auf die hintere Reihe.', 'Rechne beide Reihen zusammen.'],
      steps: [`Hinten: ${C} Würfel. Vorne: ${C} Würfel.`, `${C} + ${C} = ${2 * C} Würfel`],
      praise: rng.pick(['Du hast beide Reihen mitgezählt.', 'Du hast auch hinten geschaut.']),
    };
  }
  for (;;) {
    const C = rng.int(2, 4);
    const row = Array.from({ length: C }, () => rng.int(1, 3));
    const n = sum(row);
    if (n > 6) continue;
    return {
      key: `reihe:${row.join('')}`,
      prompt: 'Wie viele Würfel sind es?',
      visual: iso([row]),
      answer: { kind: 'number', value: n, unit: 'Würfel' },
      bugs: bugList(n, [['nur-tuerme', C, 'Das sind die Türme. Manche Türme haben mehr Würfel.']]),
      hints: ['Schau Turm für Turm von links nach rechts.', 'Wie viele Würfel hat jeder Turm?'],
      steps: [`Von links: ${row.join(', ')} Würfel.`, `${row.join(' + ')} = ${n} Würfel`],
      praise: rng.pick(['Du bist Turm für Turm gegangen.', 'Du hast jeden Würfel einmal gezählt.']),
    };
  }
}

/** Stufe 1, AB II: the highest tower of a row. */
function hoechsterTurm(rng: Rng): Task {
  for (;;) {
    const C = rng.int(2, 4);
    const row = Array.from({ length: C }, () => rng.int(1, 4));
    const n = sum(row);
    const max = Math.max(...row);
    if (n > FEW || new Set(row).size < 2) continue;
    return {
      key: `hoch:${row.join('')}`,
      prompt: 'Wie viele Würfel hat der höchste Turm?',
      visual: iso([row]),
      answer: { kind: 'number', value: max, unit: 'Würfel' },
      bugs: bugList(max, [['alle-gezaehlt', n, 'Das sind alle Würfel. Gefragt ist nur der höchste Turm.']]),
      hints: ['Such zuerst den höchsten Turm.', 'Schau dann nur auf diesen Turm.'],
      steps: [`Von links: ${row.join(', ')} Würfel.`, `Der höchste Turm hat ${max} Würfel.`],
      praise: rng.pick(['Du hast die Türme verglichen.', 'Du hast nur auf den höchsten Turm geschaut.']),
    };
  }
}

/** A row of towers with at most `limit` cubes: none hidden. */
function drawRow(rng: Rng, limit: number): number[] {
  for (;;) {
    const row = Array.from({ length: rng.int(2, 4) }, () => rng.int(1, 3));
    if (sum(row) <= limit) return row;
  }
}

/** Stufe 1, AB II: how many cubes more has the highest tower than the lowest? */
function turmUnterschied(rng: Rng): Task {
  for (;;) {
    const row = drawRow(rng, FEW);
    const [hi, lo] = [Math.max(...row), Math.min(...row)];
    if (hi === lo) continue;
    const d = hi - lo;
    return {
      key: `mehr:${row.join('')}`,
      prompt: 'Wie viel höher ist der höchste Turm als der niedrigste?',
      visual: iso([row]),
      answer: { kind: 'number', value: d, unit: 'Würfel' },
      bugs: bugList(d, [
        ['alle-gezaehlt', hi, 'Das ist der höchste Turm. Vergleiche mit dem niedrigsten Turm.'],
        ['alle-gezaehlt', sum(row), 'Das sind alle Würfel. Vergleiche nur 2 Türme.'],
      ]),
      hints: ['Such zuerst den höchsten und den niedrigsten Turm.', 'Wie viele Würfel hat der höhere Turm mehr?'],
      steps: [`Der höchste Turm hat ${hi} Würfel, der niedrigste ${lo}.`, `${hi} − ${lo} = ${d}`, `Es ${d === 1 ? 'ist 1 Würfel' : `sind ${d} Würfel`} mehr.`],
      praise: rng.pick(['Du hast die 2 Türme verglichen.', 'Du hast den Unterschied gefunden.']),
    };
  }
}

/** Stufe 1, AB III: how many cubes are missing to a number? */
function fehlen(rng: Rng): Task {
  const row = drawRow(rng, FEW - 1);
  const n = sum(row);
  const want = rng.int(n + 1, FEW);
  const value = want - n;
  return {
    key: `fehlen:${want}:${row.join('')}`,
    prompt: `Du brauchst ${want} Würfel. Wie viele Würfel fehlen noch?`,
    visual: iso([row]),
    answer: { kind: 'number', value, unit: 'Würfel' },
    bugs: bugList(value, [['alle-gezaehlt', n, 'Das sind die Würfel im Bild. Wie viele fehlen noch?']]),
    hints: ['Wie viele Würfel sind schon da?', `Rechne weiter bis ${want}.`],
    steps: [`Im Bild: ${row.join(' + ')} = ${n} Würfel`, `${want} − ${n} = ${value}`, `Es ${value === 1 ? 'fehlt noch 1 Würfel' : `fehlen noch ${value} Würfel`}.`],
    praise: rng.pick(['Du hast vom Bild aus weiter gerechnet.', 'Du hast die fehlenden Würfel gefunden.']),
  };
}

/** Stufe 1, AB III: all towers as high as the highest one, and the whole stays at 6 cubes. */
function gleichHoch(rng: Rng): Task {
  for (;;) {
    const C = rng.int(2, 3);
    const hi = C === 2 ? rng.int(2, 3) : 2;
    const row = Array.from({ length: C }, () => rng.int(1, hi));
    if (Math.max(...row) !== hi || new Set(row).size < 2) continue;
    const n = sum(row);
    const whole = C * hi;
    const value = whole - n;
    const parts = row.map((t) => hi - t);
    return {
      key: `gleich-hoch:${row.join('')}`,
      context: 'Alle Türme sollen so hoch sein wie der höchste Turm.',
      prompt: 'Wie viele Würfel fehlen?',
      visual: iso([row]),
      answer: { kind: 'number', value, unit: 'Würfel' },
      bugs: bugList(value, [['alle-gezaehlt', n, 'Das sind die Würfel im Bild. Gefragt sind nur die neuen Würfel.'], ['nur-tuerme', C, 'Das sind die Türme. Gefragt sind die neuen Würfel.'], ['alle-gezaehlt', whole, 'Das sind alle Würfel am Ende. Gefragt sind nur die neuen Würfel.']]),
      hints: ['Such zuerst den höchsten Turm.', 'Wie viele Würfel fehlen bei jedem anderen Turm?'],
      steps: [`Von links fehlen: ${parts.join(', ')} Würfel.`, `${parts.join(' + ')} = ${value}`, `Es ${value === 1 ? 'fehlt 1 Würfel' : `fehlen ${value} Würfel`}.`],
      praise: rng.pick(['Du hast Turm für Turm verglichen.', 'Du hast jeden Turm mit dem höchsten verglichen.']),
    };
  }
}

/** Stufe 1, AB III, the other way round: from the number to the picture. */
function bildMitAnzahl(rng: Rng): Task {
  const right = drawRow(rng, FEW);
  const n = sum(right);
  const wrongs: WrongPicture[] = [];
  for (let tries = 0; tries < 200 && wrongs.length < 3; tries++) {
    const row = drawRow(rng, FEW);
    const m = sum(row);
    if (m === n || wrongs.some((w) => JSON.stringify(w.visual) === JSON.stringify(iso([row])))) continue;
    wrongs.push({ visual: iso([row]), whyWrong: `In diesem Bild sind es ${m} Würfel.` });
  }
  const answer = pictureChoice(rng, iso([right]), wrongs, MAX_CHOICE_OPTIONS[1]);
  return {
    key: `bild:${n}:${right.join('')}`,
    prompt: `Welches Bild zeigt ${n} Würfel?`,
    answer,
    hints: ['Geh bei jedem Bild Turm für Turm vor.', 'Rechne die Türme in jedem Bild zusammen.'],
    steps: [`${right.join(' + ')} = ${n} Würfel`, pictureStep(answer, `Das ist ${rightPicture(answer)}.`)],
    praise: rng.pick(['Du hast jedes Bild geprüft.', 'Du bist Bild für Bild vorgegangen.']),
  };
}

/** Stufe 2, AB I and AB II: a building with at least one hidden cube. */
function verdeckt(rng: Rng, ab: Ab): Task {
  const R = ab === 1 ? 2 : rng.int(2, 3);
  const C = R === 3 ? 2 : rng.int(2, 3);
  const h = monotoneWhere(rng, R, C, 3, (x) => hiddenCubes(x) >= 1 && total(x) <= cubeLimit(ab));
  const n = total(h);
  return {
    key: `verdeckt:${hid(h)}`,
    prompt: 'Kein Würfel schwebt. Wie viele Würfel sind es?',
    visual: iso(h),
    answer: { kind: 'number', value: n, unit: 'Würfel' },
    bugs: bugList(n, [
      ['wuerfel-verdeckt', n - hiddenCubes(h), 'Unter einem oberen Würfel steht noch einer.'],
      ['nur-tuerme', towers(h), 'Das sind die Türme. Manche Türme haben mehr Würfel.'],
      ['nur-vordere-reihe', sum(h[R - 1]), 'Hinten stehen auch Würfel. Schau auf alle Reihen.'],
    ]),
    hints: ['Unter jedem Würfel steht ein Würfel.', 'Geh Turm für Turm vor. Wie hoch ist jeder Turm?'],
    steps: rowSteps(h),
    praise: rng.pick(['Du hast auch die verdeckten Würfel mitgezählt.', 'Du hast an die Würfel unten gedacht.']),
  };
}

/** Stufe 2, AB III: how many cubes can no one see? */
function unsichtbar(rng: Rng): Task {
  const R = rng.int(2, 3);
  const C = R === 3 ? 2 : rng.int(2, 3);
  const h = monotoneWhere(rng, R, C, 3, (x) => hiddenCubes(x) >= 1 && total(x) <= 10);
  const n = total(h);
  const hidden = hiddenCubes(h);
  const seen = n - hidden;
  return {
    key: `unsichtbar:${hid(h)}`,
    prompt: 'Kein Würfel schwebt. Wie viele Würfel kannst du nicht sehen?',
    visual: iso(h),
    answer: { kind: 'number', value: hidden },
    bugs: bugList(hidden, [
      ['alle-gezaehlt', n, 'Das sind alle Würfel. Gefragt sind nur die verdeckten.'],
      ['wuerfel-verdeckt', seen, 'Das sind die Würfel im Bild. Gefragt sind die verdeckten.'],
    ]),
    hints: ['Wie viele Würfel hat das Gebäude insgesamt?', 'Wie viele davon siehst du? Rechne dann minus.'],
    steps: [`Das Gebäude hat ${n} Würfel.`, `Du siehst ${seen} Würfel.`, `${n} − ${seen} = ${hidden}`],
    praise: rng.pick(['Du hast an die Würfel unten gedacht.', 'Du hast alle Türme in Gedanken gebaut.']),
  };
}

/** Stufe 2, AB III: how many cubes are left after building to the plan? */
function planRest(rng: Rng): Task {
  for (;;) {
    const R = rng.int(2, 3);
    const C = R === 3 ? 2 : rng.int(2, 3);
    const h = Array.from({ length: R }, () => Array.from({ length: C }, () => rng.int(0, 3)));
    const n = total(h);
    if (n > 9 || n < 3 || towers(h) < 2) continue;
    const have = rng.int(n + 1, 10);
    const rest = have - n;
    const values = h.flat().filter((v) => v > 0);
    return {
      key: `plan-rest:${have}:${hid(h)}`,
      context: `Du hast ${have} Würfel. Du baust nach diesem Bauplan.`,
      prompt: 'Wie viele Würfel bleiben übrig?',
      visual: plan(h),
      answer: { kind: 'number', value: rest },
      bugs: bugList(rest, [
        ['alle-gezaehlt', n, 'Das sind die Würfel im Gebäude. Wie viele bleiben übrig?'],
        ['nur-tuerme', towers(h), 'Das sind die Türme. Die Zahl im Feld zeigt die Würfel.'],
      ]),
      hints: ['Rechne zuerst alle Zahlen im Bauplan zusammen.', 'Wie viele Würfel bleiben dann übrig?'],
      steps: [`${values.join(' + ')} = ${n} Würfel`, `${have} − ${n} = ${rest}`, `Es ${rest === 1 ? 'bleibt 1 Würfel' : `bleiben ${rest} Würfel`} übrig.`],
      praise: rng.pick(['Du hast den Bauplan genau gelesen.', 'Du hast erst den Bauplan gerechnet.']),
    };
  }
}

/** Stufe 2, AB III: from the building to one number of its Bauplan. */
function zahlImPlan(rng: Rng): Task {
  const R = rng.int(2, 3);
  const C = R === 3 ? 2 : rng.int(2, 3);
  for (;;) {
    const h = monotone(rng, R, C, 3);
    if (total(h) > 10) continue;
    const r = rng.pick([0, R - 1]);
    const c = rng.pick([0, C - 1]);
    const v = h[r][c];
    if (v === 0) continue;
    const where = `${r === 0 ? 'hinten' : 'vorne'} ${c === 0 ? 'links' : 'rechts'}`;
    return {
      key: `zahl-im-plan:${where.replace(' ', '-')}:${hid(h)}`,
      prompt: `Welche Zahl steht im Bauplan ${where}?`,
      visual: iso(h),
      answer: { kind: 'number', value: v },
      bugs: bugList(v, [
        ['alle-gezaehlt', total(h), 'Das sind alle Würfel. Gefragt ist nur dieser eine Turm.'],
        ['nur-tuerme', towers(h), 'Das sind die Türme. Die Zahl im Feld zeigt die Würfel.'],
      ]),
      hints: ['Im Bauplan steht die Höhe von jedem Turm.', `Such den Turm ${where}.`],
      steps: [`${r === 0 ? 'Hinten' : 'Vorne'} ${c === 0 ? 'links' : 'rechts'}: Der Turm hat ${v} Würfel.`, `Im Bauplan steht dort ${v}.`],
      praise: rng.pick(['Du hast Gebäude und Bauplan verbunden.', 'Du hast den Turm im Gebäude gefunden.']),
    };
  }
}

/** Stufe 2, AB I: how many cubes for this Bauplan? */
function planSumme(rng: Rng): Task {
  const R = 2;
  const C = rng.int(2, 3);
  const limit = cubeLimit(1);
  for (;;) {
    const h = Array.from({ length: R }, () => Array.from({ length: C }, () => rng.int(0, 3)));
    const n = total(h);
    if (n > limit || n < 3 || h.every((r) => r.every((v) => v === 0)) || towers(h) < 2) continue;
    const values = h.flat().filter((v) => v > 0);
    return {
      key: `plan:${hid(h)}`,
      prompt: 'Das ist ein Bauplan. Wie viele Würfel brauchst du?',
      visual: plan(h),
      answer: { kind: 'number', value: n, unit: 'Würfel' },
      bugs: bugList(n, [
        ['felder-gezaehlt', R * C, 'Das sind die Felder. Die Zahl im Feld zeigt die Würfel.'],
        ['nur-tuerme', towers(h), 'Das sind die Türme. Die Zahl im Feld zeigt die Würfel.'],
      ]),
      hints: ['Jede Zahl zeigt die Höhe vom Turm auf dem Feld.', 'Rechne alle Zahlen im Bauplan zusammen.'],
      steps: ['Jede Zahl zählt die Würfel auf dem Feld.', `${values.join(' + ')} = ${n} Würfel`],
      praise: rng.pick(['Du hast den Bauplan genau gelesen.', 'Du hast alle Zahlen im Bauplan genutzt.']),
    };
  }
}

/** Stufe 2, AB II: which Bauplan fits the building? */
function planWahl(rng: Rng): Task {
  const R = rng.int(2, 3);
  const C = R === 3 ? 2 : rng.int(2, 3);
  for (;;) {
    const h = monotone(rng, R, C, 3);
    if (total(h) > cubeLimit(2) || towers(h) < 2) continue;
    const rows = [...h].reverse();
    const cols = h.map((row) => [...row].reverse());
    const taller = h.map((row) => [...row]);
    const r = rng.int(0, R - 1);
    const c = rng.int(0, C - 1);
    taller[r][c] += taller[r][c] === 0 ? 1 : rng.chance(0.5) ? 1 : -1;
    const wrongs: WrongPicture[] = [
      { visual: plan(rows), whyWrong: 'Hier sind vorne und hinten vertauscht.' },
      { visual: plan(cols), whyWrong: 'Hier sind links und rechts vertauscht.' },
      { visual: plan(taller), whyWrong: 'Ein Turm hat hier eine andere Höhe.' },
    ];
    if (distinctPictures(plan(h), wrongs) < 3) continue;
    const answer = pictureChoice(rng, plan(h), wrongs, MAX_CHOICE_OPTIONS[2]);
    return {
      key: `waehle:${hid(h)}`,
      prompt: 'Welcher Bauplan passt zu diesem Gebäude?',
      visual: iso(h),
      answer,
      hints: ['Im Bauplan ist vorne unten.', 'Schau Turm für Turm: Wie hoch ist jeder Turm?'],
      steps: [...h.map((row, i) => `${rowWord(R, i)} von links: ${row.join(', ')}.`), pictureStep(answer, `Das ist ${rightPicture(answer)}.`)],
      praise: rng.pick(['Du hast Gebäude und Bauplan verglichen.', 'Du hast jeden Turm im Plan gefunden.']),
    };
  }
}

/** The picture of a view with these columns, from left to right. */
function viewPicture(cols: readonly number[], side: 'vorne' | 'rechts'): Visual {
  return side === 'vorne'
    ? { type: 'cubeBuilding', heights: [[...cols]], view: 'front' }
    : { type: 'cubeBuilding', heights: [...cols].reverse().map((v) => [v]), view: 'side' };
}

type Side = 'vorne' | 'rechts';

/** Stufe 3: which picture is the view? AB I from the front of a small building, AB II also from the right, AB III from a Bauplan. */
function ansicht(rng: Rng, ab: Ab): Task {
  const R = ab === 1 ? 2 : rng.int(2, 3);
  const C = rng.int(2, 3);
  const side: Side = ab === 1 ? 'vorne' : rng.pick(['vorne', 'rechts'] as const);
  const fromPlan = ab === 3;
  for (;;) {
    const h = monotone(rng, R, C, 3);
    if (total(h) > (ab === 1 ? 8 : 12)) continue;
    const front = frontView(h);
    const right = sideView(h);
    const cols = side === 'vorne' ? front : right;
    const other = side === 'vorne' ? right : front;
    const stacked = side === 'vorne' ? h[0].map((_, c) => sum(h.map((row) => row[c]))) : h.map((row) => sum(row)).reverse();
    const higher = [...cols];
    higher[rng.int(0, cols.length - 1)] += 1;
    const across = side === 'vorne' ? 'Spalte' : 'Reihe';
    const wrongs: WrongPicture[] = [
      { visual: viewPicture([...cols].reverse(), side), whyWrong: side === 'vorne' ? 'Hier sind links und rechts vertauscht.' : 'Hier sind vorne und hinten vertauscht.' },
      { visual: viewPicture(stacked, side), whyWrong: `Du siehst nur den höchsten Turm jeder ${across}.` },
      { visual: viewPicture(other, side), whyWrong: `Das Bild zeigt das Gebäude von ${side === 'vorne' ? 'rechts' : 'vorne'}.` },
      { visual: viewPicture(higher, side), whyWrong: 'Ein Turm ist in diesem Bild höher als im Gebäude.' },
    ];
    const correct = viewPicture(cols, side);
    if (distinctPictures(correct, wrongs) < 3) continue;
    const answer = pictureChoice(rng, correct, wrongs, ab === 1 ? 3 : MAX_CHOICE_OPTIONS[3]);
    return {
      key: `ansicht:${side}:${fromPlan ? 'bauplan' : 'iso'}:${hid(h)}`,
      prompt: `Wie sieht das Gebäude von ${side} aus?`,
      visual: fromPlan ? plan(h) : iso(h),
      answer,
      hints: [`Von ${side} siehst du in jeder ${across} nur den höchsten Turm.`, side === 'vorne' ? 'Links bleibt links, rechts bleibt rechts.' : 'Stell dich rechts neben das Gebäude. Vorne ist links.'],
      steps: [
        `Von ${side} zählt in jeder ${across} der höchste Turm.`,
        `Von links nach rechts: ${cols.join(', ')} Würfel.`,
        pictureStep(answer, `Das ist ${rightPicture(answer)}.`),
      ],
      praise: rng.pick([`Du hast von ${side} geschaut.`, `Du hast jede ${across} einzeln angeschaut.`]),
    };
  }
}

const viewOf = (h: Heights, side: Side) => (side === 'vorne' ? frontView(h) : sideView(h));

/** Stufe 3, AB III, the other way round: from the view to the building. A wrong building always has another view. */
function gebaeudeZurAnsicht(rng: Rng): Task {
  const side = rng.pick(['vorne', 'rechts'] as const);
  const R = 2;
  const C = rng.int(2, 3);
  for (;;) {
    const h = monotoneWhere(rng, R, C, 3, (x) => total(x) <= 10);
    const cols = viewOf(h, side);
    const wrongs: WrongPicture[] = [];
    for (let tries = 0; tries < 60 && wrongs.length < 3; tries++) {
      const other = monotoneWhere(rng, R, C, 3, (x) => total(x) <= 10);
      const seen = viewOf(other, side);
      if (seen.join() === cols.join() || wrongs.some((w) => JSON.stringify(w.visual) === JSON.stringify(iso(other)))) continue;
      wrongs.push({ visual: iso(other), whyWrong: `Von ${side} siehst du hier ${seen.join(', ')} Würfel.` });
    }
    if (wrongs.length < 2) continue;
    const answer = pictureChoice(rng, iso(h), wrongs, MAX_CHOICE_OPTIONS[3]);
    return {
      key: `umgekehrt:${side}:${hid(h)}`,
      prompt: `Das ist die Ansicht von ${side}. Welches Gebäude passt?`,
      visual: viewPicture(cols, side),
      answer,
      hints: [`Prüfe jedes Gebäude: Was siehst du von ${side}?`, 'Du siehst immer den höchsten Turm.'],
      steps: [`Von links nach rechts: ${cols.join(', ')} Würfel.`, pictureStep(answer, `Das ist ${rightPicture(answer)}.`)],
      praise: rng.pick(['Du hast jedes Gebäude von außen geprüft.', 'Du hast von der Ansicht zum Gebäude gedacht.']),
    };
  }
}

/** Stufe 3, AB III: how many cubes does this view show? */
function wuerfelInAnsicht(rng: Rng): Task {
  const side = rng.pick(['vorne', 'rechts'] as const);
  const h = monotoneWhere(rng, rng.int(2, 3), rng.int(2, 3), 3, (x) => total(x) <= 12 && sum(viewOf(x, side)) !== total(x));
  const cols = viewOf(h, side);
  const value = sum(cols);
  return {
    key: `in-ansicht:${side}:${hid(h)}`,
    prompt: `Du schaust von ${side} auf das Gebäude. Wie viele Würfel siehst du?`,
    visual: iso(h),
    answer: { kind: 'number', value, unit: 'Würfel' },
    bugs: bugList(value, [['wuerfel-verdeckt', total(h), `Das sind alle Würfel. Von ${side} siehst du nur die höchsten Türme.`]]),
    hints: [`Von ${side} siehst du in jeder ${side === 'vorne' ? 'Spalte' : 'Reihe'} nur den höchsten Turm.`, 'Rechne diese Türme zusammen.'],
    steps: [`Von links nach rechts: ${cols.join(', ')} Würfel.`, `${cols.join(' + ')} = ${value} Würfel`],
    praise: rng.pick([`Du hast von ${side} geschaut.`, 'Du hast nur die höchsten Türme gerechnet.']),
  };
}

const FORMS: Record<Stufe, Record<Ab, ((rng: Rng, ab: Ab) => Task)[]>> = {
  1: { 1: [zaehlen], 2: [hoechsterTurm, turmUnterschied], 3: [fehlen, gleichHoch, bildMitAnzahl] },
  2: { 1: [verdeckt, planSumme], 2: [verdeckt, planWahl], 3: [unsichtbar, planRest, zahlImPlan] },
  3: { 1: [ansicht], 2: [ansicht], 3: [ansicht, gebaeudeZurAnsicht, wuerfelInAnsicht] },
};

export const wuerfelgebaeudeSkill: SkillDef = {
  ...META,
  title: 'Würfel bauen',
  description: 'Du zählst Würfel und baust nach Plan.',
  stufen: { 1: 'Würfel zählen. Alle sind zu sehen.', 2: 'Auch verdeckte Würfel zählen. Baupläne lesen.', 3: 'Wie sieht das Gebäude von vorne oder rechts aus?' },
  kmk: ['RF.raum'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(META, stufe, ab, ['RF.raum'], rng.pick(FORMS[stufe][ab])(rng, ab));
  },
};
