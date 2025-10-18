'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';

export type Report = {
  id: string;
  taskTitle: string;     // задача, про которую написан отчёт
  text: string;          // полный текст отчёта (мы покажем первые 2 предложения)
  href?: string;         // ссылка на полный отчёт (опционально)
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  email?: string;
  avatarSrc?: string;
  reports: Report[];
};

export default function EmployeeList({ employees }: { employees: Employee[] }) {
  // какие карточки сотрудников раскрыты
  const [openEmployees, setOpenEmployees] = useState<Set<string>>(new Set());

  const toggleEmployee = (id: string) => {
    setOpenEmployees((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {employees.map((e) => (
        <EmployeeCard
          key={e.id}
          employee={e}
          open={openEmployees.has(e.id)}
          onToggle={() => toggleEmployee(e.id)}
        />
      ))}
    </div>
  );
}

/* -------------------- Card -------------------- */

function EmployeeCard({
                        employee,
                        open,
                        onToggle,
                      }: {
  employee: Employee;
  open: boolean;
  onToggle: () => void;
}) {
  // какие отчёты раскрыты внутри этой карточки
  const [openReports, setOpenReports] = useState<Set<string>>(new Set());
  const toggleReport = (rid: string) => {
    setOpenReports((prev) => {
      const n = new Set(prev);
      n.has(rid) ? n.delete(rid) : n.add(rid);
      return n;
    });
  };

  return (
    <div
      onClick={onToggle}
      className={[
        'relative overflow-hidden cursor-pointer select-none',
        'rounded-2xl p-5 ring-1 ring-white/5',
        'bg-[#141c2f] hover:bg-[#16213a] transition-colors',
        open ? 'ring-2 ring-indigo-500/40' : '',
      ].join(' ')}
    >
      {/* градиентная подложка при открытии */}
      <div
        className={[
          'pointer-events-none absolute inset-0 rounded-2xl transition-opacity',
          open
            ? 'opacity-60 bg-gradient-to-r from-indigo-600 via-blue-600 to-fuchsia-600'
            : 'opacity-0',
        ].join(' ')}
      />

      <div className="relative z-[1]">
        <div className="flex items-center gap-4">
          <div className="rounded-full p-[3px] bg-gradient-to-br from-indigo-500/80 via-blue-500/80 to-fuchsia-500/80">
            <Avatar name={employee.name} url={employee.avatarSrc} email={employee.email} fallbackKey={employee.id} size="lg" />
          </div>
          <div>
            <div className="text-xl font-semibold">{employee.name}</div>
            <div className="text-slate-300 mt-0.5">{employee.role}</div>
          </div>
        </div>

        {/* список отчётов сотрудника */}
        <div
          data-open={open}
          className={[
            'mt-4 overflow-hidden transition-all duration-300',
            'max-h-0 opacity-0 translate-y-2',
            'data-[open=true]:max-h-[480px] data-[open=true]:opacity-100 data-[open=true]:translate-y-0',
          ].join(' ')}
          onClick={(e) => e.stopPropagation()} // клики внутри не сворачивают карточку
        >
          {employee.reports.length === 0 ? (
            <div className="rounded-lg bg-black/20 px-4 py-3 text-slate-400 ring-1 ring-white/10">
              Нет отчётов
            </div>
          ) : (
            <ul className="space-y-2">
              {employee.reports.map((r) => (
                <ReportItem
                  key={r.id}
                  report={r}
                  open={openReports.has(r.id)}
                  onToggle={() => toggleReport(r.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Report item -------------------- */

function ReportItem({
                      report,
                      open,
                      onToggle,
                    }: {
  report: Report;
  open: boolean;
  onToggle: () => void;
}) {
  const preview = useMemo(() => firstTwoSentences(report.text), [report.text]);

  return (
    <li
      className={[
        'rounded-xl ring-1 transition-colors',
        'bg-black/20 ring-white/10 hover:bg-black/30',
      ].join(' ')}
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3"
        aria-expanded={open}
      >
        <div className="font-medium text-slate-100">{report.taskTitle}</div>
        <div className="text-slate-400 text-sm mt-0.5">
          Нажмите, чтобы посмотреть кратко
        </div>
      </button>

      <div
        data-open={open}
        className={[
          'overflow-hidden transition-all duration-300',
          'max-h-0 opacity-0 translate-y-1',
          'data-[open=true]:max-h-72 data-[open=true]:opacity-100 data-[open=true]:translate-y-0',
        ].join(' ')}
      >
        <div className="px-4 pb-4 pt-1 text-slate-200">
          <p className="mb-3">{preview}</p>

          {report.href ? (
            <Link
              href={report.href}
              className="inline-block rounded-lg bg-[#3452ff] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 active:translate-y-px"
            >
              Смотреть полный отчёт
            </Link>
          ) : (
            <button
              onClick={() =>
                alert('Тут должна быть навигация на полный отчёт или модалка.')
              }
              className="rounded-lg bg-[#3452ff] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 active:translate-y-px"
            >
              Смотреть полный отчёт
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/* -------------------- Utils -------------------- */

function firstTwoSentences(text: string) {
  // делим по . ! ? с пробелами после, берём 2 предложения
  const parts = text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return truncate(parts[0], 220);
  return truncate(parts[0] + ' ' + parts[1], 300);
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
