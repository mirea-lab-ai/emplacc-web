'use client';

import { useEffect, useRef, useState } from 'react';
import { Member } from './types';

export default function AddMemberModal({
                                         open,
                                         onClose,
                                         onCreate,
                                       }: {
  open: boolean;
  onClose: () => void;
  onCreate: (m: Member) => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Developer');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setRole('Developer');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!name.trim()) return;
    onCreate({ id: uid(), name: name.trim(), role: role.trim() });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
        <div className="w-full max-w-md rounded-2xl bg-black">
      <div className=" rounded-2xl t-accent-grad/20 p-6 ring-1 ring-white/10">
        <h2 className="text-xl font-semibold mb-4">Добавить сотрудника</h2>

        <label className="grid gap-2 mb-3">
          <span className="text-slate-200">Имя</span>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="Имя Фамилия"
          />
        </label>

        <label className="grid gap-2 mb-4">
          <span className="text-slate-200">Роль</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="Роль в команде"
          />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-slate-300 hover:text-white">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="rounded-lg bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60"
          >
            Добавить
          </button>
        </div>
      </div>
        </div>
    </div>
  );
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
