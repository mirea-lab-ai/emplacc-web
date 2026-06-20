'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  projectName: string;
  isLoading?: boolean;
};

export default function DeleteProjectModal({ 
  open, 
  onClose, 
  onConfirm, 
  projectName, 
  isLoading = false 
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Ошибка при удалении проекта:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 t-surface-elevated rounded-xl border border-app">
        <h2 className="text-2xl font-semibold text-app mb-4">
          Закрыть проект
        </h2>

        <p className="text-app-2 mb-6">
          Вы уверены, что хотите закрыть проект <strong className="text-app">"{projectName}"</strong>?
          <br />
          <span className="text-red-400 text-sm mt-2 block">
            Это действие нельзя отменить. Все данные проекта будут удалены.
          </span>
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isDeleting || isLoading}
            className="btn-secondary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Отмена
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isDeleting || isLoading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting || isLoading ? 'Удаление...' : 'Закрыть проект'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
