'use client';

import { useEffect, useMemo, useState } from 'react';
import Panel from '@/components/ui/Panel';
import AvatarEditor from '@/components/settings/AvatarEditor';
import TextField from '@/components/settings/TextField';
import {clearTokens, getRefreshToken} from "@/lib/auth";
import {apiLogout} from "@/features/auth/api";
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

type ProfileData = {
  name: string;
  phone: string;
  telegram: string;
  workEmail: string;
  avatarSrc?: string;
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData>({
    name: '',
    phone: '',
    telegram: '',
    workEmail: '',
    avatarSrc: undefined,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>(
    {}
  );

  // демо-персист
  useEffect(() => {
    const raw = localStorage.getItem('profile');
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('profile', JSON.stringify(data));
  }, [data]);

  const onChange = <K extends keyof ProfileData,>(k: K, v: ProfileData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof ProfileData, string>> = {};
    if (data.workEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.workEmail))
      e.workEmail = 'Некорректный email';
    if (data.phone && !/^\+?\d{7,15}$/.test(data.phone))
      e.phone = 'Только цифры, можно с начальным +';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
    const router = useRouter();
    async function onLogout() {
        try {
            const rt = getRefreshToken();
            if (rt) await apiLogout(rt); // по спецификации
        } catch (_) {
        }
        clearTokens();
        router.replace('/login');
    }

  const submit = () => {
    if (!validate()) return;
    console.log('PROFILE SAVE =>', data);
    alert('Настройки сохранены (смотри консоль).');
  };

  const greeting = useMemo(() => {
    const first = data.name.trim().split(/\s+/)[0];
    return first ? `Привет, ${first}!` : 'Профиль';
  }, [data.name]);

  return (
    <main className="min-h-screen text-white">
      <button onClick={onLogout}>Выйти</button>
      <div className=" mx-auto max-w-5xl p-6 space-y-8">
        {/* верхняя панель */}


        {/* двухколоночный блок */}
        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6">
          {/* левая колонка — аватар и резюме */}
          <Panel className="p-6 flex flex-col items-center gap-4 backdrop-blur-md bg-white/5 border border-white/10">
            <AvatarEditor
              name={data.name}
              src={data.avatarSrc}
              onChange={(src) => onChange('avatarSrc', src)}
            />
            
            <div className="text-center">
              <div className="text-lg font-semibold">{data.name || 'Без имени'}</div>
              <div className="text-slate-400 text-sm">
                {data.workEmail || 'email не указан'}
              </div>
            </div>
            
            {/* маленькая карточка контактов */}
            <div className="mt-2 w-full rounded-xl bg-[#0f1422]/40 ring-1 ring-white/10 p-4">
              <div className="text-slate-300 text-sm">Контакты</div>
              <div className="mt-2 text-sm space-y-1">
                <div className="text-slate-200">
                  Телефон: <span className="text-slate-400">{data.phone || '—'}</span>
                </div>
                <div className="text-slate-200">
                  Telegram: <span className="text-slate-400">{data.telegram || '—'}</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-6 backdrop-blur-md bg-white/5 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Личные данные</h2>
            <div className="grid gap-4">
              <TextField
                label="ФИО"
                value={data.name}
                onChange={(v) => onChange('name', v)}
                placeholder="Иванов Иван Иванович"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Номер телефона"
                  value={data.phone}
                  onChange={(v) => onChange('phone', v)}
                  placeholder="+79991234567"
                  error={errors.phone}
                />
                <TextField
                  label="Telegram ID"
                  value={data.telegram}
                  onChange={(v) => onChange('telegram', v)}
                  placeholder="@username"
                />
              </div>
              <TextField
                label="Рабочая почта"
                value={data.workEmail}
                onChange={(v) => onChange('workEmail', v)}
                placeholder="you@company.com"
                error={errors.workEmail}
                type="email"
              />
            </div>

            {/* липкая зона сохранения */}
            <div className="sticky bottom-0 pt-6 mt-8">
              <div className="flex justify-end">
                <button
                  onClick={submit}
                  className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-8 py-3 font-semibold text-black hover:brightness-110 active:translate-y-px"
                >
                  Сохранить изменения
                </button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
