/**
 * Hán ngữ Phiên âm (Hanyu Pinyin Phonetics Data)
 * 
 * Nguồn đối chiếu:
 * 1. Đề án Pinyin Hán ngữ 1958 (Hanyu Pinyin Fang'an - Quốc vụ viện CHND Trung Hoa)
 *    Link tham chiếu chính thức: http://www.moe.gov.cn/jyb_sjzl/ziliao/A19/195802/t19580201_186000.html
 * 2. Phân loại chuẩn ngữ âm học:
 *    - 21 Thanh mẫu phụ âm thực thụ (Initials) + 2 Dạng mở đầu chính tả (y, w / 零声母形式).
 *    - 36 Vận mẫu (Finals): 6 Vận mẫu đơn, 13 Vận mẫu phức, 16 Vận mẫu mũi (8 mũi trước -n, 8 mũi sau -ng), 1 Vận mẫu đặc biệt (er).
 *    - 4 Thanh điệu cơ bản (Tones 1–4) theo thang 5 bậc âm vực Triệu Nguyên Nhậm (Zhao Yuanren) + Thanh nhẹ (Khinh thanh).
 *    - Quy tắc biến điệu thực tế: Nửa thanh 3 (Bán Thượng 211), biến điệu hai thanh 3 (23), biến điệu 不 và 一.
 * 
 * Trạng thái duyệt: PENDING_REVIEW (Đang trong quy trình thẩm định học thuật, chưa được giáo viên/chuyên gia tiếng Trung ký duyệt phát hành).
 */

export interface PinyinMetadata {
  curriculumVersion: string;
  sourceStandard: string;
  sourceUrl: string;
  reviewStatus: 'PENDING_REVIEW' | 'APPROVED';
  academicAuditNote: string;
  totals: {
    consonantInitials: number;
    orthographicMarkers: number;
    finals: number;
    singleFinals: number;
    compoundFinals: number;
    nasalFinals: number;
    specialFinals: number;
    tones: number;
    spellingRules: number;
    sandhiRules: number;
  };
}

export const PINYIN_METADATA: PinyinMetadata = {
  curriculumVersion: 'M1-1958-Draft',
  sourceStandard: 'Đề án Pinyin Hán ngữ 1958 (Hanyu Pinyin Fang\'an - Quốc vụ viện CHND Trung Hoa)',
  sourceUrl: 'http://www.moe.gov.cn/jyb_sjzl/ziliao/A19/195802/t19580201_186000.html',
  reviewStatus: 'PENDING_REVIEW',
  academicAuditNote: 'Nội dung đối chiếu cấu trúc Đề án 1958; đang ở trạng thái PENDING_REVIEW chờ thẩm định học thuật thực tế. Chưa phát hành chính thức cho người học.',
  totals: {
    consonantInitials: 21,
    orthographicMarkers: 2,
    finals: 36,
    singleFinals: 6,
    compoundFinals: 13,
    nasalFinals: 16,
    specialFinals: 1,
    tones: 5,
    spellingRules: 3,
    sandhiRules: 4,
  },
};

/**
 * Quyết định quyền truy cập nội dung Pinyin dựa trên trạng thái kiểm duyệt và vai trò người dùng.
 * Quy tắc bảo mật:
 * 1. Nếu reviewStatus === 'APPROVED': Mọi người dùng (kể cả khách) đều xem được.
 * 2. Nếu reviewStatus === 'PENDING_REVIEW': Chỉ người dùng có vai trò 'ROLE_ADMIN' mới có thể
 *    kích hoạt xem trước. Người dùng thông thường dù cố tình thêm ?preview=1 trên URL vẫn
 *    tuyệt đối KHÔNG được vượt qua màn hình chờ duyệt.
 */
export function canAccessPinyinContent(
  reviewStatus: 'PENDING_REVIEW' | 'APPROVED',
  userRole: string | undefined | null,
  adminPreviewActive: boolean = true
): boolean {
  if (reviewStatus === 'APPROVED') {
    return true;
  }
  const isAdmin = userRole === 'ROLE_ADMIN';
  return isAdmin && adminPreviewActive;
}

/**
 * Chuẩn hoá Pinyin chính xác:
 * - Chuyển cả dạng thanh điệu có dấu (hǎo) và dạng số thanh (hao3) về dạng canonical: base + tone number (hao3).
 * - Phân biệt nghiêm ngặt giữa u và ü (ü -> v: lù -> lu4, lǜ -> lv4, không bao giờ nhầm).
 * - Phân biệt nghiêm ngặt các thanh điệu: hào (hao4) !== hǎo (hao3).
 * - Không cho phép bỏ dấu thanh để ăn gian đáp án.
 */
export function canonicalizePinyin(raw: string): string {
  if (!raw) return '';
  let s = raw.trim().toLowerCase().normalize('NFD');

  // Lấy số thanh ở cuối nếu có (1-5)
  let explicitTone = '';
  const numMatch = s.match(/[1-5]$/);
  if (numMatch) {
    explicitTone = numMatch[0];
    if (explicitTone === '5') {
      explicitTone = ''; // Thanh nhẹ (neutral tone) quy ước tương đương không ghi số
    }
    s = s.slice(0, -1);
  }

  // Đổi ü (u + \u0308) thành v để không bị mất khi lọc combining marks
  s = s.replace(/u\u0308/g, 'v');
  s = s.replace(/\u0308/g, '');

  // Trích xuất dấu thanh điệu NFD
  let markTone = '';
  s = s.replace(/\u0304/g, () => { markTone = '1'; return ''; });
  s = s.replace(/\u0301/g, () => { markTone = '2'; return ''; });
  s = s.replace(/\u030c/g, () => { markTone = '3'; return ''; });
  s = s.replace(/\u0300/g, () => { markTone = '4'; return ''; });

  // Kiểm tra fallback cho ký tự NFC có dấu
  s = s.normalize('NFC');
  const map: Record<string, [string, string]> = {
    'ā': ['a', '1'], 'á': ['a', '2'], 'ǎ': ['a', '3'], 'à': ['a', '4'],
    'ē': ['e', '1'], 'é': ['e', '2'], 'ě': ['e', '3'], 'è': ['e', '4'],
    'ī': ['i', '1'], 'í': ['i', '2'], 'ǐ': ['i', '3'], 'ì': ['i', '4'],
    'ō': ['o', '1'], 'ó': ['o', '2'], 'ǒ': ['o', '3'], 'ò': ['o', '4'],
    'ū': ['u', '1'], 'ú': ['u', '2'], 'ǔ': ['u', '3'], 'ù': ['u', '4'],
    'ǖ': ['v', '1'], 'ǘ': ['v', '2'], 'ǚ': ['v', '3'], 'ǜ': ['v', '4'],
    'ü': ['v', ''],
  };

  let charTone = '';
  for (const [accented, [base, t]] of Object.entries(map)) {
    if (s.includes(accented)) {
      s = s.replace(new RegExp(accented, 'g'), base);
      if (t) charTone = t;
    }
  }

  s = s.replace(/ü/g, 'v');
  const tone = explicitTone || markTone || charTone;
  return s.trim() + (tone || '');
}

/**
 * Tách một chuỗi Pinyin (có hoặc không có khoảng trắng) thành danh sách các âm tiết hợp lệ.
 * - Hỗ trợ tách theo dấu cách / gạch nối / dấu nháy: "ni hao", "xī'ān".
 * - Hỗ trợ tách sau số thanh (1-5): "ni3hao3" -> ["ni3", "hao3"], "xie4xie" -> ["xie4", "xie"].
 * - Hỗ trợ tách từ ghép dính liền có thanh điệu: "xièxie" -> ["xiè", "xie"], "zàijiàn" -> ["zài", "jiàn"], "shénme" -> ["shén", "me"].
 */
