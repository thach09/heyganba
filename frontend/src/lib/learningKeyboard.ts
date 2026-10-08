/** Global study shortcuts yield to forms and dialogs; a station may own one result dialog. */
export function learningKeyboardBlocked(event: KeyboardEvent, ownedDialog?: string): boolean {
  const target = event.target;
  if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return true;
  return [...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]')]
    .some(dialog => !ownedDialog || dialog.getAttribute('aria-label') !== ownedDialog);
}
