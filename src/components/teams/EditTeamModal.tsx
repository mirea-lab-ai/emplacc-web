'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { Team } from './types';
import { useUpdateTeam } from '@/features/teams/hooks';
import type { UpdateTeamRequest } from '@/features/teams/api';

type Props = {
  open: boolean;
  team: Team | null;
  onClose: () => void;
};

export default function EditTeamModal({ open, team, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const { mutate, isPending } = useUpdateTeam();

  useEffect(() => {
    if (!open || !team) return;
    setName(team.name);
    setDescription(team.description ?? '');
    setFormError(null);
  }, [open, team]);

  if (!open || !team) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setFormError('Название команды обязательно');
      return;
    }

    const payload: UpdateTeamRequest = {};

    if (trimmedName !== team.name) {
      payload.name = trimmedName;
    }

    const originalDescription = team.description ?? '';
    if (trimmedDescription !== originalDescription) {
      payload.description = trimmedDescription || undefined;
    }

    if (Object.keys(payload).length === 0) {
      setFormError('Изменений не обнаружено');
      return;
    }

    mutate(
      { teamId: team.id, payload },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          setFormError(error.message || 'Не удалось обновить команду');
        },
      }
    );
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl border-app t-surface-elevated p-6 text-app shadow-xl"
      >
        <h2 className="text-xl font-semibold">Редактирование команды</h2>
        <p className="mt-1 text-sm text-app-2">
          Обновите название и описание команды.
        </p>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-app-2">Название команды</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 rounded-xl bg-app-hover px-4 text-app ring-app ring-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              placeholder="Например, Product Team"
              disabled={isPending}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-app-2">Описание</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[96px] rounded-xl bg-app-hover px-4 py-3 text-app ring-app ring-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 resize-none"
              placeholder="Расскажите о задачах и целях команды"
              disabled={isPending}
            />
          </label>
        </div>

        {formError && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {formError}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-app-2 hover:text-app disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60"
          >
            {isPending ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