export function splitPinyinWordIntoSyllables(raw: string): string[] {
  if (!raw) return [];
  const s = raw.trim();

  // 1. Tách trước các dấu phân cách rõ ràng (khoảng trắng, gạch ngang, gạch dưới, nháy đơn)
  const chunks = s.split(/[\s\-_']+/).filter(Boolean);
  const result: string[] = [];

  for (const chunk of chunks) {
    // 2. Nếu trong chunk có số thanh điệu (1-5) theo sau là ký tự chữ cái -> tách ngay sau số
    let separated = chunk.replace(/([1-5])(?=[a-zA-ZüÜvV])/g, '$1 ');

    // 3. Tách các âm tiết dính liền dựa trên ranh giới ngữ âm:
    // Phụ âm đầu (zh, ch, sh hoặc b,p,m,f,d,t,n,l,g,k,h,j,q,x,r,z,c,s,y,w)
    // khi đi liền sau nguyên âm hoặc coda (ng, n, r) của âm tiết trước và đứng trước nguyên âm tiếp theo.
    let prev = '';
    while (prev !== separated) {
      prev = separated;
      separated = separated.replace(
        /([aeiouvüAEIOUVÜ\u0300-\u036fāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ](?:ng|[nr])?)(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])([aeiouvüAEIOUVÜ\u0300-\u036fāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])/gi,
        '$1 $2$3'
      );
    }

    const subTokens = separated.split(/\s+/).filter(Boolean);
    result.push(...subTokens);
  }

  return result;
}

/**
 * Chuẩn hoá Pinyin cho cụm từ hoặc từ đơn nhiều âm tiết:
 * - Hỗ trợ cả từ 1 âm tiết (hǎo) và từ nhiều âm tiết (nǐ hǎo, xièxie, duìbuqǐ).
 * - Hỗ trợ nhập có dấu (nǐ hǎo) hoặc số thanh (ni3 hao3, ni3hao3).
 * - Nghiêm ngặt từ chối chữ Hán (nếu học viên dán nguyên chữ Hán vào ô nhập Pinyin thì bị tính sai).
 * - Bảo toàn nghiêm ngặt phân biệt thanh điệu và u/ü.
 */
export function canonicalizeChineseWordPinyin(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Từ chối tuyệt đối chữ Hán (Unicode Han characters: \u4e00-\u9fff, \u3400-\u4dbf)
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(trimmed)) {
    return '__HANZI_REJECTED__';
  }

  const syllables = splitPinyinWordIntoSyllables(trimmed);
  if (syllables.length === 0) return '';
  return syllables.map(t => canonicalizePinyin(t)).join(' ');
}

/**
 * Kiểm tra câu trả lời Pinyin của học viên đối với từ vựng tiếng Trung:
 * - Không nhận chính chữ Hán đang hiển thị làm đáp án đúng của câu hỏi yêu cầu nhập Pinyin.
 * - So sánh dạng chuẩn hoá cả khi học viên gõ có hoặc không có dấu cách giữa các âm tiết.
 * - Giữ nguyên tính chính xác của thanh điệu và âm u/ü (hào != hǎo, lù != lǜ).
 */
export function checkPinyinAnswer(userAnswer: string, expectedPinyin: string): boolean {
  if (!userAnswer || !expectedPinyin) return false;

  const canonicalUser = canonicalizeChineseWordPinyin(userAnswer);
  if (canonicalUser === '__HANZI_REJECTED__') {
    return false;
  }

  const canonicalExpected = canonicalizeChineseWordPinyin(expectedPinyin);

  // So sánh trực tiếp
  if (canonicalUser === canonicalExpected) {
    return true;
  }

  // So sánh dạng liền nhau (bỏ khoảng cách) nhưng giữ nguyên số thanh và phân biệt u/ü
  const userCompact = canonicalUser.replace(/\s+/g, '');
  const expectedCompact = canonicalExpected.replace(/\s+/g, '');
  return userCompact.length > 0 && userCompact === expectedCompact;
}

export interface PinyinItem {
  pinyin: string;
  name: string;
  ipa?: string;
  group: string;
  vietnameseGuide: string;
  hanziVoice: string; // Chữ Hán đại diện để kích hoạt âm đọc quy ước qua Web Speech API
  exampleWord: string;
  exampleHanzi: string;
  exampleMeaning: string;
  commonMistakeVi?: string;
  reviewStatus?: 'PENDING_REVIEW' | 'APPROVED';
}

export interface ToneItem {
  toneNumber: number;
  nameVi: string;
  nameZh: string;
  pitchCurve: string; // e.g. "55", "35", "214", "51"
  pitchCurveCitation?: string;
  pitchCurveContext?: string;
  symbol: string;
  descriptionVi: string;
  example: string;
  hanzi: string;
  meaning: string;
  svgPath: string;
  guidelineVi: string;
  reviewStatus?: 'PENDING_REVIEW' | 'APPROVED';
}

export interface SpellingRule {
  id: string;
  title: string;
  summary: string;
  details: string[];
  examples: { original: string; written: string; hanzi: string; meaning: string }[];
}

export interface ToneSandhiRule {
  id: string;
  title: string;
  ruleFormula: string;
  explanationVi: string;
  examples: { pinyinWritten: string; pinyinSpoken: string; hanzi: string; meaning: string }[];
}

export interface ConfusingSoundPair {
  id: string;
  title: string;
  descriptionVi: string;
  soundA: { pinyin: string; hanzi: string; note: string };
  soundB: { pinyin: string; hanzi: string; note: string };
  contrastExplanation: string;
}

