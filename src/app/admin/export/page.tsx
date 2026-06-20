'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { useAllProjects } from '@/features/teams/hooks';
import {
  exportProjectBoardToExcel,
  exportActiveTasksToExcel,
  exportTomorrowPlansToExcel,
} from '@/features/export/api';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function ExportCard({
  icon, title, desc, busy, onClick, children,
}: {
  icon: string; title: string; desc: string; busy: boolean; onClick: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="t-surface rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="font-semibold text-app">{title}</div>
          <div className="t-caption mt-0.5">{desc}</div>
        </div>
      </div>
      {children}
      <button onClick={onClick} disabled={busy}
        className="btn-primary text-sm py-2 px-4 disabled:opacity-50 self-start">
        {busy ? 'Готовим файл…' : '⬇ Скачать .xlsx'}
      </button>
    </div>
  );
}

export default function AdminExportPage() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const toast = useToast();
  const { data: projects = [] } = useAllProjects(hasCreds);

  const [busy, setBusy] = useState<string | null>(null);
  const [projectId, setProjectId] = useState('');

  async function run(key: string, fn: () => Promise<Blob>, filename: string) {
    setBusy(key);
    try {
      const blob = await fn();
      downloadBlob(blob, filename);
      toast.success('Файл выгружен');
    } catch (e: any) {
      toast.error(e?.message || 'Не удалось выгрузить');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="t-heading text-app">Экспорт в Excel</h1>
        <p className="t-body mt-1">Выгрузка данных платформы в .xlsx</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ExportCard
          icon="✅"
          title="Активные задачи"
          desc="Все незакрытые задачи платформы"
          busy={busy === 'active'}
          onClick={() => run('active', exportActiveTasksToExcel, `active-tasks-${stamp()}.xlsx`)}
        />

        <ExportCard
          icon="🗓"
          title="Планы на завтра"
          desc="Планы из последних отчётов сотрудников"
          busy={busy === 'plans'}
          onClick={() => run('plans', exportTomorrowPlansToExcel, `tomorrow-plans-${stamp()}.xlsx`)}
        />

        <ExportCard
          icon="🗂"
          title="Доска проекта"
          desc="Все задачи доски выбранного проекта"
          busy={busy === 'board'}
          onClick={() => {
            if (!projectId) { toast.error('Выберите проект'); return; }
            run('board', () => exportProjectBoardToExcel(projectId), `board-${stamp()}.xlsx`);
          }}
        >
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="t-input">
            <option value="">— выберите проект —</option>
            {projects.map((p: any) => (
              <option key={String(p.id)} value={String(p.id)}>{p?.name ?? p?.title ?? 'Без названия'}</option>
            ))}
          </select>
        </ExportCard>
      </div>
    </div>
  );
}
