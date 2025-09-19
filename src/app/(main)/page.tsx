'use client';

import YourTasks, { Task } from '@/components/main/YourTasks';
import HelpRequests, { HelpReq } from '@/components/main/HelpRequests';
import ForumUpdates, { ForumNote } from '@/components/main/ForumUpdates';
import Problems, { Problem } from '@/components/main/Problems';
import TodayPlan, { PlanItem } from '@/components/main/TodayPlan';
// демо-данные — подставь реальные
const demoTasks: Task[] = [
  { id: 't1', title: 'Design System', next: 'Состояния кнопок', urgent: true, severity: 5, due: 'сегодня' },
  { id: 't2', title: 'API Docs', next: 'OAuth2 раздел', urgent: true, severity: 4, due: 'сегодня' },
  { id: 't3', title: 'Team Meeting', next: 'Повестка', severity: 3, due: 'завтра' },
  { id: 't4', title: 'Webhooks Retry', next: 'DLQ и метрики', severity: 2, due: 'на неделе' },
  { id: 't5', title: 'Rate Limits', next: 'Таблица лимитов', severity: 1, due: '—' },
];

const demoHelps: HelpReq[] = [
  { id: 'h1', from: 'Мария Иванова', task: 'API Docs — OAuth2', text: 'Нужна проверка последовательности обмена токенов' },
  { id: 'h2', from: 'Илья Петров', task: 'Design System — Tooltip', text: 'Помоги с анимацией появления' },
];

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
    <main className="min-h-screen bg-emerald-950 text-white">
      <div className="mx-auto p-6 space-y-6">
        {/* фикс-сетка: левая широкая колонка + правая с 4 малыми блоками */}
        <div className="grid grid-cols-[480px_1fr] gap-6">
          <YourTasks tasks={demoTasks} />

          <div className="grid grid-cols-2 grid-rows-[1fr_1fr] gap-6 min-h-[680px]">
            <HelpRequests items={demoHelps}/>
            <ForumUpdates notes={demoForum}/>
            <Problems items={demoProblems}/>
            <TodayPlan items={demoPlan}/>
          </div>
        </div>
      </div>
    </main>
  );
}



