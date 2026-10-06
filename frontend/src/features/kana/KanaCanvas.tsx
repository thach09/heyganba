import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gradeHandwriting } from './handwritingScore';
import type { CanvasPoint, HandwritingScore } from './handwritingScore';

/** Normalized stroke point (0..1 of the square) so the canvas can resize without shifting the ink. */

interface PenSizeOption {
  label: string;
  value: number;
}

const PEN_SIZES: PenSizeOption[] = [
  { label: 'Nhỏ', value: 4 },
  { label: 'Vừa', value: 7 },
  { label: 'To', value: 11 },
];

/* Colors mirror the ink/paper tokens (see DESIGN.md) - the 2D context cannot read CSS variables. */
const PAPER = '#1B1C19'; // --card
const INK = '#ECECE6'; // --fg
const GUIDE_MAIN = 'rgba(236, 236, 230, 0.35)';
const GUIDE_DIAGONAL = 'rgba(236, 236, 230, 0.16)';
const TEMPLATE = 'rgba(236, 236, 230, 0.16)';

export interface KanaCanvasProps {
  /** Reference character shown faintly behind the strokes. */
  referenceChar: string;
  /** Upper bound of the square in CSS px; it shrinks to fit narrow screens. */
  maxSize?: number;
  submitLabel?: string;
  onSubmit?: (score: HandwritingScore) => void | boolean | Promise<void | boolean>;
  onInkChange?: () => void;
  /**
   * Animation thứ tự nét có được hỗ trợ không.
   *
   * Hiện là `false` ở MỌI nơi: dữ liệu nét viết (KanjiVG) mang license CC BY-SA 3.0 (share-alike) nên KHÔNG
   * dùng được cho sản phẩm này, và chưa tìm được nguồn license permissive thay thế — xem
   * docs/Internal/content-mapping-fpt-curriculum.md → "Stroke order". Khi có nguồn phù hợp thì truyền `true`.
   */
  strokeOrderSupported?: boolean;
}

/**
 * Handwriting canvas (HTML5 Canvas, pointer events).
 *
 * Generic component reused by the Kanji station - pass `referenceChar`.
 * Note: the parent should pass `key={referenceChar}` so the strokes reset when the character changes.
 */
