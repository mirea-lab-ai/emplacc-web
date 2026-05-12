'use client';

import Panel from '@/components/ui/Panel';
import DateBar from '@/components/admin/attendance/DateBar';
import { useMemo, useState } from 'react';
import { useAllReports } from '@/features/reports/hooks';
import { useAllAttendances } from '@/features/attendance/hooks';
import Avatar from '@/components/ui/Avatar';

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const PAGE_SIZE = 20;

export default function AttendancePage() {
  const [date, setDate] = useState(() => toISO(new Date()));
  const [tab, setTab] = useState<'attendance'|'reports'>('attendance');
  const [reportPage, setReportPage] = useState(1);

  const { data: reportsData,    isLoading: reportsLoading    } = useAllReports(reportPage, PAGE_SIZE);
  const { data: attendanceData, isLoading: attendanceLoading } = useAllAttendances(1, 200);

  const prevDay = () => { const d = new Date(date+'T00:00:00'); d.setDate(d.getDate()-1); setDate(toISO(d)); };
  const nextDay = () => { const d = new Date(date+'T00:00:00'); d.setDate(d.getDate()+1); setDate(toISO(d)); };

  const attendancesForDate = useMemo(() =>
    (attendanceData?.items ?? []).filter(a => a.date?.startsWith(date)),
    [attendanceData, date]);

  const reportsForDate = useMemo(() =>
    (reportsData?.items ?? []).filter(r => (r.reportDate ?? r.createdAt)?.startsWith(date)),
    [reportsData, date]);

  const totalPages = Math.ceil((reportsData?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <Panel className="px-6 py-5">
        <DateBar value={date} onChange={setDate} onPrev={prevDay} onNext={nextDay} />
      </Panel>

      <Panel className="p-2">
        <div className="flex gap-2">
          {(['attendance','reports'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={['flex-1 rounded-xl px-4 py-2 font-semibold transition',
                tab===t ? 'bg-gradient-to-r from-emerald-600 to-lime-500 text-black' : 'bg-white/5 text-slate-200 hover:bg-white/10'
              ].join(' ')}>
              {t === 'attendance' ? 'Посещаемость' : 'Отчёты'}
            </button>
          ))}
        </div>
      </Panel>

      {tab === 'attendance' ? (
        <>
          <Panel className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <KPI label="Записей за день" value={attendancesForDate.length} />
              <KPI label="Всего записей"   value={attendanceData?.total ?? 0} />
            </div>
          </Panel>

          <Panel className="p-6">
            <h2 className="text-lg font-semibold mb-4">Посещаемость за {date}</h2>
            {attendanceLoading && <div className="text-slate-400 py-6 text-center">Загрузка…</div>}
            {!attendanceLoading && attendancesForDate.length === 0 && (
              <div className="t-surface rounded-xl px-4 py-3 text-slate-400">Нет данных за этот день</div>
            )}
            <div className="space-y-3">
              {attendancesForDate.map(a => (
                <div key={a.id} className="t-surface rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-slate-400 font-mono">{a.userId.slice(0,8)}…</span>
                  {a.actualStart && <span className="text-xs text-slate-500">Начало: {new Date(a.actualStart).toLocaleTimeString('ru-RU')}</span>}
                  {a.endWork     && <span className="text-xs text-slate-500">Конец: {new Date(a.endWork).toLocaleTimeString('ru-RU')}</span>}
                  {a.commits       != null && <Chip color="emerald">{a.commits} коммитов</Chip>}
                  {a.mergeRequests != null && <Chip color="lime">{a.mergeRequests} МР</Chip>}
                  {a.codeReviews  != null && <Chip color="white">{a.codeReviews} ревью</Chip>}
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : (
        <>
          <Panel className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <KPI label={`Отчётов за ${date}`} value={reportsForDate.length} />
              <KPI label="Всего отчётов"        value={reportsData?.total ?? 0} />
            </div>
          </Panel>

          <Panel className="p-6">
            <h2 className="text-lg font-semibold mb-4">Отчёты за {date}</h2>
            {reportsLoading && <div className="text-slate-400 py-6 text-center">Загрузка…</div>}
            {!reportsLoading && reportsForDate.length === 0 && (
              <div className="t-surface rounded-xl px-4 py-3 text-slate-400">Отчётов нет</div>
            )}
            <div className="space-y-4">
              {reportsForDate.map(report => (
                <div key={report.id} className="t-surface rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={report.user.name} email={report.user.email} url={report.user.avatarUrl} fallbackKey={report.user.id ?? report.id} size="md" />
                    <div className="flex-1">
                      <div className="font-medium">{report.user.name}</div>
                      {report.reportDate && <div className="text-xs text-slate-500">{new Date(report.reportDate).toLocaleDateString('ru-RU')}</div>}
                    </div>
                    {!!report.checked && <Chip color="emerald">Проверен</Chip>}
                  </div>
                  {report.completedWork.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-slate-500 mb-1">Выполнено:</div>
                      {report.completedWork.map((w,i) => <div key={w.id??i} className="text-sm text-slate-300">• {w.description}</div>)}
                    </div>
                  )}
                  {report.tomorrowPlans.length > 0 && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Планы на завтра:</div>
                      {report.tomorrowPlans.map((p,i) => <div key={p.id??i} className="text-sm text-slate-300">• {p.description}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {totalPages > 1 && (
            <Panel className="px-6 py-3">
              <div className="flex items-center justify-between">
                <button onClick={() => setReportPage(p => Math.max(1,p-1))} disabled={reportPage===1}
                  className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40">← Назад</button>
                <span className="text-sm text-slate-400">Страница {reportPage} из {totalPages}</span>
                <button onClick={() => setReportPage(p => Math.min(totalPages,p+1))} disabled={reportPage===totalPages}
                  className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40">Вперёд →</button>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="t-surface rounded-2xl p-5">
      <div className="text-slate-300 text-sm">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: 'emerald'|'lime'|'white' }) {
  const cls = color === 'emerald' ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20'
            : color === 'lime'    ? 'bg-lime-500/10    text-lime-300    ring-lime-500/20'
            :                       'bg-white/5         text-slate-300   ring-white/10';
  return <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${cls}`}>{children}</span>;
}
