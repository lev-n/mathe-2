/**
 * Read-aloud with local German voices only (docs/research.md §7.1, T16, P12): nothing leaves the device, nothing plays by itself.
 * The button appears only when the browser offers such a voice. Pure helpers, plus a thin wrapper around speechSynthesis.
 */
import { useEffect, useState } from 'react';
import { UNSOLVABLE_TEXT } from '../../core/check';
import { SYMBOL_WORDS, spokenWords } from '../../core/format';
import type { Exercise } from '../../core/types';

/** A local German voice, preferring de-DE; null if there is none. Voices served over the network are never used. */
export function localGermanVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const german = voices.filter((v) => v.localService && /^de\b/i.test(v.lang.replace('_', '-')));
  return german.find((v) => /^de-DE$/i.test(v.lang.replace('_', '-'))) ?? german[0] ?? null;
}

function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

// Browsers load the voice list on the first request: ask early, so it is there when the first task renders.
synth()?.getVoices();

/** The local German voice; browsers deliver their voice list late, through 'voiceschanged'. */
export function useLocalGermanVoice(): SpeechSynthesisVoice | null {
  // Known voices count from the first render: a button that appears afterwards would push the task down after its field was scrolled into view.
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(() => localGermanVoice(synth()?.getVoices() ?? []));
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const update = () => setVoice(localGermanVoice(s.getVoices()));
    update();
    s.addEventListener?.('voiceschanged', update);
    return () => s.removeEventListener?.('voiceschanged', update);
  }, []);
  return voice;
}

export function stopSpeaking(): void {
  synth()?.cancel();
}

/** Say `text` with `voice`, replacing what is being said; onEnd also runs when it was stopped. */
export function speakText(text: string, voice: SpeechSynthesisVoice, onEnd: () => void): void {
  const s = synth();
  if (!s || typeof SpeechSynthesisUtterance === 'undefined') {
    onEnd();
    return;
  }
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  u.onend = onEnd;
  u.onerror = onEnd;
  s.speak(u);
}

/** What the answer asks for, as far as it is text: the words around the field, the options, the items to order. */
function answerWords(ex: Exercise): string[] {
  const a = ex.answer;
  switch (a.kind) {
    case 'number':
      // T16: the whole task, so also the button that can be the answer.
      return [...(a.before || a.after || a.unit ? [[a.before, 'Lücke', a.unit, a.after].filter(Boolean).join(' ')] : []), ...(a.offerUnsolvable ? [UNSOLVABLE_TEXT] : [])];
    case 'multi':
      // A clock time is two fields around ':'. The voice says it as a time, as a ':' between two gaps reads as a division.
      return a.fields.flatMap((f, i) => {
        if (a.fields[i - 1]?.after === ':') return [];
        if (f.after === ':') return [[f.before, 'Lücke Uhr Lücke'].filter(Boolean).join(' ')];
        return f.before || f.after ? [[f.before, 'Lücke', f.after].filter(Boolean).join(' ')] : [];
      });
    case 'choice':
      // silentOptions: the option list would say the number word the child has to find.
      if (a.silentOptions) return [];
      return a.options.filter((o) => o.label.trim() !== '').map((o) => SYMBOL_WORDS[o.label.trim()] ?? o.label);
    case 'order':
      return a.items;
    default:
      return [];
  }
}

const closed = (text: string) => (/[.!?:]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

/** The whole task and the hints on screen, ready for the voice: numbers and signs as spoken words (T16). */
export function taskSpeech(ex: Exercise, hints: readonly string[] = []): string {
  const parts = [ex.context, ex.prompt, ex.expression, ...answerWords(ex), ...hints].filter((p): p is string => !!p && p.trim() !== '');
  return spokenWords(parts.map(closed).join(' '));
}
