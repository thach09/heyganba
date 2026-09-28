import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Normalized stroke point (0..1 of the square) so the canvas can resize without shifting the ink. */
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
  onSubmit?: () => void;
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
}) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<CanvasPoint[][]>([]);
  const isDrawingRef = useRef(false);

  const [size, setSize] = useState(320);
  const [penSize, setPenSize] = useState(7);
  const [showTemplate, setShowTemplate] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [hasStrokes, setHasStrokes] = useState(false);

  // Fit the square to the column, capped at maxSize.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    const update = () => {
      const width = shell.getBoundingClientRect().width;
      setSize(Math.max(240, Math.min(Math.round(width), maxSize)));
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
  }, [size, draw]);

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

  const chipClass = (active: boolean) =>
    `cursor-pointer border bg-transparent px-2.5 py-1 text-[11px] transition-colors ${
      active ? 'border-fg text-fg' : 'border-rule text-fg-60 hover:border-rule-strong hover:text-fg'
    }`;

  return (
    <div className="mx-auto w-full max-w-[460px]">
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
            disabled={!hasStrokes}
            className="cursor-pointer border border-rule bg-transparent px-2.5 py-1 text-[11px] text-fg-60 transition-colors hover:border-rule-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
          >
            Xoá nét cuối
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasStrokes}
            className="cursor-pointer border border-rule bg-transparent px-2.5 py-1 text-[11px] text-fg-60 transition-colors hover:border-rule-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
          >
            Xoá hết
          </button>
        </div>
      </div>

      <div ref={shellRef} className="mt-6">
        <canvas
          ref={canvasRef}
          className="block touch-none border border-rule-strong"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
          onPointerCancel={finishStroke}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <span className="text-[11.5px] leading-[1.7] text-fg-38">
          Viết lại chữ <strong className="font-serif text-[13px] font-normal text-fg-60">{referenceChar}</strong> theo
          mẫu mờ rồi tự đối chiếu lại nét với chữ gốc.
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!hasStrokes}
          className="cursor-pointer border border-fg bg-fg px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-bg transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
};
