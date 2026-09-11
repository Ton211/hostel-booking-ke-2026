import React from 'react';

/**
 * Loading spinner component
 * @param {Object} props
 * @param {string} [props.size='md'] - 'sm' | 'md' | 'lg'
 * @param {boolean} [props.fullPage=false] - Full page overlay
 * @param {string} [props.message] - Loading message
 */
export default function LoadingSpinner({ size = 'md', fullPage = false, message }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
      />
      {message && (
        <p className="text-sm text-gray-500 mt-1">{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  );
}
