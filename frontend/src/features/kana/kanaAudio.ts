import type { KanaEntry } from './kanaData';

/**
 * Phát âm một ký tự kana.
 *
 * - Ưu tiên file audio trên Cloudflare R2 + CDN (`entry.audioUrl`, đặt tên theo romaji — xem
 *   phase-1-tram-kana.md mục 1.4).
 * - Chưa cấu hình CDN (môi trường local hiện tại) → fallback Web Speech API giọng ja-JP
 *   để trạm vẫn nghe được phát âm ngay, không cần thêm dependency.
 */
export type KanaAudioSource = 'file' | 'tts' | 'none';

let activeAudio: HTMLAudioElement | null = null;
let cachedVoice: SpeechSynthesisVoice | null | undefined;

function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  if (cachedVoice !== undefined) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find((voice) => voice.lang?.toLowerCase() === 'ja-jp') ??
    voices.find((voice) => voice.lang?.toLowerCase().startsWith('ja')) ??
    null;

  return cachedVoice;
}

if (isSpeechSupported()) {
  // Chrome nạp danh sách voice bất đồng bộ → xoá cache khi danh sách thay đổi.
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined;
  };
}

export function stopKanaAudio(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

function speakKana(entry: KanaEntry): KanaAudioSource {
  if (!isSpeechSupported()) return 'none';

  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }

  const text = entry.audioText ?? entry.examples?.[0]?.word ?? entry.character;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.8;

  const voice = pickJapaneseVoice();
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return 'tts';
}

export function playKanaAudio(entry: KanaEntry): KanaAudioSource {
  if (entry.audioUrl) {
    stopKanaAudio();
    const audio = new Audio(entry.audioUrl);
    activeAudio = audio;
    audio.play().catch(() => {
      speakKana(entry);
    });
    return 'file';
  }

  return speakKana(entry);
}

export function describeKanaAudioSource(source: KanaAudioSource): string {
  switch (source) {
    case 'file':
      return 'Đang phát file audio từ CDN (Cloudflare R2).';
    case 'tts':
      return 'Đang phát bằng giọng ja-JP của trình duyệt (Web Speech API).';
    default:
      return 'Trình duyệt này không hỗ trợ phát âm tự động.';
  }
}
