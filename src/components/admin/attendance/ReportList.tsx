'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type FlatReport = {
  id: string;
  employeeName: string;
  taskTitle: string;
  text: string;
  href?: string;
};

export default function ReportList({ reports }: { reports: FlatReport[] }) {
  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <ReportRow key={r.id} report={r} />
      ))}
    </ul>
  );
}

function ReportRow({ report }: { report: FlatReport }) {
  const [open, setOpen] = useState(false);
  const preview = useMemo(() => firstTwoSentences(report.text), [report.text]);

  return (
    <li
      className={[
        'relative overflow-hidden rounded-2xl ring-1',
        'bg-[#141c2f] ring-white/10 transition-colors',
        open ? 'ring-2 ring-indigo-500/40 ' : '',
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
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full text-left px-4 py-3 hover:bg-[#16213a] rounded-2xl"
          aria-expanded={open}
        >
          <div className="font-semibold">{report.employeeName}</div>
          <div className="text-slate-300">{report.taskTitle}</div>
          <div className="text-slate-400 text-sm mt-0.5">
            Нажмите, чтобы посмотреть кратко
          </div>
        </button>

        <div
          data-open={open}
          className={[
            'overflow-hidden transition-all duration-300 px-4',
            'max-h-0 opacity-0 translate-y-1',
            'data-[open=true]:max-h-72 data-[open=true]:opacity-100 data-[open=true]:translate-y-0',
          ].join(' ')}
        >
          <p className="text-slate-200 pb-3">{preview}</p>

          {report.href ? (
            <Link
              href={report.href}
              className="inline-block mb-4 rounded-lg bg-[#3452ff] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 active:translate-y-px"
            >
              Смотреть полный отчёт
            </Link>
          ) : (
            <button
              onClick={() =>
                alert('Тут должна быть навигация на полный отчёт или модалка.')
              }
              className="mb-4 rounded-lg bg-[#3452ff] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 active:translate-y-px"
            >
              Смотреть полный отчёт
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function firstTwoSentences(text: string) {
  const parts = text.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return truncate(parts[0], 220);
  return truncate(parts[0] + ' ' + parts[1], 300);
}
function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
