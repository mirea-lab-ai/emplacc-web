'use client';

import { useState } from 'react';
import Panel from '@/components/ui/Panel';
import { useAllRoles } from '@/features/roles/hooks';
import { http } from '@/lib/http';
import { useQueryClient } from '@tanstack/react-query';

const PROTECTED = ['admin', 'manager', 'employee', 'guest'];

export default function RolesPage() {
  const { data: roles = [], isLoading, isError } = useAllRoles();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await http('/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
      setNewName(''); setNewDesc(''); setShowCreate(false);
    } finally { setCreating(false); }
  }

  async function handleDelete(roleId: string, roleName: string) {
    if (!confirm(`Удалить роль «${roleName}»?`)) return;
    setDeleteId(roleId);
    try {
      const res = await http(`/role/${encodeURIComponent(roleId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      queryClient.invalidateQueries({ queryKey: ['allRoles'] });
    } finally { setDeleteId(null); }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel className="px-6 py-5">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold flex-1">Роли</h1>
          <button onClick={() => setShowCreate(true)}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 px-5 py-2 font-semibold text-black text-sm hover:brightness-110 active:translate-y-px transition-all">
            + Создать роль
          </button>
        </div>
      </Panel>

      <Panel className="p-6">
        {isLoading && <div className="text-slate-400 py-6 text-center">Загрузка…</div>}
        {isError   && <div className="text-red-400 py-6 text-center">Не удалось загрузить роли</div>}
        {!isLoading && !isError && roles.length === 0 && (
          <div className="text-slate-400 py-6 text-center">Роли не созданы</div>
        )}
        <div className="space-y-3">
          {roles.map(role => {
            const isProtected = PROTECTED.includes(role.name.toLowerCase());
            return (
              <div key={role.id} className="t-surface rounded-xl flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{role.name}</div>
                  {role.description && <div className="text-sm text-slate-400 mt-0.5">{role.description}</div>}
                </div>
                {isProtected && <span className="text-xs text-slate-500 italic">системная</span>}
                <button
                  onClick={() => handleDelete(role.id, role.name)}
                  disabled={deleteId === role.id || isProtected}
                  title={isProtected ? 'Системную роль нельзя удалить' : 'Удалить'}
                  className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-2 6a1 1 0 112 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v4a1 1 0 11-2 0V8z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </Panel>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="t-surface w-full max-w-md rounded-2xl p-6 ring-1 ring-white/10">
            <h2 className="text-xl font-semibold mb-5">Создать роль</h2>
            <label className="grid gap-2 mb-4">
              <span className="text-slate-200 text-sm">Название *</span>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Например, teamlead"
                className="h-11 w-full rounded-xl bg-white/5 px-4 text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-emerald-500/50"/>
            </label>
            <label className="grid gap-2 mb-6">
              <span className="text-slate-200 text-sm">Описание</span>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Краткое описание"
                className="h-11 w-full rounded-xl bg-white/5 px-4 text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-emerald-500/50"/>
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-slate-300 hover:text-white">Отмена</button>
              <button onClick={handleCreate} disabled={!newName.trim() || creating}
                className="rounded-lg bg-gradient-to-r from-emerald-600 to-lime-500 px-5 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60">
                {creating ? 'Создаём…' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
