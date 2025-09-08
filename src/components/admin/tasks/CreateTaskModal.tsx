'use client';

import { useEffect, useState } from 'react';
import type { Task } from './TaskGrid';

export default function CreateTaskModal({
                                          open,
                                          onClose,
                                          onCreate,
                                        }: {
  open: boolean;
  onClose: () => void;
  onCreate: (task: Task) => void;
}) {
  const [title, setTitle] = useState('');
  const [subs, setSubs] = useState<string[]>(['']);

  useEffect(() => {
    if (open) {
      setTitle('');
      setSubs(['']);
    }
  }, [open]);

  const addSub = () => setSubs((a) => [...a, '']);
  const removeSub = (i: number) =>
    setSubs((a) => a.filter((_, idx) => idx !== i));
  const setSub = (i: number, v: string) =>
    setSubs((a) => a.map((x, idx) => (idx === i ? v : x)));

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const subtasks = subs
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ id: uid(), title: s }));

    onCreate({ id: uid(), title: trimmed, subtasks });
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#111829] p-6 ring-1 ring-white/10">
        <h2 className="text-xl font-semibold mb-4">Создать задачу</h2>

        <label className="grid gap-2 mb-4">
          <span className="text-slate-200">Название задачи</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, Design System"
            className="h-12 w-full rounded-xl bg-[#141c2f] px-4 text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </label>

        <div className="mb-2 text-slate-200">Подзадачи (необязательно)</div>
        <div className="space-y-2">
          {subs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={s}
                onChange={(e) => setSub(i, e.target.value)}
                placeholder={`Подзадача ${i + 1}`}
                className="h-10 w-full rounded-xl bg-[#141c2f] px-3 text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                onClick={() => removeSub(i)}
                className="shrink-0 rounded-xl bg-[#ef4657] px-3 py-2 text-white hover:brightness-110"
                aria-label="Удалить подзадачу"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <button
            onClick={addSub}
            className="rounded-xl bg-[#2b3681] px-4 py-2 text-slate-200 hover:brightness-110"
          >
            + Добавить подзадачу
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-slate-300 hover:text-white"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-[#3452ff] px-5 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-60"
            disabled={!title.trim()}
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
