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
];

/**
 * Подписка на серверные SSE-события (/v2/stream) и realtime-инвалидация кэшей.
 * Монтируется один раз (в Providers). EventSource сам переподключается при обрыве.
 */
export function useRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = getSessionToken();
    if (!token) return;

    const url = `${getApiBaseUrl()}/v2/stream?token=${encodeURIComponent(token)}`;
    let es: EventSource | null = null;
    try {
      es = new EventSource(url);
    } catch {
      return;
    }

    const onEvent = () => {
      for (const key of INVALIDATE_KEYS) {
        qc.invalidateQueries({ queryKey: key as unknown[] });
      }
    };

    // Сервер шлёт все realtime-события под именем "emplacc".
    es.addEventListener('emplacc', onEvent);

    return () => {
      es?.removeEventListener('emplacc', onEvent);
      es?.close();
    };
  }, [qc]);
}
