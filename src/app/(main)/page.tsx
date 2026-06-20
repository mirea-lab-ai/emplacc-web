'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import YourTasks from '@/components/main/YourTasks';
import HelpRequests from '@/components/main/HelpRequests';
import ForumUpdates from '@/components/main/ForumUpdates';
import ReportDownload from '@/components/main/ReportDownload';
import TodayPlan, { PlanItem } from '@/components/main/TodayPlan';
import { getUserId, isAuthed } from '@/lib/auth';
import { useUserRole } from '@/features/roles/hooks';
import { useUser } from '@/features/user/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { useMyTasks } from '@/features/tasks/hooks';
import { useAllReports } from '@/features/reports/hooks';
import { SkeletonStatCard, SkeletonWidget, SkeletonTaskItem } from '@/components/ui/Skeleton';

// Фолбэк для неавторизованного состояния — без фейковых данных:
// TodayPlan покажет честное пустое состояние.
const demoPlan: PlanItem[] = [];

function greeting() {
  const h = new Date().getHours();
  if (h < 6)  return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function StatCard({ label, value, sub, accent = false, href }: {
  label: string; value: string | number; sub?: string; accent?: boolean; href?: string;
}) {
  const inner = (
    <div className={`stat-card h-full ${accent ? 't-surface-accent' : ''} ${href ? 'cursor-pointer t-surface-hover' : ''}`}>
      <div className="t-label mb-2">{label}</div>
      <div className={`text-3xl font-bold tracking-tight ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</div>
      {sub && <div className="t-caption mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

export default function Home() {
  const isClient = useIsClient();
  const userId   = isClient ? getUserId() : null;
  const hasCreds = isClient && isAuthed();

  const { data: user, isLoading: userLoading }         = useUser(userId, hasCreds);
  const { data: userRole, isLoading: roleLoading }     = useUserRole(userId, hasCreds);
  const normalizedRole = userRole?.role?.name?.trim().toLowerCase();
  const isGuest = normalizedRole === 'guest';

  const { data: myTasks, isLoading: tasksLoading }     = useMyTasks(1, 100, hasCreds && !isGuest);
  const { data: reportsData, isLoading: reportsLoading } = useAllReports(1, 1, hasCreds);

  const statsLoading = !isClient || userLoading || roleLoading;
  const firstName = user?.firstName ?? '';
  const taskCount = myTasks?.length ?? 0;
  const reportCount = reportsData?.total ?? 0;

  if (isGuest) {
    return (
      <main className="flex h-full min-h-0 flex-col animate-fade-in">
        <div className="flex-1 overflow-auto pb-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4">
            <GuestBanner />
            <ForumUpdates />
            <ReportDownload />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden animate-fade-in">
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-8">
        <div className="flex w-full flex-col gap-6 px-4 sm:px-6 lg:px-10">

          {/* ── Hero greeting ── */}
          <div className="relative overflow-hidden rounded-2xl t-surface-accent px-6 py-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/8 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-lime-400/6 blur-2xl" />
            <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="t-label mb-1 text-emerald-400/70">
                  {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <h1 className="t-heading text-white">
                  {firstName ? `${greeting()}, ${firstName} 👋` : `${greeting()} 👋`}
                </h1>
              </div>
              <Link href="/report" className="btn-primary shrink-0">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
                </svg>
                Новый отчёт
              </Link>
            </div>
          </div>

          {/* ── Quick stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger-children">
            {statsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)
            ) : (
              <>
                <StatCard label="Мои задачи" value={tasksLoading ? '…' : taskCount} sub="активных" href="/tasks" accent />
                <StatCard label="Отчётов" value={reportsLoading ? '…' : reportCount} sub="в системе" href="/report" />
                <StatCard label="Роль" value={userRole?.role?.name ?? '—'} sub="в системе" />
              </>
            )}
          </div>

          {/* ── Widgets ── */}
          <div className="grid gap-6 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] stagger-children">
            <div className="min-h-0">
              <YourTasks />
            </div>
            <div className="grid min-h-0 gap-5 sm:grid-cols-2 content-start">
              <HelpRequests />
              <ForumUpdates />
              <ReportDownload />
              <TodayPlan items={demoPlan} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function GuestBanner() {
  return (
    <div className="t-surface-accent rounded-2xl px-6 py-5">
      <div className="t-label mb-1 text-emerald-400/70">Гостевой доступ</div>
      <h2 className="t-title text-white">Добро пожаловать в Emplacc</h2>
      <p className="t-body mt-1">У вас доступ только для чтения. Обратитесь к администратору для расширения прав.</p>
    </div>
  );
}
