'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import { MarkdownView } from '@/components/ui/MarkdownEditor';
import { useUser } from '@/features/user/hooks';
import { uploadImage, uploadFile } from '@/lib/upload';
import { playSend, playReceive } from '@/lib/sound';
import type { UIForumMessageReplyPreview } from '@/features/forum-messages/api';

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

export type MentionItem = { id: string; label: string; type: 'user' | 'task' | 'project' | 'team'; sub?: string };

// ── Mention format: @[Name](user:id) or #[Name](project:id) etc ──
function buildMentionText(trigger: '@' | '#', item: MentionItem): string {
  return `${trigger}[${item.label}](${item.type}:${item.id})`;
}

// Экранирование label, чтобы имя упоминания не могло вырваться из HTML-бейджа (XSS).
function escapeMentionLabel(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Renders structured mentions as styled HTML badges (consumed by MarkdownView via rehypeRaw).
// MarkdownView дополнительно прогоняет результат через allowlist-санитайзер, label здесь экранируется.
export function renderMentions(text: string): string {
  return text
    // Агент-тег "[agent <harness>]" — бейдж, чтобы сообщения агентов были видны (не сырой текст).
    .replace(/\[agent ([^\]]+)\]/g,
      (_m, name) => `<span style="display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:4px;font-size:0.75rem;font-weight:500;background:rgba(45,212,191,0.15);color:#5eead4;margin:0 2px">🤖 ${escapeMentionLabel(name)}</span>`)
    .replace(/@\[([^\]]+)\]\(user:([^)]+)\)/g,
      (_m, name, uid) => `<span class="mention-user mu-${escapeMentionLabel(uid)}" style="display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:0.75rem;font-weight:500;background:rgba(59,130,246,0.15);color:#93c5fd;margin:0 2px;cursor:pointer">@${escapeMentionLabel(name)}</span>`)
    // Проект — кликабельный чип-ссылка на страницу проекта.
    .replace(/#\[([^\]]+)\]\(project:([^)]+)\)/g,
      (_m, name, id) => `<a href="/projects/${encodeURIComponent(id)}" style="display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:0.75rem;font-weight:500;background:rgba(168,85,247,0.15);color:#c4b5fd;margin:0 2px;text-decoration:none">📁 ${escapeMentionLabel(name)}</a>`)
    // Команда — ссылка на раздел команд (отдельной страницы команды нет).
    .replace(/#\[([^\]]+)\]\(team:[^)]+\)/g,
      (_m, name) => `<a href="/teams" style="display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:0.75rem;font-weight:500;background:rgba(249,115,22,0.15);color:#fdba74;margin:0 2px;text-decoration:none">👥 ${escapeMentionLabel(name)}</a>`)
    // Задача — кликабельный чип-ссылка на страницу задачи (переход по упоминанию).
    .replace(/#\[([^\]]+)\]\(task:([^)]+)\)/g,
      (_m, name, id) => `<a href="/tasks/${encodeURIComponent(id)}" style="display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:0.75rem;font-weight:500;background:rgba(16,185,129,0.15);color:#6ee7b7;margin:0 2px;text-decoration:none">✅ ${escapeMentionLabel(name)}</a>`);
}

