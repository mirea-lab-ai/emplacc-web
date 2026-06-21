'use client';

import { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import Avatar from '@/components/ui/Avatar';
import AvatarEditor from '@/components/settings/AvatarEditor';
import TextField from '@/components/settings/TextField';
import APITokens from '@/components/settings/APITokens';
import AboutSystem from '@/components/settings/AboutSystem';
import { useToast } from '@/components/ui/Toast';
import { SkeletonProfileHeader, SkeletonField } from '@/components/ui/Skeleton';
import { clearTokens, getUserId, isAuthed } from '@/lib/auth';
import { http } from '@/lib/http';
import { useRouter } from 'next/navigation';
import { useUser, useUpdateUser } from '@/features/user/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { useUserRole } from '@/features/roles/hooks';

const ROLE_COLORS: Record<string, string> = {
  admin:    'badge badge-emerald',
  manager:  'badge badge-lime',
  employee: 'badge badge-slate',
  guest:    'badge badge-slate',
};

export default function SettingsPage() {
  const toast     = useToast();
  const router    = useRouter();
  const isClient  = useIsClient();
  const userId    = getUserId();
  const hasCreds  = isClient && isAuthed() && !!userId;

  const { data: userData, isLoading } = useUser(userId, hasCreds);
  const { data: userRole } = useUserRole(userId, hasCreds);
  const { mutate: updateUser, isPending: isSaving } = useUpdateUser();

  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [profession, setProfession] = useState('');
  const [tgId,       setTgId]       = useState('');
  const [avatarSrc,  setAvatarSrc]  = useState<string | undefined>();
  const [tab,        setTab]        = useState<'profile' | 'tokens' | 'about'>('profile');

  useEffect(() => {
    if (userData) {
      setFirstName(userData.firstName);
      setLastName(userData.lastName);
      setProfession(userData.specialization || userData.profession || '');
      setTgId(userData.tgId || '');
      setAvatarSrc(userData.avatarUrl);
    }
  }, [userData]);

  async function handleLogout() {
    try {
      // Сообщаем серверу о выходе (токен помечается как user_exit)
      await http('/auth/session', { method: 'DELETE' }).catch(() => {});
    } finally {
      clearTokens();
      router.replace('/login');
    }
  }

  function submit() {
    if (!userId) return;
    updateUser(
      { userId, payload: { first_name: firstName, last_name: lastName, email: userData?.email ?? '', profession, tg_id: tgId || undefined } },
      {
        onSuccess: () => toast.success('Профиль сохранён'),
        onError:   () => toast.error('Не удалось сохранить'),
      }
    );
  }

  const roleName = userRole?.role?.name ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || userData?.email || '';

  const TABS = [
    { id: 'profile' as const, label: 'Профиль' },
    { id: 'tokens'  as const, label: 'API-токены' },
    { id: 'about'   as const, label: 'О системе' },
  ];

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto animate-fade-in">
        <SkeletonProfileHeader />
        <div className="skeleton h-12 w-48 rounded-2xl" />
        <div className="grid gap-5 md:grid-cols-[280px,1fr]">
          <div className="t-surface rounded-2xl p-6 ring-1 ring-app space-y-5">
            <div className="skeleton w-20 h-20 rounded-full mx-auto" />
            <div className="space-y-2 text-center">
              <div className="skeleton h-4 w-32 mx-auto rounded-lg" />
              <div className="skeleton h-3 w-44 mx-auto rounded-lg" />
            </div>
          </div>
          <div className="t-surface rounded-2xl p-6 ring-1 ring-app space-y-5">
            <div className="skeleton h-5 w-36 rounded-lg" />
            <div className="grid sm:grid-cols-2 gap-4">
              <SkeletonField /><SkeletonField />
            </div>
            <SkeletonField /><SkeletonField /><SkeletonField />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto animate-fade-in">
      {/* ── Header card ── */}
      <div className="t-surface-accent rounded-2xl px-6 py-5 flex items-center gap-5 flex-wrap">
        <div className="rounded-full p-[2px] bg-gradient-to-br from-emerald-400/80 to-lime-400/80 shrink-0">
          <Avatar name={fullName} email={userData?.email} url={avatarSrc} size="lg" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="t-heading text-white truncate">{fullName || 'Загрузка…'}</div>
          <div className="t-body truncate">{userData?.email}</div>
          {roleName && (
            <span className={`mt-1 inline-flex ${ROLE_COLORS[roleName.toLowerCase()] ?? 'badge badge-slate'}`}>
              {roleName}
            </span>
          )}
        </div>
        <button onClick={handleLogout} className="btn-ghost text-red-400 hover:text-red-300 text-sm shrink-0">
          Выйти
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="t-surface rounded-2xl p-1.5 flex gap-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={[
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25'
                : 'text-app-2 hover:text-app hover:bg-app-hover',
            ].join(' ')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'profile' && (
        <div className="grid gap-5 md:grid-cols-[280px,1fr] animate-fade-in">
          {/* Avatar column */}
          <Panel className="p-6 flex flex-col items-center gap-5 text-center">
            <AvatarEditor
              name={fullName}
              src={avatarSrc}
              email={userData?.email}
              onChange={setAvatarSrc}
            />
            <div>
              <div className="font-semibold text-app">{fullName}</div>
              <div className="t-caption mt-0.5">{userData?.email}</div>
              {profession && <div className="t-caption mt-1">{profession}</div>}
            </div>
          </Panel>

          {/* Fields column */}
          <Panel className="p-6 space-y-5">
            <h2 className="t-title text-app">Личные данные</h2>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <TextField label="Имя"     value={firstName}  onChange={setFirstName}  placeholder="Иван"   />
                <TextField label="Фамилия" value={lastName}   onChange={setLastName}   placeholder="Иванов" />
              </div>
              <TextField label="Email" value={userData?.email ?? ''} onChange={() => {}} placeholder="ivan@company.com" type="email" disabled />
              <TextField label="Профессия / специализация" value={profession} onChange={setProfession} placeholder="Frontend Developer" />
              <TextField label="Telegram" value={tgId} onChange={setTgId} placeholder="@username" />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={submit}
                disabled={isSaving || isLoading}
                className="btn-primary px-6 py-2.5 disabled:opacity-50 press btn-shimmer"
              >
                {isSaving ? 'Сохранение…' : 'Сохранить изменения'}
              </button>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'tokens' && (
        <Panel className="p-6 animate-fade-in">
          <APITokens />
        </Panel>
      )}

      {tab === 'about' && <AboutSystem />}
    </div>
  );
}
