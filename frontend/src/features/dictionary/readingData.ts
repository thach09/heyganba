import type { ReadingPassageItem } from './types';
import m6Readings from './m6ReadingData.json';

export const HSK1_READING_PASSAGES: ReadingPassageItem[] = [
  {
    id: 1, hskLevel: 1,
    title: 'Ở trường học (在学校)',
    passageText: '大卫是美国人，他是我们学校的学生。大卫很喜欢学汉语。他的老师是王老师，王老师是很好的人。大卫有两个好朋友，他们都是中国人。今天下午大卫和他的朋友在学校看书。',
    passagePinyin: 'Dàwèi shì Měiguó rén, tā shì wǒmen xuéxiào de xuésheng. Dàwèi hěn xǐhuan xué Hànyǔ. Tā de lǎoshī shì Wáng lǎoshī, Wáng lǎoshī shì hěn hǎo de rén. Dàwèi yǒu liǎng gè hǎo péngyou, tāmen dōu shì Zhōngguó rén. Jīntiān xiàwǔ Dàwèi hé tā de péngyou zài xuéxiào kàn shū.',
    translationText: 'David là người Mỹ, anh ấy là học sinh trường chúng tôi. David rất thích học tiếng Hán. Thầy giáo của anh ấy là thầy Vương, thầy Vương là một người rất tốt. David có hai người bạn thân, họ đều là người Trung Quốc. Chiều hôm nay David và bạn của anh ấy cùng đọc sách ở trường.',
    vocabularyNotes: '大卫 (Dàwèi - David); 学生 (xuésheng - học sinh); 老师 (lǎoshī - giáo viên); 朋友 (péngyou - bạn bè); 看书 (kàn shū - đọc sách).',
    questions: [
      {
        question: '大卫是哪国人？',
        options: ['美国人', '中国人', '越南人', '英国人'],
        correctAnswer: '美国人',
        explanation: 'Đoạn văn mở đầu nêu rõ: 大卫是美国人 (David là người Mỹ).'
      },
      {
        question: '今天下午大卫在哪儿？',
        options: ['在学校', '在医院', '在家', '在饭馆'],
        correctAnswer: '在学校',
        explanation: 'Đoạn văn ghi: 今天下午大卫和他的朋友在学校看书 (Chiều nay David và bạn ở trường học).'
      }
    ]
  },
  {
    id: 2, hskLevel: 1,
    title: 'Tại quán ăn & Mua sắm (在饭馆和商店)',
    passageText: '中午十二点，李明去饭馆吃饭。他想吃中国菜。他点了一碗米饭和一个菜，还喝了一杯热茶。一共二十五块钱。吃完饭后，李明去商店买苹果。苹果六块钱一斤，他买了三斤。',
    passagePinyin: 'Zhōngwǔ shí\'èr diǎn, Lǐ Míng qù fànguǎn chī fàn. Tā xiǎng chī Zhōngguó cài. Tā diǎnle yì wǎn mǐfàn hé yí gè cài, hái hēle yì bēi rè chá. Yígòng èrshíwǔ kuài qián. Chī wán fàn hòu, Lǐ Míng qù shāngdiàn mǎi píngguǒ. Píngguǒ liù kuài qián yì jīn, tā mǎile sān jīn.',
    translationText: '12 giờ trưa, Lý Minh đến quán ăn dùng bữa. Anh ấy muốn ăn món Trung Quốc. Anh ấy gọi một bát cơm và một món ăn, còn uống thêm một cốc trà nóng. Tổng cộng hết 25 đồng. Sau khi ăn xong, Lý Minh đến cửa hàng mua táo. Táo 6 đồng một cân, anh ấy mua 3 cân.',
    vocabularyNotes: '饭馆 (fànguǎn - quán ăn); 米饭 (mǐfàn - cơm); 热茶 (rè chá - trà nóng); 商店 (shāngdiàn - cửa hàng); 苹果 (píngguǒ - quả táo).',
    questions: [
      {
        question: '李明喝了什么？',
        options: ['热茶', '水', '咖啡', '牛奶'],
        correctAnswer: '热茶',
        explanation: 'Đoạn văn nêu rõ: 还喝了一杯热茶 (còn uống một cốc trà nóng).'
      },
      {
        question: '苹果多少钱一斤？',
        options: ['六块钱', '五块钱', '二十块钱', '三块钱'],
        correctAnswer: '六块钱',
        explanation: 'Đoạn văn ghi rõ: 苹果六块钱一斤 (Táo 6 đồng một cân).'
      }
    ]
  },
  {
    id: 3, hskLevel: 1,
    title: 'Hẹn gặp cuối tuần (周末见面)',
    passageText: '今天是星期六，北京的天气很好，不冷也不热。我和小王约好明天上午九点去北京大学玩。小王说他会骑自行车来。明天下午我们要一起去听中国音乐，我很期待明天！',
    passagePinyin: 'Jīntiān shì xīngqīliù, Běijīng de tiānqì hěn hǎo, bù lěng yě bú rè. Wǒ hé Xiǎo Wáng yuē hǎo míngtiān shàngwǔ jiǔ diǎn qù Běijīng Dàxué wán. Xiǎo Wáng shuō tā huì qí zìxíngchē lái. Míngtiān xiàwǔ wǒmen yào yìqǐ qù tīng Zhōngguó yīnyuè, wǒ hěn qīdài míngtiān!',
    translationText: 'Hôm nay là thứ Bảy, thời tiết Bắc Kinh rất đẹp, không lạnh cũng không nóng. Tôi và Tiểu Vương hẹn nhau 9 giờ sáng mai đến Đại học Bắc Kinh chơi. Tiểu Vương bảo anh ấy sẽ đạp xe đạp đến. Chiều mai chúng tôi sẽ cùng đi nghe âm nhạc Trung Quốc, tôi rất mong đợi ngày mai!',
    vocabularyNotes: '星期六 (xīngqīliù - thứ Bảy); 天气 (tiānqì - thời tiết); 见面 (jiànmiàn - gặp mặt); 骑车 (qí chē - đi xe); 音乐 (yīnyuè - âm nhạc).',
    questions: [
      {
        question: '北京今天的天气怎么样？',
        options: ['很好，不冷不热', '很冷', '太热了', '下雨了'],
        correctAnswer: '很好，不冷不热',
        explanation: 'Đoạn văn ghi: 北京的天气很好，不冷也不热 (Thời tiết Bắc Kinh rất đẹp, không lạnh không nóng).'
      },
      {
        question: '他们打算明天几点见面？',
        options: ['上午九点', '下午两点', '中午十二点', '上午八点'],
        correctAnswer: '上午九点',
        explanation: 'Đoạn văn nêu: 明天上午九点去北京大学玩 (9 giờ sáng mai đi chơi Đại học Bắc Kinh).'
      }
    ]
  }
];

