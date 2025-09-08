'use client';

import Panel from '@/components/ui/Panel';
import EmployeeList, { Employee } from '@/components/admin/EmployeeList';

export default function AdminPage() {
  // демо-данные; подставь свои или подтяни с API
  const employees: Employee[] = [
    {
      id: 'u1',
      name: 'Алексей Смирнов',
      role: 'Frontend Developer',
      reports: [
        {
          id: 'r101',
          taskTitle: 'Design System — Buttons & Inputs',
          text:
            'Сегодня завернул состояния для кнопок (hover/active/disabled) и добавил поддержку иконок. ' +
            'Покрыл критическую часть сторибуками и визуальными тестами. ' +
            'Осталось согласовать размеры с дизайном.',
          href: '/reports/view?rid=r101',
        },
        {
          id: 'r102',
          taskTitle: 'Docs — Auth & Sessions',
          text:
            'Обновил раздел про refresh токены и тайм-ауты сессии. ' +
            'Добавил схемы последовательностей для OAuth2. ' +
            'Нужно ревью от бэкенда.',
        },
      ],
    },
    {
      id: 'u2',
      name: 'Мария Иванова',
      role: 'Backend Engineer',
      reports: [
        {
          id: 'r201',
          taskTitle: 'Webhooks — Retry Strategy',
          text:
            'Реализовала экспоненциальный бэкофф с джиттером для повторных попыток. ' +
            'Добавила dead-letter очередь и метрики в Prometheus. ' +
            'Запланировала нагрузочное тестирование.',
          href: '/reports/view?rid=r201',
        },
      ],
    },
    {
      id: 'u3',
      name: 'Илья Петров',
      role: 'QA',
      reports: [],
    },
  ];

  return (
    <main className="min-h-screen bg-[#0f1422] text-white">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <Panel className="p-6">
          <h2 className="text-xl font-semibold mb-4">Сотрудники</h2>
          <EmployeeList employees={employees} />
        </Panel>
      </div>
    </main>
  );
}
