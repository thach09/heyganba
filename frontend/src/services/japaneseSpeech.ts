/**
 * Đọc tiếng Nhật bằng Web Speech API (browser TTS) — dùng chung cho Trạm Kana và phần "nghe" của đề thi thử.
 *
 * ⚠️ PLACEHOLDER: phần nghe của đề thi hiện dùng TTS vì chưa có file audio thu thật. Khi có audio thật
 * (Cloudflare R2 + CDN) thì thay bằng `new Audio(url).play()` và giữ TTS làm fallback.
 */
export type SpeechSource = 'tts' | 'none';

let cachedVoice: SpeechSynthesisVoice | null | undefined;

export function isJapaneseSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  if (!isJapaneseSpeechSupported()) {
    return null;
  }
  if (cachedVoice !== undefined) {
    return cachedVoice;
  }

  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find((voice) => voice.lang?.toLowerCase() === 'ja-jp') ??
    voices.find((voice) => voice.lang?.toLowerCase().startsWith('ja')) ??
    null;

  return cachedVoice;
}

if (isJapaneseSpeechSupported()) {
  // Chrome nạp danh sách voice bất đồng bộ → xoá cache khi danh sách thay đổi.
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined;
  };
}

export function speakJapanese(text: string, rate = 0.8): SpeechSource {
  if (!isJapaneseSpeechSupported() || !text) {
    return 'none';
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = rate;

  const voice = pickJapaneseVoice();
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return 'tts';
}

export function stopJapaneseSpeech(): void {
  if (isJapaneseSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}