export const HSK2_READING_PASSAGES: ReadingPassageItem[] = [
  {
    id: 4, hskLevel: 2,
    title: 'Du lịch đến Bắc Kinh (去北京旅游)',
    passageText: '虽然现在是冬天，但是北京的风景非常漂亮。我和妻子坐飞机去北京旅游。在机场，服务员热情地帮助我们找到了出租车。我们住的宾馆离故宫很近。虽然天气比南方冷得多，但是我们玩得非常高兴！',
    passagePinyin: 'Suīrán xiànzài shì dōngtiān, dànshì Běijīng de fēngjǐng fēicháng piàoliang. Wǒ hé qīzi zuò fēijī qù Běijīng lǚyóu. Zài jīchǎng, fúwùyuán rèqíng de bāngzhù wǒmen zhǎodàole chūzūchē. Wǒmen zhù de bīnguǎn lí Gùgōng hěn jìn. Suīrán tiānqì bǐ nánfāng lěng de duō, dànshì wǒmen wán de fēicháng gāoxìng!',
    translationText: 'Tuy hiện tại là mùa đông, nhưng phong cảnh Bắc Kinh vô cùng đẹp. Tôi và vợ đi máy bay đến Bắc Kinh du lịch. Tại sân bay, nhân viên phục vụ nhiệt tình giúp chúng tôi tìm xe taxi. Khách sạn chúng tôi ở rất gần Cố Cung. Mặc dù thời tiết lạnh hơn nhiều so với miền Nam, nhưng chúng tôi chơi rất vui vẻ!',
    vocabularyNotes: '虽然…但是… (suīrán… dànshì… - tuy… nhưng…); 旅游 (lǚyóu - du lịch); 机场 (jīchǎng - sân bay); 服务员 (fúwùyuán - nhân viên phục vụ); 宾馆 (bīnguǎn - khách sạn); 离 (lí - cách).',
    questions: [
      {
        question: '他们是怎么去北京的？',
        options: ['坐飞机', '坐公共汽车', '坐火车', '骑自行车'],
        correctAnswer: '坐飞机',
        explanation: 'Đoạn văn nêu rõ: 我和妻子坐飞机去北京旅游 (Tôi và vợ ngồi máy bay đi Bắc Kinh du lịch).'
      },
      {
        question: '他们住的宾馆在哪儿？',
        options: ['离故宫很近', '在机场里面', '在南方', '离故宫很远'],
        correctAnswer: '离故宫很近',
        explanation: 'Đoạn văn ghi: 我们住的宾馆离故宫很近 (Khách sạn chúng tôi ở rất gần Cố Cung).'
      }
    ]
  },
  {
    id: 5, hskLevel: 2,
    title: 'Một ngày sinh nhật ý nghĩa (有意义的生日)',
    passageText: '今天是我的生日。早上起床后，丈夫送给我一块非常漂亮的手表。下午朋友们来我的房间庆祝，我们一起唱歌、跳舞、吃蛋糕和西瓜。因为大家都很热情，所以我今天觉得特别快乐！',
    passagePinyin: 'Jīntiān shì wǒ de shēngrì. Zǎoshang qǐchuáng hòu, zhàngfu sòng gěi wǒ yí kuài fēicháng piàoliang de shǒubiǎo. Xiàwǔ péngyoumen lái wǒ de fángjiān qìngzhù, wǒmen yìqǐ chàng gē, tiào wǔ, chī dàngāo hé xīguā. Yīnwèi dàjiā dōu hěn rèqíng, suǒyǐ wǒ jīntiān juéde tèbié kuàilè!',
    translationText: 'Hôm nay là sinh nhật của tôi. Sáng sớm sau khi thức dậy, chồng tặng tôi một chiếc đồng hồ đeo tay rất đẹp. Buổi chiều các bạn đến phòng của tôi chúc mừng, chúng tôi cùng nhau ca hát, khiêu vũ, ăn bánh ga-tô và dưa hấu. Bởi vì mọi người đều rất nhiệt tình, nên hôm nay tôi cảm thấy vô cùng hạnh phúc!',
    vocabularyNotes: '生日 (shēngrì - sinh nhật); 丈夫 (zhàngfu - chồng); 手表 (shǒubiǎo - đồng hồ đeo tay); 唱歌 (chàng gē - hát); 跳舞 (tiào wǔ - khiêu vũ); 因为…所以… (yīnwèi… suǒyǐ… - vì… nên…).',
    questions: [
      {
        question: '丈夫送给她什么生日礼物？',
        options: ['一块手表', '一部手机', '一个西瓜', '几本书'],
        correctAnswer: '一块手表',
        explanation: 'Đoạn văn nêu: 丈夫送给我一块非常漂亮的手表 (chồng tặng tôi một chiếc đồng hồ đeo tay rất đẹp).'
      },
      {
        question: '为什么她觉得特别快乐？',
        options: ['因为大家都很热情', '因为手表很贵', '因为去了机场', '因为没有考试'],
        correctAnswer: '因为大家都很热情',
        explanation: 'Đoạn văn kết luận: 因为大家都很热情，所以我今天觉得特别快乐！'
      }
    ]
  }
];

export const ALL_READING_PASSAGES: ReadingPassageItem[] = [
  ...HSK1_READING_PASSAGES,
  ...HSK2_READING_PASSAGES,
  ...m6Readings,
];

