'use client';

import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { uploadImage } from '@/lib/upload';
import { uploadFile } from '@/lib/upload';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  withImages?: boolean;
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
  rows = 8, disabled = false, withImages = true,
}: Props) {
  const [tab, setTab]           = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]  = useState(false);
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
      className={`rounded-xl ring-1 overflow-hidden transition-all ${dragOver ? 'ring-emerald-500/60 bg-emerald-500/5' : 'ring-white/10'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {/* Tab bar + toolbar */}
      <div className="flex items-center gap-1 bg-white/[0.03] border-b border-white/10 px-2 py-1.5 flex-wrap">
        <button onClick={() => setTab('write')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${tab === 'write' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
          Редактор
        </button>
        <button onClick={() => setTab('preview')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${tab === 'preview' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
          Предпросмотр
        </button>

        {tab === 'write' && (
          <div className="flex items-center gap-0.5 ml-2 border-l border-white/10 pl-2 flex-wrap">
            {TOOLBAR.map(t => (
              <button key={t.icon} title={t.title} disabled={disabled}
                onClick={() => insertAtCursor(t.wrap[0], t.wrap[1])}
                className="px-1.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors disabled:opacity-40 font-mono">
                {t.icon}
              </button>
            ))}
            {withImages && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv"
                  className="hidden"
                  onChange={onFileInput}
                />
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                  title="Загрузить изображение"
                  disabled={disabled || uploading}
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); } }}
                  className="px-1.5 py-1 text-xs text-slate-400 hover:text-emerald-300 hover:bg-white/5 rounded transition-colors disabled:opacity-40">
                  🖼
                </button>
                <button
                  title="Загрузить видео"
                  disabled={disabled || uploading}
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = 'video/*'; fileInputRef.current.click(); } }}
                  className="px-1.5 py-1 text-xs text-slate-400 hover:text-emerald-300 hover:bg-white/5 rounded transition-colors disabled:opacity-40">
                  🎬
                </button>
                <button
                  title="Прикрепить файл"
                  disabled={disabled || uploading}
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv'; fileInputRef.current.click(); } }}
                  className="px-1.5 py-1 text-xs text-slate-400 hover:text-emerald-300 hover:bg-white/5 rounded transition-colors disabled:opacity-40">
                  📎
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {tab === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={dragOver ? 'Отпустите файл для загрузки…' : placeholder}
          rows={rows}
          disabled={disabled}
          className="w-full bg-transparent px-4 py-3 text-slate-200 resize-y focus:outline-none text-sm leading-relaxed font-mono placeholder-slate-600"
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
            <p className="text-slate-600 italic">Нет содержимого</p>
          )}
        </div>
      )}

      {/* Hint */}
      {withImages && tab === 'write' && (
        <div className="px-4 py-1.5 text-xs text-slate-600 border-t border-white/5 flex items-center gap-2 flex-wrap">
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

export function MarkdownView({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? ''} className="max-w-full rounded-lg my-2" />
        ),
        video: ({ src }: { src?: string | Blob | MediaSource | MediaStream }) => (
          <video src={typeof src === 'string' ? src : undefined} controls className="max-w-full rounded-lg my-2" />
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          return isBlock
            ? <code className={`${className} block bg-white/5 rounded-lg px-3 py-2 text-xs overflow-x-auto`}>{children}</code>
            : <code className="bg-white/10 rounded px-1 py-0.5 text-xs font-mono text-emerald-300">{children}</code>;
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-emerald-500/50 pl-3 text-slate-400 italic">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
