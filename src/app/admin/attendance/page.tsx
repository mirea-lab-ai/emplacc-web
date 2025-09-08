'use client';

import Panel from '@/components/ui/Panel';
import DateBar from '@/components/admin/attendance/DateBar';
import EmployeeList, { Employee } from '@/components/admin/EmployeeList';
import ReportList, { FlatReport } from '@/components/admin/attendance/ReportList';
import { useMemo, useState } from 'react';

type Status = 'office' | 'remote' | 'off'; // в офисе / удаленно / не работают

type EmployeeWithStatus = Employee & { status: Status };

const demoEmployees: EmployeeWithStatus[] = [
  {
    id: 'u1',
    name: 'Алексей Смирнов',
    role: 'Frontend Developer',
    status: 'office',
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
    ],
  },
  {
    id: 'u2',
    name: 'Мария Иванова',
    role: 'Backend Engineer',
    status: 'remote',
    reports: [
      {
        id: 'r201',
        taskTitle: 'Webhooks — Retry Strategy',
        text:
          'Реализовала экспоненциальный бэкофф с джиттером для повторных попыток. ' +
          'Добавила dead-letter очередь и метрики в Prometheus. ' +
          'Запланировала нагрузочное тестирование.',
      },
    ],
  },
  {
    id: 'u3',
    name: 'Илья Петров',
    role: 'QA',
    status: 'off',
    reports: [],
  },
];

export default function AttendancePage() {
  // дата (ISO)
  const [date, setDate] = useState(() => toISO(new Date()));

  const [tab, setTab] = useState<'attendance' | 'reports'>('attendance');

  const counts = useMemo(() => {
    const office = demoEmployees.filter((e) => e.status === 'office').length;
    const remote = demoEmployees.filter((e) => e.status === 'remote').length;
    const off = demoEmployees.filter((e) => e.status === 'off').length;
    return { office, remote, off };
  }, [date]); // в примере статично; можно завязать на дату

  // плоский список отчётов для вкладки "Отчёты"
  const flatReports: FlatReport[] = useMemo(
    () =>
      demoEmployees.flatMap((e) =>
        e.reports.map((r) => ({
          id: r.id,
          employeeName: e.name,
          taskTitle: r.taskTitle,
          text: r.text,
          href: r.href,
        }))
      ),
    [date]
  );

  const prevDay = () => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setDate(toISO(d));
  };
  const nextDay = () => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setDate(toISO(d));
  };

  return (
    <main className="min-h-screen bg-[#0f1422] text-white">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        {/* верхняя панель с датой */}
        <Panel className="px-6 py-5">
          <DateBar value={date} onChange={setDate} onPrev={prevDay} onNext={nextDay} />
        </Panel>

        {/* переключатель вкладок */}
        <Panel className="p-2">
          <div className="flex gap-2">
            <TabButton active={tab === 'attendance'} onClick={() => setTab('attendance')}>
              Посещаемость
            </TabButton>
            <TabButton active={tab === 'reports'} onClick={() => setTab('reports')}>
              Отчёты
            </TabButton>
          </div>
        </Panel>

        {tab === 'attendance' ? (
          <>
            {/* сводка статусов */}
            <Panel className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPI label="В офисе" value={counts.office} />
                <KPI label="Удалённо" value={counts.remote} />
                <KPI label="Не работают" value={counts.off} />
              </div>
            </Panel>

            {/* сотрудники как на админке */}
            <Panel className="p-6">
              <h2 className="text-xl font-semibold mb-4">Сотрудники</h2>
              <EmployeeList
                employees={
                  // убираем служебное поле status перед передачей
                  demoEmployees.map(({ status, ...rest }) => rest)
                }
              />
            </Panel>
          </>
        ) : (
          <>
            {/* сводка по отчётам */}
            <Panel className="p-6">
              <div className="text-xl font-semibold">
                Всего отчётов: <span className="text-indigo-300">{flatReports.length}</span>
              </div>
            </Panel>

            {/* список отчётов */}
            <Panel className="p-6">
              <h2 className="text-xl font-semibold mb-4">Отчёты за день</h2>
              {flatReports.length ? (
                <ReportList reports={flatReports} />
              ) : (
                <div className="rounded-xl bg-[#141c2f] ring-1 ring-white/10 px-4 py-3 text-slate-400">
                  Отчётов нет
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </main>
  );
}

/* -------------------- helpers -------------------- */

function TabButton({
                     active,
                     onClick,
                     children,
                   }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 rounded-xl px-4 py-2 font-semibold transition',
        active
          ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-fuchsia-600 text-white'
          : 'bg-[#141c2f] text-slate-200 hover:bg-[#16213a]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#141c2f] ring-1 ring-white/10 p-5">
      <div className="text-slate-300">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
