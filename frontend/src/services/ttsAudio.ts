import { fetchJapaneseAudio } from '../features/kana/audioApi';

/**
 * Phát âm tiếng Nhật bằng audio TTS của SERVER (Google Translate TTS đã cache ở backend).
 *
 * Vì sao không dùng `new Audio(url)`: endpoint `/audio/tts` yêu cầu đăng nhập nên phải gửi kèm header
 * Authorization — thẻ <audio> không gửi được header, nên ta fetch về blob rồi phát blob URL.
 *
 * QUAN TRỌNG (ngữ âm): luôn truyền CHUỖI KANA (cách đọc), không truyền chữ kanji thô — TTS sẽ đọc sai theo
 * cách đọc phổ biến nhất nếu nhận kanji (ví dụ 日 trong 日曜日).
 */
let activeAudio: HTMLAudioElement | null = null;
let activeBlobUrl: string | null = null;
let requestSequence = 0;
let pending: AbortController | null = null;

export function stopServerTts(): void {
  requestSequence++;
  pending?.abort();
  pending = null;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }
}

/** @returns 'google-tts' nếu phát được từ server. Ném lỗi để caller fallback sang Web Speech API. */
export async function playServerTts(kanaText: string): Promise<'google-tts'> {
  stopServerTts();
  const sequence = requestSequence;
  const controller = new AbortController();
  pending = controller;
  const blob = await fetchJapaneseAudio(kanaText, controller.signal);
  if (sequence !== requestSequence) throw new Error('Audio request superseded');

  const blobUrl = URL.createObjectURL(blob);
  const audio = new Audio(blobUrl);
  activeAudio = audio;
  activeBlobUrl = blobUrl;
  audio.addEventListener('ended', () => { if (activeAudio === audio) stopServerTts(); }, { once: true });

  await audio.play();
  return 'google-tts';
}
