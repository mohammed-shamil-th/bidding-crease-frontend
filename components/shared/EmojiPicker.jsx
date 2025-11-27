'use client';

import { useEffect } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import Modal from './Modal';

export default function EmojiPicker({ isOpen, onClose, onSelect, currentEmoji }) {
  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleEmojiSelect = (emoji) => {
    onSelect(emoji.native);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Icon">
      <div className="w-full">
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme="light"
          previewPosition="none"
          skinTonePosition="none"
          locale="en"
          maxFrequentRows={2}
        />
      </div>
    </Modal>
  );
}

