/**
 * Standard Mandarin Pinyin Data (Hán ngữ Phiên âm chuẩn HSK)
 * 21 Thanh mẫu (Initials), 36 Vận mẫu (Finals), và 4 Thanh điệu (Tones).
 */

export interface PinyinItem {
  pinyin: string;
  name: string;
  ipa?: string;
  vietnameseGuide: string;
  exampleWord: string;
  exampleHanzi: string;
  exampleMeaning: string;
}

export interface ToneItem {
  toneNumber: number;
  nameVi: string;
  nameZh: string;
  pitchCurve: string; // e.g. "55", "35", "214", "51"
  symbol: string;
  descriptionVi: string;
  example: string;
  hanzi: string;
  meaning: string;
  // SVG coordinates on 5-degree grid (x1, y1, x2, y2, etc.)
  svgPath: string;
}

/** 21 Thanh mẫu (Initials) */
export const INITIALS: PinyinItem[] = [
  // Âm môi
  { pinyin: 'b', name: 'Thanh mẫu b', ipa: '[p]', vietnameseGuide: 'Đọc giống "p" trong tiếng Việt nhưng không bật hơi (VD: ba -> pa)', exampleWord: 'bàba', exampleHanzi: '爸爸', exampleMeaning: 'Bố, ba' },
  { pinyin: 'p', name: 'Thanh mẫu p', ipa: '[pʰ]', vietnameseGuide: 'Bật hơi mạnh, môi mím lại rồi bật luồng hơi ra', exampleWord: 'píngguǒ', exampleHanzi: '苹果', exampleMeaning: 'Quả táo' },
  { pinyin: 'm', name: 'Thanh mẫu m', ipa: '[m]', vietnameseGuide: 'Đọc giống "m" trong tiếng Việt', exampleWord: 'māma', exampleHanzi: '妈妈', exampleMeaning: 'Mẹ' },
  { pinyin: 'f', name: 'Thanh mẫu f', ipa: '[f]', vietnameseGuide: 'Đọc giống "ph" trong tiếng Việt', exampleWord: 'fànguǎn', exampleHanzi: '饭馆', exampleMeaning: 'Quán ăn' },

  // Âm đầu lưỡi
  { pinyin: 'd', name: 'Thanh mẫu d', ipa: '[t]', vietnameseGuide: 'Đọc giống "t" trong tiếng Việt, không bật hơi', exampleWord: 'dà', exampleHanzi: '大', exampleMeaning: 'To, lớn' },
  { pinyin: 't', name: 'Thanh mẫu t', ipa: '[tʰ]', vietnameseGuide: 'Đọc giống "th" trong tiếng Việt, bật hơi mạnh', exampleWord: 'tā', exampleHanzi: '他', exampleMeaning: 'Anh ấy' },
  { pinyin: 'n', name: 'Thanh mẫu n', ipa: '[n]', vietnameseGuide: 'Đọc giống "n" trong tiếng Việt', exampleWord: 'nǐ', exampleHanzi: '你', exampleMeaning: 'Bạn' },
  { pinyin: 'l', name: 'Thanh mẫu l', ipa: '[l]', vietnameseGuide: 'Đọc giống "l" trong tiếng Việt', exampleWord: 'lǎoshī', exampleHanzi: '老师', exampleMeaning: 'Thầy cô' },

  // Âm gốc lưỡi
  { pinyin: 'g', name: 'Thanh mẫu g', ipa: '[k]', vietnameseGuide: 'Đọc giống "c/k" trong tiếng Việt, không bật hơi', exampleWord: 'gāoxìng', exampleHanzi: '高兴', exampleMeaning: 'Vui vẻ' },
  { pinyin: 'k', name: 'Thanh mẫu k', ipa: '[kʰ]', vietnameseGuide: 'Đọc giống "kh" nhưng bật hơi từ cuống họng', exampleWord: 'kàn', exampleHanzi: '看', exampleMeaning: 'Xem, nhìn' },
  { pinyin: 'h', name: 'Thanh mẫu h', ipa: '[x]', vietnameseGuide: 'Đọc nửa "h" nửa "kh", phát âm nhẹ nhàng từ cuống họng', exampleWord: 'hǎo', exampleHanzi: '好', exampleMeaning: 'Tốt' },

  // Âm mặt lưỡi (Mặt lưỡi áp ngạc cứng)
  { pinyin: 'j', name: 'Thanh mẫu j', ipa: '[tɕ]', vietnameseGuide: 'Mặt lưỡi áp ngạc cứng, đọc giống "chi" trong tiếng Việt, không bật hơi', exampleWord: 'jiào', exampleHanzi: '叫', exampleMeaning: 'Kêu, gọi' },
  { pinyin: 'q', name: 'Thanh mẫu q', ipa: '[tɕʰ]', vietnameseGuide: 'Vị trí giống "j" nhưng bật hơi thật mạnh', exampleWord: 'qián', exampleHanzi: '钱', exampleMeaning: 'Tiền' },
  { pinyin: 'x', name: 'Thanh mẫu x', ipa: '[ɕ]', vietnameseGuide: 'Đọc giống "x" trong tiếng Việt nhưng mặt lưỡi áp sát ngạc cứng', exampleWord: 'xièxie', exampleHanzi: '谢谢', exampleMeaning: 'Cảm ơn' },

  // Âm đầu lưỡi quặt (Uốn lưỡi)
  { pinyin: 'zh', name: 'Thanh mẫu zh', ipa: '[tʂ]', vietnameseGuide: 'Uốn đầu lưỡi lên ngạc cứng, đọc như "tr", không bật hơi', exampleWord: 'zhōngguó', exampleHanzi: '中国', exampleMeaning: 'Trung Quốc' },
  { pinyin: 'ch', name: 'Thanh mẫu ch', ipa: '[tʂʰ]', vietnameseGuide: 'Uốn đầu lưỡi giống "zh" nhưng bật hơi cực mạnh', exampleWord: 'chī', exampleHanzi: '吃', exampleMeaning: 'Ăn' },
  { pinyin: 'sh', name: 'Thanh mẫu sh', ipa: '[ʂ]', vietnameseGuide: 'Uốn đầu lưỡi, ma sát luồng hơi, đọc như "s" uốn lưỡi', exampleWord: 'shì', exampleHanzi: '是', exampleMeaning: 'Là' },
  { pinyin: 'r', name: 'Thanh mẫu r', ipa: '[ʐ]', vietnameseGuide: 'Uốn đầu lưỡi, rung thanh quản nhẹ, đọc như "r"', exampleWord: 'rén', exampleHanzi: '人', exampleMeaning: 'Người' },

  // Âm đầu lưỡi trước (Răng trước)
  { pinyin: 'z', name: 'Thanh mẫu z', ipa: '[ts]', vietnameseGuide: 'Đầu lưỡi thẳng chạm mặt sau răng trên, đọc như "ch", không bật hơi', exampleWord: 'zàijiàn', exampleHanzi: '再见', exampleMeaning: 'Tạm biệt' },
  { pinyin: 'c', name: 'Thanh mẫu c', ipa: '[tsʰ]', vietnameseGuide: 'Vị trí giống "z" nhưng bật hơi mạnh', exampleWord: 'cài', exampleHanzi: '菜', exampleMeaning: 'Món ăn' },
  { pinyin: 's', name: 'Thanh mẫu s', ipa: '[s]', vietnameseGuide: 'Đầu lưỡi thẳng chạm sau răng trên, đọc nhẹ như "x"', exampleWord: 'sān', exampleHanzi: '三', exampleMeaning: 'Số ba' },
];

