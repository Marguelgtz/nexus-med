'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Native top-layer dialog supplies inert background and keyboard focus containment. */
export function Modal({ title, description, onClose, closeDisabled = false, children }: {
  title: string;
  description?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const surface = dialog.current;
    const opener = document.activeElement;
    if (!surface) return;
    surface.showModal();
    surface.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea')?.focus();
    return () => {
      surface.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog ref={dialog} className="app-dialog" aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          if (!closeDisabled) onClose();
          return;
        }
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button, input:not([type="hidden"]), select, textarea, a[href], [tabindex="0"]',
        )).filter((element) => !element.matches(':disabled') && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onCancel={(event) => { event.preventDefault(); if (!closeDisabled) onClose(); }}>
      <header className="app-dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="btn btn-ghost btn-icon app-dialog-close" disabled={closeDisabled} onClick={onClose} aria-label="Cerrar diálogo" title="Cerrar">×</button>
      </header>
      <div className="app-dialog-content">
        {description ? <p className="field-hint" id={descriptionId}>{description}</p> : null}
        {children}
      </div>
    </dialog>
  );
}
