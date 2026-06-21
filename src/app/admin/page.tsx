'use client';

import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { useAllUsers } from '@/features/user/hooks';
import { listPendingApprovals } from '@/features/conveyor/api';
import Link from 'next/link';
import { useMemo } from 'react';
import { formatDateShort } from '@/lib/date';

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
        http('/problem/all/1/1').then(r => r.json()),
      ]);
      const num = (r: PromiseSettledResult<any>, key = 'total_count') =>
        r.status === 'fulfilled' ? (r.value?.[key] ?? 0) : 0;
      return {
        users: num(users),
        tasks: num(tasks),
        projects: projects.status === 'fulfilled'
          ? (projects.value?.total_count ?? (Array.isArray(projects.value) ? projects.value.length : 0))
          : 0,
        teams: teams.status === 'fulfilled' ? (Array.isArray(teams.value) ? teams.value.length : (teams.value?.teams?.length ?? 0)) : 0,
        reports: num(reports),
        problems: num(problems),
      };
    },
  });
}

function useRecentProblems(enabled: boolean) {
  return useQuery({
    queryKey: ['adminRecentProblems'],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const r = await http('/problem/all/1/6').then(res => res.json());
      const list: any[] = r?.problems ?? [];
      return list.map(p => ({
        id: String(p.id ?? ''),
        name: p.name ?? 'Без названия',
        createdAt: p.created_at as string | undefined,
      }));
    },
  });
}

const STAT_CARDS: { key: string; label: string; color: string; href: string }[] = [
  { key: 'users', label: 'Сотрудников', color: 'text-emerald-400', href: '/admin/users' },
  { key: 'teams', label: 'Команд', color: 'text-orange-400', href: '/admin/teams' },
  { key: 'projects', label: 'Проектов', color: 'text-purple-400', href: '/admin/projects' },
  { key: 'tasks', label: 'Задач', color: 'text-blue-400', href: '/admin/tasks' },
  { key: 'reports', label: 'Отчётов', color: 'text-yellow-400', href: '/admin/attendance' },
  { key: 'problems', label: 'Тем форума', color: 'text-pink-400', href: '/admin/forum' },
];

const QUICK_ACTIONS = [
  { label: 'Сотрудники', icon: '👥', href: '/admin/users' },
  { label: 'Команда', icon: '➕', href: '/admin/teams' },
  { label: 'Конвейер', icon: '🛠', href: '/admin/conveyor' },
  { label: 'API-токен', icon: '🔑', href: '/admin/tokens' },
  { label: 'Экспорт', icon: '📥', href: '/admin/export' },
  { label: 'Настроить LLM', icon: '🤖', href: '/admin/llm' },
];

const SECTIONS = [
  { href: '/admin/users', label: 'Сотрудники', icon: '👥', desc: 'Пользователи, роли, бан' },
  { href: '/admin/teams', label: 'Команды', icon: '🧩', desc: 'Состав, участники, проекты' },
  { href: '/admin/tasks', label: 'Задачи', icon: '✅', desc: 'Все задачи платформы' },
  { href: '/admin/projects', label: 'Проекты', icon: '📁', desc: 'Управление проектами' },
  { href: '/admin/boards', label: 'Доски', icon: '🗂', desc: 'Доски и статусы-колонки' },
  { href: '/admin/conveyor', label: 'Конвейер', icon: '🛠', desc: 'Одобрения, agent-runs, лог' },
  { href: '/admin/forum', label: 'Форум', icon: '💬', desc: 'Модерация тем и сообщений' },
  { href: '/admin/attendance', label: 'Посещаемость', icon: '📊', desc: 'Отчёты и посещаемость' },
  { href: '/admin/roles', label: 'Роли', icon: '🔑', desc: 'Роли системы' },
  { href: '/admin/tokens', label: 'Токены', icon: '🎫', desc: 'API-токены интеграций' },
  { href: '/admin/export', label: 'Экспорт', icon: '📥', desc: 'Выгрузка данных в Excel' },
  { href: '/admin/llm', label: 'LLM', icon: '🤖', desc: 'Настройки AI-ассистента' },
];

