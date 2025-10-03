'use client';

import YourTasks from '@/components/main/YourTasks';
import HelpRequests from '@/components/main/HelpRequests';
import ForumUpdates, { ForumNote } from '@/components/main/ForumUpdates';
import Problems, { Problem } from '@/components/main/Problems';
import TodayPlan, { PlanItem } from '@/components/main/TodayPlan';
// демо-данные удалены: блок использует только API

const demoForum: ForumNote[] = [
  { id: 'f1', topic: 'Design System', text: 'Добавил варианты disabled для кнопок…', href: '/forum' },
  { id: 'f2', topic: 'API Docs', text: 'Обновил описание refresh токенов…', href: '/forum' },
];

const demoProblems: Problem[] = [
  { id: 'p1', title: 'Сломался компьютер (не включается)', when: 'сегодня, 10:20', status: 'open' },
  { id: 'p2', title: 'Не работает интернет (3 этаж)', when: 'сегодня, 09:05', status: 'inprogress' },
  { id: 'p3', title: 'VPN отваливается каждые 15 минут', when: 'вчера, 16:40', status: 'open' },
];


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
            <ForumUpdates notes={demoForum}/>
            <Problems items={demoProblems}/>
            <TodayPlan items={demoPlan}/>
          </div>
        </div>
      </div>
    </main>
  );
}



