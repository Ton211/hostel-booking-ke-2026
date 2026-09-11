import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  variant = 'danger',
  loading: externalLoading = false,
}) {
  const [loading, setLoading] = useState(false);
  const isDanger = variant === 'danger';
  const busy = loading || externalLoading;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onClose?.();
    } catch (err) {
      console.error('Confirm failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-clay-600 hover:bg-clay-700'
            }`}
          >
            {busy ? 'Processing...' : confirmText}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-2.5 rounded-full shrink-0 ${
            isDanger ? 'bg-red-100 text-red-600' : 'bg-clay-100 text-clay-600'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-stone-600 leading-relaxed pt-1">{message}</p>
      </div>
    </Modal>
  );
}