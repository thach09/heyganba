import type { GrowthStage, GrowthStageInfo, PetDefinition, PetId } from './types';

export const GROWTH_STAGES: Record<GrowthStage, GrowthStageInfo> = {
  baby: {
    stage: 'baby',
    labelZh: '幼兽',
    labelVi: 'Ấu Thú',
    minLevel: 1,
    description: 'Bé con ngây ngô tròn trĩnh, lon ton tập làm quen với chữ Hán.',
    badgeTone: 'border-jade/40 bg-jade/10 text-jade-ink',
  },
  junior: {
    stage: 'junior',
    labelZh: '灵兽',
    labelVi: 'Linh Thú',
    minLevel: 5,
    description: 'Bắt đầu có linh tính, đeo trang bị hộ thân và chăm chỉ dùi mài kinh sử.',
    badgeTone: 'border-jade/40 bg-jade/10 text-jade-ink',
  },
  adult: {
    stage: 'adult',
    labelZh: '神兽',
    labelVi: 'Thần Thú',
    minLevel: 10,
    description: 'Thần thú uy phong lẫm liệt, hào quang bảo hộ người học bước vào hàng đại gia.',
    badgeTone: 'border-jade/40 bg-jade/10 text-jade-ink',
  },
};

export const getGrowthStage = (level: number): GrowthStage => {
  if (level < 5) return 'baby';
  if (level < 10) return 'junior';
  return 'adult';
};

