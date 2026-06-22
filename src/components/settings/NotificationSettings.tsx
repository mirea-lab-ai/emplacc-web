'use client';

import { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import { getEmailPref, setEmailPref } from '@/features/notifications/api';
import * as browserNotify from '@/lib/browserNotify';
import { soundMuted, setSoundMuted } from '@/lib/sound';

function ToggleRow({
  label, desc, on, onToggle, disabled,
}: { label: string; desc: string; on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-app/40 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-app">{label}</div>
        <div className="t-caption mt-0.5">{desc}</div>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-emerald-500/80' : 'bg-app-hover ring-1 ring-app'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export default function NotificationSettings() {
  const [email, setEmail] = useState(true);
  const [emailLoading, setEmailLoading] = useState(true);
  const [perm, setPerm] = useState<browserNotify.NotifyState>('default');
  const [browserOn, setBrowserOn] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    getEmailPref().then(setEmail).catch(() => {}).finally(() => setEmailLoading(false));
    setPerm(browserNotify.permissionState());
    setBrowserOn(browserNotify.effectivelyEnabled());
    setMuted(soundMuted());
  }, []);

  const toggleEmail = async () => {
    const v = !email;
    setEmail(v);
    try { await setEmailPref(v); } catch { setEmail(!v); }
  };
  const toggleBrowser = async () => {
    if (browserNotify.effectivelyEnabled()) browserNotify.disable();
    else await browserNotify.enable();
    setPerm(browserNotify.permissionState());
    setBrowserOn(browserNotify.effectivelyEnabled());
  };
  const toggleSound = () => { const v = !muted; setSoundMuted(v); setMuted(v); };

  return (
    <Panel className="p-6 animate-fade-in">
      <h2 className="t-title text-app mb-2">Уведомления</h2>
      <ToggleRow
        label="Email-уведомления"
        desc="Письма на вашу почту о назначенных задачах, упоминаниях и ответах"
        on={email}
        onToggle={toggleEmail}
        disabled={emailLoading}
      />
      <ToggleRow
        label="Браузерные уведомления"
        desc={perm === 'denied'
          ? 'Заблокировано в браузере — разрешите в настройках сайта, затем обновите страницу'
          : 'Системные push-уведомления, пока вкладка открыта'}
        on={browserOn}
        onToggle={toggleBrowser}
        disabled={perm === 'denied'}
      />
      <ToggleRow
        label="Звуки"
        desc="Звук при отправке и получении сообщений и при новых уведомлениях"
        on={!muted}
        onToggle={toggleSound}
      />
    </Panel>
  );
}
