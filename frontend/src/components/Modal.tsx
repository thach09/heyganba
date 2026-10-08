import { useEffect, useRef } from 'react';
import type { ReactNode, KeyboardEventHandler, RefObject } from 'react';

/** Native modal supplies focus trapping, inert background and focus restoration. */
export function Modal({ title, onClose, children, onKeyDown, compact = false, maxWidthClass = 'max-w-[560px]', initialFocus, containFocus = false }: { title: string; onClose: () => void; children: ReactNode; onKeyDown?: KeyboardEventHandler<HTMLDialogElement>; compact?: boolean; maxWidthClass?: string; initialFocus?: RefObject<HTMLElement | null>; containFocus?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    initialFocus?.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close(); document.body.style.overflow = previous;
      if (containFocus && opener?.isConnected) opener.focus();
    };
  }, [initialFocus, containFocus]);
  const handleKeyDown: KeyboardEventHandler<HTMLDialogElement> = event => {
    onKeyDown?.(event);
    if (!containFocus || event.defaultPrevented || event.key !== 'Tab') return;
    // Native dialog can Tab into browser chrome. Explicit cycling keeps Help focus in the page.
    const targets = [...event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex], [contenteditable="true"]')]
      .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[hidden], [inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
    const current = targets.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey ? (current <= 0 ? targets.length - 1 : current - 1) : (current + 1) % targets.length;
    event.preventDefault();
    (targets[next] ?? event.currentTarget).focus();
  };
  return <dialog ref={ref} tabIndex={containFocus ? -1 : undefined} aria-label={title} onKeyDown={handleKeyDown} onCancel={e => { e.preventDefault(); onClose(); }}
    onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}
    className={`fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-32px)] overflow-y-auto border-0 bg-card p-6 text-fg backdrop:bg-scrim ${compact ? 'max-w-[380px]' : maxWidthClass}`}>
    <button type="button" onClick={onClose} aria-label="Đóng" className="float-right ml-3 flex h-10 w-10 cursor-pointer items-center justify-center border border-rule text-fg-60">×</button>
    {children}
  </dialog>;
}
