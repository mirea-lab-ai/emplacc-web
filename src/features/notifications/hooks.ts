'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications, fetchUnreadCount, markNotificationRead, markAllNotificationsRead,
} from './api';

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