/** 21 Thanh mẫu phụ âm (Initials) + 2 Bán nguyên âm (y, w) */
export const INITIALS: PinyinItem[] = [
  // 1. Âm hai môi (双唇音)
  {
    pinyin: 'b',
    name: 'Thanh mẫu b',
    ipa: '[p]',
    group: 'Âm hai môi',
    vietnameseGuide: 'Hai môi khép lại rồi mở nhẹ, KHÔNG bật hơi. Gần giống âm "p" nhẹ tiếng Việt.',
    hanziVoice: '八',
    exampleWord: 'bàba',
    exampleHanzi: '爸爸',
    exampleMeaning: 'Bố, ba',
    commonMistakeVi: 'Người Việt hay quen đọc thành "b" tiếng Việt; cần nhớ âm này là [p] không bật hơi.',
  },
  {
    pinyin: 'p',
    name: 'Thanh mẫu p',
    ipa: '[pʰ]',
    group: 'Âm hai môi',
    vietnameseGuide: 'Hai môi mím chặt rồi bật luồng hơi mạnh ra ngoài. Là âm BẬT HƠI của b.',
    hanziVoice: '坡',
    exampleWord: 'píngguǒ',
    exampleHanzi: '苹果',
    exampleMeaning: 'Quả táo',
    commonMistakeVi: 'Phải bật luồng hơi dứt khoát; để tờ giấy trước miệng thì giấy phải bay nhẹ.',
  },
  {
    pinyin: 'm',
    name: 'Thanh mẫu m',
    ipa: '[m]',
    group: 'Âm hai môi',
    vietnameseGuide: 'Hai môi khép lại, luồng hơi thoát ra theo khoang mũi. Tương tự âm "m" tiếng Việt.',
    hanziVoice: '摸',
    exampleWord: 'māma',
    exampleHanzi: '妈妈',
    exampleMeaning: 'Mẹ',
  },

  // 2. Âm môi răng (唇齿音)
  {
    pinyin: 'f',
    name: 'Thanh mẫu f',
    ipa: '[f]',
    group: 'Âm môi răng',
    vietnameseGuide: 'Răng trên chạm nhẹ môi dưới, luồng hơi ma sát thoát ra. Tương tự âm "ph" tiếng Việt.',
    hanziVoice: '佛',
    exampleWord: 'fànguǎn',
    exampleHanzi: '饭馆',
    exampleMeaning: 'Quán ăn, nhà hàng',
  },

  // 3. Âm đầu lưỡi giữa (舌尖中音)
  {
    pinyin: 'd',
    name: 'Thanh mẫu d',
    ipa: '[t]',
    group: 'Âm đầu lưỡi',
    vietnameseGuide: 'Đầu lưỡi chạm ngạc răng trên rồi hạ xuống, KHÔNG bật hơi. Gần giống âm "t" tiếng Việt.',
    hanziVoice: '得',
    exampleWord: 'dà',
    exampleHanzi: '大',
    exampleMeaning: 'To, lớn',
    commonMistakeVi: 'Tuyệt đối không đọc thành "đ" như tiếng Việt; phát âm là "t" nhẹ.',
  },
  {
    pinyin: 't',
    name: 'Thanh mẫu t',
    ipa: '[tʰ]',
    group: 'Âm đầu lưỡi',
    vietnameseGuide: 'Vị trí lưỡi giống "d" nhưng bật luồng hơi mạnh ra. Gần giống âm "th" tiếng Việt.',
    hanziVoice: '特',
    exampleWord: 'tā',
    exampleHanzi: '他',
    exampleMeaning: 'Anh ấy, cậu ấy',
    commonMistakeVi: 'Là âm bật hơi tương ứng của "d".',
  },
  {
    pinyin: 'n',
    name: 'Thanh mẫu n',
    ipa: '[n]',
    group: 'Âm đầu lưỡi',
    vietnameseGuide: 'Đầu lưỡi chạm lợi trên, luồng hơi thoát qua khoang mũi. Giống âm "n" tiếng Việt.',
    hanziVoice: '讷',
    exampleWord: 'nǐ',
    exampleHanzi: '你',
    exampleMeaning: 'Bạn, anh, chị',
  },
  {
    pinyin: 'l',
    name: 'Thanh mẫu l',
    ipa: '[l]',
    group: 'Âm đầu lưỡi',
    vietnameseGuide: 'Đầu lưỡi chạm lợi trên rồi hạ xuống, hơi thoát qua hai bên lưỡi. Giống âm "l" tiếng Việt.',
    hanziVoice: '勒',
    exampleWord: 'lǎoshī',
    exampleHanzi: '老师',
    exampleMeaning: 'Thầy giáo, cô giáo',
  },

  // 4. Âm cuống lưỡi / gốc lưỡi (舌根音)
  {
    pinyin: 'g',
    name: 'Thanh mẫu g',
    ipa: '[k]',
    group: 'Âm cuống lưỡi',
    vietnameseGuide: 'Cuống lưỡi nâng lên chạm ngạc mềm rồi hạ xuống, KHÔNG bật hơi. Giống âm "c/k" tiếng Việt.',
    hanziVoice: '哥',
    exampleWord: 'gāoxìng',
    exampleHanzi: '高兴',
    exampleMeaning: 'Vui vẻ',
    commonMistakeVi: 'Không đọc thành "g" tiếng Việt; phát âm là "c/k" không bật hơi.',
  },
  {
    pinyin: 'k',
    name: 'Thanh mẫu k',
    ipa: '[kʰ]',
    group: 'Âm cuống lưỡi',
    vietnameseGuide: 'Vị trí giống "g" nhưng cuống họng bật luồng hơi mạnh ra ngoài. Gần giống "kh" bật hơi.',
    hanziVoice: '科',
    exampleWord: 'kàn',
    exampleHanzi: '看',
    exampleMeaning: 'Xem, nhìn',
    commonMistakeVi: 'Bật hơi mạnh từ gốc lưỡi, khác với "kh" ma sát nhẹ của tiếng Việt.',
  },
  {
    pinyin: 'h',
    name: 'Thanh mẫu h',
    ipa: '[x]',
    group: 'Âm cuống lưỡi',
    vietnameseGuide: 'Gốc lưỡi tiếp cận ngạc mềm tạo khe hẹp ma sát nhẹ. Lai giữa âm "h" và "kh" tiếng Việt.',
    hanziVoice: '喝',
    exampleWord: 'hǎo',
    exampleHanzi: '好',
    exampleMeaning: 'Tốt, đẹp, ổn',
  },

  // 5. Âm mặt lưỡi (舌面前音 - chỉ kết hợp với i, ü)
  {
    pinyin: 'j',
    name: 'Thanh mẫu j',
    ipa: '[tɕ]',
    group: 'Âm mặt lưỡi',
    vietnameseGuide: 'Mặt lưỡi trước áp sát ngạc cứng, mép môi bè sang bên, KHÔNG bật hơi. Gần như "ch-i" nhẹ.',
    hanziVoice: '鸡',
    exampleWord: 'jiào',
    exampleHanzi: '叫',
    exampleMeaning: 'Tên là, gọi là',
  },
  {
    pinyin: 'q',
    name: 'Thanh mẫu q',
    ipa: '[tɕʰ]',
    group: 'Âm mặt lưỡi',
    vietnameseGuide: 'Khẩu hình giống "j" nhưng đẩy luồng hơi cực mạnh qua khe hẹp mặt lưỡi.',
    hanziVoice: '七',
    exampleWord: 'qián',
    exampleHanzi: '钱',
    exampleMeaning: 'Tiền bạc',
    commonMistakeVi: 'Đây là âm bật hơi người Việt hay quên bật; phải dồn hơi ở mặt lưỡi rồi đẩy mạnh ra.',
  },
  {
    pinyin: 'x',
    name: 'Thanh mẫu x',
    ipa: '[ɕ]',
    group: 'Âm mặt lưỡi',
    vietnameseGuide: 'Mặt lưỡi nâng cao sát ngạc cứng ma sát nhẹ luồng hơi. Tương tự âm "x" tiếng Việt nhưng dẹt môi.',
    hanziVoice: '西',
    exampleWord: 'xièxie',
    exampleHanzi: '谢谢',
    exampleMeaning: 'Cảm ơn',
  },

  // 6. Âm đầu lưỡi sau / uốn lưỡi (舌尖后音 - đi với -i phát âm [ʅ])
  {
    pinyin: 'zh',
    name: 'Thanh mẫu zh',
    ipa: '[tʂ]',
    group: 'Âm uốn lưỡi',
    vietnameseGuide: 'Đầu lưỡi uốn cong lên chạm ngạc cứng trên, KHÔNG bật hơi. Gần giống "tr" miền Nam nhưng không rung.',
    hanziVoice: '知',
    exampleWord: 'zhōngguó',
    exampleHanzi: '中国',
    exampleMeaning: 'Trung Quốc',
  },
  {
    pinyin: 'ch',
    name: 'Thanh mẫu ch',
    ipa: '[tʂʰ]',
    group: 'Âm uốn lưỡi',
    vietnameseGuide: 'Đầu lưỡi uốn cong như "zh" nhưng bật luồng hơi mạnh ra ngoài ngạc cứng.',
    hanziVoice: '吃',
    exampleWord: 'chī',
    exampleHanzi: '吃',
    exampleMeaning: 'Ăn',
    commonMistakeVi: 'Khác "zh" ở chỗ hơi phải bật mạnh qua vòm họng.',
  },
  {
    pinyin: 'sh',
    name: 'Thanh mẫu sh',
    ipa: '[ʂ]',
    group: 'Âm uốn lưỡi',
    vietnameseGuide: 'Đầu lưỡi uốn cong lên ngạc cứng tạo khe hẹp ma sát luồng hơi. Tựa âm "s" uốn lưỡi.',
    hanziVoice: '诗',
    exampleWord: 'shì',
    exampleHanzi: '是',
    exampleMeaning: 'Là, đúng vậy',
  },
  {
    pinyin: 'r',
    name: 'Thanh mẫu r',
    ipa: '[ʐ]',
    group: 'Âm uốn lưỡi',
    vietnameseGuide: 'Khẩu hình giống "sh" nhưng thanh quản rung, luồng hơi ma sát nhẹ. Gần giống âm "r" tiếng Việt.',
    hanziVoice: '日',
    exampleWord: 'rén',
    exampleHanzi: '人',
    exampleMeaning: 'Người',
  },

  // 7. Âm đầu lưỡi trước (舌尖前音 - đi với -i phát âm [ɿ])
  {
    pinyin: 'z',
    name: 'Thanh mẫu z',
    ipa: '[ts]',
    group: 'Âm răng trước',
    vietnameseGuide: 'Đầu lưỡi thẳng chạm mặt sau răng trên rồi hé ra nhẹ, KHÔNG bật hơi. Giống "ch" dẹt lưỡi.',
    hanziVoice: '资',
    exampleWord: 'zàijiàn',
    exampleHanzi: '再见',
    exampleMeaning: 'Tạm biệt',
  },
  {
    pinyin: 'c',
    name: 'Thanh mẫu c',
    ipa: '[tsʰ]',
    group: 'Âm răng trước',
    vietnameseGuide: 'Vị trí giống "z" nhưng bật luồng hơi mạnh qua kẽ hai hàm răng khép nhẹ.',
    hanziVoice: '疵',
    exampleWord: 'cài',
    exampleHanzi: '菜',
    exampleMeaning: 'Món ăn, rau',
    commonMistakeVi: 'Là âm bật hơi của "z", người học cần cắn nhẹ răng để luồng hơi bật qua kẽ răng.',
  },
  {
    pinyin: 's',
    name: 'Thanh mẫu s',
    ipa: '[s]',
    group: 'Âm răng trước',
    vietnameseGuide: 'Đầu lưỡi thẳng để sát sau răng trên tạo khe hẹp ma sát luồng hơi. Giống "x" tiếng Việt nhẹ.',
    hanziVoice: '思',
    exampleWord: 'sān',
    exampleHanzi: '三',
    exampleMeaning: 'Số ba',
  },

  // 8. Dạng mở đầu chính tả độc lập (零声母形式 - y, w)
  // Lưu ý ngữ âm học: y và w không phải là 21 thanh mẫu phụ âm, mà là quy ước chính tả của Đề án 1958
  // dùng để phân cách và mở đầu âm tiết bắt đầu bằng i, u, ü khi đứng độc lập không có phụ âm đầu.
  {
    pinyin: 'y',
    name: 'Dạng mở đầu chính tả y (零声母)',
    ipa: '[j]',
    group: 'Dạng mở đầu chính tả (y, w)',
    vietnameseGuide: 'Quy ước chính tả thay thế cho chữ "i" (ia -> ya, ie -> ye) hoặc thêm trước "i, ü" (i -> yi, ü -> yu) khi âm tiết đứng độc lập.',
    hanziVoice: '一',
    exampleWord: 'yī',
    exampleHanzi: '一',
    exampleMeaning: 'Số một',
    commonMistakeVi: 'Cần phân biệt: y không phải phụ âm thực thụ mà là ký hiệu mở đầu chính tả cho nguyên âm i/ü.',
    reviewStatus: 'PENDING_REVIEW',
  },
  {
    pinyin: 'w',
    name: 'Dạng mở đầu chính tả w (零声母)',
    ipa: '[w]',
    group: 'Dạng mở đầu chính tả (y, w)',
    vietnameseGuide: 'Quy ước chính tả thay thế cho chữ "u" (ua -> wa, uo -> wo) hoặc thêm trước "u" (u -> wu) khi âm tiết đứng độc lập.',
    hanziVoice: '五',
    exampleWord: 'wǔ',
    exampleHanzi: '五',
    exampleMeaning: 'Số năm',
    commonMistakeVi: 'Cần phân biệt: w không phải phụ âm thực thụ mà là ký hiệu mở đầu chính tả cho nguyên âm u.',
    reviewStatus: 'PENDING_REVIEW',
  },
];

