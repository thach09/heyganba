/**
 * Chinese Speech Synthesis Service (Mandarin Chinese / zh-CN)
 * 
 * Tuân thủ nguyên tắc:
 * - Không coi speechSynthesis.speak() thành công là bằng chứng phát âm chuẩn.
 * - Chỉ phát khi thiết bị thực sự có giọng Quan thoại (zh-CN / cmn-Hans-CN / zh).
 * - Nếu thiết bị không có giọng tiếng Trung, báo rõ trạng thái, TUYỆT ĐỐI KHÔNG âm thầm dùng giọng ngôn ngữ khác.
 * - Hỗ trợ dừng ngay lập tức (stopChineseSpeech) khi chuyển câu hoặc rời trang.
 */

export type SpeechStatus = 'spoken' | 'unsupported' | 'no-voice' | 'error';

let cachedVoice: SpeechSynthesisVoice | null | undefined;

export function isChineseSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function getChineseVoice(): SpeechSynthesisVoice | null {
  if (!isChineseSpeechSupported()) {
    return null;
  }
  if (cachedVoice !== undefined) {
    return cachedVoice;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    // Voices might not be loaded yet in some browsers
    return null;
  }

  // Ưu tiên các giọng zh-CN chuẩn Quan thoại đại lục (Mandarin)
  // Tuyệt đối không nhận nhầm tiếng Quảng Đông (zh-HK, zh-MO, yue) hoặc phương ngôn khác
  const isMandarinLang = (langStr: string): boolean => {
    const l = (langStr || '').toLowerCase().replace(/_/g, '-');
    // Danh sách loại trừ dứt khoát
    if (l.includes('hk') || l.includes('mo') || l.includes('tw') || l.startsWith('yue') || l.startsWith('wuu') || l.startsWith('hak') || l.startsWith('nan')) {
      return false;
    }
    // Chỉ nhận Quan thoại đại lục hoặc Mandarin chuẩn
    return (
      l === 'zh-cn' ||
      l === 'zh-hans-cn' ||
      l.startsWith('zh-cn-') ||
      l.startsWith('zh-hans-cn') ||
      l.startsWith('cmn-hans') ||
      l.startsWith('cmn-cn') ||
      l === 'cmn' ||
      l === 'zh-sg'
    );
  };

  cachedVoice =
    voices.find((v) => isMandarinLang(v.lang)) ??
    null;

  return cachedVoice;
}

if (typeof window !== 'undefined' && isChineseSpeechSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined;
    getChineseVoice();
  };
}

export function isChineseVoiceAvailable(): boolean {
  if (!isChineseSpeechSupported()) return false;
  return getChineseVoice() !== null;
}

export const CHINESE_SPEECH_RATES = {
  NORMAL: 0.95,
  SLOW: 0.75,
} as const;

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  slow?: boolean;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export function speakChinese(text: string, options: SpeakOptions = {}): SpeechStatus {
  if (!text || typeof window === 'undefined') {
    return 'unsupported';
  }

  if (!isChineseSpeechSupported()) {
    return 'unsupported';
  }

  const voice = getChineseVoice();
  if (!voice) {
    // Thiết bị không có giọng Quan thoại -> Tuyệt đối không fallback sang giọng tiếng Anh/tiếng Việt
    return 'no-voice';
  }

  try {
    // Dừng âm thanh cũ trước khi phát âm thanh mới
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang || 'zh-CN';
    const defaultRate = options.slow ? CHINESE_SPEECH_RATES.SLOW : CHINESE_SPEECH_RATES.NORMAL;
    utterance.rate = options.rate ?? defaultRate;
    if (options.pitch) {
      utterance.pitch = options.pitch;
    }

    if (options.onEnd) {
      utterance.onend = () => options.onEnd?.();
    }
    if (options.onError) {
      utterance.onerror = (e) => options.onError?.(e);
    }

    window.speechSynthesis.speak(utterance);
    return 'spoken';
  } catch (err) {
    console.warn('SpeechSynthesis error:', err);
    return 'error';
  }
}

/** Phát âm chậm (0.75x) giúp phân biệt thanh điệu và ngữ âm rõ ràng */
export function speakChineseSlow(text: string, options: Omit<SpeakOptions, 'slow'> = {}): SpeechStatus {
  return speakChinese(text, { ...options, slow: true });
}

export function stopChineseSpeech(): void {
  if (typeof window !== 'undefined' && isChineseSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function getVoiceDiagnostics(): {
  supported: boolean;
  hasVoice: boolean;
  voiceName: string | null;
  voiceLang: string | null;
} {
  const supported = isChineseSpeechSupported();
  const voice = getChineseVoice();
  return {
    supported,
    hasVoice: voice !== null,
    voiceName: voice?.name ?? null,
    voiceLang: voice?.lang ?? null,
  };
}