export const PET_DEFINITIONS: Record<PetId, PetDefinition> = {
  panda: {
    id: 'panda',
    nameZh: '团团',
    nameVi: 'Đoàn Đoàn',
    titleVi: 'Gấu Trúc Đại Hiệp',
    description: 'Đại hiệp trượng nghĩa, say mê chữ Hán cổ.',
    badge: 'Đại Hiệp',
    primaryColor: '#2E7D6B',
    foodNameZh: '鲜竹笋',
    foodNameVi: 'Măng Trúc',
    foodIcon: 'bamboo',
    quotes: {
      idle: [
        { zh: '今天一起加油学汉字！', vi: 'Hôm nay cùng cố gắng học chữ Hán nhé!' },
        { zh: '温故而知新。', vi: 'Ôn cũ biết mới.' },
        { zh: '学如逆水行舟，不进则退。', vi: 'Học như chèo thuyền ngược nước, không tiến ắt lùi.' },
      ],
      studying: [
        { zh: '集中精力，笔锋有力！', vi: 'Tập trung tinh thần, ngòi bút hữu lực!' },
        { zh: '静下心来，写好每一笔。', vi: 'Tĩnh tâm lại, viết ngay ngắn từng nét.' },
      ],
      happy: [
        { zh: '太棒了！进步神速！', vi: 'Tuyệt vời! Tiến bộ thần tốc!' },
        { zh: '答得真好！经验与竹笋到手！', vi: 'Trả lời hay lắm! Nhận EXP và thêm Măng Trúc!' },
      ],
      sad: [
        { zh: '莫灰心，再试一次！', vi: 'Đừng nản lòng, thử lại lần nữa!' },
        { zh: '大侠也是一步步练成的。', vi: 'Đại hiệp cũng phải rèn luyện từng bước.' },
      ],
      eating: [
        { zh: '清脆爽口！多谢竹笋！', vi: 'Giòn ngọt thơm ngon! Đa tạ búp măng!' },
        { zh: '吃饱啦！力气满满！', vi: 'No rồi! Lại tràn trề sức lực!' },
      ],
    },
  },
  red_panda: {
    id: 'red_panda',
    nameZh: '淘淘',
    nameVi: 'Đào Đào',
    titleVi: 'Tiểu Hồng Miêu',
    description: 'Lanh lợi hoạt bát, thích luyện thanh điệu.',
    badge: 'Hoạt Bát',
    primaryColor: '#C83E31',
    foodNameZh: '脆脆果',
    foodNameVi: 'Táo Đỏ',
    foodIcon: 'apple',
    quotes: {
      idle: [
        { zh: '快来背几个生词呀！', vi: 'Mau lại đây học từ mới nào!' },
        { zh: '千里之行，始于足下。', vi: 'Hành trình ngàn dặm khởi từ một bước chân.' },
        { zh: '摇摇尾巴，心情真好！', vi: 'Vẫy nhẹ chiếc đuôi, tâm trạng thật vui!' },
      ],
      studying: [
        { zh: '听清声调变化哦！', vi: 'Lắng nghe kỹ thanh điệu nhé!' },
        { zh: '眼睛看准，耳朵竖起！', vi: 'Mắt nhìn chuẩn, tai vểnh lên nghe!' },
      ],
      happy: [
        { zh: '哇塞！全对啦，太厉害了！', vi: 'Woa! Đúng hết rồi, siêu quá đi!' },
        { zh: '好开心，转圈圈！', vi: 'Vui quá, xoay một vòng nào!' },
      ],
      sad: [
        { zh: '没关系，摸摸头，再来！', vi: 'Không sao, xoa đầu cái, làm lại nào!' },
        { zh: '下次肯定能答对！', vi: 'Lần tới chắc chắn sẽ đúng!' },
      ],
      eating: [
        { zh: '咔嚓咔嚓！苹果真甜！', vi: 'Rột rột! Quả táo ngọt lịm à!' },
        { zh: '亲密度蹭蹭涨！', vi: 'Độ thân mật tăng vùn vụt nè!' },
      ],
    },
  },
  golden_monkey: {
    id: 'golden_monkey',
    nameZh: '小悟空',
    nameVi: 'Tiểu Ngộ Không',
    titleVi: 'Kim Mao Hầu',
    description: 'Thông tuệ mẫn tiệp, nhìn rõ cấu tạo chữ.',
    badge: 'Thông Tuệ',
    primaryColor: '#D97706',
    foodNameZh: '仙蟠桃',
    foodNameVi: 'Đào Tiên',
    foodIcon: 'peach',
    quotes: {
      idle: [
        { zh: '俺老孙来也！今日学何新字？', vi: 'Lão Tôn tới đây! Nay học chữ gì nào?' },
        { zh: '读书破万卷，下笔如有神。', vi: 'Đọc vạn cuốn sách, hạ bút như có thần.' },
        { zh: '火眼金睛，识破难题！', vi: 'Mắt lửa ngươi vàng, nhận rõ bẫy đề!' },
      ],
      studying: [
        { zh: '定心凝神，切莫急躁！', vi: 'Định tâm ngưng thần, chớ có nôn nóng!' },
        { zh: '随心所欲记汉字！', vi: 'Tùy tâm ghi nhớ chữ Hán!' },
      ],
      happy: [
        { zh: '好本领！不愧是我同伴！', vi: 'Khá lắm! Xứng danh bạn đồng hành của ta!' },
        { zh: '哈哈！修为大涨，痛快！', vi: 'Haha! Tu vi tăng vọt, sảng khoái!' },
      ],
      sad: [
        { zh: '胜败常事，重整旗鼓！', vi: 'Thắng bại là chuyện thường, làm lại nào!' },
        { zh: '看清题眼，莫被迷惑！', vi: 'Nhìn rõ mấu chốt đề, chớ bị lừa!' },
      ],
      eating: [
        { zh: '香甜可口！堪比蟠桃！', vi: 'Thơm ngọt vừa miệng! Sánh ngang quả đào tiên!' },
        { zh: '多谢款待，为你护法！', vi: 'Đa tạ khoản đãi, để ta hộ pháp cho bạn!' },
      ],
    },
  },
  imperial_cat: {
    id: 'imperial_cat',
    nameZh: '御猫',
    nameVi: 'Ngự Miêu',
    titleVi: 'Mèo Hoàng Thượng',
    description: 'Quý tộc tao nhã, đôn đốc dùi mài kinh sử.',
    badge: 'Quý Tộc',
    primaryColor: '#B45309',
    foodNameZh: '御膳鱼',
    foodNameVi: 'Cá Ngự',
    foodIcon: 'fish',
    quotes: {
      idle: [
        { zh: '喵~ 今日在此督促尔等用功。', vi: 'Meo~ Hôm nay Trẫm đôn đốc bạn dụng công học.' },
        { zh: '博观约取，厚积薄发。', vi: 'Xem rộng chọn lọc, tích lũy sâu sắc.' },
        { zh: '雅致沉静，方显风骨。', vi: 'Tao nhã trầm tĩnh, mới rõ phong cốt.' },
      ],
      studying: [
        { zh: '端坐提笔，莫要分心。', vi: 'Ngồi ngay cầm bút, chớ có phân tâm.' },
        { zh: '字迹如行云流水。', vi: 'Nét chữ nên như mây trôi nước chảy.' },
      ],
      happy: [
        { zh: '甚合朕意！赏！', vi: 'Rất hợp ý Trẫm! Thưởng!' },
        { zh: '准许你多摸朕两下。', vi: 'Cho phép bạn xoa đầu Trẫm thêm chút.' },
      ],
      sad: [
        { zh: '偶有失误，无碍大局。', vi: 'Sơ suất chút thôi, không cản đại cục.' },
        { zh: '平心静气方成大器。', vi: 'Bình tâm tĩnh khí mới thành nghiệp lớn.' },
      ],
      eating: [
        { zh: '鲜美！赏你一颗红心。', vi: 'Tươi non lắm! Ban cho bạn một tim.' },
        { zh: '伺候得甚是妥帖。', vi: 'Hầu hạ rất chu đáo.' },
      ],
    },
  },
};