/** 36 Vận mẫu chuẩn (Finals) theo Đề án Pinyin 1958 */
export const FINALS: PinyinItem[] = [
  // --- NHÓM 1: 6 Vận mẫu đơn (单韵母) ---
  {
    pinyin: 'a',
    name: 'Vận mẫu đơn a',
    ipa: '[a]',
    group: 'Vận mẫu đơn',
    vietnameseGuide: 'Mở rộng miệng tự nhiên, lưỡi nằm thấp nhất. Giống âm "a" tiếng Việt.',
    hanziVoice: '八',
    exampleWord: 'bā',
    exampleHanzi: '八',
    exampleMeaning: 'Số tám',
  },
  {
    pinyin: 'o',
    name: 'Vận mẫu đơn o',
    ipa: '[o]',
    group: 'Vận mẫu đơn',
    vietnameseGuide: 'Tròn môi, lưỡi co về sau. Gần giống âm "ô" tròn môi trong tiếng Việt.',
    hanziVoice: '波',
    exampleWord: 'bō',
    exampleHanzi: '波',
    exampleMeaning: 'Làn sóng',
  },
  {
    pinyin: 'e',
    name: 'Vận mẫu đơn e',
    ipa: '[ɤ]',
    group: 'Vận mẫu đơn',
    vietnameseGuide: 'Miệng mở vừa, mép môi hơi dẹt sang bên, phát âm từ cuống họng. Tương tự "ưa / ơ" trong tiếng Việt.',
    hanziVoice: '歌',
    exampleWord: 'gē',
    exampleHanzi: '歌',
    exampleMeaning: 'Bài hát',
    commonMistakeVi: 'Không đọc thành "e" tiếng Việt; phát âm là "ưa" cuống họng.',
  },
  {
    pinyin: 'i',
    name: 'Vận mẫu đơn i',
    ipa: '[i]',
    group: 'Vận mẫu đơn',
    vietnameseGuide: 'Mép môi kéo dẹt sang hai bên, mặt lưỡi nâng cao. Giống âm "i" tiếng Việt.',
    hanziVoice: '七',
    exampleWord: 'qī',
    exampleHanzi: '七',
    exampleMeaning: 'Số bảy',
  },
  {
    pinyin: 'u',
    name: 'Vận mẫu đơn u',
    ipa: '[u]',
    group: 'Vận mẫu đơn',
    vietnameseGuide: 'Tròn môi nhọn ra trước, cuống lưỡi nâng cao. Giống âm "u" tiếng Việt.',
    hanziVoice: '不',
    exampleWord: 'bù',
    exampleHanzi: '不',
    exampleMeaning: 'Không (phủ định)',
  },
  {
    pinyin: 'ü',
    name: 'Vận mẫu đơn ü',
    ipa: '[y]',
    group: 'Vận mẫu đơn',
    vietnameseGuide: 'Khẩu hình tròn môi như đọc "u", nhưng đặt lưỡi ở vị trí đọc "i". Gần giống "uy" tiếng Việt tròn môi.',
    hanziVoice: '女',
    exampleWord: 'nǚ',
    exampleHanzi: '女',
    exampleMeaning: 'Nữ, con gái',
    commonMistakeVi: 'Giữ chặt khẩu hình môi tròn suốt quá trình phát âm, không loe môi ra.',
  },

  // --- NHÓM 2: 13 Vận mẫu phức / kép (复韵母) ---
  {
    pinyin: 'ai',
    name: 'Vận mẫu ai',
    ipa: '[aɪ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Đọc âm "a" rồi lướt nhanh sang âm "i". Giống "ai" tiếng Việt.',
    hanziVoice: '白',
    exampleWord: 'bái',
    exampleHanzi: '白',
    exampleMeaning: 'Màu trắng',
  },
  {
    pinyin: 'ei',
    name: 'Vận mẫu ei',
    ipa: '[eɪ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Đọc âm "e" rồi lướt nhanh sang âm "i". Giống "ây" tiếng Việt.',
    hanziVoice: '杯',
    exampleWord: 'bēi',
    exampleHanzi: '杯',
    exampleMeaning: 'Cái cốc, cái ly',
  },
  {
    pinyin: 'ao',
    name: 'Vận mẫu ao',
    ipa: '[ɑʊ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Đọc âm "a" rồi thu tròn môi sang âm "o". Giống "ao" tiếng Việt.',
    hanziVoice: '高',
    exampleWord: 'gāo',
    exampleHanzi: '高',
    exampleMeaning: 'Cao',
  },
  {
    pinyin: 'ou',
    name: 'Vận mẫu ou',
    ipa: '[oʊ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Đọc âm "o" rồi thu môi sang âm "u". Giống "âu" tiếng Việt.',
    hanziVoice: '手',
    exampleWord: 'shǒu',
    exampleHanzi: '手',
    exampleMeaning: 'Bàn tay',
  },
  {
    pinyin: 'ia',
    name: 'Vận mẫu ia',
    ipa: '[iɑ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Lướt nhanh từ "i" sang "a", phát âm liền mạch: "i-a".',
    hanziVoice: '家',
    exampleWord: 'jiā',
    exampleHanzi: '家',
    exampleMeaning: 'Nhà, gia đình',
  },
  {
    pinyin: 'ie',
    name: 'Vận mẫu ie',
    ipa: '[iɛ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Lướt nhanh từ "i" sang "e", đọc tựa như "i-ê" tiếng Việt.',
    hanziVoice: '谢',
    exampleWord: 'xiè',
    exampleHanzi: '谢',
    exampleMeaning: 'Cảm tạ, cảm ơn',
  },
  {
    pinyin: 'iao',
    name: 'Vận mẫu iao',
    ipa: '[iɑʊ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Lướt nhanh từ "i" sang "ao", tựa như "i-eo" tiếng Việt.',
    hanziVoice: '小',
    exampleWord: 'xiǎo',
    exampleHanzi: '小',
    exampleMeaning: 'Nhỏ, bé',
  },
  {
    pinyin: 'iu',
    name: 'Vận mẫu iu (iou)',
    ipa: '[ioʊ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Thực chất là iou viết tắt. Lướt từ "i" sang "ou", đọc tựa "i-êu / yêu".',
    hanziVoice: '九',
    exampleWord: 'jiǔ',
    exampleHanzi: '九',
    exampleMeaning: 'Số chín',
    commonMistakeVi: 'Dạng nguyên bản là iou, khi ghép với phụ âm đầu được viết tắt thành iu.',
  },
  {
    pinyin: 'ua',
    name: 'Vận mẫu ua',
    ipa: '[uɑ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Lướt nhanh từ "u" tròn môi sang "a", đọc liền mạch "u-a".',
    hanziVoice: '花',
    exampleWord: 'huā',
    exampleHanzi: '花',
    exampleMeaning: 'Bông hoa',
  },
  {
    pinyin: 'uo',
    name: 'Vận mẫu uo',
    ipa: '[uo]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Lướt nhanh từ "u" sang "o", đọc tựa "u-ô" tiếng Việt.',
    hanziVoice: '国',
    exampleWord: 'guó',
    exampleHanzi: '国',
    exampleMeaning: 'Đất nước, quốc gia',
  },
  {
    pinyin: 'uai',
    name: 'Vận mẫu uai',
    ipa: '[uaɪ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Lướt nhanh từ "u" sang "ai", đọc tựa "u-ai" tiếng Việt.',
    hanziVoice: '快',
    exampleWord: 'kuài',
    exampleHanzi: '快',
    exampleMeaning: 'Nhanh, mau lẹ',
  },
  {
    pinyin: 'ui',
    name: 'Vận mẫu ui (uei)',
    ipa: '[ueɪ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Thực chất là uei viết tắt. Lướt từ "u" sang "ei", đọc tựa "u-ây" tiếng Việt.',
    hanziVoice: '对',
    exampleWord: 'duì',
    exampleHanzi: '对',
    exampleMeaning: 'Đúng, chính xác',
    commonMistakeVi: 'Dạng nguyên bản là uei, khi ghép với phụ âm đầu được viết tắt thành ui.',
  },
  {
    pinyin: 'üe',
    name: 'Vận mẫu üe',
    ipa: '[yɛ]',
    group: 'Vận mẫu phức',
    vietnameseGuide: 'Giữ môi tròn đọc "ü" rồi chuyển sang "e", đọc tựa "uy-ê" tròn môi.',
    hanziVoice: '月',
    exampleWord: 'yuè',
    exampleHanzi: '月',
    exampleMeaning: 'Mặt trăng, tháng',
  },

  // --- NHÓM 3: 16 Vận mẫu mũi (鼻韵母) ---
  // A. 8 Vận mẫu mũi trước (kết thúc bằng -n)
  {
    pinyin: 'an',
    name: 'Vận mẫu an',
    ipa: '[an]',
    group: 'Vận mẫu mũi trước',
    vietnameseGuide: 'Đọc âm "a" rồi kết thúc bằng cách áp đầu lưỡi lên ngạc răng trên (-n). Giống "an" tiếng Việt.',
    hanziVoice: '三',
    exampleWord: 'sān',
    exampleHanzi: '三',
    exampleMeaning: 'Số ba',
  },
  {
    pinyin: 'en',
    name: 'Vận mẫu en',
    ipa: '[ən]',
    group: 'Vận mẫu mũi trước',
    vietnameseGuide: 'Đọc âm "e" (ơ) rồi áp đầu lưỡi lên lợi trên (-n). Giống "ân / ơn" tiếng Việt.',
    hanziVoice: '人',
    exampleWord: 'rén',
    exampleHanzi: '人',
    exampleMeaning: 'Người',
  },
  {
    pinyin: 'in',
    name: 'Vận mẫu in',
    ipa: '[in]',
    group: 'Vận mẫu mũi trước',
    vietnameseGuide: 'Đọc âm "i" rồi khép đầu lưỡi lên ngạc răng trên (-n). Giống "in" tiếng Việt.',
    hanziVoice: '金',
    exampleWord: 'jīn',
    exampleHanzi: '金',
    exampleMeaning: 'Kim, vàng',
  },
  {
    pinyin: 'ün',
    name: 'Vận mẫu ün (üen)',
    ipa: '[yn]',
    group: 'Vận mẫu mũi trước',
    vietnameseGuide: 'Giữ tròn môi đọc "ü" rồi khép âm mũi (-n). Đọc tựa "uy-n" tròn môi.',
    hanziVoice: '云',
    exampleWord: 'yún',
    exampleHanzi: '云',
    exampleMeaning: 'Đám mây',
  },
  {
    pinyin: 'ian',
    name: 'Vận mẫu ian',
    ipa: '[iɛn]',
    group: 'Vận mẫu mũi trước',
    vietnameseGuide: 'Lướt từ "i" sang "en", đọc tựa "i-en / iên" trong tiếng Việt.',
    hanziVoice: '天',
    exampleWord: 'tiān',
    exampleHanzi: '天',
    exampleMeaning: 'Trời, ngày',
    commonMistakeVi: 'Không đọc là "i-an"; âm này đọc là "i-en".',
  },
  {
    pinyin: 'uan',
    name: 'Vận mẫu uan',
    ipa: '[uan]',
    group: 'Vận mẫu mũi trước',
    vietnameseGuide: 'Lướt từ "u" sang "an", đọc tựa "u-an / oan" tiếng Việt.',
    hanziVoice: '完',
    exampleWord: 'wán',
    exampleHanzi: '完',
    exampleMeaning: 'Hoàn thành, xong',
  },
  {
    pinyin: 'un',
    name: 'Vận mẫu un (uen)',
    ipa: '[uən]',
    group: 'Vận mẫu mũi trước',
    vietnameseGuide: 'Thực chất là uen viết tắt. Lướt từ "u" sang "en", đọc tựa "u-ân" tiếng Việt.',
    hanziVoice: '温',
    exampleWord: 'wēn',
    exampleHanzi: '温',
    exampleMeaning: 'Ấm áp, nhiệt độ',
    commonMistakeVi: 'Không đọc là "un" tiếng Việt; phát âm chuẩn là "uân".',
  },
  {
    pinyin: 'üan',
    name: 'Vận mẫu üan',
    ipa: '[yɛn]',
    group: 'Vận mẫu mũi trước',
    vietnameseGuide: 'Giữ môi tròn "ü" lướt sang "an", đọc tựa "uy-en" tròn môi.',
    hanziVoice: '元',
    exampleWord: 'yuán',
    exampleHanzi: '元',
    exampleMeaning: 'Đồng nhân dân tệ',
  },

  // B. 8 Vận mẫu mũi sau (kết thúc bằng -ng)
  {
    pinyin: 'ang',
    name: 'Vận mẫu ang',
    ipa: '[ɑŋ]',
    group: 'Vận mẫu mũi sau',
    vietnameseGuide: 'Đọc âm "a" rồi nâng cuống lưỡi chạm ngạc mềm (-ng). Giống "ang" tiếng Việt.',
    hanziVoice: '方',
    exampleWord: 'fāng',
    exampleHanzi: '方',
    exampleMeaning: 'Phương hướng, hình vuông',
  },
  {
    pinyin: 'eng',
    name: 'Vận mẫu eng',
    ipa: '[ɤŋ]',
    group: 'Vận mẫu mũi sau',
    vietnameseGuide: 'Đọc âm "e" (ơ) rồi nâng cuống lưỡi (-ng). Giống âm "âng" tiếng Việt.',
    hanziVoice: '朋',
    exampleWord: 'péng',
    exampleHanzi: '朋',
    exampleMeaning: 'Bạn bè (bằng hữu)',
  },
  {
    pinyin: 'ing',
    name: 'Vận mẫu ing',
    ipa: '[iŋ]',
    group: 'Vận mẫu mũi sau',
    vietnameseGuide: 'Đọc âm "i" rồi nâng cuống lưỡi (-ng). Giống âm "inh" tiếng Việt.',
    hanziVoice: '明',
    exampleWord: 'míng',
    exampleHanzi: '明',
    exampleMeaning: 'Sáng tỏ, rõ ràng',
  },
  {
    pinyin: 'ong',
    name: 'Vận mẫu ong',
    ipa: '[ʊŋ]',
    group: 'Vận mẫu mũi sau',
    vietnameseGuide: 'Tròn môi đọc "u" rồi nâng cuống lưỡi (-ng). Giống âm "ung" tiếng Việt.',
    hanziVoice: '中',
    exampleWord: 'zhōng',
    exampleHanzi: '中',
    exampleMeaning: 'Ở giữa, Trung Quốc',
  },
  {
    pinyin: 'iang',
    name: 'Vận mẫu iang',
    ipa: '[iɑŋ]',
    group: 'Vận mẫu mũi sau',
    vietnameseGuide: 'Lướt nhanh từ "i" sang "ang", đọc liền mạch "i-ang".',
    hanziVoice: '亮',
    exampleWord: 'liàng',
    exampleHanzi: '亮',
    exampleMeaning: 'Ánh sáng, sáng ngời',
  },
  {
    pinyin: 'uang',
    name: 'Vận mẫu uang',
    ipa: '[uɑŋ]',
    group: 'Vận mẫu mũi sau',
    vietnameseGuide: 'Lướt nhanh từ "u" sang "ang", đọc liền mạch "u-ang".',
    hanziVoice: '光',
    exampleWord: 'guāng',
    exampleHanzi: '光',
    exampleMeaning: 'Tia sáng, bóng loáng',
  },
  {
    pinyin: 'ueng',
    name: 'Vận mẫu ueng',
    ipa: '[uɤŋ]',
    group: 'Vận mẫu mũi sau',
    vietnameseGuide: 'Lướt từ "u" sang "eng", đọc tựa "u-âng". Thường chỉ đứng độc lập viết là weng.',
    hanziVoice: '翁',
    exampleWord: 'wēng',
    exampleHanzi: '翁',
    exampleMeaning: 'Ông già, ngư ông',
  },
  {
    pinyin: 'iong',
    name: 'Vận mẫu iong',
    ipa: '[iʊŋ]',
    group: 'Vận mẫu mũi sau',
    vietnameseGuide: 'Lướt nhanh từ "i" sang "ong", đọc tựa "i-ung".',
    hanziVoice: '雄',
    exampleWord: 'xióng',
    exampleHanzi: '雄',
    exampleMeaning: 'Hùng vĩ, con gấu',
  },

  // --- NHÓM 4: 1 Vận mẫu đặc biệt (特殊韵母) ---
  {
    pinyin: 'er',
    name: 'Vận mẫu er',
    ipa: '[aɚ]',
    group: 'Vận mẫu đặc biệt',
    vietnameseGuide: 'Đọc âm "ơ" đồng thời uốn cong đầu lưỡi lên ngạc cứng. Đọc "ơ-r" uốn lưỡi.',
    hanziVoice: '二',
    exampleWord: 'èr',
    exampleHanzi: '二',
    exampleMeaning: 'Số hai',
    commonMistakeVi: 'Là vận mẫu độc lập, không ghép với bất kỳ thanh mẫu nào.',
  },
];

