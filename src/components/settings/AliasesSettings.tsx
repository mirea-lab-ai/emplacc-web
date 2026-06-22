'use client';

import { useMemo, useState } from 'react';
import { useAliases, useCreateAlias, useDeleteAlias } from '@/features/aliases/hooks';
import { useAllUsers } from '@/features/user/hooks';
import Avatar from '@/components/ui/Avatar';

export default function AliasesSettings() {
  const { data: aliases, isLoading } = useAliases();
  const { data: users } = useAllUsers(1, 500);
  const createMut = useCreateAlias();
  const deleteMut = useDeleteAlias();
  const [alias, setAlias] = useState('');
  const [targetId, setTargetId] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const userOptions = useMemo(
    () =>
      (users ?? [])
        .filter((u) => u.email !== 'system@system')
        .map((u) => ({ id: u.id, name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.id })),
    [users],
  );

  const submit = () => {
    setErr(null);
    const a = alias.trim().replace(/^@/, '').trim();
    if (!a || !targetId) {
      setErr('Укажите псевдоним и пользователя');
      return;
    }
    createMut.mutate(
      { alias: a, targetUserId: targetId },
      {
        onSuccess: () => { setAlias(''); setTargetId(''); },
        onError: (e) => setErr(e instanceof Error ? e.message : 'Ошибка'),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="t-title text-app">Псевдонимы</h2>
        <p className="text-sm text-app-2 mt-1">
          Личные псевдонимы для упоминаний. Когда вы пишете <code>@псевдоним</code> в форуме, он подставляет
          выбранного пользователя. Псевдонимы приватные — видите и используете их только вы.
        </p>
      </div>

      {/* Форма добавления */}
      <div className="t-surface rounded-xl ring-1 ring-app p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-1 flex-1 bg-app-subtle rounded-lg ring-1 ring-app px-3">
            <span className="text-app-3">@</span>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="псевдоним (например badwolf)"
              className="flex-1 bg-transparent py-2 text-sm text-app focus:outline-none"
            />
          </div>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="flex-1 bg-app-subtle rounded-lg ring-1 ring-app px-3 py-2 text-sm text-app focus:outline-none"
          >
            <option value="">— выберите пользователя —</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <button
            onClick={submit}
            disabled={createMut.isPending}
            className="rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 shrink-0"
          >
            Добавить
          </button>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
      </div>

      {/* Список псевдонимов */}
      <div className="space-y-2">
        {isLoading && <p className="text-sm text-app-3">Загрузка…</p>}
        {!isLoading && (aliases ?? []).length === 0 && (
          <p className="text-sm text-app-3">Псевдонимов пока нет.</p>
        )}
        {(aliases ?? []).map((a) => (
          <div key={a.id} className="t-surface rounded-xl ring-1 ring-app px-4 py-2.5 flex items-center gap-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-200 text-sm font-medium">
              @{a.alias}
            </span>
            <span className="text-app-3">→</span>
            <Avatar name={a.targetName || '—'} url={a.targetAvatarUrl} fallbackKey={a.targetUserId} size="sm" />
            <span className="text-sm text-app flex-1 truncate">{a.targetName || a.targetUserId}</span>
            <button
              onClick={() => deleteMut.mutate(a.id)}
              disabled={deleteMut.isPending}
              className="text-app-3 hover:text-red-400 transition-colors shrink-0"
              title="Удалить"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