export const KanaCanvas: React.FC<KanaCanvasProps> = ({
  referenceChar,
  maxSize = 460,
  submitLabel = 'Kiểm tra nét viết',
  onSubmit,
  onInkChange,
  strokeOrderSupported = false,
}) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<CanvasPoint[][]>([]);
  const isDrawingRef = useRef(false);
  const pointerRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const [size, setSize] = useState(320);
  const [penSize, setPenSize] = useState(7);
  const [showTemplate, setShowTemplate] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [score, setScore] = useState<HandwritingScore | null>(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fit the square to the column, capped at maxSize.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    const update = () => {
      const width = shell.getBoundingClientRect().width;
      setSize(Math.max(1, Math.min(Math.round(width), maxSize)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [maxSize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, size, size);

    if (showGuide) {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = GUIDE_MAIN;
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();

      ctx.strokeStyle = GUIDE_DIAGONAL;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, size);
      ctx.moveTo(size, 0);
      ctx.lineTo(0, size);
      ctx.stroke();
      ctx.restore();
    }

    if (showTemplate && referenceChar) {
      ctx.save();
      ctx.fillStyle = TEMPLATE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const scale = referenceChar.length === 1 ? 0.74 : referenceChar.length === 2 ? 0.52 : 0.36;
      ctx.font = `400 ${Math.round(size * scale)}px 'Noto Serif JP', serif`;
      ctx.fillText(referenceChar, size / 2, size / 2 + size * 0.02);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokesRef.current.forEach((stroke) => {
      if (stroke.length === 1) {
        const [point] = stroke;
        ctx.beginPath();
        ctx.arc(point.x * size, point.y * size, penSize / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.beginPath();
      stroke.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x * size, point.y * size);
        } else {
          ctx.lineTo(point.x * size, point.y * size);
        }
      });
      ctx.stroke();
    });

    ctx.restore();
  }, [penSize, referenceChar, showGuide, showTemplate, size]);

  // Size the backing store by devicePixelRatio, then repaint every stroke.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    draw();
    void document.fonts.load("400 200px 'Noto Serif JP'", referenceChar).then(draw).catch(() => setError('Chưa tải được chữ mẫu. Kiểm tra kết nối rồi thử lại.'));
  }, [size, draw, referenceChar]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): CanvasPoint => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.width === 0 ? 0 : (event.clientX - rect.left) / rect.width,
      y: rect.height === 0 ? 0 : (event.clientY - rect.top) / rect.height,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (busyRef.current || pointerRef.current !== null || event.button !== 0) return;
    event.preventDefault();
    onInkChange?.();
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    strokesRef.current = [...strokesRef.current, [getPoint(event)]];
    setHasStrokes(true);
    setScore(null); setError(''); setSubmitted(false);
    draw();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || pointerRef.current !== event.pointerId) return;
    const currentStroke = strokesRef.current[strokesRef.current.length - 1];
    if (!currentStroke) return;
    currentStroke.push(getPoint(event));
    draw();
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || pointerRef.current !== event.pointerId) return;
    isDrawingRef.current = false;
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draw();
  };

  const handleClear = () => {
    onInkChange?.();
    setScore(null); setError(''); setSubmitted(false);
    strokesRef.current = [];
    setHasStrokes(false);
    draw();
  };

  const handleUndo = () => {
    onInkChange?.();
    setScore(null); setError(''); setSubmitted(false);
    strokesRef.current = strokesRef.current.slice(0, -1);
    setHasStrokes(strokesRef.current.length > 0);
    draw();
  };

  const handleCheck = async () => {
    if (busyRef.current || isDrawingRef.current || submitted || !hasStrokes) return;
    busyRef.current = true; setChecking(true); setError('');
    try {
      const fonts = await document.fonts.load("400 200px 'Noto Serif JP'", referenceChar);
      if (!fonts.length || !document.fonts.check("400 200px 'Noto Serif JP'", referenceChar)) throw new Error('Chữ mẫu chưa tải xong. Vui lòng kiểm tra kết nối rồi thử lại.');
      const result = gradeHandwriting(referenceChar, strokesRef.current);
      setScore(result);
      if (result.accepted) {
        const saved = await onSubmit?.(result);
        setSubmitted(saved !== false);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa kiểm tra được nét viết. Vui lòng thử lại.');
    } finally { busyRef.current = false; setChecking(false); }
  };

  const chipClass = (active: boolean) =>
    `cursor-pointer border bg-transparent px-2.5 py-1 text-[11px] transition-colors ${
      active ? 'border-fg text-fg' : 'border-rule text-fg-60 hover:border-rule-strong hover:text-fg'
    }`;

  return (
    <div className="mx-auto w-full max-w-[460px]" aria-busy={checking}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38">Cỡ bút</span>
          {PEN_SIZES.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setPenSize(option.value)}
              className={chipClass(penSize === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowTemplate((previous) => !previous)} className={chipClass(showTemplate)}>
            Chữ mẫu
          </button>
          <button type="button" onClick={() => setShowGuide((previous) => !previous)} className={chipClass(showGuide)}>
            Ô ly
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!hasStrokes || checking}
            className="cursor-pointer border border-rule bg-transparent px-2.5 py-1 text-[11px] text-fg-60 transition-colors hover:border-rule-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
          >
            Xoá nét cuối
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasStrokes || checking}
            className="cursor-pointer border border-rule bg-transparent px-2.5 py-1 text-[11px] text-fg-60 transition-colors hover:border-rule-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
          >
            Xoá hết
          </button>
        </div>
      </div>

      <div ref={shellRef} className="mt-6">
        {!strokeOrderSupported && (
          <p className="mb-3 flex flex-wrap items-center gap-2 text-[11.5px] leading-[1.7] text-fg-38">
            <span className="border border-rule px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fg-60">
              Stroke order: Chưa hỗ trợ
            </span>
            <span>Đối chiếu hình chữ với mẫu, cần khớp ít nhất 80%. Chưa chấm thứ tự nét.</span>
          </p>
        )}
        <canvas
          ref={canvasRef}
          aria-label={`Vùng luyện viết chữ ${referenceChar}`}
          className="block touch-none border border-rule-strong"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        />
      </div>

      <div role="status" aria-live="polite" className="mt-4 text-[12.5px] leading-[1.8]">
        {score && <p className={score.accepted ? 'text-fg' : 'text-red'}>
          Khớp {Math.floor(score.accuracy * 100)}% · phủ nét mẫu {Math.floor(score.coverage * 100)}% · nét đúng vị trí {Math.floor(score.precision * 100)}%.
          {score.accepted ? ' Đạt yêu cầu 80%.' : ' Chưa đạt 80%. Hãy xoá nét lệch và viết đủ phần còn thiếu.'}
        </p>}
        {error && <p className="text-red">{error}</p>}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <span className="text-[11.5px] leading-[1.7] text-fg-38">
          Viết lại chữ <strong className="font-serif text-[13px] font-normal text-fg-60">{referenceChar}</strong> theo
          mẫu mờ. Có thể ẩn mẫu khi đã quen.
        </span>
        <button
          type="button"
          onClick={() => void handleCheck()}
          disabled={!hasStrokes || checking || submitted}
          className="cursor-pointer border border-fg bg-fg px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-bg transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {checking ? 'Đang kiểm tra…' : submitted ? 'Đã hoàn thành' : submitLabel}
        </button>
      </div>
    </div>
  );
};
