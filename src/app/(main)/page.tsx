'use client';

import YourTasks from '@/components/main/YourTasks';
import HelpRequests from '@/components/main/HelpRequests';
import ForumUpdates from '@/components/main/ForumUpdates';
import ReportDownload from '@/components/main/ReportDownload';
import TodayPlan, { PlanItem } from '@/components/main/TodayPlan';
// демо-данные удалены: блок использует только API




const demoPlan: PlanItem[] = [
  { id: 'pl1', task: 'Emplacc', subtask: 'фронт', text:'доделать панель админа' },
];

export default function Home() {
  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[480px_minmax(0,1fr)] xl:items-start">
          <YourTasks />
          <div className="grid gap-6 sm:grid-cols-2 lg:min-h-[680px]">
            <HelpRequests />
            <ForumUpdates />
            <ReportDownload />
            <TodayPlan items={demoPlan} />
          </div>
        </div>
      </div>
    </main>
  );
}