function fmtDate(iso?: string) {
  if (!iso) return '';
  return formatDateShort(iso);
}

export default function AdminDashboard() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: stats, isLoading } = useAdminStats(hasCreds);
  const { data: recentProblems = [], isLoading: problemsLoading } = useRecentProblems(hasCreds);
  const { data: users = [] } = useAllUsers(1, 200, hasCreds);
  const { data: pending = [] } = useQuery({
    queryKey: ['adminPendingApprovals'],
    queryFn: () => listPendingApprovals(200),
    enabled: hasCreds,
    staleTime: 30_000,
    retry: false,
  });

  const newUsers = useMemo(() => {
    return [...users]
      .filter(u => u.createdAt)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 6);
  }, [users]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="t-heading text-app">Панель администратора</h1>
        <p className="t-body mt-1">Обзор платформы и управление системой</p>
      </div>

      {/* Pending approvals badge */}
      {pending.length > 0 && (
        <Link href="/admin/conveyor"
          className="flex items-center gap-3 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/25 px-4 py-3 hover:bg-amber-500/15 transition-colors">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-lg">⏳</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-200">
              Ожидают одобрения: {pending.length}
            </div>
            <div className="t-caption text-amber-200/70">Запросы конвейера, требующие решения админа</div>
          </div>
          <span className="shrink-0 text-amber-200/80 text-sm">Открыть →</span>
        </Link>
      )}

      {/* Stats — clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(s => (
          <Link key={s.key} href={s.href}
            className="t-surface-hover rounded-2xl p-4 text-center space-y-1 ring-1 ring-app hover:ring-emerald-500/40 transition-all">
            <div className={`text-3xl font-bold ${s.color}`}>
              {isLoading ? <span className="animate-pulse text-app-3">—</span> : ((stats as any)?.[s.key] ?? 0)}
            </div>
            <div className="text-xs text-app-3">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(a => (
          <Link key={a.href} href={a.href}
            className="flex items-center gap-2 rounded-xl bg-app-subtle ring-1 ring-app px-3.5 py-2 text-sm text-app-2 hover:text-app hover:bg-app-hover hover:ring-emerald-500/40 transition-all">
            <span>{a.icon}</span>{a.label}
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="t-surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-title text-app">Последние темы форума</h2>
            <Link href="/admin/forum" className="t-caption hover:text-emerald-300">Все →</Link>
          </div>
          {problemsLoading ? (
            <div className="t-body py-2">Загрузка…</div>
          ) : recentProblems.length === 0 ? (
            <div className="t-caption py-2">Нет тем</div>
          ) : (
            <ul className="space-y-1.5">
              {recentProblems.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-app-hover transition-colors">
                  <span className="text-sm text-app truncate">{p.name}</span>
                  <span className="t-caption shrink-0">{fmtDate(p.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="t-surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-title text-app">Новые сотрудники</h2>
            <Link href="/admin/users" className="t-caption hover:text-emerald-300">Все →</Link>
          </div>
          {newUsers.length === 0 ? (
            <div className="t-caption py-2">Нет данных</div>
          ) : (
            <ul className="space-y-1.5">
              {newUsers.map(u => (
                <li key={u.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-app-hover transition-colors">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold">
                    {((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || '?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-app truncate">{`${u.firstName} ${u.lastName}`.trim() || u.email}</div>
                    <div className="t-caption truncate">{u.email}</div>
                  </div>
                  <span className="t-caption shrink-0">{fmtDate(u.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Section nav */}
      <div>
        <h2 className="t-title text-app mb-4">Разделы</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SECTIONS.map(s => (
            <Link key={s.href} href={s.href}
              className="t-surface-hover rounded-2xl p-5 flex items-start gap-4 ring-1 ring-app hover:ring-emerald-500/40 transition-all group">
              <span className="text-3xl shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <div className="font-semibold text-app group-hover:text-emerald-300 transition-colors">{s.label}</div>
                <div className="text-xs text-app-3 mt-0.5">{s.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
