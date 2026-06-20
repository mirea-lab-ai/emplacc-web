"use client";

import { useEffect } from 'react';
import Panel from '@/components/ui/Panel';
import { useProjectBoards } from '@/features/boards/hooks';
import { isAuthed } from '@/lib/auth';
import { useIsClient } from '@/hooks/useIsClient';

export default function ProjectsBoardList({
  projectId,
  activeBoardId,
  onSelect,
  onCreateBoard,
}: {
  projectId: string;
  activeBoardId?: string | null;
  onSelect: (boardId: string) => void;
  onCreateBoard?: () => void;
}) {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: boards, isLoading, error } = useProjectBoards(projectId, hasCreds);

  useEffect(() => {
    if (isLoading || error || !boards || boards.length === 0 || activeBoardId) {
      return;
    }
    onSelect(boards[0].id);
  }, [boards, isLoading, error, activeBoardId, onSelect]);

  return (
    <Panel className="p-4 t-surface">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Доски проекта</h3>
          <span className="text-xs text-app-2">
            {boards?.length ? `${boards.length} шт.` : ''}
          </span>
        </div>
        {onCreateBoard && (
          <button
            onClick={onCreateBoard}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            + Создать доску
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-app-2 text-sm">Загрузка досок…</div>
      ) : error ? (
        <div className="text-red-400 text-sm">Не удалось загрузить доски</div>
      ) : !boards || boards.length === 0 ? (
        <div className="text-app-2 text-sm">Для проекта ещё нет досок</div>
      ) : (
        <ul className="space-y-2">
          {boards.map((board) => {
            const active = board.id === activeBoardId;
            return (
              <li key={board.id}>
                <button
                  onClick={() => onSelect(board.id)}
                  className={[
                    'w-full rounded-xl px-4 py-2 text-left transition-colors ring-1 ring-app',
                    active
                      ? 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black font-semibold'
                      : 't-surface hover:bg-app-hover text-app-2',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{board.name ?? 'Без названия'}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
