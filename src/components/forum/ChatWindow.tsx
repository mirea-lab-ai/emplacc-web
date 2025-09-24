'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type Message = {
  id: string;
  author: { id: string; name: string };
  text: string;
  ts: number;      // unix ms
  self?: boolean;  // сообщение текущего пользователя
};

export default function ChatWindow({
                                     taskTitle,
                                     messages,
                                     onSend,
                                   }: {
  taskTitle: string;
  messages: Message[];
  onSend: (text: string) => void;
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
    <div className="flex h-[calc(100vh-11rem)] min-h-[520px] flex-col rounded-2xl ring-1 ring-white/5 t-surface bg-white/5 border border-white/10">
      {/* header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div>
          <div className="text-lg font-semibold">{taskTitle}</div>
          <div className="text-slate-400 text-sm">Групповой чат по задаче</div>
        </div>
      </div>

      {/* messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
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
            disabled={!draft.trim()}
          >
            Отправить
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

  return (
    <div className={['flex items-end gap-2', isSelf ? 'justify-end' : ''].join(' ')}>
      {!isSelf && <Avatar name={msg.author.name} />}
      <div
        className={[
          'max-w-[70%] rounded-2xl px-4 py-2 ring-1',
          isSelf
            ? 'bg-gradient-to-br from-emerald-700 to-lime-600 text-white ring-white/10'
            : 't-accent-grad/20 text-slate-100 ring-white/10',
        ].join(' ')}
      >
        {!isSelf && <div className="text-xs text-slate-300 mb-1">{msg.author.name}</div>}
        <div className="whitespace-pre-wrap">{msg.text}</div>
        <div className={['mt-1 text-[11px]', isSelf ? 'text-white/80' : 'text-slate-400'].join(' ')}>
          {time}
        </div>
      </div>
      {isSelf && <Avatar name={msg.author.name} self />}
    </div>
  );
}

function Avatar({ name, self }: { name: string; self?: boolean }) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  }, [name]);

  return (
    <div className="rounded-full p-[2px] bg-gradient-to-br from-emerald-500 via-lime-400 to-cyan-400">
      <div className="h-8 w-8 rounded-full grid place-items-center bg-[#0f1422] text-xs font-semibold text-white">
        {initials || (self ? 'Я' : '🙂')}
      </div>
    </div>
  );
}