// Превращает mention-маркап в человекочитаемый текст для превью (цитата ответа,
// нотификации): @[Имя](user:id) → @Имя. Также срезает «висящий» обрезок разметки,
// если строку обрубили посреди упоминания (иначе в превью лезет сырой @[...]( ).
export function stripMentions(text: string): string {
  return text
    .replace(/\[agent [^\]]+\]\s*/g, '')                                   // тег агента
    .replace(/[@#]\[([^\]]+)\]\((?:user|task|project|team):[^)]+\)/g, (_m, name) => `@${name}`)
    .replace(/[@#]\[[^\]]*$/g, '')                                         // оборванное упоминание в конце (после побайтовой обрезки)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')                              // картинки → alt
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')                               // ссылки → текст
    .replace(/(\*\*|__)(.+?)\1/g, '$2')                                    // жирный
    .replace(/(\*|_)(.+?)\1/g, '$2')                                       // курсив
    .replace(/~~(.+?)~~/g, '$1')                                           // зачёркнутый
    .replace(/`([^`]+)`/g, '$1')                                           // инлайн-код
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')                                    // заголовки
    .replace(/^\s{0,3}[-*>]\s+/gm, '')                                     // маркеры списков/цитат
    .replace(/\s*\n\s*/g, ' ')                                             // переносы → пробел
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Extract mention IDs from text for notifications backend
export function extractMentions(text: string): { type: MentionItem['type']; id: string }[] {
  const result: { type: MentionItem['type']; id: string }[] = [];
  const re = /[@#]\[([^\]]+)\]\((user|task|project|team):([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    result.push({ type: m[2] as MentionItem['type'], id: m[3] });
  }
  return result;
}

type FilePreview = { url: string; file: File; type: 'image' | 'video' | 'other' };

function fileIcon(mime: string): string {
  if (mime.startsWith('video/')) return '🎬';
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('zip') || mime.includes('rar')) return '📦';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('sheet') || mime.includes('excel')) return '📊';
  return '📎';
}

export default function ChatWindow({
  taskTitle, messages, onSend, onDelete, onEdit,
  currentUserId, canManage = false,
  isLoading = false, error = null, isSending = false,
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
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; text: string; authorName: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionTrigger, setMentionTrigger] = useState<'@' | '#' | null>(null);
  // Режим отправки: Enter (по умолчанию) или Ctrl/Cmd+Enter.
  const [sendMode, setSendMode] = useState<'enter' | 'ctrl-enter'>(
    () => (typeof window !== 'undefined' && localStorage.getItem('emplacc-send-mode') === 'ctrl-enter') ? 'ctrl-enter' : 'enter',
  );
  const toggleSendMode = () => {
    const v = sendMode === 'enter' ? 'ctrl-enter' : 'enter';
    setSendMode(v);
    try { localStorage.setItem('emplacc-send-mode', v); } catch {}
  };

  const listRef     = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionCtx = useRef<{ node: Text; start: number; end: number } | null>(null);
  const [hoverUser, setHoverUser] = useState<{ uid: string; x: number; top: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: messages.length <= 1 ? 'instant' : 'smooth' });
  }, [messages.length]);

  // Звук на входящее сообщение: только при росте списка И если последнее сообщение
  // реально свежее (по времени) и не своё. Это отсекает первичную загрузку треда,
  // переключение тем и F5 (там сообщения исторические) — звук там не играет.
  const prevMsgCount = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevMsgCount.current;
    prevMsgCount.current = messages.length;
    if (prev === null || messages.length <= prev) return;
    const last = messages[messages.length - 1];
    if (last && !last.self && last.ts && Date.now() - last.ts < 15000) playReceive();
  }, [messages]);

  // При нажатии «Ответить» — авто-фокус в поле ввода.
  useEffect(() => {
    if (replyTo) editorRef.current?.focus();
  }, [replyTo]);

  // Внешние изменения draft (очистка после отправки) → перерисовать редактор с чипами.
  // Во время ввода serializeComposer(el) === draft, поэтому перерисовки/прыжка курсора нет.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (serializeComposer(el) !== draft) el.innerHTML = renderComposerHTML(draft);
  }, [draft]);

  const placeCaretEnd = (el: HTMLElement) => {
    const sel = window.getSelection();
    if (!sel) return;
    const r = document.createRange();
    r.selectNodeContents(el); r.collapse(false);
    sel.removeAllRanges(); sel.addRange(r);
  };

  const insertTextAtCaret = (text: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node); range.collapse(true);
    sel.removeAllRanges(); sel.addRange(range);
    if (editorRef.current) setDraft(serializeComposer(editorRef.current));
  };

  // Hover-карточка профиля на @-упоминаниях (делегирование на контейнере сообщений).
  const cancelHoverClose = () => { if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; } };
  const scheduleHoverClose = () => {
    if (hoverTimer.current) return; // уже запланировано — не продлеваем бесконечно
    hoverTimer.current = setTimeout(() => { hoverTimer.current = null; setHoverUser(null); }, 250);
  };
  const closeHoverNow = () => { cancelHoverClose(); setHoverUser(null); };
  // Один обработчик: над упоминанием — открыть карточку, иначе — запланировать закрытие.
  const onListOver = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest?.('.mention-user') as HTMLElement | null;
    if (el) {
      const uid = el.className.match(/\bmu-([0-9a-fA-F-]+)/)?.[1];
      if (!uid) return;
      cancelHoverClose();
      const r = el.getBoundingClientRect();
      // Флип по нижней границе СПИСКА сообщений (над композером), а не окна.
      const listBottom = listRef.current?.getBoundingClientRect().bottom ?? window.innerHeight;
      const CARD_H = 92;
      const top = r.bottom + CARD_H + 12 > listBottom ? Math.max(8, r.top - CARD_H - 6) : r.bottom + 6;
      setHoverUser(prev => (prev && prev.uid === uid ? prev : { uid, x: r.left, top }));
      return;
    }
    scheduleHoverClose();
  };

  const send = async () => {
    let text = draft.trim();
    if (isSending) return;

    if (previews.length > 0) {
      setUploading(true);
      try {
        const parts = await Promise.all(previews.map(async p => {
          if (p.type === 'image') {
            const { url } = await uploadImage(p.file);
            return `![${p.file.name}](${url})`;
          } else if (p.type === 'video') {
            const { url } = await uploadFile(p.file);
            return `<video src="${url}" controls style="max-width:100%;border-radius:8px;margin:4px 0"></video>`;
          } else {
            const { url } = await uploadFile(p.file);
            return `[${fileIcon(p.file.type)} ${p.file.name}](${url})`;
          }
        }));
        const mediaText = parts.join('\n');
        text = text ? `${text}\n${mediaText}` : mediaText;
        setPreviews([]);
      } catch {
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    if (!text) return;
    onSend(text, replyTo?.id);
    playSend();
    setDraft('');
    setReplyTo(null);
    editorRef.current?.focus();
  };

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mentionOpen) {
      if (e.key === 'Escape') { setMentionOpen(false); return; }
      if (e.key === 'Enter') { e.preventDefault(); return; }
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // Enter-режим: Enter — отправка, Shift+Enter — перенос.
    // Ctrl+Enter-режим: Ctrl/Cmd+Enter — отправка, Enter — перенос.
    const isSendCombo = sendMode === 'ctrl-enter' ? (e.ctrlKey || e.metaKey) : !e.shiftKey;
    if (isSendCombo) { void send(); return; }
    insertTextAtCaret('\n'); // перенос строки (white-space:pre-wrap отрисует)
  };

  const onEditorInput = () => {
    const el = editorRef.current;
    if (!el) return;
    setDraft(serializeComposer(el));
    detectMention();
  };

  // Детект @/# перед курсором для автокомплита упоминаний.
  const detectMention = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setMentionOpen(false); return; }
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) { setMentionOpen(false); return; }
    const textNode = node as Text;
    const offset = range.startOffset;
    const before = (textNode.nodeValue ?? '').slice(0, offset);
    const m = before.match(/(?:^|\s)([@#])(\S*)$/);
    if (!m) { setMentionOpen(false); return; }
    mentionCtx.current = { node: textNode, start: offset - m[2].length - 1, end: offset };
    setMentionTrigger(m[1] as '@' | '#');
    setMentionQuery(m[2]);
    setMentionOpen(true);
  };

  const insertMention = (item: MentionItem) => {
    const ctx = mentionCtx.current;
    const el = editorRef.current;
    if (!ctx || !el) { setMentionOpen(false); return; }
    const trigger = mentionTrigger ?? '@';
    const range = document.createRange();
    try {
      range.setStart(ctx.node, ctx.start);
      range.setEnd(ctx.node, ctx.end);
    } catch { setMentionOpen(false); return; }
    range.deleteContents();
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset.md = buildMentionText(trigger, item);
    chip.setAttribute('style', chipStyle(item.type));
    chip.textContent = (item.type === 'user' ? '@' : '#') + item.label;
    range.insertNode(chip);
    const space = document.createTextNode(' ');
    chip.after(space);
    const sel = window.getSelection();
    if (sel) { const r = document.createRange(); r.setStartAfter(space); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
    setDraft(serializeComposer(el));
    setMentionOpen(false);
    mentionCtx.current = null;
    el.focus();
  };

  const filteredMentions = useMemo(() => {
    if (!mentionOpen) return [];
    const q = mentionQuery.toLowerCase();
    return mentionItems
      .filter(m => mentionTrigger === '@' ? m.type === 'user' : m.type !== 'user')
      .filter(m => !q || m.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [mentionItems, mentionQuery, mentionTrigger, mentionOpen]);

  const addFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : 'other';
      setPreviews(p => [...p, { url, file, type }]);
    });
  }, []);

  const removePreview = (idx: number) => {
    setPreviews(p => { URL.revokeObjectURL(p[idx].url); return p.filter((_, i) => i !== idx); });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData.files;
    if (files.length > 0) { e.preventDefault(); addFiles(files); return; }
    // Текст вставляем как plain и токенизируем markup-упоминания в чипы.
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    insertTextAtCaret(text);
    const el = editorRef.current;
    if (el) { const md = serializeComposer(el); el.innerHTML = renderComposerHTML(md); placeCaretEnd(el); setDraft(md); }
  };

  const grouped = useMemo(() => messages.map((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const isService = m.author.email === 'system@system' || m.author.name === '🤖 Система';
    const prevSame = prev?.author.id === m.author.id && !isService;
    const nextSame = next?.author.id === m.author.id && !isService;
    const timeDiff = prev ? m.ts - prev.ts : Infinity;
    return {
      ...m, isService,
      isFirstInGroup: !prevSame || timeDiff > 5 * 60_000,
      isLastInGroup: !nextSame || (next ? next.ts - m.ts > 5 * 60_000 : true),
    };
  }), [messages]);

  const hasContent = draft.trim() || previews.length > 0;

  const mentionTypeIcon = (t: MentionItem['type']) =>
    ({ user: '👤', task: '✅', project: '📁', team: '👥' })[t];
  const mentionTypeBadge = (t: MentionItem['type']) => ({
    user: 'bg-blue-500/15 text-blue-300',
    task: 'bg-emerald-500/15 text-emerald-300',
    project: 'bg-purple-500/15 text-purple-300',
    team: 'bg-orange-500/15 text-orange-300',
  })[t];

  return (
    <div className="t-surface flex h-full w-full flex-col overflow-hidden"
         onDragOver={e => { e.preventDefault(); setDragOver(true); }}
         onDragLeave={() => setDragOver(false)}
         onDrop={onDrop}>

      {/* Header */}
      <div className="t-surface-elevated flex items-center gap-3 px-4 py-3 border-b border-app shrink-0"
           style={{ backdropFilter: 'blur(12px)' }}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-app truncate">{taskTitle}</div>
          <div className="text-xs text-emerald-400/70 mt-0.5">
            {isLoading ? 'загрузка…' : `${messages.length} ${plural(messages.length, 'сообщение', 'сообщения', 'сообщений')}`}
          </div>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] shrink-0"/>
      </div>

      {dragOver && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-emerald-900/40 backdrop-blur-sm border-2 border-dashed border-emerald-400/60 pointer-events-none">
          <div className="text-emerald-300 text-lg font-semibold">Отпустите файл</div>
        </div>
      )}

      {/* Messages */}
      {hoverUser && (
        <MentionHoverCard uid={hoverUser.uid} x={hoverUser.x} top={hoverUser.top}
          onEnter={cancelHoverClose} onLeave={scheduleHoverClose}/>
      )}
      <div ref={listRef} className="flex-1 overflow-y-auto custom-scroll px-4 py-4 space-y-0.5"
           onMouseOver={onListOver} onMouseLeave={scheduleHoverClose} onScroll={closeHoverNow}
           style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(var(--accent-rgb),0.03), transparent 60%)' }}>
        {isLoading && <div className="flex justify-center py-8"><span className="inline-block h-5 w-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin-slow"/></div>}
        {!isLoading && error && <div className="text-center text-red-400 py-8 text-sm">Ошибка загрузки</div>}
        {!isLoading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-50">
            <div className="text-4xl">💬</div>
            <div className="text-sm text-app-2">Начните обсуждение!</div>
          </div>
        )}
        {grouped.map(m => (
          m.isService
            ? <ServiceBubble key={m.id} text={m.text} ts={m.ts} />
            : <Bubble key={m.id} msg={m}
                isFirstInGroup={m.isFirstInGroup} isLastInGroup={m.isLastInGroup}
                isEditing={editingId === m.id} editDraft={editDraft}
                onEditDraftChange={setEditDraft}
                onEditSubmit={() => { if (editDraft.trim() && onEdit) { onEdit(m.id, editDraft.trim()); } setEditingId(null); }}
                onEditCancel={() => setEditingId(null)}
                canDelete={!!onDelete && (!!m.self || canManage)}
                canEdit={!!onEdit && !!m.self}
                onDelete={() => onDelete?.(m.id)}
                onEdit={() => { setEditingId(m.id); setEditDraft(m.text); }}
                onReply={() => setReplyTo({ id: m.id, text: stripMentions(m.text).slice(0, 80), authorName: m.author.name })}
              />
        ))}
        {(isSending || uploading) && (
          <div className="flex justify-end pr-1 mt-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl" style={{ background: 'rgba(var(--accent-rgb),0.2)' }}>
              {[0,1,2].map(i => <span key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" style={{ animationDelay: `${i*150}ms` }}/>)}
            </div>
          </div>
        )}
      </div>

      {/* File/image previews */}
      {previews.length > 0 && (
        <div className="t-surface-elevated flex gap-2 px-4 py-2 border-t border-app overflow-x-auto shrink-0">
          {previews.map((p, i) => (
            <div key={i} className="relative shrink-0 group">
              {p.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="h-16 w-16 object-cover rounded-xl ring-1 ring-app"/>
              ) : p.type === 'video' ? (
                <div className="h-16 w-24 rounded-xl ring-1 ring-app bg-black/40 grid place-items-center text-2xl">🎬</div>
              ) : (
                <div className="h-16 w-24 rounded-xl ring-1 ring-app bg-app-subtle flex flex-col items-center justify-center gap-1 px-2">
                  <span className="text-xl">{fileIcon(p.file.type)}</span>
                  <span className="text-[10px] text-app-2 truncate max-w-full">{p.file.name}</span>
                </div>
              )}
              <button onClick={() => removePreview(i)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div className="t-surface-elevated flex items-center gap-2 px-4 py-2 border-t border-app shrink-0">
          <div className="w-0.5 h-8 rounded-full bg-emerald-400/60 shrink-0"/>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-emerald-300 font-medium">{replyTo.authorName}</div>
            <div className="text-xs text-app-2 truncate">{replyTo.text}</div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-app-3 hover:text-app shrink-0">✕</button>
        </div>
      )}

      {/* Mention autocomplete */}
      {mentionOpen && filteredMentions.length > 0 && (
        <div className="t-surface-elevated mx-4 mb-1 rounded-xl border border-app overflow-hidden shrink-0"
             style={{ backdropFilter: 'blur(12px)' }}>
          {filteredMentions.map(item => (
            <button key={`${item.type}-${item.id}-${item.label}`} onClick={() => insertMention(item)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-app-hover transition-colors text-left">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${item.sub ? 'bg-emerald-500/20 text-emerald-200' : mentionTypeBadge(item.type)}`}>
                {item.sub ? '🔖 alias' : <>{mentionTypeIcon(item.type)} {item.type}</>}
              </span>
              <span className="text-app">{item.label}</span>
              {item.sub && <span className="text-app-3 text-xs">{item.sub}</span>}
            </button>
          ))}
        </div>
      )}
      {mentionOpen && filteredMentions.length === 0 && mentionQuery && (
        <div className="t-surface-elevated mx-4 mb-1 px-3 py-2 rounded-xl border border-app text-xs text-app-3 shrink-0">
          Ничего не найдено по «{mentionQuery}»
        </div>
      )}

      {/* Composer */}
      <div className="t-surface-elevated px-4 py-3 border-t border-app shrink-0 flex items-end gap-2"
           style={{ backdropFilter: 'blur(12px)' }}>
        <input ref={fileInputRef} type="file"
               multiple className="hidden"
               onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}/>

        <button onClick={() => fileInputRef.current?.click()} title="Прикрепить"
          className="text-app-3 hover:text-emerald-400 transition-colors pb-1 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
        </button>

        <div className="bg-app-subtle flex-1 flex items-end gap-2 rounded-2xl ring-1 ring-app px-3 py-2">
          <div className="relative flex-1">
            {!draft && (
              <span className="pointer-events-none absolute left-0 top-0 text-app-3 text-sm leading-relaxed select-none">
                Сообщение… (@человек, #задача, #проект, #команда)
              </span>
            )}
            <div ref={editorRef} contentEditable suppressContentEditableWarning
              role="textbox" aria-multiline="true"
              onInput={onEditorInput} onKeyDown={onEditorKeyDown} onPaste={onPaste}
              className="bg-transparent text-app focus:outline-none text-sm leading-relaxed min-h-[24px] max-h-40 overflow-y-auto whitespace-pre-wrap break-words"/>
          </div>
        </div>

        <button type="button" onClick={toggleSendMode}
          title={sendMode === 'ctrl-enter'
            ? 'Отправка: Ctrl+Enter (Enter — перенос строки). Нажми, чтобы переключить на Enter'
            : 'Отправка: Enter (Shift+Enter — перенос строки). Нажми, чтобы переключить на Ctrl+Enter'}
          aria-label="Режим отправки сообщения"
          className="shrink-0 self-end pb-2 px-1.5 text-[11px] font-medium text-app-3 hover:text-app-2 transition-colors whitespace-nowrap">
          {sendMode === 'ctrl-enter' ? '⌃↵' : '↵'}
        </button>

        <button onClick={() => void send()} disabled={!hasContent || isSending || uploading}
          className={`h-10 w-10 shrink-0 rounded-full grid place-items-center transition-all disabled:opacity-30 disabled:scale-90 press ${hasContent ? '' : 'bg-app-hover'}`}
          style={{ background: hasContent ? 'linear-gradient(135deg,var(--accent-start),var(--accent-end))' : undefined }}>
          <svg className={`w-4 h-4 transition-transform ${hasContent ? '-rotate-45 text-black' : 'text-app-3'}`}
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
  msg: Message; isFirstInGroup: boolean; isLastInGroup: boolean;
  isEditing: boolean; editDraft: string;
  onEditDraftChange: (v: string) => void; onEditSubmit: () => void; onEditCancel: () => void;
  canDelete: boolean; canEdit: boolean;
  onDelete: () => void; onEdit: () => void; onReply: () => void;
}) {
  const isSelf = !!msg.self;
  const [hovered, setHovered] = useState(false);
  const time = useMemo(() =>
    new Date(msg.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), [msg.ts]);
  const displayName = msg.author.name || 'Неизвестно';

  // Замер пузыря, чтобы построить clip-path под его реальный размер (под любой контент/высоту).
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth, h = el.offsetHeight;
      setDims(prev => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Фон пузыря единой фигурой: у последнего в группе — телеграмный хвостик (clip-path),
  // иначе скруглённый прямоугольник. Стекло/blur и тема сохраняются.
  const tailActive = isLastInGroup && !!dims;
  const bubbleBg: React.CSSProperties = {
    background: isSelf ? SELF_BUBBLE_BG : 'var(--surface-elevated)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    // Мягкая тень вместо inset-бордера: следует за формой с хвостом и не ломается на clip-path.
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.22))',
  };
  if (tailActive && dims) bubbleBg.clipPath = `path('${tgBubblePath(dims.w, dims.h, isSelf)}')`;
  else bubbleBg.borderRadius = 16;
  if (isSelf) { bubbleBg.left = 0; bubbleBg.right = tailActive ? -TAIL_OUT : 0; }
  else { bubbleBg.right = 0; bubbleBg.left = tailActive ? -TAIL_OUT : 0; }

  return (
    <div className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}
         onMouseEnter={() => setHovered(true)}
         onMouseLeave={() => setHovered(false)}>

      {/* Avatar placeholder for non-self */}
      {!isSelf && (
        <div className="w-8 shrink-0 self-end">
          {isLastInGroup
            ? <Avatar name={displayName} email={msg.author.email ?? undefined} url={msg.author.avatarUrl ?? undefined} fallbackKey={msg.author.id} size="sm"/>
            : null}
        </div>
      )}

      {/* Action bar — for self: left of bubble; for others: right */}
      {hovered && !isEditing && (
        <div className={`flex items-center gap-0.5 shrink-0 self-center ${isSelf ? 'order-first' : 'order-last'}`}>
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

      <div className="flex flex-col" style={{ maxWidth: '72%' }}>
        {!isSelf && isFirstInGroup && (
          <span className="text-xs font-semibold ml-3 mb-1" style={{ color: nameColor(msg.author.id) }}>
            {displayName}
          </span>
        )}

        {/* Reply preview */}
        {(msg.replyTo || msg.replyToId) && (
          <div className={`bg-app-subtle flex items-start gap-1.5 mb-1 px-3 py-1.5 rounded-xl text-xs opacity-70 ${isSelf ? 'self-end' : 'self-start'}`}
               style={{ maxWidth: '100%' }}>
            <div className="w-0.5 rounded-full bg-emerald-400/50 shrink-0 self-stretch min-h-[16px]"/>
            <div className="min-w-0">
              {msg.replyTo?.text ? (
                <>
                  <span className="font-medium text-emerald-300">{msg.replyTo.authorName}</span>
                  <p className="truncate text-app-2">{stripMentions(msg.replyTo.text)}</p>
                </>
              ) : (
                <p className="italic text-app-3">🗑 сообщение удалено</p>
              )}
            </div>
          </div>
        )}

        <div ref={bubbleRef} className="relative px-3 py-2 text-sm">
          <span aria-hidden className="absolute top-0 bottom-0 pointer-events-none" style={bubbleBg}/>
          <div className="relative">
          {isEditing ? (
            <div className="space-y-1.5">
              <textarea autoFocus value={editDraft}
                onChange={e => onEditDraftChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSubmit(); }
                  if (e.key === 'Escape') onEditCancel();
                }}
                rows={2}
                className="w-full bg-transparent text-white resize-none focus:outline-none text-sm"/>
              <div className="flex gap-2 justify-end">
                <button onClick={onEditCancel} className="text-xs text-slate-400 hover:text-white">Отмена</button>
                <button onClick={onEditSubmit} className="text-xs text-emerald-300 hover:text-emerald-200 font-medium">Сохранить</button>
              </div>
            </div>
          ) : (
            <div className={`prose prose-invert prose-sm max-w-none ${isSelf ? 'text-white/90' : 'text-app'}`}>
              <MarkdownView content={renderMentions(msg.text)}/>
            </div>
          )}

          <div className="flex items-center gap-1 mt-1 justify-end">
            <span className="text-[10px] opacity-60">{time}</span>
            {msg.isEdited && <span className="text-[10px] opacity-40">изм.</span>}
            {isSelf && (
              <svg className="w-3.5 h-3.5 text-emerald-300/70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 8.5l3.5 3.5L13 4.5"/>
              </svg>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ children, title, onClick, danger = false }: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button title={title} onClick={e => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-lg transition-colors ${danger ? 'text-app-3 hover:text-red-400 hover:bg-red-500/10' : 'text-app-3 hover:text-app hover:bg-app-hover'}`}>
      {children}
    </button>
  );
}

const TAIL_OUT = 6;
const SELF_BUBBLE_BG = 'linear-gradient(135deg, rgba(var(--accent-rgb),0.55), rgba(var(--accent-rgb-2),0.45))';

// Адаптивный путь пузыря с телеграмным хвостиком (точная геометрия из Figma «Telegram UI»).
// Хвост — снизу со стороны автора; тело и 3 обычных угла масштабируются под W×H.
function tgBubblePath(W: number, H: number, isSelf: boolean): string {
  const R = Math.min(18, H / 2 - 1, W / 2 - 1);
  const X = isSelf ? (x: number) => W - x : (x: number) => x + TAIL_OUT;
  return [
    `M ${X(R)} 0`,
    `L ${X(W - R)} 0`,
    `Q ${X(W)} 0 ${X(W)} ${R}`,
    `L ${X(W)} ${H - R}`,
    `Q ${X(W)} ${H} ${X(W - R)} ${H}`,
    `L ${X(17.245)} ${H}`,
    `C ${X(13.227)} ${H - 0.0001} ${X(9.532)} ${H - 1.3594} ${X(6.6)} ${H - 3.6338}`,
    `C ${X(3.374)} ${H - 0.9028} ${X(-0.722)} ${H + 0.2162} ${X(-5.662)} ${H - 0.2578}`,
    `C ${X(-5.803)} ${H - 0.2715} ${X(-5.931)} ${H - 0.3509} ${X(-6.004)} ${H - 0.4736}`,
    `C ${X(-6.107)} ${H - 0.645} ${X(-6.081)} ${H - 0.8557} ${X(-5.957)} ${H - 0.9971}`,
    `L ${X(-5.489)} ${H - 1.3018}`,
    `C ${X(-3.154)} ${H - 2.7183} ${X(-1.663)} ${H - 4.1649} ${X(-0.968)} ${H - 5.6309}`,
    `C ${X(-0.601)} ${H - 6.4072} ${X(-0.326)} ${H - 7.6696} ${X(-0.158)} ${H - 9.4424}`,
    `C ${X(0.01)} ${H - 11.2072} ${X(0.071)} ${H - 13.4546} ${X(0.022)} ${H - 16.1875}`,
    `L ${X(0)} ${R}`,
    `Q ${X(0)} 0 ${X(R)} 0`,
    'Z',
  ].join(' ');
}

// Карточка профиля при наведении на @-упоминание.
function MentionHoverCard({ uid, x, top, onEnter, onLeave }: {
  uid: string; x: number; top: number; onEnter: () => void; onLeave: () => void;
}) {
  const { data: user } = useUser(uid);
  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';
  const vw = typeof window !== 'undefined' ? window.innerWidth : 9999;
  const left = Math.max(8, Math.min(x, vw - 260));
  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}
      className="fixed z-50 t-surface-elevated rounded-xl ring-1 ring-app shadow-xl p-3 w-60 text-sm"
      style={{ left, top, backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-3">
        <Avatar name={name || '—'} url={user?.avatarUrl} email={user?.email} fallbackKey={uid} size="lg"/>
        <div className="min-w-0">
          <div className="font-semibold text-app truncate">{name || 'Загрузка…'}</div>
          {user?.profession && <div className="text-xs text-app-2 truncate">{user.profession}</div>}
          {user?.email && <div className="text-xs text-app-3 truncate">{user.email}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Composer: рендер токенов упоминаний как чипов (uuid скрыт) ─────────────
// Токен: @[имя](user:uuid) | #[имя](task|project|team:uuid)
const COMPOSER_TOKEN = /([@#])\[([^\]]+)\]\((user|task|project|team):([0-9a-fA-F-]+)\)/g;

function escapeHTML(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function chipStyle(kind: string): string {
  const c = kind === 'user' ? '#6ee7b7' : kind === 'task' ? '#fcd34d' : kind === 'project' ? '#93c5fd' : '#c4b5fd';
  const bg = kind === 'user' ? 'rgba(16,185,129,0.18)' : kind === 'task' ? 'rgba(250,204,21,0.16)' : kind === 'project' ? 'rgba(59,130,246,0.18)' : 'rgba(167,139,250,0.18)';
  return `display:inline-flex;align-items:center;padding:0 6px;margin:0 1px;border-radius:6px;background:${bg};color:${c};font-weight:500;white-space:nowrap;`;
}

// markup → HTML с чипами (для contenteditable). Переносы строки сохраняются как \n (white-space:pre-wrap).
function renderComposerHTML(md: string): string {
  let out = '', last = 0, m: RegExpExecArray | null;
  COMPOSER_TOKEN.lastIndex = 0;
  while ((m = COMPOSER_TOKEN.exec(md))) {
    out += escapeHTML(md.slice(last, m.index));
    const display = (m[3] === 'user' ? '@' : '#') + m[2];
    out += `<span contenteditable="false" data-md="${escapeHTML(m[0])}" style="${chipStyle(m[3])}">${escapeHTML(display)}</span>`;
    last = m.index + m[0].length;
  }
  out += escapeHTML(md.slice(last));
  return out;
}

// DOM contenteditable → markup (чипы возвращают свой data-md, текст и \n — как есть).
function serializeComposer(node: Node): string {
  let s = '';
  node.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) s += (n as Text).nodeValue ?? '';
    else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement;
      if (el.dataset && el.dataset.md !== undefined) s += el.dataset.md;
      else if (el.tagName === 'BR') s += '\n';
      else if (el.tagName === 'DIV' || el.tagName === 'P') { if (s && !s.endsWith('\n')) s += '\n'; s += serializeComposer(el); }
      else s += serializeComposer(el);
    }
  });
  return s;
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
