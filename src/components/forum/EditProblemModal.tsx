'use client';

import { useEffect, useState } from 'react';
import { useUpdateProblem } from '@/features/problems/hooks';
import type { UIProblem } from '@/features/problems/api';

type Props = {
  problem: UIProblem;
  onClose: () => void;
  /** Вызывается после успешного сохранения — для логирования в чат */
  onRenamed?: (oldName: string, newName: string) => void;
};

export default function EditProblemModal({ problem, onClose, onRenamed }: Props) {
  const [name, setName] = useState(problem.name);
  const [description, setDescription] = useState(
    Array.isArray(problem.description)
      ? problem.description.join('\n')
      : problem.description ?? ''
  );
  const { mutate, isPending, error } = useUpdateProblem();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const newName = name.trim();
    if (!newName) return;
    mutate(
      {
        id: problem.id,
        name: newName,
        description: description.trim() ? [description.trim()] : undefined,
      },
      {
        onSuccess: () => {
          if (newName !== problem.name) {
            onRenamed?.(problem.name, newName);
          }
          onClose();
        },
      }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-scale"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="t-surface-elevated w-full max-w-md rounded-2xl p-6 space-y-5 animate-fade-in-scale">
        <h2 className="t-title text-app">Редактировать проблему</h2>

        <form onSubmit={submit} className="space-y-4">
          <label className="grid gap-1.5">
            <span className="t-label">Название *</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Название проблемы"
              className="t-input"
              autoFocus
              required
            />
          </label>

          <label className="grid gap-1.5">
            <span className="t-label">Описание</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Подробное описание…"
              className="t-input resize-y"
            />
          </label>

          {error && <p className="text-sm text-red-400">Ошибка: {(error as Error).message}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Отмена</button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="btn-primary text-sm py-2 px-5 disabled:opacity-50"
            >
              {isPending ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
