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
    <main className="min-h-screen  text-white">
      <div className="mx-auto p-6 space-y-6">
        {/* фикс-сетка: левая широкая колонка + правая с 4 малыми блоками */}
        <div className="grid grid-cols-[480px_1fr] gap-6">
          <YourTasks/>

          <div className="grid grid-cols-2 grid-rows-[1fr_1fr] gap-6 min-h-[680px]">
            <HelpRequests/>
            <ForumUpdates/>
            <ReportDownload/>
            <TodayPlan items={demoPlan}/>
          </div>
        </div>
      </div>
    </main>
  );
}