/** 4 Thanh điệu chuẩn (Tones) + Thanh nhẹ (Khinh thanh) */
export const TONES: ToneItem[] = [
  {
    toneNumber: 1,
    nameVi: 'Thanh 1 (Âm Bình)',
    nameZh: '第一声 (阴平)',
    pitchCurve: '55',
    symbol: '¯ (mā)',
    descriptionVi: 'Cao và bằng phẳng. Giữ cao độ tối đa 5-5 ngân dài đều, không lên không xuống.',
    guidelineVi: 'Hát nốt cao ngân đều, giữ giọng thẳng, không hạ giọng như tiếng Việt.',
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
    descriptionVi: 'Đi từ độ cao trung bình (3) vút thẳng lên cao (5). Tương tự dấu sắc nhẹ trong tiếng Việt.',
    guidelineVi: 'Tựa như khi bạn ngạc nhiên hỏi "Hả?", giọng vút nhanh từ giữa lên cao.',
    example: 'má',
    hanzi: '麻',
    meaning: 'Cây gai, tê bì',
    svgPath: 'M 30 115 L 210 30',
  },
  {
    toneNumber: 3,
    nameVi: 'Thanh 3 (Thượng Thanh)',
    nameZh: '第三声 (上声)',
    pitchCurve: '214 / 211',
    pitchCurveCitation: '214 (Đọc đơn lẻ từ điển)',
    pitchCurveContext: '211 (Nửa thanh 3 / 半上 trước thanh 1, 2, 4, nhẹ) hoặc 35 (trước thanh 3)',
    symbol: 'ˇ (mǎ)',
    descriptionVi: 'Đọc đơn lẻ: hạ từ 2 xuống 1 rồi vút lên 4 (214). Trong ngữ cảnh câu nói: trước thanh 1, 2, 4 hoặc thanh nhẹ, chỉ hạ giọng (211 - Nửa thanh 3), KHÔNG vút lên!',
    guidelineVi: 'Lưu ý quan trọng: Không đọc mọi thanh 3 thành đường lượn 214. Trong thực tế giao tiếp, đa số thanh 3 đọc là "Nửa thanh 3" (chỉ hạ giọng trầm 211 rồi chuyển sang từ kế tiếp). Trước một thanh 3 khác thì đọc biến thành thanh 2 (35).',
    example: 'mǎ',
    hanzi: '马',
    meaning: 'Con ngựa',
    svgPath: 'M 30 140 Q 110 200 130 200 T 210 72',
    reviewStatus: 'PENDING_REVIEW',
  },
  {
    toneNumber: 4,
    nameVi: 'Thanh 4 (Khứ Thanh)',
    nameZh: '第四声 (去声)',
    pitchCurve: '51',
    symbol: '` (mà)',
    descriptionVi: 'Rơi dứt khoát từ cao nhất (5) xuống thấp nhất (1). Âm sắc mạnh mẽ, ngắn gọn.',
    guidelineVi: 'Tựa như tiếng quát dứt khoát hoặc ra lệnh: "Dừng!", không kéo dài âm đuôi.',
    example: 'mà',
    hanzi: '骂',
    meaning: 'Mắng chửi',
    svgPath: 'M 30 30 L 210 200',
  },
  {
    toneNumber: 5,
    nameVi: 'Thanh Nhẹ (Khinh Thanh)',
    nameZh: '轻声 (Neutral Tone)',
    pitchCurve: '·',
    symbol: 'ma (không dấu)',
    descriptionVi: 'Phát âm ngắn, nhẹ, không có cao độ cố định mà phụ thuộc vào thanh điệu của từ đứng trước.',
    guidelineVi: 'Thả lỏng cơ miệng, phát âm thật lướt và nhanh, thường gặp ở trợ từ: 吗 (ma), 呢 (ne), 的 (de).',
    example: 'ma',
    hanzi: '吗',
    meaning: 'Trợ từ nghi vấn (không? chăng?)',
    svgPath: 'M 115 115 A 6 6 0 1 1 125 115 A 6 6 0 1 1 115 115',
  },
];

