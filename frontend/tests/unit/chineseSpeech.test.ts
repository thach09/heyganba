import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

const mandarinVoice = { lang: 'zh-CN', name: 'Unit Mandarin voice' };

function stubSpeech(voices = [mandarinVoice]) {
  const speech = {
    getVoices: vi.fn(() => voices),
    cancel: vi.fn(),
    speak: vi.fn<(utterance: SpeechSynthesisUtterance) => void>(),
    onvoiceschanged: null as (() => void) | null,
  };
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string;
    constructor(text: string) { this.text = text; }
  });
  return speech;
}

test.each([undefined, { slow: false }])('normal speech uses the exported NORMAL rate with options %j', async (options) => {
  const speech = stubSpeech();
  const { speakChinese, CHINESE_SPEECH_RATES } = await import('../../src/services/chineseSpeech');
  expect(CHINESE_SPEECH_RATES.NORMAL).toBe(0.95);
  expect(speakChinese('测试', options)).toBe('spoken');
  expect(speech.speak).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    text: '测试', voice: mandarinVoice, lang: 'zh-CN', rate: CHINESE_SPEECH_RATES.NORMAL,
  }));
});

test('slow speech matches the existing 0.75x UI label', async () => {
  const speech = stubSpeech();
  const { speakChinese, CHINESE_SPEECH_RATES } = await import('../../src/services/chineseSpeech');
  expect(CHINESE_SPEECH_RATES.SLOW).toBe(0.75);
  expect(speakChinese('测试', { slow: true })).toBe('spoken');
  expect(speech.speak.mock.calls[0][0].rate).toBe(CHINESE_SPEECH_RATES.SLOW);
});

test.each([undefined, false, true])('explicit rate overrides the default with slow=%j', async (slow) => {
  const speech = stubSpeech();
  const { speakChinese } = await import('../../src/services/chineseSpeech');
  // PinyinQuiz is an existing caller with its own 0.78 rate.
  expect(speakChinese('测试', { slow, rate: 0.78 })).toBe('spoken');
  expect(speech.speak.mock.calls[0][0].rate).toBe(0.78);
});

test('speakChineseSlow uses the exported SLOW rate', async () => {
  const speech = stubSpeech();
  const { speakChineseSlow, CHINESE_SPEECH_RATES } = await import('../../src/services/chineseSpeech');
  expect(speakChineseSlow('测试')).toBe('spoken');
  expect(speech.speak.mock.calls[0][0]).toMatchObject({
    text: '测试', voice: mandarinVoice, rate: CHINESE_SPEECH_RATES.SLOW,
  });
});

test('speakChineseSlow preserves explicit rate and caller callbacks', async () => {
  const speech = stubSpeech();
  const { speakChineseSlow } = await import('../../src/services/chineseSpeech');
  const onEnd = vi.fn();
  const onError = vi.fn();
  expect(speakChineseSlow('测试', { rate: 0.8, pitch: 1.1, onEnd, onError })).toBe('spoken');
  const utterance = speech.speak.mock.calls[0][0];
  expect(utterance).toMatchObject({ rate: 0.8, pitch: 1.1 });
  expect(onEnd).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
  utterance.onend?.(new Event('end') as SpeechSynthesisEvent);
  const error = new Event('error') as SpeechSynthesisErrorEvent;
  utterance.onerror?.(error);
  expect(onEnd).toHaveBeenCalledOnce();
  expect(onError).toHaveBeenCalledExactlyOnceWith(error);
});

test('each new utterance cancels the old one before speaking and stop cancels again', async () => {
  const speech = stubSpeech();
  const { speakChinese, speakChineseSlow, stopChineseSpeech } = await import('../../src/services/chineseSpeech');
  expect(speakChinese('测试')).toBe('spoken');
  expect(speakChineseSlow('测试')).toBe('spoken');
  expect(speech.cancel.mock.invocationCallOrder[0]).toBeLessThan(speech.speak.mock.invocationCallOrder[0]);
  expect(speech.cancel.mock.invocationCallOrder[1]).toBeLessThan(speech.speak.mock.invocationCallOrder[1]);
  stopChineseSpeech();
  expect(speech.cancel).toHaveBeenCalledTimes(3);
});

test.each(['zh-HK', 'zh-MO', 'yue-HK'])('a Cantonese-only device (%s) never falls back to the wrong voice', async (lang) => {
  const speech = stubSpeech([{ lang, name: 'Cantonese' }]);
  const { speakChinese, speakChineseSlow } = await import('../../src/services/chineseSpeech');
  expect(speakChinese('测试', { slow: true })).toBe('no-voice');
  expect(speakChineseSlow('测试')).toBe('no-voice');
  expect(speech.speak).not.toHaveBeenCalled();
  expect(speech.cancel).not.toHaveBeenCalled();
});

test('Mandarin is selected even when Cantonese is listed first', async () => {
  const speech = stubSpeech([{ lang: 'zh-HK', name: 'Cantonese' }, mandarinVoice]);
  const { speakChinese } = await import('../../src/services/chineseSpeech');
  expect(speakChinese('测试')).toBe('spoken');
  expect(speech.speak.mock.calls[0][0].voice).toBe(mandarinVoice);
});

test('voices loaded later become available without an unsafe fallback', async () => {
  const speech = stubSpeech([]);
  const { speakChinese } = await import('../../src/services/chineseSpeech');
  expect(speakChinese('测试')).toBe('no-voice');
  expect(speech.speak).not.toHaveBeenCalled();
  speech.getVoices.mockReturnValue([mandarinVoice]);
  speech.onvoiceschanged?.();
  expect(speakChinese('测试')).toBe('spoken');
  expect(speech.speak.mock.calls[0][0].voice).toBe(mandarinVoice);
});
