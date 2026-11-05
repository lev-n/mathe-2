import { describe, expect, it } from 'vitest';
import { childTextProblems, clauseProblems, hasRelativeClause, hintProblems, isCountAgainHint, numberWordProblems, praiseAndStepProblems, pronounProblems, sentences, subordinateClause, taskTextProblems, wordCount, longWords, longWordProblems } from './textRules';

describe('wordCount', () => {
  it('counts whitespace tokens without the maths symbols', () => {
    expect(wordCount('34 + 8 = □')).toBe(2);
    expect(wordCount('3 · 4 : 2 − 1')).toBe(4);
    expect(wordCount('Mia hat 3 € 40 ct.')).toBe(5);
    expect(wordCount('')).toBe(0);
  });
});

describe('sentences', () => {
  it('splits at . ! ?, not at a colon', () => {
    expect(sentences('Fast! Rechne erst zur 10: 3 + 7, dann noch 2.')).toEqual(['Fast!', 'Rechne erst zur 10: 3 + 7, dann noch 2.']);
    expect(sentences('Wie viele? ')).toEqual(['Wie viele?']);
  });
});

describe('T1–T4', () => {
  it('T1: a task without a story has at most 12 words, expression included', () => {
    expect(taskTextProblems({ prompt: 'Rechne.', expression: '34 + 8 = □' }, 1)).toEqual([]);
    const long = { prompt: 'eins zwei drei vier fünf. sechs sieben acht neun zehn. elf zwölf dreizehn.' };
    expect(taskTextProblems(long, 1).some((p) => p.startsWith('T1'))).toBe(true);
  });

  it('T2: an exercise with context may have 20, 25 or 30 words', () => {
    const words = (n: number) => Array.from({ length: n }, (_, i) => (i % 8 === 7 ? 'wort.' : 'wort')).join(' ');
    const ex = { context: words(20), prompt: 'Wie viele?' };
    expect(taskTextProblems(ex, 1).some((p) => p.startsWith('T2'))).toBe(true);
    expect(taskTextProblems(ex, 2).some((p) => p.startsWith('T2'))).toBe(false);
    expect(taskTextProblems({ context: words(24), prompt: 'Wie viele?' }, 2).some((p) => p.startsWith('T2'))).toBe(true);
    expect(taskTextProblems({ context: words(24), prompt: 'Wie viele?' }, 3).some((p) => p.startsWith('T2'))).toBe(false);
  });

  it('T3: at most 3 sentences, with the question', () => {
    const problems = taskTextProblems({ context: 'Mia hat 3 Äpfel. Tom hat 2 Äpfel. Ben hat 4 Äpfel.', prompt: 'Wie viele sind es?' }, 3);
    expect(problems.some((p) => p.startsWith('T3'))).toBe(true);
  });

  it('T4: at most 10 words per sentence, 12 on Stufe 3', () => {
    const s = { context: 'Mia und Tom und Ben und Ida gehen heute gerne zur Schule.', prompt: 'Wer fehlt?' };
    expect(taskTextProblems(s, 2).some((p) => p.startsWith('T4'))).toBe(true);
    expect(taskTextProblems(s, 3).some((p) => p.startsWith('T4'))).toBe(false);
  });
});

describe('T5', () => {
  it('bans the words that open a subordinate clause, as whole words', () => {
    for (const w of ['weil', 'wenn', 'dass', 'obwohl', 'nachdem', 'während', 'damit', 'sodass']) expect(subordinateClause(`Mia lacht, ${w} es regnet.`)).toBe(w);
    expect(subordinateClause('Wenn es regnet, bleibt Mia hier.')).toBe('Wenn');
    expect(subordinateClause('Das Wetter ist schön.')).toBeNull();
  });

  it('finds relative clauses, not lists or short second parts', () => {
    expect(hasRelativeClause('Das ist der Ball, den Tom hat.')).toBe(true);
    expect(hasRelativeClause('Mia hat einen Hund, der gerne spielt.')).toBe(true);
    expect(hasRelativeClause('Mia sieht den Ball, die Puppe und den Bär.')).toBe(false);
    expect(hasRelativeClause('Hör genau hin: Der Zehner steht vorne, der Einer hinten.')).toBe(false);
    expect(hasRelativeClause('Schau zuerst auf die Zehner.')).toBe(false);
    expect(clauseProblems(['Rechne.', 'Das ist der Ball, den Tom hat.'])).toHaveLength(1);
  });

  it('finds indirect questions and free relatives', () => {
    expect(subordinateClause('Zähle, was draufsteht.')).toBe('was');
    expect(subordinateClause('Die Zahl sagt, wie viele Felder du gehst.')).toBe('wie');
    expect(subordinateClause('Schau, wo Zehner und Einer gleich sind.')).toBe('wo');
    expect(subordinateClause('Das Bild klappt um. Was links außen ist, kommt nach rechts außen.')).toBe('Was');
  });

  it('leaves comparisons and direct questions alone', () => {
    expect(subordinateClause('Ein Rechteck hat 4 rechte Ecken, wie ein Blatt Papier.')).toBeNull();
    expect(subordinateClause('Würfel, Quader und Kugel. Was rollt, was kippt?')).toBeNull();
    expect(subordinateClause('Was kommt zuerst?')).toBeNull();
    expect(subordinateClause('Schau auf die Achse: Wie viel zählt ein Kästchen?')).toBeNull();
  });
});

