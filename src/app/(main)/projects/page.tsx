'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProjectsNav, { Tab } from '@/components/projects/ProjectsNav';
import ProjectsBoardPanel from '@/components/projects/ProjectsBoardPanel';
import ProjectsTeamsPanel from '@/components/projects/ProjectsTeamsPanel';
import ProjectsSettingsPanel from '@/components/projects/ProjectsSettingsPanel';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import CreateBoardModal from '@/components/projects/CreateBoardModal';
import type { UIProject } from '@/features/projects/api';
import Panel from '@/components/ui/Panel';
import { useEffect } from 'react';
import { getUserId, isAuthed } from '@/lib/auth';
import { fetchUserProjects } from '@/features/projects/api';
import ProjectsBoardList from '@/components/projects/ProjectsBoardList';

export default function ProjectsPage() {
  const [tab, setTab] = useState<Tab>('my');
  const [selected, setSelected] = useState<UIProject | null>(null);
  const [projects, setProjects] = useState<UIProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [appliedSearchKey, setAppliedSearchKey] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const loadProjects = () => {
    const uid = getUserId();
    if (!uid || !isAuthed()) return;
    setLoading(true);
    fetchUserProjects(uid)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selected) {
      setSelectedBoardId(null);
    }
  }, [selected]);

  useEffect(() => {
    if (!projects.length) return;

    const projectIdParam = searchParams.get('projectId') ?? null;
    const boardIdParam = searchParams.get('boardId') ?? null;
    const tabParam = searchParams.get('tab');

    if (!projectIdParam) return;

    const key = `${projectIdParam}|${boardIdParam ?? ''}|${tabParam ?? ''}`;
    if (appliedSearchKey === key) return;

    const targetProject = projects.find((project) => project.id === projectIdParam);
    if (!targetProject) return;

    setSelected(targetProject);
    setSelectedBoardId(boardIdParam);

    if (tabParam === 'board' || tabParam === 'teams' || tabParam === 'settings' || tabParam === 'my') {
      setTab(tabParam as Tab);
    } else {
      setTab('board');
    }

    setAppliedSearchKey(key);
  }, [projects, searchParams, appliedSearchKey]);

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto p-6 space-y-6">

        <div className="flex gap-6">
            {/* NAV */}
            <aside className="sticky top-6 h-[calc(100dvh-3rem)] w-[240px] shrink-0 ">
                {/* свой внутренний скролл, чтобы сайдбар не «ездил» вместе со страницей */}
                <div className="h-full  overflow-auto custom-scroll space-y-4">
                    <ProjectsNav tab={tab} onChange={setTab} disabled={!selected} />

                    {tab === 'board' && selected && (
                      <ProjectsBoardList
                        projectId={selected.id}
                        activeBoardId={selectedBoardId}
                        onSelect={setSelectedBoardId}
                        onCreateBoard={() => setShowCreateBoardModal(true)}
                      />
                    )}
                </div>
            </aside>


            {/* CONTENT */}
          <section className="flex-1 min-w-0 space-y-6 ">
            {tab === 'my' && (
              <Panel className="p-4 t-surface">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Мои проекты</h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500 transition-colors"
                  >
                    + Создать проект
                  </button>
                </div>
                {loading ? (
                  <div className="text-slate-400">Загрузка…</div>
                ) : projects.length ? (
                  <ul className="space-y-2">
                    {projects.map((p)=> (
                      <li key={p.id}>
                        <button
                          onClick={()=>{
                            setSelected(p);
                            setSelectedBoardId(null);
                            setTab('board');
                          }}
                          className={[
                            'w-full text-left rounded-xl px-4 py-2 transition-colors',
                            selected?.id === p.id
                              ? 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black font-semibold'
                              : 'text-slate-300 hover:text-white',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between">
                            <span>{p.name}</span>
                            {p.status && p.status.trim() !== '' && (
                              <span className={[
                                'text-xs px-2 py-1 rounded-full',
                                selected?.id === p.id 
                                  ? 'bg-black/20 text-black' 
                                  : 'bg-white/10 text-slate-400'
                              ].join(' ')}>
                                {p.status}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-slate-400">Проектов нет</div>
                )}
              </Panel>
            )}
            {tab === 'board' && selected && (
              <ProjectsBoardPanel
                projectId={selected.id}
                selectedBoardId={selectedBoardId ?? undefined}
                onSelectBoard={setSelectedBoardId}
              />
            )}
            {tab === 'teams' && selected && <ProjectsTeamsPanel projectId={selected.id} />}
            {tab === 'settings' && selected && (
              <ProjectsSettingsPanel 
                project={selected} 
                onProjectUpdate={(updatedProject) => {
                  // Обновляем выбранный проект
                  setSelected(updatedProject);
                  // Обновляем список проектов
                  setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
                }}
                onProjectDelete={(projectId) => {
                  // Удаляем проект из списка
                  setProjects(prev => prev.filter(p => p.id !== projectId));
                  // Если удаленный проект был выбран, сбрасываем выбор
                  if (selected?.id === projectId) {
                    setSelected(null);
                    setSelectedBoardId(null);
                    setTab('my');
                  }
                }}
              />
            )}
          </section>
        </div>
      </div>

      {showCreateModal && (
        <CreateProjectModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => {
            setShowCreateModal(false);
            loadProjects();
          }}
        />
      )}

      {showCreateBoardModal && selected && (
        <CreateBoardModal
          projectId={selected.id}
          onClose={() => setShowCreateBoardModal(false)}
        />
      )}
    </main>
  );
}
