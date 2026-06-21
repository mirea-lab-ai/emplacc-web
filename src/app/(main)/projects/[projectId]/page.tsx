'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProjectsBoardPanel from '@/components/projects/ProjectsBoardPanel';
import ProjectsTeamsPanel from '@/components/projects/ProjectsTeamsPanel';
import ProjectsSettingsPanel from '@/components/projects/ProjectsSettingsPanel';
import ProjectsBoardList from '@/components/projects/ProjectsBoardList';
import CreateBoardModal from '@/components/projects/CreateBoardModal';
import { ProjectGitPanel } from '@/components/git/GitPanels';
import { useIsClient } from '@/hooks/useIsClient';
import { getUserId, isAuthed } from '@/lib/auth';
import { fetchProjectById, type UIProject } from '@/features/projects/api';
import { useUserRole } from '@/features/roles/hooks';

type ProjectSection = 'board' | 'teams' | 'git' | 'settings';

const STATUS_META: Record<string, { label: string; dot: string }> = {
  active:  { label: 'Активный',   dot: 'bg-emerald-400' },
  frozen:  { label: 'Заморожен',  dot: 'bg-blue-400' },
  support: { label: 'Поддержка',  dot: 'bg-amber-400' },
};

const NAV_ITEMS: { key: ProjectSection; label: string; icon: string }[] = [
  { key: 'board',    label: 'Доска',     icon: '📋' },
  { key: 'teams',    label: 'Команды',   icon: '👥' },
  { key: 'git',      label: 'Репозитории', icon: '🌿' },
  { key: 'settings', label: 'Настройки', icon: '⚙️' },
];

function ProjectIcon({ name, size = 48 }: { name: string; size?: number }) {
  const char = (name?.[0] ?? '?').toUpperCase();
  const hue = Array.from(name ?? '').reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div className="rounded-2xl flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4,
               background: `linear-gradient(135deg, hsl(${hue},60%,30%), hsl(${(hue+40)%360},50%,40%))` }}>
      {char}
    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const router = useRouter();
  const { projectId } = use(params);
  const isClient = useIsClient();
  const userId = isClient ? getUserId() : null;
  const hasCreds = isClient && isAuthed();
  const { data: userRole } = useUserRole(userId, hasCreds);
  const normalizedRole = userRole?.role?.name?.trim().toLowerCase();
  const isGuest = normalizedRole === 'guest';

  const [project, setProject] = useState<UIProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<ProjectSection>('board');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!hasCreds) { setProject(null); setLoading(false); return; }
    setLoading(true);
    fetchProjectById(projectId).then(setProject).catch(() => setProject(null)).finally(() => setLoading(false));
  }, [hasCreds, projectId]);

  useEffect(() => { setSection('board'); }, [projectId]);
  useEffect(() => { setSelectedBoardId(searchParams.get('boardId')); }, [searchParams]);
  useEffect(() => { if (!isGuest) return; setSection('board'); setShowCreateBoardModal(false); }, [isGuest]);

  const handleSelectBoard = (boardId: string | null) => {
    setSelectedBoardId(boardId);
    router.replace(`/projects/${projectId}${boardId ? `?boardId=${encodeURIComponent(boardId)}` : ''}`);
  };

  if (!hasCreds) return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.push('/projects')} className="text-sm text-emerald-300 hover:text-app transition-colors self-start">← Проекты</button>
      <div className="t-surface rounded-2xl p-6 text-app-2">Авторизуйтесь для просмотра.</div>
    </div>
  );

  const statusMeta = project?.status ? STATUS_META[project.status.toLowerCase().trim()] ?? STATUS_META.active : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Back button */}
      <button onClick={() => router.push('/projects')}
        className="flex items-center gap-1.5 text-sm text-app-2 hover:text-emerald-300 transition-colors self-start shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
        Проекты
      </button>

      {loading ? (
        <div className="flex gap-4 flex-col lg:flex-row flex-1 min-h-0">
          <div className="w-full lg:w-64 space-y-3">
            <div className="t-surface rounded-2xl p-5 space-y-3"><div className="skeleton h-12 w-12 rounded-2xl"/><div className="skeleton h-5 w-40 rounded"/><div className="skeleton h-3 w-24 rounded"/></div>
          </div>
          <div className="flex-1 t-surface rounded-2xl"/>
        </div>
      ) : !project ? (
        <div className="t-surface rounded-2xl p-8 text-center text-app-2">Проект не найден</div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-4 overflow-hidden">

          {/* Sidebar */}
          <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-3 overflow-y-auto">

            {/* Project info card */}
            <div className="t-surface rounded-2xl p-5 space-y-3 ring-1 ring-app">
              <ProjectIcon name={project.name} />
              <div>
                <h1 className="font-semibold text-app text-lg leading-tight break-words">{project.name}</h1>
                {statusMeta && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`}/>
                    <span className="text-xs text-app-2">{statusMeta.label}</span>
                  </div>
                )}
              </div>
              {project.description && (
                <p className="text-xs text-app-3 leading-relaxed line-clamp-4">{project.description}</p>
              )}
            </div>

            {/* Nav */}
            <div className="t-surface rounded-2xl p-2 ring-1 ring-app space-y-1">
              {NAV_ITEMS.filter(n => !isGuest || n.key === 'board').map(n => (
                <button key={n.key} onClick={() => setSection(n.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    section === n.key
                      ? 'bg-gradient-to-r from-emerald-500/20 to-lime-500/10 text-app ring-1 ring-emerald-500/30'
                      : 'text-app-2 hover:text-app hover:bg-app-hover'
                  }`}>
                  <span className="text-base">{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </div>

            {/* Board list (only when board section) */}
            {section === 'board' && (
              <ProjectsBoardList
                projectId={projectId}
                activeBoardId={selectedBoardId}
                onSelect={handleSelectBoard}
                onCreateBoard={isGuest ? undefined : () => setShowCreateBoardModal(true)}
              />
            )}
          </aside>

          {/* Main content */}
          <section className="flex-1 min-h-0 min-w-0 overflow-hidden">
            {section === 'board' && (
              <ProjectsBoardPanel
                projectId={projectId}
                selectedBoardId={selectedBoardId ?? undefined}
                onSelectBoard={handleSelectBoard}
                readOnly={isGuest}
              />
            )}
            {!isGuest && section === 'teams' && <ProjectsTeamsPanel projectId={projectId} />}
            {!isGuest && section === 'git' && (
              <div className="h-full overflow-y-auto pr-1">
                <ProjectGitPanel projectId={projectId} readOnly={isGuest} />
              </div>
            )}
            {!isGuest && section === 'settings' && (
              <ProjectsSettingsPanel
                project={project}
                onProjectUpdate={setProject}
                onProjectDelete={() => router.push('/projects')}
              />
            )}
          </section>
        </div>
      )}

      {!isGuest && showCreateBoardModal && project && (
        <CreateBoardModal projectId={project.id} onClose={() => setShowCreateBoardModal(false)} />
      )}
    </div>
  );
}
