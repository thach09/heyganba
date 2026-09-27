import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Shuffle, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { SubmitButton } from '../../components/SubmitButton';
import { KANA_GROUP_META, KANA_GROUP_ORDER, getKanaQuizPool } from './kanaData';
import type { KanaEntry, KanaGroupKey, KanaScript } from './kanaData';
import { playKanaAudio } from './kanaAudio';

const OPTION_KEYS = ['1', '2', '3', '4'];

type QuizGroup = Exclude<KanaGroupKey, 'DOUBLE_KATAKANA'>;
type QuizScope = 'ALL' | QuizGroup;

interface QuizQuestion {
  entry: KanaEntry;
  options: string[];
}

interface KanaQuizProps {
  script: KanaScript;
}

/** PRNG có seed → câu hỏi ổn định trong 1 lượt render, không cần effect đồng bộ state. */
function createRandom(seed: number): () => number {
  let state = (seed * 2654435761) % 4294967296;
  return () => {
    state = (state + 0x6d2b79f5) % 4294967296;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function buildQuestion(pool: KanaEntry[], seed: number): QuizQuestion | null {
  if (pool.length === 0) return null;

  const random = createRandom(seed + 7);
  const entry = pool[Math.floor(random() * pool.length)];

  const distractors: string[] = [];
  const candidates = pool.filter((item) => item.romaji !== entry.romaji);
  while (distractors.length < 3 && candidates.length > 0) {
    const index = Math.floor(random() * candidates.length);
    const [picked] = candidates.splice(index, 1);
    if (!distractors.includes(picked.romaji)) {
      distractors.push(picked.romaji);
    }
  }

  const options = [entry.romaji, ...distractors];
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const temporary = options[index];
    options[index] = options[swapIndex];
    options[swapIndex] = temporary;
  }

  return { entry, options };
}

/**
 * Quiz nhận diện kana: hiện 1 chữ → chọn romaji đúng trong 4 đáp án.
 * Phím tắt 1/2/3/4 để chọn, Enter để sang câu tiếp — nhất quán với các trạm khác.
 */
export const KanaQuiz: React.FC<KanaQuizProps> = ({ script }) => {
  const [scope, setScope] = useState<QuizScope>('ALL');
  const [seed, setSeed] = useState(1);
  const [answer, setAnswer] = useState<{ questionKey: string; option: string } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);

  const pool = useMemo(() => {
    const entries = getKanaQuizPool(script);
    return scope === 'ALL' ? entries : entries.filter((entry) => entry.group === scope);
  }, [script, scope]);

  const question = useMemo(() => buildQuestion(pool, seed), [pool, seed]);
  const questionKey = question ? `${script}-${scope}-${seed}-${question.entry.id}` : '';
  const selected = answer && answer.questionKey === questionKey ? answer.option : null;

  const handleAnswer = useCallback(
    (option: string) => {
      if (!question || selected) return;

      const isCorrect = option === question.entry.romaji;
      setAnswer({ questionKey, option });
      setScore((previous) => ({
        correct: previous.correct + (isCorrect ? 1 : 0),
        total: previous.total + 1,
      }));
      playKanaAudio(question.entry);

      if (isCorrect) {
        confetti({ particleCount: 45, spread: 65, origin: { y: 0.85 } });
        setFeedback({
          type: 'success',
          title: `Chính xác! ${question.entry.character}`,
          message: `Đọc là "${question.entry.romaji}". Nhấn Enter để sang câu tiếp theo.`,
        });
      } else {
        setFeedback({
          type: 'error',
          title: `Chưa chính xác! ${question.entry.character}`,
          message: `Đáp án đúng là "${question.entry.romaji}". Nhấn Enter để sang câu tiếp theo.`,
        });
      }
    },
    [question, questionKey, selected]
  );

  const handleNext = useCallback(() => {
    setFeedback(null);
    setSeed((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!question) return;

      if (OPTION_KEYS.includes(event.key)) {
        const option = question.options[Number(event.key) - 1];
        if (option) handleAnswer(option);
        return;
      }

      if (event.key === 'Enter' && selected) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, selected, handleAnswer, handleNext]);

  const scopeOptions: { key: QuizScope; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    ...KANA_GROUP_ORDER[script]
      .filter((group): group is QuizGroup => group !== 'DOUBLE_KATAKANA')
      .map((group) => ({ key: group, label: KANA_GROUP_META[group].shortLabel })),
  ];

  return (
    <div className="quiz-panel">
      <div className="quiz-toolbar">
        <div className="quiz-scope">
          <span className="canvas-tool-label">Phạm vi luyện</span>
          {scopeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`chip ${scope === option.key ? 'is-active' : ''}`}
              onClick={() => setScope(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="quiz-score">
          <span className="quiz-score-item is-correct">Đúng {score.correct}</span>
          <span className="quiz-score-item is-wrong">Sai {Math.max(score.total - score.correct, 0)}</span>
          <span className="quiz-score-item">Tổng {score.total}</span>
        </div>
      </div>

      {question ? (
        <>
          <div className="quiz-question">
            <button
              type="button"
              className="quiz-char-button"
              onClick={() => playKanaAudio(question.entry)}
              title="Bấm để nghe lại phát âm"
            >
              <span className="quiz-char">{question.entry.character}</span>
            </button>
            <div className="quiz-question-meta">
              <span className="kana-count-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                {KANA_GROUP_META[question.entry.group].shortLabel} · {question.entry.row}
              </span>
              <span className="quiz-hint">Chọn romaji đúng bằng phím 1 / 2 / 3 / 4</span>
            </div>
          </div>

          <div className="quiz-options">
            {question.options.map((option, index) => {
              const classNames = ['quiz-option'];
              if (selected) {
                if (option === question.entry.romaji) classNames.push('is-correct');
                else if (option === selected) classNames.push('is-wrong');
              }
              return (
                <button
                  key={option}
                  type="button"
                  className={classNames.join(' ')}
                  onClick={() => handleAnswer(option)}
                  disabled={Boolean(selected)}
                >
                  <kbd>{OPTION_KEYS[index]}</kbd>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          <div className="quiz-actions">
            <button type="button" className="btn btn-secondary" onClick={() => playKanaAudio(question.entry)}>
              <Volume2 size={16} />
              <span>Nghe lại</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleNext}>
              <Shuffle size={16} />
              <span>Đổi câu khác</span>
            </button>
            <SubmitButton onClick={handleNext} disabled={!selected} shortcutHint="Enter">
              Câu tiếp theo
            </SubmitButton>
          </div>
        </>
      ) : (
        <div className="kana-detail-empty">
          <span>Nhóm ký tự này chưa có dữ liệu để luyện tập.</span>
        </div>
      )}

      {feedback && (
        <FeedbackAlert
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
};