/** 36 Vận mẫu (Finals) */
export const FINALS: PinyinItem[] = [
  // Vận mẫu đơn
  { pinyin: 'a', name: 'Vận mẫu đơn a', vietnameseGuide: 'Mở rộng miệng, đọc giống "a"', exampleWord: 'bà', exampleHanzi: '爸', exampleMeaning: 'Bố' },
  { pinyin: 'o', name: 'Vận mẫu đơn o', vietnameseGuide: 'Tròn môi, đọc giống "ô"', exampleWord: 'wǒ', exampleHanzi: '我', exampleMeaning: 'Tôi' },
  { pinyin: 'e', name: 'Vận mẫu đơn e', vietnameseGuide: 'Hơi mở miệng, đọc giống "ưa"', exampleWord: 'hē', exampleHanzi: '喝', exampleMeaning: 'Uống' },
  { pinyin: 'i', name: 'Vận mẫu đơn i', vietnameseGuide: 'Kéo dẹt môi, đọc giống "i"', exampleWord: 'qǐng', exampleHanzi: '请', exampleMeaning: 'Mời' },
  { pinyin: 'u', name: 'Vận mẫu đơn u', vietnameseGuide: 'Tròn môi nhọn ra, đọc giống "u"', exampleWord: 'bù', exampleHanzi: '不', exampleMeaning: 'Không' },
  { pinyin: 'ü', name: 'Vận mẫu đơn ü', vietnameseGuide: 'Tròn môi đọc "i" nhưng giữ khẩu hình tròn môi đọc "uy"', exampleWord: 'nǚ', exampleHanzi: '女', exampleMeaning: 'Nữ, gái' },

  // Vận mẫu phức
  { pinyin: 'ai', name: 'Vận mẫu ai', vietnameseGuide: 'Đọc giống "ai" trong tiếng Việt', exampleWord: 'mǎi', exampleHanzi: '买', exampleMeaning: 'Mua' },
  { pinyin: 'ei', name: 'Vận mẫu ei', vietnameseGuide: 'Đọc giống "ây" trong tiếng Việt', exampleWord: 'měi', exampleHanzi: '美', exampleMeaning: 'Đẹp' },
  { pinyin: 'ui', name: 'Vận mẫu ui', vietnameseGuide: 'Đọc giống "uây"', exampleWord: 'duì', exampleHanzi: '对', exampleMeaning: 'Đúng' },
  { pinyin: 'ao', name: 'Vận mẫu ao', vietnameseGuide: 'Đọc giống "ao"', exampleWord: 'gāo', exampleHanzi: '高', exampleMeaning: 'Cao' },
  { pinyin: 'ou', name: 'Vận mẫu ou', vietnameseGuide: 'Đọc giống "âu"', exampleWord: 'dǒu', exampleHanzi: '斗', exampleMeaning: 'Đấu' },
  { pinyin: 'iu', name: 'Vận mẫu iu', vietnameseGuide: 'Đọc giống "iêu"', exampleWord: 'jiǔ', exampleHanzi: '九', exampleMeaning: 'Số chín' },
  { pinyin: 'ie', name: 'Vận mẫu ie', vietnameseGuide: 'Đọc giống "iê"', exampleWord: 'xiè', exampleHanzi: '谢', exampleMeaning: 'Cảm ơn' },
  { pinyin: 'üe', name: 'Vận mẫu üe', vietnameseGuide: 'Đọc tròn môi "uy-ê"', exampleWord: 'yuè', exampleHanzi: '月', exampleMeaning: 'Tháng' },
  { pinyin: 'er', name: 'Vận mẫu er', vietnameseGuide: 'Uốn lưỡi đọc "ơ-r"', exampleWord: 'èr', exampleHanzi: '二', exampleMeaning: 'Số hai' },

  // Vận mẫu mũi
  { pinyin: 'an', name: 'Vận mẫu an', vietnameseGuide: 'Đọc giống "an"', exampleWord: 'sān', exampleHanzi: '三', exampleMeaning: 'Số ba' },
  { pinyin: 'en', name: 'Vận mẫu en', vietnameseGuide: 'Đọc giống "ơn / ân"', exampleWord: 'rén', exampleHanzi: '人', exampleMeaning: 'Người' },
  { pinyin: 'in', name: 'Vận mẫu in', vietnameseGuide: 'Đọc giống "in"', exampleWord: 'jīn', exampleHanzi: '金', exampleMeaning: 'Vàng' },
  { pinyin: 'un', name: 'Vận mẫu un', vietnameseGuide: 'Đọc giống "uân"', exampleWord: 'wún', exampleHanzi: '温', exampleMeaning: 'Ấm' },
  { pinyin: 'ang', name: 'Vận mẫu ang', vietnameseGuide: 'Đọc giống "ang"', exampleWord: 'wáng', exampleHanzi: '王', exampleMeaning: 'Vua, họ Vương' },
  { pinyin: 'eng', name: 'Vận mẫu eng', vietnameseGuide: 'Đọc giống "âng"', exampleWord: 'péng', exampleHanzi: '朋', exampleMeaning: 'Bằng hữu' },
  { pinyin: 'ing', name: 'Vận mẫu ing', vietnameseGuide: 'Đọc giống "inh"', exampleWord: 'míng', exampleHanzi: '明', exampleMeaning: 'Sáng' },
  { pinyin: 'ong', name: 'Vận mẫu ong', vietnameseGuide: 'Đọc giống "ung"', exampleWord: 'zhōng', exampleHanzi: '中', exampleMeaning: 'Trung' },
];

