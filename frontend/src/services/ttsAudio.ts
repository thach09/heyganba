import { apiBlob } from '../lib/api/client';

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
export async function playServerTts(text: string): Promise<'google-tts'> {
  stopServerTts();
  const sequence = requestSequence;
  const controller = new AbortController();
  pending = controller;
  const blob = await apiBlob(`/audio/tts?text=${encodeURIComponent(text)}`, { signal: controller.signal });
  if (sequence !== requestSequence) throw new Error('Audio request superseded');

  const blobUrl = URL.createObjectURL(blob);
  const audio = new Audio(blobUrl);
  activeAudio = audio;
  activeBlobUrl = blobUrl;
  audio.addEventListener('ended', () => { if (activeAudio === audio) stopServerTts(); }, { once: true });

  await audio.play();
  return 'google-tts';
}
