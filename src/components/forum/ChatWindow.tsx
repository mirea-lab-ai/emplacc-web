'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Avatar from '@/components/ui/Avatar';

export type Message = {
  id: string;
  author: { id: string; name: string; email?: string | null; avatarUrl?: string | null };
  text: string;
  ts: number;      // unix ms
  self?: boolean;  // сообщение текущего пользователя
};

export default function ChatWindow({
                                     taskTitle,
                                     messages,
                                     onSend,
                                     isLoading = false,
                                     error = null,
                                     isSending = false,
                                   }: {
  taskTitle: string;
  messages: Message[];
  onSend: (text: string) => void;
  isLoading?: boolean;
  error?: Error | null;
  isSending?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  // автоскролл в конец при приходе новых сообщений
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const send = () => {
    const txt = draft.trim();
    if (!txt) return;
    onSend(txt);
    setDraft('');
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[520px] max-h-[85vh] w-full flex-col rounded-2xl border border-white/10 bg-white/5 ring-1 ring-white/5 t-surface">
      {/* header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div>
          <div className="text-lg font-semibold">{taskTitle}</div>
          <div className="text-slate-400 text-sm">Групповой чат по задаче</div>
        </div>
      </div>

      {/* messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {isLoading ? (
          <div className="text-slate-400 text-center py-8">Загрузка сообщений...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-8">Ошибка загрузки сообщений</div>
        ) : messages.length === 0 ? (
          <div className="text-slate-400 text-center py-8">Пока нет сообщений</div>
        ) : (
          messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))
        )}
      </div>

      {/* composer */}
      <div className="border-t border-white/5 p-4">
        <div className="flex items-end gap-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder="Напишите сообщение… (Shift+Enter — новая строка)"
            className="min-h-[56px] max-h-40 flex-1 rounded-xl t-surface text-slate-100 p-3 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <button
            onClick={send}
            className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-3 font-semibold text-black hover:brightness-110 active:translate-y-px disabled:opacity-60"
            disabled={!draft.trim() || isSending}
          >
            {isSending ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- bubble ---- */

function Bubble({ msg }: { msg: Message }) {
  const isSelf = !!msg.self;
  const time = useMemo(() => {
    const d = new Date(msg.ts);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }, [msg.ts]);

  const displayName = msg.author.name || 'Неизвестно';
  const avatarNode = (
    <Avatar
      name={displayName}
      email={msg.author.email ?? undefined}
      url={msg.author.avatarUrl ?? undefined}
      fallbackKey={msg.author.email ?? msg.author.id}
      size="sm"
    />
  );

  return (
    <div className={['flex items-end gap-2', isSelf ? 'justify-end' : ''].join(' ')}>
      {!isSelf && avatarNode}
      <div
        className={[
          'max-w-[70%] rounded-2xl px-4 py-2 ring-1',
          isSelf
            ? 'bg-gradient-to-br from-emerald-700 to-lime-600 text-white ring-white/10'
            : 't-accent-grad/20 text-slate-100 ring-white/10',
        ].join(' ')}
      >
        {!isSelf && <div className="text-xs text-slate-300 mb-1">{displayName}</div>}
        <div className="whitespace-pre-wrap">{msg.text}</div>
        <div className={['mt-1 text-[11px]', isSelf ? 'text-white/80' : 'text-slate-400'].join(' ')}>
          {time}
        </div>
      </div>
      {isSelf && avatarNode}
    </div>
  );
}
