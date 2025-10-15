'use client';

import Panel from '@/components/ui/Panel';
import { useState, useEffect } from 'react';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { exportReportsToExcel } from '@/features/reports/api';

export default function ReportDownload() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();

  // Устанавливаем даты по умолчанию (текущий месяц)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const handleDownload = async () => {
    if (!startDate || !endDate || isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      // Используем API функцию для экспорта
      const blob = await exportReportsToExcel(startDate, endDate);
      
      // Создаем ссылку для скачивания
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
    <Panel className="p-5 h-full flex flex-col t-surface">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Скачать отчет</h2>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Дата начала
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              disabled={isDownloading}
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Дата окончания
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              disabled={isDownloading}
            />
          </div>
        </div>

        <div className="mt-auto">
          <button
            onClick={handleDownload}
            disabled={!startDate || !endDate || isDownloading}
            className="w-full rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-3 text-black font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Скачиваем...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Скачать отчет
              </>
            )}
          </button>
        </div>
      </div>
    </Panel>
  );
}
