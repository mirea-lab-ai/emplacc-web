'use client';

import { useState, useMemo } from 'react';
import Avatar from '@/components/ui/Avatar';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useAllUsers } from '@/features/user/hooks';
import { useUserRole, useAllRoles, useAssignRole, useRemoveRole } from '@/features/roles/hooks';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { banUser, restoreUser, deleteUserPermanently, createUser, updateUser } from '@/features/user/api';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { UIUser } from '@/features/user/api';
import type { UIRole } from '@/features/roles/api';

const ROLE_COLORS: Record<string, string> = {
  admin:    'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
  manager:  'bg-lime-500/20   text-lime-300   ring-lime-500/30',
  employee: 'bg-white/10      text-slate-200  ring-white/15',
  guest:    'bg-white/5       text-slate-400  ring-white/10',
};

type Filter = 'all' | 'active' | 'banned';

export default function AdminUsersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [showCreate, setShowCreate] = useState(false);
  const { data: allUsers = [], isLoading, isError } = useAllUsers(1, 200);
  const { data: roles = [] } = useAllRoles();

  const users = useMemo(() => {
    const visible = allUsers.filter(u => u.email !== 'system@system');
    const byFilter = filter === 'all' ? visible
      : filter === 'banned' ? visible.filter(u => u.isActive === false)
      : visible.filter(u => u.isActive !== false);
    if (!search.trim()) return byFilter;
    const q = search.toLowerCase();
    return byFilter.filter(u =>
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.profession ?? '').toLowerCase().includes(q)
    );
  }, [allUsers, search, filter]);

  const refetch = () => qc.invalidateQueries({ queryKey: ['users'] });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="t-heading text-white">Сотрудники</h1>
          <p className="t-body mt-0.5">{allUsers.filter(u => u.email !== 'system@system').length} пользователей</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2 px-4 shrink-0">
          + Создать пользователя
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex rounded-xl ring-1 ring-white/10 overflow-hidden">
          {(['all','active','banned'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm transition-colors ${filter === f ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'}`}>
              {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Заблокированные'}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени, email…"
          className="flex-1 min-w-48 t-input text-sm" />
      </div>

      {/* Create modal */}
      {showCreate && <CreateUserModal roles={roles} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); refetch(); }} />}

      {/* Table */}
      {isLoading && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Array.from({length:6}).map((_,i) => <SkeletonCard key={i}/>)}</div>}
      {isError && <div className="text-red-400 py-8 text-center">Не удалось загрузить пользователей</div>}
      {!isLoading && users.length === 0 && <div className="text-slate-400 py-8 text-center">Ничего не найдено</div>}

      <div className="space-y-2">
        {users.map(u => (
          <UserRow key={u.id} user={u} roles={roles}
            onRefresh={refetch}
            toast={toast} confirm={confirm} />
        ))}
      </div>
    </div>
  );
}

