'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import { MarkdownView } from '@/components/ui/MarkdownEditor';
import { uploadFile } from '@/lib/upload';
import type { UIForumMessage, UIForumMessageReplyPreview } from '@/features/forum-messages/api';

export type Message = {
  id: string;
  author: { id: string; name: string; email?: string | null; avatarUrl?: string | null };
  text: string;
  ts: number;
  self?: boolean;
  replyToId?: string | null;
  replyTo?: UIForumMessageReplyPreview | null;
  isEdited?: boolean;
};

type MentionItem = { id: string; label: string; type: 'user' | 'task' | 'project' | 'team' };

export default function ChatWindow({
  taskTitle,
  messages,
  onSend,
  onDelete,
  onEdit,
  currentUserId,
  canManage = false,
  isLoading = false,
  error = null,
  isSending = false,
  mentionItems = [],
}: {
  taskTitle: string;
  messages: Message[];
  onSend: (text: string, replyToId?: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newText: string) => void;
  currentUserId?: string;
  canManage?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  isSending?: boolean;
  mentionItems?: MentionItem[];
}) {
  const [draft, setDraft] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<{ url: string; file: File }[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; text: string; authorName: string } | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  // Mention autocomplete
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionTrigger, setMentionTrigger] = useState<'@' | '#' | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(0); // cursor position where trigger started

  const listRef      = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: messages.length <= 1 ? 'instant' : 'smooth' });
  }, [messages.length]);

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const send = async () => {
    let text = draft.trim();
    if (isSending) return;

    if (imagePreviews.length > 0) {
      setUploading(true);
      try {
        const urls = await Promise.all(
          imagePreviews.map(p => uploadFile(p.file).then(r => r.url))
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
    onSend(text, replyTo?.id);
    setDraft('');
    setReplyTo(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen) {
      if (e.key === 'Escape') { setMentionOpen(false); return; }
      if (e.key === 'Enter') { e.preventDefault(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  // Mention detection while typing
  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraft(val);
    resizeTextarea(e.target);

    const pos = e.target.selectionStart;
    const before = val.slice(0, pos);
    const atMatch = before.match(/(?:^|[\s])(@)(\S*)$/);
    const hashMatch = before.match(/(?:^|[\s])(#)(\S*)$/);

    if (atMatch) {
      setMentionTrigger('@');
      setMentionQuery(atMatch[2]);
      setMentionAnchor(pos - atMatch[2].length - 1);
      setMentionOpen(true);
    } else if (hashMatch) {
      setMentionTrigger('#');
      setMentionQuery(hashMatch[2]);
      setMentionAnchor(pos - hashMatch[2].length - 1);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = (item: MentionItem) => {
    const trigger = mentionTrigger ?? '@';
    const insertion = `${trigger}${item.label} `;
    const before = draft.slice(0, mentionAnchor);
    const after  = draft.slice(mentionAnchor + 1 + mentionQuery.length);
    setDraft(before + insertion + after);
    setMentionOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const filteredMentions = useMemo(() => {
    if (!mentionOpen || !mentionQuery && !mentionTrigger) return [];
    const q = mentionQuery.toLowerCase();
    return mentionItems
      .filter(m => {
        if (mentionTrigger === '@') return m.type === 'user';
        if (mentionTrigger === '#') return m.type !== 'user';
        return true;
      })
      .filter(m => m.label.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionItems, mentionQuery, mentionTrigger, mentionOpen]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const all = Array.from(files).filter(f => f.type.startsWith('image/'));
    all.forEach(file => {
      setImagePreviews(p => [...p, { url: URL.createObjectURL(file), file }]);
    });
  }, []);

  const removePreview = (idx: number) => {
    setImagePreviews(p => { URL.revokeObjectURL(p[idx].url); return p.filter((_, i) => i !== idx); });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditDraft(msg.text);
  };

  const submitEdit = (id: string) => {
    const text = editDraft.trim();
    if (text && onEdit) onEdit(id, text);
    setEditingId(null);
    setEditDraft('');
  };

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
  const mentionTypeIcon = (t: MentionItem['type']) =>
    t === 'user' ? '👤' : t === 'task' ? '✅' : t === 'project' ? '📁' : '👥';

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={{ background: 'rgba(5,14,8,0.95)' }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {/* Header */}
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

      {dragOver && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-emerald-900/40 backdrop-blur-sm border-2 border-dashed border-emerald-400/60 rounded-none pointer-events-none">
          <div className="text-emerald-300 text-lg font-semibold">Отпустите файл</div>
        </div>
      )}

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto custom-scroll px-4 py-4 space-y-0.5"
           style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(16,185,129,0.03), transparent 60%)' }}>
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
            : <Bubble
                key={m.id}
                msg={m}
                isFirstInGroup={m.isFirstInGroup}
                isLastInGroup={m.isLastInGroup}
                isEditing={editingId === m.id}
                editDraft={editDraft}
                onEditDraftChange={setEditDraft}
                onEditSubmit={() => submitEdit(m.id)}
                onEditCancel={() => { setEditingId(null); setEditDraft(''); }}
                canDelete={!!onDelete && (!!m.self || canManage)}
                canEdit={!!onEdit && !!m.self}
                onDelete={() => onDelete?.(m.id)}
                onEdit={() => startEdit(m)}
                onReply={() => setReplyTo({ id: m.id, text: m.text.slice(0, 80), authorName: m.author.name })}
              />
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

      {/* Image previews */}
      {imagePreviews.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-t border-white/6 overflow-x-auto"
             style={{ background: 'rgba(10,22,14,0.9)' }}>
          {imagePreviews.map((p, i) => (
            <div key={i} className="relative shrink-0 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-16 w-16 object-cover rounded-xl ring-1 ring-white/10"/>
              <button onClick={() => removePreview(i)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-white/6 shrink-0"
             style={{ background: 'rgba(10,22,14,0.9)' }}>
          <div className="w-0.5 h-8 rounded-full bg-emerald-400/60 shrink-0"/>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-emerald-300 font-medium">{replyTo.authorName}</div>
            <div className="text-xs text-slate-400 truncate">{replyTo.text}</div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-white transition-colors text-sm shrink-0">✕</button>
        </div>
      )}

      {/* Mention autocomplete */}
      {mentionOpen && filteredMentions.length > 0 && (
        <div className="mx-4 mb-1 rounded-xl border border-white/10 overflow-hidden shrink-0"
             style={{ background: 'rgba(10,22,14,0.97)', backdropFilter: 'blur(12px)' }}>
          {filteredMentions.map(item => (
            <button key={item.id}
              onClick={() => insertMention(item)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-left">
              <span>{mentionTypeIcon(item.type)}</span>
              <span className="text-white">{item.label}</span>
              <span className="text-slate-500 text-xs ml-auto">{item.type}</span>
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="px-4 py-3 border-t border-white/6 shrink-0 flex items-end gap-2"
           style={{ background: 'rgba(10,22,14,0.92)', backdropFilter: 'blur(12px)' }}>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
               onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}/>

        <button onClick={() => fileInputRef.current?.click()} title="Прикрепить"
          className="text-slate-500 hover:text-emerald-400 transition-colors pb-1 shrink-0">
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
            onChange={handleDraftChange}
            onKeyDown={onKey}
            onPaste={onPaste}
            placeholder="Сообщение… (@упомянуть, #задача)"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 resize-none focus:outline-none text-sm leading-relaxed min-h-[24px] max-h-40"
            style={{ height: '24px' }}
          />
        </div>

        <button
          onClick={() => void send()}
          disabled={!hasContent || isSending || uploading}
          className="h-10 w-10 shrink-0 rounded-full grid place-items-center transition-all disabled:opacity-30 disabled:scale-90 press"
          style={{ background: hasContent ? 'linear-gradient(135deg,#10b981,#84cc16)' : 'rgba(255,255,255,0.08)' }}>
          <svg className={`w-4 h-4 transition-transform ${hasContent ? '-rotate-45 text-black' : 'text-slate-500'}`}
               fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

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

function Bubble({
  msg, isFirstInGroup, isLastInGroup,
  isEditing, editDraft, onEditDraftChange, onEditSubmit, onEditCancel,
  canDelete, canEdit, onDelete, onEdit, onReply,
}: {
  msg: Message;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isEditing: boolean;
  editDraft: string;
  onEditDraftChange: (v: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  canDelete: boolean;
  canEdit: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onReply: () => void;
}) {
  const isSelf = !!msg.self;
  const [hovered, setHovered] = useState(false);
  const time = useMemo(() =>
    new Date(msg.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    [msg.ts]);
  const displayName = msg.author.name || 'Неизвестно';
  const br = isSelf
    ? `16px 16px ${isLastInGroup ? '4px' : '16px'} 16px`
    : `16px 16px 16px ${isLastInGroup ? '4px' : '16px'}`;

  return (
    <div
      className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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

        {/* Reply preview */}
        {msg.replyTo && (
          <div className={`flex items-start gap-1.5 mb-1 px-3 py-1.5 rounded-xl text-xs opacity-70 ${isSelf ? 'ml-auto' : ''}`}
               style={{ background: 'rgba(255,255,255,0.05)', maxWidth: '100%' }}>
            <div className="w-0.5 h-full rounded-full bg-emerald-400/50 shrink-0 self-stretch min-h-[16px]"/>
            <div className="min-w-0">
              <span className="font-medium text-emerald-300">{msg.replyTo.authorName}</span>
              <p className="truncate text-slate-400">{msg.replyTo.text}</p>
            </div>
          </div>
        )}

        <div className="relative px-3 py-2 text-sm group/bubble"
             style={{
               borderRadius: br,
               background: isSelf
                 ? 'linear-gradient(135deg, rgba(16,185,129,0.55), rgba(132,204,22,0.45))'
                 : 'rgba(255,255,255,0.08)',
               backdropFilter: 'blur(8px)',
               border: '1px solid rgba(255,255,255,0.06)',
             }}>
          {isLastInGroup && <Tail isSelf={isSelf}/>}

          {isEditing ? (
            <div className="space-y-1.5">
              <textarea
                autoFocus
                value={editDraft}
                onChange={e => onEditDraftChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSubmit(); }
                  if (e.key === 'Escape') onEditCancel();
                }}
                rows={2}
                className="w-full bg-transparent text-white resize-none focus:outline-none text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={onEditCancel} className="text-xs text-slate-400 hover:text-white">Отмена</button>
                <button onClick={onEditSubmit} className="text-xs text-emerald-300 hover:text-emerald-200 font-medium">Сохранить</button>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none text-white/90">
              <MarkdownView content={renderMentions(msg.text)} />
            </div>
          )}

          <div className="flex items-center gap-1 mt-1 justify-end">
            <span className="text-[10px] opacity-60">{time}</span>
            {msg.isEdited && <span className="text-[10px] opacity-40">изм.</span>}
            {isSelf && (
              <svg className="w-3.5 h-3.5 text-emerald-300/70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 8l4 4L14 4"/><path d="M5 8l4 4 5-8" opacity="0.5"/>
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      {hovered && !isEditing && (
        <div className={`flex items-center gap-0.5 shrink-0 self-center ${isSelf ? 'order-first' : ''}`}
             style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <ActionBtn title="Ответить" onClick={onReply}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M3 10h11a4 4 0 010 8h-1m-10-8l4-4m-4 4l4 4"/>
            </svg>
          </ActionBtn>
          {canEdit && (
            <ActionBtn title="Редактировать" onClick={onEdit}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </ActionBtn>
          )}
          {canDelete && (
            <ActionBtn title="Удалить" onClick={onDelete} danger>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
            </ActionBtn>
          )}
        </div>
      )}

      {isSelf && <div className="w-8 shrink-0"/>}
    </div>
  );
}

function ActionBtn({ children, title, onClick, danger = false }: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-lg transition-colors ${danger ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-white hover:bg-white/10'}`}>
      {children}
    </button>
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

function renderMentions(text: string): string {
  return text
    .replace(/@([\wЀ-ӿ]+(?:\s[\wЀ-ӿ]+)?)/g, '**@$1**')
    .replace(/#([\wЀ-ӿ]+(?:\s[\wЀ-ӿ]+)?)/g, '`#$1`');
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
