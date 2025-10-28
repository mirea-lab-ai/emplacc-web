'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, onClose, children }: Props) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-y-auto overscroll-contain">
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
