'use client';

import YourTasks from '@/components/main/YourTasks';
import HelpRequests from '@/components/main/HelpRequests';
import ForumUpdates from '@/components/main/ForumUpdates';
import ReportDownload from '@/components/main/ReportDownload';
import TodayPlan, { PlanItem } from '@/components/main/TodayPlan';
// демо-данные удалены: блок использует только API




const demoPlan: PlanItem[] = [
  { id: 'pl1', task: 'Emplacc', subtask: 'фронт', text: 'доделать панель админа' },
];

export default function Home() {
  return (
    <main className="flex h-full min-h-0 flex-col text-white">
      <div className="flex-1 overflow-auto pb-6">
        <div className="flex w-full flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(420px,480px)_minmax(0,1fr)]">
            <div className="min-h-0">
              <YourTasks />
            </div>
            <div className="grid min-h-0 gap-6 sm:grid-cols-2">
              <HelpRequests />
              <ForumUpdates />
              <ReportDownload />
              <TodayPlan items={demoPlan} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

