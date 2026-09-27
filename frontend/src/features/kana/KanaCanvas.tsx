import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Eye, EyeOff, Undo2 } from 'lucide-react';
import { SubmitButton } from '../../components/SubmitButton';

type CanvasPoint = { x: number; y: number };

interface PenSizeOption {
  label: string;
  value: number;
}

const PEN_SIZES: PenSizeOption[] = [
  { label: 'Nhỏ', value: 4 },
  { label: 'Vừa', value: 7 },
  { label: 'To', value: 11 },
];

export interface KanaCanvasProps {
  /** Ký tự mẫu hiển thị mờ phía sau để học viên viết theo. */
  referenceChar: string;
  canvasSize?: number;
  submitLabel?: string;
  onSubmit?: () => void;
}

/**
 * Canvas luyện viết tay (HTML5 Canvas, chuột + touch).
 *
 * Component generic để Phase 3 (Kanji) tái sử dụng — chỉ cần truyền `referenceChar`.
 * Lưu ý: parent nên truyền prop `key={referenceChar}` để canvas tự xoá nét khi đổi chữ mẫu.
 */
export const KanaCanvas: React.FC<KanaCanvasProps> = ({
  referenceChar,
  canvasSize = 320,
  submitLabel = 'Kiểm tra nét viết',
  onSubmit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<CanvasPoint[][]>([]);
  const isDrawingRef = useRef(false);

  const [penSize, setPenSize] = useState(7);
  const [showTemplate, setShowTemplate] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [hasStrokes, setHasStrokes] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const size = canvasSize;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    if (showGuide) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);

      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
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
      ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const scale = referenceChar.length === 1 ? 0.74 : referenceChar.length === 2 ? 0.52 : 0.36;
      ctx.font = `600 ${Math.round(size * scale)}px 'Noto Sans JP', sans-serif`;
      ctx.fillText(referenceChar, size / 2, size / 2 + size * 0.02);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokesRef.current.forEach((stroke) => {
      if (stroke.length === 1) {
        const [point] = stroke;
        ctx.beginPath();
        ctx.arc(point.x, point.y, penSize / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.beginPath();
      stroke.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    });

    ctx.restore();
  }, [canvasSize, penSize, referenceChar, showGuide, showTemplate]);

  // Cấu hình kích thước canvas theo devicePixelRatio rồi vẽ lại toàn bộ nét.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvasSize * ratio);
    canvas.height = Math.round(canvasSize * ratio);
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;

    draw();
  }, [canvasSize, draw]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): CanvasPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    strokesRef.current = [...strokesRef.current, [getPoint(event)]];
    setHasStrokes(true);
    draw();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const currentStroke = strokesRef.current[strokesRef.current.length - 1];
    if (!currentStroke) return;
    currentStroke.push(getPoint(event));
    draw();
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draw();
  };

  const handleClear = () => {
    strokesRef.current = [];
    setHasStrokes(false);
    draw();
  };

  const handleUndo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setHasStrokes(strokesRef.current.length > 0);
    draw();
  };

  return (
    <div className="canvas-panel">
      <div className="canvas-toolbar">
        <div className="canvas-tool-group">
          <span className="canvas-tool-label">Cỡ bút</span>
          {PEN_SIZES.map((option) => (
            <button
              key={option.label}
              type="button"
              className={`chip ${penSize === option.value ? 'is-active' : ''}`}
              onClick={() => setPenSize(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="canvas-tool-group">
          <button
            type="button"
            className={`chip ${showTemplate ? 'is-active' : ''}`}
            onClick={() => setShowTemplate((previous) => !previous)}
          >
            {showTemplate ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>Chữ mẫu</span>
          </button>
          <button
            type="button"
            className={`chip ${showGuide ? 'is-active' : ''}`}
            onClick={() => setShowGuide((previous) => !previous)}
          >
            <span>Ô ly</span>
          </button>
        </div>

        <div className="canvas-tool-group">
          <button type="button" className="chip" onClick={handleUndo} disabled={!hasStrokes}>
            <Undo2 size={14} />
            <span>Xoá nét cuối</span>
          </button>
          <button type="button" className="chip" onClick={handleClear} disabled={!hasStrokes}>
            <Eraser size={14} />
            <span>Xoá hết</span>
          </button>
        </div>
      </div>

      <div className="canvas-shell">
        <canvas
          ref={canvasRef}
          className="kana-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
          onPointerCancel={finishStroke}
        />
      </div>

      <div className="canvas-footer">
        <span className="canvas-hint">
          Viết lại chữ <strong>{referenceChar}</strong> theo mẫu mờ rồi tự đối chiếu lại nét với chữ gốc.
        </span>
        <SubmitButton onClick={onSubmit} disabled={!hasStrokes}>
          {submitLabel}
        </SubmitButton>
      </div>
    </div>
  );
};
