/**
 * Dữ liệu Kana cho Trạm Kana (Phase 1).
 *
 * Nguồn tham chiếu: docs/Internal/content-mapping-fpt-curriculum.md
 * (giáo trình Dekiru Nihongo — JPD113 bài 1-3 / JPD123 bài 4-7).
 *
 * ⚠️ DRAFT: theo AGENTS.md, agent KHÔNG tự seed nội dung tiếng Nhật vào bảng chính thức.
 * Tập dữ liệu này là bảng nháp phía frontend, cần người biết tiếng Nhật duyệt
 * (cách đọc, âm biến đổi, ví dụ từ mượn) trước khi đưa vào Flyway seed / bảng production.
 *
 * Bố cục nhóm hiển thị:
 *  - Hiragana : GOJUON (46 chữ cơ bản) + DAKUTEN + HANDAKUTEN + YOON
 *  - Katakana : GOJUON (46 chữ cơ bản) + DAKUTEN + HANDAKUTEN + YOON
 *               + EXTENDED_KATAKANA (tổ hợp âm cho từ mượn: ファ / フィ / ウィ / ツォ ...)
 *               + DOUBLE_KATAKANA   (ký tự đôi: 促音 ッ / 長音 ー)
 * Katakana mở rộng và ký tự đôi là bảng riêng, không trộn vào 46 chữ cơ bản.
 */

export type KanaScript = 'HIRAGANA' | 'KATAKANA';

export type KanaGroupKey =
  | 'GOJUON'
  | 'DAKUTEN'
  | 'HANDAKUTEN'
  | 'YOON'
  | 'EXTENDED_KATAKANA'
  | 'DOUBLE_KATAKANA';

export interface KanaExample {
  word: string;
  reading: string;
  meaning: string;
}

export interface KanaEntry {
  id: string;
  character: string;
  romaji: string;
  script: KanaScript;
  group: KanaGroupKey;
  row: string;
  /** Ghi chú hiển thị ở panel chi tiết (cách đọc, lưu ý, nhóm dễ nhầm...). */
  notes?: string;
  /** Nhóm ký tự dễ nhầm khi đọc (シ/ツ/ソ/ン...) → highlight trong bảng. */
  isCommonMistake?: boolean;
  /** 3 trợ từ は / へ / を: viết không đổi, chỉ đọc khác khi làm trợ từ. */
  isParticleException?: boolean;
  /** Audio trên Cloudflare R2 + CDN. Bỏ trống → fallback Web Speech API (ja-JP). */
  audioUrl?: string;
  /** Từ dùng để phát âm khi ký tự không đọc độc lập được (ッ → ベッド, ー → コーヒー). */
  audioText?: string;
  examples?: KanaExample[];
}

export interface KanaGroupMeta {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}

/** Ô trống giữ đúng cột a / i / u / e / o của bảng ngũ âm truyền thống. */
export type KanaCellSpec = [string, string] | null;

export interface KanaRowSpec {
  row: string;
  cells: KanaCellSpec[];
}

interface KanaGroupSpec {
  script: KanaScript;
  group: KanaGroupKey;
  rows: KanaRowSpec[];
}

interface KanaCellMeta {
  notes?: string;
  isCommonMistake?: boolean;
  isParticleException?: boolean;
  audioText?: string;
  examples?: KanaExample[];
}

