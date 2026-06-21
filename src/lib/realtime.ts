'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSessionToken } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/publicEnv';

// Ключи react-query, которые инвалидируем при любом realtime-событии.
// Сейчас события эмитит только conveyor.createEvent (approvals/evidence/criteria/close/agent-runs),
// что затрагивает задачи, доски и conveyor-данные — инвалидируем их широко.
const INVALIDATE_KEYS: (readonly unknown[])[] = [
  ['conveyorPendingApprovals'],
  ['adminPendingApprovals'],
  ['conveyorApprovals'],
  ['conveyorSnapshot'],
  ['boardStatus'],
  ['boardTasks'],
  ['boardTasksByProjectAndBoard'],
  ['myTasks'],
  ['allTasks'],
  ['taskById'],
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