/** 4 Thanh điệu chuẩn (Tones) + Thanh nhẹ */
export const TONES: ToneItem[] = [
  {
    toneNumber: 1,
    nameVi: 'Thanh 1 (Âm Bình)',
    nameZh: '第一声 (阴平)',
    pitchCurve: '55',
    symbol: '¯ (mā)',
    descriptionVi: 'Cao và bằng phẳng. Giữ cao độ 5-5 ngân dài đều, không lên không xuống.',
    example: 'mā',
    hanzi: '妈',
    meaning: 'Mẹ',
    svgPath: 'M 30 30 L 210 30',
  },
  {
    toneNumber: 2,
    nameVi: 'Thanh 2 (Dương Bình)',
    nameZh: '第二声 (阳平)',
    pitchCurve: '35',
    symbol: '´ (má)',
    descriptionVi: 'Vút lên cao giống dấu sắc tiếng Việt. Đi từ cao độ trung bình 3 vút thẳng lên 5.',
    example: 'má',
    hanzi: '麻',
    meaning: 'Cây gai / Tê bì',
    svgPath: 'M 30 110 L 210 30',
  },
  {
    toneNumber: 3,
    nameVi: 'Thanh 3 (Thượng Thanh)',
    nameZh: '第三声 (上声)',
    pitchCurve: '214',
    symbol: 'ˇ (mǎ)',
    descriptionVi: 'Xuống thấp rồi vút lên. Bắt đầu ở độ cao 2, hạ thấp nhất xuống 1 rồi vút lên 4.',
    example: 'mǎ',
    hanzi: '马',
    meaning: 'Con ngựa',
    svgPath: 'M 30 140 Q 110 200 130 200 T 210 70',
  },
  {
    toneNumber: 4,
    nameVi: 'Thanh 4 (Khứ Thanh)',
    nameZh: '第四声 (去声)',
    pitchCurve: '51',
    symbol: '` (mà)',
    descriptionVi: 'Rơi nhanh dứt khoát từ cao nhất xuống thấp nhất (từ độ cao 5 giáng xuống 1).',
    example: 'mà',
    hanzi: '骂',
    meaning: 'Mắng chửi',
    svgPath: 'M 30 30 L 210 200',
  },
  {
    toneNumber: 5,
    nameVi: 'Thanh Nhẹ (Khinh Thanh)',
    nameZh: '轻声',
    pitchCurve: '·',
    symbol: 'ma (không dấu)',
    descriptionVi: 'Ngắn gọn, nhẹ nhàng, phụ thuộc vào cao độ của âm tiết đứng liền trước.',
    example: 'ma',
    hanzi: '吗',
    meaning: 'Trợ từ nghi vấn',
    svgPath: 'M 115 115 A 6 6 0 1 1 125 115 A 6 6 0 1 1 115 115',
  },
];
