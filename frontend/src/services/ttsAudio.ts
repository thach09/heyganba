import { API_BASE_URL, getAccessToken } from './api';

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

export function ttsAudioUrl(kanaText: string): string {
  return `${API_BASE_URL}/audio/tts?text=${encodeURIComponent(kanaText)}`;
}

export function stopServerTts(): void {
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
  const token = getAccessToken();
  const response = await fetch(ttsAudioUrl(kanaText), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(`TTS server trả về ${response.status}`);
  }

  const blob = await response.blob();
  stopServerTts();

  const blobUrl = URL.createObjectURL(blob);
  const audio = new Audio(blobUrl);
  activeAudio = audio;
  activeBlobUrl = blobUrl;

  await audio.play();
  return 'google-tts';
}
