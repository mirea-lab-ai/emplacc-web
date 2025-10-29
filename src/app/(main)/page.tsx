'use client';

import YourTasks from '@/components/main/YourTasks';
import HelpRequests from '@/components/main/HelpRequests';
import ForumUpdates from '@/components/main/ForumUpdates';
import ReportDownload from '@/components/main/ReportDownload';
import TodayPlan, { PlanItem } from '@/components/main/TodayPlan';
import { useUserRole } from '@/features/roles/hooks';

const demoPlan: PlanItem[] = [
  { id: 'pl1', task: 'Emplacc', subtask: 'Demo', text: 'Today roadmap' },
];

export default function Home() {
  const { data: roleName } = useUserRole();
  const isGuest = (roleName ?? '').trim().toLowerCase() === 'guest';

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto p-6 space-y-6">
        {isGuest ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <ForumUpdates />
            <ReportDownload />
          </div>
        ) : (
          <div className="grid grid-cols-[480px_1fr] gap-6">
            <YourTasks />
            <div className="grid grid-cols-2 grid-rows-[1fr_1fr] gap-6 min-h-[680px]">
              <HelpRequests />
              <ForumUpdates />
              <ReportDownload />
              <TodayPlan items={demoPlan} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

