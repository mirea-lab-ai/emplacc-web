'use client';

import { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';

type ProjectInfo = { description: string; start?: string; deadline?: string };

export default function ProjectsSettingsPanel() {
  const [info, setInfo] = useState<ProjectInfo>({
    description: 'Emplacc — внутренняя система задач, отчётов и форумов.',
    start: new Date().toISOString().slice(0, 10),
    deadline: '',
  });

  useEffect(() => {
    const raw = localStorage.getItem('proj_settings');
    if (!raw) return;
    setInfo((prev) => ({ ...prev, ...safeParse<ProjectInfo>(raw, prev) }));
  }, []);

  const saveInfo = () => localStorage.setItem('proj_settings', JSON.stringify(info));

  return (
    <Panel className="p-6 t-surface">
      <h2 className="text-xl font-semibold mb-4">Настройки проекта</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="grid gap-2">
          <span className="text-slate-200">Описание проекта</span>
          <textarea
            rows={8}
            value={info.description}
            onChange={(e) => setInfo((p) => ({ ...p, description: e.target.value }))}
            className="rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 py-3 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="Опишите цели, контекст, ключевые требования…"
          />
        </label>
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-slate-200">Дата начала</span>
            <input
              type="date"
              value={info.start ?? ''}
              onChange={(e) => setInfo((p) => ({ ...p, start: e.target.value }))}
              className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-slate-200">Дедлайн</span>
            <input
              type="date"
              value={info.deadline ?? ''}
              onChange={(e) => setInfo((p) => ({ ...p, deadline: e.target.value }))}
              className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </label>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={saveInfo}
          className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black hover:brightness-110"
        >
          Сохранить изменения
        </button>
      </div>
    </Panel>
  );
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
