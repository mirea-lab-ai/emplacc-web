'use client';

import YourTasks from '@/components/main/YourTasks';
import HelpRequests from '@/components/main/HelpRequests';
import ForumUpdates from '@/components/main/ForumUpdates';
import ReportDownload from '@/components/main/ReportDownload';
import TodayPlan, { PlanItem } from '@/components/main/TodayPlan';
import { getUserId, isAuthed } from '@/lib/auth';
import { useUserRole } from '@/features/roles/hooks';

const demoPlan: PlanItem[] = [
  { id: 'pl1', task: 'Emplacc', subtask: 'фронт', text: 'доделать панель админа' },
];

export default function Home() {
  const userId = typeof window !== 'undefined' ? getUserId() : null;
  const hasCreds = isAuthed();
  const { data: userRole } = useUserRole(userId, hasCreds);
  const normalizedRole = userRole?.role?.name?.trim().toLowerCase();
  const isGuest = normalizedRole === 'guest';

  if (isGuest) {
    return (
      <main className="flex h-full min-h-0 flex-col text-white">
        <div className="flex-1 overflow-auto pb-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4">
            <ForumUpdates />
            <ReportDownload />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden text-white">
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-6">
        <div className="flex w-full flex-col gap-6 px-4 sm:px-6 lg:px-10">
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
