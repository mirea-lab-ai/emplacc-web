'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Panel from '@/components/ui/Panel';
import ProjectsBoardPanel from '@/components/projects/ProjectsBoardPanel';
import ProjectsTeamsPanel from '@/components/projects/ProjectsTeamsPanel';
import ProjectsSettingsPanel from '@/components/projects/ProjectsSettingsPanel';
import ProjectsBoardList from '@/components/projects/ProjectsBoardList';
import CreateBoardModal from '@/components/projects/CreateBoardModal';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { fetchProjectById, type UIProject } from '@/features/projects/api';

type ProjectSection = 'board' | 'teams' | 'settings';

const STATUS_META: Record<string, { emoji: string; label: string }> = {
  active: { emoji: '🚀', label: 'Активный' },
  frozen: { emoji: '❄️', label: 'Заморожен' },
  support: { emoji: '🛟', label: 'Поддержка' },
};

type Props = {
  params: Promise<{ projectId: string }>;
};

export default function ProjectDetailPage({ params }: Props) {
  const router = useRouter();
  const { projectId } = use(params);
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const [project, setProject] = useState<UIProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<ProjectSection>('board');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!hasCreds) {
      setProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchProjectById(projectId)
      .then((p) => setProject(p))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [hasCreds, projectId]);

  useEffect(() => {
    setSection('board');
  }, [projectId]);

  useEffect(() => {
    const boardIdParam = searchParams.get('boardId');
    setSelectedBoardId(boardIdParam);
  }, [searchParams]);

  const handleSelectBoard = (boardId: string | null) => {
    setSelectedBoardId(boardId);
    const query = boardId ? `?boardId=${encodeURIComponent(boardId)}` : '';
    router.replace(`/projects/${projectId}${query}`);
  };

  if (!hasCreds) {
    return (
      <main className="flex h-full min-h-0 flex-col text-white">
        <div className="flex-1 overflow-auto">
          <div className="flex w-full flex-col gap-4">
            <button
              type="button"
              onClick={() => router.push('/projects')}
              className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-100"
            >
              ← Назад к списку проектов
            </button>
            <Panel className="p-6 t-surface text-slate-300">
              Авторизуйтесь, чтобы просматривать проекты.
            </Panel>
          </div>
        </div>
      </main>
    );
  }

  const statusMeta = project?.status
    ? STATUS_META[project.status.toLowerCase().trim()]
    : undefined;

  return (
    <main className="flex h-full min-h-0 flex-col bg-transparent text-white">
      <div className="flex h-full min-h-0 w-full flex-col gap-4">
        <div className="flex-none">
          <button
            type="button"
            onClick={() => router.push('/projects')}
            className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-100 transition"
          >
            ← Назад к списку проектов
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <Panel className="p-6 t-surface text-slate-300">Загрузка проекта…</Panel>
          ) : !project ? (
            <Panel className="p-6 t-surface text-slate-300">
              Проект не найден или доступ к нему отсутствует.
            </Panel>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden lg:flex-row lg:gap-4">
              <aside className="flex w-full flex-none flex-col gap-4 overflow-auto lg:w-[260px]">
                <Panel className="p-4 t-surface space-y-3">
                  <h1 className="text-2xl font-semibold leading-tight break-words">
                    {project.name ?? 'Без названия'}
                  </h1>
                {statusMeta && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                    <span>{statusMeta.emoji}</span>
                    <span>{statusMeta.label}</span>
                  </div>
                )}
                {project.description && (
                  <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                    {project.description}
                  </p>
                )}
              </Panel>

                <Panel className="p-3 t-surface">
                  <DetailNavButton
                    label="Доска"
                    active={section === 'board'}
                    onClick={() => setSection('board')}
                  />
                <DetailNavButton
                  label="Команды"
                  active={section === 'teams'}
                  onClick={() => setSection('teams')}
                />
                <DetailNavButton
                  label="Настройки"
                  active={section === 'settings'}
                  onClick={() => setSection('settings')}
                />
                </Panel>

                {section === 'board' && (
                  <ProjectsBoardList
                    projectId={projectId}
                    activeBoardId={selectedBoardId}
                    onSelect={(boardId) => handleSelectBoard(boardId)}
                    onCreateBoard={() => setShowCreateBoardModal(true)}
                  />
                )}
              </aside>

              <section className="flex-1 min-h-0 min-w-0 space-y-4 overflow-hidden">
                {section === 'board' && (
                  <ProjectsBoardPanel
                    projectId={projectId}
                    selectedBoardId={selectedBoardId ?? undefined}
                    onSelectBoard={handleSelectBoard}
                  />
                )}
                {section === 'teams' && (
                  <ProjectsTeamsPanel projectId={projectId} />
                )}
                {section === 'settings' && (
                  <ProjectsSettingsPanel
                    project={project}
                    onProjectUpdate={(updated) => setProject(updated)}
                    onProjectDelete={() => router.push('/projects')}
                  />
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {showCreateBoardModal && project && (
        <CreateBoardModal
          projectId={project.id}
          onClose={() => setShowCreateBoardModal(false)}
        />
      )}
    </main>
  );
}

function DetailNavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left rounded-xl px-4 py-2 font-semibold transition-colors',
        active
          ? 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black'
          : 'text-slate-300 hover:text-white',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
