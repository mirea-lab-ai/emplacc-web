'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useCreateProblem } from '@/features/problems/hooks';
import { getUserId } from '@/lib/auth';

type Props = {
  onClose: () => void;
};

export default function CreateProblemModal({ onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { mutate: createProblem, isPending, error } = useCreateProblem();
  const toast = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    const userId = getUserId();
    if (!userId) {
      toast.error('Ошибка: пользователь не авторизован');
      return;
    }
    
    createProblem(
      { 
        name: title.trim(), 
        description: description.trim() ? [description.trim()] : undefined,
        creator_id: userId
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Modal open onClose={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/20 bg-white/5 p-6 shadow-lg backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">Новая проблема</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="problem-title" className="mb-1 block text-sm font-medium text-slate-300">
              Название проблемы <span className="text-red-400">*</span>
            </label>
            <input
              id="problem-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="Краткое описание проблемы"
              required
            />
          </div>
          
          <div>
            <label htmlFor="problem-description" className="mb-1 block text-sm font-medium text-slate-300">
              Описание (необязательно)
            </label>
            <textarea
              id="problem-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="Подробное описание проблемы, шаги воспроизведения, ожидаемый результат..."
            />
          </div>
          
          {error && <p className="text-sm text-red-400">Ошибка: {error.message}</p>}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-slate-300 hover:bg-white/10 transition-colors"
              disabled={isPending}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending || !title.trim()}
            >
              {isPending ? 'Создаём...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
