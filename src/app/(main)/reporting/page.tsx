'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Panel from '@/components/ui/Panel';
import ReportDownload from '@/components/main/ReportDownload';
import { useToast } from '@/components/ui/Toast';
import { useAllUserProjects } from '@/features/projects/hooks';
import type { UIProject } from '@/features/projects/api';
import { exportActiveTasksToExcel, exportProjectBoardToExcel, exportTomorrowPlansToExcel } from '@/features/export/api';
import { useIsClient } from '@/hooks/useIsClient';
import { getUserId, isAuthed } from '@/lib/auth';
import { useUserRole } from '@/features/roles/hooks';
import { useRouter } from 'next/navigation';
import { ConveyorGeneratedReportPanel } from '@/features/conveyor/components';

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function ReportingPage() {
  const router = useRouter();
  const isClient = useIsClient();
  const userId = isClient ? getUserId() : null;
  const hasCreds = isClient && isAuthed();
  const { data: userRole, isLoading: roleLoading } = useUserRole(userId, hasCreds);
  const normalizedRole = userRole?.role?.name?.trim().toLowerCase();
  const isGuest = normalizedRole === 'guest';

  useEffect(() => {
    if (!roleLoading && hasCreds && isClient && userId && normalizedRole && !isGuest) {
      router.replace('/');
    }
  }, [roleLoading, hasCreds, isClient, isGuest, normalizedRole, router, userId]);

  if (!isClient || roleLoading) {
    return (
      <main className="flex h-full min-h-0 flex-col text-white">
        <div className="flex-1 overflow-auto pb-6">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-center px-4 py-20 text-sm text-slate-300">
            Загрузка...
          </div>
        </div>
      </main>
    );
  }

  if (!hasCreds || !isGuest) {
    return (
      <main className="flex h-full min-h-0 flex-col text-white">
        <div className="flex-1 overflow-auto pb-6">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-center px-4 py-20 text-sm text-slate-300">
            Доступно только для гостевой роли.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col text-white">
      <div className="flex-1 overflow-auto pb-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4">
          <ReportDownload />
          <ConveyorGeneratedReportContainer />
          <ProjectExportPanel />
          <ActiveTasksExportPanel />
          <TomorrowPlansExportPanel />
        </div>
      </div>
    </main>
  );
}

function ConveyorGeneratedReportContainer() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: projects, isLoading } = useAllUserProjects(hasCreds);

  return <ConveyorGeneratedReportPanel projects={projects} projectsLoading={isLoading} />;
}

function ProjectExportPanel() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: projects, isLoading } = useAllUserProjects(hasCreds);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<UIProject | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!isMenuOpen) return;
    const handler = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isMenuOpen]);

  const sortedProjects = useMemo(() => {
    if (!projects) return [];
    return [...projects].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [projects]);

  const handleDownload = async () => {
    if (!selectedProject || isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await exportProjectBoardToExcel(selectedProject.id);
      downloadBlob(blob, `project-${selectedProject.id}.xlsx`);
    } catch (error) {
      console.error('Не удалось выгрузить проектный файл', error);
      toast.error('Не удалось выгрузить файл. Попробуйте еще раз позже.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Panel className="t-surface flex flex-col gap-4 p-5">
      <header>
        <h2 className="text-lg font-semibold">Выгрузка заданий по проекту</h2>
        <p className="mt-1 text-sm text-slate-300">
          Выберите проект по которому нужно выгрузить задачи
        </p>
      </header>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          disabled={isLoading || !sortedProjects.length}
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{selectedProject ? selectedProject.name : isLoading ? 'Загрузка проектов...' : 'Выберите проект'}</span>
          <svg
            className={['h-4 w-4 transition-transform', isMenuOpen ? 'rotate-180' : ''].join(' ')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isMenuOpen && sortedProjects.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-auto rounded-xl border border-white/10 bg-[#0b1f18] p-2 shadow-xl">
            {sortedProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  setSelectedProject(project);
                  setMenuOpen(false);
                }}
                className={[
                  'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                  selectedProject?.id === project.id
                    ? 'bg-gradient-to-r from-emerald-500 to-lime-400 text-black'
                    : 'text-slate-200 hover:bg-white/10',
                ].join(' ')}
              >
                <div className="font-semibold">{project.name}</div>
                {project.description && <div className="mt-0.5 text-xs text-slate-400">{project.description}</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={!selectedProject || isDownloading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDownloading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            Подготовка файла...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3 3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Скачать XLSX
          </>
        )}
      </button>
    </Panel>
  );
}

function ActiveTasksExportPanel() {
  const [isDownloading, setIsDownloading] = useState(false);
  const toast = useToast();

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await exportActiveTasksToExcel();
      downloadBlob(blob, 'active-tasks.xlsx');
    } catch (error) {
      console.error('Не удалось выгрузить активные задачи', error);
      toast.error('Не удалось выгрузить файл. Попробуйте еще раз позже.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Panel className="t-surface flex flex-col gap-4 p-5">
      <header>
        <h2 className="text-lg font-semibold">Активные задачи пользователей</h2>
        <p className="mt-1 text-sm text-slate-300">Файл с активными задачами пользователей</p>
      </header>

      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDownloading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            Подготовка файла...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3 3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Скачать XLSX
          </>
        )}
      </button>
    </Panel>
  );
}

function TomorrowPlansExportPanel() {
  const [isDownloading, setIsDownloading] = useState(false);
  const toast = useToast();

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await exportTomorrowPlansToExcel();
      downloadBlob(blob, 'tomorrow-plans.xlsx');
    } catch (error) {
      console.error('Не удалось выгрузить планы на сегодня', error);
      toast.error('Не удалось выгрузить файл. Попробуйте еще раз позже.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Panel className="t-surface flex flex-col gap-4 p-5">
      <header>
        <h2 className="text-lg font-semibold">Планы на сегодня</h2>
        <p className="mt-1 text-sm text-slate-300">Выгрузка планов по всем сотрудникам </p>
      </header>

      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDownloading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            Подготовка файла...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3 3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Скачать XLSX
          </>
        )}
      </button>
    </Panel>
  );
}
