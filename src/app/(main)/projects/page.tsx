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
    <main className="min-h-screen bg-[#0f1422] text-white">
      <div className="mx-auto p-6 space-y-6">
        <Panel className="px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Мои проекты</h1>
            <span className="text-slate-400">Доска / Команды / Настройки</span>
          </div>
        </Panel>

        <div className="flex gap-6">
          {/* NAV */}
          <aside className="w-[240px] shrink-0 sticky top-24 self-start">
            <ProjectsNav tab={tab} onChange={setTab} />
          </aside>

          {/* CONTENT */}
          <section className="flex-1 min-w-0 space-y-6">
            {tab === 'board' && <ProjectsBoardPanel />}
            {tab === 'teams' && <ProjectsTeamsPanel />}
            {tab === 'settings' && <ProjectsSettingsPanel />}
          </section>
        </div>
      </div>
    </main>
  );
}