export const KANA_GROUP_META: Record<KanaGroupKey, KanaGroupMeta> = {
  GOJUON: {
    label: 'Bảng 46 chữ cơ bản (Gojūon)',
    shortLabel: 'Cơ bản',
    description: '46 chữ gốc, sắp theo hàng ngũ âm a / i / u / e / o.',
    color: '#3B82F6',
  },
  DAKUTEN: {
    label: 'Biến âm đục (Dakuten)',
    shortLabel: 'Đục',
    description: 'Thêm dấu ゛ để đổi âm: k→g, s→z, t→d, h→b.',
    color: '#8B5CF6',
  },
  HANDAKUTEN: {
    label: 'Biến âm bán đục (Handakuten)',
    shortLabel: 'Bán đục',
    description: 'Thêm dấu ゜ vào hàng H để đổi thành âm p.',
    color: '#F59E0B',
  },
  YOON: {
    label: 'Âm ghép (Yōon)',
    shortLabel: 'Âm ghép',
    description: 'Ghép chữ hàng i với chữ nhỏ ゃ / ゅ / ょ để tạo âm mới.',
    color: '#10B981',
  },
  EXTENDED_KATAKANA: {
    label: 'Katakana mở rộng — tổ hợp âm cho từ mượn',
    shortLabel: 'Mở rộng',
    description:
      'Tổ hợp ファ / フィ / フェ / フォ, ウィ / ウェ / ウォ, ヴ, ツァ / ツィ / ツェ / ツォ... dùng để phiên âm từ ngoại lai.',
    color: '#EC4899',
  },
  DOUBLE_KATAKANA: {
    label: 'Katakana ký tự đôi — 促音 (ッ) & 長音 (ー)',
    shortLabel: 'Ký tự đôi',
    description:
      'ッ (sokuon) gấp đôi phụ âm đứng sau; ー (chōon) kéo dài nguyên âm đứng trước trong từ mượn.',
    color: '#EF4444',
  },
};

export const KANA_GROUP_ORDER: Record<KanaScript, KanaGroupKey[]> = {
  HIRAGANA: ['GOJUON', 'DAKUTEN', 'HANDAKUTEN', 'YOON'],
  KATAKANA: ['GOJUON', 'DAKUTEN', 'HANDAKUTEN', 'YOON', 'EXTENDED_KATAKANA', 'DOUBLE_KATAKANA'],
};

export const KANA_SCRIPT_LABEL: Record<KanaScript, string> = {
  HIRAGANA: 'Hiragana',
  KATAKANA: 'Katakana',
};

/**
 * Metadata theo từng ký tự, khoá là chính ký tự đó (không trùng giữa 2 bảng chữ).
 * は / へ / を chỉ có isParticleException — KHÔNG tách thành ký tự riêng,
 * đúng theo content-mapping: "viết không đổi, chỉ đọc đổi khi làm trợ từ".
 */