/** Quy tắc chính tả Pinyin cơ bản */
export const SPELLING_RULES: SpellingRule[] = [
  {
    id: 'rule-umlaut-u',
    title: 'Quy tắc viết âm ü (hai chấm)',
    summary: 'Khi ü ghép với j, q, x thì BỎ HAI CHẤM; khi ghép với n, l thì BẮT BUỘC GIỮ HAI CHẤM.',
    details: [
      'Do các âm j, q, x không bao giờ kết hợp với âm "u" thông thường, nên khi viết với "ü" được phép lược bỏ 2 dấu chấm thành ju, qu, xu (nhưng vẫn đọc là [y] tròn môi).',
      'Ngược lại, n và l có thể ghép với cả "u" lẫn "ü", nên bắt buộc phải giữ hai chấm (nü, lü) để phân biệt với (nu, lu).',
    ],
    examples: [
      { original: 'j + ü', written: 'ju', hanzi: '句 (jù)', meaning: 'Câu' },
      { original: 'q + ü', written: 'qu', hanzi: '去 (qù)', meaning: 'Đi' },
      { original: 'x + ü', written: 'xu', hanzi: '需 (xū)', meaning: 'Cần' },
      { original: 'n + ü', written: 'nü', hanzi: '女 (nǚ)', meaning: 'Phụ nữ' },
      { original: 'l + ü', written: 'lü', hanzi: '绿 (lǜ)', meaning: 'Màu xanh lục' },
    ],
  },
  {
    id: 'rule-yw-semivowels',
    title: 'Quy tắc dùng y và w mở đầu âm tiết',
    summary: 'Khi các nguyên âm i, u, ü đứng đầu âm tiết độc lập (không có phụ âm đầu), phải dùng y hoặc w thay thế.',
    details: [
      'Âm i đứng một mình: viết thành "yi" (yī 一). Các vần ia, ie, iao... đổi i thành y: ya, ye, yao.',
      'Âm u đứng một mình: viết thành "wu" (wǔ 五). Các vần ua, uo, uai... đổi u thành w: wa, wo, wai.',
      'Âm ü đứng một mình: thêm y phía trước và bỏ hai chấm: "yu" (yǔ 雨), "yue" (yuè 月), "yuan" (yuán 元).',
    ],
    examples: [
      { original: 'i', written: 'yi', hanzi: '一 (yī)', meaning: 'Số một' },
      { original: 'u', written: 'wu', hanzi: '五 (wǔ)', meaning: 'Số năm' },
      { original: 'ü', written: 'yu', hanzi: '鱼 (yú)', meaning: 'Con cá' },
      { original: 'ü + e', written: 'yue', hanzi: '月 (yuè)', meaning: 'Mặt trăng / Tháng' },
    ],
  },
  {
    id: 'rule-short-forms',
    title: 'Các dạng vận mẫu viết tắt (iu, ui, un)',
    summary: 'Ba vận mẫu iou, uei, uen khi ghép với thanh mẫu được viết tắt tương ứng thành iu, ui, un.',
    details: [
      'iou $\\rightarrow$ iu: Ví dụ j + iou $\\rightarrow$ jiǔ (九).',
      'uei $\\rightarrow$ ui: Ví dụ d + uei $\\rightarrow$ duì (对).',
      'uen $\\rightarrow$ un: Ví dụ l + uen $\\rightarrow$ lùn (论).',
      'Quy tắc đánh dấu thanh: Gặp "iu" hoặc "ui" thì đánh dấu lên chữ cái ĐỨNG SAU (jiǔ đánh trên u, duì đánh trên i).',
    ],
    examples: [
      { original: 'j + iou', written: 'jiu', hanzi: '九 (jiǔ)', meaning: 'Số chín' },
      { original: 'd + uei', written: 'dui', hanzi: '对 (duì)', meaning: 'Đúng' },
      { original: 'l + uen', written: 'lun', hanzi: '论 (lùn)', meaning: 'Bàn luận' },
    ],
  },
];

