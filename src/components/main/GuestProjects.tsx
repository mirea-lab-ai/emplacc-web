'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Panel from '@/components/ui/Panel';
import { useIsClient } from '@/hooks/useIsClient';
import { getUserId, isAuthed } from '@/lib/auth';
import { fetchUserProjects, type UIProject } from '@/features/projects/api';

const STATUS_META: Record<string, { emoji: string; label: string }> = {
  active: { emoji: '🟢', label: 'Активен' },
  frozen: { emoji: '🧊', label: 'Заморожен' },
  support: { emoji: '🛠', label: 'Поддержка' },
};

const RU_TO_EN: Record<string, string> = {
  'ё': '`',
  'й': 'q',
  'ц': 'w',
  'у': 'e',
  'к': 'r',
  'е': 't',
  'н': 'y',
  'г': 'u',
  'ш': 'i',
  'щ': 'o',
  'з': 'p',
  'х': '[',
  'ъ': ']',
  'ф': 'a',
  'ы': 's',
  'в': 'd',
  'а': 'f',
  'п': 'g',
  'р': 'h',
  'о': 'j',
  'л': 'k',
  'д': 'l',
  'ж': ';',
  'э': '\'',
  'я': 'z',
  'ч': 'x',
  'с': 'c',
  'м': 'v',
  'и': 'b',
  'т': 'n',
  'ь': 'm',
  'б': ',',
  'ю': '.',
};

const EN_TO_RU: Record<string, string> = Object.fromEntries(
  Object.entries(RU_TO_EN).map(([ru, en]) => [en, ru]),
);

function swapLayout(value: string, map: Record<string, string>) {
  return value
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      const mapped = map[lower];
      if (!mapped) return char;
      return char === lower ? mapped : mapped.toUpperCase();
    })
    .join('');
}

function buildVariants(source: string) {
  const trimmed = source.trim().toLowerCase();
  if (!trimmed) return [];
  const noSpaces = trimmed.replace(/\s+/g, '');
  const asRu = swapLayout(trimmed, EN_TO_RU);
  const asRuNoSpaces = asRu.replace(/\s+/g, '');
  const asEn = swapLayout(trimmed, RU_TO_EN);
  const asEnNoSpaces = asEn.replace(/\s+/g, '');
  return Array.from(new Set([trimmed, noSpaces, asRu, asRuNoSpaces, asEn, asEnNoSpaces].filter(Boolean)));
}

export default function GuestProjects() {
  const router = useRouter();
  const isClient = useIsClient();
  const userId = isClient ? getUserId() : null;
  const hasCreds = isClient && isAuthed() && !!userId;

  const [projects, setProjects] = useState<UIProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!hasCreds || !userId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchUserProjects(userId)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [hasCreds, userId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const variants = buildVariants(search);
    if (variants.length === 0) return projects;

    return projects.filter((project) => {
      const nameVariants = buildVariants(project.name ?? '');
      if (nameVariants.length === 0) return false;
      return variants.some((candidate) =>
        nameVariants.some((value) => value.includes(candidate) || candidate.includes(value)),
      );
    });
  }, [projects, search]);

  if (!hasCreds) {
    return (
      <Panel className="t-surface p-6 text-slate-300">
        Авторизуйтесь, чтобы увидеть проекты.
      </Panel>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Проекты</h1>
        <p className="text-sm text-slate-300">
          Просматривайте доступные проекты и переходите к нужному.
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Поиск по названию проекта"
        className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />

      <Panel className="t-surface p-0">
        {loading ? (
          <div className="p-6 text-slate-400">Загружаем проекты…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-slate-400">Проекты не найдены.</div>
        ) : (
          <ul className="divide-y divide-white/10">
            {filtered.map((project) => {
              const meta = project.status ? STATUS_META[project.status.toLowerCase().trim()] : null;

              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="flex w-full flex-col gap-2 rounded-xl px-4 py-4 text-left transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-lg font-semibold text-white">
                        {project.name ?? 'Без названия'}
                      </span>
                      {meta && (
                        <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                          <span className="mr-1">{meta.emoji}</span>
                          {meta.label}
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="line-clamp-2 text-sm text-slate-300">{project.description}</p>
                    )}
                    <span className="text-xs text-emerald-200">Перейти к проекту →</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
