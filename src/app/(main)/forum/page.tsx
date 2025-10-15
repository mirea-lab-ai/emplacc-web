'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Panel from '@/components/ui/Panel';
import ChatWindow, { Message } from '@/components/forum/ChatWindow';
import CreateProblemModal from '@/components/forum/CreateProblemModal';
import { useAllProblems, useDeleteProblem } from '@/features/problems/hooks';
import { useForumMessagesByProblem, useCreateForumMessage } from '@/features/forum-messages/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';
import TrashIcon from '@/components/ui/icons/TrashIcon';
import DeleteProblemModal from '@/components/forum/DeleteProblemModal';

function ForumContent() {
  const searchParams = useSearchParams();
  const [activeProblemId, setActiveProblemId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; problemId: string; problemName: string }>({
    open: false,
    problemId: '',
    problemName: ''
  });

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
  const { mutate: deleteProblem, isPending: isDeleting } = useDeleteProblem();

  // Устанавливаем активную проблему из URL или первую доступную
  useEffect(() => {
    if (problems && problems.length > 0) {
      const problemFromUrl = searchParams.get('problem');
      
      if (problemFromUrl) {
        // Проверяем, существует ли проблема с таким ID
        const problemExists = problems.find(p => p.id === problemFromUrl);
        if (problemExists) {
          setActiveProblemId(problemFromUrl);
        } else {
          // Если проблема не найдена, выбираем первую
          setActiveProblemId(problems[0].id);
        }
      } else if (!activeProblemId) {
        // Если нет параметра в URL и нет активной проблемы, выбираем первую
        setActiveProblemId(problems[0].id);
      }
    }
  }, [problems, activeProblemId, searchParams]);

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

  const handleDeleteClick = (problemId: string, problemName: string) => {
    setDeleteModal({
      open: true,
      problemId,
      problemName
    });
  };

  const handleDeleteConfirm = () => {
    const { problemId } = deleteModal;
    deleteProblem(problemId, {
      onSuccess: () => {
        // Если удаляемая проблема была активной, сбрасываем активную проблему
        if (activeProblemId === problemId) {
          setActiveProblemId('');
        }
        setDeleteModal({ open: false, problemId: '', problemName: '' });
      },
      onError: (error) => {
        alert(`Ошибка удаления проблемы: ${error.message}`);
      },
    });
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ open: false, problemId: '', problemName: '' });
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
                  <div
                    key={problem.id}
                    className="group relative"
                  >
                    <button
                      onClick={() => setActiveProblemId(problem.id)}
                      className={[
                        'w-full text-left rounded-lg px-3 py-2 transition-colors',
                        activeProblemId === problem.id
                          ? 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-white/10',
                      ].join(' ')}
                    >
                      <div className="font-medium truncate pr-8">{problem.name}</div>
                      {problem.description && (
                        <div className="text-xs opacity-75 mt-1 line-clamp-2 truncate">
                          {problem.description}
                        </div>
                      )}
                    </button>
                    
                    {/* Иконка мусорки при наведении */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(problem.id, problem.name);
                      }}
                      disabled={isDeleting}
                      className={[
                        'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all opacity-0 group-hover:opacity-100',
                        'text-slate-400 hover:text-red-400 hover:bg-red-400/10',
                        isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                      ].join(' ')}
                      title="Удалить проблему"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
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

      <DeleteProblemModal
        open={deleteModal.open}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        problemName={deleteModal.problemName}
        isDeleting={isDeleting}
      />
    </main>
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForumContent />
    </Suspense>
  );
}