'use client';

import { useState } from 'react';
import ProjectsNav, { Tab } from '@/components/projects/ProjectsNav';
import ProjectsBoardPanel from '@/components/projects/ProjectsBoardPanel';
import ProjectsTeamsPanel from '@/components/projects/ProjectsTeamsPanel';
import ProjectsSettingsPanel from '@/components/projects/ProjectsSettingsPanel';
import type { UIProject } from '@/features/projects/api';
import Panel from '@/components/ui/Panel';
import { useEffect } from 'react';
import { getUserId, isAuthed } from '@/lib/auth';
import { fetchUserProjects } from '@/features/projects/api';

export default function ProjectsPage() {
  const [tab, setTab] = useState<Tab>('my');
  const [selected, setSelected] = useState<UIProject | null>(null);
  const [projects, setProjects] = useState<UIProject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const uid = getUserId();
    if (!uid || !isAuthed()) return;
    setLoading(true);
    fetchUserProjects(uid)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto p-6 space-y-6">

        <div className="flex gap-6">
            {/* NAV */}
            <aside className="sticky top-6 h-[calc(100dvh-3rem)] w-[240px] shrink-0 ">
                {/* свой внутренний скролл, чтобы сайдбар не «ездил» вместе со страницей */}
                <div className="h-full  overflow-auto custom-scroll">
                    <ProjectsNav tab={tab} onChange={setTab} disabled={!selected} />
                </div>
            </aside>


            {/* CONTENT */}
          <section className="flex-1 min-w-0 space-y-6 ">
            {tab === 'my' && (
              <Panel className="p-4 t-surface">
                <h2 className="text-lg font-semibold mb-3">Мои проекты</h2>
                {loading ? (
                  <div className="text-slate-400">Загрузка…</div>
                ) : projects.length ? (
                  <ul className="space-y-2">
                    {projects.map((p)=> (
                      <li key={p.id}>
                        <button
                          onClick={()=>{ setSelected(p); setTab('board'); }}
                          className={[
                            'w-full text-left rounded-xl px-4 py-2 transition-colors',
                            selected?.id === p.id
                              ? 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black font-semibold'
                              : 'text-slate-300 hover:text-white',
                          ].join(' ')}
                        >
                          {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-slate-400">Проектов нет</div>
                )}
              </Panel>
            )}
            {tab === 'board' && <ProjectsBoardPanel />}
            {tab === 'teams' && <ProjectsTeamsPanel />}
            {tab === 'settings' && <ProjectsSettingsPanel />}
          </section>
        </div>
      </div>
    </main>
  );
}
