import { http } from '@/lib/http';

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  entity_type?: string;
  entity_id?: string;
  read: boolean;
  created_at: string;
};

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const b = await res.clone().json(); msg = b?.error ?? b?.message ?? msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchNotifications(page = 1, pageSize = 30, onlyUnread = false): Promise<{ notifications: Notification[]; total_count: number }> {
  const q = `page=${page}&pagesize=${pageSize}${onlyUnread ? '&unread=true' : ''}`;
  return jsonOrThrow(await http(`/notification?${q}`));
}

export async function fetchUnreadCount(): Promise<number> {
  const j = await jsonOrThrow(await http('/notification/unread-count'));
  return j?.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await jsonOrThrow(await http(`/notification/${encodeURIComponent(id)}/read`, { method: 'POST' }));
}

export async function markAllNotificationsRead(): Promise<void> {
  await jsonOrThrow(await http('/notification/read-all', { method: 'POST' }));
}
