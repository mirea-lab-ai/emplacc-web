'use client';

import Modal from '@/components/ui/Modal';
import TrashIcon from '@/components/ui/icons/TrashIcon';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  problemName: string;
  isDeleting?: boolean;
};

export default function DeleteProblemModal({ 
  open, 
  onClose, 
  onConfirm, 
  problemName, 
  isDeleting = false 
}: Props) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-md rounded-xl border border-app t-surface-elevated p-6 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <TrashIcon className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-app">Удалить проблему</h2>
        </div>
        
        <div className="mb-6">
          <p className="text-app-2 mb-2">
            Действительно закрыть проблему?
          </p>
          <div className="bg-app-subtle rounded-lg p-3 border border-app">
            <p className="text-app font-medium truncate">&ldquo;{problemName}&rdquo;</p>
          </div>
          <p className="text-sm text-app-2 mt-2">
            Это действие нельзя отменить. Все сообщения в этой проблеме будут удалены.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-app-2 hover:bg-app-hover transition-colors"
            disabled={isDeleting}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Удаляем...
              </>
            ) : (
              <>
                <TrashIcon className="w-4 h-4" />
                Удалить
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
