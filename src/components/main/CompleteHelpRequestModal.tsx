'use client';

import Modal from '@/components/ui/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isCompleting: boolean;
};

export default function CompleteHelpRequestModal({ open, onClose, onConfirm, isCompleting }: Props) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose}>
      <div className="w-full max-w-md rounded-xl border border-app t-surface-elevated p-6 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-app">Завершить просьбу о помощи</h2>
        </div>

        <p className="text-app-2 mb-6">
          Вы уверены, что хотите закрыть просьбу о помощи?
        </p>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-app-2 hover:bg-app-hover transition-colors"
            disabled={isCompleting}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCompleting}
          >
            {isCompleting ? 'Завершаем...' : 'Завершить'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
