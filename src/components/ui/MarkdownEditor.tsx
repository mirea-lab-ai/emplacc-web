'use client';

import { useRef, useState, useEffect, useCallback, useMemo, type DragEvent, type ChangeEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { uploadImage, uploadFile, isPresignedUrl, isPresignedExpired, refreshPresignedUrl } from '@/lib/upload';
import { renderMentions, type MentionItem } from '@/components/forum/ChatWindow';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  withImages?: boolean;
  mentionItems?: MentionItem[];
};

function fileIcon(type: string) {
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf'))      return '📄';
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '📦';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  return '📎';
}

function buildMarkdown(file: File, url: string): string {
  if (file.type.startsWith('image/')) {
    return `![${file.name}](${url})`;
  }
  if (file.type.startsWith('video/')) {
    return `<video src="${url}" controls style="max-width:100%;border-radius:8px;margin:8px 0"></video>`;
  }
  return `[${fileIcon(file.type)} ${file.name}](${url})`;
}

export default function MarkdownEditor({
  value, onChange, placeholder = 'Описание в формате Markdown…',
  rows = 8, disabled = false, withImages = true, mentionItems = [],
}: Props) {
  const [tab, setTab]           = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]  = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionTrigger, setMentionTrigger] = useState<'@' | '#' | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertAtCursor = useCallback((before: string, after = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd   = start + before.length + selected.length;
    });
  }, [value, onChange]);

  const valueRef = useRef(value);
  valueRef.current = value;

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    const loadingText = `[загрузка ${file.name}…](uploading)`;
    const pos = textareaRef.current?.selectionStart ?? valueRef.current.length;
    onChange(valueRef.current.slice(0, pos) + loadingText + valueRef.current.slice(pos));
    try {
      let url: string;
      if (file.type.startsWith('image/')) {
        ({ url } = await uploadImage(file));
      } else {
        ({ url } = await uploadFile(file));
      }
      onChange(valueRef.current.replace(loadingText, buildMarkdown(file, url)));
    } catch {
      onChange(valueRef.current.replace(loadingText, ''));
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUpload(file);
    e.target.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleUpload(file);
  };

  const TOOLBAR = [
    { icon: 'B',   title: 'Жирный',      wrap: ['**', '**'] },
    { icon: 'I',   title: 'Курсив',       wrap: ['*', '*'] },
    { icon: '~~',  title: 'Зачёркнутый',  wrap: ['~~', '~~'] },
    { icon: '<>',  title: 'Код',          wrap: ['`', '`'] },
    { icon: '```', title: 'Блок кода',    wrap: ['```\n', '\n```'] },
    { icon: '—',   title: 'Заголовок H2', wrap: ['## ', ''] },
    { icon: '•',   title: 'Список',       wrap: ['\n- ', ''] },
    { icon: '1.',  title: 'Нум. список',  wrap: ['\n1. ', ''] },
  ] as const;

  return (
    <div
      className={`rounded-xl ring-1 overflow-hidden transition-all ${dragOver ? 'ring-emerald-500/60 bg-emerald-500/5' : 'ring-app'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {/* Tab bar + toolbar */}
      <div className="flex items-center gap-1 bg-app-subtle border-b border-app px-2 py-1.5 flex-wrap">
        <button onClick={() => setTab('write')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${tab === 'write' ? 'bg-app-hover text-app' : 'text-app-2 hover:text-app'}`}>
          Редактор
        </button>
        <button onClick={() => setTab('preview')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${tab === 'preview' ? 'bg-app-hover text-app' : 'text-app-2 hover:text-app'}`}>
          Предпросмотр
        </button>

        {tab === 'write' && (
          <div className="flex items-center gap-0.5 ml-2 border-l border-app pl-2 flex-wrap">
            {TOOLBAR.map(t => (
              <button key={t.icon} type="button" title={t.title} aria-label={t.title} disabled={disabled}
                onClick={() => insertAtCursor(t.wrap[0], t.wrap[1])}
                className="px-1.5 py-1 text-xs text-app-2 hover:text-app hover:bg-app-subtle rounded transition-colors disabled:opacity-40 font-mono">
                {t.icon}
              </button>
            ))}
            {withImages && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"

                  className="hidden"
                  onChange={onFileInput}
                />
                <div className="w-px h-4 bg-app-hover mx-1" />
                <button
                  type="button"
                  title="Загрузить изображение"
                  aria-label="Загрузить изображение"
                  disabled={disabled || uploading}
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = ''; fileInputRef.current.click(); } }}
                  className="px-1.5 py-1 text-xs text-app-2 hover:text-emerald-300 hover:bg-app-subtle rounded transition-colors disabled:opacity-40">
                  🖼
                </button>
                <button
                  type="button"
                  title="Загрузить видео"
                  aria-label="Загрузить видео"
                  disabled={disabled || uploading}
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = ''; fileInputRef.current.click(); } }}
                  className="px-1.5 py-1 text-xs text-app-2 hover:text-emerald-300 hover:bg-app-subtle rounded transition-colors disabled:opacity-40">
                  🎬
                </button>
                <button
                  type="button"
                  title="Прикрепить файл"
                  aria-label="Прикрепить файл"
                  disabled={disabled || uploading}
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = ''; fileInputRef.current.click(); } }}
                  className="px-1.5 py-1 text-xs text-app-2 hover:text-emerald-300 hover:bg-app-subtle rounded transition-colors disabled:opacity-40">
                  📎
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mention autocomplete */}
      {mentionOpen && mentionItems.length > 0 && tab === 'write' && (() => {
        const q = mentionQuery.toLowerCase();
        const filtered = mentionItems
          .filter(m => mentionTrigger === '@' ? m.type === 'user' : m.type !== 'user')
          .filter(m => !q || m.label.toLowerCase().includes(q))
          .slice(0, 8);
        if (!filtered.length) return null;
        return (
          <div className="mx-3 mb-1 rounded-xl border border-app overflow-hidden t-surface-elevated"
               style={{ backdropFilter: 'blur(12px)' }}>
            {filtered.map(item => {
              const icon = { user: '👤', task: '✅', project: '📁', team: '👥' }[item.type];
              const badge = { user: 'text-blue-300', task: 'text-emerald-300', project: 'text-purple-300', team: 'text-orange-300' }[item.type];
              return (
                <button key={item.id}
                  onMouseDown={e => {
                    e.preventDefault();
                    const trigger = mentionTrigger ?? '@';
                    const insertion = `${trigger}[${item.label}](${item.type}:${item.id}) `;
                    const before = value.slice(0, mentionAnchor);
                    const after  = value.slice(mentionAnchor + 1 + mentionQuery.length);
                    onChange(before + insertion + after);
                    setMentionOpen(false);
                    setTimeout(() => textareaRef.current?.focus(), 0);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-app-subtle transition-colors text-left">
                  <span className={`text-xs ${badge}`}>{icon} {item.type}</span>
                  <span className="text-app">{item.label}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Content */}
      {tab === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => {
            const val = e.target.value;
            onChange(val);
            if (mentionItems.length > 0) {
              const pos = e.target.selectionStart;
              const before = val.slice(0, pos);
              const atMatch = before.match(/(?:^|[\s])(@)(\S*)$/);
              const hashMatch = before.match(/(?:^|[\s])(#)(\S*)$/);
              if (atMatch) {
                setMentionTrigger('@'); setMentionQuery(atMatch[2]);
                setMentionAnchor(pos - atMatch[2].length - 1); setMentionOpen(true);
              } else if (hashMatch) {
                setMentionTrigger('#'); setMentionQuery(hashMatch[2]);
                setMentionAnchor(pos - hashMatch[2].length - 1); setMentionOpen(true);
              } else { setMentionOpen(false); }
            }
          }}
          onKeyDown={e => { if (e.key === 'Escape') setMentionOpen(false); }}
          placeholder={dragOver ? 'Отпустите файл для загрузки…' : placeholder}
          rows={rows}
          disabled={disabled}
          className="w-full bg-transparent px-4 py-3 text-app resize-y focus:outline-none text-sm leading-relaxed font-mono placeholder-slate-600"
          onPaste={(e) => {
            const file = e.clipboardData.files[0];
            if (file) { e.preventDefault(); void handleUpload(file); }
          }}
        />
      ) : (
        <div className="min-h-[120px] px-4 py-3 prose prose-invert prose-sm max-w-none">
          {value.trim() ? (
            <MarkdownView content={value} />
          ) : (
            <p className="text-app-3 italic">Нет содержимого</p>
          )}
        </div>
      )}

      {/* Hint */}
      {withImages && tab === 'write' && (
        <div className="px-4 py-1.5 text-xs text-app-3 border-t border-app flex items-center gap-2 flex-wrap">
          <span>Markdown</span>
          <span>·</span>
          <span>Drag&Drop фото / видео / файлов</span>
          <span>·</span>
          <span>Вставка из буфера</span>
          {uploading && <span className="ml-auto text-emerald-400 animate-pulse-soft">Загрузка…</span>}
        </div>
      )}
    </div>
  );
}

// ── Refreshable media components ─────────────────────────────

function RefreshableImage({ src, alt, className }: { src?: string | Blob; alt?: string; className?: string }) {
  const initial = typeof src === 'string' ? src : undefined;
  const [url, setUrl] = useState(initial);
  const [retried, setRetried] = useState(false);
  // Проактивно: если presigned-ссылка уже истекла — обновляем ДО показа, чтобы браузер
  // не закэшировал 403 и картинка не «залипала» битой.
  useEffect(() => {
    setUrl(initial);
    setRetried(false);
    if (initial && isPresignedUrl(initial) && isPresignedExpired(initial)) {
      refreshPresignedUrl(initial).then(setUrl).catch(() => {});
    }
  }, [initial]);
  const handleError = async () => {
    if (retried || !url || !isPresignedUrl(url)) return;
    setRetried(true);
    try { setUrl(await refreshPresignedUrl(url)); } catch { /* show broken image */ }
  };
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt ?? ''} className={className ?? 'max-w-full rounded-lg my-2'} onError={handleError} />;
}

function RefreshableVideo({ src }: { src?: string }) {
  const [url, setUrl] = useState<string | undefined>(src);
  const [retried, setRetried] = useState(false);
  useEffect(() => {
    setUrl(src);
    setRetried(false);
    if (src && isPresignedUrl(src) && isPresignedExpired(src)) {
      refreshPresignedUrl(src).then(setUrl).catch(() => {});
    }
  }, [src]);
  const handleError = async () => {
    if (retried || !url || !isPresignedUrl(url)) return;
    setRetried(true);
    try { setUrl(await refreshPresignedUrl(url)); } catch { /* ignore */ }
  };
  return <video src={url} controls className="max-w-full rounded-lg my-2" onError={handleError} />;
}

function RefreshableLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  const [url, setUrl] = useState(href);
  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!url || !isPresignedUrl(url)) return; // обычная ссылка — пропускаем
    e.preventDefault();
    try {
      const fresh = await refreshPresignedUrl(url);
      setUrl(fresh);
      window.open(fresh, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  return (
    <a href={url} onClick={handleClick} target="_blank" rel="noopener noreferrer"
       className="text-emerald-400 hover:underline">
      {children}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// Allowlist-санитайзер HAST-дерева. Запускается ПОСЛЕ rehypeRaw и убирает всё,
// что может привести к XSS: опасные теги (script/iframe/...), обработчики событий
// (on*) и опасные схемы URL (javascript:/vbscript:/data:). Без внешних зависимостей —
// аналог rehype-sanitize, который нельзя добавить в package.json (его правит соседняя ветка).

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const SANITIZE_ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup',
  'code', 'pre', 'kbd', 'samp', 'blockquote',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'video',
  'span', 'div', 'hr',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
]);

// Опасные теги удаляются вместе с содержимым (текст внутри <script> не должен попасть в DOM).
const SANITIZE_DROP_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button',
  'textarea', 'select', 'option', 'link', 'meta', 'base', 'title', 'noscript',
  'svg', 'math', 'frame', 'frameset', 'applet',
]);

const SANITIZE_GLOBAL_ATTRS = new Set(['classname', 'class', 'style', 'id', 'align']);
const SANITIZE_TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  video: new Set(['src', 'controls', 'width', 'height', 'poster']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};
const SANITIZE_URL_ATTRS = new Set(['href', 'src', 'poster']);

function sanitizeUrlSafe(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const v = value.trim().toLowerCase();
  return !(v.startsWith('javascript:') || v.startsWith('vbscript:') || v.startsWith('data:'));
}

function sanitizeProps(tag: string, props: Record<string, unknown>): Record<string, unknown> {
  const allowed = SANITIZE_TAG_ATTRS[tag];
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    const lk = key.toLowerCase();
    if (lk.startsWith('on')) continue;                       // обработчики событий
    if (!SANITIZE_GLOBAL_ATTRS.has(lk) && !(allowed && allowed.has(lk))) continue;
    if (SANITIZE_URL_ATTRS.has(lk) && !sanitizeUrlSafe(props[key])) continue;
    out[key] = props[key];
  }
  return out;
}

function sanitizeNode(node: HastNode): HastNode[] {
  if (node.type === 'text') return [node];
  if (node.type === 'element') {
    const tag = String(node.tagName ?? '').toLowerCase();
    const kids = (node.children ?? []).flatMap(sanitizeNode);
    if (SANITIZE_DROP_TAGS.has(tag)) return [];
    if (!SANITIZE_ALLOWED_TAGS.has(tag)) return kids;        // неизвестный тег — разворачиваем, оставляя текст
    node.tagName = tag;
    node.children = kids;
    node.properties = sanitizeProps(tag, node.properties ?? {});
    return [node];
  }
  if (node.type === 'comment') return [];
  if (node.children) node.children = node.children.flatMap(sanitizeNode);
  return [node];
}

function rehypeSanitizeInline() {
  return (tree: HastNode) => {
    if (tree.children) tree.children = tree.children.flatMap(sanitizeNode);
  };
}

// ─────────────────────────────────────────────────────────────

// Мягкий перенос строки (одиночный \n) в CommonMark схлопывается в пробел, из-за
// чего многострочные сообщения в чате слипаются в один абзац. Этот мини-плагин
// (без новой зависимости — аналог remark-breaks) превращает \n внутри текстовых
// узлов в hard break. Код-блоки/inline-code — это отдельные leaf-узлы (type
// 'code'/'inlineCode'), их value мы не трогаем, поэтому переносы в коде целы.
function remarkSoftBreaks() {
  const walk = (node: { type: string; value?: string; children?: unknown[] }) => {
    if (!Array.isArray(node.children)) return;
    const out: unknown[] = [];
    for (const child of node.children as { type: string; value?: string; children?: unknown[] }[]) {
      if (child.type === 'text' && typeof child.value === 'string' && child.value.includes('\n')) {
        const parts = child.value.split('\n');
        parts.forEach((part, i) => {
          if (i > 0) out.push({ type: 'break' });
          if (part) out.push({ type: 'text', value: part });
        });
      } else {
        walk(child);
        out.push(child);
      }
    }
    node.children = out;
  };
  return (tree: { type: string; children?: unknown[] }) => walk(tree);
}

export function MarkdownView({ content }: { content: string }) {
  const processed = useMemo(() => renderMentions(content), [content]);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkSoftBreaks]}
      rehypePlugins={[rehypeRaw, [rehypeKatex, { output: 'html', throwOnError: false }], rehypeSanitizeInline]}
      components={{
        img: ({ src, alt }) => <RefreshableImage src={src} alt={alt} />,
        video: ({ src }: { src?: string | Blob | MediaSource | MediaStream }) => <RefreshableVideo src={typeof src === 'string' ? src : undefined} />,
        a: ({ href, children }) => <RefreshableLink href={href}>{children}</RefreshableLink>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          return isBlock
            ? <code className={`${className} block bg-app-subtle rounded-lg px-3 py-2 text-xs overflow-x-auto`}>{children}</code>
            : <code className="bg-app-hover rounded px-1 py-0.5 text-xs font-mono text-emerald-300">{children}</code>;
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-emerald-500/50 pl-3 text-app-2 italic my-1.5">{children}</blockquote>
        ),
        // Tailwind preflight сбрасывает маркеры/отступы списков и стили заголовков —
        // возвращаем их явно, чтобы рендерился весь набор markdown.
        ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-snug">{children}</li>,
        h1: ({ children }) => <h1 className="text-lg font-semibold mt-2.5 mb-1 text-app">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold mt-2 mb-1 text-app">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mt-1.5 mb-0.5 text-app">{children}</h3>,
        p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
        hr: () => <hr className="my-2.5 border-app" />,
        table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="w-full text-sm border-collapse">{children}</table></div>,
        th: ({ children }) => <th className="border border-app px-2 py-1 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border border-app px-2 py-1">{children}</td>,
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}
