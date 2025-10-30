'use client';

import { useEffect, useMemo, useRef, useState, Suspense, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import Panel from '@/components/ui/Panel';
import ChatWindow, { Message } from '@/components/forum/ChatWindow';
import CreateProblemModal from '@/components/forum/CreateProblemModal';
import { useAllProblems, useDeleteProblem } from '@/features/problems/hooks';
import { useForumMessagesByProblem, useCreateForumMessage } from '@/features/forum-messages/hooks';
import { useAllUsers } from '@/features/user/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';
import { useUserRole } from '@/features/roles/hooks';
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
  const pendingProblemRef = useRef<string | null>(null);

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const userId = isClient ? getUserId() : null;
  const { data: userRole } = useUserRole(userId, hasCreds);
  const normalizedRole = userRole?.role?.name?.trim().toLowerCase();
  const isGuest = normalizedRole === 'guest';
  const router = useRouter();
  const pathname = usePathname();
  
  // Загружаем все проблемы
  const { data: problems, isLoading: problemsLoading, error: problemsError } = useAllProblems(1, 50, hasCreds);
  
  // Загружаем сообщения для активной проблемы
  const {
    data: forumMessages,
    isLoading: messagesLoading,
    error: messagesError,
    isFetching: messagesFetching,
  } = useForumMessagesByProblem(activeProblemId, 1, 50, hasCreds);

  const { data: users } = useAllUsers(1, 500, hasCreds);

  const usersMap = useMemo(() => {
    const map = new Map<string, { name: string; email?: string | null }>();
    (users ?? []).forEach((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
      map.set(u.id, {
        name: name || u.email || 'Неизвестно',
        email: u.email ?? null,
      });
    });
    return map;
  }, [users]);
  
  const { mutate: createMessage, isPending: isSending } = useCreateForumMessage();
  const { mutate: deleteProblem, isPending: isDeleting } = useDeleteProblem();

  // Add refetch and query invalidation logic here if needed
  const updateProblemInQuery = useCallback((problemId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (problemId) {
      params.set('problem', problemId);
    } else {
      params.delete('problem');
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  // Устанавливаем активную проблему из URL или первую доступную
  useEffect(() => {
    const problemFromUrl = searchParams.get('problem');
    const pendingSelection = pendingProblemRef.current;

    if (pendingSelection) {
      if (problemFromUrl === pendingSelection) {
        pendingProblemRef.current = null;
      } else {
        return;
      }
    }

    if (!problems || problems.length === 0) {
      pendingProblemRef.current = null;
      if (activeProblemId) {
        setActiveProblemId('');
      }
      if (problemFromUrl) {
        updateProblemInQuery(null);
      }
      return;
    }

    if (problemFromUrl && problems.some((p) => p.id === problemFromUrl)) {
      if (activeProblemId !== problemFromUrl) {
        setActiveProblemId(problemFromUrl);
      }
      return;
    }

    const hasActive = activeProblemId && problems.some((p) => p.id === activeProblemId);
    const fallback = hasActive ? activeProblemId : problems[0].id;

    if (activeProblemId !== fallback) {
      setActiveProblemId(fallback);
    }

    if (!problemFromUrl || problemFromUrl !== fallback) {
      updateProblemInQuery(fallback);
    }
  }, [problems, searchParams, updateProblemInQuery, activeProblemId]);

  const handleProblemSelect = (problemId: string) => {
    if (!problemId || problemId === activeProblemId) return;
    pendingProblemRef.current = problemId;
    setActiveProblemId(problemId);
    updateProblemInQuery(problemId);
  };

  const activeProblem = useMemo(
    () => problems?.find((p) => p.id === activeProblemId),
    [problems, activeProblemId]
  );

  // Преобразуем сообщения форума в формат для ChatWindow
  const messages: Message[] = useMemo(() => {
    if (!forumMessages) return [];
    const currentUserId = getUserId();

    return forumMessages
      .filter((msg) => msg.problemId === activeProblemId)
      .map((msg) => {
        const baseName = msg.authorName?.trim();
        const lookup = msg.authorId ? usersMap.get(msg.authorId) : undefined;
        const selfLookup = currentUserId ? usersMap.get(currentUserId) : undefined;
        const isSelf = msg.authorId === currentUserId;
        const resolvedName = baseName || lookup?.name || (isSelf ? selfLookup?.name ?? 'Я' : 'Неизвестно');

        return {
          id: msg.id,
          author: {
            id: msg.authorId || currentUserId || '',
            name: resolvedName,
            email: lookup?.email ?? (isSelf ? selfLookup?.email ?? null : null),
          },
          text: msg.content,
          ts: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
          self: isSelf,
        };
      });
  }, [forumMessages, usersMap, activeProblemId]);

  const hasMessagesForActiveProblem =
    !!forumMessages && forumMessages.some((msg) => msg.problemId === activeProblemId);
  const chatLoading = messagesLoading || (messagesFetching && !hasMessagesForActiveProblem);

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
          updateProblemInQuery(null);
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

  const containerClasses = ['w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8', isGuest ? '' : 'mx-auto max-w-6xl']
    .filter(Boolean)
    .join(' ');

  return (
    <main className="min-h-screen text-white">
      <div className={containerClasses}>
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* левая колонка — проблемы */}
          <Panel className="p-4 w-full space-y-3 t-surface border border-white/10 lg:w-[320px] lg:shrink-0 lg:sticky lg:top-6 lg:self-start lg:min-h-[520px] lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto custom-scroll">
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
                      onClick={() => handleProblemSelect(problem.id)}
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
                isLoading={chatLoading}
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