/** Quy tắc biến điệu thiết yếu (Tone Sandhi) */
export const TONE_SANDHI_RULES: ToneSandhiRule[] = [
  {
    id: 'sandhi-two-third-tones',
    title: 'Biến điệu của hai Thanh 3 đi liền nhau',
    ruleFormula: 'Thanh 3 + Thanh 3 → Thanh 2 + Thanh 3',
    explanationVi: 'Khi hai âm tiết mang thanh 3 đứng cạnh nhau, âm tiết thứ nhất bắt buộc phải đọc biến thành thanh 2 (dấu sắc), âm thứ hai giữ nguyên thanh 3. Chú ý: Cách viết Pinyin vẫn giữ nguyên hai thanh 3!',
    examples: [
      { pinyinWritten: 'nǐ hǎo', pinyinSpoken: 'ní hǎo', hanzi: '你好', meaning: 'Xin chào' },
      { pinyinWritten: 'hěn hǎo', pinyinSpoken: 'hén hǎo', hanzi: '很好', meaning: 'Rất tốt' },
      { pinyinWritten: 'kě yǐ', pinyinSpoken: 'ké yǐ', hanzi: '可以', meaning: 'Có thể' },
      { pinyinWritten: 'shǒu biǎo', pinyinSpoken: 'shóu biǎo', hanzi: '手表', meaning: 'Đồng hồ đeo tay' },
    ],
  },
  {
    id: 'sandhi-bu',
    title: 'Biến điệu của chữ "不" (bù - Không)',
    ruleFormula: '不 (bù) + Thanh 4 → 不 (bú) + Thanh 4',
    explanationVi: 'Chữ "不" nguyên bản mang thanh 4 (bù). Khi đứng trước một từ mang thanh 4 khác, "不" sẽ đổi thành thanh 2 (bú). Đứng trước các thanh 1, 2, 3 thì giữ nguyên thanh 4.',
    examples: [
      { pinyinWritten: 'bù shì', pinyinSpoken: 'bú shì', hanzi: '不是', meaning: 'Không phải' },
      { pinyinWritten: 'bù duì', pinyinSpoken: 'bú duì', hanzi: '不对', meaning: 'Không đúng' },
      { pinyinWritten: 'bù hǎo', pinyinSpoken: 'bù hǎo (giữ nguyên)', hanzi: '不好', meaning: 'Không tốt' },
      { pinyinWritten: 'bù chī', pinyinSpoken: 'bù chī (giữ nguyên)', hanzi: '不吃', meaning: 'Không ăn' },
    ],
  },
  {
    id: 'sandhi-yi',
    title: 'Biến điệu của chữ "一" (yī - Một)',
    ruleFormula: '一 + Thanh 4 → yí; 一 + Thanh 1/2/3 → yì',
    explanationVi: 'Chữ "一" khi đọc số đếm mang thanh 1 (yī). Khi đứng trước từ mang thanh 4, nó đổi thành thanh 2 (yí). Khi đứng trước từ mang thanh 1, 2, 3, nó đổi thành thanh 4 (yì).',
    examples: [
      { pinyinWritten: 'yī gè', pinyinSpoken: 'yí gè', hanzi: '一个', meaning: 'Một cái' },
      { pinyinWritten: 'yī tiān', pinyinSpoken: 'yì tiān', hanzi: '一天', meaning: 'Một ngày (đứng trước thanh 1)' },
      { pinyinWritten: 'yī nián', pinyinSpoken: 'yì nián', hanzi: '一年', meaning: 'Một năm (đứng trước thanh 2)' },
      { pinyinWritten: 'yī qǐ', pinyinSpoken: 'yì qǐ', hanzi: '一起', meaning: 'Cùng nhau (đứng trước thanh 3)' },
    ],
  },
  {
    id: 'sandhi-half-third-tone',
    title: 'Quy tắc Nửa Thanh 3 (Bán Thượng / 半上 - Cao độ 211)',
    ruleFormula: 'Thanh 3 + Thanh 1/2/4/Nhẹ → Nửa Thanh 3 (211) + Thanh sau',
    explanationVi: 'Trong giao tiếp tự nhiên, khi thanh 3 đứng trước bất kỳ âm tiết nào mang thanh 1, thanh 2, thanh 4 hoặc thanh nhẹ, ta CHỈ HẠ GIỌNG (211), tuyệt đối không nâng giọng lên cuối âm (214). Nếu cố đọc 214 sẽ làm ngắt quãng câu nói.',
    examples: [
      { pinyinWritten: 'hěn gāo', pinyinSpoken: 'hěn(211) gāo', hanzi: '很高', meaning: 'Rất cao (trước thanh 1)' },
      { pinyinWritten: 'hěn máng', pinyinSpoken: 'hěn(211) máng', hanzi: '很忙', meaning: 'Rất bận (trước thanh 2)' },
      { pinyinWritten: 'hěn dà', pinyinSpoken: 'hěn(211) dà', hanzi: '很大', meaning: 'Rất to (trước thanh 4)' },
      { pinyinWritten: 'wǒ de', pinyinSpoken: 'wǒ(211) de', hanzi: '我的', meaning: 'Của tôi (trước thanh nhẹ)' },
    ],
  },
];

/** Các cặp âm dễ nhầm cho người Việt */
export const CONFUSING_SOUND_PAIRS: ConfusingSoundPair[] = [
  {
    id: 'pair-b-p',
    title: 'Cặp âm b [p] và p [pʰ]',
    descriptionVi: 'Cả hai đều mím hai môi, nhưng "b" không bật hơi (như p tiếng Việt), còn "p" bật luồng hơi rất mạnh.',
    soundA: { pinyin: 'b (bā)', hanzi: '八 (Tám)', note: 'Không bật hơi' },
    soundB: { pinyin: 'p (pā)', hanzi: '趴 (Nằm sấp)', note: 'Bật hơi mạnh mẽ' },
    contrastExplanation: 'Mẹo kiểm tra: Đặt lòng bàn tay hoặc tờ giấy trước miệng; khi phát âm "p", bạn sẽ cảm nhận rõ luồng gió mát bật ra.',
  },
  {
    id: 'pair-d-t',
    title: 'Cặp âm d [t] và t [tʰ]',
    descriptionVi: 'Cả hai đều chạm đầu lưỡi ngạc răng trên, nhưng "d" đọc như "t" không bật hơi, còn "t" đọc như "th" bật hơi.',
    soundA: { pinyin: 'd (dà)', hanzi: '大 (To lớn)', note: 'Âm t nhẹ' },
    soundB: { pinyin: 't (tā)', hanzi: '他 (Anh ấy)', note: 'Âm th bật hơi' },
    contrastExplanation: 'Người Việt hay nhầm "d" thành "đ"; hãy nhớ tiếng Trung không có âm "đ"!',
  },
  {
    id: 'pair-g-k',
    title: 'Cặp âm g [k] và k [kʰ]',
    descriptionVi: 'Gốc lưỡi nâng chạm ngạc mềm: "g" đọc như "c/k" không bật hơi, "k" bật hơi mạnh từ cuống họng.',
    soundA: { pinyin: 'g (gē)', hanzi: '哥 (Anh trai)', note: 'Âm c/k không bật hơi' },
    soundB: { pinyin: 'k (kē)', hanzi: '科 (Khoa học)', note: 'Bật hơi từ cuống họng' },
    contrastExplanation: 'Phát âm "g" nhẹ nhàng, phát âm "k" phải đẩy luồng hơi mạnh từ cuống lưỡi.',
  },
  {
    id: 'pair-zh-z',
    title: 'Âm uốn lưỡi zh/ch/sh vs Âm đầu lưỡi z/c/s',
    descriptionVi: 'Nhóm zh, ch, sh phải uốn cong đầu lưỡi lên vòm họng ngạc cứng; nhóm z, c, s đầu lưỡi để thẳng sát răng trên.',
    soundA: { pinyin: 'zhōng', hanzi: '中 (Trung)', note: 'Đầu lưỡi uốn cong lên trên' },
    soundB: { pinyin: 'zōng', hanzi: '宗 (Tông tộc)', note: 'Đầu lưỡi thẳng chạm sau răng' },
    contrastExplanation: 'Giữ hàm dưới cố định: âm uốn lưỡi làm khoang miệng rỗng hơn, âm đầu lưỡi thì lưỡi dẹt chạm sát răng cửa.',
  },
];

