import { speakChinese } from '../../services/chineseSpeech';

export function playKanaAudio(text: string): void {
  speakChinese(text);
}

export function describeKanaAudioSource(): string {
  return 'Web Speech API (zh-CN)';
}
