'use client';

import { useState, useMemo } from 'react';
import Panel from '@/components/ui/Panel';
import Avatar from '@/components/ui/Avatar';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useAllUsers } from '@/features/user/hooks';
import { useUserRole, useAllRoles, useAssignRole, useRemoveRole } from '@/features/roles/hooks';
import type { UIRole } from '@/features/roles/api';

const ROLE_COLORS: Record<string, string> = {
  admin:    'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
  manager:  'bg-lime-500/20   text-lime-300   ring-lime-500/30',
  employee: 'bg-white/10      text-slate-200  ring-white/15',
  guest:    'bg-white/5       text-slate-400  ring-white/10',
};
function roleBadge(name: string) {
  return ROLE_COLORS[name.toLowerCase()] ?? 'bg-white/10 text-slate-200 ring-white/15';
}

export default function AdminPage() {
  const [search, setSearch] = useState('');
  const { data: users = [], isLoading, isError } = useAllUsers(1, 100);
  const { data: roles = [] } = useAllRoles();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    // Скрываем системного пользователя в списке сотрудников
    const visible = users.filter(u => u.email !== 'system@system');
    if (!q) return visible;
    return visible.filter(u =>
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.profession ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <Panel className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold flex-1">
            Сотрудники{!isLoading && <span className="text-slate-400 text-base font-normal ml-2">({users.length})</span>}
          </h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, email…"
            className="w-full sm:w-64 rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-emerald-500/50"
          />
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({length: 4}).map((_,i) => <SkeletonCard key={i}/>)}
          </div>
        )}
        {isError  && <div className="text-red-400 py-8 text-center">Не удалось загрузить список сотрудников</div>}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-slate-400 py-8 text-center">Ничего не найдено</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {filtered.map(u => (
            <EmployeeCard
              key={u.id}
              userId={u.id}
              name={`${u.firstName} ${u.lastName}`.trim() || u.email}
              email={u.email}
              profession={u.profession}
              roles={roles}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function EmployeeCard({ userId, name, email, profession, roles }: {
  userId: string; name: string; email: string; profession?: string; roles: UIRole[];
}) {
  const { data: roleLookup, isLoading: roleLoading } = useUserRole(userId);
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const [changing, setChanging] = useState(false);

  const currentRole = roleLookup?.role;

  async function handleRoleChange(newRoleId: string) {
    setChanging(true);
    try {
      if (currentRole) await removeRole.mutateAsync({ userId, roleId: currentRole.id });
      if (newRoleId)   await assignRole.mutateAsync({ userId, roleId: newRoleId });
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="t-surface rounded-2xl p-5 ring-1 ring-white/10 hover:ring-white/20 transition-all">
      <div className="flex items-start gap-4">
        <div className="rounded-full p-[2px] bg-gradient-to-br from-emerald-500/70 to-lime-400/70 shrink-0">
          <Avatar name={name} email={email} fallbackKey={userId} size="lg" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{name}</div>
          <div className="text-slate-400 text-sm truncate">{email}</div>
          {profession && <div className="text-slate-500 text-xs mt-0.5 truncate">{profession}</div>}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {roleLoading ? (
              <span className="text-xs text-slate-500">…</span>
            ) : currentRole ? (
              <span className={`text-xs px-2 py-0.5 rounded-full ring-1 font-medium ${roleBadge(currentRole.name)}`}>
                {currentRole.name}
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic">Без роли</span>
            )}

            {roles.length > 0 && (
              <select
                disabled={changing}
                value={currentRole?.id ?? ''}
                onChange={e => handleRoleChange(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="text-xs rounded-lg bg-white/5 ring-1 ring-white/10 px-2 py-1 text-slate-300 focus:outline-none focus:ring-emerald-500/50 disabled:opacity-50"
              >
                <option value="">— Без роли —</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
