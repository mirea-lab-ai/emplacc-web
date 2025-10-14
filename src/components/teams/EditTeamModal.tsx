'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { Team } from './types';
import { useUpdateTeam } from '@/features/teams/hooks';
import type { UpdateTeamRequest } from '@/features/teams/api';

const EMPTY_LEAD_ID = '';

type Props = {
  open: boolean;
  team: Team | null;
  onClose: () => void;
};

export default function EditTeamModal({ open, team, onClose }: Props) {
  const [name, setName] = useState('');
  const [leadId, setLeadId] = useState<string>(EMPTY_LEAD_ID);
  const [formError, setFormError] = useState<string | null>(null);
  const { mutate, isPending } = useUpdateTeam();

  const currentLeadId = useMemo(() => {
    if (!team) return EMPTY_LEAD_ID;
    return team.lead?.id && team.lead.id !== 'no-lead' ? team.lead.id : EMPTY_LEAD_ID;
  }, [team]);

  const membersOptions = useMemo(() => {
    if (!team) return [];
    const list = [...team.members];

    if (
      currentLeadId &&
      !list.some((member) => member.id === currentLeadId) &&
      team.lead &&
      team.lead.id !== 'no-lead'
    ) {
      list.unshift({
        id: team.lead.id,
        name: team.lead.name,
        role: 'Тимлид',
      });
    }

    return list;
  }, [team, currentLeadId]);

  useEffect(() => {
    if (!open || !team) return;
    setName(team.name);
    setLeadId(currentLeadId);
    setFormError(null);
  }, [open, team, currentLeadId]);

  if (!open || !team) {
    return null;
  }

  const hasMembers = membersOptions.length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError('Название команды обязательно');
      return;
    }

    const payload: UpdateTeamRequest = {};

    if (trimmedName !== team.name) {
      payload.name = trimmedName;
    }

    if (leadId !== currentLeadId) {
      if (leadId) {
        const numericLead = Number(leadId);
        if (Number.isNaN(numericLead)) {
          setFormError('Не удалось определить выбранного тимлида');
          return;
        }
        payload.lead_user_id = numericLead;
      } else {
        payload.lead_user_id = null;
      }
    }

    if (!payload.name && payload.lead_user_id === undefined) {
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
        className="relative rounded-2xl border border-white/20 bg-black p-6 text-white shadow-xl"
      >
        <h2 className="text-xl font-semibold">Редактирование команды</h2>
        <p className="mt-1 text-sm text-slate-400">
          Обновите название и при необходимости выберите нового тимлида.
        </p>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-slate-200">Название команды</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 rounded-xl bg-white/10 px-4 text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              placeholder="Например, Product Team"
              disabled={isPending}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-slate-200">Тимлид</span>
            <select
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              disabled={!hasMembers || isPending}
              className="h-11 rounded-xl bg-white/10 px-4 text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:opacity-50"
            >
              <option value={EMPTY_LEAD_ID}>Не назначен</option>
              {membersOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                  {member.role ? ` - ${member.role}` : ''}
                </option>
              ))}
            </select>
            {!hasMembers && (
              <span className="text-sm text-slate-400">
                Чтобы назначить тимлида, добавьте участников в команду.
              </span>
            )}
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
            className="rounded-xl px-4 py-2 text-slate-300 hover:text-white disabled:opacity-50"
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