/** Cấu trúc bài tập nhận diện phản xạ Pinyin */
export interface QuizQuestion {
  id: number;
  type: 'LISTEN_TONE' | 'ASPIRATION_DISCRIMINATION' | 'SPELLING_SANDHI_RULE' | 'TYPE_PINYIN_INPUT';
  title: string;
  instruction: string;
  audioVoiceText?: string; // Chữ Hán/Từ phát âm qua Web Speech
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export const PINYIN_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    type: 'LISTEN_TONE',
    title: 'Nghe & nhận biết thanh điệu',
    instruction: 'Bấm nút nghe bên dưới và chọn thanh điệu bạn vừa nghe thấy:',
    audioVoiceText: '妈',
    options: ['Thanh 1 (Âm Bình ¯)', 'Thanh 2 (Dương Bình ´)', 'Thanh 3 (Thượng Thanh ˇ)', 'Thanh 4 (Khứ Thanh `)'],
    correctAnswer: 'Thanh 1 (Âm Bình ¯)',
    explanation: 'Từ phát âm là mā (妈 - Mẹ). Âm vực cao và bằng phẳng (55), thuộc Thanh 1.',
  },
  {
    id: 2,
    type: 'LISTEN_TONE',
    title: 'Nghe & nhận biết thanh điệu',
    instruction: 'Bấm nút nghe âm thanh mẫu bên dưới và xác định thanh điệu bạn vừa nghe thấy:',
    audioVoiceText: '麻',
    options: ['Thanh 1 (Âm Bình ¯)', 'Thanh 2 (Dương Bình ´)', 'Thanh 3 (Thượng Thanh ˇ)', 'Thanh 4 (Khứ Thanh `)'],
    correctAnswer: 'Thanh 2 (Dương Bình ´)',
    explanation: 'Từ phát âm là má (麻 - Gai / Tê). Âm đi từ trung bình lên cao (35), thuộc Thanh 2.',
  },
  {
    id: 3,
    type: 'LISTEN_TONE',
    title: 'Nghe & nhận biết thanh điệu',
    instruction: 'Bấm nút nghe âm thanh mẫu bên dưới và xác định thanh điệu bạn vừa nghe thấy:',
    audioVoiceText: '马',
    options: ['Thanh 1 (Âm Bình ¯)', 'Thanh 2 (Dương Bình ´)', 'Thanh 3 (Thượng Thanh ˇ)', 'Thanh 4 (Khứ Thanh `)'],
    correctAnswer: 'Thanh 3 (Thượng Thanh ˇ)',
    explanation: 'Từ phát âm là mǎ (马 - Con ngựa). Đọc đơn lẻ có cao độ 214, thuộc Thanh 3.',
  },
  {
    id: 4,
    type: 'LISTEN_TONE',
    title: 'Nghe & nhận biết thanh điệu',
    instruction: 'Bấm nút nghe âm thanh mẫu bên dưới và xác định thanh điệu bạn vừa nghe thấy:',
    audioVoiceText: '骂',
    options: ['Thanh 1 (Âm Bình ¯)', 'Thanh 2 (Dương Bình ´)', 'Thanh 3 (Thượng Thanh ˇ)', 'Thanh 4 (Khứ Thanh `)'],
    correctAnswer: 'Thanh 4 (Khứ Thanh `)',
    explanation: 'Từ phát âm là mà (骂 - Mắng). Âm giáng nhanh từ cao nhất xuống thấp nhất (51), thuộc Thanh 4.',
  },
  {
    id: 5,
    type: 'ASPIRATION_DISCRIMINATION',
    title: 'Phân biệt âm bật hơi (Aspiration)',
    instruction: 'Trong các thanh mẫu sau, thanh mẫu nào phát âm BẬT HƠI mạnh mẽ?',
    options: ['b', 'p', 'd', 'g'],
    correctAnswer: 'p',
    explanation: 'Trong hệ thống Pinyin: b, d, g là các âm KHÔNG bật hơi. "p" là âm môi BẬT HƠI mạnh ([pʰ]).',
  },
  {
    id: 6,
    type: 'ASPIRATION_DISCRIMINATION',
    title: 'Nhận diện nhóm âm uốn lưỡi',
    instruction: 'Nhóm thanh mẫu nào đòi hỏi phải uốn cong đầu lưỡi lên ngạc cứng khi phát âm?',
    options: ['z, c, s', 'zh, ch, sh, r', 'j, q, x', 'b, p, m, f'],
    correctAnswer: 'zh, ch, sh, r',
    explanation: 'zh, ch, sh, r là nhóm âm đầu lưỡi sau (uốn lưỡi / 舌尖后音), đầu lưỡi uốn lên vòm họng ngạc cứng trên.',
  },
  {
    id: 7,
    type: 'SPELLING_SANDHI_RULE',
    title: 'Quy tắc chính tả âm ü',
    instruction: 'Khi vận mẫu "ü" kết hợp với nhóm thanh mẫu nào thì BỎ HAI DẤU CHẤM trên đầu?',
    options: ['n và l', 'j, q và x', 'b, p và m', 'd, t và n'],
    correctAnswer: 'j, q và x',
    explanation: 'Do j, q, x không bao giờ kết hợp với "u" thường, nên khi đi với "ü" được phép bỏ dấu 2 chấm: ju, qu, xu (vẫn đọc tròn môi [y]).',
  },
  {
    id: 8,
    type: 'SPELLING_SANDHI_RULE',
    title: 'Quy tắc biến điệu hai Thanh 3',
    instruction: 'Khi hai từ mang thanh 3 đứng liền nhau (ví dụ: "nǐ hǎo"), âm tiết đầu tiên sẽ phát âm theo thanh nào?',
    options: ['Thanh 1 (ngang cao)', 'Thanh 2 (sắc vút lên)', 'Thanh 4 (giáng mạnh)', 'Giữ nguyên thanh 3'],
    correctAnswer: 'Thanh 2 (sắc vút lên)',
    explanation: 'Quy tắc biến điệu: Thanh 3 + Thanh 3 → Thanh 2 + Thanh 3. Do đó "nǐ hǎo" được đọc thực tế là "ní hǎo" (cách viết Pinyin từ điển vẫn giữ "nǐ hǎo").',
  },
  {
    id: 9,
    type: 'SPELLING_SANDHI_RULE',
    title: 'Biến điệu của chữ 不 (bù)',
    instruction: 'Cụm từ "不是" (Không phải) được đọc biến điệu thực tế như thế nào?',
    options: ['bù shì (giữ nguyên)', 'bú shì (đổi thành thanh 2)', 'bǔ shì (đổi thành thanh 3)', 'bū shì (đổi thành thanh 1)'],
    correctAnswer: 'bú shì (đổi thành thanh 2)',
    explanation: 'Khi "不" (bù) đứng trước một từ mang thanh 4 như "是" (shì), nó biến điệu thành thanh 2: "bú shì".',
  },
  {
    id: 10,
    type: 'TYPE_PINYIN_INPUT',
    title: 'Nhập Pinyin từ bàn phím',
    instruction: 'Hãy gõ Pinyin kèm số thanh hoặc dấu thanh cho chữ "好" (Hảo - Tốt) [gợi ý: gõ "hao3" hoặc "hǎo"]:',
    correctAnswer: 'hǎo',
    explanation: 'Chữ "好" có phiên âm Pinyin là "hǎo" (thanh 3). Hệ thống chấp nhận cả ký tự có dấu "hǎo" lẫn dạng số thanh "hao3".',
  },
];
