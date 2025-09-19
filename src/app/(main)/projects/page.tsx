'use client';

import { useState } from 'react';
import Panel from '@/components/ui/Panel';
import ProjectsNav, { Tab } from '@/components/projects/ProjectsNav';
import ProjectsBoardPanel from '@/components/projects/ProjectsBoardPanel';
import ProjectsTeamsPanel from '@/components/projects/ProjectsTeamsPanel';
import ProjectsSettingsPanel from '@/components/projects/ProjectsSettingsPanel';

export default function ProjectsPage() {
  const [tab, setTab] = useState<Tab>('board');

  return (
    <main className="min-h-screen bg-emerald-950 text-white">
      <div className="mx-auto p-6 space-y-6">

        <div className="flex gap-6">
            {/* NAV */}
            <aside className="sticky top-6 h-[calc(100dvh-3rem)] w-[240px] shrink-0 ">
                {/* свой внутренний скролл, чтобы сайдбар не «ездил» вместе со страницей */}
                <div className="h-full  overflow-auto custom-scroll">
                    <ProjectsNav tab={tab} onChange={setTab} />
                </div>
            </aside>


            {/* CONTENT */}
          <section className="flex-1 min-w-0 space-y-6 ">
            {tab === 'board' && <ProjectsBoardPanel />}
            {tab === 'teams' && <ProjectsTeamsPanel />}
            {tab === 'settings' && <ProjectsSettingsPanel />}
          </section>
        </div>
      </div>
    </main>
  );
}
