'use client';

import Modal from '@/components/ui/Modal';

type Props = {
  boardName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
};

export default function DeleteBoardModal({ boardName, onConfirm, onCancel, isDeleting = false }: Props) {
  return (
    <Modal open onClose={onCancel}>
      <div className="w-full max-w-md rounded-xl border border-white/20 bg-white/5 p-6 shadow-lg backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">Удаление доски</h2>
        
        <div className="mb-6">
          <p className="text-slate-300 mb-2">
            Вы уверены, что хотите удалить доску <span className="font-semibold text-white">&ldquo;{boardName}&rdquo;</span>?
          </p>
          <p className="text-sm text-slate-400">
            Это действие нельзя отменить. Все данные доски будут потеряны.
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-slate-300 hover:bg-white/10 transition-colors"
            disabled={isDeleting}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаляем...' : 'Удалить'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
