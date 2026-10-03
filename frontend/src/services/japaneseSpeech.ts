import { playServerTts } from './ttsAudio';

/**
 * Đọc tiếng Nhật — dùng chung cho Trạm Kana và phần "nghe" của đề thi thử.
 *
 * Quyết định 27/09/2026: luồng CHÍNH là audio TTS của server (Google Translate TTS, đã cache ở backend để
 * không gọi lại API mỗi lần phát — xem docs/Internal/content-mapping-fpt-curriculum.md → "Audio"). Web Speech
 * API của trình duyệt chỉ còn là FALLBACK khi server lỗi hoặc máy dev chưa chạy backend.
 *
 * Ngữ âm: caller phải truyền CHUỖI KANA (cách đọc). Với từ vựng/kanji, dùng `reading` chứ không dùng chữ kanji
 * thô — nếu không TTS sẽ đọc theo cách đọc phổ biến nhất và sai với từ ghép.
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
  if (!text) {
    return 'none';
  }

  // Luồng chính: audio TTS của server (đã cache). Lỗi mạng/401 → rơi về giọng của trình duyệt.
  void playServerTts(text).catch(() => {
    speakWithBrowser(text, rate);
  });
  return 'tts';
}

function speakWithBrowser(text: string, rate: number): void {
  if (!isJapaneseSpeechSupported()) {
    return;
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
}

export function stopJapaneseSpeech(): void {
  if (isJapaneseSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}
