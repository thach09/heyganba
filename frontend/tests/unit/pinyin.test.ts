import { describe, it, expect } from 'vitest';
import { canonicalizePinyin, canAccessPinyinContent, checkPinyinAnswer } from '../../src/features/pinyin/pinyinData';

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

describe('Academic Review Gating & Admin-Only Preview Access Control', () => {
  it('strictly blocks regular users from viewing PENDING_REVIEW content even if preview requested', () => {
    // Học viên thông thường (ROLE_USER)
    expect(canAccessPinyinContent('PENDING_REVIEW', 'ROLE_USER', true)).toBe(false);
    expect(canAccessPinyinContent('PENDING_REVIEW', 'ROLE_USER', false)).toBe(false);

    // Khách vãng lai chưa đăng nhập (null/undefined)
    expect(canAccessPinyinContent('PENDING_REVIEW', null, true)).toBe(false);
    expect(canAccessPinyinContent('PENDING_REVIEW', undefined, true)).toBe(false);
  });

  it('allows ONLY admin (ROLE_ADMIN) to preview PENDING_REVIEW content', () => {
    // Admin bật preview
    expect(canAccessPinyinContent('PENDING_REVIEW', 'ROLE_ADMIN', true)).toBe(true);

    // Admin tắt preview để kiểm tra giao diện học viên
    expect(canAccessPinyinContent('PENDING_REVIEW', 'ROLE_ADMIN', false)).toBe(false);
  });

  it('allows all users to view content once APPROVED by academic specialists', () => {
    expect(canAccessPinyinContent('APPROVED', 'ROLE_USER', false)).toBe(true);
    expect(canAccessPinyinContent('APPROVED', null, false)).toBe(true);
    expect(canAccessPinyinContent('APPROVED', 'ROLE_ADMIN', false)).toBe(true);
  });
});

describe('Multi-syllable Chinese Word Pinyin Verification (Milestone M2.1)', () => {
  it('correctly validates multi-syllable word answers in tone marks or numeric format', () => {
    // nǐ hǎo: có dấu, có khoảng trắng
    expect(checkPinyinAnswer('nǐ hǎo', 'nǐ hǎo')).toBe(true);
    // ni3 hao3: số thanh, có khoảng trắng
    expect(checkPinyinAnswer('ni3 hao3', 'nǐ hǎo')).toBe(true);
    // ni3hao3: số thanh dính liền
    expect(checkPinyinAnswer('ni3hao3', 'nǐ hǎo')).toBe(true);
    // xièxie / xie4xie / xie4xie5
    expect(checkPinyinAnswer('xièxie', 'xièxie')).toBe(true);
    expect(checkPinyinAnswer('xie4xie', 'xièxie')).toBe(true);
    expect(checkPinyinAnswer('xie4xie5', 'xièxie')).toBe(true);
    // nǐhǎo viết liền không dấu cách
    expect(checkPinyinAnswer('nǐhǎo', 'nǐ hǎo')).toBe(true);
    // zàijiàn / zai4jian4
    expect(checkPinyinAnswer('zàijiàn', 'zàijiàn')).toBe(true);
    expect(checkPinyinAnswer('zai4jian4', 'zàijiàn')).toBe(true);
    // shénme / shen2me
    expect(checkPinyinAnswer('shénme', 'shénme')).toBe(true);
    expect(checkPinyinAnswer('shen2me', 'shénme')).toBe(true);
    // míngzi / ming2zi
    expect(checkPinyinAnswer('míngzi', 'míngzi')).toBe(true);
    expect(checkPinyinAnswer('ming2zi', 'míngzi')).toBe(true);
  });

  it('rejects Chinese Hanzi pasted as Pinyin answer', () => {
    // Không nhận chính chữ Hán đang hiển thị làm đáp án đúng của câu hỏi yêu cầu nhập Pinyin
    expect(checkPinyinAnswer('你好', 'nǐ hǎo')).toBe(false);
    expect(checkPinyinAnswer('谢谢', 'xièxie')).toBe(false);
  });

  it('strictly preserves tone distinctions in multi-syllable words', () => {
    // Sai thanh điệu không bao giờ được tính đúng
    expect(checkPinyinAnswer('ní hào', 'nǐ hǎo')).toBe(false);
    expect(checkPinyinAnswer('ni4 hao3', 'nǐ hǎo')).toBe(false);
  });

  it('strictly preserves u and ü distinction in words', () => {
    expect(checkPinyinAnswer('lù', 'lǜ')).toBe(false);
    expect(checkPinyinAnswer('lu4', 'lv4')).toBe(false);
    expect(checkPinyinAnswer('lv4', 'lǜ')).toBe(true);
  });
});

