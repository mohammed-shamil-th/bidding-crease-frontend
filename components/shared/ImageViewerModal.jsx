'use client';

import { useEffect } from 'react';

export default function ImageViewerModal({ isOpen, onClose, imageUrl, playerName }) {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity"
      onClick={onClose}
    >
      <div
        className="relative max-w-full max-h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-2 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full text-white transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Image */}
        <img
          src={imageUrl}
          alt={playerName || 'Player image'}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />

        {/* Player Name */}
        {playerName && (
          <div className="mt-4 text-center">
            <p className="text-white text-lg font-medium">{playerName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

