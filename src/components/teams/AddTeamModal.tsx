'use client';

import { useEffect, useRef, useState } from 'react';
import type { Team } from './types';

export default function AddTeamModal({
                                       open,
                                       onClose,
                                       onCreate,
                                     }: {
  open: boolean;
  onClose: () => void;
  onCreate: (team: Team) => void;
}) {
  const [name, setName] = useState('');
  const [lead, setLead] = useState('Новый тимлид');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setLead('Новый тимлид');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!name.trim()) return;
    const team: Team = {
      id: uid(),
      name: name.trim(),
      lead: { id: uid(), name: lead.trim() || 'Тимлид' },
      members: [], // без направлений
    };
    onCreate(team);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl bg-emerald-950 p-6 ring-1 ring-white/10">
        <h2 className="text-xl font-semibold mb-4">Создать команду</h2>

        <label className="grid gap-2 mb-3">
          <span className="text-slate-200">Название команды</span>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="Например, Emplacc"
          />
        </label>

        <label className="grid gap-2 mb-4">
          <span className="text-slate-200">Тимлид</span>
          <input
            value={lead}
            onChange={(e) => setLead(e.target.value)}
            className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="Имя тимлида"
          />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-slate-300 hover:text-white">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
