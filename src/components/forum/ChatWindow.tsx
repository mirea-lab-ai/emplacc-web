'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import { MarkdownView } from '@/components/ui/MarkdownEditor';
import { uploadImage } from '@/lib/upload';

export type Message = {
  id: string;
  author: { id: string; name: string; email?: string | null; avatarUrl?: string | null };
  text: string;
  ts: number;
  self?: boolean;
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
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<{ url: string; file: File }[]>([]);

  const listRef     = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Автоскролл вниз
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: messages.length <= 1 ? 'instant' : 'smooth' });
  }, [messages.length]);

  // Авторазмер textarea
  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const send = async () => {
    let text = draft.trim();
    if (isSending) return;

    // Сначала загружаем все pending-фото
    if (imagePreviews.length > 0) {
      setUploading(true);
      try {
        const urls = await Promise.all(
          imagePreviews.map(p => uploadImage(p.file).then(r => r.url))
        );
        const imgMd = urls.map(u => `![image](${u})`).join('\n');
        text = text ? `${text}\n${imgMd}` : imgMd;
        setImagePreviews([]);
      } catch {
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    if (!text) return;
    onSend(text);
    setDraft('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Загрузка файлов
  const addFiles = useCallback((files: FileList | File[]) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
    imgs.forEach(file => {
      const url = URL.createObjectURL(file);
      setImagePreviews(p => [...p, { url, file }]);
    });
  }, []);

  const removePreview = (idx: number) => {
    setImagePreviews(p => {
      URL.revokeObjectURL(p[idx].url);
      return p.filter((_, i) => i !== idx);
    });
  };

  // Drag-and-drop
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  // Вставка из буфера
  const onPaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      e.preventDefault();
      addFiles(files);
    }
  };

  // Группировка: одинаковый автор подряд = одна группа
  const grouped = useMemo(() => {
    return messages.map((m, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const isService = m.author.email === 'system@system' || m.author.name === '🤖 Система';
      const prevSame = prev?.author.id === m.author.id && !isService;
      const nextSame = next?.author.id === m.author.id && !isService;
      const timeDiff = prev ? m.ts - prev.ts : Infinity;
      const isFirstInGroup = !prevSame || timeDiff > 5 * 60_000;
      const isLastInGroup  = !nextSame || (next ? next.ts - m.ts > 5 * 60_000 : true);
      return { ...m, isService, isFirstInGroup, isLastInGroup };
    });
  }, [messages]);

  const hasContent = draft.trim() || imagePreviews.length > 0;

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={{ background: 'rgba(5,14,8,0.95)' }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6 shrink-0"
           style={{ background: 'rgba(10,22,14,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{taskTitle}</div>
          <div className="text-xs text-emerald-400/70 mt-0.5">
            {isLoading ? 'загрузка…' : `${messages.length} ${plural(messages.length, 'сообщение', 'сообщения', 'сообщений')}`}
          </div>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] shrink-0"/>
      </div>

      {/* ── Drag overlay ── */}
      {dragOver && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-emerald-900/40 backdrop-blur-sm border-2 border-dashed border-emerald-400/60 rounded-none pointer-events-none">
          <div className="text-emerald-300 text-lg font-semibold">Отпустите изображение</div>
        </div>
      )}

      {/* ── Messages ── */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto custom-scroll px-4 py-4 space-y-0.5"
        style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(16,185,129,0.03), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(132,204,22,0.02), transparent 60%)' }}
      >
        {isLoading && (
          <div className="flex justify-center py-8">
            <span className="inline-block h-5 w-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin-slow"/>
          </div>
        )}
        {!isLoading && error && <div className="text-center text-red-400 py-8 text-sm">Ошибка загрузки</div>}
        {!isLoading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-50">
            <div className="text-4xl">💬</div>
            <div className="text-sm text-slate-400">Начните обсуждение!</div>
          </div>
        )}
        {grouped.map(m => (
          m.isService
            ? <ServiceBubble key={m.id} text={m.text} ts={m.ts} />
            : <Bubble key={m.id} msg={m} isFirstInGroup={m.isFirstInGroup} isLastInGroup={m.isLastInGroup} />
        ))}
        {(isSending || uploading) && (
          <div className="flex justify-end pr-1 mt-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl rounded-br-sm"
                 style={{ background: 'rgba(16,185,129,0.2)' }}>
              {[0,1,2].map(i => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft"
                      style={{ animationDelay: `${i*150}ms` }}/>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Image previews ── */}
      {imagePreviews.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-t border-white/6 overflow-x-auto"
             style={{ background: 'rgba(10,22,14,0.9)' }}>
          {imagePreviews.map((p, i) => (
            <div key={i} className="relative shrink-0 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-16 w-16 object-cover rounded-xl ring-1 ring-white/10"/>
              <button
                onClick={() => removePreview(i)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
              >✕</button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-16 w-16 shrink-0 rounded-xl border-2 border-dashed border-white/20 grid place-items-center text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors text-2xl"
          >+</button>
        </div>
      )}

      {/* ── Composer ── */}
      <div className="px-4 py-3 border-t border-white/6 shrink-0 flex items-end gap-2"
           style={{ background: 'rgba(10,22,14,0.92)', backdropFilter: 'blur(12px)' }}>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
               onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}/>

        {/* Clip / image button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Прикрепить изображение"
          className="text-slate-500 hover:text-emerald-400 transition-colors pb-1 shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
        </button>

        <div className="flex-1 flex items-end gap-2 rounded-2xl ring-1 ring-white/8 px-3 py-2"
             style={{ background: 'rgba(255,255,255,0.05)' }}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={e => { setDraft(e.target.value); resizeTextarea(e.target); }}
            onKeyDown={onKey}
            onPaste={onPaste}
            placeholder="Сообщение…"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 resize-none focus:outline-none text-sm leading-relaxed min-h-[24px] max-h-40"
            style={{ height: '24px' }}
          />
        </div>

        <button
          onClick={send}
          disabled={!hasContent || isSending || uploading}
          className="h-10 w-10 shrink-0 rounded-full grid place-items-center transition-all disabled:opacity-30 disabled:scale-90 press"
          style={{ background: hasContent ? 'linear-gradient(135deg,#10b981,#84cc16)' : 'rgba(255,255,255,0.08)' }}
        >
          <svg className={`w-4 h-4 transition-transform ${hasContent ? '-rotate-45 text-black' : 'text-slate-500'}`}
               fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Сервисное сообщение (центр, как в TG) ── */
function ServiceBubble({ text, ts }: { text: string; ts: number }) {
  const time = new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex justify-center my-3">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-slate-300 select-none"
           style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
        <span>{text}</span>
        <span className="opacity-50">{time}</span>
      </div>
    </div>
  );
}

/* ── Обычный пузырь ── */
function Bubble({ msg, isFirstInGroup, isLastInGroup }: {
  msg: Message; isFirstInGroup: boolean; isLastInGroup: boolean;
}) {
  const isSelf = !!msg.self;
  const time = useMemo(() =>
    new Date(msg.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    [msg.ts]);
  const displayName = msg.author.name || 'Неизвестно';
  const br = isSelf
    ? `16px 16px ${isLastInGroup ? '4px' : '16px'} 16px`
    : `16px 16px 16px ${isLastInGroup ? '4px' : '16px'}`;

  return (
    <div className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}>
      {!isSelf && (
        <div className="w-8 shrink-0 self-end">
          {isLastInGroup
            ? <Avatar name={displayName} email={msg.author.email ?? undefined} url={msg.author.avatarUrl ?? undefined} fallbackKey={msg.author.id} size="sm"/>
            : null}
        </div>
      )}

      <div className="flex flex-col max-w-[72%]">
        {!isSelf && isFirstInGroup && (
          <span className="text-xs font-semibold ml-3 mb-1" style={{ color: nameColor(msg.author.id) }}>
            {displayName}
          </span>
        )}

        <div className="relative px-3 py-2 text-sm"
             style={{
               borderRadius: br,
               background: isSelf
                 ? 'linear-gradient(135deg, rgba(16,185,129,0.55), rgba(132,204,22,0.45))'
                 : 'rgba(255,255,255,0.08)',
               backdropFilter: 'blur(8px)',
               border: '1px solid rgba(255,255,255,0.06)',
             }}>
          {isLastInGroup && <Tail isSelf={isSelf}/>}

          <div className="prose prose-invert prose-sm max-w-none text-white/90">
            <MarkdownView content={msg.text}/>
          </div>

          <div className="flex items-center gap-1 mt-1 justify-end">
            <span className="text-[10px] opacity-60">{time}</span>
            {isSelf && (
              <svg className="w-3.5 h-3.5 text-emerald-300/70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 8l4 4L14 4"/>
                <path d="M5 8l4 4 5-8" opacity="0.5"/>
              </svg>
            )}
          </div>
        </div>
      </div>

      {isSelf && <div className="w-8 shrink-0"/>}
    </div>
  );
}

function Tail({ isSelf }: { isSelf: boolean }) {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13"
         className="absolute bottom-0 pointer-events-none"
         style={{ [isSelf ? 'right' : 'left']: '-7px' }}>
      {isSelf
        ? <path d="M8 0 Q8 10 0 13 Q4 8 5 0 Z" fill="rgba(16,185,129,0.45)"/>
        : <path d="M0 0 Q0 10 8 13 Q4 8 3 0 Z" fill="rgba(255,255,255,0.08)"/>}
    </svg>
  );
}

const COLORS = ['#e17076','#faa774','#b0d060','#6eccca','#65aced','#a695e7','#ee7aae'];
function nameColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return few;
  return many;
}
