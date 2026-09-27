import React, { useState } from 'react';
import { SubmitButton } from '../../components/SubmitButton';
import { FeedbackAlert } from '../../components/FeedbackAlert';
import type { FeedbackType } from '../../components/FeedbackAlert';
import { OnboardingTooltip } from '../../components/OnboardingTooltip';
import { Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * ⚠️ KHÔNG CÒN ĐƯỢC WIRE VÀO APP.
 *
 * Component này là demo chuẩn UX dùng ở Phase 0 (nút submit thống nhất, loading, toast đúng/sai, onboarding).
 * Từ khi cả 5 trạm đều có UI thật (Phase 1–5), nó không còn được render ở đâu; giữ lại làm tài liệu tham chiếu
 * cho các màn hình mới cần dựng nhanh theo đúng pattern UX.
 */
interface StationPlaceholderViewProps {
  stationKey: string;
  stationTitle: string;
  phaseTag: string;
  badgeColor: string;
  description: string;
  modules: string[];
}

export const StationPlaceholderView: React.FC<StationPlaceholderViewProps> = ({
  stationKey,
  stationTitle,
  phaseTag,
  badgeColor,
  description,
  modules,
}) => {
  const [feedback, setFeedback] = useState<{ type: FeedbackType; title: string; message: string } | null>(null);
  const [testAnswer, setTestAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestSubmit = (answer: string) => {
    setLoading(true);
    setTestAnswer(answer);
    setTimeout(() => {
      setLoading(false);
      if (answer === 'correct') {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
        setFeedback({
          type: 'success',
          title: 'Chính xác! 正解 (Seikai)',
          message: 'Thao tác submit nhất quán với phím tắt Enter và phản hồi tức thì.',
        });
      } else {
        setFeedback({
          type: 'error',
          title: 'Chưa chính xác! 不正解 (Fuseikai)',
          message: 'Đáp án đúng đã được phân tích và lưu lại để ôn tập.',
        });
      }
    }, 400);
  };

  return (
    <div>
      <OnboardingTooltip
        storageKey={`station_${stationKey}`}
        title={`Hướng dẫn sử dụng ${stationTitle}`}
        description={`Mọi thao tác tại trạm này đều tuân thủ quy chuẩn UX thống nhất: dùng phím số 1/2/3/4 để chọn, Enter để kiểm tra đáp án.`}
      />

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: `${badgeColor}20`, color: badgeColor }}>
            {phaseTag}
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: 800 }}>{stationTitle}</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6, maxWidth: '800px' }}>
          {description}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Module List */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--primary)" />
            <span>Nội dung đã thiết kế theo Roadmap</span>
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {modules.map((mod, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={12} />
                </span>
                <span>{mod}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Consistent Interactive UX Demonstration */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
            Demo trải nghiệm UX nhất quán (Phase 0)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Thử nghiệm tương tác phản hồi chuẩn hóa: nút bấm, trạng thái loading, và toast thông báo đúng/sai.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <button
              onClick={() => handleTestSubmit('correct')}
              className={`btn btn-secondary`}
              style={{
                justifyContent: 'flex-start',
                padding: '12px 16px',
                borderColor: testAnswer === 'correct' ? '#10B981' : undefined,
              }}
            >
              <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>1</kbd>
              <span>Đáp án kiểm thử chính xác (Thử hiệu ứng thành công)</span>
            </button>

            <button
              onClick={() => handleTestSubmit('wrong')}
              className={`btn btn-secondary`}
              style={{
                justifyContent: 'flex-start',
                padding: '12px 16px',
                borderColor: testAnswer === 'wrong' ? '#EF4444' : undefined,
              }}
            >
              <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>2</kbd>
              <span>Đáp án kiểm thử sai (Thử phản hồi giải thích lỗi)</span>
            </button>
          </div>

          <SubmitButton
            onClick={() => handleTestSubmit('correct')}
            loading={loading}
            shortcutHint="Enter"
            fullWidth
          >
            Kiểm tra kết quả
          </SubmitButton>
        </div>
      </div>

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
