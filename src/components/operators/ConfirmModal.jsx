import React, { useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { trapFocus } from '../../lib/operators/accessibility';

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'default' }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const cleanup = trapFocus(modalRef.current);
      return cleanup;
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const variants = useMemo(() => ({
    default: 'bg-white',
    danger: 'bg-white',
  }), []);

  const buttonVariants = useMemo(() => ({
    default: {
      confirm: 'bg-blue-600 hover:bg-blue-700 text-white',
      cancel: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    },
    danger: {
      confirm: 'bg-red-600 hover:bg-red-700 text-white',
      cancel: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    },
  }), []);

  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        ref={modalRef}
        className={`${variants[variant]} rounded-lg shadow-xl max-w-md w-full mx-4 p-4 sm:p-6`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-start gap-4 mb-4">
          {variant === 'danger' && (
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h3 id="modal-title" className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p id="modal-description" className="text-sm text-gray-600">
              {message}
            </p>
          </div>
          <button
            onClick={handleCancel}
            onKeyDown={(e) => e.key === 'Enter' && handleCancel()}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded"
            aria-label="Close dialog"
            tabIndex={0}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-3 justify-end flex-wrap">
          <button
            onClick={handleCancel}
            onKeyDown={(e) => e.key === 'Enter' && handleCancel()}
            className={`min-h-[44px] px-4 py-2 rounded-lg font-medium transition-colors ${buttonVariants[variant].cancel}`}
            tabIndex={0}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            className={`min-h-[44px] px-4 py-2 rounded-lg font-medium transition-colors ${buttonVariants[variant].confirm}`}
            tabIndex={0}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ConfirmModal);
