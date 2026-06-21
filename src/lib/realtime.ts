'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSessionToken } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/publicEnv';

// Ключи react-query, которые инвалидируем при любом realtime-событии.
// События эмитят conveyor (approvals/evidence/criteria/close/agent-runs) и сервисы
// задач/статусов/досок/форума (task.*, status.*, board.*, forum.message.*).
// Префикс-ключ инвалидирует все вложенные (['forumMessages'] → все ['forumMessages', id, …]).
const INVALIDATE_KEYS: (readonly unknown[])[] = [
  ['conveyorPendingApprovals'],
  ['adminPendingApprovals'],
  ['conveyorApprovals'],
  ['conveyorSnapshot'],
  ['boardStatus'],
  ['boardTasks'],
  ['boardTasksByProjectAndBoard'],
  ['projectBoards'],
  ['myTasks'],
  ['allTasks'],
  ['taskById'],
  ['allProblems'],
  ['adminRecentProblems'],
  ['forumMessages'],
  ['notifications'],
  ['notificationsUnread'],
];

/**
 * Подписка на серверные SSE-события (/v2/stream) и realtime-инвалидация кэшей.
 * Монтируется один раз (в Providers). EventSource сам переподключается при обрыве.
 */
export function useRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let es: EventSource | null = null;
    let activeToken: string | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const onEvent = () => {
      for (const key of INVALIDATE_KEYS) {
        qc.invalidateQueries({ queryKey: key as unknown[] });
      }
      // Для не-react-query потребителей (напр. панель дайджеста на ручном fetch).
      try { window.dispatchEvent(new Event('emplacc:realtime')); } catch {}
    };

    // (Пере)подключаемся к /v2/stream с актуальным токеном. EventSource сам
    // ретраит при обрыве, НО держит исходный URL: если токен протух/сменился —
    // ретраи будут с мёртвым токеном. Поэтому на ошибке проверяем смену токена и
    // пересоздаём поток, а если токена ещё нет — ждём и пробуем снова.
    const connect = () => {
      if (closed) return;
      const token = getSessionToken();
      if (!token) { retry = setTimeout(connect, 3000); return; }
      activeToken = token;
      try {
        es = new EventSource(`${getApiBaseUrl()}/v2/stream?token=${encodeURIComponent(token)}`);
      } catch {
        retry = setTimeout(connect, 3000);
        return;
      }
      es.addEventListener('emplacc', onEvent);
      es.onerror = () => {
        const current = getSessionToken();
        if (current && current !== activeToken) { es?.close(); connect(); }
        // иначе оставляем встроенный авто-ретрай EventSource
      };
    };

    // Ротация токена в этом же приложении (useTokenAutoRefresh) или в другой вкладке.
    const onTokenChange = () => {
      const current = getSessionToken();
      if (current && current !== activeToken) { es?.close(); connect(); }
    };
    window.addEventListener('storage', onTokenChange);
    window.addEventListener('emplacc:token', onTokenChange);

    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      window.removeEventListener('storage', onTokenChange);
      window.removeEventListener('emplacc:token', onTokenChange);
      es?.removeEventListener('emplacc', onEvent);
      es?.close();
    };
  }, [qc]);
}
