'use client';

import { useState } from 'react';
import { useAllProblems, useCreateProblem } from '@/features/problems/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import CreateProblemModal from '@/components/forum/CreateProblemModal';

type ProblemSelectorProps = {
  selectedProblems: Set<string>;
  onToggleProblem: (problemId: string) => void;
};

export default function ProblemSelector({ selectedProblems, onToggleProblem }: ProblemSelectorProps) {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: problems, isLoading } = useAllProblems(1, 100, hasCreds);
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading) {
    return <div className="text-slate-400">Загрузка проблем...</div>;
  }

  const selectedProblemsList = problems?.filter(p => selectedProblems.has(p.id)) || [];

  return (
    <div className="space-y-4">
      {/* Выбранные проблемы */}
      {selectedProblemsList.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Выбранные проблемы:</h4>
          <div className="flex gap-2 flex-wrap">
            {selectedProblemsList.map(problem => (
              <button
                key={problem.id}
                onClick={() => onToggleProblem(problem.id)}
                className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors"
              >
                {problem.name} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Список всех проблем */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-2">Все проблемы:</h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {/* Кнопка создания новой проблемы */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
          >
            + Создать проблему
          </button>

          {/* Список проблем */}
          {problems?.map(problem => {
            const isSelected = selectedProblems.has(problem.id);
            return (
              <button
                key={problem.id}
                onClick={() => onToggleProblem(problem.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-600/50'
                }`}
              >
                {problem.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Модалка создания проблемы */}
      {showCreateModal && (
        <CreateProblemModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
