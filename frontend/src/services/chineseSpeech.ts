/**
 * Chinese Speech Synthesis Service (Mandarin Chinese / zh-CN)
 * Uses Web Speech API with fallback voice matching for 'zh-CN', 'zh', 'cmn-Hans-CN'.
 */
export type SpeechSource = 'tts' | 'none';

let cachedVoice: SpeechSynthesisVoice | null | undefined;
let speechSequence = 0;

export function isChineseSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (!isChineseSpeechSupported()) {
    return null;
  }
  if (cachedVoice !== undefined) {
    return cachedVoice;
  }

  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find((voice) => voice.lang?.toLowerCase() === 'zh-cn') ??
    voices.find((voice) => voice.lang?.toLowerCase().replace('_', '-').startsWith('zh-cn')) ??
    voices.find((voice) => voice.lang?.toLowerCase().startsWith('zh')) ??
    null;

  return cachedVoice;
}

if (typeof window !== 'undefined' && isChineseSpeechSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined;
  };
}

export function speakChinese(text: string, rate = 0.85): SpeechSource {
  if (!text || typeof window === 'undefined') {
    return 'none';
  }

  speechSequence++;
  if (!isChineseSpeechSupported()) {
    return 'none';
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;

    const voice = pickChineseVoice();
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
    return 'tts';
  } catch (err) {
    console.warn('SpeechSynthesis error:', err);
    return 'none';
  }
}

export function stopChineseSpeech(): void {
  speechSequence++;
  if (typeof window !== 'undefined' && isChineseSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}
