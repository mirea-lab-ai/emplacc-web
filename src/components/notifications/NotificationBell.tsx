'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { formatDateShort } from '@/lib/date';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '@/features/notifications/hooks';
import type { Notification } from '@/features/notifications/api';
import * as browserNotify from '@/lib/browserNotify';
import { soundMuted, setSoundMuted } from '@/lib/sound';

const ICON: Record<string, string> = {
  'task.assigned': '📌',
  'forum.reply': '💬',
  'conveyor.approval': '✅',
};

function entityHref(n: Notification): string | null {
  if (n.entity_id) {
    if (n.entity_type === 'task') return `/tasks/${n.entity_id}`;
    if (n.entity_type === 'problem') return `/forum?problem=${n.entity_id}`;
    if (n.entity_type === 'project') return `/projects/${n.entity_id}`;
  }
  // Fallback по типу события, если entity_id не пришёл.
  if (n.type?.startsWith('forum')) return '/forum';
  if (n.type?.startsWith('conveyor')) return '/admin/conveyor';
  return null;
}

export default function NotificationBell() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unread = 0 } = useUnreadCount(hasCreds);
  const { data, isLoading } = useNotifications(hasCreds && open);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const items = data?.notifications ?? [];

  // Мигаем счётчиком в заголовке вкладки — чтобы заметить уведомление, даже когда
  // вкладка неактивна.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = unread > 0 ? `(${unread}) ${base}` : base;
  }, [unread]);

  const [perm, setPerm] = useState<browserNotify.NotifyState>('default');
  const [muted, setMuted] = useState(false);
  useEffect(() => { if (open) { setPerm(browserNotify.permissionState()); setMuted(soundMuted()); } }, [open]);
  async function toggleBrowser() {
    if (browserNotify.effectivelyEnabled()) {
      browserNotify.disable();
      setPerm(browserNotify.permissionState());
    } else {
      setPerm(await browserNotify.enable());
    }
  }

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!hasCreds) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Уведомления"
        className="relative grid h-9 w-9 place-items-center rounded-xl text-app-2 hover:text-app hover:bg-app-hover transition-colors"
      >
        <span className={`text-lg ${unread > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`}>🔔</span>
        {unread > 0 && (
          <>
            {/* пульсирующее кольцо — привлекает внимание */}
            <span className="absolute -top-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-red-500/70 animate-ping" aria-hidden />
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-[var(--bg-app,#0b0f0d)]">
              {unread > 99 ? '99+' : unread}
            </span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-hidden rounded-2xl t-surface-elevated backdrop-blur-xl ring-1 ring-app z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <span className="font-semibold text-app">Уведомления</span>
            {unread > 0 && (
              <button onClick={() => markAll.mutate()} disabled={markAll.isPending}
                className="text-xs text-emerald-300 hover:text-emerald-200 disabled:opacity-50">
                Прочитать все
              </button>
            )}
          </div>

          {perm !== 'unsupported' && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-app">
              <span className="t-caption">🔔 Браузерные уведомления</span>
              {perm === 'denied' ? (
                <span className="text-xs text-app-3 cursor-help"
                  title="Браузер заблокировал уведомления. Разрешите их в настройках сайта (значок 🔒 слева от адреса → Уведомления → Разрешить), затем обновите страницу.">
                  заблокировано — как включить?
                </span>
              ) : (
                <button onClick={toggleBrowser}
                  className={`text-xs rounded-lg px-2 py-0.5 transition-colors ${
                    browserNotify.effectivelyEnabled()
                      ? 'text-emerald-300 bg-emerald-500/10'
                      : 'text-app-2 hover:text-app hover:bg-app-hover'
                  }`}>
                  {browserNotify.effectivelyEnabled() ? 'Вкл' : 'Включить'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2 border-b border-app">
            <span className="t-caption">{muted ? '🔇' : '🔊'} Звуки</span>
            <button onClick={() => { const v = !muted; setSoundMuted(v); setMuted(v); }}
              className={`text-xs rounded-lg px-2 py-0.5 transition-colors ${
                muted ? 'text-app-2 hover:text-app hover:bg-app-hover' : 'text-emerald-300 bg-emerald-500/10'
              }`}>
              {muted ? 'Выкл' : 'Вкл'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll">
            {isLoading ? (
              <div className="t-body px-4 py-6 text-center">Загрузка…</div>
            ) : items.length === 0 ? (
              <div className="t-caption px-4 py-8 text-center">Нет уведомлений</div>
            ) : (
              items.map((n) => {
                const href = entityHref(n);
                return (
                  <div key={n.id} className={`flex items-stretch ${n.read ? '' : 'bg-emerald-500/5'}`}>
                    {/* Клик по телу — пометить прочитанным (без перехода). */}
                    <button
                      onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                      title={n.read ? undefined : 'Отметить прочитанным'}
                      className="flex min-w-0 flex-1 gap-3 px-4 py-3 text-left transition-colors hover:bg-app-hover">
                      <span className="shrink-0 text-lg">{ICON[n.type] ?? '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-app truncate">{n.title}</span>
                          {!n.read && <span className="shrink-0 h-2 w-2 rounded-full bg-emerald-400" />}
                        </div>
                        {n.body && <div className="t-caption truncate mt-0.5">{n.body}</div>}
                        <div className="t-caption mt-0.5">{formatDateShort(n.created_at)}</div>
                      </div>
                    </button>
                    {/* Стрелка — открыть страницу-источник (и пометить прочитанным). */}
                    {href && (
                      <Link
                        href={href}
                        onClick={() => { if (!n.read) markRead.mutate(n.id); setOpen(false); }}
                        title="Открыть источник"
                        className="mr-3 grid h-8 w-8 shrink-0 self-center place-items-center rounded-lg bg-app-hover/50 text-app-3 ring-1 ring-app transition-colors hover:bg-emerald-500/20 hover:text-emerald-300 hover:ring-emerald-500/40">
                        →
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
