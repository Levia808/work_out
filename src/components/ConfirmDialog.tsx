import { AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const EXIT_MS = 180;

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (open && !closing) {
      clearTimer();
      setMounted(true);
      setClosing(false);
      requestAnimationFrame(() => cancelRef.current?.focus());
      return;
    }
    if (!mounted || closing) return;
    setClosing(true);
    timerRef.current = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      timerRef.current = null;
    }, EXIT_MS);
  }, [open, mounted, closing]);

  const close = (callback: () => void) => {
    if (closing) return;
    setClosing(true);
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      timerRef.current = null;
      callback();
    }, EXIT_MS);
  };

  useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(onCancel);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mounted, onCancel]);

  if (!mounted) return null;

  return createPortal(<div className={`confirm-backdrop${closing ? ' is-closing' : ''}`} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(onCancel); }}>
    <section className={`confirm-dialog${danger ? ' is-danger' : ''}`} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby={description ? 'confirm-dialog-description' : undefined} onMouseDown={event => event.stopPropagation()}>
      <div className="confirm-dialog-icon" aria-hidden="true"><AlertTriangle size={20} /></div>
      <button className="icon-btn confirm-dialog-close" type="button" onClick={() => close(onCancel)} aria-label="关闭确认框" title="关闭"><X size={18} /></button>
      <h2 id="confirm-dialog-title" className="card-title">{title}</h2>
      {description ? <p id="confirm-dialog-description" className="card-copy">{description}</p> : null}
      <div className="confirm-dialog-actions">
        <button ref={cancelRef} className="secondary-btn" type="button" onClick={() => close(onCancel)}>{cancelLabel}</button>
        <button className={`primary-btn${danger ? ' danger-btn' : ''}`} type="button" onClick={() => close(onConfirm)}>{confirmLabel}</button>
      </div>
    </section>
  </div>, document.body);
}
