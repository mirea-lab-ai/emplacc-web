'use client';

import Modal from '@/components/ui/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
  taskName: string;
  taskDescription: string;
};

export default function TaskDetailModal({ open, onClose, taskName, taskDescription }: Props) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-app t-surface-elevated p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-app mb-2">{taskName}</h2>
          <div className="h-px bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
        </div>

        <div className="mb-6">
          <h3 className="text-app-2 text-sm font-medium mb-2">Описание</h3>
          <div className="text-app-2 leading-relaxed whitespace-pre-wrap">
            {taskDescription || 'Описание отсутствует'}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-gradient-to-br from-emerald-500 to-lime-400 px-6 py-2 font-semibold text-black hover:brightness-110 active:translate-y-px transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
