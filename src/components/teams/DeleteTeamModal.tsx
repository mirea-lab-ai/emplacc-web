'use client';

import Modal from '@/components/ui/Modal';
import TrashIcon from '@/components/ui/icons/TrashIcon';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  teamName: string;
  isDeleting: boolean;
};

export default function DeleteTeamModal({ open, onClose, onConfirm, teamName, isDeleting }: Props) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/20 bg-white/5 p-6 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <TrashIcon className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Расформировать команду</h2>
        </div>

        <p className="text-slate-300 mb-4">
          Вы уверены, что хотите расформировать команду <span className="font-semibold text-white">&ldquo;{teamName}&rdquo;</span>?
        </p>
        <p className="text-sm text-red-300 mb-6">
          Это действие нельзя отменить. Все участники команды будут удалены из неё.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-slate-300 hover:bg-white/10 transition-colors"
            disabled={isDeleting}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаляем...' : 'Расформировать'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
