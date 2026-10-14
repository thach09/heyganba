import React, { useState, useEffect } from 'react';
import { Volume2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakChinese } from '../../services/chineseSpeech';
import { RedSealStamp } from '../../components/RedSealStamp';
import { FloatingExpReward } from '../../components/FloatingExpReward';
import { progressApi } from '../progress/api';
import { useCompanion } from '../companion/useCompanionStore';

interface QuizQuestion {
  id: number;
  type: 'TONE_DISCRIMINATION' | 'INITIAL_FINAL' | 'TYPE_PINYIN';
  title: string;
  instruction: string;
  audioPrompt?: string;
  visualPrompt?: string;
  hanziPrompt?: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    type: 'TONE_DISCRIMINATION',
    title: 'Phân biệt thanh điệu (Nghe âm thanh)',
    instruction: 'Bấm nghe âm thanh bên dưới và chọn thanh điệu (1, 2, 3, hoặc 4):',
    audioPrompt: 'mā',
    options: ['Thanh 1 (Âm Bình ¯)', 'Thanh 2 (Dương Bình ´)', 'Thanh 3 (Thượng Thanh ˇ)', 'Thanh 4 (Khứ Thanh `)'],
    correctAnswer: 'Thanh 1 (Âm Bình ¯)',
    explanation: 'Âm phát ra cao độ 5-5 bằng phẳng, ngân đều: mā (妈 - Mẹ) thuộc Thanh 1.',
  },
  {
    id: 2,
    type: 'TONE_DISCRIMINATION',
    title: 'Phân biệt thanh điệu (Nghe âm thanh)',
    instruction: 'Bấm nghe âm thanh bên dưới và chọn thanh điệu đúng:',
    audioPrompt: 'má',
    options: ['Thanh 1 (Âm Bình ¯)', 'Thanh 2 (Dương Bình ´)', 'Thanh 3 (Thượng Thanh ˇ)', 'Thanh 4 (Khứ Thanh `)'],
    correctAnswer: 'Thanh 2 (Dương Bình ´)',
    explanation: 'Âm đi từ trung bình vút lên cao (3-5), giống dấu sắc: má (麻) thuộc Thanh 2.',
  },
  {
    id: 3,
    type: 'TONE_DISCRIMINATION',
    title: 'Phân biệt thanh điệu (Nghe âm thanh)',
    instruction: 'Bấm nghe âm thanh bên dưới và chọn thanh điệu đúng:',
    audioPrompt: 'mǎ',
    options: ['Thanh 1 (Âm Bình ¯)', 'Thanh 2 (Dương Bình ´)', 'Thanh 3 (Thượng Thanh ˇ)', 'Thanh 4 (Khứ Thanh `)'],
    correctAnswer: 'Thanh 3 (Thượng Thanh ˇ)',
    explanation: 'Âm hạ thấp rồi vút lên (2-1-4): mǎ (马 - Ngựa) thuộc Thanh 3.',
  },
  {
    id: 4,
    type: 'TONE_DISCRIMINATION',
    title: 'Phân biệt thanh điệu (Nghe âm thanh)',
    instruction: 'Bấm nghe âm thanh dứt khoát bên dưới và chọn thanh điệu đúng:',
    audioPrompt: 'mà',
    options: ['Thanh 1 (Âm Bình ¯)', 'Thanh 2 (Dương Bình ´)', 'Thanh 3 (Thượng Thanh ˇ)', 'Thanh 4 (Khứ Thanh `)'],
    correctAnswer: 'Thanh 4 (Khứ Thanh `)',
    explanation: 'Âm rơi nhanh, dứt khoát từ cao nhất xuống thấp nhất (5-1): mà (骂) thuộc Thanh 4.',
  },
  {
    id: 5,
    type: 'INITIAL_FINAL',
    title: 'Phân biệt thanh mẫu bật hơi',
    instruction: 'Thanh mẫu nào sau đây có cách phát âm BẬT HƠI mạnh?',
    options: ['b', 'p', 'd', 'g'],
    correctAnswer: 'p',
    explanation: 'Trong cặp âm môi b - p, "p" là âm bật hơi mạnh ([pʰ]), còn "b" không bật hơi.',
  },
  {
    id: 6,
    type: 'INITIAL_FINAL',
    title: 'Nhận diện âm uốn lưỡi (Âm đầu lưỡi quặt)',
    instruction: 'Nhóm thanh mẫu nào đòi hỏi phải uốn cong đầu lưỡi lên ngạc cứng khi phát âm?',
    options: ['z, c, s', 'zh, ch, sh, r', 'j, q, x', 'b, p, m, f'],
    correctAnswer: 'zh, ch, sh, r',
    explanation: 'zh, ch, sh, r là nhóm âm quặt lưỡi (đầu lưỡi áp sát vòm họng ngạc cứng trên).',
  },
  {
    id: 7,
    type: 'INITIAL_FINAL',
    title: 'Quy tắc thanh mẫu mặt lưỡi',
    instruction: 'Thanh mẫu "q" trong từ "qián" (tiền) được phát âm như thế nào?',
    options: [
      'Đọc như "c" tiếng Việt',
      'Mặt lưỡi áp ngạc cứng và bật hơi thật mạnh',
      'Đọc như "cu" tiếng Việt',
      'Đọc nhẹ không bật hơi',
    ],
    correctAnswer: 'Mặt lưỡi áp ngạc cứng và bật hơi thật mạnh',
    explanation: 'q là âm mặt lưỡi bật hơi mạnh ([tɕʰ]), tương tự như "ch" nhưng luồng hơi đẩy ra dứt khoát.',
  },
  {
    id: 8,
    type: 'TYPE_PINYIN',
    title: 'Gõ Pinyin cho chữ Hán',
    instruction: 'Chữ Hán "好" (Hảo - Tốt) có Pinyin là gì?',
    hanziPrompt: '好',
    options: ['hǎo', 'hào', 'háo', 'hāo'],
    correctAnswer: 'hǎo',
    explanation: '好 có phiên âm là hǎo (thanh 3). Ví dụ: 你好 (nǐ hǎo).',
  },
  {
    id: 9,
    type: 'TYPE_PINYIN',
    title: 'Gõ Pinyin cho chữ Hán',
    instruction: 'Chữ Hán "是" (Thị - Là) mang thanh điệu nào?',
    hanziPrompt: '是',
    options: ['shī', 'shí', 'shǐ', 'shì'],
    correctAnswer: 'shì',
    explanation: '是 có phiên âm là shì (thanh 4 dứt khoát). Ví dụ: 我是学生 (wǒ shì xuésheng).',
  },
  {
    id: 10,
    type: 'TONE_DISCRIMINATION',
    title: 'Biến điệu hai thanh 3',
    instruction: 'Khi hai thanh 3 đi liền nhau (như "nǐ hǎo"), thanh 3 thứ nhất sẽ biến đổi thành thanh mấy?',
    options: ['Biến thành Thanh 1', 'Biến thành Thanh 2 (ní hǎo)', 'Biến thành Thanh 4', 'Giữ nguyên không đổi'],
    correctAnswer: 'Biến thành Thanh 2 (ní hǎo)',
    explanation: 'Quy tắc biến điệu: 3 + 3 -> 2 + 3. "Nǐ hǎo" thực tế được phát âm thành "Ní hǎo".',
  },
];

