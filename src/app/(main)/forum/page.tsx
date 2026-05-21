'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import Panel from '@/components/ui/Panel';
import { SkeletonText } from '@/components/ui/Skeleton';
import ChatWindow, { Message } from '@/components/forum/ChatWindow';
import CreateProblemModal from '@/components/forum/CreateProblemModal';
import EditProblemModal from '@/components/forum/EditProblemModal';
import DeleteProblemModal from '@/components/forum/DeleteProblemModal';
import { useAllProblems, useDeleteProblem } from '@/features/problems/hooks';
import { useForumMessagesByProblem, useCreateForumMessage, useDeleteForumMessage, useUpdateForumMessage } from '@/features/forum-messages/hooks';
import { useAllUsers } from '@/features/user/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';
import { useUserRole } from '@/features/roles/hooks';
import type { UIProblem } from '@/features/problems/api';

function ForumContent() {
  const searchParams  = useSearchParams();
  const pathname      = usePathname();
  const router        = useRouter();

  const [activeProblemId, setActiveProblemId] = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editProblem,  setEditProblem]  = useState<UIProblem | null>(null);
  const [deleteModal,  setDeleteModal]  = useState<{ open: boolean; problemId: string; problemName: string }>({ open: false, problemId: '', problemName: '' });
  const [search,       setSearch]       = useState('');
  const pendingRef = useRef<string | null>(null);

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const userId   = isClient ? getUserId() : null;

  const { data: userRole } = useUserRole(userId, hasCreds);
  const normalizedRole = userRole?.role?.name?.trim().toLowerCase();
  const isGuest    = normalizedRole === 'guest';
  const canManage  = normalizedRole === 'admin' || normalizedRole === 'manager';
  const canWrite   = !isGuest;

  const { data: problems,     isLoading: problemsLoading } = useAllProblems(1, 50, hasCreds);
  const { data: forumMessages, isLoading: messagesLoading, isFetching: messagesFetching }
    = useForumMessagesByProblem(activeProblemId, 1, 50, hasCreds);
  const { data: users } = useAllUsers(1, 500, hasCreds);

  const { mutate: createMessage, isPending: isSending } = useCreateForumMessage();
  const { mutate: deleteProblem, isPending: isDeleting } = useDeleteProblem();
  const { mutate: deleteMessage } = useDeleteForumMessage(activeProblemId);
  const { mutate: updateMessage } = useUpdateForumMessage(activeProblemId);

  // ID системного пользователя для сервисных сообщений
  const systemUserId = useMemo(
    () => users?.find(u => u.email === 'system@system')?.id ?? null,
    [users]
  );

  const usersMap = useMemo(() => {
    const map = new Map<string, { name: string; email?: string | null }>();
    (users ?? []).forEach(u => {
      const name = u.email === 'system@system'
        ? '🤖 Система'
        : [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || 'Неизвестно';
      map.set(u.id, { name, email: u.email ?? null });
    });
    return map;
  }, [users]);

  const updateQuery = useCallback((problemId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (problemId) params.set('problem', problemId);
    else params.delete('problem');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  // Синхронизация активной проблемы с URL
  useEffect(() => {
    const fromUrl = searchParams.get('problem');
    const pending = pendingRef.current;
    if (pending) {
      if (fromUrl === pending) pendingRef.current = null;
      else return;
    }
    if (!problems?.length) {
      if (activeProblemId) setActiveProblemId('');
      if (fromUrl) updateQuery(null);
      return;
    }
    if (fromUrl && problems.some(p => p.id === fromUrl)) {
      if (activeProblemId !== fromUrl) setActiveProblemId(fromUrl);
      return;
    }
    const fallback = (activeProblemId && problems.some(p => p.id === activeProblemId))
      ? activeProblemId
      : problems[0].id;
    if (activeProblemId !== fallback) setActiveProblemId(fallback);
    if (!fromUrl || fromUrl !== fallback) updateQuery(fallback);
  }, [problems, searchParams, updateQuery, activeProblemId]);

  const handleSelect = (id: string) => {
    if (!id || id === activeProblemId) return;
    pendingRef.current = id;
    setActiveProblemId(id);
    updateQuery(id);
  };

  const activeProblem = useMemo(() => problems?.find(p => p.id === activeProblemId), [problems, activeProblemId]);

  const filteredProblems = useMemo(() => {
    const q = search.toLowerCase();
    return q ? (problems ?? []).filter(p => p.name.toLowerCase().includes(q)) : (problems ?? []);
  }, [problems, search]);

  const messages: Message[] = useMemo(() => {
    if (!forumMessages) return [];
    const currentUserId = getUserId();
    return forumMessages
      .filter(m => m.problemId === activeProblemId)
      .map(m => {
        const isSelf = m.authorId === currentUserId;
        const lookup = m.authorId ? usersMap.get(m.authorId) : undefined;
        return {
          id: m.id,
          author: { id: m.authorId || currentUserId || '', name: m.authorName?.trim() || lookup?.name || (isSelf ? 'Я' : 'Неизвестно'), email: lookup?.email ?? null, avatarUrl: m.authorAvatarUrl ?? null },
          text: m.content,
          ts: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
          self: isSelf,
          replyToId: m.replyToId ?? null,
          replyTo: m.replyTo ?? null,
          isEdited: !!(m.updatedAt && m.createdAt && m.updatedAt !== m.createdAt),
        };
      });
  }, [forumMessages, usersMap, activeProblemId]);

  const chatLoading = messagesLoading || (messagesFetching && !forumMessages?.some(m => m.problemId === activeProblemId));

  const sendMessage = (text: string, replyToId?: string) => {
    if (!activeProblemId || !text.trim() || !userId) return;
    createMessage({ description: [text.trim()], problem_id: activeProblemId, creator_id: userId, reply_to_id: replyToId });
  };

  const mentionItems = useMemo(() =>
    (users ?? [])
      .filter(u => u.email !== 'system@system')
      .map(u => ({
        id: u.id,
        label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.id,
        type: 'user' as const,
      })),
    [users]
  );

  // Отправляем сервисное сообщение от системного пользователя
  const sendServiceMessage = useCallback((text: string) => {
    if (!activeProblemId) return;
    const from = systemUserId ?? userId;
    if (!from) return;
    createMessage({ description: [text], problem_id: activeProblemId, creator_id: from });
  }, [activeProblemId, systemUserId, userId, createMessage]);

  return (
    <div className="flex h-full min-h-0 gap-5 overflow-hidden animate-fade-in">
      {/* ── Sidebar ── */}
      <aside className="w-72 shrink-0 flex flex-col gap-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="t-heading text-white">Форум</h1>
          {canWrite && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary text-xs py-1.5 px-3 press btn-shimmer shrink-0"
            >
              + Новая
            </button>
          )}
        </div>

        {/* Search */}
        <div className="ring-focus rounded-xl">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск проблем…"
            className="t-input text-sm"
          />
        </div>

        {/* Problem list */}
        <div className="flex-1 overflow-y-auto space-y-1 custom-scroll pr-1">
          {problemsLoading ? (
            <div className="space-y-3 pt-2">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonText key={i} lines={2} />)}
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="t-body text-center py-8">
              {search ? 'Ничего не найдено' : 'Проблем пока нет'}
            </div>
          ) : (
            <div className="list-appear space-y-1">
              {filteredProblems.map(problem => {
                const active = problem.id === activeProblemId;
                return (
                  <div key={problem.id} className="group relative">
                    <button
                      onClick={() => handleSelect(problem.id)}
                      className={[
                        'w-full text-left rounded-xl px-3 py-2.5 transition-all duration-150 pr-16',
                        active
                          ? 'bg-gradient-to-r from-emerald-600/80 to-lime-500/80 text-white shadow-lg shadow-emerald-900/20'
                          : 't-surface-hover hover:ring-1 hover:ring-white/10 text-slate-300 hover:text-white',
                      ].join(' ')}
                    >
                      <div className="font-medium text-sm truncate">{problem.name}</div>
                      {problem.description && (
                        <div className={`text-xs mt-0.5 truncate ${active ? 'text-white/70' : 'text-slate-500'}`}>
                          {problem.description}
                        </div>
                      )}
                    </button>

                    {/* Кнопки действий */}
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canWrite && (
                        <button
                          onClick={e => { e.stopPropagation(); setEditProblem(problem); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                          title="Редактировать"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteModal({ open: true, problemId: problem.id, problemName: problem.name }); }}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                          title="Удалить"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── Chat ── */}
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
        {activeProblemId ? (
          <div className="h-full flex flex-col gap-3">
            {/* Problem header */}
            {activeProblem && (
              <div className="t-surface rounded-2xl px-5 py-3 flex items-center gap-3 shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{activeProblem.name}</div>
                  {activeProblem.description && (
                    <div className="t-caption truncate mt-0.5">{activeProblem.description}</div>
                  )}
                </div>
                {canWrite && (
                  <button
                    onClick={() => setEditProblem(activeProblem)}
                    className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                  >
                    ✏️ Редактировать
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 min-h-0">
              <ChatWindow
                taskTitle={activeProblem?.name ?? 'Обсуждение'}
                messages={messages}
                onSend={canWrite ? sendMessage : () => {}}
                onDelete={(id) => deleteMessage(id)}
                onEdit={(id, text) => updateMessage({ id, description: [text] })}
                currentUserId={userId ?? undefined}
                canManage={canManage}
                isLoading={chatLoading}
                error={null}
                isSending={isSending}
                mentionItems={mentionItems}
              />
            </div>
          </div>
        ) : (
          <Panel className="h-full grid place-items-center">
            <div className="text-center space-y-3">
              <div className="text-4xl">💬</div>
              <div className="t-title text-white">Выберите проблему</div>
              <div className="t-body">Выберите тему из списка слева чтобы начать обсуждение</div>
            </div>
          </Panel>
        )}
      </div>

      {/* Modals */}
      {showCreate && <CreateProblemModal onClose={() => setShowCreate(false)} />}
      {editProblem && (
        <EditProblemModal
          problem={editProblem}
          onClose={() => setEditProblem(null)}
          onRenamed={(oldName, newName) => {
            const currentUserName = userId ? (usersMap.get(userId)?.name ?? 'Пользователь') : 'Пользователь';
            sendServiceMessage(`✏️ ${currentUserName} переименовал(а) тему: «${oldName}» → «${newName}»`);
          }}
        />
      )}
      <DeleteProblemModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, problemId: '', problemName: '' })}
        onConfirm={() => {
          deleteProblem(deleteModal.problemId, {
            onSuccess: () => {
              if (activeProblemId === deleteModal.problemId) { setActiveProblemId(''); updateQuery(null); }
              setDeleteModal({ open: false, problemId: '', problemName: '' });
            },
          });
        }}
        problemName={deleteModal.problemName}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <span className="inline-block h-5 w-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin-slow"/>
      </div>
    }>
      <ForumContent />
    </Suspense>
  );
}
