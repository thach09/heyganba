import type { KanaEntry } from './kanaData';
import { isJapaneseSpeechSupported, speakJapanese, stopJapaneseSpeech } from '../../services/japaneseSpeech';

/**
 * Phát âm một ký tự kana.
 *
 * - Ưu tiên file audio trên Cloudflare R2 + CDN (`entry.audioUrl`, đặt tên theo romaji — xem
 *   phase-1-tram-kana.md mục 1.4).
 * - Chưa cấu hình CDN (môi trường local hiện tại) → fallback Web Speech API giọng ja-JP
 *   (logic TTS nằm ở `services/japaneseSpeech.ts`, dùng chung với phần nghe của đề thi thử).
 */
export type KanaAudioSource = 'file' | 'tts' | 'none';

let activeAudio: HTMLAudioElement | null = null;

export function stopKanaAudio(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
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