describe('T9', () => {
  it('finds a pronoun across sentences or a colon', () => {
    expect(pronounProblems(['Eine Zahl passt nicht. Wie muss sie heißen?'])).toHaveLength(1);
    expect(pronounProblems(['Ein Kreis ist rund: Er hat keine Ecke.'])).toHaveLength(1);
    expect(pronounProblems(['Der Zehner zählt mit. Zähle ihn dazu.'])).toHaveLength(1);
  });

  it('allows a repeated noun, one sentence and the impersonal es', () => {
    expect(pronounProblems(['Eine Zahl passt nicht. Wie muss die Zahl heißen?', 'Es sind 7. Es bleiben 3.', 'Wer ist er?'])).toEqual([]);
  });
});

describe('T10', () => {
  it('finds number words, not articles, ordinals or compounds', () => {
    expect(numberWordProblems(['Welche zwei Münzen sind zusammen 50 ct?'])).toHaveLength(1);
    expect(numberWordProblems(['Vier Striche sind 4.'])).toHaveLength(1);
    expect(numberWordProblems(['Welche 2 Münzen passen?', 'Eine Münze fehlt.', 'Die zweite Zahl.', 'Der Zweier-Schritt.', 'Nimm einen Zehner.'])).toEqual([]);
  });

  it('counts for texts outside the generators', () => {
    expect(childTextProblems('Du kannst 3 Übungen sicher.')).toEqual([]);
    expect(childTextProblems('Du kannst drei Übungen sicher.').join()).toContain('T10');
    expect(childTextProblems('Das ist die Aufgabe. Sie ist neu.').join()).toContain('T9');
  });
});

describe('T15', () => {
  it('limits hints to 12 words and 2 sentences', () => {
    expect(hintProblems('Der Stift beginnt bei 3. Wie viele Zentimeter bis 9?')).toEqual([]);
    expect(hintProblems('Eins. Zwei. Drei.').join()).toContain('3 sentences');
    expect(hintProblems(Array.from({ length: 13 }, () => 'wort').join(' ')).join()).toContain('13 words');
  });

  it('limits praise, and worked steps on Stufe 1', () => {
    expect(praiseAndStepProblems({ praise: 'Du hast die Zehner zuerst angeschaut.', steps: ['35 + 5 = 40', '40 + 3 = 43'] }, 1)).toEqual([]);
    expect(praiseAndStepProblems({ praise: 'eins zwei drei vier fünf sechs sieben acht neun', steps: ['a'] }, 1).join()).toContain('of praise');
    expect(praiseAndStepProblems({ praise: 'Gut.', steps: ['a', 'b', 'c', 'd'] }, 1).join()).toContain('4 worked steps');
    expect(praiseAndStepProblems({ praise: 'Gut.', steps: ['a', 'b', 'c', 'd'] }, 2)).toEqual([]);
    expect(praiseAndStepProblems({ praise: 'Gut.', steps: [{ text: 'a\nb' }] }, 2).join()).toContain('line break');
  });
});

describe('count again', () => {
  it('finds the hints that tell a child to count again', () => {
    for (const bad of ['Zähl noch einmal.', 'Zähle noch mal nach.', 'Zähle nochmal.', 'Du kannst noch einmal zählen.', 'Zähl einfach weiter.', 'Zähl nach.', 'Du kannst nachzählen.', 'Nimm die Finger: Zähle mit den Fingern.']) {
      expect(isCountAgainHint(bad), bad).toBe(true);
    }
  });

  it('leaves hints that say what to count, and the hints of §5', () => {
    for (const ok of ['Zähle die Sprünge, nicht die Striche.', 'Zähle nicht die Münzen. Zähle, was draufsteht.', 'Zähle Euro und Cent getrennt: erst Euro, dann Cent.', 'Rechne erst zur 10.', 'Schau noch einmal auf das Rechenzeichen.']) {
      expect(isCountAgainHint(ok), ok).toBe(false);
    }
  });
});

describe('T8: long words', () => {
  it('finds words over 12 letters outside the allowlist', () => {
    expect(longWords('Du hast die Einer zusammengerechnet.')).toEqual(['zusammengerechnet']);
    expect(longWords('Nimm das Hunderterfeld und die Tauschaufgabe.')).toEqual([]);
    expect(longWords('vierunddreißig')).toEqual([]);
    expect(longWords('Kernaufgaben')).toEqual([]);
    expect(longWordProblems(['Eine Kästchenseite.'])).toEqual(['T8: "Kästchenseite" in "Eine Kästchenseite."']);
  });
});
