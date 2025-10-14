'use client';

import { useEffect, useMemo, useState } from 'react';
import Panel from '@/components/ui/Panel';
import AvatarEditor from '@/components/settings/AvatarEditor';
import TextField from '@/components/settings/TextField';
import {clearTokens, getRefreshToken, getUserId} from "@/lib/auth";
import {apiLogout} from "@/features/auth/api";
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useUser, useUpdateUser } from '@/features/user/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';

type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  profession: string;
  tgId: string;
  avatarSrc?: string;
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    profession: '',
    tgId: '',
    avatarSrc: undefined,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>(
    {}
  );

  const isClient = useIsClient();
  const userId = getUserId();
  const hasCreds = isClient && isAuthed() && !!userId;
  
  const { data: userData, isLoading, error } = useUser(userId, hasCreds);
  const { mutate: updateUser, isPending: isSaving } = useUpdateUser();

  // Загружаем данные пользователя из API
  useEffect(() => {
    if (userData) {
      setData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        profession: userData.profession || '',
        tgId: userData.tgId || '',
        avatarSrc: undefined, // Аватар пока не поддерживается API
      });
    }
  }, [userData]);

  const onChange = <K extends keyof ProfileData,>(k: K, v: ProfileData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof ProfileData, string>> = {};
    if (!data.firstName.trim()) e.firstName = 'Имя обязательно';
    if (!data.lastName.trim()) e.lastName = 'Фамилия обязательна';
    if (!data.email.trim()) e.email = 'Email обязателен';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      e.email = 'Некорректный email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
    const router = useRouter();

  const submit = () => {
    if (!validate() || !userId) return;
    
    updateUser(
      {
        userId,
        payload: {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          profession: data.profession || undefined,
          tg_id: data.tgId || undefined,
        },
      },
      {
        onSuccess: () => {
          alert('Настройки сохранены успешно!');
        },
        onError: (error) => {
          alert(`Ошибка сохранения: ${error.message}`);
        },
      }
    );
  };

  const greeting = useMemo(() => {
    const first = data.firstName.trim();
    return first ? `Привет, ${first}!` : 'Профиль';
  }, [data.firstName]);

  return (
    <main className="min-h-screen text-white">
      <div className=" mx-auto max-w-5xl p-6 space-y-8">
        {/* верхняя панель */}


        {/* двухколоночный блок */}
        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6">
          {/* левая колонка — аватар и резюме */}
          <Panel className="p-6 flex flex-col items-center gap-4 backdrop-blur-md bg-white/5 border border-white/10">
            <AvatarEditor
              name={`${data.firstName} ${data.lastName}`.trim() || 'Пользователь'}
              src={data.avatarSrc}
              onChange={(src) => onChange('avatarSrc', src)}
            />
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                {data.firstName && data.lastName 
                  ? `${data.firstName} ${data.lastName}` 
                  : 'Без имени'
                }
              </div>
              <div className="text-slate-400 text-sm">
                {data.email || 'email не указан'}
              </div>
              {data.profession && (
                <div className="text-slate-300 text-sm mt-1">
                  {data.profession}
                </div>
              )}
            </div>
          </Panel>

          <Panel className="p-6 backdrop-blur-md bg-white/5 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Личные данные</h2>
            {isLoading ? (
              <div className="text-slate-400">Загрузка данных...</div>
            ) : error ? (
              <div className="text-red-400">Ошибка загрузки данных</div>
            ) : (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Имя"
                    value={data.firstName}
                    onChange={(v) => onChange('firstName', v)}
                    placeholder="Иван"
                    error={errors.firstName}
                    disabled
                  />
                  <TextField
                    label="Фамилия"
                    value={data.lastName}
                    onChange={(v) => onChange('lastName', v)}
                    placeholder="Иванов"
                    error={errors.lastName}
                    disabled
                  />
                </div>
                <TextField
                  label="Email"
                  value={data.email}
                  onChange={(v) => onChange('email', v)}
                  placeholder="ivan@company.com"
                  error={errors.email}
                  type="email"
                  disabled
                />
                <TextField
                  label="Профессия"
                  value={data.profession}
                  onChange={(v) => onChange('profession', v)}
                  placeholder="Frontend Developer"
                  disabled
                />
                <TextField
                  label="Telegram ID"
                  value={data.tgId}
                  onChange={(v) => onChange('tgId', v)}
                  placeholder="@username или user_id"
                />
              </div>
            )}

            {/* липкая зона сохранения */}
            <div className="sticky bottom-0 pt-6 mt-8">
              <div className="flex justify-end">
                <button
                  onClick={submit}
                  disabled={isSaving || isLoading}
                  className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-8 py-3 font-semibold text-black hover:brightness-110 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