function UserRow({ user, roles, onRefresh, toast, confirm }: {
  user: UIUser; roles: UIRole[];
  onRefresh: () => void;
  toast: ReturnType<typeof useToast>;
  confirm: ReturnType<typeof useConfirm>;
}) {
  const { data: roleLookup } = useUserRole(user.id);
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const [editing, setEditing] = useState(false);
  const [changing, setChanging] = useState(false);

  const isBanned = user.isActive === false;
  const currentRole = roleLookup?.role;
  const name = `${user.firstName} ${user.lastName}`.trim() || user.email;

  async function handleRoleChange(newRoleId: string) {
    setChanging(true);
    try {
      if (currentRole) await removeRole.mutateAsync({ userId: user.id, roleId: currentRole.id });
      if (newRoleId)   await assignRole.mutateAsync({ userId: user.id, roleId: newRoleId });
    } catch { toast.error('Не удалось изменить роль'); }
    finally { setChanging(false); }
  }

  async function handleBan() {
    if (!await confirm({ message: `Заблокировать «${name}»?`, danger: true, confirmLabel: 'Заблокировать' })) return;
    try { await banUser(user.id); toast.success(`${name} заблокирован`); onRefresh(); }
    catch { toast.error('Не удалось заблокировать'); }
  }

  async function handleRestore() {
    try { await restoreUser(user.email); toast.success(`${name} восстановлен`); onRefresh(); }
    catch { toast.error('Не удалось восстановить'); }
  }

  async function handleDelete() {
    if (!await confirm({ title: 'Удалить навсегда?', message: `Пользователь «${name}» будет удалён без возможности восстановления.`, danger: true, confirmLabel: 'Удалить' })) return;
    try { await deleteUserPermanently(user.id); toast.success(`${name} удалён`); onRefresh(); }
    catch { toast.error('Не удалось удалить'); }
  }

  return (
    <>
      <div className={`t-surface rounded-2xl p-4 flex items-center gap-4 ring-1 transition-all ${isBanned ? 'ring-red-500/20 opacity-60' : 'ring-white/8 hover:ring-white/15'}`}>
        <div className="shrink-0">
          <Avatar name={name} url={user.avatarUrl} email={user.email} fallbackKey={user.id} size="md"/>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white truncate">{name}</span>
            {isBanned && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 ring-1 ring-red-500/30">заблокирован</span>}
            {currentRole && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ring-1 font-medium ${ROLE_COLORS[currentRole.name.toLowerCase()] ?? ROLE_COLORS.employee}`}>
                {currentRole.name}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 truncate">{user.email}{user.profession ? ` · ${user.profession}` : ''}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* Role select */}
          <select disabled={changing} value={currentRole?.id ?? ''}
            onChange={e => handleRoleChange(e.target.value)}
            className="text-xs rounded-lg bg-white/5 ring-1 ring-white/10 px-2 py-1.5 text-slate-300 focus:outline-none focus:ring-emerald-500/50 disabled:opacity-50">
            <option value="">— Без роли —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <button onClick={() => setEditing(true)} title="Редактировать"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>

          {isBanned ? (
            <button onClick={handleRestore} title="Восстановить"
              className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M3 12a9 9 0 109 9M3 3l9 9M3 3h6M3 3v6"/>
              </svg>
            </button>
          ) : (
            <button onClick={handleBan} title="Заблокировать"
              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            </button>
          )}

          <button onClick={handleDelete} title="Удалить навсегда"
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      {editing && (
        <EditUserModal user={user} onClose={() => setEditing(false)} onSuccess={() => { setEditing(false); onRefresh(); }} toast={toast} />
      )}
    </>
  );
}

function CreateUserModal({ roles, onClose, onSuccess }: { roles: UIRole[]; onClose: () => void; onSuccess: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', profession: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim() || !form.first_name.trim()) return;
    setSaving(true);
    try {
      await createUser({ ...form });
      toast.success('Пользователь создан');
      onSuccess();
    } catch { toast.error('Не удалось создать пользователя'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md t-surface rounded-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-white text-lg">Новый пользователь</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: 'first_name', label: 'Имя', placeholder: 'Иван', required: true },
            { key: 'last_name',  label: 'Фамилия', placeholder: 'Петров', required: false },
            { key: 'email',      label: 'Email', placeholder: 'user@example.com', required: true },
            { key: 'profession', label: 'Должность', placeholder: 'Frontend Developer', required: false },
          ].map(f => (
            <div key={f.key}>
              <label className="t-label mb-1 block">{f.label}{f.required && ' *'}</label>
              <input required={f.required} value={(form as any)[f.key]} placeholder={f.placeholder}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="t-input" />
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Отмена</button>
            <button type="submit" disabled={saving || !form.email.trim() || !form.first_name.trim()} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
              {saving ? 'Создаём…' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSuccess, toast }: { user: UIUser; onClose: () => void; onSuccess: () => void; toast: ReturnType<typeof useToast> }) {
  const [form, setForm] = useState({
    first_name: user.firstName, last_name: user.lastName,
    email: user.email, profession: user.profession ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(user.id, form);
      toast.success('Профиль обновлён');
      onSuccess();
    } catch { toast.error('Не удалось обновить профиль'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md t-surface rounded-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-white text-lg">Редактировать профиль</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: 'first_name', label: 'Имя' },
            { key: 'last_name',  label: 'Фамилия' },
            { key: 'email',      label: 'Email' },
            { key: 'profession', label: 'Должность' },
          ].map(f => (
            <div key={f.key}>
              <label className="t-label mb-1 block">{f.label}</label>
              <input value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="t-input" />
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Отмена</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
