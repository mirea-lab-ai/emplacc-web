'use client';
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications, fetchUnreadCount, markNotificationRead, markAllNotificationsRead,
} from './api';
import * as browserNotify from '@/lib/browserNotify';

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ['notificationsUnread'],
    queryFn: fetchUnreadCount,
    enabled,
    staleTime: 15_000,
  });
}

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(1, 30),
    enabled,
    staleTime: 15_000,
  });
}

// Мост: при росте кол-ва непрочитанных показываем браузерное уведомление
// (только если пользователь включил И браузер реально разрешил — см. browserNotify).
export function useBrowserNotificationBridge(enabled = true) {
  const { data: unread } = useUnreadCount(enabled);
  const prev = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (unread === undefined) return;
    const before = prev.current;
    prev.current = unread;
    if (before === undefined || unread <= before) return; // первый замер / без роста — молчим
    if (!browserNotify.effectivelyEnabled()) return;
    fetchNotifications(1, 1, true)
      .then((r) => {
        const n = r.notifications[0];
        if (n) browserNotify.show(n.title, n.body);
      })
      .catch(() => {});
  }, [unread]);
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notificationsUnread'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notificationsUnread'] });
    },
  });
}
