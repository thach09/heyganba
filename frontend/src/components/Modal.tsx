import { useEffect, useRef } from 'react';
import type { ReactNode, KeyboardEventHandler } from 'react';

/** Native modal supplies focus trapping, inert background and focus restoration. */
export function Modal({ title, onClose, children, onKeyDown, compact = false }: { title: string; onClose: () => void; children: ReactNode; onKeyDown?: KeyboardEventHandler<HTMLDialogElement>; compact?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={ref} aria-label={title} onKeyDown={onKeyDown} onCancel={e => { e.preventDefault(); onClose(); }}
    onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}
    className={`fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-32px)] overflow-y-auto border-0 bg-card p-6 text-fg backdrop:bg-scrim ${compact ? 'max-w-[380px]' : 'max-w-[560px]'}`}>
    <button type="button" onClick={onClose} aria-label="Đóng" className="float-right ml-3 flex h-10 w-10 cursor-pointer items-center justify-center border border-rule text-fg-60">×</button>
    {children}
  </dialog>;
}