export const PinyinQuiz: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [showExpFloat, setShowExpFloat] = useState(false);
  const { triggerReaction, rewardBamboo } = useCompanion();

  const currentQ = QUIZ_QUESTIONS[currentIndex];

  useEffect(() => {
    if (currentQ?.audioPrompt) {
      speakChinese(currentQ.audioPrompt);
    }
  }, [currentIndex, currentQ?.audioPrompt]);

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentQ.correctAnswer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      triggerReaction('correct');
    } else {
      triggerReaction('mistake');
    }
  };

  const handleNext = async () => {
    if (currentIndex + 1 < QUIZ_QUESTIONS.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
      setShowExpFloat(true);
      rewardBamboo(2);
      void confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      // Call Progress API to grant +10 EXP
      try {
        const masteryScore = Math.round((score / QUIZ_QUESTIONS.length) * 100);
        await progressApi.practice({
          targetType: 'PINYIN',
          targetKey: 'pinyin_tones_quiz',
          masteryScore,
          expEarned: 10,
        });
      } catch (err) {
        // Silently tolerate network/offline
        console.warn('Failed to record pinyin practice exp:', err);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
    setShowExpFloat(false);
  };

  if (quizFinished) {
    const percentage = Math.round((score / QUIZ_QUESTIONS.length) * 100);
    return (
      <div className="relative flex flex-col items-center justify-center rounded border border-rule bg-card p-10 text-center">
        {showExpFloat && <FloatingExpReward amount={10} />}
        
        <div className="relative mb-6">
          <RedSealStamp text={percentage >= 70 ? '通' : '勉'} size={96} />
        </div>

        <h3 className="font-serif text-2xl font-bold text-fg">
          {percentage >= 70 ? 'Hoàn thành Xuất sắc!' : 'Cố gắng lên nhé!'}
        </h3>
        <p className="mt-2 text-sm text-fg-60">
          Bạn đã đạt <span className="font-bold text-cinnabar">{score}</span>/{QUIZ_QUESTIONS.length} điểm ({percentage}%) trong bài luyện phản xạ Pinyin & Thanh điệu.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded bg-gold/15 px-4 py-2 text-xs font-semibold text-gold">
          ⭐ Nhận được +10 EXP kinh nghiệm ngữ âm
        </div>

        <button
          type="button"
          onClick={handleRestart}
          className="mt-8 inline-flex items-center gap-2 border border-cinnabar bg-cinnabar px-6 py-2.5 font-serif text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-sm"
        >
          <RotateCcw size={16} /> Luyện tập lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-fg-38">
            Câu {currentIndex + 1} / {QUIZ_QUESTIONS.length}
          </span>
          <h3 className="font-serif text-base font-semibold text-fg">
            {currentQ.title}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-fg-60 font-mono">
            Điểm hiện tại: <b className="text-cinnabar">{score}</b>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-rule/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-cinnabar transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="rounded border border-rule bg-card p-6">
        <p className="text-sm font-medium text-fg">{currentQ.instruction}</p>

        {/* Audio prompt button if applicable */}
        {currentQ.audioPrompt && (
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => speakChinese(currentQ.audioPrompt!)}
              className="inline-flex items-center gap-2 rounded border border-cinnabar/40 bg-cinnabar/10 px-4 py-2 font-mono text-sm font-bold text-cinnabar hover:bg-cinnabar hover:text-white transition-all cursor-pointer shadow-xs"
            >
              <Volume2 size={18} /> Phát âm thanh
            </button>
            <span className="text-xs text-fg-38">Bấm để nghe lại khẩu âm</span>
          </div>
        )}

        {/* Hanzi prompt if applicable */}
        {currentQ.hanziPrompt && (
          <div className="mt-4 flex items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded border-2 border-dashed border-rule bg-tint font-serif text-5xl font-bold text-fg">
              {currentQ.hanziPrompt}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {currentQ.options?.map((opt) => {
            let optionStyles = 'border-rule bg-tint hover:border-rule-strong hover:bg-card';
            if (isAnswered) {
              if (opt === currentQ.correctAnswer) {
                optionStyles = 'border-jade bg-jade/15 text-jade font-semibold';
              } else if (opt === selectedOption) {
                optionStyles = 'border-cinnabar bg-cinnabar/15 text-cinnabar';
              } else {
                optionStyles = 'border-rule/50 opacity-40';
              }
            }

            return (
              <button
                key={opt}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(opt)}
                className={`flex items-center justify-between rounded border p-3.5 text-left text-sm transition-all cursor-pointer ${optionStyles}`}
              >
                <span>{opt}</span>
                {isAnswered && opt === currentQ.correctAnswer && (
                  <CheckCircle2 size={18} className="text-jade" />
                )}
                {isAnswered && opt === selectedOption && opt !== currentQ.correctAnswer && (
                  <XCircle size={18} className="text-cinnabar" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation & Next Button */}
        {isAnswered && (
          <div className="mt-6 flex flex-col gap-4 border-t border-rule pt-4 animate-in fade-in">
            <div className="rounded bg-tint p-3 text-xs leading-relaxed text-fg-60 border-l-2 border-cinnabar">
              <span className="font-semibold text-fg">Giải thích: </span>
              {currentQ.explanation}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="cursor-pointer border border-cinnabar bg-cinnabar px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90 transition-opacity"
              >
                {currentIndex + 1 < QUIZ_QUESTIONS.length ? 'Câu tiếp theo →' : 'Xem kết quả'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
