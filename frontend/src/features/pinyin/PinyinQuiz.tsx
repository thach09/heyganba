import React, { useState, useEffect } from 'react';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  Send,
  Sparkles,
  BookOpen,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakChinese, stopChineseSpeech } from '../../services/chineseSpeech';
import { RedSealStamp } from '../../components/RedSealStamp';
import { FloatingExpReward } from '../../components/FloatingExpReward';
import { progressApi } from '../progress/api';
import { useCompanion } from '../companion/useCompanionStore';
import { useAuth } from '../../app/useAuth';
import { PINYIN_QUIZ_QUESTIONS, canonicalizePinyin, type QuizQuestion } from './pinyinData';

export const PinyinQuiz: React.FC = () => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedInput, setTypedInput] = useState<string>('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<{ question: QuizQuestion; userAnswer: string }[]>([]);

  // EXP Server Sync Status
  const [syncStatus, setSyncStatus] = useState<'idle' | 'submitting' | 'synced' | 'guest' | 'error'>('idle');
  const [serverExpAwarded, setServerExpAwarded] = useState<number>(0);
  const [audioWarning, setAudioWarning] = useState<string | null>(null);

  const { triggerReaction, rewardBamboo } = useCompanion();
  const currentQ = PINYIN_QUIZ_QUESTIONS[currentIndex];

  useEffect(() => {
    return () => {
      stopChineseSpeech();
    };
  }, []);

  const handlePlayPrompt = (voiceText?: string) => {
    if (!voiceText) return;
    stopChineseSpeech();
    const result = speakChinese(voiceText, { rate: 0.78 });
    if (result === 'no-voice') {
      setAudioWarning('Thiết bị chưa có giọng Quan thoại (zh-CN). Vui lòng kiểm tra cài đặt âm thanh hệ thống.');
    } else if (result === 'unsupported' || result === 'error') {
      setAudioWarning('Trình duyệt chưa hỗ trợ phát âm thanh này.');
    } else {
      setAudioWarning(null);
    }
  };

  const handleSelectOption = (opt: string) => {
    if (isAnswered) return;
    setSelectedOption(opt);
    setIsAnswered(true);

    const right = opt === currentQ.correctAnswer;
    setIsCorrect(right);

    if (right) {
      setScore((prev) => prev + 1);
      triggerReaction('correct');
    } else {
      triggerReaction('mistake');
      setWrongQuestions((prev) => [...prev, { question: currentQ, userAnswer: opt }]);
    }
  };

  const handleCheckTypedInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAnswered || !typedInput.trim()) return;

    setIsAnswered(true);
    const userCanonical = canonicalizePinyin(typedInput);
    const expectedCanonical = canonicalizePinyin(currentQ.correctAnswer);
    const right = userCanonical === expectedCanonical;

    setIsCorrect(right);
    setSelectedOption(typedInput);

    if (right) {
      setScore((prev) => prev + 1);
      triggerReaction('correct');
    } else {
      triggerReaction('mistake');
      setWrongQuestions((prev) => [...prev, { question: currentQ, userAnswer: typedInput }]);
    }
  };

  const submitProgressToServer = async (finalScore: number, finalCorrect: boolean) => {
    if (!user) {
      setSyncStatus('guest');
      return;
    }

    if (syncStatus === 'submitting' || syncStatus === 'synced') {
      return;
    }

    setSyncStatus('submitting');
    try {
      const resp = await progressApi.practice({
        targetType: 'PINYIN',
        targetKey: 'pinyin_tones_quiz',
        scoreDelta: finalScore,
        isCorrect: finalCorrect,
      });

      if (resp && resp.success && resp.data) {
        // Server 200 OK và có dữ liệu nghiệp vụ hợp lệ
        setSyncStatus('synced');
        setServerExpAwarded(resp.data.expAwarded || 10);
        rewardBamboo(2);
        void confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      } else {
        setSyncStatus('error');
      }
    } catch (err: unknown) {
      console.warn('Practice sync result failed:', err);
      setSyncStatus('error');
    }
  };

  const handleNext = async () => {
    stopChineseSpeech();
    if (currentIndex + 1 < PINYIN_QUIZ_QUESTIONS.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setTypedInput('');
      setIsAnswered(false);
      setAudioWarning(null);
    } else {
      setQuizFinished(true);
      const finalScore = score + (isCorrect ? 1 : 0);
      const finalPassed = finalScore >= Math.ceil(PINYIN_QUIZ_QUESTIONS.length * 0.7);
      await submitProgressToServer(finalScore, finalPassed);
    }
  };

  const handleRestart = () => {
    stopChineseSpeech();
    setCurrentIndex(0);
    setSelectedOption(null);
    setTypedInput('');
    setIsAnswered(false);
    setIsCorrect(false);
    setScore(0);
    setQuizFinished(false);
    setWrongQuestions([]);
    setSyncStatus('idle');
    setServerExpAwarded(0);
    setAudioWarning(null);
  };

  // ----------------------------------------------------
  // Render Summary View when Finished
  // ----------------------------------------------------
  if (quizFinished) {
    const percentage = Math.round((score / PINYIN_QUIZ_QUESTIONS.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="relative flex flex-col items-center justify-center rounded border border-rule bg-card p-6 sm:p-10 text-center">
        {syncStatus === 'synced' && <FloatingExpReward amount={serverExpAwarded} />}

        <div className="relative mb-5">
          <RedSealStamp text={passed ? '通' : '勉'} size={88} />
        </div>

        <h3 className="font-serif text-2xl font-bold text-fg">
          {passed ? 'Hoàn thành Tốt Bài Luyện Nhận Biết!' : 'Cần Ôn Lại Thêm Một Chút!'}
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-fg-60 max-w-md">
          Bạn đã đạt <span className="font-bold text-cinnabar-ink">{score}</span>/{PINYIN_QUIZ_QUESTIONS.length} điểm ({percentage}%) trong bài kiểm tra nhận biết ngữ âm Pinyin và thanh điệu.
          <br />
          <span className="text-[11px] text-fg-38 mt-1 block">
            *Lưu ý: Bài tập nhận biết thính giác và chính tả giúp bạn nhận diện âm đúng; việc phát âm cần kết hợp luyện nói thực tế thường xuyên.
          </span>
        </p>

        {/* EXP Status Banner */}
        {syncStatus === 'synced' && (
          <div className="mt-4 flex items-center gap-2 rounded bg-gold/15 border border-gold/30 px-4 py-2 text-xs font-semibold text-gold-ink">
            <Sparkles size={14} /> Máy chủ đã ghi nhận thành công: +{serverExpAwarded} EXP ngữ âm vào hồ sơ học tập.
          </div>
        )}

        {syncStatus === 'submitting' && (
          <div className="mt-4 flex items-center gap-2 rounded bg-tint border border-rule px-4 py-2 text-xs text-fg-60">
            <span className="inline-block animate-spin mr-1">⏳</span> Đang đồng bộ kết quả lên máy chủ...
          </div>
        )}

        {syncStatus === 'error' && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 rounded bg-gold/10 border border-gold/30 px-4 py-2 text-xs text-gold-ink">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" />
              <span>Chưa lưu được kết quả lên máy chủ (kết quả bài làm vẫn được giữ nguyên để bạn ôn lại, chưa cộng EXP).</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const finalScore = score;
                const finalPassed = finalScore >= Math.ceil(PINYIN_QUIZ_QUESTIONS.length * 0.7);
                void submitProgressToServer(finalScore, finalPassed);
              }}
              className="underline hover:text-on-accent font-semibold cursor-pointer shrink-0 ml-2"
            >
              Thử lưu lại
            </button>
          </div>
        )}

        {syncStatus === 'guest' && (
          <div className="mt-4 flex items-center gap-2 rounded bg-tint border border-rule px-4 py-2 text-xs text-fg-60">
            <Info size={14} /> Bạn đang luyện tập ở chế độ Khách (chưa đăng nhập). Kết quả bài làm được giữ trên màn hình; hãy đăng nhập để tích lũy EXP và Streak vào tài khoản.
          </div>
        )}

        {/* Review list of wrong answers */}
        {wrongQuestions.length > 0 && (
          <div className="mt-6 w-full text-left rounded border border-rule bg-tint p-4">
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-fg mb-3 flex items-center gap-1.5">
              <BookOpen size={14} className="text-cinnabar-ink" /> Các câu cần lưu ý ôn lại ({wrongQuestions.length}):
            </h4>
            <div className="flex flex-col gap-3">
              {wrongQuestions.map((item, idx) => (
                <div key={idx} className="rounded border border-rule/60 bg-card p-3 text-xs flex flex-col gap-1">
                  <div className="font-medium text-fg">{item.question.title}: {item.question.instruction}</div>
                  <div className="text-cinnabar-ink">
                    Câu trả lời của bạn: <span className="line-through">{item.userAnswer}</span>
                  </div>
                  <div className="text-jade-ink">
                    Đáp án đúng: <span className="font-semibold">{item.question.correctAnswer}</span>
                  </div>
                  <div className="text-fg-60 text-[11px] mt-0.5">
                    💡 Giải thích: {item.question.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleRestart}
          className="mt-6 inline-flex items-center gap-2 border border-cinnabar bg-cinnabar px-6 py-2.5 font-serif text-sm font-semibold text-on-accent transition-opacity hover:opacity-90 cursor-pointer "
        >
          <RotateCcw size={16} /> Luyện tập lại từ đầu
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render Active Question
  // ----------------------------------------------------
  return (
    <div className="flex flex-col gap-5">
      {/* Question Header & Counter */}
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <div>
          <span className="text-[11px] font-sans uppercase tracking-wider text-cinnabar-ink font-semibold">
            Câu {currentIndex + 1} / {PINYIN_QUIZ_QUESTIONS.length} · {currentQ.type === 'LISTEN_TONE' ? 'Bài nghe' : currentQ.type === 'TYPE_PINYIN_INPUT' ? 'Nhập bàn phím' : 'Trắc nghiệm'}
          </span>
          <h3 className="font-serif text-base font-semibold text-fg mt-0.5">
            {currentQ.title}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-fg-60 font-sans">
            Điểm: <b className="text-cinnabar-ink">{score}</b> / {currentIndex}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-rule/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-cinnabar transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / PINYIN_QUIZ_QUESTIONS.length) * 100}%` }}
        />
      </div>

      {/* Audio Warning */}
      {audioWarning && (
        <div className="flex items-center gap-2 rounded bg-gold/10 border border-gold/20 px-3.5 py-2 text-xs text-gold-ink">
          <AlertCircle size={14} className="shrink-0" />
          <span>{audioWarning}</span>
        </div>
      )}

      {/* Question Prompt */}
      <div className="rounded border border-rule bg-card p-5">
        <p className="text-xs sm:text-sm font-medium text-fg leading-relaxed">
          {currentQ.instruction}
        </p>

        {/* Audio Button for Listening Questions (Does NOT expose text) */}
        {currentQ.type === 'LISTEN_TONE' && (
          <div className="mt-4 flex flex-col items-center justify-center p-6 rounded border border-rule/60 bg-tint gap-2">
            <button
              type="button"
              onClick={() => handlePlayPrompt(currentQ.audioVoiceText)}
              className="inline-flex items-center gap-2 rounded-full border border-cinnabar bg-cinnabar/10 px-5 py-2.5 text-xs font-semibold text-cinnabar-ink hover:bg-cinnabar hover:text-on-accent transition-all cursor-pointer  hover:scale-105"
            >
              <Volume2 size={18} /> Bấm để nghe âm thanh mẫu
            </button>
            <span className="text-[11px] text-fg-38">
              (Lắng nghe cao độ và đường lượn âm thanh để chọn thanh 1, 2, 3 hoặc 4)
            </span>
          </div>
        )}

        {/* Interactive Answer Area */}
        <div className="mt-5">
          {/* Multiple Choice Options */}
          {currentQ.options && currentQ.type !== 'TYPE_PINYIN_INPUT' && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {currentQ.options.map((opt, i) => {
                const isSelected = selectedOption === opt;
                const isThisCorrect = opt === currentQ.correctAnswer;

                let btnStyle = 'border-rule bg-tint text-fg hover:border-rule-strong';
                if (isAnswered) {
                  if (isThisCorrect) {
                    btnStyle = 'border-jade bg-jade/15 text-jade-ink font-semibold';
                  } else if (isSelected) {
                    btnStyle = 'border-cinnabar bg-cinnabar/15 text-cinnabar-ink line-through';
                  } else {
                    btnStyle = 'border-rule/40 bg-card opacity-50 text-fg-38';
                  }
                }

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(opt)}
                    className={`flex items-center justify-between rounded border p-3 text-left text-xs transition-all cursor-pointer ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {isAnswered && isThisCorrect && (
                      <CheckCircle2 size={16} className="text-jade-ink shrink-0 ml-2" />
                    )}
                    {isAnswered && isSelected && !isThisCorrect && (
                      <XCircle size={16} className="text-cinnabar-ink shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Genuine Keyboard Text Input for TYPE_PINYIN_INPUT */}
          {currentQ.type === 'TYPE_PINYIN_INPUT' && (
            <form onSubmit={handleCheckTypedInput} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  disabled={isAnswered}
                  placeholder="Gõ Pinyin (VD: hao3 hoặc hǎo)..."
                  className="flex-1 rounded border border-rule bg-tint px-3.5 py-2 text-sm text-fg placeholder:text-fg-38 focus:border-cinnabar focus:outline-hidden font-sans"
                />
                {!isAnswered && (
                  <button
                    type="submit"
                    disabled={!typedInput.trim()}
                    className="inline-flex items-center gap-1.5 rounded bg-cinnabar px-4 py-2 text-xs font-semibold text-on-accent hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                  >
                    <Send size={14} /> Kiểm tra
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Immediate Explanation Feedback */}
        {isAnswered && (
          <div
            className={`mt-5 rounded border p-4 text-xs leading-relaxed animate-fade-in ${
              isCorrect
                ? 'border-jade/30 bg-jade/10 text-jade-ink'
                : 'border-cinnabar/30 bg-cinnabar/10 text-cinnabar-ink'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {isCorrect ? (
                <>
                  <CheckCircle2 size={16} className="text-jade-ink" />
                  <span>Chính xác!</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-cinnabar-ink" />
                  <span>Chưa chính xác! Đáp án đúng: {currentQ.correctAnswer}</span>
                </>
              )}
            </div>
            <p className="mt-1 text-fg-60 text-xs">{currentQ.explanation}</p>
          </div>
        )}
      </div>

      {/* Next Question Navigation */}
      {isAnswered && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded bg-cinnabar px-6 py-2.5 font-serif text-sm font-semibold text-on-accent hover:opacity-90 transition-opacity cursor-pointer "
          >
            {currentIndex + 1 < PINYIN_QUIZ_QUESTIONS.length ? 'Câu tiếp theo →' : 'Xem kết quả tổng kết'}
          </button>
        </div>
      )}
    </div>
  );
};

