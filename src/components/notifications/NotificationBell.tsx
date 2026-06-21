'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { formatDateShort } from '@/lib/date';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '@/features/notifications/hooks';
import type { Notification } from '@/features/notifications/api';

const ICON: Record<string, string> = {
  'task.assigned': '📌',
  'forum.reply': '💬',
  'conveyor.approval': '✅',
};

function entityHref(n: Notification): string | null {
  if (n.entity_type === 'task' && n.entity_id) return `/tasks/${n.entity_id}`;
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
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-hidden rounded-2xl t-surface ring-1 ring-app shadow-xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <span className="font-semibold text-app">Уведомления</span>
            {unread > 0 && (
              <button onClick={() => markAll.mutate()} disabled={markAll.isPending}
                className="text-xs text-emerald-300 hover:text-emerald-200 disabled:opacity-50">
                Прочитать все
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll">
            {isLoading ? (
              <div className="t-body px-4 py-6 text-center">Загрузка…</div>
            ) : items.length === 0 ? (
              <div className="t-caption px-4 py-8 text-center">Нет уведомлений</div>
            ) : (
              items.map((n) => {
                const href = entityHref(n);
                const inner = (
                  <div className={`flex gap-3 px-4 py-3 transition-colors hover:bg-app-hover ${n.read ? '' : 'bg-emerald-500/5'}`}>
                    <span className="shrink-0 text-lg">{ICON[n.type] ?? '🔔'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-app truncate">{n.title}</span>
                        {!n.read && <span className="shrink-0 h-2 w-2 rounded-full bg-emerald-400" />}
                      </div>
                      {n.body && <div className="t-caption truncate mt-0.5">{n.body}</div>}
                      <div className="t-caption mt-0.5">{formatDateShort(n.created_at)}</div>
                    </div>
                  </div>
                );
                const handle = () => { if (!n.read) markRead.mutate(n.id); setOpen(false); };
                return href ? (
                  <Link key={n.id} href={href} onClick={handle} className="block">{inner}</Link>
                ) : (
                  <button key={n.id} onClick={handle} className="block w-full text-left">{inner}</button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
