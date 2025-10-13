'use client';

import { useEffect, useMemo, useState } from 'react';
import Panel from '@/components/ui/Panel';
import ChatWindow, { Message } from '@/components/forum/ChatWindow';
import CreateProblemModal from '@/components/forum/CreateProblemModal';
import { useAllProblems } from '@/features/problems/hooks';
import { useForumMessagesByProblem, useCreateForumMessage } from '@/features/forum-messages/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';

export default function ForumPage() {
  const [activeProblemId, setActiveProblemId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  
  // Загружаем все проблемы
  const { data: problems, isLoading: problemsLoading, error: problemsError } = useAllProblems(1, 50, hasCreds);
  
  // Загружаем сообщения для активной проблемы
  const { data: forumMessages, isLoading: messagesLoading, error: messagesError } = useForumMessagesByProblem(
    activeProblemId, 
    1, 
    50, 
    hasCreds
  );
  
  const { mutate: createMessage, isPending: isSending } = useCreateForumMessage();

  // Устанавливаем первую проблему как активную при загрузке
  useEffect(() => {
    if (problems && problems.length > 0 && !activeProblemId) {
      setActiveProblemId(problems[0].id);
    }
  }, [problems, activeProblemId]);

  const activeProblem = useMemo(
    () => problems?.find((p) => p.id === activeProblemId),
    [problems, activeProblemId]
  );

  // Преобразуем сообщения форума в формат для ChatWindow
  const messages: Message[] = useMemo(() => {
    if (!forumMessages) return [];
    const currentUserId = getUserId();
    
    return forumMessages.map((msg) => ({
      id: msg.id,
      author: { id: msg.authorId || '', name: msg.authorName || 'Аноним' },
      text: msg.content,
      ts: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
      self: msg.authorId === currentUserId,
    }));
  }, [forumMessages]);

  const sendMessage = (text: string) => {
    if (!activeProblemId || !text.trim()) return;
    
    const userId = getUserId();
    if (!userId) {
      alert('Ошибка: пользователь не авторизован');
      return;
    }
    
    createMessage(
      {
        description: [text.trim()],
        problem_id: activeProblemId,
        creator_id: userId,
      },
      {
        onError: (error) => {
          alert(`Ошибка отправки сообщения: ${error.message}`);
        },
      }
    );
  };

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="flex gap-6">
          {/* левая колонка — проблемы */}
          <Panel className="p-4 w-[320px] shrink-0 sticky top-6 self-start min-h-[520px] t-surface border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Проблемы</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500 transition-colors"
              >
                + Новая проблема
              </button>
            </div>
            
            {problemsLoading ? (
              <div className="text-slate-400">Загрузка проблем...</div>
            ) : problemsError ? (
              <div className="text-red-400">Ошибка загрузки проблем</div>
            ) : !problems || problems.length === 0 ? (
              <div className="text-slate-400">Проблем пока нет</div>
            ) : (
              <div className="space-y-2">
                {problems.map((problem) => (
                  <button
                    key={problem.id}
                    onClick={() => setActiveProblemId(problem.id)}
                    className={[
                      'w-full text-left rounded-lg px-3 py-2 transition-colors',
                      activeProblemId === problem.id
                        ? 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-white/10',
                    ].join(' ')}
                  >
                    <div className="font-medium truncate">{problem.name}</div>
                    {problem.description && (
                      <div className="text-xs opacity-75 mt-1 line-clamp-2 truncate">
                        {problem.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Panel>

          {/* правая колонка — чат */}
          <div className="flex-1 min-w-0">
            {activeProblemId ? (
              <ChatWindow 
                taskTitle={activeProblem?.name || 'Проблема'} 
                messages={messages} 
                onSend={sendMessage}
                isLoading={messagesLoading}
                error={messagesError}
                isSending={isSending}
              />
            ) : (
              <Panel className="grid place-items-center min-h-[520px]">
                <div className="text-slate-400">Выберите проблему слева, чтобы открыть чат</div>
              </Panel>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateProblemModal onClose={() => setShowCreateModal(false)} />
      )}
    </main>
  );
}