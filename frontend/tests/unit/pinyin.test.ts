import { describe, it, expect } from 'vitest';
import { canonicalizePinyin } from '../../src/features/pinyin/pinyinData';

describe('Pinyin Normalization and Verification (Milestone M1 Requirement 5)', () => {
  it('correctly maps tone numbers to diacritics and vice versa', () => {
    expect(canonicalizePinyin('hao3')).toBe('hao3');
    expect(canonicalizePinyin('hǎo')).toBe('hao3');
    expect(canonicalizePinyin('hao3')).toBe(canonicalizePinyin('hǎo'));
  });

  it('handles casing and whitespace gracefully', () => {
    expect(canonicalizePinyin('  Hao3  ')).toBe('hao3');
    expect(canonicalizePinyin('Hǎo')).toBe('hao3');
  });

  it('handles Unicode NFD decomposed vs NFC precomposed forms', () => {
    const nfdHao = 'h' + 'a\u030c' + 'o'; // NFD decomposed
    const nfcHao = 'hǎo';                 // NFC precomposed
    expect(canonicalizePinyin(nfdHao)).toBe('hao3');
    expect(canonicalizePinyin(nfcHao)).toBe('hao3');
    expect(canonicalizePinyin(nfdHao)).toBe(canonicalizePinyin(nfcHao));
  });

  it('preserves tone distinctions strictly (wrong tones MUST NOT match)', () => {
    const tone3 = canonicalizePinyin('hǎo'); // hao3
    const tone4 = canonicalizePinyin('hào'); // hao4
    const tone1 = canonicalizePinyin('hāo'); // hao1
    const tone2 = canonicalizePinyin('háo'); // hao2
    const noTone = canonicalizePinyin('hao');

    expect(tone3).toBe('hao3');
    expect(tone4).toBe('hao4');
    expect(tone3).not.toBe(tone4);
    expect(tone3).not.toBe(tone1);
    expect(tone3).not.toBe(tone2);
    expect(tone3).not.toBe(noTone);
  });

  it('distinguishes strictly between u and ü (never merges lu and lü)', () => {
    const lu4 = canonicalizePinyin('lù');   // lu4 (lộ - đường đi)
    const lv4 = canonicalizePinyin('lǜ');   // lv4 (lục - xanh lá)
    const lü4 = canonicalizePinyin('lü4');  // lv4
    const lv4Num = canonicalizePinyin('lv4'); // lv4

    expect(lu4).toBe('lu4');
    expect(lv4).toBe('lv4');
    expect(lü4).toBe('lv4');
    expect(lv4Num).toBe('lv4');

    // Crucial check: lu4 must NEVER equal lv4!
    expect(lu4).not.toBe(lv4);
    expect(canonicalizePinyin('lu')).not.toBe(canonicalizePinyin('lü'));
  });

  it('correctly handles nǚ vs nǔ', () => {
    expect(canonicalizePinyin('nǚ')).toBe('nv3');
    expect(canonicalizePinyin('nv3')).toBe('nv3');
    expect(canonicalizePinyin('nü3')).toBe('nv3');
    expect(canonicalizePinyin('nǔ')).toBe('nu3');
    expect(canonicalizePinyin('nǚ')).not.toBe(canonicalizePinyin('nǔ'));
  });
});
