import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from '../hooks/useTranslations';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const { t } = useTranslations();

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="lc-modal-root fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 sm:p-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="lc-modal relative my-auto w-full max-w-3xl max-h-[min(90vh,52rem)] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-5 sm:p-6 shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lc-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4">
          <div className="w-8 shrink-0" aria-hidden />
          <h2
            id="lc-modal-title"
            className="text-xl sm:text-2xl font-semibold text-white text-center flex-1 tracking-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white text-2xl leading-none"
            aria-label={t('closeModal')}
          >
            &times;
          </button>
        </div>
        <div className="lc-modal-body text-slate-100">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
