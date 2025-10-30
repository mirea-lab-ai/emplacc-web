'use client';

import { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { exportReportsToExcel } from '@/features/reports/api';

export default function ReportDownload() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();

  useEffect(() => {
    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];
    setStartDate(todayIso);
    setEndDate(todayIso);
  }, []);

  const handleDownload = async () => {
    if (!startDate || !endDate || isDownloading) return;

    setIsDownloading(true);
    try {
      const blob = await exportReportsToExcel(startDate, endDate);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка при скачивании отчета:', error);
      alert('Ошибка при скачивании отчета. Попробуйте еще раз.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Panel className="t-surface flex h-full flex-col p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Скачать отчет</h2>
      </div>

      <div className="flex-1 min-h-0 space-y-3">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Дата начала</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            disabled={isDownloading || !hasCreds}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Дата окончания</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            disabled={isDownloading || !hasCreds}
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleDownload}
          disabled={!hasCreds || !startDate || !endDate || isDownloading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDownloading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              Скачиваем…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3 3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Скачать отчет
            </>
          )}
        </button>
      </div>
    </Panel>
  );
}
