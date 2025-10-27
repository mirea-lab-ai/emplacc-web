'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Panel from '@/components/ui/Panel';
import { useRouter } from 'next/navigation';
import { useIsClient } from '@/hooks/useIsClient';
import { getUserId, isAuthed } from '@/lib/auth';
import { fetchUserProjects, type UIProject } from '@/features/projects/api';
import CreateProjectModal from '@/components/projects/CreateProjectModal';

const STATUS_META: Record<string, { emoji: string; label: string }> = {
  active: { emoji: '🚀', label: 'Активный' },
  frozen: { emoji: '❄️', label: 'Заморожен' },
  support: { emoji: '🛟', label: 'Поддержка' },
};

const RU_TO_EN: Record<string, string> = {
  'ё': '`', 'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']',
  'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'э': '\'',
  'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.',
};

const EN_TO_RU: Record<string, string> = Object.fromEntries(
  Object.entries(RU_TO_EN).map(([ru, en]) => [en, ru]),
);

function swapLayout(value: string, map: Record<string, string>) {
  return value.split('').map((char) => {
    const lower = char.toLowerCase();
    const mapped = map[lower];
    if (!mapped) return char;
    return char === lower ? mapped : mapped.toUpperCase();
  }).join('');
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

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsPageFallback />}>
      <ProjectsListView />
    </Suspense>
  );
}

function ProjectsListView() {
  const router = useRouter();
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed() && !!getUserId();

  const [projects, setProjects] = useState<UIProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!hasCreds) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const uid = getUserId();
    if (!uid) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchUserProjects(uid)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [hasCreds]);

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const variants = buildVariants(search);
    if (variants.length === 0) return projects;

    return projects.filter((project) => {
      const nameVariants = buildVariants(project.name ?? '');
      if (nameVariants.length === 0) return false;
      return variants.some((candidate) =>
        nameVariants.some((value) => value.includes(candidate) || candidate.includes(value))
      );
    });
  }, [projects, search]);

  if (!hasCreds) {
    return (
      <main className="min-h-screen text-white">
        <div className="mx-auto max-w-4xl p-6">
          <Panel className="p-6 t-surface text-slate-300">
            Авторизуйтесь, чтобы просматривать проекты.
          </Panel>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Проекты</h1>
            <p className="text-sm text-slate-300">Выберите проект, чтобы открыть детальную страницу и управлять задачами.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2 text-sm font-semibold text-black hover:brightness-110"
          >
            + Создать проект
          </button>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию проекта"
          className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />

        <Panel className="p-0 t-surface">
          {loading ? (
            <div className="p-6 text-slate-400">Загрузка проектов…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-slate-400">Проекты не найдены.</div>
          ) : (
            <ul className="divide-y divide-white/10">
              {filtered.map((project) => {
                const meta = project.status
                  ? STATUS_META[project.status.toLowerCase().trim()]
                  : null;

                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="flex w-full flex-col gap-2 rounded-xl px-4 py-4 text-left transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-lg font-semibold text-white">{project.name ?? 'Без названия'}</span>
                        {meta && (
                          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                            {meta.emoji} {meta.label}
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="line-clamp-2 text-sm text-slate-300">{project.description}</p>
                      )}
                      <span className="text-xs text-emerald-200">Открыть страницу проекта →</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            const uid = getUserId();
            if (!uid) return;
            setLoading(true);
            fetchUserProjects(uid)
              .then(setProjects)
              .catch(() => setProjects([]))
              .finally(() => setLoading(false));
          }}
        />
      )}
    </main>
  );
}

function ProjectsPageFallback() {
  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-4xl p-6">
        <div className="text-slate-400">Загрузка…</div>
      </div>
    </main>
  );
}
