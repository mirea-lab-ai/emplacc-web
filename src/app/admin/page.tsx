'use client';

import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import Link from 'next/link';

function useAdminStats(enabled: boolean) {
  return useQuery({
    queryKey: ['adminStats'],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const [users, tasks, projects, teams, reports, problems] = await Promise.allSettled([
        http('/user/all/1/1').then(r => r.json()),
        http('/task/all/1/1').then(r => r.json()),
        http('/project/all/1/1').then(r => r.json()),
        http('/team/all').then(r => r.json()),
        http('/report/all/1/1').then(r => r.json()),
        http('/problem/all/1/50').then(r => r.json()),
      ]);
      return {
        users:    users.status    === 'fulfilled' ? (users.value?.total_count    ?? 0) : 0,
        tasks:    tasks.status    === 'fulfilled' ? (tasks.value?.total_count    ?? 0) : 0,
        projects: projects.status === 'fulfilled' ? (projects.value?.total_count ?? Array.isArray(projects.value) ? projects.value?.length ?? 0 : 0) : 0,
        teams:    teams.status    === 'fulfilled' ? (Array.isArray(teams.value) ? teams.value.length : 0) : 0,
        reports:  reports.status  === 'fulfilled' ? (reports.value?.total_count  ?? 0) : 0,
        problems: problems.status === 'fulfilled' ? (problems.value?.total_count ?? 0) : 0,
      };
    },
  });
}

const SECTIONS = [
  { href: '/admin/users',      label: 'Сотрудники',   icon: '👥', desc: 'Управление пользователями, роли, бан' },
  { href: '/admin/tasks',      label: 'Задачи',        icon: '✅', desc: 'Все задачи платформы, удаление' },
  { href: '/admin/projects',   label: 'Проекты',       icon: '📁', desc: 'Управление проектами' },
  { href: '/admin/forum',      label: 'Форум',         icon: '💬', desc: 'Модерация тем и сообщений' },
  { href: '/admin/attendance', label: 'Посещаемость',  icon: '📊', desc: 'Отчёты и посещаемость' },
  { href: '/admin/roles',      label: 'Роли',          icon: '🔑', desc: 'Управление ролями системы' },
  { href: '/admin/llm',        label: 'LLM',           icon: '🤖', desc: 'Настройки AI-ассистента' },
];

export default function AdminDashboard() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: stats, isLoading } = useAdminStats(hasCreds);

  const statCards = [
    { label: 'Сотрудников',   value: stats?.users,    color: 'text-emerald-400' },
    { label: 'Задач',          value: stats?.tasks,    color: 'text-blue-400' },
    { label: 'Проектов',       value: stats?.projects, color: 'text-purple-400' },
    { label: 'Команд',         value: stats?.teams,    color: 'text-orange-400' },
    { label: 'Отчётов',        value: stats?.reports,  color: 'text-yellow-400' },
    { label: 'Тем форума',     value: stats?.problems, color: 'text-pink-400' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="t-heading text-white">Панель администратора</h1>
        <p className="t-body mt-1">Обзор платформы и управление системой</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="t-surface rounded-2xl p-4 text-center space-y-1">
            <div className={`text-3xl font-bold ${s.color}`}>
              {isLoading ? <span className="animate-pulse text-slate-600">—</span> : (s.value ?? 0)}
            </div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div>
        <h2 className="t-title text-white mb-4">Разделы</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SECTIONS.map(s => (
            <Link key={s.href} href={s.href}
              className="t-surface-hover rounded-2xl p-5 flex items-start gap-4 ring-1 ring-white/8 hover:ring-white/20 transition-all group">
              <span className="text-3xl shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <div className="font-semibold text-white group-hover:text-emerald-300 transition-colors">{s.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
