import { X } from 'lucide-react';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full ${sizes[size] || sizes.md} bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0">
            <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-5 overflow-y-auto">{children}</div>
          {footer && (
            <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 rounded-b-2xl shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}