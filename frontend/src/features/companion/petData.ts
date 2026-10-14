import { PetDefinition, PetId } from './types';

export const PET_DEFINITIONS: Record<PetId, PetDefinition> = {
  panda: {
    id: 'panda',
    nameZh: '团团',
    nameVi: 'Đoàn Đoàn',
    titleVi: 'Gấu Trúc Đại Hiệp',
    description: 'Chú gấu trúc đĩnh đạc mang khăn đỏ thư sinh, yêu thích măng trúc và chữ Hán cổ.',
    badge: 'Đại Hiệp',
    primaryColor: '#2E7D6B',
    quotes: {
      idle: [
        { zh: '今天也要一起加油学汉字哦！', vi: 'Hôm nay cũng cùng nhau cố gắng học chữ Hán nhé!' },
        { zh: '温故而知新，可以为师矣。', vi: 'Ôn cũ biết mới, ắt có thể làm thầy.' },
        { zh: '学如逆水行舟，不进则退。', vi: 'Học như chèo thuyền ngược nước, không tiến ắt lùi.' },
      ],
      studying: [
        { zh: '集中精力，笔锋有力！', vi: 'Tập trung tinh thần, ngòi bút hữu lực!' },
        { zh: '静下心来，一笔一划写端正。', vi: 'Tĩnh tâm lại, từng nét từng nét viết thật ngay ngắn.' },
      ],
      happy: [
        { zh: '太棒了！你的进步令人赞叹！', vi: 'Tuyệt vời quá! Sự tiến bộ của bạn thật đáng khen!' },
        { zh: '答得真好！+EXP +Măng Trúc！', vi: 'Trả lời hay lắm! Nhận EXP và thêm Măng Trúc nào!' },
      ],
      sad: [
        { zh: '没关系，失败是成功之母，再试一次！', vi: 'Không sao đâu, thất bại là mẹ thành công, thử lại lần nữa nào!' },
        { zh: '莫灰心，大侠也是一步步练成的。', vi: 'Đừng nản lòng, đại hiệp cũng phải rèn luyện từng bước một.' },
      ],
      eating: [
        { zh: '美味清脆！谢谢你的鲜嫩竹笋！', vi: 'Giòn rụm thơm ngon! Cảm ơn búp măng tươi non của bạn!' },
        { zh: '吃饱啦！浑身充满了修炼的力气！', vi: 'No căng bụng rồi! Toàn thân tràn trề năng lượng tu luyện!' },
      ],
    },
  },
  red_panda: {
    id: 'red_panda',
    nameZh: '淘淘',
    nameVi: 'Đào Đào',
    titleVi: 'Tiểu Hồng Miêu',
    description: 'Bé gấu trúc đỏ tinh nghịch với đôi tai trắng xù và chiếc đuôi sọc luôn vẫy nhẹ.',
    badge: 'Hoạt Bát',
    primaryColor: '#C83E31',
    quotes: {
      idle: [
        { zh: '快来快来，今天背几个生词呀？', vi: 'Mau lại đây nào, hôm nay chúng mình học mấy từ mới nhỉ?' },
        { zh: '千里之行，始于足下！', vi: 'Hành trình ngàn dặm bắt đầu từ một bước chân!' },
        { zh: '摇摇尾巴，心情真好！', vi: 'Vẫy nhẹ chiếc đuôi, tâm trạng thật là vui!' },
      ],
      studying: [
        { zh: '嘘——认真听声调的变化哦！', vi: 'Suỵt—— Lắng nghe thật kỹ sự thay đổi của thanh điệu nhé!' },
        { zh: '眼睛看准，耳朵竖起！', vi: 'Mắt nhìn cho chuẩn, tai vểnh lên nghe nào!' },
      ],
      happy: [
        { zh: '哇塞！全对啦！太厉害了吧！', vi: 'Woa! Đúng hết rồi! Bạn siêu đỉnh luôn á!' },
        { zh: '好开心！开心地转圈圈！', vi: 'Vui quá đi! Vui đến mức muốn xoay một vòng!' },
      ],
      sad: [
        { zh: '呜……没关系的，摸摸头，我们再来！', vi: 'Huhu... Không sao đâu nè, xoa đầu cái, chúng mình làm lại nào!' },
        { zh: '错一道题而已嘛，下次肯定对！', vi: 'Sai một câu thôi mà, lần tới chắc chắn sẽ đúng!' },
      ],
      eating: [
        { zh: '咔嚓咔嚓！竹笋真甜呀，最喜欢你啦！', vi: 'Rột rột! Măng trúc ngọt lịm à, yêu bạn nhất trên đời!' },
        { zh: '好饱好满足，亲密度蹭蹭往上涨！', vi: 'No nê mãn nguyện ghê, độ thân mật tăng vùn vụt nè!' },
      ],
    },
  },
  golden_monkey: {
    id: 'golden_monkey',
    nameZh: '小悟空',
    nameVi: 'Tiểu Ngộ Không',
    titleVi: 'Kim Tầu Hầu',
    description: 'Chú khỉ vàng thông tuệ mang vòng kim cô nhỏ, lanh lợi mẫn tiệp trong học tập.',
    badge: 'Thông Tuệ',
    primaryColor: '#D97706',
    quotes: {
      idle: [
        { zh: '俺老孙来也！今日学何新本领？', vi: 'Lão Tôn ta tới đây! Hôm nay học bản lĩnh mới nào thế?' },
        { zh: '读书破万卷，下笔如有神！', vi: 'Đọc vạn cuốn sách, hạ bút như có thần!' },
        { zh: '火眼金睛，一眼识破易错题！', vi: 'Mắt lửa ngươi vàng, nhìn một cái nhận diện ngay bẫy đề!' },
      ],
      studying: [
        { zh: '定心凝神，切莫心浮气躁！', vi: 'Định tâm ngưng thần, chớ có nôn nóng xốc nổi!' },
        { zh: '如意金箍棒，随心记汉字！', vi: 'Như ý kim cô bổng, tùy tâm ghi nhớ chữ Hán!' },
      ],
      happy: [
        { zh: '好本领！不愧是我看中的同伴！', vi: 'Bản lĩnh khá lắm! Không hổ là bạn đồng hành ta chọn!' },
        { zh: '哈哈！今日修为大涨，痛快！', vi: 'Haha! Hôm nay tu vi tăng vọt, sảng khoái thật!' },
      ],
      sad: [
        { zh: '胜败乃兵家常事，重整旗鼓再战！', vi: 'Thắng bại là chuyện thường nhà binh, chỉnh đốn lại rồi chiến tiếp!' },
        { zh: '看清题眼，莫被障眼法蒙蔽！', vi: 'Nhìn rõ mấu chốt đề, chớ để chướng nhãn pháp đánh lừa!' },
      ],
      eating: [
        { zh: '香甜可口！堪比蟠桃盛会的珍品！', vi: 'Thơm ngọt vừa miệng! Sánh ngang trân phẩm đại hội Bàn Đào!' },
        { zh: '多谢款待，待俺老孙为你护法！', vi: 'Đa tạ khoản đãi, để Lão Tôn hộ pháp cho bạn học tập!' },
      ],
    },
  },
  imperial_cat: {
    id: 'imperial_cat',
    nameZh: '御猫',
    nameVi: 'Ngự Miêu',
    titleVi: 'Mèo Hoàng Thượng Cố Cung',
    description: 'Mèo quý tộc lông trắng mắt hoàng ngọc bước ra từ Tử Cấm Thành, đeo lục lạc đồng tao nhã.',
    badge: 'Quý Tộc',
    primaryColor: '#B45309',
    quotes: {
      idle: [
        { zh: '喵~ 朕今日在此督促尔等用功。', vi: 'Meo~ Trẫm hôm nay ở đây đôn đốc các khanh dụng công học hành.' },
        { zh: '博观而约取，厚积而薄发。', vi: 'Xem rộng mà chọn lọc, tích lũy sâu mà phát huy.' },
        { zh: '雅致沉静，方显读书人风骨。', vi: 'Tao nhã trầm tĩnh, mới tỏ rõ phong cốt người đọc sách.' },
      ],
      studying: [
        { zh: '端坐提笔，莫要东张西望。', vi: 'Ngồi ngay ngắn cầm bút, chớ có nhìn đông ngó tây.' },
        { zh: '字迹当如行云流水，骨力内敛。', vi: 'Nét chữ nên như mây trôi nước chảy, cốt cách nội liễm.' },
      ],
      happy: [
        { zh: '甚合朕意！赏，重重有赏！', vi: 'Rất hợp ý Trẫm! Thưởng, trọng trọng có thưởng!' },
        { zh: '喵呜~ 准许你今日多摸朕两下。', vi: 'Meo meo~ Cho phép ngươi hôm nay được xoa đầu Trẫm thêm hai cái.' },
      ],
      sad: [
        { zh: '哼，不过偶有失误，无碍大局。', vi: 'Hừm, chẳng qua ngẫu nhiên sơ suất, không cản trở đại cục.' },
        { zh: '深吸一口气，平心静气方成大器。', vi: 'Hít sâu một hơi, bình tâm tĩnh khí mới thành đại nghiệp.' },
      ],
      eating: [
        { zh: '喵呜~ 这竹笋口感甚是鲜美，赏你一颗红心！', vi: 'Meo meo~ Búp măng này hương vị thanh tươi lắm, ban cho ngươi một tim!' },
        { zh: '不错不错，伺候得甚是妥帖。', vi: 'Khá lắm khá lắm, hầu hạ rất chu đáo.' },
      ],
    },
  },
};