const KANA_CELL_META: Record<string, KanaCellMeta> = {
  // ---------- Hiragana: nhóm dễ nhầm ----------
  'し': { isCommonMistake: true, notes: 'Đọc "shi", không đọc "si".' },
  'つ': { isCommonMistake: true, notes: 'Đọc "tsu". Nhóm dễ nhầm し / つ / そ / ん — chú ý hướng nét cong.' },
  'そ': { isCommonMistake: true, notes: 'Nhóm dễ nhầm し / つ / そ / ん — chú ý nét ngang trên cùng.' },
  'ん': { isCommonMistake: true, notes: 'Âm mũi "n" đứng một mình, không ghép nguyên âm.' },
  'ち': { notes: 'Đọc "chi", không đọc "ti".' },
  'ふ': { notes: 'Đọc "fu" — phát âm nhẹ, nằm giữa "hu" và "fu".' },
  'じ': { notes: 'Đọc "ji".' },
  'ぢ': {
    isCommonMistake: true,
    notes: 'Đọc giống じ. Chỉ dùng khi ghép (VD: ちぢむ, はなぢ) — gõ "di" hoặc "dji".',
  },
  'づ': {
    isCommonMistake: true,
    notes: 'Đọc giống ず. Chỉ dùng trong vài từ (VD: つづく, みかづき).',
  },

  // ---------- Hiragana: trợ từ đọc khác ----------
  'は': {
    isParticleException: true,
    notes: 'Viết là は nhưng khi làm trợ từ thì đọc "wa". Là trợ từ đứng sau chủ đề câu.',
    examples: [
      { word: 'わたし は がくせい です', reading: 'watashi wa gakusei desu', meaning: 'Tôi là học sinh.' },
    ],
  },
  'へ': {
    isParticleException: true,
    notes: 'Viết là へ nhưng khi làm trợ từ chỉ hướng thì đọc "e".',
    examples: [{ word: 'とうきょう へ いきます', reading: 'Tōkyō e ikimasu', meaning: 'Tôi đi đến Tokyo.' }],
  },
  'を': {
    isParticleException: true,
    notes: 'Chỉ dùng làm trợ từ (đánh dấu tân ngữ), đọc "o" — không dùng trong từ thông thường.',
    examples: [{ word: 'ごはん を たべます', reading: 'gohan o tabemasu', meaning: 'Tôi ăn cơm.' }],
  },

  // ---------- Katakana: nhóm dễ nhầm ----------
  'シ': {
    isCommonMistake: true,
    notes: 'Nhóm dễ nhầm シ / ツ / ソ / ン. シ có 2 nét nhỏ hướng vào trong, nét dài cong từ dưới lên.',
  },
  'ツ': {
    isCommonMistake: true,
    notes: 'Nhóm dễ nhầm シ / ツ / ソ / ン. ツ có 2 nét nhỏ hướng xuống dưới, nét dài cong từ trên xuống.',
  },
  'ソ': { isCommonMistake: true, notes: 'Nhóm dễ nhầm ソ / ン. ソ nét dài kéo từ trên trái xuống dưới phải.' },
  'ン': { isCommonMistake: true, notes: 'Nhóm dễ nhầm ソ / ン. ン nét dài kéo từ dưới trái lên trên phải.' },
  'ヲ': { notes: 'Gần như không dùng trong từ mượn hiện đại; chỉ gặp ở văn bản cổ hoặc tên riêng.' },
  'フ': { notes: 'Đọc "fu" — âm môi nhẹ, khác với "hu" tiếng Việt.' },
  'ヂ': { isCommonMistake: true, notes: 'Đọc giống ジ, hầu như không dùng ở katakana.' },
  'ヅ': { isCommonMistake: true, notes: 'Đọc giống ズ, hầu như không dùng ở katakana.' },

  // ---------- Katakana mở rộng: tổ hợp âm cho từ mượn ----------
  'イェ': { notes: 'Phiên âm "ye" trong từ ngoại lai (VD: イェール = Yale).' },
  'ウィ': {
    notes: 'Phiên âm "wi". Tiếng Nhật không có âm wi riêng nên ghép ウ + ィ nhỏ.',
    examples: [
      { word: 'ウィンドウ', reading: 'windō', meaning: 'Cửa sổ (máy tính)' },
      { word: 'ウィスキー', reading: 'wisukī', meaning: 'Rượu whisky' },
    ],
  },
  'ウェ': {
    notes: 'Phiên âm "we".',
    examples: [
      { word: 'ウェブ', reading: 'webu', meaning: 'Web' },
      { word: 'ウェイト', reading: 'weito', meaning: 'Tạ / cân nặng' },
    ],
  },
  'ウォ': {
    notes: 'Phiên âm "wo".',
    examples: [
      { word: 'ウォッチ', reading: 'wotchi', meaning: 'Đồng hồ đeo tay' },
      { word: 'ウォーター', reading: 'wōtā', meaning: 'Nước' },
    ],
  },
  'ファ': {
    notes: 'Phiên âm "fa": フ + ァ nhỏ.',
    examples: [
      { word: 'ファン', reading: 'fan', meaning: 'Người hâm mộ' },
      { word: 'ソファ', reading: 'sofa', meaning: 'Ghế sofa' },
    ],
  },
  'フィ': {
    notes: 'Phiên âm "fi": フ + ィ nhỏ.',
    examples: [{ word: 'フィルム', reading: 'firumu', meaning: 'Phim (ảnh)' }],
  },
  'フェ': {
    notes: 'Phiên âm "fe": フ + ェ nhỏ.',
    examples: [
      { word: 'カフェ', reading: 'kafe', meaning: 'Quán cà phê' },
      { word: 'フェス', reading: 'fesu', meaning: 'Lễ hội âm nhạc' },
    ],
  },
  'フォ': {
    notes: 'Phiên âm "fo": フ + ォ nhỏ.',
    examples: [
      { word: 'フォーク', reading: 'fōku', meaning: 'Cái nĩa' },
      { word: 'ソフト', reading: 'sofuto', meaning: 'Phần mềm / mềm' },
    ],
  },
  'フュ': {
    notes: 'Phiên âm "fyu", ít gặp.',
    examples: [{ word: 'フュージョン', reading: 'fyūjon', meaning: 'Sự kết hợp (fusion)' }],
  },
  'ヴァ': {
    notes: 'Phiên âm "va". ヴ là chữ katakana dành riêng cho âm "v".',
    examples: [{ word: 'ヴァイオリン', reading: 'vaiorin', meaning: 'Đàn violin' }],
  },
  'ヴィ': {
    notes: 'Phiên âm "vi".',
    examples: [{ word: 'ヴィザ', reading: 'viza', meaning: 'Thị thực (visa)' }],
  },
  'ヴ': { notes: 'Phiên âm "vu". Nhiều người Nhật vẫn đọc thành "bu" — dạng viết khác là ブ.' },
  'ヴェ': { notes: 'Phiên âm "ve".' },
  'ヴォ': {
    notes: 'Phiên âm "vo".',
    examples: [{ word: 'ヴォーカル', reading: 'vōkaru', meaning: 'Giọng ca chính' }],
  },

  'シェ': {
    notes: 'Phiên âm "she" — khác セ (se).',
    examples: [{ word: 'シェア', reading: 'shea', meaning: 'Chia sẻ / thị phần' }],
  },
  'ジェ': {
    notes: 'Phiên âm "je" — khác ゼ (ze).',
    examples: [{ word: 'ジェット', reading: 'jetto', meaning: 'Máy bay phản lực' }],
  },
  'チェ': {
    notes: 'Phiên âm "che" — khác セ (se).',
    examples: [{ word: 'チェック', reading: 'chekku', meaning: 'Kiểm tra' }],
  },
  'ティ': {
    notes: 'Phiên âm "ti" — khác チ (chi).',
    examples: [{ word: 'パーティー', reading: 'pātī', meaning: 'Bữa tiệc' }],
  },
  'ディ': {
    notes: 'Phiên âm "di" — khác ジ (ji).',
    examples: [{ word: 'ディナー', reading: 'dinā', meaning: 'Bữa tối' }],
  },
  'テュ': { notes: 'Phiên âm "tyu", ít gặp.' },
  'デュ': { notes: 'Phiên âm "dyu", ít gặp.' },
  'トゥ': {
    notes: 'Phiên âm "tu" — khác ツ (tsu).',
    examples: [{ word: 'フット', reading: 'futto', meaning: 'Bóng đá (foot)' }],
  },
  'ドゥ': { notes: 'Phiên âm "du" — khác ズ (zu).' },
  'ツァ': {
    notes: 'Phiên âm "tsa".',
    examples: [{ word: 'モッツァレラ', reading: 'mottsuarella', meaning: 'Phô mai mozzarella' }],
  },
  'ツィ': { notes: 'Phiên âm "tsi", ít gặp.' },
  'ツェ': { notes: 'Phiên âm "tse", ít gặp.' },
  'ツォ': {
    notes: 'Phiên âm "tso" — thường gặp khi phiên âm tiếng Ý.',
    examples: [{ word: 'カルツォーネ', reading: 'karutsōne', meaning: 'Bánh calzone' }],
  },
  'スィ': { notes: 'Phiên âm "si" — phần lớn trường hợp tiếng Nhật vẫn viết thành シ.' },
  'ズィ': { notes: 'Phiên âm "zi" — phần lớn trường hợp tiếng Nhật vẫn viết thành ジ.' },
  'クァ': { notes: 'Phiên âm "kwa", ít gặp.' },
  'クィ': { notes: 'Phiên âm "kwi", ít gặp.' },
  'クェ': { notes: 'Phiên âm "kwe", ít gặp.' },
  'クォ': {
    notes: 'Phiên âm "kwo", ít gặp.',
    examples: [{ word: 'クォーター', reading: 'kwōtā', meaning: 'Một phần tư' }],
  },
  'グァ': { notes: 'Phiên âm "gwa", ít gặp.' },
  'グィ': { notes: 'Phiên âm "gwi", ít gặp.' },
  'グェ': { notes: 'Phiên âm "gwe", ít gặp.' },
  'グォ': { notes: 'Phiên âm "gwo", ít gặp.' },

  // ---------- Katakana ký tự đôi (促音・長音) ----------
  'ッ': {
    notes:
      '促音 (sokuon): viết nhỏ hơn ツ, KHÔNG đọc thành "tsu" mà gấp đôi phụ âm đứng sau (ベッド = be-ddo).',
    audioText: 'ベッド',
    examples: [
      { word: 'ベッド', reading: 'beddo', meaning: 'Cái giường' },
      { word: 'カップ', reading: 'kappu', meaning: 'Cái cốc' },
      { word: 'サッカー', reading: 'sakkā', meaning: 'Bóng đá' },
      { word: 'ペット', reading: 'petto', meaning: 'Thú cưng' },
    ],
  },
  'ー': {
    notes:
      '長音 (chōon): kéo dài nguyên âm của ký tự đứng trước (コーヒー = koohii). Hiragana không dùng dấu này.',
    audioText: 'コーヒー',
    examples: [
      { word: 'コーヒー', reading: 'kōhī', meaning: 'Cà phê' },
      { word: 'ケーキ', reading: 'kēki', meaning: 'Bánh ngọt' },
      { word: 'タクシー', reading: 'takushī', meaning: 'Taxi' },
      { word: 'スーパー', reading: 'sūpā', meaning: 'Siêu thị' },
    ],
  },
};

