import { apiBlob } from '../../lib/api/client';

export const fetchJapaneseAudio = (reading: string, signal?: AbortSignal) =>
  apiBlob(`/audio/tts?text=${encodeURIComponent(reading)}`, { signal });
