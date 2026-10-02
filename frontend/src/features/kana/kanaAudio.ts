import type { KanaEntry } from './kanaData';
import { isJapaneseSpeechSupported, speakJapanese, stopJapaneseSpeech } from '../../services/japaneseSpeech';
import { playServerTts, stopServerTts } from '../../services/ttsAudio';

/**
 * Phát âm một ký tự kana.
 *
 * - Ưu tiên file audio trên Cloudflare R2 + CDN (`entry.audioUrl`, đặt tên theo romaji — xem
 *   phase-1-tram-kana.md mục 1.4).
 * - Chưa có file CDN → phát bằng TTS của SERVER (`/audio/tts`, Google Translate TTS giọng ja + cache ở
 *   backend, xem docs/Internal/content-mapping-fpt-curriculum.md → "Audio").
 * - Server lỗi (offline/dev chưa chạy backend) → fallback Web Speech API giọng ja-JP của trình duyệt.
 *
 * Lưu ý ngữ âm: với ッ/ー, `audioText` đã là từ mượn đầy đủ (ベッド / コーヒー) nên truyền đúng chuỗi kana.
 */
export type KanaAudioSource = 'file' | 'tts' | 'none';

let activeAudio: HTMLAudioElement | null = null;

export function stopKanaAudio(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  stopServerTts();
  stopJapaneseSpeech();
}

function speakKana(entry: KanaEntry): KanaAudioSource {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }

  if (!isJapaneseSpeechSupported()) {
    return 'none';
  }

  const text = entry.audioText ?? entry.examples?.[0]?.word ?? entry.character;
  return speakJapanese(text);
}

export function playKanaAudio(entry: KanaEntry): KanaAudioSource {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }

  if (entry.audioUrl) {
    stopKanaAudio();
    const audio = new Audio(entry.audioUrl);
    activeAudio = audio;
    audio.play().catch(() => {
      speakKana(entry);
    });
    return 'file';
  }

  // TTS của server là luồng chính (giọng đọc cố định + đã cache); Web Speech chỉ là fallback.
  const kanaText = entry.audioText ?? entry.character;
  stopKanaAudio();
  void playServerTts(kanaText).catch(() => {
    speakKana(entry);
  });
  return 'tts';
}

export function describeKanaAudioSource(source: KanaAudioSource): string {
  switch (source) {
    case 'file':
      return 'Đang phát file audio từ CDN (Cloudflare R2).';
    case 'tts':
      return 'Đang phát bằng giọng đọc tiếng Nhật của server (Google Translate TTS, đã cache).';
    default:
      return 'Trình duyệt này không hỗ trợ phát âm tự động.';
  }
}