// ---------- Hiragana: bảng chữ ----------
const HIRAGANA_GOJUON_ROWS: KanaRowSpec[] = [
  { row: 'あ行 (A)', cells: [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']] },
  { row: 'か行 (KA)', cells: [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']] },
  { row: 'さ行 (SA)', cells: [['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so']] },
  { row: 'た行 (TA)', cells: [['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to']] },
  { row: 'な行 (NA)', cells: [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']] },
  { row: 'は行 (HA)', cells: [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho']] },
  { row: 'ま行 (MA)', cells: [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']] },
  { row: 'や行 (YA)', cells: [['や', 'ya'], null, ['ゆ', 'yu'], null, ['よ', 'yo']] },
  { row: 'ら行 (RA)', cells: [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']] },
  { row: 'わ行 (WA)', cells: [['わ', 'wa'], null, null, null, ['を', 'wo']] },
  { row: 'ん (N)', cells: [['ん', 'n']] },
];

const HIRAGANA_DAKUTEN_ROWS: KanaRowSpec[] = [
  { row: 'が行 (GA)', cells: [['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go']] },
  { row: 'ざ行 (ZA)', cells: [['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo']] },
  { row: 'だ行 (DA)', cells: [['だ', 'da'], ['ぢ', 'ji (di)'], ['づ', 'zu (du)'], ['で', 'de'], ['ど', 'do']] },
  { row: 'ば行 (BA)', cells: [['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo']] },
];

const HIRAGANA_HANDAKUTEN_ROWS: KanaRowSpec[] = [
  { row: 'ぱ行 (PA)', cells: [['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po']] },
];

const HIRAGANA_YOON_ROWS: KanaRowSpec[] = [
  { row: 'きゃ行 (KYA)', cells: [['きゃ', 'kya'], ['きゅ', 'kyu'], ['きょ', 'kyo']] },
  { row: 'しゃ行 (SHA)', cells: [['しゃ', 'sha'], ['しゅ', 'shu'], ['しょ', 'sho']] },
  { row: 'ちゃ行 (CHA)', cells: [['ちゃ', 'cha'], ['ちゅ', 'chu'], ['ちょ', 'cho']] },
  { row: 'にゃ行 (NYA)', cells: [['にゃ', 'nya'], ['にゅ', 'nyu'], ['にょ', 'nyo']] },
  { row: 'ひゃ行 (HYA)', cells: [['ひゃ', 'hya'], ['ひゅ', 'hyu'], ['ひょ', 'hyo']] },
  { row: 'みゃ行 (MYA)', cells: [['みゃ', 'mya'], ['みゅ', 'myu'], ['みょ', 'myo']] },
  { row: 'りゃ行 (RYA)', cells: [['りゃ', 'rya'], ['りゅ', 'ryu'], ['りょ', 'ryo']] },
  { row: 'ぎゃ行 (GYA)', cells: [['ぎゃ', 'gya'], ['ぎゅ', 'gyu'], ['ぎょ', 'gyo']] },
  { row: 'じゃ行 (JA)', cells: [['じゃ', 'ja'], ['じゅ', 'ju'], ['じょ', 'jo']] },
  { row: 'びゃ行 (BYA)', cells: [['びゃ', 'bya'], ['びゅ', 'byu'], ['びょ', 'byo']] },
  { row: 'ぴゃ行 (PYA)', cells: [['ぴゃ', 'pya'], ['ぴゅ', 'pyu'], ['ぴょ', 'pyo']] },
];

// ---------- Katakana: bảng chữ cơ bản (46 chữ) ----------
const KATAKANA_GOJUON_ROWS: KanaRowSpec[] = [
  { row: 'ア行 (A)', cells: [['ア', 'a'], ['イ', 'i'], ['ウ', 'u'], ['エ', 'e'], ['オ', 'o']] },
  { row: 'カ行 (KA)', cells: [['カ', 'ka'], ['キ', 'ki'], ['ク', 'ku'], ['ケ', 'ke'], ['コ', 'ko']] },
  { row: 'サ行 (SA)', cells: [['サ', 'sa'], ['シ', 'shi'], ['ス', 'su'], ['セ', 'se'], ['ソ', 'so']] },
  { row: 'タ行 (TA)', cells: [['タ', 'ta'], ['チ', 'chi'], ['ツ', 'tsu'], ['テ', 'te'], ['ト', 'to']] },
  { row: 'ナ行 (NA)', cells: [['ナ', 'na'], ['ニ', 'ni'], ['ヌ', 'nu'], ['ネ', 'ne'], ['ノ', 'no']] },
  { row: 'ハ行 (HA)', cells: [['ハ', 'ha'], ['ヒ', 'hi'], ['フ', 'fu'], ['ヘ', 'he'], ['ホ', 'ho']] },
  { row: 'マ行 (MA)', cells: [['マ', 'ma'], ['ミ', 'mi'], ['ム', 'mu'], ['メ', 'me'], ['モ', 'mo']] },
  { row: 'ヤ行 (YA)', cells: [['ヤ', 'ya'], null, ['ユ', 'yu'], null, ['ヨ', 'yo']] },
  { row: 'ラ行 (RA)', cells: [['ラ', 'ra'], ['リ', 'ri'], ['ル', 'ru'], ['レ', 're'], ['ロ', 'ro']] },
  { row: 'ワ行 (WA)', cells: [['ワ', 'wa'], null, null, null, ['ヲ', 'wo']] },
  { row: 'ン (N)', cells: [['ン', 'n']] },
];

const KATAKANA_DAKUTEN_ROWS: KanaRowSpec[] = [
  { row: 'ガ行 (GA)', cells: [['ガ', 'ga'], ['ギ', 'gi'], ['グ', 'gu'], ['ゲ', 'ge'], ['ゴ', 'go']] },
  { row: 'ザ行 (ZA)', cells: [['ザ', 'za'], ['ジ', 'ji'], ['ズ', 'zu'], ['ゼ', 'ze'], ['ゾ', 'zo']] },
  { row: 'ダ行 (DA)', cells: [['ダ', 'da'], ['ヂ', 'ji (di)'], ['ヅ', 'zu (du)'], ['デ', 'de'], ['ド', 'do']] },
  { row: 'バ行 (BA)', cells: [['バ', 'ba'], ['ビ', 'bi'], ['ブ', 'bu'], ['ベ', 'be'], ['ボ', 'bo']] },
];

const KATAKANA_HANDAKUTEN_ROWS: KanaRowSpec[] = [
  { row: 'パ行 (PA)', cells: [['パ', 'pa'], ['ピ', 'pi'], ['プ', 'pu'], ['ペ', 'pe'], ['ポ', 'po']] },
];

const KATAKANA_YOON_ROWS: KanaRowSpec[] = [
  { row: 'キャ行 (KYA)', cells: [['キャ', 'kya'], ['キュ', 'kyu'], ['キョ', 'kyo']] },
  { row: 'シャ行 (SHA)', cells: [['シャ', 'sha'], ['シュ', 'shu'], ['ショ', 'sho']] },
  { row: 'チャ行 (CHA)', cells: [['チャ', 'cha'], ['チュ', 'chu'], ['チョ', 'cho']] },
  { row: 'ニャ行 (NYA)', cells: [['ニャ', 'nya'], ['ニュ', 'nyu'], ['ニョ', 'nyo']] },
  { row: 'ヒャ行 (HYA)', cells: [['ヒャ', 'hya'], ['ヒュ', 'hyu'], ['ヒョ', 'hyo']] },
  { row: 'ミャ行 (MYA)', cells: [['ミャ', 'mya'], ['ミュ', 'myu'], ['ミョ', 'myo']] },
  { row: 'リャ行 (RYA)', cells: [['リャ', 'rya'], ['リュ', 'ryu'], ['リョ', 'ryo']] },
  { row: 'ギャ行 (GYA)', cells: [['ギャ', 'gya'], ['ギュ', 'gyu'], ['ギョ', 'gyo']] },
  { row: 'ジャ行 (JA)', cells: [['ジャ', 'ja'], ['ジュ', 'ju'], ['ジョ', 'jo']] },
  { row: 'ビャ行 (BYA)', cells: [['ビャ', 'bya'], ['ビュ', 'byu'], ['ビョ', 'byo']] },
  { row: 'ピャ行 (PYA)', cells: [['ピャ', 'pya'], ['ピュ', 'pyu'], ['ピョ', 'pyo']] },
];

// ---------- Katakana mở rộng: tổ hợp âm cho từ mượn (bảng riêng) ----------
const KATAKANA_EXTENDED_ROWS: KanaRowSpec[] = [
  { row: 'イェ (YE)', cells: [['イェ', 'ye']] },
  { row: 'ウィ行 (WI / WE / WO)', cells: [['ウィ', 'wi'], ['ウェ', 'we'], ['ウォ', 'wo']] },
  { row: 'ファ行 (F)', cells: [['ファ', 'fa'], ['フィ', 'fi'], ['フェ', 'fe'], ['フォ', 'fo'], ['フュ', 'fyu']] },
  { row: 'ヴァ行 (V)', cells: [['ヴァ', 'va'], ['ヴィ', 'vi'], ['ヴ', 'vu'], ['ヴェ', 've'], ['ヴォ', 'vo']] },
  { row: 'シェ行 (SHE / JE / CHE)', cells: [['シェ', 'she'], ['ジェ', 'je'], ['チェ', 'che']] },
  { row: 'ティ行 (TI / DI)', cells: [['ティ', 'ti'], ['ディ', 'di'], ['テュ', 'tyu'], ['デュ', 'dyu']] },
  { row: 'トゥ行 (TU / DU)', cells: [['トゥ', 'tu'], ['ドゥ', 'du']] },
  { row: 'ツァ行 (TSA)', cells: [['ツァ', 'tsa'], ['ツィ', 'tsi'], ['ツェ', 'tse'], ['ツォ', 'tso']] },
  { row: 'スィ・ズィ (SI / ZI)', cells: [['スィ', 'si'], ['ズィ', 'zi']] },
  { row: 'クァ行 (KWA)', cells: [['クァ', 'kwa'], ['クィ', 'kwi'], ['クェ', 'kwe'], ['クォ', 'kwo']] },
  { row: 'グァ行 (GWA)', cells: [['グァ', 'gwa'], ['グィ', 'gwi'], ['グェ', 'gwe'], ['グォ', 'gwo']] },
];

// ---------- Katakana ký tự đôi: 促音 (ッ) & 長音 (ー) (bảng riêng) ----------
const KATAKANA_DOUBLE_ROWS: KanaRowSpec[] = [
  { row: '促音 (sokuon)', cells: [['ッ', 'gấp đôi phụ âm']] },
  { row: '長音 (chōon)', cells: [['ー', 'kéo dài nguyên âm']] },
];

const KANA_GROUP_SPECS: KanaGroupSpec[] = [
  { script: 'HIRAGANA', group: 'GOJUON', rows: HIRAGANA_GOJUON_ROWS },
  { script: 'HIRAGANA', group: 'DAKUTEN', rows: HIRAGANA_DAKUTEN_ROWS },
  { script: 'HIRAGANA', group: 'HANDAKUTEN', rows: HIRAGANA_HANDAKUTEN_ROWS },
  { script: 'HIRAGANA', group: 'YOON', rows: HIRAGANA_YOON_ROWS },
  { script: 'KATAKANA', group: 'GOJUON', rows: KATAKANA_GOJUON_ROWS },
  { script: 'KATAKANA', group: 'DAKUTEN', rows: KATAKANA_DAKUTEN_ROWS },
  { script: 'KATAKANA', group: 'HANDAKUTEN', rows: KATAKANA_HANDAKUTEN_ROWS },
  { script: 'KATAKANA', group: 'YOON', rows: KATAKANA_YOON_ROWS },
  { script: 'KATAKANA', group: 'EXTENDED_KATAKANA', rows: KATAKANA_EXTENDED_ROWS },
  { script: 'KATAKANA', group: 'DOUBLE_KATAKANA', rows: KATAKANA_DOUBLE_ROWS },
];

function isFilledCell(cell: KanaCellSpec): cell is [string, string] {
  return cell !== null;
}

export const KANA_ENTRIES: KanaEntry[] = KANA_GROUP_SPECS.flatMap((spec) =>
  spec.rows.flatMap((rowDef) =>
    rowDef.cells.filter(isFilledCell).map(([character, romaji]) => {
      const meta = KANA_CELL_META[character];
      return {
        id: `${spec.script}-${character}`,
        character,
        romaji,
        script: spec.script,
        group: spec.group,
        row: rowDef.row,
        ...(meta ?? {}),
      } satisfies KanaEntry;
    })
  )
);

export function getKanaRows(script: KanaScript, group: KanaGroupKey): KanaRowSpec[] {
  return KANA_GROUP_SPECS.find((spec) => spec.script === script && spec.group === group)?.rows ?? [];
}

export function getKanaEntries(script: KanaScript): KanaEntry[] {
  return KANA_ENTRIES.filter((entry) => entry.script === script);
}

export function getKanaEntriesByGroup(script: KanaScript, group: KanaGroupKey): KanaEntry[] {
  return KANA_ENTRIES.filter((entry) => entry.script === script && entry.group === group);
}

export function getKanaById(id: string): KanaEntry | undefined {
  return KANA_ENTRIES.find((entry) => entry.id === id);
}

/** Pool cho quiz nhận diện: bỏ nhóm "ký tự đôi" vì romaji của nhóm này là mô tả, không phải cách đọc. */
export function getKanaQuizPool(script: KanaScript): KanaEntry[] {
  return KANA_ENTRIES.filter((entry) => entry.script === script && entry.group !== 'DOUBLE_KATAKANA');
}

export const KANA_COUNTS: Record<KanaScript, number> = {
  HIRAGANA: getKanaEntries('HIRAGANA').length,
  KATAKANA: getKanaEntries('KATAKANA').length,
};


