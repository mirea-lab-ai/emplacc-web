'use client';

import YourTasks from '@/components/main/YourTasks';
import HelpRequests from '@/components/main/HelpRequests';
import ForumUpdates from '@/components/main/ForumUpdates';
import ReportDownload from '@/components/main/ReportDownload';
import TodayPlan, { PlanItem } from '@/components/main/TodayPlan';
import { getUserId, isAuthed } from '@/lib/auth';
import { useUserRole } from '@/features/roles/hooks';
// демо-данные удалены: блок использует только API




const demoPlan: PlanItem[] = [
  { id: 'pl1', task: 'Emplacc', subtask: 'фронт', text: 'доделать панель админа' },
];

export default function Home() {
  const userId = typeof window !== 'undefined' ? getUserId() : null;
  const hasCreds = isAuthed();
  const { data: userRole } = useUserRole(userId, hasCreds);
  const normalizedRole = userRole?.role?.name?.trim().toLowerCase();
  const showFullDashboard = normalizedRole !== 'guest';
  const layoutClasses = [
    'grid gap-6',
    showFullDashboard
      ? 'lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(420px,480px)_minmax(0,1fr)]'
      : 'justify-items-start',
  ]
    .filter(Boolean)
    .join(' ');
  const wrapperClasses = ['flex w-full flex-col gap-6', showFullDashboard ? '' : 'items-start']
    .filter(Boolean)
    .join(' ');
  const secondaryGridClasses = ['grid min-h-0 gap-6', showFullDashboard ? 'sm:grid-cols-2' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <main className="flex h-full min-h-0 flex-col text-white">
      <div className="flex-1 overflow-auto pb-6">
        <div className={wrapperClasses}>
          <div className={layoutClasses}>
            {showFullDashboard && (
              <div className="min-h-0">
                <YourTasks />
              </div>
            )}
            <div className={secondaryGridClasses}>
              {showFullDashboard && <HelpRequests />}
              <ForumUpdates />
              <ReportDownload />
              {showFullDashboard && <TodayPlan items={demoPlan} />}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

